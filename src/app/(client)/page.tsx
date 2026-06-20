import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import MarketCard from '@/components/MarketCard'
import MagneticButton from '@/components/MagneticButton'
import BetCalculator from '@/components/BetCalculator'

const CATEGORIES = [
  { icon: '⚽', label: 'Football',       color: '#a3e635', glow: 'rgba(163,230,53,0.10)',  border: 'rgba(163,230,53,0.18)',  desc: 'FUFA, KCCA, Uganda Cranes & EPL' },
  { icon: '🏛️', label: 'Politics',       color: '#60a5fa', glow: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.18)',  desc: 'Elections, parliament & policy' },
  { icon: '💰', label: 'Economy',        color: '#fbbf24', glow: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.18)',  desc: 'UGX rates, MTN shares & business' },
  { icon: '🎵', label: 'Entertainment',  color: '#f472b6', glow: 'rgba(244,114,182,0.10)', border: 'rgba(244,114,182,0.18)', desc: 'Awards, music & celebrities' },
  { icon: '📱', label: 'Technology',     color: '#22d3ee', glow: 'rgba(34,211,238,0.10)',  border: 'rgba(34,211,238,0.18)',  desc: 'MoMo, 5G & telecom in Uganda' },
  { icon: '🌿', label: 'Agriculture',    color: '#34d399', glow: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.18)',  desc: 'Coffee prices, rainfall & crops' },
]

const WHY = [
  { icon: '📲', color: '#a78bfa', title: 'Mobile Money First',    body: 'Top up and cash out with MTN or Airtel MoMo in seconds. No bank account needed.' },
  { icon: '🏆', color: '#fbbf24', title: 'Pool-Based Payouts',    body: 'You bet against other players — not the house. The full pot (minus 8%) goes to winners.' },
  { icon: '⚡', color: '#34d399', title: 'Live Shifting Odds',    body: 'Odds update in real-time as money flows in. Early bettors lock in the best returns.' },
  { icon: '🌍', color: '#f472b6', title: 'Built for East Africa', body: 'Local football, politics, economy. We cover what actually matters here in Uganda.' },
]

