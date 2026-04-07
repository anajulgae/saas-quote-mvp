import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  Building2,
  ChevronRight,
  FileText,
  HelpCircle,
  Mail,
  MessageCircle,
  Phone,
  Receipt,
} from "lucide-react"

import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

type PortalQuote = {
  id: string
  quoteNumber: string
  title: string
  status: string
  total: number
  validUntil: string | null
  sentAt: string | null
  publicToken: string | null
}

type PortalInvoice = {
  id: string
  invoiceNumber: string
  invoiceType: string
  amount: number
  paymentStatus: string
  dueDate: string | null
  requestedAt: string | null
  paidAt: string | null
  publicToken: string | null
}

export type CustomerPortalPayload = {
  valid: true
  businessName: string
  ownerName: string
  contactEmail: string
  contactPhone: string
  bankAccount: string
  paymentTerms: string
  customerName: string
  publicInquiryFormOn: boolean
  publicInquiryFormToken: string | null
  quotes: PortalQuote[]
  invoices: PortalInvoice[]
}

/** 고객 포털용 generateMetadata 에서 재사용 */
export function buildCustomerPortalMetadata(payload: Record<string, unknown> | null): Metadata {
  if (!payload || payload.valid !== true || typeof payload.businessName !== "string") {
    return {
      title: "거래 안내",
      description: "견적·청구 안내 페이지입니다.",
    }
  }
  const businessName = payload.businessName.trim() || "거래 안내"
  const customerName = typeof payload.customerName === "string" ? payload.customerName.trim() : ""
  const desc =
    customerName.length > 0
      ? `${customerName}님을 위한 견적·청구 안내 페이지입니다.`
      : "전달드린 견적·청구를 한곳에서 확인하실 수 있는 안내 페이지입니다."
  const title = `${businessName} · 거래 안내`
  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
    },
  }
}

function quoteStatusCustomerLabel(status: string) {
  const m: Record<string, string> = {
    draft: "내용 정리 중",
    sent: "발송 완료",
    approved: "견적 확정",
    rejected: "해당 건 종료",
    expired: "유효기간 만료",
  }
  return m[status] ?? "안내 중"
}

function invoicePaymentLabel(status: string) {
  const m: Record<string, string> = {
    pending: "입금 확인 전",
    deposit_paid: "선금 입금됨",
    partially_paid: "일부 입금됨",
    paid: "입금 완료",
    overdue: "기한 경과 · 확인 필요",
  }
  return m[status] ?? "결제 상태 안내 중"
}

function invoiceTypeLabel(type: string) {
  const m: Record<string, string> = {
    deposit: "선금",
    balance: "잔금",
    final: "잔여(최종) 청구",
  }
  return m[type] ?? "청구"
}

function quoteChipClass(status: string) {
  if (status === "approved") {
    return "bg-emerald-500/12 text-emerald-900 dark:text-emerald-100"
  }
  if (status === "expired" || status === "rejected") {
    return "bg-slate-500/12 text-slate-700 dark:text-slate-200"
  }
  if (status === "sent") {
    return "bg-sky-500/12 text-sky-900 dark:text-sky-100"
  }
  return "bg-amber-500/10 text-amber-900 dark:text-amber-100"
}

function invoiceChipClass(status: string) {
  if (status === "paid") {
    return "bg-emerald-500/12 text-emerald-900 dark:text-emerald-100"
  }
  if (status === "overdue") {
    return "bg-amber-500/15 text-amber-950 dark:text-amber-100"
  }
  if (status === "partially_paid" || status === "deposit_paid") {
    return "bg-sky-500/10 text-sky-950 dark:text-sky-100"
  }
  return "bg-slate-500/10 text-slate-700 dark:text-slate-200"
}

function businessInitial(name: string) {
  const t = name.trim()
  if (!t) {
    return "B"
  }
  const ch = t[0]
  return /[a-zA-Z0-9]/.test(ch) ? ch.toUpperCase() : ch
}

