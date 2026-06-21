import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/auth/callback', '/kyc', '/wallet', '/bets', '/profile'],
      },
    ],
    sitemap: 'https://sabula256.com/sitemap.xml',
  }
}
