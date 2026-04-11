import type { Metadata } from "next"
import Link from "next/link"
import { CheckCircle2, CircleDot } from "lucide-react"

import { LoginForm } from "@/components/app/login-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button-variants"
import { getDemoCredentials, isSupabaseConfigured } from "@/lib/auth"
import { isDemoLoginEnabled, showLoginReviewHints } from "@/lib/demo-flags"
import { authSplitOuterClass } from "@/lib/auth-ui"
import { sanitizeLoginNextPath } from "@/lib/safe-login-redirect"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "로그인",
  description:
    "Bill-IO 계정으로 로그인해 대시보드에서 문의·견적·청구·알림과 AI 운영 보조를 이어서 관리하세요.",
  alternates: { canonical: "/login" },
  openGraph: {
    title: "Bill-IO 로그인",
    description: "견적·청구·수금·AI 보조를 한곳에서 이어서 진행합니다.",
    type: "website",
  },
  robots: { index: true, follow: true },
}

const valueBullets = [
  "고객 문의부터 견적·청구·수금까지 한 흐름으로 관리합니다.",
  "선금·잔금·미수 상태를 한눈에 추적합니다.",
  "오늘 처리할 후속 조치를 정리해 놓치지 않게 합니다.",
]

type LoginPageProps = {
  searchParams?: Promise<{ error?: string; reset?: string; next?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const sp = (await searchParams) ?? {}
  const redirectAfterLogin = sanitizeLoginNextPath(sp.next)
  const demoCredentials = getDemoCredentials()
  const supabaseConfigured = isSupabaseConfigured()
  const demoAllowed = isDemoLoginEnabled()
  const deploymentBlocked = !supabaseConfigured && !demoAllowed
  const publicDemoOffered = demoAllowed && supabaseConfigured
  const localDemoSandbox = demoAllowed && !supabaseConfigured
  const reviewHints = showLoginReviewHints()

  const reviewHintsMode = deploymentBlocked
    ? ("off" as const)
    : !reviewHints
      ? ("off" as const)
      : localDemoSandbox
        ? ("local-sandbox" as const)
        : publicDemoOffered
          ? ("public-review" as const)
          : ("off" as const)

  const defaultEmail =
    reviewHints && (localDemoSandbox || publicDemoOffered) ? demoCredentials.email : ""
  const defaultPassword = reviewHints && localDemoSandbox ? demoCredentials.password : ""

  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim()
  const authCallbackError =
    sp.error === "auth"
      ? "인증 링크 처리에 실패했습니다. 메일의 링크를 다시 열거나 로그인을 시도해 주세요."
      : undefined
  const passwordResetDone = sp.reset === "success"
  const showAccountLinks = supabaseConfigured && !deploymentBlocked

  return (
    <div className={authSplitOuterClass}>
      <div className="mx-auto grid min-h-screen max-w-6xl items-start gap-8 lg:grid-cols-[1fr_min(100%,420px)] lg:items-center lg:gap-12">
        <section
          id="value-prop"
          className="order-2 space-y-6 pb-6 lg:order-1 lg:pb-0 lg:pr-4"
        >
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <CircleDot className="size-3 shrink-0 fill-primary text-primary" aria-hidden />
            견적·청구·수금을 한 화면에서
          </div>
          <div className="space-y-3">
            <h1 className="max-w-md text-3xl font-semibold tracking-tight text-balance sm:max-w-xl sm:text-4xl">
              소규모 사업자를 위한
              <br className="hidden sm:block" />
              <span className="text-balance"> 견적·청구·수금 관리</span>
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              문의부터 견적·청구·입금까지 한 흐름으로 이어 관리합니다.
            </p>
          </div>
          <ul className="max-w-md space-y-2.5 rounded-2xl border border-border/70 bg-background/85 p-4 shadow-sm">
            {valueBullets.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm leading-snug text-foreground">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="max-w-md border-t border-border/60 pt-4 text-xs leading-relaxed text-muted-foreground">
            국내 1인 사업자·소규모 서비스업을 염두에 둔 견적·청구 관리입니다. 데이터는 본인 계정
            기준으로 안전하게 분리됩니다.
          </p>
          <div className="space-y-2 pt-1">
            <p className="text-xs text-muted-foreground">
              로그인은 오른쪽에서 진행합니다.
            </p>
            <div className="flex flex-wrap gap-2">
              {supabaseConfigured && !deploymentBlocked ? (
                <Link
                  href="/signup"
                  className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-9")}
                >
                  무료로 시작하기
                </Link>
              ) : null}
              {contactEmail ? (
                <a
                  href={`mailto:${contactEmail}?subject=${encodeURIComponent("도입 문의")}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "h-9 border-border/80 bg-background/80 text-muted-foreground"
                  )}
                >
                  도입 문의
                </a>
              ) : null}
            </div>
          </div>
        </section>

        <section className="order-1 w-full max-w-md justify-self-center lg:order-2 lg:justify-self-end">
          {deploymentBlocked ? (
            <Card className="border-destructive/25 bg-destructive/5 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">로그인을 사용할 수 없습니다</CardTitle>
                <CardDescription>
                  인증 환경이 구성되지 않았습니다. 관리자에게 환경 설정을 요청하세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                <p>
                  Supabase 연결(
                  <code className="rounded bg-muted px-1 py-0.5 font-mono">
                    NEXT_PUBLIC_SUPABASE_URL
                  </code>
                  ,{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono">
                    NEXT_PUBLIC_SUPABASE_ANON_KEY
                  </code>
                  )을 설정하거나, 내부 스테이징에서 허용된 방식으로 로그인을 활성화해야 합니다.
                </p>
                <p className="text-[11px]">
                  로컬 개발 전용 안내가 필요하면 환경 변수{" "}
                  <code className="rounded bg-muted px-1 font-mono">LOGIN_REVIEW_HINTS=true</code> 로 리뷰
                  모드를 켤 수 있습니다.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <LoginForm
                defaultEmail={defaultEmail}
                defaultPassword={defaultPassword}
                reviewHintsMode={reviewHintsMode}
                authCallbackError={authCallbackError}
                passwordResetNotice={passwordResetDone}
                showAccountLinks={showAccountLinks}
                redirectAfterLogin={redirectAfterLogin}
              />
              {!showAccountLinks && contactEmail ? (
                <p className="text-center text-xs text-muted-foreground">
                  도입 문의:{" "}
                  <a
                    href={`mailto:${contactEmail}?subject=${encodeURIComponent("도입 문의")}`}
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    메일 보내기
                  </a>
                </p>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
