import Link from "next/link"
import { CheckCircle2, CircleDot } from "lucide-react"

import { SignupForm } from "@/components/app/signup-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { isSupabaseConfigured } from "@/lib/auth"
import { isDemoLoginEnabled } from "@/lib/demo-flags"

const bullets = [
  "가입 후 바로 문의·견적·청구 흐름을 시작할 수 있습니다.",
  "사업장명과 연락처는 설정에서 언제든 수정할 수 있습니다.",
  "데이터는 계정별로 분리되어 저장됩니다.",
]

export default function SignupPage() {
  const supabaseConfigured = isSupabaseConfigured()
  const demoAllowed = isDemoLoginEnabled()
  const blocked = !supabaseConfigured

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ffffff,#f4f4f5_50%,#eef2ff)]">
      <div className="mx-auto grid min-h-screen max-w-6xl items-start gap-8 px-4 py-8 sm:py-10 lg:grid-cols-[1fr_min(100%,420px)] lg:items-center lg:gap-12 lg:px-8">
        <section className="order-2 space-y-5 pb-6 lg:order-1 lg:pb-0 lg:pr-4">
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <CircleDot className="size-3 shrink-0 fill-emerald-500 text-emerald-500" aria-hidden />
            무료로 시작하기
          </div>
          <div className="space-y-2">
            <h1 className="max-w-xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              몇 분 만에 계정을 만들고 운영을 시작하세요
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              이메일 인증 후 로그인하면 대시보드에서 바로 업무를 이어갈 수 있습니다.
            </p>
          </div>
          <ul className="max-w-md space-y-2 rounded-2xl border border-border/70 bg-background/85 p-4 shadow-sm">
            {bullets.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm leading-snug text-foreground">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
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
                  관리자에게{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                    NEXT_PUBLIC_SUPABASE_URL
                  </code>{" "}
                  및{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                    NEXT_PUBLIC_SUPABASE_ANON_KEY
                  </code>{" "}
                  설정을 요청하세요.
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
            <SignupForm />
          )}
        </section>
      </div>
    </div>
  )
}
