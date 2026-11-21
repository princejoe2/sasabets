import type { Metadata, Viewport } from 'next'
import './globals.css'
import { supreme, chubbo, inter } from '@/lib/fonts'
import CursorEffects from '@/components/CursorEffects'
import ThemeProvider from '@/components/ThemeProvider'
import PushNotificationPrompt from '@/components/PushNotificationPrompt'
import RouteProgressBar from '@/components/RouteProgressBar'
import { GoogleAnalytics } from '@next/third-parties/google'
import { Analytics } from '@vercel/analytics/next'

const BASE = 'https://sabula256.com'

export const metadata: Metadata = {
  verification: {
    google: 'keICCmUnIZ-6cdt2gUUGUimARGNTkuRT1iy-d2J-VJo',
    other: { 'msvalidate.01': '3CCAAE300B0B9E5ED67FC0DAD49AD1AB' },
  },
  metadataBase: new URL(BASE),
  title: {
    default: "Sabula 256 – Uganda's Prediction Market | Win via Mobile Money",
    template: '%s | Sabula 256',
  },
  description: "Uganda's community prediction market. Create your own market or join one — predict politics, football, economy and more. Win on MTN or Airtel Mobile Money.",
  applicationName: 'Sabula 256',
  keywords: [
    'prediction market Uganda', 'Uganda prediction market', 'community prediction market',
    'Uganda football predictions', 'Uganda election predictions', 'Mobile Money predictions',
    'create prediction market Uganda', 'parimutuel Uganda', 'Sabula 256',
  ],
  authors: [{ name: 'Sabula 256', url: BASE }],
  creator: 'Sabula 256',
  publisher: 'Sabula 256',
  category: 'prediction markets',
  // NOTE: no `alternates.canonical` and no `openGraph.url` here on purpose. Metadata
  // set in the root layout is inherited by every page that does not override it, so a
  // root canonical silently canonicalises those pages to the homepage. Each page sets
  // its own canonical via pageMeta() in '@/lib/seo'.
  openGraph: {
    type: 'website',
    locale: 'en_UG',
    siteName: 'Sabula 256',
    title: "Sabula 256 – Uganda's Prediction Market",
    description: "Create your own prediction market or join one. Uganda politics, football, economy. Win on MTN or Airtel Mobile Money.",
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: "Sabula 256 – Uganda's community prediction market",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Sabula 256 – Uganda's Prediction Market",
    description: "Uganda's community prediction market. Create your own market or join one. Win via Mobile Money.",
    images: ['/opengraph-image'],
    site: '@sabula256',
    creator: '@sabula256',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
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
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
  colorScheme: 'dark light',
}

const ORG_JSONLD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://sabula256.com/#organization',
      name: 'Sabula 256',
      url: 'https://sabula256.com',
      logo: { '@type': 'ImageObject', url: 'https://sabula256.com/icon-512.png', width: 512, height: 512 },
      image: 'https://sabula256.com/opengraph-image',
      description: "Uganda's community prediction market. Create or join markets on politics, football, economy and more. Win via MTN or Airtel Mobile Money.",
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'support@sabula256.com',
        contactType: 'customer support',
        areaServed: 'UG',
        availableLanguage: ['en'],
        url: 'https://sabula256.com/help',
      },
      areaServed: { '@type': 'Country', name: 'Uganda' },
      knowsAbout: ['prediction markets', 'Uganda football', 'Uganda politics', 'Mobile Money', 'parimutuel betting'],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://sabula256.com/#website',
      url: 'https://sabula256.com',
      name: 'Sabula 256',
      alternateName: ['Sabula256', 'Sabula'],
      description: "Uganda's community prediction market.",
      inLanguage: 'en-UG',
      publisher: { '@id': 'https://sabula256.com/#organization' },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: 'https://sabula256.com/markets?q={search_term_string}' },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-UG" suppressHydrationWarning className={`${supreme.variable} ${chubbo.variable} ${inter.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD) }}
        />
      </head>
      <body className="min-h-screen bg-mk-bg text-mk-text antialiased">
        <ThemeProvider>
          <RouteProgressBar />
          <CursorEffects />
          {children}
          <PushNotificationPrompt />
        </ThemeProvider>
        <GoogleAnalytics gaId="G-29V6N9CY5C" />
        <Analytics />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
          }
        `}} />
      </body>
    </html>
  )
}
