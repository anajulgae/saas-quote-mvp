"use client"

import { useActionState } from "react"
import Link from "next/link"
import { LoaderCircle, Mail } from "lucide-react"

import { resendSignupConfirmationAction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { authCardClass, authFooterLinkClass, authIconBoxClass } from "@/lib/auth-ui"

export function SignupCheckEmailPanel({
  prefillEmail = "",
  maskedEmail = null,
}: {
  /** URL 등에서 넘긴 가입 이메일(재전송 입력 기본값) */
  prefillEmail?: string
  /** 표시용 마스킹 주소 */
  maskedEmail?: string | null
}) {
  const [state, formAction, isPending] = useActionState(resendSignupConfirmationAction, undefined)

  return (
    <Card className={authCardClass}>
      <CardHeader className="space-y-3 pb-2">
        <div className={authIconBoxClass}>
          <Mail className="size-5" aria-hidden />
        </div>
        <div className="rounded-lg border border-primary/18 bg-primary/[0.07] px-3 py-2.5 text-sm leading-snug text-foreground">
          <p className="font-semibold text-primary">가입이 거의 완료되었습니다</p>
          <p className="mt-1 text-xs text-muted-foreground">
            마지막 단계로 이메일 인증만 진행해 주세요. 인증 후 로그인하면 바로 서비스를 이용할 수
            있습니다.
          </p>
        </div>
        <CardTitle className="text-xl font-semibold tracking-tight">이메일 인증을 마쳐 주세요</CardTitle>
        <CardDescription className="text-sm leading-relaxed text-muted-foreground">
          {maskedEmail ? (
            <>
              인증 메일을 보냈습니다. 확인 주소:{" "}
              <span className="font-medium text-foreground">{maskedEmail}</span>
            </>
          ) : (
            <>가입에 사용하신 주소로 인증 메일을 보냈습니다.</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ol className="list-inside list-decimal space-y-1.5 text-sm leading-snug text-muted-foreground">
          <li>
            <span className="text-foreground">받은편지함</span>에서 인증 메일을 확인합니다.
          </li>
          <li>
            메일의 <span className="text-foreground">인증 링크</span>를 누릅니다.
          </li>
          <li>
            인증이 끝나면 <span className="text-foreground">로그인</span>합니다.
          </li>
        </ol>

        <p className="text-xs leading-relaxed text-muted-foreground">
          메일 도착까지 <span className="text-foreground/90">1~2분</span> 정도 걸릴 수 있습니다.
          보이지 않으면 <span className="text-foreground/90">스팸·프로모션함</span>도 확인해 주세요.
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          인증 링크가 <span className="text-foreground/90">만료</span>되었거나 오류가 나면, 아래에서 같은 주소로
          메일을 다시 보낸 뒤 새 링크를 열어 주세요.
        </p>

        <div className="rounded-lg border border-dashed border-border/80 bg-muted/15 px-3 py-3 text-center text-sm">
          <p className="text-muted-foreground">이미 인증을 마치셨나요?</p>
          <Link
            href="/login"
            className="mt-1 inline-block font-semibold text-foreground underline-offset-4 hover:underline"
          >
            로그인하기
          </Link>
        </div>

        <div className="space-y-3 border-t border-border/60 pt-5">
          <p className="text-sm font-semibold text-foreground">메일을 받지 못하셨나요?</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            가입에 사용한 이메일 주소를 아래에 입력하면 인증 메일을 다시 보냅니다. 주소를 잘못
            입력했다면{" "}
            <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
              회원가입
            </Link>
            을 처음부터 다시 시도해 주세요.
          </p>
          <form action={formAction} className="space-y-3">
            <div className="space-y-2">
              <label htmlFor="resend-email" className="text-sm font-medium text-foreground">
                이메일
              </label>
              <Input
                id="resend-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="name@company.kr"
                defaultValue={prefillEmail}
                required
                className="h-11"
              />
            </div>
            {state?.error ? (
              <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.error}
              </p>
            ) : null}
            {state?.ok ? (
              <p className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
                인증 메일을 다시 보냈습니다. 잠시 후 메일함을 확인해 주세요.
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
                  발송 중…
                </>
              ) : (
                <>
                  <Mail className="size-4 shrink-0" aria-hidden />
                  인증 메일 다시 보내기
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="border-t border-border/50 pt-4 text-center">
          <Link href="/login" className={authFooterLinkClass}>
            로그인 화면으로 돌아가기
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
