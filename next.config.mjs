/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    proxyClientMaxBodySize: '50mb',
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
