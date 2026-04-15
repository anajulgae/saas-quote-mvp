"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Receipt,
  Trash2,
  UserPlus,
} from "lucide-react"
import { toast } from "sonner"

import { createCustomerAction, deleteCustomerAction } from "@/app/actions"
import { CoreCapabilityStrip } from "@/components/app/core-capability-strip"
import { resolveActivityHeadline } from "@/lib/activity-presentation"
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
import { inquiryStageOptions } from "@/lib/constants"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format"
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

/** 목록·카드: 우선순위 하나만 (연체 → 미수 → 견적진행 → 최근문의) */
function resolvePrimaryCustomerSignal(customer: CustomerSummary): {
  key: string
  label: string
  className: string
} | null {
  if (customer.hasOverdueInvoice) {
    return {
      key: "overdue",
      label: "연체",
      className: "border-destructive/25 bg-destructive/10 text-destructive",
    }
  }
  if (customer.hasOpenReceivable && customer.invoiceCount > 0) {
    return {
      key: "recv",
      label: "미수",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100",
    }
  }
  if (customer.hasActiveQuote) {
    return {
      key: "quote",
      label: "견적진행",
      className: "border-border bg-muted/50 text-muted-foreground",
    }
  }
  if (customer.hasRecentInquiry) {
    return {
      key: "recent",
      label: "최근문의",
      className: "border-primary/25 bg-primary/10 text-primary",
    }
  }
  return null
}

function CustomerPrimarySignalBadge({ customer }: { customer: CustomerSummary }) {
  const signal = resolvePrimaryCustomerSignal(customer)
  if (!signal) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  return (
    <span
      className={cn(
        "inline-block max-w-full truncate rounded border px-1.5 py-0.5 text-xs font-medium leading-none",
        signal.className
      )}
      title={signal.label}
    >
      {signal.label}
    </span>
  )
}

type SortKey = "activity_desc" | "name_asc" | "company_asc"

const customerSortSelectItems = [
  { value: "activity_desc" as const, label: "최근 활동순" },
  { value: "name_asc" as const, label: "담당자 이름순" },
  { value: "company_asc" as const, label: "회사·표시명순" },
]

