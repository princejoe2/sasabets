'use client'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

// Dark by default; the visitor's choice is remembered (localStorage 'theme').
// The admin panel is always dark.
export default function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const forced   = pathname?.startsWith('/admin') ? 'dark' : undefined
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      themes={['light', 'dark']}
      forcedTheme={forced}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
