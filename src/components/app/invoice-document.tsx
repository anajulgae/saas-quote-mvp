import { OpsStatusChip } from "@/components/app/ops-status-chip"
import { formatCurrency, formatDate } from "@/lib/format"
import { paymentStatusDocumentLine } from "@/lib/ops-status-meta"
import { customerPrimaryLabel } from "@/lib/quote-utils"
import { cn } from "@/lib/utils"
import type { Customer, InvoiceType, PaymentStatus } from "@/types/domain"

import type { QuoteDocumentIssuer } from "@/components/app/quote-document"

export type InvoiceDocumentInvoice = {
  invoiceNumber: string
  invoiceType: InvoiceType
  amount: number
  paymentStatus: PaymentStatus
  dueDate?: string
  requestedAt?: string
  paidAt?: string
  notes: string
  createdAt: string
}

function invoiceTypeLabel(t: InvoiceType): string {
  if (t === "deposit") {
    return "선금"
  }
  if (t === "balance") {
    return "잔금"
  }
  return "청구(최종)"
}

export function InvoiceDocument({
  invoice,
  customer,
  issuer,
  linkedQuote,
  variant,
}: {
  invoice: InvoiceDocumentInvoice
  customer?: Customer
  issuer: QuoteDocumentIssuer
  linkedQuote?: { quoteNumber: string; title: string }
  variant: "internal" | "customer"
}) {
  const primary = customerPrimaryLabel(customer)
  const showSeal = Boolean(issuer.sealEnabled && issuer.sealImageUrl?.trim())
  const regNo = issuer.businessRegistrationNumber?.trim()
  const statusLine = paymentStatusDocumentLine(invoice.paymentStatus)

  return (
    <article
      className={cn(
        "invoice-document text-[13px] leading-relaxed text-neutral-800",
        "print:text-black print:leading-normal"
      )}
    >
      <header className="border-b-2 border-neutral-900 pb-5 print:border-black">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-neutral-500 print:text-neutral-600">
              BILL-IO
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900 print:text-[22pt]">
              청구서
            </h1>
            <p className="mt-2 font-mono text-sm font-semibold tabular-nums text-neutral-700">
              {invoice.invoiceNumber}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              발행일 {formatDate(invoice.requestedAt ?? invoice.createdAt)}
            </p>
          </div>
          <div className="shrink-0 text-right text-sm">
            <p className="text-base font-bold text-neutral-900">{issuer.businessName || "사업자명 미등록"}</p>
            {issuer.ownerName ? <p className="mt-0.5 text-neutral-700">대표 {issuer.ownerName}</p> : null}
            {regNo ? (
              <p className="mt-0.5 text-xs tabular-nums text-neutral-600">사업자등록번호 {regNo}</p>
            ) : null}
          </div>
        </div>
      </header>

      <section className="mt-8 grid gap-8 border-b border-neutral-200 pb-8 sm:grid-cols-2 print:mt-6 print:pb-6 print:border-neutral-300">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">발신</p>
          <div className="mt-2 space-y-1 text-neutral-800">
            <p className="font-semibold">{issuer.businessName || "—"}</p>
            {issuer.ownerName ? <p>담당자 {issuer.ownerName}</p> : null}
            {regNo ? <p className="tabular-nums text-neutral-700">사업자등록번호 {regNo}</p> : null}
            {issuer.email ? <p>이메일 {issuer.email}</p> : null}
            {issuer.phone ? <p className="tabular-nums">연락처 {issuer.phone}</p> : null}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">수신</p>
          <div className="mt-2 space-y-1 text-neutral-800">
            <p className="text-lg font-semibold leading-snug">{primary}</p>
            {customer?.companyName && customer?.name ? (
              <p className="text-sm text-neutral-600">담당자 {customer.name}</p>
            ) : null}
            {customer?.email ? <p className="text-sm">이메일 {customer.email}</p> : null}
            {customer?.phone ? <p className="text-sm tabular-nums">연락처 {customer.phone}</p> : null}
          </div>
        </div>
      </section>

      <section className="mt-8 print:mt-6">
        <dl className="grid gap-2 border border-neutral-200 bg-neutral-50/80 sm:grid-cols-2 lg:grid-cols-4 print:border-neutral-300 print:bg-white">
          <div className="border-b border-neutral-200 px-3 py-2.5 sm:border-r print:border-neutral-300">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">청구 유형</dt>
            <dd className="mt-0.5 font-semibold text-neutral-900">{invoiceTypeLabel(invoice.invoiceType)}</dd>
          </div>
          <div className="border-b border-neutral-200 px-3 py-2.5 sm:border-r print:border-neutral-300">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">입금 기한</dt>
            <dd
              className={cn(
                "mt-0.5 font-semibold tabular-nums text-neutral-900",
                invoice.paymentStatus === "overdue" && "text-red-800 print:text-red-900"
              )}
            >
              {formatDate(invoice.dueDate)}
            </dd>
          </div>
          <div className="border-b border-neutral-200 px-3 py-2.5 sm:border-r lg:border-b-0 print:border-neutral-300">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">입금 상태</dt>
            <dd className="mt-0.5 space-y-1.5">
              <OpsStatusChip
                domain="payment"
                status={invoice.paymentStatus}
                className="print:border-neutral-400 print:bg-neutral-100"
              />
              <p className="text-xs font-medium leading-snug text-neutral-700">{statusLine}</p>
            </dd>
          </div>
          <div className="px-3 py-2.5">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">청구 금액</dt>
            <dd className="mt-0.5 text-lg font-bold tabular-nums text-neutral-900">
              {formatCurrency(invoice.amount)}
            </dd>
          </div>
        </dl>
        {linkedQuote ? (
          <p className="mt-3 text-xs text-neutral-600">
            연결 견적:{" "}
            <span className="font-mono font-medium text-neutral-800">{linkedQuote.quoteNumber}</span>
            <span className="text-neutral-500"> · {linkedQuote.title}</span>
          </p>
        ) : null}
        {variant === "customer" ? (
          <p className="mt-2 text-xs text-neutral-600">
            본 문서는 입금 안내용이며, 실제 입금은 하단 계좌 정보를 확인해 주세요.
          </p>
        ) : null}
      </section>

      {invoice.notes?.trim() ? (
        <section className="mt-8 print:mt-6">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">비고</p>
          <p className="mt-2 whitespace-pre-wrap text-neutral-800">{invoice.notes.trim()}</p>
        </section>
      ) : null}

      <section className="mt-10 border-t border-neutral-200 pt-8 text-sm print:mt-8 print:pt-6 print:break-inside-avoid print:border-neutral-300">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">결제·입금 안내</p>
        <div className="mt-3 space-y-3 text-neutral-800">
          {issuer.paymentTerms?.trim() ? (
            <div>
              <p className="text-xs font-semibold text-neutral-700">결제 조건</p>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">{issuer.paymentTerms.trim()}</p>
            </div>
          ) : null}
          {issuer.bankAccount?.trim() ? (
            <div>
              <p className="text-xs font-semibold text-neutral-700">입금 계좌</p>
              <p className="mt-1 whitespace-pre-wrap font-mono text-sm tabular-nums leading-relaxed">
                {issuer.bankAccount.trim()}
              </p>
            </div>
          ) : (
            <p className="text-neutral-600">입금 계좌는 담당자에게 문의해 주세요.</p>
          )}
          {invoice.paidAt ? (
            <p className="text-xs text-neutral-600">입금 확인일(참고): {formatDate(invoice.paidAt)}</p>
          ) : null}
        </div>
      </section>

      <section className="mt-10 flex flex-col gap-4 border-t border-neutral-200 pt-8 sm:flex-row sm:items-end sm:justify-between print:mt-8 print:pt-6 print:break-inside-avoid print:border-neutral-300">
        <div className="text-sm text-neutral-700">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">문의</p>
          <p className="mt-2">
            {issuer.email ? <span>이메일 {issuer.email}</span> : null}
            {issuer.email && issuer.phone ? <span className="text-neutral-400"> · </span> : null}
            {issuer.phone ? <span className="tabular-nums">{issuer.phone}</span> : null}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <p className="text-xs text-neutral-600">발신 {issuer.businessName}</p>
          {showSeal ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={issuer.sealImageUrl}
              alt="직인"
              className="h-16 w-auto max-w-[120px] object-contain object-left-bottom print:h-[18mm]"
            />
          ) : (
            <div className="h-16 w-32 border-b border-neutral-400 print:h-[14mm]" aria-hidden />
          )}
        </div>
      </section>

      <footer className="mt-10 border-t border-dashed border-neutral-300 pt-5 text-[11px] leading-relaxed text-neutral-500 print:mt-8 print:pt-4 print:text-[9pt]">
        <ul className="list-inside list-disc space-y-1">
          <li>입금 후 입금자명·금액이 다를 경우 반드시 알려 주시기 바랍니다.</li>
          <li>세금계산서·현금영수증이 필요하시면 담당자에게 요청해 주세요.</li>
        </ul>
        <p className="mt-4 text-center text-neutral-400">— Bill-IO 청구서 —</p>
      </footer>
    </article>
  )
}
