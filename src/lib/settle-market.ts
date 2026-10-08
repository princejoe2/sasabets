import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail, btn } from './email'
import { sendPush, type StoredSubscription } from './push'

const SITE = 'https://sabula256.com'
const CREATOR_SHARE_PCT = 0.02

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function settleMarket(
  admin: SupabaseClient,
  marketId: string,
  winningOptionId: string,
  settlementNote?: string,
  evidenceUrl?: string,
): Promise<{ success: boolean; error?: string }> {
  // Atomically claim the market for settlement — prevents double-payout under concurrency
  const { data: claimedRaw, error: claimErr } = await admin
    .from('markets')
    .update({ status: 'settling' })
    .eq('id', marketId)
    .in('status', ['open', 'closed'])  // also settle closed-but-unsettled markets
    .select('*')
    .single()

  if (claimErr || !claimedRaw) {
    return { success: false, error: 'Market already being settled or not found' }
  }

  const claimed = claimedRaw as {
    id: string; title: string; status: string; options: unknown
    total_pool: number; rake_pct: number; winning_option_id: string | null
    created_by: string | null; metadata: Record<string, unknown> | null
  }
  const opts = claimed.options as Array<{ id: string; label: string; total_pool: number }>
  const winningOption = opts.find(o => o.id === winningOptionId)
  if (!winningOption) {
    // Roll back claim
    await admin.from('markets').update({ status: claimed.status }).eq('id', marketId)
    return { success: false, error: 'Invalid option' }
  }

  const totalPool   = Number(claimed.total_pool)
  const configRake  = Math.min(Math.max(Number(claimed.rake_pct ?? 0.08), 0), 0.99)
  // Only apply rake on markets that reached UGX 50,000+ in total pool
  const rakePct     = totalPool >= 50_000 ? configRake : 0
  const prizePool   = totalPool * (1 - rakePct)
  const winningPool = Number(winningOption.total_pool)

  const { data: winningBets } = await admin
    .from('bets')
    .select('*')
    .eq('market_id', marketId)
    .eq('option_id', winningOptionId)
    .eq('status', 'active')

  if (winningBets && winningBets.length > 0 && winningPool > 0) {
    for (const bet of winningBets) {
      const betAmt = Number(bet.amount)
      const payout = (betAmt / winningPool) * prizePool

      // Idempotent per-bet: only credit if bet is still active
      const { data: claimedBet } = await admin
        .from('bets')
        .update({ status: 'won', settled_payout: payout })
        .eq('id', bet.id)
        .eq('status', 'active')
        .select('id')

      if (!claimedBet || claimedBet.length === 0) continue  // already paid, skip

      // Atomic wallet credit via RPC — eliminates read-modify-write race
      const { data: newBalance } = await admin.rpc('adjust_wallet_balance', {
        p_user_id: bet.user_id,
        p_delta: payout,
      })
      await admin.from('transactions').insert({
        user_id: bet.user_id, type: 'payout', amount: payout,
        balance_after: newBalance ?? undefined, status: 'completed',
        metadata: {
          marketId,
          winningOptionId,
          betId: bet.id,
          market_title: claimed.title,
          option_label: winningOption.label,
          stake: betAmt,
        },
      })
    }
  }

  // For multi-candidate markets: pay NO bettors on every losing outcome first,
  // then mark all remaining active bets lost. Binary markets (yes/no/up/down)
  // have no NO sub-pool winners — their NO bettors simply lose.
  const isBinary = opts.every(o => ['yes', 'no', 'up', 'down'].includes(o.id))
  if (!isBinary) {
    const wSlug = winningOptionId.replace(/_yes$/, '').replace(/_no$/, '')
    const allSlugs = [...new Set(opts.map(o => o.id.replace(/_yes$/, '').replace(/_no$/, '')))]
    const losingSlugs = allSlugs.filter(s => s !== wSlug)

    for (const slug of losingSlugs) {
      const yesOpt   = opts.find(o => o.id === `${slug}_yes`)
      const noOpt    = opts.find(o => o.id === `${slug}_no`)
      const yesPool  = Number(yesOpt?.total_pool ?? 0)
      const noPool   = Number(noOpt?.total_pool ?? 0)
      const subTotal = yesPool + noPool
      if (noPool <= 0 || subTotal <= 0) continue

      const subPrize = subTotal * (1 - rakePct)

      const { data: noBets } = await admin
        .from('bets')
        .select('*')
        .eq('market_id', marketId)
        .eq('option_id', `${slug}_no`)
        .eq('status', 'active')

      if (!noBets?.length) continue

      for (const bet of noBets) {
        const betAmt = Number(bet.amount)
        const payout = (betAmt / noPool) * subPrize

        const { data: claimedBet } = await admin
          .from('bets')
          .update({ status: 'won', settled_payout: payout })
          .eq('id', bet.id)
          .eq('status', 'active')
          .select('id')

        if (!claimedBet || claimedBet.length === 0) continue

        const { data: newBalance } = await admin.rpc('adjust_wallet_balance', {
          p_user_id: bet.user_id,
          p_delta: payout,
        })
        await admin.from('transactions').insert({
          user_id:       bet.user_id,
          type:          'payout',
          amount:        payout,
          balance_after: newBalance ?? undefined,
          status:        'completed',
          metadata: {
            marketId,
            winningOptionId,
            betId:        bet.id,
            market_title: claimed.title,
            option_label: `${slug} NO`,
            stake:        betAmt,
            payout_type:  'no_loser_subpool',
          },
        })
      }
    }
  }

  // Mark all remaining active bets lost:
  //   YES on every losing candidate, NO on the winning candidate, all binary losers.
  // Already-paid NO winners are status='won'; .eq('status','active') protects them.
  await admin.from('bets')
    .update({ status: 'lost' })
    .eq('market_id', marketId)
    .eq('status', 'active')
    .neq('option_id', winningOptionId)

  // Record rake as a platform transaction so admin funds page shows exact accumulated rake
  const rake = totalPool * rakePct
  if (rake > 0) {
    const { data: adminProfiles } = await admin
      .from('profiles').select('id').eq('is_admin', true).limit(1)
    const adminProfile = adminProfiles?.[0]
    if (!adminProfile) {
      console.error(`[settle-market] No admin profile found — rake UGX ${rake} not recorded for market ${marketId}`)
    } else {
      const { error: rakeErr } = await admin.from('transactions').insert({
        user_id:   adminProfile.id,
        type:      'rake',
        amount:    rake,
        status:    'completed',
        reference: `rake-${marketId}`,
        metadata:  { marketId, market_title: claimed.title, totalPool, rakePct, winningOptionId },
      })
      // 23505 = unique_violation: rake already recorded (settlement retried), safe to ignore
      if (rakeErr && (rakeErr as { code?: string }).code !== '23505') {
        console.error(`[settle-market] Rake insert failed for market ${marketId}:`, rakeErr.message)
      }
    }
  }

  // Creator 2% revenue share on qualifying markets (pool >= 50k, non-admin creator)
  if (totalPool >= 50_000 && claimed.created_by) {
    const { data: creatorProfile } = await admin
      .from('profiles').select('is_admin').eq('id', claimed.created_by).single()
    if (!creatorProfile?.is_admin) {
      const creatorShare = Math.floor(totalPool * CREATOR_SHARE_PCT)
      const { data: newBal } = await admin.rpc('adjust_wallet_balance', {
        p_user_id: claimed.created_by,
        p_delta: creatorShare,
      })
      const { error: shareErr } = await admin.from('transactions').insert({
        user_id:   claimed.created_by,
        type:      'creator_share',
        amount:    creatorShare,
        balance_after: newBal ?? undefined,
        status:    'completed',
        reference: `creator-${marketId}`,
        metadata:  { marketId, market_title: claimed.title, totalPool, pct: CREATOR_SHARE_PCT },
      })
      if (shareErr && (shareErr as { code?: string }).code !== '23505') {
        console.error(`[settle-market] Creator share insert failed for market ${marketId}:`, shareErr.message)
      }
    }
  }

  const settleMeta: Record<string, unknown> = { winningOptionId }
  if (settlementNote?.trim()) settleMeta.settlement_note = settlementNote.trim()

  await admin.from('markets')
    .update({
      status: 'settled',
      winning_option_id: winningOptionId,
      settled_at: new Date().toISOString(),
      ...(settlementNote?.trim() ? { settlement_note: settlementNote.trim() } : {}),
      ...(evidenceUrl?.trim() ? { settlement_evidence_url: evidenceUrl.trim() } : {}),
    })
    .eq('id', marketId)

  // Update market_outcomes display status. Winning slug is the option ID with _yes/_no stripped;
  // for binary markets (id = 'yes'/'no') the id is the slug directly.
  const winningSlug = winningOptionId.endsWith('_yes')
    ? winningOptionId.slice(0, -4)
    : winningOptionId.endsWith('_no')
    ? winningOptionId.slice(0, -3)
    : winningOptionId

  const { data: allOutcomes } = await admin
    .from('market_outcomes')
    .select('id, slug')
    .eq('market_id', marketId)

  if (allOutcomes && allOutcomes.length > 0) {
    await Promise.all(allOutcomes.map(o =>
      admin.from('market_outcomes')
        .update({ status: o.slug === winningSlug ? 'resolved_yes' : 'resolved_no' })
        .eq('id', o.id)
    ))
  }

  // Fire settlement emails — non-blocking, never delay settlement
  sendSettlementEmails(admin, {
    marketId, marketTitle: claimed.title, winningOptionId,
    winningLabel: winningOption.label, settlementNote,
  }).catch(err => console.error('[settle-market] Settlement email error:', err))

  // Fire settlement push notifications — non-blocking
  sendSettlementPush(admin, {
    marketId, marketTitle: claimed.title, winningOptionId,
  }).catch(err => console.error('[settle-market] Settlement push error:', err))

  // Notify followers who didn't bet — non-blocking
  notifyFollowers(admin, { marketId, marketTitle: claimed.title, winningOptionId }).catch(
    err => console.error('[settle-market] Follower push error:', err),
  )

  return { success: true }
}

