import type { SupabaseClient } from "@supabase/supabase-js"

import { normalizePlan } from "@/lib/plan-features"
import {
  getEffectiveBillingPlan,
  normalizeSubscriptionStatus,
  type UserBillingSnapshot,
} from "@/lib/subscription"
import { getBillingProviderName } from "@/lib/billing/provider"
import type { BillingPlan } from "@/types/domain"
import type { Database } from "@/types/supabase"

export type UserPlanFetchResult = {
  plan: BillingPlan
  columnMissing: boolean
}

export type { UserBillingSnapshot }

const EMPTY_SNAPSHOT = (plan: BillingPlan, missing: boolean): UserBillingSnapshot => ({
  plan,
  subscriptionStatus: "active",
  trialStartedAt: null,
  trialEndsAt: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  pendingPlan: null,
  billingProvider: null,
  billingProviderSubscriptionId: null,
  billingProviderPriceId: null,
  billingCustomerId: null,
  paymentMethodBrand: null,
  paymentMethodLast4: null,
  billingStatusUpdatedAt: null,
  usageMonth: null,
  aiCallsThisMonth: 0,
  documentSendsThisMonth: 0,
  billingColumnsMissing: missing,
})

export function rowToSnapshot(
  row: Record<string, unknown> | null | undefined,
  columnMissing: boolean
): UserBillingSnapshot {
  if (!row) {
    return EMPTY_SNAPSHOT("starter", columnMissing)
  }
  const plan = normalizePlan(typeof row.plan === "string" ? row.plan : null)
  return {
    plan,
    subscriptionStatus: normalizeSubscriptionStatus(
      typeof row.subscription_status === "string" ? row.subscription_status : undefined
    ),
    trialStartedAt: typeof row.trial_started_at === "string" ? row.trial_started_at : null,
    trialEndsAt: typeof row.trial_ends_at === "string" ? row.trial_ends_at : null,
    currentPeriodEnd: typeof row.current_period_end === "string" ? row.current_period_end : null,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    pendingPlan:
      typeof row.pending_plan === "string" && row.pending_plan
        ? normalizePlan(row.pending_plan)
        : null,
    billingProvider: typeof row.billing_provider === "string" ? row.billing_provider : null,
    billingProviderSubscriptionId:
      typeof row.billing_provider_subscription_id === "string"
        ? row.billing_provider_subscription_id
        : null,
    billingProviderPriceId:
      typeof row.billing_provider_price_id === "string" ? row.billing_provider_price_id : null,
    billingCustomerId: typeof row.stripe_customer_id === "string" ? row.stripe_customer_id : null,
    paymentMethodBrand: typeof row.payment_method_brand === "string" ? row.payment_method_brand : null,
    paymentMethodLast4: typeof row.payment_method_last4 === "string" ? row.payment_method_last4 : null,
    billingStatusUpdatedAt:
      typeof row.billing_status_updated_at === "string" ? row.billing_status_updated_at : null,
    usageMonth: typeof row.usage_month === "string" ? row.usage_month : null,
    aiCallsThisMonth: typeof row.ai_calls_this_month === "number" ? row.ai_calls_this_month : 0,
    documentSendsThisMonth:
      typeof row.document_sends_this_month === "number" ? row.document_sends_this_month : 0,
    billingColumnsMissing: columnMissing,
  }
}

async function appendBillingEvent(
  supabase: SupabaseClient<Database>,
  userId: string,
  kind: string,
  message: string
) {
  const { error } = await supabase.from("billing_events").insert({
    user_id: userId,
    kind,
    message,
    metadata: {},
  })
  if (error) {
    console.warn("[appendBillingEvent]", error.message)
  }
}

