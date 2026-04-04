import { notFound } from "next/navigation"

import { QuotePrintToolbar } from "@/components/app/quote-print-toolbar"
import { quoteStatusOptions } from "@/lib/constants"
import { getQuotePrintPageData } from "@/lib/data"
import { formatCurrency, formatDate } from "@/lib/format"
import { customerPrimaryLabel } from "@/lib/quote-utils"
import { cn } from "@/lib/utils"

export default async function QuotePrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getQuotePrintPageData(id)
  if (!data) {
    notFound()
  }

  const { quote, issuer } = data
  const customer = quote.customer
  const statusLabel =
    quoteStatusOptions.find((o) => o.value === quote.status)?.label ?? quote.status

  return (
    <div className="min-h-screen bg-background text-foreground">
      <QuotePrintToolbar />
      <div
        className={cn(
          "mx-auto max-w-3xl px-6 py-10 text-sm leading-relaxed",
          "print:max-w-none print:px-8 print:py-6"
        )}
      >
        <header className="border-b border-border pb-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                견적서
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">{quote.title}</h1>
              <p className="mt-2 text-muted-foreground">견적 번호 {quote.quoteNumber}</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold">{issuer.businessName || "사업장명 미등록"}</p>
              {issuer.ownerName ? <p className="text-muted-foreground">{issuer.ownerName}</p> : null}
              {issuer.phone ? <p className="text-muted-foreground">{issuer.phone}</p> : null}
              {issuer.email ? <p className="text-muted-foreground">{issuer.email}</p> : null}
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              수신
            </p>
            <p className="mt-2 text-lg font-semibold">{customerPrimaryLabel(customer)}</p>
            {customer?.name && customer?.companyName ? (
              <p className="text-muted-foreground">{customer.name}</p>
            ) : null}
            {customer?.email ? <p className="text-muted-foreground">{customer.email}</p> : null}
            {customer?.phone ? <p className="text-muted-foreground">{customer.phone}</p> : null}
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-4 border-b border-border/60 py-1">
              <span className="text-muted-foreground">상태</span>
              <span className="font-medium">{statusLabel}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-border/60 py-1">
              <span className="text-muted-foreground">작성일</span>
              <span className="font-medium tabular-nums">{formatDate(quote.createdAt)}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-border/60 py-1">
              <span className="text-muted-foreground">유효기한</span>
              <span className="font-medium tabular-nums">{formatDate(quote.validUntil)}</span>
            </div>
            {quote.sentAt ? (
              <div className="flex justify-between gap-4 border-b border-border/60 py-1">
                <span className="text-muted-foreground">발송일</span>
                <span className="font-medium tabular-nums">{formatDate(quote.sentAt)}</span>
              </div>
            ) : null}
          </div>
        </section>

        {quote.summary?.trim() ? (
          <section className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              개요
            </p>
            <p className="mt-2 whitespace-pre-wrap text-foreground/90">{quote.summary.trim()}</p>
          </section>
        ) : null}

        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            견적 항목
          </p>
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-2 font-medium">항목</th>
                <th className="w-16 py-2 text-right font-medium">수량</th>
                <th className="w-28 py-2 text-right font-medium">단가</th>
                <th className="w-32 py-2 text-right font-medium">금액</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item) => (
                <tr key={item.id} className="border-b border-border/60">
                  <td className="py-2.5 pr-2 align-top">
                    <span className="font-medium">{item.name}</span>
                    {item.description?.trim() ? (
                      <p className="mt-0.5 text-xs text-muted-foreground whitespace-pre-wrap">
                        {item.description.trim()}
                      </p>
                    ) : null}
                  </td>
                  <td className="py-2.5 text-right tabular-nums align-top">{item.quantity}</td>
                  <td className="py-2.5 text-right tabular-nums align-top">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="py-2.5 text-right font-medium tabular-nums align-top">
                    {formatCurrency(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-8 flex justify-end">
          <div className="w-full max-w-xs space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between gap-4 tabular-nums">
              <span className="text-muted-foreground">공급가 합계</span>
              <span>{formatCurrency(quote.subtotal)}</span>
            </div>
            <div className="flex justify-between gap-4 tabular-nums">
              <span className="text-muted-foreground">부가세</span>
              <span>{formatCurrency(quote.tax)}</span>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-2 text-base font-bold tabular-nums">
              <span>총액</span>
              <span>{formatCurrency(quote.total)}</span>
            </div>
          </div>
        </section>

        {issuer.paymentTerms?.trim() || issuer.bankAccount?.trim() ? (
          <section className="mt-10 border-t border-border pt-6 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              결제·입금 안내
            </p>
            {issuer.paymentTerms?.trim() ? (
              <p className="mt-2 whitespace-pre-wrap text-foreground/90">{issuer.paymentTerms}</p>
            ) : null}
            {issuer.bankAccount?.trim() ? (
              <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{issuer.bankAccount}</p>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  )
}
