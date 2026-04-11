import type { SupabaseClient } from "@supabase/supabase-js"

import { getBillingMode, getBillingProvider } from "@/lib/billing/provider"
import type { BillingWebhookEvent } from "@/lib/billing/provider-types"
import { PLAN_LABEL } from "@/lib/billing/catalog"
import { normalizePlan } from "@/lib/plan-features"
import { isTrialActive, type UserBillingSnapshot } from "@/lib/subscription"
import { getSiteOrigin } from "@/lib/site-url"
import { createServiceSupabaseClient } from "@/lib/supabase/service"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { fetchUserBillingState } from "@/lib/user-plan"
import type { BillingPlan, SubscriptionStatus } from "@/types/domain"
import type { Database, Json } from "@/types/supabase"

type WritableSupabase = SupabaseClient<Database>
type BillingEventInsert = Database["public"]["Tables"]["billing_events"]["Insert"]
type BillingWebhookEventInsert = Database["public"]["Tables"]["billing_webhook_events"]["Insert"]
type UserUpdate = Database["public"]["Tables"]["users"]["Update"]

function nextMonthIso() {
  const date = new Date()
  date.setMonth(date.getMonth() + 1)
  return date.toISOString()
}

function billingRedirectPath(plan?: BillingPlan) {
  return `${getSiteOrigin()}/billing${plan ? `?plan=${plan}` : ""}`
}

async function resolveWritableSupabase() {
  return createServiceSupabaseClient() ?? (await createServerSupabaseClient())
}

async function insertBillingEvent(
  supabase: WritableSupabase,
  userId: string,
  kind: string,
  message: string,
  metadata: Json = {}
) {
  const row: BillingEventInsert = {
    user_id: userId,
    kind,
    message,
    metadata,
  }
  const { error } = await supabase.from("billing_events").insert(row)
  if (error) {
    console.warn("[billing_events.insert]", error.message)
  }
}

