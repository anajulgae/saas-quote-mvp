"use client"

import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  ListOrdered,
  MoreHorizontal,
  Pencil,
  Plus,
  Sparkles,
  UserPlus,
} from "lucide-react"
import { toast } from "sonner"

import { createInquiryAction, updateInquiryAction } from "@/app/actions"
import { EmptyState } from "@/components/app/empty-state"
import { PageHeader } from "@/components/app/page-header"
import { InquiryStageBadge } from "@/components/app/status-badge"
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
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { inquiryStageOptions } from "@/lib/constants"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Customer, InquiryWithCustomer, InquiryStage } from "@/types/domain"

function toLocalDateTimeValue(value?: string) {
  if (!value) {
    return ""
  }

  return value.slice(0, 16)
}

function inquiryToFormFields(inquiry: InquiryWithCustomer) {
  return {
    title: inquiry.title,
    customerId: inquiry.customerId,
    serviceCategory: inquiry.serviceCategory,
    channel: inquiry.channel,
    details: inquiry.details,
    budgetMin: inquiry.budgetMin ? String(inquiry.budgetMin) : "",
    budgetMax: inquiry.budgetMax ? String(inquiry.budgetMax) : "",
    stage: inquiry.stage,
    followUpAt: toLocalDateTimeValue(inquiry.followUpAt),
  }
}

type FollowupFilter = "all" | "overdue" | "week"
type InquirySort = "created_desc" | "followup_asc" | "followup_desc"

const flowSteps = [
  { step: 1, title: "고객 등록", hint: "거래처를 먼저 등록합니다" },
  { step: 2, title: "문의 등록", hint: "채널·일정·예산을 함께 기록합니다" },
  { step: 3, title: "견적 단계로 이동", hint: "견적 메뉴에서 이어서 진행합니다" },
] as const