// Push every bettor a settlement notification (win or lose). Non-blocking; never
// delays settlement. Mirrors the email recipient logic but delivers via web-push.
async function sendSettlementPush(
  admin: SupabaseClient,
  opts: { marketId: string; marketTitle: string; winningOptionId: string },
) {
  const { marketId, marketTitle, winningOptionId } = opts

  const { data: bets } = await admin
    .from('bets')
    .select('user_id, option_id, settled_payout')
    .eq('market_id', marketId)
    .in('status', ['won', 'lost'])

  if (!bets?.length) return

  // Aggregate per user: won if any of their bets was on the winning side; sum payout.
  const perUser: Record<string, { won: boolean; payout: number }> = {}
  for (const b of bets) {
    const cur = perUser[b.user_id] ?? { won: false, payout: 0 }
    if (b.option_id === winningOptionId) {
      cur.won = true
      cur.payout += Number(b.settled_payout ?? 0)
    }
    perUser[b.user_id] = cur
  }

  const userIds = Object.keys(perUser)
  if (!userIds.length) return

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', userIds)

  if (!subs?.length) return

  const marketUrl = `${SITE}/markets/${marketId}`
  const shortTitle = marketTitle.length > 70 ? marketTitle.slice(0, 67) + '…' : marketTitle

  const results = await Promise.allSettled(
    subs.map(s => {
      const agg = perUser[s.user_id]
      const payload = agg?.won
        ? {
            title: '🏆 You won on Sabula 256!',
            body: `You won UGX ${Math.round(agg.payout).toLocaleString()} on "${shortTitle}"`,
            url: marketUrl,
          }
        : {
            title: 'Market settled',
            body: `"${shortTitle}" has been settled — tap to see the result.`,
            url: marketUrl,
          }
      return sendPush(s as StoredSubscription, payload)
    }),
  )

  // Clean up expired subscriptions (410 Gone)
  const gone: string[] = []
  results.forEach((r, i) => {
    if (r.status === 'rejected' && (r.reason as { statusCode?: number })?.statusCode === 410) {
      gone.push(subs[i].endpoint)
    }
  })
  if (gone.length) {
    await admin.from('push_subscriptions').delete().in('endpoint', gone)
  }
}

