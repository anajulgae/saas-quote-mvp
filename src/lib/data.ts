import { randomBytes } from "node:crypto"

import type { SupabaseClient } from "@supabase/supabase-js"

import { resolveActivityHeadline, resolveActivityKind } from "@/lib/activity-presentation"
import {
  demoActivityLogs,
  demoBusinessSettings,
  demoCustomers,
  demoInquiries,
  demoInvoices,
  demoQuoteItems,
  demoQuotes,
  demoReminders,
  demoTemplates,
  demoUser,
  getCustomerTimeline,
  getDashboardMetrics,
} from "@/lib/demo-data"
import { getAppSession } from "@/lib/auth"
import {
  defaultQuoteSummaryFromTemplates,
  defaultReminderMessageFromTemplates,
} from "@/lib/template-defaults"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { fetchUserPlanRow } from "@/lib/user-plan"
import type {
  ActivityLog,
  BillingPlan,
  BusinessSettings,
  Customer,
  CustomerSummary,
  DashboardMetrics,
  Inquiry,
  InquiryStage,
  InquiryWithCustomer,
  Invoice,
  InvoiceFormInput,
  InvoiceWithReminders,
  PaymentStatus,
  Quote,
  QuoteFormInput,
  QuoteItem,
  QuoteLinkedInvoiceStub,
  QuoteStatus,
  QuoteWithItems,
  ReminderFormInput,
  Template,
  TimelineEvent,
} from "@/types/domain"
import type { Database } from "@/types/supabase"

type CustomerRow = Database["public"]["Tables"]["customers"]["Row"]
type InquiryRow = Database["public"]["Tables"]["inquiries"]["Row"]
type QuoteRow = Database["public"]["Tables"]["quotes"]["Row"]
type QuoteItemRow = Database["public"]["Tables"]["quote_items"]["Row"]
type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"]
type ReminderRow = Database["public"]["Tables"]["reminders"]["Row"]
type ActivityLogRow = Database["public"]["Tables"]["activity_logs"]["Row"]
type BusinessSettingsRow = Database["public"]["Tables"]["business_settings"]["Row"]
type TemplateRow = Database["public"]["Tables"]["templates"]["Row"]
type QueryResult = {
  data: unknown
  error: Error | null
}
type QueryBuilderLike = PromiseLike<QueryResult> & {
  select: (...args: unknown[]) => QueryBuilderLike
  insert: (...args: unknown[]) => QueryBuilderLike
  update: (...args: unknown[]) => QueryBuilderLike
  upsert: (...args: unknown[]) => QueryBuilderLike
  delete: (...args: unknown[]) => QueryBuilderLike
  eq: (...args: unknown[]) => QueryBuilderLike
  order: (...args: unknown[]) => QueryBuilderLike
  limit: (...args: unknown[]) => QueryBuilderLike
  maybeSingle: () => Promise<QueryResult>
  single: () => Promise<QueryResult>
}
type QueryableSupabase = {
  from: (table: string) => QueryBuilderLike
}

type AppDataContext =
  | { mode: "demo"; userId: string; supabase: null }
  | { mode: "supabase"; userId: string; supabase: QueryableSupabase }

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    companyName: row.company_name ?? undefined,
    phone: row.phone ?? "",
    email: row.email ?? "",
    notes: row.notes ?? undefined,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapInquiry(row: InquiryRow): Inquiry {
  return {
    id: row.id,
    userId: row.user_id,
    customerId: row.customer_id,
    title: row.title,
    serviceCategory: row.service_category,
    channel: row.channel,
    details: row.details ?? "",
    requestedDate: row.requested_date ?? "",
    budgetMin: row.budget_min ?? undefined,
    budgetMax: row.budget_max ?? undefined,
    stage: row.stage,
    followUpAt: row.follow_up_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapQuote(row: QuoteRow): Quote {
  return {
    id: row.id,
    userId: row.user_id,
    customerId: row.customer_id,
    inquiryId: row.inquiry_id ?? undefined,
    quoteNumber: row.quote_number,
    title: row.title,
    summary: row.summary ?? "",
    status: row.status,
    subtotal: row.subtotal,
    tax: row.tax,
    total: row.total,
    sentAt: row.sent_at ?? undefined,
    validUntil: row.valid_until ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publicShareToken: row.public_share_token ?? undefined,
  }
}

function mapQuoteItem(row: QuoteItemRow): QuoteItem {
  return {
    id: row.id,
    quoteId: row.quote_id,
    sortOrder: row.sort_order,
    name: row.name,
    description: row.description ?? undefined,
    quantity: Number(row.quantity),
    unitPrice: row.unit_price,
    lineTotal: row.line_total,
  }
}

function mapInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    userId: row.user_id,
    customerId: row.customer_id,
    quoteId: row.quote_id ?? undefined,
    invoiceNumber: row.invoice_number,
    invoiceType: row.invoice_type,
    amount: row.amount,
    paymentStatus: row.payment_status,
    dueDate: row.due_date ?? undefined,
    paidAt: row.paid_at ?? undefined,
    requestedAt: row.requested_at ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapReminder(row: ReminderRow) {
  return {
    id: row.id,
    userId: row.user_id,
    invoiceId: row.invoice_id,
    channel: row.channel,
    message: row.message,
    sentAt: row.sent_at,
  }
}

function mapBusinessSettings(row: BusinessSettingsRow): BusinessSettings {
  return {
    id: row.id,
    userId: row.user_id,
    businessName: row.business_name,
    ownerName: row.owner_name,
    businessRegistrationNumber: row.business_registration_number ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    paymentTerms: row.payment_terms ?? "",
    bankAccount: row.bank_account ?? "",
    reminderMessage: row.reminder_message ?? "",
    sealImageUrl: row.seal_image_url ?? undefined,
    sealEnabled: Boolean(row.seal_enabled),
    updatedAt: row.updated_at,
  }
}

function mapTemplate(row: TemplateRow): Template {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as "quote" | "reminder",
    name: row.name,
    content: row.content,
    isDefault: row.is_default,
    updatedAt: row.updated_at,
  }
}

function mapActivityLog(row: ActivityLogRow): ActivityLog {
  return {
    id: row.id,
    userId: row.user_id,
    customerId: row.customer_id ?? undefined,
    inquiryId: row.inquiry_id ?? undefined,
    quoteId: row.quote_id ?? undefined,
    invoiceId: row.invoice_id ?? undefined,
    action: row.action,
    description: row.description,
    createdAt: row.created_at,
  }
}

function mapActivityToTimeline(log: ActivityLog): TimelineEvent {
  return {
    id: log.id,
    label: resolveActivityHeadline(log.action),
    description: log.description,
    createdAt: log.createdAt,
    action: log.action,
    kind: resolveActivityKind(log.action),
  }
}

function bucketActivityByCustomerId(
  logs: ActivityLog[],
  maxPerCustomer: number
): Record<string, ActivityLog[]> {
  const m: Record<string, ActivityLog[]> = {}
  for (const log of logs) {
    const cid = log.customerId
    if (!cid) {
      continue
    }
    const arr = m[cid] ?? []
    if (arr.length >= maxPerCustomer) {
      continue
    }
    arr.push(log)
    m[cid] = arr
  }
  return m
}

function bucketActivityByQuoteId(logs: ActivityLog[], maxPer: number): Record<string, ActivityLog[]> {
  const m: Record<string, ActivityLog[]> = {}
  for (const log of logs) {
    const id = log.quoteId
    if (!id) {
      continue
    }
    const arr = m[id] ?? []
    if (arr.length >= maxPer) {
      continue
    }
    arr.push(log)
    m[id] = arr
  }
  return m
}

function bucketActivityByInvoiceId(logs: ActivityLog[], maxPer: number): Record<string, ActivityLog[]> {
  const m: Record<string, ActivityLog[]> = {}
  for (const log of logs) {
    const id = log.invoiceId
    if (!id) {
      continue
    }
    const arr = m[id] ?? []
    if (arr.length >= maxPer) {
      continue
    }
    arr.push(log)
    m[id] = arr
  }
  return m
}

async function getDataContext(): Promise<AppDataContext> {
  const session = await getAppSession()

  if (!session || session.mode === "demo") {
    return {
      mode: "demo" as const,
      userId: session?.user.id ?? "user-demo",
      supabase: null,
    }
  }

  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    return {
      mode: "demo" as const,
      userId: session.user.id,
      supabase: null,
    }
  }

  return {
    mode: "supabase" as const,
    userId: session.user.id,
    supabase: supabase as unknown as QueryableSupabase,
  }
}

