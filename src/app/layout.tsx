import type { Metadata } from 'next'
import './globals.css'
import CursorEffects from '@/components/CursorEffects'
import ThemeProvider from '@/components/ThemeProvider'
import PushNotificationPrompt from '@/components/PushNotificationPrompt'
import dynamic from 'next/dynamic'

const MobileInstallGate = dynamic(() => import('@/components/MobileInstallGate'), { ssr: false })

const BASE = 'https://sabula256.com'

export const metadata: Metadata = {
  verification: {
    google: 'keICCmUnIZ-6cdt2gUUGUimARGNTkuRT1iy-d2J-VJo',
  },
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
        url: '/opengraph-image',
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
    images: ['/opengraph-image'],
    creator: '@sabula256',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sabula 256',
  },
  themeColor: '#7c3aed',
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <ThemeProvider>
          <CursorEffects />
          <MobileInstallGate />
          {children}
          <PushNotificationPrompt />
        </ThemeProvider>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
          }
        `}} />
      </body>
    </html>
  )
}
