import { ArrowRight, CircleAlert, Clock3, FileText, Wallet } from "lucide-react"

import { MetricCard } from "@/components/app/metric-card"
import { PageHeader } from "@/components/app/page-header"
import { InquiryStageBadge, PaymentStatusBadge } from "@/components/app/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboardPageData } from "@/lib/data"
import { formatCurrency, formatDateTime } from "@/lib/format"

const pipelineColumns = [
  { key: "new", label: "신규 문의" },
  { key: "qualified", label: "검토 중" },
  { key: "quoted", label: "견적 발송" },
  { key: "won", label: "수주 완료" },
] as const

export default async function DashboardPage() {
  const { metrics, followUps, overdueInvoices, recentActivities, pipelineSummary } =
    await getDashboardPageData()

  return (
    <div className="space-y-6">
      <PageHeader
        title="대시보드"
        description="이번 달 견적, 수금 현황, 오늘 처리할 후속조치를 한 번에 확인합니다."
        action={
          <Button>
            <FileText className="size-4" />
            새 견적 초안
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="이번 달 발송한 견적 수"
          value={`${metrics.quoteCountThisMonth}건`}
          hint="발송 기준 이번 달 누적"
        />
        <MetricCard
          label="미수 금액"
          value={formatCurrency(metrics.outstandingAmount)}
          hint="입금 완료 전 청구 합계"
        />
        <MetricCard
          label="입금 대기 건수"
          value={`${metrics.waitingPayments}건`}
          hint="입금 대기, 부분 입금, 연체 포함"
        />
        <MetricCard
          label="오늘 해야 할 후속조치"
          value={`${metrics.followUpsToday}건`}
          hint="오늘 팔로업 예정 문의"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>파이프라인 상태 요약</CardTitle>
            <CardDescription>문의부터 수주까지 단계별 현황</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {pipelineColumns.map((column) => (
              <div
                key={column.key}
                className="rounded-2xl border border-border/70 bg-muted/30 p-4"
              >
                <p className="text-sm font-medium">{column.label}</p>
                <p className="mt-3 text-3xl font-semibold">
                  {pipelineSummary[column.key]}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>입금 리스크</CardTitle>
            <CardDescription>연체 또는 즉시 확인이 필요한 건</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overdueInvoices.map((invoice) => {
              const customer = invoice.customer

              return (
                <div
                  key={invoice.id}
                  className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{customer?.companyName ?? customer?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.invoiceNumber} · {formatCurrency(invoice.amount)}
                      </p>
                    </div>
                    <PaymentStatusBadge status={invoice.paymentStatus} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>오늘 해야 할 후속조치</CardTitle>
            <CardDescription>정해진 팔로업 일정 중심으로 정리</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {followUps.map((item) => {
              const customer = item.customer

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border/70 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock3 className="size-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {formatDateTime(item.followUpAt)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {customer?.companyName ?? customer?.name} · {item.serviceCategory}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <InquiryStageBadge stage={item.stage} />
                    <Button variant="outline" size="sm">
                      고객 보기
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>최근 활동</CardTitle>
            <CardDescription>견적, 입금, 리마인드 관련 주요 변경</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex gap-3">
                <div className="mt-1 rounded-full bg-muted p-2">
                  {activity.action.includes("reminder") ? (
                    <CircleAlert className="size-4 text-amber-600" />
                  ) : activity.action.includes("deposit") ? (
                    <Wallet className="size-4 text-emerald-600" />
                  ) : (
                    <FileText className="size-4 text-foreground" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(activity.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
