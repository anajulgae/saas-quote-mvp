import type { TaxInvoiceProviderAdapter } from "@/lib/tax-invoice/provider-types"
import { mockTaxInvoiceProvider } from "@/lib/tax-invoice/providers/mock-provider"
import { getAllProviderOptions } from "@/lib/tax-invoice/provider-catalog"

const registry = new Map<string, TaxInvoiceProviderAdapter>([
  [mockTaxInvoiceProvider.id, mockTaxInvoiceProvider],
])

export function getTaxInvoiceProvider(id: string | null | undefined): TaxInvoiceProviderAdapter | null {
  if (!id?.trim()) {
    return null
  }
  return registry.get(id.trim()) ?? null
}

export function listTaxInvoiceProviderOptions(): Array<{ id: string; displayName: string }> {
  return getAllProviderOptions()
}
