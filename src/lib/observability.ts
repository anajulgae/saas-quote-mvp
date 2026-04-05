/**
 * 오류·이벤트 추적 연결 포인트.
 * Sentry 등을 붙일 때 이 함수들만 구현하면 클라이언트·서버 공통 진입점으로 씁니다.
 */

export function reportClientError(message: string, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.warn("[reportClientError]", message, context ?? {})
  }
  // TODO: Sentry.captureException / analytics
}

export function reportServerError(message: string, context?: Record<string, unknown>) {
  console.error("[reportServerError]", message, context ?? {})
  // TODO: Sentry.captureMessage, log drain
}
