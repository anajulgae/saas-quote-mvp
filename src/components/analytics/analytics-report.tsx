import Link from "next/link"
import { ArrowRight, Download, Lock, TrendingDown, TrendingUp } from "lucide-react"

import { buildAnalyticsHref } from "@/lib/analytics"
import type { AnalyticsBreakdownRow, AnalyticsKpi, AnalyticsRange, AnalyticsReport } from "@/lib/analytics"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { QuoteStatus } from "@/types/domain"

function formatMetric(value: number, type: AnalyticsKpi["valueType"]) {
  if (type === "currency") return formatCurrency(value)
  if (type === "percent") return `${(value * 100).toFixed(1)}%`
  if (type === "days") return `${value.toFixed(1)}일`
  return new Intl.NumberFormat("ko-KR").format(value)
}

function formatRate(value: number | null | undefined) {
  if (value == null) return "—"
  return `${(value * 100).toFixed(1)}%`
}

function deltaTone(kpi: AnalyticsKpi) {
  if (!kpi.delta || kpi.goodDirection === "neutral") return "text-muted-foreground"
  const positive = kpi.delta > 0
  if ((positive && kpi.goodDirection === "up") || (!positive && kpi.goodDirection === "down")) {
    return "text-emerald-700"
  }
  return "text-rose-700"
}

function deltaLabel(kpi: AnalyticsKpi) {
  if (kpi.delta == null || kpi.delta === 0) return "비교 기간 대비 변화 없음"
  return `${kpi.delta > 0 ? "+" : "-"}${formatMetric(Math.abs(kpi.delta), kpi.valueType)} (직전 비교 구간 대비)`
}

function maxValue(values: number[]) {
  return Math.max(1, ...values)
}

function quoteStatusKo(status: QuoteStatus | string) {
  const m: Record<string, string> = {
    draft: "초안",
    sent: "발송",
    approved: "승인",
    rejected: "거절",
    expired: "만료",
  }
  return m[status] ?? status
}

