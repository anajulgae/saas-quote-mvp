import { PageHeader } from "@/components/app/page-header"
import { PaymentStatusBadge } from "@/components/app/status-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getInvoicesPageData } from "@/lib/data"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format"

export default async function InvoicesPage() {
  const { invoices } = await getInvoicesPageData()

  return (
    <div className="space-y-6">
      <PageHeader
        title="청구 및 수금"
        description="선금/잔금 요청, 결제 상태, 미수 리마인드 이력을 추적합니다."
      />

      <div className="grid gap-4">
        {invoices.map((invoice) => {
          const customer = invoice.customer
          const reminders = invoice.reminders

          return (
            <Card key={invoice.id} className="border-border/70">
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle>
                      {invoice.invoiceNumber} · {customer?.companyName ?? customer?.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {invoice.invoiceType === "deposit"
                        ? "선금 청구"
                        : invoice.invoiceType === "balance"
                          ? "잔금 청구"
                          : "최종 청구"}
                    </CardDescription>
                  </div>
                  <PaymentStatusBadge status={invoice.paymentStatus} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                    <p className="text-xs text-muted-foreground">청구 금액</p>
                    <p className="mt-2 text-lg font-semibold">
                      {formatCurrency(invoice.amount)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                    <p className="text-xs text-muted-foreground">요청일</p>
                    <p className="mt-2 text-lg font-semibold">
                      {formatDate(invoice.requestedAt)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                    <p className="text-xs text-muted-foreground">기한</p>
                    <p className="mt-2 text-lg font-semibold">{formatDate(invoice.dueDate)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                    <p className="text-xs text-muted-foreground">입금일</p>
                    <p className="mt-2 text-lg font-semibold">{formatDate(invoice.paidAt)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">메모</p>
                  <p className="text-sm leading-6 text-muted-foreground">{invoice.notes}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">리마인드 이력</p>
                  {reminders.length ? (
                    <div className="space-y-2">
                      {reminders.map((reminder) => (
                        <div
                          key={reminder.id}
                          className="rounded-xl border border-border/70 px-3 py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                              {reminder.channel}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(reminder.sentAt)}
                            </p>
                          </div>
                          <p className="mt-2 text-sm leading-6">{reminder.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      아직 발송된 리마인드가 없습니다.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
