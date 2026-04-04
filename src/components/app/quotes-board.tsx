"use client"

import { useEffect, useMemo, useRef, useState, useTransition, type MutableRefObject } from "react"
import Link from "next/link"
import { ArrowRight, FileText, ListOrdered, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  createQuoteAction,
  updateQuoteAction,
  updateQuoteStatusAction,
} from "@/app/actions"
import { EmptyState } from "@/components/app/empty-state"
import { PageHeader } from "@/components/app/page-header"
import { QuoteDraftAssistant } from "@/components/app/quote-draft-assistant"
import { QuoteStatusBadge } from "@/components/app/status-badge"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  inquiryStageOptions,
  quoteStatusOptions,
} from "@/lib/constants"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Customer, InquiryWithCustomer, QuoteStatus, QuoteWithItems } from "@/types/domain"

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
  isCreateOpen,
  onOpenChange,
  createOpenSourceRef,
  deepLinkCustomerId,
  deepLinkOpenCreate,
}: {
  quotes: QuoteWithItems[]
  customers: Customer[]
  inquiries: InquiryWithCustomer[]
  defaultQuoteSummary: string
  isCreateOpen: boolean
  onOpenChange: (open: boolean) => void
  /** 헤더「새 견적」으로 열 때만 빈 폼으로 초기화 */
  createOpenSourceRef: MutableRefObject<"header" | null>
  deepLinkCustomerId?: string
  deepLinkOpenCreate?: boolean
}) {
  const router = useRouter()
  const flowRef = useRef<HTMLDivElement>(null)
  const [isPending, startTransition] = useTransition()
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all">("all")
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
      const q = Number(item.quantity)
      const p = Number(item.unitPrice)
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

  const filteredQuotes = useMemo(() => {
    if (statusFilter === "all") {
      return quotes
    }
    return quotes.filter((q) => q.status === statusFilter)
  }, [quotes, statusFilter])

  const previewTotal = useMemo(() => {
    const subtotal = form.items.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0
      const unitPrice = Number(item.unitPrice) || 0
      return sum + quantity * unitPrice
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

  const openEdit = (quote: QuoteWithItems) => {
    setEditingQuoteId(quote.id)
    setErrorMessage("")
    setForm(toFormState(quote))
  }

  const openCreateFresh = () => {
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
                <th className="w-11 p-2" aria-label="삭제" />
              </tr>
            </thead>
            <tbody>
              {form.items.map((item, index) => {
                const q = Number(item.quantity) || 0
                const p = Number(item.unitPrice) || 0
                const line = q * p
                return (
                  <tr key={`row-${index}`} className="border-b border-border/50 last:border-0">
                    <td className="px-2 py-2 pl-3 align-top">
                      <Input
                        className="h-8"
                        value={item.name}
                        onChange={(event) => updateItem(index, { name: event.target.value })}
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
                        inputMode="numeric"
                        placeholder="예: 500000"
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
            const q = Number(item.quantity) || 0
            const p = Number(item.unitPrice) || 0
            const line = q * p
            return (
              <div
                key={`m-${index}`}
                className="space-y-2 rounded-lg border border-border/70 bg-muted/10 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    항목 {index + 1}
                  </span>
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
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">항목명 *</label>
                  <Input
                    className="h-9"
                    value={item.name}
                    onChange={(event) => updateItem(index, { name: event.target.value })}
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
                      inputMode="numeric"
                      placeholder="예: 500000"
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
    <div className="space-y-3 md:space-y-4">
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
              <DialogTitle className="text-lg">견적 생성</DialogTitle>
              <DialogDescription className="text-xs leading-relaxed">
                고객 → 문의 → 항목 순으로 입력하면 합계가 바로 반영됩니다.
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

      {hasQuotes ? (
        <div className="rounded-lg border border-border/60 bg-muted/15 px-3 py-2.5 text-xs text-muted-foreground">
          문의를 연결한 견적은 목록에서 상태를 바꾸거나 수정할 수 있습니다.
        </div>
      ) : null}

      {hasQuotes ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <p className="text-xs font-medium text-muted-foreground">상태 필터</p>
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
      ) : null}

      {!quotes.length ? (
        <>
        <Card className="border border-primary/30 bg-gradient-to-b from-primary/[0.05] to-background shadow-sm">
          <CardContent className="space-y-2.5 p-3 sm:p-4">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">시작하기</p>
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
      ) : !filteredQuotes.length ? (
        <EmptyState
          title="해당 상태의 견적이 없습니다"
          description="필터를 바꾸거나 새 견적을 추가해 보세요."
        />
      ) : null}

      {filteredQuotes.map((quote) => {
        const customer = quote.customer

        return (
          <Card key={quote.id} className="border-border/70">
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>{quote.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {quote.quoteNumber} · {customer?.companyName ?? customer?.name}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <QuoteStatusBadge status={quote.status} />
                  <Select
                    value={quote.status}
                    onValueChange={(value) =>
                      changeStatus(
                        quote.id,
                        (value as QuoteStatus | null) ?? quote.status,
                        quote.customerId
                      )
                    }
                  >
                    <SelectTrigger className="w-[132px]">
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
                  <Button variant="outline" size="sm" type="button" onClick={() => openEdit(quote)}>
                    <Pencil className="size-4" />
                    수정
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">{quote.summary}</p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">총액</p>
                  <p className="mt-2 text-xl font-semibold">
                    {formatCurrency(quote.total)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">발송일</p>
                  <p className="mt-2 text-xl font-semibold">
                    {formatDate(quote.sentAt)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">유효기한</p>
                  <p className="mt-2 text-xl font-semibold">
                    {formatDate(quote.validUntil)}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">항목 요약</p>
                <div className="space-y-2">
                  {quote.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2"
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          수량 {item.quantity} · {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                      <p className="font-medium">{formatCurrency(item.lineTotal)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

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
                동일한 흐름으로 수정합니다. 저장 시 DB에 반영됩니다.
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
                <>수정 내용을 저장하면 DB에 반영됩니다.</>
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
    </div>
  )
}

export function QuotesWorkspace({
  quotes,
  customers,
  inquiries,
  defaultQuoteSummary,
  deepLinkCustomerId,
  deepLinkOpenCreate = false,
}: {
  quotes: QuoteWithItems[]
  customers: Customer[]
  inquiries: InquiryWithCustomer[]
  defaultQuoteSummary: string
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
        description="문의를 연결해 견적을 만들고, 항목·금액·발송 상태를 한곳에서 다룹니다."
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

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
        <QuotesBoardPanel
          quotes={quotes}
          customers={customers}
          inquiries={inquiries}
          defaultQuoteSummary={defaultQuoteSummary}
          isCreateOpen={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          createOpenSourceRef={createOpenSourceRef}
          deepLinkCustomerId={deepLinkCustomerId}
          deepLinkOpenCreate={deepLinkOpenCreate}
        />
        <QuoteDraftAssistant hasInquiries={hasInquiries} quotesEmpty={!hasQuotes} />
      </div>
    </div>
  )
}
