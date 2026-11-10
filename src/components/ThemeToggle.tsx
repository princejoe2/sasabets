'use client'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

function SunIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4.5" />
      <path strokeLinecap="round" d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}
function MoonIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
    </svg>
  )
}

/** Sliding light/dark switch. `withLabel` renders a full-width row (used in the mobile "Me" sheet). */
export default function ThemeToggle({ withLabel = false }: { withLabel?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const dark   = !mounted || resolvedTheme !== 'light'
  const toggle = () => setTheme(dark ? 'light' : 'dark')

  const pill = (
    <span
      aria-hidden
      className="relative inline-flex h-7 w-[52px] shrink-0 items-center rounded-full border border-mk-border bg-mk-raised transition-colors"
    >
      <span className="absolute left-[7px] text-mk-muted"><SunIcon /></span>
      <span className="absolute right-[7px] text-mk-muted"><MoonIcon /></span>
      <span
        className={[
          'relative z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-mk-accent text-black shadow transition-transform duration-200',
          dark ? 'translate-x-[26px]' : 'translate-x-[2px]',
        ].join(' ')}
      >
        {dark ? <MoonIcon /> : <SunIcon />}
      </span>
    </span>
  )

  if (withLabel) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={dark}
        onClick={toggle}
        className="flex w-full items-center gap-4 px-5 py-4 text-sm font-semibold text-mk-secondary transition-colors hover:bg-mk-raised hover:text-mk-text"
      >
        <span className="text-xl leading-none">{dark ? '🌙' : '☀️'}</span>
        <span className="text-[15px]">{dark ? 'Dark mode' : 'Light mode'}</span>
        <span className="ml-auto">{pill}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      onClick={toggle}
      className="flex items-center"
    >
      {pill}
    </button>
  )
}
