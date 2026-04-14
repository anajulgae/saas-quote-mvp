import { getBillingProvider } from "@/lib/billing/provider"

/**
 * 이메일 인증(회원가입 확인) 직후 첫 랜딩 URL.
 * PG가 켜져 있으면 빌링 페이지로 보냄(체크아웃 진행 가능).
 */
export function pathAfterEmailVerification(): string {
  try {
    const p = getBillingProvider()
    if (p.name === "paddle" && p.isConfigured()) {
      return "/billing/checkout/paddle?plan=starter"
    }
    if ((p.name === "dodo" || p.name === "stripe") && p.isConfigured()) {
      return "/billing"
    }
  } catch {
    /* 빌드/엣지에서 provider 초기화 실패 시 대시보드 */
  }
  return "/dashboard"
}
