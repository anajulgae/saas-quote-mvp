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
          settings?: { displayMode?: string; theme?: string }
          items?: { priceId: string; quantity: number }[]
          customer?: { email: string }
          customData?: Record<string, string>
          transactionId?: string
        }) => void
      }
    }
  }
}

// Paddle.Initialize() 는 페이지(탭) 당 1회. 성공 여부도 저장.
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
    s.onerror = () => reject(new Error("Paddle.js CDN 로드 실패 (네트워크 확인)"))
    document.head.appendChild(s)
  })
}

export function PaddleCheckoutLauncher({
  plan,
  priceId,
  userId,
  email,
}: {
  plan: BillingPlan
  priceId: string
  userId: string
  email: string
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

    // ── 필수값 사전 검증 ─────────────────────────────────────────
    if (!token) {
      setError("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN 이 비어 있습니다. .env.local 을 확인하세요.")
      setPhase("error")
      return
    }
    if (!priceId) {
      setError("Paddle Price ID 가 없습니다. BILLING_PADDLE_PRICE_*_MONTHLY 를 확인하세요.")
      setPhase("error")
      return
    }

    const go = async () => {
      try {
        // ── 1. paddle.js 로드 ──────────────────────────────────
        setPhase("loading")
        await loadPaddleScript()

        if (!window.Paddle) {
          throw new Error("Paddle.js 가 로드됐지만 window.Paddle 이 없습니다.")
        }

        // ── 2. 환경 설정 + Initialize (1회) ───────────────────
        window.Paddle.Environment.set(env)

        if (!paddleReady) {
          window.Paddle.Initialize({
            token,
            eventCallback: (data) => {
              const name = data.name ?? ""
              console.log("[Paddle event]", name, data)
              if (name === "checkout.completed") {
                window.location.href = `/billing?plan=${encodeURIComponent(plan)}`
              }
            },
          })
          paddleReady = true
        }

        // ── 3. 체크아웃 오버레이 열기 ─────────────────────────
        setPhase("opening")
        window.Paddle.Checkout.open({
          settings: {
            displayMode: "overlay",
            theme: "light",
          },
          items: [{ priceId, quantity: 1 }],
          customer: { email },
          customData: { user_id: userId, plan },
        })
        setPhase("open")
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error("[Paddle checkout error]", e)
        setError(msg)
        setPhase("error")
        paddleReady = false // 실패 시 다음 시도에서 재초기화
      }
    }

    void go()
  }, [email, env, plan, priceId, token, userId])

  const phaseText: Record<string, string> = {
    loading: "Paddle.js 를 불러오는 중…",
    opening: "결제 창을 여는 중…",
    open: "결제 창이 열렸습니다. 화면 위 오버레이를 확인하세요.",
    error: "",
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 p-6">
      <h1 className="text-xl font-semibold">카드 정보 입력</h1>

      {phase === "error" && error ? (
        <div className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">결제 창을 열지 못했습니다</p>
          <p className="text-xs text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground">
            F12 → Console 탭에 더 자세한 오류가 있습니다.
            <br />
            클라이언트 토큰은 Paddle 대시보드 → Developer tools → Authentication → Client-side tokens 에서 전체 복사해야 합니다.
          </p>
          <button
            type="button"
            className={buttonVariants({ variant: "default", size: "sm" })}
            onClick={() => {
              ran.current = false
              paddleReady = false
              setPhase("loading")
              setError(null)
              setTimeout(() => {
                ran.current = false
              }, 0)
              window.location.reload()
            }}
          >
            다시 시도
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{phaseText[phase]}</p>
      )}

      <Link href="/billing" className={buttonVariants({ variant: "outline", size: "sm" })}>
        ← 요금 페이지로
      </Link>
    </div>
  )
}
