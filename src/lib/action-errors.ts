/**
 * 서버 액션에서 DB/네트워크 오류를 사용자용 문구로 정리합니다.
 */
export function toUserFacingActionError(error: unknown, fallback: string): string {
  const obj =
    typeof error === "object" && error !== null
      ? (error as { message?: unknown; code?: unknown })
      : null

  const message =
    error instanceof Error
      ? error.message
      : obj && typeof obj.message === "string"
        ? obj.message
        : String(error)

  const code = obj && typeof obj.code === "string" ? obj.code : ""

  if (code === "42501" || code === "PGRST301") {
    return "접근 권한이 없거나 데이터를 수정할 수 없습니다. 다시 로그인한 뒤 시도해 주세요."
  }

  const lower = message.toLowerCase()

  if (
    lower.includes("jwt") ||
    lower.includes("session") ||
    lower.includes("auth") ||
    lower.includes("invalid refresh token")
  ) {
    return "로그인이 만료되었습니다. 다시 로그인해 주세요."
  }

  if (
    lower.includes("permission denied") ||
    lower.includes("rls") ||
    lower.includes("row-level security") ||
    message.includes("42501")
  ) {
    return "접근 권한이 없거나 데이터를 수정할 수 없습니다. 다시 로그인한 뒤 시도해 주세요."
  }

  if (lower.includes("violates foreign key") || lower.includes("23503")) {
    return "연결된 데이터가 없거나 삭제되어 저장할 수 없습니다."
  }

  if (lower.includes("unique") || lower.includes("23505")) {
    return "이미 존재하는 번호이거나 중복된 값입니다."
  }

  return fallback
}