async function notifyFollowers(
  admin: SupabaseClient,
  opts: { marketId: string; marketTitle: string; winningOptionId: string },
) {
  const { marketId, marketTitle, winningOptionId } = opts

  // Get followers who have push subscriptions but didn't place a bet
  const { data: follows } = await admin
    .from('market_follows')
    .select('user_id')
    .eq('market_id', marketId)

  if (!follows?.length) return

  const followerIds = follows.map(f => f.user_id)

  // Exclude bettors — they already get the bettor notification
  const { data: bets } = await admin
    .from('bets')
    .select('user_id')
    .eq('market_id', marketId)
    .in('user_id', followerIds)

  const bettorIds = new Set((bets ?? []).map(b => b.user_id))
  const nonBettorFollowerIds = followerIds.filter(id => !bettorIds.has(id))
  if (!nonBettorFollowerIds.length) return

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', nonBettorFollowerIds)

  if (!subs?.length) return

  // Find winning option label
  const { data: market } = await admin.from('markets').select('options').eq('id', marketId).single()
  const opts2 = (market?.options ?? []) as Array<{ id: string; label: string }>
  const winLabel = opts2.find(o => o.id === winningOptionId)?.label ?? 'the result'
  const shortTitle = marketTitle.length > 60 ? marketTitle.slice(0, 57) + '…' : marketTitle
  const marketUrl = `${SITE}/markets/${marketId}`

  const results = await Promise.allSettled(
    subs.map(s => sendPush(s as StoredSubscription, {
      title: '🔔 Market settled',
      body: `"${shortTitle}" settled: ${winLabel}`,
      url: marketUrl,
    })),
  )

  const gone: string[] = []
  results.forEach((r, i) => {
    if (r.status === 'rejected' && (r.reason as { statusCode?: number })?.statusCode === 410) {
      gone.push(subs[i].endpoint)
    }
  })
  if (gone.length) {
    await admin.from('push_subscriptions').delete().in('endpoint', gone)
  }
}

