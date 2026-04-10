import { createHmac, timingSafeEqual } from "node:crypto"

import type {
  BillingCheckoutInput,
  BillingPortalInput,
  BillingProvider,
  BillingProviderChangeResult,
  BillingProviderCheckoutResult,
  BillingProviderPortalResult,
  BillingSubscriptionChangeInput,
  BillingWebhookEvent,
} from "@/lib/billing/provider-types"
import { getBillingMode } from "@/lib/billing/provider"
import { normalizePlan } from "@/lib/plan-features"
import type { BillingPlan, SubscriptionStatus } from "@/types/domain"

type StripeObject = Record<string, unknown>

function getStripeSecretKey() {
  return process.env.BILLING_STRIPE_SECRET_KEY?.trim() ?? ""
}

function getStripeWebhookSecret() {
  return process.env.BILLING_STRIPE_WEBHOOK_SECRET?.trim() ?? ""
}

function getPriceId(plan: BillingPlan) {
  if (plan === "business") {
    return process.env.BILLING_STRIPE_PRICE_BUSINESS_MONTHLY?.trim() ?? ""
  }
  if (plan === "pro") {
    return process.env.BILLING_STRIPE_PRICE_PRO_MONTHLY?.trim() ?? ""
  }
  return process.env.BILLING_STRIPE_PRICE_STARTER_MONTHLY?.trim() ?? ""
}

function planFromPriceId(priceId: string | null | undefined): BillingPlan | null {
  const starter = process.env.BILLING_STRIPE_PRICE_STARTER_MONTHLY?.trim()
  const pro = process.env.BILLING_STRIPE_PRICE_PRO_MONTHLY?.trim()
  const business = process.env.BILLING_STRIPE_PRICE_BUSINESS_MONTHLY?.trim()
  if (priceId && priceId === business) {
    return "business"
  }
  if (priceId && priceId === pro) {
    return "pro"
  }
  if (priceId && priceId === starter) {
    return "starter"
  }
  return null
}

function formBody(input: Record<string, string | number | boolean | null | undefined>) {
  const body = new URLSearchParams()
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") {
      continue
    }
    body.set(key, String(value))
  }
  return body
}

async function stripeRequest<T>(
  path: string,
  {
    method = "POST",
    body,
  }: {
    method?: "GET" | "POST"
    body?: URLSearchParams
  } = {}
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const secretKey = getStripeSecretKey()
  if (!secretKey) {
    return { ok: false, error: "Stripe secret key가 설정되지 않았습니다." }
  }
  const response = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: body?.toString(),
  })
  const json = (await response.json().catch(() => null)) as Record<string, unknown> | null
  if (!response.ok) {
    const message =
      typeof json?.error === "object" && json?.error && "message" in json.error
        ? String((json.error as { message?: string }).message ?? "")
        : ""
    return { ok: false, error: message || `Stripe API 오류 (${response.status})` }
  }
  return { ok: true, data: json as T }
}

function toIsoSeconds(value: unknown): string | null {
  if (typeof value !== "number") {
    return null
  }
  return new Date(value * 1000).toISOString()
}

function normalizeStripeStatus(raw: unknown): SubscriptionStatus | null {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : ""
  if (value === "trialing") return "trialing"
  if (value === "active") return "active"
  if (value === "past_due") return "past_due"
  if (value === "canceled" || value === "unpaid") return "canceled"
  if (value === "incomplete" || value === "incomplete_expired") return "incomplete"
  return null
}

function parseStripeSignature(header: string | null) {
  if (!header) {
    return null
  }
  const parts = header.split(",")
  const out: Record<string, string> = {}
  for (const part of parts) {
    const [key, value] = part.split("=", 2)
    if (key && value) {
      out[key.trim()] = value.trim()
    }
  }
  if (!out.t || !out.v1) {
    return null
  }
  return { timestamp: out.t, signature: out.v1 }
}

