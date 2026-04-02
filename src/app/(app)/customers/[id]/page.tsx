import { notFound } from "next/navigation"

import { EmptyState } from "@/components/app/empty-state"
import { PageHeader } from "@/components/app/page-header"
import { InquiryStageBadge, PaymentStatusBadge, QuoteStatusBadge } from "@/components/app/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCustomerDetailData } from "@/lib/data"
import { formatCurrency, formatDateTime } from "@/lib/format"

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { customer, inquiries, quotes, invoices, timeline } =
    await getCustomerDetailData(id)

  if (!customer) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.companyName ?? customer.name}
        description={`${customer.name} · ${customer.phone} · ${customer.email}`}
      />

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>고객 메모</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {customer.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{customer.notes}</p>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>고객 타임라인</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {timeline.map((event) => (
              <div key={event.id} className="flex gap-3">
                <div className="mt-1 size-2 rounded-full bg-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">{event.label}</p>
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(event.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>문의</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inquiries.length ? (
              inquiries.map((item) => (
                <div key={item.id} className="rounded-xl border border-border/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{item.title}</p>
                    <InquiryStageBadge stage={item.stage} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.details}</p>
                </div>
              ))
            ) : (
              <EmptyState
                title="문의 없음"
                description="이 고객에 연결된 문의가 아직 없습니다."
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>견적</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quotes.length ? (
              quotes.map((item) => (
                <div key={item.id} className="rounded-xl border border-border/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{item.quoteNumber}</p>
                    <QuoteStatusBadge status={item.status} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.title}</p>
                  <p className="mt-2 text-sm font-medium">{formatCurrency(item.total)}</p>
                </div>
              ))
            ) : (
              <EmptyState
                title="견적 없음"
                description="이 고객에 대한 견적이 아직 없습니다."
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>청구</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {invoices.length ? (
              invoices.map((item) => (
                <div key={item.id} className="rounded-xl border border-border/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{item.invoiceNumber}</p>
                    <PaymentStatusBadge status={item.paymentStatus} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.invoiceType} · {formatCurrency(item.amount)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState
                title="청구 없음"
                description="이 고객에 대한 청구 내역이 아직 없습니다."
              />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
