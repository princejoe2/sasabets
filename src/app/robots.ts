import { MetadataRoute } from 'next'

// Account, auth and API routes. These also carry `noindex` metadata (or redirect to
// /auth for anonymous visitors); the disallow simply saves crawl budget.
const disallow = [
  '/admin', '/api/', '/auth/callback', '/auth/verify', '/auth/reset-password',
  '/kyc', '/wallet', '/bets', '/profile', '/dashboard', '/settings', '/invite',
]

// Search engines + AI search / retrieval / training crawlers that are explicitly welcome.
// A crawler that finds a group for its own user-agent ignores the `*` group, so each
// group restates the same private-route disallows.
const NAMED_BOTS = [
  // Search engines
  'Googlebot', 'Googlebot-Image', 'Bingbot', 'Applebot', 'DuckDuckBot', 'YandexBot',
  // AI search / answer engines (live retrieval)
  'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Perplexity-User',
  'Claude-SearchBot', 'Claude-User', 'YouBot', 'Amazonbot', 'meta-externalagent',
  // AI training crawlers
  'GPTBot', 'ClaudeBot', 'anthropic-ai', 'Google-Extended', 'Applebot-Extended',
  'CCBot', 'Bytespider', 'Diffbot', 'cohere-ai',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      { userAgent: NAMED_BOTS, allow: '/', disallow },
    ],
    sitemap: 'https://sabula256.com/sitemap.xml',
  }
}