export function CustomersBoard({
  customers,
  initialCustomerId,
  initialRegisterOpen = false,
}: {
  customers: CustomerSummary[]
  /** `/customers?customer=uuid` — 목록에서 해당 고객 drawer 오픈 */
  initialCustomerId?: string
  /** `/customers?new=1` — 새 고객 등록 다이얼로그 오픈 */
  initialRegisterOpen?: boolean
}) {
  const router = useRouter()
  const customerDeepLinkRef = useRef(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [tagFilter, setTagFilter] = useState<string>("all")
  const [sortKey, setSortKey] = useState<SortKey>("activity_desc")
  const [drawerCustomerId, setDrawerCustomerId] = useState<string | null>(null)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [regForm, setRegForm] = useState(emptyRegisterForm)
  const [regError, setRegError] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<CustomerSummary | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!initialCustomerId?.trim() && !initialRegisterOpen) {
      customerDeepLinkRef.current = false
    }
  }, [initialCustomerId, initialRegisterOpen])

  useEffect(() => {
    if (customerDeepLinkRef.current) {
      return
    }
    const cid = initialCustomerId?.trim()
    if (cid) {
      customerDeepLinkRef.current = true
      if (!customers.some((c) => c.id === cid)) {
        toast.error("해당 고객을 찾을 수 없습니다.")
        router.replace("/customers")
        return
      }
      setDrawerCustomerId(cid)
      router.replace("/customers")
      return
    }
    if (initialRegisterOpen && !cid) {
      customerDeepLinkRef.current = true
      setRegisterOpen(true)
      router.replace("/customers")
    }
  }, [initialCustomerId, initialRegisterOpen, customers, router])

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

  const tagFilterSelectItems = useMemo(() => {
    const record: Record<string, string> = { all: "전체 태그" }
    for (const t of allTags) {
      record[t] = t
    }
    return record
  }, [allTags])

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

  const drawerCustomer = useMemo(
    () => customers.find((c) => c.id === drawerCustomerId) ?? null,
    [customers, drawerCustomerId]
  )

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

  const runDeleteCustomer = () => {
    if (!deleteTarget) return
    const id = deleteTarget.id
    startTransition(async () => {
      const result = await deleteCustomerAction(id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setDeleteTarget(null)
      toast.success("고객과 연결된 데이터를 삭제했습니다.")
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

  return (
    <div className="space-y-4 md:space-y-5">
      {registerDialog}

      <PageHeader
        title="고객"
        description="고객마다 문의·견적·청구 맥락을 스캔하고, Pro에서는 미니 포털 링크로 견적·청구 요약을 넘깁니다."
        capabilityStrip={
          <CoreCapabilityStrip
            items={[
              { label: "고객 포털 링크", href: "/customers", emphasis: true },
              { label: "문의·견적", href: "/inquiries" },
              { label: "공개 문의 유입", href: "/settings#public-inquiry" },
            ]}
          />
        }
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
        <Select
          value={tagFilter}
          items={tagFilterSelectItems}
          onValueChange={(v) => setTagFilter(v ?? "all")}
        >
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
          items={customerSortSelectItems}
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
          description="문의·견적·청구는 고객에 연결됩니다. 등록하거나, 공개 문의 폼으로 첫 유입을 받을 수 있습니다."
        >
          <Button type="button" className="gap-1.5" onClick={() => setRegisterOpen(true)}>
            <Plus className="size-3.5" />
            새 고객 등록
          </Button>
          <Link href="/inquiries" className={cn(buttonVariants({ variant: "outline" }), "inline-flex gap-1")}>
            문의 화면
            <ArrowRight className="size-3.5" />
          </Link>
          <Link
            href="/settings#public-inquiry"
            className={cn(buttonVariants({ variant: "ghost" }), "inline-flex gap-1 text-xs")}
          >
            공개 문의 폼 설정
          </Link>
        </EmptyState>
      ) : !filtered.length ? (
        <EmptyState title="조건에 맞는 고객이 없습니다" description="검색·태그 필터를 조정해 보세요." />
      ) : null}

      {customers.length > 0 && filtered.length > 0 ? (
        <OpsTableShell className="hidden md:block">
          <table className={cn(opsTableClass, "!min-w-0 w-full max-w-full table-fixed")}>
            <thead>
              <tr className={opsTableHeadRowClass}>
                <th className={opsTableHeadCellClass}>고객 / 회사</th>
                <th className={opsTableHeadCellClass}>담당자</th>
                <th className={opsTableHeadCellClass}>연락처</th>
                <th className={opsTableHeadCellClass}>이메일</th>
                <th className={opsTableHeadCellClass}>태그</th>
                <th className={cn(opsTableHeadCellClass, "text-center tabular-nums")}>문의</th>
                <th className={cn(opsTableHeadCellClass, "text-center tabular-nums")}>견적</th>
                <th className={cn(opsTableHeadCellClass, "text-center tabular-nums")}>청구</th>
                <th className={cn(opsTableHeadCellClass, "w-[10.5rem] min-w-[9.5rem] max-w-[11rem]")}>
                  최근 활동
                </th>
                <th className={cn(opsTableHeadCellClass, "w-[5.5rem] min-w-[5rem] max-w-[6rem] text-left")}>
                  상태
                </th>
                <th className={cn(opsTableHeadCellClass, "w-12 text-right")} aria-label="작업" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => {
                const primary = customer.companyName?.trim() || customer.name
                const secondary = customer.companyName?.trim() ? customer.name : null
                const quick = resolveQuickSecondaryHref(customer)
                return (
                  <tr
                    key={customer.id}
                    className={cn(opsTableRowClass, "cursor-pointer")}
                    data-state={drawerCustomerId === customer.id ? "selected" : undefined}
                    onClick={() => setDrawerCustomerId(customer.id)}
                  >
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
                              className="rounded border border-border/60 bg-muted/40 px-1 py-px text-xs text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                          {(customer.tags?.length ?? 0) > 3 ? (
                            <span className="text-xs text-muted-foreground">
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
                      <td
                        className={cn(
                          opsTableCellClass,
                          "w-[10.5rem] min-w-[9.5rem] max-w-[11rem] overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground"
                        )}
                        title={formatDateTime(customer.lastActivityAt)}
                      >
                        {formatDateTime(customer.lastActivityAt)}
                      </td>
                      <td
                        className={cn(
                          opsTableCellClass,
                          "w-[5.5rem] min-w-[5rem] max-w-[6rem] overflow-hidden"
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-start">
                          <CustomerPrimarySignalBadge customer={customer} />
                        </div>
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
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() =>
                                router.push(`/invoices?customer=${encodeURIComponent(customer.id)}`)
                              }
                            >
                              <Receipt className="size-4" />
                              청구 보기
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() => router.push(quick.href)}
                            >
                              <ArrowRight className="size-4" />
                              {quick.label}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="gap-2 text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(customer)}
                            >
                              <Trash2 className="size-4" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
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
                onClick={() => setDrawerCustomerId(customer.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold leading-tight">{primary}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {customer.name}
                      {customer.phone ? ` · ${customer.phone}` : ""}
                    </p>
                  </div>
                  <CustomerPrimarySignalBadge customer={customer} />
                </div>
                <div className="flex gap-3 text-xs tabular-nums text-muted-foreground">
                  <span>문의 {customer.inquiryCount}</span>
                  <span>견적 {customer.quoteCount}</span>
                  <span>청구 {customer.invoiceCount}</span>
                </div>
                <span className="text-xs text-primary">탭하여 상세</span>
              </button>
            )
          })}
        </div>
      ) : null}

      <OpsDetailSheet
        open={drawerCustomer !== null}
        onOpenChange={(o) => !o && setDrawerCustomerId(null)}
        title={drawerCustomer ? drawerCustomer.companyName?.trim() || drawerCustomer.name : ""}
        description={
          drawerCustomer ? (
            <span className="flex flex-col gap-1 text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2">
              <span>담당 {drawerCustomer.name}</span>
              <span className="hidden sm:inline">·</span>
              <span>최근 활동 {formatDateTime(drawerCustomer.lastActivityAt)}</span>
            </span>
          ) : null
        }
        footer={
          drawerCustomer ? (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/customers/${drawerCustomer.id}`}
                className={cn(buttonVariants({ size: "sm" }))}
              >
                상세 페이지
              </Link>
              <Link
                href={`/inquiries?customer=${drawerCustomer.id}&new=1`}
                className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
              >
                문의 만들기
              </Link>
              <Link
                href={`/quotes?customer=${drawerCustomer.id}&new=1`}
                className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
              >
                견적 만들기
              </Link>
              <Link
                href={`/invoices?customer=${encodeURIComponent(drawerCustomer.id)}`}
                className={cn(buttonVariants({ size: "sm", variant: "outline" }), "inline-flex gap-1")}
              >
                <Receipt className="size-3.5" />
                청구 보기
              </Link>
            </div>
          ) : null
        }
      >
        {drawerCustomer ? (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap gap-2">
              <CustomerPrimarySignalBadge customer={drawerCustomer} />
            </div>
            <div className="grid gap-2 text-xs">
              <div className="flex justify-between gap-2 border-b border-border/40 py-1">
                <span className="text-muted-foreground">이메일</span>
                <span className="text-right">{drawerCustomer.email || "—"}</span>
              </div>
              <div className="flex justify-between gap-2 border-b border-border/40 py-1">
                <span className="text-muted-foreground">전화</span>
                <span className="text-right tabular-nums">{drawerCustomer.phone || "—"}</span>
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">메모</p>
              <p className="leading-relaxed">{drawerCustomer.notes?.trim() || "등록된 메모가 없습니다."}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">태그·분류</p>
              <div className="flex flex-wrap gap-1">
                {(drawerCustomer.tags ?? []).length ? (
                  drawerCustomer.tags.map((t) => (
                    <span key={t} className="rounded-md border bg-muted/40 px-2 py-0.5 text-xs">
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </div>
            <div className="space-y-3 rounded-lg border border-border/50 bg-muted/10 p-3">
              <p className="text-xs font-semibold text-muted-foreground">최근 건 요약</p>
              <div className="space-y-2 text-xs">
                <div>
                  <p className="font-medium text-foreground">문의</p>
                  {drawerCustomer.recentSnapshot?.inquiry ? (
                    <p className="mt-0.5 text-muted-foreground">
                      {(() => {
                        const inv = drawerCustomer.recentSnapshot?.inquiry
                        if (!inv) {
                          return null
                        }
                        return (
                          <>
                            {inv.title} ·{" "}
                            {inquiryStageOptions.find((o) => o.value === inv.stage)?.label ?? inv.stage} ·{" "}
                            {formatDate(inv.createdAt)}
                          </>
                        )
                      })()}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-muted-foreground">최근 문의 없음</p>
                  )}
                </div>
                <div>
                  <p className="font-medium text-foreground">견적</p>
                  {drawerCustomer.recentSnapshot?.quote ? (
                    <p className="mt-0.5 text-muted-foreground">
                      {drawerCustomer.recentSnapshot.quote.quoteNumber} ·{" "}
                      {drawerCustomer.recentSnapshot.quote.title} ·{" "}
                      {formatCurrency(drawerCustomer.recentSnapshot.quote.total)} ·{" "}
                      {formatDate(drawerCustomer.recentSnapshot.quote.updatedAt)}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-muted-foreground">최근 견적 없음</p>
                  )}
                </div>
                <div>
                  <p className="font-medium text-foreground">청구</p>
                  {drawerCustomer.recentSnapshot?.invoice ? (
                    <p className="mt-0.5 text-muted-foreground">
                      {drawerCustomer.recentSnapshot.invoice.invoiceNumber} ·{" "}
                      {formatCurrency(drawerCustomer.recentSnapshot.invoice.amount)} ·{" "}
                      {formatDate(drawerCustomer.recentSnapshot.invoice.updatedAt)}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-muted-foreground">최근 청구 없음</p>
                  )}
                </div>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">활동 기록</p>
              {drawerCustomer.recentActivity && drawerCustomer.recentActivity.length > 0 ? (
                <ul className="max-h-48 space-y-2 overflow-y-auto text-xs">
                  {drawerCustomer.recentActivity.map((log) => (
                    <li key={log.id} className="rounded-md border border-border/40 px-2 py-1.5">
                      <p className="font-medium text-foreground">{resolveActivityHeadline(log.action)}</p>
                      <p className="mt-0.5 leading-snug text-muted-foreground">{log.description}</p>
                      <p className="mt-1 tabular-nums text-xs text-muted-foreground">
                        {formatDateTime(log.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">표시할 활동 기록이 없습니다.</p>
              )}
            </div>
          </div>
        ) : null}
      </OpsDetailSheet>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent className="max-w-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle>고객 삭제</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {deleteTarget ? (
                <>
                  「{deleteTarget.companyName?.trim() || deleteTarget.name}」 고객과 연결된 모든 문의·견적·청구 데이터를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={runDeleteCustomer}
            >
              {isPending ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              삭제
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
