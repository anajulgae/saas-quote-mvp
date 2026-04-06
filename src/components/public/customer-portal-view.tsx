import Link from "next/link"
import { FileText, Mail, MessageCircle, Phone, Receipt } from "lucide-react"

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

function statusLabelQuote(status: string) {
  const m: Record<string, string> = {
    draft: "작성 중",
    sent: "발송됨",
    approved: "승인",
    rejected: "거절",
    expired: "만료",
  }
  return m[status] ?? status
}

function statusLabelInvoice(status: string) {
  const m: Record<string, string> = {
    pending: "입금 대기",
    deposit_paid: "선금 입금",
    partially_paid: "부분 입금",
    paid: "입금 완료",
    overdue: "연체",
  }
  return m[status] ?? status
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

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white text-slate-900 dark:from-slate-950 dark:to-slate-900 dark:text-slate-50">
      <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
        <header className="mb-8 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            거래 안내
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
            {payload.businessName.trim() || "거래처 안내"}
          </h1>
          {payload.ownerName.trim() ? (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">담당 {payload.ownerName}</p>
          ) : null}
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            {payload.customerName.trim()}님, 아래에서 견적·청구를 한곳에서 확인하실 수 있습니다.
          </p>
        </header>

        <section className="mb-6 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            문의처
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {payload.contactPhone.trim() ? (
              <li className="flex items-center gap-2">
                <Phone className="size-4 shrink-0 text-slate-400" aria-hidden />
                <a className="font-medium underline-offset-4 hover:underline" href={`tel:${payload.contactPhone}`}>
                  {payload.contactPhone}
                </a>
              </li>
            ) : null}
            {payload.contactEmail.trim() ? (
              <li className="flex items-center gap-2">
                <Mail className="size-4 shrink-0 text-slate-400" aria-hidden />
                <a
                  className="font-medium break-all underline-offset-4 hover:underline"
                  href={`mailto:${payload.contactEmail}`}
                >
                  {payload.contactEmail}
                </a>
              </li>
            ) : null}
            {!payload.contactPhone.trim() && !payload.contactEmail.trim() ? (
              <li className="text-slate-500">등록된 직접 연락처가 없습니다.</li>
            ) : null}
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <FileText className="size-4" aria-hidden />
            최근 견적
          </h2>
          {payload.quotes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700">
              표시할 견적이 없습니다.
            </p>
          ) : (
            <ul className="space-y-3">
              {payload.quotes.map((q) => (
                <li
                  key={q.id}
                  className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-[11px] text-slate-500">{q.quoteNumber}</p>
                      <p className="font-medium">{q.title || "견적"}</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        q.status === "approved"
                          ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                          : "bg-slate-500/10 text-slate-600 dark:text-slate-300"
                      )}
                    >
                      {statusLabelQuote(q.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-lg font-semibold tabular-nums">{formatCurrency(q.total)}</p>
                  {q.validUntil ? (
                    <p className="mt-1 text-xs text-slate-500">유효 {formatDate(q.validUntil)}</p>
                  ) : null}
                  {q.publicToken ? (
                    <Link
                      href={`/quote-view/${encodeURIComponent(q.publicToken)}`}
                      className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
                    >
                      견적서 열기
                    </Link>
                  ) : (
                    <p className="mt-2 text-xs text-amber-700 dark:text-amber-200">
                      공개 링크가 아직 없습니다. 업체에 문의해 주세요.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <Receipt className="size-4" aria-hidden />
            최근 청구
          </h2>
          {payload.invoices.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700">
              표시할 청구가 없습니다.
            </p>
          ) : (
            <ul className="space-y-3">
              {payload.invoices.map((inv) => (
                <li
                  key={inv.id}
                  className={cn(
                    "rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-900/60",
                    inv.paymentStatus === "overdue"
                      ? "border-amber-400/60 dark:border-amber-600/50"
                      : "border-slate-200/90 dark:border-slate-700"
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-[11px] text-slate-500">{inv.invoiceNumber}</p>
                      <p className="text-xs text-slate-500">{inv.invoiceType}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-200">
                      {statusLabelInvoice(inv.paymentStatus)}
                    </span>
                  </div>
                  <p className="mt-2 text-lg font-semibold tabular-nums">{formatCurrency(inv.amount)}</p>
                  {inv.dueDate ? (
                    <p className="mt-1 text-xs text-slate-500">입금 기한 {formatDate(inv.dueDate)}</p>
                  ) : null}
                  {payload.bankAccount.trim() ? (
                    <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-xs leading-relaxed dark:bg-slate-800/80">
                      {payload.bankAccount}
                    </p>
                  ) : null}
                  {payload.paymentTerms.trim() ? (
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{payload.paymentTerms}</p>
                  ) : null}
                  {inv.publicToken ? (
                    <Link
                      href={`/invoice-view/${encodeURIComponent(inv.publicToken)}`}
                      className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
                    >
                      청구서 열기
                    </Link>
                  ) : (
                    <p className="mt-2 text-xs text-amber-700 dark:text-amber-200">
                      공개 링크가 아직 없습니다.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {inquiryHref ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center dark:border-slate-700 dark:bg-slate-900/60">
            <MessageCircle className="mx-auto size-8 text-slate-400" aria-hidden />
            <p className="mt-2 text-sm font-medium">추가 문의가 있으신가요?</p>
            <Link
              href={inquiryHref}
              className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-slate-300 py-2.5 text-sm font-medium dark:border-slate-600"
            >
              문의 남기기
            </Link>
          </div>
        ) : null}

        <p className="mt-10 text-center text-[10px] text-slate-400">
          본 페이지는 거래 안내용 링크입니다. 로그인이 필요하지 않습니다.
        </p>
      </div>
    </div>
  )
}
