import { getSiteOrigin } from "@/lib/site-url"

const DESCRIPTION =
  "문의 접수부터 견적·청구·전자세금계산서·자동 리마인드·수금까지 한 흐름. AI 매출 예측·운영 분석·견적/수금 초안. 짧은 공개 URL, PDF·직인, 자동 리마인드·반복 청구(프로). 전자세금계산서(팝빌 무료 100건 등, 추가 비용 없음). 감사 로그·화이트 라벨(비즈니스). 프리랜서·소규모 서비스업용 Bill-IO."

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
        priceCurrency: "USD",
        description: "7일 무료 체험 후 스타터·프로·비즈니스 유료 플랜",
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
