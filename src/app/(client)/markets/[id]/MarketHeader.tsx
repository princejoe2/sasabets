'use client'
import { useState, useEffect } from 'react'
import type { MarketData } from './types'

const CAT_IMAGES: Record<string, string> = {
  football:       'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120&q=60&auto=format&fit=crop',
  politics:       'https://images.unsplash.com/photo-1529107386316-0d2ef31753c0?w=120&q=60&auto=format&fit=crop',
  economy:        'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=120&q=60&auto=format&fit=crop',
  entertainment:  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=120&q=60&auto=format&fit=crop',
  tech:           'https://images.unsplash.com/photo-1512941937938-2bdb01e0f36f?w=120&q=60&auto=format&fit=crop',
  infrastructure: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=120&q=60&auto=format&fit=crop',
  agriculture:    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=120&q=60&auto=format&fit=crop',
  default:        'https://images.unsplash.com/photo-1518373714866-3f1b98b28e34?w=120&q=60&auto=format&fit=crop',
}

function detectCategory(title: string, desc = '') {
  const t = (title + ' ' + desc).toLowerCase()
  if (/football|soccer|vipers|cranes|afcon/.test(t))      return 'football'
  if (/president|election|parliament|museveni|besigye/.test(t)) return 'politics'
  if (/oil|exchange.?rate|ugx.*usd|bank/.test(t))         return 'economy'
  if (/music|artist|album|nyege|eddy/.test(t))            return 'entertainment'
  if (/5g|telecom|mtn/.test(t))                           return 'tech'
  if (/expressway|railway|road/.test(t))                  return 'infrastructure'
  if (/rainfall|agriculture|crop/.test(t))                return 'agriculture'
  return 'default'
}

function fmtPool(n: number) {
  if (n >= 1_000_000) return `UGX ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `UGX ${Math.round(n / 1_000)}K`
  return `UGX ${n.toLocaleString()}`
}

type Props = {
  market: MarketData
  creatorInfo?: { name: string; username: string | null; verified: boolean } | null
  predictorCount: number
}

export default function MarketHeader({ market, creatorInfo, predictorCount }: Props) {
  const [copied,     setCopied]     = useState(false)
  const [closeLabel, setCloseLabel] = useState<string | null>(null)
  const [closeSoon,  setCloseSoon]  = useState(false)

  const cat    = detectCategory(market.title, market.description ?? '')
  const imgSrc = CAT_IMAGES[cat]
  const meta   = market.metadata ?? {}
  const resolutionSource = typeof meta.resolution_source === 'string' ? meta.resolution_source : null
  const marketUrl  = `https://sabula256.com/markets/${market.id}`
  const shareText  = encodeURIComponent(`"${market.title}" — Predict on Sabula 256 🔮 ${marketUrl}`)

  useEffect(() => {
    if (!market.closes_at || market.status !== 'open') return
    function update() {
      const ms = new Date(market.closes_at!).getTime() - Date.now()
      if (ms <= 0) { setCloseLabel('Closed'); setCloseSoon(true); return }
      const h = Math.floor(ms / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      setCloseSoon(ms < 86400000)
      setCloseLabel(h > 0 ? `Closes in ${h}h ${m}m` : `Closes in ${m}m`)
    }
    update()
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [market.closes_at, market.status])

  function copyLink() {
    navigator.clipboard?.writeText(marketUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-4 py-4 border-b border-mk-border">
      {/* Market image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt={cat}
        className="h-12 w-12 sm:h-16 sm:w-16 shrink-0 rounded-r-card object-cover"
      />

      {/* Title + breadcrumb */}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-mk-muted mb-1 flex flex-wrap items-center gap-1.5">
          <span className="capitalize">{cat}</span>
          <span className="text-mk-border">·</span>
          <span className="flex items-center gap-1 text-mk-yes">
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
            verified
          </span>
          {resolutionSource && (
            <>
              <span className="text-mk-border">·</span>
              <a
                href={resolutionSource}
                target="_blank"
                rel="noopener noreferrer"
                className="text-mk-accent hover:underline"
              >
                Check source ↗
              </a>
            </>
          )}
          {creatorInfo && (
            <>
              <span className="text-mk-border">·</span>
              <span>
                by{' '}
                {creatorInfo.username
                  ? <span className="text-violet-400">@{creatorInfo.username}</span>
                  : creatorInfo.name
                }
                {creatorInfo.verified && (
                  <span className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-mk-yes text-[7px] font-black text-black">✓</span>
                )}
              </span>
            </>
          )}
        </p>
        <h1 className="text-lg sm:text-2xl font-bold text-mk-text leading-tight line-clamp-2">{market.title}</h1>
        {market.description && (
          <p className="mt-1.5 text-sm text-mk-muted leading-relaxed max-w-2xl">{market.description}</p>
        )}
        {/* Stat row */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="inline-flex items-center gap-1 rounded-r-pill border border-mk-border bg-mk-raised px-2.5 py-1 text-[12px] text-mk-muted">
            💰 {fmtPool(Number(market.total_pool))}
          </span>
          <span className="inline-flex items-center gap-1 rounded-r-pill border border-mk-border bg-mk-raised px-2.5 py-1 text-[12px] text-mk-muted">
            👥 {predictorCount} predictor{predictorCount !== 1 ? 's' : ''}
          </span>
          {closeLabel && (
            <span className={`inline-flex items-center gap-1 rounded-r-pill border px-2.5 py-1 text-[12px] ${
              closeSoon
                ? 'border-red-800/40 bg-red-900/20 text-red-400'
                : 'border-mk-border bg-mk-raised text-mk-muted'
            }`}>
              ⏱ {closeLabel}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 shrink-0">
        <a
          href={`https://wa.me/?text=${shareText}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on WhatsApp"
          className="flex h-9 w-9 items-center justify-center rounded-r-btn border border-mk-border bg-mk-card text-mk-muted hover:text-mk-text hover:border-mk-raised transition-colors"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51A11.945 11.945 0 0012 2C6.477 2 2 6.477 2 12c0 1.9.497 3.681 1.371 5.219L2 22l4.904-1.286A9.945 9.945 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
          </svg>
        </a>
        <button
          onClick={copyLink}
          aria-label={copied ? 'Copied!' : 'Copy link'}
          className="flex h-9 w-9 items-center justify-center rounded-r-btn border border-mk-border bg-mk-card text-mk-muted hover:text-mk-text hover:border-mk-raised transition-colors"
        >
          {copied ? (
            <svg className="h-4 w-4 text-mk-yes" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
