/**
 * BYOA 메시징: 사용자가 지정한 HTTP 엔드포인트로 JSON POST.
 * 각 알림톡 사업자(Solapi, NHN 등) API 형식이 다르므로, 사용자 측 프록시/웹훅이
 * 이 페이로드를 받아 실제 공급사 API로 변환하는 것을 전제로 합니다.
 */

export type BillIoMessagingPayloadV1 = {
  billIoVersion: 1
  channelKind: "kakao_alimtalk"
  senderKey: string
  templateCode: string
  recipientPhone: string
  variables: Record<string, string>
}

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^\[::1?\]$/,
  /^169\.254\.\d+\.\d+$/,
  /\.internal$/i,
  /\.local$/i,
]

function isBlockedHost(hostname: string): boolean {
  return BLOCKED_HOST_PATTERNS.some((p) => p.test(hostname))
}

export async function postBillIoMessagingPayload(params: {
  endpoint: string
  headerName: string
  headerValue: string
  payload: BillIoMessagingPayloadV1
  timeoutMs?: number
}): Promise<{ ok: true; status: number; bodyPreview: string } | { ok: false; error: string }> {
  const url = params.endpoint.trim()
  if (!url.startsWith("https://")) {
    return { ok: false, error: "엔드포인트는 https:// 로 시작해야 합니다." }
  }

  try {
    const parsed = new URL(url)
    if (isBlockedHost(parsed.hostname)) {
      return { ok: false, error: "내부 네트워크 주소는 사용할 수 없습니다." }
    }
  } catch {
    return { ok: false, error: "유효하지 않은 URL입니다." }
  }

  const timeoutMs = Math.min(Math.max(params.timeoutMs ?? 25_000, 5000), 60_000)
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  const hn = params.headerName.trim() || "Authorization"
  headers[hn] = params.headerValue.trim()

  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(params.payload),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (e) {
    const name = e instanceof Error ? e.name : ""
    if (name === "TimeoutError" || name === "AbortError") {
      return { ok: false, error: "연결 시간이 초과되었습니다." }
    }
    return { ok: false, error: e instanceof Error ? e.message : "요청에 실패했습니다." }
  }

  const text = await res.text()
  const bodyPreview = text.slice(0, 500)
  if (!res.ok) {
    return {
      ok: false,
      error: `발송 API 응답 ${res.status}. ${bodyPreview || "(본문 없음)"}`,
    }
  }

  return { ok: true, status: res.status, bodyPreview }
}