export async function createActivityLog(input: {
  action: string
  description: string
  customerId?: string
  inquiryId?: string
  quoteId?: string
  invoiceId?: string
  metadata?: Record<string, string | number | boolean | null | undefined>
}) {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return
  }

  await context.supabase.from("activity_logs").insert({
    user_id: context.userId,
    customer_id: input.customerId ?? null,
    inquiry_id: input.inquiryId ?? null,
    quote_id: input.quoteId ?? null,
    invoice_id: input.invoiceId ?? null,
    action: input.action,
    description: input.description,
    metadata: input.metadata ?? {},
  })
}

export async function createInquiryRecord(input: {
  title: string
  customerId: string
  serviceCategory: string
  channel: string
  details: string
  budgetMin?: number
  budgetMax?: number
  stage: Inquiry["stage"]
  followUpAt?: string
}) {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return { mode: "demo" as const }
  }

  const { data: customerData } = await context.supabase
    .from("customers")
    .select("id, company_name, name")
    .eq("id", input.customerId)
    .maybeSingle()
  const customer = customerData as
    | { id: string; company_name: string | null; name: string }
    | null

  const { data: inquiryData, error } = await context.supabase
    .from("inquiries")
    .insert({
      user_id: context.userId,
      customer_id: input.customerId,
      title: input.title,
      channel: input.channel,
      service_category: input.serviceCategory,
      details: input.details,
      requested_date: new Date().toISOString().slice(0, 10),
      budget_min: input.budgetMin ?? null,
      budget_max: input.budgetMax ?? null,
      stage: input.stage,
      follow_up_at: input.followUpAt ?? null,
    })
    .select("*")
    .single()

  if (error) {
    throw error
  }

  const data = inquiryData as InquiryRow

  await createActivityLog({
    action: "inquiry.created",
    description: `${customer?.company_name ?? customer?.name ?? "고객"} 문의가 등록되었습니다.`,
    customerId: input.customerId,
    inquiryId: data.id,
    metadata: {
      title: input.title,
      stage: input.stage,
    },
  })

  return {
    mode: "supabase" as const,
    inquiry: mapInquiry(data),
  }
}

const CUSTOMER_INQUIRY_RECENT_DAYS = 14

export async function createCustomerRecord(input: {
  name: string
  companyName?: string
  phone?: string
  email?: string
  notes?: string
  tags: string[]
}) {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return { mode: "demo" as const, customerId: null as string | null }
  }

  const { data, error } = await context.supabase
    .from("customers")
    .insert({
      user_id: context.userId,
      name: input.name,
      company_name: input.companyName?.trim() ? input.companyName.trim() : null,
      phone: input.phone?.trim() ? input.phone.trim() : null,
      email: input.email?.trim() ? input.email.trim() : null,
      notes: input.notes?.trim() ? input.notes.trim() : null,
      tags: input.tags.length ? input.tags : [],
    })
    .select("id")
    .single()

  if (error) {
    throw error
  }

  const row = data as { id: string }

  await createActivityLog({
    action: "customer.created",
    description: `${input.companyName?.trim() || input.name} 고객을 등록했습니다.`,
    customerId: row.id,
    metadata: {
      name: input.name,
    },
  })

  return { mode: "supabase" as const, customerId: row.id }
}

export async function updateInquiryRecord(
  inquiryId: string,
  input: {
    title: string
    customerId: string
    serviceCategory: string
    channel: string
    details: string
    budgetMin?: number
    budgetMax?: number
    stage: Inquiry["stage"]
    followUpAt?: string
  }
) {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return { mode: "demo" as const }
  }

  const { data: inquiryData, error } = await context.supabase
    .from("inquiries")
    .update({
      customer_id: input.customerId,
      title: input.title,
      channel: input.channel,
      service_category: input.serviceCategory,
      details: input.details,
      budget_min: input.budgetMin ?? null,
      budget_max: input.budgetMax ?? null,
      stage: input.stage,
      follow_up_at: input.followUpAt ?? null,
    })
    .eq("id", inquiryId)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  const data = inquiryData as InquiryRow

  await createActivityLog({
    action: "inquiry.updated",
    description: `${input.title} 문의가 수정되었습니다.`,
    customerId: input.customerId,
    inquiryId,
    metadata: {
      stage: input.stage,
    },
  })

  return {
    mode: "supabase" as const,
    inquiry: mapInquiry(data),
  }
}

function buildQuoteTotals(items: QuoteFormInput["items"]) {
  const normalizedItems = items.map((item, index) => {
    const quantity = Number(item.quantity)
    const unitPrice = Number(item.unitPrice)
    const lineTotal = Math.round(quantity * unitPrice)

    return {
      sort_order: index,
      name: item.name,
      description: item.description ?? null,
      quantity,
      unit_price: unitPrice,
      line_total: lineTotal,
    }
  })

  const subtotal = normalizedItems.reduce((sum, item) => sum + item.line_total, 0)
  const tax = Math.round(subtotal * 0.1)
  const total = subtotal + tax

  return {
    normalizedItems,
    subtotal,
    tax,
    total,
  }
}

async function generateQuoteNumber(context: {
  supabase: QueryableSupabase
  userId: string
}) {
  const { data } = await context.supabase
    .from("quotes")
    .select("quote_number")
    .order("created_at", { ascending: false })
    .limit(1)

  const rows = (data ?? []) as Array<{ quote_number: string }>
  const currentYear = new Date().getFullYear()
  const suffix =
    rows.length > 0
      ? String(Number(rows[0].quote_number.split("-").at(-1) ?? "0") + 1).padStart(3, "0")
      : "001"

  return `Q-${currentYear}-${suffix}`
}

async function generateInvoiceNumber(context: {
  supabase: QueryableSupabase
  userId: string
}) {
  const { data } = await context.supabase
    .from("invoices")
    .select("invoice_number")
    .order("created_at", { ascending: false })
    .limit(1)

  const rows = (data ?? []) as Array<{ invoice_number: string }>
  const currentYear = new Date().getFullYear()
  const suffix =
    rows.length > 0
      ? String(Number(rows[0].invoice_number.split("-").at(-1) ?? "0") + 1).padStart(3, "0")
      : "001"

  return `I-${currentYear}-${suffix}`
}

async function syncInquiryQuotedState(
  context: { supabase: QueryableSupabase },
  inquiryId: string | undefined,
  quoteId: string,
  quoteTitle: string
) {
  if (!inquiryId) {
    return
  }

  await context.supabase
    .from("inquiries")
    .update({
      stage: "quoted",
    })
    .eq("id", inquiryId)

  await createActivityLog({
    action: "quote.linked_to_inquiry",
    description: `${quoteTitle} 견적이 문의 흐름에 연결되었습니다.`,
    inquiryId,
    quoteId,
  })
}

export async function createQuoteRecord(input: QuoteFormInput) {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return { mode: "demo" as const }
  }

  const { normalizedItems, subtotal, tax, total } = buildQuoteTotals(input.items)
  const quoteNumber = await generateQuoteNumber(context)
  const sentAt =
    input.status === "sent" && !input.sentAt ? new Date().toISOString() : input.sentAt

  const { data: quoteData, error } = await context.supabase
    .from("quotes")
    .insert({
      user_id: context.userId,
      customer_id: input.customerId,
      inquiry_id: input.inquiryId ?? null,
      quote_number: quoteNumber,
      title: input.title,
      summary: input.summary,
      status: input.status,
      subtotal,
      tax,
      total,
      sent_at: sentAt ?? null,
      valid_until: input.validUntil ?? null,
    })
    .select("*")
    .single()

  if (error) {
    throw error
  }

  const quote = quoteData as QuoteRow

  if (normalizedItems.length > 0) {
    await context.supabase.from("quote_items").insert(
      normalizedItems.map((item) => ({
        ...item,
        quote_id: quote.id,
      }))
    )
  }

  await syncInquiryQuotedState(context, input.inquiryId, quote.id, input.title)

  await createActivityLog({
    action: "quote.created",
    description: `${input.title} 견적이 생성되었습니다.`,
    customerId: input.customerId,
    inquiryId: input.inquiryId,
    quoteId: quote.id,
    metadata: {
      status: input.status,
      total,
    },
  })

  return {
    mode: "supabase" as const,
    quote: mapQuote(quote),
  }
}

