'use client'

import dynamic from 'next/dynamic'

// Next 15 disallows `next/dynamic` with `ssr: false` inside Server Components.
// These widgets read sessionStorage/auth on the client and must not SSR, so the
// dynamic imports live here in a Client Component and are re-exported for use by
// the server layouts.

export const ClosingSoonBanner = dynamic(() => import('@/components/ClosingSoonBanner'), { ssr: false })
export const StreakTracker = dynamic(() => import('@/components/StreakTracker'), { ssr: false })
export const MobileInstallGate = dynamic(() => import('@/components/MobileInstallGate'), { ssr: false })
