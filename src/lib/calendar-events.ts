import { getOpsStatusMeta, type OpsStatusTone } from "@/lib/ops-status-meta"
import { customerPrimaryLabel, getQuoteValidityHint } from "@/lib/quote-utils"
import type {
  InquiryStage,
  InquiryWithCustomer,
  InvoiceWithReminders,
  PaymentStatus,
  QuoteStatus,
  QuoteWithItems,
} from "@/types/domain"

export type BillCalendarEntityKind = "inquiry" | "invoice" | "quote"
export type BillCalendarStatusDomain = "inquiry" | "payment" | "quote"

export type BillCalendarEvent = {
  id: string
  type:
    | "inquiry_followup"
    | "inquiry_requested"
    | "invoice_requested"
    | "invoice_due"
    | "invoice_promised"
    | "invoice_followup"
    | "quote_valid_until"
  entityKind: BillCalendarEntityKind
  relatedEntityId: string
  title: string
  customerName: string
  date: string
  dateKey: string
  kindLabel: string
  subtitle?: string
  amount?: number
  statusDomain?: BillCalendarStatusDomain
  statusValue?: InquiryStage | PaymentStatus | QuoteStatus
  accent: OpsStatusTone
  emphasis: boolean
  timeLabel?: string
  sortAt: number
}

