import type { BillingPlan, SubscriptionStatus } from "@/types/domain"

export type BillingProviderName = "mock" | "stripe" | "paddle"
export type BillingProviderMode = "test" | "live"

export type BillingCheckoutInput = {
  userId: string
  email: string
  plan: BillingPlan
  trialEndsAt: string | null
  successUrl: string
  cancelUrl: string
  customerId?: string | null
}

export type BillingPortalInput = {
  customerId: string
  returnUrl: string
}

export type BillingSubscriptionChangeInput = {
  subscriptionId: string
  plan: BillingPlan
  cancelAtPeriodEnd?: boolean
}

export type BillingProviderCheckoutResult =
  | {
      ok: true
      redirectUrl: string
      providerCustomerId?: string | null
      providerSubscriptionId?: string | null
      providerPriceId?: string | null
      metadata?: Record<string, string>
    }
  | { ok: false; error: string }

export type BillingProviderPortalResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; error: string }

export type BillingProviderChangeResult =
  | {
      ok: true
      providerSubscriptionId?: string | null
      providerPriceId?: string | null
      currentPeriodEnd?: string | null
      cancelAtPeriodEnd?: boolean
    }
  | { ok: false; error: string }

export type BillingWebhookEvent = {
  provider: BillingProviderName
  eventId: string
  eventType: string
  occurredAt: string
  userId?: string | null
  providerCustomerId?: string | null
  providerSubscriptionId?: string | null
  providerPriceId?: string | null
  plan?: BillingPlan | null
  subscriptionStatus?: SubscriptionStatus | null
  currentPeriodEnd?: string | null
  trialStartedAt?: string | null
  trialEndsAt?: string | null
  cancelAtPeriodEnd?: boolean
  paymentMethodBrand?: string | null
  paymentMethodLast4?: string | null
  message?: string | null
  metadata?: Record<string, unknown>
}

export interface BillingProvider {
  name: BillingProviderName
  mode: BillingProviderMode
  isConfigured(): boolean
  getConfigurationError(): string | null
  createCheckoutSession(input: BillingCheckoutInput): Promise<BillingProviderCheckoutResult>
  createPortalSession(input: BillingPortalInput): Promise<BillingProviderPortalResult>
  updateSubscriptionPlan(input: BillingSubscriptionChangeInput): Promise<BillingProviderChangeResult>
  scheduleCancel(subscriptionId: string): Promise<BillingProviderChangeResult>
  resumeSubscription(subscriptionId: string): Promise<BillingProviderChangeResult>
  parseWebhook(request: Request): Promise<
    | { ok: true; event: BillingWebhookEvent; payload: Record<string, unknown> }
    | { ok: false; status: number; error: string }
  >
}
