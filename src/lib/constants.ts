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
