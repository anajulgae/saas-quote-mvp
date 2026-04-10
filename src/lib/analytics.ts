import type { SupabaseClient } from "@supabase/supabase-js"

import { getAppSession } from "@/lib/auth"
import {
  demoActivityLogs,
  demoBillingSnapshot,
  demoCustomers,
  demoInquiries,
  demoInvoices,
  demoQuotes,
  demoReminders,
  demoUser,
} from "@/lib/demo-data"
import { planAllowsFeature } from "@/lib/plan-features"
import { getUsageLimitsForEffectivePlan, type UserBillingSnapshot } from "@/lib/subscription"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { loadPlanContext } from "@/lib/user-plan"
import type { BillingPlan, InvoiceType, PaymentStatus, QuoteStatus } from "@/types/domain"
import type { Database, Json } from "@/types/supabase"

type CustomerRow = Database["public"]["Tables"]["customers"]["Row"]
type InquiryRow = Database["public"]["Tables"]["inquiries"]["Row"]
type QuoteRow = Database["public"]["Tables"]["quotes"]["Row"]
type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"]
type ReminderRow = Database["public"]["Tables"]["reminders"]["Row"]
type ActivityLogRow = Database["public"]["Tables"]["activity_logs"]["Row"]
type DocumentSendEventRow = Database["public"]["Tables"]["document_send_events"]["Row"]

/** 마이그레이션 0015 미적용 등으로 테이블이 없을 때 통계 나머지는 계속 보여 주기 위함 */
function isMissingDbRelationError(error: { message?: string; code?: string }): boolean {
  const msg = (error.message ?? "").toLowerCase()
  const code = String(error.code ?? "")
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    (msg.includes("document_send_events") && msg.includes("could not find"))
  )
}

export type AnalyticsRangePreset =
  | "today"
  | "7d"
  | "30d"
  | "this_month"
  | "last_month"
  | "custom"

export type AnalyticsQueryInput = {
  range?: string
  from?: string
  to?: string
}

export type AnalyticsRange = {
  preset: AnalyticsRangePreset
  label: string
  startDate: string
  endDate: string
  comparisonLabel: string
  previousStartDate: string
  previousEndDate: string
  usesCustomRange: boolean
  customRangeLocked: boolean
  days: number
}

export type AnalyticsKpi = {
  key: string
  label: string
  description: string
  value: number
  previousValue: number | null
  delta: number | null
  valueType: "count" | "currency" | "percent" | "days"
  goodDirection: "up" | "down" | "neutral"
}

export type AnalyticsFunnelStage = {
  key: string
  label: string
  description: string
  count: number
  conversionFromPrevious: number | null
  conversionFromStart: number | null
}

export type AnalyticsBreakdownRow = {
  key: string
  label: string
  count: number
  amount?: number
  conversionRate?: number | null
  secondaryRate?: number | null
  averageAmount?: number | null
}

export type AnalyticsCustomerRow = {
  customerId: string
  label: string
  inquiryCount: number
  totalQuoted: number
  totalInvoiced: number
  totalPaid: number
  lastActivityAt: string | null
  risk: "watch" | "stable"
}

export type AnalyticsQuoteRow = {
  quoteId: string
  quoteNumber: string
  title: string
  customerLabel: string
  total: number
  status: QuoteStatus
  createdAt: string
}

export type AnalyticsSeriesRow = {
  label: string
  inquiries: number
  quotes: number
  invoices: number
  paidAmount: number
  outstandingAmount: number
  aiCalls: number
}

export type AnalyticsCashSummary = {
  periodInvoicedAmount: number
  periodPaidAmount: number
  currentOutstandingAmount: number
  currentOverdueAmount: number
  currentPartialAmount: number
  dueSoonCount: number
  averagePaymentDays: number | null
  statusCounts: Array<{ key: "pending" | "partially_paid" | "paid" | "overdue"; label: string; count: number }>
}

export type AnalyticsReport = {
  plan: BillingPlan
  effectivePlan: BillingPlan
  range: AnalyticsRange
  gates: {
    customRange: boolean
    advancedBreakdowns: boolean
    export: boolean
  }
  kpis: AnalyticsKpi[]
  funnel: {
    stages: AnalyticsFunnelStage[]
    weakestStageKey: string | null
  }
  highlights: string[]
  cash: AnalyticsCashSummary
  volumeSeries: AnalyticsSeriesRow[]
  channelRows: AnalyticsBreakdownRow[]
  customerSummary: {
    newCustomers: number
    repeatCustomers: number
    avgQuotePerCustomer: number
    avgInvoicePerCustomer: number
    topCustomers: AnalyticsCustomerRow[]
  }
  quoteSummary: {
    created: number
    sent: number
    approved: number
    rejected: number
    expired: number
    approvalRate: number | null
    averageAmount: number
    expiringSoonCount: number
    topQuotes: AnalyticsQuoteRow[]
  }
  invoiceSummary: {
    created: number
    averagePaymentDays: number | null
    overdueCount: number
    averageOverdueDays: number | null
    reminderPaidCount: number
    reminderCount: number
    typeRows: Array<{ key: InvoiceType; label: string; count: number; amount: number }>
  }
  aiSummary: {
    periodCalls: number
    currentMonthCalls: number
    currentMonthLimit: number
    featureRows: AnalyticsBreakdownRow[]
    backfillNotice: string | null
  }
  documentSendSummary: {
    periodCount: number
    currentMonthCount: number
    currentMonthLimit: number
    actionRows: AnalyticsBreakdownRow[]
    documentRows: AnalyticsBreakdownRow[]
  }
  definitions: string[]
}

type NormalizedCustomer = {
  id: string
  label: string
  createdAt: string
}

type NormalizedInquiry = {
  id: string
  customerId: string
  channel: string
  stage: string
  createdAt: string
}

type NormalizedQuote = {
  id: string
  customerId: string
  inquiryId: string | null
  quoteNumber: string
  title: string
  status: QuoteStatus
  total: number
  sentAt: string | null
  validUntil: string | null
  createdAt: string
  updatedAt: string
}

type NormalizedInvoice = {
  id: string
  customerId: string
  quoteId: string | null
  invoiceNumber: string
  invoiceType: InvoiceType
  amount: number
  paymentStatus: PaymentStatus
  dueDate: string | null
  paidAt: string | null
  createdAt: string
  updatedAt: string
}

type NormalizedReminder = {
  id: string
  invoiceId: string
  createdAt: string
}

type NormalizedActivity = {
  id: string
  customerId: string | null
  inquiryId: string | null
  quoteId: string | null
  invoiceId: string | null
  action: string
  createdAt: string
  metadata: Record<string, unknown>
}

