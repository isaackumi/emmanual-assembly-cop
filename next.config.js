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
  // Optimize for Vercel
  output: 'standalone',
  // Disable source maps in production to reduce complexity
  productionBrowserSourceMaps: false,
  // Reduce bundle analysis complexity
  swcMinify: true,
  // Disable build optimization that might cause recursion
  experimental: {
    webpackBuildWorker: false,
  },
}

module.exports = nextConfig