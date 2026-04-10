import type { SupabaseClient } from "@supabase/supabase-js"

import { normalizePlan } from "@/lib/plan-features"
import {
  getEffectiveBillingPlan,
  normalizeSubscriptionStatus,
  type UserBillingSnapshot,
} from "@/lib/subscription"
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
  trialEndsAt: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  pendingPlan: null,
  usageMonth: null,
  aiCallsThisMonth: 0,
  documentSendsThisMonth: 0,
  billingColumnsMissing: missing,
})

function rowToSnapshot(
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
    trialEndsAt: typeof row.trial_ends_at === "string" ? row.trial_ends_at : null,
    currentPeriodEnd: typeof row.current_period_end === "string" ? row.current_period_end : null,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    pendingPlan:
      typeof row.pending_plan === "string" && row.pending_plan
        ? normalizePlan(row.pending_plan)
        : null,
    usageMonth: typeof row.usage_month === "string" ? row.usage_month : null,
    aiCallsThisMonth: typeof row.ai_calls_this_month === "number" ? row.ai_calls_this_month : 0,
    documentSendsThisMonth:
      typeof row.document_sends_this_month === "number" ? row.document_sends_this_month : 0,
    billingColumnsMissing: columnMissing,
  }
}

/**
 * 구독·체험·사용량 포함 전체 스냅샷. 마이그레이션 0014 미적용 시 컬럼 누락으로 완화 동작.
 */
export async function fetchUserBillingState(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserBillingSnapshot> {
  const extended = await supabase
    .from("users")
    .select(
      "plan, subscription_status, trial_ends_at, current_period_end, cancel_at_period_end, pending_plan, usage_month, ai_calls_this_month, document_sends_this_month"
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

  let snap = rowToSnapshot(extended.data as Record<string, unknown>, false)

  if (
    snap.subscriptionStatus === "trialing" &&
    snap.trialEndsAt &&
    new Date(snap.trialEndsAt).getTime() <= Date.now()
  ) {
    await supabase
      .from("users")
      .update({ subscription_status: "trial_expired" })
      .eq("id", userId)
      .eq("subscription_status", "trialing")
    const { error: rpcErr } = await supabase.rpc("append_billing_event", {
      p_kind: "trial_ended",
      p_message: "7일 체험이 종료되었습니다. 플랜을 선택해 주세요.",
      p_metadata: {},
    })
    if (rpcErr) {
      console.warn("[fetchUserBillingState] append_billing_event", rpcErr.message)
    }
    snap = { ...snap, subscriptionStatus: "trial_expired" }
  }

  return snap
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

/** 데이터 레이어·페이지에서 기능 게이트와 표시를 동시에 쓸 때 */
export async function loadPlanContext(supabase: SupabaseClient<Database>, userId: string) {
  const billing = await fetchUserBillingState(supabase, userId)
  return {
    billing,
    plan: billing.plan,
    effectivePlan: getEffectiveBillingPlan(billing),
  }
}