async function updateUserBillingState(
  supabase: WritableSupabase,
  userId: string,
  patch: UserUpdate
) {
  const { error } = await supabase
    .from("users")
    .update({
      ...patch,
      billing_status_updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
  if (error) {
    throw error
  }
}

async function loadStripeCustomerId(
  supabase: WritableSupabase,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("users")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle()
  if (error) {
    throw error
  }
  return data?.stripe_customer_id ?? null
}

async function loadBillingUserByIds(
  supabase: WritableSupabase,
  event: BillingWebhookEvent
): Promise<{ id: string; stripe_customer_id: string | null } | null> {
  if (event.userId) {
    const { data, error } = await supabase
      .from("users")
      .select("id, stripe_customer_id")
      .eq("id", event.userId)
      .maybeSingle()
    if (!error && data) {
      return data
    }
  }

  if (event.providerSubscriptionId) {
    const { data, error } = await supabase
      .from("users")
      .select("id, stripe_customer_id")
      .eq("billing_provider_subscription_id", event.providerSubscriptionId)
      .maybeSingle()
    if (!error && data) {
      return data
    }
  }

  if (event.providerCustomerId) {
    const { data, error } = await supabase
      .from("users")
      .select("id, stripe_customer_id")
      .eq("stripe_customer_id", event.providerCustomerId)
      .maybeSingle()
    if (!error && data) {
      return data
    }
  }

  return null
}

function buildPlanChangeKind(currentPlan: BillingPlan, nextPlan: BillingPlan) {
  const order: Record<BillingPlan, number> = {
    starter: 0,
    pro: 1,
    business: 2,
  }
  if (order[nextPlan] > order[currentPlan]) {
    return "subscription_upgraded"
  }
  if (order[nextPlan] < order[currentPlan]) {
    return "subscription_downgraded"
  }
  return "subscription_updated"
}

function coerceStatus(
  current: UserBillingSnapshot,
  nextStatus: SubscriptionStatus | null | undefined
): SubscriptionStatus {
  if (nextStatus) {
    return nextStatus
  }
  return current.subscriptionStatus
}

function webhookEventKind(
  event: BillingWebhookEvent,
  currentPlan: BillingPlan,
  nextPlan: BillingPlan
) {
  switch (event.eventType) {
    case "checkout.session.completed":
      return "payment_method_added"
    case "customer.subscription.created":
      return "subscription_started"
    case "customer.subscription.updated":
      return buildPlanChangeKind(currentPlan, nextPlan)
    case "customer.subscription.deleted":
      return "subscription_canceled"
    case "invoice.payment_succeeded":
      return "payment_succeeded"
    case "invoice.payment_failed":
      return "payment_failed"
    case "customer.subscription.trial_will_end":
      return "trial_will_end"
    case "subscription.created":
    case "subscription.activated":
      return "subscription_started"
    case "subscription.updated":
      return buildPlanChangeKind(currentPlan, nextPlan)
    case "subscription.canceled":
    case "subscription.cancelled":
      return "subscription_canceled"
    case "transaction.completed":
      return "payment_succeeded"
    case "transaction.payment_failed":
      return "payment_failed"
    default:
      return event.eventType.replace(/\./g, "_")
  }
}

function webhookEventMessage(event: BillingWebhookEvent, nextPlan: BillingPlan) {
  if (event.message?.trim()) {
    return event.message
  }
  switch (event.eventType) {
    case "checkout.session.completed":
      return "Payment method was saved and checkout completed."
    case "customer.subscription.created":
      return `${PLAN_LABEL[nextPlan]} subscription started.`
    case "customer.subscription.updated":
      return `${PLAN_LABEL[nextPlan]} subscription was updated.`
    case "customer.subscription.deleted":
      return "Subscription ended."
    case "invoice.payment_succeeded":
      return "Recurring payment succeeded."
    case "invoice.payment_failed":
      return "Recurring payment failed."
    case "customer.subscription.trial_will_end":
      return "Trial will end soon."
    case "subscription.created":
    case "subscription.activated":
      return `${PLAN_LABEL[nextPlan]} 구독이 시작되었습니다.`
    case "subscription.updated":
      return `${PLAN_LABEL[nextPlan]} 구독이 갱신되었습니다.`
    case "subscription.canceled":
    case "subscription.cancelled":
      return "구독이 종료되었습니다."
    case "transaction.completed":
      return "결제가 완료되었습니다."
    case "transaction.payment_failed":
      return "결제에 실패했습니다."
    default:
      return "Billing state changed."
  }
}

async function insertOrResumeWebhookEvent(
  supabase: WritableSupabase,
  row: BillingWebhookEventInsert
): Promise<{ proceed: true } | { proceed: false; skipped: boolean }> {
  const { error } = await supabase.from("billing_webhook_events").insert(row)
  if (!error) {
    return { proceed: true }
  }

  const code = String((error as { code?: string }).code ?? "")
  if (code !== "23505") {
    throw error
  }

  const existing = await supabase
    .from("billing_webhook_events")
    .select("processed")
    .eq("provider", row.provider)
    .eq("event_id", row.event_id)
    .maybeSingle()

  if (existing.error) {
    throw existing.error
  }

  if (existing.data?.processed) {
    return { proceed: false, skipped: true }
  }

  return { proceed: true }
}

async function markWebhookProcessed(
  supabase: WritableSupabase,
  provider: string,
  eventId: string
) {
  const { error } = await supabase
    .from("billing_webhook_events")
    .update({ processed: true, processed_at: new Date().toISOString() })
    .eq("provider", provider)
    .eq("event_id", eventId)
  if (error) {
    throw error
  }
}

export async function getBillingRuntimeSnapshot() {
  const provider = getBillingProvider()
  return {
    provider: provider.name,
    mode: getBillingMode(),
    configured: provider.isConfigured(),
    configurationError: provider.getConfigurationError(),
  }
}

export async function beginCheckoutForPlan(input: {
  userId: string
  email: string
  plan: BillingPlan
}): Promise<{ ok: true; redirectUrl: string } | { ok: false; error: string }> {
  const provider = getBillingProvider()
  const supabase = await resolveWritableSupabase()
  if (!supabase) {
    return { ok: false, error: "결제·구독 저장소에 연결할 수 없습니다." }
  }

  const billing = await fetchUserBillingState(supabase, input.userId)
  const runtime = await getBillingRuntimeSnapshot()
  if (!runtime.configured && provider.name !== "mock") {
    return {
      ok: false,
      error: runtime.configurationError ?? "Billing provider is not configured.",
    }
  }

  const trialEndsAt = isTrialActive(billing) ? billing.trialEndsAt : null

  if (provider.name === "mock") {
    await updateUserBillingState(supabase, input.userId, {
      plan: input.plan,
      subscription_status: trialEndsAt ? "trialing" : "active",
      trial_started_at: billing.trialStartedAt ?? new Date().toISOString(),
      trial_ends_at: trialEndsAt,
      current_period_end: trialEndsAt ?? nextMonthIso(),
      cancel_at_period_end: false,
      pending_plan: null,
      billing_provider: "mock",
      billing_provider_subscription_id: `mock_sub_${input.userId}_${input.plan}`,
      billing_provider_price_id: `mock_price_${input.plan}`,
      payment_method_brand: "mock-card",
      payment_method_last4: "4242",
    })

    await insertBillingEvent(supabase, input.userId, "payment_method_added", "Mock payment method saved.", {
      provider: "mock",
    })
    await insertBillingEvent(
      supabase,
      input.userId,
      trialEndsAt ? "trial_started" : "subscription_started",
      trialEndsAt
        ? `${PLAN_LABEL[input.plan]} trial is active until ${trialEndsAt}.`
        : `${PLAN_LABEL[input.plan]} subscription is active.`,
      { provider: "mock", plan: input.plan }
    )

    return { ok: true, redirectUrl: billingRedirectPath(input.plan) }
  }

  let stripeCustomerId: string | null = null
  try {
    stripeCustomerId = await loadStripeCustomerId(supabase, input.userId)
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not load billing customer.",
    }
  }

  const checkout = await provider.createCheckoutSession({
    userId: input.userId,
    email: input.email,
    plan: input.plan,
    trialEndsAt,
    successUrl: billingRedirectPath(input.plan),
    cancelUrl: billingRedirectPath(input.plan),
    customerId: stripeCustomerId,
  })

  if (!checkout.ok) {
    return { ok: false, error: checkout.error }
  }

  await updateUserBillingState(supabase, input.userId, {
    plan: input.plan,
    subscription_status: trialEndsAt ? "pending" : "incomplete",
    pending_plan: null,
    billing_provider: provider.name,
    billing_provider_subscription_id: checkout.providerSubscriptionId ?? billing.billingProviderSubscriptionId,
    billing_provider_price_id: checkout.providerPriceId ?? billing.billingProviderPriceId,
    stripe_customer_id: checkout.providerCustomerId ?? stripeCustomerId,
    trial_started_at: billing.trialStartedAt ?? (trialEndsAt ? new Date().toISOString() : null),
  })

  await insertBillingEvent(
    supabase,
    input.userId,
    "checkout_started",
    `${PLAN_LABEL[input.plan]} checkout started.`,
    {
      provider: provider.name,
      plan: input.plan,
      trialEndsAt,
    }
  )

  return { ok: true, redirectUrl: checkout.redirectUrl }
}

export async function openBillingPortalForUser(input: {
  userId: string
}): Promise<{ ok: true; redirectUrl: string } | { ok: false; error: string }> {
  const provider = getBillingProvider()
  const supabase = await resolveWritableSupabase()
  if (!supabase) {
    return { ok: false, error: "결제 포털을 열 수 없습니다." }
  }

  if (provider.name === "mock") {
    await insertBillingEvent(supabase, input.userId, "portal_opened", "Opened mock billing portal.", {
      provider: "mock",
    })
    return { ok: true, redirectUrl: billingRedirectPath() }
  }

  let stripeCustomerId: string | null = null
  try {
    stripeCustomerId = await loadStripeCustomerId(supabase, input.userId)
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not load billing customer.",
    }
  }

  if (!stripeCustomerId) {
    return {
      ok: false,
      error: "저장된 결제 고객이 없습니다. 먼저 체크아웃으로 결제를 진행해 주세요.",
    }
  }

  const portal = await provider.createPortalSession({
    customerId: stripeCustomerId,
    returnUrl: billingRedirectPath(),
  })
  if (!portal.ok) {
    return { ok: false, error: portal.error }
  }

  await insertBillingEvent(supabase, input.userId, "portal_opened", "Opened billing portal.", {
    provider: provider.name,
  })
  return { ok: true, redirectUrl: portal.redirectUrl }
}

