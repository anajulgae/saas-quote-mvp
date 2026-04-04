/** 사이드바에 사업장명과 겹치지 않게 한 줄만 보조 정보로 노출 */

export function resolveSidebarSecondaryLine(
  businessName: string,
  fullName: string | undefined,
  email: string | undefined
): string | undefined {
  const name = fullName?.trim() ?? ""
  const mail = email?.trim() ?? ""
  const isEmailLike = (s: string) => s.includes("@")

  if (name && !isEmailLike(name) && name !== businessName) {
    return name
  }
  if (mail && mail !== businessName) {
    return mail
  }
  return undefined
}
