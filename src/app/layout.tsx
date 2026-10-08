import type { Metadata, Viewport } from 'next'
import './globals.css'
import { supreme, chubbo, inter } from '@/lib/fonts'
import CursorEffects from '@/components/CursorEffects'
import ThemeProvider from '@/components/ThemeProvider'
import PushNotificationPrompt from '@/components/PushNotificationPrompt'
import { GoogleAnalytics } from '@next/third-parties/google'

const BASE = 'https://sabula256.com'

export const metadata: Metadata = {
  verification: {
    google: 'keICCmUnIZ-6cdt2gUUGUimARGNTkuRT1iy-d2J-VJo',
    other: { 'msvalidate.01': '3CCAAE300B0B9E5ED67FC0DAD49AD1AB' },
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
  alternates: { canonical: 'https://sabula256.com' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Sabula 256',
  },
  icons: {
    icon: [
      { url: '/sabula256-icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    shortcut: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`dark ${supreme.variable} ${chubbo.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-black text-[#F5F5F5] antialiased">
        <ThemeProvider>
          <CursorEffects />
          {children}
          <PushNotificationPrompt />
        </ThemeProvider>
        <GoogleAnalytics gaId="G-29V6N9CY5C" />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
          }
        `}} />
      </body>
    </html>
  )
}
