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
import { getSiteOrigin } from "@/lib/site-url"
import { normalizePlan } from "@/lib/plan-features"
import type { BillingPlan, SubscriptionStatus } from "@/types/domain"

type JsonObject = Record<string, unknown>

function getApiKey() {
  return process.env.BILLING_DODO_API_KEY?.trim() ?? ""
}

function getWebhookSecret() {
  return process.env.BILLING_DODO_WEBHOOK_SECRET?.trim() ?? ""
}

function getApiBase() {
  const override = process.env.BILLING_DODO_API_BASE?.trim()
  if (override) return override.replace(/\/$/, "")
  return getBillingMode() === "live"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com"
}

function getProductId(plan: BillingPlan): string {
  if (plan === "business") return process.env.BILLING_DODO_PRODUCT_BUSINESS?.trim() ?? ""
  if (plan === "pro") return process.env.BILLING_DODO_PRODUCT_PRO?.trim() ?? ""
  return process.env.BILLING_DODO_PRODUCT_STARTER?.trim() ?? ""
}

export function getDodoProductIdForPlan(plan: BillingPlan): string {
  return getProductId(plan)
}

function planFromProductId(productId: string | null | undefined): BillingPlan | null {
  if (!productId) return null
  const starter = process.env.BILLING_DODO_PRODUCT_STARTER?.trim()
  const pro = process.env.BILLING_DODO_PRODUCT_PRO?.trim()
  const business = process.env.BILLING_DODO_PRODUCT_BUSINESS?.trim()
  if (business && productId === business) return "business"
  if (pro && productId === pro) return "pro"
  if (starter && productId === starter) return "starter"
  return null
}

