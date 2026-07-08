import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Responsible Gambling — Sabula 256',
  description: 'Sabula 256 responsible gambling tools: deposit limits, self-exclusion, and support resources for Uganda.',
  alternates: { canonical: 'https://sabula256.com/responsible-gambling' },
}

export default function RespGamblingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
