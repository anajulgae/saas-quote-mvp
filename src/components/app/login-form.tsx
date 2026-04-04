"use client"

import { useActionState } from "react"
import { LoaderCircle, LockKeyhole, Sparkles } from "lucide-react"

import { loginAction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type DemoUiVariant = "none" | "local-sandbox" | "public-review"

export function LoginForm({
  defaultEmail,
  defaultPassword,
  demoUiVariant,
}: {
  defaultEmail: string
  defaultPassword: string
  demoUiVariant: DemoUiVariant
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
            {demoUiVariant === "local-sandbox" ? (
              <>고객 문의부터 견적, 청구, 수금 리마인드까지 한 번에 관리하세요.</>
            ) : demoUiVariant === "public-review" ? (
              <>
                <strong className="text-foreground">테스트용 데모</strong> 계정으로 로그인하면 실제 DB 없이 샘플 데이터만
                표시됩니다. 운영 계정·데이터와 분리되어 있습니다.
              </>
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
        {demoUiVariant === "local-sandbox" ? (
          <div className="rounded-xl border border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">로컬 데모 (Supabase 미설정)</p>
            <p className="mt-1">아래 값으로 바로 시도할 수 있습니다. 운영 DB와 무관한 샘플 데이터입니다.</p>
            <p className="mt-2 font-mono text-xs text-foreground">
              {defaultEmail} / {defaultPassword}
            </p>
          </div>
        ) : null}
        {demoUiVariant === "public-review" ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-950 dark:text-amber-100">
            <p className="font-medium">외부 점검용 데모</p>
            <p className="mt-1 opacity-90">
              이메일: <span className="font-mono text-xs">{defaultEmail}</span>
            </p>
            <p className="mt-2 opacity-90">
              비밀번호는 <strong>운영자가 안전한 채널로만</strong> 전달받은 값을 입력하세요. 페이지에 비밀번호를 적지
              마세요.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
