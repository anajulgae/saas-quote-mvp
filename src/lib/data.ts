import {
  demoActivityLogs,
  demoCustomers,
  demoInquiries,
  demoInvoices,
  demoQuoteItems,
  demoQuotes,
  demoReminders,
  getCustomerTimeline,
  getDashboardMetrics,
} from "@/lib/demo-data"
import { getAppSession } from "@/lib/auth"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type {
  ActivityLog,
  Customer,
  CustomerSummary,
  DashboardMetrics,
  Inquiry,
  InquiryWithCustomer,
  Invoice,
  InvoiceWithReminders,
  Quote,
  QuoteItem,
  QuoteWithItems,
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
type QueryResult = {
  data: unknown
  error: Error | null
}
type QueryBuilderLike = PromiseLike<QueryResult> & {
  select: (...args: unknown[]) => QueryBuilderLike
  insert: (...args: unknown[]) => QueryBuilderLike
  update: (...args: unknown[]) => QueryBuilderLike
  eq: (...args: unknown[]) => QueryBuilderLike
  order: (...args: unknown[]) => QueryBuilderLike
  limit: (...args: unknown[]) => QueryBuilderLike
  maybeSingle: () => Promise<QueryResult>
  single: () => Promise<QueryResult>
}
type QueryableSupabase = {
  from: (table: string) => QueryBuilderLike
}

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
    label: timelineLabelByAction(log.action),
    description: log.description,
    createdAt: log.createdAt,
  }
}

function timelineLabelByAction(action: string) {
  if (action.startsWith("inquiry.")) {
    return "문의 활동"
  }

  if (action.startsWith("quote.")) {
    return "견적 활동"
  }

  if (action.startsWith("invoice.")) {
    return "청구 활동"
  }

  return "활동"
}

async function getDataContext() {
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

  if (context.mode === "demo" || !context.supabase) {
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

  if (context.mode === "demo" || !context.supabase) {
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

  if (context.mode === "demo" || !context.supabase) {
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

export async function getInquiriesPageData(): Promise<{
  inquiries: InquiryWithCustomer[]
  customers: Customer[]
  stageSummary: Record<"new" | "qualified" | "quoted", number>
}> {
  const context = await getDataContext()

  if (context.mode === "demo" || !context.supabase) {
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

  if (context.mode === "demo" || !context.supabase) {
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

  if (context.mode === "demo" || !context.supabase) {
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
}> {
  const context = await getDataContext()

  if (context.mode === "demo" || !context.supabase) {
    return {
      quotes: demoQuotes.map((quote) => ({
        ...quote,
        customer: demoCustomers.find((customer) => customer.id === quote.customerId),
        items: demoQuoteItems.filter((item) => item.quoteId === quote.id),
      })),
    }
  }

  const [
    { data: customerRows, error: customerError },
    { data: quoteRows, error: quoteError },
    { data: itemRows, error: itemError },
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

  const customerRowsSafe = (customerRows ?? []) as CustomerRow[]
  const quoteRowsSafe = (quoteRows ?? []) as QuoteRow[]
  const itemRowsSafe = (itemRows ?? []) as QuoteItemRow[]
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

  return {
    quotes: quoteRowsSafe.map((row) => {
      const quote = mapQuote(row)

      return {
        ...quote,
        customer: customerMap.get(quote.customerId),
        items: itemsByQuote.get(quote.id) ?? [],
      }
    }),
  }
}

export async function getInvoicesPageData(): Promise<{
  invoices: InvoiceWithReminders[]
}> {
  const context = await getDataContext()

  if (context.mode === "demo" || !context.supabase) {
    return {
      invoices: demoInvoices.map((invoice) => ({
        ...invoice,
        customer: demoCustomers.find((customer) => customer.id === invoice.customerId),
        reminders: demoReminders.filter((reminder) => reminder.invoiceId === invoice.id),
      })),
    }
  }

  const [
    { data: customerRows, error: customerError },
    { data: invoiceRows, error: invoiceError },
    { data: reminderRows, error: reminderError },
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

  const customerRowsSafe = (customerRows ?? []) as CustomerRow[]
  const invoiceRowsSafe = (invoiceRows ?? []) as InvoiceRow[]
  const reminderRowsSafe = (reminderRows ?? []) as ReminderRow[]
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

  return {
    invoices: invoiceRowsSafe.map((row) => {
      const invoice = mapInvoice(row)

      return {
        ...invoice,
        customer: customerMap.get(invoice.customerId),
        reminders: remindersByInvoice.get(invoice.id) ?? [],
      }
    }),
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

  if (context.mode === "demo" || !context.supabase) {
    return {
      metrics: getDashboardMetrics(),
      followUps: demoInquiries
        .filter((item) => item.followUpAt?.startsWith("2026-04-02"))
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
