const DEFAULT = "/dashboard"

/**
 * 로그인 성공 후 이동 경로. 오픈 리다이렉트 방지: 동일 출처 상대 경로만 허용.
 */
export function sanitizeLoginNextPath(raw: string | null | undefined): string {
  if (raw == null) return DEFAULT
  const t = decodeURIComponent(String(raw).trim())
  if (t === "" || t === "/") return DEFAULT
  if (!t.startsWith("/")) return DEFAULT
  if (t.startsWith("//")) return DEFAULT
  if (t.includes("://")) return DEFAULT
  if (t.toLowerCase().startsWith("/\\")) return DEFAULT
  if (t.length > 512) return DEFAULT
  return t
}
