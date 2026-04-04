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
  getCustomerTimeline,
  getDashboardMetrics,
} from "@/lib/demo-data"
import { getAppSession } from "@/lib/auth"
import {
  defaultQuoteSummaryFromTemplates,
  defaultReminderMessageFromTemplates,
} from "@/lib/template-defaults"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type {
  ActivityLog,
  BusinessSettings,
  Customer,
  CustomerSummary,
  DashboardMetrics,
  Inquiry,
  InquiryWithCustomer,
  Invoice,
  InvoiceFormInput,
  InvoiceWithReminders,
  Quote,
  QuoteFormInput,
  QuoteItem,
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
    email: row.email ?? "",
    phone: row.phone ?? "",
    paymentTerms: row.payment_terms ?? "",
    bankAccount: row.bank_account ?? "",
    reminderMessage: row.reminder_message ?? "",
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
    action: "invoice.reminder_sent",
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
  email: string
  phone: string
  paymentTerms: string
  bankAccount: string
  reminderMessage: string
}) {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return { mode: "demo" as const }
  }

  const { data, error } = await context.supabase
    .from("business_settings")
    .upsert(
      {
        user_id: context.userId,
        business_name: input.businessName,
        owner_name: input.ownerName,
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
    return {
      inquiries: demoInquiries.map((inquiry) => ({
        ...inquiry,
        customer: demoCustomers.find((customer) => customer.id === inquiry.customerId),
      })),
      customers: demoCustomers,
      stageSummary: {
        new: demoInquiries.filter((item) => item.stage === "new").length,
        qualified: demoInquiries.filter((item) => item.stage === "qualified").length,
        quoted: demoInquiries.filter((item) => item.stage === "quoted").length,
      },
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
      customers: demoCustomers.map((customer) => ({
        ...customer,
        inquiryCount: demoInquiries.filter((item) => item.customerId === customer.id).length,
        quoteCount: demoQuotes.filter((item) => item.customerId === customer.id).length,
        invoiceCount: demoInvoices.filter((item) => item.customerId === customer.id).length,
      })),
    }
  }

  const [
    { data: customerRows, error: customerError },
    { data: inquiryRows, error: inquiryError },
    { data: quoteRows, error: quoteError },
    { data: invoiceRows, error: invoiceError },
  ] = await Promise.all([
    context.supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false }),
    context.supabase.from("inquiries").select("id, customer_id"),
    context.supabase.from("quotes").select("id, customer_id"),
    context.supabase.from("invoices").select("id, customer_id"),
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

  const customerRowsSafe = (customerRows ?? []) as CustomerRow[]
  const inquiryRowsSafe = (inquiryRows ?? []) as Array<{ id: string; customer_id: string }>
  const quoteRowsSafe = (quoteRows ?? []) as Array<{ id: string; customer_id: string }>
  const invoiceRowsSafe = (invoiceRows ?? []) as Array<{ id: string; customer_id: string }>

  return {
    customers: customerRowsSafe.map((row) => {
      const customer = mapCustomer(row)

      return {
        ...customer,
        inquiryCount: inquiryRowsSafe.filter(
          (item) => item.customer_id === customer.id
        ).length,
        quoteCount: quoteRowsSafe.filter((item) => item.customer_id === customer.id)
          .length,
        invoiceCount: invoiceRowsSafe.filter(
          (item) => item.customer_id === customer.id
        ).length,
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
}> {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return {
      quotes: demoQuotes.map((quote) => ({
        ...quote,
        customer: demoCustomers.find((customer) => customer.id === quote.customerId),
        items: demoQuoteItems.filter((item) => item.quoteId === quote.id),
      })),
      customers: demoCustomers,
      inquiries: demoInquiries.map((inquiry) => ({
        ...inquiry,
        customer: demoCustomers.find((customer) => customer.id === inquiry.customerId),
      })),
      defaultQuoteSummary: defaultQuoteSummaryFromTemplates(demoTemplates),
    }
  }

  const [
    { data: customerRows, error: customerError },
    { data: quoteRows, error: quoteError },
    { data: itemRows, error: itemError },
    { data: inquiryRows, error: inquiryError },
    { data: templateRows, error: templateError },
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

  return {
    quotes: quoteRowsSafe.map((row) => {
      const quote = mapQuote(row)

      return {
        ...quote,
        customer: customerMap.get(quote.customerId),
        items: itemsByQuote.get(quote.id) ?? [],
      }
    }),
    customers: customerRowsSafe.map(mapCustomer),
    inquiries: inquiryRowsSafe.map((row) => {
      const inquiry = mapInquiry(row)
      return {
        ...inquiry,
        customer: customerMap.get(inquiry.customerId),
      }
    }),
    defaultQuoteSummary: defaultQuoteSummaryFromTemplates(mappedTemplates),
  }
}

export async function getInvoicesPageData(): Promise<{
  invoices: InvoiceWithReminders[]
  customers: Customer[]
  quotes: Quote[]
  defaultReminderMessage: string
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
    }
  }

  const [
    { data: customerRows, error: customerError },
    { data: invoiceRows, error: invoiceError },
    { data: reminderRows, error: reminderError },
    { data: quoteRows, error: quoteError },
    { data: templateRows, error: templateError },
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
  }
}

export async function getSettingsPageData(): Promise<{
  settings: BusinessSettings
  templates: Template[]
}> {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return {
      settings: demoBusinessSettings,
      templates: demoTemplates,
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

  const settings = settingsRow
    ? mapBusinessSettings(settingsRow as BusinessSettingsRow)
    : {
        id: "",
        userId: context.userId,
        businessName: "",
        ownerName: "",
        email: "",
        phone: "",
        paymentTerms: "",
        bankAccount: "",
        reminderMessage: "",
      }

  const templates = ((templateRows ?? []) as TemplateRow[]).map(mapTemplate)

  return {
    settings,
    templates,
  }
}

export async function getDashboardPageData(): Promise<{
  metrics: DashboardMetrics
  followUps: InquiryWithCustomer[]
  overdueInvoices: InvoiceWithReminders[]
  recentActivities: ActivityLog[]
  pipelineSummary: Record<"new" | "qualified" | "quoted" | "won", number>
}> {
  const context = await getDataContext()

  if (context.mode === "demo") {
    const todayKey = new Date().toISOString().slice(0, 10)
    return {
      metrics: getDashboardMetrics(),
      followUps: demoInquiries
        .filter((item) => item.followUpAt?.startsWith(todayKey))
        .map((item) => ({
          ...item,
          customer: demoCustomers.find((customer) => customer.id === item.customerId),
        })),
      overdueInvoices: demoInvoices
        .filter((invoice) => invoice.paymentStatus === "overdue")
        .map((invoice) => ({
          ...invoice,
          customer: demoCustomers.find((customer) => customer.id === invoice.customerId),
          reminders: demoReminders.filter((item) => item.invoiceId === invoice.id),
        })),
      recentActivities: demoActivityLogs,
      pipelineSummary: {
        new: demoInquiries.filter((item) => item.stage === "new").length,
        qualified: demoInquiries.filter((item) => item.stage === "qualified").length,
        quoted: demoInquiries.filter((item) => item.stage === "quoted").length,
        won: demoInquiries.filter((item) => item.stage === "won").length,
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
  }
}