function verifyStripeSignature(rawBody: string, header: string | null) {
  const secret = getStripeWebhookSecret()
  if (!secret) {
    return false
  }
  const parsed = parseStripeSignature(header)
  if (!parsed) {
    return false
  }
  const payload = `${parsed.timestamp}.${rawBody}`
  const digest = createHmac("sha256", secret).update(payload).digest("hex")
  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(parsed.signature))
  } catch {
    return false
  }
}

function extractSubscriptionObject(payload: StripeObject) {
  const data = payload.data
  if (!data || typeof data !== "object") {
    return null
  }
  const object = (data as { object?: unknown }).object
  return object && typeof object === "object" ? (object as StripeObject) : null
}

async function fetchSubscriptionItemId(subscriptionId: string): Promise<string | null> {
  const result = await stripeRequest<StripeObject>(
    `/v1/subscriptions/${encodeURIComponent(subscriptionId)}?expand[]=items.data.price`
  )
  if (!result.ok) {
    return null
  }
  const items = (((result.data.items as StripeObject | undefined)?.data as unknown[]) ?? []) as StripeObject[]
  const first = items[0]
  return typeof first?.id === "string" ? first.id : null
}

export class StripeBillingProvider implements BillingProvider {
  readonly name = "stripe" as const
  readonly mode = getBillingMode()

  isConfigured() {
    return Boolean(
      getStripeSecretKey() &&
        getStripeWebhookSecret() &&
        getPriceId("starter") &&
        getPriceId("pro") &&
        getPriceId("business")
    )
  }

  getConfigurationError() {
    if (this.isConfigured()) {
      return null
    }
    return "Stripe 환경변수(BILLING_STRIPE_SECRET_KEY / BILLING_STRIPE_WEBHOOK_SECRET / price id)가 누락되었습니다."
  }

  async createCheckoutSession(input: BillingCheckoutInput): Promise<BillingProviderCheckoutResult> {
    const priceId = getPriceId(input.plan)
    if (!priceId) {
      return { ok: false, error: `${input.plan} 플랜의 Stripe price id가 없습니다.` }
    }

    const body = formBody({
      mode: "subscription",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": 1,
      client_reference_id: input.userId,
      customer: input.customerId ?? undefined,
      customer_email: input.customerId ? undefined : input.email,
      "subscription_data[metadata][user_id]": input.userId,
      "subscription_data[metadata][selected_plan]": input.plan,
      "metadata[user_id]": input.userId,
      "metadata[selected_plan]": input.plan,
    })

    if (input.trialEndsAt) {
      const trialEnd = Math.floor(new Date(input.trialEndsAt).getTime() / 1000)
      if (Number.isFinite(trialEnd) && trialEnd > Math.floor(Date.now() / 1000)) {
        body.set("subscription_data[trial_end]", String(trialEnd))
      }
    }

    const result = await stripeRequest<StripeObject>("/v1/checkout/sessions", { body })
    if (!result.ok) {
      return { ok: false, error: result.error }
    }
    return {
      ok: true,
      redirectUrl: String(result.data.url ?? ""),
      providerCustomerId: typeof result.data.customer === "string" ? result.data.customer : null,
      providerSubscriptionId: typeof result.data.subscription === "string" ? result.data.subscription : null,
      providerPriceId: priceId,
    }
  }

  async createPortalSession(input: BillingPortalInput): Promise<BillingProviderPortalResult> {
    const result = await stripeRequest<StripeObject>("/v1/billing_portal/sessions", {
      body: formBody({
        customer: input.customerId,
        return_url: input.returnUrl,
      }),
    })
    if (!result.ok) {
      return { ok: false, error: result.error }
    }
    return { ok: true, redirectUrl: String(result.data.url ?? "") }
  }

