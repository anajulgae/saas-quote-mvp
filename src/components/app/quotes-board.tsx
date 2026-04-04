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
    const issues: string[] = []
    if (!form.customerId) {
      issues.push("고객을 선택해 주세요.")
    }
    if (!form.title.trim()) {
      issues.push("견적 제목을 입력해 주세요.")
    }
    form.items.forEach((item, index) => {
      const row = index + 1
      if (!item.name.trim()) {
        issues.push(`${row}번째 줄: 항목명을 입력해 주세요.`)
      }
      const q = Number(item.quantity)
      const p = Number(item.unitPrice)
      if (!Number.isFinite(q) || q <= 0) {
        issues.push(`${row}번째 줄: 수량을 확인해 주세요.`)
      }
      if (!Number.isFinite(p) || p < 0) {
        issues.push(`${row}번째 줄: 단가를 확인해 주세요.`)
      }
    })
    return { ok: issues.length === 0, issues }
  }, [form])

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
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          1) 고객 · 문의
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">고객</label>
            <p className="text-[11px] text-muted-foreground">견적서에 표시되는 거래처입니다.</p>
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
              <SelectTrigger className="h-9 w-full text-left [&>span]:line-clamp-2">
                <SelectValue placeholder="고객을 선택하세요" />
              </SelectTrigger>
              <SelectContent className="max-w-[min(100vw-2rem,36rem)]">
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id} className="py-2">
                    <span className="block max-w-[32rem] whitespace-normal leading-snug">
                      {formatCustomerSelectLabel(customer)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">연결 문의</label>
            <p className="text-[11px] text-muted-foreground">
              {form.customerId
                ? "선택 시 제목·요약이 자동으로 채워집니다. 필요하면 수정하세요."
                : "먼저 고객을 선택하면 해당 고객의 문의만 표시됩니다."}
            </p>
            <Select
              value={form.inquiryId ? form.inquiryId : "__none__"}
              disabled={!form.customerId}
              onValueChange={(value) => {
                if (!value || value === "__none__") {
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
              <SelectTrigger className="h-9 w-full text-left [&>span]:line-clamp-2">
                <SelectValue placeholder={form.customerId ? "문의 선택 (선택 사항)" : "고객을 먼저 선택"} />
              </SelectTrigger>
              <SelectContent className="max-w-[min(100vw-2rem,36rem)]">
                <SelectItem value="__none__" className="text-muted-foreground">
                  연결 안 함
                </SelectItem>
                {availableInquiries.map((inquiry) => {
                  const det = inquiry.details?.trim() ?? ""
                  return (
                    <SelectItem key={inquiry.id} value={inquiry.id} className="py-2">
                      <span className="block max-w-[32rem] whitespace-normal leading-snug">
                        <span className="font-medium">{inquiry.title}</span>
                        <span className="text-muted-foreground">
                          {" · "}
                          {inquiryStageOptions.find((o) => o.value === inquiry.stage)?.label}
                          {det
                            ? ` — ${det.slice(0, 80)}${det.length > 80 ? "…" : ""}`
                            : ""}
                        </span>
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          2) 제목 · 요약
        </p>
        <div className="grid gap-3 md:grid-cols-[1fr_minmax(9rem,11rem)] md:items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">견적 제목</label>
            <Input
              className="h-9"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="예: ○○ 프로젝트 — 견적"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">상태</label>
            <Select
              value={form.status}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  status: (value as QuoteStatus | null) ?? current.status,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
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
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">견적 요약</label>
          <p className="text-[11px] text-muted-foreground">
            문의·설정 템플릿이 기본으로 들어옵니다. 견적 초안 상단 설명으로 쓰입니다.
          </p>
          <Textarea
            value={form.summary}
            onChange={(event) =>
              setForm((current) => ({ ...current, summary: event.target.value }))
            }
            className="min-h-[5.5rem] text-sm"
          />
        </div>
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
                <th className="px-2 py-2 pl-3">항목명</th>
                <th className="w-24 px-2 py-2 text-right">수량</th>
                <th className="w-32 px-2 py-2 text-right">단가</th>
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
                        placeholder="항목명"
                      />
                      <Input
                        className="mt-1 h-7 text-xs text-muted-foreground"
                        value={item.description}
                        onChange={(event) =>
                          updateItem(index, { description: event.target.value })
                        }
                        placeholder="설명·비고 (선택)"
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
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <div className="flex h-8 items-center justify-end pr-1 text-right text-sm font-medium tabular-nums">
                        {formatCurrency(line)}
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
                  <label className="text-[11px] text-muted-foreground">항목명</label>
                  <Input
                    className="h-9"
                    value={item.name}
                    onChange={(event) => updateItem(index, { name: event.target.value })}
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
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">수량</label>
                    <Input
                      className="h-9 text-right tabular-nums"
                      value={item.quantity}
                      onChange={(event) =>
                        updateItem(index, { quantity: event.target.value })
                      }
                      inputMode="decimal"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">단가</label>
                    <Input
                      className="h-9 text-right tabular-nums"
                      value={item.unitPrice}
                      onChange={(event) =>
                        updateItem(index, { unitPrice: event.target.value })
                      }
                      inputMode="numeric"
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

      <section className="grid gap-3 lg:grid-cols-[1fr_320px] lg:items-stretch">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">유효기한</label>
            <p className="text-[11px] text-muted-foreground">견적 제안 만료일입니다.</p>
            <Input
              type="date"
              className="h-9"
              value={form.validUntil}
              onChange={(event) =>
                setForm((current) => ({ ...current, validUntil: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">발송일 (선택)</label>
            <Input
              type="date"
              className="h-9"
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
        <div className="flex flex-col justify-center rounded-xl border-2 border-primary/25 bg-primary/[0.04] px-4 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            합계 (실시간)
          </p>
          <div className="mt-2 space-y-1.5 text-sm">
            <div className="flex justify-between gap-4 tabular-nums">
              <span className="text-muted-foreground">공급가 합계</span>
              <span className="font-medium">{formatCurrency(previewTotal.subtotal)}</span>
            </div>
            <div className="flex justify-between gap-4 tabular-nums">
              <span className="text-muted-foreground">부가세 (10%)</span>
              <span className="font-medium">{formatCurrency(previewTotal.tax)}</span>
            </div>
            <div className="border-t border-primary/15 pt-2">
              <div className="flex justify-between gap-4 tabular-nums">
                <span className="text-base font-semibold">총액</span>
                <span className="text-lg font-bold tracking-tight">
                  {formatCurrency(previewTotal.total)}
                </span>
              </div>
            </div>
          </div>
          <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
            세금 정책 변경 시 서버 계산 로직을 확장할 수 있도록 합계는 항목 합산 기준입니다.
          </p>
        </div>
      </section>

      {!formValidation.ok ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
          <p className="font-medium">저장 전 확인</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {formValidation.issues.map((msg) => (
              <li key={msg}>{msg}</li>
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
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
            {formFields}
          </div>
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border/60 bg-muted/30 px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button
              type="button"
              onClick={saveCreate}
              disabled={isPending || !formValidation.ok}
              className="gap-2"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              저장
            </Button>
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
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
            {formFields}
          </div>
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border/60 bg-muted/30 px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
            <Button variant="outline" type="button" onClick={resetForm}>
              닫기
            </Button>
            <Button
              type="button"
              onClick={saveEdit}
              disabled={isPending || !formValidation.ok}
              className="gap-2"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              저장
            </Button>
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
