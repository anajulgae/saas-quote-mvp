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
          <CardDescription className="text-sm leading-relaxed">
            새 비밀번호를 입력하고 저장하면 바로 서비스를 이용할 수 있습니다.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="new-password" className="text-sm font-medium text-foreground">
              새 비밀번호
            </label>
            <Input
              id="new-password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="8자 이상"
              required
              minLength={8}
              className="h-11"
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
              placeholder="비밀번호 재입력"
              required
              minLength={8}
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
                저장 중…
              </>
            ) : (
              "비밀번호 저장"
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
