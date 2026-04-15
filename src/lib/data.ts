import { randomBytes } from "node:crypto"
import { shortId } from "@/lib/short-id"

import {
  countTaxInvoiceDashboardSignals,
  fetchTaxInvoiceSummaryForCustomer,
  fetchTaxInvoicesByInvoiceIds,
} from "@/lib/server/tax-invoice-service"

import { resolveActivityHeadline, resolveActivityKind } from "@/lib/activity-presentation"
import {
  demoActivityLogs,
  demoBusinessPublicPage,
  demoBusinessSettings,
  demoCustomers,
  demoInquiries,
  demoInvoices,
  demoQuoteItems,
  demoQuotes,
  demoReminders,
  demoTemplates,
  demoUser,
  demoBillingSnapshot,
  getCustomerTimeline,
  getDashboardMetrics,
} from "@/lib/demo-data"
import { getAppSession } from "@/lib/auth"
import {
  defaultQuoteSummaryFromTemplates,
  defaultReminderMessageFromTemplates,
} from "@/lib/template-defaults"
import { formatBusinessRegNoInput } from "@/lib/format"
import { defaultNotificationPreferences } from "@/lib/notification-defaults"
import { planAllowsFeature } from "@/lib/plan-features"
import { postBillIoMessagingPayload } from "@/lib/server/messaging/user-endpoint"
import { getSiteOrigin } from "@/lib/site-url"

export { defaultNotificationPreferences }
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { loadPlanContext } from "@/lib/user-plan"
import type { BillingConsoleEventRow } from "@/lib/billing/console-types"
import { getUsageLimitsForEffectivePlan, type UserBillingSnapshot } from "@/lib/subscription"
import { getBillingRuntimeSnapshot } from "@/lib/server/billing-service"
import { parseInquiryAiAnalysisFromJson } from "@/lib/inquiry-ai-analysis-parse"
import type {
  ActivityLog,
  BillingPlan,
  BusinessSettings,
  Customer,
  CustomerSummary,
  CustomerTaxInvoiceSummary,
  DashboardMetrics,
  MessagingChannelConfig,
  Inquiry,
  InquiryAiAnalysis,
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
  NotificationPreferences,
  BusinessPublicPage,
  BusinessLandingTemplate,
  BusinessLandingServiceItem,
  BusinessLandingSocialLink,
  BusinessLandingFaqItem,
  ReminderFormInput,
  TaxInvoiceAspProviderConfig,
  Template,
  TimelineEvent,
} from "@/types/domain"
import type { Database, Json } from "@/types/supabase"

type CustomerRow = Database["public"]["Tables"]["customers"]["Row"]
type InquiryRow = Database["public"]["Tables"]["inquiries"]["Row"]
type QuoteRow = Database["public"]["Tables"]["quotes"]["Row"]
type QuoteItemRow = Database["public"]["Tables"]["quote_items"]["Row"]
type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"]
type ReminderRow = Database["public"]["Tables"]["reminders"]["Row"]
type ActivityLogRow = Database["public"]["Tables"]["activity_logs"]["Row"]
type BusinessSettingsRow = Database["public"]["Tables"]["business_settings"]["Row"]
type TemplateRow = Database["public"]["Tables"]["templates"]["Row"]
type NotificationPreferencesRow = Database["public"]["Tables"]["notification_preferences"]["Row"]
type BusinessPublicPageRow = Database["public"]["Tables"]["business_public_pages"]["Row"]
type MessagingChannelConfigRow = Database["public"]["Tables"]["messaging_channel_configs"]["Row"]
type MessagingSendLogInsert = Database["public"]["Tables"]["messaging_send_logs"]["Insert"]
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
    portalToken: row.portal_token ?? undefined,
    taxBusinessName: row.tax_business_name ?? undefined,
    taxBusinessRegistrationNumber: row.tax_business_registration_number
      ? formatBusinessRegNoInput(row.tax_business_registration_number)
      : undefined,
    taxCeoName: row.tax_ceo_name ?? undefined,
    taxInvoiceEmail: row.tax_invoice_email ?? undefined,
    taxContactName: row.tax_contact_name ?? undefined,
    taxAddress: row.tax_address ?? undefined,
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
    aiAnalysis: parseInquiryAiAnalysisFromJson(row.ai_analysis) ?? undefined,
    aiAnalysisUpdatedAt: row.ai_analysis_updated_at ?? undefined,
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
    shareOpenCount: row.share_open_count ?? undefined,
    shareLastOpenedAt: row.share_last_opened_at ?? undefined,
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

function parseCollectionTone(raw: string | null | undefined): Invoice["collectionTone"] {
  if (raw === "polite" || raw === "neutral" || raw === "firm") {
    return raw
  }
  return "neutral"
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
    publicShareToken: row.public_share_token ?? undefined,
    shareOpenCount: row.share_open_count ?? undefined,
    shareLastOpenedAt: row.share_last_opened_at ?? undefined,
    promisedPaymentDate: row.promised_payment_date ?? undefined,
    nextCollectionFollowupAt: row.next_collection_followup_at ?? undefined,
    collectionTone: parseCollectionTone(row.collection_tone),
    eTaxInvoiceTarget: Boolean(row.e_tax_invoice_target),
    eTaxInvoiceNeedIssue: Boolean(row.e_tax_invoice_need_issue),
    eTaxInvoiceSupplyDate: row.e_tax_invoice_supply_date ?? undefined,
    eTaxInvoiceIssueDueDate: row.e_tax_invoice_issue_due_date ?? undefined,
  }
}

function mapMessagingChannelConfig(row: MessagingChannelConfigRow): MessagingChannelConfig {
  const ex = row.extra_config
  return {
    id: row.id,
    userId: row.user_id,
    channelKind: row.channel_kind === "kakao_alimtalk" ? "kakao_alimtalk" : "kakao_alimtalk",
    providerType: row.provider_type === "custom_http" ? "custom_http" : "custom_http",
    apiEndpoint: row.api_endpoint ?? "",
    apiKey: row.api_key ?? "",
    apiKeyHeader: row.api_key_header?.trim() || "Authorization",
    senderKey: row.sender_key ?? "",
    templateCode: row.template_code ?? "",
    enabled: Boolean(row.enabled),
    extraConfig:
      ex && typeof ex === "object" && !Array.isArray(ex) ? (ex as Record<string, unknown>) : {},
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

function parseTaxInvoiceProviderConfig(raw: unknown): TaxInvoiceAspProviderConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {}
  }
  return raw as TaxInvoiceAspProviderConfig
}

function mapBusinessSettings(row: BusinessSettingsRow): BusinessSettings {
  return {
    id: row.id,
    userId: row.user_id,
    businessName: row.business_name,
    ownerName: row.owner_name,
    businessRegistrationNumber: formatBusinessRegNoInput(row.business_registration_number ?? ""),
    email: row.email ?? "",
    phone: row.phone ?? "",
    paymentTerms: row.payment_terms ?? "",
    bankAccount: row.bank_account ?? "",
    reminderMessage: row.reminder_message ?? "",
    sealImageUrl: row.seal_image_url ?? undefined,
    sealEnabled: Boolean(row.seal_enabled),
    updatedAt: row.updated_at,
    publicInquiryFormEnabled: Boolean(row.public_inquiry_form_enabled),
    publicInquiryFormToken: row.public_inquiry_form_token ?? null,
    publicInquiryIntro: row.public_inquiry_intro ?? "",
    publicInquiryConsentIntro: row.public_inquiry_consent_intro ?? "",
    publicInquiryConsentRetention: row.public_inquiry_consent_retention ?? "",
    publicInquiryCompletionMessage: row.public_inquiry_completion_message ?? "",
    taxInvoiceProvider: row.tax_invoice_provider ?? undefined,
    taxInvoiceProviderConfig: parseTaxInvoiceProviderConfig(row.tax_invoice_provider_config),
    taxInvoiceSupplierAddress: row.tax_invoice_supplier_address ?? undefined,
  }
}

function parseLandingServicesJson(raw: unknown): BusinessLandingServiceItem[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const out: BusinessLandingServiceItem[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue
    }
    const o = item as Record<string, unknown>
    const title = typeof o.title === "string" ? o.title.trim() : ""
    const description = typeof o.description === "string" ? o.description.trim() : ""
    if (title) {
      out.push({ title, description })
    }
  }
  return out.slice(0, 12)
}

function parseLandingSocialJson(raw: unknown): BusinessLandingSocialLink[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const out: BusinessLandingSocialLink[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue
    }
    const o = item as Record<string, unknown>
    const label = typeof o.label === "string" ? o.label.trim() : ""
    const url = typeof o.url === "string" ? o.url.trim() : ""
    if (label && url) {
      out.push({ label, url })
    }
  }
  return out.slice(0, 12)
}

function parseLandingFaqJson(raw: unknown): BusinessLandingFaqItem[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const out: BusinessLandingFaqItem[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue
    }
    const o = item as Record<string, unknown>
    const question = typeof o.question === "string" ? o.question.trim() : ""
    const answer = typeof o.answer === "string" ? o.answer.trim() : ""
    if (question && answer) {
      out.push({ question, answer })
    }
  }
  return out.slice(0, 8)
}

function parseLandingTrustJson(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim())
    .slice(0, 8)
}

