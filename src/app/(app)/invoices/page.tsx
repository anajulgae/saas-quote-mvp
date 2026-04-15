import { InvoicesWorkspace } from "@/components/app/invoices-board"
import { getInvoicesPageData } from "@/lib/data"
import type { TaxInvoiceListFilter } from "@/lib/tax-invoice/list-ui"

function parseTaxInvoiceQuery(raw: string | undefined): TaxInvoiceListFilter | undefined {
  if (raw === "need" || raw === "failed" || raw === "issued" || raw === "target") {
    return raw
  }
  return undefined
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ quote?: string; new?: string; customer?: string; tax?: string }>
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
    currentPlan,
    businessSettingsSnapshot,
    kakaoByoaConfigured,
  } = await getInvoicesPageData()

  const deepLinkOpenCreate = sp.new === "1" || sp.new === "true"
  const quoteDeepLink = Boolean(sp.quote?.trim() && deepLinkOpenCreate)
  const initialTaxInvoiceFilter = parseTaxInvoiceQuery(sp.tax?.trim())

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
      currentPlan={currentPlan}
      kakaoByoaConfigured={kakaoByoaConfigured}
      businessSettingsSnapshot={businessSettingsSnapshot}
      deepLinkQuoteId={sp.quote}
      deepLinkOpenCreate={deepLinkOpenCreate}
      initialCustomerFilterId={quoteDeepLink ? undefined : sp.customer}
      initialTaxInvoiceFilter={initialTaxInvoiceFilter}
    />
  )
}