async function sendSettlementEmails(
  admin: SupabaseClient,
  opts: {
    marketId: string
    marketTitle: string
    winningOptionId: string
    winningLabel: string
    settlementNote?: string
  },
) {
  const { marketId, marketTitle, winningOptionId, winningLabel, settlementNote } = opts

  const { data: bets } = await admin
    .from('bets')
    .select('user_id, option_id, settled_payout, amount')
    .eq('market_id', marketId)
    .in('status', ['won', 'lost'])

  if (!bets?.length) return

  let emailMap: Record<string, string> = {}
  try {
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    emailMap = Object.fromEntries(users.map(u => [u.id, u.email ?? '']))
  } catch { return }

  const marketUrl = `${SITE}/markets/${marketId}`
  const seen = new Set<string>()

  for (const bet of bets) {
    if (seen.has(bet.user_id)) continue
    seen.add(bet.user_id)

    const email = emailMap[bet.user_id]
    if (!email) continue

    const won = bet.option_id === winningOptionId
    const payout = Number(bet.settled_payout ?? 0)
    const stake = Number(bet.amount)
    const profit = payout - stake

    await sendEmail(
      email,
      won ? `🏆 You won UGX ${Math.round(payout).toLocaleString()} on Sabula 256!` : `Market settled: "${marketTitle.replace(/"/g, '')}"`,
      `
      <div style="background:#0a0a0f;color:#e2e8f0;font-family:system-ui,sans-serif;max-width:580px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid #1e1e2e">
        <div style="background:linear-gradient(135deg,${won ? '#064e3b,#065f46' : '#1e1b4b,#312e81'});padding:32px;text-align:center">
          <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${won ? '#6ee7b7' : '#c4b5fd'}">Sabula 256</p>
          <h1 style="margin:0;font-size:28px;font-weight:900;color:#fff">${won ? '🏆 You Won!' : 'Market Settled'}</h1>
          <p style="margin:12px 0 0;font-size:42px">${won ? '🎉' : '🔒'}</p>
        </div>

        <div style="padding:32px 28px">
          <p style="color:#94a3b8;margin:0 0 8px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px">Market</p>
          <h2 style="margin:0 0 20px;font-size:20px;font-weight:900;color:#f1f5f9;line-height:1.3">${esc(marketTitle)}</h2>

          <div style="background:#111118;border:1px solid #1e1e2e;border-radius:12px;padding:16px 20px;margin:0 0 16px">
            <p style="margin:0 0 4px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px">Winning outcome</p>
            <p style="margin:0;font-size:18px;font-weight:900;color:#fbbf24">🏆 ${esc(winningLabel)}</p>
          </div>

          ${won ? `
          <div style="background:#064e3b20;border:1px solid #065f46;border-radius:12px;padding:16px 20px;margin:0 0 16px">
            <p style="margin:0 0 4px;font-size:12px;color:#6ee7b7;text-transform:uppercase;letter-spacing:1px">Your payout</p>
            <p style="margin:0;font-size:28px;font-weight:900;color:#34d399">UGX ${Math.round(payout).toLocaleString()}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#6ee7b7">+UGX ${Math.round(profit).toLocaleString()} profit on UGX ${Math.round(stake).toLocaleString()} stake</p>
          </div>
          ` : `
          <div style="background:#1e1b4b20;border:1px solid #312e81;border-radius:12px;padding:16px 20px;margin:0 0 16px">
            <p style="margin:0;font-size:14px;color:#94a3b8">Your stake of UGX ${Math.round(stake).toLocaleString()} on this market did not win this time.</p>
          </div>
          `}

          ${settlementNote ? `
          <div style="background:#111118;border:1px solid #1e1e2e;border-left:3px solid #7c3aed;border-radius:0 8px 8px 0;padding:12px 16px;margin:0 0 24px">
            <p style="margin:0 0 4px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px">Note from admin</p>
            <p style="margin:0;font-size:14px;color:#94a3b8">${esc(settlementNote)}</p>
          </div>
          ` : ''}

          ${btn(marketUrl, won ? '🎯 View your winnings' : '🔮 Browse more markets', won ? '#065f46' : '#7c3aed')}

          <p style="margin:24px 0 0;font-size:12px;color:#334155;text-align:center">
            <a href="${SITE}" style="color:#6d28d9">sabula256.com</a> — Uganda&rsquo;s community prediction market
          </p>
        </div>
      </div>
      `,
    )
  }
}
