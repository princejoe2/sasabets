import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Help Centre — Sabula 256',
  description: 'Predict on Sabula 256 — Uganda\'s #1 prediction market — and get answers fast. Full guide to deposits, betting, payouts and your account. Win on MTN or Airtel Mobile Money.',
  openGraph: {
    title: 'Help Centre | Sabula 256',
    description: 'Everything you need to know about deposits, bets, payouts and your Sabula 256 account. Uganda\'s prediction market powered by Mobile Money.',
    url: 'https://sabula256.com/help',
  },
}

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
