/**
 * 이메일 인증·비밀번호 재설정 등 Supabase redirectTo 에 사용하는 사이트 기준 URL.
 * 프로덕션: NEXT_PUBLIC_SITE_URL=https://your-domain.com (슬래시 없이)
 * Vercel: 미설정 시 VERCEL_URL 기준 https 로 보정
 */
export function getSiteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "")
  if (explicit) {
    return explicit
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
