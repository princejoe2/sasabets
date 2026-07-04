import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create a Prediction Market',
  description: 'Ask any question, set two sides, stake UGX 5,000 and your market goes live instantly. Share the link — winners split the pool via MTN or Airtel Mobile Money.',
  keywords: [
    'create prediction market Uganda', 'make a betting market', 'start a prediction market',
    'community market Uganda', 'Uganda mobile money prediction',
  ],
  alternates: { canonical: 'https://sabula256.com/create' },
  openGraph: {
    title: 'Create a Prediction Market | Sabula 256',
    description: 'Ask any question, set two sides, stake UGX 5,000 and your market goes live instantly on Sabula 256.',
    url: 'https://sabula256.com/create',
  },
}

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