function mapBusinessPublicPage(row: BusinessPublicPageRow): BusinessPublicPage {
  const tpl = row.template === "minimal" ? "minimal" : "default"
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug,
    isPublished: Boolean(row.is_published),
    template: tpl as BusinessLandingTemplate,
    businessName: row.business_name ?? "",
    headline: row.headline ?? "",
    introOneLine: row.intro_one_line ?? "",
    about: row.about ?? "",
    services: parseLandingServicesJson(row.services),
    contactPhone: row.contact_phone ?? "",
    contactEmail: row.contact_email ?? "",
    location: row.location ?? "",
    businessHours: row.business_hours ?? "",
    socialLinks: parseLandingSocialJson(row.social_links),
    heroImageUrl: row.hero_image_url ?? undefined,
    seoTitle: row.seo_title ?? "",
    seoDescription: row.seo_description ?? "",
    faq: parseLandingFaqJson(row.faq),
    trustPoints: parseLandingTrustJson(row.trust_points),
    ctaText: row.cta_text ?? "문의하기",
    inquiryCtaEnabled: Boolean(row.inquiry_cta_enabled),
    aiGeneratedAt: row.ai_generated_at ?? undefined,
    updatedAt: row.updated_at,
  }
}

export function emptyBusinessPublicPage(userId: string): BusinessPublicPage {
  return {
    id: "",
    userId,
    slug: "",
    isPublished: false,
    template: "default",
    businessName: "",
    headline: "",
    introOneLine: "",
    about: "",
    services: [],
    contactPhone: "",
    contactEmail: "",
    location: "",
    businessHours: "",
    socialLinks: [],
    heroImageUrl: undefined,
    seoTitle: "",
    seoDescription: "",
    faq: [],
    trustPoints: [],
    ctaText: "문의하기",
    inquiryCtaEnabled: true,
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

function mapNotificationPreferencesRow(row: NotificationPreferencesRow): NotificationPreferences {
  return {
    userId: row.user_id,
    inquiryInApp: row.inquiry_in_app,
    inquiryBrowser: row.inquiry_browser,
    inquiryEmail: row.inquiry_email,
    quoteEventsInApp: row.quote_events_in_app,
    quoteEventsBrowser: row.quote_events_browser,
    quoteEventsEmail: row.quote_events_email,
    invoiceEventsInApp: row.invoice_events_in_app,
    invoiceEventsBrowser: row.invoice_events_browser,
    invoiceEventsEmail: row.invoice_events_email,
    reminderEventsInApp: row.reminder_events_in_app,
    reminderEventsBrowser: row.reminder_events_browser,
    reminderEventsEmail: row.reminder_events_email,
  }
}

/** 견적·청구·리마인드 등 운영자 알림 행 삽입(중복 dedupe_key 는 무시) */
export async function insertBillNotificationForUser(input: {
  type: string
  title: string
  body: string
  linkPath: string
  relatedEntityType: string
  relatedEntityId: string
  dedupeKey: string
}) {
  const context = await getDataContext()
  if (context.mode === "demo") {
    return
  }

  const { error } = await context.supabase.from("notifications").insert({
    user_id: context.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    link_path: input.linkPath,
    related_entity_type: input.relatedEntityType,
    related_entity_id: input.relatedEntityId,
    dedupe_key: input.dedupeKey,
  })

  if (error) {
    const code = "code" in error ? String((error as { code?: string }).code) : ""
    if (code !== "23505") {
      throw error
    }
  }
}

export async function getNotificationPreferencesRecord(): Promise<NotificationPreferences> {
  const context = await getDataContext()
  if (context.mode === "demo") {
    return defaultNotificationPreferences(context.userId)
  }

  const { data, error } = await context.supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", context.userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return defaultNotificationPreferences(context.userId)
  }

  return mapNotificationPreferencesRow(data as NotificationPreferencesRow)
}

export async function saveNotificationPreferencesRecord(
  prefs: Omit<NotificationPreferences, "userId">
): Promise<NotificationPreferences> {
  const context = await getDataContext()
  if (context.mode === "demo") {
    throw new Error("데모 모드에서는 알림 설정을 저장할 수 없습니다.")
  }

  const row = {
    user_id: context.userId,
    inquiry_in_app: prefs.inquiryInApp,
    inquiry_browser: prefs.inquiryBrowser,
    inquiry_email: prefs.inquiryEmail,
    quote_events_in_app: prefs.quoteEventsInApp,
    quote_events_browser: prefs.quoteEventsBrowser,
    quote_events_email: prefs.quoteEventsEmail,
    invoice_events_in_app: prefs.invoiceEventsInApp,
    invoice_events_browser: prefs.invoiceEventsBrowser,
    invoice_events_email: prefs.invoiceEventsEmail,
    reminder_events_in_app: prefs.reminderEventsInApp,
    reminder_events_browser: prefs.reminderEventsBrowser,
    reminder_events_email: prefs.reminderEventsEmail,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await context.supabase
    .from("notification_preferences")
    .upsert(row, { onConflict: "user_id" })
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return mapNotificationPreferencesRow(data as NotificationPreferencesRow)
}

export async function markNotificationReadRecord(notificationId: string) {
  const context = await getDataContext()
  if (context.mode === "demo") {
    return
  }
  const { error } = await context.supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", context.userId)
  if (error) {
    throw error
  }
}

export async function markAllNotificationsReadRecord() {
  const context = await getDataContext()
  if (context.mode === "demo") {
    return
  }
  const { error } = await context.supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", context.userId)
    .eq("is_read", false)
  if (error) {
    throw error
  }
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

export async function updateInquiryAiAnalysisForOwner(
  inquiryId: string,
  analysis: InquiryAiAnalysis
): Promise<{ ok: boolean; error?: string }> {
  const context = await getDataContext()
  if (context.mode === "demo") {
    return { ok: false, error: "데모에서는 저장되지 않습니다." }
  }
  const now = new Date().toISOString()
  const { error } = await context.supabase
    .from("inquiries")
    .update({
      ai_analysis: analysis as unknown as Json,
      ai_analysis_updated_at: now,
    })
    .eq("id", inquiryId)
    .eq("user_id", context.userId)
  if (error) {
    return { ok: false, error: error.message }
  }
  return { ok: true }
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

  if (status === "sent" || status === "approved" || status === "rejected") {
    const label = status === "sent" ? "발송됨" : status === "approved" ? "승인됨" : "거절됨"
    await insertBillNotificationForUser({
      type: status === "sent" ? "quote_sent" : status === "approved" ? "quote_approved" : "quote_rejected",
      title: `견적이 ${label}`,
      body: `${quote.title} · ${quote.quote_number}`,
      linkPath: "/quotes",
      relatedEntityType: "quote",
      relatedEntityId: quoteId,
      dedupeKey: `quote_status:${quoteId}:${status}`,
    })
  }

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

export async function deleteInquiryRecord(inquiryId: string) {
  const context = await getDataContext()

  if (context.mode === "demo") {
    throw new Error("DEMO_MODE")
  }

  const { data: row, error: fetchErr } = await context.supabase
    .from("inquiries")
    .select("id, title, customer_id")
    .eq("id", inquiryId)
    .eq("user_id", context.userId)
    .maybeSingle()

  if (fetchErr) throw fetchErr
  if (!row) throw new Error("INQUIRY_NOT_FOUND")

  const inq = row as { id: string; title: string; customer_id: string }

  await createActivityLog({
    action: "inquiry.deleted",
    description: `「${inq.title}」 문의를 삭제했습니다.`,
    customerId: inq.customer_id,
    inquiryId,
  })

  const { error: delErr } = await context.supabase
    .from("inquiries")
    .delete()
    .eq("id", inquiryId)
    .eq("user_id", context.userId)

  if (delErr) throw delErr

  return { mode: "supabase" as const, customerId: inq.customer_id }
}

export async function deleteInvoiceRecord(invoiceId: string) {
  const context = await getDataContext()

  if (context.mode === "demo") {
    throw new Error("DEMO_MODE")
  }

  const { data: row, error: fetchErr } = await context.supabase
    .from("invoices")
    .select("id, invoice_number, customer_id")
    .eq("id", invoiceId)
    .eq("user_id", context.userId)
    .maybeSingle()

  if (fetchErr) throw fetchErr
  if (!row) throw new Error("INVOICE_NOT_FOUND")

  const inv = row as { id: string; invoice_number: string; customer_id: string }

  await createActivityLog({
    action: "invoice.deleted",
    description: `「${inv.invoice_number}」 청구를 삭제했습니다.`,
    customerId: inv.customer_id,
    invoiceId,
  })

  // 연결된 리마인더 삭제
  await context.supabase.from("reminders").delete().eq("invoice_id", invoiceId)

  const { error: delErr } = await context.supabase
    .from("invoices")
    .delete()
    .eq("id", invoiceId)
    .eq("user_id", context.userId)

  if (delErr) throw delErr

  return { mode: "supabase" as const, customerId: inv.customer_id }
}

export async function deleteCustomerRecord(customerId: string) {
  const context = await getDataContext()

  if (context.mode === "demo") {
    throw new Error("DEMO_MODE")
  }

  const { data: row, error: fetchErr } = await context.supabase
    .from("customers")
    .select("id, name, company_name")
    .eq("id", customerId)
    .eq("user_id", context.userId)
    .maybeSingle()

  if (fetchErr) throw fetchErr
  if (!row) throw new Error("CUSTOMER_NOT_FOUND")

  const cust = row as { id: string; name: string; company_name: string | null }
  const label = cust.company_name?.trim() || cust.name

  // 연결된 데이터 삭제 (리마인더 → 청구 → 견적항목 → 견적 → 문의 → 활동 → 고객)
  const { data: invoiceIds } = await context.supabase
    .from("invoices")
    .select("id")
    .eq("customer_id", customerId)
  for (const inv of (invoiceIds ?? []) as { id: string }[]) {
    await context.supabase.from("reminders").delete().eq("invoice_id", inv.id)
  }
  await context.supabase.from("invoices").delete().eq("customer_id", customerId)

  const { data: quoteIds } = await context.supabase
    .from("quotes")
    .select("id")
    .eq("customer_id", customerId)
  for (const q of (quoteIds ?? []) as { id: string }[]) {
    await context.supabase.from("quote_items").delete().eq("quote_id", q.id)
  }
  await context.supabase.from("quotes").delete().eq("customer_id", customerId)

  await context.supabase.from("inquiries").delete().eq("customer_id", customerId)
  await context.supabase.from("activity_logs").delete().eq("customer_id", customerId)

  await createActivityLog({
    action: "customer.deleted",
    description: `「${label}」 고객과 연결된 모든 데이터를 삭제했습니다.`,
  })

  const { error: delErr } = await context.supabase
    .from("customers")
    .delete()
    .eq("id", customerId)
    .eq("user_id", context.userId)

  if (delErr) throw delErr

  return { mode: "supabase" as const }
}

/* ────────── Auto-remind rules ────────── */

export type AutoRemindRule = {
  id: string
  name: string
  enabled: boolean
  triggerType: string
  triggerDays: number
  channel: string
  messageTemplate: string
  createdAt: string
  updatedAt: string
}

export async function getAutoRemindRules(): Promise<AutoRemindRule[]> {
  const context = await getDataContext()
  if (context.mode === "demo") return []
  const { data, error } = await context.supabase
    .from("auto_remind_rules")
    .select("*")
    .eq("user_id", context.userId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    name: (r.name as string) || "",
    enabled: r.enabled as boolean,
    triggerType: (r.trigger_type as string) || "overdue_days",
    triggerDays: (r.trigger_days as number) || 3,
    channel: (r.channel as string) || "email",
    messageTemplate: (r.message_template as string) || "",
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }))
}

export async function upsertAutoRemindRule(input: {
  id?: string
  name: string
  enabled: boolean
  triggerType: string
  triggerDays: number
  channel: string
  messageTemplate: string
}) {
  const context = await getDataContext()
  if (context.mode === "demo") throw new Error("DEMO_MODE")
  const row = {
    user_id: context.userId,
    name: input.name,
    enabled: input.enabled,
    trigger_type: input.triggerType,
    trigger_days: input.triggerDays,
    channel: input.channel,
    message_template: input.messageTemplate,
    updated_at: new Date().toISOString(),
  }
  if (input.id) {
    const { error } = await context.supabase
      .from("auto_remind_rules")
      .update(row)
      .eq("id", input.id)
      .eq("user_id", context.userId)
    if (error) throw error
  } else {
    const { error } = await context.supabase.from("auto_remind_rules").insert(row)
    if (error) throw error
  }
  return { ok: true }
}

export async function deleteAutoRemindRule(ruleId: string) {
  const context = await getDataContext()
  if (context.mode === "demo") throw new Error("DEMO_MODE")
  const { error } = await context.supabase
    .from("auto_remind_rules")
    .delete()
    .eq("id", ruleId)
    .eq("user_id", context.userId)
  if (error) throw error
  return { ok: true }
}

/* ────────── Recurring Series ────────── */

export type RecurringSeries = {
  id: string
  customerId: string
  customerLabel: string
  name: string
  enabled: boolean
  documentType: string
  frequency: string
  dayOfMonth: number
  amount: number
  title: string
  notes: string
  invoiceType: string
  nextRunDate: string
  lastRunAt: string | null
  totalRuns: number
  maxRuns: number | null
  createdAt: string
}

export async function getRecurringSeriesList(): Promise<RecurringSeries[]> {
  const context = await getDataContext()
  if (context.mode === "demo") return []
  const { data, error } = await context.supabase
    .from("recurring_series")
    .select("*, customers(name, company_name)")
    .eq("user_id", context.userId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
    const cust = r.customers as { name?: string; company_name?: string } | null
    return {
      id: r.id as string,
      customerId: r.customer_id as string,
      customerLabel: cust?.company_name || cust?.name || "",
      name: (r.name as string) || "",
      enabled: r.enabled as boolean,
      documentType: (r.document_type as string) || "invoice",
      frequency: (r.frequency as string) || "monthly",
      dayOfMonth: (r.day_of_month as number) || 1,
      amount: Number(r.amount) || 0,
      title: (r.title as string) || "",
      notes: (r.notes as string) || "",
      invoiceType: (r.invoice_type as string) || "final",
      nextRunDate: r.next_run_date as string,
      lastRunAt: (r.last_run_at as string) ?? null,
      totalRuns: (r.total_runs as number) || 0,
      maxRuns: r.max_runs != null ? (r.max_runs as number) : null,
      createdAt: r.created_at as string,
    }
  })
}

export async function upsertRecurringSeries(input: {
  id?: string
  customerId: string
  name: string
  enabled: boolean
  documentType: string
  frequency: string
  dayOfMonth: number
  amount: number
  title: string
  notes: string
  invoiceType: string
  nextRunDate: string
  maxRuns: number | null
}) {
  const context = await getDataContext()
  if (context.mode === "demo") throw new Error("DEMO_MODE")
  const row = {
    user_id: context.userId,
    customer_id: input.customerId,
    name: input.name,
    enabled: input.enabled,
    document_type: input.documentType,
    frequency: input.frequency,
    day_of_month: input.dayOfMonth,
    amount: input.amount,
    title: input.title,
    notes: input.notes,
    invoice_type: input.invoiceType,
    next_run_date: input.nextRunDate,
    max_runs: input.maxRuns,
    updated_at: new Date().toISOString(),
  }
  if (input.id) {
    const { error } = await context.supabase
      .from("recurring_series")
      .update(row)
      .eq("id", input.id)
      .eq("user_id", context.userId)
    if (error) throw error
  } else {
    const { error } = await context.supabase.from("recurring_series").insert(row)
    if (error) throw error
  }
  return { ok: true }
}

export async function deleteRecurringSeries(seriesId: string) {
  const context = await getDataContext()
  if (context.mode === "demo") throw new Error("DEMO_MODE")
  const { error } = await context.supabase
    .from("recurring_series")
    .delete()
    .eq("id", seriesId)
    .eq("user_id", context.userId)
  if (error) throw error
  return { ok: true }
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
  hideWatermark: boolean
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
      hideWatermark: true,
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

  const { effectivePlan: quotePrintPlan } = await loadPlanContext(
    context.supabase,
    context.userId
  )

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
    hideWatermark: planAllowsFeature(quotePrintPlan, "white_label_pdf"),
  }
}

