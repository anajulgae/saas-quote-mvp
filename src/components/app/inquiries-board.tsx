"use client"

import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowRight,
  CalendarDays,
  ExternalLink,
  ListOrdered,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  UserPlus,
} from "lucide-react"
import { toast } from "sonner"

import { createInquiryAction, deleteInquiryAction, updateInquiryAction } from "@/app/actions"
import { InquiryAiAnalysisPanel } from "@/components/app/inquiry-ai-analysis-panel"
import { CoreCapabilityStrip } from "@/components/app/core-capability-strip"
import { EmptyState } from "@/components/app/empty-state"
import { InquiryFormShareDialog } from "@/components/app/inquiry-form-share-dialog"
import { PageHeader } from "@/components/app/page-header"
import { OpsToolbarFilterButton } from "@/components/app/ops-status-chip"
import { OpsCollapsibleFilters } from "@/components/operations/ops-collapsible-filters"
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
import { OpsCalendarView } from "@/components/operations/ops-calendar-view"
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
import { mapInquiriesToCalendarEvents } from "@/lib/calendar-events"
import type { PublicInquiryFormSnippet } from "@/lib/data"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format"
import { planAllowsFeature } from "@/lib/plan-features"
import { getInquiryStageMeta, opsStatusSelectTriggerClass } from "@/lib/ops-status-meta"
import { cn } from "@/lib/utils"
import type { BillingPlan, Customer, InquiryWithCustomer, InquiryStage } from "@/types/domain"

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
type InquiryViewMode = "list" | "calendar"

const flowSteps = [
  { step: 1, title: "고객 등록", hint: "거래처를 먼저 등록합니다" },
  { step: 2, title: "문의 등록", hint: "채널·일정·예산을 함께 기록합니다" },
  { step: 3, title: "견적 단계로 이동", hint: "견적 메뉴에서 이어서 진행합니다" },
] as const

const inquiryStageSelectItems = Object.fromEntries(
  inquiryStageOptions.map((o) => [o.value, o.label])
) as Record<string, string>

const followupFilterSelectItems: Record<string, string> = {
  all: "팔로업 전체",
  overdue: "일정 지남",
  week: "7일 이내",
}

const inquirySortSelectItems: Record<string, string> = {
  created_desc: "최신 등록순",
  followup_asc: "팔로업 임박순",
  followup_desc: "팔로업 늦은순",
}

