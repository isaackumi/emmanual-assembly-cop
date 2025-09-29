/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  webpack: (config, { isServer }) => {
    // Exclude supabase functions from webpack compilation
    config.module.rules.push({
      test: /supabase\/functions\/.*\.ts$/,
      use: 'ignore-loader',
    })
    return config
  },
  // Use static build ID to avoid build traces
  generateBuildId: () => 'static-build',
  // Disable source maps
  productionBrowserSourceMaps: false,
}

module.exports = nextConfig