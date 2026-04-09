import { getSiteOrigin } from "@/lib/site-url"

const DESCRIPTION =
  "문의 접수부터 견적·청구·입금·리마인드까지 한 흐름. 공개 문의 폼, AI 초안, PDF·직인, 고객 포털(Pro). 프리랜서·소규모 서비스업용 Bill-IO."

export function LandingJsonLd() {
  const base = getSiteOrigin()

  const graph = [
    {
      "@type": "WebSite",
      "@id": `${base}/#website`,
      url: base,
      name: "Bill-IO",
      description: DESCRIPTION,
      inLanguage: "ko-KR",
      publisher: { "@id": `${base}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${base}/#organization`,
      name: "Bill-IO",
      url: base,
      description: DESCRIPTION,
    },
    {
      "@type": "SoftwareApplication",
      name: "Bill-IO",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: base,
      description: DESCRIPTION,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "KRW",
        description: "Starter 무료 플랜",
      },
    },
  ]

  const data = {
    "@context": "https://schema.org",
    "@graph": graph,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