export async function syncExpiredStates(
  supabase: SupabaseClient<Database>,
  userId: string,
  snap: UserBillingSnapshot
) {
  const now = Date.now()
  let next = snap

  if (snap.subscriptionStatus === "trialing" && snap.trialEndsAt) {
    const trialEnd = new Date(snap.trialEndsAt).getTime()
    if (!Number.isNaN(trialEnd) && trialEnd <= now) {
      const { error: trialErr } = await supabase
        .from("users")
        .update({ subscription_status: "trial_expired", billing_status_updated_at: new Date().toISOString() })
        .eq("id", userId)
        .eq("subscription_status", "trialing")
      if (trialErr) {
        console.warn("[syncExpiredStates] trial expiry update failed:", trialErr.message)
      } else {
        await appendBillingEvent(
          supabase,
          userId,
          "trial_ended",
          "7일 무료 체험이 종료되었습니다. 결제 수단을 등록하거나 플랜을 다시 선택해 주세요."
        )
        next = { ...next, subscriptionStatus: "trial_expired" }
      }
    }
  }

  if (
    next.cancelAtPeriodEnd &&
    next.currentPeriodEnd &&
    (next.subscriptionStatus === "active" || next.subscriptionStatus === "trialing")
  ) {
    const end = new Date(next.currentPeriodEnd).getTime()
    if (!Number.isNaN(end) && end <= now) {
      const { error: cancelErr } = await supabase
        .from("users")
        .update({
          subscription_status: "canceled",
          cancel_at_period_end: false,
          billing_status_updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
      if (cancelErr) {
        console.warn("[syncExpiredStates] cancel update failed:", cancelErr.message)
      } else {
        await appendBillingEvent(
          supabase,
          userId,
          "subscription_canceled",
          "예약된 해지가 반영되어 유료 구독이 종료되었습니다."
        )
        next = {
          ...next,
          subscriptionStatus: "canceled",
          cancelAtPeriodEnd: false,
        }
      }
    }
  }

  return next
}

/**
 * 구독, 체험, 사용량, provider 상태를 한번에 읽는다.
 * 0014/0015 미적용 환경에서도 최소 기능으로 폴백한다.
 */
export async function fetchUserBillingState(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserBillingSnapshot> {
  const extended = await supabase
    .from("users")
    .select(
      "plan, subscription_status, trial_started_at, trial_ends_at, current_period_end, cancel_at_period_end, pending_plan, billing_provider, billing_provider_subscription_id, billing_provider_price_id, stripe_customer_id, payment_method_brand, payment_method_last4, billing_status_updated_at, usage_month, ai_calls_this_month, document_sends_this_month"
    )
    .eq("id", userId)
    .maybeSingle()

  if (extended.error) {
    const msg = (extended.error.message ?? "").toLowerCase()
    const code = String((extended.error as { code?: string }).code ?? "")
    const undefinedColumn = code === "42703" || (msg.includes("column") && msg.includes("does not exist"))
    if (undefinedColumn) {
      const basic = await supabase.from("users").select("plan").eq("id", userId).maybeSingle()
      if (basic.error) {
        return EMPTY_SNAPSHOT("starter", true)
      }
      return rowToSnapshot(basic.data as Record<string, unknown>, true)
    }
    return EMPTY_SNAPSHOT("starter", false)
  }

  const snap = rowToSnapshot(extended.data as Record<string, unknown>, false)
  return syncExpiredStates(supabase, userId, snap)
}

export async function fetchUserPlanRow(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserPlanFetchResult> {
  const snap = await fetchUserBillingState(supabase, userId)
  return {
    plan: snap.plan,
    columnMissing: snap.billingColumnsMissing,
  }
}

export async function loadPlanContext(supabase: SupabaseClient<Database>, userId: string) {
  let billing = await fetchUserBillingState(supabase, userId)

  // Dodo 결제 후 웹훅이 누락된 경우 API에서 직접 구독 상태를 확인하여 DB 동기화
  if (
    getBillingProviderName() === "dodo" &&
    (billing.subscriptionStatus === "pending" || billing.subscriptionStatus === "incomplete") &&
    billing.billingProviderSubscriptionId
  ) {
    try {
      const { fetchDodoSubscriptionStatus } = await import(
        "@/lib/billing/providers/dodo-provider"
      )
      const result = await fetchDodoSubscriptionStatus(billing.billingProviderSubscriptionId)
      if (result.ok && result.snapshot.status === "active") {
        const { error: syncErr } = await supabase
          .from("users")
          .update({
            plan: result.snapshot.plan,
            subscription_status: result.snapshot.status,
            current_period_end: result.snapshot.currentPeriodEnd ?? billing.currentPeriodEnd,
            cancel_at_period_end: result.snapshot.cancelAtPeriodEnd,
            billing_provider_price_id: result.snapshot.productId ?? billing.billingProviderPriceId,
            billing_status_updated_at: new Date().toISOString(),
          })
          .eq("id", userId)
        if (syncErr) {
          console.warn("[loadPlanContext] Dodo sync failed:", syncErr.message)
        } else {
          await appendBillingEvent(
            supabase,
            userId,
            "subscription_started",
            `Dodo 결제 확인: ${result.snapshot.plan} 구독이 활성화되었습니다.`
          )
          billing = {
            ...billing,
            plan: result.snapshot.plan,
            subscriptionStatus: result.snapshot.status,
            currentPeriodEnd: result.snapshot.currentPeriodEnd ?? billing.currentPeriodEnd,
            cancelAtPeriodEnd: result.snapshot.cancelAtPeriodEnd,
            billingProviderPriceId: result.snapshot.productId ?? billing.billingProviderPriceId,
          }
        }
      }
    } catch (err) {
      console.warn("[loadPlanContext] Dodo subscription check failed:", err)
    }
  }

  return {
    billing,
    plan: billing.plan,
    effectivePlan: getEffectiveBillingPlan(billing),
  }
}
