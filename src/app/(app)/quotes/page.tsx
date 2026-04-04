import { PageHeader } from "@/components/app/page-header"
import { QuotesBoard } from "@/components/app/quotes-board"
import { QuoteDraftAssistant } from "@/components/app/quote-draft-assistant"
import { getQuotesPageData } from "@/lib/data"

export default async function QuotesPage() {
  const { quotes, customers, inquiries, defaultQuoteSummary } =
    await getQuotesPageData()

  return (
    <div className="space-y-6">
      <PageHeader
        title="견적 관리"
        description="견적 초안 생성, 상태 추적, 항목 구성을 한 화면에서 관리합니다."
      />

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <QuotesBoard
          quotes={quotes}
          customers={customers}
          inquiries={inquiries}
          defaultQuoteSummary={defaultQuoteSummary}
        />

        <QuoteDraftAssistant />
      </section>
    </div>
  )
}