export async function getInvoicePrintPageData(invoiceId: string): Promise<{
  invoice: Invoice
  customer?: Customer
  linkedQuote?: { quoteNumber: string; title: string }
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
  hideWatermark: boolean
} | null> {
  const context = await getDataContext()

  if (context.mode === "demo") {
    const invoice = demoInvoices.find((i) => i.id === invoiceId)
    if (!invoice) {
      return null
    }
    const customer = demoCustomers.find((c) => c.id === invoice.customerId)
    const quote = invoice.quoteId ? demoQuotes.find((q) => q.id === invoice.quoteId) : undefined
    return {
      invoice,
      customer,
      linkedQuote: quote ? { quoteNumber: quote.quoteNumber, title: quote.title } : undefined,
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
      hideWatermark: true,
    }
  }

  const [{ data: invRowRaw, error: invError }, { data: settingsRow, error: settingsError }] =
    await Promise.all([
      context.supabase.from("invoices").select("*").eq("id", invoiceId).maybeSingle(),
      context.supabase.from("business_settings").select("*").eq("user_id", context.userId).maybeSingle(),
    ])

  if (invError || settingsError) {
    throw invError ?? settingsError
  }

  const invRow = invRowRaw as InvoiceRow | null
  if (!invRow || invRow.user_id !== context.userId) {
    return null
  }

  const { data: customerRow, error: customerError } = await context.supabase
    .from("customers")
    .select("*")
    .eq("id", invRow.customer_id)
    .maybeSingle()

  if (customerError) {
    throw customerError
  }

  let linkedQuote: { quoteNumber: string; title: string } | undefined
  if (invRow.quote_id) {
    const { data: qRow, error: qErr } = await context.supabase
      .from("quotes")
      .select("quote_number, title")
      .eq("id", invRow.quote_id)
      .maybeSingle()
    if (qErr) {
      throw qErr
    }
    const q = qRow as { quote_number: string; title: string } | null
    if (q) {
      linkedQuote = { quoteNumber: q.quote_number, title: q.title }
    }
  }

  const settings = settingsRow
    ? mapBusinessSettings(settingsRow as BusinessSettingsRow)
    : null

  const { effectivePlan: invoicePrintPlan } = await loadPlanContext(
    context.supabase,
    context.userId
  )

  return {
    invoice: mapInvoice(invRow),
    customer: customerRow ? mapCustomer(customerRow as CustomerRow) : undefined,
    linkedQuote,
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
    hideWatermark: planAllowsFeature(invoicePrintPlan, "white_label_pdf"),
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
    const token = shortId(10)
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

/** 청구 소유자 기준 공개 링크 토큰 보장 (없으면 발급) */
export async function ensureInvoiceShareTokenForInvoice(invoiceId: string): Promise<{ token: string }> {
  const context = await getDataContext()

  if (context.mode === "demo") {
    const inv = demoInvoices.find((i) => i.id === invoiceId)
    if (!inv?.publicShareToken) {
      throw new Error("데모 청구에 공유 토큰이 없습니다.")
    }
    return { token: inv.publicShareToken }
  }

  const { data: row, error } = await context.supabase
    .from("invoices")
    .select("public_share_token, user_id, customer_id")
    .eq("id", invoiceId)
    .maybeSingle()

  if (error) {
    throw error
  }

  const invRow = row as {
    public_share_token: string | null
    user_id: string
    customer_id: string
  } | null
  if (!invRow || invRow.user_id !== context.userId) {
    throw new Error("INVOICE_NOT_FOUND")
  }

  if (invRow.public_share_token) {
    return { token: invRow.public_share_token }
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const token = shortId(10)
    const { data: updatedRows, error: upError } = await context.supabase
      .from("invoices")
      .update({ public_share_token: token })
      .eq("id", invoiceId)
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
        action: "invoice.share_token_issued",
        description: "고객용 청구 공개 링크가 발급되었습니다.",
        customerId: invRow.customer_id,
        invoiceId,
      })
      return { token }
    }
  }

  throw new Error(
    "공유 링크를 DB에 저장하지 못했습니다. Supabase 마이그레이션(invoices.public_share_token)·RLS·청구 소유자 여부를 확인해 주세요."
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
  customerPhone: string
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
      customerPhone: customer?.phone?.replace(/\D/g, "") ?? "",
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
    .select("email, phone")
    .eq("id", q.customer_id)
    .maybeSingle()

  if (cErr) {
    throw cErr
  }

  const c = custRow as { email: string | null; phone: string | null } | null
  const email = c?.email?.trim() ?? ""
  const phone = (c?.phone ?? "").replace(/\D/g, "")

  return {
    status: q.status,
    quoteNumber: q.quote_number,
    title: q.title,
    customerId: q.customer_id,
    customerEmail: email,
    customerPhone: phone,
  }
}

