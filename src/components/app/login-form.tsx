"use client"

import { useActionState } from "react"
import Link from "next/link"
import { LoaderCircle, LockKeyhole } from "lucide-react"

import { loginAction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export function LoginForm({
  defaultEmail,
  defaultPassword,
  reviewHintsMode,
  authCallbackError,
  showAccountLinks,
}: {
  defaultEmail: string
  defaultPassword: string
  /** 리뷰/개발 전용: 데모 안내 블록 표시 (LOGIN_REVIEW_HINTS) */
  reviewHintsMode: "off" | "local-sandbox" | "public-review"
  /** 이메일 인증/콜백 실패 등 */
  authCallbackError?: string
  /** Supabase 가입·재설정 링크 (운영 경로) */
  showAccountLinks?: boolean
}) {
  const [state, formAction, isPending] = useActionState(loginAction, undefined)

  return (
    <Card
      id="login-form"
      className="border-border/80 bg-background/95 shadow-md ring-1 ring-border/40"
    >
      <CardHeader className="space-y-2 pb-4">
        <div className="flex size-11 items-center justify-center rounded-xl bg-foreground text-background">
          <LockKeyhole className="size-5" aria-hidden />
        </div>
        <div className="space-y-1.5 pt-1">
          <CardTitle className="text-2xl font-semibold tracking-tight">로그인</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            계정에 로그인해 견적·청구·수금 흐름을 이어서 관리하세요.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        {authCallbackError ? (
          <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {authCallbackError}
          </p>
        ) : null}
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              이메일
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@company.kr"
              defaultValue={defaultEmail}
              required
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              비밀번호
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              defaultValue={defaultPassword}
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
                로그인 중…
              </>
            ) : (
              <>
                <LockKeyhole className="size-4" aria-hidden />
                로그인
              </>
            )}
          </Button>
        </form>
        {showAccountLinks ? (
          <div className="space-y-3 border-t border-border/60 pt-4 text-center text-sm">
            <Link
              href="/forgot-password"
              className="block text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              비밀번호를 잊으셨나요?
            </Link>
            <p className="text-muted-foreground">
              계정이 없으신가요?{" "}
              <Link
                href="/signup"
                className="font-semibold text-foreground underline-offset-4 hover:underline"
              >
                무료로 시작하기
              </Link>
            </p>
          </div>
        ) : null}
        {reviewHintsMode === "local-sandbox" ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">개발 모드 안내</p>
            <p className="mt-1 leading-snug">
              Supabase 미연결 환경입니다. 아래는 로컬 검증용입니다.
            </p>
            <p className="mt-2 font-mono text-[11px] text-foreground">
              {defaultEmail} / {defaultPassword}
            </p>
          </div>
        ) : null}
        {reviewHintsMode === "public-review" ? (
          <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-3 text-xs text-amber-950 dark:text-amber-100">
            <p className="font-semibold">리뷰·스테이징 전용</p>
            <p className="mt-1 leading-snug opacity-95">
              데모 이메일: <span className="font-mono">{defaultEmail}</span>
            </p>
            <p className="mt-1.5 leading-snug opacity-90">
              비밀번호는 안전한 채널로 전달받은 값만 입력하세요.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
