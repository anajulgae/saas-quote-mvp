import Link from"next/link"
import type { LucideIcon } from"lucide-react"
import {
  Activity,
  ArrowRight,
  Brain,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  MessagesSquare,
  Receipt,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from"lucide-react"

import { ActivityEntry } from"@/components/app/activity-entry"
import { BetaOnboardingBanner } from"@/components/app/beta-onboarding-banner"
import { DashboardOperationalHub } from"@/components/app/dashboard-operational-hub"
import { MetricCard } from"@/components/app/metric-card"
import { PageHeader } from"@/components/app/page-header"
import { InquiryStageBadge, PaymentStatusBadge } from"@/components/app/status-badge"
import { AnalyticsDashboardSection } from"@/components/analytics/analytics-report"
import { OpsAgendaList } from"@/components/operations/ops-agenda-list"
import { buttonVariants } from"@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card"
import { getAnalyticsReportForCurrentUser } from"@/lib/analytics"
import { planAllowsFeature } from"@/lib/plan-features"
import { cn } from"@/lib/utils"
import { resolveActivityHeadline, resolveActivityKind } from"@/lib/activity-presentation"
import {
  mapInquiriesToCalendarEvents,
  mapInvoicesToCalendarEvents,
  mapQuotesToCalendarEvents,
  pickCalendarEventsInRange,
} from"@/lib/calendar-events"
import { getDashboardPageData } from"@/lib/data"
import { formatCurrency, formatDate, formatDateTime } from"@/lib/format"
import { getSiteOrigin } from"@/lib/site-url"

const pipelineColumns = [
  { key:"new", label:"신규 문의" },
  { key:"qualified", label:"검토 중" },
  { key:"quoted", label:"견적 발송" },
  { key:"won", label:"수주 완료" },
] as const

function resolveDashboardMainAction(counts: {
  inquiries: number
  quotes: number
  invoices: number
}): { label: string; href: string; icon: LucideIcon } {
  if (counts.inquiries === 0) {
    return { label:"첫 문의 만들기", href:"/inquiries", icon: MessagesSquare }
  }
  if (counts.quotes === 0) {
    return { label:"새 견적 만들기", href:"/quotes", icon: FileText }
  }
  if (counts.invoices === 0) {
    return { label:"새 청구 만들기", href:"/invoices", icon: Receipt }
  }
  return { label:"새 견적 초안", href:"/quotes", icon: FileText }
}

function emptyBadgeClass(tone:"positive" |"neutral" |"muted") {
  const map = {
    positive:"border-primary/25 bg-primary/[0.08] text-primary dark:bg-primary/18",
    neutral:"border-border/55 bg-muted/50 text-muted-foreground",
    muted:"border-border/50 bg-muted/35 text-muted-foreground",
  } as const
  return cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide",
    map[tone]
  )
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  const sp = await searchParams
  const {
    metrics,
    followUps,
    upcomingInquiries,
    overdueInvoices,
    dueSoonInvoices,
    expiringQuotes,
    recentActivities,
    pipelineSummary,
    showBetaOnboarding,
    counts,
    hub,
    notificationPreview,
    taxInvoiceSignals,
  } = await getDashboardPageData()
  const analyticsReport = await getAnalyticsReportForCurrentUser(sp)
  const siteOrigin = getSiteOrigin()

  const mainAction = resolveDashboardMainAction(counts)
  const MainIcon = mainAction.icon
  const showQuickStartStrip = !showBetaOnboarding && counts.inquiries === 0
  /** 온보딩이 주 행동을 안내할 때 상단 CTA는 보조 링크로만 */
  const softenHeaderCta = showBetaOnboarding && counts.inquiries === 0
  const scheduleStart = new Date()
  scheduleStart.setHours(0, 0, 0, 0)
  const scheduleEnd = new Date(scheduleStart)
  scheduleEnd.setDate(scheduleEnd.getDate() + 7)
  scheduleEnd.setHours(23, 59, 59, 999)
  const upcomingSchedule = pickCalendarEventsInRange(
    [
      ...mapInquiriesToCalendarEvents(upcomingInquiries),
      ...mapInvoicesToCalendarEvents([...overdueInvoices, ...dueSoonInvoices]),
      ...mapQuotesToCalendarEvents(expiringQuotes),
    ],
    scheduleStart,
    scheduleEnd
  ).slice(0, 8)

  return (
    <div className="space-y-6 md:space-y-7">
      {showBetaOnboarding ? <BetaOnboardingBanner /> : null}

      {showQuickStartStrip ? (
        <Card className="border-primary/15 bg-primary/[0.04] shadow-none ring-1 ring-primary/10">
          <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex min-w-0 gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Sparkles className="size-3.5" aria-hidden />
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium text-foreground">빠른 시작</p>
                <p className="text-xs text-muted-foreground sm:text-[13px]">
                  고객 등록 후 문의를 넣고, 설정에서 공개 문의 링크를 켜 두면 유입부터 지표까지 한 번에 채워집니다.
                </p>
              </div>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-1.5 sm:w-auto sm:flex-row">
              <Link
                href="/customers"
                className={cn(
                  buttonVariants({ size:"sm" }),"inline-flex h-9 w-full justify-center sm:w-auto"
                )}
              >
                첫 고객 등록
              </Link>
              <Link
                href="/inquiries"
                className={cn(
                  buttonVariants({ variant:"outline", size:"sm" }),"inline-flex h-9 w-full justify-center sm:w-auto"
                )}
              >
                첫 문의 만들기
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <PageHeader
        title="대시보드"
        description="이번 달 견적·수금·미수와 오늘의 팔로업을 보고, 아래 허브에서 유입·발송·알림까지 같은 제품 안에서 이어지는지 확인합니다."
        className="pb-4"
        action={
          softenHeaderCta ? (
            <Link
              href="/inquiries"
              className={cn(
                buttonVariants({ variant:"ghost", size:"sm" }),"inline-flex w-full items-center justify-center gap-1 text-muted-foreground hover:text-foreground sm:w-auto"
              )}
            >
              문의 화면으로
              <ArrowRight className="size-3.5 opacity-70" />
            </Link>
          ) : (
            <Link
              href={mainAction.href}
              className={cn(
                buttonVariants(),"inline-flex h-10 w-full items-center justify-center gap-2 sm:h-9 sm:w-auto"
              )}
            >
              <MainIcon className="size-4" />
              {mainAction.label}
            </Link>
          )
        }
      />

      <DashboardOperationalHub hub={hub} notificationPreview={notificationPreview} siteOrigin={siteOrigin} />

      {analyticsReport ? <AnalyticsDashboardSection report={analyticsReport} /> : null}

      {analyticsReport && (analyticsReport.forecast || analyticsReport.aiInsights.length > 0) ? (
        <section className="grid gap-3 sm:gap-4 lg:grid-cols-[1fr_1.2fr]">
          {analyticsReport.forecast ? (
            <Card className="border-border/70">
              <CardHeader className="space-y-0.5 pb-2">
                <div className="flex items-center gap-2">
                  {analyticsReport.forecast.trend ==="up" ? (
                    <TrendingUp className="size-4 text-emerald-600" aria-hidden />
                  ) : analyticsReport.forecast.trend ==="down" ? (
                    <TrendingDown className="size-4 text-red-500" aria-hidden />
                  ) : (
                    <Activity className="size-4 text-muted-foreground" aria-hidden />
                  )}
                  <CardTitle className="text-base font-semibold">매출 예측</CardTitle>
                </div>
                <CardDescription>{analyticsReport.forecast.nextMonthLabel} 예상</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-3xl font-bold tabular-nums tracking-tight">
                  {formatCurrency(analyticsReport.forecast.nextMonthEstimate)}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    analyticsReport.forecast.trend ==="up" &&"bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                    analyticsReport.forecast.trend ==="down" &&"bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                    analyticsReport.forecast.trend ==="flat" &&"bg-muted text-muted-foreground"
                  )}>
                    {analyticsReport.forecast.trend ==="up" ?"상승 추세" : analyticsReport.forecast.trend ==="down" ?"하락 추세" :"보합"}
                  </span>
                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    analyticsReport.forecast.confidence ==="high" &&"bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                    analyticsReport.forecast.confidence ==="medium" &&"bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                    analyticsReport.forecast.confidence ==="low" &&"bg-muted text-muted-foreground"
                  )}>
                    신뢰도: {analyticsReport.forecast.confidence ==="high" ?"높음" : analyticsReport.forecast.confidence ==="medium" ?"보통" :"낮음"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{analyticsReport.forecast.basis}</p>
              </CardContent>
            </Card>
          ) : null}

          {analyticsReport.aiInsights.length > 0 ? (
            <Card className="border-border/70">
              <CardHeader className="space-y-0.5 pb-2">
                <div className="flex items-center gap-2">
                  <Brain className="size-4 text-primary" aria-hidden />
                  <CardTitle className="text-base font-semibold">AI 매출 인사이트</CardTitle>
                </div>
                <CardDescription>데이터 기반 자동 분석 결과</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {analyticsReport.aiInsights.map((insight, idx) => (
                  <div
                    key={idx}
                    className={cn("rounded-lg border px-3 py-2",
                      insight.type ==="positive" &&"border-emerald-200/70 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-950/20",
                      insight.type ==="warning" &&"border-amber-200/70 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-950/20",
                      insight.type ==="neutral" &&"border-border/60 bg-muted/20"
                    )}
                  >
                    <p className={cn("text-sm font-medium",
                      insight.type ==="positive" &&"text-emerald-800 dark:text-emerald-300",
                      insight.type ==="warning" &&"text-amber-800 dark:text-amber-300",
                      insight.type ==="neutral" &&"text-foreground"
                    )}>
                      {insight.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{insight.body}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </section>
      ) : null}

      <section className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      {planAllowsFeature(hub.plan,"e_tax_invoice_asp") ? (
        <Card className="border-border/70">
          <CardHeader className="space-y-0.5 pb-2">
            <CardTitle className="text-base font-semibold">전자세금계산서 요약</CardTitle>
            <CardDescription>
              청구에 연결된 발행 필요·실패 건수입니다. 발행 실행은 청구 상세에서만 진행됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link
              href="/invoices?tax=need"
              className={cn(
                buttonVariants({ variant:"outline", size:"sm" }),"inline-flex h-8 items-center gap-1.5 text-xs"
              )}
            >
              발행 필요 <strong className="tabular-nums">{taxInvoiceSignals.needAttention}</strong>건
              <ArrowRight className="size-3 opacity-70" />
            </Link>
            <Link
              href="/invoices?tax=failed"
              className={cn(
                buttonVariants({ variant:"outline", size:"sm" }),"inline-flex h-8 items-center gap-1.5 text-xs",
                taxInvoiceSignals.failed > 0 &&"border-destructive/40 text-destructive"
              )}
            >
              발행 실패 <strong className="tabular-nums">{taxInvoiceSignals.failed}</strong>건
              <ArrowRight className="size-3 opacity-70" />
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-border/70 bg-muted/10">
          <CardContent className="flex flex-col gap-2 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">전자세금계산서 ASP 연동</span>은 Pro 이상 플랜에서 이용할 수 있습니다.
              청구와 연결해 발행·상태 추적까지 Bill-IO 안에서 이어갈 수 있습니다.
            </p>
            <Link href="/billing" className={cn(buttonVariants({ size:"sm" }),"shrink-0 self-start sm:self-auto")}>
              플랜 안내
            </Link>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-3 sm:gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/70">
          <CardHeader className="space-y-0.5 pb-3">
            <CardTitle className="text-base font-semibold">파이프라인 상태 요약</CardTitle>
            <CardDescription>문의부터 수주까지 단계별 현황</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2.5 sm:gap-3 md:grid-cols-2 xl:grid-cols-4">
            {pipelineColumns.map((column) => (
              <div
                key={column.key}
                className="rounded-xl border border-border/70 bg-muted/30 p-3 sm:p-3.5"
              >
                <p className="text-xs font-medium text-muted-foreground">{column.label}</p>
                <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">
                  {pipelineSummary[column.key]}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="space-y-0.5 pb-3">
            <CardTitle className="text-base font-semibold">입금 리스크</CardTitle>
            <CardDescription>연체 또는 즉시 확인이 필요한 건</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!overdueInvoices.length ? (
              <div className="flex gap-3 rounded-xl border border-dashed border-border/60 bg-muted/15 px-3 py-3 sm:items-start">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                  <CheckCircle2 className="size-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <span className={emptyBadgeClass("positive")}>양호</span>
                  <p className="text-sm leading-snug text-muted-foreground">
                    연체 청구가 없습니다. 청구 목록에서 입금 일정을 확인할 수 있어요.
                  </p>
                  <Link
                    href="/invoices"
                    className={cn(
                      buttonVariants({ variant:"outline", size:"sm" }),"inline-flex h-8 gap-1 text-xs"
                    )}
                  >
                    청구 보기
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            ) : (
              overdueInvoices.map((invoice) => {
                const customer = invoice.customer

                return (
                  <div
                    key={invoice.id}
                    className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium">{customer?.companyName ?? customer?.name}</p>
                        <p className="text-sm tabular-nums text-muted-foreground">
                          {invoice.invoiceNumber} · {formatCurrency(invoice.amount)}
                        </p>
                      </div>
                      <PaymentStatusBadge status={invoice.paymentStatus} />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 sm:gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          <OpsAgendaList
            title="다가오는 일정"
            description="이번 주 팔로업, 입금 기한, 약속일, 유효기한을 모아 봅니다."
            events={upcomingSchedule}
            emptyText="이번 주 일정이 없습니다. 문의 팔로업이나 청구 재연락 일정을 잡으면 여기에 나타납니다."
          />

          <Card className="border-border/70">
            <CardHeader className="space-y-0.5 pb-3">
              <CardTitle className="text-base font-semibold">오늘 바로 확인할 항목</CardTitle>
              <CardDescription>오늘 팔로업과 연체 청구를 빠르게 확인합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {!followUps.length && !overdueInvoices.length ? (
                <div className="flex gap-3 rounded-xl border border-dashed border-border/60 bg-muted/15 px-3 py-3 sm:items-start">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <CalendarClock className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <span className={emptyBadgeClass("neutral")}>오늘 일정 없음</span>
                    <p className="text-sm leading-snug text-muted-foreground">
                      오늘 처리할 후속조치가 없습니다. 문의 팔로업이나 청구 추심 일정을 등록하면 여기서 바로 확인할 수 있습니다.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {followUps.map((item) => {
                    const customer = item.customer
                    return (
                      <Link
                        key={item.id}
                        href={`/inquiries?focus=${item.id}`}
                        className="flex flex-col gap-3 rounded-2xl border border-border/70 p-4 transition-colors hover:bg-muted/20 md:flex-row md:items-center md:justify-between"
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
                          <span
                            className={cn(
                              buttonVariants({ variant:"outline", size:"sm" }),"inline-flex gap-1.5"
                            )}
                          >
                            문의로 이동
                            <ArrowRight className="size-4" />
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                  {overdueInvoices.map((invoice) => (
                    <Link
                      key={invoice.id}
                      href={`/invoices?focus=${invoice.id}`}
                      className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/[0.05] p-4 transition-colors hover:bg-destructive/[0.08] md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="text-xs font-semibold text-destructive">
                          연체 청구 · {invoice.invoiceNumber}
                        </p>
                        <p className="mt-1 font-medium">
                          {invoice.customer?.companyName?.trim() || invoice.customer?.name ||"고객"}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          입금 기한 {formatDate(invoice.dueDate)} · {formatCurrency(invoice.amount)}
                        </p>
                      </div>
                      <PaymentStatusBadge status={invoice.paymentStatus} />
                    </Link>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/70">
          <CardHeader className="space-y-0.5 pb-3">
            <CardTitle className="text-base font-semibold">최근 활동</CardTitle>
            <CardDescription>견적, 입금, 리마인드 관련 변경</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!recentActivities.length ? (
              <div className="rounded-xl border border-dashed border-primary/15 bg-primary/[0.03] px-3 py-4 sm:px-4">
                <div className="flex gap-3 sm:items-start">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Activity className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <span className={emptyBadgeClass("muted")}>타임라인 대기</span>
                      <p className="mt-2 text-sm font-medium text-foreground">활동 기록이 아직 없어요</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:text-[13px]">
                        문의를 등록하면 견적·청구 활동이 여기에 쌓입니다.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Link
                        href="/inquiries"
                        className={cn(
                          buttonVariants({ size:"default" }),"inline-flex h-10 w-full justify-center gap-1.5 font-semibold shadow-sm sm:w-auto sm:min-w-[9.5rem]"
                        )}
                      >
                        첫 문의 만들기
                        <ArrowRight className="size-4" />
                      </Link>
                      <Link
                        href="/customers"
                        className={cn(
                          buttonVariants({ variant:"ghost", size:"sm" }),"inline-flex h-9 w-full justify-center text-muted-foreground hover:text-foreground sm:w-auto"
                        )}
                      >
                        고객 등록하기
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              recentActivities.map((activity) => (
                <ActivityEntry
                  key={activity.id}
                  label={resolveActivityHeadline(activity.action)}
                  description={activity.description}
                  createdAt={activity.createdAt}
                  kind={resolveActivityKind(activity.action)}
                  action={activity.action}
                />
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
