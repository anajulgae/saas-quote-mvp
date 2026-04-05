/**
 * 플랜·기능 분기 기초.
 *
 * - DB: `public.users.plan` (`0004_user_plan.sql`). 미적용 시 `fetchUserPlanRow` 가 `free` + columnMissing 으로 완화.
 * - 결제 연동 시: Stripe/PG 웹훅에서 `users.plan` 갱신 → 이 파일의 `FEATURE_GATES` 를
 *   `billing/catalog.ts` 의 `FEATURE_GATES_AFTER_PAYMENT` 와 동일하게 맞추면 Pro 잠금을 켤 수 있습니다.
 *
 * ## 유료 전환 시 권장 잠금 후보 (현재는 모두 free 허용)
 * - `ai_assist` → Pro만 (AI API 전부)
 * - `email_outbound` → Pro만 (Resend 견적·청구 메일)
 * - `unlimited_quotes` → 무료 월 N건 제한 시 카운트와 연동
 * - `public_share_tracking` → 열람 로그·고급 리포트를 Pro로
 */
import type { BillingPlan } from "@/types/domain"

export type { BillingPlan }

export type PlanFeature =
  | "ai_assist"
  | "unlimited_quotes"
  /** 견적·청구 이메일 발송(Resend) — 향후 Pro 전용 연결 지점 */
  | "email_outbound"
  /** 공개 링크 열람 추적·활동 로그 심화 — 향후 Pro 전용 연결 지점 */
  | "public_share_tracking"

/**
 * 현재(무료 공개·PG 전): 핵심·AI·메일 흐름을 막지 않습니다.
 * 유료 전환 시: 잠글 기능의 배열을 `["pro"]` 만 남기세요.
 */
export const FEATURE_GATES: Record<PlanFeature, BillingPlan[]> = {
  ai_assist: ["free", "pro"],
  unlimited_quotes: ["free", "pro"],
  email_outbound: ["free", "pro"],
  public_share_tracking: ["free", "pro"],
}

export function planAllowsFeature(plan: BillingPlan, feature: PlanFeature): boolean {
  return FEATURE_GATES[feature].includes(plan)
}

export function normalizePlan(value: string | null | undefined): BillingPlan {
  return value === "pro" ? "pro" : "free"
}
