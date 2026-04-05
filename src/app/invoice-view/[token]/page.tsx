import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { InvoiceDocument } from "@/components/app/invoice-document"
import { PublicInvoiceShareOpenTracker } from "@/components/app/public-share-open-tracker"
import { fetchInvoiceSharePayloadByToken } from "@/lib/invoice-share"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const data = await fetchInvoiceSharePayloadByToken(token)
  if (!data) {
    return { title: "청구서" }
  }
  return {
    title: `${data.invoice.invoiceNumber} · 청구서`,
    robots: { index: false, follow: false },
  }
}

export default async function PublicInvoiceViewPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const data = await fetchInvoiceSharePayloadByToken(token)

  if (!data) {
    notFound()
  }

  const { invoice, customer, issuer, linkedQuote } = data
  const { id: _id, ...docInvoice } = invoice

  return (
    <div className="min-h-screen bg-neutral-100 py-8 text-neutral-900 print:bg-white print:py-0">
      <PublicInvoiceShareOpenTracker token={token} />
      <div className="mx-auto max-w-[210mm] px-4 print:max-w-none print:px-[12mm] print:py-[10mm]">
        <InvoiceDocument
          invoice={docInvoice}
          customer={customer}
          issuer={issuer}
          linkedQuote={linkedQuote}
          variant="customer"
        />
      </div>
    </div>
  )
}
