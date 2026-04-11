import { MockBillingProvider } from "@/lib/billing/providers/mock-provider"
import { PaddleBillingProvider } from "@/lib/billing/providers/paddle-provider"
import { StripeBillingProvider } from "@/lib/billing/providers/stripe-provider"
import type { BillingProvider, BillingProviderName } from "@/lib/billing/provider-types"

let cachedProvider: BillingProvider | null = null

export function getBillingProviderName(): BillingProviderName {
  const raw = process.env.BILLING_PROVIDER?.trim().toLowerCase()
  if (raw === "stripe") return "stripe"
  if (raw === "paddle") return "paddle"
  return "mock"
}

export function getBillingProvider(): BillingProvider {
  if (!cachedProvider) {
    const name = getBillingProviderName()
    cachedProvider =
      name === "stripe"
        ? new StripeBillingProvider()
        : name === "paddle"
          ? new PaddleBillingProvider()
          : new MockBillingProvider()
  }
  return cachedProvider
}

export function getBillingMode() {
  return process.env.BILLING_MODE?.trim().toLowerCase() === "live" ? "live" : "test"
}
