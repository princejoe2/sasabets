import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'FAQ – How Sabula 256 Works',
  description: 'Answers to the most common questions about Sabula 256 — Uganda\'s prediction market. How to deposit, withdraw, create markets, and win real money via Mobile Money.',
  alternates: { canonical: 'https://sabula256.com/faq' },
  openGraph: {
    title: 'FAQ – How Sabula 256 Works | Sabula 256',
    description: 'How do prediction markets work? How do I deposit with Mobile Money? How are winnings calculated? All your Sabula 256 questions answered.',
    url: 'https://sabula256.com/faq',
  },
}

const FAQS = [
  {
    section: 'About Sabula 256',
    items: [
      {
        q: 'What is Sabula 256?',
        a: 'Sabula 256 is Uganda\'s community prediction market. Users stake real money on the outcome of future events — football matches, elections, economic indicators, and more. Correct predictors split the entire prize pool. The platform takes an 8% rake on qualifying pools; there is no house edge.',
      },
      {
        q: 'Is Sabula 256 a sports betting site?',
        a: 'No. Sabula 256 is a prediction market, not a traditional sports betting shop. In a prediction market, users bet against each other — not against a bookmaker. Odds are set by the crowd\'s money, not by the house. Anyone can also create a market on any topic, not just pre-selected sports events.',
      },
      {
        q: 'Is Sabula 256 legal in Uganda?',
        a: 'Sabula 256 operates as a prediction market platform in Uganda. We follow responsible gambling guidelines, restrict access to users aged 18 and above, and require KYC verification for large withdrawals to comply with local financial regulations.',
      },
      {
        q: 'Where is Sabula 256 based?',
        a: 'Sabula 256 is based in Uganda and built specifically for the East African market. Payments are exclusively via MTN and Airtel Mobile Money. All amounts are in Uganda Shillings (UGX).',
      },
      {
        q: 'Who can use Sabula 256?',
        a: 'Anyone in Uganda aged 18 or above with an MTN or Airtel Mobile Money number. No bank account is required. Registration takes under 2 minutes.',
      },
    ],
  },
  {
    section: 'How Prediction Markets Work',
    items: [
      {
        q: 'How does a parimutuel prediction market work?',
        a: 'All money staked on a market goes into a shared pool. When the market settles, winners split the entire pool proportionally to their stake. The payout formula is: your payout = (your stake ÷ winning side pool) × (total pool × 0.92). The 0.92 accounts for the 8% platform rake.',
      },
      {
        q: 'How are odds calculated on Sabula 256?',
        a: 'Odds are set by the crowd, not by a bookmaker. The probability of each outcome is simply the proportion of money on that side: if UGX 60,000 is on YES and UGX 40,000 is on NO, YES has a 60% implied probability. As more money flows in, odds shift in real time.',
      },
      {
        q: 'What happens if I pick early vs late?',
        a: 'Early predictors who back the winning outcome get better returns, because fewer people have staked at that point. As more money piles onto the winning side, the payout per shilling drops. Late money dilutes the pool — you still win, but you share with more people.',
      },
      {
        q: 'Can I exit a prediction before the market closes?',
        a: 'Yes. You can use the Early Exit feature to cancel your bet and recover your stake minus a 25% exit fee. Go to My Bets → find the prediction → tap Exit.',
      },
      {
        q: 'What is the rake threshold?',
        a: 'The 8% rake is only charged on markets where the total pool is UGX 50,000 or more. Markets with smaller pools pay out 100% to winners — no rake deducted.',
      },
    ],
  },
  {
    section: 'Deposits & Withdrawals',
    items: [
      {
        q: 'How do I deposit money?',
        a: 'Go to Wallet → Deposit. Enter the amount and your MTN or Airtel Mobile Money number. You\'ll receive a payment prompt on your phone. Approve it and funds appear in your Sabula 256 wallet within seconds. Minimum deposit is UGX 2,000.',
      },
      {
        q: 'How do I withdraw my winnings?',
        a: 'Go to Wallet → Withdraw. Enter the amount and your Mobile Money number. Withdrawals are processed within minutes. Minimum withdrawal is UGX 5,000; maximum is UGX 1,000,000 per transaction. Up to 3 withdrawals per hour.',
      },
      {
        q: 'Are there fees on withdrawals?',
        a: 'Sabula 256 does not charge withdrawal fees. Your mobile network operator may apply their standard Mobile Money transaction charges.',
      },
      {
        q: 'When is KYC required?',
        a: 'KYC (identity verification) is required when your total withdrawals in a rolling 30-day period exceed UGX 5,000,000. You\'ll need to provide a National ID or passport.',
      },
    ],
  },
  {
    section: 'Placing Predictions',
    items: [
      {
        q: 'What is the minimum stake?',
        a: 'The minimum stake per prediction is UGX 1,000.',
      },
      {
        q: 'Can I bet on multiple outcomes?',
        a: 'Currently, each user can place one prediction per market. You pick one side and stake on it. If you want to change your mind, use the Early Exit feature (25% fee) and place a new bet.',
      },
      {
        q: 'When do I get paid?',
        a: 'Winnings are credited to your in-app wallet automatically when admin settles the market. You\'ll receive a push notification. Withdraw to Mobile Money at any time after that.',
      },
      {
        q: 'What topics can I predict on?',
        a: 'Football (Uganda Cranes, FUFA Premier League, AFCON, Champions League, Ballon d\'Or), Uganda elections and politics, economic indicators (UGX exchange rate, fuel prices, Bank of Uganda rate), entertainment events (music awards, Nyege Nyege festival), tech (MTN 5G, Bitcoin), infrastructure (EACOP, expressways), and community-created markets on any topic.',
      },
    ],
  },
  {
    section: 'Creating Markets',
    items: [
      {
        q: 'Can I create my own prediction market?',
        a: 'Yes. Any registered user can create a market at sabula256.com/create. You need UGX 5,000 as a launch stake (which counts as your first bet). Markets can be public or private (invite link only). Rate limit: 5 markets per user per day.',
      },
      {
        q: 'Do I earn money when my market is popular?',
        a: 'Yes. Market creators earn a 2% share of the total pool when their market settles, as long as the pool is at least UGX 50,000. Earnings are credited to your wallet automatically.',
      },
      {
        q: 'How are community markets settled?',
        a: 'Community markets require at least 2 non-creator bettors and an admin settlement note before they can be settled. The admin declares the winning outcome and all winners are paid automatically.',
      },
    ],
  },
  {
    section: 'Account & Safety',
    items: [
      {
        q: 'What responsible gambling tools does Sabula 256 offer?',
        a: 'Daily deposit limits, self-exclusion (temporarily lock your account), and cooling-off periods. Visit sabula256.com/responsible-gambling to set these up.',
      },
      {
        q: 'Is my money safe on Sabula 256?',
        a: 'User funds are held in segregated wallets and are not used for operational expenses. All transactions are logged and auditable. We use two-factor authentication (TOTP) for admin accounts and support it for users.',
      },
      {
        q: 'How do I contact support?',
        a: 'Go to sabula256.com/support to submit a complaint or question. Support email: support@sabula256.com.',
      },
    ],
  },
]

const JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.flatMap(s =>
    s.items.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    }))
  ),
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-mk-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }}
      />

      {/* Header */}
      <div className="border-b border-mk-border bg-mk-card px-4 pt-10 pb-8">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-mk-muted">Help Centre</p>
          <h1 className="text-4xl font-black tracking-tight text-white">
            Frequently Asked <span className="text-mk-accent">Questions</span>
          </h1>
          <p className="mt-3 text-mk-muted">
            Everything you need to know about Sabula 256 — Uganda&apos;s prediction market.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10 space-y-12">
        {FAQS.map(section => (
          <section key={section.section}>
            <h2 className="mb-5 text-xs font-bold uppercase tracking-widest text-mk-accent">
              {section.section}
            </h2>
            <div className="space-y-4">
              {section.items.map(item => (
                <div
                  key={item.q}
                  className="rounded-2xl border border-mk-border bg-mk-card p-5"
                >
                  <h3 className="mb-2 font-bold text-white">{item.q}</h3>
                  <p className="text-sm leading-relaxed text-mk-muted">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* CTA */}
        <div className="rounded-2xl border border-mk-border bg-mk-raised p-6 text-center">
          <p className="mb-1 font-bold text-white">Still have questions?</p>
          <p className="mb-5 text-sm text-mk-muted">Our support team reads every message.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/support"
              className="rounded-xl bg-mk-accent px-6 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-80"
            >
              Contact Support
            </Link>
            <Link
              href="/help"
              className="rounded-xl border border-mk-border bg-mk-card px-6 py-2.5 text-sm font-semibold text-mk-text transition-colors hover:border-mk-accent/40"
            >
              Full Help Centre
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
