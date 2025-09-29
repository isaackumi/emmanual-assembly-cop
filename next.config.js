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
  // Minimal configuration to avoid build traces issues
  swcMinify: true,
  // Disable build traces completely
  experimental: {
    buildTrace: false,
  },
}

module.exports = nextConfig