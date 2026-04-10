import type {
  BillingCheckoutInput,
  BillingProvider,
  BillingProviderChangeResult,
  BillingProviderCheckoutResult,
  BillingProviderPortalResult,
} from "@/lib/billing/provider-types"
import { getBillingMode } from "@/lib/billing/provider"

function nextMonthIso() {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return d.toISOString()
}

export class MockBillingProvider implements BillingProvider {
  readonly name = "mock" as const
  readonly mode = getBillingMode()

  isConfigured() {
    return true
  }

  getConfigurationError() {
    return null
  }

  async createCheckoutSession(input: BillingCheckoutInput): Promise<BillingProviderCheckoutResult> {
    const providerSubscriptionId = `mock_sub_${input.userId}_${input.plan}`
    return {
      ok: true,
      redirectUrl: `${input.successUrl}${input.successUrl.includes("?") ? "&" : "?"}mockCheckout=1&plan=${input.plan}`,
      providerCustomerId: `mock_cus_${input.userId}`,
      providerSubscriptionId,
      providerPriceId: `mock_price_${input.plan}`,
      metadata: {
        currentPeriodEnd: input.trialEndsAt ?? nextMonthIso(),
      },
    }
  }

  async createPortalSession(): Promise<BillingProviderPortalResult> {
    return {
      ok: true,
      redirectUrl: "/billing?mockPortal=1",
    }
  }

  async updateSubscriptionPlan(): Promise<BillingProviderChangeResult> {
    return {
      ok: true,
      currentPeriodEnd: nextMonthIso(),
      cancelAtPeriodEnd: false,
    }
  }

  async scheduleCancel(): Promise<BillingProviderChangeResult> {
    return {
      ok: true,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: nextMonthIso(),
    }
  }

  async resumeSubscription(): Promise<BillingProviderChangeResult> {
    return {
      ok: true,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: nextMonthIso(),
    }
  }

  async parseWebhook() {
    return {
      ok: false as const,
      status: 400,
      error: "Mock provider는 webhook을 사용하지 않습니다.",
    }
  }
}
