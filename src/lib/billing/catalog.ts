/**
 * 요금·플랜 카탈로그 — 랜딩·빌링·문서와 동기.
 */
import type { PlanFeature } from "@/lib/plan-features"
import type { BillingPlan } from "@/types/domain"

export const BILLING_PAGE_PATH = "/billing"

export const PLAN_LABEL: Record<BillingPlan, string> = {
  starter: "스타터",
  pro: "프로",
  business: "비즈니스",
}

/** 월 VAT 별도 가정 시 원 표기(표시용) */
export const PLAN_PRICE_KRW_MONTH: Record<BillingPlan, number | null> = {
  starter: 29_000,
  pro: 59_000,
  business: 129_000,
}

export const PLAN_TAGLINE: Record<BillingPlan, string> = {
  starter: "1인·핵심 운영 — 문의부터 수금까지 기본 흐름",
  pro: "소규모 팀 — AI·포털·랜딩·카카오·추심 고도화",
  business: "다인 팀 — 세금계산서·리포트·대량 AI·우선 지원",
}

/**
 * PG 연동 후 FEATURE_GATES 와 맞추면 한 번에 잠글 수 있습니다.
 * 현재 앱은 FEATURE_GATES 를 소스 오브 트루스로 사용합니다.
 */
export const FEATURE_GATES_AFTER_PAYMENT: Record<PlanFeature, BillingPlan[]> = {
  ai_assist: ["starter", "pro", "business"],
  unlimited_quotes: ["starter", "pro", "business"],
  email_outbound: ["starter", "pro", "business"],
  public_share_tracking: ["pro", "business"],
  mini_landing: ["pro", "business"],
  kakao_byoa_messaging: ["pro", "business"],
  customer_mini_portal: ["starter", "pro", "business"],
  e_tax_invoice_asp: ["business"],
  advanced_reports: ["business"],
  analytics_custom_range: ["pro", "business"],
  analytics_breakdown: ["pro", "business"],
  analytics_export: ["business"],
}

export const BILLING_UPGRADE_CONTACT_COPY =
  "카드 자동결제(PG) 연동 시 이 화면에서 바로 결제 수단을 등록하고 갱신일이 표시됩니다. 지금은 플랜·체험·사용량을 확정하고, 해지·변경 요청을 기록하는 운영 단계입니다."

export const SUPPORT_EMAIL_ENV = "NEXT_PUBLIC_SUPPORT_EMAIL"
