import type { Metadata } from "next"
import Link from "next/link"
import { CheckCircle2, CircleDot } from "lucide-react"

import { SignupForm } from "@/components/app/signup-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { authSplitOuterClass } from "@/lib/auth-ui"
import { isSupabaseConfigured } from "@/lib/auth"
import { isDemoLoginEnabled } from "@/lib/demo-flags"

export const metadata: Metadata = {
  title: "무료 회원가입",
  description:
    "Bill-IO에 가입하고 문의·견적·청구·수금을 한 흐름으로 시작하세요. Pro에서 AI 운영 분석·풀 견적·수금 문구까지 이어집니다. 메일 인증 후 바로 로그인할 수 있습니다.",
  alternates: { canonical: "/signup" },
  openGraph: {
    title: "Bill-IO 무료 회원가입",
    description:
      "소규모 사업자용 운영 플랫폼. 몇 분 만에 계정을 만들고, Pro에서 AI 운영·견적·수금 보조까지 이어집니다.",
    type: "website",
  },
  robots: { index: true, follow: true },
}

const bullets = [
  "가입 후 받은 메일에서 인증만 마치면 바로 로그인할 수 있습니다.",
  "문의·견적·청구 흐름을 대시보드에서 이어서 시작합니다.",
  "사업장 정보와 연락처는 설정에서 언제든 바꿀 수 있습니다.",
]

export default function SignupPage() {
  const supabaseConfigured = isSupabaseConfigured()
  const demoAllowed = isDemoLoginEnabled()
  const blocked = !supabaseConfigured

  return (
    <div className={authSplitOuterClass}>
      <div className="mx-auto grid min-h-screen max-w-6xl items-start gap-8 lg:grid-cols-[1fr_min(100%,420px)] lg:items-center lg:gap-12">
        <section className="order-2 space-y-5 pb-6 lg:order-1 lg:pb-0 lg:pr-4">
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <CircleDot className="size-3 shrink-0 fill-primary text-primary" aria-hidden />
            무료로 시작하기
          </div>
          <div className="space-y-2">
            <h1 className="max-w-md text-2xl font-semibold tracking-tight text-balance sm:max-w-xl sm:text-3xl">
              몇 분이면 충분합니다.
              <br className="hidden sm:block" />{" "}
              <span className="text-balance">계정을 만들고 바로 시작하세요</span>
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              제출 후 안내 메일이 갑니다. 메일 속 링크로 인증을 완료한 뒤 로그인하면 됩니다.
            </p>
          </div>
          <div className="max-w-md rounded-xl border border-border/80 bg-background/90 px-4 py-3 text-xs leading-relaxed text-muted-foreground shadow-sm">
            <p className="font-medium text-foreground">가입 후 진행 순서</p>
            <ol className="mt-2 list-inside list-decimal space-y-1">
              <li>오른쪽 양식 작성 후 제출</li>
              <li>이메일함에서 인증 링크 확인(스팸함 포함)</li>
              <li>인증 완료 후 로그인 → 대시보드</li>
            </ol>
          </div>
          <ul className="max-w-md space-y-2 rounded-2xl border border-border/70 bg-background/85 p-4 shadow-sm">
            {bullets.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm leading-snug text-foreground">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              로그인
            </Link>
          </p>
        </section>

        <section className="order-1 w-full max-w-md justify-self-center lg:order-2 lg:justify-self-end">
          {blocked ? (
            <Card className="border-destructive/25 bg-destructive/5 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">회원가입을 사용할 수 없습니다</CardTitle>
                <CardDescription>
                  Supabase 인증이 연결되어 있어야 온라인 가입을 제공할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Vercel 프로젝트(Production·Preview)에{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                    NEXT_PUBLIC_SUPABASE_URL
                  </code>{" "}
                  ·{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                    NEXT_PUBLIC_SUPABASE_ANON_KEY
                  </code>
                  를 넣어야 합니다.{" "}
                  <a
                    href="https://www.bill-io.com"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    www.bill-io.com
                  </a>{" "}
                  운영 배포와 동일한 Supabase 값을 복사하면 됩니다.
                </p>
                <p className="text-xs">
                  인증 리다이렉트 기준 URL은{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                    NEXT_PUBLIC_SITE_URL
                  </code>
                  로 두거나 비워 두면 프로덕션에서는{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                    https://www.bill-io.com
                  </code>
                  을 씁니다. Supabase Redirect URLs에 해당 주소의{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">/auth/callback</code> 등이
                  등록돼 있어야 합니다.
                </p>
                {demoAllowed ? (
                  <p>
                    로컬에서는 데모 로그인으로 앱을 둘러볼 수 있습니다.{" "}
                    <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
                      로그인
                    </Link>
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <div className="w-full space-y-4">
              <SignupForm />
              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                계정을 만들면{" "}
                <Link href="/terms" className="font-medium text-foreground underline-offset-4 hover:underline">
                  이용약관
                </Link>
                과{" "}
                <Link href="/privacy" className="font-medium text-foreground underline-offset-4 hover:underline">
                  개인정보처리방침
                </Link>
                에 동의한 것으로 처리됩니다.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
