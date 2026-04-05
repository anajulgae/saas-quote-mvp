import { formatCurrency, formatDate } from "@/lib/format"
import { customerPrimaryLabel } from "@/lib/quote-utils"
import { cn } from "@/lib/utils"
import type { Customer, QuoteItem, QuoteStatus } from "@/types/domain"

export type QuoteDocumentIssuer = {
  businessName: string
  ownerName: string
  /** 비어 있으면 견적서에 줄 생략 */
  businessRegistrationNumber?: string
  email: string
  phone: string
  paymentTerms: string
  bankAccount: string
  sealImageUrl?: string
  sealEnabled: boolean
}

export type QuoteDocumentQuote = {
  quoteNumber: string
  title: string
  summary: string
  status: QuoteStatus
  subtotal: number
  tax: number
  total: number
  validUntil?: string
  sentAt?: string
  createdAt: string
  items: QuoteItem[]
}

function statusLineForDocument(status: QuoteStatus, variant: "internal" | "customer"): string | null {
  if (variant === "customer") {
    if (status === "draft") {
      return null
    }
    if (status === "sent") {
      return "발송된 견적 안내"
    }
    if (status === "approved") {
      return "승인된 견적"
    }
    if (status === "rejected") {
      return "검토 종료(미진행)"
    }
    if (status === "expired") {
      return "유효기한 경과"
    }
  }
  if (variant === "internal" && status === "draft") {
    return "내부 초안"
  }
  return null
}

