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
          // Proxy /api/* to FastAPI backend, EXCEPT /api/auth/* which NextAuth handles
          source: '/api/:path((?!auth).*)*',
          destination: `http://${analyticsApiHost}:8001/:path*`,
        },
        {
          source: '/ingest/:path*',
          destination: `http://${ingestionApiHost}:8000/:path*`,
        },
      ],
      fallback: [],
    };
  },
};

export default nextConfig;
