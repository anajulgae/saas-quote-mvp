import type { Metadata } from "next"

import { AnalyticsReportView } from "@/components/analytics/analytics-report"
import { PageHeader } from "@/components/app/page-header"
import { getAnalyticsReportForCurrentUser } from "@/lib/analytics"

export const metadata: Metadata = {
  title: "Analytics",
  description: "Track inquiry-to-cash performance, collection risk, AI usage, and delivery activity.",
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  const sp = await searchParams
  const report = await getAnalyticsReportForCurrentUser(sp)

  if (!report) {
    return null
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="See operational health across inquiry, quote, invoice, collection, AI, and document delivery from one place."
      />
      <AnalyticsReportView report={report} />
    </div>
  )
}
