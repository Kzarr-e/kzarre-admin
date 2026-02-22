/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "kzarre-bucket.s3.amazonaws.com" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "192.168.0.226" },
    ],
  },

  // 🔥 For the admin app we don't want to hit 192.168 directly from the browser
  env: {
      NEXT_PUBLIC_BACKEND_API_URL: "http://localhost:5500"
  }, 

  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // ✅ Proxy all /api calls through Next → same origin for cookies
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://192.168.0.226:5500/api/:path*",
      },
    ];
  },

  // ❌ REMOVE the custom headers() that set Access-Control-Allow-Origin: "*"
  // That breaks cookie-based auth with credential

  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

// ✅ Cast as any to satisfy new Next.js 16 config type system
export default nextConfig as any;