export async function updateQuoteRecord(quoteId: string, input: QuoteFormInput) {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return { mode: "demo" as const }
  }

  const { normalizedItems, subtotal, tax, total } = buildQuoteTotals(input.items)
  const sentAt =
    input.status === "sent" && !input.sentAt ? new Date().toISOString() : input.sentAt

  const { data: quoteData, error } = await context.supabase
    .from("quotes")
    .update({
      customer_id: input.customerId,
      inquiry_id: input.inquiryId ?? null,
      title: input.title,
      summary: input.summary,
      status: input.status,
      subtotal,
      tax,
      total,
      sent_at: sentAt ?? null,
      valid_until: input.validUntil ?? null,
    })
    .eq("id", quoteId)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  await context.supabase.from("quote_items").delete().eq("quote_id", quoteId)

  if (normalizedItems.length > 0) {
    await context.supabase.from("quote_items").insert(
      normalizedItems.map((item) => ({
        ...item,
        quote_id: quoteId,
      }))
    )
  }

  await syncInquiryQuotedState(context, input.inquiryId, quoteId, input.title)

  await createActivityLog({
    action: "quote.updated",
    description: `${input.title} 견적이 수정되었습니다.`,
    customerId: input.customerId,
    inquiryId: input.inquiryId,
    quoteId,
    metadata: {
      status: input.status,
      total,
    },
  })

  return {
    mode: "supabase" as const,
    quote: mapQuote(quoteData as QuoteRow),
  }
}

export async function updateQuoteStatusRecord(quoteId: string, status: Quote["status"]) {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return { mode: "demo" as const }
  }

  const { data: existingQuoteData } = await context.supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .maybeSingle()
  const existingQuote = existingQuoteData as QuoteRow | null
  const sentAt =
    status === "sent"
      ? existingQuote?.sent_at ?? new Date().toISOString()
      : existingQuote?.sent_at ?? null

  const { data, error } = await context.supabase
    .from("quotes")
    .update({
      status,
      sent_at: sentAt,
    })
    .eq("id", quoteId)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  const quote = data as QuoteRow

  await createActivityLog({
    action: "quote.status_changed",
    description: `${quote.title} 견적 상태가 변경되었습니다.`,
    customerId: quote.customer_id,
    inquiryId: quote.inquiry_id ?? undefined,
    quoteId,
    metadata: {
      status,
      previous_status: existingQuote?.status ?? null,
    },
  })

  await syncInquiryQuotedState(
    context,
    quote.inquiry_id ?? undefined,
    quoteId,
    quote.title
  )

  return {
    mode: "supabase" as const,
    quote: mapQuote(quote),
  }
}

