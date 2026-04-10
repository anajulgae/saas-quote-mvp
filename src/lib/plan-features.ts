/**
 * 플랜·기능 분기 — `users.plan` + 체험(`subscription.ts` 의 effective plan)과 연동.
 */
import type { BillingPlan } from "@/types/domain"

export type { BillingPlan }

export type PlanFeature =
  | "ai_assist"
  | "unlimited_quotes"
  | "email_outbound"
  | "public_share_tracking"
  | "mini_landing"
  | "kakao_byoa_messaging"
  | "customer_mini_portal"
  | "e_tax_invoice_asp"
  /** Business — 고급 리포트·확장(향후 대시보드 심화와 연결) */
  | "advanced_reports"

/**
 * 기능 허용 — `plan` 인자는 반드시 **effective** 플랜(getEffectiveBillingPlan)을 넘기세요.
 */
export const FEATURE_GATES: Record<PlanFeature, BillingPlan[]> = {
  ai_assist: ["starter", "pro", "business"],
  unlimited_quotes: ["starter", "pro", "business"],
  email_outbound: ["starter", "pro", "business"],
  public_share_tracking: ["pro", "business"],
  mini_landing: ["pro", "business"],
  kakao_byoa_messaging: ["pro", "business"],
  customer_mini_portal: ["starter", "pro", "business"],
  e_tax_invoice_asp: ["business"],
  advanced_reports: ["business"],
}

export function planAllowsFeature(plan: BillingPlan, feature: PlanFeature): boolean {
  return FEATURE_GATES[feature].includes(plan)
}

export function normalizePlan(value: string | null | undefined): BillingPlan {
  const v = String(value ?? "")
    .trim()
    .toLowerCase()
  if (v === "pro") {
    return "pro"
  }
  if (v === "business") {
    return "business"
  }
  if (v === "free" || v === "starter" || v === "") {
    return "starter"
  }
  return "starter"
}
