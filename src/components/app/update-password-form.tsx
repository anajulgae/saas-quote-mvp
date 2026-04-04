"use client"

import { useActionState } from "react"
import Link from "next/link"
import { CheckCircle2, LoaderCircle, LockKeyhole } from "lucide-react"

import { type UpdatePasswordState, updatePasswordAction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { authCardClass, authFooterLinkClass, authIconBoxClass } from "@/lib/auth-ui"
import { cn } from "@/lib/utils"

export function UpdatePasswordForm() {
  const [state, formAction, isPending] = useActionState<UpdatePasswordState, FormData>(
    updatePasswordAction,
    undefined
  )

  if (state && "ok" in state && state.ok) {
    return (
      <Card className={authCardClass}>
        <CardHeader className="space-y-3 pb-2">
          <div className={authIconBoxClass}>
            <CheckCircle2 className="size-5" aria-hidden />
          </div>
          <CardTitle className="text-xl font-semibold tracking-tight">비밀번호가 변경되었습니다</CardTitle>
          <CardDescription className="text-sm leading-relaxed text-muted-foreground">
            보안을 위해 재설정용 세션은 종료되었습니다. 새 비밀번호로 다시 로그인해 주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <Link
            href="/login?reset=success"
            className={cn(buttonVariants({ variant: "default" }), "inline-flex h-11 w-full items-center justify-center text-base font-semibold")}
          >
            로그인으로 이동
          </Link>
          <p className="border-t border-border/50 pt-4 text-center">
            <Link href="/login" className={authFooterLinkClass}>
              로그인 화면
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
          <LockKeyhole className="size-5" aria-hidden />
        </div>
        <div className="space-y-1.5 pt-1">
          <CardTitle className="text-2xl font-semibold tracking-tight">새 비밀번호 설정</CardTitle>
          <CardDescription className="text-sm leading-relaxed text-muted-foreground">
            아래에 새 비밀번호를 입력하고 저장하세요. 저장이 완료되면 다시 로그인하게 됩니다.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        <form action={formAction} className="space-y-4">
          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
            <p
              id="update-password-hint"
              className="text-xs leading-relaxed text-muted-foreground"
            >
              <span className="font-medium text-foreground">비밀번호 조건</span>
              <br />
              8자 이상 필수이며, 영문과 숫자를 함께 쓰는 것을 권장합니다.
            </p>
            <div className="space-y-2">
              <label htmlFor="new-password" className="text-sm font-medium text-foreground">
                새 비밀번호
              </label>
              <Input
                id="new-password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="8자 이상 입력"
                required
                minLength={8}
                className="h-11 bg-background"
                aria-describedby="update-password-hint"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="new-password-confirm" className="text-sm font-medium text-foreground">
                새 비밀번호 확인
              </label>
              <Input
                id="new-password-confirm"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="위와 동일하게 입력"
                required
                minLength={8}
                className="h-11 bg-background"
                aria-describedby="update-password-hint"
              />
            </div>
          </div>
          {state && "error" in state ? (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <Button type="submit" className="h-11 w-full text-base font-semibold" disabled={isPending}>
            {isPending ? (
              <>
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
                저장 중…
              </>
            ) : (
              "비밀번호 저장"
            )}
          </Button>
        </form>
        <p className="border-t border-border/50 pt-4 text-center">
          <Link href="/login" className={authFooterLinkClass}>
            로그인 화면으로
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
