/**
 * 플랜·기능 분기 기초.
 *
 * - DB: `public.users.plan` (`0004_user_plan.sql`). 미적용 시 `fetchUserPlanRow` 가 `free` + columnMissing 으로 완화.
 * - 결제 연동 시: Stripe/PG 웹훅에서 `users.plan` 갱신 → 이 파일의 `FEATURE_GATES` 를
 *   `billing/catalog.ts` 의 `FEATURE_GATES_AFTER_PAYMENT` 와 동일하게 맞추면 Pro 잠금을 켤 수 있습니다.
 */
import type { BillingPlan } from "@/types/domain"

export type { BillingPlan }

export type PlanFeature = "ai_assist" | "unlimited_quotes"

/**
 * 현재(무료 공개·PG 전): 핵심·AI 흐름을 막지 않습니다.
 * 유료 전환 시: `["pro"]` 만 남기도록 변경하세요.
 */
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
