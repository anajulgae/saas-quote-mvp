"use client"

import { useActionState } from "react"
import Link from "next/link"
import { LoaderCircle, UserPlus } from "lucide-react"

import { signupAction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signupAction, undefined)

  return (
    <Card
      id="signup-form"
      className="border-border/80 bg-background/95 shadow-md ring-1 ring-border/40"
    >
      <CardHeader className="space-y-2 pb-4">
        <div className="flex size-11 items-center justify-center rounded-xl bg-foreground text-background">
          <UserPlus className="size-5" aria-hidden />
        </div>
        <div className="space-y-1.5 pt-1">
          <CardTitle className="text-2xl font-semibold tracking-tight">회원가입</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            무료로 시작하고, 견적·청구·수금을 한곳에서 관리하세요.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="signup-fullName" className="text-sm font-medium text-foreground">
              이름
            </label>
            <Input
              id="signup-fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              placeholder="홍길동"
              required
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="signup-businessName" className="text-sm font-medium text-foreground">
              사업장명 <span className="font-normal text-muted-foreground">(선택)</span>
            </label>
            <Input
              id="signup-businessName"
              name="businessName"
              type="text"
              autoComplete="organization"
              placeholder="비어 있으면 이름으로 설정됩니다"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="signup-email" className="text-sm font-medium text-foreground">
              이메일
            </label>
            <Input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@company.kr"
              required
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="signup-password" className="text-sm font-medium text-foreground">
              비밀번호
            </label>
            <Input
              id="signup-password"
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
            <label htmlFor="signup-confirm" className="text-sm font-medium text-foreground">
              비밀번호 확인
            </label>
            <Input
              id="signup-confirm"
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
                가입 처리 중…
              </>
            ) : (
              <>
                <UserPlus className="size-4" aria-hidden />
                무료로 시작하기
              </>
            )}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            로그인
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