  async updateSubscriptionPlan(input: BillingSubscriptionChangeInput): Promise<BillingProviderChangeResult> {
    const itemId = await fetchSubscriptionItemId(input.subscriptionId)
    if (!itemId) {
      return { ok: false, error: "구독 항목을 찾지 못했습니다." }
    }
    const priceId = getPriceId(input.plan)
    if (!priceId) {
      return { ok: false, error: `${input.plan} 플랜 price id가 없습니다.` }
    }
    const result = await stripeRequest<StripeObject>(`/v1/subscriptions/${encodeURIComponent(input.subscriptionId)}`, {
      body: formBody({
        "items[0][id]": itemId,
        "items[0][price]": priceId,
        proration_behavior: "none",
        cancel_at_period_end: input.cancelAtPeriodEnd ?? false,
      }),
    })
    if (!result.ok) {
      return { ok: false, error: result.error }
    }
    return {
      ok: true,
      providerSubscriptionId: typeof result.data.id === "string" ? result.data.id : input.subscriptionId,
      providerPriceId: priceId,
      currentPeriodEnd: toIsoSeconds(result.data.current_period_end),
      cancelAtPeriodEnd: Boolean(result.data.cancel_at_period_end),
    }
  }

  async scheduleCancel(subscriptionId: string): Promise<BillingProviderChangeResult> {
    const result = await stripeRequest<StripeObject>(`/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      body: formBody({
        cancel_at_period_end: true,
      }),
    })
    if (!result.ok) {
      return { ok: false, error: result.error }
    }
    return {
      ok: true,
      currentPeriodEnd: toIsoSeconds(result.data.current_period_end),
      cancelAtPeriodEnd: true,
    }
  }

  async resumeSubscription(subscriptionId: string): Promise<BillingProviderChangeResult> {
    const result = await stripeRequest<StripeObject>(`/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      body: formBody({
        cancel_at_period_end: false,
      }),
    })
    if (!result.ok) {
      return { ok: false, error: result.error }
    }
    return {
      ok: true,
      currentPeriodEnd: toIsoSeconds(result.data.current_period_end),
      cancelAtPeriodEnd: false,
    }
  }

  async parseWebhook(request: Request) {
    const rawBody = await request.text()
    if (!verifyStripeSignature(rawBody, request.headers.get("stripe-signature"))) {
      return { ok: false as const, status: 400, error: "Stripe webhook signature 검증에 실패했습니다." }
    }

    let payload: StripeObject
    try {
      payload = JSON.parse(rawBody) as StripeObject
    } catch {
      return { ok: false as const, status: 400, error: "Stripe webhook body가 올바르지 않습니다." }
    }

    const object = extractSubscriptionObject(payload)
    const eventType = typeof payload.type === "string" ? payload.type : ""
    const base: BillingWebhookEvent = {
      provider: "stripe",
      eventId: typeof payload.id === "string" ? payload.id : "",
      eventType,
      occurredAt: new Date(
        typeof payload.created === "number" ? payload.created * 1000 : Date.now()
      ).toISOString(),
      metadata: {},
    }

    if (!base.eventId || !eventType) {
      return { ok: false as const, status: 400, error: "Stripe webhook 필수 값이 없습니다." }
    }

    if (eventType === "checkout.session.completed") {
      const dataObject = object ?? {}
      const selectedPlan = normalizePlan(
        typeof (dataObject.metadata as StripeObject | undefined)?.selected_plan === "string"
          ? ((dataObject.metadata as StripeObject).selected_plan as string)
          : null
      )
      return {
        ok: true as const,
        payload,
        event: {
          ...base,
          userId:
            typeof dataObject.client_reference_id === "string"
              ? dataObject.client_reference_id
              : typeof (dataObject.metadata as StripeObject | undefined)?.user_id === "string"
                ? ((dataObject.metadata as StripeObject).user_id as string)
                : null,
          providerCustomerId: typeof dataObject.customer === "string" ? dataObject.customer : null,
          providerSubscriptionId:
            typeof dataObject.subscription === "string" ? dataObject.subscription : null,
          plan: selectedPlan,
          message: "결제 수단 등록과 구독 시작이 완료되었습니다.",
          subscriptionStatus: "trialing" as const,
        },
      }
    }

    if (
      eventType === "customer.subscription.created" ||
      eventType === "customer.subscription.updated" ||
      eventType === "customer.subscription.deleted"
    ) {
      const dataObject = object ?? {}
      const items = (((dataObject.items as StripeObject | undefined)?.data as unknown[]) ?? []) as StripeObject[]
      const firstItem = items[0]
      const priceId =
        typeof (firstItem?.price as StripeObject | undefined)?.id === "string"
          ? ((firstItem.price as StripeObject).id as string)
          : null
      const status: SubscriptionStatus | null =
        eventType === "customer.subscription.deleted"
          ? "canceled"
          : normalizeStripeStatus(dataObject.status)
      return {
        ok: true as const,
        payload,
        event: {
          ...base,
          userId:
            typeof (dataObject.metadata as StripeObject | undefined)?.user_id === "string"
              ? ((dataObject.metadata as StripeObject).user_id as string)
              : null,
          providerCustomerId: typeof dataObject.customer === "string" ? dataObject.customer : null,
          providerSubscriptionId: typeof dataObject.id === "string" ? dataObject.id : null,
          providerPriceId: priceId,
          plan: planFromPriceId(priceId),
          subscriptionStatus: status,
          currentPeriodEnd: toIsoSeconds(dataObject.current_period_end),
          trialStartedAt: toIsoSeconds(dataObject.trial_start),
          trialEndsAt: toIsoSeconds(dataObject.trial_end),
          cancelAtPeriodEnd: Boolean(dataObject.cancel_at_period_end),
          message:
            eventType === "customer.subscription.deleted"
              ? "구독이 종료되었습니다."
              : "구독 상태가 변경되었습니다.",
        },
      }
    }

    if (eventType === "invoice.payment_succeeded" || eventType === "invoice.payment_failed") {
      const dataObject = object ?? {}
      const lines = (((dataObject.lines as StripeObject | undefined)?.data as unknown[]) ?? []) as StripeObject[]
      const firstLine = lines[0]
      const priceId =
        typeof ((firstLine?.price as StripeObject | undefined)?.id) === "string"
          ? (((firstLine?.price as StripeObject).id as string))
          : null
      return {
        ok: true as const,
        payload,
        event: {
          ...base,
          providerCustomerId: typeof dataObject.customer === "string" ? dataObject.customer : null,
          providerSubscriptionId: typeof dataObject.subscription === "string" ? dataObject.subscription : null,
          providerPriceId: priceId,
          plan: planFromPriceId(priceId),
          subscriptionStatus: eventType === "invoice.payment_failed" ? ("past_due" as const) : null,
          currentPeriodEnd: toIsoSeconds(dataObject.period_end),
          message:
            eventType === "invoice.payment_succeeded"
              ? "정기 결제가 정상적으로 청구되었습니다."
              : "정기 결제 청구에 실패했습니다.",
          metadata: {
            invoiceId: dataObject.id,
            nextPaymentAttempt: toIsoSeconds(dataObject.next_payment_attempt),
          },
        },
      }
    }

    if (eventType === "customer.subscription.trial_will_end") {
      const dataObject = object ?? {}
      return {
        ok: true as const,
        payload,
        event: {
          ...base,
          userId:
            typeof (dataObject.metadata as StripeObject | undefined)?.user_id === "string"
              ? ((dataObject.metadata as StripeObject).user_id as string)
              : null,
          providerCustomerId: typeof dataObject.customer === "string" ? dataObject.customer : null,
          providerSubscriptionId: typeof dataObject.id === "string" ? dataObject.id : null,
          subscriptionStatus: "trialing" as const,
          currentPeriodEnd: toIsoSeconds(dataObject.current_period_end),
          trialEndsAt: toIsoSeconds(dataObject.trial_end),
          message: "무료 체험이 곧 종료됩니다.",
        },
      }
    }

    return {
      ok: true as const,
      payload,
      event: {
        ...base,
        message: `${eventType} 이벤트를 수신했습니다.`,
      },
    }
  }
}