function parseCalendarDate(value: string): Date | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  const source = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T12:00:00` : trimmed
  const date = new Date(source)
  return Number.isFinite(date.getTime()) ? date : null
}

function toDateKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function toTimeLabel(raw: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
    return ""
  }
  const d = parseCalendarDate(raw)
  if (!d) {
    return ""
  }
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function buildBaseEvent(input: {
  id: string
  type: BillCalendarEvent["type"]
  entityKind: BillCalendarEntityKind
  relatedEntityId: string
  title: string
  customerName: string
  date: string
  kindLabel: string
  subtitle?: string
  amount?: number
  statusDomain?: BillCalendarStatusDomain
  statusValue?: InquiryStage | PaymentStatus | QuoteStatus
  accent?: OpsStatusTone
  emphasis?: boolean
}): BillCalendarEvent | null {
  const parsed = parseCalendarDate(input.date)
  if (!parsed) {
    return null
  }

  const meta =
    input.statusDomain && input.statusValue
      ? input.statusDomain === "inquiry"
        ? getOpsStatusMeta("inquiry", input.statusValue as InquiryStage)
        : input.statusDomain === "payment"
          ? getOpsStatusMeta("payment", input.statusValue as PaymentStatus)
          : getOpsStatusMeta("quote", input.statusValue as QuoteStatus)
      : null

  return {
    id: input.id,
    type: input.type,
    entityKind: input.entityKind,
    relatedEntityId: input.relatedEntityId,
    title: input.title,
    customerName: input.customerName,
    date: input.date,
    dateKey: toDateKey(parsed),
    kindLabel: input.kindLabel,
    subtitle: input.subtitle,
    amount: input.amount,
    statusDomain: input.statusDomain,
    statusValue: input.statusValue,
    accent: input.accent ?? meta?.tone ?? "neutral",
    emphasis: input.emphasis ?? meta?.emphasis ?? false,
    timeLabel: toTimeLabel(input.date),
    sortAt: parsed.getTime(),
  }
}

function sortEvents(events: BillCalendarEvent[]) {
  return [...events].sort((a, b) => a.sortAt - b.sortAt || a.title.localeCompare(b.title, "ko"))
}

export function mapInquiriesToCalendarEvents(inquiries: InquiryWithCustomer[]) {
  const events: BillCalendarEvent[] = []
  for (const inquiry of inquiries) {
    const customerName = customerPrimaryLabel(inquiry.customer)
    if (inquiry.followUpAt?.trim()) {
      const ev = buildBaseEvent({
        id: `${inquiry.id}:followup`,
        type: "inquiry_followup",
        entityKind: "inquiry",
        relatedEntityId: inquiry.id,
        title: inquiry.title,
        customerName,
        date: inquiry.followUpAt,
        kindLabel: "팔로업",
        subtitle: inquiry.serviceCategory || inquiry.channel,
        statusDomain: "inquiry",
        statusValue: inquiry.stage,
      })
      if (ev) {
        events.push(ev)
      }
    }
    if (inquiry.requestedDate?.trim()) {
      const ev = buildBaseEvent({
        id: `${inquiry.id}:requested`,
        type: "inquiry_requested",
        entityKind: "inquiry",
        relatedEntityId: inquiry.id,
        title: inquiry.title,
        customerName,
        date: inquiry.requestedDate,
        kindLabel: "희망 일정",
        subtitle: inquiry.serviceCategory || inquiry.channel,
        statusDomain: "inquiry",
        statusValue: inquiry.stage,
        accent: inquiry.stage === "new" ? "info" : undefined,
      })
      if (ev) {
        events.push(ev)
      }
    }
  }
  return sortEvents(events)
}

function invoiceDueAccent(invoice: InvoiceWithReminders): { accent: OpsStatusTone; emphasis: boolean } {
  if (invoice.paymentStatus === "overdue") {
    return { accent: "danger", emphasis: true }
  }
  if (invoice.paymentStatus === "paid") {
    return { accent: "success", emphasis: false }
  }
  if (invoice.paymentStatus === "partially_paid") {
    return { accent: "warning", emphasis: false }
  }
  return { accent: "neutral", emphasis: false }
}

export function mapInvoicesToCalendarEvents(invoices: InvoiceWithReminders[]) {
  const events: BillCalendarEvent[] = []
  for (const invoice of invoices) {
    const customerName = customerPrimaryLabel(invoice.customer)
    if (invoice.requestedAt?.trim()) {
      const ev = buildBaseEvent({
        id: `${invoice.id}:requested`,
        type: "invoice_requested",
        entityKind: "invoice",
        relatedEntityId: invoice.id,
        title: invoice.invoiceNumber,
        customerName,
        date: invoice.requestedAt,
        kindLabel: "청구일",
        subtitle: invoice.invoiceType,
        amount: invoice.amount,
        statusDomain: "payment",
        statusValue: invoice.paymentStatus,
      })
      if (ev) {
        events.push(ev)
      }
    }
    if (invoice.dueDate?.trim()) {
      const dueMeta = invoiceDueAccent(invoice)
      const ev = buildBaseEvent({
        id: `${invoice.id}:due`,
        type: "invoice_due",
        entityKind: "invoice",
        relatedEntityId: invoice.id,
        title: invoice.invoiceNumber,
        customerName,
        date: invoice.dueDate,
        kindLabel: "입금 기한",
        subtitle: invoice.invoiceType,
        amount: invoice.amount,
        statusDomain: "payment",
        statusValue: invoice.paymentStatus,
        accent: dueMeta.accent,
        emphasis: dueMeta.emphasis,
      })
      if (ev) {
        events.push(ev)
      }
    }
    if (invoice.promisedPaymentDate?.trim()) {
      const ev = buildBaseEvent({
        id: `${invoice.id}:promised`,
        type: "invoice_promised",
        entityKind: "invoice",
        relatedEntityId: invoice.id,
        title: invoice.invoiceNumber,
        customerName,
        date: invoice.promisedPaymentDate,
        kindLabel: "입금 약속일",
        subtitle: "약속 일정",
        amount: invoice.amount,
        statusDomain: "payment",
        statusValue: invoice.paymentStatus,
        accent: invoice.paymentStatus === "paid" ? "success" : "warning",
      })
      if (ev) {
        events.push(ev)
      }
    }
    if (invoice.nextCollectionFollowupAt?.trim()) {
      const ev = buildBaseEvent({
        id: `${invoice.id}:followup`,
        type: "invoice_followup",
        entityKind: "invoice",
        relatedEntityId: invoice.id,
        title: invoice.invoiceNumber,
        customerName,
        date: invoice.nextCollectionFollowupAt,
        kindLabel: "재연락·리마인드",
        subtitle: invoice.collectionTone ? `톤 ${invoice.collectionTone}` : "추심 일정",
        amount: invoice.amount,
        statusDomain: "payment",
        statusValue: invoice.paymentStatus,
        accent: invoice.paymentStatus === "overdue" ? "danger" : "brand",
        emphasis: invoice.paymentStatus === "overdue",
      })
      if (ev) {
        events.push(ev)
      }
    }
  }
  return sortEvents(events)
}

export function mapQuotesToCalendarEvents(quotes: QuoteWithItems[]) {
  const events: BillCalendarEvent[] = []
  for (const quote of quotes) {
    if (!quote.validUntil?.trim()) {
      continue
    }
    const validity = getQuoteValidityHint(quote.validUntil, quote.status)
    const ev = buildBaseEvent({
      id: `${quote.id}:valid-until`,
      type: "quote_valid_until",
      entityKind: "quote",
      relatedEntityId: quote.id,
      title: quote.quoteNumber,
      customerName: customerPrimaryLabel(quote.customer),
      date: quote.validUntil,
      kindLabel: "유효기한",
      subtitle: quote.title,
      amount: quote.total,
      statusDomain: "quote",
      statusValue: quote.status,
      accent: validity === "past_due" ? "danger" : validity === "due_soon" ? "warning" : undefined,
      emphasis: validity === "past_due",
    })
    if (ev) {
      events.push(ev)
    }
  }
  return sortEvents(events)
}

export function pickCalendarEventsInRange(events: BillCalendarEvent[], start: Date, end: Date) {
  const startAt = start.getTime()
  const endAt = end.getTime()
  return events.filter((event) => event.sortAt >= startAt && event.sortAt <= endAt)
}
