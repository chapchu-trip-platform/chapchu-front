/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    workerThreads: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
