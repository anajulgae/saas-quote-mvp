/**
 * 요금·플랜 카탈로그 (UI·문서와 동기). PG 연동 시 Checkout 세션 생성 등의 진입점은 `/billing` 을 기준으로 둡니다.
 */
import type { PlanFeature } from "@/lib/plan-features"
import type { BillingPlan } from "@/types/domain"

export const BILLING_PAGE_PATH = "/billing"

/** 랜딩·설정에서 안내용 */
export const PLAN_LABEL: Record<BillingPlan, string> = {
  free: "Starter (Free)",
  pro: "Pro",
}

/**
 * 현재 운영: AI·무제한 견적 등은 Free에서도 허용 (`plan-features.ts` 의 FEATURE_GATES).
 * 결제(PG) 연동 직전에 아래 맵을 `FEATURE_GATES` 와 맞추면 Pro 전용 기능을 한 번에 켤 수 있습니다.
 */
export const FEATURE_GATES_AFTER_PAYMENT: Record<PlanFeature, BillingPlan[]> = {
  /** 제안: Pro 전용 — AI 호출·월 할당량 */
  ai_assist: ["pro"],
  /** 제안: Pro 전용 — 월 N건 초과 시 업셀 */
  unlimited_quotes: ["pro"],
  /** 제안: Pro 전용 — Resend 견적·청구 메일 */
  email_outbound: ["pro"],
  /** 제안: Pro 전용 — 공개 링크 열람 로그·추적 */
  public_share_tracking: ["pro"],
  /** 업체 소개 미니 랜딩 — Pro 전용 (현재 `FEATURE_GATES`와 동일) */
  mini_landing: ["pro"],
}

export const BILLING_UPGRADE_CONTACT_COPY =
  "결제 모듈 연동 전입니다. Pro·Business는 아래 페이지에서 안내 후 곧 카드 결제로 이어질 예정입니다."
