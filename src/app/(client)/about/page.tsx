import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Sabula 256 — Uganda\'s Prediction Market',
  description: 'Predict politics, football & economy on Sabula 256 — Uganda\'s #1 prediction market. Win on MTN or Airtel Mobile Money. No house edge — 92% of every pool goes to winners.',
  openGraph: {
    title: 'About Sabula 256 — Uganda\'s #1 Prediction Market',
    description: 'Predict politics, football & economy on Sabula 256. Win on MTN or Airtel Mobile Money. No house edge — 92% of every pool goes to winners.',
    url: 'https://sabula256.com/about',
  },
}

const VALUES = [
  {
    icon: '🤝',
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.1)',
    border: 'rgba(167,139,250,0.25)',
    title: 'No House Edge',
    body: 'We take 8% of every pool as our fee. The remaining 92% goes entirely to winning predictors. We don\'t bet against you — we just run the market.',
  },
  {
    icon: '⚡',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.1)',
    border: 'rgba(251,191,36,0.25)',
    title: 'Instant Mobile Money',
    body: 'Deposits and withdrawals go through MTN or Airtel Mobile Money. No bank account, no waiting days — funds move in minutes.',
  },
  {
    icon: '🔒',
    color: '#34d399',
    bg: 'rgba(52,211,153,0.1)',
    border: 'rgba(52,211,153,0.25)',
    title: 'Fair & Transparent',
    body: 'Odds are calculated from real money in the pool — not set by us. Every bettor can see the pool size, the split, and their potential payout before they commit.',
  },
  {
    icon: '🌍',
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.1)',
    border: 'rgba(96,165,250,0.25)',
    title: 'Built for Uganda',
    body: 'Our markets cover what actually matters here: Uganda Cranes, FUFA Premier League, political elections, UGX exchange rates, and local business. Not just international events.',
  },
]

