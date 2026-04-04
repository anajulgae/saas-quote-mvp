"use client"

import { useActionState } from "react"
import Link from "next/link"
import { LoaderCircle, UserPlus } from "lucide-react"

import { signupAction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { authCardClass, authIconBoxClass } from "@/lib/auth-ui"

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
          <CardDescription className="text-sm leading-relaxed text-muted-foreground">
            제출 후 인증 메일이 발송됩니다. 메일의 링크로 인증을 마친 뒤 로그인해 주세요.
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
            <div className="flex flex-wrap items-baseline justify-between gap-1">
              <label htmlFor="signup-businessName" className="text-sm font-medium text-foreground">
                사업장명 <span className="font-normal text-muted-foreground">(선택)</span>
              </label>
            </div>
            <p className="text-xs leading-snug text-muted-foreground">
              비워 두면 이름이 사업장명으로 저장됩니다. 청구서·견적에 쓰일 표기입니다.
            </p>
            <Input
              id="signup-businessName"
              name="businessName"
              type="text"
              autoComplete="organization"
              placeholder="예: 스튜디오 오션"
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
          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
            <p
              id="signup-password-hint"
              className="text-xs leading-relaxed text-muted-foreground"
            >
              <span className="font-medium text-foreground">비밀번호 조건</span>
              <br />
              8자 이상 필수이며, 영문과 숫자를 함께 쓰는 것을 권장합니다.
            </p>
            <div className="space-y-2">
              <label htmlFor="signup-password" className="text-sm font-medium text-foreground">
                비밀번호
              </label>
              <Input
                id="signup-password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="8자 이상 입력"
                required
                minLength={8}
                className="h-11 bg-background"
                aria-describedby="signup-password-hint"
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
                placeholder="위와 동일하게 입력"
                required
                minLength={8}
                className="h-11 bg-background"
                aria-describedby="signup-password-hint"
              />
            </div>
          </div>
          {state?.error ? (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
                가입 처리 중…
              </>
            ) : (
              <>
                <UserPlus className="size-4 shrink-0" aria-hidden />
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
