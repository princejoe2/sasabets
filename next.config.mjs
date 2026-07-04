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
  generateBuildId: async () => `build-${Date.now()}`,
  // Kept on the Webpack bundler for now (build/dev run with `--webpack`). This
  // cache-version hack + the .next wipe in the build script guard against Vercel
  // serving a stale build cache. Revisit migrating to Turbopack separately.
  webpack: (config, { buildId }) => {
    if (config.cache && typeof config.cache === 'object') {
      config.cache.version = buildId
    }
    return config
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
        ],
      },
    ]
  },
}

export default nextConfig
