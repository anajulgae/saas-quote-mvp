"use client"

import { useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowRight,
  CreditCard,
  Loader2,
  ReceiptText,
  RotateCcw,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"

import {
  openBillingPortalAction,
  resumeSubscriptionAction,
  scheduleSubscriptionCancelAction,
  selectSubscriptionPlanAction,
  startCheckoutAction,
} from "@/app/billing/subscription-actions"
import { buttonVariants } from "@/components/ui/button-variants"
import {
  BILLING_PAGE_PATH,
  PLAN_LABEL,
  PLAN_PRICE_KRW_MONTH,
  PLAN_TAGLINE,
} from "@/lib/billing/catalog"
import type { BillingConsoleEventRow } from "@/lib/billing/console-types"
import {
  billingStatusLabel,
  billingStatusTone,
  getUsageLimitsForEffectivePlan,
  trialRemainingLabel,
  type UserBillingSnapshot,
} from "@/lib/subscription"
import { cn } from "@/lib/utils"
import type { BillingPlan } from "@/types/domain"

const PLANS: BillingPlan[] = ["starter", "pro", "business"]

const EVENT_LABELS: Partial<Record<string, string>> = {
  trial_started: "Trial started",
  trial_will_end: "Trial ending soon",
  trial_ended: "Trial ended",
  checkout_started: "Checkout started",
  payment_method_added: "Payment method added",
  subscription_started: "Subscription started",
  subscription_updated: "Subscription updated",
  subscription_upgraded: "Plan upgraded",
  subscription_downgraded: "Plan downgraded",
  payment_succeeded: "Payment succeeded",
  payment_failed: "Payment failed",
  retry_scheduled: "Retry scheduled",
  cancel_scheduled: "Cancellation scheduled",
  cancel_resumed: "Cancellation removed",
  subscription_canceled: "Subscription canceled",
  portal_opened: "Billing portal opened",
  document_send_counted: "document_send counted",
}

type ActionResult = { ok: true; redirectUrl?: string } | { ok: false; error: string }

function formatDate(value: string | null) {
  if (!value) {
    return "Not scheduled"
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "Not scheduled"
  }
  return date.toLocaleDateString("ko-KR")
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString("ko-KR")
}

function percentage(used: number, limit: number) {
  if (limit <= 0) {
    return 0
  }
  return Math.min(100, Math.round((used / limit) * 100))
}

function toneClasses(tone: "positive" | "warning" | "danger" | "muted") {
  switch (tone) {
    case "positive":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-950"
    case "warning":
      return "border-amber-500/35 bg-amber-500/10 text-amber-950"
    case "danger":
      return "border-rose-500/35 bg-rose-500/10 text-rose-950"
    default:
      return "border-border/70 bg-muted/40 text-foreground"
  }
}

function getBanner(
  billing: UserBillingSnapshot,
  effectivePlan: BillingPlan
): { tone: "positive" | "warning" | "danger" | "muted"; title: string; body: string } | null {
  const remaining = trialRemainingLabel(billing)

  if (billing.pendingPlan) {
    return {
      tone: "warning",
      title: `${PLAN_LABEL[billing.pendingPlan]} plan change is pending`,
      body:
        "A pending plan marker exists in billing state. Review the provider portal or recent billing events to confirm whether the subscription change is already queued or finished.",
    }
  }

  if (billing.subscriptionStatus === "past_due") {
    return {
      tone: "danger",
      title: "Payment failed",
      body:
        "Automatic renewal failed. Update the payment method now so document delivery, AI usage, and premium features stay active.",
    }
  }

  if (billing.subscriptionStatus === "trial_expired") {
    return {
      tone: "danger",
      title: "Trial ended",
      body:
        "The free trial has ended. Start checkout to restore paid access and automatic renewal.",
    }
  }

  if (billing.subscriptionStatus === "trialing") {
    return {
      tone: remaining && remaining.includes("1") ? "danger" : "warning",
      title: `${PLAN_LABEL[effectivePlan]} trial is active`,
      body: `Trial start: ${formatDate(billing.trialStartedAt)} / trial end: ${formatDate(
        billing.trialEndsAt
      )}${remaining ? ` (${remaining})` : ""}. Save a payment method before the trial ends for automatic conversion.`,
    }
  }

  if (billing.subscriptionStatus === "pending" || billing.subscriptionStatus === "incomplete") {
    return {
      tone: "warning",
      title: "Checkout is not complete",
      body:
        "Payment method registration or subscription creation has not finished yet. Re-open checkout to complete it.",
    }
  }

  if (billing.cancelAtPeriodEnd) {
    return {
      tone: "warning",
      title: "Cancellation is scheduled",
      body: `The current plan remains active until ${formatDate(
        billing.currentPeriodEnd
      )}, then access will fall back according to billing status.`,
    }
  }

  if (billing.subscriptionStatus === "canceled") {
    return {
      tone: "muted",
      title: "No active subscription",
      body: "You can restart automatic billing at any time by choosing a plan below.",
    }
  }

  return null
}

function UsageBar({ used, limit, colorClass }: { used: number; limit: number; colorClass: string }) {
  return (
    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full transition-all", colorClass)} style={{ width: `${percentage(used, limit)}%` }} />
    </div>
  )
}

export function BillingConsoleClient({
  billing,
  effectivePlan,
  selectedPlan,
  portalEnabledCount,
  publicInquiryFormCount,
  seatUsedCount,
  runtime,
  events,
}: {
  billing: UserBillingSnapshot
  effectivePlan: BillingPlan
  selectedPlan: BillingPlan | null
  portalEnabledCount: number
  publicInquiryFormCount: number
  seatUsedCount: number
  runtime: {
    provider: string
    mode: string
    configured: boolean
    configurationError: string | null
  }
  events: BillingConsoleEventRow[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const limits = getUsageLimitsForEffectivePlan(effectivePlan)
  const banner = getBanner(billing, effectivePlan)
  const billingUnavailable = !runtime.configured
  const selectedPlanNeedsAttention = Boolean(selectedPlan && selectedPlan !== billing.plan)

  const paymentMethodLabel =
    billing.paymentMethodBrand && billing.paymentMethodLast4
      ? `${billing.paymentMethodBrand.toUpperCase()} •••• ${billing.paymentMethodLast4}`
      : billing.paymentMethodLast4
        ? `Card •••• ${billing.paymentMethodLast4}`
        : runtime.provider === "mock"
          ? "Mock payment method"
          : "No saved payment method"

  const run = (task: () => Promise<ActionResult>, successMessage?: string) => {
    startTransition(async () => {
      const result = await task()
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl
        return
      }
      if (successMessage) {
        toast.success(successMessage)
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-6 rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-7">
      {!runtime.configured ? (
        <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-950">
          <p className="font-semibold">Billing provider is not configured</p>
          <p className="mt-1 text-xs leading-relaxed">
            {runtime.configurationError ?? "Check BILLING_PROVIDER and PG environment variables."}
          </p>
        </div>
      ) : null}

      {banner ? (
        <div className={cn("rounded-xl border px-4 py-3", toneClasses(banner.tone))}>
          <p className="font-semibold">{banner.title}</p>
          <p className="mt-1 text-sm leading-relaxed">{banner.body}</p>
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current plan</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">{PLAN_LABEL[billing.plan]}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{PLAN_TAGLINE[billing.plan]}</p>
            </div>
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold",
                toneClasses(billingStatusTone(billing.subscriptionStatus))
              )}
            >
              {billingStatusLabel(billing.subscriptionStatus)}
            </span>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-background px-3 py-3">
              <p className="text-xs text-muted-foreground">Trial start</p>
              <p className="mt-1 font-medium">{formatDate(billing.trialStartedAt)}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background px-3 py-3">
              <p className="text-xs text-muted-foreground">Trial end</p>
              <p className="mt-1 font-medium">{formatDate(billing.trialEndsAt)}</p>
              {trialRemainingLabel(billing) ? (
                <p className="mt-1 text-xs text-amber-700">{trialRemainingLabel(billing)}</p>
              ) : null}
            </div>
            <div className="rounded-xl border border-border/60 bg-background px-3 py-3">
              <p className="text-xs text-muted-foreground">Next billing date</p>
              <p className="mt-1 font-medium">{formatDate(billing.currentPeriodEnd)}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background px-3 py-3">
              <p className="text-xs text-muted-foreground">Cancellation</p>
              <p className="mt-1 font-medium">
                {billing.cancelAtPeriodEnd ? `Scheduled for ${formatDate(billing.currentPeriodEnd)}` : "Not scheduled"}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background px-3 py-3">
              <p className="text-xs text-muted-foreground">Target plan intent</p>
              <p className="mt-1 font-medium">{selectedPlan ? PLAN_LABEL[selectedPlan] : "Current plan"}</p>
              {selectedPlanNeedsAttention ? (
                <p className="mt-1 text-xs text-amber-700">
                  Pricing entry intent is set to {PLAN_LABEL[selectedPlan!]}. Choose that plan below to apply it.
                </p>
              ) : null}
            </div>
            <div className="rounded-xl border border-border/60 bg-background px-3 py-3">
              <p className="text-xs text-muted-foreground">Billing provider</p>
              <p className="mt-1 font-medium uppercase">
                {runtime.provider} <span className="text-muted-foreground">({runtime.mode})</span>
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background px-3 py-3">
              <p className="text-xs text-muted-foreground">Effective access</p>
              <p className="mt-1 font-medium">{PLAN_LABEL[effectivePlan]}</p>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-background px-4 py-3">
            <div className="flex items-center gap-2">
              <CreditCard className="size-4 text-muted-foreground" />
              <p className="text-sm font-medium">Payment method</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{paymentMethodLabel}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9")}
                disabled={pending || billingUnavailable}
                onClick={() => run(() => openBillingPortalAction())}
              >
                {pending ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
                Manage card / portal
              </button>
              {(billing.subscriptionStatus === "trial_expired" ||
                billing.subscriptionStatus === "canceled" ||
                billing.subscriptionStatus === "pending" ||
                billing.subscriptionStatus === "incomplete") ? (
                <button
                  type="button"
                  className={cn(buttonVariants({ size: "sm" }), "h-9")}
                  disabled={pending || billingUnavailable}
                  onClick={() => run(() => startCheckoutAction(billing.plan))}
                >
                  Restart checkout
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/10 p-4">
          <div className="flex items-center gap-2">
            <ReceiptText className="size-4 text-muted-foreground" />
            <h3 className="text-base font-semibold">This month usage</h3>
          </div>

          <div>
            <div className="flex justify-between gap-2 text-sm">
              <span>AI usage</span>
              <span className="tabular-nums text-muted-foreground">
                {billing.aiCallsThisMonth} / {limits.aiCallsPerMonth}
              </span>
            </div>
            <UsageBar used={billing.aiCallsThisMonth} limit={limits.aiCallsPerMonth} colorClass="bg-primary" />
          </div>

          <div>
            <div className="flex justify-between gap-2 text-sm">
              <span>document_send</span>
              <span className="tabular-nums text-muted-foreground">
                {billing.documentSendsThisMonth} / {limits.documentSendsPerMonth}
              </span>
            </div>
            <UsageBar
              used={billing.documentSendsThisMonth}
              limit={limits.documentSendsPerMonth}
              colorClass="bg-teal-600"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Counted actions: email delivery, link copy/share, PDF download, and BYOA message send.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-background px-3 py-3">
              <p className="text-xs text-muted-foreground">Public inquiry forms</p>
              <p className="mt-1 font-medium tabular-nums">{publicInquiryFormCount}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background px-3 py-3">
              <p className="text-xs text-muted-foreground">Customer portals</p>
              <p className="mt-1 font-medium tabular-nums">
                {portalEnabledCount} / {limits.maxPortalCustomers}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background px-3 py-3">
              <p className="text-xs text-muted-foreground">Team members</p>
              <p className="mt-1 font-medium tabular-nums">
                {seatUsedCount} / {limits.seats}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Launch build currently tracks the active operator count for this workspace.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background px-3 py-3">
              <p className="text-xs text-muted-foreground">Payment status updated</p>
              <p className="mt-1 font-medium">{formatDate(billing.billingStatusUpdatedAt)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-background px-4 py-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Grace and fallback policy</p>
            <p className="mt-1 leading-relaxed">
              `past_due` stays visible with an explicit payment warning. `trial_expired`, `canceled`, `pending`, and
              `incomplete` fall back to starter-level access until billing is restored.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Upgrade / downgrade</h3>
            <p className="text-sm text-muted-foreground">
              Choose a new plan to start checkout or update the current subscription.
            </p>
          </div>
          <Link href={BILLING_PAGE_PATH} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-9")}>
            Pricing guide
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const currentPrice = PLAN_PRICE_KRW_MONTH[billing.plan] ?? 0
            const nextPrice = PLAN_PRICE_KRW_MONTH[plan] ?? 0
            const isCurrent = billing.plan === plan
            const isSelectedIntent = selectedPlan === plan
            const label = isCurrent ? "Current" : nextPrice > currentPrice ? "Upgrade" : "Downgrade"

            return (
              <article
                key={plan}
                className={cn(
                  "rounded-2xl border p-4 shadow-sm",
                  isCurrent
                    ? "border-primary/40 bg-primary/[0.04]"
                    : isSelectedIntent
                      ? "border-amber-500/40 bg-amber-500/[0.05]"
                      : "border-border/60 bg-background"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">{PLAN_LABEL[plan]}</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight">
                      {PLAN_PRICE_KRW_MONTH[plan] != null
                        ? `₩${PLAN_PRICE_KRW_MONTH[plan]!.toLocaleString("ko-KR")}`
                        : "Contact"}
                      <span className="ml-1 text-sm font-normal text-muted-foreground">/mo</span>
                    </p>
                  </div>
                  {isCurrent ? (
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                      Current plan
                    </span>
                  ) : isSelectedIntent ? (
                    <span className="rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
                      Selected intent
                    </span>
                  ) : null}
                </div>

                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{PLAN_TAGLINE[plan]}</p>
                {!isCurrent && nextPrice < currentPrice ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Downgrades apply through the current provider flow as soon as the subscription change is accepted.
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={cn(
                      buttonVariants({ size: "sm", variant: isCurrent ? "outline" : "default" }),
                      "h-9"
                    )}
                    disabled={pending || isCurrent || billingUnavailable}
                    onClick={() =>
                      run(
                        () => selectSubscriptionPlanAction(plan),
                        `${PLAN_LABEL[plan]} plan request has been applied.`
                      )
                    }
                  >
                    {label}
                  </button>

                  {!isCurrent &&
                  (billing.subscriptionStatus === "trial_expired" ||
                    billing.subscriptionStatus === "canceled" ||
                    billing.subscriptionStatus === "pending" ||
                    billing.subscriptionStatus === "incomplete") ? (
                    <button
                      type="button"
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9")}
                      disabled={pending || billingUnavailable}
                      onClick={() => run(() => startCheckoutAction(plan))}
                    >
                      Start checkout
                    </button>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.06] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Cancellation and recovery</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The cancel button is always visible. Cancellation takes effect at period end, and the resume action clears
              the scheduled cancellation.
            </p>
          </div>
          <AlertTriangle className="size-5 text-rose-700" />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={cn(buttonVariants({ variant: "destructive", size: "sm" }), "h-9")}
            disabled={pending || billing.cancelAtPeriodEnd || billingUnavailable}
            onClick={() => run(() => scheduleSubscriptionCancelAction(), "Cancellation has been scheduled.")}
          >
            Cancel at period end
          </button>

          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9")}
            disabled={pending || !billing.cancelAtPeriodEnd || billingUnavailable}
            onClick={() => run(() => resumeSubscriptionAction(), "Scheduled cancellation was removed.")}
          >
            <RotateCcw className="mr-1 size-4" />
            Resume subscription
          </button>

          <button
            type="button"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-9")}
            disabled={pending || billingUnavailable}
            onClick={() => run(() => openBillingPortalAction())}
          >
            Update payment method
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-muted-foreground" />
          <h3 className="text-base font-semibold">Recent billing events</h3>
        </div>

        {events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 px-4 py-4 text-sm text-muted-foreground">
            No billing history has been recorded yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {events.map((event) => (
              <li key={event.id} className="rounded-xl border border-border/60 bg-background px-4 py-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{EVENT_LABELS[event.kind] ?? event.kind}</p>
                    <p className="mt-1 text-muted-foreground">{event.message}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <time>{formatDateTime(event.createdAt)}</time>
                    <ArrowRight className="size-3" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
