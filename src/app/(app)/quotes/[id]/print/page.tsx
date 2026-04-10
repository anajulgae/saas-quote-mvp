import { notFound } from "next/navigation"

import { QuoteDocument } from "@/components/app/quote-document"
import { QuotePrintToolbar } from "@/components/app/quote-print-toolbar"
import { getQuotePrintPageData } from "@/lib/data"
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

  return (
    <div
      className={cn(
        "quote-document-print-root min-h-screen bg-neutral-50 text-neutral-900",
        "print:min-h-0 print:bg-white"
      )}
    >
      <QuotePrintToolbar quoteId={id} />
      <div
        className={cn(
          "quote-document-print-wrap mx-auto max-w-[210mm] px-6 py-10",
          "print:max-w-none print:px-[12mm] print:py-[10mm]"
        )}
      >
        <QuoteDocument
          quote={{
            quoteNumber: quote.quoteNumber,
            title: quote.title,
            summary: quote.summary,
            status: quote.status,
            subtotal: quote.subtotal,
            tax: quote.tax,
            total: quote.total,
            validUntil: quote.validUntil,
            sentAt: quote.sentAt,
            createdAt: quote.createdAt,
            items: quote.items,
          }}
          customer={customer}
          issuer={issuer}
          variant="internal"
        />
      </div>
    </div>
  )
}
