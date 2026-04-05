"use client"

import { useActionState, useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2, KeyRound, LoaderCircle, Mail } from "lucide-react"

import {
  type RequestPasswordResetState,
  requestPasswordResetAction,
} from "@/app/actions"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { AuthLegalLinks } from "@/components/app/auth-legal-links"
import { authCardClass, authFooterLinkClass, authIconBoxClass } from "@/lib/auth-ui"
import { cn } from "@/lib/utils"

type SentInfo = { email: string; maskedEmail: string }

function ForgotPasswordFormInner({ onTryAnother }: { onTryAnother: () => void }) {
  const [state, formAction, isPending] = useActionState<
    RequestPasswordResetState,
    FormData
  >(requestPasswordResetAction, undefined)

  const [lastSuccess, setLastSuccess] = useState<SentInfo | null>(null)

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      setLastSuccess({ email: state.email, maskedEmail: state.maskedEmail })
    }
  }, [state])

  const successInfo: SentInfo | null =
    state && "ok" in state && state.ok
      ? { email: state.email, maskedEmail: state.maskedEmail }
      : lastSuccess

  const resendError = state && "error" in state ? state.error : undefined

  if (successInfo) {
    return (
      <Card className={authCardClass}>
        <CardHeader className="space-y-3 pb-2">
          <div className={authIconBoxClass}>
            <CheckCircle2 className="size-5" aria-hidden />
          </div>
          <CardTitle className="text-xl font-semibold tracking-tight">재설정 메일을 보냈습니다</CardTitle>
          <CardDescription className="space-y-2 text-sm leading-relaxed text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">{successInfo.maskedEmail}</span> 로 비밀번호
              재설정 링크를 보냈습니다. 메일을 연 뒤{" "}
              <span className="font-medium text-foreground">‘비밀번호 재설정’ 링크를 눌러</span> 이
              브라우저에서 새 비밀번호 입력 화면으로 이동합니다.
            </p>
            <p className="text-xs leading-relaxed">
              다음 단계: 메일 앱 → 링크 클릭 → 새 비밀번호 입력·저장 → 로그인. 도착까지{" "}
              <span className="text-foreground/90">1~2분</span> 걸릴 수 있으며, 보이지 않으면{" "}
              <span className="text-foreground/90">스팸·프로모션함</span>도 확인해 주세요.
            </p>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-0">
          {resendError ? (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {resendError}
            </p>
          ) : null}
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="email" value={successInfo.email} />
            <Button
              type="submit"
              variant="default"
              className="inline-flex h-11 w-full items-center justify-center gap-2 text-base font-semibold"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <LoaderCircle className="size-4 shrink-0 animate-spin" aria-hidden />
                  발송 중…
                </>
              ) : (
                <>
                  <Mail className="size-4 shrink-0" aria-hidden />
                  재설정 메일 다시 보내기
                </>
              )}
            </Button>
          </form>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full"
              onClick={() => {
                setLastSuccess(null)
                onTryAnother()
              }}
            >
              다른 이메일로 시도
            </Button>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "inline-flex h-10 w-full items-center justify-center text-muted-foreground"
              )}
            >
              로그인으로
            </Link>
          </div>
          <p className="border-t border-border/50 pt-4 text-center">
            <Link href="/login" className={authFooterLinkClass}>
              로그인 화면으로 돌아가기
            </Link>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={authCardClass}>
      <CardHeader className="space-y-2 pb-4">
        <div className={authIconBoxClass}>
          <KeyRound className="size-5" aria-hidden />
        </div>
        <div className="space-y-1.5 pt-1">
          <CardTitle className="text-2xl font-semibold tracking-tight">비밀번호 찾기</CardTitle>
          <CardDescription className="text-sm leading-relaxed text-muted-foreground">
            가입·로그인에 사용한 이메일을 정확히 입력해 주세요. 전송 후 1~2분 안에 메일이 도착할 수
            있으며, 스팸함도 확인해 주세요.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="reset-email" className="text-sm font-medium text-foreground">
              이메일
            </label>
            <Input
              id="reset-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@company.kr"
              required
              className="h-11"
              aria-invalid={Boolean(
                state && "error" in state && !("ok" in state) && state.invalidEmail === true
              )}
            />
          </div>
          {state && "error" in state ? (
            <p
              className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {state.error}
            </p>
          ) : null}
          <Button
            type="submit"
            className="inline-flex h-11 w-full items-center justify-center gap-2 text-base font-semibold"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <LoaderCircle className="size-4 shrink-0 animate-spin" aria-hidden />
                전송 중…
              </>
            ) : (
              <>
                <Mail className="size-4 shrink-0" aria-hidden />
                재설정 링크 보내기
              </>
            )}
          </Button>
        </form>
        <p className="border-t border-border/50 pt-4 text-center">
          <Link href="/login" className={authFooterLinkClass}>
            로그인 화면으로 돌아가기
          </Link>
        </p>
        <AuthLegalLinks className="pt-3 text-center text-[11px] leading-relaxed text-muted-foreground" />
      </CardContent>
    </Card>
  )
}

export function ForgotPasswordForm() {
  const [formKey, setFormKey] = useState(0)
  return (
    <ForgotPasswordFormInner key={formKey} onTryAnother={() => setFormKey((k) => k + 1)} />
  )
}
