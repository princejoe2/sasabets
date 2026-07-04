'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = [
  { id: 'football',       icon: '⚽', label: 'Football'       },
  { id: 'politics',       icon: '🏛️', label: 'Politics'       },
  { id: 'economy',        icon: '💰', label: 'Economy'        },
  { id: 'entertainment',  icon: '🎵', label: 'Entertainment'  },
  { id: 'tech',           icon: '📱', label: 'Technology'     },
  { id: 'infrastructure', icon: '🏗️', label: 'Infrastructure' },
  { id: 'agriculture',    icon: '🌿', label: 'Agriculture'    },
  { id: 'other',          icon: '✨', label: 'Other'          },
]

type Template = {
  id: string
  icon: string
  label: string
  titlePlaceholder: string
  optionA: string
  optionB: string
  category: string
  daysFromNow: number | null
}

const TEMPLATES: Template[] = [
  {
    id: 'football',
    icon: '⚽',
    label: 'Football',
    titlePlaceholder: 'e.g. Will Uganda Cranes beat Kenya Harambee Stars on 15 Aug?',
    optionA: 'Uganda Cranes',
    optionB: 'Kenya Stars',
    category: 'football',
    daysFromNow: 7,
  },
  {
    id: 'election',
    icon: '🏛️',
    label: 'Election / Vote',
    titlePlaceholder: 'e.g. Will Parliament pass the new tax bill by October?',
    optionA: 'Yes',
    optionB: 'No',
    category: 'politics',
    daysFromNow: 30,
  },
  {
    id: 'price',
    icon: '💰',
    label: 'Price Bet',
    titlePlaceholder: 'e.g. Will USD/UGX exchange rate exceed 3,800 by end of month?',
    optionA: 'Goes up',
    optionB: 'Goes down',
    category: 'economy',
    daysFromNow: 14,
  },
  {
    id: 'custom',
    icon: '✨',
    label: 'Custom',
    titlePlaceholder: 'e.g. Will Uganda Cranes beat Kenya Harambee Stars in August?',
    optionA: 'Yes',
    optionB: 'No',
    category: 'other',
    daysFromNow: null,
  },
]

function isoDatePlusDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export default function CreateMarketPage() {
  const supabase  = createClient()
  const router    = useRouter()

  const [authed,      setAuthed]      = useState<boolean | null>(null)
  const [balance,     setBalance]     = useState<number | null>(null)

  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [optionA,     setOptionA]     = useState('Yes')
  const [optionB,     setOptionB]     = useState('No')
  const [category,    setCategory]    = useState('other')
  const [closesAt,    setClosesAt]    = useState('')
  const [betSide,     setBetSide]     = useState<'a' | 'b' | null>(null)

  const [isPrivate,   setIsPrivate]   = useState(false)
  const [activeTemplate, setActiveTemplate] = useState<string>('custom')

  const [step,        setStep]        = useState<'form' | 'pick-side' | 'success'>('form')
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState('')
  const [marketId,    setMarketId]    = useState('')
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [copied,      setCopied]      = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/auth'); return }
      setAuthed(true)
      supabase.from('wallets').select('balance').eq('user_id', user.id).single()
        .then(({ data }) => setBalance(data ? Number(data.balance) : 0))
    })
  }, [])

  function applyTemplate(t: Template) {
    setActiveTemplate(t.id)
    setOptionA(t.optionA)
    setOptionB(t.optionB)
    setCategory(t.category)
    if (t.daysFromNow !== null) setClosesAt(isoDatePlusDays(t.daysFromNow))
    else setClosesAt('')
  }

  const LAUNCH = 5_000
  const hasEnough = (balance ?? 0) >= LAUNCH
  const canSubmit = title.trim() && optionA.trim() && optionB.trim()

  async function launch(side: 'a' | 'b') {
    setBetSide(side)
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/market/user-create', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        title, description, optionA, optionB, category,
        closesAt: closesAt || null,
        betSide:  side,
        isPrivate,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setMarketId(data.marketId)
      setAccessToken(data.accessToken ?? null)
      setStep('success')
    } else {
      setError(data.error ?? 'Failed to launch market')
      setStep('form')
    }
    setSubmitting(false)
  }

  const shareUrl = accessToken
    ? `https://sabula256.com/markets/${marketId}?t=${accessToken}`
    : `https://sabula256.com/markets/${marketId}`

  function copyLink() {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareText = encodeURIComponent(
    accessToken
      ? `I just created a private prediction market on Sabula 256!\n\n"${title}"\n\nOnly people with this link can join — predict with your crew and win real UGX money!\n${shareUrl}`
      : `I just created a prediction market on Sabula 256!\n\n"${title}"\n\nPredict with your friends and win real UGX money!\n${shareUrl}`
  )
  const waLink = `https://wa.me/?text=${shareText}`

  if (authed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <p className="text-slate-500 text-sm">Loading…</p>
      </div>
    )
  }

  // ── Success ──────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="text-7xl animate-bounce-in">🚀</div>
          <div>
            <h2 className="text-3xl font-black text-white">Your market is live!</h2>
            {accessToken ? (
              <div className="mt-2 space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-700/40 bg-amber-900/20 px-3 py-1 text-xs font-black text-amber-400">
                  🔒 Private — invite only
                </span>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Only people with your secret link can see and bet on this market.
                </p>
              </div>
            ) : (
              <p className="mt-2 text-slate-400 text-sm leading-relaxed">
                UGX 5,000 has been staked as your opening bet. Share the link to attract more bettors.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-[#2a2a3e] bg-[#0d0d14] p-4 text-left space-y-3">
            <p className="text-sm font-semibold text-slate-200 leading-snug">{title}</p>
            <div className="flex items-center gap-2 rounded-xl bg-[#111118] border border-[#2a2a3e] px-3 py-2.5">
              <span className="flex-1 truncate text-xs text-slate-400 font-mono">
                {accessToken
                  ? `sabula256.com/markets/${marketId}?t=${accessToken}`
                  : `sabula256.com/markets/${marketId}`}
              </span>
              <button onClick={copyLink}
                className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${copied ? 'bg-emerald-700/40 text-emerald-400' : 'bg-violet-800/40 text-violet-400 hover:bg-violet-700/50'}`}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            {accessToken && (
              <p className="text-[11px] text-amber-600/80 leading-relaxed">
                Keep this link safe — anyone with it can join. Without it, the market is completely hidden.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#25D366] py-3.5 text-sm font-black text-white shadow-lg transition-opacity hover:opacity-90">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Share on WhatsApp
            </a>

            <Link href={accessToken ? `/markets/${marketId}?t=${accessToken}` : `/markets/${marketId}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#2a2a3e] bg-[#0d0d14] py-3.5 text-sm font-bold text-slate-300 transition-colors hover:border-violet-600 hover:text-white">
              View my market →
            </Link>

            <button onClick={() => { setTitle(''); setDescription(''); setOptionA('Yes'); setOptionB('No'); setCategory('other'); setClosesAt(''); setBetSide(null); setMarketId(''); setAccessToken(null); setIsPrivate(false); setStep('form') }}
              className="w-full py-2 text-xs text-slate-600 hover:text-slate-400 transition-colors">
              Create another market
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Side picker modal overlay ──────────────────────────
  if (step === 'pick-side') {
    const labelA = optionA.trim() || 'Side A'
    const labelB = optionB.trim() || 'Side B'
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-widest text-violet-500">Almost there</p>
            <h2 className="mt-1 text-2xl font-black text-white">Back your opening side</h2>
            <p className="mt-2 text-sm text-slate-400">
              Place UGX 5,000 as the first bet to launch your market. You can win it back if your side wins.
            </p>
          </div>

          <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-4">
            <p className="text-xs text-slate-500 mb-3 text-center">"{title}"</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => launch('a')} disabled={submitting}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-violet-700/40 bg-violet-900/20 p-4 transition-all hover:border-violet-500 hover:bg-violet-900/30 disabled:opacity-50">
                <span className="text-2xl">🟣</span>
                <span className="text-sm font-black text-violet-300">{labelA}</span>
                <span className="text-[10px] text-violet-500 font-bold">Bet UGX 5,000</span>
              </button>
              <button onClick={() => launch('b')} disabled={submitting}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-amber-700/40 bg-amber-900/20 p-4 transition-all hover:border-amber-500 hover:bg-amber-900/30 disabled:opacity-50">
                <span className="text-2xl">🟡</span>
                <span className="text-sm font-black text-amber-300">{labelB}</span>
                <span className="text-[10px] text-amber-500 font-bold">Bet UGX 5,000</span>
              </button>
            </div>

            {submitting && (
              <p className="mt-4 text-center text-xs text-slate-500 animate-pulse">Launching market…</p>
            )}
            {error && (
              <div className="mt-4 rounded-xl border border-red-800/40 bg-red-900/20 px-3 py-2 text-xs text-red-400">{error}</div>
            )}
          </div>

          <button onClick={() => { setStep('form'); setError('') }}
            className="w-full text-center text-xs text-slate-600 hover:text-slate-400 transition-colors">
            ← Back to edit
          </button>
        </div>
      </div>
    )
  }

  // ── Main form ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <div className="border-b border-[#1e1e2e] bg-[#0d0d14] px-4 py-8">
        <div className="mx-auto max-w-lg">
          <Link href="/markets" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors">
            ← Markets
          </Link>
          <p className="mb-1 text-xs font-black uppercase tracking-widest text-violet-500">Community</p>
          <h1 className="text-3xl font-black text-white">Create a Market</h1>
          <p className="mt-2 text-slate-500 text-sm">Ask a question, launch with UGX 5,000, share the link. Your market goes live instantly.</p>

          {/* Balance pill */}
          {balance !== null && (
            <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${hasEnough ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/40' : 'bg-red-900/30 text-red-400 border border-red-800/40'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${hasEnough ? 'bg-emerald-400' : 'bg-red-400'}`} />
              Wallet: UGX {balance.toLocaleString()}
              {!hasEnough && <span className="opacity-70">· Need UGX 5,000 to launch</span>}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-8 space-y-5">
        {error && (
          <div className="rounded-xl border border-red-800/40 bg-red-900/20 px-4 py-3 text-sm text-red-400">{error}</div>
        )}

        {!hasEnough && balance !== null && (
          <div className="rounded-xl border border-amber-800/40 bg-amber-900/15 px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-amber-400">Deposit UGX 5,000+ to launch markets</p>
            <Link href="/wallet" className="shrink-0 rounded-lg bg-amber-700/40 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-700/60 transition-colors">
              Deposit →
            </Link>
          </div>
        )}

        {/* Template quick-starters */}
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-600">Start from a template</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => applyTemplate(t)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-center transition-all ${
                  activeTemplate === t.id
                    ? 'border-violet-600 bg-violet-900/30 text-violet-300'
                    : 'border-[#1e1e2e] bg-[#0d0d14] text-slate-500 hover:border-[#2a2a3e] hover:text-slate-300'
                }`}
              >
                <span className="text-xl">{t.icon}</span>
                <span className="text-xs font-bold">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-6 space-y-5">

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600">
              Your question *
            </label>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder={TEMPLATES.find(t => t.id === activeTemplate)?.titlePlaceholder ?? 'e.g. Will Uganda Cranes beat Kenya Harambee Stars in August?'}
              maxLength={200}
              className="w-full rounded-xl border border-[#1e1e2e] bg-[#111118] px-4 py-3 text-sm text-white outline-none focus:border-violet-600 transition-colors placeholder:text-slate-700"
            />
            <p className="mt-1 text-right text-[10px] text-slate-700">{title.length}/200</p>
          </div>

          {/* The two sides */}
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600">The two sides *</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase text-violet-500 tracking-wider">Side A</p>
                <input value={optionA} onChange={e => setOptionA(e.target.value)}
                  placeholder="Yes" maxLength={80}
                  className="w-full rounded-xl border border-[#1e1e2e] bg-[#111118] px-4 py-3 text-sm text-violet-200 outline-none focus:border-violet-600 transition-colors" />
              </div>
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase text-amber-500 tracking-wider">Side B</p>
                <input value={optionB} onChange={e => setOptionB(e.target.value)}
                  placeholder="No" maxLength={80}
                  className="w-full rounded-xl border border-[#1e1e2e] bg-[#111118] px-4 py-3 text-sm text-amber-200 outline-none focus:border-amber-700 transition-colors" />
              </div>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setCategory(c.id)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                    category === c.id
                      ? 'border-violet-600 bg-violet-900/30 text-violet-300'
                      : 'border-[#2a2a3e] text-slate-500 hover:border-[#3a3a5e] hover:text-slate-300'
                  }`}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600">
              Context <span className="font-normal text-slate-700">(optional)</span>
            </label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Add context, resolution criteria, or a news link…"
              rows={2} maxLength={500}
              className="w-full rounded-xl border border-[#1e1e2e] bg-[#111118] px-4 py-3 text-sm text-white outline-none focus:border-violet-600 transition-colors resize-none placeholder:text-slate-700" />
          </div>

          {/* Close date */}
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600">
              Closing date <span className="font-normal text-slate-700">(optional)</span>
            </label>
            <input type="date" value={closesAt} onChange={e => setClosesAt(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="rounded-xl border border-[#1e1e2e] bg-[#111118] px-4 py-3 text-sm text-slate-400 outline-none focus:border-violet-600 transition-colors [color-scheme:dark]" />
            <p className="mt-1 text-xs text-slate-700">Leave blank for an open-ended market (admin settles).</p>
          </div>

          {/* Private market toggle */}
          <button
            type="button"
            onClick={() => setIsPrivate(v => !v)}
            className={`w-full flex items-center justify-between rounded-xl border px-4 py-3.5 transition-all ${
              isPrivate
                ? 'border-amber-700/60 bg-amber-900/15'
                : 'border-[#1e1e2e] bg-[#111118] hover:border-[#2a2a3e]'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{isPrivate ? '🔒' : '🌍'}</span>
              <div className="text-left">
                <p className={`text-sm font-black ${isPrivate ? 'text-amber-300' : 'text-slate-400'}`}>
                  {isPrivate ? 'Private — invite only' : 'Public market'}
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {isPrivate
                    ? 'Only people with your secret link can find and bet on this market'
                    : 'Anyone on Sabula 256 can discover and bet on this market'}
                </p>
              </div>
            </div>
            <div className={`h-5 w-9 rounded-full transition-colors relative shrink-0 ${isPrivate ? 'bg-amber-500' : 'bg-[#2a2a3e]'}`}>
              <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isPrivate ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
          </button>
        </div>

        {/* Launch CTA */}
        <div className="rounded-2xl border border-violet-800/30 bg-violet-900/10 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">💡</span>
            <div>
              <p className="text-sm font-black text-white">Launch with UGX 5,000</p>
              <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">
                Your market goes live instantly. You place UGX 5,000 as the first bet (your choice of side).
                Share the link — every new bettor grows the pool and your potential winnings.
              </p>
            </div>
          </div>

          <button
            onClick={() => { setError(''); setStep('pick-side') }}
            disabled={!canSubmit || !hasEnough}
            className="w-full rounded-xl bg-violet-600 py-3.5 text-sm font-black text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {!hasEnough ? 'Top up wallet to launch' : canSubmit ? 'Continue to launch →' : 'Fill in title + sides to continue'}
          </button>

          <p className="text-center text-[11px] text-slate-700">
            UGX 5,000 is deducted from your wallet · Keep it respectful
          </p>
        </div>
      </div>
    </div>
  )
}
