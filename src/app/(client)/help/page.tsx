'use client'
import { useState } from 'react'
import Link from 'next/link'

const SECTIONS = [
  {
    id: 'getting-started',
    icon: '🚀',
    color: '#a78bfa',
    title: 'Getting Started',
    faqs: [
      {
        q: 'What is Sabula 256?',
        a: 'Sabula 256 is Uganda\'s community prediction market. You stake money on the outcome of real-world events — politics, football, economy and more. If your prediction is correct, you share the full pool with other winners. You can also create your own markets and invite friends to predict.',
      },
      {
        q: 'How do I create an account?',
        a: 'Click "Sign up" on the top right. Enter your phone number and email, set a password, and verify your email. You can start browsing markets immediately, but you\'ll need to deposit and complete basic verification before placing bets.',
      },
      {
        q: 'Is Sabula 256 legal in Uganda?',
        a: 'Sabula 256 operates as a prediction market platform in Uganda. We follow responsible gambling guidelines and restrict access to users aged 18 and above. We require KYC verification for withdrawals above a threshold to comply with local financial regulations.',
      },
      {
        q: 'What is the minimum age to use Sabula 256?',
        a: 'You must be 18 years or older to use Sabula 256. By creating an account, you confirm you meet this requirement.',
      },
    ],
  },
  {
    id: 'deposits-withdrawals',
    icon: '💳',
    color: '#fbbf24',
    title: 'Deposits & Withdrawals',
    faqs: [
      {
        q: 'How do I deposit money?',
        a: 'Go to Wallet → Deposit. Enter the amount and your MTN or Airtel Mobile Money number. You\'ll receive a payment prompt on your phone. Approve it and funds appear in your Sabula 256 wallet within seconds.',
      },
      {
        q: 'What is the minimum deposit?',
        a: 'The minimum deposit is UGX 2,000. We recommend starting small while you learn how prediction markets work.',
      },
      {
        q: 'How do I withdraw my winnings?',
        a: 'Go to Wallet → Withdraw. Enter the amount and your Mobile Money number. Withdrawals are processed within minutes. Make sure the phone number on your account matches your registered Mobile Money number.',
      },
      {
        q: 'Are there withdrawal fees?',
        a: 'Sabula 256 does not charge withdrawal fees on our end. Your mobile network operator may apply their standard Mobile Money transaction charges.',
      },
      {
        q: 'Why is my withdrawal taking long?',
        a: 'Most withdrawals complete in under 10 minutes. Delays can happen during network congestion or if your KYC verification is pending. If your withdrawal has been pending for more than 2 hours, contact support via the Support page.',
      },
      {
        q: 'Do I need to verify my identity (KYC) to withdraw?',
        a: 'Basic withdrawals work without full KYC. However, for larger amounts we require identity verification to comply with financial regulations. Go to the KYC page to submit your national ID or passport.',
      },
    ],
  },
  {
    id: 'placing-bets',
    icon: '🎯',
    color: '#34d399',
    title: 'Placing Bets',
    faqs: [
      {
        q: 'How do I place a bet?',
        a: 'Browse the Markets page and click any open market. On the market page, choose your outcome (A or B), enter your stake amount, and review the estimated payout before confirming. Your stake is deducted immediately from your wallet.',
      },
      {
        q: 'What is the minimum bet size?',
        a: 'The minimum bet is UGX 1,000.',
      },
      {
        q: 'Can I bet on multiple outcomes in the same market?',
        a: 'No. Each market allows one position per user. You must pick one outcome and stick with it.',
      },
      {
        q: 'Can I change my bet after placing it?',
        a: 'You cannot change which outcome you bet on. However, you can exit your bet early using the Exit Bet feature (see below). New bets in the same market are not allowed after you already have a position.',
      },
      {
        q: 'What is Exit Bet (early cashout)?',
        a: 'If a market is still open and you want out, you can exit your bet early. You receive 75% of your original stake back to your wallet. The remaining 25% is split: 12.5% goes to the platform and 12.5% stays in the pool for remaining bettors. Go to My Predictions to find the Exit button.',
      },
      {
        q: 'Why was my bet rejected?',
        a: 'Bets can be rejected for several reasons: insufficient wallet balance, the market is closed or suspended, your account is too new (new accounts have a 72-hour limit of UGX 50,000), your single bet exceeds 15% of the current pool, or you have placed too many bets in the last hour on the same market.',
      },
      {
        q: 'What is a surge cap?',
        a: 'If a market\'s pool moves unusually fast (a sign of manipulation or information leakage), the system flags it. Flagged markets limit new bets to UGX 50,000 per transaction until the surge clears. Extreme surges (≥40% pool shift in 15 minutes) suspend the market entirely pending admin review.',
      },
    ],
  },
  {
    id: 'markets-odds',
    icon: '📊',
    color: '#60a5fa',
    title: 'Markets & Odds',
    faqs: [
      {
        q: 'How are the odds calculated?',
        a: 'Odds are parimutuel — they come from the pool itself, not set by us. The more money that flows to one side, the lower the odds on that side become, and the higher the odds on the other side. Odds update in real time as bets come in.',
      },
      {
        q: 'What does the percentage on each outcome mean?',
        a: 'The percentage is the share of the total pool on that side. 60% on Option A means 60% of all staked money is on Option A. It reflects market consensus on the likely outcome — but not our official prediction.',
      },
      {
        q: 'Are there any fees?',
        a: 'Sabula 256 keeps the lights on through a small platform fee on qualifying markets. There are no fees on deposits or withdrawals from our side. Your mobile network operator may apply standard Mobile Money charges.',
      },
      {
        q: 'What are Up/Down markets?',
        a: 'Up/Down markets are special markets on numeric outcomes like BTC price or UGX exchange rate. You bet on whether the value will be Up or Down by the closing time. They follow the same parimutuel rules as regular markets.',
      },
      {
        q: 'Who creates the markets?',
        a: 'Anyone can create a market! Go to the Create page, write your question, set two sides, and stake UGX 5,000 to launch it instantly. Admin also publishes markets on Uganda politics, football, economy, and more. You can also submit proposals via the Proposals page for the community to vote on.',
      },
      {
        q: 'What does "Pool depth" mean?',
        a: 'Pool depth rates how liquid a market is based on total money staked. Seed (<100k UGX) means very thin — odds shift a lot with each bet. Liquid (≥10M UGX) means stable odds. Deeper pools generally mean more accurate prices.',
      },
    ],
  },
  {
    id: 'payouts',
    icon: '🏆',
    color: '#f472b6',
    title: 'Payouts & Settling',
    faqs: [
      {
        q: 'How is the payout calculated?',
        a: 'Payout = (Your Stake ÷ Total Winning Pool) × Total Pool. Example: You staked UGX 10,000 on the winning side. Total pool is UGX 100,000 and the winning pool is UGX 40,000. Your payout = (10,000 ÷ 40,000) × 100,000 = UGX 25,000.',
      },
      {
        q: 'When do I get paid?',
        a: 'As soon as a market is settled by admin, winning payouts are automatically credited to your Sabula 256 wallet. There\'s no need to claim — it\'s instant.',
      },
      {
        q: 'How does admin settle markets?',
        a: 'When the real-world event resolves, the admin reviews the outcome, confirms the winning option, and marks the market as settled. The system then automatically distributes payouts to all winning bettors.',
      },
      {
        q: 'What happens if my side wins but only I bet on it?',
        a: 'You get the entire pool. The formula rewards the winning side regardless of how many people were on it.',
      },
      {
        q: 'What happens if a market is suspended?',
        a: 'A suspended market means betting has been paused due to unusual activity. Admin reviews it. If it resumes, bets remain valid. If it is cancelled, all bets are refunded to wallets in full.',
      },
    ],
  },
  {
    id: 'account-security',
    icon: '🔒',
    color: '#22d3ee',
    title: 'Account & Security',
    faqs: [
      {
        q: 'How do I enable Two-Factor Authentication (2FA)?',
        a: 'Go to Profile → Two-Factor Authentication → Enable 2FA. Scan the QR code with Google Authenticator or any TOTP app, then confirm with the 6-digit code. Once enabled, you\'ll need the code every time you log in.',
      },
      {
        q: 'How does the referral program work?',
        a: 'Go to your Profile page to find your unique referral link. Share it with friends. When a friend signs up through your link and makes their first deposit, UGX 5,000 is automatically added to your wallet. There\'s no limit on how many people you can refer.',
      },
      {
        q: 'I forgot my password. What do I do?',
        a: 'On the login page, click "Forgot password?" and enter your email. You\'ll receive a reset link. If you don\'t see it, check your spam folder.',
      },
      {
        q: 'Why is my account restricted?',
        a: 'Accounts can be restricted for several reasons: failed KYC, suspicious activity detected, or responsible gambling limits you set yourself. Check the Account Flags section in your profile, or contact support for details.',
      },
      {
        q: 'How do I set deposit or betting limits?',
        a: 'Go to Responsible Play (accessible from the account menu). You can set daily deposit limits, cooling-off periods, or self-exclude from the platform.',
      },
    ],
  },
]

