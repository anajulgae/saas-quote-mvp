import {
  INQUIRY_STAGE_VALUES,
  PAYMENT_STATUS_VALUES,
  QUOTE_STATUS_VALUES,
  getInquiryStageMeta,
  getPaymentStatusMeta,
  getQuoteStatusMeta,
} from "@/lib/ops-status-meta"

export const inquiryStageOptions = INQUIRY_STAGE_VALUES.map((value) => ({
  value,
  label: getInquiryStageMeta(value).label,
})) as {
  value: (typeof INQUIRY_STAGE_VALUES)[number]
  label: string
}[]

export const paymentStatusOptions = PAYMENT_STATUS_VALUES.map((value) => ({
  value,
  label: getPaymentStatusMeta(value).label,
})) as {
  value: (typeof PAYMENT_STATUS_VALUES)[number]
  label: string
}[]

export const quoteStatusOptions = QUOTE_STATUS_VALUES.map((value) => ({
  value,
  label: getQuoteStatusMeta(value).label,
})) as {
  value: (typeof QUOTE_STATUS_VALUES)[number]
  label: string
}[]

export const invoiceTypeOptions = [
  { value: "deposit", label: "선금" },
  { value: "balance", label: "잔금" },
  { value: "final", label: "최종(잔여) 청구" },
] as const

export const reminderChannelOptions = [
  { value: "kakao", label: "카카오" },
  { value: "sms", label: "문자" },
  { value: "email", label: "이메일" },
  { value: "manual", label: "수동 기록" },
] as const

export const templateTypeOptions = [
  { value: "quote", label: "견적 템플릿" },
  { value: "reminder", label: "리마인드 템플릿" },
] as const
