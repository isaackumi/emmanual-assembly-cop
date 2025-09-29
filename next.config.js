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
  // Disable build traces to prevent micromatch recursion
  experimental: {
    buildTrace: false,
  },
  // Force disable build traces
  generateBuildId: () => 'build',
}

module.exports = nextConfig