export function InquiriesBoard({
  inquiries,
  customers,
  stageSummary,
  initialCustomerId,
  initialCreateOpen = false,
}: {
  inquiries: InquiryWithCustomer[]
  customers: Customer[]
  stageSummary: Record<"new" | "qualified" | "quoted", number>
  /** 고객 카드 등에서 전달: `/inquiries?customer=uuid&new=1` */
  initialCustomerId?: string
  initialCreateOpen?: boolean
}) {
  const router = useRouter()
  const flowStepsRef = useRef<HTMLDivElement>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [stageFilter, setStageFilter] = useState<InquiryStage | "all">("all")
  const [followupFilter, setFollowupFilter] = useState<FollowupFilter>("all")
  const [sortKey, setSortKey] = useState<InquirySort>("created_desc")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const deepLinkAppliedRef = useRef(false)

  const [form, setForm] = useState({
    title: "",
    customerId: customers[0]?.id ?? "",
    serviceCategory: "",
    channel: "카카오톡",
    details: "",
    budgetMin: "",
    budgetMax: "",
    stage: "new" as InquiryStage,
    followUpAt: "",
  })

  /** 고객 1명 이상 — 문의 등록 가능 */
  const hasCustomers = customers.length > 0
  /** 문의 1건 이상 — 검색·CSV 안내 노출 */
  const hasInquiries = inquiries.length > 0
  /** 문의 0건 — 빠른 시작·히어로·(완화된) KPI */
  const isEmptyInquiries = inquiries.length === 0

  const scrollToFlowSteps = () => {
    flowStepsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const editingInquiry = useMemo(
    () => inquiries.find((item) => item.id === editingId) ?? null,
    [editingId, inquiries]
  )

  useEffect(() => {
    if (deepLinkAppliedRef.current) {
      return
    }
    if (!initialCreateOpen || !initialCustomerId?.trim()) {
      return
    }
    const id = initialCustomerId.trim()
    if (!customers.some((c) => c.id === id)) {
      return
    }
    deepLinkAppliedRef.current = true
    setForm((current) => ({ ...current, customerId: id }))
    setErrorMessage("")
    setEditingId(null)
    setIsCreateOpen(true)
  }, [initialCreateOpen, initialCustomerId, customers])

  const filteredInquiries = useMemo(() => {
    let list = [...inquiries]
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter((inquiry) => {
        const customer = inquiry.customer
        const haystack = [
          inquiry.title,
          inquiry.details,
          inquiry.serviceCategory,
          inquiry.channel,
          customer?.name,
          customer?.companyName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return haystack.includes(q)
      })
    }
    if (stageFilter !== "all") {
      list = list.filter((i) => i.stage === stageFilter)
    }
    const now = Date.now()
    const weekEnd = now + 7 * 86400000
    if (followupFilter === "overdue") {
      list = list.filter((i) => {
        if (!i.followUpAt) {
          return false
        }
        return new Date(i.followUpAt).getTime() < now
      })
    } else if (followupFilter === "week") {
      list = list.filter((i) => {
        if (!i.followUpAt) {
          return false
        }
        const t = new Date(i.followUpAt).getTime()
        return t >= now && t <= weekEnd
      })
    }
    list.sort((a, b) => {
      if (sortKey === "created_desc") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      const af = a.followUpAt ? new Date(a.followUpAt).getTime() : Number.POSITIVE_INFINITY
      const bf = b.followUpAt ? new Date(b.followUpAt).getTime() : Number.POSITIVE_INFINITY
      if (sortKey === "followup_asc") {
        return af - bf
      }
      return bf - af
    })
    return list
  }, [inquiries, searchQuery, stageFilter, followupFilter, sortKey])

  const resetForm = () => {
    setForm({
      title: "",
      customerId: customers[0]?.id ?? "",
      serviceCategory: "",
      channel: "카카오톡",
      details: "",
      budgetMin: "",
      budgetMax: "",
      stage: "new" as InquiryStage,
      followUpAt: "",
    })
    setErrorMessage("")
    setEditingId(null)
  }

  const handleCreate = () => {
    setErrorMessage("")

    startTransition(async () => {
      const result = await createInquiryAction(form)

      if (!result.ok) {
        setErrorMessage(result.error)
        toast.error(result.error)
        return
      }

      toast.success("문의가 등록되었습니다.")
      resetForm()
      setIsCreateOpen(false)
      router.refresh()
    })
  }

  const handleEdit = () => {
    if (!editingInquiry) {
      return
    }

    setErrorMessage("")

    startTransition(async () => {
      const result = await updateInquiryAction(editingInquiry.id, form)

      if (!result.ok) {
        setErrorMessage(result.error)
        toast.error(result.error)
        return
      }

      toast.success("문의가 수정되었습니다.")
      resetForm()
      router.refresh()
    })
  }

  const openEdit = (inquiry: InquiryWithCustomer) => {
    setIsCreateOpen(false)
    setEditingId(inquiry.id)
    setErrorMessage("")
    setForm(inquiryToFormFields(inquiry))
  }

  const quickUpdateStage = (inquiry: InquiryWithCustomer, stage: InquiryStage) => {
    const payload = { ...inquiryToFormFields(inquiry), stage }
    startTransition(async () => {
      const result = await updateInquiryAction(inquiry.id, payload)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("문의 단계가 변경되었습니다.")
      router.refresh()
    })
  }

  const openCreateDialog = () => {
    if (!hasCustomers) {
      toast.message("먼저 고객을 등록해 주세요.", {
        description: "문의 등록 전에 먼저 고객을 추가해주세요.",
      })
      return
    }
    resetForm()
    setIsCreateOpen(true)
  }

  const FormFields = (
    <div className="grid gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">문의 제목</label>
        <Input
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          placeholder="예: 매장 홍보 영상 4편"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">고객</label>
          <Select
            value={form.customerId}
            onValueChange={(value) =>
              setForm((current) => ({
                ...current,
                customerId: value ?? current.customerId,
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="고객 선택" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.companyName ?? customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">상태</label>
          <Select
            value={form.stage}
            onValueChange={(value) =>
              setForm((current) => ({
                ...current,
                stage: (value as InquiryStage | null) ?? current.stage,
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="상태 선택" />
            </SelectTrigger>
            <SelectContent>
              {inquiryStageOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">서비스 카테고리</label>
          <Input
            value={form.serviceCategory}
            onChange={(event) =>
              setForm((current) => ({ ...current, serviceCategory: event.target.value }))
            }
            placeholder="영상 제작, 에어컨 청소"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">문의 채널</label>
          <Input
            value={form.channel}
            onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value }))}
            placeholder="카카오톡, 전화"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">상세 요청</label>
        <Textarea
          value={form.details}
          onChange={(event) => setForm((current) => ({ ...current, details: event.target.value }))}
          placeholder="요청 범위, 납기, 특이사항"
          className="min-h-28"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">예산 최소</label>
          <Input
            value={form.budgetMin}
            onChange={(event) =>
              setForm((current) => ({ ...current, budgetMin: event.target.value }))
            }
            inputMode="numeric"
            placeholder="300000"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">예산 최대</label>
          <Input
            value={form.budgetMax}
            onChange={(event) =>
              setForm((current) => ({ ...current, budgetMax: event.target.value }))
            }
            inputMode="numeric"
            placeholder="800000"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">팔로업 일정</label>
          <Input
            type="datetime-local"
            value={form.followUpAt}
            onChange={(event) =>
              setForm((current) => ({ ...current, followUpAt: event.target.value }))
            }
          />
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-4 md:space-y-5">
      <PageHeader
        title="문의 관리"
        description="문의에 채널·일정·예상 금액을 남기고, 후속조치와 견적까지 한 흐름으로 관리합니다."
        action={
          <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:items-end">
            {hasCustomers ? (
              <Button type="button" className="h-9 w-full gap-2 sm:w-auto" onClick={openCreateDialog}>
                <Plus className="size-4" />
                문의 등록
              </Button>
            ) : (
              <div className="w-full rounded-lg border border-border/60 bg-muted/20 p-2.5 sm:w-auto sm:min-w-[min(100%,20rem)]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2">
                  <Link
                    href="/customers"
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "inline-flex h-9 flex-1 items-center justify-center gap-2 font-medium"
                    )}
                  >
                    <UserPlus className="size-3.5" />
                    고객 등록하기
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled
                    className="h-9 flex-1 cursor-not-allowed opacity-55 sm:max-w-[9.5rem]"
                    title="문의 등록 전에 먼저 고객을 추가해주세요"
                  >
                    <Plus className="size-3.5" />
                    문의 등록
                  </Button>
                </div>
                <p className="mt-2 border-t border-border/50 pt-2 text-center text-[11px] leading-snug text-muted-foreground sm:text-left">
                  문의 등록 전에 먼저 고객을 추가해주세요
                </p>
              </div>
            )}
          </div>
        }
      />

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open)
          if (!open) {
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>새 문의 등록</DialogTitle>
            <DialogDescription>
              고객, 서비스 범위, 예산, 팔로업 일정을 함께 기록합니다.
            </DialogDescription>
          </DialogHeader>
          {FormFields}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
              취소
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={isPending || !form.title || !form.serviceCategory}
            >
              저장
            </Button>
          </DialogFooter>
          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingId !== null}
        onOpenChange={(open) => {
          if (!open) {
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>문의 수정</DialogTitle>
            <DialogDescription>
              상태와 다음 후속조치를 업데이트하세요.
            </DialogDescription>
          </DialogHeader>
          {FormFields}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={resetForm}>
              닫기
            </Button>
            <Button type="button" onClick={handleEdit} disabled={isPending || !editingInquiry}>
              <Sparkles className="size-4" />
              저장
            </Button>
          </DialogFooter>
          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
        </DialogContent>
      </Dialog>

      {isEmptyInquiries ? (
        <Card className="overflow-hidden border border-primary/35 bg-gradient-to-b from-primary/[0.06] to-background shadow-sm ring-1 ring-primary/10">
          <CardContent className="space-y-3 p-4 sm:p-5">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold tracking-wide text-primary uppercase">빠른 시작</p>
              <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                먼저 고객을 등록한 뒤 문의를 추가하세요
              </h2>
              <p className="text-sm leading-snug text-muted-foreground">
                문의는 고객과 연결되어야 견적과 청구로 자연스럽게 이어집니다.
              </p>
              {!hasCustomers ? (
                <p className="text-xs font-medium text-amber-900 dark:text-amber-100/90">
                  등록된 고객이 없습니다. 아래 <span className="font-semibold">고객 등록하기</span>로 시작하세요.
                </p>
              ) : (
                <p className="text-xs font-medium text-muted-foreground">
                  고객이 준비되었습니다. 첫 문의를 남기거나 단계 안내를 확인하세요.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href="/customers"
                className={cn(
                  buttonVariants({ size: "default" }),
                  "inline-flex h-9 w-full items-center justify-center gap-2 font-semibold shadow-sm sm:min-w-[10.5rem] sm:w-auto"
                )}
              >
                <UserPlus className="size-3.5" />
                고객 등록하기
              </Link>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 w-full gap-1.5 border-primary/25 sm:w-auto"
                onClick={scrollToFlowSteps}
              >
                <ListOrdered className="size-3.5" />
                문의 흐름 보기
              </Button>
              {hasCustomers ? (
                <Button
                  type="button"
                  size="default"
                  className="h-9 w-full gap-2 font-semibold sm:w-auto"
                  onClick={openCreateDialog}
                >
                  <Plus className="size-3.5" />
                  첫 문의 만들기
                </Button>
              ) : null}
            </div>

            <div
              ref={flowStepsRef}
              id="inquiry-flow-steps"
              className="rounded-lg border border-border/60 bg-background/80 p-2.5 sm:p-3"
            >
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                <ListOrdered className="size-3" aria-hidden />
                진행 순서
              </p>
              <ol className="grid gap-2 sm:grid-cols-3">
                {flowSteps.map((item) => (
                  <li
                    key={item.step}
                    className={cn(
                      "flex gap-2 rounded-md border px-2.5 py-2 text-[13px]",
                      item.step === 3
                        ? "border-border/50 bg-muted/10"
                        : "border-border/60 bg-muted/15"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                        item.step === 3
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/12 text-primary"
                      )}
                    >
                      {item.step}
                    </span>
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "font-semibold leading-tight",
                          item.step === 3 ? "text-muted-foreground" : "text-foreground"
                        )}
                      >
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{item.hint}</p>
                      {item.step === 3 ? (
                        <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground/90">
                          문의 등록 후 견적 메뉴에서 진행하세요
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!isEmptyInquiries ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border/50 bg-muted/15 px-3 py-2 text-[11px] text-muted-foreground">
          <span>
            신규{" "}
            <strong className="font-semibold tabular-nums text-foreground">{stageSummary.new}</strong>
          </span>
          <span className="hidden sm:inline">·</span>
          <span>
            검토 중{" "}
            <strong className="font-semibold tabular-nums text-foreground">
              {stageSummary.qualified}
            </strong>
          </span>
          <span className="hidden sm:inline">·</span>
          <span>
            견적 단계{" "}
            <strong className="font-semibold tabular-nums text-foreground">{stageSummary.quoted}</strong>
          </span>
        </div>
      ) : null}

      {hasInquiries ? (
        <OpsToolbar>
          <OpsSearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="제목, 내용, 고객명, 채널…"
          />
          <Select
            value={stageFilter}
            onValueChange={(v) => setStageFilter((v as InquiryStage | "all") ?? "all")}
          >
            <SelectTrigger className="h-9 w-full sm:w-[150px]">
              <SelectValue placeholder="단계" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 단계</SelectItem>
              {inquiryStageOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={followupFilter}
            onValueChange={(v) => setFollowupFilter((v as FollowupFilter) ?? "all")}
          >
            <SelectTrigger className="h-9 w-full sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">팔로업 전체</SelectItem>
              <SelectItem value="overdue">일정 지남</SelectItem>
              <SelectItem value="week">7일 이내</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortKey} onValueChange={(v) => setSortKey((v as InquirySort) ?? "created_desc")}>
            <SelectTrigger className="h-9 w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">최신 등록순</SelectItem>
              <SelectItem value="followup_asc">팔로업 임박순</SelectItem>
              <SelectItem value="followup_desc">팔로업 늦은순</SelectItem>
            </SelectContent>
          </Select>
        </OpsToolbar>
      ) : null}

      {hasInquiries && !filteredInquiries.length ? (
        <EmptyState
          title="조건에 맞는 문의가 없습니다"
          description="검색·필터를 조정하거나 새 문의를 등록해 보세요."
        />
      ) : null}

      {hasInquiries && filteredInquiries.length > 0 ? (
        <OpsTableShell className="hidden md:block">
          <table className={cn(opsTableClass, "min-w-[900px]")}>
            <thead>
              <tr className={opsTableHeadRowClass}>
                <th className={cn(opsTableHeadCellClass, "w-10")} aria-label="펼침" />
                <th className={opsTableHeadCellClass}>제목</th>
                <th className={opsTableHeadCellClass}>고객</th>
                <th className={opsTableHeadCellClass}>채널</th>
                <th className={opsTableHeadCellClass}>단계</th>
                <th className={cn(opsTableHeadCellClass, "text-right")}>예산</th>
                <th className={opsTableHeadCellClass}>팔로업</th>
                <th className={opsTableHeadCellClass}>등록일</th>
                <th className={cn(opsTableHeadCellClass, "w-12 text-right")} aria-label="작업" />
              </tr>
            </thead>
            <tbody>
              {filteredInquiries.map((inquiry) => {
                const customer = inquiry.customer
                const open = expandedId === inquiry.id
                const overdue =
                  inquiry.followUpAt && new Date(inquiry.followUpAt).getTime() < Date.now()
                return (
                  <Fragment key={inquiry.id}>
                    <tr
                      className={cn(opsTableRowClass, "cursor-pointer")}
                      data-state={open ? "open" : undefined}
                      onClick={() => setExpandedId((id) => (id === inquiry.id ? null : inquiry.id))}
                    >
                      <td className={cn(opsTableCellClass, "text-muted-foreground")}>
                        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </td>
                      <td className={cn(opsTableCellClass, "max-w-[220px] font-medium")}>
                        <span className="line-clamp-2">{inquiry.title}</span>
                        <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground line-clamp-1">
                          {inquiry.serviceCategory}
                        </span>
                      </td>
                      <td className={cn(opsTableCellClass, "max-w-[140px] truncate text-sm")}>
                        {customer?.companyName ?? customer?.name ?? "—"}
                      </td>
                      <td className={cn(opsTableCellClass, "text-xs text-muted-foreground")}>
                        {inquiry.channel}
                      </td>
                      <td className={opsTableCellClass} onClick={(e) => e.stopPropagation()}>
                        <InquiryStageBadge stage={inquiry.stage} />
                      </td>
                      <td
                        className={cn(
                          opsTableCellClass,
                          "text-right text-xs tabular-nums text-muted-foreground"
                        )}
                      >
                        {formatCurrency(inquiry.budgetMin ?? 0)}–{formatCurrency(inquiry.budgetMax ?? 0)}
                      </td>
                      <td
                        className={cn(
                          opsTableCellClass,
                          "whitespace-nowrap text-xs",
                          overdue ? "font-medium text-destructive" : "text-muted-foreground"
                        )}
                      >
                        {inquiry.followUpAt ? formatDateTime(inquiry.followUpAt) : "—"}
                      </td>
                      <td className={cn(opsTableCellClass, "whitespace-nowrap text-xs text-muted-foreground")}>
                        {formatDate(inquiry.createdAt)}
                      </td>
                      <td className={cn(opsTableCellClass, "text-right")} onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "size-8")}
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="gap-2" onClick={() => openEdit(inquiry)}>
                              <Pencil className="size-4" />
                              수정
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() =>
                                router.push(`/quotes?customer=${inquiry.customerId}&new=1`)
                              }
                            >
                              <ArrowRight className="size-4" />
                              견적 작성
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {inquiryStageOptions.map((o) => (
                              <DropdownMenuItem
                                key={o.value}
                                disabled={o.value === inquiry.stage || isPending}
                                onClick={() => quickUpdateStage(inquiry, o.value)}
                              >
                                단계 → {o.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                    {open ? (
                      <tr className="bg-muted/15">
                        <td colSpan={9} className="border-b border-border/50 px-4 py-4">
                          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground">문의 내용</p>
                              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                                {inquiry.details?.trim() || "내용 없음"}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <span>고객과 연결된 문의입니다.</span>
                                {inquiry.stage === "quoted" ? (
                                  <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-px text-primary">
                                    견적 단계 진행 중
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                              <Button size="sm" variant="outline" onClick={() => openEdit(inquiry)}>
                                수정
                              </Button>
                              <Button
                                size="sm"
                                onClick={() =>
                                  router.push(`/quotes?customer=${inquiry.customerId}&new=1`)
                                }
                              >
                                견적 작성
                              </Button>
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

      {hasInquiries && filteredInquiries.length > 0 ? (
        <div className="space-y-2 md:hidden">
          {filteredInquiries.map((inquiry) => {
            const customer = inquiry.customer
            return (
              <div
                key={inquiry.id}
                className="rounded-xl border border-border/60 bg-card p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <InquiryStageBadge stage={inquiry.stage} />
                    <p className="mt-1 font-medium leading-snug">{inquiry.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {customer?.companyName ?? customer?.name} · {inquiry.channel}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => openEdit(inquiry)}>
                    수정
                  </Button>
                </div>
                <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{inquiry.details}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={() => router.push(`/quotes?customer=${inquiry.customerId}&new=1`)}
                  >
                    견적
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