type NormalizedDocumentSendEvent = {
  id: string
  documentKind: string
  documentId: string
  channel: string
  createdAt: string
}

type RangeBoundary = {
  range: AnalyticsRange
  startAt: Date
  endAt: Date
  previousStartAt: Date
  previousEndAt: Date
}

const RANGE_PRESET_LABEL: Record<Exclude<AnalyticsRangePreset, "custom">, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  this_month: "This month",
  last_month: "Last month",
}

const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

function formatInputDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseInputDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) {
    return null
  }
  return new Date(year, month - 1, day, 0, 0, 0, 0)
}

function diffDaysInclusive(startAt: Date, endAt: Date) {
  return Math.max(1, Math.round((endAt.getTime() - startAt.getTime()) / DAY_MS) + 1)
}

function toShortDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value))
}

function resolveRange(input: AnalyticsQueryInput, canUseCustomRange: boolean): RangeBoundary {
  const today = startOfDay(new Date())
  const requestedPreset =
    input.range === "today" ||
    input.range === "7d" ||
    input.range === "30d" ||
    input.range === "this_month" ||
    input.range === "last_month" ||
    input.range === "custom"
      ? input.range
      : "30d"

  let preset: AnalyticsRangePreset = requestedPreset
  let startAt = startOfDay(addDays(today, -29))
  let endAt = endOfDay(today)
  let customRangeLocked = false

  if (preset === "today") {
    startAt = startOfDay(today)
    endAt = endOfDay(today)
  } else if (preset === "7d") {
    startAt = startOfDay(addDays(today, -6))
    endAt = endOfDay(today)
  } else if (preset === "30d") {
    startAt = startOfDay(addDays(today, -29))
    endAt = endOfDay(today)
  } else if (preset === "this_month") {
    startAt = startOfMonth(today)
    endAt = endOfDay(today)
  } else if (preset === "last_month") {
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    startAt = startOfMonth(lastMonth)
    endAt = endOfMonth(lastMonth)
  } else if (preset === "custom") {
    const from = parseInputDate(input.from)
    const to = parseInputDate(input.to)
    if (!canUseCustomRange || !from || !to || from.getTime() > to.getTime()) {
      preset = "30d"
      startAt = startOfDay(addDays(today, -29))
      endAt = endOfDay(today)
      customRangeLocked = Boolean(input.from || input.to || requestedPreset === "custom")
    } else {
      startAt = startOfDay(from)
      endAt = endOfDay(to)
    }
  }

  const days = diffDaysInclusive(startAt, endAt)
  const previousEndAt = endOfDay(addDays(startAt, -1))
  const previousStartAt = startOfDay(addDays(previousEndAt, -(days - 1)))

  const label =
    preset === "custom"
      ? `${toShortDate(formatInputDate(startAt))} - ${toShortDate(formatInputDate(endAt))}`
      : RANGE_PRESET_LABEL[preset]

  return {
    startAt,
    endAt,
    previousStartAt,
    previousEndAt,
    range: {
      preset,
      label,
      startDate: formatInputDate(startAt),
      endDate: formatInputDate(endAt),
      comparisonLabel: `vs ${toShortDate(formatInputDate(previousStartAt))} - ${toShortDate(formatInputDate(
        previousEndAt
      ))}`,
      previousStartDate: formatInputDate(previousStartAt),
      previousEndDate: formatInputDate(previousEndAt),
      usesCustomRange: preset === "custom",
      customRangeLocked,
      days,
    },
  }
}

function parseDateMs(value: string | null | undefined) {
  if (!value) {
    return null
  }
  const ms = new Date(value).getTime()
  return Number.isNaN(ms) ? null : ms
}

function withinRange(value: string | null | undefined, startMs: number, endMs: number) {
  const ms = parseDateMs(value)
  return ms != null && ms >= startMs && ms <= endMs
}

function asMetadataRecord(value: Json | Record<string, unknown> | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

function average(values: number[]) {
  if (!values.length) {
    return null
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function safeRate(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return null
  }
  return numerator / denominator
}

function uniqueCount(values: Array<string | null | undefined>) {
  return new Set(values.filter((value): value is string => Boolean(value))).size
}

function normalizeInquiryChannel(raw: string | null | undefined) {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase()
  if (!value) {
    return { key: "manual", label: "Manual" }
  }
  if (value.includes("portal")) {
    return { key: "portal", label: "Customer portal" }
  }
  if (value.includes("public") || value.includes("web") || value.includes("form")) {
    return { key: "webform", label: "Web form" }
  }
  if (value.includes("email")) {
    return { key: "email", label: "Email" }
  }
  if (value.includes("phone") || value.includes("call")) {
    return { key: "phone", label: "Phone" }
  }
  if (value.includes("kakao") || value.includes("sms") || value.includes("message")) {
    return { key: "messaging", label: "Kakao / SMS" }
  }
  if (value === "manual") {
    return { key: "manual", label: "Manual" }
  }
  return { key: value.replace(/\s+/g, "_"), label: raw?.trim() || "Other" }
}

function invoiceStatusBucket(status: PaymentStatus): "pending" | "partially_paid" | "paid" | "overdue" {
  if (status === "paid") {
    return "paid"
  }
  if (status === "overdue") {
    return "overdue"
  }
  if (status === "partially_paid" || status === "deposit_paid") {
    return "partially_paid"
  }
  return "pending"
}

function invoiceStatusLabel(status: "pending" | "partially_paid" | "paid" | "overdue") {
  switch (status) {
    case "pending":
      return "Pending"
    case "partially_paid":
      return "Partially paid"
    case "paid":
      return "Paid"
    case "overdue":
      return "Overdue"
  }
}

function invoiceTypeLabel(type: InvoiceType) {
  switch (type) {
    case "deposit":
      return "Deposit"
    case "balance":
      return "Balance"
    case "final":
      return "Other / final"
  }
}

function aiFeatureLabel(action: string) {
  switch (action) {
    case "ai.inquiry_structure":
      return "Inquiry structure"
    case "ai.inquiry_analyze":
      return "Inquiry analysis"
    case "ai.quote_draft":
      return "Quote draft"
    case "ai.compose_message":
      return "Message compose"
    case "ai.collection_advice":
      return "Collection advice"
    case "ai.customer_insight":
      return "Customer insight"
    default:
      return action.replace(/^ai\./, "").replace(/_/g, " ")
  }
}

function documentSendLabel(channel: string) {
  switch (channel) {
    case "email":
      return "Email send"
    case "share_link":
      return "Share link"
    case "pdf_download":
      return "PDF download"
    case "kakao_byoa":
      return "BYOA message"
    default:
      return channel
  }
}

function documentKindLabel(kind: string) {
  if (kind === "quote") {
    return "Quotes"
  }
  if (kind === "invoice") {
    return "Invoices"
  }
  return kind
}

function buildBuckets(startAt: Date, endAt: Date) {
  const days = diffDaysInclusive(startAt, endAt)
  const buckets: Array<{ label: string; startAt: Date; endAt: Date }> = []

  if (days <= 31) {
    for (let offset = 0; offset < days; offset += 1) {
      const cursor = addDays(startAt, offset)
      buckets.push({
        label: new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(cursor),
        startAt: startOfDay(cursor),
        endAt: endOfDay(cursor),
      })
    }
    return buckets
  }

  if (days <= 120) {
    let cursor = startOfDay(startAt)
    while (cursor.getTime() <= endAt.getTime()) {
      const bucketEnd = endOfDay(addDays(cursor, 6))
      buckets.push({
        label: `${formatInputDate(cursor).slice(5)} wk`,
        startAt: startOfDay(cursor),
        endAt: bucketEnd.getTime() > endAt.getTime() ? endAt : bucketEnd,
      })
      cursor = startOfDay(addDays(cursor, 7))
    }
    return buckets
  }

  let cursor = startOfMonth(startAt)
  while (cursor.getTime() <= endAt.getTime()) {
    const bucketEnd = endOfMonth(cursor)
    buckets.push({
      label: new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "short" }).format(cursor),
      startAt: startOfDay(cursor),
      endAt: bucketEnd.getTime() > endAt.getTime() ? endAt : bucketEnd,
    })
    cursor = startOfMonth(addDays(bucketEnd, 1))
  }
  return buckets
}

