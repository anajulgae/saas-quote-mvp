/**
 * 오류·이벤트 추적 연결 포인트.
 *
 * - **현재**: `reportServerError` / `reportClientError` 는 **JSON 한 줄**을 콘솔에 남깁니다.
 *   Vercel·CloudWatch·Datadog 등 로그 드레인에서 파싱하기 좋은 형식입니다.
 * - **Sentry 등**: 아래 함수 본문에 SDK 호출을 추가하면 전역 진입점 하나로 연결할 수 있습니다.
 */

function safeJsonLine(payload: Record<string, unknown>): string {
  try {
    return JSON.stringify(payload)
  } catch {
    return JSON.stringify({
      kind: "bill_io_log_serialize_error",
      ts: new Date().toISOString(),
    })
  }
}

export function reportClientError(message: string, context?: Record<string, unknown>) {
  const payload: Record<string, unknown> = {
    kind: "bill_io_client_error",
    message,
    ts: new Date().toISOString(),
    ...context,
  }
  if (typeof window !== "undefined") {
    payload.path = window.location?.pathname
  }
  const line = safeJsonLine(payload)
  if (process.env.NODE_ENV === "development") {
    console.warn(line)
  } else {
    console.error(line)
  }
  // Sentry: Sentry.captureException(new Error(message), { extra: context })
}

export function reportServerError(message: string, context?: Record<string, unknown>) {
  const line = safeJsonLine({
    kind: "bill_io_server_error",
    message,
    ts: new Date().toISOString(),
    ...context,
  })
  console.error(line)
  // Sentry: Sentry.captureMessage(message, { level: "error", extra: context })
}
