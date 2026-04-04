"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { LoaderCircle } from "lucide-react"

import { UpdatePasswordForm } from "@/components/app/update-password-form"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { authCardClass } from "@/lib/auth-ui"
import { toRecoveryExchangeError } from "@/lib/action-errors"
import { createBrowserSupabaseClient } from "@/lib/supabase/browser"
import { cn } from "@/lib/utils"

type Phase = "working" | "ready" | "blocked"

function decodeOAuthErrorDescription(raw: string | null): string | undefined {
  if (!raw) return undefined
  try {
    return decodeURIComponent(raw.replace(/\+/g, " "))
  } catch {
    return raw.replace(/\+/g, " ")
  }
}

function ResetPasswordFlowInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchKey = searchParams.toString()
  const [phase, setPhase] = useState<Phase>("working")
  const [blockMessage, setBlockMessage] = useState("")

  useEffect(() => {
    let cancelled = false

    const finishBlocked = (msg: string) => {
      if (!cancelled) {
        setBlockMessage(msg)
        setPhase("blocked")
      }
    }

    const finishReady = () => {
      if (!cancelled) setPhase("ready")
    }

    void (async () => {
      const supabase = createBrowserSupabaseClient()

      const oauthError = searchParams.get("error")
      if (oauthError) {
        const desc = decodeOAuthErrorDescription(searchParams.get("error_description"))
        finishBlocked(
          desc ??
            "인증 링크가 거절되었습니다. 비밀번호 찾기를 다시 진행하거나, 같은 브라우저에서 링크를 열었는지 확인해 주세요."
        )
        return
      }

      const code = searchParams.get("code")
      const token_hash = searchParams.get("token_hash")
      const type = searchParams.get("type")

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          const { data: retrySession } = await supabase.auth.getSession()
          if (retrySession.session?.user) {
            router.replace("/reset-password")
            finishReady()
            return
          }
          finishBlocked(toRecoveryExchangeError(exchangeError))
          return
        }
        router.replace("/reset-password")
        const { data: after } = await supabase.auth.getSession()
        if (!after.session?.user) {
          finishBlocked(
            "세션을 만들지 못했습니다. 쿠키·추적 방지 설정을 확인한 뒤, 메일 링크를 다시 열어 주세요."
          )
          return
        }
        finishReady()
        return
      }

      if (token_hash && type) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email",
        })
        if (otpError) {
          finishBlocked(toRecoveryExchangeError(otpError))
          return
        }
        router.replace("/reset-password")
        finishReady()
        return
      }

      if (typeof window !== "undefined" && window.location.hash.length > 1) {
        const params = new URLSearchParams(window.location.hash.slice(1))
        const access_token = params.get("access_token")
        const refresh_token = params.get("refresh_token")
        if (access_token && refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          })
          if (sessionError) {
            finishBlocked(toRecoveryExchangeError(sessionError))
            return
          }
          router.replace("/reset-password")
          finishReady()
          return
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user) {
        finishReady()
        return
      }

      finishBlocked(
        "유효한 재설정 세션이 없습니다. 메일의 링크를 이 브라우저에서 열었는지 확인해 주세요. 링크는 시간이 지나면 만료되며, 이미 비밀번호를 바꾼 경우에는 다시 ‘비밀번호 찾기’를 이용해 주세요."
      )
    })()

    return () => {
      cancelled = true
    }
  }, [router, searchKey])

  if (phase === "working") {
    return (
      <Card className={authCardClass}>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-14">
          <LoaderCircle className="size-9 animate-spin text-muted-foreground" aria-hidden />
          <p className="text-center text-sm text-muted-foreground">재설정 링크를 확인하는 중…</p>
        </CardContent>
      </Card>
    )
  }

  if (phase === "blocked") {
    return (
      <Card className={authCardClass}>
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl font-semibold tracking-tight">비밀번호를 재설정할 수 없습니다</CardTitle>
          <CardDescription className="text-sm leading-relaxed text-muted-foreground">
            {blockMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href="/forgot-password" className={cn(buttonVariants({ variant: "default" }), "h-10")}>
            비밀번호 찾기
          </Link>
          <Link href="/login" className={cn(buttonVariants({ variant: "outline" }), "h-10")}>
            로그인
          </Link>
        </CardContent>
      </Card>
    )
  }

  return <UpdatePasswordForm />
}

export function ResetPasswordFlow() {
  return (
    <Suspense
      fallback={
        <Card className={authCardClass}>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-14">
            <LoaderCircle className="size-9 animate-spin text-muted-foreground" aria-hidden />
            <p className="text-center text-sm text-muted-foreground">화면을 불러오는 중…</p>
          </CardContent>
        </Card>
      }
    >
      <ResetPasswordFlowInner />
    </Suspense>
  )
}
