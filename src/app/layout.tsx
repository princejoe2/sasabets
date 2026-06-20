import type { Metadata } from 'next'
import './globals.css'
import CursorEffects from '@/components/CursorEffects'

export const metadata: Metadata = {
  title: 'Sabula 256 – Uganda Prediction Markets',
  description: 'East Africa\'s prediction platform. Predict outcomes, earn on mobile money.',
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
