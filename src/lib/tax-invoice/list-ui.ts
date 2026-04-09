import type { OpsStatusTone } from "@/lib/ops-status-meta"
import type { InvoiceWithReminders } from "@/types/domain"

export type TaxInvoiceListFilter = "all" | "need" | "failed" | "issued" | "target"

/** 대시보드 `countTaxInvoiceDashboardSignals` 와 동일한 「발행 필요」 판정 */
export function invoiceNeedsTaxInvoiceAttention(inv: InvoiceWithReminders): boolean {
  if (!inv.eTaxInvoiceTarget || !inv.eTaxInvoiceNeedIssue) {
    return false
  }
  const st = inv.taxInvoice?.status
  if (st === "issued") {
    return false
  }
  return true
}

export function matchesTaxInvoiceListFilter(
  inv: InvoiceWithReminders,
  filter: TaxInvoiceListFilter
): boolean {
  if (filter === "all") {
    return true
  }
  if (filter === "target") {
    return Boolean(inv.eTaxInvoiceTarget)
  }
  if (filter === "issued") {
    return inv.taxInvoice?.status === "issued"
  }
  if (filter === "failed") {
    return inv.taxInvoice?.status === "failed"
  }
  if (filter === "need") {
    return invoiceNeedsTaxInvoiceAttention(inv)
  }
  return true
}

export function getTaxInvoiceListChipMeta(inv: InvoiceWithReminders): {
  label: string
  tone: OpsStatusTone
  emphasis: boolean
} {
  if (!inv.eTaxInvoiceTarget) {
    return { label: "세금 미대상", tone: "muted", emphasis: false }
  }
  const st = inv.taxInvoice?.status
  if (!st) {
    if (inv.eTaxInvoiceNeedIssue) {
      return { label: "발행 필요", tone: "warning", emphasis: true }
    }
    return { label: "대상(미준비)", tone: "info", emphasis: false }
  }
  switch (st) {
    case "draft":
      return { label: "초안", tone: "muted", emphasis: false }
    case "ready":
      return { label: "발행 준비", tone: "info", emphasis: false }
    case "issuing":
      return { label: "발행 중", tone: "brand", emphasis: true }
    case "issued":
      return { label: "발행 완료", tone: "success", emphasis: false }
    case "failed":
      return { label: "발행 실패", tone: "danger", emphasis: true }
    case "canceled":
      return { label: "취소", tone: "muted", emphasis: false }
    default:
      return { label: st, tone: "neutral", emphasis: false }
  }
}