export function CustomerPortalView({
  payload,
  siteOrigin,
}: {
  payload: CustomerPortalPayload
  siteOrigin: string
}) {
  const inquiryHref =
    payload.publicInquiryFormOn && payload.publicInquiryFormToken?.trim()
      ? `${siteOrigin}/request/${encodeURIComponent(payload.publicInquiryFormToken.trim())}`
      : null

  const business = payload.businessName.trim() || "거래처"
  const owner = payload.ownerName.trim()
  const customer = payload.customerName.trim()
  const hasPhone = Boolean(payload.contactPhone.trim())
  const hasEmail = Boolean(payload.contactEmail.trim())
  const hasContact = hasPhone || hasEmail

  const greeting = customer.length > 0 ? `${customer}님, 안녕하세요.` : "안녕하세요."

  return (
    <div className="min-h-dvh bg-[#f6f7f9] text-[#0f172a] dark:bg-[#0c0f14] dark:text-[#e8eaef]">
      <div className="border-b border-black/[0.06] bg-white/90 backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#12151c]/95">
        <div className="mx-auto max-w-xl px-4 py-3 sm:max-w-2xl sm:py-4">
          <p className="text-center text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            거래·정산 안내
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 pb-16 pt-6 sm:max-w-2xl sm:pb-20 sm:pt-8">
        {/* 상단 소개 */}
        <header className="mb-8 text-center sm:mb-10">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#0f172a] text-xl font-semibold text-white shadow-md dark:bg-white dark:text-[#0f172a]">
            {businessInitial(business)}
          </div>
          <div className="mx-auto flex max-w-md flex-col items-center gap-1">
            <h1 className="text-[1.35rem] font-semibold leading-snug tracking-tight text-[#0f172a] dark:text-white sm:text-2xl">
              {business}
            </h1>
            {owner ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                문의 담당 · <span className="font-medium text-slate-800 dark:text-slate-100">{owner}</span>
              </p>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-300">문의 담당 · 업체 대표</p>
            )}
          </div>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {greeting} 아래에서 전달드린 <strong className="font-medium text-slate-800 dark:text-slate-100">견적</strong>과{" "}
            <strong className="font-medium text-slate-800 dark:text-slate-100">청구</strong>를 확인하실 수 있습니다. 추가 문의는
            하단 버튼이나 연락처로 남겨 주세요.
          </p>
          <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            평일 업무 시간 기준으로 순차 확인 후 안내드립니다. 급하신 일은 전화로 연락 주시면 더 빠르게 도와드릴 수 있습니다.
          </p>
        </header>

        {/* 문의처 */}
        <section
          className="mb-8 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-700/80 dark:bg-[#141820]"
          aria-labelledby="portal-contact-heading"
        >
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
              <Building2 className="size-5 text-slate-600 dark:text-slate-300" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="portal-contact-heading" className="text-base font-semibold text-[#0f172a] dark:text-white">
                연락·문의 안내
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                아래 연락처로 문의 주시면 담당자가 확인 후 안내드립니다. 카카오톡 등 다른 채널을 쓰시는 경우에도 가능하면
                <span className="font-medium"> 전화번호·이메일 중 한 가지</span>를 함께 남겨 주시면 같은 순서로 처리하기
                쉽습니다.
              </p>
            </div>
          </div>

          {hasContact ? (
            <ul className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-700/80">
              {hasPhone ? (
                <li>
                  <a
                    href={`tel:${payload.contactPhone.replace(/\s/g, "")}`}
                    className="group flex items-center gap-3 rounded-xl border border-transparent px-2 py-2 transition-colors hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-600 dark:hover:bg-slate-800/50"
                  >
                    <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                      <Phone className="size-4 text-slate-600 dark:text-slate-300" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">전화</span>
                      <span className="text-sm font-semibold text-[#0f172a] underline-offset-2 group-hover:underline dark:text-white">
                        {payload.contactPhone.trim()}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />
                  </a>
                </li>
              ) : null}
              {hasEmail ? (
                <li>
                  <a
                    href={`mailto:${payload.contactEmail.trim()}`}
                    className="group flex items-center gap-3 rounded-xl border border-transparent px-2 py-2 transition-colors hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-600 dark:hover:bg-slate-800/50"
                  >
                    <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                      <Mail className="size-4 text-slate-600 dark:text-slate-300" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">이메일</span>
                      <span className="break-all text-sm font-semibold text-[#0f172a] underline-offset-2 group-hover:underline dark:text-white">
                        {payload.contactEmail.trim()}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />
                  </a>
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-relaxed text-slate-600 dark:border-slate-700/80 dark:text-slate-300">
              등록된 전화·메일이 없습니다. 아래 <span className="font-medium">문의 남기기</span> 또는 견적·청구 카드의 안내를
              이용해 주세요.
            </p>
          )}
        </section>

        {/* 최근 견적 */}
        <section className="mb-8" aria-labelledby="portal-quotes-heading">
          <div className="mb-3 flex items-end justify-between gap-2">
            <div>
              <h2 id="portal-quotes-heading" className="flex items-center gap-2 text-base font-semibold text-[#0f172a] dark:text-white">
                <FileText className="size-4 text-slate-500" aria-hidden />
                견적 안내
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">최근 전달드린 견적입니다. 버튼으로 상세를 열 수 있습니다.</p>
            </div>
          </div>

          {payload.quotes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-5 py-8 text-center dark:border-slate-600 dark:bg-[#141820]/80">
              <FileText className="mx-auto size-9 text-slate-300 dark:text-slate-600" aria-hidden />
              <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-100">아직 안내드린 견적이 없습니다</p>
              <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                필요하신 견적이 있다면 문의를 남겨 주세요. 담당자가 확인 후 견적을 준비해 안내드리겠습니다.
              </p>
              {inquiryHref ? (
                <Link
                  href={inquiryHref}
                  className="mt-4 inline-flex items-center justify-center gap-1 rounded-xl bg-[#0f172a] px-4 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-[#0f172a]"
                >
                  문의 남기기
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              ) : null}
            </div>
          ) : (
            <ul className="space-y-4">
              {payload.quotes.map((q) => (
                <li
                  key={q.id}
                  className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-700 dark:bg-[#141820]"
                >
                  <div className="border-b border-slate-100 px-4 pb-3 pt-4 dark:border-slate-700/80">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">견적 번호</p>
                        <p className="font-mono text-sm font-semibold text-[#0f172a] dark:text-white">{q.quoteNumber}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-700 dark:text-slate-200">{q.title.trim() || "견적 제목"}</p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium",
                          quoteChipClass(q.status)
                        )}
                      >
                        {quoteStatusCustomerLabel(q.status)}
                      </span>
                    </div>
                    <p className="mt-3 text-xl font-semibold tabular-nums tracking-tight text-[#0f172a] dark:text-white">
                      {formatCurrency(q.total)}
                    </p>
                    {q.validUntil ? (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">유효 기한 · {formatDate(q.validUntil)}</p>
                    ) : null}
                  </div>
                  <div className="px-4 py-3">
                    {q.publicToken ? (
                      <Link
                        href={`/quote-view/${encodeURIComponent(q.publicToken)}`}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f172a] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-[#0f172a]"
                      >
                        견적 보기
                        <ArrowRight className="size-4" aria-hidden />
                      </Link>
                    ) : (
                      <div className="rounded-xl bg-slate-50 px-3 py-3 text-center dark:bg-slate-800/60">
                        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                          이 견적은 아직 이 페이지에서 바로 열어볼 수 있는 링크가 준비되지 않았습니다. 내용 확인이 필요하시면
                          연락처 또는 문의 남기기로 알려 주세요.
                        </p>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 최근 청구 */}
        <section className="mb-10" aria-labelledby="portal-invoices-heading">
          <div className="mb-3">
            <h2
              id="portal-invoices-heading"
              className="flex items-center gap-2 text-base font-semibold text-[#0f172a] dark:text-white"
            >
              <Receipt className="size-4 text-slate-500" aria-hidden />
              청구 안내
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">입금 안내와 청구서 링크를 확인하실 수 있습니다.</p>
          </div>

          {payload.invoices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-5 py-8 text-center dark:border-slate-600 dark:bg-[#141820]/80">
              <Receipt className="mx-auto size-9 text-slate-300 dark:text-slate-600" aria-hidden />
              <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-100">안내 중인 청구가 없습니다</p>
              <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                청구가 등록되면 이곳에 표시됩니다. 입금·내역 문의는 연락처 또는 문의 남기기로 편하게 남겨 주세요.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {payload.invoices.map((inv) => (
                <li
                  key={inv.id}
                  className={cn(
                    "overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-[#141820]",
                    inv.paymentStatus === "overdue"
                      ? "border-amber-300/80 dark:border-amber-700/50"
                      : "border-slate-200/90 dark:border-slate-700"
                  )}
                >
                  <div className="border-b border-slate-100 px-4 pb-3 pt-4 dark:border-slate-700/80">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">청구 번호</p>
                        <p className="font-mono text-sm font-semibold text-[#0f172a] dark:text-white">{inv.invoiceNumber}</p>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                          구분 · <span className="font-medium">{invoiceTypeLabel(inv.invoiceType)}</span>
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium",
                          invoiceChipClass(inv.paymentStatus)
                        )}
                      >
                        {invoicePaymentLabel(inv.paymentStatus)}
                      </span>
                    </div>
                    <p className="mt-3 text-xl font-semibold tabular-nums tracking-tight text-[#0f172a] dark:text-white">
                      {formatCurrency(inv.amount)}
                    </p>
                    {inv.dueDate ? (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">입금 기한 · {formatDate(inv.dueDate)}</p>
                    ) : null}
                    {payload.bankAccount.trim() ? (
                      <div className="mt-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">입금 계좌 안내</p>
                        <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-800 dark:text-slate-100">
                          {payload.bankAccount.trim()}
                        </p>
                      </div>
                    ) : null}
                    {payload.paymentTerms.trim() ? (
                      <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{payload.paymentTerms.trim()}</p>
                    ) : null}
                  </div>
                  <div className="px-4 py-3">
                    {inv.publicToken ? (
                      <Link
                        href={`/invoice-view/${encodeURIComponent(inv.publicToken)}`}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f172a] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-[#0f172a]"
                      >
                        청구 보기
                        <ArrowRight className="size-4" aria-hidden />
                      </Link>
                    ) : (
                      <div className="rounded-xl bg-slate-50 px-3 py-3 text-center dark:bg-slate-800/60">
                        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                          고객용 청구서 페이지 링크가 아직 준비되지 않았습니다. 입금·내역 확인이 필요하시면 연락처로 문의해 주시거나
                          아래에서 문의를 남겨 주세요.
                        </p>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 1차 CTA: 문의 */}
        {inquiryHref ? (
          <section className="mb-8 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 p-5 text-center shadow-sm dark:border-slate-700 dark:from-[#141820] dark:to-[#10141c]">
            <MessageCircle className="mx-auto size-9 text-slate-400 dark:text-slate-500" aria-hidden />
            <p className="mt-2 text-base font-semibold text-[#0f172a] dark:text-white">추가 문의·요청이 있으신가요?</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              견적·청구 외 문의나 수정 요청은 아래 버튼으로 남겨 주시면 담당자가 확인 후 연락드립니다.
            </p>
            <Link
              href={inquiryHref}
              className="mt-4 inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-[#0f172a] py-3.5 text-sm font-semibold text-white dark:bg-white dark:text-[#0f172a]"
            >
              문의 남기기
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </section>
        ) : (
          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 text-center dark:border-slate-700 dark:bg-[#141820]">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              웹 문의 폼이 아직 연결되어 있지 않습니다. 위 <span className="font-medium">연락·문의 안내</span>의 전화·이메일로
              문의해 주세요.
            </p>
          </section>
        )}

        {/* 짧은 안내 FAQ */}
        <section
          className="rounded-2xl border border-slate-200/90 bg-white p-5 dark:border-slate-700 dark:bg-[#141820]"
          aria-labelledby="portal-faq-heading"
        >
          <h2 id="portal-faq-heading" className="flex items-center gap-2 text-sm font-semibold text-[#0f172a] dark:text-white">
            <HelpCircle className="size-4 text-slate-500" aria-hidden />
            자주 묻는 안내
          </h2>
          <ul className="mt-4 space-y-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            <li>
              <p className="font-medium text-slate-800 dark:text-slate-100">문서는 어떻게 보나요?</p>
              <p className="mt-0.5">
                각 카드의 <span className="font-medium">견적 보기</span>·<span className="font-medium">청구 보기</span>를 누르면
                브라우저에서 바로 열립니다. 링크가 없는 경우에는 담당자에게 문의해 주세요.
              </p>
            </li>
            <li>
              <p className="font-medium text-slate-800 dark:text-slate-100">입금·기한 문의는 어디로 하나요?</p>
              <p className="mt-0.5">청구 카드의 계좌·기한을 먼저 확인하시고, 변경이 필요하면 연락처 또는 문의 남기기로 알려 주세요.</p>
            </li>
            <li>
              <p className="font-medium text-slate-800 dark:text-slate-100">답변은 언제 오나요?</p>
              <p className="mt-0.5">평일 업무 시간에 순차적으로 확인합니다. 급한 일은 전화로 연락 주시는 것이 가장 빠릅니다.</p>
            </li>
          </ul>
        </section>

        <p className="mt-10 text-center text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
          이 페이지는 거래 안내를 위해 발급된 링크입니다.
        </p>
      </div>
    </div>
  )
}
