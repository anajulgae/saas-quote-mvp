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
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  if (!report.gates.export) {
    return NextResponse.json({ error: "CSV 보내기는 Business 플랜에서 사용할 수 있습니다." }, { status: 403 })
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
