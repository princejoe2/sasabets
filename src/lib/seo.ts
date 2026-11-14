import type { Metadata } from 'next'

export const SITE_URL = 'https://sabula256.com'
export const SITE_NAME = 'Sabula 256'

export const DEFAULT_OG_IMAGE = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: "Sabula 256 – Uganda's community prediction market",
}

type PageMetaInput = {
  /** Page title. The root layout template appends " | Sabula 256" unless `absoluteTitle` is set. */
  title: string
  description: string
  /** Path starting with "/" ("/" for the homepage). */
  path: string
  absoluteTitle?: boolean
  keywords?: string[]
  image?: { url: string; width?: number; height?: number; alt?: string }
  type?: 'website' | 'article'
  noindex?: boolean
}

/**
 * Builds complete per-page metadata. Next.js replaces (does not deep-merge) the
 * `openGraph` / `twitter` objects of a parent layout, so every page that sets its
 * own OG title must restate siteName, locale and the image — this helper does that.
 */
export function pageMeta({
  title, description, path, absoluteTitle, keywords, image, type = 'website', noindex,
}: PageMetaInput): Metadata {
  const url = path === '/' ? SITE_URL : `${SITE_URL}${path}`
  const img = image ?? DEFAULT_OG_IMAGE
  const socialTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    ...(keywords ? { keywords } : {}),
    alternates: { canonical: url },
    openGraph: {
      type,
      locale: 'en_UG',
      siteName: SITE_NAME,
      url,
      title: socialTitle,
      description,
      images: [img],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@sabula256',
      creator: '@sabula256',
      title: socialTitle,
      description,
      images: [img.url],
    },
    ...(noindex ? { robots: { index: false, follow: true, googleBot: { index: false, follow: true } } } : {}),
  }
}

/** Metadata for account / auth-only pages that must never be indexed. */
export function privateMeta(title: string): Metadata {
  return {
    title,
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  }
}

export function breadcrumbLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.path === '/' ? SITE_URL : `${SITE_URL}${it.path}`,
    })),
  }
}

/** Serialises JSON-LD safely for use inside a <script> tag. */
export function ldJson(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

/** Clips text to a meta-description-friendly length on a word boundary. */
export function clip(text: string, max = 158): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  const sp = cut.lastIndexOf(' ')
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:.–—-]+$/, '')}…`
}