/** 목록·생성 화면에 보여 줄 다음 견적 번호(실제 저장 시점 번호와 다를 수 있음) */
export function computeNextQuoteNumberPreview(quotes: Pick<Quote, "quoteNumber">[]): string {
  const year = new Date().getFullYear()
  const prefix = `Q-${year}-`
  let maxSeq = 0
  for (const q of quotes) {
    const n = q.quoteNumber
    if (!n.startsWith(prefix)) {
      continue
    }
    const seq = Number(n.split("-").at(-1))
    if (Number.isFinite(seq)) {
      maxSeq = Math.max(maxSeq, seq)
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(3, "0")}`
}

export async function duplicateQuoteRecord(quoteId: string) {
  const context = await getDataContext()

  if (context.mode === "demo") {
    throw new Error("DEMO_MODE")
  }

  const { data: quoteRowRaw, error: quoteError } = await context.supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .maybeSingle()

  if (quoteError) {
    throw quoteError
  }

  const quoteRow = quoteRowRaw as QuoteRow | null
  if (!quoteRow) {
    throw new Error("QUOTE_NOT_FOUND")
  }

  const { data: itemRows, error: itemError } = await context.supabase
    .from("quote_items")
    .select("*")
    .eq("quote_id", quoteId)
    .order("sort_order", { ascending: true })

  if (itemError) {
    throw itemError
  }

  const itemsSafe = (itemRows ?? []) as QuoteItemRow[]
  const baseTitle = quoteRow.title.trim()
  const copyTitle =
    baseTitle.length > 180 ? `${baseTitle.slice(0, 177)}… (사본)` : `${baseTitle} (사본)`

  const validUntilDate = new Date()
  validUntilDate.setDate(validUntilDate.getDate() + 14)

  const input: QuoteFormInput = {
    customerId: quoteRow.customer_id,
    inquiryId: quoteRow.inquiry_id ?? undefined,
    title: copyTitle,
    summary: quoteRow.summary ?? "",
    status: "draft",
    validUntil: validUntilDate.toISOString().slice(0, 10),
    sentAt: undefined,
    items:
      itemsSafe.length > 0
        ? itemsSafe.map((row) => ({
            name: row.name,
            description: row.description ?? undefined,
            quantity: row.quantity,
            unitPrice: row.unit_price,
          }))
        : [{ name: "항목 1", description: undefined, quantity: 1, unitPrice: 0 }],
  }

  const created = await createQuoteRecord(input)

  if (created.mode === "supabase" && created.quote) {
    await createActivityLog({
      action: "quote.duplicated",
      description: `「${quoteRow.title}」(${quoteRow.quote_number})을 복제해 ${created.quote.quoteNumber} 견적을 만들었습니다.`,
      customerId: created.quote.customerId,
      inquiryId: created.quote.inquiryId,
      quoteId: created.quote.id,
      metadata: {
        source_quote_id: quoteId,
        source_quote_number: quoteRow.quote_number,
      },
    })
  }

  return created
}

export async function deleteQuoteRecord(quoteId: string) {
  const context = await getDataContext()

  if (context.mode === "demo") {
    throw new Error("DEMO_MODE")
  }

  const { data: quoteRowRaw, error: quoteError } = await context.supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .maybeSingle()

  if (quoteError) {
    throw quoteError
  }

  const quoteRow = quoteRowRaw as QuoteRow | null
  if (!quoteRow) {
    throw new Error("QUOTE_NOT_FOUND")
  }

  await createActivityLog({
    action: "quote.deleted",
    description: `「${quoteRow.title}」(${quoteRow.quote_number}) 견적을 삭제했습니다.`,
    customerId: quoteRow.customer_id,
    inquiryId: quoteRow.inquiry_id ?? undefined,
    quoteId,
    metadata: {
      quote_number: quoteRow.quote_number,
    },
  })

  const { error: delError } = await context.supabase.from("quotes").delete().eq("id", quoteId)

  if (delError) {
    throw delError
  }

  return {
    mode: "supabase" as const,
    customerId: quoteRow.customer_id,
  }
}

export async function getQuotePrintPageData(quoteId: string): Promise<{
  quote: QuoteWithItems
  issuer: {
    businessName: string
    ownerName: string
    businessRegistrationNumber: string
    email: string
    phone: string
    paymentTerms: string
    bankAccount: string
    sealImageUrl?: string
    sealEnabled: boolean
  }
} | null> {
  const context = await getDataContext()

  if (context.mode === "demo") {
    const quote = demoQuotes.find((q) => q.id === quoteId)
    if (!quote) {
      return null
    }
    const customer = demoCustomers.find((c) => c.id === quote.customerId)
    const items = demoQuoteItems.filter((i) => i.quoteId === quote.id)
    return {
      quote: {
        ...quote,
        customer,
        items,
      },
      issuer: {
        businessName: demoBusinessSettings.businessName,
        ownerName: demoBusinessSettings.ownerName,
        businessRegistrationNumber: demoBusinessSettings.businessRegistrationNumber,
        email: demoBusinessSettings.email,
        phone: demoBusinessSettings.phone,
        paymentTerms: demoBusinessSettings.paymentTerms,
        bankAccount: demoBusinessSettings.bankAccount,
        sealImageUrl: demoBusinessSettings.sealImageUrl,
        sealEnabled: demoBusinessSettings.sealEnabled,
      },
    }
  }

  const [{ data: quoteRowRaw, error: quoteError }, { data: settingsRow, error: settingsError }] =
    await Promise.all([
      context.supabase.from("quotes").select("*").eq("id", quoteId).maybeSingle(),
      context.supabase.from("business_settings").select("*").eq("user_id", context.userId).maybeSingle(),
    ])

  if (quoteError || settingsError) {
    throw quoteError ?? settingsError
  }

  const quoteRow = quoteRowRaw as QuoteRow | null
  if (!quoteRow) {
    return null
  }

  const { data: itemRows, error: itemError } = await context.supabase
    .from("quote_items")
    .select("*")
    .eq("quote_id", quoteId)
    .order("sort_order", { ascending: true })

  if (itemError) {
    throw itemError
  }

  const { data: customerRow, error: customerError } = await context.supabase
    .from("customers")
    .select("*")
    .eq("id", quoteRow.customer_id)
    .maybeSingle()

  if (customerError) {
    throw customerError
  }

  const mapped = mapQuote(quoteRow)
  const items = ((itemRows ?? []) as QuoteItemRow[]).map(mapQuoteItem)
  const settings = settingsRow
    ? mapBusinessSettings(settingsRow as BusinessSettingsRow)
    : null

  return {
    quote: {
      ...mapped,
      customer: customerRow ? mapCustomer(customerRow as CustomerRow) : undefined,
      items,
    },
    issuer: {
      businessName: settings?.businessName ?? "",
      ownerName: settings?.ownerName ?? "",
      businessRegistrationNumber: settings?.businessRegistrationNumber ?? "",
      email: settings?.email ?? "",
      phone: settings?.phone ?? "",
      paymentTerms: settings?.paymentTerms ?? "",
      bankAccount: settings?.bankAccount ?? "",
      sealImageUrl: settings?.sealImageUrl,
      sealEnabled: settings?.sealEnabled ?? false,
    },
  }
}

/** 견적 소유자 기준 공유 토큰 보장 (없으면 발급) */
export async function ensureQuoteShareTokenForQuote(quoteId: string): Promise<{ token: string }> {
  const context = await getDataContext()

  if (context.mode === "demo") {
    const quote = demoQuotes.find((q) => q.id === quoteId)
    if (!quote?.publicShareToken) {
      throw new Error("데모 견적에 공유 토큰이 없습니다.")
    }
    return { token: quote.publicShareToken }
  }

  const { data: row, error } = await context.supabase
    .from("quotes")
    .select("public_share_token, user_id")
    .eq("id", quoteId)
    .maybeSingle()

  if (error) {
    throw error
  }

  const quoteRow = row as { public_share_token: string | null; user_id: string } | null
  if (!quoteRow || quoteRow.user_id !== context.userId) {
    throw new Error("QUOTE_NOT_FOUND")
  }

  if (quoteRow.public_share_token) {
    return { token: quoteRow.public_share_token }
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const token = randomBytes(18).toString("base64url")
    const { data: updatedRows, error: upError } = await context.supabase
      .from("quotes")
      .update({ public_share_token: token })
      .eq("id", quoteId)
      .eq("user_id", context.userId)
      .select("id")

    if (upError) {
      if ((upError as { code?: string }).code === "23505") {
        continue
      }
      throw upError
    }

    if (Array.isArray(updatedRows) && updatedRows.length > 0) {
      await createActivityLog({
        action: "quote.share_token_issued",
        description: "고객용 견적 공유 링크가 발급되었습니다.",
        quoteId,
      })
      return { token }
    }
  }

  throw new Error(
    "공유 링크를 DB에 저장하지 못했습니다. Supabase 마이그레이션(quotes.public_share_token)·RLS·견적 소유자 여부를 확인해 주세요."
  )
}

export async function updateBusinessSealSettingsRecord(input: {
  sealImageUrl: string | null
  sealEnabled: boolean
}) {
  const context = await getDataContext()

  if (context.mode === "demo") {
    const session = await getAppSession()
    if (session?.mode === "supabase") {
      throw new Error(
        "Supabase에 연결할 수 없습니다. NEXT_PUBLIC_SUPABASE_URL·KEY를 확인하거나 잠시 후 다시 시도해 주세요."
      )
    }
    return { mode: "demo" as const }
  }

  const { error } = await context.supabase
    .from("business_settings")
    .update({
      seal_image_url: input.sealImageUrl,
      seal_enabled: input.sealEnabled,
    })
    .eq("user_id", context.userId)

  if (error) {
    throw error
  }

  await createActivityLog({
    action: "settings.seal_updated",
    description: input.sealImageUrl
      ? "견적서에 사용할 직인을 저장했습니다."
      : "견적서 직인 이미지를 삭제했습니다.",
    metadata: {
      seal_enabled: input.sealEnabled,
    },
  })

  return { mode: "supabase" as const }
}

/** 이메일 발송 모달용 */
export async function getQuoteOutboundSnapshot(quoteId: string): Promise<{
  status: Quote["status"]
  quoteNumber: string
  title: string
  customerId: string
  customerEmail: string
} | null> {
  const context = await getDataContext()

  if (context.mode === "demo") {
    const quote = demoQuotes.find((q) => q.id === quoteId)
    if (!quote) {
      return null
    }
    const customer = demoCustomers.find((c) => c.id === quote.customerId)
    return {
      status: quote.status,
      quoteNumber: quote.quoteNumber,
      title: quote.title,
      customerId: quote.customerId,
      customerEmail: customer?.email?.trim() ?? "",
    }
  }

  const { data: quoteRow, error: qErr } = await context.supabase
    .from("quotes")
    .select("id, user_id, status, quote_number, title, customer_id")
    .eq("id", quoteId)
    .maybeSingle()

  if (qErr) {
    throw qErr
  }

  const q = quoteRow as
    | {
        id: string
        user_id: string
        status: Quote["status"]
        quote_number: string
        title: string
        customer_id: string
      }
    | null

  if (!q || q.user_id !== context.userId) {
    return null
  }

  const { data: custRow, error: cErr } = await context.supabase
    .from("customers")
    .select("email")
    .eq("id", q.customer_id)
    .maybeSingle()

  if (cErr) {
    throw cErr
  }

  const email = (custRow as { email: string | null } | null)?.email?.trim() ?? ""

  return {
    status: q.status,
    quoteNumber: q.quote_number,
    title: q.title,
    customerId: q.customer_id,
    customerEmail: email,
  }
}

/** 견적 메일 Reply-To 등에 사용 */
export async function getBusinessContactEmail(): Promise<string> {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return demoBusinessSettings.email?.trim() ?? ""
  }

  const { data, error } = await context.supabase
    .from("business_settings")
    .select("email")
    .eq("user_id", context.userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return ((data as { email: string | null } | null)?.email ?? "").trim()
}

/** 견적 메일 From/Reply 표시용 (설정 사업자·이메일) */
export async function getBusinessFromIdentity(): Promise<{
  email: string
  displayName: string
}> {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return {
      email: demoBusinessSettings.email?.trim() ?? "",
      displayName: demoBusinessSettings.ownerName || demoBusinessSettings.businessName || "Bill-IO",
    }
  }

  const { data, error } = await context.supabase
    .from("business_settings")
    .select("email, business_name, owner_name")
    .eq("user_id", context.userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  const row = data as
    | { email: string | null; business_name: string; owner_name: string }
    | null

  const email = (row?.email ?? "").trim()
  const displayName =
    (row?.owner_name ?? "").trim() ||
    (row?.business_name ?? "").trim() ||
    "Bill-IO"

  return { email, displayName }
}

export async function createInvoiceRecord(input: InvoiceFormInput) {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return { mode: "demo" as const }
  }

  const invoiceNumber = await generateInvoiceNumber(context)
  const requestedAt = input.requestedAt ?? new Date().toISOString()
  const paidAt =
    input.paymentStatus === "paid" || input.paymentStatus === "deposit_paid"
      ? input.paidAt ?? new Date().toISOString()
      : input.paidAt ?? null

  const { data, error } = await context.supabase
    .from("invoices")
    .insert({
      user_id: context.userId,
      customer_id: input.customerId,
      quote_id: input.quoteId ?? null,
      invoice_number: invoiceNumber,
      invoice_type: input.invoiceType,
      amount: input.amount,
      payment_status: input.paymentStatus,
      due_date: input.dueDate ?? null,
      requested_at: requestedAt,
      paid_at: paidAt,
      notes: input.notes,
    })
    .select("*")
    .single()

  if (error) {
    throw error
  }

  const invoice = data as InvoiceRow

  await createActivityLog({
    action: "invoice.created",
    description: `${invoice.invoice_number} 청구가 생성되었습니다.`,
    customerId: invoice.customer_id,
    quoteId: invoice.quote_id ?? undefined,
    invoiceId: invoice.id,
    metadata: {
      paymentStatus: invoice.payment_status,
      amount: invoice.amount,
    },
  })

  return {
    mode: "supabase" as const,
    invoice: mapInvoice(invoice),
  }
}

export async function updateInvoiceRecord(invoiceId: string, input: InvoiceFormInput) {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return { mode: "demo" as const }
  }

  const { data: prevData } = await context.supabase
    .from("invoices")
    .select("payment_status")
    .eq("id", invoiceId)
    .maybeSingle()
  const prevPaymentStatus = (prevData as { payment_status: Invoice["paymentStatus"] } | null)
    ?.payment_status

  const paidAt =
    input.paymentStatus === "paid" || input.paymentStatus === "deposit_paid"
      ? input.paidAt ?? new Date().toISOString()
      : input.paymentStatus === "partially_paid"
        ? input.paidAt ?? null
        : null

  const { data, error } = await context.supabase
    .from("invoices")
    .update({
      customer_id: input.customerId,
      quote_id: input.quoteId ?? null,
      invoice_type: input.invoiceType,
      amount: input.amount,
      payment_status: input.paymentStatus,
      due_date: input.dueDate ?? null,
      requested_at: input.requestedAt ?? new Date().toISOString(),
      paid_at: paidAt,
      notes: input.notes,
    })
    .eq("id", invoiceId)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  const invoice = data as InvoiceRow

  if (prevPaymentStatus !== undefined && prevPaymentStatus !== input.paymentStatus) {
    await createActivityLog({
      action: "invoice.payment_status_changed",
      description: `${invoice.invoice_number} 결제 상태가 변경되었습니다.`,
      customerId: invoice.customer_id,
      quoteId: invoice.quote_id ?? undefined,
      invoiceId,
      metadata: {
        from: prevPaymentStatus,
        to: input.paymentStatus,
      },
    })
  }

  await createActivityLog({
    action: "invoice.updated",
    description: `${invoice.invoice_number} 청구가 수정되었습니다.`,
    customerId: invoice.customer_id,
    quoteId: invoice.quote_id ?? undefined,
    invoiceId,
    metadata: {
      paymentStatus: invoice.payment_status,
      amount: invoice.amount,
    },
  })

  return {
    mode: "supabase" as const,
    invoice: mapInvoice(invoice),
  }
}

export async function updateInvoicePaymentStatusRecord(
  invoiceId: string,
  status: Invoice["paymentStatus"]
) {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return { mode: "demo" as const }
  }

  const paidAt =
    status === "paid" || status === "deposit_paid" ? new Date().toISOString() : null

  const { data, error } = await context.supabase
    .from("invoices")
    .update({
      payment_status: status,
      paid_at: paidAt,
    })
    .eq("id", invoiceId)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  const invoice = data as InvoiceRow

  await createActivityLog({
    action: "invoice.status_changed",
    description: `${invoice.invoice_number} 결제 상태가 변경되었습니다.`,
    customerId: invoice.customer_id,
    quoteId: invoice.quote_id ?? undefined,
    invoiceId,
    metadata: {
      paymentStatus: status,
    },
  })

  return {
    mode: "supabase" as const,
    invoice: mapInvoice(invoice),
  }
}

export async function createReminderRecord(input: ReminderFormInput) {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return { mode: "demo" as const }
  }

  const { data: invoiceData, error: invoiceError } = await context.supabase
    .from("invoices")
    .select("*")
    .eq("id", input.invoiceId)
    .maybeSingle()

  if (invoiceError) {
    throw invoiceError
  }

  const invoice = invoiceData as InvoiceRow | null

  const { data, error } = await context.supabase
    .from("reminders")
    .insert({
      user_id: context.userId,
      invoice_id: input.invoiceId,
      channel: input.channel,
      message: input.message,
      sent_at: new Date().toISOString(),
    })
    .select("*")
    .single()

  if (error) {
    throw error
  }

  await createActivityLog({
    action: "reminder.created",
    description: `${invoice?.invoice_number ?? "청구"}에 리마인드가 기록되었습니다.`,
    customerId: invoice?.customer_id ?? undefined,
    quoteId: invoice?.quote_id ?? undefined,
    invoiceId: input.invoiceId,
    metadata: {
      channel: input.channel,
    },
  })

  return {
    mode: "supabase" as const,
    reminder: mapReminder(data as ReminderRow),
  }
}

export async function saveBusinessSettingsRecord(input: {
  businessName: string
  ownerName: string
  businessRegistrationNumber: string
  email: string
  phone: string
  paymentTerms: string
  bankAccount: string
  reminderMessage: string
}) {
  const context = await getDataContext()

  if (context.mode === "demo") {
    const session = await getAppSession()
    if (session?.mode === "supabase") {
      throw new Error(
        "Supabase에 연결할 수 없습니다. NEXT_PUBLIC_SUPABASE_URL·KEY를 확인하거나 잠시 후 다시 시도해 주세요."
      )
    }
    return { mode: "demo" as const }
  }

  const { data, error } = await context.supabase
    .from("business_settings")
    .upsert(
      {
        user_id: context.userId,
        business_name: input.businessName,
        owner_name: input.ownerName,
        business_registration_number: input.businessRegistrationNumber.trim() || null,
        email: input.email,
        phone: input.phone,
        payment_terms: input.paymentTerms,
        bank_account: input.bankAccount,
        reminder_message: input.reminderMessage,
      },
      {
        onConflict: "user_id",
      }
    )
    .select("*")
    .single()

  if (error) {
    throw error
  }

  await createActivityLog({
    action: "settings.saved",
    description: "사업장·청구 기본 설정이 저장되었습니다.",
    metadata: {
      businessName: input.businessName,
    },
  })

  return {
    mode: "supabase" as const,
    settings: mapBusinessSettings(data as BusinessSettingsRow),
  }
}

export async function saveTemplatesRecord(
  templates: Array<{
    id?: string
    type: "quote" | "reminder"
    name: string
    content: string
    isDefault: boolean
  }>
) {
  const context = await getDataContext()

  if (context.mode === "demo") {
    const session = await getAppSession()
    if (session?.mode === "supabase") {
      throw new Error(
        "Supabase에 연결할 수 없습니다. NEXT_PUBLIC_SUPABASE_URL·KEY를 확인하거나 잠시 후 다시 시도해 주세요."
      )
    }
    return { mode: "demo" as const }
  }

  const savedTemplates: Template[] = []

  for (const template of templates) {
    if (template.id) {
      const { data, error } = await context.supabase
        .from("templates")
        .update({
          name: template.name,
          content: template.content,
          is_default: template.isDefault,
        })
        .eq("id", template.id)
        .select("*")
        .single()

      if (error) {
        throw error
      }

      savedTemplates.push(mapTemplate(data as TemplateRow))
      continue
    }

    const { data, error } = await context.supabase
      .from("templates")
      .insert({
        user_id: context.userId,
        type: template.type,
        name: template.name,
        content: template.content,
        is_default: template.isDefault,
      })
      .select("*")
      .single()

    if (error) {
      throw error
    }

    savedTemplates.push(mapTemplate(data as TemplateRow))
  }

  return {
    mode: "supabase" as const,
    templates: savedTemplates,
  }
}

export async function getInquiriesPageData(): Promise<{
  inquiries: InquiryWithCustomer[]
  customers: Customer[]
  stageSummary: Record<"new" | "qualified" | "quoted", number>
}> {
  const context = await getDataContext()

  if (context.mode === "demo") {
    // 샘플 문의/고객을 넣으면 초기 온보딩 UI가 절대 보이지 않아, 데모는 빈 워크스페이스로 둡니다.
    return {
      inquiries: [],
      customers: [],
      stageSummary: { new: 0, qualified: 0, quoted: 0 },
    }
  }

  const [{ data: customerRows, error: customerError }, { data: inquiryRows, error: inquiryError }] =
    await Promise.all([
      context.supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false }),
      context.supabase
        .from("inquiries")
        .select("*")
        .order("created_at", { ascending: false }),
    ])

  if (customerError) {
    throw customerError
  }

  if (inquiryError) {
    throw inquiryError
  }

  const customerRowsSafe = (customerRows ?? []) as CustomerRow[]
  const inquiryRowsSafe = (inquiryRows ?? []) as InquiryRow[]
  const customers = customerRowsSafe.map(mapCustomer)
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]))
  const inquiries = inquiryRowsSafe.map((row) => {
    const inquiry = mapInquiry(row)
    return {
      ...inquiry,
      customer: customerMap.get(inquiry.customerId),
    }
  })

  return {
    inquiries,
    customers,
    stageSummary: {
      new: inquiries.filter((item) => item.stage === "new").length,
      qualified: inquiries.filter((item) => item.stage === "qualified").length,
      quoted: inquiries.filter((item) => item.stage === "quoted").length,
    },
  }
}

export async function getCustomersPageData(): Promise<{
  customers: CustomerSummary[]
}> {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return {
      customers: [],
    }
  }

  const [
    { data: customerRows, error: customerError },
    { data: inquiryRows, error: inquiryError },
    { data: quoteRows, error: quoteError },
    { data: invoiceRows, error: invoiceError },
    { data: activityRows, error: activityError },
  ] = await Promise.all([
    context.supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false }),
    context.supabase
      .from("inquiries")
      .select("id, customer_id, created_at, title, stage")
      .order("created_at", { ascending: false }),
    context.supabase
      .from("quotes")
      .select("id, customer_id, status, updated_at, quote_number, title, total, created_at")
      .order("updated_at", { ascending: false }),
    context.supabase
      .from("invoices")
      .select("id, customer_id, payment_status, updated_at, invoice_number, amount")
      .order("updated_at", { ascending: false }),
    context.supabase
      .from("activity_logs")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(800),
  ])

  if (customerError) {
    throw customerError
  }

  if (inquiryError) {
    throw inquiryError
  }

  if (quoteError) {
    throw quoteError
  }

  if (invoiceError) {
    throw invoiceError
  }

  if (activityError) {
    throw activityError
  }

  const customerRowsSafe = (customerRows ?? []) as CustomerRow[]
  const inquiryRowsSafe = (inquiryRows ?? []) as Array<{
    id: string
    customer_id: string
    created_at: string
    title: string
    stage: string
  }>
  const quoteRowsSafe = (quoteRows ?? []) as Array<{
    id: string
    customer_id: string
    status: string
    updated_at: string
    quote_number: string
    title: string
    total: number
    created_at: string
  }>
  const invoiceRowsSafe = (invoiceRows ?? []) as Array<{
    id: string
    customer_id: string
    payment_status: string
    updated_at: string
    invoice_number: string
    amount: number
  }>

  const activityLogsSafe = ((activityRows ?? []) as ActivityLogRow[]).map(mapActivityLog)
  const activityByCustomer = bucketActivityByCustomerId(activityLogsSafe, 8)

  const recentCutoff = Date.now() - CUSTOMER_INQUIRY_RECENT_DAYS * 24 * 60 * 60 * 1000

  return {
    customers: customerRowsSafe.map((row) => {
      const customer = mapCustomer(row)
      const custInquiries = inquiryRowsSafe.filter((item) => item.customer_id === customer.id)
      const custQuotes = quoteRowsSafe.filter((item) => item.customer_id === customer.id)
      const custInvoices = invoiceRowsSafe.filter((item) => item.customer_id === customer.id)

      const hasRecentInquiry = custInquiries.some((item) => {
        const t = new Date(item.created_at).getTime()
        return Number.isFinite(t) && t >= recentCutoff
      })
      const hasActiveQuote = custQuotes.some(
        (item) => item.status === "draft" || item.status === "sent"
      )
      const hasOverdueInvoice = custInvoices.some((item) => item.payment_status === "overdue")
      const hasOpenReceivable = custInvoices.some((item) => item.payment_status !== "paid")

      const activityTimes: number[] = []
      const pushTime = (iso?: string | null) => {
        if (!iso) {
          return
        }
        const t = new Date(iso).getTime()
        if (Number.isFinite(t)) {
          activityTimes.push(t)
        }
      }
      pushTime(customer.createdAt)
      pushTime(customer.updatedAt)
      for (const inv of custInquiries) {
        pushTime(inv.created_at)
      }
      for (const q of custQuotes) {
        pushTime(q.updated_at)
      }
      for (const inv of custInvoices) {
        pushTime(inv.updated_at)
      }
      const lastActivityAt =
        activityTimes.length > 0
          ? new Date(Math.max(...activityTimes)).toISOString()
          : customer.updatedAt ?? customer.createdAt

      const inqSorted = [...custInquiries].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      const latestInq = inqSorted[0]
      const quoteSorted = [...custQuotes].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
      const latestQuote = quoteSorted[0]
      const invSorted = [...custInvoices].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
      const latestInv = invSorted[0]

      const recentSnapshot = {
        inquiry: latestInq
          ? {
              id: latestInq.id,
              title: latestInq.title,
              createdAt: latestInq.created_at,
              stage: latestInq.stage as InquiryStage,
            }
          : undefined,
        quote: latestQuote
          ? {
              id: latestQuote.id,
              quoteNumber: latestQuote.quote_number,
              title: latestQuote.title,
              total: Number(latestQuote.total),
              status: latestQuote.status as QuoteStatus,
              updatedAt: latestQuote.updated_at,
            }
          : undefined,
        invoice: latestInv
          ? {
              id: latestInv.id,
              invoiceNumber: latestInv.invoice_number,
              amount: Number(latestInv.amount),
              paymentStatus: latestInv.payment_status as PaymentStatus,
              updatedAt: latestInv.updated_at,
            }
          : undefined,
      }
      const hasRecentSnapshot =
        Boolean(recentSnapshot.inquiry) ||
        Boolean(recentSnapshot.quote) ||
        Boolean(recentSnapshot.invoice)

      return {
        ...customer,
        inquiryCount: custInquiries.length,
        quoteCount: custQuotes.length,
        invoiceCount: custInvoices.length,
        lastActivityAt,
        hasRecentInquiry,
        hasActiveQuote,
        hasOpenReceivable,
        hasOverdueInvoice,
        recentSnapshot: hasRecentSnapshot ? recentSnapshot : undefined,
        recentActivity: activityByCustomer[customer.id] ?? [],
      }
    }),
  }
}

export async function getCustomerDetailData(customerId: string): Promise<{
  customer: Customer | null
  inquiries: Inquiry[]
  quotes: Quote[]
  invoices: Invoice[]
  timeline: TimelineEvent[]
}> {
  const context = await getDataContext()

  if (context.mode === "demo") {
    const customer = demoCustomers.find((item) => item.id === customerId) ?? null

    return {
      customer,
      inquiries: demoInquiries.filter((item) => item.customerId === customerId),
      quotes: demoQuotes.filter((item) => item.customerId === customerId),
      invoices: demoInvoices.filter((item) => item.customerId === customerId),
      timeline: getCustomerTimeline(customerId),
    }
  }

  const [
    { data: customerRow, error: customerError },
    { data: inquiryRows, error: inquiryError },
    { data: quoteRows, error: quoteError },
    { data: invoiceRows, error: invoiceError },
    { data: activityRows, error: activityError },
  ] = await Promise.all([
    context.supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .maybeSingle(),
    context.supabase
      .from("inquiries")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    context.supabase
      .from("quotes")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    context.supabase
      .from("invoices")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    context.supabase
      .from("activity_logs")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
  ])

  if (customerError) {
    throw customerError
  }

  if (inquiryError) {
    throw inquiryError
  }

  if (quoteError) {
    throw quoteError
  }

  if (invoiceError) {
    throw invoiceError
  }

  if (activityError) {
    throw activityError
  }

  return {
    customer: customerRow ? mapCustomer(customerRow as CustomerRow) : null,
    inquiries: ((inquiryRows ?? []) as InquiryRow[]).map(mapInquiry),
    quotes: ((quoteRows ?? []) as QuoteRow[]).map(mapQuote),
    invoices: ((invoiceRows ?? []) as InvoiceRow[]).map(mapInvoice),
    timeline: ((activityRows ?? []) as ActivityLogRow[])
      .map(mapActivityLog)
      .map(mapActivityToTimeline),
  }
}

export async function getQuotesPageData(): Promise<{
  quotes: QuoteWithItems[]
  customers: Customer[]
  inquiries: InquiryWithCustomer[]
  defaultQuoteSummary: string
  defaultPaymentTerms: string
  defaultBusinessName: string
  nextQuoteNumberPreview: string
  quoteActivityByQuoteId: Record<string, ActivityLog[]>
  invoicesByQuoteId: Record<string, QuoteLinkedInvoiceStub[]>
}> {
  const context = await getDataContext()

  if (context.mode === "demo") {
    const quotes = demoQuotes.map((quote) => ({
      ...quote,
      customer: demoCustomers.find((customer) => customer.id === quote.customerId),
      items: demoQuoteItems.filter((item) => item.quoteId === quote.id),
    }))
    const quoteActivityByQuoteId = bucketActivityByQuoteId(
      demoActivityLogs.filter((l) => Boolean(l.quoteId)),
      12
    )
    const invoicesByQuoteId: Record<string, QuoteLinkedInvoiceStub[]> = {}
    for (const inv of demoInvoices) {
      if (!inv.quoteId) {
        continue
      }
      const stub: QuoteLinkedInvoiceStub = {
        id: inv.id,
        quoteId: inv.quoteId,
        invoiceNumber: inv.invoiceNumber,
        amount: inv.amount,
        paymentStatus: inv.paymentStatus,
      }
      const arr = invoicesByQuoteId[inv.quoteId] ?? []
      arr.push(stub)
      invoicesByQuoteId[inv.quoteId] = arr
    }
    return {
      quotes,
      customers: demoCustomers,
      inquiries: demoInquiries.map((inquiry) => ({
        ...inquiry,
        customer: demoCustomers.find((customer) => customer.id === inquiry.customerId),
      })),
      defaultQuoteSummary: defaultQuoteSummaryFromTemplates(demoTemplates),
      defaultPaymentTerms: demoBusinessSettings.paymentTerms ?? "",
      defaultBusinessName: demoBusinessSettings.businessName ?? "",
      nextQuoteNumberPreview: computeNextQuoteNumberPreview(quotes),
      quoteActivityByQuoteId,
      invoicesByQuoteId,
    }
  }

  const [
    { data: customerRows, error: customerError },
    { data: quoteRows, error: quoteError },
    { data: itemRows, error: itemError },
    { data: inquiryRows, error: inquiryError },
    { data: templateRows, error: templateError },
    { data: invoiceLinkRows, error: invoiceLinkError },
    { data: quoteLogRows, error: quoteLogError },
    { data: bizRow, error: bizError },
  ] = await Promise.all([
    context.supabase.from("customers").select("*"),
    context.supabase
      .from("quotes")
      .select("*")
      .order("created_at", { ascending: false }),
    context.supabase
      .from("quote_items")
      .select("*")
      .order("sort_order", { ascending: true }),
    context.supabase
      .from("inquiries")
      .select("*")
      .order("created_at", { ascending: false }),
    context.supabase
      .from("templates")
      .select("*")
      .eq("user_id", context.userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true }),
    context.supabase
      .from("invoices")
      .select("id, quote_id, invoice_number, amount, payment_status"),
    context.supabase
      .from("activity_logs")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(600),
    context.supabase
      .from("business_settings")
      .select("payment_terms, business_name")
      .eq("user_id", context.userId)
      .maybeSingle(),
  ])

  if (customerError) {
    throw customerError
  }

  if (quoteError) {
    throw quoteError
  }

  if (itemError) {
    throw itemError
  }

  if (inquiryError) {
    throw inquiryError
  }

  if (templateError) {
    throw templateError
  }

  if (invoiceLinkError) {
    throw invoiceLinkError
  }

  if (quoteLogError) {
    throw quoteLogError
  }

  if (bizError) {
    throw bizError
  }

  const customerRowsSafe = (customerRows ?? []) as CustomerRow[]
  const quoteRowsSafe = (quoteRows ?? []) as QuoteRow[]
  const itemRowsSafe = (itemRows ?? []) as QuoteItemRow[]
  const inquiryRowsSafe = (inquiryRows ?? []) as InquiryRow[]
  const templateRowsSafe = (templateRows ?? []) as TemplateRow[]
  const customerMap = new Map(
    customerRowsSafe.map((row) => [row.id, mapCustomer(row)])
  )
  const itemsByQuote = new Map<string, QuoteItem[]>()

  for (const row of itemRowsSafe) {
    const item = mapQuoteItem(row)
    const current = itemsByQuote.get(item.quoteId) ?? []
    current.push(item)
    itemsByQuote.set(item.quoteId, current)
  }

  const mappedTemplates = templateRowsSafe.map(mapTemplate)

  const quotes = quoteRowsSafe.map((row) => {
    const quote = mapQuote(row)

    return {
      ...quote,
      customer: customerMap.get(quote.customerId),
      items: itemsByQuote.get(quote.id) ?? [],
    }
  })

  const quoteActivityByQuoteId = bucketActivityByQuoteId(
    ((quoteLogRows ?? []) as ActivityLogRow[])
      .map(mapActivityLog)
      .filter((log) => Boolean(log.quoteId)),
    12
  )

  const invoicesByQuoteId: Record<string, QuoteLinkedInvoiceStub[]> = {}
  for (const row of (invoiceLinkRows ?? []) as Array<{
    id: string
    quote_id: string | null
    invoice_number: string
    amount: number
    payment_status: string
  }>) {
    if (!row.quote_id) {
      continue
    }
    const stub: QuoteLinkedInvoiceStub = {
      id: row.id,
      quoteId: row.quote_id,
      invoiceNumber: row.invoice_number,
      amount: Number(row.amount),
      paymentStatus: row.payment_status as PaymentStatus,
    }
    const arr = invoicesByQuoteId[row.quote_id as string] ?? []
    arr.push(stub)
    invoicesByQuoteId[row.quote_id] = arr
  }

  const biz = bizRow as { payment_terms?: string | null; business_name?: string | null } | null
  const paymentTerms = biz?.payment_terms?.trim() ?? ""
  const defaultBusinessName = biz?.business_name?.trim() ?? ""

  return {
    quotes,
    customers: customerRowsSafe.map(mapCustomer),
    inquiries: inquiryRowsSafe.map((row) => {
      const inquiry = mapInquiry(row)
      return {
        ...inquiry,
        customer: customerMap.get(inquiry.customerId),
      }
    }),
    defaultQuoteSummary: defaultQuoteSummaryFromTemplates(mappedTemplates),
    defaultPaymentTerms: paymentTerms,
    defaultBusinessName,
    nextQuoteNumberPreview: computeNextQuoteNumberPreview(quotes),
    quoteActivityByQuoteId,
    invoicesByQuoteId,
  }
}

export async function getInvoicesPageData(): Promise<{
  invoices: InvoiceWithReminders[]
  customers: Customer[]
  quotes: Quote[]
  defaultReminderMessage: string
  invoiceActivityByInvoiceId: Record<string, ActivityLog[]>
  businessName: string
  bankAccount: string
  paymentTerms: string
}> {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return {
      invoices: demoInvoices.map((invoice) => ({
        ...invoice,
        customer: demoCustomers.find((customer) => customer.id === invoice.customerId),
        reminders: demoReminders.filter((reminder) => reminder.invoiceId === invoice.id),
      })),
      customers: demoCustomers,
      quotes: demoQuotes,
      defaultReminderMessage: defaultReminderMessageFromTemplates(demoTemplates),
      invoiceActivityByInvoiceId: bucketActivityByInvoiceId(
        demoActivityLogs.filter((l) => Boolean(l.invoiceId)),
        12
      ),
      businessName: demoBusinessSettings.businessName,
      bankAccount: demoBusinessSettings.bankAccount ?? "",
      paymentTerms: demoBusinessSettings.paymentTerms ?? "",
    }
  }

  const [
    { data: customerRows, error: customerError },
    { data: invoiceRows, error: invoiceError },
    { data: reminderRows, error: reminderError },
    { data: quoteRows, error: quoteError },
    { data: templateRows, error: templateError },
    { data: invoiceLogRows, error: invoiceLogError },
    { data: bizRow, error: bizErr },
  ] = await Promise.all([
    context.supabase.from("customers").select("*"),
    context.supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false }),
    context.supabase
      .from("reminders")
      .select("*")
      .order("sent_at", { ascending: false }),
    context.supabase
      .from("quotes")
      .select("*")
      .order("created_at", { ascending: false }),
    context.supabase
      .from("templates")
      .select("*")
      .eq("user_id", context.userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true }),
    context.supabase
      .from("activity_logs")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(600),
    context.supabase
      .from("business_settings")
      .select("business_name, bank_account, payment_terms")
      .eq("user_id", context.userId)
      .maybeSingle(),
  ])

  if (customerError) {
    throw customerError
  }

  if (invoiceError) {
    throw invoiceError
  }

  if (reminderError) {
    throw reminderError
  }

  if (quoteError) {
    throw quoteError
  }

  if (templateError) {
    throw templateError
  }

  if (invoiceLogError) {
    throw invoiceLogError
  }

  if (bizErr) {
    throw bizErr
  }

  const customerRowsSafe = (customerRows ?? []) as CustomerRow[]
  const invoiceRowsSafe = (invoiceRows ?? []) as InvoiceRow[]
  const reminderRowsSafe = (reminderRows ?? []) as ReminderRow[]
  const quoteRowsSafe = (quoteRows ?? []) as QuoteRow[]
  const templateRowsSafe = (templateRows ?? []) as TemplateRow[]
  const customerMap = new Map(
    customerRowsSafe.map((row) => [row.id, mapCustomer(row)])
  )
  const remindersByInvoice = new Map<string, ReturnType<typeof mapReminder>[]>()

  for (const row of reminderRowsSafe) {
    const reminder = mapReminder(row)
    const current = remindersByInvoice.get(reminder.invoiceId) ?? []
    current.push(reminder)
    remindersByInvoice.set(reminder.invoiceId, current)
  }

  const mappedTemplates = templateRowsSafe.map(mapTemplate)

  const invoiceActivityByInvoiceId = bucketActivityByInvoiceId(
    ((invoiceLogRows ?? []) as ActivityLogRow[])
      .map(mapActivityLog)
      .filter((log) => Boolean(log.invoiceId)),
    12
  )

  const biz = bizRow as {
    business_name?: string
    bank_account?: string | null
    payment_terms?: string | null
  } | null

  return {
    invoices: invoiceRowsSafe.map((row) => {
      const invoice = mapInvoice(row)

      return {
        ...invoice,
        customer: customerMap.get(invoice.customerId),
        reminders: remindersByInvoice.get(invoice.id) ?? [],
      }
    }),
    customers: customerRowsSafe.map(mapCustomer),
    quotes: quoteRowsSafe.map(mapQuote),
    defaultReminderMessage: defaultReminderMessageFromTemplates(mappedTemplates),
    invoiceActivityByInvoiceId,
    businessName: biz?.business_name?.trim() ?? "",
    bankAccount: biz?.bank_account?.trim() ?? "",
    paymentTerms: biz?.payment_terms?.trim() ?? "",
  }
}

export async function getSettingsPageData(): Promise<{
  settings: BusinessSettings
  templates: Template[]
  currentPlan: BillingPlan
  planColumnMissing: boolean
}> {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return {
      settings: demoBusinessSettings,
      templates: demoTemplates,
      currentPlan: demoUser.plan,
      planColumnMissing: false,
    }
  }

  const [{ data: settingsRow, error: settingsError }, { data: templateRows, error: templateError }] =
    await Promise.all([
      context.supabase
        .from("business_settings")
        .select("*")
        .eq("user_id", context.userId)
        .maybeSingle(),
      context.supabase
        .from("templates")
        .select("*")
        .eq("user_id", context.userId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true }),
    ])

  if (settingsError) {
    throw settingsError
  }

  if (templateError) {
    throw templateError
  }

  const { plan: currentPlan, columnMissing: planColumnMissing } = await fetchUserPlanRow(
    context.supabase as unknown as SupabaseClient<Database>,
    context.userId
  )

  const settings = settingsRow
    ? mapBusinessSettings(settingsRow as BusinessSettingsRow)
    : {
        id: "",
        userId: context.userId,
        businessName: "",
        ownerName: "",
        businessRegistrationNumber: "",
        email: "",
        phone: "",
        paymentTerms: "",
        bankAccount: "",
        reminderMessage: "",
        sealEnabled: false,
        sealImageUrl: undefined,
        updatedAt: undefined,
      }

  const templates = ((templateRows ?? []) as TemplateRow[]).map(mapTemplate)

  return {
    settings,
    templates,
    currentPlan,
    planColumnMissing,
  }
}

export async function getDashboardPageData(): Promise<{
  metrics: DashboardMetrics
  followUps: InquiryWithCustomer[]
  overdueInvoices: InvoiceWithReminders[]
  recentActivities: ActivityLog[]
  pipelineSummary: Record<"new" | "qualified" | "quoted" | "won", number>
  /** 고객·문의·견적이 모두 없을 때 베타 온보딩 배너 표시 */
  showBetaOnboarding: boolean
  /** 대시보드 조건부 CTA·빠른 시작용 건수 */
  counts: {
    customers: number
    inquiries: number
    quotes: number
    invoices: number
  }
}> {
  const context = await getDataContext()

  if (context.mode === "demo") {
    const baseMetrics = getDashboardMetrics()
    return {
      metrics: { ...baseMetrics, followUpsToday: 0 },
      followUps: [],
      overdueInvoices: demoInvoices
        .filter((invoice) => invoice.paymentStatus === "overdue")
        .map((invoice) => ({
          ...invoice,
          customer: demoCustomers.find((customer) => customer.id === invoice.customerId),
          reminders: demoReminders.filter((item) => item.invoiceId === invoice.id),
        })),
      recentActivities: demoActivityLogs,
      pipelineSummary: {
        new: 0,
        qualified: 0,
        quoted: 0,
        won: 0,
      },
      showBetaOnboarding:
        demoCustomers.length === 0 &&
        demoInquiries.length === 0 &&
        demoQuotes.length === 0,
      counts: {
        customers: 0,
        inquiries: 0,
        quotes: demoQuotes.length,
        invoices: demoInvoices.length,
      },
    }
  }

  const [
    { data: customerRows, error: customerError },
    { data: inquiryRows, error: inquiryError },
    { data: quoteRows, error: quoteError },
    { data: invoiceRows, error: invoiceError },
    { data: activityRows, error: activityError },
  ] = await Promise.all([
    context.supabase.from("customers").select("*"),
    context.supabase
      .from("inquiries")
      .select("*")
      .order("follow_up_at", { ascending: true }),
    context.supabase.from("quotes").select("*"),
    context.supabase.from("invoices").select("*"),
    context.supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  if (customerError) {
    throw customerError
  }

  if (inquiryError) {
    throw inquiryError
  }

  if (quoteError) {
    throw quoteError
  }

  if (invoiceError) {
    throw invoiceError
  }

  if (activityError) {
    throw activityError
  }

  const customerRowsSafe = (customerRows ?? []) as CustomerRow[]
  const inquiryRowsSafe = (inquiryRows ?? []) as InquiryRow[]
  const quoteRowsSafe = (quoteRows ?? []) as QuoteRow[]
  const invoiceRowsSafe = (invoiceRows ?? []) as InvoiceRow[]
  const activityRowsSafe = (activityRows ?? []) as ActivityLogRow[]
  const customers = customerRowsSafe.map(mapCustomer)
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]))
  const inquiries = inquiryRowsSafe.map(mapInquiry)
  const quotes = quoteRowsSafe.map(mapQuote)
  const invoices = invoiceRowsSafe.map(mapInvoice)
  const now = new Date()
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const todayKey = now.toISOString().slice(0, 10)

  return {
    metrics: {
      quoteCountThisMonth: quotes.filter((quote) =>
        quote.createdAt.startsWith(monthKey)
      ).length,
      outstandingAmount: invoices
        .filter(
          (invoice) =>
            invoice.paymentStatus !== "paid" &&
            invoice.paymentStatus !== "deposit_paid"
        )
        .reduce((sum, invoice) => sum + invoice.amount, 0),
      waitingPayments: invoices.filter((invoice) =>
        ["pending", "partially_paid", "overdue"].includes(invoice.paymentStatus)
      ).length,
      followUpsToday: inquiries.filter((inquiry) =>
        inquiry.followUpAt?.startsWith(todayKey)
      ).length,
    },
    followUps: inquiries
      .filter((inquiry) => inquiry.followUpAt)
      .filter((inquiry) => inquiry.followUpAt!.startsWith(todayKey))
      .map((inquiry) => ({
        ...inquiry,
        customer: customerMap.get(inquiry.customerId),
      })),
    overdueInvoices: invoices
      .filter((invoice) => invoice.paymentStatus === "overdue")
      .map((invoice) => ({
        ...invoice,
        customer: customerMap.get(invoice.customerId),
        reminders: [],
      })),
    recentActivities: activityRowsSafe.map(mapActivityLog),
    pipelineSummary: {
      new: inquiries.filter((item) => item.stage === "new").length,
      qualified: inquiries.filter((item) => item.stage === "qualified").length,
      quoted: inquiries.filter((item) => item.stage === "quoted").length,
      won: inquiries.filter((item) => item.stage === "won").length,
    },
    showBetaOnboarding:
      customers.length === 0 && inquiries.length === 0 && quotes.length === 0,
    counts: {
      customers: customers.length,
      inquiries: inquiries.length,
      quotes: quotes.length,
      invoices: invoices.length,
    },
  }
}
