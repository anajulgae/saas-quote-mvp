import { MockBillingProvider } from "@/lib/billing/providers/mock-provider"
import { DodoBillingProvider } from "@/lib/billing/providers/dodo-provider"
import type { BillingProvider, BillingProviderName } from "@/lib/billing/provider-types"

let cachedProvider: BillingProvider | null = null

export function getBillingProviderName(): BillingProviderName {
  const raw = process.env.BILLING_PROVIDER?.trim().toLowerCase()
  if (raw === "dodo") return "dodo"
  return "mock"
}

export function getBillingProvider(): BillingProvider {
  if (!cachedProvider) {
    const name = getBillingProviderName()
    cachedProvider = name === "dodo" ? new DodoBillingProvider() : new MockBillingProvider()
  }
  return cachedProvider
}

export function getBillingMode() {
  return process.env.BILLING_MODE?.trim().toLowerCase() === "live" ? "live" : "test"
}
