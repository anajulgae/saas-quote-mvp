/**
 * 플랜·기능 분기 기초. 결제 모듈 연동 시 여기와 DB `users.plan` 을 함께 갱신하면 됩니다.
 */
import type { BillingPlan } from "@/types/domain"

export type { BillingPlan }

export type PlanFeature = "ai_assist" | "unlimited_quotes"

/** true면 Free 에서 해당 기능을 막습니다. 출시 v1.0 은 AI·핵심 흐름을 모두 허용합니다. */
export const FEATURE_GATES: Record<PlanFeature, BillingPlan[]> = {
  ai_assist: ["free", "pro"],
  unlimited_quotes: ["free", "pro"],
}

export function planAllowsFeature(plan: BillingPlan, feature: PlanFeature): boolean {
  return FEATURE_GATES[feature].includes(plan)
}

export function normalizePlan(value: string | null | undefined): BillingPlan {
  return value === "pro" ? "pro" : "free"
}