function PeriodFilter({
  basePath,
  range,
  allowCustomRange,
  exportHref,
}: {
  basePath: string
  range: AnalyticsRange
  allowCustomRange: boolean
  exportHref?: string
}) {
  const presets: Array<{ key: AnalyticsRange["preset"]; label: string }> = [
    { key: "today", label: "오늘" },
    { key: "7d", label: "7일" },
    { key: "30d", label: "30일" },
    { key: "this_month", label: "이번 달" },
    { key: "last_month", label: "지난 달" },
  ]

  return (
    <Card className="border-border/60 bg-muted/10">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {presets.map((preset) => (
            <Link
              key={preset.key}
              href={buildAnalyticsHref(basePath, { preset: preset.key, startDate: range.startDate, endDate: range.endDate })}
              className={cn(buttonVariants({ variant: range.preset === preset.key ? "default" : "outline", size: "sm" }), "h-8")}
            >
              {preset.label}
            </Link>
          ))}
          {exportHref ? (
            <a href={exportHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "ml-auto h-8")}>
              <Download className="mr-1 size-3.5" />
              CSV 받기
            </a>
          ) : null}
        </div>

        <form action={basePath} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <input type="hidden" name="range" value="custom" />
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            시작일
            <input type="date" name="from" defaultValue={range.startDate} disabled={!allowCustomRange} className="h-9 rounded-md border border-border/70 bg-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            종료일
            <input type="date" name="to" defaultValue={range.endDate} disabled={!allowCustomRange} className="h-9 rounded-md border border-border/70 bg-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60" />
          </label>
          <button type="submit" disabled={!allowCustomRange} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9")}>
            사용자 지정 기간 적용
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>선택 기간: {range.label}</span>
          <span>{range.comparisonLabel}</span>
          {range.customRangeLocked ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-amber-900">
              <Lock className="size-3" />
              사용자 지정 기간은 상위 플랜에서 사용할 수 있습니다
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function KpiGrid({ kpis }: { kpis: AnalyticsKpi[] }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => {
        const rising = (kpi.delta ?? 0) > 0
        return (
          <Card key={kpi.key} className="border-border/70">
            <CardHeader className="space-y-1 pb-2">
              <CardDescription className="text-[11px] font-medium tracking-wide text-muted-foreground">{kpi.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tracking-tight">{formatMetric(kpi.value, kpi.valueType)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className={cn("flex items-center gap-1 text-xs font-medium", deltaTone(kpi))}>
                {kpi.delta === 0 || kpi.delta == null ? null : rising ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                {deltaLabel(kpi)}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">{kpi.description}</p>
            </CardContent>
          </Card>
        )
      })}
    </section>
  )
}

function BreakdownBars({ rows }: { rows: AnalyticsBreakdownRow[] }) {
  const maxCount = maxValue(rows.map((row) => row.count))
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.key} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-foreground">{row.label}</span>
            <span className="text-muted-foreground">{row.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary/70" style={{ width: `${(row.count / maxCount) * 100}%` }} />
          </div>
          {row.conversionRate != null || row.averageAmount != null ? (
            <p className="text-xs text-muted-foreground">
              {row.conversionRate != null ? `견적 전환 ${formatRate(row.conversionRate)}` : "—"}
              {row.secondaryRate != null ? ` · 승인 ${formatRate(row.secondaryRate)}` : ""}
              {row.averageAmount != null ? ` · 평균 ${formatCurrency(row.averageAmount)}` : ""}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function SeriesBars({ report }: { report: AnalyticsReport }) {
  const maxCount = maxValue(report.volumeSeries.map((row) => Math.max(row.inquiries, row.quotes, row.invoices, 1)))
  return (
    <div className="space-y-3">
      {report.volumeSeries.slice(-8).map((row) => (
        <div key={row.label} className="grid gap-2 sm:grid-cols-[90px_1fr] sm:items-center">
          <p className="text-xs text-muted-foreground">{row.label}</p>
          <div className="space-y-1">
            {[
              ["문의", row.inquiries, "bg-sky-500/80"],
              ["견적", row.quotes, "bg-primary/80"],
              ["청구", row.invoices, "bg-amber-500/80"],
            ].map(([label, value, klass]) => (
              <div key={label} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="w-14 shrink-0">{label}</span>
                <div className="h-1.5 flex-1 rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", klass)} style={{ width: `${(Number(value) / maxCount) * 100}%` }} />
                </div>
                <span className="w-8 text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function UpgradeCard() {
  return (
    <Card className="border-dashed border-border/70 bg-muted/10">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">상세 분석은 Pro·Business에서 제공됩니다</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            업그레이드 시 채널 전환, 고객 순위, AI·문서 발송 분해, 사용자 지정 기간·CSV 보내기 등을 사용할 수 있습니다.
          </p>
        </div>
        <Link href="/billing?plan=pro" className={cn(buttonVariants({ size: "sm" }), "h-9 shrink-0")}>
          플랜 안내
        </Link>
      </CardContent>
    </Card>
  )
}

export function AnalyticsDashboardSection({ report }: { report: AnalyticsReport }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">운영 요약</h2>
          <p className="text-sm text-muted-foreground">목록 작업 전에 파이프라인 건강도를 빠르게 확인하세요.</p>
        </div>
        <Link href={buildAnalyticsHref("/analytics", report.range)} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9")}>
          통계 전체 보기
          <ArrowRight className="ml-1 size-3.5" />
        </Link>
      </div>
      <PeriodFilter basePath="/dashboard" range={report.range} allowCustomRange={report.gates.customRange} />
      <KpiGrid kpis={report.kpis} />
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">전환 퍼널</CardTitle>
            <CardDescription className="text-xs">선택 기간에 생성된 문의 코호트 기준입니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <BreakdownBars
              rows={report.funnel.stages.map((stage) => ({
                key: stage.key,
                label: stage.label,
                count: stage.count,
                conversionRate: stage.conversionFromPrevious,
                secondaryRate: stage.conversionFromStart,
              }))}
            />
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">핵심 변화</CardTitle>
            <CardDescription className="text-xs">운영·리더십 미팅용 한 줄 요약입니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.highlights.map((item) => (
              <div key={item} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm text-foreground">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

export function AnalyticsReportView({ report }: { report: AnalyticsReport }) {
  const exportHref = report.gates.export ? buildAnalyticsHref("/api/analytics/export", report.range) : undefined

  return (
    <div className="space-y-6">
      <PeriodFilter basePath="/analytics" range={report.range} allowCustomRange={report.gates.customRange} exportHref={exportHref} />
      <KpiGrid kpis={report.kpis} />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">파이프라인 퍼널</CardTitle>
            <CardDescription className="text-xs">이탈이 큰 단계가 어디인지 한눈에 봅니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <BreakdownBars
              rows={report.funnel.stages.map((stage) => ({
                key: stage.key,
                label: stage.label,
                count: stage.count,
                conversionRate: stage.conversionFromPrevious,
                secondaryRate: stage.conversionFromStart,
              }))}
            />
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">거래량 추이</CardTitle>
            <CardDescription className="text-xs">문의·견적·청구 건수를 기간 구간별로 나눕니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <SeriesBars report={report} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">현금·리스크</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              기간 청구액: <strong>{formatCurrency(report.cash.periodInvoicedAmount)}</strong>
            </p>
            <p>
              기간 입금: <strong>{formatCurrency(report.cash.periodPaidAmount)}</strong>
            </p>
            <p>
              현재 미수금: <strong>{formatCurrency(report.cash.currentOutstandingAmount)}</strong>
            </p>
            <p>
              현재 연체액: <strong>{formatCurrency(report.cash.currentOverdueAmount)}</strong>
            </p>
            <p>
              부분·선금 상태 노출액: <strong>{formatCurrency(report.cash.currentPartialAmount)}</strong>
            </p>
            <p>
              7일 내 만기 예정: <strong>{report.cash.dueSoonCount}</strong>건
            </p>
            <p>
              평균 결제 소요일:{" "}
              <strong>{report.cash.averagePaymentDays == null ? "—" : `${report.cash.averagePaymentDays.toFixed(1)}일`}</strong>
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">청구 상태 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownBars rows={report.cash.statusCounts.map((row) => ({ key: row.key, label: row.label, count: row.count }))} />
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">견적 상태</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              생성: <strong>{report.quoteSummary.created}</strong>
            </p>
            <p>
              발송: <strong>{report.quoteSummary.sent}</strong>
            </p>
            <p>
              승인: <strong>{report.quoteSummary.approved}</strong>
            </p>
            <p>
              거절: <strong>{report.quoteSummary.rejected}</strong>
            </p>
            <p>
              만료: <strong>{report.quoteSummary.expired}</strong>
            </p>
            <p>
              승인율: <strong>{formatRate(report.quoteSummary.approvalRate)}</strong>
            </p>
            <p>
              평균 견적액: <strong>{formatCurrency(report.quoteSummary.averageAmount)}</strong>
            </p>
            <p>
              곧 만료 예정: <strong>{report.quoteSummary.expiringSoonCount}</strong>건
            </p>
          </CardContent>
        </Card>
      </div>

      {report.gates.advancedBreakdowns ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">문의 채널 성과</CardTitle>
            </CardHeader>
            <CardContent>
              <BreakdownBars rows={report.channelRows} />
            </CardContent>
          </Card>
          <Card className="border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">AI·문서 발송</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="font-medium text-foreground">AI 사용</p>
                <p className="text-muted-foreground">
                  기간 내 {report.aiSummary.periodCalls}회 · 이번 달 {report.aiSummary.currentMonthCalls} /{" "}
                  {report.aiSummary.currentMonthLimit}회
                </p>
                {report.aiSummary.backfillNotice ? <p className="mt-1 text-xs text-amber-700">{report.aiSummary.backfillNotice}</p> : null}
              </div>
              <BreakdownBars
                rows={
                  report.aiSummary.featureRows.length
                    ? report.aiSummary.featureRows
                    : [{ key: "empty", label: "이 기간에 기록된 AI 호출이 없습니다", count: 0 }]
                }
              />
              <div className="pt-2">
                <p className="font-medium text-foreground">문서 발송(채널)</p>
                <p className="text-muted-foreground">
                  기간 내 {report.documentSendSummary.periodCount}건 · 이번 달 {report.documentSendSummary.currentMonthCount} /{" "}
                  {report.documentSendSummary.currentMonthLimit}건
                </p>
              </div>
              <BreakdownBars
                rows={
                  report.documentSendSummary.actionRows.length
                    ? report.documentSendSummary.actionRows
                    : [{ key: "empty", label: "이 기간에 문서 발송 기록이 없습니다", count: 0 }]
                }
              />
            </CardContent>
          </Card>
          <Card className="border-border/70 xl:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">상위 고객·견적</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>고객</TableHead>
                    <TableHead>청구액</TableHead>
                    <TableHead>입금</TableHead>
                    <TableHead>리스크</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.customerSummary.topCustomers.map((row) => (
                    <TableRow key={row.customerId}>
                      <TableCell>{row.label}</TableCell>
                      <TableCell>{formatCurrency(row.totalInvoiced)}</TableCell>
                      <TableCell>{formatCurrency(row.totalPaid)}</TableCell>
                      <TableCell>{row.risk === "watch" ? "관심" : "안정"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>견적</TableHead>
                    <TableHead>고객</TableHead>
                    <TableHead>합계</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.quoteSummary.topQuotes.map((row) => (
                    <TableRow key={row.quoteId}>
                      <TableCell>{row.quoteNumber}</TableCell>
                      <TableCell>{row.customerLabel}</TableCell>
                      <TableCell>{formatCurrency(row.total)}</TableCell>
                      <TableCell>{quoteStatusKo(row.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <UpgradeCard />
      )}

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">지표 정의</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {report.definitions.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