/** 청구 이메일·로그용 스냅샷 */
export async function getInvoiceOutboundSnapshot(invoiceId: string): Promise<{
  invoiceNumber: string
  customerId: string
  customerEmail: string
  customerPhone: string
  amount: number
  paymentStatus: PaymentStatus
} | null> {
  const context = await getDataContext()

  if (context.mode === "demo") {
    const inv = demoInvoices.find((i) => i.id === invoiceId)
    if (!inv) {
      return null
    }
    const customer = demoCustomers.find((c) => c.id === inv.customerId)
    return {
      invoiceNumber: inv.invoiceNumber,
      customerId: inv.customerId,
      customerEmail: customer?.email?.trim() ?? "",
      customerPhone: customer?.phone?.replace(/\D/g, "") ?? "",
      amount: inv.amount,
      paymentStatus: inv.paymentStatus,
    }
  }

  const { data: invRow, error: invErr } = await context.supabase
    .from("invoices")
    .select("id, user_id, invoice_number, customer_id, amount, payment_status")
    .eq("id", invoiceId)
    .maybeSingle()

  if (invErr) {
    throw invErr
  }

  const inv = invRow as
    | {
        id: string
        user_id: string
        invoice_number: string
        customer_id: string
        amount: number
        payment_status: PaymentStatus
      }
    | null

  if (!inv || inv.user_id !== context.userId) {
    return null
  }

  const { data: custRow, error: cErr } = await context.supabase
    .from("customers")
    .select("email, phone")
    .eq("id", inv.customer_id)
    .maybeSingle()

  if (cErr) {
    throw cErr
  }

  const c = custRow as { email: string | null; phone: string | null } | null
  const email = c?.email?.trim() ?? ""
  const phone = (c?.phone ?? "").replace(/\D/g, "")

  return {
    invoiceNumber: inv.invoice_number,
    customerId: inv.customer_id,
    customerEmail: email,
    customerPhone: phone,
    amount: inv.amount,
    paymentStatus: inv.payment_status,
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

  const collectionTone =
    input.collectionTone === "polite" || input.collectionTone === "firm"
      ? input.collectionTone
      : "neutral"

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
      promised_payment_date: input.promisedPaymentDate?.trim() || null,
      next_collection_followup_at: input.nextCollectionFollowupAt?.trim()
        ? new Date(input.nextCollectionFollowupAt).toISOString()
        : null,
      collection_tone: collectionTone,
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

  await insertBillNotificationForUser({
    type: "invoice_created",
    title: "새 청구가 등록되었습니다",
    body: `${invoice.invoice_number} · ${invoice.amount.toLocaleString("ko-KR")}원`,
    linkPath: "/invoices",
    relatedEntityType: "invoice",
    relatedEntityId: invoice.id,
    dedupeKey: `invoice_created:${invoice.id}`,
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

  const collectionTone =
    input.collectionTone === "polite" || input.collectionTone === "firm"
      ? input.collectionTone
      : "neutral"

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
      promised_payment_date: input.promisedPaymentDate?.trim() || null,
      next_collection_followup_at: input.nextCollectionFollowupAt?.trim()
        ? new Date(input.nextCollectionFollowupAt).toISOString()
        : null,
      collection_tone: collectionTone,
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

export async function updateInvoiceCollectionFieldsRecord(
  invoiceId: string,
  input: {
    promisedPaymentDate: string
    nextCollectionFollowupAt: string
    collectionTone: Invoice["collectionTone"]
  }
) {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return { mode: "demo" as const }
  }

  const { data: invMeta, error: metaErr } = await context.supabase
    .from("invoices")
    .select("id, user_id, invoice_number, customer_id, quote_id")
    .eq("id", invoiceId)
    .maybeSingle()

  if (metaErr) {
    throw metaErr
  }

  const meta = invMeta as
    | {
        id: string
        user_id: string
        invoice_number: string
        customer_id: string
        quote_id: string | null
      }
    | null

  if (!meta || meta.user_id !== context.userId) {
    throw new Error("청구를 찾을 수 없습니다.")
  }

  const tone =
    input.collectionTone === "polite" || input.collectionTone === "firm"
      ? input.collectionTone
      : "neutral"

  const { data, error } = await context.supabase
    .from("invoices")
    .update({
      promised_payment_date: input.promisedPaymentDate.trim() || null,
      next_collection_followup_at: input.nextCollectionFollowupAt.trim()
        ? new Date(input.nextCollectionFollowupAt).toISOString()
        : null,
      collection_tone: tone,
    })
    .eq("id", invoiceId)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  const invoice = data as InvoiceRow

  await createActivityLog({
    action: "invoice.collection_plan_updated",
    description: `${invoice.invoice_number} 입금 약속·다음 연락일·리마인드 톤을 저장했습니다.`,
    customerId: invoice.customer_id,
    quoteId: invoice.quote_id ?? undefined,
    invoiceId,
  })

  return {
    mode: "supabase" as const,
    invoice: mapInvoice(invoice),
  }
}

export async function getMessagingChannelConfigRecord(): Promise<MessagingChannelConfig | null> {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return null
  }

  const { data, error } = await context.supabase
    .from("messaging_channel_configs")
    .select("*")
    .eq("user_id", context.userId)
    .eq("channel_kind", "kakao_alimtalk")
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ? mapMessagingChannelConfig(data as MessagingChannelConfigRow) : null
}

export async function upsertMessagingChannelConfigRecord(input: {
  apiEndpoint: string
  apiKey: string
  apiKeyHeader: string
  senderKey: string
  templateCode: string
  enabled: boolean
}) {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return { mode: "demo" as const }
  }

  const { effectivePlan } = await loadPlanContext(
    context.supabase,
    context.userId
  )
  if (!planAllowsFeature(effectivePlan, "kakao_byoa_messaging")) {
    throw new Error("카카오 알림톡(BYOA) 연동은 Pro 이상 플랜에서만 저장할 수 있습니다.")
  }

  const { error } = await context.supabase.from("messaging_channel_configs").upsert(
    {
      user_id: context.userId,
      channel_kind: "kakao_alimtalk",
      provider_type: "custom_http",
      api_endpoint: input.apiEndpoint.trim(),
      api_key: input.apiKey.trim() ? input.apiKey.trim() : null,
      api_key_header: input.apiKeyHeader.trim() || "Authorization",
      sender_key: input.senderKey.trim(),
      template_code: input.templateCode.trim(),
      enabled: input.enabled,
      extra_config: {},
    },
    { onConflict: "user_id,channel_kind" }
  )

  if (error) {
    throw error
  }

  await createActivityLog({
    action: "messaging.channel_saved",
    description: "카카오 알림톡(BYOA) 연동 설정을 저장했습니다.",
  })

  return { mode: "supabase" as const }
}

export async function insertMessagingSendLogRecord(
  entry: Omit<MessagingSendLogInsert, "user_id" | "created_at">
) {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return
  }

  const { error } = await context.supabase.from("messaging_send_logs").insert({
    ...entry,
    user_id: context.userId,
  })

  if (error) {
    throw error
  }
}

export async function ensureCustomerPortalTokenRecord(
  customerId: string
): Promise<{ token: string } | { error: string }> {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return { token: `demo${customerId.replace(/-/g, "").slice(0, 24)}` }
  }

  const { effectivePlan } = await loadPlanContext(
    context.supabase,
    context.userId
  )

  if (!planAllowsFeature(effectivePlan, "customer_mini_portal")) {
    return { error: "현재 플랜에서 고객 미니 포털을 사용할 수 없습니다." }
  }

  const { data: cust, error: cErr } = await context.supabase
    .from("customers")
    .select("id, user_id, portal_token")
    .eq("id", customerId)
    .maybeSingle()

  if (cErr) {
    throw cErr
  }

  const row = cust as { id: string; user_id: string; portal_token: string | null } | null

  if (!row || row.user_id !== context.userId) {
    return { error: "고객을 찾을 수 없습니다." }
  }

  const existing = row.portal_token?.trim()
  if (existing) {
    return { token: existing }
  }

  const limits = getUsageLimitsForEffectivePlan(effectivePlan)
  const { data: portalRows, error: cntErr } = await context.supabase
    .from("customers")
    .select("portal_token")
    .eq("user_id", context.userId)

  if (cntErr) {
    throw cntErr
  }
  const portalList = (portalRows ?? []) as { portal_token?: string | null }[]
  const portalCount = portalList.filter((r) => Boolean(r.portal_token?.trim())).length
  if (portalCount >= limits.maxPortalCustomers) {
    return {
      error: `고객 포털은 현재 플랜에서 최대 ${limits.maxPortalCustomers}명까지 활성화할 수 있습니다. 플랜을 업그레이드하거나 기존 포털을 정리해 주세요.`,
    }
  }

  const token = shortId(10)

  const { error: uErr } = await context.supabase
    .from("customers")
    .update({ portal_token: token })
    .eq("id", customerId)
    .eq("user_id", context.userId)

  if (uErr) {
    throw uErr
  }

  await createActivityLog({
    action: "customer.portal_token_issued",
    description: "고객 미니 포털 링크를 발급했습니다.",
    customerId,
  })

  return { token }
}

