"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { ArrowRight, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  createQuoteAction,
  updateQuoteAction,
  updateQuoteStatusAction,
} from "@/app/actions"
import { EmptyState } from "@/components/app/empty-state"
import { QuoteStatusBadge } from "@/components/app/status-badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

function createEmptyItem(): QuoteItemForm {
  return {
    name: "",
    description: "",
    quantity: "1",
    unitPrice: "0",
  }
}

function createEmptyForm(customers: Customer[], defaultSummary = ""): QuoteFormState {
  return {
    customerId: customers[0]?.id ?? "",
    inquiryId: "",
    title: "",
    summary: defaultSummary,
    status: "draft",
    validUntil: "",
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

export function QuotesBoard({
  quotes,
  customers,
  inquiries,
  defaultQuoteSummary,
}: {
  quotes: QuoteWithItems[]
  customers: Customer[]
  inquiries: InquiryWithCustomer[]
  defaultQuoteSummary: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all">("all")
  const [form, setForm] = useState<QuoteFormState>(() =>
    createEmptyForm(customers, defaultQuoteSummary)
  )

  const availableInquiries = useMemo(
    () =>
      inquiries.filter(
        (inquiry) =>
          !form.customerId || inquiry.customerId === form.customerId
      ),
    [form.customerId, inquiries]
  )

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
      setIsCreateOpen(false)
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

  const formFields = (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">고객</label>
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
          <label className="text-sm font-medium">연결 문의</label>
          <Select
            value={form.inquiryId || undefined}
            onValueChange={(value) =>
              setForm((current) => ({ ...current, inquiryId: value ?? "" }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="문의 선택 안 함" />
            </SelectTrigger>
            <SelectContent>
              {availableInquiries.map((inquiry) => (
                <SelectItem key={inquiry.id} value={inquiry.id}>
                  {inquiry.title} ·{" "}
                  {
                    inquiryStageOptions.find((option) => option.value === inquiry.stage)
                      ?.label
                  }
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">견적 제목</label>
          <Input
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">상태</label>
          <Select
            value={form.status}
            onValueChange={(value) =>
              setForm((current) => ({
                ...current,
                status: (value as QuoteStatus | null) ?? current.status,
              }))
            }
          >
            <SelectTrigger className="w-full">
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

      <div className="space-y-2">
        <label className="text-sm font-medium">견적 요약</label>
        <Textarea
          value={form.summary}
          onChange={(event) =>
            setForm((current) => ({ ...current, summary: event.target.value }))
          }
          className="min-h-24"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-medium">견적 항목</label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setForm((current) => ({
                ...current,
                items: [...current.items, createEmptyItem()],
              }))
            }
          >
            <Plus className="size-4" />
            항목 추가
          </Button>
        </div>
        <div className="space-y-3">
          {form.items.map((item, index) => (
            <div
              key={`${index}-${item.name}`}
              className="rounded-2xl border border-border/70 p-4"
            >
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_120px_140px_auto]">
                <Input
                  value={item.name}
                  onChange={(event) => updateItem(index, { name: event.target.value })}
                  placeholder="항목명"
                />
                <Input
                  value={item.description}
                  onChange={(event) =>
                    updateItem(index, { description: event.target.value })
                  }
                  placeholder="설명"
                />
                <Input
                  value={item.quantity}
                  onChange={(event) =>
                    updateItem(index, { quantity: event.target.value })
                  }
                  inputMode="decimal"
                  placeholder="수량"
                />
                <Input
                  value={item.unitPrice}
                  onChange={(event) =>
                    updateItem(index, { unitPrice: event.target.value })
                  }
                  inputMode="numeric"
                  placeholder="단가"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">유효기한</label>
          <Input
            type="date"
            value={form.validUntil}
            onChange={(event) =>
              setForm((current) => ({ ...current, validUntil: event.target.value }))
            }
          />
        </div>
        <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground">예상 합계</p>
          <p className="mt-2 font-medium">
            공급가 {formatCurrency(previewTotal.subtotal)} / 부가세{" "}
            {formatCurrency(previewTotal.tax)}
          </p>
          <p className="mt-1 text-xl font-semibold">
            총액 {formatCurrency(previewTotal.total)}
          </p>
        </div>
      </div>
      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium">견적 운영 흐름</p>
          <p className="mt-1 text-sm text-muted-foreground">
            문의를 선택해 견적을 만들고, 발송/승인 상태를 바로 바꿀 수 있습니다.
          </p>
        </div>
        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open)
            if (open) {
              setEditingQuoteId(null)
              setErrorMessage("")
              setForm(createEmptyForm(customers, defaultQuoteSummary))
            }
          }}
        >
          <DialogTrigger render={<Button />}>
            <Plus className="size-4" />새 견적
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>견적 생성</DialogTitle>
              <DialogDescription>
                고객과 항목을 입력하면 공급가/세액/총액이 자동 계산됩니다.
              </DialogDescription>
            </DialogHeader>
            {formFields}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                취소
              </Button>
              <Button onClick={saveCreate} disabled={isPending} className="gap-2">
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                저장
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <p className="text-sm font-medium text-muted-foreground">상태 필터</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => setStatusFilter("all")}
          >
            전체
          </Button>
          {quoteStatusOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={statusFilter === option.value ? "default" : "outline"}
              onClick={() => setStatusFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {!quotes.length ? (
        <EmptyState
          title="견적이 없습니다"
          description="문의를 바탕으로 금액과 항목을 채운 뒤 견적을 저장하면 여기에 쌓입니다. 먼저 문의가 있다면 연결해 보세요."
        >
          <Button type="button" onClick={() => setIsCreateOpen(true)}>
            <Plus className="size-4" />
            첫 견적 만들기
          </Button>
          <Link
            href="/inquiries"
            className={cn(buttonVariants({ variant: "outline" }), "inline-flex items-center gap-1")}
          >
            문의 목록
            <ArrowRight className="size-3.5" />
          </Link>
        </EmptyState>
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
                  <Dialog
                    open={editingQuoteId === quote.id}
                    onOpenChange={(open) => {
                      if (!open) {
                        resetForm()
                      }
                    }}
                  >
                    <DialogTrigger
                      render={<Button variant="outline" size="sm" />}
                      onClick={() => openEdit(quote)}
                    >
                      <Pencil className="size-4" />
                      수정
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>견적 수정</DialogTitle>
                        <DialogDescription>
                          현재 견적 카드 구조는 유지하고 데이터만 실제로 수정합니다.
                        </DialogDescription>
                      </DialogHeader>
                      {formFields}
                      <DialogFooter>
                        <Button variant="outline" onClick={resetForm}>
                          닫기
                        </Button>
                        <Button onClick={saveEdit} disabled={isPending} className="gap-2">
                          {isPending ? (
                            <Loader2 className="size-4 animate-spin" aria-hidden />
                          ) : null}
                          저장
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
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
    </div>
  )
}
