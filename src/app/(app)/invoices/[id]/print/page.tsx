import { notFound } from "next/navigation"

import { InvoiceDocument } from "@/components/app/invoice-document"
import { InvoicePrintToolbar } from "@/components/app/invoice-print-toolbar"
import { getInvoicePrintPageData } from "@/lib/data"
import { cn } from "@/lib/utils"

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getInvoicePrintPageData(id)
  if (!data) {
    notFound()
  }

  const { invoice, customer, issuer, linkedQuote, hideWatermark } = data

  return (
    <div
      className={cn(
        "invoice-document-print-root min-h-screen bg-neutral-50 text-neutral-900",
        "print:min-h-0 print:bg-white"
      )}
    >
      <InvoicePrintToolbar invoiceId={id} />
      <div
        className={cn(
          "invoice-document-print-wrap mx-auto max-w-[210mm] px-6 py-10",
          "print:max-w-none print:px-[12mm] print:py-[10mm]"
        )}
      >
        <InvoiceDocument
          invoice={{
            invoiceNumber: invoice.invoiceNumber,
            invoiceType: invoice.invoiceType,
            amount: invoice.amount,
            paymentStatus: invoice.paymentStatus,
            dueDate: invoice.dueDate,
            requestedAt: invoice.requestedAt,
            paidAt: invoice.paidAt,
            notes: invoice.notes ?? "",
            createdAt: invoice.createdAt ?? invoice.requestedAt ?? "",
          }}
          customer={customer}
          issuer={issuer}
          linkedQuote={linkedQuote}
          variant="internal"
          hideWatermark={hideWatermark}
        />
      </div>
    </div>
  )
}
