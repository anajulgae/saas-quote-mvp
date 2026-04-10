import { NextResponse } from "next/server"

import { buildAnalyticsCsv, getAnalyticsReportForCurrentUser } from "@/lib/analytics"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const report = await getAnalyticsReportForCurrentUser({
    range: url.searchParams.get("range") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  })

  if (!report) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  if (!report.gates.export) {
    return NextResponse.json({ error: "CSV export is available on the Business plan." }, { status: 403 })
  }

  const csv = buildAnalyticsCsv(report)
  const filename = `bill-io-analytics-${report.range.startDate}-${report.range.endDate}.csv`

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  })
}
