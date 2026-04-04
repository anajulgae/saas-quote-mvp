import { InquiriesBoard } from "@/components/app/inquiries-board"
import { getInquiriesPageData } from "@/lib/data"

export default async function InquiriesPage() {
  const { inquiries, customers, stageSummary } = await getInquiriesPageData()

  return (
    <InquiriesBoard inquiries={inquiries} customers={customers} stageSummary={stageSummary} />
  )
}
