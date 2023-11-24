/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,

  reactStrictMode: true,

  trailingSlash: false,

  output: 'standalone',

  productionBrowserSourceMaps: false,

  // NOTE: All of these variables should be defined in :
  // 1. Dockerfile
  // 2. docker-compose.production.yml
  publicRuntimeConfig: {
    domain: process.env.DOMAIN,
  },
}

module.exports = nextConfig
