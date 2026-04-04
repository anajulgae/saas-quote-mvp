export const inquiryStageOptions = [
  { value: "new", label: "신규 문의" },
  { value: "qualified", label: "검토 중" },
  { value: "quoted", label: "견적 발송" },
  { value: "won", label: "수주 완료" },
  { value: "lost", label: "보류/실패" },
] as const

export const paymentStatusOptions = [
  { value: "pending", label: "입금 대기" },
  { value: "deposit_paid", label: "선금 입금" },
  { value: "partially_paid", label: "부분 입금" },
  { value: "paid", label: "입금 완료" },
  { value: "overdue", label: "연체" },
] as const

export const quoteStatusOptions = [
  { value: "draft", label: "초안" },
  { value: "sent", label: "발송됨" },
  { value: "approved", label: "승인" },
  { value: "rejected", label: "거절" },
  { value: "expired", label: "만료" },
] as const

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
