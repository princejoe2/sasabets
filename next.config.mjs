/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  generateBuildId: async () => `build-${Date.now()}`,
  webpack: (config, { buildId }) => {
    // Tie the webpack filesystem cache version to the build ID so the cache is
    // fully busted on every Vercel deployment (prevents stale compiled chunks
    // from being served after source changes).
    if (config.cache && typeof config.cache === 'object') {
      config.cache.version = buildId
    }
    return config
  },
}

export default nextConfig