const HOW = [
  { step: '01', color: '#22d3ee', title: 'A market opens', body: 'Admin or community proposals create markets with a question and two possible outcomes (e.g. "Will Uganda Cranes win?"). A closing time is set.' },
  { step: '02', color: '#f59e0b', title: 'Users stake money', body: 'Predictors deposit via MTN/Airtel MoMo and stake on the outcome they believe will happen. Every shilling goes into a shared pool.' },
  { step: '03', color: '#a78bfa', title: 'Odds shift in real time', body: 'As more money flows in, the odds update instantly. Early bettors on the right side lock in better returns. Late money dilutes the pool.' },
  { step: '04', color: '#34d399', title: 'Market settles', body: 'When the event resolves, admin confirms the outcome. The total pool (minus 8% platform fee) is split among all winning predictors proportional to their stake.' },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden border-b border-[#1e1e2e]">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(circle, #2a2a3e 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/3 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-violet-900/25 blur-[130px]" />
          <div className="absolute right-0 top-10 h-[300px] w-[300px] rounded-full bg-pink-900/15 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 py-24 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-700/40 bg-violet-900/25 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-violet-400">
            Uganda&apos;s Prediction Market
          </div>
          <h1 className="mb-5 text-5xl font-black tracking-tight text-white lg:text-6xl">
            Predict. <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">Get Paid.</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-400">
            Sabula 256 is East Africa&apos;s parimutuel prediction market — a platform where your knowledge of Uganda politics, football, business and current events turns into real Mobile Money.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/markets" className="rounded-xl bg-violet-600 px-7 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-500">
              Browse Markets →
            </Link>
            <Link href="/auth" className="rounded-xl border border-[#2a2a3e] bg-[#111118] px-7 py-3 text-sm font-semibold text-slate-300 transition-colors hover:border-violet-700/50 hover:text-white">
              Create Account
            </Link>
          </div>
        </div>
      </div>

      {/* ── Our story ── */}
      <section className="border-b border-[#1e1e2e] bg-[#0d0d14]">
        <div className="mx-auto max-w-4xl px-4 py-20">
          <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">Our story</p>
          <h2 className="mb-10 text-center text-4xl font-black text-white">
            Why we built <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Sabula 256</span>
          </h2>
          <div className="space-y-5 text-base leading-relaxed text-slate-400">
            <p>
              Prediction markets have been one of the most accurate tools for forecasting real-world events for decades. Platforms like Polymarket have proven that when people put real money on outcomes, the collective wisdom of the crowd beats most expert predictions.
            </p>
            <p>
              But those platforms required crypto wallets, dollar deposits, and VPNs — a wall most Ugandans couldn&apos;t climb. We built Sabula 256 to bring the same model home, powered by the infrastructure Ugandans already use every day: <strong className="text-slate-200">MTN and Airtel Mobile Money</strong>.
            </p>
            <p>
              We focus on markets that matter here. Uganda Cranes qualifiers. FUFA Premier League derbies. Presidential elections. Coffee farmgate prices. The UGX/USD exchange rate. Events that Ugandans have genuine insight into — not just global markets dominated by international traders.
            </p>
            <p className="font-semibold text-slate-300">
              Sabula 256 is built in Uganda, for Uganda, by people who want East Africa to have a seat at the prediction market table.
            </p>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-b border-[#1e1e2e] bg-[#0a0a0f]">
        <div className="mx-auto max-w-5xl px-4 py-20">
          <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">The model</p>
          <h2 className="mb-12 text-center text-4xl font-black text-white">
            How the <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">parimutuel</span> model works
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {HOW.map(({ step, color, title, body }) => (
              <div
                key={step}
                className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-6"
                style={{ borderColor: `${color}22` }}
              >
                <p className="mb-3 font-mono text-4xl font-black" style={{ color, opacity: 0.4 }}>{step}</p>
                <h3 className="mb-2 font-black text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border border-amber-900/40 bg-amber-950/20 p-5 text-center">
            <p className="text-sm text-amber-300">
              <strong>The formula:</strong> Your payout = (your stake ÷ winning pool) × (total pool × 0.92)
            </p>
            <p className="mt-1 text-xs text-amber-600">
              The 8% platform fee is deducted from the total pool before distribution. No other hidden fees.
            </p>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="border-b border-[#1e1e2e] bg-[#0d0d14]">
        <div className="mx-auto max-w-5xl px-4 py-20">
          <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">What we stand for</p>
          <h2 className="mb-12 text-center text-4xl font-black text-white">
            Built on <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">principles</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {VALUES.map(({ icon, color, bg, border, title, body }) => (
              <div
                key={title}
                className="flex gap-4 rounded-2xl border p-6"
                style={{ background: bg, borderColor: border }}
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

      {/* ── Responsible gambling ── */}
      <section className="border-b border-[#1e1e2e] bg-[#0a0a0f]">
        <div className="mx-auto max-w-4xl px-4 py-20">
          <div className="rounded-2xl border border-[#2a2a3e] bg-[#0d0d14] p-8 text-center">
            <p className="mb-3 text-3xl">🛡️</p>
            <h2 className="mb-3 text-2xl font-black text-white">Responsible Gambling</h2>
            <p className="mx-auto mb-6 max-w-xl text-sm leading-relaxed text-slate-400">
              Prediction markets are exciting, but they carry real financial risk. We enforce responsible gambling tools including deposit limits, self-exclusion, and cooling-off periods. Sabula 256 is for users aged <strong className="text-slate-200">18 and above only</strong>.
            </p>
            <Link
              href="/responsible-gambling"
              className="inline-block rounded-xl border border-[#2a2a3e] bg-[#111118] px-6 py-3 text-sm font-semibold text-slate-300 transition-colors hover:border-violet-700/50 hover:text-white"
            >
              View Safe Play Tools →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section className="bg-[#0d0d14]">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">Get in touch</p>
          <h2 className="mb-4 text-4xl font-black text-white">Questions or feedback?</h2>
          <p className="mb-8 text-slate-400">
            We read every message. Reach out if you have questions, encounter a problem, or want to propose something.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/support"
              className="rounded-xl bg-violet-600 px-7 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-500"
            >
              Contact Support →
            </Link>
            <Link
              href="/help"
              className="rounded-xl border border-[#2a2a3e] bg-[#111118] px-7 py-3 text-sm font-semibold text-slate-300 transition-colors hover:border-violet-700/50 hover:text-white"
            >
              Read the FAQ
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
