"use client"

import { useActionState } from "react"
import Link from "next/link"
import { KeyRound, LoaderCircle } from "lucide-react"

import { requestPasswordResetAction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, undefined)

  return (
    <Card className="border-border/80 bg-background/95 shadow-md ring-1 ring-border/40">
      <CardHeader className="space-y-2 pb-4">
        <div className="flex size-11 items-center justify-center rounded-xl bg-foreground text-background">
          <KeyRound className="size-5" aria-hidden />
        </div>
        <div className="space-y-1.5 pt-1">
          <CardTitle className="text-2xl font-semibold tracking-tight">비밀번호 찾기</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            가입에 사용한 이메일을 입력하세요. 재설정 링크가 메일로 전송됩니다.
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
            />
          </div>
          {state?.error ? (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <Button type="submit" className="h-11 w-full text-base font-semibold" disabled={isPending}>
            {isPending ? (
              <>
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
                전송 중…
              </>
            ) : (
              "재설정 링크 보내기"
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
