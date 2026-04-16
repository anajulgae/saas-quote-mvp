import type { BillingPlan, SubscriptionStatus } from "@/types/domain"

import { normalizePlan } from "@/lib/plan-features"

export type UserBillingSnapshot = {
  plan: BillingPlan
  subscriptionStatus: SubscriptionStatus
  trialStartedAt: string | null
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  pendingPlan: BillingPlan | null
  billingProvider: string | null
  billingProviderSubscriptionId: string | null
  billingProviderPriceId: string | null
  /** Dodo customer id 등 provider 고객 식별자 — 레거시 DB 컬럼 `stripe_customer_id` 재사용 */
  billingCustomerId: string | null
  paymentMethodBrand: string | null
  paymentMethodLast4: string | null
  billingStatusUpdatedAt: string | null
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
    s === "incomplete" ||
    s === "pending" ||
    s === "trial_expired"
  ) {
    return s
  }
  return "active"
}

/** billing 상태를 실제 기능 게이트에 연결한다. */
export function getEffectiveBillingPlan(
  snapshot: Pick<UserBillingSnapshot, "plan" | "subscriptionStatus" | "trialEndsAt">
): BillingPlan {
  const plan = normalizePlan(snapshot.plan)
  const status = snapshot.subscriptionStatus

  if (status === "trialing" && snapshot.trialEndsAt) {
    const end = new Date(snapshot.trialEndsAt).getTime()
    if (!Number.isNaN(end) && end > Date.now()) {
      return plan
    }
  }

  if (status === "trial_expired" || status === "canceled" || status === "incomplete" || status === "pending") {
    return "starter"
  }

  return plan
}

export function isTrialActive(
  snapshot: Pick<UserBillingSnapshot, "subscriptionStatus" | "trialEndsAt">
): boolean {
  if (snapshot.subscriptionStatus !== "trialing" || !snapshot.trialEndsAt) {
    return false
  }
  const end = new Date(snapshot.trialEndsAt).getTime()
  return !Number.isNaN(end) && end > Date.now()
}

export function trialRemainingLabel(
  snapshot: Pick<UserBillingSnapshot, "subscriptionStatus" | "trialEndsAt">
): string | null {
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

export function billingStatusLabel(status: SubscriptionStatus): string {
  switch (status) {
    case "trialing":
      return "체험 중"
    case "active":
      return "정상 결제"
    case "past_due":
      return "결제 실패"
    case "canceled":
      return "해지됨"
    case "incomplete":
      return "결제 수단 확인 필요"
    case "pending":
      return "결제 진행 중"
    case "trial_expired":
      return "체험 종료"
    default:
      return status
  }
}

export function billingStatusTone(
  status: SubscriptionStatus
): "positive" | "warning" | "danger" | "muted" {
  switch (status) {
    case "active":
      return "positive"
    case "trialing":
    case "pending":
      return "warning"
    case "past_due":
    case "canceled":
    case "incomplete":
    case "trial_expired":
      return "danger"
    default:
      return "muted"
  }
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
