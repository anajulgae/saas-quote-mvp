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

function formatMetric(value: number, type: AnalyticsKpi["valueType"]) {
  if (type === "currency") return formatCurrency(value)
  if (type === "percent") return `${(value * 100).toFixed(1)}%`
  if (type === "days") return `${value.toFixed(1)}d`
  return new Intl.NumberFormat("ko-KR").format(value)
}

function formatRate(value: number | null | undefined) {
  if (value == null) return "--"
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
  if (kpi.delta == null || kpi.delta === 0) return "No change vs previous period"
  return `${kpi.delta > 0 ? "+" : "-"}${formatMetric(Math.abs(kpi.delta), kpi.valueType)} vs previous period`
}

function maxValue(values: number[]) {
  return Math.max(1, ...values)
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
    { key: "today", label: "Today" },
    { key: "7d", label: "7D" },
    { key: "30d", label: "30D" },
    { key: "this_month", label: "This month" },
    { key: "last_month", label: "Last month" },
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
              CSV
            </a>
          ) : null}
        </div>

        <form action={basePath} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <input type="hidden" name="range" value="custom" />
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            From
            <input type="date" name="from" defaultValue={range.startDate} disabled={!allowCustomRange} className="h-9 rounded-md border border-border/70 bg-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            To
            <input type="date" name="to" defaultValue={range.endDate} disabled={!allowCustomRange} className="h-9 rounded-md border border-border/70 bg-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60" />
          </label>
          <button type="submit" disabled={!allowCustomRange} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9")}>
            Apply custom range
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Range: {range.label}</span>
          <span>{range.comparisonLabel}</span>
          {range.customRangeLocked ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-amber-900">
              <Lock className="size-3" />
              Custom range is gated on higher plans
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
              <CardDescription className="text-[11px] uppercase tracking-wide">{kpi.label}</CardDescription>
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
              {row.conversionRate != null ? `Quote conv. ${formatRate(row.conversionRate)}` : "--"}
              {row.secondaryRate != null ? ` | Approved ${formatRate(row.secondaryRate)}` : ""}
              {row.averageAmount != null ? ` | Avg ${formatCurrency(row.averageAmount)}` : ""}
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
              ["Inquiry", row.inquiries, "bg-sky-500/80"],
              ["Quote", row.quotes, "bg-primary/80"],
              ["Invoice", row.invoices, "bg-amber-500/80"],
            ].map(([label, value, klass]) => (
              <div key={label} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="w-14">{label}</span>
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
          <p className="text-sm font-medium text-foreground">Advanced breakdowns are on Pro and Business</p>
          <p className="text-xs leading-relaxed text-muted-foreground">Upgrade to unlock channel conversion, customer ranking, AI usage breakdown, document delivery mix, and custom-range exports.</p>
        </div>
        <Link href="/billing?plan=pro" className={cn(buttonVariants({ size: "sm" }), "h-9 shrink-0")}>Upgrade plan</Link>
      </CardContent>
    </Card>
  )
}

