import { Suspense } from "react"

import { InquiriesBoard } from "@/components/app/inquiries-board"
import { getInquiriesPageData } from "@/lib/data"
import { getSiteOrigin } from "@/lib/site-url"

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; new?: string }>
}) {
  const sp = await searchParams
  const { inquiries, customers, stageSummary, publicInquiryForm, isDemoWorkspace } =
    await getInquiriesPageData()

  const initialCreateOpen = sp.new === "1" || sp.new === "true"

  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-muted-foreground">불러오는 중…</div>}>
      <InquiriesBoard
        inquiries={inquiries}
        customers={customers}
        stageSummary={stageSummary}
        initialCustomerId={sp.customer}
        initialCreateOpen={initialCreateOpen}
        publicInquiryForm={publicInquiryForm}
        siteOrigin={getSiteOrigin()}
        isDemoWorkspace={isDemoWorkspace}
      />
    </Suspense>
  )
}
