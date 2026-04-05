import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { QuoteDocument } from "@/components/app/quote-document"
import { fetchQuoteSharePayloadByToken } from "@/lib/quote-share"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const data = await fetchQuoteSharePayloadByToken(token)
  if (!data) {
    return { title: "견적서" }
  }
  return {
    title: `${data.quote.quoteNumber} · 견적서`,
    robots: { index: false, follow: false },
  }
}

export default async function PublicQuoteViewPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const data = await fetchQuoteSharePayloadByToken(token)

  if (!data) {
    notFound()
  }

  const { quote, customer, issuer } = data
  const { id: _id, ...docQuote } = quote

  return (
    <div className="min-h-screen bg-neutral-100 py-8 text-neutral-900 print:bg-white print:py-0">
      <div className="mx-auto max-w-[210mm] px-4 print:max-w-none print:px-[12mm] print:py-[10mm]">
        <QuoteDocument quote={docQuote} customer={customer} issuer={issuer} variant="customer" />
      </div>
    </div>
  )
}
