import type { Quote } from "@/types/domain"

/**
 * 청구 금액을 공급가액·부가세로 나눔.
 * 연결 견적이 있으면 견적의 subtotal/tax 비율을 청구 금액에 맞춰 스케일.
 */
export function computeTaxAmountsFromInvoice(params: {
  invoiceAmount: number
  quote?: Pick<Quote, "subtotal" | "tax" | "total"> | null
}): { supply: number; vat: number; total: number } {
  const total = Math.max(0, Math.round(params.invoiceAmount))
  const q = params.quote
  if (q && q.total > 0) {
    const ratio = total / q.total
    const supply = Math.round(q.subtotal * ratio)
    const vat = Math.round(q.tax * ratio)
    const adj = total - supply - vat
    return { supply: supply + adj, vat, total }
  }
  const supply = Math.round(total / 1.1)
  const vat = total - supply
  return { supply, vat, total }
}
