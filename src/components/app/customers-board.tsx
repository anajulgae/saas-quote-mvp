"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Plus, Search, UserPlus } from "lucide-react"
import { toast } from "sonner"

import { createCustomerAction } from "@/app/actions"
import { EmptyState } from "@/components/app/empty-state"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { CustomerSummary } from "@/types/domain"

function resolveQuickSecondaryHref(customer: CustomerSummary): { href: string; label: string } {
  if (customer.hasOverdueInvoice || (customer.hasOpenReceivable && customer.invoiceCount > 0)) {
    return { href: `/customers/${customer.id}`, label: "청구·입금 확인" }
  }
  if (customer.hasActiveQuote) {
    return {
      href: `/quotes?customer=${customer.id}&new=1`,
      label: "견적 만들기",
    }
  }
  return {
    href: `/inquiries?customer=${customer.id}&new=1`,
    label: "문의 만들기",
  }
}

function CustomerSignalBadges({ customer }: { customer: CustomerSummary }) {
  const items: { key: string; label: string; className: string }[] = []

  if (customer.hasOverdueInvoice) {
    items.push({
      key: "overdue",
      label: "연체 청구",
      className:
        "border-red-500/35 bg-red-500/[0.08] text-red-900 dark:text-red-100",
    })
  } else if (customer.hasOpenReceivable && customer.invoiceCount > 0) {
    items.push({
      key: "recv",
      label: "입금 대기",
      className:
        "border-amber-500/30 bg-amber-500/[0.07] text-amber-950 dark:text-amber-100",
    })
  }

  if (customer.hasActiveQuote && items.length < 2) {
    items.push({
      key: "quote",
      label: "견적 진행",
      className: "border-border/70 bg-muted/50 text-muted-foreground",
    })
  }

  if (customer.hasRecentInquiry && items.length < 2) {
    items.push({
      key: "recent",
      label: "최근 문의",
      className: "border-primary/30 bg-primary/[0.06] text-primary",
    })
  }

  if (!items.length) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span
          key={item.key}
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none",
            item.className
          )}
        >
          {item.label}
        </span>
      ))}
    </div>
  )
}

const emptyRegisterForm = {
  name: "",
  companyName: "",
  phone: "",
  email: "",
  notes: "",
  tagsRaw: "",
}

