"use client"

import Link from "next/link"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type MutableRefObject,
} from "react"
import { ArrowRight, BellRing, ListOrdered, Loader2, Pencil, Plus, Receipt } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  createInvoiceAction,
  createReminderAction,
  updateInvoiceAction,
  updateInvoicePaymentStatusAction,
} from "@/app/actions"
import { EmptyState } from "@/components/app/empty-state"
import { PageHeader } from "@/components/app/page-header"
import { PaymentStatusBadge } from "@/components/app/status-badge"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  invoiceTypeOptions,
  paymentStatusOptions,
  quoteStatusOptions,
  reminderChannelOptions,
} from "@/lib/constants"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type {
  Customer,
  InvoiceFormInput,
  InvoiceWithReminders,
  PaymentStatus,
  Quote,
  ReminderChannel,
} from "@/types/domain"

type PaymentQuickFilter = "all" | "unpaid" | "overdue" | "paid"

type InvoiceFormState = {
  customerId: string
  quoteId: string
  invoiceType: InvoiceFormInput["invoiceType"]
  amount: string
  paymentStatus: PaymentStatus
  dueDate: string
  requestedAt: string
  paidAt: string
  notes: string
}

function createEmptyInvoiceForm(customers: Customer[]): InvoiceFormState {
  return {
    customerId: customers[0]?.id ?? "",
    quoteId: "",
    invoiceType: "deposit",
    amount: "",
    paymentStatus: "pending",
    dueDate: "",
    requestedAt: todayDateInput(),
    paidAt: "",
    notes: "",
  }
}

function toInvoiceForm(invoice: InvoiceWithReminders): InvoiceFormState {
  return {
    customerId: invoice.customerId,
    quoteId: invoice.quoteId ?? "",
    invoiceType: invoice.invoiceType,
    amount: String(invoice.amount),
    paymentStatus: invoice.paymentStatus,
    dueDate: invoice.dueDate ?? "",
    requestedAt: invoice.requestedAt ?? "",
    paidAt: invoice.paidAt ?? "",
    notes: invoice.notes ?? "",
  }
}

function todayDateInput(): string {
  return new Date().toISOString().slice(0, 10)
}

function parseAmountInput(raw: string): number {
  return Number(String(raw ?? "").replace(/,/g, "").replace(/[\s원₩]/g, "").trim())
}

function formatAmountDigitsDisplay(digits: string): string {
  if (!digits) {
    return ""
  }
  if (!/^\d+$/.test(digits)) {
    return digits
  }
  return Number(digits).toLocaleString("ko-KR")
}

function formatCustomerLines(customer: Customer): { primary: string; secondary: string } {
  const primary = customer.companyName?.trim() || customer.name
  const secondary = [
    customer.companyName ? customer.name : null,
    customer.email?.trim() || null,
    customer.phone?.trim() || null,
  ]
    .filter(Boolean)
    .join(" · ")
  return { primary, secondary }
}

function formatQuoteLines(quote: Quote, customers: Customer[]): { primary: string; secondary: string } {
  const cust = customers.find((c) => c.id === quote.customerId)
  const custLine = cust?.companyName?.trim() || cust?.name || "고객"
  const st = quoteStatusOptions.find((o) => o.value === quote.status)?.label ?? ""
  return {
    primary: quote.title.trim() || quote.quoteNumber,
    secondary: `${quote.quoteNumber} · ${custLine} · ${formatCurrency(quote.total)}${st ? ` · ${st}` : ""}`,
  }
}

function sumInvoiceAmountsForQuote(
  invoices: InvoiceWithReminders[],
  quoteId: string,
  excludeInvoiceId: string | null
): number {
  return invoices
    .filter(
      (inv) =>
        inv.quoteId === quoteId && (!excludeInvoiceId || inv.id !== excludeInvoiceId)
    )
    .reduce((sum, inv) => sum + inv.amount, 0)
}

function suggestedAmountForQuote(
  quote: Quote,
  invoiceType: InvoiceFormInput["invoiceType"],
  invoicedSum: number
): number {
  if (invoiceType === "deposit") {
    return Math.round(quote.total * 0.5)
  }
  return Math.max(0, quote.total - invoicedSum)
}

const invoiceFormDialogClass = cn(
  "!flex !h-auto !max-h-[100dvh] !w-full !max-w-full !translate-x-0 !translate-y-0 !flex-col !gap-0 !overflow-hidden !rounded-none !p-0 sm:!left-1/2 sm:!top-1/2 sm:!h-auto sm:!max-h-[min(92vh,920px)] sm:!w-full sm:!max-w-[min(56rem,calc(100vw-1.5rem))] sm:!-translate-x-1/2 sm:!-translate-y-1/2 sm:!rounded-xl",
  "max-sm:!inset-x-2 max-sm:!top-3 max-sm:!bottom-auto max-sm:!max-h-[calc(100dvh-1.5rem)]"
)

const flowSteps = [
  { step: 1, title: "견적 확인", hint: "금액·항목이 확정된 견적을 고릅니다" },
  { step: 2, title: "선금·잔금 청구", hint: "청구 타입과 금액을 나눠 기록합니다" },
  { step: 3, title: "결제·리마인드", hint: "입금 상태를 바꾸고 미수 알림을 남깁니다" },
] as const

