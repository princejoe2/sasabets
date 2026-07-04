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
    default: 'Sabula 256 – Create & Predict. Win Real Money.',
    template: '%s | Sabula 256',
  },
  description: "Uganda's community prediction market. Create your own market or join one — predict politics, football, economy and more. Win on MTN or Airtel Mobile Money.",
  keywords: [
    'create prediction market Uganda', 'Uganda prediction market', 'community prediction market',
    'Uganda betting', 'MTN mobile money betting', 'Uganda elections prediction',
    'FUFA betting Uganda', 'Uganda football prediction', 'make your own betting market',
    'parimutuel Uganda', 'mobile money prediction', 'Sabula 256',
  ],
  authors: [{ name: 'Sabula 256' }],
  creator: 'Sabula 256',
  openGraph: {
    type: 'website',
    locale: 'en_UG',
    url: BASE,
    siteName: 'Sabula 256',
    title: 'Sabula 256 – Create & Predict. Win Real Money.',
    description: "Create your own prediction market or join one. Uganda politics, football, economy. Win on MTN or Airtel Mobile Money.",
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Sabula 256 – Create & Predict. Win Real Money.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sabula 256 – Create & Predict. Win Real Money.',
    description: "Uganda's community prediction market. Create your own market or join one. Win via Mobile Money.",
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