function currentOutstandingAmount(invoices: NormalizedInvoice[]) {
  return invoices
    .filter((invoice) => invoice.paymentStatus !== "paid")
    .reduce((sum, invoice) => sum + invoice.amount, 0)
}

function outstandingAmountAsOf(invoices: NormalizedInvoice[], cutoffMs: number) {
  return invoices
    .filter((invoice) => {
      const createdMs = parseDateMs(invoice.createdAt)
      if (createdMs == null || createdMs > cutoffMs) {
        return false
      }
      const paidMs = parseDateMs(invoice.paidAt)
      return paidMs == null || paidMs > cutoffMs || invoice.paymentStatus !== "paid"
    })
    .reduce((sum, invoice) => sum + invoice.amount, 0)
}

function overdueInvoicesAsOf(invoices: NormalizedInvoice[], cutoffMs: number) {
  return invoices.filter((invoice) => {
    if (!invoice.dueDate) {
      return false
    }
    const dueMs = parseDateMs(`${invoice.dueDate}T23:59:59`)
    const createdMs = parseDateMs(invoice.createdAt)
    if (dueMs == null || createdMs == null || createdMs > cutoffMs || dueMs > cutoffMs) {
      return false
    }
    const paidMs = parseDateMs(invoice.paidAt)
    return paidMs == null || paidMs > cutoffMs || invoice.paymentStatus === "overdue"
  })
}

