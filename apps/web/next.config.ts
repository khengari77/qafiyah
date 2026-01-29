import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  ...(process.env.STATIC_EXPORT === 'true' && { output: 'export' as const }),
  reactStrictMode: true,
  devIndicators: false,
  trailingSlash: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