function InvoicesBoardPanel({
  invoices,
  customers,
  quotes,
  defaultReminderMessage,
  isCreateOpen,
  onOpenChange,
  createOpenSourceRef,
}: {
  invoices: InvoiceWithReminders[]
  customers: Customer[]
  quotes: Quote[]
  defaultReminderMessage: string
  isCreateOpen: boolean
  onOpenChange: (open: boolean) => void
  createOpenSourceRef: MutableRefObject<"header" | null>
}) {
  const router = useRouter()
  const flowRef = useRef<HTMLDivElement>(null)
  const [isPending, startTransition] = useTransition()
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null)
  const [reminderInvoiceId, setReminderInvoiceId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [paymentQuickFilter, setPaymentQuickFilter] =
    useState<PaymentQuickFilter>("all")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<
    PaymentStatus | "all"
  >("all")
  const [quickQuoteId, setQuickQuoteId] = useState(quotes[0]?.id ?? "")
  const [form, setForm] = useState<InvoiceFormState>(() => createEmptyInvoiceForm(customers))
  const amountUserEditedRef = useRef(false)
  const [reminderForm, setReminderForm] = useState<{
    channel: ReminderChannel
    message: string
  }>({
    channel: "kakao",
    message: "",
  })

  const hasQuotes = quotes.length > 0
  const hasInvoices = invoices.length > 0

  useEffect(() => {
    setQuickQuoteId((current) => {
      if (current && quotes.some((q) => q.id === current)) {
        return current
      }
      return quotes[0]?.id ?? ""
    })
  }, [quotes])

  useEffect(() => {
    if (!isCreateOpen) {
      return
    }
    if (createOpenSourceRef.current === "header") {
      setEditingInvoiceId(null)
      setErrorMessage("")
      amountUserEditedRef.current = false
      setForm(createEmptyInvoiceForm(customers))
    }
    createOpenSourceRef.current = null
  }, [isCreateOpen, customers, createOpenSourceRef])

  const availableQuotes = useMemo(
    () => quotes.filter((quote) => !form.customerId || quote.customerId === form.customerId),
    [form.customerId, quotes]
  )

  const selectedQuote = useMemo(
    () => quotes.find((q) => q.id === form.quoteId) ?? null,
    [quotes, form.quoteId]
  )

  const invoicedSumForSelectedQuote = useMemo(
    () =>
      form.quoteId
        ? sumInvoiceAmountsForQuote(invoices, form.quoteId, editingInvoiceId)
        : 0,
    [form.quoteId, invoices, editingInvoiceId]
  )

  const suggestedAmountValue = useMemo(() => {
    if (!selectedQuote) {
      return null
    }
    return suggestedAmountForQuote(
      selectedQuote,
      form.invoiceType,
      invoicedSumForSelectedQuote
    )
  }, [selectedQuote, form.invoiceType, invoicedSumForSelectedQuote])

  const formValidation = useMemo(() => {
    const issues: { key: string; text: string }[] = []
    if (!form.customerId.trim()) {
      issues.push({ key: "customer", text: "거래처(고객)를 선택해 주세요." })
    }
    const needsQuote = availableQuotes.length > 0
    if (needsQuote && !form.quoteId.trim()) {
      issues.push({ key: "quote", text: "연결 견적을 선택해 주세요." })
    }
    const amt = parseAmountInput(form.amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      issues.push({ key: "amount", text: "청구 금액을 0보다 큰 숫자로 입력해 주세요." })
    }
    const reqDate = form.requestedAt?.trim() ?? ""
    if (!reqDate) {
      issues.push({ key: "requestedAt", text: "청구일(발행일)을 선택해 주세요." })
    }
    return { ok: issues.length === 0, issues }
  }, [form.customerId, form.quoteId, form.amount, form.requestedAt, availableQuotes.length])

  const validationSummaryForTitle = useMemo(
    () => formValidation.issues.map((i) => i.text).join("\n"),
    [formValidation.issues]
  )

  const selectedCustomerLines = useMemo(() => {
    const c = customers.find((x) => x.id === form.customerId)
    return c ? formatCustomerLines(c) : null
  }, [customers, form.customerId])

  const showPaidAtField = ["paid", "partially_paid", "deposit_paid"].includes(form.paymentStatus)

  const invoiceTypeLabel =
    invoiceTypeOptions.find((o) => o.value === form.invoiceType)?.label ?? form.invoiceType
  const paymentStatusLabel =
    paymentStatusOptions.find((o) => o.value === form.paymentStatus)?.label ?? form.paymentStatus

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (paymentQuickFilter === "unpaid" && inv.paymentStatus === "paid") {
        return false
      }
      if (paymentQuickFilter === "overdue" && inv.paymentStatus !== "overdue") {
        return false
      }
      if (paymentQuickFilter === "paid" && inv.paymentStatus !== "paid") {
        return false
      }
      if (paymentStatusFilter !== "all" && inv.paymentStatus !== paymentStatusFilter) {
        return false
      }
      return true
    })
  }, [invoices, paymentQuickFilter, paymentStatusFilter])

  const resetInvoiceForm = () => {
    amountUserEditedRef.current = false
    setForm(createEmptyInvoiceForm(customers))
    setEditingInvoiceId(null)
    setErrorMessage("")
  }

  const openEdit = (invoice: InvoiceWithReminders) => {
    amountUserEditedRef.current = true
    setEditingInvoiceId(invoice.id)
    setErrorMessage("")
    setForm(toInvoiceForm(invoice))
  }

  const openCreateFresh = () => {
    amountUserEditedRef.current = false
    setEditingInvoiceId(null)
    setErrorMessage("")
    setForm(createEmptyInvoiceForm(customers))
    onOpenChange(true)
  }

  const openCreateWithQuote = (quoteId: string) => {
    const q = quotes.find((item) => item.id === quoteId)
    if (!q) {
      return
    }
    amountUserEditedRef.current = false
    setEditingInvoiceId(null)
    setErrorMessage("")
    setForm({
      ...createEmptyInvoiceForm(customers),
      customerId: q.customerId,
      quoteId: q.id,
      amount: String(Math.round(q.total * 0.5)),
    })
    onOpenChange(true)
  }

  const scrollToFlow = () => flowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })

  const saveCreate = () => {
    setErrorMessage("")

    startTransition(async () => {
      const result = await createInvoiceAction(form)

      if (!result.ok) {
        setErrorMessage(result.error)
        toast.error(result.error)
        return
      }

      toast.success("청구가 저장되었습니다.")
      onOpenChange(false)
      resetInvoiceForm()
      router.refresh()
    })
  }

  const saveEdit = () => {
    if (!editingInvoiceId) {
      return
    }

    setErrorMessage("")

    startTransition(async () => {
      const result = await updateInvoiceAction(editingInvoiceId, form)

      if (!result.ok) {
        setErrorMessage(result.error)
        toast.error(result.error)
        return
      }

      toast.success("청구가 수정되었습니다.")
      resetInvoiceForm()
      router.refresh()
    })
  }

  const updatePaymentStatus = (
    invoiceId: string,
    status: PaymentStatus,
    customerId?: string
  ) => {
    startTransition(async () => {
      const result = await updateInvoicePaymentStatusAction(invoiceId, status, customerId)

      if (!result.ok) {
        setErrorMessage(result.error)
        toast.error(result.error)
        return
      }

      toast.success("결제 상태가 변경되었습니다.")
      router.refresh()
    })
  }

  const editingInvoice = useMemo(
    () => invoices.find((i) => i.id === editingInvoiceId) ?? null,
    [editingInvoiceId, invoices]
  )

  const reminderInvoice = useMemo(
    () => invoices.find((i) => i.id === reminderInvoiceId) ?? null,
    [reminderInvoiceId, invoices]
  )

  const saveReminder = () => {
    if (!reminderInvoiceId) {
      return
    }

    const invoice = invoices.find((item) => item.id === reminderInvoiceId)

    startTransition(async () => {
      const result = await createReminderAction({
        invoiceId: reminderInvoiceId,
        channel: reminderForm.channel,
        message: reminderForm.message,
        customerId: invoice?.customerId,
      })

      if (!result.ok) {
        setErrorMessage(result.error)
        toast.error(result.error)
        return
      }

      toast.success("리마인드가 기록되었습니다.")
      setReminderInvoiceId(null)
      setReminderForm({
        channel: "kakao",
        message: "",
      })
      router.refresh()
    })
  }

  const formFields = (
    <div className="grid gap-6">
      {!formValidation.ok ? (
        <div
          className="rounded-lg border border-amber-500/35 bg-amber-500/[0.08] px-3 py-2.5 text-xs text-amber-950 dark:text-amber-50"
          role="status"
        >
          <p className="font-semibold">저장하려면 아래를 확인해 주세요</p>
          <ul className="mt-1.5 list-inside list-disc space-y-0.5 marker:text-amber-600">
            {formValidation.issues.map((issue) => (
              <li key={issue.key}>{issue.text}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className="rounded-lg border border-border/60 bg-muted/10 px-3 py-3 sm:px-4">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          1) 고객 · 연결 견적
        </p>
        <p className="mb-3 text-[11px] leading-snug text-muted-foreground">
          고객을 확인한 뒤, 이번 청구에 맞는 견적을 고릅니다. 견적을 고르면 거래처가 견적과 동일하게 맞춰집니다.
        </p>
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
          <div className="space-y-1.5 sm:border-l-2 sm:border-primary/35 sm:pl-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm font-semibold">거래처(고객)</label>
              <span className="text-destructive">*</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              청구서에 표시되는 상대입니다. 이름·회사·연락처가 함께 보입니다.
            </p>
            {customers.length === 0 ? (
              <div className="flex min-h-9 items-center rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                등록된 고객이 없습니다. 고객을 먼저 등록해 주세요.
              </div>
            ) : (
              <Select
                value={form.customerId}
                onValueChange={(value) => {
                  amountUserEditedRef.current = false
                  setForm((current) => ({
                    ...current,
                    customerId: value ?? current.customerId,
                    quoteId: "",
                  }))
                }}
              >
                <SelectTrigger className="h-auto min-h-10 w-full justify-between py-2 text-left">
                  <SelectValue className="sr-only">
                    {selectedCustomerLines?.primary ?? "고객 선택"}
                  </SelectValue>
                  <span className="line-clamp-3 flex-1 pr-1 text-left text-sm leading-snug">
                    {selectedCustomerLines ? (
                      <span className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground">
                          {selectedCustomerLines.primary}
                        </span>
                        {selectedCustomerLines.secondary ? (
                          <span className="text-[11px] text-muted-foreground">
                            {selectedCustomerLines.secondary}
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">고객을 선택하세요</span>
                    )}
                  </span>
                </SelectTrigger>
                <SelectContent className="max-w-[min(100vw-2rem,36rem)]">
                  {customers.map((customer) => {
                    const lines = formatCustomerLines(customer)
                    return (
                      <SelectItem key={customer.id} value={customer.id}>
                        <span className="flex flex-col gap-0.5 py-0.5 text-left">
                          <span className="font-medium">{lines.primary}</span>
                          {lines.secondary ? (
                            <span className="text-xs text-muted-foreground">{lines.secondary}</span>
                          ) : null}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5 sm:border-l-2 sm:border-border/80 sm:pl-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm font-semibold">연결 견적</label>
              {availableQuotes.length > 0 ? <span className="text-destructive">*</span> : null}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {form.customerId
                ? "선택한 고객의 견적만 목록에 나옵니다. 제목·금액·상태로 구분할 수 있습니다."
                : "먼저 고객을 선택하면 해당 고객의 견적만 표시됩니다."}
            </p>
            {!form.customerId ? (
              <div className="flex min-h-9 items-center rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                왼쪽에서 고객을 먼저 선택해 주세요
              </div>
            ) : availableQuotes.length === 0 ? (
              <div className="space-y-1.5">
                <div className="flex min-h-9 items-center rounded-lg border border-border/60 bg-muted/25 px-3 py-2 text-sm text-muted-foreground">
                  이 고객에 연결할 견적이 없습니다
                </div>
                <p className="text-[10px] leading-snug text-muted-foreground">
                  견적 없이도 청구는 저장할 수 있습니다(선택 사항).
                </p>
              </div>
            ) : (
              <Select
                value={form.quoteId || undefined}
                onValueChange={(value) => {
                  const q = quotes.find((quote) => quote.id === value)
                  amountUserEditedRef.current = false
                  if (!q) {
                    setForm((current) => ({
                      ...current,
                      quoteId: value ?? "",
                    }))
                    return
                  }
                  const sum = sumInvoiceAmountsForQuote(
                    invoices,
                    q.id,
                    editingInvoiceId
                  )
                  const nextAmt = suggestedAmountForQuote(q, form.invoiceType, sum)
                  setForm((current) => ({
                    ...current,
                    quoteId: value ?? "",
                    customerId: q.customerId,
                    amount: String(nextAmt),
                  }))
                }}
              >
                <SelectTrigger className="h-auto min-h-10 w-full justify-between py-2 text-left">
                  <SelectValue className="sr-only">
                    {selectedQuote ? formatQuoteLines(selectedQuote, customers).primary : "견적 선택"}
                  </SelectValue>
                  <span className="line-clamp-4 flex-1 pr-1 text-left text-sm leading-snug">
                    {selectedQuote ? (
                      <span className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground">
                          {formatQuoteLines(selectedQuote, customers).primary}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatQuoteLines(selectedQuote, customers).secondary}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">견적을 선택하세요</span>
                    )}
                  </span>
                </SelectTrigger>
                <SelectContent className="max-w-[min(100vw-2rem,40rem)]">
                  {availableQuotes.map((quote) => {
                    const lines = formatQuoteLines(quote, customers)
                    return (
                      <SelectItem key={quote.id} value={quote.id}>
                        <span className="flex flex-col gap-0.5 py-0.5 text-left">
                          <span className="font-medium">{lines.primary}</span>
                          <span className="text-xs text-muted-foreground">{lines.secondary}</span>
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border/60 bg-muted/5 px-3 py-3 sm:px-4">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          2) 청구 타입 · 결제 상태 · 금액
        </p>
        <p className="mb-4 text-[11px] leading-snug text-muted-foreground">
          타입과 견적을 기준으로 금액을 제안합니다. 숫자만 입력해도 되고, 쉼표는 자동으로 정리됩니다.
        </p>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm font-semibold">청구 타입</label>
              <span className="text-destructive">*</span>
            </div>
            <Select
              value={form.invoiceType}
              onValueChange={(value) => {
                setForm((current) => {
                  const nextType =
                    (value as InvoiceFormInput["invoiceType"] | null) ?? current.invoiceType
                  const q = quotes.find((x) => x.id === current.quoteId)
                  let nextAmount = current.amount
                  if (q && !amountUserEditedRef.current) {
                    const sum = sumInvoiceAmountsForQuote(
                      invoices,
                      q.id,
                      editingInvoiceId
                    )
                    nextAmount = String(suggestedAmountForQuote(q, nextType, sum))
                  }
                  return { ...current, invoiceType: nextType, amount: nextAmount }
                })
              }}
            >
              <SelectTrigger className="h-10 w-full justify-between text-left">
                <SelectValue className="sr-only">{invoiceTypeLabel}</SelectValue>
                <span className="line-clamp-2 flex-1 text-left text-sm">{invoiceTypeLabel}</span>
              </SelectTrigger>
              <SelectContent>
                {invoiceTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              선금: 견적 총액의 50% 제안 · 잔금/최종: 견적 대비 남은 금액 제안
            </p>
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm font-semibold">결제 상태</label>
              <span className="text-destructive">*</span>
            </div>
            <Select
              value={form.paymentStatus}
              onValueChange={(value) => {
                setForm((current) => {
                  const next = (value as PaymentStatus | null) ?? current.paymentStatus
                  const keepPaidAt = ["paid", "partially_paid", "deposit_paid"].includes(next)
                  return {
                    ...current,
                    paymentStatus: next,
                    paidAt: keepPaidAt ? current.paidAt : "",
                  }
                })
              }}
            >
              <SelectTrigger className="h-10 w-full justify-between text-left">
                <SelectValue className="sr-only">{paymentStatusLabel}</SelectValue>
                <span className="line-clamp-2 flex-1 text-left text-sm">{paymentStatusLabel}</span>
              </SelectTrigger>
              <SelectContent>
                {paymentStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 lg:col-span-1">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm font-semibold">청구 금액</label>
              <span className="text-destructive">*</span>
            </div>
            <div className="relative">
              <Input
                className="h-10 pr-10 tabular-nums"
                value={formatAmountDigitsDisplay(form.amount)}
                onChange={(event) => {
                  const digits = event.target.value.replace(/\D/g, "")
                  amountUserEditedRef.current = true
                  setForm((current) => ({ ...current, amount: digits }))
                }}
                inputMode="numeric"
                placeholder="예: 3300000"
                aria-invalid={!formValidation.ok && formValidation.issues.some((i) => i.key === "amount")}
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                원
              </span>
            </div>
            {suggestedAmountValue != null && selectedQuote ? (
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] text-muted-foreground">
                  제안: {formatCurrency(suggestedAmountValue)} (견적 총액 {formatCurrency(selectedQuote.total)})
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() => {
                    amountUserEditedRef.current = false
                    setForm((c) => ({ ...c, amount: String(suggestedAmountValue) }))
                  }}
                >
                  제안 금액 적용
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border/60 bg-muted/5 px-3 py-3 sm:px-4">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          3) 청구일 · 입금 기한
        </p>
        <p className="mb-3 text-[11px] leading-snug text-muted-foreground">
          청구를 발행한 날과 입금 마감일을 먼저 정합니다. 실제 입금일은 아래 &quot;결제 처리 정보&quot;에서
          입력합니다.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm font-semibold">청구일</label>
              <span className="text-destructive">*</span>
            </div>
            <p className="text-[10px] text-muted-foreground">청구서·기록상 요청일(발행일)입니다.</p>
            <Input
              type="date"
              className="h-10 max-w-full sm:max-w-xs"
              value={form.requestedAt ? form.requestedAt.slice(0, 10) : ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, requestedAt: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">입금 기한</label>
            <p className="text-[10px] text-muted-foreground">고객에게 안내하는 납부 마감일입니다.</p>
            <Input
              type="date"
              className="h-10 max-w-full sm:max-w-xs"
              value={form.dueDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, dueDate: event.target.value }))
              }
            />
          </div>
        </div>
      </section>

      <details className="rounded-lg border border-border/50 bg-muted/15 [&_summary]:cursor-pointer [&_summary]:select-none">
        <summary className="px-3 py-2.5 text-xs font-medium text-muted-foreground">
          결제 처리 정보
          {showPaidAtField ? (
            <span className="ml-2 font-normal text-foreground/70">— 입금일 입력</span>
          ) : null}
        </summary>
        <div className="space-y-3 border-t border-border/40 px-3 py-3">
          {showPaidAtField ? (
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">실제 입금일</label>
              <p className="text-[10px] text-muted-foreground">
                입금이 확인된 날짜입니다. 미수 추적과 맞추려면 정확히 입력해 주세요.
              </p>
              <Input
                type="date"
                className="h-10 max-w-xs"
                value={form.paidAt ? form.paidAt.slice(0, 10) : ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    paidAt: event.target.value
                      ? new Date(`${event.target.value}T12:00:00`).toISOString()
                      : "",
                  }))
                }
              />
            </div>
          ) : (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              결제 상태를 <strong className="font-medium text-foreground/90">입금 완료</strong>,{" "}
              <strong className="font-medium text-foreground/90">선금 입금</strong>,{" "}
              <strong className="font-medium text-foreground/90">부분 입금</strong> 중 하나로 바꾸면
              입금일을 입력할 수 있습니다.
            </p>
          )}
        </div>
      </details>

      <section className="rounded-lg border border-border/60 bg-muted/5 px-3 py-3 sm:px-4">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          메모 (선택)
        </p>
        <p className="mb-2 text-[11px] leading-snug text-muted-foreground">
          입금 안내 문구, 분할 납부 조건, 고객에게 전달할 메모나 내부 참고 사항을 남길 수 있습니다. 청구
          상세·리마인드 작성 시 함께 참고합니다.
        </p>
        <Textarea
          value={form.notes}
          onChange={(event) =>
            setForm((current) => ({ ...current, notes: event.target.value }))
          }
          className="min-h-[5.5rem] text-sm"
          placeholder="예: 선금 50% 입금 후 착수 · 잔금은 납품 검수 후 7일 이내"
        />
      </section>

      {errorMessage ? (
        <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )

  return (
    <div className="space-y-2.5 md:space-y-3.5">
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          onOpenChange(open)
          if (!open) {
            resetInvoiceForm()
          }
        }}
      >
        <DialogContent className={invoiceFormDialogClass}>
          <div className="shrink-0 border-b border-border/60 px-4 pb-3 pt-4 pr-12 sm:px-6 sm:pr-14">
            <DialogHeader className="gap-1">
              <DialogTitle className="text-lg">청구 생성</DialogTitle>
              <DialogDescription className="text-xs leading-relaxed">
                고객·견적을 확인하고, 청구 금액과 기한을 정한 뒤 저장합니다. 필수 항목은 빨간 별(
                <span className="text-destructive">*</span>)로 표시됩니다.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-[min(44vh,360px)] flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
            {formFields}
          </div>
          <div className="flex shrink-0 flex-col gap-2 border-t border-border/60 bg-background/95 px-4 py-3 shadow-[0_-6px_16px_rgba(0,0,0,0.06)] backdrop-blur-md supports-[backdrop-filter]:bg-background/85 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:shadow-[0_-6px_20px_rgba(0,0,0,0.25)]">
            <p className="text-[11px] leading-snug text-muted-foreground sm:max-w-[58%]">
              {!formValidation.ok ? (
                <span className="font-medium text-amber-900 dark:text-amber-100">
                  위쪽 노란색 안내를 채우면 저장할 수 있습니다. 저장 버튼에 마우스를 올리면 요약을 볼 수
                  있습니다.
                </span>
              ) : (
                <>필수 항목이 모두 채워졌습니다. 저장하면 청구가 등록됩니다.</>
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
                    formValidation.ok && !isPending ? "입력한 내용으로 청구를 저장합니다" : undefined
                  }
                >
                  {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                  저장
                </Button>
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {hasInvoices ? (
        <div className="rounded-lg border border-border/60 bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
          선금·잔금을 나눠 청구하고, 입금 상태를 바꾸며 미수 시 리마인드를 남길 수 있습니다.
        </div>
      ) : null}

      {hasInvoices ? (
        <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-3">
          <p className="text-xs font-medium text-muted-foreground">빠른 필터</p>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { key: "all" as const, label: "전체" },
                { key: "unpaid" as const, label: "미수금" },
                { key: "overdue" as const, label: "연체" },
                { key: "paid" as const, label: "입금완료" },
              ] as const
            ).map(({ key, label }) => (
              <Button
                key={key}
                type="button"
                size="sm"
                className="h-8"
                variant={paymentQuickFilter === key ? "default" : "outline"}
                onClick={() => {
                  setPaymentQuickFilter(key)
                  setPaymentStatusFilter("all")
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
            <label className="text-xs font-medium text-muted-foreground">상세 상태</label>
            <Select
              value={paymentStatusFilter}
              onValueChange={(value) => {
                setPaymentStatusFilter((value as PaymentStatus | "all") ?? "all")
                setPaymentQuickFilter("all")
              }}
            >
              <SelectTrigger className="h-8 w-full sm:w-[200px]">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 (상세)</SelectItem>
                {paymentStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      {!invoices.length ? (
        <>
          <Card className="border border-primary/30 bg-gradient-to-b from-primary/[0.05] to-background shadow-sm">
            <CardContent className="space-y-2 p-2.5 sm:space-y-2 sm:p-3">
              <div className="flex flex-wrap gap-1">
                <span className="rounded border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                  선금·잔금 분리
                </span>
                <span className="rounded border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                  미수·연체 추적
                </span>
                <span className="rounded border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                  리마인드 기록
                </span>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">시작하기</p>
                <h2 className="text-sm font-bold tracking-tight sm:text-base">
                  {hasQuotes
                    ? "견적을 확인한 뒤 첫 청구를 만들어보세요"
                    : "견적을 먼저 준비한 뒤 청구를 시작하세요"}
                </h2>
                <p className="text-xs leading-snug text-muted-foreground">
                  견적을 바탕으로 선금·잔금을 나누고, 입금 상태와 리마인드 이력을 한곳에서 관리합니다.
                </p>
              </div>

              {hasQuotes ? (
                <div className="flex flex-col gap-1.5 rounded-md border border-border/60 bg-background/80 p-2 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <label className="text-[10px] font-medium text-muted-foreground">
                      빠른 시작 · 견적 선택
                    </label>
                    <Select
                      value={quickQuoteId}
                      onValueChange={(value) => setQuickQuoteId(value ?? "")}
                    >
                      <SelectTrigger className="h-8 w-full text-sm">
                        <SelectValue placeholder="견적 선택" />
                      </SelectTrigger>
                      <SelectContent className="max-w-[min(100vw-2rem,40rem)]">
                        {quotes.map((quote) => {
                          const lines = formatQuoteLines(quote, customers)
                          return (
                            <SelectItem key={quote.id} value={quote.id}>
                              <span className="flex flex-col gap-0.5 py-0.5 text-left">
                                <span className="font-medium">{lines.primary}</span>
                                <span className="text-xs text-muted-foreground">{lines.secondary}</span>
                              </span>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 w-full shrink-0 text-sm sm:w-auto"
                    disabled={!quickQuoteId}
                    onClick={() => openCreateWithQuote(quickQuoteId)}
                  >
                    이 견적으로 청구 만들기
                  </Button>
                </div>
              ) : null}

              <div ref={flowRef} className="rounded-md border border-border/60 bg-muted/15 p-1.5 sm:p-2">
                <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                  진행 순서
                </p>
                <ol className="grid gap-1 sm:grid-cols-3">
                  {flowSteps.map((item) => (
                    <li
                      key={item.step}
                      className="flex gap-1 rounded border border-border/50 bg-background/70 px-1.5 py-1 text-[11px]"
                    >
                      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[9px] font-bold text-primary">
                        {item.step}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold leading-tight">{item.title}</p>
                        <p className="mt-px text-[9px] leading-snug text-muted-foreground">{item.hint}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href="/quotes"
                  className={cn(
                    buttonVariants({ size: "sm", variant: hasQuotes ? "outline" : "default" }),
                    "inline-flex h-8 items-center justify-center gap-1.5 text-sm font-semibold"
                  )}
                >
                  {hasQuotes ? "견적 보기" : "견적 만들기"}
                  <ArrowRight className="size-3.5" />
                </Link>
                <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-sm" onClick={scrollToFlow}>
                  <ListOrdered className="size-3.5" />
                  청구 흐름 보기
                </Button>
                {hasQuotes ? (
                  <Button type="button" size="sm" className="h-8 gap-1.5 text-sm font-semibold" onClick={openCreateFresh}>
                    <Plus className="size-3.5" />
                    청구 만들기
                  </Button>
                ) : (
                  <span
                    className="inline-flex w-full sm:w-auto"
                    title="청구 생성 전에 먼저 견적을 준비해주세요"
                  >
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-8 w-full cursor-not-allowed gap-1.5 opacity-60 sm:w-auto"
                      disabled
                    >
                      <Plus className="size-3.5" />
                      청구 만들기
                    </Button>
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="rounded-lg border border-border/70 bg-muted/25 px-3 py-3 shadow-sm sm:flex sm:items-center sm:gap-3">
            <div
              className="mb-2 flex size-9 shrink-0 items-center justify-center rounded-md border border-border/50 bg-background/80 sm:mb-0"
              aria-hidden
            >
              <Receipt className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1 space-y-2 sm:space-y-0">
              <div>
                <p className="text-sm font-semibold text-foreground">아직 생성된 청구가 없습니다</p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                  {hasQuotes
                    ? "저장한 청구가 여기에 쌓이며, 입금·리마인드를 같은 화면에서 다룹니다."
                    : "견적을 만든 뒤 위 카드에서 선금·잔금 청구를 바로 시작할 수 있습니다."}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:mt-2 sm:justify-end">
                <Link
                  href="/quotes"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "inline-flex h-8 items-center gap-1.5"
                  )}
                >
                  {hasQuotes ? "견적 보기" : "견적 만들기"}
                  <ArrowRight className="size-3" />
                </Link>
                <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 px-2" onClick={scrollToFlow}>
                  <ListOrdered className="size-3.5" />
                  청구 흐름 보기
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : !filteredInvoices.length ? (
        <EmptyState
          title="조건에 맞는 청구가 없습니다"
          description="필터를 바꿔 다시 확인해 보세요."
        />
      ) : null}

      {filteredInvoices.map((invoice) => {
        const customer = invoice.customer
        const reminders = invoice.reminders

        return (
          <Card key={invoice.id} className="border-border/70">
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>
                    {invoice.invoiceNumber} · {customer?.companyName ?? customer?.name}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {invoice.invoiceType === "deposit"
                      ? "선금 청구"
                      : invoice.invoiceType === "balance"
                        ? "잔금 청구"
                        : "최종 청구"}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <PaymentStatusBadge status={invoice.paymentStatus} />
                  <Select
                    value={invoice.paymentStatus}
                    onValueChange={(value) =>
                      updatePaymentStatus(
                        invoice.id,
                        (value as PaymentStatus | null) ?? invoice.paymentStatus,
                        invoice.customerId
                      )
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentStatusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" type="button" onClick={() => openEdit(invoice)}>
                    <Pencil className="size-4" />
                    수정
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setReminderInvoiceId(invoice.id)
                      setReminderForm({
                        channel: "kakao",
                        message: defaultReminderMessage,
                      })
                    }}
                  >
                    <BellRing className="size-4" />
                    리마인드
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">청구 금액</p>
                  <p className="mt-2 text-lg font-semibold">
                    {formatCurrency(invoice.amount)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">요청일</p>
                  <p className="mt-2 text-lg font-semibold">
                    {formatDate(invoice.requestedAt)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">기한</p>
                  <p className="mt-2 text-lg font-semibold">{formatDate(invoice.dueDate)}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">입금일</p>
                  <p className="mt-2 text-lg font-semibold">{formatDate(invoice.paidAt)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">메모</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {invoice.notes || "메모가 없습니다."}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">리마인드 이력</p>
                {reminders.length ? (
                  <div className="space-y-2">
                    {reminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className="rounded-xl border border-border/70 px-3 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                            {reminder.channel}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(reminder.sentAt)}
                          </p>
                        </div>
                        <p className="mt-2 text-sm leading-6">{reminder.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    아직 발송된 리마인드가 없습니다.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}

      <Dialog
        open={editingInvoiceId !== null}
        onOpenChange={(open) => {
          if (!open) {
            resetInvoiceForm()
          }
        }}
      >
        <DialogContent className={invoiceFormDialogClass}>
          <div className="shrink-0 border-b border-border/60 px-4 pb-3 pt-4 pr-12 sm:px-6 sm:pr-14">
            <DialogHeader className="gap-1">
              <DialogTitle className="text-lg">청구 수정</DialogTitle>
              <DialogDescription className="text-xs leading-relaxed">
                금액·상태·기한·메모를 수정하면 DB에 반영됩니다. 필수 항목은 빨간 별(
                <span className="text-destructive">*</span>)로 표시됩니다.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-[min(44vh,360px)] flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
            {formFields}
          </div>
          <div className="flex shrink-0 flex-col gap-2 border-t border-border/60 bg-background/95 px-4 py-3 shadow-[0_-6px_16px_rgba(0,0,0,0.06)] backdrop-blur-md supports-[backdrop-filter]:bg-background/85 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:shadow-[0_-6px_20px_rgba(0,0,0,0.25)]">
            <p className="text-[11px] leading-snug text-muted-foreground sm:max-w-[58%]">
              {!formValidation.ok ? (
                <span className="font-medium text-amber-900 dark:text-amber-100">
                  위쪽 노란색 안내를 채우면 저장할 수 있습니다.
                </span>
              ) : (
                <>수정 내용을 저장하면 청구에 반영됩니다.</>
              )}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" type="button" onClick={resetInvoiceForm}>
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
                  disabled={isPending || !editingInvoice || !formValidation.ok}
                  className="gap-2"
                  title={
                    formValidation.ok && !isPending && editingInvoice
                      ? "수정한 내용을 저장합니다"
                      : undefined
                  }
                >
                  {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                  저장
                </Button>
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reminderInvoiceId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReminderInvoiceId(null)
            setReminderForm({ channel: "kakao", message: "" })
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>리마인드 기록 추가</DialogTitle>
            <DialogDescription>
              발송 채널과 내용을 저장하면 활동 로그에도 남습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">채널</label>
              <Select
                value={reminderForm.channel}
                onValueChange={(value) =>
                  setReminderForm((current) => ({
                    ...current,
                    channel: (value as ReminderChannel | null) ?? current.channel,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reminderChannelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">메시지</label>
              <Textarea
                value={reminderForm.message}
                onChange={(event) =>
                  setReminderForm((current) => ({
                    ...current,
                    message: event.target.value,
                  }))
                }
                className="min-h-28"
              />
            </div>
            {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setReminderInvoiceId(null)}>
              취소
            </Button>
            <Button type="button" onClick={saveReminder} disabled={isPending || !reminderInvoice} className="gap-2">
              {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function InvoicesWorkspace({
  invoices,
  customers,
  quotes,
  defaultReminderMessage,
}: {
  invoices: InvoiceWithReminders[]
  customers: Customer[]
  quotes: Quote[]
  defaultReminderMessage: string
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const createOpenSourceRef = useRef<"header" | null>(null)
  const hasQuotes = quotes.length > 0

  return (
    <div className="space-y-3 md:space-y-4">
      <PageHeader
        title="청구 및 수금"
        description="선금·잔금 청구, 입금 상태, 미수 리마인드 이력을 한곳에서 다룹니다."
        action={
          <div className="w-full sm:w-auto sm:min-w-[18rem]">
            {hasQuotes ? (
              <div className="rounded-lg border border-border/60 bg-muted/15 p-2 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:justify-end">
                  <Link
                    href="/quotes"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "inline-flex h-9 w-full shrink-0 items-center justify-center gap-1.5 font-medium sm:w-auto"
                    )}
                  >
                    견적 보기
                    <ArrowRight className="size-3.5" />
                  </Link>
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 w-full gap-1.5 font-semibold sm:w-auto"
                    onClick={() => {
                      createOpenSourceRef.current = "header"
                      setIsCreateOpen(true)
                    }}
                  >
                    <Plus className="size-4" />
                    청구 만들기
                  </Button>
                </div>
                <p className="mt-2 border-t border-border/50 pt-2 text-center text-[11px] leading-snug text-muted-foreground sm:text-right">
                  견적을 확인한 뒤 청구를 저장할 수 있습니다
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border/60 bg-muted/15 p-2 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2">
                  <Link
                    href="/quotes"
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "inline-flex h-9 flex-1 items-center justify-center gap-1.5 font-semibold"
                    )}
                  >
                    견적 만들기
                    <ArrowRight className="size-3.5" />
                  </Link>
                  <span
                    className="flex flex-1 sm:max-w-[9rem]"
                    title="청구 생성 전에 먼저 견적을 준비해주세요"
                  >
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled
                      className="h-9 w-full cursor-not-allowed gap-1.5 opacity-60"
                    >
                      <Plus className="size-3.5" />
                      청구 만들기
                    </Button>
                  </span>
                </div>
                <p className="mt-2 border-t border-border/50 pt-2 text-[11px] leading-snug text-muted-foreground">
                  <span className="text-foreground/80">먼저 견적을 준비해 주세요.</span>{" "}
                  준비되면 청구 만들기가 활성화됩니다.
                </p>
              </div>
            )}
          </div>
        }
      />

      <InvoicesBoardPanel
        invoices={invoices}
        customers={customers}
        quotes={quotes}
        defaultReminderMessage={defaultReminderMessage}
        isCreateOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        createOpenSourceRef={createOpenSourceRef}
      />
    </div>
  )
}
