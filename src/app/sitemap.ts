import type { MetadataRoute } from "next"

import { getSiteOrigin } from "@/lib/site-url"

const PUBLIC_ROUTES: Array<{
  path: string
  changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"]
  priority: number
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/signup", changeFrequency: "weekly", priority: 0.9 },
  { path: "/billing", changeFrequency: "weekly", priority: 0.85 },
  { path: "/login", changeFrequency: "monthly", priority: 0.5 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.35 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.35 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteOrigin().replace(/\/$/, "")
  const lastModified = new Date()

  return PUBLIC_ROUTES.map((entry) => ({
    url: `${base}${entry.path}`,
    lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }))
}
