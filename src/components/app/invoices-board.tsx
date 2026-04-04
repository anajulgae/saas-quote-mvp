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
    requestedAt: "",
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
      setForm(createEmptyInvoiceForm(customers))
    }
    createOpenSourceRef.current = null
  }, [isCreateOpen, customers, createOpenSourceRef])

  const availableQuotes = useMemo(
    () => quotes.filter((quote) => !form.customerId || quote.customerId === form.customerId),
    [form.customerId, quotes]
  )

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
    setForm(createEmptyInvoiceForm(customers))
    setEditingInvoiceId(null)
    setErrorMessage("")
  }

  const openEdit = (invoice: InvoiceWithReminders) => {
    setEditingInvoiceId(invoice.id)
    setErrorMessage("")
    setForm(toInvoiceForm(invoice))
  }

  const openCreateFresh = () => {
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
    setEditingInvoiceId(null)
    setErrorMessage("")
    setForm({
      ...createEmptyInvoiceForm(customers),
      customerId: q.customerId,
      quoteId: q.id,
      amount: String(q.total),
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
                quoteId: "",
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
          <label className="text-sm font-medium">연결 견적</label>
          <Select
            value={form.quoteId || undefined}
            onValueChange={(value) => {
              const selectedQuote = quotes.find((quote) => quote.id === value)

              setForm((current) => ({
                ...current,
                quoteId: value ?? "",
                amount:
                  selectedQuote && !current.amount
                    ? String(selectedQuote.total)
                    : current.amount,
              }))
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="견적 선택 안 함" />
            </SelectTrigger>
            <SelectContent>
              {availableQuotes.map((quote) => (
                <SelectItem key={quote.id} value={quote.id}>
                  {quote.quoteNumber} · {quote.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">청구 타입</label>
          <Select
            value={form.invoiceType}
            onValueChange={(value) =>
              setForm((current) => ({
                ...current,
                invoiceType: (value as InvoiceFormInput["invoiceType"] | null) ?? current.invoiceType,
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {invoiceTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">결제 상태</label>
          <Select
            value={form.paymentStatus}
            onValueChange={(value) =>
              setForm((current) => ({
                ...current,
                paymentStatus: (value as PaymentStatus | null) ?? current.paymentStatus,
              }))
            }
          >
            <SelectTrigger className="w-full">
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
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">청구 금액</label>
          <Input
            value={form.amount}
            onChange={(event) =>
              setForm((current) => ({ ...current, amount: event.target.value }))
            }
            inputMode="numeric"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">청구일</label>
          <Input
            type="date"
            value={form.requestedAt ? form.requestedAt.slice(0, 10) : ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, requestedAt: event.target.value }))
            }
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">입금 기한</label>
          <Input
            type="date"
            value={form.dueDate}
            onChange={(event) =>
              setForm((current) => ({ ...current, dueDate: event.target.value }))
            }
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">입금일</label>
          <Input
            type="date"
            value={form.paidAt ? form.paidAt.slice(0, 10) : ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, paidAt: event.target.value }))
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">메모</label>
        <Textarea
          value={form.notes}
          onChange={(event) =>
            setForm((current) => ({ ...current, notes: event.target.value }))
          }
          className="min-h-24"
        />
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
    </div>
  )

  return (
    <div className="space-y-3 md:space-y-4">
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          onOpenChange(open)
          if (!open) {
            resetInvoiceForm()
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>청구 생성</DialogTitle>
            <DialogDescription>선금/잔금 청구를 실제 데이터로 저장합니다.</DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="button" onClick={saveCreate} disabled={isPending} className="gap-2">
              {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              저장
            </Button>
          </DialogFooter>
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
            <CardContent className="space-y-2.5 p-3 sm:p-4">
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-md border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  선금·잔금 분리
                </span>
                <span className="rounded-md border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  미수·연체 추적
                </span>
                <span className="rounded-md border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  리마인드 기록
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">시작하기</p>
                <h2 className="text-base font-bold tracking-tight sm:text-lg">
                  {hasQuotes
                    ? "견적을 확인한 뒤 첫 청구를 만들어보세요"
                    : "견적을 먼저 준비한 뒤 청구를 시작하세요"}
                </h2>
                <p className="text-[13px] leading-snug text-muted-foreground">
                  청구는 견적을 바탕으로 선금·잔금 요청을 만들고, 결제 상태와 리마인드 이력을 관리합니다.
                </p>
              </div>

              {hasQuotes ? (
                <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-background/80 p-2.5 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1 space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      빠른 시작 · 견적 선택
                    </label>
                    <Select
                      value={quickQuoteId}
                      onValueChange={(value) => setQuickQuoteId(value ?? "")}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="견적 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {quotes.map((quote) => (
                          <SelectItem key={quote.id} value={quote.id}>
                            {quote.quoteNumber} · {quote.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 w-full shrink-0 sm:w-auto"
                    disabled={!quickQuoteId}
                    onClick={() => openCreateWithQuote(quickQuoteId)}
                  >
                    이 견적으로 청구 만들기
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
                        <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                          {item.hint}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
                <Link
                  href="/quotes"
                  className={cn(
                    buttonVariants({ size: "sm", variant: hasQuotes ? "outline" : "default" }),
                    "inline-flex h-9 items-center justify-center gap-1.5 font-semibold"
                  )}
                >
                  견적 보기
                  <ArrowRight className="size-3.5" />
                </Link>
                <Button type="button" size="sm" variant="outline" className="h-9 gap-1.5" onClick={scrollToFlow}>
                  <ListOrdered className="size-3.5" />
                  청구 흐름 보기
                </Button>
                {hasQuotes ? (
                  <Button type="button" size="sm" className="h-9 gap-1.5 font-semibold" onClick={openCreateFresh}>
                    <Plus className="size-3.5" />
                    첫 청구 만들기
                  </Button>
                ) : (
                  <span title="청구 생성 전에 먼저 견적을 준비해주세요">
                    <Button type="button" size="sm" className="h-9 gap-1.5" disabled>
                      <Plus className="size-3.5" />
                      첫 청구 만들기
                    </Button>
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2.5 rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-2.5">
            <Receipt className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium text-foreground">아직 생성된 청구가 없습니다</p>
              <p className="text-[11px] leading-snug text-muted-foreground">
                {hasQuotes
                  ? "청구를 저장하면 이 영역에 카드가 쌓이고, 입금·리마인드를 한곳에서 관리할 수 있어요."
                  : "견적이 생기면 위에서 바로 선금·잔금 청구를 만들 수 있어요."}
              </p>
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>청구 수정</DialogTitle>
            <DialogDescription>
              금액, 상태, 기한과 메모를 실제 DB에 저장합니다.
            </DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={resetInvoiceForm}>
              닫기
            </Button>
            <Button type="button" onClick={saveEdit} disabled={isPending || !editingInvoice} className="gap-2">
              {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              저장
            </Button>
          </DialogFooter>
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
    <div className="space-y-4 md:space-y-5">
      <PageHeader
        title="청구 및 수금"
        description="선금·잔금 청구, 입금 상태, 미수 리마인드 이력을 한곳에서 다룹니다."
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
            {hasQuotes ? (
              <Button
                type="button"
                className="h-9 w-full gap-2 sm:w-auto"
                onClick={() => {
                  createOpenSourceRef.current = "header"
                  setIsCreateOpen(true)
                }}
              >
                <Plus className="size-4" />
                새 청구
              </Button>
            ) : (
              <div className="w-full rounded-lg border border-border/60 bg-muted/20 p-2.5 sm:w-auto sm:min-w-[17rem]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2">
                  <Link
                    href="/quotes"
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "inline-flex h-9 flex-1 items-center justify-center gap-2 font-medium"
                    )}
                  >
                    견적 만들기
                    <ArrowRight className="size-3.5" />
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled
                    className="h-9 flex-1 cursor-not-allowed opacity-50 sm:max-w-[8.5rem]"
                    title="청구 생성 전에 먼저 견적을 준비해주세요"
                  >
                    <Plus className="size-3.5" />
                    새 청구
                  </Button>
                </div>
                <p className="mt-1.5 border-t border-border/40 pt-1.5 text-center text-[11px] leading-snug text-muted-foreground sm:text-left">
                  청구 생성 전에 먼저 견적을 준비해주세요
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
