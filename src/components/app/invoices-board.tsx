"use client"

import Link from "next/link"
import {
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type MutableRefObject,
} from "react"
import {
  ArrowRight,
  BellRing,
  ExternalLink,
  ListOrdered,
  Loader2,
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  Sparkles,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  createInvoiceAction,
  createReminderAction,
  updateInvoiceAction,
  updateInvoicePaymentStatusAction,
} from "@/app/actions"
import { EmptyState } from "@/components/app/empty-state"
import { InvoiceSendDialog } from "@/components/app/invoice-send-dialog"
import { PageHeader } from "@/components/app/page-header"
import { OpsTimeHintChip, OpsToolbarFilterButton } from "@/components/app/ops-status-chip"
import { PaymentStatusBadge } from "@/components/app/status-badge"
import { OpsCollapsibleFilters } from "@/components/operations/ops-collapsible-filters"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  invoiceTypeOptions,
  paymentStatusOptions,
  quoteStatusOptions,
  reminderChannelOptions,
} from "@/lib/constants"
import { resolveActivityHeadline } from "@/lib/activity-presentation"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type {
  ActivityLog,
  Customer,
  InvoiceFormInput,
  InvoiceType,
  InvoiceWithReminders,
  PaymentStatus,
  Quote,
  ReminderChannel,
} from "@/types/domain"

type PaymentQuickFilter = "all" | "unpaid" | "overdue" | "paid"

type InvoiceListSort = "requested_desc" | "due_asc" | "amount_desc" | "customer"

const paymentStatusSelectItemsRecord = Object.fromEntries(
  paymentStatusOptions.map((o) => [o.value, o.label])
) as Record<string, string>

const invoiceTypeSelectItemsRecord = Object.fromEntries(
  invoiceTypeOptions.map((o) => [o.value, o.label])
) as Record<string, string>

const invoiceTypeFilterSelectItems: Record<string, string> = {
  all: "전체",
  ...invoiceTypeSelectItemsRecord,
}

const invoiceSortSelectItemsRecord: Record<string, string> = {
  requested_desc: "최신 청구순",
  due_asc: "입금 기한 임박순",
  amount_desc: "금액 높은순",
  customer: "고객명순",
}

const paymentStatusFilterSelectItems: Record<string, string> = {
  all: "상세 상태 · 전체",
  ...paymentStatusSelectItemsRecord,
}

const reminderChannelSelectItemsRecord = Object.fromEntries(
  reminderChannelOptions.map((o) => [o.value, o.label])
) as Record<string, string>

const reminderToneSelectItemsRecord: Record<string, string> = {
  polite: "정중형",
  neutral: "기본형",
  firm: "단호형",
}

