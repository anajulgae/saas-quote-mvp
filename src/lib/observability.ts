/**
 * 오류·이벤트 추적 연결 포인트.
 *
 * - JSON 한 줄 로그: Vercel·CloudWatch·Datadog 등 로그 드레인에서 파싱하기 좋은 형식.
 * - Sentry 등 APM 연동 시: NEXT_PUBLIC_SENTRY_DSN env를 설정하고
 *   아래 주석을 해제하면 전역 진입점 하나로 연결됩니다.
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
}

export function reportServerError(message: string, context?: Record<string, unknown>) {
  const line = safeJsonLine({
    kind: "bill_io_server_error",
    message,
    ts: new Date().toISOString(),
    ...context,
  })
  console.error(line)
}

/**
 * APM 연동 준비 가이드:
 *
 * 1. `npm install @sentry/nextjs` 실행
 * 2. `sentry.client.config.ts` / `sentry.server.config.ts` 생성
 * 3. NEXT_PUBLIC_SENTRY_DSN env 설정
 * 4. reportClientError/reportServerError 에 Sentry.captureException 호출 추가
 * 5. next.config.ts에 withSentryConfig 래핑
 */