function Accordion({ faq }: { faq: { q: string; a: string } }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-[#1e1e2e] last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left text-sm font-semibold text-slate-200 transition-colors hover:text-white"
      >
        <span>{faq.q}</span>
        <span
          className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full border border-[#2a2a3e] text-slate-500 transition-all"
          style={{ transform: open ? 'rotate(45deg)' : 'none' }}
        >
          +
        </span>
      </button>
      {open && (
        <div className="px-6 pb-5 text-sm leading-relaxed text-slate-400">
          {faq.a}
        </div>
      )}
    </div>
  )
}

export default function HelpPage() {
  const [active, setActive] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-[#0a0a0f]">

      {/* ── Header ── */}
      <div className="border-b border-[#1e1e2e] bg-[#0d0d14] px-4 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">Help Centre</p>
          <h1 className="mb-3 text-4xl font-black text-white">
            How can we <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">help you?</span>
          </h1>
          <p className="text-slate-500">
            Everything you need to know about deposits, betting, payouts and your account.
          </p>
          <div className="mt-6">
            <Link
              href="/support"
              className="inline-block rounded-xl border border-violet-800/40 bg-violet-900/20 px-5 py-2.5 text-sm font-semibold text-violet-400 transition-colors hover:bg-violet-900/40"
            >
              Can&apos;t find your answer? Contact support →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Section nav ── */}
      <div className="sticky top-[61px] z-10 border-b border-[#1e1e2e] bg-[#0d0d14]/95 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl overflow-x-auto px-4">
          <div className="flex gap-1 py-2 scrollbar-none">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => {
                  setActive(s.id)
                  document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors"
                style={
                  active === s.id
                    ? { color: s.color, background: `${s.color}18` }
                    : { color: '#64748b' }
                }
              >
                {s.icon} {s.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── FAQ sections ── */}
      <div className="mx-auto max-w-3xl px-4 py-12 space-y-8">
        {SECTIONS.map(section => (
          <div key={section.id} id={section.id}>
            <div className="mb-4 flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
                style={{ background: `${section.color}15` }}
              >
                {section.icon}
              </div>
              <h2 className="text-xl font-black" style={{ color: section.color }}>{section.title}</h2>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[#1e1e2e] bg-[#0d0d14]">
              {section.faqs.map(faq => (
                <Accordion key={faq.q} faq={faq} />
              ))}
            </div>
          </div>
        ))}

        {/* ── Bottom CTA ── */}
        <div className="rounded-2xl border border-[#2a2a3e] bg-[#0d0d14] p-8 text-center">
          <p className="mb-2 text-xl font-black text-white">Still stuck?</p>
          <p className="mb-5 text-sm text-slate-500">
            Our support team is available to help with any questions not covered here.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/support"
              className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-500"
            >
              Contact Support →
            </Link>
            <Link
              href="/markets"
              className="rounded-xl border border-[#2a2a3e] bg-[#111118] px-6 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:text-white"
            >
              Browse Markets
            </Link>
          </div>
        </div>
      </div>

    </div>
  )
}
