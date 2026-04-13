import { getBillingProvider } from "@/lib/billing/provider"

/**
 * 이메일 인증(회원가입 확인) 직후 첫 랜딩 URL.
 * Paddle이 켜져 있으면 카드 수집 체크아웃으로 보냄(플랜은 기본 스타터).
 */
export function pathAfterEmailVerification(): string {
  try {
    const p = getBillingProvider()
    if (p.name === "paddle" && p.isConfigured()) {
      return "/billing/checkout/paddle?plan=starter"
    }
    if (p.name === "stripe" && p.isConfigured()) {
      return "/billing"
    }
  } catch {
    /* 빌드/엣지에서 provider 초기화 실패 시 대시보드 */
  }
  return "/dashboard"
}
