import { PageHeader } from "@/components/app/page-header"
import { QuoteDraftAssistant } from "@/components/app/quote-draft-assistant"
import { QuoteStatusBadge } from "@/components/app/status-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { demoCustomers, demoQuotes, getQuoteItems } from "@/lib/demo-data"
import { formatCurrency, formatDate } from "@/lib/format"

export default function QuotesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="견적 관리"
        description="견적 초안 생성, 상태 추적, 항목 구성을 한 화면에서 관리합니다."
      />

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          {demoQuotes.map((quote) => {
            const customer = demoCustomers.find((item) => item.id === quote.customerId)
            const items = getQuoteItems(quote.id)

            return (
              <Card key={quote.id} className="border-border/70">
                <CardHeader>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <CardTitle>{quote.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {quote.quoteNumber} · {customer?.companyName ?? customer?.name}
                      </CardDescription>
                    </div>
                    <QuoteStatusBadge status={quote.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-6 text-muted-foreground">{quote.summary}</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">총액</p>
                      <p className="mt-2 text-xl font-semibold">
                        {formatCurrency(quote.total)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">발송일</p>
                      <p className="mt-2 text-xl font-semibold">
                        {formatDate(quote.sentAt)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">유효기한</p>
                      <p className="mt-2 text-xl font-semibold">
                        {formatDate(quote.validUntil)}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">항목 요약</p>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2"
                        >
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              수량 {item.quantity} · {formatCurrency(item.unitPrice)}
                            </p>
                          </div>
                          <p className="font-medium">{formatCurrency(item.lineTotal)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <QuoteDraftAssistant />
      </section>
    </div>
  )
}
