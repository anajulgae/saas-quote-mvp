import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return [
      { source: "/q/:token", destination: "/quote-view/:token" },
      { source: "/i/:token", destination: "/invoice-view/:token" },
      { source: "/r/:token", destination: "/request/:token" },
      { source: "/r/:token/thanks", destination: "/request/:token/thanks" },
    ];
  },
  async headers() {
    return [
      {
        source: "/request/:path*",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
      {
        source: "/r/:path*",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
      {
        source: "/((?!request/|r/).*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
