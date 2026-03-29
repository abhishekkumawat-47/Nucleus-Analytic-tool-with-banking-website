import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  rewrites: async () => {
    return {
      beforeFiles: [],
      afterFiles: [
        {
          // Proxy /api/* to FastAPI backend, EXCEPT /api/auth/* which NextAuth handles
          source: '/api/:path((?!auth).*)*',
          destination: 'http://127.0.0.1:8001/:path*',
        },
        {
          source: '/ingest/:path*',
          destination: 'http://127.0.0.1:8000/:path*',
        },
      ],
      fallback: [],
    };
  },
};

export default nextConfig;
