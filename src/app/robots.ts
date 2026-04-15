import type { MetadataRoute } from "next"

import { getSiteOrigin } from "@/lib/site-url"

export default function robots(): MetadataRoute.Robots {
  const base = getSiteOrigin()

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/auth/",
          "/dashboard",
          "/customers",
          "/quotes",
          "/invoices",
          "/inquiries",
          "/settings",
          "/c/",
          "/request/",
          "/r/",
          "/q/",
          "/i/",
          "/quote-view/",
          "/invoice-view/",
          "/reset-password",
          "/forgot-password",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base.replace(/^https?:\/\//, ""),
  }
}