function invoiceListSearchHaystack(inv: InvoiceWithReminders): string {
  const c = inv.customer
  return [
    inv.invoiceNumber,
    c?.name,
    c?.companyName,
    c?.email,
    c?.phone,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

function invoiceTypeTableLabel(type: InvoiceType): string {
  if (type === "deposit") {
    return "선금"
  }
  if (type === "balance") {
    return "잔금"
  }
  return "최종"
}

/** 입금 완료 전·기한 기준 행 강조(연체·임박) */
function invoiceRowReceivableHint(inv: InvoiceWithReminders): "overdue" | "due_soon" | null {
  if (inv.paymentStatus === "paid") {
    return null
  }
  if (inv.paymentStatus === "overdue") {
    return "overdue"
  }
  if (!inv.dueDate) {
    return null
  }
  const due = new Date(inv.dueDate)
  const today = new Date()
  due.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  if (due < today) {
    return "overdue"
  }
  const diffDays = (due.getTime() - today.getTime()) / 86400000
  if (diffDays <= 3) {
    return "due_soon"
  }
  return null
}

function linkedQuoteSummary(inv: InvoiceWithReminders, quoteList: Quote[]): string {
  if (!inv.quoteId) {
    return "—"
  }
  const q = quoteList.find((x) => x.id === inv.quoteId)
  if (!q) {
    return "견적 연결"
  }
  const title = q.title.trim() || q.quoteNumber
  const short = title.length > 28 ? `${title.slice(0, 28)}…` : title
  return `${q.quoteNumber} · ${short}`
}

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

/** 연결 청구 유무에 따라 선금 → 잔금 순으로 제안 */
function nextInvoiceSuggestionForQuote(
  quote: Quote,
  allInvoices: InvoiceWithReminders[],
  excludeInvoiceId: string | null
): { invoiceType: InvoiceFormInput["invoiceType"]; amount: number } {
  const sum = sumInvoiceAmountsForQuote(allInvoices, quote.id, excludeInvoiceId)
  const linked = allInvoices.filter(
    (i) => i.quoteId === quote.id && (!excludeInvoiceId || i.id !== excludeInvoiceId)
  )

  if (linked.length === 0) {
    return {
      invoiceType: "deposit",
      amount: suggestedAmountForQuote(quote, "deposit", sum),
    }
  }

  const balanceAmt = suggestedAmountForQuote(quote, "balance", sum)
  if (balanceAmt > 0) {
    return { invoiceType: "balance", amount: balanceAmt }
  }

  return {
    invoiceType: "final",
    amount: suggestedAmountForQuote(quote, "final", sum),
  }
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
  invoiceActivityByInvoiceId,
  businessName,
  bankAccount,
  paymentTerms,
  isCreateOpen,
  onOpenChange,
  createOpenSourceRef,
  deepLinkQuoteId,
  deepLinkOpenCreate,
  initialCustomerFilterId,
}: {
  invoices: InvoiceWithReminders[]
  customers: Customer[]
  quotes: Quote[]
  defaultReminderMessage: string
  invoiceActivityByInvoiceId: Record<string, ActivityLog[]>
  businessName: string
  bankAccount: string
  paymentTerms: string
  isCreateOpen: boolean
  onOpenChange: (open: boolean) => void
  createOpenSourceRef: MutableRefObject<"header" | null>
  deepLinkQuoteId?: string
  deepLinkOpenCreate?: boolean
  /** `/invoices?customer=uuid` — 고객별 청구만 표시 (`quote`+`new` 딥링크와 동시 사용 안 함) */
  initialCustomerFilterId?: string
}) {
  const router = useRouter()
  const deepLinkConsumedRef = useRef(false)
  const customerFilterDeepLinkRef = useRef(false)
  const flowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!deepLinkQuoteId?.trim() && !deepLinkOpenCreate) {
      deepLinkConsumedRef.current = false
    }
  }, [deepLinkQuoteId, deepLinkOpenCreate])

  useEffect(() => {
    if (!initialCustomerFilterId?.trim()) {
      customerFilterDeepLinkRef.current = false
    }
  }, [initialCustomerFilterId])

  useEffect(() => {
    const quoteDeep = Boolean(deepLinkQuoteId?.trim() && deepLinkOpenCreate)
    if (quoteDeep || customerFilterDeepLinkRef.current) {
      return
    }
    const cid = initialCustomerFilterId?.trim()
    if (!cid) {
      return
    }
    customerFilterDeepLinkRef.current = true
    if (!customers.some((c) => c.id === cid)) {
      toast.error("필터할 고객을 찾을 수 없습니다.")
      router.replace("/invoices")
      return
    }
    setCustomerFilterId(cid)
    toast.message("고객별 청구만 표시합니다.", { duration: 2400 })
    router.replace("/invoices")
  }, [
    initialCustomerFilterId,
    customers,
    router,
    deepLinkQuoteId,
    deepLinkOpenCreate,
  ])
  const [isPending, startTransition] = useTransition()
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null)
  const [reminderInvoiceId, setReminderInvoiceId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [paymentQuickFilter, setPaymentQuickFilter] =
    useState<PaymentQuickFilter>("all")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<
    PaymentStatus | "all"
  >("all")
  const [invoiceListSearch, setInvoiceListSearch] = useState("")
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<InvoiceType | "all">("all")
  const [invoiceSort, setInvoiceSort] = useState<InvoiceListSort>("requested_desc")
  const [customerFilterId, setCustomerFilterId] = useState<string | "all">("all")
  const [extraInvoiceFiltersOpen, setExtraInvoiceFiltersOpen] = useState(false)
  const [drawerInvoiceId, setDrawerInvoiceId] = useState<string | null>(null)
  const [sendInvoiceTarget, setSendInvoiceTarget] = useState<InvoiceWithReminders | null>(null)
  const [quickQuoteId, setQuickQuoteId] = useState(quotes[0]?.id ?? "")
  const [form, setForm] = useState<InvoiceFormState>(() => createEmptyInvoiceForm(customers))
  /** true면 견적·청구 타입 변경 시 금액 제안을 자동 반영, false면 사용자가 금액을 직접 조정한 상태 */
  const [amountFollowsSuggestion, setAmountFollowsSuggestion] = useState(true)
  const [reminderForm, setReminderForm] = useState<{
    channel: ReminderChannel
    message: string
  }>({
    channel: "kakao",
    message: "",
  })
  const [reminderTone, setReminderTone] = useState<"polite" | "neutral" | "firm">("neutral")
  const [reminderAiBusy, setReminderAiBusy] = useState(false)

  const hasQuotes = quotes.length > 0
  const hasInvoices = invoices.length > 0

  type InvoicePaymentPatch = { type: "payment"; id: string; paymentStatus: PaymentStatus }

  const [optimisticInvoices, patchInvoicePaymentOptimistic] = useOptimistic(
    invoices,
    (state, action: InvoicePaymentPatch) => {
      if (action.type === "payment") {
        return state.map((inv) =>
          inv.id === action.id ? { ...inv, paymentStatus: action.paymentStatus } : inv
        )
      }
      return state
    }
  )

  const invoiceFormCustomerSelectItems = useMemo(() => {
    const r: Record<string, string> = {}
    for (const c of customers) {
      r[c.id] = formatCustomerLines(c).primary
    }
    return r
  }, [customers])

  const invoiceListCustomerFilterItems = useMemo(() => {
    const r: Record<string, string> = { all: "전체 고객" }
    for (const c of customers) {
      r[c.id] = c.companyName?.trim() || c.name
    }
    return r
  }, [customers])

  const quickQuoteSelectItems = useMemo(() => {
    const r: Record<string, string> = {}
    for (const quote of quotes) {
      r[quote.id] = formatQuoteLines(quote, customers).primary
    }
    return r
  }, [quotes, customers])

  useEffect(() => {
    setQuickQuoteId((current) => {
      if (current && quotes.some((q) => q.id === current)) {
        return current
      }
      return quotes[0]?.id ?? ""
    })
  }, [quotes])

  useEffect(() => {
    if (!deepLinkOpenCreate || !deepLinkQuoteId?.trim() || deepLinkConsumedRef.current) {
      return
    }
    const qid = deepLinkQuoteId.trim()
    const q = quotes.find((item) => item.id === qid)
    deepLinkConsumedRef.current = true
    if (!q) {
      toast.error("연결할 견적을 찾을 수 없습니다. 견적이 삭제되었거나 권한이 없을 수 있습니다.")
      router.replace("/invoices")
      return
    }
    setAmountFollowsSuggestion(true)
    setEditingInvoiceId(null)
    setErrorMessage("")
    const { invoiceType, amount } = nextInvoiceSuggestionForQuote(q, invoices, null)
    setForm({
      ...createEmptyInvoiceForm(customers),
      customerId: q.customerId,
      quoteId: q.id,
      invoiceType,
      amount: String(amount),
    })
    createOpenSourceRef.current = null
    onOpenChange(true)
    toast.success("견적을 반영해 청구 작성 화면을 열었습니다.", {
      description: "청구 유형·금액은 저장 전에 확인해 주세요.",
      duration: 3200,
    })
    router.replace("/invoices")
  }, [
    deepLinkOpenCreate,
    deepLinkQuoteId,
    quotes,
    invoices,
    customers,
    router,
    onOpenChange,
    createOpenSourceRef,
  ])

  useEffect(() => {
    if (!isCreateOpen) {
      return
    }
    if (createOpenSourceRef.current === "header") {
      setEditingInvoiceId(null)
      setErrorMessage("")
      setAmountFollowsSuggestion(true)
      setForm(createEmptyInvoiceForm(customers))
    }
    createOpenSourceRef.current = null
  }, [isCreateOpen, customers, createOpenSourceRef])

  const availableQuotes = useMemo(
    () => quotes.filter((quote) => !form.customerId || quote.customerId === form.customerId),
    [form.customerId, quotes]
  )

  const invoiceFormAvailableQuoteSelectItems = useMemo(() => {
    const r: Record<string, string> = {}
    for (const q of availableQuotes) {
      r[q.id] = formatQuoteLines(q, customers).primary
    }
    return r
  }, [availableQuotes, customers])

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

  const amountDiffersFromSuggestion = useMemo(() => {
    if (suggestedAmountValue == null || !selectedQuote) {
      return false
    }
    return parseAmountInput(form.amount) !== suggestedAmountValue
  }, [suggestedAmountValue, selectedQuote, form.amount])

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
    const q = invoiceListSearch.trim().toLowerCase()
    return optimisticInvoices.filter((inv) => {
      if (customerFilterId !== "all" && inv.customerId !== customerFilterId) {
        return false
      }
      if (invoiceTypeFilter !== "all" && inv.invoiceType !== invoiceTypeFilter) {
        return false
      }
      if (q && !invoiceListSearchHaystack(inv).includes(q)) {
        return false
      }
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
  }, [
    optimisticInvoices,
    invoiceListSearch,
    invoiceTypeFilter,
    customerFilterId,
    paymentQuickFilter,
    paymentStatusFilter,
  ])

  const displayInvoices = useMemo(() => {
    const arr = [...filteredInvoices]
    const dueTs = (inv: InvoiceWithReminders) => {
      if (!inv.dueDate) {
        return Number.POSITIVE_INFINITY
      }
      return new Date(inv.dueDate).getTime()
    }
    const requestedTs = (inv: InvoiceWithReminders) => {
      if (!inv.requestedAt) {
        return 0
      }
      return new Date(inv.requestedAt).getTime()
    }
    const customerLabel = (inv: InvoiceWithReminders) => {
      const c = inv.customer
      return (c?.companyName?.trim() || c?.name || "").toLowerCase()
    }
    arr.sort((a, b) => {
      switch (invoiceSort) {
        case "due_asc":
          return dueTs(a) - dueTs(b)
        case "amount_desc":
          return b.amount - a.amount
        case "customer":
          return customerLabel(a).localeCompare(customerLabel(b), "ko")
        case "requested_desc":
        default:
          return requestedTs(b) - requestedTs(a)
      }
    })
    return arr
  }, [filteredInvoices, invoiceSort])

  const drawerInvoice = useMemo(
    () => optimisticInvoices.find((i) => i.id === drawerInvoiceId) ?? null,
    [drawerInvoiceId, optimisticInvoices]
  )

  const drawerInvoiceActivities = useMemo(() => {
    if (!drawerInvoiceId) {
      return []
    }
    return invoiceActivityByInvoiceId[drawerInvoiceId] ?? []
  }, [drawerInvoiceId, invoiceActivityByInvoiceId])

  const resetInvoiceForm = () => {
    setAmountFollowsSuggestion(true)
    setForm(createEmptyInvoiceForm(customers))
    setEditingInvoiceId(null)
    setErrorMessage("")
  }

  const openEdit = (invoice: InvoiceWithReminders) => {
    setDrawerInvoiceId(null)
    setAmountFollowsSuggestion(false)
    setEditingInvoiceId(invoice.id)
    setErrorMessage("")
    setForm(toInvoiceForm(invoice))
  }

  const openReminderFor = (invoice: InvoiceWithReminders) => {
    setDrawerInvoiceId(null)
    setReminderInvoiceId(invoice.id)
    setReminderTone("neutral")
    setReminderForm({
      channel: "kakao",
      message: defaultReminderMessage,
    })
  }

  const openCreateFresh = () => {
    setAmountFollowsSuggestion(true)
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
    setAmountFollowsSuggestion(true)
    setEditingInvoiceId(null)
    setErrorMessage("")
    const { invoiceType, amount } = nextInvoiceSuggestionForQuote(q, invoices, null)
    setForm({
      ...createEmptyInvoiceForm(customers),
      customerId: q.customerId,
      quoteId: q.id,
      invoiceType,
      amount: String(amount),
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
      const prev = optimisticInvoices.find((i) => i.id === editingInvoiceId)
      if (prev && form.paymentStatus !== prev.paymentStatus) {
        patchInvoicePaymentOptimistic({
          type: "payment",
          id: editingInvoiceId,
          paymentStatus: form.paymentStatus,
        })
      }
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
      patchInvoicePaymentOptimistic({ type: "payment", id: invoiceId, paymentStatus: status })
      const result = await updateInvoicePaymentStatusAction(invoiceId, status, customerId)

      if (!result.ok) {
        setErrorMessage(result.error)
        toast.error(result.error)
        return
      }

      router.refresh()
    })
  }

  const editingInvoice = useMemo(
    () => optimisticInvoices.find((i) => i.id === editingInvoiceId) ?? null,
    [editingInvoiceId, optimisticInvoices]
  )

  const reminderInvoice = useMemo(
    () => optimisticInvoices.find((i) => i.id === reminderInvoiceId) ?? null,
    [reminderInvoiceId, optimisticInvoices]
  )

  const saveReminder = () => {
    if (!reminderInvoiceId) {
      return
    }

    const invoice = optimisticInvoices.find((item) => item.id === reminderInvoiceId)

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

  const composeReminderAi = () => {
    const inv = reminderInvoice
    if (!inv) {
      return
    }
    const customer = inv.customer
    const name = customer?.companyName?.trim() || customer?.name || ""
    const overdueLike =
      inv.paymentStatus === "overdue" || invoiceRowReceivableHint(inv) === "overdue"
    const kind = overdueLike ? ("overdue_reminder" as const) : ("invoice_notice" as const)

    setReminderAiBusy(true)
    void (async () => {
      try {
        const res = await fetch("/api/ai/compose-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            kind,
            tone: reminderTone,
            context: {
              invoiceNumber: inv.invoiceNumber,
              amount: inv.amount,
              dueDate: inv.dueDate,
              customerName: name,
              bankAccount,
              paymentTerms,
              businessName,
              requestedAt: inv.requestedAt,
            },
          }),
        })
        const data = (await res.json()) as { error?: string; message?: { body: string } }
        if (!res.ok) {
          toast.error(data.error ?? "문구 생성에 실패했습니다.")
          return
        }
        setReminderForm((current) => ({
          ...current,
          message: data.message?.body ?? current.message,
        }))
        toast.success("리마인드 문구를 채웠습니다. 필요하면 수정해 주세요.")
      } catch {
        toast.error("네트워크 오류로 문구를 받지 못했습니다.")
      } finally {
        setReminderAiBusy(false)
      }
    })()
  }

  const formFields = (
    <div className="grid gap-4">
      {!formValidation.ok ? (
        <div
          className="rounded-lg border border-amber-500/35 bg-amber-500/[0.08] px-3 py-2 text-xs text-amber-950 dark:text-amber-50"
          role="status"
        >
          <p className="font-semibold">저장 전 확인</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 marker:text-amber-600">
            {formValidation.issues.map((issue) => (
              <li key={issue.key}>{issue.text}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2.5 sm:px-4">
        <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          1) 고객 · 연결 견적
        </p>
        <div className="mb-2 flex flex-wrap items-center gap-1.5 rounded-md border border-border/50 bg-background/60 px-2 py-1.5 text-[10px] leading-snug text-muted-foreground">
          <span className="shrink-0 rounded bg-primary/12 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
            동기화
          </span>
          <span>
            목록은 <span className="font-medium text-foreground/85">선택한 고객의 견적만</span> 표시됩니다.
            견적을 고르면 고객이 견적과 맞춰지고, 견적 연결 중에는 고객을 바꿀 수 없습니다.
          </span>
        </div>
        <div className="grid gap-3 lg:grid-cols-2 lg:gap-5">
          <div className="space-y-1.5 sm:border-l-2 sm:border-primary/35 sm:pl-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-sm font-semibold">거래처(고객)</label>
                <span className="text-destructive">*</span>
                {form.quoteId ? (
                  <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-px text-[9px] font-semibold text-primary">
                    견적과 동일
                  </span>
                ) : null}
              </div>
              {form.quoteId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[10px] text-muted-foreground"
                  onClick={() => {
                    setAmountFollowsSuggestion(true)
                    setForm((c) => ({ ...c, quoteId: "" }))
                  }}
                >
                  견적 연결 해제
                </Button>
              ) : null}
            </div>
            <p className="text-[10px] leading-snug text-muted-foreground">
              연락처 정보는 목록과 동일하게 보입니다.
            </p>
            {customers.length === 0 ? (
              <div className="flex min-h-9 items-center rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                등록된 고객이 없습니다. 고객을 먼저 등록해 주세요.
              </div>
            ) : (
              <Select
                value={form.customerId}
                items={invoiceFormCustomerSelectItems}
                disabled={Boolean(form.quoteId) && customers.length > 0}
                onValueChange={(value) => {
                  setAmountFollowsSuggestion(true)
                  setForm((current) => ({
                    ...current,
                    customerId: value ?? current.customerId,
                    quoteId: "",
                  }))
                }}
              >
                <SelectTrigger
                  className={cn(
                    "h-auto min-h-10 w-full justify-between py-2 text-left",
                    form.quoteId ? "bg-muted/40 opacity-[0.92]" : ""
                  )}
                  title={
                    form.quoteId
                      ? "견적이 연결되어 있어 고객은 견적과 동일하게 고정됩니다. 바꾸려면 「견적 연결 해제」를 누르세요."
                      : undefined
                  }
                >
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
              {form.quoteId && selectedQuote ? (
                <span className="rounded border border-border/60 bg-muted/50 px-1.5 py-px text-[9px] font-medium text-muted-foreground">
                  선택한 견적 기준
                </span>
              ) : null}
            </div>
            <p className="text-[10px] leading-snug text-muted-foreground">
              {form.customerId
                ? "위 고객 견적만 나옵니다. 고르면 고객·금액이 이 견적에 맞춰집니다."
                : "고객을 먼저 고르면 견적 목록이 열립니다."}
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
                items={invoiceFormAvailableQuoteSelectItems}
                onValueChange={(value) => {
                  const q = quotes.find((quote) => quote.id === value)
                  setAmountFollowsSuggestion(true)
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
                  toast.message("견적에 맞춰 반영", {
                    description: "고객·금액이 갱신되었습니다. 금액은 언제든 수정 가능합니다.",
                    duration: 2200,
                  })
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

      <section className="rounded-lg border border-border/60 bg-muted/5 px-3 py-2.5 sm:px-4">
        <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          2) 청구 타입 · 결제 상태 · 금액
        </p>
        <p className="mb-3 text-[10px] leading-snug text-muted-foreground">
          타입·견적 기준으로 금액을 제안합니다. 숫자만 입력해도 되며 쉼표는 저장 시 정리됩니다.
        </p>
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm font-semibold">청구 타입</label>
              <span className="text-destructive">*</span>
            </div>
            <Select
              value={form.invoiceType}
              items={invoiceTypeSelectItemsRecord}
              onValueChange={(value) => {
                setForm((current) => {
                  const nextType =
                    (value as InvoiceFormInput["invoiceType"] | null) ?? current.invoiceType
                  const q = quotes.find((x) => x.id === current.quoteId)
                  let nextAmount = current.amount
                  if (q && amountFollowsSuggestion) {
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
              선금 ≈ 총액 50% · 잔금/최종 = 총액 − 이미 청구된 합계
            </p>
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm font-semibold">결제 상태</label>
              <span className="text-destructive">*</span>
            </div>
            <Select
              value={form.paymentStatus}
              items={paymentStatusSelectItemsRecord}
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
                  setAmountFollowsSuggestion(false)
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
              <div className="rounded-lg border border-primary/25 bg-primary/[0.05] p-2.5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded border border-primary/35 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                        견적 기준 자동 제안
                      </span>
                      {amountFollowsSuggestion && !amountDiffersFromSuggestion ? (
                        <span className="text-[9px] text-muted-foreground">· 타입 바꾸면 금액도 따라갑니다</span>
                      ) : null}
                      {!amountFollowsSuggestion || amountDiffersFromSuggestion ? (
                        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-950 dark:text-amber-100">
                          수동 입력 · 수정 가능
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[10px] leading-snug text-muted-foreground">
                      {form.invoiceType === "deposit" ? (
                        <>
                          선금 제안: 견적 총액의 약 50% →{" "}
                          <span className="font-medium text-foreground">{formatCurrency(suggestedAmountValue)}</span>
                          {" "}(총액 {formatCurrency(selectedQuote.total)})
                        </>
                      ) : (
                        <>
                          잔여 제안: 총액 {formatCurrency(selectedQuote.total)} − 기청구{" "}
                          {formatCurrency(invoicedSumForSelectedQuote)} →{" "}
                          <span className="font-medium text-foreground">{formatCurrency(suggestedAmountValue)}</span>
                        </>
                      )}
                    </p>
                  </div>
                  {(!amountFollowsSuggestion || amountDiffersFromSuggestion) && suggestedAmountValue > 0 ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 shrink-0 text-xs font-medium"
                      onClick={() => {
                        setAmountFollowsSuggestion(true)
                        setForm((c) => ({ ...c, amount: String(suggestedAmountValue) }))
                      }}
                    >
                      제안으로 맞추기
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border/60 bg-muted/5 px-3 py-2.5 sm:px-4">
        <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          3) 청구일 · 입금 기한
        </p>
        <p className="mb-2 text-[10px] leading-snug text-muted-foreground">
          발행일·납부 마감을 먼저 정합니다. 실제 입금일은 아래 <span className="font-medium">결제 처리 정보</span>
          (추가)에서 입력합니다.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm font-semibold">청구일</label>
              <span className="text-destructive">*</span>
            </div>
            <p className="text-[10px] text-muted-foreground">발행·요청일</p>
            <Input
              type="date"
              className="h-10 max-w-full sm:max-w-xs"
              value={form.requestedAt ? form.requestedAt.slice(0, 10) : ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, requestedAt: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold">입금 기한</label>
            <p className="text-[10px] text-muted-foreground">납부 마감일</p>
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

      <details
        className={cn(
          "rounded-lg border [&_summary]:cursor-pointer [&_summary]:select-none",
          showPaidAtField
            ? "border-primary/30 bg-primary/[0.06] shadow-sm"
            : "border-border/50 bg-muted/15"
        )}
      >
        <summary className="px-3 py-2 text-xs font-medium text-muted-foreground">
          결제 처리 정보
          <span className="ml-1.5 font-normal text-[10px] text-muted-foreground/90">(추가)</span>
          {showPaidAtField ? (
            <span className="ml-2 font-semibold text-primary">— 입금일 입력</span>
          ) : null}
        </summary>
        <div className="space-y-2 border-t border-border/40 px-3 py-2.5">
          {showPaidAtField ? (
            <div className="space-y-1">
              <label className="text-sm font-semibold">실제 입금일</label>
              <p className="text-[10px] text-muted-foreground">입금 확인일(미수·정산 참고)</p>
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
            <p className="text-[10px] leading-snug text-muted-foreground">
              상태를 <span className="font-medium text-foreground/85">입금 완료·선금 입금·부분 입금</span>으로
              바꾸면 입금일을 넣을 수 있습니다.
            </p>
          )}
        </div>
      </details>

      <section className="rounded-lg border border-border/60 bg-muted/5 px-3 py-2.5 sm:px-4">
        <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          메모 (선택)
        </p>
        <p className="mb-1.5 text-[10px] leading-snug text-muted-foreground">
          입금 안내·분할 조건·내부 참고(청구·리마인드 시 참고)
        </p>
        <Textarea
          value={form.notes}
          onChange={(event) =>
            setForm((current) => ({ ...current, notes: event.target.value }))
          }
          rows={2}
          className="min-h-[3.25rem] resize-y text-sm"
          placeholder="예: 선금 50% 후 착수, 잔금 검수 후 7일"
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
              <DialogDescription className="text-[11px] leading-snug">
                필수는 <span className="text-destructive">*</span> · 견적 고르면 고객·금액이 맞춰집니다.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-[min(40vh,300px)] flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6">
            {formFields}
          </div>
          <div className="flex shrink-0 flex-col gap-2.5 border-t border-border/60 bg-background/95 px-4 py-3 shadow-[0_-6px_16px_rgba(0,0,0,0.06)] backdrop-blur-md supports-[backdrop-filter]:bg-background/85 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 dark:shadow-[0_-6px_20px_rgba(0,0,0,0.25)]">
            <p className="text-[11px] leading-snug text-muted-foreground sm:max-w-[56%] sm:min-w-0">
              {!formValidation.ok ? (
                <span className="font-medium text-amber-900 dark:text-amber-100">
                  노란 박스 항목을 채우면 저장됩니다. 저장 버튼에 마우스를 올리면 요약이 보입니다.
                </span>
              ) : (
                <span className="text-foreground/85">필수 입력이 완료되었습니다. 저장으로 청구를 등록합니다.</span>
              )}
            </p>
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:justify-end sm:gap-2">
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
        <OpsToolbar>
          <OpsSearchField
            value={invoiceListSearch}
            onChange={setInvoiceListSearch}
            placeholder="청구 번호·고객명·회사명 검색"
            aria-label="청구 목록 검색"
            className="min-w-[min(100%,14rem)] sm:max-w-xs"
          />
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <span className="text-xs font-medium text-muted-foreground">청구 유형</span>
            <Select
              value={invoiceTypeFilter}
              items={invoiceTypeFilterSelectItems}
              onValueChange={(value) =>
                setInvoiceTypeFilter((value as InvoiceType | "all" | null) ?? "all")
              }
            >
              <SelectTrigger className="h-9 w-full min-w-[7rem] sm:w-[130px]">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {invoiceTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <span className="text-xs font-medium text-muted-foreground">정렬</span>
            <Select
              value={invoiceSort}
              items={invoiceSortSelectItemsRecord}
              onValueChange={(value) =>
                setInvoiceSort((value as InvoiceListSort | null) ?? "requested_desc")
              }
            >
              <SelectTrigger className="h-9 w-full min-w-[9rem] sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="requested_desc">최신 청구순</SelectItem>
                <SelectItem value="due_asc">입금 기한 임박순</SelectItem>
                <SelectItem value="amount_desc">금액 높은순</SelectItem>
                <SelectItem value="customer">고객명순</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-full flex-col gap-2 border-t border-border/40 pt-2 sm:flex-row sm:flex-wrap sm:items-center sm:border-t-0 sm:pt-0">
            <span className="text-xs font-medium text-muted-foreground">수금</span>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { key: "all" as const, label: "전체", accent: "default" as const },
                  { key: "unpaid" as const, label: "미수금", accent: "default" as const },
                  { key: "overdue" as const, label: "연체", accent: "danger" as const },
                  { key: "paid" as const, label: "입금완료", accent: "default" as const },
                ] as const
              ).map(({ key, label, accent }) => (
                <OpsToolbarFilterButton
                  key={key}
                  selected={paymentQuickFilter === key}
                  accent={accent}
                  onClick={() => {
                    setPaymentQuickFilter(key)
                    setPaymentStatusFilter("all")
                  }}
                >
                  {label}
                </OpsToolbarFilterButton>
              ))}
            </div>
            <Select
              value={paymentStatusFilter}
              items={paymentStatusFilterSelectItems}
              onValueChange={(value) => {
                setPaymentStatusFilter((value as PaymentStatus | "all") ?? "all")
                setPaymentQuickFilter("all")
              }}
            >
              <SelectTrigger className="h-8 w-full sm:w-[200px]">
                <SelectValue placeholder="상세 상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">상세 상태 · 전체</SelectItem>
                {paymentStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <OpsCollapsibleFilters
            open={extraInvoiceFiltersOpen}
            onOpenChange={setExtraInvoiceFiltersOpen}
            label="고객 필터"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">고객으로 좁히기</label>
              <Select
                value={customerFilterId}
                items={invoiceListCustomerFilterItems}
                onValueChange={(v) => setCustomerFilterId((v as string | null) ?? "all")}
              >
                <SelectTrigger className="h-9 w-full sm:min-w-[14rem]">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 고객</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.companyName?.trim() || c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </OpsCollapsibleFilters>
        </OpsToolbar>
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
                      items={quickQuoteSelectItems}
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

      {displayInvoices.length > 0 ? (
        <>
          <OpsTableShell className="hidden md:block">
            <table className={cn(opsTableClass, "!min-w-0 w-full max-w-full table-fixed")}>
              <thead>
                <tr className={opsTableHeadRowClass}>
                  <th className={opsTableHeadCellClass}>청구 번호</th>
                  <th className={opsTableHeadCellClass}>고객</th>
                  <th className={cn(opsTableHeadCellClass, "max-w-[200px]")}>연결 견적</th>
                  <th className={opsTableHeadCellClass}>유형</th>
                  <th className={cn(opsTableHeadCellClass, "w-[148px] min-w-[140px]")}>결제 상태</th>
                  <th className={cn(opsTableHeadCellClass, "text-right")}>금액</th>
                  <th className={opsTableHeadCellClass}>청구일</th>
                  <th className={opsTableHeadCellClass}>입금 기한</th>
                  <th className={opsTableHeadCellClass}>입금일</th>
                  <th className={cn(opsTableHeadCellClass, "w-12 text-right")} aria-label="작업" />
                </tr>
              </thead>
              <tbody>
                {displayInvoices.map((invoice) => {
                  const customer = invoice.customer
                  const recvHint = invoiceRowReceivableHint(invoice)
                  return (
                    <tr
                      key={invoice.id}
                      className={cn(
                        opsTableRowClass,
                        "cursor-pointer",
                        recvHint === "overdue" && "bg-destructive/[0.08]",
                        recvHint === "due_soon" && "bg-amber-500/[0.07]"
                      )}
                      data-state={drawerInvoiceId === invoice.id ? "selected" : undefined}
                      onClick={() => setDrawerInvoiceId(invoice.id)}
                    >
                      <td className={cn(opsTableCellClass, "font-mono text-xs tabular-nums text-muted-foreground")}>
                        <span className="flex flex-col gap-0.5">
                          {invoice.invoiceNumber}
                          {recvHint === "overdue" ? (
                            <OpsTimeHintChip kind="invoice_overdue" size="sm" />
                          ) : null}
                          {recvHint === "due_soon" ? (
                            <OpsTimeHintChip kind="invoice_due_soon" size="sm" />
                          ) : null}
                        </span>
                      </td>
                      <td className={cn(opsTableCellClass, "max-w-[160px]")}>
                        <span className="line-clamp-2 text-sm font-medium">
                          {customer?.companyName?.trim() || customer?.name || "—"}
                        </span>
                      </td>
                      <td className={cn(opsTableCellClass, "max-w-[200px] truncate text-xs text-muted-foreground")}>
                        {linkedQuoteSummary(invoice, quotes)}
                      </td>
                      <td className={cn(opsTableCellClass, "text-xs")}>
                        {invoiceTypeTableLabel(invoice.invoiceType)}
                      </td>
                      <td
                        className={cn(opsTableCellClass, "w-[148px] min-w-[140px] max-w-[160px]")}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex max-w-[148px] flex-col gap-1.5">
                          <PaymentStatusBadge status={invoice.paymentStatus} className="w-fit" />
                          <Select
                            value={invoice.paymentStatus}
                            items={paymentStatusSelectItemsRecord}
                            onValueChange={(value) =>
                              updatePaymentStatus(
                                invoice.id,
                                (value as PaymentStatus | null) ?? invoice.paymentStatus,
                                invoice.customerId
                              )
                            }
                          >
                            <SelectTrigger className="h-8 w-full max-w-[148px] text-xs">
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
                      </td>
                      <td className={cn(opsTableCellClass, "text-right text-sm font-semibold tabular-nums")}>
                        {formatCurrency(invoice.amount)}
                      </td>
                      <td className={cn(opsTableCellClass, "whitespace-nowrap text-xs text-muted-foreground")}>
                        {formatDate(invoice.requestedAt)}
                      </td>
                      <td
                        className={cn(
                          opsTableCellClass,
                          "whitespace-nowrap text-xs",
                          recvHint === "overdue" && "font-semibold text-destructive",
                          recvHint === "due_soon" && "font-medium text-amber-900 dark:text-amber-100",
                          !recvHint && "text-muted-foreground"
                        )}
                      >
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className={cn(opsTableCellClass, "whitespace-nowrap text-xs text-muted-foreground")}>
                        {formatDate(invoice.paidAt)}
                      </td>
                      <td className={cn(opsTableCellClass, "text-right")} onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "size-8")}
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="gap-2" onClick={() => openEdit(invoice)}>
                              <Pencil className="size-4" />
                              수정
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => openReminderFor(invoice)}>
                              <BellRing className="size-4" />
                              리마인드
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => setSendInvoiceTarget(invoice)}>
                              <Mail className="size-4" />
                              발송
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() =>
                                window.open(
                                  `/invoices/${invoice.id}/print`,
                                  "_blank",
                                  "noopener,noreferrer"
                                )
                              }
                            >
                              <ExternalLink className="size-4" />
                              인쇄·PDF
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
            {displayInvoices.map((invoice) => {
              const customer = invoice.customer
              const recvHint = invoiceRowReceivableHint(invoice)
              return (
                <button
                  key={invoice.id}
                  type="button"
                  className={cn(
                    "flex w-full flex-col gap-2 rounded-xl border border-border/60 bg-card p-3 text-left shadow-sm",
                    recvHint === "overdue" && "border-destructive/35",
                    recvHint === "due_soon" && "border-amber-500/35"
                  )}
                  onClick={() => setDrawerInvoiceId(invoice.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] text-muted-foreground">{invoice.invoiceNumber}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {recvHint === "overdue" ? (
                          <OpsTimeHintChip kind="invoice_overdue" size="sm" />
                        ) : null}
                        {recvHint === "due_soon" ? (
                          <OpsTimeHintChip kind="invoice_due_soon" size="sm" />
                        ) : null}
                      </div>
                      <p className="mt-0.5 font-medium leading-snug">
                        {customer?.companyName?.trim() || customer?.name || "—"}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {invoiceTypeTableLabel(invoice.invoiceType)} · {formatCurrency(invoice.amount)}
                      </p>
                    </div>
                    <PaymentStatusBadge status={invoice.paymentStatus} />
                  </div>
                </button>
              )
            })}
          </div>
        </>
      ) : null}

      <OpsDetailSheet
        open={drawerInvoice !== null}
        onOpenChange={(o) => !o && setDrawerInvoiceId(null)}
        title={
          drawerInvoice ? (
            <span className="flex flex-col gap-1">
              <span className="font-mono text-xs text-muted-foreground">{drawerInvoice.invoiceNumber}</span>
              <span>
                {drawerInvoice.customer?.companyName?.trim() ||
                  drawerInvoice.customer?.name ||
                  "고객"}
              </span>
            </span>
          ) : (
            ""
          )
        }
        description={
          drawerInvoice ? (
            <span>
              {invoiceTypeTableLabel(drawerInvoice.invoiceType)} 청구 ·{" "}
              {formatCurrency(drawerInvoice.amount)}
            </span>
          ) : null
        }
        footer={
          drawerInvoice ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => setSendInvoiceTarget(drawerInvoice)}
              >
                <Mail className="size-3.5" />
                발송
              </Button>
              <Button size="sm" variant="outline" onClick={() => openEdit(drawerInvoice)}>
                수정
              </Button>
              <Button size="sm" variant="outline" onClick={() => openReminderFor(drawerInvoice)}>
                리마인드
              </Button>
              <Link
                href={`/invoices/${drawerInvoice.id}/print`}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ size: "sm", variant: "outline" }), "inline-flex gap-1.5")}
              >
                <ExternalLink className="size-3.5" />
                인쇄·PDF
              </Link>
              {drawerInvoice.quoteId ? (
                <Link
                  href={`/quotes/${drawerInvoice.quoteId}/print`}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ size: "sm", variant: "outline" }), "inline-flex")}
                >
                  연결 견적서
                </Link>
              ) : null}
            </div>
          ) : null
        }
      >
        {drawerInvoice ? (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              {invoiceRowReceivableHint(drawerInvoice) === "overdue" ? (
                <OpsTimeHintChip kind="invoice_overdue" />
              ) : null}
              {invoiceRowReceivableHint(drawerInvoice) === "due_soon" ? (
                <OpsTimeHintChip kind="invoice_due_soon" />
              ) : null}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">결제 상태 변경</p>
              <PaymentStatusBadge status={drawerInvoice.paymentStatus} className="w-fit" />
              <Select
                value={drawerInvoice.paymentStatus}
                items={paymentStatusSelectItemsRecord}
                onValueChange={(value) =>
                  updatePaymentStatus(
                    drawerInvoice.id,
                    (value as PaymentStatus | null) ?? drawerInvoice.paymentStatus,
                    drawerInvoice.customerId
                  )
                }
              >
                <SelectTrigger className="h-9 w-full max-w-xs">
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
            {drawerInvoice.quoteId ? (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">연결 견적</p>
                <p className="mt-1 text-sm">{linkedQuoteSummary(drawerInvoice, quotes)}</p>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-border/50 p-2">
                <p className="text-muted-foreground">청구 금액</p>
                <p className="mt-0.5 font-semibold tabular-nums">{formatCurrency(drawerInvoice.amount)}</p>
              </div>
              <div className="rounded-lg border border-border/50 p-2">
                <p className="text-muted-foreground">청구일</p>
                <p className="mt-0.5 tabular-nums">{formatDate(drawerInvoice.requestedAt)}</p>
              </div>
              <div className="rounded-lg border border-border/50 p-2">
                <p className="text-muted-foreground">입금 기한</p>
                <p
                  className={cn(
                    "mt-0.5 tabular-nums",
                    invoiceRowReceivableHint(drawerInvoice) === "overdue" &&
                      "font-semibold text-destructive",
                    invoiceRowReceivableHint(drawerInvoice) === "due_soon" &&
                      "font-medium text-amber-900 dark:text-amber-100"
                  )}
                >
                  {formatDate(drawerInvoice.dueDate)}
                </p>
              </div>
              <div className="rounded-lg border border-border/50 p-2">
                <p className="text-muted-foreground">입금일</p>
                <p className="mt-0.5 tabular-nums">{formatDate(drawerInvoice.paidAt)}</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">활동·상태 기록</p>
              {drawerInvoiceActivities.length ? (
                <ul className="max-h-44 space-y-2 overflow-y-auto text-xs">
                  {drawerInvoiceActivities.map((log) => (
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
            <div>
              <p className="text-xs font-semibold text-muted-foreground">메모</p>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                {drawerInvoice.notes?.trim() || "메모가 없습니다."}
              </p>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">리마인드 기록</p>
              {drawerInvoice.reminders.length ? (
                <ul className="max-h-52 space-y-2 overflow-y-auto">
                  {drawerInvoice.reminders.map((reminder) => {
                    const ch =
                      reminderChannelOptions.find((o) => o.value === reminder.channel)?.label ??
                      reminder.channel
                    return (
                      <li
                        key={reminder.id}
                        className="rounded-lg border border-border/50 px-3 py-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground">{ch}</span>
                          <span className="shrink-0 text-muted-foreground tabular-nums">
                            {formatDateTime(reminder.sentAt)}
                          </span>
                        </div>
                        <p className="mt-1 leading-snug">{reminder.message}</p>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">기록된 리마인드가 없습니다.</p>
              )}
            </div>
          </div>
        ) : null}
      </OpsDetailSheet>

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
              <DialogDescription className="text-[11px] leading-snug">
                필수는 <span className="text-destructive">*</span> · 저장 시 DB에 반영됩니다.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-[min(40vh,300px)] flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6">
            {formFields}
          </div>
          <div className="flex shrink-0 flex-col gap-2.5 border-t border-border/60 bg-background/95 px-4 py-3 shadow-[0_-6px_16px_rgba(0,0,0,0.06)] backdrop-blur-md supports-[backdrop-filter]:bg-background/85 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 dark:shadow-[0_-6px_20px_rgba(0,0,0,0.25)]">
            <p className="text-[11px] leading-snug text-muted-foreground sm:max-w-[56%] sm:min-w-0">
              {!formValidation.ok ? (
                <span className="font-medium text-amber-900 dark:text-amber-100">
                  노란 박스를 채우면 저장됩니다.
                </span>
              ) : (
                <span className="text-foreground/85">저장하면 수정 내용이 청구에 반영됩니다.</span>
              )}
            </p>
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:justify-end sm:gap-2">
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
            setReminderTone("neutral")
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
                items={reminderChannelSelectItemsRecord}
                onValueChange={(value) =>
                  setReminderForm((current) => ({
                    ...current,
                    channel: (value as ReminderChannel | null) ?? current.channel,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {reminderChannelOptions.find((o) => o.value === reminderForm.channel)?.label ??
                      reminderForm.channel}
                  </SelectValue>
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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-2">
                <label className="text-sm font-medium">문체</label>
                <Select
                  value={reminderTone}
                  items={reminderToneSelectItemsRecord}
                  onValueChange={(value) =>
                    setReminderTone((value as "polite" | "neutral" | "firm" | null) ?? "neutral")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{reminderToneSelectItemsRecord[reminderTone]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="polite">정중형</SelectItem>
                    <SelectItem value="neutral">기본형</SelectItem>
                    <SelectItem value="firm">단호형</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0 gap-1.5"
                disabled={reminderAiBusy || !reminderInvoice}
                onClick={composeReminderAi}
              >
                {reminderAiBusy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                AI로 메시지
              </Button>
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
            <Button
              type="button"
              onClick={saveReminder}
              disabled={isPending || reminderAiBusy || !reminderInvoice}
              className="gap-2"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InvoiceSendDialog
        invoice={sendInvoiceTarget}
        open={sendInvoiceTarget !== null}
        onOpenChange={(next) => {
          if (!next) {
            setSendInvoiceTarget(null)
          }
        }}
        paymentTerms={paymentTerms}
        bankAccount={bankAccount}
        businessName={businessName}
        onAfterSend={() => router.refresh()}
      />
    </div>
  )
}

export function InvoicesWorkspace({
  invoices,
  customers,
  quotes,
  defaultReminderMessage,
  invoiceActivityByInvoiceId,
  businessName,
  bankAccount,
  paymentTerms,
  deepLinkQuoteId,
  deepLinkOpenCreate,
  initialCustomerFilterId,
}: {
  invoices: InvoiceWithReminders[]
  customers: Customer[]
  quotes: Quote[]
  defaultReminderMessage: string
  invoiceActivityByInvoiceId: Record<string, ActivityLog[]>
  businessName: string
  bankAccount: string
  paymentTerms: string
  deepLinkQuoteId?: string
  deepLinkOpenCreate?: boolean
  initialCustomerFilterId?: string
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
        invoiceActivityByInvoiceId={invoiceActivityByInvoiceId}
        businessName={businessName}
        bankAccount={bankAccount}
        paymentTerms={paymentTerms}
        isCreateOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        createOpenSourceRef={createOpenSourceRef}
        deepLinkQuoteId={deepLinkQuoteId}
        deepLinkOpenCreate={deepLinkOpenCreate}
        initialCustomerFilterId={initialCustomerFilterId}
      />
    </div>
  )
}
