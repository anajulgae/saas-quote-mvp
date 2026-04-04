import { InvoicesBoard } from "@/components/app/invoices-board"
import { PageHeader } from "@/components/app/page-header"
import { getInvoicesPageData } from "@/lib/data"

export default async function InvoicesPage() {
  const { invoices, customers, quotes, defaultReminderMessage } =
    await getInvoicesPageData()

  return (
    <div className="space-y-6">
      <PageHeader
        title="청구 및 수금"
        description="선금/잔금 요청, 결제 상태, 미수 리마인드 이력을 추적합니다."
      />

      <InvoicesBoard
        invoices={invoices}
        customers={customers}
        quotes={quotes}
        defaultReminderMessage={defaultReminderMessage}
      />
    </div>
  )
}