export function InquiriesBoard({
  inquiries,
  customers,
  stageSummary: _stageSummaryFromServer,
  initialCustomerId,
  initialCreateOpen = false,
  publicInquiryForm,
  siteOrigin,
  isDemoWorkspace,
  currentPlan,
}: {
  inquiries: InquiryWithCustomer[]
  customers: Customer[]
  stageSummary: Record<"new" | "qualified" | "quoted", number>
  /** 고객 카드 등에서 전달: `/inquiries?customer=uuid&new=1` */
  initialCustomerId?: string
  initialCreateOpen?: boolean
  publicInquiryForm: PublicInquiryFormSnippet | null
  siteOrigin: string
  isDemoWorkspace: boolean
  currentPlan: BillingPlan
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const flowStepsRef = useRef<HTMLDivElement>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [stageFilter, setStageFilter] = useState<InquiryStage | "all">("all")
  const [followupFilter, setFollowupFilter] = useState<FollowupFilter>("all")
  const [sortKey, setSortKey] = useState<InquirySort>("created_desc")
  const [drawerInquiryId, setDrawerInquiryId] = useState<string | null>(null)
  const [extraFiltersOpen, setExtraFiltersOpen] = useState(false)
  const [channelFilter, setChannelFilter] = useState<string>("all")
  const [customerFilterId, setCustomerFilterId] = useState<string | "all">("all")
  const [structureBusy, setStructureBusy] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<InquiryWithCustomer | null>(null)
  const [flashHighlightInquiryId, setFlashHighlightInquiryId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<InquiryViewMode>("list")
  const deepLinkAppliedRef = useRef(false)
  const focusHandledRef = useRef<string | null>(null)
  const aiAssistEnabled = planAllowsFeature(currentPlan, "ai_assist")

  type InquiryOptimisticPatch = { type: "stage"; id: string; stage: InquiryStage }

  const [optimisticInquiries, patchInquiryOptimistic] = useOptimistic(
    inquiries,
    (state, action: InquiryOptimisticPatch) => {
      if (action.type === "stage") {
        return state.map((i) => (i.id === action.id ? { ...i, stage: action.stage } : i))
      }
      return state
    }
  )

  const displayStageSummary = useMemo(() => {
    let n = 0
    let qualified = 0
    let quoted = 0
    for (const i of optimisticInquiries) {
      if (i.stage === "new") {
        n += 1
      } else if (i.stage === "qualified") {
        qualified += 1
      } else if (i.stage === "quoted") {
        quoted += 1
      }
    }
    return { new: n, qualified, quoted }
  }, [optimisticInquiries])

  const publicFormUrl =
    publicInquiryForm?.publicInquiryFormEnabled && publicInquiryForm.publicInquiryFormToken
      ? `${siteOrigin.replace(/\/$/, "")}/request/${publicInquiryForm.publicInquiryFormToken}`
      : ""

  useEffect(() => {
    if (!initialCreateOpen && !initialCustomerId?.trim()) {
      deepLinkAppliedRef.current = false
    }
  }, [initialCreateOpen, initialCustomerId])

  useEffect(() => {
    const fid = searchParams.get("focus")?.trim()
    if (!fid || focusHandledRef.current === fid) {
      return
    }
    focusHandledRef.current = fid
    setDrawerInquiryId(fid)
    setFlashHighlightInquiryId(fid)
    const t = window.setTimeout(() => setFlashHighlightInquiryId(null), 6500)
    const q = new URLSearchParams(searchParams.toString())
    q.delete("focus")
    const qs = q.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    return () => window.clearTimeout(t)
  }, [searchParams, router, pathname])

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
    () => optimisticInquiries.find((item) => item.id === editingId) ?? null,
    [editingId, optimisticInquiries]
  )

  const drawerInquiry = useMemo(
    () => optimisticInquiries.find((item) => item.id === drawerInquiryId) ?? null,
    [drawerInquiryId, optimisticInquiries]
  )

  const drawerInquiryStageMeta = drawerInquiry ? getInquiryStageMeta(drawerInquiry.stage) : null

  const channelOptions = useMemo(() => {
    const set = new Set<string>(["웹폼"])
    for (const i of optimisticInquiries) {
      if (i.channel?.trim()) {
        set.add(i.channel.trim())
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, "ko"))
  }, [optimisticInquiries])

  const inquiryFormCustomerSelectItems = useMemo(() => {
    const r: Record<string, string> = {}
    for (const c of customers) {
      r[c.id] = c.companyName ?? c.name
    }
    return r
  }, [customers])

  const channelFilterSelectItems = useMemo(() => {
    const r: Record<string, string> = { all: "전체 채널" }
    for (const ch of channelOptions) {
      r[ch] = ch
    }
    return r
  }, [channelOptions])

  const inquiryListCustomerFilterItems = useMemo(() => {
    const r: Record<string, string> = { all: "전체 고객" }
    for (const c of customers) {
      r[c.id] = c.companyName ?? c.name
    }
    return r
  }, [customers])

  useEffect(() => {
    if (deepLinkAppliedRef.current) {
      return
    }
    if (!initialCreateOpen || !initialCustomerId?.trim()) {
      return
    }
    const id = initialCustomerId.trim()
    if (!customers.some((c) => c.id === id)) {
      deepLinkAppliedRef.current = true
      toast.error("연결할 고객을 찾을 수 없습니다.")
      router.replace("/inquiries")
      return
    }
    deepLinkAppliedRef.current = true
    setForm((current) => ({ ...current, customerId: id }))
    setErrorMessage("")
    setEditingId(null)
    setIsCreateOpen(true)
    router.replace("/inquiries")
  }, [initialCreateOpen, initialCustomerId, customers, router])

  const filteredInquiries = useMemo(() => {
    let list = [...optimisticInquiries]
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
    if (channelFilter !== "all") {
      list = list.filter((i) => (i.channel ?? "").trim() === channelFilter)
    }
    if (customerFilterId !== "all") {
      list = list.filter((i) => i.customerId === customerFilterId)
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
  }, [
    optimisticInquiries,
    searchQuery,
    stageFilter,
    channelFilter,
    customerFilterId,
    followupFilter,
    sortKey,
  ])

  const inquiryCalendarEvents = useMemo(
    () => mapInquiriesToCalendarEvents(filteredInquiries),
    [filteredInquiries]
  )

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

      if (result.ok && result.inquiryId && aiAssistEnabled) {
        void fetch("/api/ai/inquiry-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ inquiryId: result.inquiryId, force: true }),
        })
          .then(() => router.refresh())
          .catch(() => {})
      }
    })
  }

  const handleEdit = () => {
    if (!editingInquiry) {
      return
    }

    setErrorMessage("")

    startTransition(async () => {
      if (form.stage !== editingInquiry.stage) {
        patchInquiryOptimistic({ type: "stage", id: editingInquiry.id, stage: form.stage })
      }
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
    setDrawerInquiryId(null)
    setIsCreateOpen(false)
    setEditingId(inquiry.id)
    setErrorMessage("")
    setForm(inquiryToFormFields(inquiry))
  }

  const quickUpdateStage = (inquiry: InquiryWithCustomer, stage: InquiryStage) => {
    const payload = { ...inquiryToFormFields(inquiry), stage }
    startTransition(async () => {
      patchInquiryOptimistic({ type: "stage", id: inquiry.id, stage })
      const result = await updateInquiryAction(inquiry.id, payload)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      router.refresh()
    })
  }

  const runDeleteInquiry = () => {
    if (!deleteTarget) return
    const id = deleteTarget.id
    startTransition(async () => {
      const result = await deleteInquiryAction(id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setDeleteTarget(null)
      toast.success("문의를 삭제했습니다.")
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

  const runAiStructure = () => {
    const raw = form.details.trim()
    if (raw.length < 8) {
      toast.error("상세 요청에 문의 원문을 먼저 붙여 넣어 주세요.")
      return
    }
    setStructureBusy(true)
    void (async () => {
      try {
        const res = await fetch("/api/ai/inquiry-structure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ rawText: raw }),
        })
        const data = (await res.json()) as {
          error?: string
          structured?: {
            title: string
            channel: string
            scopeSummary: string
            structuredSummary: string
            followUpNote: string
          }
        }
        if (!res.ok) {
          toast.error(data.error ?? "구조화에 실패했습니다.")
          return
        }
        const s = data.structured
        if (!s) {
          toast.error("응답이 올바르지 않습니다.")
          return
        }
        setForm((current) => ({
          ...current,
          title: s.title || current.title,
          serviceCategory: s.scopeSummary || current.serviceCategory,
          channel: s.channel || current.channel,
          details: [s.structuredSummary, s.followUpNote ? `■ 팔로업\n${s.followUpNote}` : ""]
            .filter(Boolean)
            .join("\n\n"),
        }))
        toast.success("AI가 제목·채널·범위·요약을 채웠습니다.", {
          description: "내용을 검토한 뒤 저장해 주세요.",
        })
      } catch {
        toast.error("네트워크 오류로 구조화에 실패했습니다.")
      } finally {
        setStructureBusy(false)
      }
    })()
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
            items={inquiryFormCustomerSelectItems}
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
            items={inquiryStageSelectItems}
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-sm font-medium">상세 요청</label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={structureBusy}
            onClick={runAiStructure}
          >
            {structureBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            AI로 필드 채우기
          </Button>
        </div>
        <p className="text-sm leading-snug text-muted-foreground">
          카톡·메일 등 원문을 붙인 뒤 버튼을 누르면 제목·채널·범위·요약이 정리됩니다. 고객은 반드시 직접 선택합니다.
        </p>
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
        description="웹폼·고객 포털에서 들어온 요청을 단계·팔로업·캘린더로 묶고, 상세에서 AI 운영 분석·정리 후 견적으로 넘깁니다."
        capabilityStrip={
          <CoreCapabilityStrip
            items={[
              { label: "공개 문의 폼", href: "/settings#public-inquiry", emphasis: true },
              { label: "고객 포털 링크", href: "/customers" },
              { label: "AI 문의·운영 분석", href: undefined },
              { label: "캘린더·알림", href: "/settings#notifications-prefs" },
            ]}
          />
        }
        action={
          <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:items-end">
            <div className="flex w-full flex-wrap justify-end gap-2">
              {isDemoWorkspace ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9"
                  disabled
                  title="데모 워크스페이스에서는 공개 문의 폼을 쓸 수 없습니다"
                >
                  <Share2 className="size-3.5" aria-hidden />
                  공개 문의 폼
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5"
                  onClick={() => setShareOpen(true)}
                >
                  <Share2 className="size-3.5" aria-hidden />
                  공개 문의 폼
                </Button>
              )}
            </div>
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
                <p className="mt-2 border-t border-border/50 pt-2 text-center text-sm leading-snug text-muted-foreground sm:text-left">
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
              <p className="text-xs font-semibold tracking-wide text-primary uppercase">빠른 시작</p>
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
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
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
                        "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
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
                      <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{item.hint}</p>
                      {item.step === 3 ? (
                        <p className="mt-1.5 text-sm leading-snug text-muted-foreground/90">
                          문의 등록 후 견적 메뉴에서 진행하세요
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-lg border border-dashed border-primary/20 bg-primary/[0.03] px-3 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">확장 기능</p>
              <p className="mt-1 text-sm leading-snug text-muted-foreground">
                설정에서 공개 문의 URL을 켜 두면 고객이 직접 접수하고, 알림·이메일로 운영자에게 전달됩니다. Pro에서는 고객
                포털로 견적·청구 요약도 넘길 수 있습니다.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Link
                  href="/settings#public-inquiry"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}
                >
                  공개 문의 설정
                </Link>
                <Link href="/customers" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 text-xs")}>
                  고객 포털(목록)
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!isEmptyInquiries ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border/50 bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
          <span>
            신규{" "}
            <strong className="font-semibold tabular-nums text-foreground">{displayStageSummary.new}</strong>
          </span>
          <span className="hidden sm:inline">·</span>
          <span>
            검토 중{" "}
            <strong className="font-semibold tabular-nums text-foreground">
              {displayStageSummary.qualified}
            </strong>
          </span>
          <span className="hidden sm:inline">·</span>
          <span>
            견적 단계{" "}
            <strong className="font-semibold tabular-nums text-foreground">{displayStageSummary.quoted}</strong>
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
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <p className="text-xs font-medium text-muted-foreground">단계</p>
            <div className="flex flex-wrap gap-1.5">
              <OpsToolbarFilterButton
                selected={stageFilter === "all"}
                onClick={() => setStageFilter("all")}
              >
                전체
              </OpsToolbarFilterButton>
              {inquiryStageOptions.map((o) => (
                <OpsToolbarFilterButton
                  key={o.value}
                  selected={stageFilter === o.value}
                  onClick={() => setStageFilter(o.value)}
                >
                  {o.label}
                </OpsToolbarFilterButton>
              ))}
            </div>
          </div>
          <Select
            value={followupFilter}
            items={followupFilterSelectItems}
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
          <Select
            value={sortKey}
            items={inquirySortSelectItems}
            onValueChange={(v) => setSortKey((v as InquirySort) ?? "created_desc")}
          >
            <SelectTrigger className="h-9 w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">최신 등록순</SelectItem>
              <SelectItem value="followup_asc">팔로업 임박순</SelectItem>
              <SelectItem value="followup_desc">팔로업 늦은순</SelectItem>
            </SelectContent>
          </Select>
          <OpsCollapsibleFilters open={extraFiltersOpen} onOpenChange={setExtraFiltersOpen}>
            <div className="min-w-0 flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">채널</label>
              <Select
                value={channelFilter}
                items={channelFilterSelectItems}
                onValueChange={(v) => setChannelFilter(v ?? "all")}
              >
                <SelectTrigger className="h-9 w-full sm:w-[160px]">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 채널</SelectItem>
                  {channelOptions.map((ch) => (
                    <SelectItem key={ch} value={ch}>
                      {ch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">고객</label>
              <Select
                value={customerFilterId}
                items={inquiryListCustomerFilterItems}
                onValueChange={(v) => setCustomerFilterId((v as string | null) ?? "all")}
              >
                <SelectTrigger className="h-9 w-full sm:min-w-[12rem]">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 고객</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.companyName ?? c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </OpsCollapsibleFilters>
        </OpsToolbar>
      ) : null}

      {hasInquiries ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/15 px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">보기 방식</p>
            <p className="text-sm leading-snug text-muted-foreground">
              리스트가 기본이며, 달력은 일정·희망일 확인용 보조 뷰입니다.
            </p>
          </div>
          <div className="inline-flex items-center rounded-lg border border-border/70 bg-background p-1">
            <button
              type="button"
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors",
                viewMode === "list"
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
              onClick={() => setViewMode("list")}
            >
              <ListOrdered className="size-3.5" />
              리스트
            </button>
            <button
              type="button"
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors",
                viewMode === "calendar"
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
              onClick={() => setViewMode("calendar")}
            >
              <CalendarDays className="size-3.5" />
              캘린더
            </button>
          </div>
        </div>
      ) : null}

      {hasInquiries && !filteredInquiries.length ? (
        <EmptyState
          title="조건에 맞는 문의가 없습니다"
          description="검색·필터를 조정하거나 새 문의를 등록해 보세요."
        />
      ) : null}

      {hasInquiries && filteredInquiries.length > 0 && viewMode === "calendar" ? (
        <OpsCalendarView
          events={inquiryCalendarEvents}
          emptyTitle="날짜가 지정된 문의 일정이 없습니다"
          emptyDescription="현재 필터 조건에서는 팔로업 일정이나 고객 희망 일정이 잡힌 문의가 없습니다."
          onEventClick={(event) => setDrawerInquiryId(event.relatedEntityId)}
        />
      ) : null}

      {hasInquiries && filteredInquiries.length > 0 && viewMode === "list" ? (
        <OpsTableShell className="hidden md:block">
          <table className={cn(opsTableClass, "!min-w-0 w-full max-w-full table-fixed")}>
            <thead>
              <tr className={opsTableHeadRowClass}>
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
                const overdue =
                  inquiry.followUpAt && new Date(inquiry.followUpAt).getTime() < Date.now()
                const stageMeta = getInquiryStageMeta(inquiry.stage)
                return (
                  <tr
                    key={inquiry.id}
                    className={cn(
                      opsTableRowClass,
                      "cursor-pointer",
                      flashHighlightInquiryId === inquiry.id &&
                        "bg-primary/[0.07] ring-1 ring-primary/25 transition-colors duration-500"
                    )}
                    data-state={drawerInquiryId === inquiry.id ? "selected" : undefined}
                    onClick={() => setDrawerInquiryId(inquiry.id)}
                  >
                      <td className={cn(opsTableCellClass, "max-w-[220px] font-medium")}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="line-clamp-2">{inquiry.title}</span>
                          {inquiry.channel === "웹폼" ? (
                            <span className="shrink-0 rounded border border-primary/25 bg-primary/[0.08] px-1.5 py-px text-xs font-medium text-primary">
                              웹폼
                            </span>
                          ) : null}
                        </div>
                        <span className="mt-0.5 block text-xs font-normal text-muted-foreground line-clamp-1">
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
                        <Select
                          value={inquiry.stage}
                          items={inquiryStageSelectItems}
                          onValueChange={(value) => {
                            const next = (value as InquiryStage | null) ?? inquiry.stage
                            if (next === inquiry.stage) {
                              return
                            }
                            quickUpdateStage(inquiry, next)
                          }}
                        >
                          <SelectTrigger
                            className={cn(
                              "h-8 w-full min-w-0 max-w-[8.5rem] text-xs font-medium",
                              opsStatusSelectTriggerClass(stageMeta.tone, stageMeta.emphasis)
                            )}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {inquiryStageOptions.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="gap-2 text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(inquiry)}
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

      {hasInquiries && filteredInquiries.length > 0 && viewMode === "list" ? (
        <div className="space-y-2 md:hidden">
          {filteredInquiries.map((inquiry) => {
            const customer = inquiry.customer
            const mobStageMeta = getInquiryStageMeta(inquiry.stage)
            return (
              <button
                key={inquiry.id}
                type="button"
                className={cn(
                  "flex w-full flex-col gap-2 rounded-xl border border-border/60 bg-card p-3 text-left shadow-sm",
                  flashHighlightInquiryId === inquiry.id && "ring-2 ring-primary/30"
                )}
                onClick={() => setDrawerInquiryId(inquiry.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {inquiry.channel === "웹폼" ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded border border-primary/25 bg-primary/[0.08] px-1.5 py-px text-xs font-medium text-primary">
                          웹폼
                        </span>
                      </div>
                    ) : null}
                    <p className={cn("font-medium leading-snug", inquiry.channel === "웹폼" ? "mt-1" : "")}>
                      {inquiry.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {customer?.companyName ?? customer?.name} · {inquiry.channel}
                    </p>
                  </div>
                  <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={inquiry.stage}
                      items={inquiryStageSelectItems}
                      onValueChange={(value) => {
                        const next = (value as InquiryStage | null) ?? inquiry.stage
                        if (next === inquiry.stage) {
                          return
                        }
                        quickUpdateStage(inquiry, next)
                      }}
                    >
                      <SelectTrigger
                        className={cn(
                          "h-8 w-[7.25rem] text-xs font-medium",
                          opsStatusSelectTriggerClass(mobStageMeta.tone, mobStageMeta.emphasis)
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {inquiryStageOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{inquiry.details}</p>
              </button>
            )
          })}
        </div>
      ) : null}

      <OpsDetailSheet
        open={drawerInquiry !== null}
        onOpenChange={(o) => !o && setDrawerInquiryId(null)}
        title={drawerInquiry?.title ?? ""}
        description={
          drawerInquiry ? (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-xs font-medium text-foreground/85">
                {getInquiryStageMeta(drawerInquiry.stage).label}
              </span>
              <span className="text-muted-foreground">
                {drawerInquiry.customer?.companyName ?? drawerInquiry.customer?.name ?? "고객"} ·{" "}
                {formatDate(drawerInquiry.createdAt)} 등록
              </span>
            </span>
          ) : null
        }
        footer={
          drawerInquiry ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => openEdit(drawerInquiry)}>
                수정
              </Button>
              <Button
                size="sm"
                onClick={() => router.push(`/quotes?customer=${drawerInquiry.customerId}&new=1`)}
              >
                견적 작성
              </Button>
              <Link
                href={`/customers/${drawerInquiry.customerId}`}
                className={cn(buttonVariants({ size: "sm", variant: "outline" }), "inline-flex gap-1")}
              >
                <ExternalLink className="size-3.5" />
                고객 상세
              </Link>
            </div>
          ) : null
        }
      >
        {drawerInquiry ? (
          <div className="space-y-4 text-sm">
            <div className="grid gap-2 text-xs">
              <div className="flex justify-between gap-2 border-b border-border/40 py-1">
                <span className="text-muted-foreground">채널</span>
                <span>{drawerInquiry.channel || "—"}</span>
              </div>
              <div className="flex justify-between gap-2 border-b border-border/40 py-1">
                <span className="text-muted-foreground">서비스</span>
                <span className="text-right">{drawerInquiry.serviceCategory || "—"}</span>
              </div>
              <div className="flex justify-between gap-2 border-b border-border/40 py-1">
                <span className="text-muted-foreground">예산</span>
                <span className="tabular-nums">
                  {formatCurrency(drawerInquiry.budgetMin ?? 0)}–
                  {formatCurrency(drawerInquiry.budgetMax ?? 0)}
                </span>
              </div>
              <div className="flex justify-between gap-2 border-b border-border/40 py-1">
                <span className="text-muted-foreground">팔로업</span>
                <span className="text-right tabular-nums">
                  {drawerInquiry.followUpAt ? formatDateTime(drawerInquiry.followUpAt) : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-2 border-b border-border/40 py-1">
                <span className="text-muted-foreground">희망 일정</span>
                <span className="text-right tabular-nums">
                  {drawerInquiry.requestedDate ? formatDate(drawerInquiry.requestedDate) : "—"}
                </span>
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">문의 내용</p>
              <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                {drawerInquiry.details?.trim() || "내용 없음"}
              </p>
            </div>
            <InquiryAiAnalysisPanel inquiry={drawerInquiry} aiAssistEnabled={aiAssistEnabled} />
            <div className="space-y-2 rounded-lg border border-border/50 bg-muted/10 p-3">
              <p className="text-xs font-semibold text-muted-foreground">문의 단계</p>
              <Select
                value={drawerInquiry.stage}
                items={inquiryStageSelectItems}
                onValueChange={(value) => {
                  const next = (value as InquiryStage | null) ?? drawerInquiry.stage
                  if (next === drawerInquiry.stage) {
                    return
                  }
                  quickUpdateStage(drawerInquiry, next)
                }}
              >
                <SelectTrigger
                  className={cn(
                    "h-9 w-full font-medium",
                    drawerInquiryStageMeta &&
                      opsStatusSelectTriggerClass(
                        drawerInquiryStageMeta.tone,
                        drawerInquiryStageMeta.emphasis
                      )
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {inquiryStageOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">견적 연결</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {drawerInquiry.stage === "quoted"
                  ? "견적 단계로 옮겨진 문의입니다. 견적 목록에서 동일 고객 건을 확인하세요."
                  : "아직 견적 단계가 아닙니다. 아래 「견적 작성」으로 이어갈 수 있습니다."}
              </p>
            </div>
          </div>
        ) : null}
      </OpsDetailSheet>

      <InquiryFormShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        formUrl={publicFormUrl}
        businessName={publicInquiryForm?.businessName ?? ""}
      />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent className="max-w-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle>문의 삭제</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {deleteTarget ? (
                <>
                  「{deleteTarget.title}」 문의를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
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
              onClick={runDeleteInquiry}
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
