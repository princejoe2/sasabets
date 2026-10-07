/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'flagcdn.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: 'commons.wikimedia.org' },
      { protocol: 'https', hostname: 'assets.coingecko.com' },
    ],
  },
  typescript: { ignoreBuildErrors: false },
  // Unique build id per build. The Supabase URL/anon key are hardcoded string
  // literals (see lib/supabase/*), not env vars, so there is no NEXT_PUBLIC_
  // inlining for any bundler to BOM-corrupt — the old webpack cache-version hack
  // is no longer needed under Turbopack.
  generateBuildId: async () => `build-${Date.now()}`,
  async redirects() {
    return [
      { source: '/favicon.ico', destination: '/icon-192.png', permanent: false },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'X-Frame-Options',            value: 'DENY' },
          { key: 'X-XSS-Protection',           value: '1; mode=block' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security',  value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            // Hardened 2026-07-12: 'unsafe-eval' removed from script-src — nothing in the
            // bundle uses eval/new Function (verified: no eval-dependent third-party scripts).
            //
            // REMAINING RISK — script-src still allows 'unsafe-inline': the Next.js App
            // Router emits inline <script> tags for RSC flight data / hydration (verified:
            // 15 inline scripts on the production homepage), so removing it without a
            // nonce would break hydration site-wide. The proper fix is nonce-based CSP with
            // 'strict-dynamic' set per-request in middleware — but nonces force dynamic
            // rendering, which would disable the ISR caching (revalidate) this site relies
            // on. Until that trade-off is made, inline-script XSS is mitigated at the
            // source instead (Markdown sanitization in news pages, no other
            // dangerouslySetInnerHTML of user content).
            //
            // require-trusted-types-for 'script' was evaluated and NOT added: it would
            // break React's dangerouslySetInnerHTML (JSON-LD blocks, news articles) in
            // Chromium without Trusted Types policies in place.
            //
            // 'unsafe-inline' in style-src is required by Tailwind/framer-motion inline styles.
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://flagcdn.com https://upload.wikimedia.org https://commons.wikimedia.org https://assets.coingecko.com https://images.unsplash.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.coingecko.com https://api.ipify.org https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com https://fonts.googleapis.com https://fonts.gstatic.com",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
