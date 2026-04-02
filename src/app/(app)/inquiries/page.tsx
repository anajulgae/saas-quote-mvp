import { PageHeader } from "@/components/app/page-header"
import { InquiriesBoard } from "@/components/app/inquiries-board"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { demoInquiries } from "@/lib/demo-data"

export default function InquiriesPage() {
  const stageSummary = {
    new: demoInquiries.filter((item) => item.stage === "new").length,
    qualified: demoInquiries.filter((item) => item.stage === "qualified").length,
    quoted: demoInquiries.filter((item) => item.stage === "quoted").length,
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="문의 관리"
        description="고객 문의를 등록하고, 후속 일정과 예상 매출을 함께 관리합니다."
        action={<Button variant="outline">CSV 가져오기 예정</Button>}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">신규 문의</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stageSummary.new}건</CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">검토 중</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {stageSummary.qualified}건
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">견적 발송 단계</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stageSummary.quoted}건</CardContent>
        </Card>
      </section>

      <InquiriesBoard initialInquiries={demoInquiries} />
    </div>
  )
}
