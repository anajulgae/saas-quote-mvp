import type { Metadata } from "next"
import Link from "next/link"

import { BillingConsoleClient } from "@/components/billing/billing-console-client"
import { buttonVariants } from "@/components/ui/button-variants"
import { getAppSession } from "@/lib/auth"
import {
  BILLING_UPGRADE_CONTACT_COPY,
  FEATURE_GATES_AFTER_PAYMENT,
  PLAN_LABEL,
  PLAN_PRICE_KRW_MONTH,
  PLAN_TAGLINE,
  SUPPORT_EMAIL_ENV,
} from "@/lib/billing/catalog"
import { getBillingConsoleData } from "@/lib/data"
import { cn } from "@/lib/utils"
import type { BillingPlan } from "@/types/domain"

export const metadata: Metadata = {
  title: "요금제·구독 관리",
  description:
    "Bill-IO Starter·Pro·Business 요금제, 7일 Pro 체험, AI·포털·발송 한도, 구독 변경·해지. 로그인 시 구독 콘솔을 사용할 수 있습니다.",
  alternates: { canonical: "/billing" },
  openGraph: {
    title: "Bill-IO 요금제·구독",
    description: "7일 체험 후 월 구독. 플랜별 AI·포털·랜딩·세금계산서 범위를 확인하세요.",
    type: "website",
  },
  robots: { index: true, follow: true },
}

const tiers: BillingPlan[] = ["starter", "pro", "business"]

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>
}) {
  const sp = await searchParams
  const highlight = sp.plan === "pro" || sp.plan === "business" || sp.plan === "starter"
  const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim()
  const supportEmail = process.env[SUPPORT_EMAIL_ENV]?.trim()

  const session = await getAppSession()
  const consoleData =
    session?.mode === "supabase" || session?.mode === "demo" ? await getBillingConsoleData() : null

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto max-w-3xl space-y-10">
        <p className="flex flex-wrap gap-2">
          <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 px-2")}>
            ← 홈
          </Link>
          <Link href="/help" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 px-2")}>
            고객센터
          </Link>
        </p>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">요금제·구독</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{BILLING_UPGRADE_CONTACT_COPY}</p>
          <p className="mt-3 rounded-xl border border-primary/20 bg-primary/[0.05] px-4 py-3 text-sm font-medium text-foreground">
            신규 가입 시 <strong>7일간 Pro 기능·한도</strong>로 체험합니다. 체험 종료 후에는 선택한 플랜(기본 Starter)으로
            운영됩니다.
          </p>
          {highlight ? (
            <p className="mt-2 rounded-lg border border-primary/25 bg-primary/[0.06] px-3 py-2 text-xs font-medium text-foreground">
              특정 플랜 링크로 들어오셨습니다. 아래 표를 참고한 뒤 로그인하면 구독 콘솔에서 바꿀 수 있습니다.
            </p>
          ) : null}
        </div>

        {consoleData ? (
          <BillingConsoleClient
            billing={consoleData.billing}
            effectivePlan={consoleData.effectivePlan}
            portalEnabledCount={consoleData.portalEnabledCount}
            events={consoleData.events}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
            구독·사용량을 보려면{" "}
            <Link href="/login" className="font-semibold text-primary underline-offset-2 hover:underline">
              로그인
            </Link>
            하세요.
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="border-b border-border/50 bg-muted/30 px-4 py-3 text-sm font-semibold">플랜 비교</div>
          <div className="grid divide-y divide-border/50 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {tiers.map((p) => (
              <div key={p} className="p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-primary">{PLAN_LABEL[p]}</p>
                <p className="mt-1 text-lg font-bold">
                  {PLAN_PRICE_KRW_MONTH[p] != null
                    ? `₩${PLAN_PRICE_KRW_MONTH[p]!.toLocaleString("ko-KR")}`
                    : "문의"}
                  <span className="text-xs font-normal text-muted-foreground"> /월</span>
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{PLAN_TAGLINE[p]}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-border/60 bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold">PG·웹훅 확장 포인트</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>
              라우트 <code className="rounded bg-muted px-1">/billing</code> — Checkout·Customer Portal 임베드
            </li>
            <li>
              DB <code className="rounded bg-muted px-1">public.users</code> — plan, subscription_status,
              trial_ends_at, current_period_end, stripe_customer_id
            </li>
            <li>
              이벤트 로그 <code className="rounded bg-muted px-1">billing_events</code> — 웹훅에서 append
            </li>
            <li>
              코드 <code className="rounded bg-muted px-1">FEATURE_GATES_AFTER_PAYMENT</code> 참고:{" "}
              <code className="rounded bg-background px-1 text-[11px]">{JSON.stringify(FEATURE_GATES_AFTER_PAYMENT)}</code>
            </li>
          </ul>
        </section>

        <div id="business" className="scroll-mt-8 space-y-3 rounded-xl border border-dashed border-border/70 p-5">
          <h2 className="text-base font-semibold">Business · 맞춤 도입</h2>
          <p className="text-sm text-muted-foreground">다수 좌석, 온보딩, SLA, 커스텀 한도가 필요하면 메일로 문의해 주세요.</p>
          {contact ? (
            <a
              href={`mailto:${contact}?subject=Bill-IO%20Business%20문의`}
              className={cn(buttonVariants({ variant: "outline" }), "inline-flex h-10")}
            >
              {contact}
            </a>
          ) : (
            <p className="text-xs text-muted-foreground">
              <code className="rounded bg-muted px-1">NEXT_PUBLIC_CONTACT_EMAIL</code> 설정 시 표시됩니다.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "h-11 min-w-[10rem]")}>
            7일 체험으로 시작
          </Link>
          <Link
            href="/signup?plan=pro"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 min-w-[10rem]")}
          >
            Pro 관심 — 가입
          </Link>
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "h-11")}>
            로그인
          </Link>
        </div>

        {supportEmail ? (
          <p className="text-center text-xs text-muted-foreground">
            고객센터 메일:{" "}
            <a href={`mailto:${supportEmail}`} className="font-medium text-primary hover:underline">
              {supportEmail}
            </a>
          </p>
        ) : null}
      </div>
    </div>
  )
}
