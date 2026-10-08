import localFont from 'next/font/local'
import { Inter } from 'next/font/google'

export const supreme = localFont({
  src: '../../public/fonts/Supreme-Regular.woff2',
  variable: '--font-supreme',
  weight: '400',
  display: 'swap',
})

export const chubbo = localFont({
  src: '../../public/fonts/Chubbo-Bold.woff2',
  variable: '--font-chubbo',
  weight: '700',
  display: 'swap',
})

export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})
