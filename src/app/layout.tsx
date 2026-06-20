import type { Metadata } from 'next'
import './globals.css'
import CursorEffects from '@/components/CursorEffects'

const BASE = 'https://sabula256.com'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: 'Sabula 256 – Uganda Prediction Markets',
    template: '%s | Sabula 256',
  },
  description: "East Africa's #1 prediction market. Predict real-world outcomes and win on MTN Mobile Money. Uganda politics, World Cup 2026, crypto and more.",
  keywords: ['prediction market', 'Uganda', 'betting', 'mobile money', 'MTN', 'World Cup', 'Besigye', 'Museveni'],
  authors: [{ name: 'Sabula 256' }],
  creator: 'Sabula 256',
  openGraph: {
    type: 'website',
    locale: 'en_UG',
    url: BASE,
    siteName: 'Sabula 256',
    title: 'Sabula 256 – Uganda Prediction Markets',
    description: "East Africa's #1 prediction market. Predict real-world outcomes and win on MTN Mobile Money.",
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Sabula 256 – Uganda Prediction Markets',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sabula 256 – Uganda Prediction Markets',
    description: "East Africa's #1 prediction market. Predict outcomes, earn on mobile money.",
    images: ['/og-image.png'],
    creator: '@sabula256',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0f] text-slate-200">
        <CursorEffects />
        {children}
      </body>
    </html>
  )
}
