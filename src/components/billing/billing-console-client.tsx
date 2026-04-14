"use client"

import { useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"

import {
  clearPendingPlanAction,
  getPaymentMethodUpdateTransactionAction,
  openBillingPortalAction,
  resumeSubscriptionAction,
  scheduleSubscriptionCancelAction,
  selectSubscriptionPlanAction,
  startCheckoutAction,
} from "@/app/(app)/billing/subscription-actions"
import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"
import {
  PLAN_LABEL,
  PLAN_PRICE_USD_MONTH,
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

function subscriptionStatusKo(status: string) {
  const m: Record<string, string> = {
    trialing: "체험 중",
    active: "이용 중",
    past_due: "결제 연체",
    canceled: "해지됨",
    trial_expired: "체험 만료",
    incomplete: "결제 미완료",
    pending: "대기 중",
  }
  return m[status] ?? status
}

function billingEventKindKo(kind: string) {
  const m: Record<string, string> = {
    subscription: "구독",
    plan_change: "플랜 변경",
    cancel_scheduled: "해지 예약",
    cancel_resumed: "해지 철회",
    downgrade_scheduled: "다운그레이드 예약",
    trial_ended: "체험 종료",
    payment_succeeded: "결제 완료",
    payment_failed: "결제 실패",
    checkout_started: "결제 시작",
    portal_opened: "포털 열기",
    payment_method_added: "결제 수단 등록",
    trial_started: "무료 체험 시작",
    subscription_started: "구독 시작",
    subscription_canceled: "구독 해지",
    subscription_upgraded: "업그레이드",
    subscription_downgraded: "다운그레이드",
  }
  return m[kind] ?? kind
}

export function BillingConsoleClient({
  billing,
  effectivePlan,
  portalEnabledCount,
  runtime,
  events,
}: {
  billing: UserBillingSnapshot
  effectivePlan: BillingPlan
  portalEnabledCount: number
  runtime: {
    provider: string
    mode: string
    configured: boolean
    configurationError: string | null
  }
  events: BillingConsoleEventRow[]
}) {
  const [pending, start] = useTransition()
  const limits = getUsageLimitsForEffectivePlan(effectivePlan)
  const trialLeft = trialRemainingLabel(billing)

  const run = (
    fn: () => Promise<
      { ok: true; redirectUrl?: string } | { ok: false; error: string }
    >
  ) => {
    start(async () => {
      const r = await fn()
      if (r.ok) {
        if ("redirectUrl" in r && r.redirectUrl) {
          window.location.href = r.redirectUrl
          return
        }
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

  const pgEnabled = runtime.provider === "stripe" || runtime.provider === "paddle" || runtime.provider === "dodo"
  const showPgCheckout = pgEnabled && runtime.configured
  const hasPaddleSubscription =
    runtime.provider === "paddle" &&
    Boolean(billing.billingProviderSubscriptionId?.trim()) &&
    billing.billingProvider === "paddle"
  const hasActiveSub = Boolean(billing.billingProviderSubscriptionId?.trim())

  return (
    <div className="space-y-8 rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-7">
      {/* 현재 플랜 & 상태 */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight">내 구독</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          현재 플랜: <strong className="text-foreground">{PLAN_LABEL[billing.plan]}</strong>
          {billing.plan !== effectivePlan ? (
            <> (기능 한도: <strong className="text-foreground">{PLAN_LABEL[effectivePlan]}</strong> 기준)</>
          ) : null}
        </p>
        {billing.subscriptionStatus === "trialing" && trialLeft ? (
          <p className="mt-2 rounded-lg border border-primary/25 bg-primary/[0.06] px-3 py-2 text-xs font-medium text-foreground">
            무료 체험 중 · {trialLeft} · 체험 종료 후 자동 결제됩니다
          </p>
        ) : null}
        {billing.subscriptionStatus === "trial_expired" ? (
          <p className="mt-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs font-medium text-foreground">
            체험이 종료되었습니다. 플랜을 선택하면 서비스를 계속 이용할 수 있습니다.
          </p>
        ) : null}
      </div>

      {/* 구독 상태 + 결제 수단 카드 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
          <p className="text-xs font-medium text-muted-foreground">구독 상태</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {subscriptionStatusKo(billing.subscriptionStatus)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            다음 결제일:{" "}
            {billing.currentPeriodEnd
              ? new Date(billing.currentPeriodEnd).toLocaleDateString("ko-KR")
              : "결제 완료 후 표시"}
          </p>
          {billing.cancelAtPeriodEnd ? (
            <p className="mt-2 text-xs font-medium text-amber-900">
              해지 예약됨 — 다음 결제일에 구독이 종료됩니다
            </p>
          ) : null}
          {billing.pendingPlan ? (
            <div className="mt-2 flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                예약 변경: <strong className="text-foreground">{PLAN_LABEL[billing.pendingPlan]}</strong>
              </p>
              <button
                type="button"
                disabled={pending}
                className="text-xs text-primary hover:underline"
                onClick={() => run(() => clearPendingPlanAction())}
              >
                취소
              </button>
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
          <p className="text-xs font-medium text-muted-foreground">결제 수단</p>
          {billing.paymentMethodLast4 ? (
            <p className="mt-1 text-sm text-foreground">
              {billing.paymentMethodBrand ? `${billing.paymentMethodBrand} · ` : null}끝자리{" "}
              {billing.paymentMethodLast4}
            </p>
          ) : hasActiveSub ? (
            <p className="mt-1 text-sm text-foreground">결제 수단이 등록되어 있습니다.</p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              아직 등록된 결제 수단이 없습니다.
            </p>
          )}
          {showPgCheckout ? (
            <div className="mt-3">
              {hasPaddleSubscription ? (
                <button
                  type="button"
                  disabled={pending}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8")}
                  onClick={() => {
                    start(async () => {
                      const r = await getPaymentMethodUpdateTransactionAction()
                      if (!r.ok) {
                        toast.error(r.error)
                        return
                      }
                      const { openPaddleUpdatePayment } = await import("@/components/billing/paddle-update-payment")
                      openPaddleUpdatePayment(r.transactionId)
                    })
                  }}
                >
                  결제 수단 변경
                </button>
              ) : runtime.provider === "paddle" ? (
                <Link
                  href={`/billing/checkout/paddle?plan=${encodeURIComponent(billing.plan)}`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 inline-flex items-center")}
                >
                  결제 수단 등록
                </Link>
              ) : runtime.provider === "stripe" && Boolean(billing.billingCustomerId?.trim()) ? (
                <button
                  type="button"
                  disabled={pending}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8")}
                  onClick={() => run(() => openBillingPortalAction())}
                >
                  결제 수단 변경
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* 플랜 선택 (결제 진행 통합) */}
      {showPgCheckout ? (
        <div>
          <h3 className="text-sm font-semibold">플랜 선택</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasActiveSub
              ? "플랜을 변경하면 즉시 반영됩니다. 차액은 다음 결제일에 정산됩니다."
              : "플랜을 선택하면 결제 페이지로 이동합니다. 7일 무료 체험 후 자동 결제됩니다."}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {PLANS.map((p) => {
              const isCurrent = billing.plan === p
              return (
                <button
                  key={p}
                  type="button"
                  disabled={pending || isCurrent}
                  className={cn(
                    "relative flex flex-col rounded-xl border p-4 text-left transition-colors",
                    isCurrent
                      ? "border-primary bg-primary/[0.06]"
                      : "border-border/60 hover:border-primary/40 hover:bg-primary/[0.02]"
                  )}
                  onClick={() => {
                    if (hasActiveSub) {
                      run(() => selectSubscriptionPlanAction(p))
                    } else {
                      run(() => startCheckoutAction(p))
                    }
                  }}
                >
                  {isCurrent ? (
                    <span className="absolute right-3 top-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      현재
                    </span>
                  ) : null}
                  <span className="text-xs font-bold tracking-wide text-primary">{PLAN_LABEL[p]}</span>
                  <span className="mt-1 text-lg font-bold">
                    {PLAN_PRICE_USD_MONTH[p] != null ? `$${PLAN_PRICE_USD_MONTH[p]}` : "문의"}
                    <span className="text-xs font-normal text-muted-foreground"> /월</span>
                  </span>
                  <span className="mt-2 text-xs leading-relaxed text-muted-foreground">{PLAN_TAGLINE[p]}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* 사용량 */}
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
              <span>문서 발송</span>
              <span className="tabular-nums text-muted-foreground">
                {billing.documentSendsThisMonth} / {limits.documentSendsPerMonth}건
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-teal-600/80 transition-all" style={{ width: `${Math.min(100, docPct)}%` }} />
            </div>
          </li>
          <li className="flex justify-between gap-2 border-t border-border/50 pt-2">
            <span>고객 포털</span>
            <span className="tabular-nums">
              {portalEnabledCount} / {limits.maxPortalCustomers}
            </span>
          </li>
        </ul>
      </div>

      {/* 해지 */}
      <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.06] p-4">
        <h3 className="text-sm font-semibold text-rose-950">구독 해지</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          해지하면 다음 결제일까지 이용 가능합니다. 이후 프리미엄 기능과 높은 한도가 제한됩니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending || billing.cancelAtPeriodEnd}
            className={cn(buttonVariants({ variant: "destructive", size: "sm" }), "h-9")}
            onClick={() => run(() => scheduleSubscriptionCancelAction())}
          >
            해지 예약
          </button>
          {billing.cancelAtPeriodEnd ? (
            <button
              type="button"
              disabled={pending}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9")}
              onClick={() => run(() => resumeSubscriptionAction())}
            >
              해지 철회
            </button>
          ) : null}
        </div>
      </div>

      {/* 최근 이벤트 */}
      {events.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold">결제 내역</h3>
          <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-xs">
            {events.map((e) => (
              <li key={e.id} className="flex flex-col border-b border-border/40 pb-2 last:border-0">
                <span className="font-medium text-foreground">{billingEventKindKo(e.kind)}</span>
                <span className="text-muted-foreground">{e.message}</span>
                <time className="text-[10px] text-muted-foreground">
                  {new Date(e.createdAt).toLocaleString("ko-KR")}
                </time>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
