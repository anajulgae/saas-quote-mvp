import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * 커스텀 도메인(예: www.bill-io.com) + 프록시/전달 헤더 조합에서
   * `Origin` 과 `Host` 가 어긋나면 Server Actions 가 CSRF로 차단될 수 있습니다.
   * *.vercel.app 은 기본 배포·프리뷰용.
   * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions#allowedorigins
   */
  experimental: {
    serverActions: {
      allowedOrigins: [
        "www.bill-io.com",
        "bill-io.com",
        "app.bill-io.com",
        "saas-quote-mvp.vercel.app",
        "*.vercel.app",
      ],
    },
  },
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
