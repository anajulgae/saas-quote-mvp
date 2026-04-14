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

  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) {
    return "-"
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d)
}

export function formatDateTime(value?: string) {
  if (!value) {
    return "-"
  }

  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) {
    return "-"
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d)
}

/** 한국 사업자등록번호 10자리 — 입력 시 `XXX-XX-XXXXX` 형태로 하이픈 삽입 */
export function formatBusinessRegNoInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10)
  if (digits.length <= 3) {
    return digits
  }
  if (digits.length <= 5) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
}
