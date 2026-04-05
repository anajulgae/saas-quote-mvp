"use client"

import { useEffect, useMemo, useRef, useState, useTransition, type MutableRefObject } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Copy,
  Download,
  FileText,
  Link2,
  ListOrdered,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  createQuoteAction,
  deleteQuoteAction,
  duplicateQuoteAction,
  ensureQuoteShareLinkAction,
  logQuoteShareLinkCopiedAction,
  updateQuoteAction,
  updateQuoteStatusAction,
} from "@/app/actions"
import { EmptyState } from "@/components/app/empty-state"
import { PageHeader } from "@/components/app/page-header"
import { QuoteDraftAssistantForm } from "@/components/app/quote-draft-assistant"
import { QuoteSendDialog } from "@/components/app/quote-send-dialog"
import { PaymentStatusBadge, QuoteStatusBadge } from "@/components/app/status-badge"
import { resolveActivityHeadline } from "@/lib/activity-presentation"
import { OpsDetailSheet } from "@/components/operations/ops-detail-sheet"
import { OpsSearchField } from "@/components/operations/ops-search-field"
import { OpsTableShell } from "@/components/operations/ops-table-shell"
import { OpsToolbar } from "@/components/operations/ops-toolbar"
import {
  opsTableCellClass,
  opsTableClass,
  opsTableHeadCellClass,
  opsTableHeadRowClass,
  opsTableRowClass,
} from "@/components/operations/ops-table-styles"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  inquiryStageOptions,
  quoteStatusOptions,
} from "@/lib/constants"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format"
import {
  customerPrimaryLabel,
  formatKrwDigitsInput,
  getQuoteValidityHint,
  parseAmountInput,
  quoteSearchHaystack,
  type QuoteListSort,
} from "@/lib/quote-utils"
import { cn } from "@/lib/utils"
import type {
  ActivityLog,
  Customer,
  InquiryWithCustomer,
  QuoteLinkedInvoiceStub,
  QuoteStatus,
  QuoteWithItems,
} from "@/types/domain"

type QuoteItemForm = {
  name: string
  description: string
  quantity: string
  unitPrice: string
}

type QuoteFormState = {
  customerId: string
  inquiryId: string
  title: string
  summary: string
  status: QuoteStatus
  validUntil: string
  sentAt: string
  items: QuoteItemForm[]
}

function defaultValidUntilDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return d.toISOString().slice(0, 10)
}

function createEmptyItem(): QuoteItemForm {
  return {
    name: "",
    description: "",
    quantity: "1",
    unitPrice: "0",
  }
}

function formatCustomerSelectLabel(customer: Customer): string {
  const primary = customer.companyName?.trim() || customer.name
  const secondary = [
    customer.companyName ? customer.name : null,
    customer.email || null,
    customer.phone || null,
  ]
    .filter(Boolean)
    .join(" · ")
  return secondary ? `${primary} — ${secondary}` : primary
}

function buildQuoteTitleFromInquiry(
  inv: InquiryWithCustomer,
  customers: Customer[]
): string {
  const base = inv.title.trim()
  if (base) {
    return `${base} — 견적`
  }
  const c = customers.find((x) => x.id === inv.customerId)
  const label = c?.companyName?.trim() || c?.name || "견적"
  return `${label} 견적`
}

function buildQuoteSummaryFromInquiry(
  inv: InquiryWithCustomer,
  defaultSummary: string
): string {
  const parts = [
    inv.details?.trim(),
    inv.serviceCategory?.trim() ? `서비스: ${inv.serviceCategory}` : "",
    defaultSummary?.trim(),
  ].filter(Boolean) as string[]
  return parts.join("\n\n")
}

function createEmptyForm(customers: Customer[], defaultSummary = ""): QuoteFormState {
  return {
    customerId: customers[0]?.id ?? "",
    inquiryId: "",
    title: "",
    summary: defaultSummary,
    status: "draft",
    validUntil: defaultValidUntilDate(),
    sentAt: "",
    items: [createEmptyItem()],
  }
}

function stripKrwForEdit(raw: string): string {
  const n = parseAmountInput(raw)
  if (!Number.isFinite(n)) {
    return raw.replace(/,/g, "")
  }
  return String(Math.round(n))
}

function toFormState(quote: QuoteWithItems): QuoteFormState {
  return {
    customerId: quote.customerId,
    inquiryId: quote.inquiryId ?? "",
    title: quote.title,
    summary: quote.summary,
    status: quote.status,
    validUntil: quote.validUntil ?? "",
    sentAt: quote.sentAt ?? "",
    items: quote.items.length
      ? quote.items.map((item) => ({
          name: item.name,
          description: item.description ?? "",
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
        }))
      : [createEmptyItem()],
  }
}

const flowSteps = [
  { step: 1, title: "문의 선택", hint: "연결할 문의를 고릅니다" },
  { step: 2, title: "금액·항목 작성", hint: "항목·단가·세액을 정리합니다" },
  { step: 3, title: "발송·상태 관리", hint: "발송 후 승인 등 상태를 추적합니다" },
] as const

/** Select 내부 값 전용(라벨과 다름). 트리거에는 표시하지 않음 */
const NO_LINKED_INQUIRY = "flowbill:no-inquiry"

