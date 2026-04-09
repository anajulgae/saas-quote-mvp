import type { Metadata } from "next"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button-variants"
import {
  BILLING_UPGRADE_CONTACT_COPY,
  FEATURE_GATES_AFTER_PAYMENT,
} from "@/lib/billing/catalog"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "요금제·업그레이드",
  description:
    "Bill-IO Starter(무료)·Pro·Business 플랜 비교. Pro에서는 문의·견적·청구·고객 AI 보조, 공개 문의 폼, 고객 포털, 문서 발송 등을 한눈에 확인하세요.",
  alternates: { canonical: "/billing" },
  openGraph: {
    title: "Bill-IO 요금제",
    description:
      "무료로 시작하고, Pro에서 공개 문의·포털·향상된 AI(운영 분석·풀 견적·수금 문구)·발송을 활용하세요.",
    type: "website",
  },
  robots: { index: true, follow: true },
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>
}) {
  const sp = await searchParams
  const highlightPro = sp.plan === "pro"
  const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim()

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <p>
          <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 px-2")}>
            ← 홈
          </Link>
        </p>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">요금제</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{BILLING_UPGRADE_CONTACT_COPY}</p>
          <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-4 text-sm leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">플랜이 바꾸는 것</p>
            <p className="mt-2">
              무료로도 고객·문의·견적·청구 코어는 동작합니다. Pro에서는{" "}
              <strong className="font-medium text-foreground">업체 소개 랜딩</strong>,{" "}
              <strong className="font-medium text-foreground">고객 미니 포털</strong>,{" "}
              <strong className="font-medium text-foreground">향상된 AI·메시징</strong>(문의 분석·견적·수금·발송 문구
              등) 게이트가 열리도록 설계해 두었습니다.
              (코드: <code className="rounded bg-background px-1 text-xs">plan-features</code> ·{" "}
              <code className="rounded bg-background px-1 text-xs">billing/catalog</code>)
            </p>
          </div>
          {highlightPro ? (
            <p className="mt-2 rounded-lg border border-primary/25 bg-primary/[0.06] px-3 py-2 text-xs font-medium text-foreground">
              Pro 플랜을 살펴보고 계십니다. 아래에서 무료로 시작한 뒤, 결제가 열리면 같은 계정으로 업그레이드할 수
              있습니다.
            </p>
          ) : null}
        </div>

        <section className="space-y-3 rounded-xl border border-border/60 bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold">결제 연동 진입점 (개발자용)</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>
              라우트: <code className="rounded bg-muted px-1">/billing</code> — Checkout·Customer Portal 링크를 여기에
              붙이면 됩니다.
            </li>
            <li>
              DB: <code className="rounded bg-muted px-1">public.users.plan</code> — 웹훅에서{" "}
              <code className="rounded bg-muted px-1">free</code> / <code className="rounded bg-muted px-1">pro</code>{" "}
              갱신.
            </li>
            <li>
              코드: <code className="rounded bg-muted px-1">src/lib/plan-features.ts</code> 의{" "}
              <code className="rounded bg-muted px-1">FEATURE_GATES</code> 를{" "}
              <code className="rounded bg-muted px-1">billing/catalog.ts</code> 의{" "}
              <code className="rounded bg-muted px-1">FEATURE_GATES_AFTER_PAYMENT</code> 와 맞추면 Pro 잠금을
              활성화합니다.
            </li>
          </ul>
        </section>

        <section className="space-y-2 rounded-xl border border-border/60 bg-muted/15 p-5">
          <h2 className="text-base font-semibold">Pro 전환 시 잠글 기능 (제안)</h2>
          <p className="text-sm text-muted-foreground">
            PG 연동 직전에 아래와 같이 게이트를 옮기는 것을 권장합니다.
          </p>
          <ul className="mt-2 space-y-2 text-sm">
            <li>
              <span className="font-medium text-foreground">AI 보조</span>
              <span className="text-muted-foreground"> — </span>
              <code className="text-xs">ai_assist</code>
              <span className="text-muted-foreground">
                {" "}
                → Pro만 (문의·견적·청구·고객·발송 문구 — 호출 할당량·비용 통제)
              </span>
            </li>
            <li>
              <span className="font-medium text-foreground">견적·고객 상한 확장</span>
              <span className="text-muted-foreground"> — </span>
              <code className="text-xs">unlimited_quotes</code>
              <span className="text-muted-foreground"> → Pro만 (또는 월 N건 초과 유료)</span>
            </li>
          </ul>
          <p className="pt-2 text-xs text-muted-foreground">
            현재 운영 설정:{" "}
            <code className="rounded bg-background px-1">
              FEATURE_GATES_AFTER_PAYMENT = {JSON.stringify(FEATURE_GATES_AFTER_PAYMENT)}
            </code>
          </p>
        </section>

        <div id="business" className="scroll-mt-8 space-y-3 rounded-xl border border-dashed border-border/70 p-5">
          <h2 className="text-base font-semibold">Business · 맞춤 도입</h2>
          <p className="text-sm text-muted-foreground">
            다수 좌석, 온보딩, SLA가 필요하면 아래로 문의해 주세요.
          </p>
          {contact ? (
            <a
              href={`mailto:${contact}?subject=Bill-IO%20Business%20문의`}
              className={cn(buttonVariants({ variant: "outline" }), "inline-flex h-10")}
            >
              {contact} 로 문의
            </a>
          ) : (
            <p className="text-xs text-muted-foreground">
              운영자가 <code className="rounded bg-muted px-1">NEXT_PUBLIC_CONTACT_EMAIL</code> 을 설정하면 메일 링크가
              표시됩니다.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "h-11 min-w-[10rem]")}>
            무료로 시작
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
      </div>
    </div>
  )
}