function normalizeKakaoRecipientDigits(raw: string): string | null {
  const d = raw.replace(/\D/g, "")
  if (d.length >= 10 && d.length <= 13) {
    return d
  }
  return null
}

export async function sendKakaoAlimtalkForInvoiceRecord(
  invoiceId: string,
  recipientPhoneRaw: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return { ok: false, error: "데모 세션에서는 알림톡 발송을 사용할 수 없습니다." }
  }

  const { effectivePlan } = await loadPlanContext(
    context.supabase,
    context.userId
  )
  if (!planAllowsFeature(effectivePlan, "kakao_byoa_messaging")) {
    return { ok: false, error: "카카오 알림톡(BYOA)은 Pro 이상 플랜에서만 사용할 수 있습니다." }
  }

  const config = await getMessagingChannelConfigRecord()
  if (!config?.enabled) {
    return { ok: false, error: "설정에서 알림톡 채널을 켜고 엔드포인트를 저장해 주세요." }
  }
  if (!config.apiEndpoint.trim()) {
    return { ok: false, error: "HTTPS 발송 엔드포인트(URL)를 입력해 주세요." }
  }
  if (!config.senderKey.trim() || !config.templateCode.trim()) {
    return { ok: false, error: "발신 프로필 키와 템플릿 코드를 입력해 주세요." }
  }

  const snap = await getInvoiceOutboundSnapshot(invoiceId)
  if (!snap) {
    return { ok: false, error: "청구를 찾을 수 없습니다." }
  }

  const recipient =
    normalizeKakaoRecipientDigits(recipientPhoneRaw) ??
    normalizeKakaoRecipientDigits(snap.customerPhone)
  if (!recipient) {
    return { ok: false, error: "수신 전화번호를 입력하거나 고객 카드에 전화번호를 등록해 주세요." }
  }

  const { token } = await ensureInvoiceShareTokenForInvoice(invoiceId)
  const shareUrl = `${getSiteOrigin()}/i/${encodeURIComponent(token)}`

  const payload = {
    billIoVersion: 1 as const,
    channelKind: "kakao_alimtalk" as const,
    senderKey: config.senderKey.trim(),
    templateCode: config.templateCode.trim(),
    recipientPhone: recipient,
    variables: {
      shareUrl,
      docType: "invoice",
      invoiceNumber: snap.invoiceNumber,
      amountWon: String(snap.amount),
    },
  }

  const postResult = await postBillIoMessagingPayload({
    endpoint: config.apiEndpoint,
    headerName: config.apiKeyHeader.trim() || "Authorization",
    headerValue: config.apiKey.trim(),
    payload,
  })

  const logPayload: Json = {
    ...payload,
    httpOk: postResult.ok,
    ...(postResult.ok
      ? { httpStatus: postResult.status, bodyPreview: postResult.bodyPreview }
      : { error: postResult.error }),
  }

  await insertMessagingSendLogRecord({
    channel_kind: "kakao_alimtalk",
    recipient_phone: recipient,
    status: postResult.ok ? "sent" : "failed",
    error_message: postResult.ok ? null : postResult.error.slice(0, 2000),
    related_kind: "invoice",
    related_id: invoiceId,
    payload: logPayload,
  })

  if (!postResult.ok) {
    return { ok: false, error: postResult.error }
  }

  await createActivityLog({
    action: "invoice.messaging_kakao_sent",
    description: `「${snap.invoiceNumber}」 카카오 알림톡(BYOA) 발송을 요청했습니다.`,
    invoiceId,
    customerId: snap.customerId,
  })

  return { ok: true }
}

export async function sendKakaoAlimtalkForQuoteRecord(
  quoteId: string,
  recipientPhoneRaw: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return { ok: false, error: "데모 세션에서는 알림톡 발송을 사용할 수 없습니다." }
  }

  const { effectivePlan } = await loadPlanContext(
    context.supabase,
    context.userId
  )
  if (!planAllowsFeature(effectivePlan, "kakao_byoa_messaging")) {
    return { ok: false, error: "카카오 알림톡(BYOA)은 Pro 이상 플랜에서만 사용할 수 있습니다." }
  }

  const config = await getMessagingChannelConfigRecord()
  if (!config?.enabled) {
    return { ok: false, error: "설정에서 알림톡 채널을 켜고 엔드포인트를 저장해 주세요." }
  }
  if (!config.apiEndpoint.trim()) {
    return { ok: false, error: "HTTPS 발송 엔드포인트(URL)를 입력해 주세요." }
  }
  if (!config.senderKey.trim() || !config.templateCode.trim()) {
    return { ok: false, error: "발신 프로필 키와 템플릿 코드를 입력해 주세요." }
  }

  const snap = await getQuoteOutboundSnapshot(quoteId)
  if (!snap) {
    return { ok: false, error: "견적을 찾을 수 없습니다." }
  }

  const recipient =
    normalizeKakaoRecipientDigits(recipientPhoneRaw) ??
    normalizeKakaoRecipientDigits(snap.customerPhone)
  if (!recipient) {
    return { ok: false, error: "수신 전화번호를 입력하거나 고객 카드에 전화번호를 등록해 주세요." }
  }

  const { token } = await ensureQuoteShareTokenForQuote(quoteId)
  const shareUrl = `${getSiteOrigin()}/q/${encodeURIComponent(token)}`

  const payload = {
    billIoVersion: 1 as const,
    channelKind: "kakao_alimtalk" as const,
    senderKey: config.senderKey.trim(),
    templateCode: config.templateCode.trim(),
    recipientPhone: recipient,
    variables: {
      shareUrl,
      docType: "quote",
      quoteNumber: snap.quoteNumber,
      title: snap.title.trim().slice(0, 200),
    },
  }

  const postResult = await postBillIoMessagingPayload({
    endpoint: config.apiEndpoint,
    headerName: config.apiKeyHeader.trim() || "Authorization",
    headerValue: config.apiKey.trim(),
    payload,
  })

  const logPayload: Json = {
    ...payload,
    httpOk: postResult.ok,
    ...(postResult.ok
      ? { httpStatus: postResult.status, bodyPreview: postResult.bodyPreview }
      : { error: postResult.error }),
  }

  await insertMessagingSendLogRecord({
    channel_kind: "kakao_alimtalk",
    recipient_phone: recipient,
    status: postResult.ok ? "sent" : "failed",
    error_message: postResult.ok ? null : postResult.error.slice(0, 2000),
    related_kind: "quote",
    related_id: quoteId,
    payload: logPayload,
  })

  if (!postResult.ok) {
    return { ok: false, error: postResult.error }
  }

  await createActivityLog({
    action: "quote.messaging_kakao_sent",
    description: `「${snap.title}」(${snap.quoteNumber}) 카카오 알림톡(BYOA) 발송을 요청했습니다.`,
    quoteId,
    customerId: snap.customerId,
  })

  return { ok: true }
}

