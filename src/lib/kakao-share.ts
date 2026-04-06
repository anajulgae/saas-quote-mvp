/**
 * 카카오 공유 SDK·알림톡 연동 전 확장 포인트.
 * 현재는 클립보드용 문구·링크 조합만 제공합니다.
 */
export type KakaoQuoteShareInput = {
  quoteNumber: string
  title: string
  publicUrl: string
  businessName?: string
}

export function buildKakaoQuoteShareText(input: KakaoQuoteShareInput): string {
  const who = input.businessName?.trim()
  const header = who ? `[${who}] 견적 안내` : `[Bill-IO] 견적 안내`
  return [
    header,
    input.title,
    `견적번호 ${input.quoteNumber}`,
    "",
    "아래 링크에서 견적서를 확인해 주세요.",
    input.publicUrl,
    "",
    "감사합니다.",
  ].join("\n")
}

/** 추후 Kakao.Share.sendDefault 등에 넘길 payload 형태 예시 */
export function buildKakaoQuoteShareWebPayload(input: KakaoQuoteShareInput) {
  return {
    objectType: "text" as const,
    text: `${input.title} (${input.quoteNumber})`,
    link: {
      webUrl: input.publicUrl,
      mobileWebUrl: input.publicUrl,
    },
    buttonTitle: "견적서 보기",
  }
}

export type KakaoInvoiceShareInput = {
  invoiceNumber: string
  amountLabel: string
  publicUrl: string
  businessName?: string
}

export function buildKakaoInvoiceShareText(input: KakaoInvoiceShareInput): string {
  const who = input.businessName?.trim()
  const header = who ? `[${who}] 청구·입금 안내` : `[Bill-IO] 청구·입금 안내`
  return [
    header,
    `청구번호 ${input.invoiceNumber}`,
    `금액 ${input.amountLabel}`,
    "",
    "아래 링크에서 청구서를 확인해 주세요.",
    input.publicUrl,
    "",
    "감사합니다.",
  ].join("\n")
}

export function buildKakaoInvoiceShareWebPayload(input: KakaoInvoiceShareInput) {
  return {
    objectType: "text" as const,
    text: `${input.invoiceNumber} · ${input.amountLabel}`,
    link: {
      webUrl: input.publicUrl,
      mobileWebUrl: input.publicUrl,
    },
    buttonTitle: "청구서 보기",
  }
}

/** 문자 앱에 붙여넣기용(짧은 안내 + 링크) */
export function buildSmsInvoiceShareText(input: KakaoInvoiceShareInput): string {
  const who = input.businessName?.trim()
  const head = who ? `[${who}] 청구 안내` : "청구 안내"
  return `${head} ${input.invoiceNumber} ${input.amountLabel}\n링크: ${input.publicUrl}`
}

export function buildSmsQuoteShareText(input: KakaoQuoteShareInput): string {
  const who = input.businessName?.trim()
  const head = who ? `[${who}] 견적 안내` : "견적 안내"
  return `${head} ${input.quoteNumber}\n링크: ${input.publicUrl}`
}
