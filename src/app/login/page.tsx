import { CheckCircle2, CircleDot, FileText, Wallet } from "lucide-react"

import { LoginForm } from "@/components/app/login-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getDemoCredentials, isSupabaseConfigured } from "@/lib/auth"
import { isDemoLoginEnabled } from "@/lib/demo-flags"

const highlights = [
  "문의 등록 후 바로 고객 타임라인으로 연결",
  "AI 보조 초안으로 견적 작성 속도 단축",
  "선금/잔금 청구와 미수 리마인드 추적",
]

export default function LoginPage() {
  const demoCredentials = getDemoCredentials()
  const supabaseConfigured = isSupabaseConfigured()
  const demoAllowed = isDemoLoginEnabled()
  const isDemoMode = !supabaseConfigured && demoAllowed
  const deploymentBlocked = !supabaseConfigured && !demoAllowed

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ffffff,#f4f4f5_55%,#eef2ff)]">
      <div className="mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-4 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <section className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-sm text-muted-foreground">
            <CircleDot className="size-3.5 fill-emerald-500 text-emerald-500" />
            국내 1인 사업자를 위한 실전형 견적-청구 SaaS
          </div>
          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance md:text-5xl">
              고객 문의부터 미수금 리마인드까지 끊기지 않는 업무 흐름
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              영상 제작자, 디자이너, 청소/설치/수리 소상공인을 위한 한국형
              견적-청구-수금 관리 앱입니다.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-background/90 p-5">
              <FileText className="size-5 text-foreground" />
              <p className="mt-4 text-sm font-medium">견적 발송 흐름</p>
              <p className="mt-1 text-sm text-muted-foreground">
                문의에서 견적까지 한 화면에서 연결
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/90 p-5">
              <Wallet className="size-5 text-foreground" />
              <p className="mt-4 text-sm font-medium">입금 추적</p>
              <p className="mt-1 text-sm text-muted-foreground">
                선금, 잔금, 미수 상태를 직관적으로 확인
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/90 p-5">
              <CheckCircle2 className="size-5 text-foreground" />
              <p className="mt-4 text-sm font-medium">후속조치 관리</p>
              <p className="mt-1 text-sm text-muted-foreground">
                오늘 해야 할 연락과 리마인드를 놓치지 않음
              </p>
            </div>
          </div>
          <div className="space-y-3 rounded-3xl border border-border/70 bg-background/80 p-6">
            {highlights.map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="mx-auto w-full max-w-md space-y-4">
          {deploymentBlocked ? (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-lg">배포 설정 필요</CardTitle>
                <CardDescription>
                  Supabase URL/키가 없고, 프로덕션에서는 데모 로그인이 기본 비활성화되어 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Vercel 등에{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">
                    NEXT_PUBLIC_SUPABASE_URL
                  </code>{" "}
                  와{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">
                    NEXT_PUBLIC_SUPABASE_ANON_KEY
                  </code>{" "}
                  를 설정하거나, 스테이징에서만{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">
                    ENABLE_DEMO_LOGIN=true
                  </code>{" "}
                  로 데모를 켜 주세요.
                </p>
              </CardContent>
            </Card>
          ) : (
            <LoginForm
              defaultEmail={demoCredentials.email}
              defaultPassword={demoCredentials.password}
              isDemoMode={isDemoMode}
            />
          )}
        </section>
      </div>
    </div>
  )
}
