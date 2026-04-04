"use client"

import { useActionState } from "react"
import Link from "next/link"
import { LoaderCircle, LockKeyhole } from "lucide-react"

import { updatePasswordAction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export function UpdatePasswordForm() {
  const [state, formAction, isPending] = useActionState(updatePasswordAction, undefined)

  return (
    <Card className="border-border/80 bg-background/95 shadow-md ring-1 ring-border/40">
      <CardHeader className="space-y-2 pb-4">
        <div className="flex size-11 items-center justify-center rounded-xl bg-foreground text-background">
          <LockKeyhole className="size-5" aria-hidden />
        </div>
        <div className="space-y-1.5 pt-1">
          <CardTitle className="text-2xl font-semibold tracking-tight">새 비밀번호 설정</CardTitle>
          <CardDescription className="text-sm leading-relaxed text-muted-foreground">
            재설정 메일의 링크를 통해 들어온 경우에만 이 화면을 사용할 수 있습니다. 저장하면 로그인된
            상태로 대시보드로 이동합니다.
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
          {state?.error ? (
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
          <Link
            href="/login"
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            로그인 화면으로
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
