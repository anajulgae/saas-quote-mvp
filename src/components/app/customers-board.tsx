"use client"

import { Fragment, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  MessageSquare,
  MoreHorizontal,
  Plus,
  UserPlus,
} from "lucide-react"
import { toast } from "sonner"

import { createCustomerAction } from "@/app/actions"
import { EmptyState } from "@/components/app/empty-state"
import { PageHeader } from "@/components/app/page-header"
import { OpsDetailSheet } from "@/components/operations/ops-detail-sheet"
import { OpsSearchField } from "@/components/operations/ops-search-field"
import { OpsTableShell } from "@/components/operations/ops-table-shell"
import {
  opsTableCellClass,
  opsTableClass,
  opsTableHeadCellClass,
  opsTableHeadRowClass,
  opsTableRowClass,
} from "@/components/operations/ops-table-styles"
import { OpsToolbar } from "@/components/operations/ops-toolbar"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { CustomerSummary } from "@/types/domain"

const emptyRegisterForm = {
  name: "",
  companyName: "",
  phone: "",
  email: "",
  notes: "",
  tagsRaw: "",
}

function resolveQuickSecondaryHref(customer: CustomerSummary): { href: string; label: string } {
  if (customer.hasOverdueInvoice || (customer.hasOpenReceivable && customer.invoiceCount > 0)) {
    return { href: `/customers/${customer.id}`, label: "청구·입금" }
  }
  if (customer.hasActiveQuote) {
    return { href: `/quotes?customer=${customer.id}&new=1`, label: "견적" }
  }
  return { href: `/inquiries?customer=${customer.id}&new=1`, label: "문의" }
}

function CustomerSignalBadges({ customer }: { customer: CustomerSummary }) {
  const items: { key: string; label: string; className: string }[] = []
  if (customer.hasOverdueInvoice) {
    items.push({
      key: "overdue",
      label: "연체",
      className: "border-destructive/25 bg-destructive/10 text-destructive",
    })
  } else if (customer.hasOpenReceivable && customer.invoiceCount > 0) {
    items.push({
      key: "recv",
      label: "미수",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100",
    })
  }
  if (customer.hasActiveQuote && items.length < 2) {
    items.push({ key: "quote", label: "견적진행", className: "border-border bg-muted/50 text-muted-foreground" })
  }
  if (customer.hasRecentInquiry && items.length < 2) {
    items.push({ key: "recent", label: "최근문의", className: "border-primary/25 bg-primary/10 text-primary" })
  }
  if (!items.length) {
    return <span className="text-[11px] text-muted-foreground">—</span>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span
          key={item.key}
          className={cn(
            "rounded border px-1.5 py-px text-[10px] font-medium leading-none whitespace-nowrap",
            item.className
          )}
        >
          {item.label}
        </span>
      ))}
    </div>
  )
}

type SortKey = "activity_desc" | "name_asc" | "company_asc"

