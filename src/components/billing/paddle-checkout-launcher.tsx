"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button-variants"
import type { BillingPlan } from "@/types/domain"

declare global {
  interface Window {
    Paddle?: {
      Environment: { set: (env: "sandbox" | "production") => void }
      Initialize: (opts: {
        token: string
        eventCallback?: (data: { name?: string; detail?: unknown }) => void
      }) => void
      Checkout: {
        open: (opts: {
          settings?: { displayMode?: string; theme?: string; locale?: string }
          transactionId?: string
          items?: { priceId: string; quantity: number }[]
          customer?: { email: string; address?: { countryCode: string } }
          customData?: Record<string, string>
        }) => void
      }
    }
  }
}

let paddleReady = false

function loadPaddleScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (window.Paddle) return Promise.resolve()

  const url = "https://cdn.paddle.com/paddle/v2/paddle.js"
  const existing = document.querySelector(`script[src="${url}"]`)
  if (existing && window.Paddle) return Promise.resolve()

  return new Promise<void>((resolve, reject) => {
    if (existing) {
      existing.addEventListener("load", () => (window.Paddle ? resolve() : reject(new Error("Paddle 객체 없음"))), { once: true })
      existing.addEventListener("error", () => reject(new Error("Paddle.js 로드 실패")), { once: true })
      return
    }
    const s = document.createElement("script")
    s.src = url
    s.async = true
    s.onload = () => (window.Paddle ? resolve() : reject(new Error("Paddle 객체 없음")))
    s.onerror = () => reject(new Error("Paddle.js CDN 로드 실패"))
    document.head.appendChild(s)
  })
}

export function PaddleCheckoutLauncher({
  plan,
  priceId,
  userId,
  email,
  transactionId,
}: {
  plan: BillingPlan
  priceId: string
  userId: string
  email: string
  transactionId?: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<"loading" | "opening" | "open" | "error">("loading")
  const ran = useRef(false)
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim() ?? ""
  const envRaw = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT?.trim().toLowerCase() ?? ""
  const env: "sandbox" | "production" =
    envRaw === "production" || envRaw === "live"
      ? "production"
      : token.startsWith("test_")
        ? "sandbox"
        : "production"

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    if (!token) {
      setError("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN 이 비어 있습니다.")
      setPhase("error")
      return
    }

    const go = async () => {
      try {
        setPhase("loading")
        await loadPaddleScript()

        if (!window.Paddle) {
          throw new Error("Paddle.js 로드 후 window.Paddle 없음")
        }

        window.Paddle.Environment.set(env)

        if (!paddleReady) {
          window.Paddle.Initialize({
            token,
            eventCallback: (data) => {
              const name = data.name ?? ""
              console.log("[Paddle event]", name, JSON.stringify(data))
              if (name === "checkout.completed") {
                window.location.href = `/billing?plan=${encodeURIComponent(plan)}`
              }
              if (name === "checkout.error" || name === "checkout.warning") {
                console.warn("[Paddle]", name, data)
              }
            },
          })
          paddleReady = true
        }

        setPhase("opening")

        if (transactionId) {
          // 서버에서 생성한 트랜잭션으로 체크아웃 열기 (권장)
          window.Paddle.Checkout.open({
            settings: { displayMode: "overlay", theme: "light", locale: "ko" },
            transactionId,
          })
        } else {
          // 폴백: 클라이언트에서 직접 items 전달
          window.Paddle.Checkout.open({
            settings: { displayMode: "overlay", theme: "light", locale: "ko" },
            items: [{ priceId, quantity: 1 }],
            customer: { email, address: { countryCode: "KR" } },
            customData: { user_id: userId, plan },
          })
        }

        setPhase("open")
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error("[Paddle checkout error]", e)
        setError(msg)
        setPhase("error")
        paddleReady = false
      }
    }

    void go()
  }, [email, env, plan, priceId, token, transactionId, userId])

  return (
    <div className="mx-auto max-w-lg space-y-5 p-6">
      <h1 className="text-xl font-semibold">카드 정보 입력</h1>

      {phase === "error" && error ? (
        <div className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">결제 창을 열지 못했습니다</p>
          <p className="text-xs text-muted-foreground">{error}</p>
          <button
            type="button"
            className={buttonVariants({ variant: "default", size: "sm" })}
            onClick={() => window.location.reload()}
          >
            다시 시도
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {phase === "loading" && "결제 시스템을 불러오는 중…"}
          {phase === "opening" && "결제 창을 여는 중…"}
          {phase === "open" && "결제 창이 열렸습니다. 화면 위 오버레이를 확인하세요."}
        </p>
      )}

      <Link href="/billing" className={buttonVariants({ variant: "outline", size: "sm" })}>
        ← 요금 페이지로
      </Link>
    </div>
  )
}
