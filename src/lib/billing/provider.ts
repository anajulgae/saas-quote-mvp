import { MockBillingProvider } from "@/lib/billing/providers/mock-provider"
import { StripeBillingProvider } from "@/lib/billing/providers/stripe-provider"
import type { BillingProvider, BillingProviderName } from "@/lib/billing/provider-types"

let cachedProvider: BillingProvider | null = null

export function getBillingProviderName(): BillingProviderName {
  const raw = process.env.BILLING_PROVIDER?.trim().toLowerCase()
  return raw === "stripe" ? "stripe" : "mock"
}

export function getBillingProvider(): BillingProvider {
  if (!cachedProvider) {
    cachedProvider =
      getBillingProviderName() === "stripe"
        ? new StripeBillingProvider()
        : new MockBillingProvider()
  }
  return cachedProvider
}

export function getBillingMode() {
  return process.env.BILLING_MODE?.trim().toLowerCase() === "live" ? "live" : "test"
}
