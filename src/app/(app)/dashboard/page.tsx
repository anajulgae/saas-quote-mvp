import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  Activity,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  MessagesSquare,
  Receipt,
  Sparkles,
} from "lucide-react"

import { ActivityEntry } from "@/components/app/activity-entry"
import { BetaOnboardingBanner } from "@/components/app/beta-onboarding-banner"
import { MetricCard } from "@/components/app/metric-card"
import { PageHeader } from "@/components/app/page-header"
import { InquiryStageBadge, PaymentStatusBadge } from "@/components/app/status-badge"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { resolveActivityHeadline, resolveActivityKind } from "@/lib/activity-presentation"
import { getDashboardPageData } from "@/lib/data"
import { formatCurrency, formatDateTime } from "@/lib/format"

const pipelineColumns = [
  { key: "new", label: "신규 문의" },
  { key: "qualified", label: "검토 중" },
  { key: "quoted", label: "견적 발송" },
  { key: "won", label: "수주 완료" },
] as const

function resolveDashboardMainAction(counts: {
  inquiries: number
  quotes: number
  invoices: number
}): { label: string; href: string; icon: LucideIcon } {
  if (counts.inquiries === 0) {
    return { label: "첫 문의 만들기", href: "/inquiries", icon: MessagesSquare }
  }
  if (counts.quotes === 0) {
    return { label: "새 견적 만들기", href: "/quotes", icon: FileText }
  }
  if (counts.invoices === 0) {
    return { label: "새 청구 만들기", href: "/invoices", icon: Receipt }
  }
  return { label: "새 견적 초안", href: "/quotes", icon: FileText }
}

function emptyBadgeClass(tone: "positive" | "neutral" | "muted") {
  const map = {
    positive: "border-primary/25 bg-primary/[0.08] text-primary dark:bg-primary/18",
    neutral: "border-border/55 bg-muted/50 text-muted-foreground",
    muted: "border-border/50 bg-muted/35 text-muted-foreground",
  } as const
  return cn(
    "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
    map[tone]
  )
}

export default async function DashboardPage() {
  const {
    metrics,
    followUps,
    overdueInvoices,
    recentActivities,
    pipelineSummary,
    showBetaOnboarding,
    counts,
  } = await getDashboardPageData()

  const mainAction = resolveDashboardMainAction(counts)
  const MainIcon = mainAction.icon
  const showQuickStartStrip = !showBetaOnboarding && counts.inquiries === 0
  /** 온보딩이 주 행동을 안내할 때 상단 CTA는 보조 링크로만 */
  const softenHeaderCta = showBetaOnboarding && counts.inquiries === 0

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
                  고객 등록 후 문의부터 넣으면 지표가 채워집니다.
                </p>
              </div>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-1.5 sm:w-auto sm:flex-row">
              <Link
                href="/customers"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "inline-flex h-9 w-full justify-center sm:w-auto"
                )}
              >
                첫 고객 등록
              </Link>
              <Link
                href="/inquiries"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "inline-flex h-9 w-full justify-center sm:w-auto"
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
        description="이번 달 견적·수금과 오늘의 후속조치를 확인합니다."
        className="pb-4"
        action={
          softenHeaderCta ? (
            <Link
              href="/inquiries"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "inline-flex w-full items-center justify-center gap-1 text-muted-foreground hover:text-foreground sm:w-auto"
              )}
            >
              문의 화면으로
              <ArrowRight className="size-3.5 opacity-70" />
            </Link>
          ) : (
            <Link
              href={mainAction.href}
              className={cn(
                buttonVariants(),
                "inline-flex h-10 w-full items-center justify-center gap-2 sm:h-9 sm:w-auto"
              )}
            >
              <MainIcon className="size-4" />
              {mainAction.label}
            </Link>
          )
        }
      />

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

      <section className="grid gap-3 sm:gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/70">
          <CardHeader className="space-y-0.5 pb-3">
            <CardTitle className="text-base font-semibold">파이프라인 상태 요약</CardTitle>
            <CardDescription className="text-xs">문의부터 수주까지 단계별 현황</CardDescription>
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
            <CardDescription className="text-xs">연체 또는 즉시 확인이 필요한 건</CardDescription>
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
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "inline-flex h-8 gap-1 text-xs"
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
        <Card className="border-border/70">
          <CardHeader className="space-y-0.5 pb-3">
            <CardTitle className="text-base font-semibold">오늘 해야 할 후속조치</CardTitle>
            <CardDescription className="text-xs">정해진 팔로업 일정 중심으로 정리</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!followUps.length ? (
              <div className="flex gap-3 rounded-xl border border-dashed border-border/60 bg-muted/15 px-3 py-3 sm:items-start">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <CalendarClock className="size-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <span className={emptyBadgeClass("neutral")}>오늘 일정 없음</span>
                  <p className="text-sm leading-snug text-muted-foreground">
                    오늘 처리할 후속조치가 없습니다. 문의에 팔로업 일정을 넣으면 여기에 표시됩니다.
                  </p>
                  <Link
                    href="/inquiries"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "inline-flex h-8 gap-1 text-xs"
                    )}
                  >
                    문의로 이동
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            ) : (
              followUps.map((item) => {
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
                      <Link
                        href="/inquiries"
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "inline-flex gap-1.5"
                        )}
                      >
                        문의로 이동
                        <ArrowRight className="size-4" />
                      </Link>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="space-y-0.5 pb-3">
            <CardTitle className="text-base font-semibold">최근 활동</CardTitle>
            <CardDescription className="text-xs">견적, 입금, 리마인드 관련 변경</CardDescription>
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
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
                        문의를 등록하면 견적·청구 활동이 여기에 쌓입니다.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Link
                        href="/inquiries"
                        className={cn(
                          buttonVariants({ size: "default" }),
                          "inline-flex h-10 w-full justify-center gap-1.5 font-semibold shadow-sm sm:w-auto sm:min-w-[9.5rem]"
                        )}
                      >
                        첫 문의 만들기
                        <ArrowRight className="size-4" />
                      </Link>
                      <Link
                        href="/customers"
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "sm" }),
                          "inline-flex h-9 w-full justify-center text-muted-foreground hover:text-foreground sm:w-auto"
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
