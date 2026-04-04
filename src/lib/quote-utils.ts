import type { Customer, QuoteStatus } from "@/types/domain"

/** 입력 필드용: 쉼표·공백·원화 기호 제거 후 숫자 파싱 */
export function parseAmountInput(raw: string): number {
  const s = String(raw ?? "")
    .replace(/,/g, "")
    .replace(/[\s원₩]/g, "")
    .trim()
  return Number(s)
}

/** 포커스 아웃 시 단가 등에 쓰는 천 단위 표시(정수만) */
export function formatKrwDigitsInput(raw: string): string {
  const n = parseAmountInput(raw)
  if (!Number.isFinite(n) || n < 0) {
    return raw.replace(/,/g, "")
  }
  if (n === 0 && raw.trim() === "") {
    return ""
  }
  return Math.round(n).toLocaleString("ko-KR")
}

export function customerPrimaryLabel(customer: Customer | undefined): string {
  if (!customer) {
    return "거래처 미지정"
  }
  return customer.companyName?.trim() || customer.name
}

export function quoteSearchHaystack(
  quote: { title: string; quoteNumber: string },
  customer: Customer | undefined
): string {
  const parts = [
    quote.title,
    quote.quoteNumber,
    customerPrimaryLabel(customer),
    customer?.name,
    customer?.companyName,
    customer?.email,
  ]
  return parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

export type QuoteValidityHint = "past_due" | "due_soon" | null

/** 유효기한만 기준(상태는 호출부에서 함께 판단) */
export function getQuoteValidityHint(
  validUntil: string | undefined,
  status: QuoteStatus
): QuoteValidityHint {
  if (!validUntil?.trim()) {
    return null
  }
  if (status === "approved" || status === "rejected" || status === "expired") {
    return null
  }
  const end = new Date(`${validUntil.slice(0, 10)}T23:59:59`)
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  if (end < start) {
    return "past_due"
  }
  const msPerDay = 86400000
  const days = Math.ceil((end.getTime() - start.getTime()) / msPerDay)
  if (days <= 7) {
    return "due_soon"
  }
  return null
}

export type QuoteListSort = "created_desc" | "total_desc" | "valid_until_asc"
