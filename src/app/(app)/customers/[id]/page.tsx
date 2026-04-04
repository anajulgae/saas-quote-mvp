import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowRight,
  Building2,
  Clock,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Receipt,
  Sparkles,
  User,
} from "lucide-react"

import { ActivityEntry } from "@/components/app/activity-entry"
import { PageHeader } from "@/components/app/page-header"
import { InquiryStageBadge, PaymentStatusBadge, QuoteStatusBadge } from "@/components/app/status-badge"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { invoiceTypeOptions } from "@/lib/constants"
import { getCustomerDetailData } from "@/lib/data"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"

function invoiceTypeLabel(type: string) {
  return invoiceTypeOptions.find((o) => o.value === type)?.label ?? type
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { customer, inquiries, quotes, invoices, timeline } =
    await getCustomerDetailData(id)

  if (!customer) {
    notFound()
  }

  const displayTitle = customer.companyName?.trim() || customer.name
  const hasCompany = Boolean(customer.companyName?.trim())
  const activityCount = inquiries.length + quotes.length + invoices.length
  const emphasizeInquiry = inquiries.length === 0
  const emphasizeQuote = inquiries.length > 0

  const inquiryNewHref = `/inquiries?customer=${customer.id}&new=1`
  const quoteNewHref = `/quotes?customer=${customer.id}&new=1`

  return (
    <div className="space-y-6">
      <PageHeader
        title={displayTitle}
        description={
          hasCompany
            ? `${customer.name} · 문의 ${inquiries.length} · 견적 ${quotes.length} · 청구 ${invoices.length}`
            : `${customer.phone} · ${customer.email} · 연결 활동 ${activityCount}건`
        }
        action={
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
            <div className="flex flex-wrap justify-end gap-1.5">
              <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                문의 {inquiries.length}
              </span>
              <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                견적 {quotes.length}
              </span>
              <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                청구 {invoices.length}
              </span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <Link
                href={inquiryNewHref}
                className={cn(
                  buttonVariants({
                    variant: emphasizeInquiry ? "default" : "outline",
                    size: "default",
                  }),
                  "inline-flex h-10 w-full items-center justify-center gap-2 font-semibold sm:w-auto"
                )}
              >
                <MessageSquare className="size-4 shrink-0" aria-hidden />
                문의 만들기
              </Link>
              <Link
                href={quoteNewHref}
                className={cn(
                  buttonVariants({
                    variant: emphasizeQuote ? "default" : "outline",
                    size: "default",
                  }),
                  "inline-flex h-10 w-full items-center justify-center gap-2 font-semibold sm:w-auto"
                )}
              >
                <FileText className="size-4 shrink-0" aria-hidden />
                견적 만들기
              </Link>
              <Link
                href="/invoices"
                className={cn(
                  buttonVariants({ variant: "outline", size: "default" }),
                  "inline-flex h-10 w-full items-center justify-center gap-2 sm:w-auto"
                )}
              >
                <Receipt className="size-4 shrink-0" aria-hidden />
                청구 보기
                <ArrowRight className="size-3.5 opacity-70" aria-hidden />
              </Link>
            </div>
          </div>
        }
      />

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">고객 개요</CardTitle>
          <CardDescription>연락처와 분류를 한눈에 확인합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {hasCompany ? (
              <div className="flex gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 lg:col-span-1">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm">
                  <User className="size-4 text-muted-foreground" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    담당자
                  </p>
                  <p className="truncate text-sm font-medium text-foreground">{customer.name}</p>
                </div>
              </div>
            ) : null}
            <div className="flex gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm">
                <Phone className="size-4 text-muted-foreground" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  전화
                </p>
                <a
                  href={`tel:${customer.phone.replace(/\s/g, "")}`}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  {customer.phone || "—"}
                </a>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm">
                <Mail className="size-4 text-muted-foreground" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  이메일
                </p>
                {customer.email ? (
                  <a
                    href={`mailto:${customer.email}`}
                    className="break-all text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {customer.email}
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 sm:col-span-2 lg:col-span-1">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm">
                <Building2 className="size-4 text-muted-foreground" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  태그 · 분류
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {customer.tags.length ? (
                    customer.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md border border-primary/20 bg-primary/8 px-2 py-0.5 text-xs font-medium text-foreground"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">등록된 태그 없음</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 size-4 text-amber-600 dark:text-amber-400" aria-hidden />
              <div>
                <CardTitle className="text-lg">고객 메모</CardTitle>
                <CardDescription>
                  협업 시 참고할 메모와 분류입니다. 자주 묻는 요청·견적 패턴도 적어 두면 좋습니다.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                분류 태그
              </p>
              <div className="flex flex-wrap gap-1.5">
                {customer.tags.length ? (
                  customer.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border/80 bg-muted/50 px-2.5 py-1 text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">태그가 없습니다.</span>
                )}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                메모
              </p>
              {customer.notes?.trim() ? (
                <p className="line-clamp-6 text-sm leading-relaxed text-foreground">{customer.notes}</p>
              ) : (
                <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">
                  아직 메모가 없습니다. 결제 조건, 선호 채널, 반복 요청 사항 등을 남겨 두세요.
                </p>
              )}
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">
              팁: &quot;월 정액 유지보수&quot;, &quot;견적 전 샘플 요청&quot;처럼 자주 반복되는 패턴을 적어 두면 후속 문의·견적 작성이 빨라집니다.
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-gradient-to-b from-primary/[0.06] to-card shadow-sm ring-1 ring-primary/10">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Clock className="size-4" aria-hidden />
                </div>
                <div>
                  <CardTitle className="text-lg">고객 타임라인</CardTitle>
                  <CardDescription className="mt-1 max-w-prose">
                    문의·견적·청구·알림이 시간순으로 쌓입니다. 이 고객과의 실무 흐름을 여기서 추적하세요.
                  </CardDescription>
                </div>
              </div>
              <span className="rounded-full border border-primary/25 bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                핵심
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!timeline.length ? (
              <div className="rounded-xl border border-dashed border-primary/30 bg-background/60 p-5 text-center">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <Clock className="size-6 text-primary" aria-hidden />
                </div>
                <p className="text-sm font-semibold text-foreground">아직 타임라인이 비어 있습니다</p>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  문의, 견적, 청구를 시작하면 고객 이력이 이곳에 자동으로 쌓입니다.
                </p>
                <Link
                  href={inquiryNewHref}
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "mt-4 inline-flex gap-2 font-semibold"
                  )}
                >
                  <MessageSquare className="size-4" aria-hidden />
                  첫 문의 만들기
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {timeline.map((event) => (
                  <ActivityEntry
                    key={event.id}
                    label={event.label}
                    description={event.description}
                    createdAt={event.createdAt}
                    kind={event.kind ?? "other"}
                    action={event.action}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-sky-600 dark:text-sky-400" aria-hidden />
              <CardTitle className="text-base">문의</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {inquiries.length ? (
              inquiries.map((item) => (
                <div key={item.id} className="rounded-xl border border-border/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{item.title}</p>
                    <InquiryStageBadge stage={item.stage} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.details}</p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-sky-500/35 bg-sky-500/[0.06] p-4">
                <p className="text-sm font-semibold text-foreground">문의가 아직 없습니다</p>
                <p className="mt-1 text-sm leading-snug text-muted-foreground">
                  다음 단계: 이 고객의 첫 문의를 등록해 단계(신규→견적)를 관리하세요.
                </p>
                <Link
                  href={inquiryNewHref}
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "mt-3 inline-flex gap-2 font-semibold"
                  )}
                >
                  <Plus className="size-4" aria-hidden />
                  첫 문의 만들기
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-violet-600 dark:text-violet-400" aria-hidden />
              <CardTitle className="text-base">견적</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {quotes.length ? (
              quotes.map((item) => (
                <div key={item.id} className="rounded-xl border border-border/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{item.quoteNumber}</p>
                    <QuoteStatusBadge status={item.status} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.title}</p>
                  <p className="mt-2 text-sm font-medium">{formatCurrency(item.total)}</p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-violet-500/35 bg-violet-500/[0.06] p-4">
                <p className="text-sm font-semibold text-foreground">견적이 아직 없습니다</p>
                <p className="mt-1 text-sm leading-snug text-muted-foreground">
                  문의가 쌓이면 견적으로 이어집니다. 바로 금액안을 올릴 수도 있습니다.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={inquiries.length ? "/inquiries" : inquiryNewHref}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
                  >
                    {inquiries.length ? "문의 보기" : "문의 먼저 만들기"}
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                  <Link
                    href={quoteNewHref}
                    className={cn(buttonVariants({ size: "sm" }), "gap-1.5 font-semibold")}
                  >
                    <FileText className="size-3.5" aria-hidden />
                    견적 만들기
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Receipt className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
              <CardTitle className="text-base">청구</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {invoices.length ? (
              invoices.map((item) => (
                <div key={item.id} className="rounded-xl border border-border/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{item.invoiceNumber}</p>
                    <PaymentStatusBadge status={item.paymentStatus} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {invoiceTypeLabel(item.invoiceType)} · {formatCurrency(item.amount)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-emerald-500/35 bg-emerald-500/[0.06] p-4">
                <p className="text-sm font-semibold text-foreground">청구 내역이 없습니다</p>
                <p className="mt-1 text-sm leading-snug text-muted-foreground">
                  견적이 확정된 뒤 선금·잔금 청구를 만들 수 있습니다.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="/invoices"
                    className={cn(buttonVariants({ size: "sm" }), "gap-1.5 font-semibold")}
                  >
                    청구 화면으로
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                  <Link
                    href="/quotes"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
                  >
                    견적 확인
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
