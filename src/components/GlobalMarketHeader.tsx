'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const CATEGORIES = [
  { label: '🔥 Hot',         href: '/markets?cat=hot' },
  { label: 'New',            href: '/markets?cat=new' },
  { label: 'Politics',       href: '/markets?cat=politics' },
  { label: 'Football',       href: '/markets?cat=football' },
  { label: 'Economy',        href: '/markets?cat=economy' },
  { label: 'Entertainment',  href: '/markets?cat=entertainment' },
  { label: 'Technology',     href: '/markets?cat=tech' },
  { label: 'Infrastructure', href: '/markets?cat=infrastructure' },
  { label: 'Agriculture',    href: '/markets?cat=agriculture' },
]

type Props = {
  isLoggedIn: boolean
  balance: number | null
  activeCategory?: string
}

export default function GlobalMarketHeader({ isLoggedIn, balance }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.key === '/' &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault()
        document.getElementById('market-search')?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (search.trim()) router.push(`/markets?q=${encodeURIComponent(search.trim())}`)
  }

  return (
    <header className="sticky top-0 z-sticky-header border-b border-mk-border bg-mk-bg/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4">
        {/* Top row */}
        <div className="flex h-14 items-center gap-3">
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-2 mr-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mk-accent text-[#000] font-black text-sm">
              S
            </div>
            <span className="hidden sm:block font-bold text-mk-text text-sm tracking-tight">
              Sabula 256
            </span>
          </Link>

          {/* Search — wide on desktop */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden sm:flex">
            <div className="relative w-full">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mk-muted"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"/>
              </svg>
              <input
                id="market-search"
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search markets…"
                className="w-full rounded-r-btn bg-mk-card border border-mk-border pl-9 pr-10 py-2 text-sm text-mk-text placeholder:text-mk-muted outline-none focus:border-mk-accent transition-colors"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-mk-muted border border-mk-border rounded px-1">
                /
              </kbd>
            </div>
          </form>

          {/* Mobile search icon */}
          <button
            className="sm:hidden ml-auto p-2 text-mk-muted hover:text-mk-text"
            aria-label="Search"
            onClick={() => router.push('/markets')}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"/>
            </svg>
          </button>

          {/* Auth area */}
          <div className="ml-auto flex items-center gap-2">
            {isLoggedIn && balance !== null ? (
              <Link
                href="/wallet"
                className="flex items-center gap-2 rounded-r-btn border border-mk-border bg-mk-card px-3 py-1.5 text-sm hover:border-mk-accent/50 transition-colors"
              >
                <span className="text-mk-muted text-xs">Bal</span>
                <span className="tabular font-semibold text-mk-text">
                  UGX {Number(balance).toLocaleString()}
                </span>
              </Link>
            ) : (
              <Link
                href="/auth"
                className="rounded-r-btn bg-mk-accent px-4 py-2 text-sm font-bold text-black hover:brightness-110 transition-all"
                style={{ boxShadow: '0 4px 0 #15803d' }}
              >
                Sign in to trade
              </Link>
            )}
          </div>
        </div>

        {/* Category row */}
        <div className="flex gap-0.5 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
          {CATEGORIES.map((cat, i) => (
            <span key={cat.label}>
              {i === 2 && (
                <span className="mx-2 inline-block w-px h-4 bg-mk-border self-center" />
              )}
              <Link
                href={cat.href}
                className="shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap text-mk-muted hover:text-mk-secondary"
              >
                {cat.label}
              </Link>
            </span>
          ))}
        </div>
      </div>
    </header>
  )
}
