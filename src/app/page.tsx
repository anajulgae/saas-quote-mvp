import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { BillIoLanding } from "@/components/landing/bill-io-landing"
import { getAppSession } from "@/lib/auth"
import { getSiteOrigin } from "@/lib/site-url"

const site = getSiteOrigin().replace(/\/$/, "")

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: "Bill-IO — 문의부터 수금까지 링크 하나로 | 소규모 사업자 운영 플랫폼",
  description:
    "단순 견적 앱이 아니라 문의→견적→청구→수금까지 한 흐름. 공개 문의·AI 초안·PDF·직인·리마인드·고객 포털(Pro). 무료로 시작.",
  keywords: [
    "견적 프로그램",
    "청구 관리",
    "프리랜서 견적",
    "공개 문의 폼",
    "소상공인 CRM",
    "리마인드",
    "미수금 관리",
    "Bill-IO",
    "견적서 작성",
    "인보이스",
    "수금 관리",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    url: `${site}/`,
    title: "Bill-IO — 문의 접수부터 입금 확인까지 한 흐름",
    description:
      "견적만이 아니라 입금·리마인드까지. 링크 접수·AI 초안·공개 청구·미수 추적. 소규모 사업자 운영 플랫폼.",
    type: "website",
    locale: "ko_KR",
    siteName: "Bill-IO",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bill-IO — 문의~수금 한 플랫폼",
    description: "공개 문의·AI 견적·청구·리마인드·알림. 무료로 시작.",
  },
  robots: { index: true, follow: true },
}

export default async function HomePage() {
  const session = await getAppSession()

  if (session) {
    redirect("/dashboard")
  }

  return <BillIoLanding />
}
