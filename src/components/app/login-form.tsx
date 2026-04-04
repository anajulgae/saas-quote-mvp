"use client"

import { useActionState } from "react"
import { LoaderCircle, LockKeyhole, Sparkles } from "lucide-react"

import { loginAction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export function LoginForm({
  defaultEmail,
  defaultPassword,
  isDemoMode,
}: {
  defaultEmail: string
  defaultPassword: string
  isDemoMode: boolean
}) {
  const [state, formAction, isPending] = useActionState(loginAction, undefined)

  return (
    <Card className="border-border/70 bg-background/95 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-foreground text-background">
          <Sparkles className="size-5" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-2xl">로그인</CardTitle>
          <CardDescription>
            {isDemoMode ? (
              <>고객 문의부터 견적, 청구, 수금 리마인드까지 한 번에 관리하세요.</>
            ) : (
              <>
                로그인 후 <strong className="text-foreground">대시보드</strong>에서 시작 순서를 확인한 다음,{" "}
                <strong className="text-foreground">고객 → 문의 → 견적 → 청구</strong> 순으로 입력해 보세요.
              </>
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              이메일
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@company.kr"
              defaultValue={defaultEmail}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              비밀번호
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              defaultValue={defaultPassword}
              required
            />
          </div>
          {state?.error ? (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                로그인 중...
              </>
            ) : (
              <>
                <LockKeyhole className="size-4" />
                이메일로 로그인
              </>
            )}
          </Button>
        </form>
        {isDemoMode ? (
          <div className="rounded-xl border border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">데모 모드</p>
            <p className="mt-1">Supabase 환경변수가 없으면 데모 세션으로 바로 테스트할 수 있습니다.</p>
            <p className="mt-2 font-mono text-xs text-foreground">
              {defaultEmail} / {defaultPassword}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
