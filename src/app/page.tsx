import type { Metadata } from "next"

import { getSiteOrigin } from "@/lib/site-url"

const site = getSiteOrigin().replace(/\/$/, "")

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: "Bill-IO — 준비 중",
  description: "Bill-IO 서비스를 준비 중입니다. 곧 만나요.",
  robots: { index: false, follow: false },
}

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-foreground">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        {/* 로고 */}
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold tracking-tight">Bill-IO</span>
        </div>

        {/* 구분선 */}
        <div className="h-px w-16 bg-border" />

        {/* 메인 메시지 */}
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold">서비스 준비 중입니다</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            더 나은 서비스로 곧 돌아오겠습니다.
            <br />
            문의부터 수금까지, 한 흐름으로.
          </p>
        </div>

        {/* 배지 */}
        <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
          Coming Soon
        </span>
      </div>
    </main>
  )
}
