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
        <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-foreground">
          <Mail className="size-5" aria-hidden />
        </div>
        <CardTitle className="text-xl font-semibold tracking-tight">이메일을 확인해 주세요</CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          가입하신 주소로 인증 메일을 보냈습니다. 메일의 링크를 눌러 인증을 완료한 뒤 로그인할 수
          있습니다. 메일이 보이지 않으면 스팸함을 확인해 주세요.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          인증을 마치면 자동으로 서비스에 들어가며, 프로필과 사업장 정보는 가입 시 입력한 값으로
          초기화됩니다.
        </div>
        <form action={formAction} className="space-y-3">
          <p className="text-sm font-medium text-foreground">인증 메일을 받지 못하셨나요?</p>
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
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
          {state?.ok ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">인증 메일을 다시 보냈습니다.</p>
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