async function dodoRequest<T>(
  path: string,
  options: { method?: "GET" | "POST" | "PATCH"; body?: unknown } = {}
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const key = getApiKey()
  if (!key) return { ok: false, error: "Dodo API 키가 설정되지 않았습니다." }

  const method = options.method ?? "GET"
  const headers: Record<string, string> = { Authorization: `Bearer ${key}` }
  if (options.body !== undefined) headers["Content-Type"] = "application/json"

  const response = await fetch(`${getApiBase()}${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  const json = (await response.json().catch(() => null)) as JsonObject | null
  if (!response.ok) {
    const msg =
      typeof json?.message === "string" ? json.message : `Dodo API 오류 (${response.status})`
    return { ok: false, error: msg }
  }
  return { ok: true, data: json as T }
}

function normalizeDodoStatus(raw: unknown): SubscriptionStatus | null {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : ""
  if (s === "active") return "active"
  if (s === "pending") return "trialing"
  if (s === "on_hold") return "past_due"
  if (s === "cancelled") return "canceled"
  if (s === "failed") return "canceled"
  if (s === "expired") return "canceled"
  return null
}

/**
 * Standard Webhooks 서명 검증.
 * header: "v1,<base64-hmac>"
 * signed payload: "{webhook-id}.{webhook-timestamp}.{rawBody}"
 * secret: "whsec_<base64-key>" 형태.
 */
function verifyDodoSignature(
  rawBody: string,
  headers: { id: string; timestamp: string; signature: string },
  secret: string
): boolean {
  try {
    const secretBytes = Buffer.from(
      secret.startsWith("whsec_") ? secret.slice(6) : secret,
      "base64"
    )
    const signedPayload = `${headers.id}.${headers.timestamp}.${rawBody}`
    const computed = createHmac("sha256", secretBytes).update(signedPayload).digest("base64")
    const expected = `v1,${computed}`

    const sigParts = headers.signature.split(" ")
    for (const sig of sigParts) {
      try {
        if (timingSafeEqual(Buffer.from(expected), Buffer.from(sig.trim()))) return true
      } catch {
        continue
      }
    }
    return false
  } catch {
    return false
  }
}

export class DodoBillingProvider implements BillingProvider {
  readonly name = "dodo" as const
  readonly mode = getBillingMode()

  isConfigured() {
    return Boolean(
      getApiKey() &&
        getWebhookSecret() &&
        getProductId("starter") &&
        getProductId("pro") &&
        getProductId("business")
    )
  }

  getConfigurationError() {
    if (this.isConfigured()) return null
    return "Dodo: BILLING_DODO_API_KEY, BILLING_DODO_WEBHOOK_SECRET, BILLING_DODO_PRODUCT_*를 설정하세요."
  }

  async createCheckoutSession(
    input: BillingCheckoutInput
  ): Promise<BillingProviderCheckoutResult> {
    const productId = getProductId(input.plan)
    if (!productId) {
      return { ok: false, error: `${input.plan} 플랜의 Dodo product id가 없습니다.` }
    }

    const result = await dodoRequest<JsonObject>("/checkouts", {
      method: "POST",
      body: {
        product_cart: [{ product_id: productId, quantity: 1 }],
        customer: { name: input.email.split("@")[0], email: input.email },
        return_url: input.successUrl,
        cancel_url: input.cancelUrl,
        metadata: { user_id: input.userId, plan: input.plan },
      },
    })

    if (!result.ok) return { ok: false, error: result.error }

    const checkoutUrl = result.data.checkout_url
    if (typeof checkoutUrl !== "string") {
      return { ok: false, error: "Dodo checkout URL을 받지 못했습니다." }
    }

    return {
      ok: true,
      redirectUrl: checkoutUrl,
      providerCustomerId: null,
      providerSubscriptionId: null,
      providerPriceId: productId,
    }
  }

  async createPortalSession(
    _input: BillingPortalInput
  ): Promise<BillingProviderPortalResult> {
    return {
      ok: true,
      redirectUrl: `${getSiteOrigin()}/billing`,
    }
  }

  async updateSubscriptionPlan(
    input: BillingSubscriptionChangeInput
  ): Promise<BillingProviderChangeResult> {
    const productId = getProductId(input.plan)
    if (!productId) {
      return { ok: false, error: `${input.plan} 플랜 product id가 없습니다.` }
    }

    const result = await dodoRequest<void>(
      `/subscriptions/${encodeURIComponent(input.subscriptionId)}/change-plan`,
      {
        method: "POST",
        body: {
          product_id: productId,
          quantity: 1,
          proration_billing_mode: "prorated_immediately",
        },
      }
    )
    if (!result.ok) return { ok: false, error: result.error }

    return {
      ok: true,
      providerSubscriptionId: input.subscriptionId,
      providerPriceId: productId,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    }
  }

  async scheduleCancel(subscriptionId: string): Promise<BillingProviderChangeResult> {
    const result = await dodoRequest<JsonObject>(
      `/subscriptions/${encodeURIComponent(subscriptionId)}`,
      {
        method: "PATCH",
        body: { cancel_at_next_billing_date: true },
      }
    )
    if (!result.ok) return { ok: false, error: result.error }

    return {
      ok: true,
      currentPeriodEnd:
        typeof result.data.next_billing_date === "string" ? result.data.next_billing_date : null,
      cancelAtPeriodEnd: true,
    }
  }

  async resumeSubscription(subscriptionId: string): Promise<BillingProviderChangeResult> {
    const result = await dodoRequest<JsonObject>(
      `/subscriptions/${encodeURIComponent(subscriptionId)}`,
      {
        method: "PATCH",
        body: { cancel_at_next_billing_date: false },
      }
    )
    if (!result.ok) return { ok: false, error: result.error }

    return {
      ok: true,
      currentPeriodEnd:
        typeof result.data.next_billing_date === "string" ? result.data.next_billing_date : null,
      cancelAtPeriodEnd: false,
    }
  }

  async parseWebhook(request: Request) {
    const rawBody = await request.text()
    const secret = getWebhookSecret()

    const whId = request.headers.get("webhook-id") ?? ""
    const whTs = request.headers.get("webhook-timestamp") ?? ""
    const whSig = request.headers.get("webhook-signature") ?? ""

    if (!secret || !whId || !whTs || !whSig) {
      return { ok: false as const, status: 400, error: "Dodo webhook 헤더가 누락되었습니다." }
    }

    if (!verifyDodoSignature(rawBody, { id: whId, timestamp: whTs, signature: whSig }, secret)) {
      return { ok: false as const, status: 400, error: "Dodo webhook 서명 검증에 실패했습니다." }
    }

    let envelope: JsonObject
    try {
      envelope = JSON.parse(rawBody) as JsonObject
    } catch {
      return { ok: false as const, status: 400, error: "Dodo webhook JSON이 올바르지 않습니다." }
    }

    const eventType = typeof envelope.type === "string" ? envelope.type : ""
    const occurredAt =
      typeof envelope.timestamp === "string" ? envelope.timestamp : new Date().toISOString()
    const data = (envelope.data ?? {}) as JsonObject

    const base: BillingWebhookEvent = {
      provider: "dodo",
      eventId: whId,
      eventType,
      occurredAt,
      metadata: (data.metadata as Record<string, unknown>) ?? {},
    }

    if (eventType.startsWith("subscription.")) {
      const subId = typeof data.subscription_id === "string" ? data.subscription_id : null
      const customerId =
        typeof (data.customer as JsonObject)?.customer_id === "string"
          ? ((data.customer as JsonObject).customer_id as string)
          : null
      const productId = typeof data.product_id === "string" ? data.product_id : null
      const plan = planFromProductId(productId)

      const meta = (data.metadata ?? {}) as Record<string, string>
      const userId = meta.user_id ?? null
      const metaPlan = meta.plan ? normalizePlan(meta.plan) : null

      const status = normalizeDodoStatus(data.status)
      const cancelAtNext = data.cancel_at_next_billing_date === true
      const nextBilling =
        typeof data.next_billing_date === "string" ? data.next_billing_date : null
      const trialDays =
        typeof data.trial_period_days === "number" ? data.trial_period_days : 0

      const messageMap: Record<string, string> = {
        "subscription.active": "구독이 활성화되었습니다.",
        "subscription.updated": "구독이 업데이트되었습니다.",
        "subscription.on_hold": "결제 실패로 구독이 보류되었습니다.",
        "subscription.renewed": "구독이 갱신되었습니다.",
        "subscription.plan_changed": "구독 플랜이 변경되었습니다.",
        "subscription.cancelled": "구독이 해지되었습니다.",
        "subscription.failed": "구독 생성에 실패했습니다.",
        "subscription.expired": "구독이 만료되었습니다.",
      }

      const event: BillingWebhookEvent = {
        ...base,
        userId: userId,
        providerCustomerId: customerId,
        providerSubscriptionId: subId,
        providerPriceId: productId,
        plan: metaPlan ?? plan,
        subscriptionStatus:
          eventType === "subscription.renewed" ? "active" : status,
        currentPeriodEnd: nextBilling,
        trialStartedAt: null,
        trialEndsAt:
          trialDays > 0 && typeof data.created_at === "string"
            ? new Date(
                new Date(data.created_at as string).getTime() + trialDays * 86400000
              ).toISOString()
            : null,
        cancelAtPeriodEnd: cancelAtNext,
        message: messageMap[eventType] ?? `${eventType} 이벤트를 수신했습니다.`,
      }
      return { ok: true as const, payload: envelope as Record<string, unknown>, event }
    }

    if (eventType === "payment.succeeded" || eventType === "payment.failed") {
      const meta = (data.metadata ?? {}) as Record<string, string>
      const event: BillingWebhookEvent = {
        ...base,
        userId: meta.user_id ?? null,
        providerCustomerId:
          typeof (data.customer as JsonObject)?.customer_id === "string"
            ? ((data.customer as JsonObject).customer_id as string)
            : null,
        providerSubscriptionId:
          typeof data.subscription_id === "string" ? data.subscription_id : null,
        subscriptionStatus: eventType === "payment.succeeded" ? "active" : "past_due",
        message:
          eventType === "payment.succeeded"
            ? "결제가 완료되었습니다."
            : "결제에 실패했습니다.",
      }
      return { ok: true as const, payload: envelope as Record<string, unknown>, event }
    }

    const event: BillingWebhookEvent = {
      ...base,
      message: `${eventType} 이벤트를 수신했습니다.`,
    }
    return { ok: true as const, payload: envelope as Record<string, unknown>, event }
  }
}