export async function updateInvoicePaymentStatusRecord(
  invoiceId: string,
  status: Invoice["paymentStatus"]
) {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return { mode: "demo" as const }
  }

  const { data: prevInv } = await context.supabase
    .from("invoices")
    .select("payment_status, invoice_number")
    .eq("id", invoiceId)
    .maybeSingle()
  const prevStatus = (prevInv as { payment_status: PaymentStatus; invoice_number: string } | null)
    ?.payment_status

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

  if (prevStatus !== status) {
    if (status === "overdue") {
      await insertBillNotificationForUser({
        type: "invoice_overdue",
        title: "청구가 연체 상태입니다",
        body: `${invoice.invoice_number} — 입금을 확인해 주세요.`,
        linkPath: "/invoices",
        relatedEntityType: "invoice",
        relatedEntityId: invoiceId,
        dedupeKey: `invoice_overdue:${invoiceId}`,
      })
    } else {
      await insertBillNotificationForUser({
        type: "invoice_status_changed",
        title: "청구 결제 상태가 변경되었습니다",
        body: `${invoice.invoice_number}: ${prevStatus ?? "?"} → ${status}`,
        linkPath: "/invoices",
        relatedEntityType: "invoice",
        relatedEntityId: invoiceId,
        dedupeKey: `invoice_pay:${invoiceId}:${String(prevStatus)}:${status}`,
      })
    }
  }

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

  const reminder = data as ReminderRow

  await insertBillNotificationForUser({
    type: "reminder_added",
    title: "리마인드가 기록되었습니다",
    body: `${invoice?.invoice_number ?? "청구"} · ${input.channel}`,
    linkPath: "/invoices",
    relatedEntityType: "invoice",
    relatedEntityId: input.invoiceId,
    dedupeKey: `reminder:${reminder.id}`,
  })

  return {
    mode: "supabase" as const,
    reminder: mapReminder(reminder),
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

  // 사업자등록번호 컬럼(0005 마이그레이션)이 없으면 이 필드만으로 upsert 전체가 실패할 수 있어 분리한다.
  const { error } = await context.supabase.from("business_settings").upsert(
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

  if (error) {
    throw error
  }

  const brn = input.businessRegistrationNumber.trim()
  const { error: brnError } = await context.supabase
    .from("business_settings")
    .update({ business_registration_number: brn || null })
    .eq("user_id", context.userId)

  if (brnError) {
    const msg = String((brnError as { message?: string }).message ?? "")
    const code = (brnError as { code?: string }).code
    const missingColumn =
      msg.includes("business_registration_number") ||
      msg.includes("schema cache") ||
      code === "PGRST204" ||
      code === "42703"
    if (!missingColumn) {
      throw brnError
    }
  }

  const { data: row, error: rowError } = await context.supabase
    .from("business_settings")
    .select("*")
    .eq("user_id", context.userId)
    .single()

  if (rowError || !row) {
    throw rowError ?? new Error("business_settings 조회에 실패했습니다.")
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
    settings: mapBusinessSettings(row as BusinessSettingsRow),
  }
}

export type PublicInquiryFormSnippet = Pick<
  BusinessSettings,
  | "publicInquiryFormEnabled"
  | "publicInquiryFormToken"
  | "businessName"
  | "publicInquiryIntro"
  | "publicInquiryConsentIntro"
  | "publicInquiryConsentRetention"
  | "publicInquiryCompletionMessage"
>

export async function savePublicInquiryFormRecord(input: {
  enabled: boolean
  intro: string
  consentIntro: string
  consentRetention: string
  completionMessage: string
  regenerateToken: boolean
}) {
  const context = await getDataContext()

  if (context.mode === "demo") {
    throw new Error("데모 환경에서는 공개 문의 폼을 저장할 수 없습니다.")
  }

  const { data: cur, error: curErr } = await context.supabase
    .from("business_settings")
    .select("public_inquiry_form_token")
    .eq("user_id", context.userId)
    .maybeSingle()

  if (curErr) {
    throw curErr
  }

  const prevToken = (cur as { public_inquiry_form_token?: string | null } | null)
    ?.public_inquiry_form_token

  let nextToken = prevToken ?? null
  if (input.enabled) {
    if (!nextToken || input.regenerateToken) {
      nextToken = shortId(10)
    }
  }

  const patch = {
    public_inquiry_form_enabled: input.enabled,
    public_inquiry_form_token: nextToken,
    public_inquiry_intro: input.intro.trim() || null,
    public_inquiry_consent_intro: input.consentIntro.trim() || null,
    public_inquiry_consent_retention: input.consentRetention.trim() || null,
    public_inquiry_completion_message: input.completionMessage.trim() || null,
  }

  const { error } = await context.supabase
    .from("business_settings")
    .update(patch)
    .eq("user_id", context.userId)

  if (error) {
    const msg = String((error as { message?: string }).message ?? "")
    const code = (error as { code?: string }).code
    const missing =
      msg.includes("public_inquiry") || code === "PGRST204" || code === "42703"
    if (missing) {
      throw new Error(
        "DB에 공개 문의 폼 컬럼이 없습니다. Supabase에 supabase/migrations/0007_public_inquiry_form.sql 을 적용해 주세요."
      )
    }
    throw error
  }

  const { data: row, error: rowError } = await context.supabase
    .from("business_settings")
    .select("*")
    .eq("user_id", context.userId)
    .single()

  if (rowError || !row) {
    throw rowError ?? new Error("business_settings 조회에 실패했습니다.")
  }

  const issued = input.enabled && nextToken && (!prevToken || input.regenerateToken)
  await createActivityLog({
    action: issued ? "inquiry_form.token_issued" : "inquiry_form.settings_saved",
    description: input.enabled
      ? issued
        ? "공개 문의 폼 링크가 발급·갱신되었습니다."
        : "공개 문의 폼 설정이 저장되었습니다."
      : "공개 문의 폼이 비활성화되었습니다.",
    metadata: {
      enabled: input.enabled,
    },
  })

  return {
    mode: "supabase" as const,
    settings: mapBusinessSettings(row as BusinessSettingsRow),
  }
}

export async function logInquiryFormShareActionRecord(kind: string) {
  const context = await getDataContext()
  if (context.mode === "demo") {
    return
  }
  const labels: Record<string, string> = {
    link_copied: "문의 폼 링크를 복사했습니다.",
    email_opened: "문의 폼 안내 메일 작성 화면을 열었습니다.",
    kakao_copied: "카카오톡용 문의 폼 안내 문구를 복사했습니다.",
    sms_copied: "문자용 문의 폼 안내 문구를 복사했습니다.",
    qr_viewed: "문의 폼 QR 코드를 확인했습니다.",
  }
  await createActivityLog({
    action: `inquiry_form.${kind}`,
    description: labels[kind] ?? "문의 폼 공유 동작이 기록되었습니다.",
    metadata: { kind },
  })
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
  publicInquiryForm: PublicInquiryFormSnippet | null
  isDemoWorkspace: boolean
  currentPlan: BillingPlan
}> {
  const context = await getDataContext()

  if (context.mode === "demo") {
    // 샘플 문의/고객을 넣으면 초기 온보딩 UI가 절대 보이지 않아, 데모는 빈 워크스페이스로 둡니다.
    return {
      inquiries: [],
      customers: [],
      stageSummary: { new: 0, qualified: 0, quoted: 0 },
      publicInquiryForm: {
        publicInquiryFormEnabled: demoBusinessSettings.publicInquiryFormEnabled,
        publicInquiryFormToken: demoBusinessSettings.publicInquiryFormToken,
        businessName: demoBusinessSettings.businessName,
        publicInquiryIntro: demoBusinessSettings.publicInquiryIntro,
        publicInquiryConsentIntro: demoBusinessSettings.publicInquiryConsentIntro,
        publicInquiryConsentRetention: demoBusinessSettings.publicInquiryConsentRetention,
        publicInquiryCompletionMessage: demoBusinessSettings.publicInquiryCompletionMessage,
      },
      isDemoWorkspace: true,
      currentPlan: demoUser.plan,
    }
  }

  const [
    { data: customerRows, error: customerError },
    { data: inquiryRows, error: inquiryError },
    { data: bsRow, error: bsError },
  ] = await Promise.all([
    context.supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false }),
    context.supabase
      .from("inquiries")
      .select("*")
      .order("created_at", { ascending: false }),
    context.supabase
      .from("business_settings")
      .select(
        "public_inquiry_form_enabled, public_inquiry_form_token, business_name, public_inquiry_intro, public_inquiry_consent_intro, public_inquiry_consent_retention, public_inquiry_completion_message"
      )
      .eq("user_id", context.userId)
      .maybeSingle(),
  ])

  if (customerError) {
    throw customerError
  }

  if (inquiryError) {
    throw inquiryError
  }

  if (bsError) {
    throw bsError
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

  const bs = bsRow as {
    public_inquiry_form_enabled?: boolean | null
    public_inquiry_form_token?: string | null
    business_name?: string | null
    public_inquiry_intro?: string | null
    public_inquiry_consent_intro?: string | null
    public_inquiry_consent_retention?: string | null
    public_inquiry_completion_message?: string | null
  } | null

  const publicInquiryForm: PublicInquiryFormSnippet | null = bs
    ? {
        publicInquiryFormEnabled: Boolean(bs.public_inquiry_form_enabled),
        publicInquiryFormToken: bs.public_inquiry_form_token ?? null,
        businessName: bs.business_name ?? "",
        publicInquiryIntro: bs.public_inquiry_intro ?? "",
        publicInquiryConsentIntro: bs.public_inquiry_consent_intro ?? "",
        publicInquiryConsentRetention: bs.public_inquiry_consent_retention ?? "",
        publicInquiryCompletionMessage: bs.public_inquiry_completion_message ?? "",
      }
    : null

  const { effectivePlan: currentPlan } = await loadPlanContext(
    context.supabase,
    context.userId
  )

  return {
    inquiries,
    customers,
    stageSummary: {
      new: inquiries.filter((item) => item.stage === "new").length,
      qualified: inquiries.filter((item) => item.stage === "qualified").length,
      quoted: inquiries.filter((item) => item.stage === "quoted").length,
    },
    publicInquiryForm,
    isDemoWorkspace: false,
    currentPlan,
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
  currentPlan: BillingPlan
  taxInvoiceSummary: CustomerTaxInvoiceSummary | null
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
      currentPlan: demoUser.plan,
      taxInvoiceSummary: null,
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

  const { effectivePlan: currentPlan } = await loadPlanContext(
    context.supabase,
    context.userId
  )

  const taxInvoiceSummary = await fetchTaxInvoiceSummaryForCustomer(
    context.supabase,
    context.userId,
    customerId
  )

  return {
    customer: customerRow ? mapCustomer(customerRow as CustomerRow) : null,
    inquiries: ((inquiryRows ?? []) as InquiryRow[]).map(mapInquiry),
    quotes: ((quoteRows ?? []) as QuoteRow[]).map(mapQuote),
    invoices: ((invoiceRows ?? []) as InvoiceRow[]).map(mapInvoice),
    timeline: ((activityRows ?? []) as ActivityLogRow[])
      .map(mapActivityLog)
      .map(mapActivityToTimeline),
    currentPlan,
    taxInvoiceSummary,
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
  currentPlan: BillingPlan
  kakaoByoaConfigured: boolean
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
      currentPlan: demoUser.plan,
      kakaoByoaConfigured: false,
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
    { data: kakaoRow },
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
    context.supabase
      .from("messaging_channel_configs")
      .select("id")
      .eq("user_id", context.userId)
      .eq("channel_kind", "kakao_alimtalk")
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

  const { effectivePlan: currentPlan } = await loadPlanContext(
    context.supabase,
    context.userId
  )

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
    currentPlan,
    kakaoByoaConfigured: kakaoRow != null,
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
  currentPlan: BillingPlan
  businessSettingsSnapshot: BusinessSettings | null
  kakaoByoaConfigured: boolean
}> {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return {
      invoices: demoInvoices.map((invoice) => ({
        ...invoice,
        customer: demoCustomers.find((customer) => customer.id === invoice.customerId),
        reminders: demoReminders.filter((reminder) => reminder.invoiceId === invoice.id),
        taxInvoice: null,
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
      currentPlan: demoUser.plan,
      businessSettingsSnapshot: demoBusinessSettings,
      kakaoByoaConfigured: false,
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
    { data: kakaoRow },
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
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle(),
    context.supabase
      .from("messaging_channel_configs")
      .select("id")
      .eq("user_id", context.userId)
      .eq("channel_kind", "kakao_alimtalk")
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

  const bizSettingsMapped = bizRow ? mapBusinessSettings(bizRow as BusinessSettingsRow) : null

  const { effectivePlan: currentPlan } = await loadPlanContext(
    context.supabase,
    context.userId
  )

  const taxByInvoiceId = await fetchTaxInvoicesByInvoiceIds(
    context.supabase,
    context.userId,
    invoiceRowsSafe.map((r) => r.id)
  )

  return {
    invoices: invoiceRowsSafe.map((row) => {
      const invoice = mapInvoice(row)

      return {
        ...invoice,
        customer: customerMap.get(invoice.customerId),
        reminders: remindersByInvoice.get(invoice.id) ?? [],
        taxInvoice: taxByInvoiceId.get(invoice.id) ?? null,
      }
    }),
    customers: customerRowsSafe.map(mapCustomer),
    quotes: quoteRowsSafe.map(mapQuote),
    defaultReminderMessage: defaultReminderMessageFromTemplates(mappedTemplates),
    invoiceActivityByInvoiceId,
    businessName: bizSettingsMapped?.businessName?.trim() ?? "",
    bankAccount: bizSettingsMapped?.bankAccount?.trim() ?? "",
    paymentTerms: bizSettingsMapped?.paymentTerms?.trim() ?? "",
    currentPlan,
    businessSettingsSnapshot: bizSettingsMapped,
    kakaoByoaConfigured: kakaoRow != null,
  }
}

export async function getSettingsPageData(): Promise<{
  settings: BusinessSettings
  templates: Template[]
  currentPlan: BillingPlan
  billing: UserBillingSnapshot
  planColumnMissing: boolean
  notificationPreferences: NotificationPreferences
  messagingChannelConfig: MessagingChannelConfig | null
}> {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return {
      settings: demoBusinessSettings,
      templates: demoTemplates,
      currentPlan: demoUser.plan,
      billing: demoBillingSnapshot,
      planColumnMissing: false,
      notificationPreferences: defaultNotificationPreferences(demoUser.id),
      messagingChannelConfig: null,
    }
  }

  const [
    { data: settingsRow, error: settingsError },
    { data: templateRows, error: templateError },
    { data: notifPrefRow, error: notifPrefError },
    { data: messagingRow, error: messagingError },
  ] = await Promise.all([
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
    context.supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle(),
    context.supabase
      .from("messaging_channel_configs")
      .select("*")
      .eq("user_id", context.userId)
      .eq("channel_kind", "kakao_alimtalk")
      .maybeSingle(),
  ])

  if (settingsError) {
    throw settingsError
  }

  if (templateError) {
    throw templateError
  }

  if (notifPrefError) {
    throw notifPrefError
  }

  if (messagingError) {
    throw messagingError
  }

  const planCtx = await loadPlanContext(
    context.supabase,
    context.userId
  )
  const currentPlan = planCtx.effectivePlan
  const planColumnMissing = planCtx.billing.billingColumnsMissing

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
        publicInquiryFormEnabled: false,
        publicInquiryFormToken: null,
        publicInquiryIntro: "",
        publicInquiryConsentIntro: "",
        publicInquiryConsentRetention: "",
        publicInquiryCompletionMessage: "",
      }

  const templates = ((templateRows ?? []) as TemplateRow[]).map(mapTemplate)

  const notificationPreferences = notifPrefRow
    ? mapNotificationPreferencesRow(notifPrefRow as NotificationPreferencesRow)
    : defaultNotificationPreferences(context.userId)

  return {
    settings,
    templates,
    currentPlan,
    billing: planCtx.billing,
    planColumnMissing,
    notificationPreferences,
    messagingChannelConfig: messagingRow
      ? mapMessagingChannelConfig(messagingRow as MessagingChannelConfigRow)
      : null,
  }
}

export async function getLandingPageEditorData(): Promise<{
  page: BusinessPublicPage
  settings: BusinessSettings
  currentPlan: BillingPlan
  planColumnMissing: boolean
}> {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return {
      page: demoBusinessPublicPage,
      settings: demoBusinessSettings,
      currentPlan: demoUser.plan,
      planColumnMissing: false,
    }
  }

  const [{ data: pageRow, error: pageError }, { data: settingsRow, error: settingsError }] =
    await Promise.all([
      context.supabase.from("business_public_pages").select("*").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("business_settings").select("*").eq("user_id", context.userId).maybeSingle(),
    ])

  if (pageError) {
    throw pageError
  }
  if (settingsError) {
    throw settingsError
  }

  const planCtx = await loadPlanContext(
    context.supabase,
    context.userId
  )
  const currentPlan = planCtx.effectivePlan
  const planColumnMissing = planCtx.billing.billingColumnsMissing

  const page = pageRow
    ? mapBusinessPublicPage(pageRow as BusinessPublicPageRow)
    : emptyBusinessPublicPage(context.userId)

  const safeSettings = settingsRow
    ? mapBusinessSettings(settingsRow as BusinessSettingsRow)
    : {
        ...mapBusinessSettings({
          id: "",
          user_id: context.userId,
          business_name: "",
          owner_name: "",
          business_registration_number: "",
          email: "",
          phone: "",
          default_currency: "KRW",
          payment_terms: "",
          bank_account: "",
          reminder_message: "",
          seal_image_url: null,
          seal_enabled: false,
          public_inquiry_form_enabled: false,
          public_inquiry_form_token: null,
          public_inquiry_intro: "",
          public_inquiry_consent_intro: "",
          public_inquiry_consent_retention: "",
          public_inquiry_completion_message: "",
          created_at: "",
          updated_at: "",
        } as BusinessSettingsRow),
      }

  return {
    page,
    settings: safeSettings,
    currentPlan,
    planColumnMissing,
  }
}

export type UpsertBusinessPublicPageInput = Omit<
  BusinessPublicPage,
  "id" | "userId" | "aiGeneratedAt" | "updatedAt"
> & { aiGeneratedAt?: string | null }

export async function upsertBusinessPublicPageRecord(
  userId: string,
  input: UpsertBusinessPublicPageInput
): Promise<{ ok: true; page: BusinessPublicPage } | { ok: false; code: "slug_taken" | "db"; message: string }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return { ok: false, code: "db", message: "Supabase가 구성되지 않았습니다." }
  }

  const services = input.services.slice(0, 6).map((s) => ({
    title: s.title.slice(0, 200),
    description: s.description.slice(0, 2000),
  }))
  const socialLinks = input.socialLinks.slice(0, 8).map((s) => ({
    label: s.label.slice(0, 80),
    url: s.url.slice(0, 2000),
  }))
  const faq = input.faq.slice(0, 6).map((f) => ({
    question: f.question.slice(0, 300),
    answer: f.answer.slice(0, 2000),
  }))
  const trustPoints = input.trustPoints.slice(0, 6).map((t) => t.slice(0, 300))

  const row = {
    user_id: userId,
    slug: input.slug.trim().toLowerCase(),
    is_published: input.isPublished,
    template: input.template === "minimal" ? "minimal" : "default",
    business_name: input.businessName.slice(0, 200),
    headline: input.headline.slice(0, 300),
    intro_one_line: input.introOneLine.slice(0, 300),
    about: input.about.slice(0, 12000),
    services,
    contact_phone: input.contactPhone.slice(0, 80),
    contact_email: input.contactEmail.slice(0, 200),
    location: input.location.slice(0, 300),
    business_hours: input.businessHours.slice(0, 500),
    social_links: socialLinks,
    hero_image_url: input.heroImageUrl?.trim() ? input.heroImageUrl.trim().slice(0, 520_000) : null,
    seo_title: input.seoTitle.slice(0, 200),
    seo_description: input.seoDescription.slice(0, 400),
    faq,
    trust_points: trustPoints,
    cta_text: input.ctaText.slice(0, 120),
    inquiry_cta_enabled: input.inquiryCtaEnabled,
    ai_generated_at: input.aiGeneratedAt ?? null,
  }

  const { data, error } = await supabase
    .from("business_public_pages")
    .upsert(row, { onConflict: "user_id" })
    .select("*")
    .single()

  if (error) {
    const msg = error.message ?? ""
    if (error.code === "23505" || msg.includes("duplicate") || msg.includes("unique")) {
      return { ok: false, code: "slug_taken", message: "이미 사용 중인 주소(slug)입니다. 다른 값을 입력해 주세요." }
    }
    return { ok: false, code: "db", message: msg || "저장에 실패했습니다." }
  }

  return { ok: true, page: mapBusinessPublicPage(data as BusinessPublicPageRow) }
}

/** 대시보드 운영 허브 — 공개 유입·플랜 등(메뉴 확장 없이 제품 폭 표시) */
export type DashboardHubSnapshot = {
  plan: BillingPlan
  publicInquiryFormEnabled: boolean
  publicInquiryFormToken: string | null
}

export type DashboardNotificationPreview = {
  id: string
  title: string
  isRead: boolean
  createdAt: string
  linkPath: string | null
}

export async function getDashboardPageData(): Promise<{
  metrics: DashboardMetrics
  followUps: InquiryWithCustomer[]
  upcomingInquiries: InquiryWithCustomer[]
  overdueInvoices: InvoiceWithReminders[]
  dueSoonInvoices: InvoiceWithReminders[]
  expiringQuotes: QuoteWithItems[]
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
  hub: DashboardHubSnapshot
  notificationPreview: DashboardNotificationPreview[]
  /** 전자세금계산서 요약(청구·ASP 연동) */
  taxInvoiceSignals: { needAttention: number; failed: number }
}> {
  const context = await getDataContext()

  if (context.mode === "demo") {
    const baseMetrics = getDashboardMetrics()
    return {
      metrics: { ...baseMetrics, followUpsToday: 0 },
      followUps: [],
      upcomingInquiries: [],
      overdueInvoices: demoInvoices
        .filter((invoice) => invoice.paymentStatus === "overdue")
        .map((invoice) => ({
          ...invoice,
          customer: demoCustomers.find((customer) => customer.id === invoice.customerId),
          reminders: demoReminders.filter((item) => item.invoiceId === invoice.id),
        })),
      dueSoonInvoices: [],
      expiringQuotes: [],
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
      hub: {
        plan: demoUser.plan,
        publicInquiryFormEnabled: Boolean(demoBusinessSettings.publicInquiryFormEnabled),
        publicInquiryFormToken: demoBusinessSettings.publicInquiryFormToken ?? null,
      },
      notificationPreview: [],
      taxInvoiceSignals: { needAttention: 0, failed: 0 },
    }
  }

  const [
    { data: customerRows, error: customerError },
    { data: inquiryRows, error: inquiryError },
    { data: quoteRows, error: quoteError },
    { data: invoiceRows, error: invoiceError },
    { data: activityRows, error: activityError },
    { data: hubBsRow, error: hubBsError },
    { data: notifPreviewRows, error: notifPreviewError },
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
    context.supabase
      .from("business_settings")
      .select("public_inquiry_form_enabled, public_inquiry_form_token")
      .eq("user_id", context.userId)
      .maybeSingle(),
    context.supabase
      .from("notifications")
      .select("id, title, is_read, created_at, link_path")
      .eq("user_id", context.userId)
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

  if (hubBsError) {
    throw hubBsError
  }

  if (notifPreviewError) {
    throw notifPreviewError
  }

  const { effectivePlan: hubPlan } = await loadPlanContext(
    context.supabase,
    context.userId
  )

  const taxInvoiceSignals = await countTaxInvoiceDashboardSignals(
    context.supabase,
    context.userId
  )

  const hubBs = hubBsRow as {
    public_inquiry_form_enabled?: boolean | null
    public_inquiry_form_token?: string | null
  } | null

  const notificationPreview: DashboardNotificationPreview[] = ((notifPreviewRows ?? []) as {
    id: string
    title: string
    is_read: boolean
    created_at: string
    link_path: string | null
  }[]).map((row) => ({
    id: row.id,
    title: row.title,
    isRead: row.is_read,
    createdAt: row.created_at,
    linkPath: row.link_path,
  }))

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
  const weekEnd = new Date(now)
  weekEnd.setDate(weekEnd.getDate() + 7)
  weekEnd.setHours(23, 59, 59, 999)
  const weekStartAt = new Date(now)
  weekStartAt.setHours(0, 0, 0, 0)

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
    upcomingInquiries: inquiries
      .filter((inquiry) => inquiry.followUpAt)
      .filter((inquiry) => {
        const at = new Date(inquiry.followUpAt!).getTime()
        return at >= weekStartAt.getTime() && at <= weekEnd.getTime()
      })
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
    dueSoonInvoices: invoices
      .filter(
        (invoice) =>
          Boolean(invoice.dueDate) &&
          invoice.paymentStatus !== "paid" &&
          invoice.paymentStatus !== "deposit_paid"
      )
      .filter((invoice) => {
        const at = new Date(`${invoice.dueDate!}T23:59:59`).getTime()
        return at >= weekStartAt.getTime() && at <= weekEnd.getTime()
      })
      .map((invoice) => ({
        ...invoice,
        customer: customerMap.get(invoice.customerId),
        reminders: [],
      })),
    expiringQuotes: quotes
      .filter((quote) => Boolean(quote.validUntil))
      .filter((quote) => !["approved", "rejected", "expired"].includes(quote.status))
      .filter((quote) => {
        const at = new Date(`${quote.validUntil!}T23:59:59`).getTime()
        return at >= weekStartAt.getTime() && at <= weekEnd.getTime()
      })
      .map((quote) => ({
        ...quote,
        customer: customerMap.get(quote.customerId),
        items: [],
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
    hub: {
      plan: hubPlan,
      publicInquiryFormEnabled: Boolean(hubBs?.public_inquiry_form_enabled),
      publicInquiryFormToken: hubBs?.public_inquiry_form_token ?? null,
    },
    notificationPreview,
    taxInvoiceSignals,
  }
}

export type { BillingConsoleEventRow } from "@/lib/billing/console-types"

/** /billing 로그인 콘솔 — 비로그인 RSC에서는 호출하지 말 것 */
export async function getBillingConsoleData(): Promise<{
  billing: UserBillingSnapshot
  effectivePlan: BillingPlan
  portalEnabledCount: number
  publicInquiryFormCount: number
  seatUsedCount: number
  runtime: {
    provider: string
    mode: string
    configured: boolean
    configurationError: string | null
  }
  events: BillingConsoleEventRow[]
} | null> {
  const context = await getDataContext()
  if (context.mode === "demo") {
    return {
      billing: demoBillingSnapshot,
      effectivePlan: "business",
      portalEnabledCount: 2,
      publicInquiryFormCount: 1,
      seatUsedCount: 1,
      runtime: {
        provider: "mock",
        mode: "test",
        configured: true,
        configurationError: null,
      },
      events: [
        {
          id: "demo-ev-1",
          kind: "subscription",
          message: "Business 플랜 · 다음 갱신 예정(데모)",
          createdAt: new Date().toISOString(),
        },
      ],
    }
  }

  if (!context.supabase) {
    return null
  }

  const planCtx = await loadPlanContext(
    context.supabase,
    context.userId
  )

  const { data: eventRows, error: evErr } = await context.supabase
    .from("billing_events")
    .select("id, kind, message, created_at")
    .eq("user_id", context.userId)
    .order("created_at", { ascending: false })
    .limit(40)

  if (evErr) {
    console.warn("[getBillingConsoleData] billing_events", evErr.message)
  }

  const { data: custRows } = await context.supabase
    .from("customers")
    .select("portal_token")
    .eq("user_id", context.userId)

  const { data: settingsRow } = await context.supabase
    .from("business_settings")
    .select("public_inquiry_form_enabled")
    .eq("user_id", context.userId)
    .maybeSingle()

  const portalList = (custRows ?? []) as { portal_token?: string | null }[]
  const portalEnabledCount = portalList.filter((r) => Boolean(r.portal_token?.trim())).length
  const billingSettings = settingsRow as { public_inquiry_form_enabled?: boolean | null } | null
  const publicInquiryFormCount = billingSettings?.public_inquiry_form_enabled ? 1 : 0
  const runtime = await getBillingRuntimeSnapshot()

  const rawEv = (eventRows ?? []) as {
    id: string
    kind: string
    message: string
    created_at: string
  }[]

  return {
    billing: planCtx.billing,
    effectivePlan: planCtx.effectivePlan,
    portalEnabledCount,
    publicInquiryFormCount,
    seatUsedCount: 1,
    runtime,
    events: rawEv.map((r) => ({
      id: r.id,
      kind: r.kind,
      message: r.message,
      createdAt: r.created_at,
    })),
  }
}

export type AuditLogEntry = {
  id: string
  action: string
  description: string
  customerId?: string
  customerName?: string
  quoteId?: string
  invoiceId?: string
  createdAt: string
}

/** Business 플랜 전용 — 전체 활동 감사 로그 */
export async function getAuditLogData(opts?: {
  limit?: number
  offset?: number
}): Promise<{ entries: AuditLogEntry[]; total: number; effectivePlan: BillingPlan } | null> {
  const context = await getDataContext()

  if (context.mode === "demo") {
    return { entries: [], total: 0, effectivePlan: "business" }
  }

  if (!context.supabase) return null

  const { effectivePlan } = await loadPlanContext(
    context.supabase,
    context.userId
  )

  if (!planAllowsFeature(effectivePlan, "audit_log")) {
    return { entries: [], total: 0, effectivePlan }
  }

  const limit = opts?.limit ?? 100
  const offset = opts?.offset ?? 0

  const [logResult, { data: custRows }] = await Promise.all([
    context.supabase
      .from("activity_logs")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    context.supabase
      .from("customers")
      .select("id, name, company_name")
      .eq("user_id", context.userId),
  ])

  const { data: rows, error } = logResult

  if (error) {
    console.warn("[getAuditLogData]", error.message)
    return { entries: [], total: 0, effectivePlan }
  }

  const customerMap = new Map<string, string>()
  for (const c of (custRows ?? []) as { id: string; name: string; company_name: string | null }[]) {
    customerMap.set(c.id, c.company_name?.trim() || c.name)
  }

  const entries: AuditLogEntry[] = ((rows ?? []) as ActivityLogRow[]).map((r) => ({
    id: r.id,
    action: r.action,
    description: r.description,
    customerId: r.customer_id ?? undefined,
    customerName: r.customer_id ? customerMap.get(r.customer_id) : undefined,
    quoteId: r.quote_id ?? undefined,
    invoiceId: r.invoice_id ?? undefined,
    createdAt: r.created_at,
  }))

  return { entries, total: entries.length, effectivePlan }
}