export function QuoteDocument({
  quote,
  customer,
  issuer,
  variant,
}: {
  quote: QuoteDocumentQuote
  customer?: Customer
  issuer: QuoteDocumentIssuer
  variant: "internal" | "customer"
}) {
  const primary = customerPrimaryLabel(customer)
  const showDraftBanner = variant === "internal" && quote.status === "draft"
  const statusLine = statusLineForDocument(quote.status, variant)
  const showSeal = Boolean(issuer.sealEnabled && issuer.sealImageUrl?.trim())
  const regNo = issuer.businessRegistrationNumber?.trim()

  return (
    <article
      className={cn(
        "quote-document text-[13px] leading-relaxed text-neutral-800",
        "print:text-black print:leading-normal"
      )}
    >
      {showDraftBanner ? (
        <div
          className={cn(
            "mb-6 rounded border border-amber-600/40 bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-950",
            "print:border print:bg-amber-50/90"
          )}
        >
          내부 검토용 문서입니다. 고객에게 보내기 전에 내용을 확인해 주세요.
        </div>
      ) : null}

      {/* 문서 헤더 */}
      <header className="border-b-2 border-neutral-900 pb-5 print:border-black">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-neutral-500 print:text-neutral-600">
              BILL-IO
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900 print:text-[22pt]">
              견적서
            </h1>
            <p className="mt-2 font-mono text-sm font-semibold tabular-nums text-neutral-700">
              {quote.quoteNumber}
            </p>
            <p className="mt-1 text-xs text-neutral-500">작성일 {formatDate(quote.createdAt)}</p>
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

      {/* 발신 / 수신 */}
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

      {/* 견적 제목 + 메타 */}
      <section className="mt-8 print:mt-6">
        <h2 className="text-lg font-bold text-neutral-900 print:text-[14pt]">{quote.title}</h2>
        <dl className="mt-4 grid gap-2 border border-neutral-200 bg-neutral-50/80 sm:grid-cols-3 print:border-neutral-300 print:bg-white">
          <div className="border-b border-neutral-200 px-3 py-2.5 sm:border-b-0 sm:border-r print:border-neutral-300">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">유효기한</dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-neutral-900">
              {formatDate(quote.validUntil)}
            </dd>
          </div>
          <div className="border-b border-neutral-200 px-3 py-2.5 sm:border-b-0 sm:border-r print:border-neutral-300">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">작성일</dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-neutral-900">
              {formatDate(quote.createdAt)}
            </dd>
          </div>
          <div className="px-3 py-2.5">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">발송일</dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-neutral-900">
              {quote.sentAt ? formatDate(quote.sentAt) : "—"}
            </dd>
          </div>
        </dl>
        {statusLine ? (
          <p className="mt-2 text-xs text-neutral-600">
            문서 참고: <span className="font-medium text-neutral-800">{statusLine}</span>
          </p>
        ) : null}
      </section>

      {quote.summary?.trim() ? (
        <section className="mt-8 print:mt-6">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">견적 개요</p>
          <p className="mt-2 whitespace-pre-wrap text-neutral-800">{quote.summary.trim()}</p>
        </section>
      ) : null}

      {/* 항목 표 */}
      <section className="mt-8 print:mt-6">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">견적 항목</p>
        <div className="mt-2 overflow-x-auto print:overflow-visible">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-y border-neutral-900 bg-neutral-100 print:border-black print:bg-neutral-100">
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-neutral-600">
                  항목
                </th>
                <th className="w-14 px-2 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-neutral-600">
                  수량
                </th>
                <th className="w-28 px-2 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-neutral-600">
                  단가
                </th>
                <th className="w-32 px-2 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-neutral-600">
                  금액
                </th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item) => (
                <tr key={item.id} className="border-b border-neutral-200 print:border-neutral-300">
                  <td className="px-2 py-3 align-top">
                    <span className="font-medium text-neutral-900">{item.name}</span>
                    {item.description?.trim() ? (
                      <p className="mt-1 text-xs text-neutral-600 whitespace-pre-wrap">{item.description.trim()}</p>
                    ) : null}
                  </td>
                  <td className="px-2 py-3 text-right tabular-nums align-top text-neutral-800">
                    {item.quantity}
                  </td>
                  <td className="px-2 py-3 text-right tabular-nums align-top text-neutral-800">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="px-2 py-3 text-right font-medium tabular-nums align-top text-neutral-900">
                    {formatCurrency(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 합계 */}
      <section className="mt-8 flex justify-end print:mt-6 print:break-inside-avoid">
        <div className="w-full max-w-sm border-t-2 border-neutral-900 pt-4 print:border-black">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-6 tabular-nums text-neutral-700">
              <span>공급가액</span>
              <span>{formatCurrency(quote.subtotal)}</span>
            </div>
            <div className="flex justify-between gap-6 tabular-nums text-neutral-700">
              <span>부가세 (10%)</span>
              <span>{formatCurrency(quote.tax)}</span>
            </div>
            <div className="flex justify-between gap-6 border-t border-neutral-300 pt-3 text-base font-bold tabular-nums text-neutral-900 print:pt-2">
              <span>합계 (원화)</span>
              <span>{formatCurrency(quote.total)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 결제 안내 */}
      <section className="mt-10 border-t border-neutral-200 pt-8 text-sm print:mt-8 print:pt-6 print:break-inside-avoid print:border-neutral-300">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">결제·입금 안내</p>
        <div className="mt-3 space-y-3 text-neutral-800">
          {issuer.paymentTerms?.trim() ? (
            <div>
              <p className="text-xs font-semibold text-neutral-700">결제 조건</p>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">{issuer.paymentTerms.trim()}</p>
            </div>
          ) : (
            <p className="text-neutral-600">
              선금·잔금 비율 및 납기는 계약 시 협의 가능합니다. 자세한 조건은 담당자에게 문의해 주세요.
            </p>
          )}
          {issuer.bankAccount?.trim() ? (
            <div>
              <p className="text-xs font-semibold text-neutral-700">입금 계좌</p>
              <p className="mt-1 whitespace-pre-wrap font-mono text-sm tabular-nums leading-relaxed">
                {issuer.bankAccount.trim()}
              </p>
            </div>
          ) : null}
          <p className="text-xs text-neutral-600">
            작업 일정·납기는 확정 계약서 또는 별도 합의에 따릅니다. 결제 전 견적 내용을 반드시 확인해 주시기 바랍니다.
          </p>
        </div>
      </section>

      {/* 서명·직인 */}
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

      {/* 하단 안내 */}
      <footer className="mt-10 border-t border-dashed border-neutral-300 pt-5 text-[11px] leading-relaxed text-neutral-500 print:mt-8 print:pt-4 print:text-[9pt]">
        <ul className="list-inside list-disc space-y-1">
          <li>본 견적의 유효기한이 지난 후에는 금액·일정이 변동될 수 있으니 재확인이 필요합니다.</li>
          <li>결제 및 착수는 별도 합의 또는 계약에 따릅니다.</li>
          <li>문의는 상단 연락처로 부탁드립니다. 검토해 주셔서 감사합니다.</li>
        </ul>
        <p className="mt-4 text-center text-neutral-400">— Bill-IO 견적서 —</p>
      </footer>
    </article>
  )
}
