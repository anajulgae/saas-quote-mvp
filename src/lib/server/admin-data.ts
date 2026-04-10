import type { SupabaseClient } from "@supabase/supabase-js"

import { PLAN_LABEL } from "@/lib/billing/catalog"
import type { Database } from "@/types/supabase"

type Sb = SupabaseClient<Database>

function isoDaysAgo(days: number) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString()
}

function currentUsageMonth() {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

export type AdminDashboardKpis = {
  totals: {
    users: number
    activeSubscription: number
    trialing: number
    paidActive: number
    trialExpiring7d: number
    pastDue: number
    cancelScheduled: number
    trialExpired: number
    admins: number
    disabledAccounts: number
  }
  periods: {
    signups7d: number
    signups30d: number
    signupsPrev7d: number
    signupsPrev30d: number
    supportTickets7d: number
    supportTickets30d: number
    publicInquiries7d: number
    publicInquiries30d: number
    documentSends7d: number
    documentSends30d: number
  }
  usageMonth: {
    month: string
    aiCallsSum: number
    documentSendsSum: number
    usersInMonth: number
  }
  planDistribution: Record<string, number>
  webhookUnprocessed: number
  alerts: string[]
}

export async function getAdminDashboardKpis(supabase: Sb): Promise<AdminDashboardKpis> {
  const nowIso = new Date().toISOString()
  const d7 = isoDaysAgo(7)
  const d30 = isoDaysAgo(30)
  const d14 = isoDaysAgo(14)
  const d60 = isoDaysAgo(60)
  const ym = currentUsageMonth()

  const alerts: string[] = []

  const { count: usersTotal, error: e1 } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
  if (e1) alerts.push(`사용자 수 집계 실패: ${e1.message}`)

  const { count: activeSubscription } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .in("subscription_status", ["trialing", "active"])

  const { count: trialing } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("subscription_status", "trialing")

  const { count: paidActive } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("subscription_status", "active")

  const trialEndSoon = new Date()
  trialEndSoon.setUTCDate(trialEndSoon.getUTCDate() + 7)
  const { count: trialExpiring7d } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("subscription_status", "trialing")
    .lte("trial_ends_at", trialEndSoon.toISOString())
    .gte("trial_ends_at", nowIso)

  const { count: pastDue } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("subscription_status", "past_due")

  const { count: cancelScheduled } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("cancel_at_period_end", true)

  const { count: trialExpired } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("subscription_status", "trial_expired")

  const { count: admins } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("is_admin", true)

  const { count: disabledAccounts } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("account_disabled", true)

  const { count: signups7d } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .gte("created_at", d7)

  const { count: signups30d } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .gte("created_at", d30)

  const { count: signupsPrev7d } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .gte("created_at", d14)
    .lt("created_at", d7)

  const { count: signupsPrev30d } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .gte("created_at", d60)
    .lt("created_at", d30)

  const { count: supportTickets7d } = await supabase
    .from("support_tickets")
    .select("*", { count: "exact", head: true })
    .gte("created_at", d7)

  const { count: supportTickets30d } = await supabase
    .from("support_tickets")
    .select("*", { count: "exact", head: true })
    .gte("created_at", d30)

  const { count: publicInquiries7d } = await supabase
    .from("public_inquiry_submissions")
    .select("*", { count: "exact", head: true })
    .gte("created_at", d7)

  const { count: publicInquiries30d } = await supabase
    .from("public_inquiry_submissions")
    .select("*", { count: "exact", head: true })
    .gte("created_at", d30)

  const { count: documentSends7d } = await supabase
    .from("document_send_events")
    .select("*", { count: "exact", head: true })
    .gte("created_at", d7)

  const { count: documentSends30d } = await supabase
    .from("document_send_events")
    .select("*", { count: "exact", head: true })
    .gte("created_at", d30)

  const { data: usageRows, error: usageErr } = await supabase
    .from("users")
    .select("ai_calls_this_month, document_sends_this_month, usage_month")
    .eq("usage_month", ym)

  if (usageErr) alerts.push(`이번 달 사용량 행 조회 실패: ${usageErr.message}`)

  let aiCallsSum = 0
  let documentSendsSum = 0
  for (const r of usageRows ?? []) {
    aiCallsSum += r.ai_calls_this_month ?? 0
    documentSendsSum += r.document_sends_this_month ?? 0
  }

  const { data: planRows, error: planErr } = await supabase.from("users").select("plan")
  if (planErr) alerts.push(`플랜 분포 조회 실패: ${planErr.message}`)
  const planDistribution: Record<string, number> = {}
  for (const r of planRows ?? []) {
    const p = r.plan ?? "unknown"
    planDistribution[p] = (planDistribution[p] ?? 0) + 1
  }

  const { count: webhookUnprocessed } = await supabase
    .from("billing_webhook_events")
    .select("*", { count: "exact", head: true })
    .eq("processed", false)

  if ((webhookUnprocessed ?? 0) > 0) {
    alerts.push(`처리되지 않은 결제 웹훅 ${webhookUnprocessed}건`)
  }
  if ((pastDue ?? 0) > 0) {
    alerts.push(`결제 실패(past_due) 사용자 ${pastDue}명`)
  }
  if ((trialExpiring7d ?? 0) > 0) {
    alerts.push(`7일 이내 체험 종료 예정 ${trialExpiring7d}명`)
  }

  return {
    totals: {
      users: usersTotal ?? 0,
      activeSubscription: activeSubscription ?? 0,
      trialing: trialing ?? 0,
      paidActive: paidActive ?? 0,
      trialExpiring7d: trialExpiring7d ?? 0,
      pastDue: pastDue ?? 0,
      cancelScheduled: cancelScheduled ?? 0,
      trialExpired: trialExpired ?? 0,
      admins: admins ?? 0,
      disabledAccounts: disabledAccounts ?? 0,
    },
    periods: {
      signups7d: signups7d ?? 0,
      signups30d: signups30d ?? 0,
      signupsPrev7d: signupsPrev7d ?? 0,
      signupsPrev30d: signupsPrev30d ?? 0,
      supportTickets7d: supportTickets7d ?? 0,
      supportTickets30d: supportTickets30d ?? 0,
      publicInquiries7d: publicInquiries7d ?? 0,
      publicInquiries30d: publicInquiries30d ?? 0,
      documentSends7d: documentSends7d ?? 0,
      documentSends30d: documentSends30d ?? 0,
    },
    usageMonth: {
      month: ym,
      aiCallsSum,
      documentSendsSum,
      usersInMonth: usageRows?.length ?? 0,
    },
    planDistribution,
    webhookUnprocessed: webhookUnprocessed ?? 0,
    alerts,
  }
}

export type AdminUserRow = {
  id: string
  email: string | null
  full_name: string
  business_name: string | null
  plan: string
  subscription_status: string | null
  trial_ends_at: string | null
  cancel_at_period_end: boolean
  ai_calls_this_month: number
  document_sends_this_month: number
  usage_month: string | null
  payment_method_last4: string | null
  payment_method_brand: string | null
  account_disabled: boolean
  created_at: string
  updated_at: string
}

export async function listAdminUsers(
  supabase: Sb,
  opts: {
    q?: string
    plan?: string
    subscriptionStatus?: string
    limit?: number
    offset?: number
  }
): Promise<{ rows: AdminUserRow[]; error?: string }> {
  const limit = Math.min(opts.limit ?? 50, 200)
  const offset = opts.offset ?? 0

  let q = supabase
    .from("users")
    .select(
      "id, email, full_name, business_name, plan, subscription_status, trial_ends_at, cancel_at_period_end, ai_calls_this_month, document_sends_this_month, usage_month, payment_method_last4, payment_method_brand, account_disabled, created_at, updated_at"
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (opts.plan && opts.plan !== "all") {
    q = q.eq("plan", opts.plan)
  }
  if (opts.subscriptionStatus && opts.subscriptionStatus !== "all") {
    q = q.eq("subscription_status", opts.subscriptionStatus)
  }
  if (opts.q?.trim()) {
    const t = opts.q.trim().replace(/[%(),]/g, "")
    if (t.length > 0) {
      const s = `%${t}%`
      q = q.or(`email.ilike.${s},full_name.ilike.${s},business_name.ilike.${s}`)
    }
  }

  const { data, error } = await q
  if (error) return { rows: [], error: error.message }
  return { rows: (data ?? []) as AdminUserRow[] }
}

export async function getAdminUserDetail(supabase: Sb, userId: string) {
  const { data: user, error: uerr } = await supabase.from("users").select("*").eq("id", userId).maybeSingle()
  if (uerr || !user) return { error: uerr?.message ?? "사용자 없음" }

  const [
    settingsRes,
    inqRes,
    quoteRes,
    invRes,
    custRes,
    ticketsRes,
    eventsRes,
    notesRes,
    failMsgRes,
    taxRes,
    activityRes,
  ] = await Promise.all([
    supabase.from("business_settings").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("inquiries").select("id, stage, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(8),
    supabase.from("quotes").select("id, status, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(8),
    supabase.from("invoices").select("id, payment_status, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(8),
    supabase
      .from("customers")
      .select("id, portal_token, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("support_tickets").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    supabase.from("billing_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
    supabase.from("admin_user_notes").select("*").eq("target_user_id", userId).order("created_at", { ascending: false }).limit(30),
    supabase
      .from("messaging_send_logs")
      .select("id, status, error_message, created_at")
      .eq("user_id", userId)
      .neq("status", "success")
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("tax_invoices")
      .select("id, status, failure_reason, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("activity_logs").select("id, action, description, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(15),
  ])

  const portalCustomers = (custRes.data ?? []).filter((c) => Boolean(c.portal_token)).length

  return {
    user,
    businessSettings: settingsRes.data,
    recentInquiries: inqRes.data ?? [],
    recentQuotes: quoteRes.data ?? [],
    recentInvoices: invRes.data ?? [],
    portalCustomerCount: portalCustomers,
    customersTotal: custRes.data?.length ?? 0,
    supportTickets: ticketsRes.data ?? [],
    billingEvents: eventsRes.data ?? [],
    adminNotes: notesRes.data ?? [],
    messagingFailures: failMsgRes.data ?? [],
    taxInvoices: taxRes.data ?? [],
    activityLogs: activityRes.data ?? [],
    loadErrors: [
      settingsRes.error?.message,
      inqRes.error?.message,
      quoteRes.error?.message,
      invRes.error?.message,
      custRes.error?.message,
      ticketsRes.error?.message,
      eventsRes.error?.message,
      notesRes.error?.message,
      failMsgRes.error?.message,
      taxRes.error?.message,
      activityRes.error?.message,
    ].filter(Boolean) as string[],
  }
}

export async function getAdminBillingOps(supabase: Sb) {
  const nowIso = new Date().toISOString()
  const soon = new Date()
  soon.setUTCDate(soon.getUTCDate() + 7)

  const [trialExpiring, pastDue, cancelSoon, noPayment, events, webhooks] = await Promise.all([
    supabase
      .from("users")
      .select("id, email, full_name, plan, trial_ends_at, subscription_status")
      .eq("subscription_status", "trialing")
      .lte("trial_ends_at", soon.toISOString())
      .gte("trial_ends_at", nowIso)
      .order("trial_ends_at", { ascending: true })
      .limit(80),
    supabase
      .from("users")
      .select("id, email, full_name, plan, subscription_status, current_period_end")
      .eq("subscription_status", "past_due")
      .order("updated_at", { ascending: false })
      .limit(80),
    supabase
      .from("users")
      .select("id, email, full_name, plan, subscription_status, current_period_end")
      .eq("cancel_at_period_end", true)
      .order("current_period_end", { ascending: true })
      .limit(80),
    supabase
      .from("users")
      .select("id, email, full_name, plan, subscription_status, payment_method_last4")
      .in("subscription_status", ["active", "trialing"])
      .is("payment_method_last4", null)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("billing_events").select("id, user_id, kind, message, created_at").order("created_at", { ascending: false }).limit(100),
    supabase.from("billing_webhook_events").select("*").order("created_at", { ascending: false }).limit(40),
  ])

  const { data: planRows } = await supabase.from("users").select("plan")
  const planDistribution: Record<string, number> = {}
  for (const r of planRows ?? []) {
    const p = r.plan ?? "unknown"
    planDistribution[p] = (planDistribution[p] ?? 0) + 1
  }

  return {
    trialExpiring: trialExpiring.data ?? [],
    pastDue: pastDue.data ?? [],
    cancelScheduled: cancelSoon.data ?? [],
    noPaymentMethod: noPayment.data ?? [],
    recentBillingEvents: events.data ?? [],
    recentWebhooks: webhooks.data ?? [],
    planDistribution,
    errors: [trialExpiring.error, pastDue.error, cancelSoon.error, noPayment.error, events.error, webhooks.error]
      .map((e) => e?.message)
      .filter(Boolean) as string[],
  }
}

export const SUPPORT_TICKET_STATUS_LABEL: Record<string, string> = {
  new: "신규",
  open: "신규",
  in_progress: "처리중",
  resolved: "답변완료",
  on_hold: "보류",
}

export const SUPPORT_CATEGORY_LABEL: Record<string, string> = {
  general: "일반 문의",
  bug: "오류 신고",
  billing: "결제/구독",
  feature: "기능 제안",
  refund: "환불",
  cancel: "해지",
}

export async function listAdminSupportTickets(
  supabase: Sb,
  filters: { status?: string; category?: string }
) {
  let q = supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).limit(200)
  if (filters.status && filters.status !== "all") {
    if (filters.status === "new") {
      q = q.in("status", ["new", "open"])
    } else {
      q = q.eq("status", filters.status)
    }
  }
  if (filters.category && filters.category !== "all") {
    q = q.eq("category", filters.category)
  }
  const { data, error } = await q
  return { rows: data ?? [], error: error?.message }
}

export async function getAdminSystemSnapshot(supabase: Sb) {
  const d7 = isoDaysAgo(7)

  const [opsErr, billingIssues, msgFail, webhookFail, taxFail] = await Promise.all([
    supabase.from("ops_error_events").select("*").order("created_at", { ascending: false }).limit(50),
    supabase
      .from("billing_events")
      .select("id, user_id, kind, message, created_at, metadata")
      .or("message.ilike.%오류%,message.ilike.%실패%,message.ilike.%error%,message.ilike.%fail%")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("messaging_send_logs")
      .select("id, user_id, status, error_message, created_at")
      .neq("status", "success")
      .gte("created_at", d7)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("billing_webhook_events")
      .select("id, provider, event_type, processed, created_at")
      .eq("processed", false)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("tax_invoices")
      .select("id, user_id, status, failure_reason, created_at")
      .not("failure_reason", "is", null)
      .gte("created_at", d7)
      .order("created_at", { ascending: false })
      .limit(25),
  ])

  return {
    opsErrors: opsErr.data ?? [],
    billingEventsIssues: billingIssues.data ?? [],
    messagingFailures: msgFail.data ?? [],
    webhooksPending: webhookFail.data ?? [],
    taxFailures: taxFail.data ?? [],
    errors: [opsErr.error, billingIssues.error, msgFail.error, webhookFail.error, taxFail.error]
      .map((e) => e?.message)
      .filter(Boolean) as string[],
  }
}

export async function getAdminUsageSnapshot(supabase: Sb) {
  const ym = currentUsageMonth()
  const { data: rows, error } = await supabase
    .from("users")
    .select(
      "id, email, full_name, plan, usage_month, ai_calls_this_month, document_sends_this_month, subscription_status"
    )
    .eq("usage_month", ym)
    .order("ai_calls_this_month", { ascending: false })
    .limit(200)

  const byPlan: Record<string, { ai: number; doc: number; n: number }> = {}
  for (const r of rows ?? []) {
    const p = r.plan ?? "?"
    if (!byPlan[p]) byPlan[p] = { ai: 0, doc: 0, n: 0 }
    byPlan[p].ai += r.ai_calls_this_month ?? 0
    byPlan[p].doc += r.document_sends_this_month ?? 0
    byPlan[p].n += 1
  }

  const { count: formsEnabled } = await supabase
    .from("business_settings")
    .select("*", { count: "exact", head: true })
    .eq("public_inquiry_form_enabled", true)

  const { data: portalSample } = await supabase.from("customers").select("user_id").not("portal_token", "is", null).limit(5000)

  const portalByUser = new Set((portalSample ?? []).map((c) => c.user_id))

  return {
    month: ym,
    users: rows ?? [],
    byPlan,
    topAi: [...(rows ?? [])].sort((a, b) => (b.ai_calls_this_month ?? 0) - (a.ai_calls_this_month ?? 0)).slice(0, 15),
    topDoc: [...(rows ?? [])].sort((a, b) => (b.document_sends_this_month ?? 0) - (a.document_sends_this_month ?? 0)).slice(0, 15),
    publicFormsEnabled: formsEnabled ?? 0,
    customersWithPortalApprox: portalByUser.size,
    error: error?.message,
  }
}

export function formatPlanLabel(plan: string) {
  return PLAN_LABEL[plan as keyof typeof PLAN_LABEL] ?? plan
}
