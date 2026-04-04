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

/**
 * Supabase Auth `resetPasswordForEmail` 실패 시 사용자 안내 (리다이렉트 URL·SMTP·레이트 리밋 등)
 */
export function toPasswordResetEmailError(error: unknown): string {
  const obj =
    typeof error === "object" && error !== null
      ? (error as { message?: unknown; code?: unknown; status?: unknown })
      : null

  const message =
    error instanceof Error
      ? error.message
      : obj && typeof obj.message === "string"
        ? obj.message
        : ""

  const code = String(obj?.code ?? "").toLowerCase()
  const lower = message.toLowerCase()

  if (
    lower.includes("rate limit") ||
    lower.includes("too many") ||
    code.includes("over_email") ||
    code === "too_many_requests"
  ) {
    return "짧은 시간에 메일 요청이 많습니다. 1~2분 후 다시 시도해 주세요."
  }

  if (
    lower.includes("redirect") ||
    lower.includes("redirect_uri") ||
    lower.includes("redirect url") ||
    lower.includes("invalid redirect")
  ) {
    return "재설정 메일의 링크 주소가 Supabase 설정과 맞지 않습니다. Authentication → URL Configuration의 Redirect URLs에 배포 주소의 `/reset-password` 및 `/auth/callback`(이메일 인증용)이 등록돼 있는지 확인해 주세요."
  }

  if (
    lower.includes("smtp") ||
    lower.includes("535") ||
    lower.includes("mailer") ||
    lower.includes("sending email") ||
    lower.includes("failed to send")
  ) {
    return "메일 발송에 실패했습니다. Supabase의 Custom SMTP 설정(발신 주소·호스트·비밀번호)을 확인하거나, 기본 메일 채널 제한 여부를 관리자에게 문의해 주세요."
  }

  return toUserFacingActionError(
    error,
    "재설정 메일을 보내지 못했습니다. 잠시 후 다시 시도하거나, 네트워크와 서버 설정을 확인해 주세요."
  )
}

/**
 * 재설정 링크로 들어온 뒤 `exchangeCodeForSession` / `setSession` / `verifyOtp` 실패 시 안내
 */
export function toRecoveryExchangeError(error: unknown): string {
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

  const lower = message.toLowerCase()

  if (
    lower.includes("expired") ||
    lower.includes("otp expired") ||
    lower.includes("link is invalid") ||
    lower.includes("token has expired")
  ) {
    return "재설정 링크가 만료되었거나 이미 사용되었습니다. 비밀번호 찾기에서 메일을 다시 요청해 주세요."
  }

  if (
    lower.includes("invalid") ||
    lower.includes("malformed") ||
    lower.includes("bad request") ||
    lower.includes("already been used")
  ) {
    return "재설정 링크가 올바르지 않습니다. 메일에 있는 링크를 다시 눌렀는지, 주소가 잘리지 않았는지 확인해 주세요."
  }

  return toUserFacingActionError(
    error,
    "재설정 링크를 처리하지 못했습니다. 비밀번호 찾기를 다시 시도하거나, 다른 브라우저·시크릿 창이 아닌지 확인해 주세요."
  )
}

