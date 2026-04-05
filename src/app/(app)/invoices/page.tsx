import { InvoicesWorkspace } from "@/components/app/invoices-board"
import { getInvoicesPageData } from "@/lib/data"

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ quote?: string; new?: string; customer?: string }>
}) {
  const sp = await searchParams
  const {
    invoices,
    customers,
    quotes,
    defaultReminderMessage,
    invoiceActivityByInvoiceId,
    businessName,
    bankAccount,
    paymentTerms,
  } = await getInvoicesPageData()

  const deepLinkOpenCreate = sp.new === "1" || sp.new === "true"
  const quoteDeepLink = Boolean(sp.quote?.trim() && deepLinkOpenCreate)

  return (
    <InvoicesWorkspace
      invoices={invoices}
      customers={customers}
      quotes={quotes}
      defaultReminderMessage={defaultReminderMessage}
      invoiceActivityByInvoiceId={invoiceActivityByInvoiceId}
      businessName={businessName}
      bankAccount={bankAccount}
      paymentTerms={paymentTerms}
      deepLinkQuoteId={sp.quote}
      deepLinkOpenCreate={deepLinkOpenCreate}
      initialCustomerFilterId={quoteDeepLink ? undefined : sp.customer}
    />
  )
}