export default async function HomePage() {
  const supabase = createClient()

  const [{ data: markets }, { count: userCount }, { data: allMarkets }] = await Promise.all([
    supabase
      .from('markets')
      .select('id, title, description, total_pool, options, closes_at, status')
      .eq('status', 'open')
      .order('total_pool', { ascending: false })
      .limit(6),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('markets').select('total_pool'),
  ])

  const totalPool = allMarkets?.reduce((s, m) => s + Number(m.total_pool), 0) ?? 0
  const openCount = markets?.length ?? 0

  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-[#1e1e2e]">
        {/* Dot grid */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, #2a2a3e 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            opacity: 0.45,
          }}
        />
        {/* Glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/4 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-violet-900/30 blur-[140px]" />
          <div className="absolute right-0 top-10 h-[400px] w-[400px] rounded-full bg-pink-900/20 blur-[130px]" />
          <div className="absolute left-1/2 bottom-0 h-[300px] w-[700px] -translate-x-1/2 rounded-full bg-indigo-900/15 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-20 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">

            {/* Left: headline */}
            <div style={{ animation: 'slide-up 0.55s ease both' }}>
              {/* Live badge */}
              <div className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-violet-700/50 bg-violet-900/30 px-5 py-2 text-sm font-semibold text-violet-300 backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                {openCount} markets live right now
              </div>

              <h1 className="mb-5 font-black tracking-tight" style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', lineHeight: 1.05 }}>
                Predict.<br />
                <span className="gradient-text">Get Paid.</span>
              </h1>

              <p className="mb-3 text-xl font-medium text-slate-300">
                East Africa&apos;s boldest prediction platform.
              </p>
              <p className="mb-8 max-w-md text-base leading-relaxed text-slate-500">
                Pick your outcome on football, politics, business &amp; more.
                Winnings paid instantly to MTN or Airtel Mobile Money.
              </p>

              <div className="flex flex-wrap gap-4">
                <MagneticButton href="/markets" variant="primary">Browse Markets →</MagneticButton>
                <MagneticButton href="/auth" variant="secondary">Create Account</MagneticButton>
              </div>

              <p className="mt-6 text-xs text-slate-700">
                No bank account needed&nbsp;·&nbsp;Instant MoMo withdrawals&nbsp;·&nbsp;Pool-based payouts
              </p>
            </div>

            {/* Right: bet calculator */}
            <div style={{ animation: 'slide-up 0.7s ease both' }}>
              <BetCalculator />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────── */}
      <section className="border-b border-[#1e1e2e] bg-[#0d0d14]">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="grid grid-cols-3 divide-x divide-[#1e1e2e] text-center">
            <div className="px-4 py-3">
              <p className="text-4xl font-black tabular-nums" style={{ color: '#fbbf24' }}>
                {totalPool >= 1_000_000
                  ? `UGX ${(totalPool / 1_000_000).toFixed(1)}M`
                  : totalPool > 0
                  ? `UGX ${(totalPool / 1_000).toFixed(0)}K`
                  : 'UGX 0'}
              </p>
              <p className="mt-1.5 text-xs font-bold uppercase tracking-widest text-slate-500">Total Pooled</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-4xl font-black tabular-nums" style={{ color: '#34d399' }}>{openCount}</p>
              <p className="mt-1.5 text-xs font-bold uppercase tracking-widest text-slate-500">Open Markets</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-4xl font-black tabular-nums" style={{ color: '#f472b6' }}>{userCount ?? 0}</p>
              <p className="mt-1.5 text-xs font-bold uppercase tracking-widest text-slate-500">Predictors</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────────── */}
      <section className="border-b border-[#1e1e2e] bg-[#0a0a0f]">
        <div className="mx-auto max-w-5xl px-4 py-20">
          <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">What you can predict on</p>
          <h2 className="mb-12 text-center text-4xl font-black">
            Something for <span className="gradient-text-2">every punter</span>
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {CATEGORIES.map(cat => (
              <Link
                key={cat.label}
                href="/markets"
                className="card-shine group rounded-2xl border p-5 transition-all duration-200 hover:scale-[1.02] hover:brightness-110"
                style={{ borderColor: cat.border, background: `linear-gradient(145deg, ${cat.glow} 0%, #13131a 65%)` }}
              >
                <div className="mb-3 text-3xl">{cat.icon}</div>
                <h3 className="mb-1 font-black" style={{ color: cat.color }}>{cat.label}</h3>
                <p className="text-xs leading-relaxed text-slate-500">{cat.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="border-b border-[#1e1e2e] bg-[#0d0d14]">
        <div className="mx-auto max-w-5xl px-4 py-20">
          <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">Simple as 1 2 3</p>
          <h2 className="mb-12 text-center text-4xl font-black">
            How it <span className="gradient-text-2">works</span>
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {([
              { step: '01', color: '#22d3ee', icon: '🎯', title: 'Pick a market',        body: 'Browse sports, politics, and current affairs across East Africa. Each market has a closing time and a set of possible outcomes.' },
              { step: '02', color: '#f59e0b', icon: '💵', title: 'Stake via MoMo',       body: 'Top up via MTN or Airtel Mobile Money and place your stake on the outcome you believe in. The pool grows with every participant.' },
              { step: '03', color: '#34d399', icon: '🏆', title: 'Collect your winnings', body: 'When the market settles, the full pool (minus 8% fee) is split among correct predictors — paid straight to your phone.' },
            ] as const).map(({ step, color, icon, title, body }) => (
              <div
                key={step}
                className="card-shine rounded-2xl border p-7"
                style={{ borderColor: `${color}28`, background: `linear-gradient(145deg, ${color}08 0%, #13131a 65%)` }}
              >
                <div className="mb-2 text-3xl">{icon}</div>
                <p className="mb-3 font-mono text-4xl font-black" style={{ color, opacity: 0.45 }}>{step}</p>
                <h3 className="mb-3 text-xl font-black text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Sabula 256 ───────────────────────────────────────────── */}
      <section className="border-b border-[#1e1e2e] bg-[#0a0a0f]">
        <div className="mx-auto max-w-5xl px-4 py-20">
          <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">Why us</p>
          <h2 className="mb-12 text-center text-4xl font-black">
            Built different. <span className="gradient-text">Built for you.</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {WHY.map(({ icon, color, title, body }) => (
              <div
                key={title}
                className="flex gap-4 rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-6 transition-colors hover:border-[#2a2a3e]"
              >
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                  style={{ background: `${color}18` }}
                >
                  {icon}
                </div>
                <div>
                  <h3 className="mb-1.5 font-black" style={{ color }}>{title}</h3>
                  <p className="text-sm leading-relaxed text-slate-400">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live markets ─────────────────────────────────────────────── */}
      <section className="bg-[#0a0a0f] py-20">
        <div className="mx-auto max-w-5xl px-4">
          <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">Trending now</p>
          <div className="mb-10 flex items-center justify-between">
            <h2 className="text-4xl font-black">
              Hot <span className="gradient-text">Markets</span>
            </h2>
            <Link
              href="/markets"
              className="rounded-xl border border-violet-800/50 bg-violet-900/20 px-5 py-2.5 text-sm font-bold text-violet-400 transition-all hover:bg-violet-800/30 hover:text-violet-300"
            >
              View all {openCount} →
            </Link>
          </div>

          {markets && markets.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {markets.map(market => (
                <MarketCard
                  key={market.id}
                  market={{
                    ...market,
                    options: market.options as Array<{ id: string; label: string; total_pool: number }>,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#1e1e2e] bg-[#13131a] p-20 text-center">
              <p className="mb-3 text-4xl">🔮</p>
              <p className="text-xl font-bold text-slate-300">Markets opening soon</p>
              <p className="mt-2 text-slate-500">Create an account to be notified when the first markets go live.</p>
              <Link
                href="/auth"
                className="btn-glow mt-6 inline-block rounded-xl bg-violet-600 px-7 py-3.5 font-bold transition-colors hover:bg-violet-500"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-[#1e1e2e]">
        {/* Dot grid */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, #2a2a3e 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            opacity: 0.3,
          }}
        />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-900/20 blur-[130px]" />
          <div className="absolute left-1/3 top-1/4 h-[300px] w-[300px] rounded-full bg-pink-900/15 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 py-28 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-700/40 bg-emerald-900/20 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Join {userCount ?? 0}+ predictors across East Africa
          </div>
          <h2
            className="mb-4 font-black tracking-tight"
            style={{ fontSize: 'clamp(2.5rem, 7vw, 5rem)', lineHeight: 1.05 }}
          >
            Ready to <span className="gradient-text">win big?</span>
          </h2>
          <p className="mx-auto mb-10 max-w-lg text-xl text-slate-400">
            Pick your outcome. Top up via mobile money. Get paid when you&apos;re right.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <MagneticButton href="/auth" variant="primary" className="px-12 py-5 text-xl">
              Start Predicting →
            </MagneticButton>
            <MagneticButton href="/markets" variant="secondary" className="px-12 py-5 text-xl">
              View Markets
            </MagneticButton>
          </div>
          <p className="mt-8 text-xs text-slate-700">
            Free to sign up&nbsp;·&nbsp;MTN &amp; Airtel Mobile Money&nbsp;·&nbsp;Instant payouts
          </p>
        </div>
      </section>
    </div>
  )
}
