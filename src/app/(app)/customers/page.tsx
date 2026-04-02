import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { PageHeader } from "@/components/app/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { demoCustomers, demoInquiries, demoInvoices, demoQuotes } from "@/lib/demo-data"

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="고객"
        description="고객별 문의, 견적, 청구 현황과 최근 이력을 빠르게 파악합니다."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {demoCustomers.map((customer) => {
          const inquiryCount = demoInquiries.filter(
            (item) => item.customerId === customer.id
          ).length
          const quoteCount = demoQuotes.filter((item) => item.customerId === customer.id).length
          const invoiceCount = demoInvoices.filter(
            (item) => item.customerId === customer.id
          ).length

          return (
            <Card key={customer.id} className="border-border/70">
              <CardHeader>
                <CardTitle>{customer.companyName ?? customer.name}</CardTitle>
                <CardDescription>
                  {customer.name} · {customer.email}
                </CardDescription>
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
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-border/70 bg-muted/30 p-3 text-center">
                    <p className="text-xs text-muted-foreground">문의</p>
                    <p className="mt-1 text-xl font-semibold">{inquiryCount}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/30 p-3 text-center">
                    <p className="text-xs text-muted-foreground">견적</p>
                    <p className="mt-1 text-xl font-semibold">{quoteCount}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/30 p-3 text-center">
                    <p className="text-xs text-muted-foreground">청구</p>
                    <p className="mt-1 text-xl font-semibold">{invoiceCount}</p>
                  </div>
                </div>
                <Link
                  href={`/customers/${customer.id}`}
                  className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
                >
                  고객 상세 보기
                  <ArrowRight className="size-4" />
                </Link>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
