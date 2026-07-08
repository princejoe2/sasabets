import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'News & Insights — Sabula 256',
  description: 'Latest Uganda sports, politics, and economy news from Sabula 256. Follow the events that matter and predict what happens next.',
  alternates: { canonical: 'https://sabula256.com/news' },
}

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