function buildCsvRow(columns: Array<string | number | null | undefined>) {
  return columns
    .map((column) => {
      const value = String(column ?? "")
      if (/[",\n]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    })
    .join(",")
}

function normalizeCustomers(rows: CustomerRow[]) {
  return rows.map<NormalizedCustomer>((row) => ({
    id: row.id,
    label: row.company_name?.trim() || row.name.trim(),
    createdAt: row.created_at,
  }))
}

function normalizeInquiries(rows: InquiryRow[]) {
  return rows.map<NormalizedInquiry>((row) => ({
    id: row.id,
    customerId: row.customer_id,
    channel: row.channel,
    stage: row.stage,
    createdAt: row.created_at,
  }))
}

function normalizeQuotes(rows: QuoteRow[]) {
  return rows.map<NormalizedQuote>((row) => ({
    id: row.id,
    customerId: row.customer_id,
    inquiryId: row.inquiry_id ?? null,
    quoteNumber: row.quote_number,
    title: row.title,
    status: row.status,
    total: row.total,
    sentAt: row.sent_at ?? null,
    validUntil: row.valid_until ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

function normalizeInvoices(rows: InvoiceRow[]) {
  return rows.map<NormalizedInvoice>((row) => ({
    id: row.id,
    customerId: row.customer_id,
    quoteId: row.quote_id ?? null,
    invoiceNumber: row.invoice_number,
    invoiceType: row.invoice_type,
    amount: row.amount,
    paymentStatus: row.payment_status,
    dueDate: row.due_date ?? null,
    paidAt: row.paid_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

function normalizeReminders(rows: ReminderRow[]) {
  return rows.map<NormalizedReminder>((row) => ({
    id: row.id,
    invoiceId: row.invoice_id,
    createdAt: row.created_at,
  }))
}

function normalizeActivities(rows: ActivityLogRow[]) {
  return rows.map<NormalizedActivity>((row) => ({
    id: row.id,
    customerId: row.customer_id,
    inquiryId: row.inquiry_id,
    quoteId: row.quote_id,
    invoiceId: row.invoice_id,
    action: row.action,
    createdAt: row.created_at,
    metadata: asMetadataRecord(row.metadata),
  }))
}

function normalizeDocumentSendEvents(rows: DocumentSendEventRow[]) {
  return rows.map<NormalizedDocumentSendEvent>((row) => ({
    id: row.id,
    documentKind: row.document_kind,
    documentId: row.document_id,
    channel: row.channel,
    createdAt: row.created_at,
  }))
}

function buildReport(input: {
  plan: BillingPlan
  effectivePlan: BillingPlan
  billing: UserBillingSnapshot
  query: AnalyticsQueryInput
  customers: NormalizedCustomer[]
  inquiries: NormalizedInquiry[]
  quotes: NormalizedQuote[]
  invoices: NormalizedInvoice[]
  reminders: NormalizedReminder[]
  activities: NormalizedActivity[]
  documentSendEvents: NormalizedDocumentSendEvent[]
}): AnalyticsReport {
  const { plan, effectivePlan, billing, customers, inquiries, quotes, invoices, reminders, activities, documentSendEvents } =
    input
  const gates = {
    customRange: planAllowsFeature(effectivePlan, "analytics_custom_range"),
    advancedBreakdowns: planAllowsFeature(effectivePlan, "analytics_breakdown"),
    export: planAllowsFeature(effectivePlan, "analytics_export"),
  }
  const boundary = resolveRange(input.query, gates.customRange)
  const range = boundary.range
  const startMs = boundary.startAt.getTime()
  const endMs = boundary.endAt.getTime()
  const previousStartMs = boundary.previousStartAt.getTime()
  const previousEndMs = boundary.previousEndAt.getTime()
  const nowMs = Date.now()

  const inquiriesInRange = inquiries.filter((row) => withinRange(row.createdAt, startMs, endMs))
  const previousInquiries = inquiries.filter((row) => withinRange(row.createdAt, previousStartMs, previousEndMs))
  const quotesCreatedInRange = quotes.filter((row) => withinRange(row.createdAt, startMs, endMs))
  const previousQuotesCreated = quotes.filter((row) => withinRange(row.createdAt, previousStartMs, previousEndMs))
  const invoicesCreatedInRange = invoices.filter((row) => withinRange(row.createdAt, startMs, endMs))
  const previousInvoicesCreated = invoices.filter((row) => withinRange(row.createdAt, previousStartMs, previousEndMs))
  const approvedQuotesInRange = quotes.filter(
    (row) => row.status === "approved" && withinRange(row.updatedAt, startMs, endMs)
  )
  const previousApprovedQuotes = quotes.filter(
    (row) => row.status === "approved" && withinRange(row.updatedAt, previousStartMs, previousEndMs)
  )
  const paidInvoicesInRange = invoices.filter(
    (row) =>
      (row.paymentStatus === "paid" || row.paymentStatus === "deposit_paid") &&
      withinRange(row.paidAt, startMs, endMs)
  )
  const previousPaidInvoices = invoices.filter(
    (row) =>
      (row.paymentStatus === "paid" || row.paymentStatus === "deposit_paid") &&
      withinRange(row.paidAt, previousStartMs, previousEndMs)
  )

  const currentOutstanding = currentOutstandingAmount(invoices)
  const previousOutstanding = outstandingAmountAsOf(invoices, previousEndMs)
  const currentOverdueInvoices = overdueInvoicesAsOf(invoices, nowMs)
  const previousOverdueInvoices = overdueInvoicesAsOf(invoices, previousEndMs)
  const totalCustomers = customers.length
  const previousCustomerTotal = customers.filter((row) => {
    const createdMs = parseDateMs(row.createdAt)
    return createdMs != null && createdMs <= previousEndMs
  }).length

  const currentPaidAmount = paidInvoicesInRange.reduce((sum, row) => sum + row.amount, 0)
  const previousPaidAmount = previousPaidInvoices.reduce((sum, row) => sum + row.amount, 0)
  const paymentDayValues = paidInvoicesInRange
    .map((row) => {
      const createdMs = parseDateMs(row.createdAt)
      const paidMs = parseDateMs(row.paidAt)
      if (createdMs == null || paidMs == null || paidMs < createdMs) {
        return null
      }
      return (paidMs - createdMs) / DAY_MS
    })
    .filter((value): value is number => value != null)

  const currentPartialAmount = invoices
    .filter((row) => row.paymentStatus === "partially_paid" || row.paymentStatus === "deposit_paid")
    .reduce((sum, row) => sum + row.amount, 0)
  const currentOverdueAmount = currentOverdueInvoices.reduce((sum, row) => sum + row.amount, 0)
  const dueSoonCount = invoices.filter((row) => {
    if (!row.dueDate || row.paymentStatus === "paid") {
      return false
    }
    const dueMs = parseDateMs(`${row.dueDate}T23:59:59`)
    return dueMs != null && dueMs >= nowMs && dueMs <= nowMs + 7 * DAY_MS
  }).length

  const quoteAverageAmount = average(quotesCreatedInRange.map((row) => row.total)) ?? 0
  const sentQuotesInRange = quotes.filter(
    (row) =>
      (row.sentAt ? withinRange(row.sentAt, startMs, endMs) : false) ||
      (row.status !== "draft" && withinRange(row.createdAt, startMs, endMs))
  )
  const quoteApprovalRate = safeRate(approvedQuotesInRange.length, sentQuotesInRange.length)

  const kpis: AnalyticsKpi[] = [
    {
      key: "total_customers",
      label: "Total customers",
      description: "Current customer book size. Compared with customer count at the end of the previous comparison period.",
      value: totalCustomers,
      previousValue: previousCustomerTotal,
      delta: totalCustomers - previousCustomerTotal,
      valueType: "count",
      goodDirection: "up",
    },
    {
      key: "new_inquiries",
      label: "New inquiries",
      description: "Inquiries created in the selected period.",
      value: inquiriesInRange.length,
      previousValue: previousInquiries.length,
      delta: inquiriesInRange.length - previousInquiries.length,
      valueType: "count",
      goodDirection: "up",
    },
    {
      key: "created_quotes",
      label: "Quotes created",
      description: "Quotes created in the selected period.",
      value: quotesCreatedInRange.length,
      previousValue: previousQuotesCreated.length,
      delta: quotesCreatedInRange.length - previousQuotesCreated.length,
      valueType: "count",
      goodDirection: "up",
    },
    {
      key: "created_invoices",
      label: "Invoices issued",
      description: "Invoices created in the selected period.",
      value: invoicesCreatedInRange.length,
      previousValue: previousInvoicesCreated.length,
      delta: invoicesCreatedInRange.length - previousInvoicesCreated.length,
      valueType: "count",
      goodDirection: "up",
    },
    {
      key: "approved_quotes",
      label: "Approved quotes",
      description: "Quotes currently marked approved, counted by last status update time.",
      value: approvedQuotesInRange.length,
      previousValue: previousApprovedQuotes.length,
      delta: approvedQuotesInRange.length - previousApprovedQuotes.length,
      valueType: "count",
      goodDirection: "up",
    },
    {
      key: "paid_amount",
      label: "Collected amount",
      description: "Invoice face value whose paid_at landed in the selected period.",
      value: currentPaidAmount,
      previousValue: previousPaidAmount,
      delta: currentPaidAmount - previousPaidAmount,
      valueType: "currency",
      goodDirection: "up",
    },
    {
      key: "outstanding_amount",
      label: "Current outstanding",
      description: "Current unpaid invoice face value. Partially paid invoices are counted at full invoice value because paid balance detail is not stored yet.",
      value: currentOutstanding,
      previousValue: previousOutstanding,
      delta: currentOutstanding - previousOutstanding,
      valueType: "currency",
      goodDirection: "down",
    },
    {
      key: "overdue_count",
      label: "Current overdue invoices",
      description: "Invoices already past due and not fully paid.",
      value: currentOverdueInvoices.length,
      previousValue: previousOverdueInvoices.length,
      delta: currentOverdueInvoices.length - previousOverdueInvoices.length,
      valueType: "count",
      goodDirection: "down",
    },
  ]

  const inquiryIdSet = new Set(inquiriesInRange.map((row) => row.id))
  const cohortQuotes = quotes.filter((row) => row.inquiryId && inquiryIdSet.has(row.inquiryId))
  const cohortQuoteIds = new Set(cohortQuotes.map((row) => row.id))
  const inquiriesQuoted = uniqueCount(cohortQuotes.map((row) => row.inquiryId))
  const inquiriesSent = uniqueCount(
    cohortQuotes
      .filter((row) => Boolean(row.sentAt) || row.status !== "draft")
      .map((row) => row.inquiryId)
  )
  const inquiriesApproved = uniqueCount(
    cohortQuotes.filter((row) => row.status === "approved").map((row) => row.inquiryId)
  )
  const quoteIdToInquiryId = new Map(
    cohortQuotes
      .filter((row): row is NormalizedQuote & { inquiryId: string } => Boolean(row.inquiryId))
      .map((row) => [row.id, row.inquiryId])
  )
  const cohortInvoices = invoices.filter((row) => row.quoteId && cohortQuoteIds.has(row.quoteId))
  const cohortPaidInvoices = cohortInvoices.filter(
    (row) => row.paymentStatus === "paid" || row.paymentStatus === "deposit_paid"
  )
  const inquiriesInvoiced = uniqueCount(
    cohortInvoices.map((row) => (row.quoteId ? quoteIdToInquiryId.get(row.quoteId) ?? null : null))
  )
  const inquiriesPaid = uniqueCount(
    cohortPaidInvoices.map((row) => (row.quoteId ? quoteIdToInquiryId.get(row.quoteId) ?? null : null))
  )

  const funnelStages: AnalyticsFunnelStage[] = [
    {
      key: "new_inquiries",
      label: "New inquiries",
      description: "New inquiry opportunities created in the selected period.",
      count: inquiriesInRange.length,
      conversionFromPrevious: null,
      conversionFromStart: safeRate(inquiriesInRange.length, inquiriesInRange.length),
    },
    {
      key: "quoted_inquiries",
      label: "Converted to quote",
      description: "Selected-period inquiries that already have at least one linked quote.",
      count: inquiriesQuoted,
      conversionFromPrevious: safeRate(inquiriesQuoted, inquiriesInRange.length),
      conversionFromStart: safeRate(inquiriesQuoted, inquiriesInRange.length),
    },
    {
      key: "sent_quotes",
      label: "Quote sent",
      description: "Selected-period inquiries that reached a sent quote stage.",
      count: inquiriesSent,
      conversionFromPrevious: safeRate(inquiriesSent, inquiriesQuoted),
      conversionFromStart: safeRate(inquiriesSent, inquiriesInRange.length),
    },
    {
      key: "approved_quotes",
      label: "Quote approved",
      description: "Selected-period inquiries with at least one approved quote.",
      count: inquiriesApproved,
      conversionFromPrevious: safeRate(inquiriesApproved, inquiriesSent),
      conversionFromStart: safeRate(inquiriesApproved, inquiriesInRange.length),
    },
    {
      key: "created_invoices",
      label: "Invoice created",
      description: "Selected-period inquiries that reached invoice creation.",
      count: inquiriesInvoiced,
      conversionFromPrevious: safeRate(inquiriesInvoiced, inquiriesApproved),
      conversionFromStart: safeRate(inquiriesInvoiced, inquiriesInRange.length),
    },
    {
      key: "paid_invoices",
      label: "Invoice paid",
      description: "Selected-period inquiries with at least one fully collected invoice.",
      count: inquiriesPaid,
      conversionFromPrevious: safeRate(inquiriesPaid, inquiriesInvoiced),
      conversionFromStart: safeRate(inquiriesPaid, inquiriesInRange.length),
    },
  ]

  let weakestStageKey: string | null = null
  let weakestRate = Number.POSITIVE_INFINITY
  for (const stage of funnelStages.slice(1)) {
    if (stage.conversionFromPrevious != null && stage.conversionFromPrevious < weakestRate) {
      weakestRate = stage.conversionFromPrevious
      weakestStageKey = stage.key
    }
  }

  const customerMap = new Map(customers.map((row) => [row.id, row]))
  const inquiryHistoryByCustomer = new Map<string, NormalizedInquiry[]>()
  for (const inquiry of inquiries) {
    const current = inquiryHistoryByCustomer.get(inquiry.customerId) ?? []
    current.push(inquiry)
    inquiryHistoryByCustomer.set(inquiry.customerId, current)
  }

  const channelRows = Array.from(
    inquiriesInRange.reduce<
      Map<
        string,
        {
          label: string
          inquiryIds: Set<string>
          quotedInquiryIds: Set<string>
          approvedInquiryIds: Set<string>
          linkedQuoteAmounts: number[]
        }
      >
    >((map, inquiry) => {
      const channel = normalizeInquiryChannel(inquiry.channel)
      const current = map.get(channel.key) ?? {
        label: channel.label,
        inquiryIds: new Set<string>(),
        quotedInquiryIds: new Set<string>(),
        approvedInquiryIds: new Set<string>(),
        linkedQuoteAmounts: [],
      }
      current.inquiryIds.add(inquiry.id)
      const linkedQuotes = cohortQuotes.filter((row) => row.inquiryId === inquiry.id)
      if (linkedQuotes.length) {
        current.quotedInquiryIds.add(inquiry.id)
        current.linkedQuoteAmounts.push(...linkedQuotes.map((row) => row.total))
      }
      if (linkedQuotes.some((row) => row.status === "approved")) {
        current.approvedInquiryIds.add(inquiry.id)
      }
      map.set(channel.key, current)
      return map
    }, new Map())
  )
    .map(([key, row]) => ({
      key,
      label: row.label,
      count: row.inquiryIds.size,
      conversionRate: safeRate(row.quotedInquiryIds.size, row.inquiryIds.size),
      secondaryRate: safeRate(row.approvedInquiryIds.size, row.inquiryIds.size),
      averageAmount: average(row.linkedQuoteAmounts),
    }))
    .sort((a, b) => b.count - a.count)

  const quotesByCustomer = new Map<string, NormalizedQuote[]>()
  for (const quote of quotesCreatedInRange) {
    const current = quotesByCustomer.get(quote.customerId) ?? []
    current.push(quote)
    quotesByCustomer.set(quote.customerId, current)
  }
  const invoicesByCustomer = new Map<string, NormalizedInvoice[]>()
  for (const invoice of invoicesCreatedInRange) {
    const current = invoicesByCustomer.get(invoice.customerId) ?? []
    current.push(invoice)
    invoicesByCustomer.set(invoice.customerId, current)
  }

  const repeatCustomers = Array.from(new Set(inquiriesInRange.map((row) => row.customerId))).filter((customerId) => {
    const history = inquiryHistoryByCustomer.get(customerId) ?? []
    const prior = history.filter((row) => {
      const createdMs = parseDateMs(row.createdAt)
      return createdMs != null && createdMs < startMs
    })
    const currentPeriod = history.filter((row) => withinRange(row.createdAt, startMs, endMs))
    return prior.length > 0 || currentPeriod.length > 1
  }).length

  const activityByCustomer = new Map<string, string>()
  for (const activity of activities) {
    if (!activity.customerId) {
      continue
    }
    const existing = activityByCustomer.get(activity.customerId)
    if (!existing || existing < activity.createdAt) {
      activityByCustomer.set(activity.customerId, activity.createdAt)
    }
  }

  const topCustomers = customers
    .map<AnalyticsCustomerRow>((customer) => {
      const customerQuotes = quotes.filter((row) => row.customerId === customer.id)
      const customerInvoices = invoices.filter((row) => row.customerId === customer.id)
      const customerInquiries = inquiries.filter((row) => row.customerId === customer.id)
      const totalQuoted = customerQuotes
        .filter((row) => withinRange(row.createdAt, startMs, endMs))
        .reduce((sum, row) => sum + row.total, 0)
      const totalInvoiced = customerInvoices
        .filter((row) => withinRange(row.createdAt, startMs, endMs))
        .reduce((sum, row) => sum + row.amount, 0)
      const totalPaid = customerInvoices
        .filter((row) => withinRange(row.paidAt, startMs, endMs))
        .reduce((sum, row) => sum + row.amount, 0)
      const inquiryCount = customerInquiries.filter((row) => withinRange(row.createdAt, startMs, endMs)).length
      const overdueRisk = customerInvoices.some((row) =>
        currentOverdueInvoices.some((overdue) => overdue.id === row.id)
      )
      return {
        customerId: customer.id,
        label: customer.label,
        inquiryCount,
        totalQuoted,
        totalInvoiced,
        totalPaid,
        lastActivityAt: activityByCustomer.get(customer.id) ?? null,
        risk: overdueRisk ? "watch" : "stable",
      }
    })
    .filter((row) => row.inquiryCount > 0 || row.totalInvoiced > 0 || row.totalQuoted > 0 || row.totalPaid > 0)
    .sort((a, b) => b.totalInvoiced - a.totalInvoiced || b.totalPaid - a.totalPaid || b.inquiryCount - a.inquiryCount)
    .slice(0, 5)

  const topQuotes = [...quotesCreatedInRange]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map<AnalyticsQuoteRow>((quote) => ({
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      title: quote.title,
      customerLabel: customerMap.get(quote.customerId)?.label ?? "Unknown customer",
      total: quote.total,
      status: quote.status,
      createdAt: quote.createdAt,
    }))

  const overdueDayValues = currentOverdueInvoices
    .map((row) => {
      if (!row.dueDate) {
        return null
      }
      const dueMs = parseDateMs(`${row.dueDate}T23:59:59`)
      if (dueMs == null) {
        return null
      }
      return Math.max(0, Math.floor((nowMs - dueMs) / DAY_MS))
    })
    .filter((value): value is number => value != null)

  const reminderCount = reminders.filter((row) => withinRange(row.createdAt, startMs, endMs)).length
  const reminderPaidCount = reminders.filter((row) => {
    if (!withinRange(row.createdAt, startMs, endMs)) {
      return false
    }
    const invoice = invoices.find((item) => item.id === row.invoiceId)
    const reminderMs = parseDateMs(row.createdAt)
    const paidMs = parseDateMs(invoice?.paidAt)
    return Boolean(invoice && paidMs != null && reminderMs != null && paidMs >= reminderMs)
  }).length

  const typeRows = (["deposit", "balance", "final"] as const).map((type) => {
    const rows = invoicesCreatedInRange.filter((row) => row.invoiceType === type)
    return {
      key: type,
      label: invoiceTypeLabel(type),
      count: rows.length,
      amount: rows.reduce((sum, row) => sum + row.amount, 0),
    }
  })

  const aiActivitiesInRange = activities.filter(
    (row) => row.action.startsWith("ai.") && withinRange(row.createdAt, startMs, endMs)
  )
  const aiFeatureRows = Array.from(
    aiActivitiesInRange.reduce<Map<string, number>>((map, row) => {
      map.set(row.action, (map.get(row.action) ?? 0) + 1)
      return map
    }, new Map())
  )
    .map(([action, count]) => ({
      key: action,
      label: aiFeatureLabel(action),
      count,
      conversionRate: safeRate(count, aiActivitiesInRange.length),
    }))
    .sort((a, b) => b.count - a.count)

  const currentUsageLimits = getUsageLimitsForEffectivePlan(effectivePlan)
  const aiBackfillNotice =
    billing.aiCallsThisMonth > aiActivitiesInRange.length &&
    range.startDate.slice(0, 7) === new Date().toISOString().slice(0, 7)
      ? "Feature-level AI logs were added recently. Current-month quota is accurate, but older feature breakdown rows may be incomplete."
      : null

  const documentSendEventsInRange = documentSendEvents.filter((row) => withinRange(row.createdAt, startMs, endMs))
  const actionRows = Array.from(
    documentSendEventsInRange.reduce<Map<string, number>>((map, row) => {
      map.set(row.channel, (map.get(row.channel) ?? 0) + 1)
      return map
    }, new Map())
  )
    .map(([channel, count]) => ({
      key: channel,
      label: documentSendLabel(channel),
      count,
      conversionRate: safeRate(count, documentSendEventsInRange.length),
    }))
    .sort((a, b) => b.count - a.count)

  const documentRows = Array.from(
    documentSendEventsInRange.reduce<Map<string, number>>((map, row) => {
      map.set(row.documentKind, (map.get(row.documentKind) ?? 0) + 1)
      return map
    }, new Map())
  )
    .map(([documentKind, count]) => ({
      key: documentKind,
      label: documentKindLabel(documentKind),
      count,
      conversionRate: safeRate(count, documentSendEventsInRange.length),
    }))
    .sort((a, b) => b.count - a.count)

  const statusCounts = (["pending", "partially_paid", "paid", "overdue"] as const).map((status) => {
    const count = invoices.filter((row) => invoiceStatusBucket(row.paymentStatus) === status).length
    return { key: status, label: invoiceStatusLabel(status), count }
  })

  const volumeSeries = buildBuckets(boundary.startAt, boundary.endAt).map<AnalyticsSeriesRow>((bucket) => {
    const bucketStartMs = bucket.startAt.getTime()
    const bucketEndMs = bucket.endAt.getTime()
    return {
      label: bucket.label,
      inquiries: inquiries.filter((row) => withinRange(row.createdAt, bucketStartMs, bucketEndMs)).length,
      quotes: quotes.filter((row) => withinRange(row.createdAt, bucketStartMs, bucketEndMs)).length,
      invoices: invoices.filter((row) => withinRange(row.createdAt, bucketStartMs, bucketEndMs)).length,
      paidAmount: invoices
        .filter((row) => withinRange(row.paidAt, bucketStartMs, bucketEndMs))
        .reduce((sum, row) => sum + row.amount, 0),
      outstandingAmount: outstandingAmountAsOf(invoices, bucketEndMs),
      aiCalls: activities.filter((row) => row.action.startsWith("ai.") && withinRange(row.createdAt, bucketStartMs, bucketEndMs)).length,
    }
  })

  const highlights: string[] = []
  if (currentPaidAmount > previousPaidAmount) {
    highlights.push("Collections improved compared with the previous comparison window.")
  } else if (currentPaidAmount < previousPaidAmount) {
    highlights.push("Collected amount is trailing the previous comparison window.")
  }
  if (weakestStageKey) {
    const stage = funnelStages.find((row) => row.key === weakestStageKey)
    if (stage) {
      highlights.push(`Biggest drop-off is at "${stage.label}". This is the clearest leakage point in the pipeline.`)
    }
  }
  if (currentOverdueInvoices.length > 0) {
    highlights.push(`${currentOverdueInvoices.length} overdue invoice(s) need immediate follow-up.`)
  }
  if (!highlights.length) {
    highlights.push("No major negative signal was detected in the selected analytics window.")
  }

  return {
    plan,
    effectivePlan,
    range,
    gates,
    kpis,
    funnel: {
      stages: funnelStages,
      weakestStageKey,
    },
    highlights,
    cash: {
      periodInvoicedAmount: invoicesCreatedInRange.reduce((sum, row) => sum + row.amount, 0),
      periodPaidAmount: currentPaidAmount,
      currentOutstandingAmount: currentOutstanding,
      currentOverdueAmount: currentOverdueAmount,
      currentPartialAmount: currentPartialAmount,
      dueSoonCount,
      averagePaymentDays: average(paymentDayValues),
      statusCounts,
    },
    volumeSeries,
    channelRows,
    customerSummary: {
      newCustomers: customers.filter((row) => withinRange(row.createdAt, startMs, endMs)).length,
      repeatCustomers,
      avgQuotePerCustomer:
        average(Array.from(quotesByCustomer.values()).map((rows) => rows.reduce((sum, row) => sum + row.total, 0))) ?? 0,
      avgInvoicePerCustomer:
        average(Array.from(invoicesByCustomer.values()).map((rows) => rows.reduce((sum, row) => sum + row.amount, 0))) ?? 0,
      topCustomers,
    },
    quoteSummary: {
      created: quotesCreatedInRange.length,
      sent: sentQuotesInRange.length,
      approved: approvedQuotesInRange.length,
      rejected: quotes.filter((row) => row.status === "rejected" && withinRange(row.updatedAt, startMs, endMs)).length,
      expired: quotes.filter((row) => row.status === "expired" && withinRange(row.updatedAt, startMs, endMs)).length,
      approvalRate: quoteApprovalRate,
      averageAmount: quoteAverageAmount,
      expiringSoonCount: quotes.filter((row) => {
        if (!row.validUntil || row.status === "approved" || row.status === "rejected" || row.status === "expired") {
          return false
        }
        const validMs = parseDateMs(`${row.validUntil}T23:59:59`)
        return validMs != null && validMs >= nowMs && validMs <= nowMs + 7 * DAY_MS
      }).length,
      topQuotes,
    },
    invoiceSummary: {
      created: invoicesCreatedInRange.length,
      averagePaymentDays: average(paymentDayValues),
      overdueCount: currentOverdueInvoices.length,
      averageOverdueDays: average(overdueDayValues),
      reminderPaidCount,
      reminderCount,
      typeRows,
    },
    aiSummary: {
      periodCalls: aiActivitiesInRange.length,
      currentMonthCalls: billing.aiCallsThisMonth,
      currentMonthLimit: currentUsageLimits.aiCallsPerMonth,
      featureRows: aiFeatureRows,
      backfillNotice: aiBackfillNotice,
    },
    documentSendSummary: {
      periodCount: documentSendEventsInRange.length,
      currentMonthCount: billing.documentSendsThisMonth,
      currentMonthLimit: currentUsageLimits.documentSendsPerMonth,
      actionRows,
      documentRows,
    },
    definitions: [
      "New inquiries = inquiries created in the selected period.",
      "Inquiry to quote conversion = unique inquiries with at least one linked quote divided by selected-period inquiries.",
      "Approved quotes = quotes whose current status is approved, counted by updated_at because approved_at is not stored yet.",
      "Collected amount = invoice face value for invoices whose paid_at landed in the selected period.",
      "Current outstanding = invoice face value not fully paid right now. Partially paid exposure is shown at full invoice value because exact remaining balance is not stored yet.",
      "Average payment days = created_at to paid_at for invoices paid in the selected period.",
      "Partially paid bucket includes both partially_paid and deposit_paid statuses.",
    ],
  }
}

export async function getAnalyticsReportForCurrentUser(
  query: AnalyticsQueryInput
): Promise<AnalyticsReport | null> {
  const session = await getAppSession()
  if (!session) {
    return null
  }

  if (session.mode === "demo") {
    return buildReport({
      plan: demoUser.plan,
      effectivePlan: demoUser.effectivePlan ?? demoUser.plan,
      billing: demoBillingSnapshot,
      query,
      customers: demoCustomers.map((row) => ({
        id: row.id,
        label: row.companyName || row.name,
        createdAt: row.createdAt,
      })),
      inquiries: demoInquiries.map((row) => ({
        id: row.id,
        customerId: row.customerId,
        channel: row.channel,
        stage: row.stage,
        createdAt: row.createdAt,
      })),
      quotes: demoQuotes.map((row) => ({
        id: row.id,
        customerId: row.customerId,
        inquiryId: row.inquiryId ?? null,
        quoteNumber: row.quoteNumber,
        title: row.title,
        status: row.status,
        total: row.total,
        sentAt: row.sentAt ?? null,
        validUntil: row.validUntil ?? null,
        createdAt: row.createdAt ?? new Date().toISOString(),
        updatedAt: row.updatedAt ?? row.createdAt ?? new Date().toISOString(),
      })),
      invoices: demoInvoices.map((row) => ({
        id: row.id,
        customerId: row.customerId,
        quoteId: row.quoteId ?? null,
        invoiceNumber: row.invoiceNumber,
        invoiceType: row.invoiceType,
        amount: row.amount,
        paymentStatus: row.paymentStatus,
        dueDate: row.dueDate ?? null,
        paidAt: row.paidAt ?? null,
        createdAt: row.createdAt ?? new Date().toISOString(),
        updatedAt: row.updatedAt ?? row.createdAt ?? new Date().toISOString(),
      })),
      reminders: demoReminders.map((row) => ({
        id: row.id,
        invoiceId: row.invoiceId,
        createdAt: row.sentAt ?? new Date().toISOString(),
      })),
      activities: demoActivityLogs.map((row) => ({
        id: row.id,
        customerId: row.customerId ?? null,
        inquiryId: row.inquiryId ?? null,
        quoteId: row.quoteId ?? null,
        invoiceId: row.invoiceId ?? null,
        action: row.action,
        createdAt: row.createdAt ?? new Date().toISOString(),
        metadata: {},
      })),
      documentSendEvents: [],
    })
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    throw new Error("Analytics data source is not configured.")
  }

  const userId = session.user.id
  const [
    { data: customerRows, error: customerError },
    { data: inquiryRows, error: inquiryError },
    { data: quoteRows, error: quoteError },
    { data: invoiceRows, error: invoiceError },
    { data: reminderRows, error: reminderError },
    { data: activityRows, error: activityError },
    planContext,
  ] = await Promise.all([
    supabase.from("customers").select("id, name, company_name, created_at").eq("user_id", userId),
    supabase.from("inquiries").select("id, customer_id, channel, stage, created_at").eq("user_id", userId),
    supabase
      .from("quotes")
      .select("id, customer_id, inquiry_id, quote_number, title, status, total, sent_at, valid_until, created_at, updated_at")
      .eq("user_id", userId),
    supabase
      .from("invoices")
      .select("id, customer_id, quote_id, invoice_number, invoice_type, amount, payment_status, due_date, paid_at, created_at, updated_at")
      .eq("user_id", userId),
    supabase.from("reminders").select("id, invoice_id, created_at").eq("user_id", userId),
    supabase
      .from("activity_logs")
      .select("id, customer_id, inquiry_id, quote_id, invoice_id, action, metadata, created_at")
      .eq("user_id", userId),
    loadPlanContext(supabase as SupabaseClient<Database>, userId),
  ])

  if (customerError) throw customerError
  if (inquiryError) throw inquiryError
  if (quoteError) throw quoteError
  if (invoiceError) throw invoiceError
  if (reminderError) throw reminderError
  if (activityError) throw activityError

  let documentSendRows: DocumentSendEventRow[] = []
  const { data: documentSendData, error: documentSendError } = await supabase
    .from("document_send_events")
    .select("id, document_kind, document_id, channel, created_at")
    .eq("user_id", userId)

  if (documentSendError) {
    if (isMissingDbRelationError(documentSendError)) {
      console.warn("[analytics] document_send_events unavailable:", documentSendError.message)
    } else {
      throw documentSendError
    }
  } else {
    documentSendRows = (documentSendData ?? []) as DocumentSendEventRow[]
  }

  return buildReport({
    plan: planContext.plan,
    effectivePlan: planContext.effectivePlan,
    billing: planContext.billing,
    query,
    customers: normalizeCustomers((customerRows ?? []) as CustomerRow[]),
    inquiries: normalizeInquiries((inquiryRows ?? []) as InquiryRow[]),
    quotes: normalizeQuotes((quoteRows ?? []) as QuoteRow[]),
    invoices: normalizeInvoices((invoiceRows ?? []) as InvoiceRow[]),
    reminders: normalizeReminders((reminderRows ?? []) as ReminderRow[]),
    activities: normalizeActivities((activityRows ?? []) as ActivityLogRow[]),
    documentSendEvents: normalizeDocumentSendEvents(documentSendRows),
  })
}

export function buildAnalyticsHref(basePath: string, range: Pick<AnalyticsRange, "preset" | "startDate" | "endDate">) {
  const search = new URLSearchParams()
  search.set("range", range.preset)
  if (range.preset === "custom") {
    search.set("from", range.startDate)
    search.set("to", range.endDate)
  }
  return `${basePath}?${search.toString()}`
}

export function buildAnalyticsCsv(report: AnalyticsReport) {
  const rows: string[] = []
  rows.push(buildCsvRow(["Bill-IO analytics export"]))
  rows.push(buildCsvRow(["Range", report.range.label]))
  rows.push(buildCsvRow(["Start", report.range.startDate]))
  rows.push(buildCsvRow(["End", report.range.endDate]))
  rows.push("")

  rows.push(buildCsvRow(["KPI", "Value", "Previous", "Delta"]))
  for (const kpi of report.kpis) {
    rows.push(buildCsvRow([kpi.label, kpi.value, kpi.previousValue, kpi.delta]))
  }
  rows.push("")

  rows.push(buildCsvRow(["Funnel stage", "Count", "From previous", "From start"]))
  for (const stage of report.funnel.stages) {
    rows.push(
      buildCsvRow([
        stage.label,
        stage.count,
        stage.conversionFromPrevious == null ? "" : `${(stage.conversionFromPrevious * 100).toFixed(1)}%`,
        stage.conversionFromStart == null ? "" : `${(stage.conversionFromStart * 100).toFixed(1)}%`,
      ])
    )
  }
  rows.push("")

  rows.push(buildCsvRow(["Channel", "Count", "Quote conversion", "Approved rate", "Avg quote amount"]))
  for (const row of report.channelRows) {
    rows.push(
      buildCsvRow([
        row.label,
        row.count,
        row.conversionRate == null ? "" : `${(row.conversionRate * 100).toFixed(1)}%`,
        row.secondaryRate == null ? "" : `${(row.secondaryRate * 100).toFixed(1)}%`,
        row.averageAmount ?? "",
      ])
    )
  }
  rows.push("")

  rows.push(buildCsvRow(["Top customer", "Inquiries", "Quoted", "Invoiced", "Paid", "Risk"]))
  for (const row of report.customerSummary.topCustomers) {
    rows.push(buildCsvRow([row.label, row.inquiryCount, row.totalQuoted, row.totalInvoiced, row.totalPaid, row.risk]))
  }
  rows.push("")

  rows.push(buildCsvRow(["Period", "Inquiries", "Quotes", "Invoices", "Paid amount", "Outstanding amount", "AI calls"]))
  for (const row of report.volumeSeries) {
    rows.push(
      buildCsvRow([
        row.label,
        row.inquiries,
        row.quotes,
        row.invoices,
        row.paidAmount,
        row.outstandingAmount,
        row.aiCalls,
      ])
    )
  }
  rows.push("")

  rows.push(buildCsvRow(["Document send action", "Count"]))
  for (const row of report.documentSendSummary.actionRows) {
    rows.push(buildCsvRow([row.label, row.count]))
  }
  rows.push("")

  rows.push(buildCsvRow(["AI feature", "Count"]))
  for (const row of report.aiSummary.featureRows) {
    rows.push(buildCsvRow([row.label, row.count]))
  }

  return rows.join("\n")
}