export function CustomersBoard({ customers }: { customers: CustomerSummary[] }) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [registerOpen, setRegisterOpen] = useState(false)
  const [regForm, setRegForm] = useState(emptyRegisterForm)
  const [regError, setRegError] = useState("")
  const [isPending, startTransition] = useTransition()

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

  const submitRegister = () => {
    setRegError("")
    startTransition(async () => {
      const result = await createCustomerAction(regForm)
      if (!result.ok) {
        setRegError(result.error)
        toast.error(result.error)
        return
      }
      toast.success("고객이 등록되었습니다.")
      setRegForm(emptyRegisterForm)
      setRegisterOpen(false)
      router.refresh()
    })
  }

  const registerDialog = (
    <Dialog
      open={registerOpen}
      onOpenChange={(open) => {
        setRegisterOpen(open)
        if (!open) {
          setRegError("")
          setRegForm(emptyRegisterForm)
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>새 고객 등록</DialogTitle>
          <DialogDescription>이름은 필수입니다. 나머지는 나중에 상세에서 수정할 수 있습니다.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">이름 · 담당자</label>
            <Input
              value={regForm.name}
              onChange={(e) => setRegForm((c) => ({ ...c, name: e.target.value }))}
              placeholder="홍길동"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">회사명 (선택)</label>
            <Input
              value={regForm.companyName}
              onChange={(e) => setRegForm((c) => ({ ...c, companyName: e.target.value }))}
              placeholder="○○ 주식회사"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">전화 (선택)</label>
              <Input
                value={regForm.phone}
                onChange={(e) => setRegForm((c) => ({ ...c, phone: e.target.value }))}
                placeholder="010-0000-0000"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">이메일 (선택)</label>
              <Input
                type="email"
                value={regForm.email}
                onChange={(e) => setRegForm((c) => ({ ...c, email: e.target.value }))}
                placeholder="name@company.com"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">메모 (선택)</label>
            <Textarea
              value={regForm.notes}
              onChange={(e) => setRegForm((c) => ({ ...c, notes: e.target.value }))}
              className="min-h-20 text-sm"
              placeholder="거래 맥락, 특이사항"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">태그 (선택, 쉼표로 구분)</label>
            <Input
              value={regForm.tagsRaw}
              onChange={(e) => setRegForm((c) => ({ ...c, tagsRaw: e.target.value }))}
              placeholder="단골, B2B"
            />
          </div>
          {regError ? <p className="text-xs text-destructive">{regError}</p> : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => setRegisterOpen(false)}>
            취소
          </Button>
          <Button type="button" disabled={isPending} onClick={submitRegister}>
            등록
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return (
    <div className="space-y-3 md:space-y-4">
      {registerDialog}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="이름, 회사, 이메일, 전화로 검색…"
            className="h-9 pl-10"
            aria-label="고객 검색"
          />
        </div>
        <Button
          type="button"
          className="h-9 w-full shrink-0 gap-1.5 sm:w-auto sm:min-w-[9.5rem]"
          onClick={() => setRegisterOpen(true)}
        >
          <UserPlus className="size-4" />
          새 고객 등록
        </Button>
      </div>

      {!customers.length ? (
        <EmptyState
          title="고객이 없습니다"
          description="문의·견적·청구에 모두 고객이 필요합니다. 아래에서 첫 고객을 등록한 뒤 문의부터 이어가 주세요."
        >
          <Button type="button" className="gap-1.5" onClick={() => setRegisterOpen(true)}>
            <Plus className="size-3.5" />
            새 고객 등록
          </Button>
          <Link
            href="/inquiries"
            className={cn(buttonVariants({ variant: "outline" }), "inline-flex items-center gap-1")}
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

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((customer) => {
          const displayTitle = customer.companyName ?? customer.name
          const secondaryLine = [customer.companyName ? customer.name : null, customer.email, customer.phone]
            .filter(Boolean)
            .join(" · ")

          const quick = resolveQuickSecondaryHref(customer)

          return (
            <Card
              key={customer.id}
              className="border-border/70 transition-colors hover:border-primary/20 hover:shadow-sm"
            >
              <CardHeader className="space-y-2 pb-2">
                <CustomerSignalBadges customer={customer} />
                <CardTitle className="text-base font-semibold leading-tight tracking-tight">
                  {displayTitle}
                </CardTitle>
                {secondaryLine ? (
                  <p className="text-xs leading-snug text-muted-foreground">{secondaryLine}</p>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {customer.tags.length ? (
                  <div className="flex flex-wrap gap-1">
                    {customer.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md border border-transparent bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                {customer.notes ? (
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground/85">
                    {customer.notes}
                  </p>
                ) : null}

                <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-border/60 bg-muted/15 px-2 py-1.5">
                  <div className="text-center">
                    <p className="text-[10px] font-medium text-muted-foreground">문의</p>
                    <p className="text-sm font-semibold tabular-nums">{customer.inquiryCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-medium text-muted-foreground">견적</p>
                    <p className="text-sm font-semibold tabular-nums">{customer.quoteCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-medium text-muted-foreground">청구</p>
                    <p className="text-sm font-semibold tabular-nums">{customer.invoiceCount}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-0.5 sm:flex-row sm:items-stretch">
                  <Link
                    href={`/customers/${customer.id}`}
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "inline-flex h-8 flex-1 items-center justify-center gap-1.5 font-medium"
                    )}
                  >
                    고객 상세 보기
                    <ArrowRight className="size-3.5 opacity-80" />
                  </Link>
                  <Link
                    href={quick.href}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "inline-flex h-8 flex-1 items-center justify-center gap-1.5 font-medium"
                    )}
                  >
                    {quick.label}
                  </Link>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
