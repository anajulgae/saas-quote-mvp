import { QuotesWorkspace } from "@/components/app/quotes-board"
import { getQuotesPageData } from "@/lib/data"

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; new?: string }>
}) {
  const sp = await searchParams
  const {
    quotes,
    customers,
    inquiries,
    defaultQuoteSummary,
    defaultPaymentTerms,
    defaultBusinessName,
    nextQuoteNumberPreview,
    quoteActivityByQuoteId,
    invoicesByQuoteId,
    currentPlan,
  } = await getQuotesPageData()

  const initialCreateOpen = sp.new === "1" || sp.new === "true"

  return (
    <QuotesWorkspace
      quotes={quotes}
      customers={customers}
      inquiries={inquiries}
      defaultQuoteSummary={defaultQuoteSummary}
      defaultPaymentTerms={defaultPaymentTerms}
      defaultBusinessName={defaultBusinessName}
      nextQuoteNumberPreview={nextQuoteNumberPreview}
      quoteActivityByQuoteId={quoteActivityByQuoteId}
      invoicesByQuoteId={invoicesByQuoteId}
      currentPlan={currentPlan}
      deepLinkCustomerId={sp.customer}
      deepLinkOpenCreate={initialCreateOpen}
    />
  )
}
