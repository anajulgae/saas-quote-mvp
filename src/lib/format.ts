const currencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
})

const compactNumberFormatter = new Intl.NumberFormat("ko-KR", {
  notation: "compact",
  maximumFractionDigits: 1,
})

/** 한국 원화. 0은 기호만 붙은 ₩0 대신 읽기 쉬운 "0원"으로 통일 */
export function formatCurrency(value: number) {
  if (!Number.isFinite(value)) {
    return "—"
  }
  if (value === 0) {
    return "0원"
  }
  return currencyFormatter.format(value)
}

export function formatCompactNumber(value: number) {
  return compactNumberFormatter.format(value)
}

export function formatDate(value?: string) {
  if (!value) {
    return "-"
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value))
}

export function formatDateTime(value?: string) {
  if (!value) {
    return "-"
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}
