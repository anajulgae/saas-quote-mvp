/**
 * 비밀번호 재설정 메일 요청: 이메일당 분당 횟수 제한 (프로세스 메모리 기준).
 * 서버리스/다중 인스턴스에서는 인스턴스별로 따로 집계됩니다.
 */
const WINDOW_MS = 60_000
const MAX_ATTEMPTS = 5

const buckets = new Map<string, number[]>()

export const PASSWORD_RESET_RATE_LIMIT_USER_MESSAGE =
  "같은 이메일로는 1분에 최대 5번까지 재설정 메일을 요청할 수 있습니다. 잠시 후 다시 시도해 주세요."

export function consumePasswordResetRateSlot(
  email: string
): { ok: true } | { ok: false; message: string } {
  const key = email.toLowerCase().trim()
  const now = Date.now()
  let times = buckets.get(key) ?? []
  times = times.filter((t) => now - t < WINDOW_MS)
  if (times.length >= MAX_ATTEMPTS) {
    return { ok: false, message: PASSWORD_RESET_RATE_LIMIT_USER_MESSAGE }
  }
  times.push(now)
  buckets.set(key, times)
  return { ok: true }
}
