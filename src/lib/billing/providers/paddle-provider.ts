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
  return process.env.BILLING_PADDLE_API_KEY?.trim() ?? ""
}

function getWebhookSecret() {
  return process.env.BILLING_PADDLE_WEBHOOK_SECRET?.trim() ?? ""
}

function getApiBase() {
  const override = process.env.BILLING_PADDLE_API_BASE?.trim()
  if (override) {
    return override.replace(/\/$/, "")
  }
  const key = getApiKey()
  return key.includes("_sdbx_") ? "https://sandbox-api.paddle.com" : "https://api.paddle.com"
}

function getPriceId(plan: BillingPlan) {
  if (plan === "business") {
    return process.env.BILLING_PADDLE_PRICE_BUSINESS_MONTHLY?.trim() ?? ""
  }
  if (plan === "pro") {
    return process.env.BILLING_PADDLE_PRICE_PRO_MONTHLY?.trim() ?? ""
  }
  return process.env.BILLING_PADDLE_PRICE_STARTER_MONTHLY?.trim() ?? ""
}

/** 서버 컴포넌트·라우트에서 카탈로그 price id 조회용 */
export function getPaddlePriceIdForPlan(plan: BillingPlan): string {
  return getPriceId(plan)
}

function planFromPriceId(priceId: string | null | undefined): BillingPlan | null {
  const starter = process.env.BILLING_PADDLE_PRICE_STARTER_MONTHLY?.trim()
  const pro = process.env.BILLING_PADDLE_PRICE_PRO_MONTHLY?.trim()
  const business = process.env.BILLING_PADDLE_PRICE_BUSINESS_MONTHLY?.trim()
  if (priceId && business && priceId === business) return "business"
  if (priceId && pro && priceId === pro) return "pro"
  if (priceId && starter && priceId === starter) return "starter"
  return null
}

