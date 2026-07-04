import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const disallow = ['/admin', '/api/', '/auth/callback', '/kyc', '/wallet', '/bets', '/profile']
  return {
    rules: [
      // General crawlers
      { userAgent: '*', allow: '/', disallow },
      // AI crawlers — explicitly allowed, same rules
      { userAgent: 'GPTBot',          allow: '/', disallow },
      { userAgent: 'ClaudeBot',       allow: '/', disallow },
      { userAgent: 'PerplexityBot',   allow: '/', disallow },
      { userAgent: 'anthropic-ai',    allow: '/', disallow },
      { userAgent: 'CCBot',           allow: '/', disallow },
      { userAgent: 'Google-Extended', allow: '/', disallow },
      { userAgent: 'Amazonbot',       allow: '/', disallow },
      { userAgent: 'meta-externalagent', allow: '/', disallow },
    ],
    sitemap: 'https://sabula256.com/sitemap.xml',
  }
}
