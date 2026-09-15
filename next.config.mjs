const allowedDevOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
  async headers() {
    const sensitiveRouteHeaders = [
      { key: 'Cache-Control', value: 'no-store' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
    ]

    return [
      { source: '/auth/callback', headers: sensitiveRouteHeaders },
      { source: '/setup', headers: sensitiveRouteHeaders },
    ]
  },
  experimental: {
    workerThreads: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
