/** 가입 인증 안내 등에 쓰는 표시용 마스킹 (보안 목적 아님) */
export function maskEmailForDisplay(email: string): string {
  const trimmed = email.trim().toLowerCase()
  const at = trimmed.lastIndexOf("@")
  if (at <= 0 || at === trimmed.length - 1) {
    return "***"
  }
  const local = trimmed.slice(0, at)
  const domain = trimmed.slice(at + 1)
  if (local.length <= 2) {
    return `**@${domain}`
  }
  return `${local.slice(0, 2)}***@${domain}`
}
