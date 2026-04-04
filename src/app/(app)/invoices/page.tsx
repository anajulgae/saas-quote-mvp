import { InvoicesWorkspace } from "@/components/app/invoices-board"
import { getInvoicesPageData } from "@/lib/data"

export default async function InvoicesPage() {
  const { invoices, customers, quotes, defaultReminderMessage } =
    await getInvoicesPageData()

  return (
    <InvoicesWorkspace
      invoices={invoices}
      customers={customers}
      quotes={quotes}
      defaultReminderMessage={defaultReminderMessage}
    />
  )
}
