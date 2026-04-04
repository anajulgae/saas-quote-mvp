"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Search } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { CustomerSummary } from "@/types/domain"

export function CustomersBoard({ customers }: { customers: CustomerSummary[] }) {
  const [searchQuery, setSearchQuery] = useState("")

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) {
      return customers
    }
    return customers.filter((customer) => {
      const haystack = [
        customer.name,
        customer.companyName,
        customer.email,
        customer.phone,
        ...(customer.tags ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [customers, searchQuery])

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="이름, 회사, 이메일, 전화로 검색…"
          className="pl-10"
          aria-label="고객 검색"
        />
      </div>

      {!customers.length ? (
        <EmptyState
          title="고객이 없습니다"
          description="문의·견적·청구에 모두 고객이 필요합니다. 베타에서는 운영자 안내에 따라 첫 고객을 등록한 뒤 문의부터 이어가 주세요."
        >
          <Link
            href="/inquiries"
            className={cn(buttonVariants({ variant: "default" }), "inline-flex items-center gap-1")}
          >
            문의 화면으로
            <ArrowRight className="size-3.5" />
          </Link>
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "outline" }), "inline-flex items-center gap-1")}
          >
            대시보드
            <ArrowRight className="size-3.5" />
          </Link>
        </EmptyState>
      ) : !filtered.length ? (
        <EmptyState
          title="검색 결과가 없습니다"
          description="다른 검색어로 다시 시도해 보세요."
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((customer) => {
          return (
            <Card key={customer.id} className="border-border/70">
              <CardHeader>
                <CardTitle className="text-lg leading-snug">
                  {customer.companyName ?? customer.name}
                </CardTitle>
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
                <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {customer.notes}
                </p>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="rounded-2xl border border-border/70 bg-muted/30 p-2.5 text-center sm:p-3">
                    <p className="text-xs text-muted-foreground">문의</p>
                    <p className="mt-1 text-lg font-semibold sm:text-xl">
                      {customer.inquiryCount}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/30 p-2.5 text-center sm:p-3">
                    <p className="text-xs text-muted-foreground">견적</p>
                    <p className="mt-1 text-lg font-semibold sm:text-xl">
                      {customer.quoteCount}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/30 p-2.5 text-center sm:p-3">
                    <p className="text-xs text-muted-foreground">청구</p>
                    <p className="mt-1 text-lg font-semibold sm:text-xl">
                      {customer.invoiceCount}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/customers/${customer.id}`}
                  className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
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
