"use client"

import { useActionState } from "react"
import Link from "next/link"
import { LoaderCircle, Mail } from "lucide-react"

import { resendSignupConfirmationAction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export function SignupCheckEmailPanel() {
  const [state, formAction, isPending] = useActionState(resendSignupConfirmationAction, undefined)

  return (
    <Card className="border-border/80 bg-background/95 shadow-md ring-1 ring-border/40">
      <CardHeader className="space-y-2 pb-2">
        <div className="flex size-11 items-center justify-center rounded-xl bg-foreground text-background">
          <Mail className="size-5" aria-hidden />
        </div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          가입 완료 · 다음 단계
        </p>
        <CardTitle className="text-xl font-semibold tracking-tight">이메일 인증을 마쳐 주세요</CardTitle>
        <CardDescription className="text-sm leading-relaxed text-muted-foreground">
          방금 가입하신 주소로 인증 메일을 보냈습니다. 메일의 링크를 눌러 인증을 완료한 뒤, 로그인
          화면에서 접속하면 대시보드로 이어집니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ol className="list-inside list-decimal space-y-1.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
          <li className="text-foreground">
            <span className="font-medium">메일함</span>에서 발신 메일을 엽니다.
          </li>
          <li>
            <span className="font-medium text-foreground">인증 링크</span>를 눌러 완료합니다.
          </li>
          <li>
            이 화면을 닫고 <span className="font-medium text-foreground">로그인</span>으로 들어갑니다.
          </li>
        </ol>
        <form action={formAction} className="space-y-3">
          <p className="text-sm font-medium text-foreground">메일이 오지 않았나요?</p>
          <div className="space-y-2">
            <label htmlFor="resend-email" className="sr-only">
              이메일
            </label>
            <Input
              id="resend-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="가입에 사용한 이메일"
              required
              className="h-11"
            />
          </div>
          {state?.error ? (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          {state?.ok ? (
            <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
              인증 메일을 다시 보냈습니다. 메일함을 확인해 주세요.
            </p>
          ) : null}
          <Button type="submit" variant="outline" className="h-10 w-full" disabled={isPending}>
            {isPending ? (
              <>
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
                발송 중…
              </>
            ) : (
              "인증 메일 다시 보내기"
            )}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            로그인으로 돌아가기
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