function QuotesBoardPanel({
  quotes,
  customers,
  inquiries,
  defaultQuoteSummary,
  defaultPaymentTerms,
  defaultBusinessName,
  isCreateOpen,
  onOpenChange,
  createOpenSourceRef,
  deepLinkCustomerId,
  deepLinkOpenCreate,
  nextQuoteNumberPreview,
  quoteActivityByQuoteId,
  invoicesByQuoteId,
}: {
  quotes: QuoteWithItems[]
  customers: Customer[]
  inquiries: InquiryWithCustomer[]
  defaultQuoteSummary: string
  defaultPaymentTerms: string
  defaultBusinessName: string
  isCreateOpen: boolean
  onOpenChange: (open: boolean) => void
  /** 헤더「새 견적」으로 열 때만 빈 폼으로 초기화 */
  createOpenSourceRef: MutableRefObject<"header" | null>
  deepLinkCustomerId?: string
  deepLinkOpenCreate?: boolean
  nextQuoteNumberPreview: string
  quoteActivityByQuoteId: Record<string, ActivityLog[]>
  invoicesByQuoteId: Record<string, QuoteLinkedInvoiceStub[]>
}) {
  const router = useRouter()
  const flowRef = useRef<HTMLDivElement>(null)
  const [isPending, startTransition] = useTransition()
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [customerFilterId, setCustomerFilterId] = useState<string | "all">("all")
  const [createdFrom, setCreatedFrom] = useState("")
  const [createdTo, setCreatedTo] = useState("")
  const [amountMin, setAmountMin] = useState("")
  const [amountMax, setAmountMax] = useState("")
  const [sortBy, setSortBy] = useState<QuoteListSort>("created_desc")
  const [statusConfirm, setStatusConfirm] = useState<{
    quote: QuoteWithItems
    next: QuoteStatus
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<QuoteWithItems | null>(null)
  const [drawerQuoteId, setDrawerQuoteId] = useState<string | null>(null)
  const [draftAssistantOpen, setDraftAssistantOpen] = useState(false)
  const [sendQuoteTarget, setSendQuoteTarget] = useState<QuoteWithItems | null>(null)
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false)
  const [quickInquiryId, setQuickInquiryId] = useState(inquiries[0]?.id ?? "")
  const [form, setForm] = useState<QuoteFormState>(() =>
    createEmptyForm(customers, defaultQuoteSummary)
  )

  const hasInquiries = inquiries.length > 0
  const hasQuotes = quotes.length > 0
  const quoteDeepLinkDoneRef = useRef(false)

  useEffect(() => {
    if (quoteDeepLinkDoneRef.current) {
      return
    }
    if (!deepLinkOpenCreate || !deepLinkCustomerId?.trim()) {
      return
    }
    const id = deepLinkCustomerId.trim()
    if (!customers.some((c) => c.id === id)) {
      return
    }
    quoteDeepLinkDoneRef.current = true
    setEditingQuoteId(null)
    setErrorMessage("")
    setForm({
      ...createEmptyForm(customers, defaultQuoteSummary),
      customerId: id,
    })
    onOpenChange(true)
  }, [
    deepLinkOpenCreate,
    deepLinkCustomerId,
    customers,
    defaultQuoteSummary,
    onOpenChange,
  ])

  useEffect(() => {
    setQuickInquiryId((current) => {
      if (current && inquiries.some((i) => i.id === current)) {
        return current
      }
      return inquiries[0]?.id ?? ""
    })
  }, [inquiries])

  useEffect(() => {
    if (!isCreateOpen) {
      return
    }
    if (createOpenSourceRef.current === "header") {
      setEditingQuoteId(null)
      setErrorMessage("")
      setForm(createEmptyForm(customers, defaultQuoteSummary))
    }
    createOpenSourceRef.current = null
  }, [isCreateOpen, customers, defaultQuoteSummary, createOpenSourceRef])

  const availableInquiries = useMemo(() => {
    if (!form.customerId) {
      return []
    }
    return inquiries.filter((inquiry) => inquiry.customerId === form.customerId)
  }, [form.customerId, inquiries])

  const formValidation = useMemo(() => {
    const issues: { key: string; text: string }[] = []
    if (!form.customerId) {
      issues.push({
        key: "customer",
        text: "거래처(고객)를 목록에서 선택해 주세요.",
      })
    }
    if (!form.title.trim()) {
      issues.push({
        key: "title",
        text: "견적 제목을 한 줄 이상 입력해 주세요.",
      })
    }
    const emptyNameRows: number[] = []
    const badQtyRows: number[] = []
    const badPriceRows: number[] = []
    form.items.forEach((item, index) => {
      const row = index + 1
      if (!item.name.trim()) {
        emptyNameRows.push(row)
      }
      const q = parseAmountInput(item.quantity)
      const p = parseAmountInput(item.unitPrice)
      if (!Number.isFinite(q) || q <= 0) {
        badQtyRows.push(row)
      }
      if (!Number.isFinite(p) || p < 0) {
        badPriceRows.push(row)
      }
    })
    if (emptyNameRows.length > 0) {
      const head = emptyNameRows.slice(0, 4).join(", ")
      const tail =
        emptyNameRows.length > 4 ? ` … 외 ${emptyNameRows.length - 4}줄` : ""
      issues.push({
        key: "item-names",
        text: `견적 항목: ${head}번째 줄의 항목명이 비어 있습니다. (각 줄마다 이름 필요)${tail}`,
      })
    }
    if (badQtyRows.length > 0) {
      issues.push({
        key: "qty",
        text: `수량: ${badQtyRows.slice(0, 4).join(", ")}번째 줄은 0보다 큰 숫자로 입력해 주세요.${
          badQtyRows.length > 4 ? ` … 외 ${badQtyRows.length - 4}줄` : ""
        }`,
      })
    }
    if (badPriceRows.length > 0) {
      issues.push({
        key: "price",
        text: `단가: ${badPriceRows.slice(0, 4).join(", ")}번째 줄은 0 이상 숫자로 입력해 주세요.${
          badPriceRows.length > 4 ? ` … 외 ${badPriceRows.length - 4}줄` : ""
        }`,
      })
    }
    return { ok: issues.length === 0, issues }
  }, [form])

  const validationSummaryForTitle = useMemo(
    () => formValidation.issues.map((i) => i.text).join("\n"),
    [formValidation.issues]
  )

  const selectedCustomerLabel = useMemo(() => {
    const c = customers.find((x) => x.id === form.customerId)
    return c ? formatCustomerSelectLabel(c) : ""
  }, [customers, form.customerId])

  const selectedInquiryTriggerLabel = useMemo(() => {
    if (!form.customerId) {
      return ""
    }
    if (!form.inquiryId) {
      return availableInquiries.length === 0 ? "연결 가능한 문의 없음" : "문의 선택 안 함"
    }
    const inv = inquiries.find((i) => i.id === form.inquiryId)
    if (!inv) {
      return "문의 선택 안 함"
    }
    const stage =
      inquiryStageOptions.find((o) => o.value === inv.stage)?.label ?? ""
    return stage ? `${inv.title} · ${stage}` : inv.title
  }, [form.customerId, form.inquiryId, inquiries, availableInquiries])

  const processedQuotes = useMemo(() => {
    let list = [...quotes]
    if (statusFilter !== "all") {
      list = list.filter((q) => q.status === statusFilter)
    }
    const needle = searchQuery.trim().toLowerCase()
    if (needle) {
      list = list.filter((row) => quoteSearchHaystack(row, row.customer).includes(needle))
    }
    if (customerFilterId !== "all") {
      list = list.filter((row) => row.customerId === customerFilterId)
    }
    if (createdFrom.trim()) {
      const from = new Date(createdFrom).getTime()
      list = list.filter((row) => new Date(row.createdAt).getTime() >= from)
    }
    if (createdTo.trim()) {
      const to = new Date(`${createdTo}T23:59:59.999`).getTime()
      list = list.filter((row) => new Date(row.createdAt).getTime() <= to)
    }
    const minA = amountMin.trim() ? parseAmountInput(amountMin) : null
    const maxA = amountMax.trim() ? parseAmountInput(amountMax) : null
    if (minA !== null && Number.isFinite(minA)) {
      list = list.filter((row) => row.total >= minA)
    }
    if (maxA !== null && Number.isFinite(maxA)) {
      list = list.filter((row) => row.total <= maxA)
    }
    if (sortBy === "created_desc") {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else if (sortBy === "total_desc") {
      list.sort((a, b) => b.total - a.total)
    } else {
      list.sort((a, b) => {
        const av = a.validUntil ? new Date(a.validUntil).getTime() : Number.POSITIVE_INFINITY
        const bv = b.validUntil ? new Date(b.validUntil).getTime() : Number.POSITIVE_INFINITY
        return av - bv
      })
    }
    return list
  }, [
    quotes,
    statusFilter,
    searchQuery,
    customerFilterId,
    createdFrom,
    createdTo,
    amountMin,
    amountMax,
    sortBy,
  ])

  const previewTotal = useMemo(() => {
    const subtotal = form.items.reduce((sum, item) => {
      const quantity = parseAmountInput(item.quantity)
      const unitPrice = parseAmountInput(item.unitPrice)
      const q = Number.isFinite(quantity) ? quantity : 0
      const p = Number.isFinite(unitPrice) ? unitPrice : 0
      return sum + q * p
    }, 0)

    const tax = Math.round(subtotal * 0.1)

    return {
      subtotal,
      tax,
      total: subtotal + tax,
    }
  }, [form.items])

  const resetForm = () => {
    setForm(createEmptyForm(customers, defaultQuoteSummary))
    setEditingQuoteId(null)
    setErrorMessage("")
  }

  const drawerQuote = useMemo(() => {
    if (!drawerQuoteId) {
      return null
    }
    return quotes.find((q) => q.id === drawerQuoteId) ?? null
  }, [drawerQuoteId, quotes])

  const drawerQuoteActivities = useMemo(() => {
    if (!drawerQuoteId) {
      return []
    }
    return quoteActivityByQuoteId[drawerQuoteId] ?? []
  }, [drawerQuoteId, quoteActivityByQuoteId])

  const drawerQuoteInvoices = useMemo(() => {
    if (!drawerQuoteId) {
      return []
    }
    return invoicesByQuoteId[drawerQuoteId] ?? []
  }, [drawerQuoteId, invoicesByQuoteId])

  const openQuoteDetail = (quoteId: string) => {
    setDraftAssistantOpen(false)
    setDrawerQuoteId(quoteId)
  }

  const openEdit = (quote: QuoteWithItems) => {
    setDraftAssistantOpen(false)
    setDrawerQuoteId(null)
    setEditingQuoteId(quote.id)
    setErrorMessage("")
    setForm(toFormState(quote))
  }

  const openCreateFresh = () => {
    setDraftAssistantOpen(false)
    setEditingQuoteId(null)
    setErrorMessage("")
    setForm(createEmptyForm(customers, defaultQuoteSummary))
    onOpenChange(true)
  }

  const openCreateWithInquiry = (inquiryId: string) => {
    const inv = inquiries.find((i) => i.id === inquiryId)
    if (!inv) {
      return
    }
    setDraftAssistantOpen(false)
    setEditingQuoteId(null)
    setErrorMessage("")
    setForm({
      ...createEmptyForm(customers, defaultQuoteSummary),
      customerId: inv.customerId,
      inquiryId: inv.id,
      title: buildQuoteTitleFromInquiry(inv, customers),
      summary: buildQuoteSummaryFromInquiry(inv, defaultQuoteSummary),
      validUntil: defaultValidUntilDate(),
    })
    onOpenChange(true)
  }

  const updateItem = (index: number, patch: Partial<QuoteItemForm>) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    }))
  }

  const removeItem = (index: number) => {
    setForm((current) => ({
      ...current,
      items:
        current.items.length === 1
          ? [createEmptyItem()]
          : current.items.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const duplicateItemRow = (index: number) => {
    setForm((current) => {
      const row = current.items[index]
      const copy: QuoteItemForm = {
        name: row.name.trim() ? `${row.name.trim()} (복사)` : "",
        description: row.description,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
      }
      return {
        ...current,
        items: [...current.items.slice(0, index + 1), copy, ...current.items.slice(index + 1)],
      }
    })
  }

  const copyCustomerShareLink = (quoteId: string) => {
    startTransition(async () => {
      const res = await ensureQuoteShareLinkAction(quoteId)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      try {
        await navigator.clipboard.writeText(res.url)
        const logRes = await logQuoteShareLinkCopiedAction(quoteId)
        if (!logRes.ok) {
          toast.error(logRes.error)
          return
        }
        toast.success("고객 공유 링크를 복사했습니다. 로그인 없이 견적서를 열 수 있습니다.")
      } catch {
        toast.error("클립보드 복사에 실패했습니다.")
      }
    })
  }

  const runDuplicateQuote = (quote: QuoteWithItems) => {
    startTransition(async () => {
      const result = await duplicateQuoteAction(quote.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("견적을 복제했습니다.")
      router.refresh()
    })
  }

  const runDeleteQuote = () => {
    if (!deleteTarget) {
      return
    }
    const id = deleteTarget.id
    startTransition(async () => {
      const result = await deleteQuoteAction(id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setDeleteTarget(null)
      toast.success("견적을 삭제했습니다.")
      if (editingQuoteId === id) {
        resetForm()
      }
      router.refresh()
    })
  }

  const confirmStatusChange = () => {
    if (!statusConfirm) {
      return
    }
    const { quote, next } = statusConfirm
    setStatusConfirm(null)
    changeStatus(quote.id, next, quote.customerId)
  }

  const saveCreate = () => {
    setErrorMessage("")

    startTransition(async () => {
      const result = await createQuoteAction(form)

      if (!result.ok) {
        setErrorMessage(result.error)
        toast.error(result.error)
        return
      }

      toast.success("견적이 저장되었습니다.")
      onOpenChange(false)
      resetForm()
      router.refresh()
    })
  }

  const saveEdit = () => {
    if (!editingQuoteId) {
      return
    }

    setErrorMessage("")

    startTransition(async () => {
      const result = await updateQuoteAction(editingQuoteId, form)

      if (!result.ok) {
        setErrorMessage(result.error)
        toast.error(result.error)
        return
      }

      toast.success("견적이 수정되었습니다.")
      resetForm()
      router.refresh()
    })
  }

  const changeStatus = (quoteId: string, status: QuoteStatus, customerId?: string) => {
    startTransition(async () => {
      const result = await updateQuoteStatusAction(quoteId, status, customerId)

      if (!result.ok) {
        setErrorMessage(result.error)
        toast.error(result.error)
        return
      }

      toast.success("견적 상태가 변경되었습니다.")
      router.refresh()
    })
  }

  const quoteFormDialogClass = cn(
    "!flex !h-auto !max-h-[100dvh] !w-full !max-w-full !translate-x-0 !translate-y-0 !flex-col !gap-0 !overflow-hidden !rounded-none !p-0 sm:!left-1/2 sm:!top-1/2 sm:!h-auto sm:!max-h-[min(92vh,900px)] sm:!w-full sm:!max-w-[min(72rem,calc(100vw-1.5rem))] sm:!-translate-x-1/2 sm:!-translate-y-1/2 sm:!rounded-xl",
    "max-sm:!inset-x-2 max-sm:!top-3 max-sm:!bottom-auto max-sm:!max-h-[calc(100dvh-1.5rem)]"
  )

  const formFields = (
    <div className="grid gap-5">
      <section className="rounded-lg border border-border/60 bg-muted/10 px-3 py-3 sm:px-4">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          1) 고객 · 문의
        </p>
        <p className="mb-3 text-[11px] leading-snug text-muted-foreground sm:grid sm:grid-cols-2 sm:gap-4">
          <span>
            <span className="font-medium text-foreground/80">왼쪽</span> — 견적을 받을{" "}
            <span className="font-medium text-foreground">거래처(고객)</span>
          </span>
          <span>
            <span className="font-medium text-foreground/80">오른쪽</span> —{" "}
            <span className="font-medium text-foreground">연결 문의</span>(선택, 있으면 제목·요약 자동 반영)
          </span>
        </p>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <div className="space-y-1.5 sm:border-l-2 sm:border-primary/35 sm:pl-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm font-semibold tracking-tight">거래처(고객)</label>
              <span className="rounded border border-destructive/25 bg-destructive/10 px-1.5 py-px text-[10px] font-semibold text-destructive">
                필수
              </span>
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">
              견적서·안내에 쓰이는 상대 고객입니다.
            </p>
            <Select
              value={form.customerId}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  customerId: value ?? current.customerId,
                  inquiryId: "",
                }))
              }
            >
              <SelectTrigger className="h-auto min-h-9 w-full justify-between py-2 text-left">
                <SelectValue className="sr-only">
                  {selectedCustomerLabel || "고객 선택"}
                </SelectValue>
                <span className="line-clamp-2 flex-1 pr-1 text-left text-sm leading-snug">
                  {selectedCustomerLabel ? (
                    selectedCustomerLabel
                  ) : (
                    <span className="text-muted-foreground">고객을 선택하세요</span>
                  )}
                </span>
              </SelectTrigger>
              <SelectContent className="max-w-[min(100vw-2rem,36rem)]">
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {formatCustomerSelectLabel(customer)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:border-l-2 sm:border-border/80 sm:pl-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm font-semibold tracking-tight">연결 문의</label>
              <span className="rounded border border-border/60 bg-background/80 px-1.5 py-px text-[10px] font-medium text-muted-foreground">
                선택
              </span>
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">
              {form.customerId
                ? "문의 연결은 선택입니다. 고를 경우 제목·요약이 채워지며, 없어도 견적 작성은 가능합니다."
                : "왼쪽에서 고객을 먼저 고르면, 해당 고객의 문의만 여기에 나타납니다."}
            </p>
            {!form.customerId ? (
              <div className="flex min-h-9 items-center rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                먼저 왼쪽에서 고객을 선택해 주세요
              </div>
            ) : availableInquiries.length === 0 ? (
              <div className="space-y-1.5">
                <div className="flex min-h-9 items-center rounded-lg border border-border/60 bg-muted/25 px-3 py-2 text-sm text-muted-foreground">
                  이 고객에 연결 가능한 문의가 없습니다
                </div>
                <p className="text-[10px] leading-snug text-muted-foreground">
                  문의 없이도 견적을 이어서 작성할 수 있습니다.
                </p>
              </div>
            ) : (
              <Select
                value={form.inquiryId ? form.inquiryId : NO_LINKED_INQUIRY}
                onValueChange={(value) => {
                  if (!value || value === NO_LINKED_INQUIRY) {
                    setForm((current) => ({ ...current, inquiryId: "" }))
                    return
                  }
                  const inv = inquiries.find((i) => i.id === value)
                  if (!inv) {
                    setForm((current) => ({ ...current, inquiryId: value }))
                    return
                  }
                  setForm((current) => ({
                    ...current,
                    customerId: inv.customerId,
                    inquiryId: value,
                    title: buildQuoteTitleFromInquiry(inv, customers),
                    summary: buildQuoteSummaryFromInquiry(inv, defaultQuoteSummary),
                  }))
                }}
              >
                <SelectTrigger className="h-auto min-h-9 w-full justify-between py-2 text-left">
                  <SelectValue className="sr-only">
                    {selectedInquiryTriggerLabel}
                  </SelectValue>
                  <span className="line-clamp-2 flex-1 pr-1 text-left text-sm leading-snug">
                    {selectedInquiryTriggerLabel}
                  </span>
                </SelectTrigger>
                <SelectContent className="max-w-[min(100vw-2rem,36rem)]">
                  <SelectItem value={NO_LINKED_INQUIRY} className="text-muted-foreground">
                    문의 선택 안 함
                  </SelectItem>
                  {availableInquiries.map((inquiry) => {
                    const det = inquiry.details?.trim() ?? ""
                    const stage =
                      inquiryStageOptions.find((o) => o.value === inquiry.stage)?.label ?? ""
                    const head = stage ? `${inquiry.title} · ${stage}` : inquiry.title
                    const line = det
                      ? `${head} — ${det.slice(0, 72)}${det.length > 72 ? "…" : ""}`
                      : head
                    return (
                      <SelectItem key={inquiry.id} value={inquiry.id}>
                        {line}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          2) 제목 · 요약
        </p>
        {form.inquiryId ? (
          <p className="rounded-md border border-primary/20 bg-primary/[0.04] px-2.5 py-1.5 text-[11px] text-foreground/90">
            연결한 문의를 기준으로 제목·요약을 채웠습니다. 필요하면 자유롭게 수정하세요.
          </p>
        ) : null}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold">견적 제목</label>
            <span className="rounded border border-destructive/25 bg-destructive/10 px-1.5 py-px text-[10px] font-semibold text-destructive">
              필수
            </span>
          </div>
          <Input
            className="h-9"
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
            placeholder="예: 브랜드 영상 제작 — 견적"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold">견적 요약</label>
          <p className="text-[11px] text-muted-foreground">
            설정의 기본 견적 템플릿·문의 내용이 여기에 들어갑니다. 견적 상단 안내 문구로 쓰입니다.
          </p>
          <Textarea
            value={form.summary}
            onChange={(event) =>
              setForm((current) => ({ ...current, summary: event.target.value }))
            }
            className="min-h-[5.5rem] text-sm"
            placeholder="예: 포함 범위, 납기, 결제 조건 등 고객에게 전달할 안내를 적어 주세요"
          />
        </div>
        <details className="rounded-lg border border-border/50 bg-muted/20 [&_summary]:cursor-pointer [&_summary]:select-none">
          <summary className="px-3 py-2 text-xs font-medium text-muted-foreground">
            추가 옵션 · 견적 상태·발송일
          </summary>
          <div className="grid gap-3 border-t border-border/40 px-3 py-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">진행 상태</label>
              <p className="text-[10px] text-muted-foreground">처음에는 초안으로 두고, 발송 후 바꿀 수 있습니다.</p>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    status: (value as QuoteStatus | null) ?? current.status,
                  }))
                }
              >
                <SelectTrigger className="h-9 w-full bg-background/80 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {quoteStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">발송일 (선택)</label>
              <p className="text-[10px] text-muted-foreground">실제 발송한 날짜를 나중에 넣어도 됩니다.</p>
              <Input
                type="date"
                className="h-9 bg-background/80"
                value={form.sentAt ? form.sentAt.slice(0, 10) : ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sentAt: event.target.value
                      ? new Date(`${event.target.value}T12:00:00`).toISOString()
                      : "",
                  }))
                }
              />
            </div>
          </div>
        </details>
      </section>

      <section className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              3) 견적 항목
            </p>
            <p className="text-[11px] text-muted-foreground">
              항목별 공급가 합계에 부가세 10%를 더해 총액을 맞춥니다.
            </p>
          </div>
          <Button
            type="button"
            variant="default"
            size="sm"
            className="h-9 w-full shrink-0 gap-1.5 sm:w-auto"
            onClick={() =>
              setForm((current) => ({
                ...current,
                items: [...current.items, createEmptyItem()],
              }))
            }
          >
            <Plus className="size-4" />
            항목 줄 추가
          </Button>
        </div>

        <div className="hidden overflow-x-auto rounded-lg border border-border/70 md:block">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-left text-[11px] font-medium text-muted-foreground">
                <th className="px-2 py-2 pl-3">
                  항목명 <span className="text-destructive">*</span>
                </th>
                <th className="w-24 px-2 py-2 text-right">
                  수량 <span className="text-destructive">*</span>
                </th>
                <th className="w-32 px-2 py-2 text-right">
                  단가 <span className="text-destructive">*</span>
                </th>
                <th className="w-32 px-2 py-2 text-right">금액</th>
                <th className="w-10 p-2 text-center" aria-label="행 복제" />
                <th className="w-11 p-2" aria-label="삭제" />
              </tr>
            </thead>
            <tbody>
              {form.items.map((item, index) => {
                const q = parseAmountInput(item.quantity)
                const p = parseAmountInput(item.unitPrice)
                const qn = Number.isFinite(q) ? q : 0
                const pn = Number.isFinite(p) ? p : 0
                const line = qn * pn
                return (
                  <tr key={`row-${index}`} className="border-b border-border/50 last:border-0">
                    <td className="px-2 py-2 pl-3 align-top">
                      <Input
                        className="h-8"
                        value={item.name}
                        onChange={(event) => updateItem(index, { name: event.target.value })}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter") {
                            return
                          }
                          event.preventDefault()
                          setForm((cur) => ({
                            ...cur,
                            items: [...cur.items, createEmptyItem()],
                          }))
                        }}
                        placeholder="예: 촬영 1회"
                      />
                      <Input
                        className="mt-1 h-7 text-xs text-muted-foreground"
                        value={item.description}
                        onChange={(event) =>
                          updateItem(index, { description: event.target.value })
                        }
                        placeholder="설명·비고 (선택) — 예: 원본 4K 제공"
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <Input
                        className="h-8 text-right tabular-nums"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(index, { quantity: event.target.value })
                        }
                        inputMode="decimal"
                        placeholder="1"
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <Input
                        className="h-8 text-right tabular-nums"
                        value={item.unitPrice}
                        onChange={(event) =>
                          updateItem(index, { unitPrice: event.target.value })
                        }
                        onFocus={() => {
                          if (item.unitPrice.includes(",")) {
                            updateItem(index, { unitPrice: stripKrwForEdit(item.unitPrice) })
                          }
                        }}
                        onBlur={() => {
                          const formatted = formatKrwDigitsInput(item.unitPrice)
                          updateItem(index, { unitPrice: formatted === "" ? "0" : formatted })
                        }}
                        inputMode="numeric"
                        placeholder="예: 500,000"
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <div className="flex h-8 items-center justify-end pr-1 text-right text-sm font-semibold tabular-nums text-foreground">
                        {formatCurrency(line)}
                        <span className="sr-only">(수량×단가)</span>
                      </div>
                    </td>
                    <td className="p-2 align-top">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-8"
                        onClick={() => duplicateItemRow(index)}
                        aria-label={`${index + 1}번째 항목 복제`}
                      >
                        <Copy className="size-4" />
                      </Button>
                    </td>
                    <td className="p-2 align-top">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-8"
                        onClick={() => removeItem(index)}
                        aria-label={`${index + 1}번째 항목 삭제`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 md:hidden">
          {form.items.map((item, index) => {
            const q = parseAmountInput(item.quantity)
            const p = parseAmountInput(item.unitPrice)
            const qn = Number.isFinite(q) ? q : 0
            const pn = Number.isFinite(p) ? p : 0
            const line = qn * pn
            return (
              <div
                key={`m-${index}`}
                className="space-y-2 rounded-lg border border-border/70 bg-muted/10 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    항목 {index + 1}
                  </span>
                  <div className="flex gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => duplicateItemRow(index)}
                      aria-label="항목 복제"
                    >
                      <Copy className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeItem(index)}
                      aria-label="삭제"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">항목명 *</label>
                  <Input
                    className="h-9"
                    value={item.name}
                    onChange={(event) => updateItem(index, { name: event.target.value })}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") {
                        return
                      }
                      event.preventDefault()
                      setForm((cur) => ({
                        ...cur,
                        items: [...cur.items, createEmptyItem()],
                      }))
                    }}
                    placeholder="예: 촬영 1회"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">설명 (선택)</label>
                  <Input
                    className="h-8 text-sm"
                    value={item.description}
                    onChange={(event) =>
                      updateItem(index, { description: event.target.value })
                    }
                    placeholder="설명·비고 (선택) — 예: 원본 4K 제공"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">수량 *</label>
                    <Input
                      className="h-9 text-right tabular-nums"
                      value={item.quantity}
                      onChange={(event) =>
                        updateItem(index, { quantity: event.target.value })
                      }
                      inputMode="decimal"
                      placeholder="1"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">단가 *</label>
                    <Input
                      className="h-9 text-right tabular-nums"
                      value={item.unitPrice}
                      onChange={(event) =>
                        updateItem(index, { unitPrice: event.target.value })
                      }
                      onFocus={() => {
                        if (item.unitPrice.includes(",")) {
                          updateItem(index, { unitPrice: stripKrwForEdit(item.unitPrice) })
                        }
                      }}
                      onBlur={() => {
                        const formatted = formatKrwDigitsInput(item.unitPrice)
                        updateItem(index, { unitPrice: formatted === "" ? "0" : formatted })
                      }}
                      inputMode="numeric"
                      placeholder="예: 500,000"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">금액</label>
                    <div className="flex h-9 items-center justify-end text-sm font-semibold tabular-nums">
                      {formatCurrency(line)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_min(100%,320px)] lg:items-start lg:gap-6">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            4) 유효기한
          </p>
          <label className="text-xs font-medium">견적 유효기한</label>
          <p className="text-[11px] text-muted-foreground">이 날짜 이후 제안이 만료된 것으로 볼 수 있습니다.</p>
          <Input
            type="date"
            className="h-9 max-w-xs"
            value={form.validUntil}
            onChange={(event) =>
              setForm((current) => ({ ...current, validUntil: event.target.value }))
            }
          />
        </div>
        <div
          key={`tot-${previewTotal.total}-${previewTotal.subtotal}`}
          className="flex flex-col justify-center rounded-xl border border-primary/25 bg-gradient-to-b from-primary/[0.06] to-background/95 px-4 py-3.5 shadow-sm ring-1 ring-primary/10 backdrop-blur-sm lg:sticky lg:top-4 lg:min-w-[280px] lg:self-start lg:shadow-md"
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-primary">합계</p>
          <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
            항목마다 수량×단가를 더한 뒤, 부가세 10%를 더합니다. 입력이 바뀌면 즉시 반영됩니다.
          </p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4 tabular-nums">
              <span className="text-muted-foreground">공급가 합계</span>
              <span className="font-medium tabular-nums">{formatCurrency(previewTotal.subtotal)}</span>
            </div>
            <div className="flex justify-between gap-4 tabular-nums">
              <span className="text-muted-foreground">부가세 (10%)</span>
              <span className="font-medium tabular-nums">{formatCurrency(previewTotal.tax)}</span>
            </div>
            <div className="border-t border-primary/20 pt-2.5">
              <div className="flex items-baseline justify-between gap-4 tabular-nums">
                <span className="text-sm font-semibold text-foreground">총액</span>
                <span className="text-xl font-bold tracking-tight text-primary tabular-nums">
                  {formatCurrency(previewTotal.total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {!formValidation.ok ? (
        <div
          className="rounded-lg border border-amber-500/35 bg-amber-500/[0.08] px-3 py-2.5 text-xs text-amber-950 dark:text-amber-50"
          role="status"
        >
          <p className="font-semibold">아래를 채우면 저장할 수 있습니다</p>
          <ul className="mt-1.5 list-inside list-disc space-y-0.5 marker:text-amber-600">
            {formValidation.issues.map((issue) => (
              <li key={issue.key}>{issue.text}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {errorMessage ? (
        <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )

  const scrollToFlow = () => flowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })

  return (
    <>
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          onOpenChange(open)
          if (!open) {
            resetForm()
          }
        }}
      >
        <DialogContent className={quoteFormDialogClass}>
          <div className="shrink-0 border-b border-border/60 px-4 pb-3 pt-4 pr-12 sm:px-6 sm:pr-14">
            <DialogHeader className="gap-1">
              <DialogTitle className="text-lg leading-snug">
                견적 생성
                {!editingQuoteId ? (
                  <span className="mt-1.5 block text-xs font-normal text-muted-foreground">
                    부여 예정 번호{" "}
                    <span className="font-mono font-semibold text-foreground">
                      {nextQuoteNumberPreview}
                    </span>
                    <span className="font-normal"> · 저장 시 확정</span>
                  </span>
                ) : null}
              </DialogTitle>
              <DialogDescription className="text-xs leading-relaxed">
                고객과 문의를 고른 뒤 항목·금액을 입력하면 공급가·부가세·총액이 바로 계산됩니다.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-[min(50vh,320px)] flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
            {formFields}
          </div>
          <div className="flex shrink-0 flex-col gap-2 border-t border-border/60 bg-background/95 px-4 py-3 shadow-[0_-6px_16px_rgba(0,0,0,0.06)] backdrop-blur-md supports-[backdrop-filter]:bg-background/85 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:shadow-[0_-6px_20px_rgba(0,0,0,0.25)]">
            <p className="text-[11px] leading-snug text-muted-foreground sm:max-w-[58%]">
              {!formValidation.ok ? (
                <span className="font-medium text-amber-900 dark:text-amber-100">
                  위쪽 노란색 안내에 적힌 항목을 채우면 저장됩니다. 저장 버튼 위에 마우스를 올리면
                  요약 힌트를 볼 수 있습니다.
                </span>
              ) : (
                <>입력을 마쳤다면 저장으로 견적을 등록합니다.</>
              )}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                취소
              </Button>
              <span
                className={cn(
                  "inline-flex",
                  !formValidation.ok && !isPending ? "cursor-help" : ""
                )}
                title={
                  !formValidation.ok && !isPending
                    ? validationSummaryForTitle || "필수 항목을 채워 주세요"
                    : undefined
                }
              >
                <Button
                  type="button"
                  onClick={saveCreate}
                  disabled={isPending || !formValidation.ok}
                  className="gap-2"
                  title={
                    formValidation.ok && !isPending
                      ? "입력한 내용으로 견적을 저장합니다"
                      : undefined
                  }
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  저장
                </Button>
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="min-w-0 space-y-3 md:space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          {hasQuotes ? (
            <div className="min-w-0 max-w-full flex-1 rounded-lg border border-border/60 bg-muted/15 px-3 py-2.5 text-xs text-muted-foreground">
              검색·필터로 견적을 빠르게 찾고, 행을 눌러 우측 상세에서 수정·복제·견적서·유효기한·발송일·연결 청구·활동 기록을
              확인할 수 있습니다.
            </div>
          ) : null}
          <Button
            type="button"
            variant={draftAssistantOpen ? "secondary" : "outline"}
            size="sm"
            className="h-9 shrink-0 gap-1.5"
            aria-pressed={draftAssistantOpen}
            onClick={() => {
              if (draftAssistantOpen) {
                setDraftAssistantOpen(false)
              } else {
                setDrawerQuoteId(null)
                setDraftAssistantOpen(true)
              }
            }}
          >
            <Sparkles className="size-3.5" aria-hidden />
            견적 초안 도우미
          </Button>
        </div>

      {hasQuotes ? (
        <OpsToolbar className="space-y-3">
          <OpsSearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="제목, 견적 번호, 고객명으로 검색…"
            aria-label="견적 검색"
            className="min-w-[min(100%,14rem)] sm:max-w-md"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <p className="text-xs font-medium text-muted-foreground">상태</p>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={statusFilter === "all" ? "default" : "outline"}
                className="h-8"
                onClick={() => setStatusFilter("all")}
              >
                전체
              </Button>
              {quoteStatusOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  className="h-8"
                  variant={statusFilter === option.value ? "default" : "outline"}
                  onClick={() => setStatusFilter(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">고객</label>
                <Select
                  value={customerFilterId}
                  onValueChange={(v) => setCustomerFilterId(v ?? "all")}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 고객</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {formatCustomerSelectLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">정렬</label>
                <Select
                  value={sortBy}
                  onValueChange={(v) => setSortBy((v as QuoteListSort) ?? "created_desc")}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_desc">최신 작성순</SelectItem>
                    <SelectItem value="total_desc">총액 높은순</SelectItem>
                    <SelectItem value="valid_until_asc">유효기한 임박순</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0"
              onClick={() => setAdvancedFiltersOpen((o) => !o)}
            >
              {advancedFiltersOpen ? "고급 필터 접기" : "기간·금액 필터"}
            </Button>
          </div>
          {advancedFiltersOpen ? (
            <div className="grid gap-3 border-t border-border/50 pt-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">작성일부터</label>
                <Input
                  type="date"
                  className="h-9"
                  value={createdFrom}
                  onChange={(e) => setCreatedFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">작성일까지</label>
                <Input
                  type="date"
                  className="h-9"
                  value={createdTo}
                  onChange={(e) => setCreatedTo(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">총액 최소(원)</label>
                <Input
                  className="h-9 tabular-nums"
                  inputMode="numeric"
                  placeholder="예: 100000"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">총액 최대(원)</label>
                <Input
                  className="h-9 tabular-nums"
                  inputMode="numeric"
                  placeholder="예: 5000000"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                />
              </div>
            </div>
          ) : null}
        </OpsToolbar>
      ) : null}

      {!quotes.length ? (
        <>
        <Card className="border border-primary/30 bg-gradient-to-b from-primary/[0.05] to-background shadow-sm">
          <CardContent className="space-y-2.5 p-3 sm:p-4">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">첫 견적</p>
              <h2 className="text-base font-bold tracking-tight sm:text-lg">
                {hasInquiries
                  ? "문의를 연결해 첫 견적을 만들어보세요"
                  : "문의를 먼저 등록한 뒤 견적을 시작하세요"}
              </h2>
              <p className="text-[13px] leading-snug text-muted-foreground">
                문의를 바탕으로 항목·금액을 정리하고 발송 상태를 추적합니다.
              </p>
            </div>

            {hasInquiries ? (
              <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-background/80 p-2.5 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">빠른 시작 · 문의 선택</label>
                  <Select
                    value={quickInquiryId}
                    onValueChange={(value) => setQuickInquiryId(value ?? "")}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="문의 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {inquiries.map((inquiry) => (
                        <SelectItem key={inquiry.id} value={inquiry.id}>
                          {inquiry.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 w-full shrink-0 sm:w-auto"
                  disabled={!quickInquiryId}
                  onClick={() => openCreateWithInquiry(quickInquiryId)}
                >
                  이 문의로 견적 만들기
                </Button>
              </div>
            ) : null}

            <div ref={flowRef} className="rounded-md border border-border/60 bg-muted/15 p-2 sm:p-2.5">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                진행 순서
              </p>
              <ol className="grid gap-1.5 sm:grid-cols-3">
                {flowSteps.map((item) => (
                  <li
                    key={item.step}
                    className="flex gap-1.5 rounded-md border border-border/50 bg-background/70 px-2 py-1.5 text-[12px]"
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[10px] font-bold text-primary">
                      {item.step}
                    </span>
                    <div>
                      <p className="font-semibold leading-tight">{item.title}</p>
                      <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{item.hint}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
              {hasInquiries ? (
                <>
                  <Link
                    href="/inquiries"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "inline-flex h-9 items-center justify-center gap-1.5"
                    )}
                  >
                    문의 선택하기
                    <ArrowRight className="size-3.5" />
                  </Link>
                  <Button type="button" size="sm" variant="outline" className="h-9 gap-1.5" onClick={scrollToFlow}>
                    <ListOrdered className="size-3.5" />
                    견적 흐름 보기
                  </Button>
                  <Button type="button" size="sm" className="h-9 gap-1.5 font-semibold" onClick={openCreateFresh}>
                    <Plus className="size-3.5" />
                    첫 견적 만들기
                  </Button>
                </>
              ) : (
                <>
                  <Link
                    href="/inquiries"
                    className={cn(
                      buttonVariants({ size: "default" }),
                      "inline-flex h-9 items-center justify-center gap-2 font-semibold"
                    )}
                  >
                    문의 등록하기
                    <ArrowRight className="size-3.5" />
                  </Link>
                  <Button type="button" size="sm" variant="outline" className="h-9 gap-1.5" onClick={scrollToFlow}>
                    <ListOrdered className="size-3.5" />
                    견적 흐름 보기
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2.5 rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-2.5">
          <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium text-foreground">아직 생성된 견적이 없습니다</p>
            <p className="text-[11px] leading-snug text-muted-foreground">
              {hasInquiries
                ? "견적을 저장하면 이 영역에 카드가 쌓이고, 상태·금액을 한눈에 관리할 수 있어요."
                : "문의를 등록하면 위에서 바로 견적 작성을 시작할 수 있어요."}
            </p>
          </div>
        </div>
        </>
      ) : !processedQuotes.length ? (
        <EmptyState
          title={
            searchQuery.trim() ||
            customerFilterId !== "all" ||
            createdFrom ||
            createdTo ||
            amountMin.trim() ||
            amountMax.trim() ||
            statusFilter !== "all"
              ? "조건에 맞는 견적이 없습니다"
              : "표시할 견적이 없습니다"
          }
          description="검색·필터를 조정하거나 새 견적을 추가해 보세요."
        />
      ) : null}

      {processedQuotes.length > 0 ? (
        <>
          <OpsTableShell className="hidden md:block">
            <table className={cn(opsTableClass, "!min-w-0 w-full max-w-full table-fixed")}>
              <thead>
                <tr className={opsTableHeadRowClass}>
                  <th className={cn(opsTableHeadCellClass, "w-[10rem]")}>번호</th>
                  <th className={cn(opsTableHeadCellClass, "min-w-0")}>제목</th>
                  <th className={cn(opsTableHeadCellClass, "w-[22%] max-w-[11rem]")}>고객</th>
                  <th className={cn(opsTableHeadCellClass, "w-[8.5rem]")}>상태</th>
                  <th className={cn(opsTableHeadCellClass, "w-[6.5rem] text-right")}>총액</th>
                  <th className={cn(opsTableHeadCellClass, "w-[6.5rem]")}>작성일</th>
                  <th className={cn(opsTableHeadCellClass, "w-11 text-right pr-3")} aria-label="작업" />
                </tr>
              </thead>
              <tbody>
                {processedQuotes.map((quote) => {
                  const customer = quote.customer
                  const validityHint = getQuoteValidityHint(quote.validUntil, quote.status)
                  return (
                    <tr
                      key={quote.id}
                      className={cn(
                        opsTableRowClass,
                        "cursor-pointer",
                        validityHint === "past_due" && "bg-destructive/[0.04]",
                        validityHint === "due_soon" && "bg-amber-500/[0.06]"
                      )}
                      data-state={drawerQuoteId === quote.id ? "selected" : undefined}
                      onClick={() => openQuoteDetail(quote.id)}
                    >
                      <td className={cn(opsTableCellClass, "font-mono text-xs tabular-nums text-muted-foreground")}>
                        {quote.quoteNumber}
                      </td>
                      <td className={cn(opsTableCellClass, "min-w-0")}>
                        <span className="line-clamp-2 break-words font-medium">{quote.title}</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {validityHint === "past_due" ? (
                            <Badge variant="destructive" className="text-[9px] px-1 py-0">
                              기한경과
                            </Badge>
                          ) : null}
                          {validityHint === "due_soon" ? (
                            <Badge className="border-amber-500/40 bg-amber-500/12 text-[9px] px-1 py-0 text-amber-950 dark:text-amber-50">
                              임박
                            </Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className={cn(opsTableCellClass, "truncate text-sm")}>
                        {customerPrimaryLabel(customer)}
                      </td>
                      <td className={opsTableCellClass} onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={quote.status}
                          onValueChange={(value) => {
                            const next = (value as QuoteStatus | null) ?? quote.status
                            if (next === quote.status) {
                              return
                            }
                            setStatusConfirm({ quote, next })
                          }}
                        >
                          <SelectTrigger className="h-8 w-full min-w-0 max-w-[8rem] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {quoteStatusOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className={cn(opsTableCellClass, "text-right text-sm font-semibold tabular-nums")}>
                        {formatCurrency(quote.total)}
                      </td>
                      <td className={cn(opsTableCellClass, "whitespace-nowrap text-xs text-muted-foreground")}>
                        {formatDate(quote.createdAt)}
                      </td>
                      <td className={cn(opsTableCellClass, "text-right")} onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "size-8")}
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem className="gap-2" onClick={() => openEdit(quote)}>
                              <Pencil className="size-4" />
                              수정
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => runDuplicateQuote(quote)}>
                              <Copy className="size-4" />
                              복제
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() =>
                                window.open(`/quotes/${quote.id}/print`, "_blank", "noopener,noreferrer")
                              }
                            >
                              <Download className="size-4" />
                              견적서·PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => copyCustomerShareLink(quote.id)}>
                              <Link2 className="size-4" />
                              공유 링크 복사
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => setSendQuoteTarget(quote)}>
                              <Send className="size-4" />
                              보내기
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="gap-2 text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(quote)}
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

          <div className="space-y-2 md:hidden">
            {processedQuotes.map((quote) => {
              const customer = quote.customer
              const validityHint = getQuoteValidityHint(quote.validUntil, quote.status)
              return (
                <button
                  key={quote.id}
                  type="button"
                  className={cn(
                    "flex w-full flex-col gap-2 rounded-xl border border-border/60 bg-card p-3 text-left shadow-sm",
                    validityHint === "past_due" && "border-destructive/35",
                    validityHint === "due_soon" && "border-amber-500/35"
                  )}
                  onClick={() => openQuoteDetail(quote.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] text-muted-foreground">{quote.quoteNumber}</p>
                      <p className="mt-0.5 font-medium leading-snug">{quote.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{customerPrimaryLabel(customer)}</p>
                    </div>
                    <QuoteStatusBadge status={quote.status} />
                  </div>
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <p className="text-sm font-semibold tabular-nums text-primary">{formatCurrency(quote.total)}</p>
                    <p className="text-[11px] tabular-nums text-muted-foreground">
                      작성 {formatDate(quote.createdAt)}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      ) : null}
      </div>

      <OpsDetailSheet
        open={drawerQuote !== null}
        onOpenChange={(o) => !o && setDrawerQuoteId(null)}
        title={
          drawerQuote ? (
            <span className="flex flex-col gap-1">
              <span className="font-mono text-xs text-muted-foreground">{drawerQuote.quoteNumber}</span>
              <span>{drawerQuote.title}</span>
            </span>
          ) : (
            ""
          )
        }
        description={
          drawerQuote ? (
            <span>
              {customerPrimaryLabel(drawerQuote.customer)}
              {drawerQuote.customer?.email ? ` · ${drawerQuote.customer.email}` : ""}
            </span>
          ) : null
        }
        footer={
          drawerQuote ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => openEdit(drawerQuote)}>
                수정
              </Button>
              <Button size="sm" variant="outline" onClick={() => runDuplicateQuote(drawerQuote)}>
                복제
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  window.open(`/quotes/${drawerQuote.id}/print`, "_blank", "noopener,noreferrer")
                }
              >
                견적서
              </Button>
              <Button size="sm" variant="outline" onClick={() => copyCustomerShareLink(drawerQuote.id)}>
                공유 링크
              </Button>
              <Button size="sm" onClick={() => setSendQuoteTarget(drawerQuote)}>
                보내기
              </Button>
              <Link
                href="/invoices"
                className={cn(buttonVariants({ size: "sm", variant: "outline" }), "inline-flex")}
              >
                청구 관리
              </Link>
            </div>
          ) : null
        }
      >
        {drawerQuote ? (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <QuoteStatusBadge status={drawerQuote.status} />
              {getQuoteValidityHint(drawerQuote.validUntil, drawerQuote.status) === "past_due" ? (
                <Badge variant="destructive" className="text-[10px]">
                  유효기한 경과
                </Badge>
              ) : null}
              {getQuoteValidityHint(drawerQuote.validUntil, drawerQuote.status) === "due_soon" ? (
                <Badge className="border-amber-500/50 bg-amber-500/15 text-[10px] text-amber-950 dark:text-amber-50">
                  유효기한 임박
                </Badge>
              ) : null}
            </div>
            <div className="space-y-1 rounded-lg border border-border/50 bg-muted/10 p-3">
              <p className="text-xs font-semibold text-muted-foreground">상태 변경</p>
              <Select
                value={drawerQuote.status}
                onValueChange={(value) => {
                  const next = (value as QuoteStatus | null) ?? drawerQuote.status
                  if (next === drawerQuote.status) {
                    return
                  }
                  setStatusConfirm({ quote: drawerQuote, next })
                }}
              >
                <SelectTrigger className="h-9 w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {quoteStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">요약</p>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                {drawerQuote.summary?.trim() || "요약 없음"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-border/50 p-2">
                <p className="text-muted-foreground">총액</p>
                <p className="mt-0.5 font-semibold tabular-nums">{formatCurrency(drawerQuote.total)}</p>
              </div>
              <div className="rounded-lg border border-border/50 p-2">
                <p className="text-muted-foreground">공급가·세액</p>
                <p className="mt-0.5 font-semibold tabular-nums">
                  {formatCurrency(drawerQuote.subtotal)} / {formatCurrency(drawerQuote.tax)}
                </p>
              </div>
              <div className="rounded-lg border border-border/50 p-2">
                <p className="text-muted-foreground">작성일</p>
                <p className="mt-0.5 tabular-nums">{formatDate(drawerQuote.createdAt)}</p>
              </div>
              <div className="rounded-lg border border-border/50 p-2">
                <p className="text-muted-foreground">유효기한</p>
                <p className="mt-0.5 tabular-nums">{formatDate(drawerQuote.validUntil)}</p>
              </div>
              <div className="rounded-lg border border-border/50 p-2">
                <p className="text-muted-foreground">발송일</p>
                <p className="mt-0.5 tabular-nums">{formatDate(drawerQuote.sentAt)}</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">연결 청구</p>
              {drawerQuoteInvoices.length ? (
                <ul className="space-y-2 text-xs">
                  {drawerQuoteInvoices.map((inv) => (
                    <li
                      key={inv.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/40 px-2 py-1.5"
                    >
                      <span className="font-mono tabular-nums">{inv.invoiceNumber}</span>
                      <PaymentStatusBadge status={inv.paymentStatus} />
                      <span className="font-medium tabular-nums">{formatCurrency(inv.amount)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">이 견적에 연결된 청구가 없습니다.</p>
              )}
              <p className="mt-2 text-[11px] text-muted-foreground">
                청구를 추가하려면 청구 관리에서 동일 견적을 연결해 저장하세요.
              </p>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">항목</p>
              <ul className="max-h-60 space-y-2 overflow-y-auto">
                {drawerQuote.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex justify-between gap-2 border-b border-border/40 pb-2 text-sm last:border-0"
                  >
                    <span className="min-w-0">
                      <span className="font-medium">{item.name}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                        {item.quantity} × {formatCurrency(item.unitPrice)}
                      </span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">{formatCurrency(item.lineTotal)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">활동 기록</p>
              {drawerQuoteActivities.length ? (
                <ul className="max-h-52 space-y-2 overflow-y-auto text-xs">
                  {drawerQuoteActivities.map((log) => (
                    <li key={log.id} className="rounded-md border border-border/40 px-2 py-1.5">
                      <p className="font-medium text-foreground">{resolveActivityHeadline(log.action)}</p>
                      <p className="mt-0.5 leading-snug text-muted-foreground">{log.description}</p>
                      <p className="mt-1 tabular-nums text-[10px] text-muted-foreground">
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

      <OpsDetailSheet
        open={draftAssistantOpen}
        onOpenChange={setDraftAssistantOpen}
        title={
          <span className="flex items-center gap-2 text-base leading-snug">
            <Sparkles className="size-4 shrink-0 text-primary/80" aria-hidden />
            견적 초안 도우미
          </span>
        }
        description="범위·결제 문구·항목 뼈대를 만든 뒤 「이 초안으로 견적 작성」으로 본 화면에 반영합니다."
      >
        <QuoteDraftAssistantForm
          hasInquiries={hasInquiries}
          quotesEmpty={!hasQuotes}
          paymentTermsHint={defaultPaymentTerms}
          onApplyToNewQuote={(payload) => {
            setDraftAssistantOpen(false)
            setEditingQuoteId(null)
            setErrorMessage("")
            setForm({
              ...createEmptyForm(customers, defaultQuoteSummary),
              title: payload.title,
              summary: payload.summary,
              items: payload.items.length ? payload.items : [createEmptyItem()],
            })
            onOpenChange(true)
            toast.success("초안을 견적 작성 화면에 반영했습니다. 단가·수량을 확인해 주세요.")
          }}
        />
      </OpsDetailSheet>

      <Dialog
        open={editingQuoteId !== null}
        onOpenChange={(open) => {
          if (!open) {
            resetForm()
          }
        }}
      >
        <DialogContent className={quoteFormDialogClass}>
          <div className="shrink-0 border-b border-border/60 px-4 pb-3 pt-4 pr-12 sm:px-6 sm:pr-14">
            <DialogHeader className="gap-1">
              <DialogTitle className="text-lg">견적 수정</DialogTitle>
              <DialogDescription className="text-xs leading-relaxed">
                동일한 흐름으로 수정합니다. 저장하면 목록·고객 타임라인에 반영됩니다.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-[min(50vh,320px)] flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
            {formFields}
          </div>
          <div className="flex shrink-0 flex-col gap-2 border-t border-border/60 bg-background/95 px-4 py-3 shadow-[0_-6px_16px_rgba(0,0,0,0.06)] backdrop-blur-md supports-[backdrop-filter]:bg-background/85 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:shadow-[0_-6px_20px_rgba(0,0,0,0.25)]">
            <p className="text-[11px] leading-snug text-muted-foreground sm:max-w-[58%]">
              {!formValidation.ok ? (
                <span className="font-medium text-amber-900 dark:text-amber-100">
                  위쪽 노란색 안내에 적힌 항목을 채우면 저장됩니다. 저장 버튼 위에 마우스를 올리면
                  요약 힌트를 볼 수 있습니다.
                </span>
              ) : (
                <>수정 내용을 저장하면 목록과 활동 기록에 반영됩니다.</>
              )}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" type="button" onClick={resetForm}>
                닫기
              </Button>
              <span
                className={cn(
                  "inline-flex",
                  !formValidation.ok && !isPending ? "cursor-help" : ""
                )}
                title={
                  !formValidation.ok && !isPending
                    ? validationSummaryForTitle || "필수 항목을 채워 주세요"
                    : undefined
                }
              >
                <Button
                  type="button"
                  onClick={saveEdit}
                  disabled={isPending || !formValidation.ok}
                  className="gap-2"
                  title={
                    formValidation.ok && !isPending
                      ? "수정한 내용을 저장합니다"
                      : undefined
                  }
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  저장
                </Button>
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={statusConfirm !== null}
        onOpenChange={(open) => {
          if (!open) {
            setStatusConfirm(null)
          }
        }}
      >
        <DialogContent className="max-w-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle>견적 상태 변경</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {statusConfirm ? (
                <>
                  「{statusConfirm.quote.title}」 상태를{" "}
                  <span className="font-semibold text-foreground">
                    {quoteStatusOptions.find((o) => o.value === statusConfirm.next)?.label ??
                      statusConfirm.next}
                  </span>
                  로 바꿀까요? 활동 기록에 반영됩니다.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setStatusConfirm(null)}>
              취소
            </Button>
            <Button type="button" onClick={confirmStatusChange} disabled={isPending} className="gap-2">
              {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              변경
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
          }
        }}
      >
        <DialogContent className="max-w-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle>견적 삭제</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {deleteTarget ? (
                <>
                  「{deleteTarget.title}」({deleteTarget.quoteNumber})을 삭제합니다. 청구서에 연결된
                  견적은 참조만 해제될 수 있습니다. 이 작업은 되돌릴 수 없습니다.
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
              onClick={runDeleteQuote}
              disabled={isPending}
              className="gap-2"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              삭제
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <QuoteSendDialog
        quote={sendQuoteTarget}
        open={sendQuoteTarget !== null}
        onOpenChange={(next) => {
          if (!next) {
            setSendQuoteTarget(null)
          }
        }}
        emailBodyTemplate={defaultQuoteSummary}
        businessName={defaultBusinessName}
        onAfterSend={() => router.refresh()}
      />
    </>
  )
}

export function QuotesWorkspace({
  quotes,
  customers,
  inquiries,
  defaultQuoteSummary,
  defaultPaymentTerms,
  defaultBusinessName,
  nextQuoteNumberPreview,
  quoteActivityByQuoteId,
  invoicesByQuoteId,
  deepLinkCustomerId,
  deepLinkOpenCreate = false,
}: {
  quotes: QuoteWithItems[]
  customers: Customer[]
  inquiries: InquiryWithCustomer[]
  defaultQuoteSummary: string
  defaultPaymentTerms: string
  defaultBusinessName: string
  nextQuoteNumberPreview: string
  quoteActivityByQuoteId: Record<string, ActivityLog[]>
  invoicesByQuoteId: Record<string, QuoteLinkedInvoiceStub[]>
  deepLinkCustomerId?: string
  deepLinkOpenCreate?: boolean
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const createOpenSourceRef = useRef<"header" | null>(null)
  const hasInquiries = inquiries.length > 0
  const hasQuotes = quotes.length > 0

  return (
    <div className="space-y-4 md:space-y-5">
      <PageHeader
        title="견적 관리"
        description="견적서를 만들고, 상태·금액·유효기한을 추적하며 고객에게 발송까지 연결합니다."
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
            {hasInquiries ? (
              <Button
                type="button"
                className="h-9 w-full gap-2 sm:w-auto"
                onClick={() => {
                  createOpenSourceRef.current = "header"
                  setIsCreateOpen(true)
                }}
              >
                <Plus className="size-4" />
                새 견적
              </Button>
            ) : (
              <div className="w-full rounded-lg border border-border/60 bg-muted/20 p-2.5 sm:w-auto sm:min-w-[17rem]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2">
                  <Link
                    href="/inquiries"
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "inline-flex h-9 flex-1 items-center justify-center gap-2 font-medium"
                    )}
                  >
                    문의 등록하기
                    <ArrowRight className="size-3.5" />
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled
                    className="h-9 flex-1 cursor-not-allowed opacity-50 sm:max-w-[8.5rem]"
                    title="먼저 문의를 등록한 뒤 견적을 만들 수 있어요"
                  >
                    <Plus className="size-3.5" />
                    새 견적
                  </Button>
                </div>
                <p className="mt-1.5 border-t border-border/40 pt-1.5 text-center text-[11px] leading-snug text-muted-foreground sm:text-left">
                  먼저 문의를 등록하면 새 견적을 만들 수 있습니다
                </p>
              </div>
            )}
          </div>
        }
      />

      <QuotesBoardPanel
        quotes={quotes}
        customers={customers}
        inquiries={inquiries}
        defaultQuoteSummary={defaultQuoteSummary}
        defaultPaymentTerms={defaultPaymentTerms}
        defaultBusinessName={defaultBusinessName}
        isCreateOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        createOpenSourceRef={createOpenSourceRef}
        deepLinkCustomerId={deepLinkCustomerId}
        deepLinkOpenCreate={deepLinkOpenCreate}
        nextQuoteNumberPreview={nextQuoteNumberPreview}
        quoteActivityByQuoteId={quoteActivityByQuoteId}
        invoicesByQuoteId={invoicesByQuoteId}
      />
    </div>
  )
}
