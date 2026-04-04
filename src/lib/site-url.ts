/**
 * 이메일 인증·비밀번호 재설정 등 Supabase redirectTo 에 사용하는 사이트 기준 URL.
 * 프로덕션: NEXT_PUBLIC_SITE_URL=https://your-domain.com (슬래시 없이) — **Vercel에서 필수에 가깝습니다.**
 * 미설정 시 배포마다 바뀌는 VERCEL_URL 이 쓰이면, 그 호스트가 Supabase Redirect URLs 에 없을 때
 * Supabase가 Site URL 루트(/)로만 돌려보내고, 미들웨어가 /login 으로 보내는 현상이 납니다.
 *
 * Supabase Dashboard → Authentication → URL Configuration → Redirect URLs 에
 * `{SITE_URL}/auth/callback`(가입·이메일 인증)과 `{SITE_URL}/reset-password`(비밀번호 재설정)를
 * 허용 목록에 넣어야 메일 링크가 차단되지 않습니다.
 */
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

  /** Vercel Production: 커스텀 도메인이 연결돼 있으면 여기에 찍히는 경우가 많음 (배포 호스트와 다를 수 있음) */
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
