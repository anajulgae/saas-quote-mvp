import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { AnalyticsReportView } from "@/components/analytics/analytics-report"
import { PageHeader } from "@/components/app/page-header"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getAppSession } from "@/lib/auth"
import { getAnalyticsReportForCurrentUser } from "@/lib/analytics"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "통계",
  description: "문의·견적·청구·수금·AI·문서 발송 운영 지표",
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  const sp = await searchParams
  const session = await getAppSession()
  if (!session) {
    redirect("/login")
  }

  let report: Awaited<ReturnType<typeof getAnalyticsReportForCurrentUser>> = null
  let loadError: string | null = null

  try {
    report = await getAnalyticsReportForCurrentUser(sp)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[analytics page]", e)
    loadError = msg || "통계 데이터를 불러오지 못했습니다."
  }

  if (!report && !loadError) {
    redirect("/login")
  }

  if (loadError || !report) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="통계"
          description="문의부터 수금까지 한눈에 보는 운영 리포트입니다."
        />
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-base">통계를 표시할 수 없습니다</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {loadError}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="leading-relaxed">
              Supabase에 최신 마이그레이션이 모두 적용됐는지 확인해 주세요. 특히{" "}
              <code className="rounded bg-muted px-1 text-xs">document_send_events</code> 는{" "}
              <code className="rounded bg-muted px-1 text-xs">0015_billing_provider_document_send.sql</code> 에서
              생성됩니다. 해당 테이블이 없어도 이제는 KPI·퍼널 등 나머지 통계는 열리도록 처리했습니다. 그래도 오류가
              나면 브라우저 개발자 도구·서버 로그의 메시지를 확인해 주세요.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard" className={cn(buttonVariants({ size: "sm" }), "h-9")}>
                대시보드로
              </Link>
              <Link href="/settings" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9")}>
                설정으로
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="통계"
        description="문의·견적·청구·수금·AI 사용·문서 발송을 기간별로 확인합니다."
      />
      <AnalyticsReportView report={report} />
    </div>
  )
}