export async function changeUserSubscriptionPlan(input: {
  userId: string
  plan: BillingPlan
}): Promise<{ ok: true; redirectUrl?: string } | { ok: false; error: string }> {
  const provider = getBillingProvider()
  const supabase = await resolveWritableSupabase()
  if (!supabase) {
    return { ok: false, error: "구독 상태를 불러올 수 없습니다." }
  }

  const billing = await fetchUserBillingState(supabase, input.userId)
  const changeKind = buildPlanChangeKind(billing.plan, input.plan)

  if (provider.name === "mock") {
    await updateUserBillingState(supabase, input.userId, {
      plan: input.plan,
      subscription_status:
        billing.subscriptionStatus === "trialing" && isTrialActive(billing)
          ? "trialing"
          : "active",
      pending_plan: null,
      cancel_at_period_end: false,
      billing_provider: "mock",
      billing_provider_price_id: `mock_price_${input.plan}`,
    })
    await insertBillingEvent(
      supabase,
      input.userId,
      changeKind,
      `${PLAN_LABEL[input.plan]} plan is now active.`,
      { provider: "mock", plan: input.plan }
    )
    return { ok: true }
  }

  if (!billing.billingProviderSubscriptionId) {
    return { ok: false, error: "활성 구독이 없습니다. 먼저 결제(체크아웃)를 진행해 주세요." }
  }

  const change = await provider.updateSubscriptionPlan({
    subscriptionId: billing.billingProviderSubscriptionId,
    plan: input.plan,
  })
  if (!change.ok) {
    return { ok: false, error: change.error }
  }

  await updateUserBillingState(supabase, input.userId, {
    plan: input.plan,
    subscription_status: coerceStatus(billing, "active"),
    current_period_end: change.currentPeriodEnd ?? billing.currentPeriodEnd,
    cancel_at_period_end: change.cancelAtPeriodEnd ?? false,
    pending_plan: null,
    billing_provider_price_id: change.providerPriceId ?? billing.billingProviderPriceId,
  })

  await insertBillingEvent(
    supabase,
    input.userId,
    changeKind,
    `${PLAN_LABEL[input.plan]} plan change was applied.`,
    { provider: provider.name, plan: input.plan }
  )

  return { ok: true }
}

