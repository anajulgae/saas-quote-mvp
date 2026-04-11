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
          settings?: {
            displayMode?: string
            variant?: string
            theme?: string
            locale?: string
          }
          items: { priceId: string; quantity: number }[]
          customer?: { email: string }
          customData?: Record<string, string>
        }) => void
      }
    }
  }
}

function paddleScriptUrl() {
  return "https://cdn.paddle.com/paddle/v2/paddle.js"
}

function getPaddleEnvironment(): "sandbox" | "production" {
  const raw = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT?.trim().toLowerCase()
  if (raw === "production" || raw === "live") return "production"
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim() ?? ""
  return token.startsWith("test_") ? "sandbox" : "production"
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
  const opened = useRef(false)
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim() ?? ""

  useEffect(() => {
    if (!token || !priceId) {
      setError("Paddle 클라이언트 토큰 또는 price id가 없습니다. 환경 변수를 확인하세요.")
      return
    }
    if (opened.current) return
    opened.current = true

    let cancelled = false
    const run = async () => {
      try {
        if (!window.Paddle) {
          await new Promise<void>((resolve, reject) => {
            const existing = document.querySelector(`script[src="${paddleScriptUrl()}"]`)
            if (existing) {
              if (window.Paddle) {
                resolve()
                return
              }
              if ((existing as HTMLScriptElement).dataset.paddleLoaded === "1") {
                resolve()
                return
              }
              existing.addEventListener("load", () => resolve(), { once: true })
              existing.addEventListener("error", () => reject(new Error("Paddle.js 로드 실패")), { once: true })
              return
            }
            const s = document.createElement("script")
            s.src = paddleScriptUrl()
            s.async = true
            s.onload = () => {
              s.dataset.paddleLoaded = "1"
              resolve()
            }
            s.onerror = () => reject(new Error("Paddle.js 로드 실패"))
            document.head.appendChild(s)
          })
        }
        if (cancelled || !window.Paddle) {
          setError("Paddle.js 를 초기화할 수 없습니다.")
          return
        }
        const env = getPaddleEnvironment()
        window.Paddle.Environment.set(env)
        window.Paddle.Initialize({
          token,
          eventCallback: (ev) => {
            if (ev.name === "checkout.completed") {
              window.location.href = `/billing?plan=${encodeURIComponent(plan)}`
            }
          },
        })
        // displayMode 미지정 시 오버레이가 뜨지 않을 수 있음 — Paddle 문서 권장
        window.Paddle.Checkout.open({
          settings: {
            displayMode: "overlay",
            variant: "one-page",
            theme: "light",
          },
          items: [{ priceId, quantity: 1 }],
          customer: { email },
          customData: {
            user_id: userId,
            plan,
          },
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : "체크아웃을 열지 못했습니다.")
      }
    }
    void run()
    return () => {
      cancelled = true
      opened.current = false
    }
  }, [email, plan, priceId, token, userId])

  return (
    <div className="mx-auto max-w-lg space-y-4 p-6">
      <h1 className="text-lg font-semibold">Paddle 결제</h1>
      <p className="text-sm text-muted-foreground">
        체크아웃 창이 열리지 않으면 팝업 차단을 해제하거나, Paddle 대시보드에서 기본 결제 링크·클라이언트 토큰을 확인하세요.
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : <p className="text-sm text-muted-foreground">체크아웃을 준비하는 중…</p>}
      <Link href="/billing" className={buttonVariants({ variant: "outline", size: "sm" })}>
        요금 페이지로 돌아가기
      </Link>
    </div>
  )
}
