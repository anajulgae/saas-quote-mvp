import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import { Providers } from "@/components/app/providers"
import { getSiteOrigin } from "@/lib/site-url"

import "./globals.css"

const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim()

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  metadataBase: new URL(getSiteOrigin()),
  title: {
    default: "Bill-IO — 문의부터 수금까지 | 소규모 사업자 운영 플랫폼",
    template: "%s · Bill-IO",
  },
  description:
    "공개 문의·견적·청구·리마인드·알림을 한곳에서. 프리랜서·소규모 사업자를 위한 Bill-IO.",
  keywords: [
    "Bill-IO",
    "견적",
    "청구",
    "수금",
    "미수금",
    "프리랜서",
    "소상공인",
    "공개 문의",
    "인보이스",
    "견적서",
  ],
  openGraph: {
    siteName: "Bill-IO",
    locale: "ko_KR",
    type: "website",
  },
  ...(googleVerification
    ? { verification: { google: googleVerification } }
    : {}),
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background font-sans text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
