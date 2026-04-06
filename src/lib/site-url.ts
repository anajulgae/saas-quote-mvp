/**
 * 이메일 인증·비밀번호 재설정 등 Supabase redirectTo 에 사용하는 사이트 기준 URL.
 * 프로덕션: NEXT_PUBLIC_SITE_URL=https://your-domain.com (슬래시 없이) — **Vercel에서 강력 권장.**
 *
 * `NEXT_PUBLIC_SITE_URL` 이 비어 있고 Vercel **Production** 이면
 * {@link BILL_IO_CANONICAL_ORIGIN} 을 씁니다. (*.vercel.app 으로만 배포돼도 인증 리다이렉트가
 * www.bill-io.com 과 맞춰지도록)
 *
 * Supabase Dashboard → Authentication → URL Configuration → Redirect URLs 에
 * `https://www.bill-io.com/auth/callback`, `https://www.bill-io.com/reset-password` 및
 * 로컬·프리뷰용 URL을 허용 목록에 넣어야 메일 링크가 차단되지 않습니다.
 */

/** Bill-IO 공식 도메인(끝 슬래시 없음). Fork 시 `NEXT_PUBLIC_SITE_URL` 로 항상 덮어쓰면 됩니다. */
export const BILL_IO_CANONICAL_ORIGIN = "https://www.bill-io.com"

function normalizeHttpsOrigin(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "")
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  return `https://${trimmed.replace(/^https?:\/\//i, "")}`
}

export function getSiteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (explicit) {
    return normalizeHttpsOrigin(explicit)
  }

  const vercelEnv = process.env.VERCEL_ENV

  /** 프리뷰 배포는 현재 배포 호스트를 써야 콜백이 맞음 */
  if (vercelEnv === "preview") {
    const preview = process.env.VERCEL_URL?.trim()
    if (preview) {
      const host = preview.replace(/^https?:\/\//, "")
      return `https://${host}`
    }
  }

  if (vercelEnv === "production") {
    return BILL_IO_CANONICAL_ORIGIN
  }

  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (vercelProduction) {
    return normalizeHttpsOrigin(vercelProduction)
  }

  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "")
    return `https://${host}`
  }
  return "http://localhost:3000"
}

/** open redirect 방지: 상대 경로만 허용 */
export function safeAuthNextPath(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") {
    return "/dashboard"
  }
  const path = raw.split("?")[0] ?? ""
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return "/dashboard"
  }
  return path
}
