import { QuotesWorkspace } from "@/components/app/quotes-board"
import { getQuotesPageData } from "@/lib/data"

export default async function QuotesPage() {
  const { quotes, customers, inquiries, defaultQuoteSummary } =
    await getQuotesPageData()

  return (
    <QuotesWorkspace
      quotes={quotes}
      customers={customers}
      inquiries={inquiries}
      defaultQuoteSummary={defaultQuoteSummary}
    />
  )
}
