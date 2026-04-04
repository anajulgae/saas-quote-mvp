"use client"

import Link from "next/link"
import { useMemo, useState, useTransition } from "react"
import { ArrowRight, BellRing, Loader2, Pencil, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  createInvoiceAction,
  createReminderAction,
  updateInvoiceAction,
  updateInvoicePaymentStatusAction,
} from "@/app/actions"
import { EmptyState } from "@/components/app/empty-state"
import { PaymentStatusBadge } from "@/components/app/status-badge"
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

export function InvoicesBoard({
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
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null)
  const [reminderInvoiceId, setReminderInvoiceId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [paymentQuickFilter, setPaymentQuickFilter] =
    useState<PaymentQuickFilter>("all")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<
    PaymentStatus | "all"
  >("all")
  const [form, setForm] = useState<InvoiceFormState>(() => createEmptyInvoiceForm(customers))
  const [reminderForm, setReminderForm] = useState<{
    channel: ReminderChannel
    message: string
  }>({
    channel: "kakao",
    message: "",
  })

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
      setIsCreateOpen(false)
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium">청구 관리 흐름</p>
          <p className="mt-1 text-sm text-muted-foreground">
            견적 기반 청구 생성, 결제 상태 변경, 리마인드 기록을 한 화면에서 관리합니다.
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="size-4" />새 청구
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>청구 생성</DialogTitle>
              <DialogDescription>선금/잔금 청구를 실제 데이터로 저장합니다.</DialogDescription>
            </DialogHeader>
            {formFields}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                취소
              </Button>
              <Button onClick={saveCreate} disabled={isPending} className="gap-2">
                {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                저장
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
        <p className="text-sm font-medium text-muted-foreground">빠른 필터</p>
        <div className="flex flex-wrap gap-2">
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="text-sm font-medium text-muted-foreground">상세 상태</label>
          <Select
            value={paymentStatusFilter}
            onValueChange={(value) => {
              setPaymentStatusFilter((value as PaymentStatus | "all") ?? "all")
              setPaymentQuickFilter("all")
            }}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
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

      {!invoices.length ? (
        <EmptyState
          title="청구가 없습니다"
          description="견적이 수락된 뒤 선금·잔금 청구를 만들고, 입금 상태를 여기서 갱신합니다."
        >
          <Button type="button" onClick={() => setIsCreateOpen(true)}>
            <Plus className="size-4" />
            첫 청구 만들기
          </Button>
          <Link
            href="/quotes"
            className={cn(buttonVariants({ variant: "outline" }), "inline-flex items-center gap-1")}
          >
            견적 보기
            <ArrowRight className="size-3.5" />
          </Link>
        </EmptyState>
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
                  <Dialog
                    open={editingInvoiceId === invoice.id}
                    onOpenChange={(open) => {
                      if (!open) {
                        resetInvoiceForm()
                      }
                    }}
                  >
                    <DialogTrigger
                      render={<Button variant="outline" size="sm" />}
                      onClick={() => openEdit(invoice)}
                    >
                      <Pencil className="size-4" />
                      수정
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>청구 수정</DialogTitle>
                        <DialogDescription>
                          금액, 상태, 기한과 메모를 실제 DB에 저장합니다.
                        </DialogDescription>
                      </DialogHeader>
                      {formFields}
                      <DialogFooter>
                        <Button variant="outline" onClick={resetInvoiceForm}>
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
                  <Dialog
                    open={reminderInvoiceId === invoice.id}
                    onOpenChange={(open) => {
                      if (!open) {
                        setReminderInvoiceId(null)
                        setReminderForm({ channel: "kakao", message: "" })
                      }
                    }}
                  >
                    <DialogTrigger
                      render={<Button variant="outline" size="sm" />}
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
                    </DialogTrigger>
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
                                channel:
                                  (value as ReminderChannel | null) ?? current.channel,
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
                        {errorMessage ? (
                          <p className="text-sm text-destructive">{errorMessage}</p>
                        ) : null}
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setReminderInvoiceId(null)}
                        >
                          취소
                        </Button>
                        <Button onClick={saveReminder} disabled={isPending} className="gap-2">
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
    </div>
  )
}
