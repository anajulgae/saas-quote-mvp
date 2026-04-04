import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { BillIoLanding } from "@/components/landing/bill-io-landing"
import { getAppSession } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Bill-IO — 견적·청구·수금, 한 흐름으로",
  description:
    "프리랜서·1인 사업자·소규모 서비스업을 위한 견적·청구·수금 관리. 문의부터 입금 확인까지 한곳에서 정리하세요.",
  openGraph: {
    title: "Bill-IO — 견적·청구·수금, 한 흐름으로",
    description:
      "선금·잔금·미수를 한눈에 추적하고, 오늘의 후속 조치를 놓치지 않게.",
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bill-IO",
    description: "소규모 사업자를 위한 견적·청구·수금 관리",
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
