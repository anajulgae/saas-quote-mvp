import Link from"next/link"
import { notFound } from"next/navigation"
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
} from"lucide-react"

import { ActivityEntry } from"@/components/app/activity-entry"
import { PageHeader } from"@/components/app/page-header"
import { InquiryStageBadge, PaymentStatusBadge, QuoteStatusBadge } from"@/components/app/status-badge"
import { buttonVariants } from"@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card"
import { CustomerAiInsightSection } from"@/components/app/customer-ai-insight-section"
import { CustomerPortalLinkBlock } from"@/components/app/customer-portal-link-block"
import { CustomerTaxInvoiceSidebarCard } from"@/components/app/customer-tax-invoice-sidebar-card"
import { invoiceTypeOptions } from"@/lib/constants"
import { getCustomerDetailData } from"@/lib/data"
import { formatCurrency } from"@/lib/format"
import { planAllowsFeature } from"@/lib/plan-features"
import { getSiteOrigin } from"@/lib/site-url"
import { cn } from"@/lib/utils"

function invoiceTypeLabel(type: string) {
  return invoiceTypeOptions.find((o) => o.value === type)?.label ?? type
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { customer, inquiries, quotes, invoices, timeline, currentPlan, taxInvoiceSummary } =
    await getCustomerDetailData(id)

  if (!customer) {
    notFound()
  }

  const siteOrigin = getSiteOrigin()
  const portalAllowed = planAllowsFeature(currentPlan,"customer_mini_portal")

  const displayTitle = customer.companyName?.trim() || customer.name
  const hasCompany = Boolean(customer.companyName?.trim())
  const allActivityEmpty =
    inquiries.length === 0 && quotes.length === 0 && invoices.length === 0
  /** 다음으로 권장되는 단일 주요 CTA */
  const primaryCta =
    inquiries.length === 0
      ? ("inquiry" as const)
      : quotes.length === 0
        ? ("quote" as const)
        : invoices.length === 0
          ? ("invoice" as const)
          : null

  const inquiryNewHref = `/inquiries?customer=${customer.id}&new=1`
  const quoteNewHref = `/quotes?customer=${customer.id}&new=1`

  const inquiryBtnVariant = primaryCta ==="inquiry" ?"default" :"outline"
  const inquiryBtnSize = primaryCta ==="inquiry" ?"default" :"sm"
  const inquiryBtnLayout =
    primaryCta ==="inquiry"
      ?"h-10 font-semibold sm:h-10"
      :"h-9 font-normal text-foreground sm:h-9"

  const quoteBtnVariant =
    primaryCta ==="quote"
      ?"default"
      : allActivityEmpty && primaryCta ==="inquiry"
        ?"ghost"
        : primaryCta ==="invoice" || primaryCta === null
          ?"ghost"
          :"outline"
  const quoteBtnSize = primaryCta ==="quote" ?"default" :"sm"
  const quoteBtnLayout = cn(
    primaryCta ==="quote" ?"h-10 font-semibold sm:h-10" :"h-9 font-normal sm:h-9",
    quoteBtnVariant ==="ghost" &&"text-muted-foreground hover:text-foreground"
  )

  const invoiceBtnVariant =
    primaryCta ==="invoice"
      ?"default"
      : allActivityEmpty || primaryCta ==="quote" || primaryCta === null
        ?"ghost"
        :"outline"
  const invoiceBtnSize = primaryCta ==="invoice" ?"default" :"sm"
  const invoiceBtnLayout = cn(
    primaryCta ==="invoice" ?"h-10 font-semibold sm:h-10" :"h-9 font-normal sm:h-9",
    invoiceBtnVariant ==="ghost" &&"text-muted-foreground hover:text-foreground"
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={displayTitle}
        description={
          hasCompany
            ? `${customer.name} · ${customer.phone ||"—"} · ${customer.email ||"—"}`
            : `${customer.phone ||"—"} · ${customer.email ||"—"}`
        }
        action={
          <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:items-end">
            <div className="flex flex-wrap justify-end gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                활동 요약
              </span>
              <span className="inline-flex items-center rounded-md border border-border/80 bg-muted/30 px-2 py-0.5 text-xs tabular-nums text-foreground">
                문의 <strong className="ml-1 font-semibold">{inquiries.length}</strong>
              </span>
              <span className="inline-flex items-center rounded-md border border-border/80 bg-muted/30 px-2 py-0.5 text-xs tabular-nums text-foreground">
                견적 <strong className="ml-1 font-semibold">{quotes.length}</strong>
              </span>
              <span className="inline-flex items-center rounded-md border border-border/80 bg-muted/30 px-2 py-0.5 text-xs tabular-nums text-foreground">
                청구 <strong className="ml-1 font-semibold">{invoices.length}</strong>
              </span>
            </div>
            <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-2">
              <Link
                href={inquiryNewHref}
                className={cn(
                  buttonVariants({
                    variant: inquiryBtnVariant,
                    size: inquiryBtnSize,
                  }),"inline-flex w-full items-center justify-center gap-2 sm:w-auto",
                  inquiryBtnLayout
                )}
              >
                <MessageSquare className="size-4 shrink-0" aria-hidden />
                문의 만들기
              </Link>
              <Link
                href={quoteNewHref}
                className={cn(
                  buttonVariants({
                    variant: quoteBtnVariant,
                    size: quoteBtnSize,
                  }),"inline-flex w-full items-center justify-center gap-2 sm:w-auto",
                  quoteBtnLayout
                )}
              >
                <FileText className="size-4 shrink-0" aria-hidden />
                견적 만들기
              </Link>
              <Link
                href="/invoices"
                className={cn(
                  buttonVariants({
                    variant: invoiceBtnVariant,
                    size: invoiceBtnSize,
                  }),"inline-flex w-full items-center justify-center gap-2 sm:w-auto",
                  invoiceBtnLayout
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

      <CustomerPortalLinkBlock
        customerId={customer.id}
        initialToken={customer.portalToken}
        siteOrigin={siteOrigin}
        portalAllowed={portalAllowed}
      />

      <CustomerTaxInvoiceSidebarCard
        customer={customer}
        taxInvoiceSummary={taxInvoiceSummary}
        currentPlan={currentPlan}
      />

      <CustomerAiInsightSection
        customerId={customer.id}
        aiAssistEnabled={planAllowsFeature(currentPlan,"ai_assist")}
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  전화
                </p>
                <a
                  href={`tel:${customer.phone.replace(/\s/g,"")}`}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  {customer.phone ||"—"}
                </a>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm">
                <Mail className="size-4 text-muted-foreground" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
          <CardHeader className="pb-2">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 size-4 text-amber-600 dark:text-amber-400" aria-hidden />
              <div>
                <CardTitle className="text-base font-semibold">고객 메모</CardTitle>
                <CardDescription>
                  내부 참고용 메모·태그입니다.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                분류 태그
              </p>
              <div className="flex flex-wrap gap-1.5">
                {customer.tags.length ? (
                  customer.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border/80 bg-muted/50 px-2.5 py-0.5 text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">태그 없음</span>
                )}
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                메모
              </p>
              {customer.notes?.trim() ? (
                <p className="line-clamp-4 text-sm font-medium leading-relaxed text-foreground">
                  {customer.notes}
                </p>
              ) : (
                <p className="rounded-md border border-dashed border-border/70 bg-muted/15 px-2.5 py-2 text-sm leading-snug text-muted-foreground">
                  메모 없음 · 결제·선호 채널·반복 요청 등을 짧게 적어 두세요.
                </p>
              )}
            </div>
            <p className="text-sm leading-snug text-muted-foreground/90">
              예: 월 정액 유지보수, 견적 전 샘플 요청
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
                  <CardDescription className="mt-0.5 max-w-prose">
                    문의·견적·청구·알림이 시간순으로 쌓입니다.
                  </CardDescription>
                </div>
              </div>
              <span className="rounded-full border border-primary/25 bg-background/80 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
                핵심
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!timeline.length ? (
              <div className="rounded-xl border border-dashed border-primary/30 bg-background/60 p-4 text-center">
                <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10">
                  <Clock className="size-5 text-primary" aria-hidden />
                </div>
                <p className="text-sm font-semibold text-foreground">타임라인이 비어 있습니다</p>
                <p className="mx-auto mt-1.5 max-w-sm text-sm leading-snug text-muted-foreground">
                  문의·견적·청구를 시작하면 이력이 여기에 쌓입니다.
                </p>
                <Link
                  href={inquiryNewHref}
                  className={cn(
                    buttonVariants({ size:"sm" }),"mt-3 inline-flex gap-2 font-semibold"
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
                    kind={event.kind ??"other"}
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
          <CardHeader className="space-y-0 pb-1.5 pt-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-sky-600 dark:text-sky-400" aria-hidden />
              <CardTitle className="text-[15px] font-semibold">문의</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pb-4 pt-0">
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
              <div className="rounded-lg border border-dashed border-sky-500/35 bg-sky-500/[0.06] p-3">
                <p className="text-sm font-semibold text-foreground">문의 없음</p>
                <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
                  첫 문의를 등록해 단계를 관리하세요.
                </p>
                <Link
                  href={inquiryNewHref}
                  className={cn(
                    buttonVariants({ size:"sm" }),"mt-2 inline-flex gap-1.5 font-semibold"
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
          <CardHeader className="space-y-0 pb-1.5 pt-4">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-violet-600 dark:text-violet-400" aria-hidden />
              <CardTitle className="text-[15px] font-semibold">견적</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pb-4 pt-0">
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
              <div className="rounded-lg border border-dashed border-violet-500/35 bg-violet-500/[0.06] p-3">
                <p className="text-sm font-semibold text-foreground">견적 없음</p>
                <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
                  문의 후 견적로 이어지거나, 바로 견적을 올릴 수 있습니다.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Link
                    href={inquiries.length ?"/inquiries" : inquiryNewHref}
                    className={cn(buttonVariants({ variant:"outline", size:"sm" }),"h-8 gap-1 text-xs")}
                  >
                    {inquiries.length ?"문의 보기" :"문의 먼저"}
                    <ArrowRight className="size-3" aria-hidden />
                  </Link>
                  <Link
                    href={quoteNewHref}
                    className={cn(buttonVariants({ size:"sm" }),"h-8 gap-1 text-xs font-semibold")}
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
          <CardHeader className="space-y-0 pb-1.5 pt-4">
            <div className="flex items-center gap-2">
              <Receipt className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
              <CardTitle className="text-[15px] font-semibold">청구</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pb-4 pt-0">
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
              <div className="rounded-lg border border-dashed border-primary/25 bg-primary/[0.06] p-3">
                <p className="text-sm font-semibold text-foreground">청구 없음</p>
                <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
                  견적 확정 후 선금·잔금 청구를 만듭니다.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Link
                    href="/invoices"
                    className={cn(buttonVariants({ size:"sm" }),"h-8 gap-1 text-xs font-semibold")}
                  >
                    청구 화면
                    <ArrowRight className="size-3" aria-hidden />
                  </Link>
                  <Link
                    href="/quotes"
                    className={cn(buttonVariants({ variant:"outline", size:"sm" }),"h-8 text-xs")}
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