export async function scheduleUserSubscriptionCancel(userId: string) {
  const provider = getBillingProvider()
  const supabase = await resolveWritableSupabase()
  if (!supabase) {
    return { ok: false as const, error: "Subscription state is unavailable." }
  }

  const billing = await fetchUserBillingState(supabase, userId)

  if (provider.name === "mock" || !billing.billingProviderSubscriptionId) {
    await updateUserBillingState(supabase, userId, {
      cancel_at_period_end: true,
      current_period_end: billing.currentPeriodEnd ?? nextMonthIso(),
    })
    await insertBillingEvent(
      supabase,
      userId,
      "cancel_scheduled",
      "Cancellation is scheduled for the current billing period end.",
      { provider: provider.name }
    )
    return { ok: true as const }
  }

  const result = await provider.scheduleCancel(billing.billingProviderSubscriptionId)
  if (!result.ok) {
    return { ok: false as const, error: result.error }
  }

  await updateUserBillingState(supabase, userId, {
    cancel_at_period_end: true,
    current_period_end: result.currentPeriodEnd ?? billing.currentPeriodEnd,
  })
  await insertBillingEvent(
    supabase,
    userId,
    "cancel_scheduled",
    "Cancellation is scheduled for the current billing period end.",
    { provider: provider.name }
  )
  return { ok: true as const }
}

export async function resumeUserSubscription(userId: string) {
  const provider = getBillingProvider()
  const supabase = await resolveWritableSupabase()
  if (!supabase) {
    return { ok: false as const, error: "Subscription state is unavailable." }
  }

  const billing = await fetchUserBillingState(supabase, userId)

  if (provider.name === "mock" || !billing.billingProviderSubscriptionId) {
    await updateUserBillingState(supabase, userId, {
      cancel_at_period_end: false,
    })
    await insertBillingEvent(supabase, userId, "cancel_resumed", "Scheduled cancellation was removed.", {
      provider: provider.name,
    })
    return { ok: true as const }
  }

  const result = await provider.resumeSubscription(billing.billingProviderSubscriptionId)
  if (!result.ok) {
    return { ok: false as const, error: result.error }
  }

  await updateUserBillingState(supabase, userId, {
    cancel_at_period_end: false,
    current_period_end: result.currentPeriodEnd ?? billing.currentPeriodEnd,
  })
  await insertBillingEvent(supabase, userId, "cancel_resumed", "Scheduled cancellation was removed.", {
    provider: provider.name,
  })
  return { ok: true as const }
}