export function CustomersBoard({ customers }: { customers: CustomerSummary[] }) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [tagFilter, setTagFilter] = useState<string>("all")
  const [sortKey, setSortKey] = useState<SortKey>("activity_desc")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sheetCustomer, setSheetCustomer] = useState<CustomerSummary | null>(null)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [regForm, setRegForm] = useState(emptyRegisterForm)
  const [regError, setRegError] = useState("")
  const [isPending, startTransition] = useTransition()

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const c of customers) {
      for (const t of c.tags ?? []) {
        if (t.trim()) {
          set.add(t.trim())
        }
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, "ko"))
  }, [customers])

  const filtered = useMemo(() => {
    let list = [...customers]
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter((customer) => {
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
    }
    if (tagFilter !== "all") {
      list = list.filter((c) => (c.tags ?? []).includes(tagFilter))
    }
    list.sort((a, b) => {
      if (sortKey === "activity_desc") {
        return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
      }
      if (sortKey === "name_asc") {
        return a.name.localeCompare(b.name, "ko")
      }
      const ca = (a.companyName ?? a.name).localeCompare(b.companyName ?? b.name, "ko")
      return ca !== 0 ? ca : a.name.localeCompare(b.name, "ko")
    })
    return list
  }, [customers, searchQuery, tagFilter, sortKey])

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
          <DialogDescription>이름은 필수입니다. 나머지는 상세 화면에서 수정할 수 있습니다.</DialogDescription>
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
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">전화 (선택)</label>
              <Input
                value={regForm.phone}
                onChange={(e) => setRegForm((c) => ({ ...c, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">이메일 (선택)</label>
              <Input
                type="email"
                value={regForm.email}
                onChange={(e) => setRegForm((c) => ({ ...c, email: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">메모 (선택)</label>
            <Textarea
              value={regForm.notes}
              onChange={(e) => setRegForm((c) => ({ ...c, notes: e.target.value }))}
              className="min-h-20 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">태그 (쉼표 구분)</label>
            <Input
              value={regForm.tagsRaw}
              onChange={(e) => setRegForm((c) => ({ ...c, tagsRaw: e.target.value }))}
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

  const openMobileDetail = (c: CustomerSummary) => setSheetCustomer(c)

  return (
    <div className="space-y-4 md:space-y-5">
      {registerDialog}

      <PageHeader
        title="고객"
        description="거래처별 문의·견적·청구 건수와 최근 활동을 한 화면에서 스캔합니다."
        action={
          <Button type="button" className="h-9 gap-2" onClick={() => setRegisterOpen(true)}>
            <UserPlus className="size-4" />
            새 고객
          </Button>
        }
      />

      <OpsToolbar>
        <OpsSearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="이름, 회사, 연락처, 이메일, 태그…"
        />
        <Select value={tagFilter} onValueChange={(v) => setTagFilter(v ?? "all")}>
          <SelectTrigger className="h-9 w-full sm:w-[160px]">
            <SelectValue placeholder="태그" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 태그</SelectItem>
            {allTags.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={sortKey}
          onValueChange={(v) => setSortKey((v as SortKey) ?? "activity_desc")}
        >
          <SelectTrigger className="h-9 w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="activity_desc">최근 활동순</SelectItem>
            <SelectItem value="name_asc">담당자 이름순</SelectItem>
            <SelectItem value="company_asc">회사·표시명순</SelectItem>
          </SelectContent>
        </Select>
      </OpsToolbar>

      {!customers.length ? (
        <EmptyState
          title="고객이 없습니다"
          description="문의·견적·청구에 고객이 필요합니다. 첫 고객을 등록한 뒤 업무를 이어가세요."
        >
          <Button type="button" className="gap-1.5" onClick={() => setRegisterOpen(true)}>
            <Plus className="size-3.5" />
            새 고객 등록
          </Button>
          <Link href="/inquiries" className={cn(buttonVariants({ variant: "outline" }), "inline-flex gap-1")}>
            문의 화면
            <ArrowRight className="size-3.5" />
          </Link>
        </EmptyState>
      ) : !filtered.length ? (
        <EmptyState title="조건에 맞는 고객이 없습니다" description="검색·태그 필터를 조정해 보세요." />
      ) : null}

      {/* 데스크톱: 테이블 + 인라인 확장 */}
      {customers.length > 0 && filtered.length > 0 ? (
        <OpsTableShell className="hidden md:block">
          <table className={opsTableClass}>
            <thead>
              <tr className={opsTableHeadRowClass}>
                <th className={cn(opsTableHeadCellClass, "w-10")} aria-label="펼침" />
                <th className={opsTableHeadCellClass}>고객 / 회사</th>
                <th className={opsTableHeadCellClass}>담당자</th>
                <th className={opsTableHeadCellClass}>연락처</th>
                <th className={opsTableHeadCellClass}>이메일</th>
                <th className={opsTableHeadCellClass}>태그</th>
                <th className={cn(opsTableHeadCellClass, "text-center tabular-nums")}>문의</th>
                <th className={cn(opsTableHeadCellClass, "text-center tabular-nums")}>견적</th>
                <th className={cn(opsTableHeadCellClass, "text-center tabular-nums")}>청구</th>
                <th className={opsTableHeadCellClass}>최근 활동</th>
                <th className={opsTableHeadCellClass}>상태</th>
                <th className={cn(opsTableHeadCellClass, "w-12 text-right")} aria-label="작업" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => {
                const open = expandedId === customer.id
                const primary = customer.companyName?.trim() || customer.name
                const secondary = customer.companyName?.trim() ? customer.name : null
                const quick = resolveQuickSecondaryHref(customer)
                return (
                  <Fragment key={customer.id}>
                    <tr
                      className={cn(opsTableRowClass, "cursor-pointer")}
                      data-state={open ? "open" : undefined}
                      onClick={() => setExpandedId((id) => (id === customer.id ? null : customer.id))}
                    >
                      <td className={cn(opsTableCellClass, "text-muted-foreground")}>
                        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </td>
                      <td className={cn(opsTableCellClass, "max-w-[200px] font-medium")}>
                        <span className="line-clamp-2">{primary}</span>
                        {secondary ? (
                          <span className="mt-0.5 block text-xs font-normal text-muted-foreground line-clamp-1">
                            {secondary}
                          </span>
                        ) : null}
                      </td>
                      <td className={cn(opsTableCellClass, "max-w-[100px] truncate")}>{customer.name}</td>
                      <td className={cn(opsTableCellClass, "max-w-[120px] truncate tabular-nums text-xs")}>
                        {customer.phone || "—"}
                      </td>
                      <td className={cn(opsTableCellClass, "max-w-[180px] truncate text-xs")}>
                        {customer.email || "—"}
                      </td>
                      <td className={opsTableCellClass}>
                        <div className="flex max-w-[140px] flex-wrap gap-1">
                          {(customer.tags ?? []).slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded border border-border/60 bg-muted/40 px-1 py-px text-[10px] text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                          {(customer.tags?.length ?? 0) > 3 ? (
                            <span className="text-[10px] text-muted-foreground">
                              +{customer.tags!.length - 3}
                            </span>
                          ) : null}
                          {!customer.tags?.length ? <span className="text-muted-foreground">—</span> : null}
                        </div>
                      </td>
                      <td className={cn(opsTableCellClass, "text-center tabular-nums")}>
                        {customer.inquiryCount}
                      </td>
                      <td className={cn(opsTableCellClass, "text-center tabular-nums")}>
                        {customer.quoteCount}
                      </td>
                      <td className={cn(opsTableCellClass, "text-center tabular-nums")}>
                        {customer.invoiceCount}
                      </td>
                      <td className={cn(opsTableCellClass, "whitespace-nowrap text-xs text-muted-foreground")}>
                        {formatDateTime(customer.lastActivityAt)}
                      </td>
                      <td className={opsTableCellClass} onClick={(e) => e.stopPropagation()}>
                        <CustomerSignalBadges customer={customer} />
                      </td>
                      <td className={cn(opsTableCellClass, "text-right")} onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className={cn(
                              buttonVariants({ variant: "ghost", size: "icon-sm" }),
                              "size-8"
                            )}
                          >
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">작업</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() => router.push(`/customers/${customer.id}`)}
                            >
                              <ExternalLink className="size-4" />
                              상세 페이지
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() =>
                                router.push(`/inquiries?customer=${customer.id}&new=1`)
                              }
                            >
                              <MessageSquare className="size-4" />
                              문의 만들기
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() => router.push(`/quotes?customer=${customer.id}&new=1`)}
                            >
                              <FileText className="size-4" />
                              견적 만들기
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() => router.push(quick.href)}
                            >
                              <ArrowRight className="size-4" />
                              {quick.label}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                    {open ? (
                      <tr className="bg-muted/15">
                        <td colSpan={12} className="border-b border-border/50 px-4 py-4">
                          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                            <div className="space-y-2 text-sm">
                              <p className="text-xs font-semibold text-muted-foreground">메모</p>
                              <p className="leading-relaxed text-foreground/90">
                                {customer.notes?.trim() || "등록된 메모가 없습니다."}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Link
                                href={`/customers/${customer.id}`}
                                className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                              >
                                상세 페이지
                              </Link>
                              <Link
                                href={`/inquiries?customer=${customer.id}&new=1`}
                                className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                              >
                                문의
                              </Link>
                              <Link
                                href={`/quotes?customer=${customer.id}&new=1`}
                                className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                              >
                                견적
                              </Link>
                              <Link
                                href="/invoices"
                                className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                              >
                                청구 목록
                              </Link>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </OpsTableShell>
      ) : null}

      {/* 모바일: 스택 + 시트 상세 */}
      {customers.length > 0 && filtered.length > 0 ? (
        <div className="space-y-2 md:hidden">
          {filtered.map((customer) => {
            const primary = customer.companyName?.trim() || customer.name
            const quick = resolveQuickSecondaryHref(customer)
            return (
              <button
                key={customer.id}
                type="button"
                className="flex w-full flex-col gap-2 rounded-xl border border-border/60 bg-card p-3 text-left shadow-sm"
                onClick={() => openMobileDetail(customer)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold leading-tight">{primary}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {customer.name}
                      {customer.phone ? ` · ${customer.phone}` : ""}
                    </p>
                  </div>
                  <CustomerSignalBadges customer={customer} />
                </div>
                <div className="flex gap-3 text-xs tabular-nums text-muted-foreground">
                  <span>문의 {customer.inquiryCount}</span>
                  <span>견적 {customer.quoteCount}</span>
                  <span>청구 {customer.invoiceCount}</span>
                </div>
                <span className="text-[11px] text-primary">탭하여 상세</span>
              </button>
            )
          })}
        </div>
      ) : null}

      <OpsDetailSheet
        open={sheetCustomer !== null}
        onOpenChange={(o) => !o && setSheetCustomer(null)}
        title={sheetCustomer ? sheetCustomer.companyName?.trim() || sheetCustomer.name : ""}
        description={
          sheetCustomer ? (
            <span className="text-muted-foreground">
              {sheetCustomer.name} · 최근 활동 {formatDateTime(sheetCustomer.lastActivityAt)}
            </span>
          ) : null
        }
        footer={
          sheetCustomer ? (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/customers/${sheetCustomer.id}`}
                className={cn(buttonVariants({ size: "sm" }))}
              >
                상세 페이지
              </Link>
              <Link
                href={`/inquiries?customer=${sheetCustomer.id}&new=1`}
                className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
              >
                문의
              </Link>
              <Link
                href={`/quotes?customer=${sheetCustomer.id}&new=1`}
                className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
              >
                견적
              </Link>
            </div>
          ) : null
        }
      >
        {sheetCustomer ? (
          <div className="space-y-4 text-sm">
            <div className="grid gap-2 text-xs">
              <div className="flex justify-between gap-2 border-b border-border/40 py-1">
                <span className="text-muted-foreground">이메일</span>
                <span className="text-right">{sheetCustomer.email || "—"}</span>
              </div>
              <div className="flex justify-between gap-2 border-b border-border/40 py-1">
                <span className="text-muted-foreground">전화</span>
                <span className="text-right tabular-nums">{sheetCustomer.phone || "—"}</span>
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">메모</p>
              <p className="leading-relaxed">{sheetCustomer.notes?.trim() || "없음"}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">태그</p>
              <div className="flex flex-wrap gap-1">
                {(sheetCustomer.tags ?? []).length ? (
                  sheetCustomer.tags.map((t) => (
                    <span key={t} className="rounded-md border bg-muted/40 px-2 py-0.5 text-xs">
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </OpsDetailSheet>
    </div>
  )
}
