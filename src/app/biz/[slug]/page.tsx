import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { PublicBusinessLanding, type PublicLandingPageView } from "@/components/public/public-business-landing"
import { getSiteOrigin } from "@/lib/site-url"
import { createAnonSupabaseClient } from "@/lib/supabase/anon"
import { isSupabaseConfigured } from "@/lib/supabase/public-config"

export const dynamic = "force-dynamic"

function asString(v: unknown): string {
  return typeof v === "string" ? v : ""
}

function asBool(v: unknown): boolean {
  return v === true
}

function parseServices(raw: unknown): Array<{ title: string; description: string }> {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null
      }
      const o = item as Record<string, unknown>
      const title = asString(o.title)
      const description = asString(o.description)
      if (!title) {
        return null
      }
      return { title, description }
    })
    .filter(Boolean) as Array<{ title: string; description: string }>
}

function parseSocial(raw: unknown): Array<{ label: string; url: string }> {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null
      }
      const o = item as Record<string, unknown>
      const label = asString(o.label)
      const url = asString(o.url)
      if (!label || !url) {
        return null
      }
      return { label, url }
    })
    .filter(Boolean) as Array<{ label: string; url: string }>
}

function parseFaq(raw: unknown): Array<{ question: string; answer: string }> {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null
      }
      const o = item as Record<string, unknown>
      const question = asString(o.question)
      const answer = asString(o.answer)
      if (!question || !answer) {
        return null
      }
      return { question, answer }
    })
    .filter(Boolean) as Array<{ question: string; answer: string }>
}

function parseTrust(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim())
}

function mapPagePayload(slug: string, raw: Record<string, unknown>): PublicLandingPageView {
  return {
    slug,
    template: asString(raw.template) || "default",
    businessName: asString(raw.businessName),
    headline: asString(raw.headline),
    introOneLine: asString(raw.introOneLine),
    about: asString(raw.about),
    services: parseServices(raw.services),
    contactPhone: asString(raw.contactPhone),
    contactEmail: asString(raw.contactEmail),
    location: asString(raw.location),
    businessHours: asString(raw.businessHours),
    socialLinks: parseSocial(raw.socialLinks),
    heroImageUrl: typeof raw.heroImageUrl === "string" ? raw.heroImageUrl : null,
    faq: parseFaq(raw.faq),
    trustPoints: parseTrust(raw.trustPoints),
    ctaText: asString(raw.ctaText) || "문의하기",
    inquiryCtaEnabled: raw.inquiryCtaEnabled === undefined ? true : asBool(raw.inquiryCtaEnabled),
  }
}

async function fetchLanding(slug: string) {
  if (!isSupabaseConfigured()) {
    return null
  }
  const supabase = createAnonSupabaseClient()
  if (!supabase) {
    return null
  }
  const { data, error } = await supabase.rpc("get_public_business_landing", { p_slug: slug })
  if (error) {
    return null
  }
  return data as unknown
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug).trim().toLowerCase()
  const origin = getSiteOrigin()
  const data = await fetchLanding(slug)
  const root = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : null
  if (!root || root.valid !== true) {
    return {
      title: "페이지를 찾을 수 없습니다",
      robots: { index: false, follow: false },
    }
  }
  const pageRaw = root.page as Record<string, unknown> | undefined
  if (!pageRaw) {
    return { title: "페이지를 찾을 수 없습니다", robots: { index: false, follow: false } }
  }
  const page = mapPagePayload(slug, pageRaw)
  const title = (asString(pageRaw.seoTitle) || page.businessName || page.headline || "업체 소개").slice(0, 200)
  const description = (
    asString(pageRaw.seoDescription) ||
    page.introOneLine ||
    page.about.slice(0, 160) ||
    `${page.businessName} 소개 및 문의`
  ).slice(0, 200)
  const canonical = `${origin.replace(/\/$/, "")}/biz/${encodeURIComponent(slug)}`
  const ogImage = page.heroImageUrl && page.heroImageUrl.startsWith("http") ? page.heroImageUrl : undefined

  return {
    metadataBase: new URL(origin),
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      url: canonical,
      siteName: "Bill-IO",
      title,
      description,
      images: ogImage ? [{ url: ogImage, alt: title }] : undefined,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    category: "business",
  }
}

export default async function PublicBizLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug).trim().toLowerCase()
  const data = await fetchLanding(slug)
  const root = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : null
  if (!root || root.valid !== true) {
    notFound()
  }
  const pageRaw = root.page as Record<string, unknown> | undefined
  if (!pageRaw) {
    notFound()
  }
  const page = mapPagePayload(slug, pageRaw)
  const token = typeof root.inquiryToken === "string" && root.inquiryToken.length >= 16 ? root.inquiryToken : null
  const inquiryHref = token
    ? `/request/${encodeURIComponent(token)}?source=landing_page&slug=${encodeURIComponent(slug)}`
    : null

  const origin = getSiteOrigin()
  const canonical = `${origin.replace(/\/$/, "")}/biz/${encodeURIComponent(slug)}`
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: page.businessName || page.headline || "업체",
    description: page.introOneLine || page.about.slice(0, 300),
    url: canonical,
    telephone: page.contactPhone || undefined,
    email: page.contactEmail || undefined,
    image: page.heroImageUrl?.startsWith("http") ? page.heroImageUrl : undefined,
    address: page.location
      ? {
          "@type": "PostalAddress",
          addressLocality: page.location,
        }
      : undefined,
    areaServed: page.location || undefined,
    openingHoursSpecification: page.businessHours
      ? {
          "@type": "OpeningHoursSpecification",
          description: page.businessHours,
        }
      : undefined,
    sameAs: page.socialLinks.map((s) => s.url).filter((u) => u.startsWith("http")),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicBusinessLanding page={page} inquiryHref={inquiryHref} siteName="Bill-IO" />
    </>
  )
}
