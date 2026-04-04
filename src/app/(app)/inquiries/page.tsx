import { InquiriesBoard } from "@/components/app/inquiries-board"
import { getInquiriesPageData } from "@/lib/data"

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; new?: string }>
}) {
  const sp = await searchParams
  const { inquiries, customers, stageSummary } = await getInquiriesPageData()

  const initialCreateOpen = sp.new === "1" || sp.new === "true"

  return (
    <InquiriesBoard
      inquiries={inquiries}
      customers={customers}
      stageSummary={stageSummary}
      initialCustomerId={sp.customer}
      initialCreateOpen={initialCreateOpen}
    />
  )
}
