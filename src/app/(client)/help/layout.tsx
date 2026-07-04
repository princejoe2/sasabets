import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Help Centre',
  description: 'How to create markets, place predictions, deposit and withdraw on Sabula 256 — Uganda\'s community prediction market. Get paid via MTN or Airtel Mobile Money.',
  openGraph: {
    title: 'Help Centre | Sabula 256',
    description: 'How to create markets, predict, deposit and withdraw on Uganda\'s community prediction market.',
    url: 'https://sabula256.com/help',
  },
}

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
