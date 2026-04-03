import type { NextConfig } from "next";

// When running inside Docker, use service names; otherwise use localhost
const analyticsApiHost = process.env.ANALYTICS_API_HOST || '127.0.0.1';
const ingestionApiHost = process.env.INGESTION_API_HOST || '127.0.0.1';

const nextConfig: NextConfig = {
  rewrites: async () => {
    return {
      beforeFiles: [],
      afterFiles: [
        {
          source: '/ingest/:path*',
          destination: `http://${ingestionApiHost}:8000/:path*`,
        },
      ],
      fallback: [
        {
          // Proxy /api/* to FastAPI backend as a fallback.
          // Exclude NextAuth routes so /api/auth/* is always handled by Next.js route handlers.
          source: '/api/:path((?!auth(?:/|$)).*)',
          destination: `http://${analyticsApiHost}:8001/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
