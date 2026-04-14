/**
 * 요금·플랜 카탈로그 — 랜딩·빌링·문서와 동기.
 */
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

/** 월 USD 가격 (Dodo Payments 기준, 센트 → 달러) */
export const PLAN_PRICE_USD_MONTH: Record<BillingPlan, number | null> = {
  starter: 22,
  pro: 45,
  business: 99,
}

export const PLAN_TAGLINE: Record<BillingPlan, string> = {
  starter: "1인·핵심 운영 — 문의부터 수금까지 기본 흐름",
  pro: "소규모 팀 — AI·포털·랜딩·카카오·세금계산서·추심 고도화",
  business: "다인 팀 — 감사 로그·화이트 라벨·대량 AI·우선 지원",
}

export const BILLING_UPGRADE_CONTACT_COPY =
  "플랜을 선택하고 결제하면 바로 이용할 수 있습니다. 7일 무료 체험 후 자동 결제됩니다."

export const SUPPORT_EMAIL_ENV = "NEXT_PUBLIC_SUPPORT_EMAIL"
