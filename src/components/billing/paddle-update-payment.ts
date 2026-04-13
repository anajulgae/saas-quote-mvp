"use client"

/**
 * Paddle 결제 수단 업데이트 전용 – transactionId 로 오버레이를 연다.
 * billing-console-client 에서 dynamic import 하여 사용.
 */

const PADDLE_JS_URL = "https://cdn.paddle.com/paddle/v2/paddle.js"

let initialized = false

function ensureScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (window.Paddle) return Promise.resolve()

  const existing = document.querySelector(`script[src="${PADDLE_JS_URL}"]`)
  if (existing && window.Paddle) return Promise.resolve()

  return new Promise((resolve, reject) => {
    if (existing) {
      existing.addEventListener("load", () => (window.Paddle ? resolve() : reject()), { once: true })
      existing.addEventListener("error", () => reject(), { once: true })
      return
    }
    const s = document.createElement("script")
    s.src = PADDLE_JS_URL
    s.async = true
    s.onload = () => (window.Paddle ? resolve() : reject())
    s.onerror = () => reject()
    document.head.appendChild(s)
  })
}

export async function openPaddleUpdatePayment(transactionId: string) {
  await ensureScript()
  if (!window.Paddle) throw new Error("Paddle.js 로드 실패")

  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim() ?? ""
  const envRaw = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT?.trim().toLowerCase() ?? ""
  const env: "sandbox" | "production" =
    envRaw === "production" || envRaw === "live"
      ? "production"
      : token.startsWith("test_")
        ? "sandbox"
        : "production"

  window.Paddle.Environment.set(env)

  if (!initialized) {
    window.Paddle.Initialize({
      token,
      eventCallback: (data) => {
        const name = data.name ?? ""
        console.log("[Paddle update-payment event]", name, data)
        if (name === "checkout.completed") {
          window.location.href = "/billing"
        }
      },
    })
    initialized = true
  }

  window.Paddle.Checkout.open({
    settings: { displayMode: "overlay", theme: "light" },
    transactionId,
  })
}
