import type { BillingPlan, SubscriptionStatus } from "@/types/domain"

import { normalizePlan } from "@/lib/plan-features"

export type UserBillingSnapshot = {
  plan: BillingPlan
  subscriptionStatus: SubscriptionStatus
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  pendingPlan: BillingPlan | null
  usageMonth: string | null
  aiCallsThisMonth: number
  documentSendsThisMonth: number
  billingColumnsMissing: boolean
}

const TRIAL_MS = 7 * 24 * 60 * 60 * 1000

export function normalizeSubscriptionStatus(v: string | null | undefined): SubscriptionStatus {
  const s = (v ?? "").toLowerCase().trim()
  if (
    s === "trialing" ||
    s === "active" ||
    s === "past_due" ||
    s === "canceled" ||
    s === "trial_expired"
  ) {
    return s
  }
  return "active"
}

/** 체험 중 Pro 수준 기능·한도 적용 */
export function getEffectiveBillingPlan(snapshot: Pick<UserBillingSnapshot, "plan" | "subscriptionStatus" | "trialEndsAt">): BillingPlan {
  const plan = normalizePlan(snapshot.plan)
  const status = snapshot.subscriptionStatus

  if (status === "trialing" && snapshot.trialEndsAt) {
    const end = new Date(snapshot.trialEndsAt).getTime()
    if (!Number.isNaN(end) && end > Date.now()) {
      return "pro"
    }
  }

  if (status === "trial_expired") {
    return "starter"
  }

  return plan
}

export function isTrialActive(snapshot: Pick<UserBillingSnapshot, "subscriptionStatus" | "trialEndsAt">): boolean {
  if (snapshot.subscriptionStatus !== "trialing" || !snapshot.trialEndsAt) {
    return false
  }
  const end = new Date(snapshot.trialEndsAt).getTime()
  return !Number.isNaN(end) && end > Date.now()
}

export function trialRemainingLabel(snapshot: Pick<UserBillingSnapshot, "subscriptionStatus" | "trialEndsAt">): string | null {
  if (!isTrialActive(snapshot) || !snapshot.trialEndsAt) {
    return null
  }
  const end = new Date(snapshot.trialEndsAt).getTime()
  const ms = end - Date.now()
  const days = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)))
  if (days <= 0) {
    return "오늘 종료"
  }
  if (days === 1) {
    return "1일 남음"
  }
  return `${days}일 남음`
}

export function defaultTrialEndsAtIso(): string {
  return new Date(Date.now() + TRIAL_MS).toISOString()
}

export const PLAN_USAGE_LIMITS: Record<
  BillingPlan,
  {
    aiCallsPerMonth: number
    documentSendsPerMonth: number
    maxPortalCustomers: number
    seats: number
  }
> = {
  starter: {
    aiCallsPerMonth: 40,
    documentSendsPerMonth: 60,
    maxPortalCustomers: 1,
    seats: 1,
  },
  pro: {
    aiCallsPerMonth: 250,
    documentSendsPerMonth: 400,
    maxPortalCustomers: 25,
    seats: 3,
  },
  business: {
    aiCallsPerMonth: 2500,
    documentSendsPerMonth: 5000,
    maxPortalCustomers: 500,
    seats: 15,
  },
}

export function getUsageLimitsForEffectivePlan(effectivePlan: BillingPlan) {
  return PLAN_USAGE_LIMITS[effectivePlan]
}

export function aiUsageRatio(snapshot: UserBillingSnapshot): number {
  const eff = getEffectiveBillingPlan(snapshot)
  const lim = PLAN_USAGE_LIMITS[eff].aiCallsPerMonth
  if (lim <= 0) {
    return 0
  }
  return Math.min(1, snapshot.aiCallsThisMonth / lim)
}
