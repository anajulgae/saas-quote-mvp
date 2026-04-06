export type InquiryStage = "new" | "qualified" | "quoted" | "won" | "lost"

export type QuoteStatus =
  | "draft"
  | "sent"
  | "approved"
  | "rejected"
  | "expired"

export type InvoiceType = "deposit" | "balance" | "final"

export type PaymentStatus =
  | "pending"
  | "deposit_paid"
  | "partially_paid"
  | "paid"
  | "overdue"

export type ReminderChannel = "sms" | "kakao" | "email" | "manual"

export type BillingPlan = "free" | "pro"

export interface AppUser {
  id: string
  fullName: string
  businessName: string
  email: string
  phone: string
  plan: BillingPlan
}

export interface Customer {
  id: string
  userId: string
  name: string
  companyName?: string
  phone: string
  email: string
  tags: string[]
  notes?: string
  createdAt: string
  updatedAt?: string
}

export interface Inquiry {
  id: string
  userId: string
  customerId: string
  title: string
  serviceCategory: string
  channel: string
  details: string
  requestedDate: string
  budgetMin?: number
  budgetMax?: number
  stage: InquiryStage
  followUpAt?: string
  createdAt: string
  updatedAt?: string
}

export interface QuoteItem {
  id: string
  quoteId: string
  name: string
  description?: string
  sortOrder?: number
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface Quote {
  id: string
  userId: string
  customerId: string
  inquiryId?: string
  quoteNumber: string
  title: string
  summary: string
  status: QuoteStatus
  subtotal: number
  tax: number
  total: number
  sentAt?: string
  validUntil?: string
  createdAt: string
  updatedAt?: string
  /** 고객 공유 링크용 비밀 토큰(등록 시) */
  publicShareToken?: string
  shareOpenCount?: number
  shareLastOpenedAt?: string
}

export interface Invoice {
  id: string
  userId: string
  customerId: string
  quoteId?: string
  invoiceNumber: string
  invoiceType: InvoiceType
  amount: number
  paymentStatus: PaymentStatus
  dueDate?: string
  paidAt?: string
  requestedAt?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
  /** 고객 공개 청구서 링크 토큰 */
  publicShareToken?: string
  shareOpenCount?: number
  shareLastOpenedAt?: string
}

export interface Reminder {
  id: string
  userId: string
  invoiceId: string
  channel: ReminderChannel
  message: string
  sentAt: string
}

export interface ActivityLog {
  id: string
  userId: string
  customerId?: string
  inquiryId?: string
  quoteId?: string
  invoiceId?: string
  action: string
  description: string
  createdAt: string
}

export interface Template {
  id: string
  userId: string
  type: "quote" | "reminder"
  name: string
  content: string
  isDefault: boolean
  updatedAt?: string
}

export interface BusinessSettings {
  id: string
  userId: string
  businessName: string
  ownerName: string
  /** 사업자 등록번호 (견적서 발신 정보) */
  businessRegistrationNumber: string
  email: string
  phone: string
  paymentTerms: string
  bankAccount: string
  reminderMessage: string
  /** 직인 이미지(https 또는 PNG data URL) */
  sealImageUrl?: string
  /** 견적서에 직인 표시 */
  sealEnabled: boolean
  /** 서버 행 갱신 시각 — 클라이언트 폼과 서버 스냅샷 동기화용 */
  updatedAt?: string
  /** 고객 공개 문의 폼 (0007 마이그레이션) */
  publicInquiryFormEnabled: boolean
  /** 공개 URL `/request/[token]` — 없으면 비활성·미발급 */
  publicInquiryFormToken: string | null
  publicInquiryIntro: string
  publicInquiryConsentIntro: string
  publicInquiryConsentRetention: string
  publicInquiryCompletionMessage: string
}

/** 운영자 알림 센터 + Realtime */
export interface BillNotification {
  id: string
  userId: string
  type: string
  title: string
  body: string
  linkPath: string | null
  relatedEntityType: string | null
  relatedEntityId: string | null
  isRead: boolean
  dedupeKey: string
  createdAt: string
}

/** 설정 화면 — 채널별 on/off (DB notification_preferences) */
export interface NotificationPreferences {
  userId: string
  inquiryInApp: boolean
  inquiryBrowser: boolean
  inquiryEmail: boolean
  quoteEventsInApp: boolean
  quoteEventsBrowser: boolean
  quoteEventsEmail: boolean
  invoiceEventsInApp: boolean
  invoiceEventsBrowser: boolean
  invoiceEventsEmail: boolean
  reminderEventsInApp: boolean
  reminderEventsBrowser: boolean
  reminderEventsEmail: boolean
}

export type ActivityKind =
  | "inquiry"
  | "quote"
  | "invoice"
  | "reminder"
  | "other"

export interface TimelineEvent {
  id: string
  label: string
  description: string
  createdAt: string
  /** activity_logs.action (데모 타임라인 항목은 생략 가능) */
  action?: string
  kind?: ActivityKind
}

/** 고객 목록 drawer용 최근 1건 스냅샷 */
export interface CustomerRecentSnapshot {
  inquiry?: {
    id: string
    title: string
    createdAt: string
    stage: InquiryStage
  }
  quote?: {
    id: string
    quoteNumber: string
    title: string
    total: number
    status: QuoteStatus
    updatedAt: string
  }
  invoice?: {
    id: string
    invoiceNumber: string
    amount: number
    paymentStatus: PaymentStatus
    updatedAt: string
  }
}

export interface CustomerSummary extends Customer {
  inquiryCount: number
  quoteCount: number
  invoiceCount: number
  /** 문의·견적·청구·고객 수정 중 가장 최근 시각(정렬·표시용) */
  lastActivityAt: string
  /** 최근 14일 이내 문의 존재 */
  hasRecentInquiry: boolean
  /** 초안·발송 등 진행 중 견적 */
  hasActiveQuote: boolean
  /** 입금 완료 전 청구 존재 */
  hasOpenReceivable: boolean
  /** 연체 청구 존재 */
  hasOverdueInvoice: boolean
  /** 고객별 최신 문의·견적·청구 1건(운영 drawer 요약) */
  recentSnapshot?: CustomerRecentSnapshot
  /** 최근 활동 로그 상위 N건(고객과 연결된 기록) */
  recentActivity?: ActivityLog[]
}

/** 견적 상세에서 연결 청구 나열용 */
export interface QuoteLinkedInvoiceStub {
  id: string
  quoteId: string
  invoiceNumber: string
  amount: number
  paymentStatus: PaymentStatus
}

export interface InquiryWithCustomer extends Inquiry {
  customer?: Customer
}

export interface QuoteWithItems extends Quote {
  customer?: Customer
  items: QuoteItem[]
}

export interface InvoiceWithReminders extends Invoice {
  customer?: Customer
  reminders: Reminder[]
}

export interface DashboardMetrics {
  quoteCountThisMonth: number
  outstandingAmount: number
  waitingPayments: number
  followUpsToday: number
}

export interface QuoteFormInput {
  customerId: string
  inquiryId?: string
  title: string
  summary: string
  status: QuoteStatus
  validUntil?: string
  sentAt?: string
  items: Array<{
    name: string
    description?: string
    quantity: number
    unitPrice: number
  }>
}

export interface InvoiceFormInput {
  customerId: string
  quoteId?: string
  invoiceType: InvoiceType
  amount: number
  paymentStatus: PaymentStatus
  dueDate?: string
  requestedAt?: string
  paidAt?: string
  notes: string
}

export interface ReminderFormInput {
  invoiceId: string
  channel: ReminderChannel
  message: string
}
