/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  generateBuildId: async () => `build-${Date.now()}`,
}

export default nextConfig
