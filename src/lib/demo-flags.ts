/**
 * true이면 로그인 화면에 데모 계정 안내·프리필 등 리뷰/내부용 블록을 노출합니다.
 * 운영 기본값은 false — 로컬·스테이징에서만 .env 에 LOGIN_REVIEW_HINTS=true 로 켭니다.
 * 서버 전용 env만 사용 — 클라이언트에 노출되지 않습니다.
 */
export function showLoginReviewHints(): boolean {
  const v = process.env.LOGIN_REVIEW_HINTS
  return v === "true" || v === "1"
}

/**
 * 프로덕션에서 데모 로그인·데모 세션을 끄려면 ENABLE_DEMO_LOGIN 을 설정하지 않거나 false 로 둡니다.
 * 로컬/스테이징에서는 기본적으로(Supabase 미설정 시) 데모를 허용해 개발 편의를 유지합니다.
 */
export function isDemoLoginEnabled(): boolean {
  const explicit = process.env.ENABLE_DEMO_LOGIN?.toLowerCase()
  if (explicit === "true" || explicit === "1") {
    return true
  }
  if (explicit === "false" || explicit === "0") {
    return false
  }

  if (process.env.NODE_ENV === "production") {
    return false
  }

  return true
}

const MIN_DEMO_PASSWORD_LEN = 16

/** 프로덕션에서 공개 데모 비밀번호 최소 요건 충족 여부 (loginAction에서 사용) */
export function isDemoPasswordStrongEnoughForProduction(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true
  }
  const p = process.env.DEMO_LOGIN_PASSWORD ?? ""
  return p.length >= MIN_DEMO_PASSWORD_LEN
}
