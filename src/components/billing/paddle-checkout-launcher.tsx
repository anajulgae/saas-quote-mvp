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
        pwCustomer?: { id: string } | Record<string, never>
        checkout?: {
          settings: {
            displayMode?: string
            variant?: string
            theme?: string
            locale?: string
            frameTarget?: string
            frameInitialHeight?: string
            frameStyle?: string
          }
        }
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

/** Paddle.Initialize() 는 문서상 페이지당 1회 — Strict Mode 이중 마운트 대비 */
let paddleInitializeDone = false

let paddleScriptPromise: Promise<void> | null = null

function paddleScriptUrl() {
  return "https://cdn.paddle.com/paddle/v2/paddle.js"
}

function getPaddleEnvironment(): "sandbox" | "production" {
  const raw = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT?.trim().toLowerCase()
  if (raw === "production" || raw === "live") return "production"
  const tok = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim() ?? ""
  return tok.startsWith("test_") ? "sandbox" : "production"
}

function loadPaddleScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (window.Paddle) return Promise.resolve()
  if (paddleScriptPromise) return paddleScriptPromise

  paddleScriptPromise = new Promise<void>((resolve, reject) => {
    const url = paddleScriptUrl()
    const existing = document.querySelector(`script[src="${url}"]`)
    if (existing) {
      const done = () => {
        if (window.Paddle) resolve()
        else reject(new Error("Paddle.js 로드 후에도 Paddle 객체가 없습니다."))
      }
      if (window.Paddle) {
        done()
        return
      }
      existing.addEventListener("load", done, { once: true })
      existing.addEventListener("error", () => reject(new Error("Paddle.js 로드 실패")), { once: true })
      return
    }
    const s = document.createElement("script")
    s.src = url
    s.async = true
    s.onload = () => {
      if (window.Paddle) resolve()
      else reject(new Error("Paddle.js 로드 후에도 Paddle 객체가 없습니다."))
    }
    s.onerror = () => reject(new Error("Paddle.js 로드 실패"))
    document.head.appendChild(s)
  })
  return paddleScriptPromise
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
  const [status, setStatus] = useState<string>("Paddle.js 를 불러오는 중…")
  const lastRedirectPlan = useRef<string | null>(null)
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim() ?? ""

  useEffect(() => {
    if (!token || !priceId) {
      setError("Paddle 클라이언트 토큰 또는 price id가 없습니다. 환경 변수를 확인하세요.")
      return
    }

    let cancelled = false

    const run = async () => {
      try {
        await loadPaddleScript()
        if (cancelled || !window.Paddle) {
          setError("Paddle.js 를 초기화할 수 없습니다.")
          return
        }

        const env = getPaddleEnvironment()
        window.Paddle.Environment.set(env)

        // 공식 문서: Initialize 는 페이지당 1회. overlay 기본값은 여기서 지정.
        if (!paddleInitializeDone) {
          window.Paddle.Initialize({
            token,
            pwCustomer: {},
            checkout: {
              settings: {
                displayMode: "overlay",
                theme: "light",
              },
            },
            eventCallback: (data) => {
              const name = data.name ?? ""
              if (name === "checkout.completed") {
                const p = lastRedirectPlan.current ?? plan
                window.location.href = `/billing?plan=${encodeURIComponent(p)}`
              }
              if (name === "checkout.error" || name === "checkout.warning") {
                console.warn("[Paddle]", name, data)
              }
            },
          })
          paddleInitializeDone = true
        }

        if (cancelled) return

        lastRedirectPlan.current = plan
        setStatus("결제 창을 여는 중…")

        window.Paddle.Checkout.open({
          items: [{ priceId, quantity: 1 }],
          customer: { email },
          customData: {
            user_id: userId,
            plan,
          },
        })

        setStatus("결제 창이 열렸습니다. 안 보이면 스크롤·다른 탭·차단 프로그램을 확인하세요.")
      } catch (e) {
        const msg = e instanceof Error ? e.message : "체크아웃을 열지 못했습니다."
        setError(msg)
        console.error("[Paddle checkout]", e)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [email, plan, priceId, token, userId])

  return (
    <div className="mx-auto max-w-lg space-y-4 p-6">
      <h1 className="text-lg font-semibold">Paddle 결제</h1>
      <p className="text-sm text-muted-foreground">
        아래 상태가 바뀌지 않거나 빨간 오류가 나오면 브라우저 개발자 도구(F12) → Console 탭의 메시지를 확인하세요. 클라이언트 토큰은 반드시 Paddle 대시보드에서 복사한{" "}
        <strong className="text-foreground">전체</strong> 문자열이어야 합니다.
      </p>
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <p className="text-sm text-muted-foreground">{status}</p>
      )}
      <Link href="/billing" className={buttonVariants({ variant: "outline", size: "sm" })}>
        요금 페이지로 돌아가기
      </Link>
    </div>
  )
}
