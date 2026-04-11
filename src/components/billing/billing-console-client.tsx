"use client"

import { useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"

import {
  clearPendingPlanAction,
  openBillingPortalAction,
  resumeSubscriptionAction,
  scheduleDowngradeAction,
  scheduleSubscriptionCancelAction,
  selectSubscriptionPlanAction,
  startCheckoutAction,
} from "@/app/(app)/billing/subscription-actions"
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
    checkout_started: "체크아웃 시작",
    portal_opened: "청구 포털",
    payment_method_added: "결제 수단 등록",
  }
  return m[kind] ?? kind
}

function billingProviderLabel(provider: string) {
  if (provider === "paddle") return "Paddle"
  if (provider === "stripe") return "Stripe"
  if (provider === "mock") return "시뮬레이션(mock)"
  return provider
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

  const pgEnabled = runtime.provider === "stripe" || runtime.provider === "paddle"
  const showPgCheckout = pgEnabled && runtime.configured
  const showPortal = showPgCheckout && Boolean(billing.billingCustomerId?.trim())

  return (
    <div className="space-y-8 rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-7">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">구독·사용량</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          청구 플랜은 <strong className="text-foreground">{PLAN_LABEL[billing.plan]}</strong>, 기능·한도는{" "}
          <strong className="text-foreground">{PLAN_LABEL[effectivePlan]}</strong> 기준입니다.
          {billing.subscriptionStatus === "trialing" && trialLeft ? (
            <span className="mt-2 block rounded-lg border border-primary/25 bg-primary/[0.06] px-3 py-2 text-xs font-medium text-foreground">
              프로 수준 체험 중 · {trialLeft} ·{" "}
              <Link href={BILLING_PAGE_PATH} className="text-primary underline-offset-2 hover:underline">
                체험 후 플랜 선택
              </Link>
            </span>
          ) : null}
          {billing.subscriptionStatus === "trial_expired" ? (
            <span className="mt-2 block rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs font-medium text-foreground">
              체험이 종료되었습니다. 스타터 이상을 선택하면 이전과 같이 운영할 수 있습니다.
            </span>
          ) : null}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
          <p className="text-xs font-medium text-muted-foreground">구독 상태</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {subscriptionStatusKo(billing.subscriptionStatus)}
          </p>
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
          {billing.paymentMethodLast4 ? (
            <p className="mt-1 text-sm text-foreground">
              {billing.paymentMethodBrand ? `${billing.paymentMethodBrand} · ` : null}끝자리{" "}
              {billing.paymentMethodLast4}
            </p>
          ) : pgEnabled && billing.billingCustomerId ? (
            <p className="mt-1 text-sm text-foreground">
              고객 프로필이 연결되었습니다. 아래「청구 포털」에서 카드·청구서를 관리할 수 있습니다.
            </p>
          ) : pgEnabled ? (
            <p className="mt-1 text-sm text-muted-foreground">
              체크아웃을 완료하면 PG에 등록된 결제 수단이 여기에 반영됩니다(웹훅 동기화).
            </p>
          ) : (
            <p className="mt-1 text-sm text-foreground">
              시뮬레이션 모드입니다. 실제 카드는 저장되지 않습니다.
            </p>
          )}
        </div>
      </div>

      {runtime.provider !== "mock" ? (
        <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
          <h3 className="text-sm font-semibold text-foreground">실제 결제(PG)</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            제공자: <strong className="text-foreground">{billingProviderLabel(runtime.provider)}</strong> · 모드:{" "}
            <strong className="text-foreground">{runtime.mode}</strong>
          </p>
          {!runtime.configured ? (
            <p className="mt-2 text-sm text-destructive">
              {runtime.configurationError ?? "환경 변수를 확인해 주세요."}
            </p>
          ) : (
            <>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {runtime.provider === "paddle"
                  ? "플랜을 고르면 서버가 체크아웃 페이지로 보낸 뒤 Paddle 결제 창이 열립니다. 완료 후 웹훅으로 구독 상태가 갱신됩니다."
                  : "플랜을 고르면 Stripe Checkout으로 이동합니다."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {PLANS.map((p) =>
                  runtime.provider === "paddle" ? (
                    <Link
                      key={`pg-${p}`}
                      href={`/billing/checkout/paddle?plan=${encodeURIComponent(p)}`}
                      className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-9 inline-flex items-center")}
                    >
                      {PLAN_LABEL[p]} 결제 진행
                    </Link>
                  ) : (
                    <button
                      key={`pg-${p}`}
                      type="button"
                      disabled={pending}
                      className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-9")}
                      onClick={() => run(() => startCheckoutAction(p))}
                    >
                      {PLAN_LABEL[p]} 결제 진행
                    </button>
                  )
                )}
              </div>
              {showPortal ? (
                <div className="mt-3">
                  <button
                    type="button"
                    disabled={pending}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9")}
                    onClick={() => run(() => openBillingPortalAction())}
                  >
                    청구·결제 수단 관리(포털)
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}

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
          {runtime.provider === "mock"
            ? "시뮬레이션: 아래 버튼은 DB 플랜만 바꿉니다."
            : showPgCheckout && billing.billingProviderSubscriptionId
              ? "활성 구독이 있으면 아래는 PG API로 플랜을 바꿉니다. 구독이 없거나 미완료면「실제 결제」에서 체크아웃을 먼저 진행하세요."
              : showPgCheckout
                ? "아직 PG 구독 ID가 없습니다. 위「실제 결제」에서 체크아웃을 완료한 뒤 웹훅으로 동기화되면 이 버튼으로 플랜 변경이 가능합니다."
                : "PG가 설정되지 않았습니다. 환경 변수를 채운 뒤 다시 시도하세요."}
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
              {PLAN_LABEL[p]} ·{" "}
              {PLAN_PRICE_KRW_MONTH[p] != null
                ? `₩${PLAN_PRICE_KRW_MONTH[p]!.toLocaleString("ko-KR")}/월`
                : "—"}
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
            다운그레이드 예약 → 스타터
          </button>
          <button
            type="button"
            disabled={pending}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9")}
            onClick={() => run(() => scheduleDowngradeAction("pro"))}
          >
            다운그레이드 예약 → 프로
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
          해지하면 갱신일까지는 이용 가능하고, 이후 AI·프로 전용 기능·높은 한도가 제한됩니다. 데이터는 계정 정책에 따라
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
                <span className="font-medium text-foreground">{billingEventKindKo(e.kind)}</span>
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