export async function changePlanOrCheckout(input: {
  userId: string
  email: string
  plan: BillingPlan
}): Promise<{ ok: true; redirectUrl?: string } | { ok: false; error: string }> {
  const supabase = await resolveWritableSupabase()
  if (!supabase) {
    return { ok: false, error: "구독 정보를 불러오지 못했습니다." }
  }

  const billing = await fetchUserBillingState(supabase, input.userId)
  const needsCheckout =
    !billing.billingProviderSubscriptionId ||
    billing.subscriptionStatus === "trial_expired" ||
    billing.subscriptionStatus === "canceled" ||
    billing.subscriptionStatus === "incomplete" ||
    billing.subscriptionStatus === "pending"

  if (needsCheckout) {
    return beginCheckoutForPlan(input)
  }
  return changeUserSubscriptionPlan({ userId: input.userId, plan: input.plan })
}

export async function handleBillingWebhook(request: Request) {
  const provider = getBillingProvider()
  const supabase = createServiceSupabaseClient()
  if (!supabase) {
    return { ok: false as const, status: 503, error: "Service-role Supabase is required for billing webhooks." }
  }

  const parsed = await provider.parseWebhook(request)
  if (!parsed.ok) {
    return parsed
  }

  const webhookRow: BillingWebhookEventInsert = {
    provider: provider.name,
    event_id: parsed.event.eventId,
    event_type: parsed.event.eventType,
    payload: parsed.payload as Json,
  }

  try {
    const dedupe = await insertOrResumeWebhookEvent(supabase, webhookRow)
    if (!dedupe.proceed) {
      return { ok: true as const, status: 200, skipped: dedupe.skipped }
    }

    const user = await loadBillingUserByIds(supabase, parsed.event)
    if (user) {
      const current = await fetchUserBillingState(supabase, user.id)
      const nextPlan = normalizePlan(parsed.event.plan ?? current.plan)
      const nextStatus =
        (parsed.event.eventType === "invoice.payment_succeeded" ||
          parsed.event.eventType === "transaction.completed") &&
        current.subscriptionStatus === "past_due"
          ? "active"
          : coerceStatus(current, parsed.event.subscriptionStatus)

      await updateUserBillingState(supabase, user.id, {
        plan: nextPlan,
        subscription_status: nextStatus,
        trial_started_at: parsed.event.trialStartedAt ?? current.trialStartedAt,
        trial_ends_at: parsed.event.trialEndsAt ?? current.trialEndsAt,
        current_period_end: parsed.event.currentPeriodEnd ?? current.currentPeriodEnd,
        cancel_at_period_end: parsed.event.cancelAtPeriodEnd ?? current.cancelAtPeriodEnd,
        pending_plan: null,
        billing_provider: provider.name,
        billing_provider_subscription_id:
          parsed.event.providerSubscriptionId ?? current.billingProviderSubscriptionId,
        billing_provider_price_id: parsed.event.providerPriceId ?? current.billingProviderPriceId,
        payment_method_brand: parsed.event.paymentMethodBrand ?? current.paymentMethodBrand,
        payment_method_last4: parsed.event.paymentMethodLast4 ?? current.paymentMethodLast4,
        stripe_customer_id: parsed.event.providerCustomerId ?? user.stripe_customer_id,
      })

      await insertBillingEvent(
        supabase,
        user.id,
        webhookEventKind(parsed.event, current.plan, nextPlan),
        webhookEventMessage(parsed.event, nextPlan),
        {
          provider: provider.name,
          providerEventId: parsed.event.eventId,
          providerSubscriptionId: parsed.event.providerSubscriptionId ?? null,
          providerCustomerId: parsed.event.providerCustomerId ?? null,
          providerPriceId: parsed.event.providerPriceId ?? null,
          plan: nextPlan,
          status: nextStatus,
          ...(parsed.event.metadata ?? {}),
        }
      )

      if (parsed.event.eventType === "invoice.payment_failed") {
        const nextAttempt =
          typeof parsed.event.metadata?.nextPaymentAttempt === "string"
            ? parsed.event.metadata.nextPaymentAttempt
            : null
        if (nextAttempt) {
          await insertBillingEvent(
            supabase,
            user.id,
            "retry_scheduled",
            `Next payment retry is scheduled for ${new Date(nextAttempt).toLocaleString("ko-KR")}.`,
            {
              provider: provider.name,
              nextPaymentAttempt: nextAttempt,
            }
          )
        }
      }
    }

    await markWebhookProcessed(supabase, provider.name, parsed.event.eventId)
    return { ok: true as const, status: 200, skipped: false }
  } catch (error) {
    console.error("[handleBillingWebhook]", error)
    return {
      ok: false as const,
      status: 500,
      error: error instanceof Error ? error.message : "Webhook processing failed.",
    }
  }
}