export function AnalyticsDashboardSection({ report }: { report: AnalyticsReport }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Operations insight snapshot</h2>
          <p className="text-sm text-muted-foreground">Read current pipeline health before you jump into list work.</p>
        </div>
        <Link href={buildAnalyticsHref("/analytics", report.range)} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9")}>Full analytics<ArrowRight className="ml-1 size-3.5" /></Link>
      </div>
      <PeriodFilter basePath="/dashboard" range={report.range} allowCustomRange={report.gates.customRange} />
      <KpiGrid kpis={report.kpis} />
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-border/70"><CardHeader className="pb-3"><CardTitle className="text-base">Conversion funnel</CardTitle><CardDescription className="text-xs">Cohort view for inquiries created in the selected period.</CardDescription></CardHeader><CardContent className="space-y-3"><BreakdownBars rows={report.funnel.stages.map((stage) => ({ key: stage.key, label: stage.label, count: stage.count, conversionRate: stage.conversionFromPrevious, secondaryRate: stage.conversionFromStart }))} /></CardContent></Card>
        <Card className="border-border/70"><CardHeader className="pb-3"><CardTitle className="text-base">What changed</CardTitle><CardDescription className="text-xs">Fast reading for leadership and operator standups.</CardDescription></CardHeader><CardContent className="space-y-3">{report.highlights.map((item) => <div key={item} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm text-foreground">{item}</div>)}</CardContent></Card>
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
        <Card className="border-border/70"><CardHeader className="pb-3"><CardTitle className="text-base">Pipeline funnel</CardTitle><CardDescription className="text-xs">Largest conversion leak is visible from the selected inquiry cohort.</CardDescription></CardHeader><CardContent className="space-y-3"><BreakdownBars rows={report.funnel.stages.map((stage) => ({ key: stage.key, label: stage.label, count: stage.count, conversionRate: stage.conversionFromPrevious, secondaryRate: stage.conversionFromStart }))} /></CardContent></Card>
        <Card className="border-border/70"><CardHeader className="pb-3"><CardTitle className="text-base">Volume trend</CardTitle><CardDescription className="text-xs">Inquiry, quote, and invoice volume across the current filter window.</CardDescription></CardHeader><CardContent><SeriesBars report={report} /></CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-border/70"><CardHeader className="pb-3"><CardTitle className="text-base">Cash and risk</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>Issued in range: <strong>{formatCurrency(report.cash.periodInvoicedAmount)}</strong></p><p>Collected in range: <strong>{formatCurrency(report.cash.periodPaidAmount)}</strong></p><p>Current outstanding: <strong>{formatCurrency(report.cash.currentOutstandingAmount)}</strong></p><p>Current overdue: <strong>{formatCurrency(report.cash.currentOverdueAmount)}</strong></p><p>Partial / deposit paid exposure: <strong>{formatCurrency(report.cash.currentPartialAmount)}</strong></p><p>Due within 7 days: <strong>{report.cash.dueSoonCount}</strong></p><p>Avg payment days: <strong>{report.cash.averagePaymentDays == null ? "--" : `${report.cash.averagePaymentDays.toFixed(1)}d`}</strong></p></CardContent></Card>
        <Card className="border-border/70"><CardHeader className="pb-3"><CardTitle className="text-base">Invoice status mix</CardTitle></CardHeader><CardContent><BreakdownBars rows={report.cash.statusCounts.map((row) => ({ key: row.key, label: row.label, count: row.count }))} /></CardContent></Card>
        <Card className="border-border/70"><CardHeader className="pb-3"><CardTitle className="text-base">Quote health</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>Created: <strong>{report.quoteSummary.created}</strong></p><p>Sent: <strong>{report.quoteSummary.sent}</strong></p><p>Approved: <strong>{report.quoteSummary.approved}</strong></p><p>Rejected: <strong>{report.quoteSummary.rejected}</strong></p><p>Expired: <strong>{report.quoteSummary.expired}</strong></p><p>Approval rate: <strong>{formatRate(report.quoteSummary.approvalRate)}</strong></p><p>Avg quote amount: <strong>{formatCurrency(report.quoteSummary.averageAmount)}</strong></p><p>Expiring soon: <strong>{report.quoteSummary.expiringSoonCount}</strong></p></CardContent></Card>
      </div>

      {report.gates.advancedBreakdowns ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="border-border/70"><CardHeader className="pb-3"><CardTitle className="text-base">Inquiry channel performance</CardTitle></CardHeader><CardContent><BreakdownBars rows={report.channelRows} /></CardContent></Card>
          <Card className="border-border/70"><CardHeader className="pb-3"><CardTitle className="text-base">AI and document usage</CardTitle></CardHeader><CardContent className="space-y-4 text-sm"><div><p className="font-medium text-foreground">AI usage</p><p className="text-muted-foreground">{report.aiSummary.periodCalls} calls in range | {report.aiSummary.currentMonthCalls} / {report.aiSummary.currentMonthLimit} this month</p>{report.aiSummary.backfillNotice ? <p className="mt-1 text-xs text-amber-700">{report.aiSummary.backfillNotice}</p> : null}</div><BreakdownBars rows={report.aiSummary.featureRows.length ? report.aiSummary.featureRows : [{ key: "empty", label: "No AI events in this range", count: 0 }]} /><div className="pt-2"><p className="font-medium text-foreground">document_send usage</p><p className="text-muted-foreground">{report.documentSendSummary.periodCount} actions in range | {report.documentSendSummary.currentMonthCount} / {report.documentSendSummary.currentMonthLimit} this month</p></div><BreakdownBars rows={report.documentSendSummary.actionRows.length ? report.documentSendSummary.actionRows : [{ key: "empty", label: "No document sends in this range", count: 0 }]} /></CardContent></Card>
          <Card className="border-border/70 xl:col-span-2"><CardHeader className="pb-3"><CardTitle className="text-base">Top customers and quotes</CardTitle></CardHeader><CardContent className="grid gap-4 xl:grid-cols-2"><Table><TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Invoiced</TableHead><TableHead>Paid</TableHead><TableHead>Risk</TableHead></TableRow></TableHeader><TableBody>{report.customerSummary.topCustomers.map((row) => <TableRow key={row.customerId}><TableCell>{row.label}</TableCell><TableCell>{formatCurrency(row.totalInvoiced)}</TableCell><TableCell>{formatCurrency(row.totalPaid)}</TableCell><TableCell>{row.risk === "watch" ? "Watch" : "Stable"}</TableCell></TableRow>)}</TableBody></Table><Table><TableHeader><TableRow><TableHead>Quote</TableHead><TableHead>Customer</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{report.quoteSummary.topQuotes.map((row) => <TableRow key={row.quoteId}><TableCell>{row.quoteNumber}</TableCell><TableCell>{row.customerLabel}</TableCell><TableCell>{formatCurrency(row.total)}</TableCell><TableCell>{row.status}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
        </div>
      ) : (
        <UpgradeCard />
      )}

      <Card className="border-border/70"><CardHeader className="pb-3"><CardTitle className="text-base">Metric definitions</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-muted-foreground">{report.definitions.map((item) => <p key={item}>{item}</p>)}</CardContent></Card>
    </div>
  )
}