async function paddleRequest<T>(
  path: string,
  options: { method?: "GET" | "POST" | "PATCH"; body?: unknown } = {}
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const key = getApiKey()
  if (!key) {
    return { ok: false, error: "Paddle API 키가 설정되지 않았습니다." }
  }
  const method = options.method ?? "POST"
  const headers: Record<string, string> = { Authorization: `Bearer ${key}` }
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json"
  }
  const response = await fetch(`${getApiBase()}${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })
  const json = (await response.json().catch(() => null)) as JsonObject | null
  if (!response.ok) {
    const err = json?.error
    const msg =
      err && typeof err === "object" && "detail" in err
        ? String((err as { detail?: string }).detail ?? "")
        : err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message ?? "")
          : ""
    return { ok: false, error: msg || `Paddle API 오류 (${response.status})` }
  }
  return { ok: true, data: json as T }
}

function normalizePaddleSubscriptionStatus(raw: unknown): SubscriptionStatus | null {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : ""
  if (value === "trialing") return "trialing"
  if (value === "active") return "active"
  if (value === "past_due") return "past_due"
  if (value === "canceled" || value === "cancelled") return "canceled"
  if (value === "paused") return "active"
  return null
}

function parsePaddleSignatureHeader(header: string | null) {
  if (!header) return null
  const parts = header.split(";")
  const map: Record<string, string> = {}
  for (const part of parts) {
    const [k, v] = part.split("=", 2)
    if (k && v) {
      map[k.trim()] = v.trim()
    }
  }
  if (!map.ts || !map.h1) return null
  return { ts: map.ts, h1: map.h1 }
}

function verifyPaddleSignature(rawBody: string, header: string | null, secret: string) {
  const parsed = parsePaddleSignatureHeader(header)
  if (!parsed) return false
  const signedPayload = `${parsed.ts}:${rawBody}`
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex")
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(parsed.h1))
  } catch {
    return false
  }
}

function readCustomData(obj: JsonObject | null | undefined): { userId: string | null; plan: BillingPlan | null } {
  if (!obj || typeof obj !== "object") {
    return { userId: null, plan: null }
  }
  const userId = typeof obj.user_id === "string" ? obj.user_id : null
  const planRaw = typeof obj.plan === "string" ? obj.plan : null
  return { userId, plan: planRaw ? normalizePlan(planRaw) : null }
}

function firstSubscriptionItemPriceId(sub: JsonObject): string | null {
  const items = sub.items
  if (!Array.isArray(items) || items.length === 0) return null
  const first = items[0] as JsonObject
  const price = first?.price as JsonObject | undefined
  if (price && typeof price.id === "string") return price.id
  if (typeof first?.price_id === "string") return first.price_id
  return null
}

/** Paddle 체험 구독: 첫 과금(체험 종료) 시점은 보통 next_billed_at — 단일 기준으로 DB trial_ends_at 동기화 */
function paddleTrialEndsAtFromSubscription(sub: JsonObject, paddleStatus: string): string | null {
  const s = paddleStatus.toLowerCase()
  if (s !== "trialing") return null
  if (typeof sub.next_billed_at === "string") return sub.next_billed_at
  const period = sub.current_billing_period as JsonObject | undefined
  if (period && typeof period.ends_at === "string") return period.ends_at
  return null
}

function subscriptionPayloadToEvent(
  base: Omit<BillingWebhookEvent, "userId" | "plan" | "subscriptionStatus" | "providerPriceId" | "providerSubscriptionId" | "providerCustomerId" | "currentPeriodEnd" | "trialEndsAt" | "trialStartedAt" | "cancelAtPeriodEnd" | "message">,
  sub: JsonObject,
  message: string
): BillingWebhookEvent {
  const custom = readCustomData(sub.custom_data as JsonObject | undefined)
  const priceId = firstSubscriptionItemPriceId(sub)
  const plan = custom.plan ?? planFromPriceId(priceId)
  const scheduled = sub.scheduled_change as JsonObject | null | undefined
  const cancelAtPeriodEnd =
    scheduled && typeof scheduled.action === "string"
      ? scheduled.action === "cancel"
      : Boolean(sub.cancel_at_period_end)

  const rawStatus = typeof sub.status === "string" ? sub.status : ""
  const subscriptionStatus = normalizePaddleSubscriptionStatus(sub.status)
  const trialEndsAt = paddleTrialEndsAtFromSubscription(sub, rawStatus)

  const event: BillingWebhookEvent = {
    ...base,
    userId: custom.userId,
    providerCustomerId: typeof sub.customer_id === "string" ? sub.customer_id : null,
    providerSubscriptionId: typeof sub.id === "string" ? sub.id : null,
    providerPriceId: priceId,
    plan,
    subscriptionStatus,
    currentPeriodEnd: typeof sub.next_billed_at === "string" ? sub.next_billed_at : null,
    trialStartedAt: typeof sub.started_at === "string" ? sub.started_at : null,
    trialEndsAt,
    cancelAtPeriodEnd: cancelAtPeriodEnd,
    message,
  }
  return event
}

export class PaddleBillingProvider implements BillingProvider {
  readonly name = "paddle" as const
  readonly mode = getBillingMode()

  isConfigured() {
    return Boolean(
      getApiKey() &&
        getWebhookSecret() &&
        getPriceId("starter") &&
        getPriceId("pro") &&
        getPriceId("business") &&
        process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim()
    )
  }

  getConfigurationError() {
    if (this.isConfigured()) return null
    return "Paddle: BILLING_PADDLE_API_KEY, BILLING_PADDLE_WEBHOOK_SECRET, BILLING_PADDLE_PRICE_*_MONTHLY, NEXT_PUBLIC_PADDLE_CLIENT_TOKEN 을 설정하세요."
  }

  async createCheckoutSession(input: BillingCheckoutInput): Promise<BillingProviderCheckoutResult> {
    const priceId = getPriceId(input.plan)
    if (!priceId) {
      return { ok: false, error: `${input.plan} 플랜의 Paddle price id가 없습니다.` }
    }
    const origin = getSiteOrigin()
    const url = new URL(`${origin}/billing/checkout/paddle`)
    url.searchParams.set("plan", input.plan)
    return {
      ok: true,
      redirectUrl: url.toString(),
      providerSubscriptionId: null,
      providerPriceId: priceId,
      metadata: {
        price_id: priceId,
        user_id: input.userId,
        email: input.email,
      },
    }
  }

  async createPortalSession(input: BillingPortalInput): Promise<BillingProviderPortalResult> {
    const customerId = input.customerId
    if (!customerId.startsWith("ctm_")) {
      return { ok: false, error: "Paddle 고객 ID(ctm_)가 없습니다. 결제를 한 번 완료해 주세요." }
    }
    const result = await paddleRequest<{ data?: JsonObject }>(
      `/customers/${encodeURIComponent(customerId)}/portal-sessions`,
      {
        method: "POST",
        body: {},
      }
    )
    if (!result.ok) {
      return { ok: false, error: result.error }
    }
    const data = result.data.data
    const urls = data?.urls as JsonObject | undefined
    const general = urls?.general as JsonObject | undefined
    const overview = typeof general?.overview === "string" ? general.overview : ""
    if (!overview) {
      return { ok: false, error: "Paddle 포털 URL을 받지 못했습니다." }
    }
    return { ok: true, redirectUrl: overview }
  }

  async updateSubscriptionPlan(input: BillingSubscriptionChangeInput): Promise<BillingProviderChangeResult> {
    const priceId = getPriceId(input.plan)
    if (!priceId) {
      return { ok: false, error: `${input.plan} 플랜 price id가 없습니다.` }
    }
    const subId = input.subscriptionId
    const getSub = await paddleRequest<{ data?: JsonObject }>(
      `/subscriptions/${encodeURIComponent(subId)}?include=items`,
      { method: "GET" }
    )
    if (!getSub.ok) {
      return { ok: false, error: getSub.error }
    }
    const sub = getSub.data.data
    if (!sub) {
      return { ok: false, error: "구독 정보를 불러오지 못했습니다." }
    }
    const items = (sub.items as JsonObject[] | undefined) ?? []
    const first = items[0] as JsonObject | undefined
    if (!first || typeof first.id !== "string") {
      return { ok: false, error: "구독 항목이 없습니다." }
    }
    const patch = await paddleRequest<{ data?: JsonObject }>(`/subscriptions/${encodeURIComponent(subId)}`, {
      method: "PATCH",
      body: {
        items: [{ id: first.id, price_id: priceId, quantity: 1 }],
        proration_billing_mode: "prorated_next_billing_period",
      },
    })
    if (!patch.ok) {
      return { ok: false, error: patch.error }
    }
    const next = patch.data.data
    return {
      ok: true,
      providerSubscriptionId: typeof next?.id === "string" ? next.id : subId,
      providerPriceId: priceId,
      currentPeriodEnd: typeof next?.next_billed_at === "string" ? next.next_billed_at : null,
      cancelAtPeriodEnd: Boolean(next?.scheduled_change),
    }
  }

  async scheduleCancel(subscriptionId: string): Promise<BillingProviderChangeResult> {
    const result = await paddleRequest<{ data?: JsonObject }>(
      `/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
      { method: "POST", body: {} }
    )
    if (!result.ok) {
      return { ok: false, error: result.error }
    }
    const data = result.data.data
    return {
      ok: true,
      currentPeriodEnd: typeof data?.next_billed_at === "string" ? data.next_billed_at : null,
      cancelAtPeriodEnd: true,
    }
  }

  async resumeSubscription(subscriptionId: string): Promise<BillingProviderChangeResult> {
    const result = await paddleRequest<JsonObject>(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      method: "PATCH",
      body: { scheduled_change: null },
    })
    if (!result.ok) {
      return { ok: false, error: result.error }
    }
    const data = result.data.data as JsonObject | undefined
    return {
      ok: true,
      currentPeriodEnd: typeof data?.next_billed_at === "string" ? data.next_billed_at : null,
      cancelAtPeriodEnd: false,
    }
  }

  async parseWebhook(request: Request) {
    const rawBody = await request.text()
    const secret = getWebhookSecret()
    if (!secret || !verifyPaddleSignature(rawBody, request.headers.get("paddle-signature"), secret)) {
      return { ok: false as const, status: 400, error: "Paddle webhook 서명 검증에 실패했습니다." }
    }

    let envelope: JsonObject
    try {
      envelope = JSON.parse(rawBody) as JsonObject
    } catch {
      return { ok: false as const, status: 400, error: "Paddle webhook JSON이 올바르지 않습니다." }
    }

    const eventId = typeof envelope.event_id === "string" ? envelope.event_id : ""
    const eventType = typeof envelope.event_type === "string" ? envelope.event_type : ""
    const occurredAt = typeof envelope.occurred_at === "string" ? envelope.occurred_at : new Date().toISOString()
    const data = envelope.data as JsonObject | undefined

    if (!eventId || !eventType) {
      return { ok: false as const, status: 400, error: "Paddle webhook에 event_id/event_type이 없습니다." }
    }

    const base: BillingWebhookEvent = {
      provider: "paddle",
      eventId,
      eventType,
      occurredAt,
      metadata: {},
    }

    if (
      eventType === "subscription.created" ||
      eventType === "subscription.activated" ||
      eventType === "subscription.updated" ||
      eventType === "subscription.trialing" ||
      eventType === "subscription.canceled" ||
      eventType === "subscription.cancelled"
    ) {
      const sub = data ?? {}
      const msg =
        eventType === "subscription.canceled" || eventType === "subscription.cancelled"
          ? "구독이 종료되었습니다."
          : eventType === "subscription.created"
            ? "구독이 생성되었습니다."
            : "구독 상태가 변경되었습니다."
      const event = subscriptionPayloadToEvent(base, sub, msg)
      return {
        ok: true as const,
        payload: envelope as Record<string, unknown>,
        event,
      }
    }

    if (eventType === "transaction.completed") {
      const txn = data ?? {}
      const custom = readCustomData(txn.custom_data as JsonObject | undefined)
      const subId = typeof txn.subscription_id === "string" ? txn.subscription_id : null
      const customerId = typeof txn.customer_id === "string" ? txn.customer_id : null
      const event: BillingWebhookEvent = {
        ...base,
        userId: custom.userId,
        providerCustomerId: customerId,
        providerSubscriptionId: subId,
        providerPriceId: null,
        plan: custom.plan,
        subscriptionStatus: "active",
        message: "결제가 완료되었습니다.",
      }
      return {
        ok: true as const,
        payload: envelope as Record<string, unknown>,
        event,
      }
    }

    if (eventType === "transaction.payment_failed") {
      const txn = data ?? {}
      const custom = readCustomData(txn.custom_data as JsonObject | undefined)
      const event: BillingWebhookEvent = {
        ...base,
        userId: custom.userId,
        providerSubscriptionId: typeof txn.subscription_id === "string" ? txn.subscription_id : null,
        subscriptionStatus: "past_due",
        message: "결제에 실패했습니다.",
      }
      return {
        ok: true as const,
        payload: envelope as Record<string, unknown>,
        event,
      }
    }

    const event: BillingWebhookEvent = {
      ...base,
      message: `${eventType} 이벤트를 수신했습니다.`,
    }
    return {
      ok: true as const,
      payload: envelope as Record<string, unknown>,
      event,
    }
  }
}
