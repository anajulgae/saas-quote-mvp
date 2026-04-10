"use client"

import { useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"

import {
  clearPendingPlanAction,
  resumeSubscriptionAction,
  scheduleDowngradeAction,
  scheduleSubscriptionCancelAction,
  selectSubscriptionPlanAction,
} from "@/app/billing/subscription-actions"
import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"
import {
  BILLING_PAGE_PATH,
  PLAN_LABEL,
  PLAN_PRICE_KRW_MONTH,
  PLAN_TAGLINE,
} from "@/lib/billing/catalog"
import {
  getUsageLimitsForEffectivePlan,
  trialRemainingLabel,
  type UserBillingSnapshot,
} from "@/lib/subscription"
import type { BillingConsoleEventRow } from "@/lib/billing/console-types"
import type { BillingPlan } from "@/types/domain"

const PLANS: BillingPlan[] = ["starter", "pro", "business"]

export function BillingConsoleClient({
  billing,
  effectivePlan,
  portalEnabledCount,
  events,
}: {
  billing: UserBillingSnapshot
  effectivePlan: BillingPlan
  portalEnabledCount: number
  events: BillingConsoleEventRow[]
}) {
  const [pending, start] = useTransition()
  const limits = getUsageLimitsForEffectivePlan(effectivePlan)
  const trialLeft = trialRemainingLabel(billing)

  const run = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>) => {
    start(async () => {
      const r = await fn()
      if (r.ok) {
        toast.success("반영했습니다.")
      } else {
        toast.error(r.error)
      }
    })
  }

  const aiPct = limits.aiCallsPerMonth > 0 ? Math.round((billing.aiCallsThisMonth / limits.aiCallsPerMonth) * 100) : 0
  const docPct =
    limits.documentSendsPerMonth > 0
      ? Math.round((billing.documentSendsThisMonth / limits.documentSendsPerMonth) * 100)
      : 0

  return (
    <div className="space-y-8 rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-7">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">구독·사용량</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          청구 플랜은 <strong className="text-foreground">{PLAN_LABEL[billing.plan]}</strong>, 기능·한도는{" "}
          <strong className="text-foreground">{PLAN_LABEL[effectivePlan]}</strong> 기준입니다.
          {billing.subscriptionStatus === "trialing" && trialLeft ? (
            <span className="mt-2 block rounded-lg border border-primary/25 bg-primary/[0.06] px-3 py-2 text-xs font-medium text-foreground">
              Pro 수준 체험 중 · {trialLeft} ·{" "}
              <Link href={BILLING_PAGE_PATH} className="text-primary underline-offset-2 hover:underline">
                체험 후 플랜 선택
              </Link>
            </span>
          ) : null}
          {billing.subscriptionStatus === "trial_expired" ? (
            <span className="mt-2 block rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs font-medium text-foreground">
              체험이 종료되었습니다. Starter 이상을 선택하면 이전과 같이 운영할 수 있습니다.
            </span>
          ) : null}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
          <p className="text-xs font-medium text-muted-foreground">구독 상태</p>
          <p className="mt-1 text-sm font-semibold capitalize text-foreground">{billing.subscriptionStatus}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            다음 결제·갱신 예정:{" "}
            {billing.currentPeriodEnd
              ? new Date(billing.currentPeriodEnd).toLocaleDateString("ko-KR")
              : "PG 연동 후 표시"}
          </p>
          {billing.cancelAtPeriodEnd ? (
            <p className="mt-2 text-xs font-medium text-amber-900">해지 예약됨 — 갱신일에 종료(시뮬레이션)</p>
          ) : null}
          {billing.pendingPlan ? (
            <p className="mt-2 text-xs text-muted-foreground">
              예약 다운그레이드: <strong className="text-foreground">{PLAN_LABEL[billing.pendingPlan]}</strong>
            </p>
          ) : null}
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
          <p className="text-xs font-medium text-muted-foreground">결제 수단</p>
          <p className="mt-1 text-sm text-foreground">
            Stripe·국내 PG 연동 시 이 영역에 카드 마스킹·변경 버튼이 붙습니다. 지금은 운영 구조만 준비되어 있습니다.
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold">이번 달 사용량</h3>
        <ul className="mt-3 space-y-3 text-sm">
          <li>
            <div className="flex justify-between gap-2">
              <span>AI 호출</span>
              <span className="tabular-nums text-muted-foreground">
                {billing.aiCallsThisMonth} / {limits.aiCallsPerMonth}회
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, aiPct)}%` }} />
            </div>
            {aiPct >= 85 ? (
              <p className="mt-1 text-xs text-amber-800">한도에 가깝습니다. 플랜 업그레이드를 검토해 주세요.</p>
            ) : null}
          </li>
          <li>
            <div className="flex justify-between gap-2">
              <span>문서 발송(이메일 등)</span>
              <span className="tabular-nums text-muted-foreground">
                {billing.documentSendsThisMonth} / {limits.documentSendsPerMonth}건
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-teal-600/80 transition-all" style={{ width: `${Math.min(100, docPct)}%` }} />
            </div>
          </li>
          <li className="flex justify-between gap-2 border-t border-border/50 pt-2">
            <span>활성 고객 포털</span>
            <span className="tabular-nums">
              {portalEnabledCount} / {limits.maxPortalCustomers}
            </span>
          </li>
          <li className="flex justify-between gap-2">
            <span>팀 시트(좌석)</span>
            <span className="tabular-nums">{limits.seats}명까지(제품 멀티유저 연동 시)</span>
          </li>
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-semibold">플랜 변경</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          실제 과금 전까지는 아래 버튼이 DB 플랜을 바꿉니다. PG 웹훅이 붙으면 Checkout·Customer Portal과 동기화하면 됩니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PLANS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={pending}
              className={cn(
                buttonVariants({ variant: billing.plan === p ? "default" : "outline", size: "sm" }),
                "h-9"
              )}
              onClick={() => run(() => selectSubscriptionPlanAction(p))}
            >
              {PLAN_LABEL[p]} · {PLAN_PRICE_KRW_MONTH[p] ? `${(PLAN_PRICE_KRW_MONTH[p]! / 1000).toFixed(0)}k` : "—"}/월
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9")}
            onClick={() => run(() => scheduleDowngradeAction("starter"))}
          >
            다운그레이드 예약 → Starter
          </button>
          <button
            type="button"
            disabled={pending}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9")}
            onClick={() => run(() => scheduleDowngradeAction("pro"))}
          >
            다운그레이드 예약 → Pro
          </button>
          {billing.pendingPlan ? (
            <button
              type="button"
              disabled={pending}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-9")}
              onClick={() => run(() => clearPendingPlanAction())}
            >
              다운그레이드 예약 취소
            </button>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.06] p-4">
        <h3 className="text-sm font-semibold text-rose-950">해지</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          해지하면 갱신일까지는 이용 가능하고, 이후 AI·Pro 전용 기능·높은 한도가 제한됩니다. 데이터는 계정 정책에 따라
          보관·삭제됩니다(운영 정책에 맞게 조정하세요).
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending || billing.cancelAtPeriodEnd}
            className={cn(buttonVariants({ variant: "destructive", size: "sm" }), "h-9")}
            onClick={() => run(() => scheduleSubscriptionCancelAction())}
          >
            해지 예약하기
          </button>
          {billing.cancelAtPeriodEnd ? (
            <button
              type="button"
              disabled={pending}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9")}
              onClick={() => run(() => resumeSubscriptionAction())}
            >
              해지 예약 철회
            </button>
          ) : null}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold">최근 구독·과금 이벤트</h3>
        {events.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">아직 기록이 없습니다. 플랜을 바꾸면 타임라인에 쌓입니다.</p>
        ) : (
          <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto text-xs">
            {events.map((e) => (
              <li key={e.id} className="flex flex-col border-b border-border/40 pb-2 last:border-0">
                <span className="font-medium text-foreground">{e.kind}</span>
                <span className="text-muted-foreground">{e.message}</span>
                <time className="text-[10px] text-muted-foreground">
                  {new Date(e.createdAt).toLocaleString("ko-KR")}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-border/50 bg-muted/15 p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">플랜 요약</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          {PLANS.map((p) => (
            <li key={p}>
              <strong className="text-foreground">{PLAN_LABEL[p]}</strong> — {PLAN_TAGLINE[p]}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
