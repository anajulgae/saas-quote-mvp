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

/** DB `users.plan` — legacy `free` 는 런타임에서 starter 로 정규화 */
export type BillingPlan = "starter" | "pro" | "business"

/** 구독·체험 상태 (`users.subscription_status`) */
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "pending"
  | "trial_expired"

export interface AppUser {
  id: string
  fullName: string
  businessName: string
  email: string
  phone: string
  /** DB 청구 플랜 */
  plan: BillingPlan
  /** 기능 게이트용(체험 중이면 pro 등) */
  effectivePlan?: BillingPlan
  subscriptionStatus?: SubscriptionStatus
  trialEndsAt?: string | null
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
  /** Pro 고객 미니 포털 링크용(내부 전용) */
  portalToken?: string
  /** 세금계산서 공급받는자 정보(선택) */
  taxBusinessName?: string
  taxBusinessRegistrationNumber?: string
  taxCeoName?: string
  taxInvoiceEmail?: string
  taxContactName?: string
  taxAddress?: string
}

/** AI 문의 트리아지 — DB `inquiries.ai_analysis` JSON과 동일 구조 */
export type InquiryAiRequestType =
  | "new_quote_request"
  | "general_inquiry"
  | "schedule_coordination"
  | "re_inquiry"
  | "as_revision"
  | "other"

export type InquiryAiUrgency = "high" | "medium" | "low"

export type InquiryAiNextActionKind =
  | "convert_quote"
  | "complete_customer_info"
  | "confirm_schedule"
  | "confirm_budget"
  | "followup_call"
  | "internal_review"
  | "other"

export interface InquiryAiAnalysis {
  requestType: InquiryAiRequestType
  /** 화면 표시용 한글 라벨 */
  requestTypeLabel: string
  urgency: InquiryAiUrgency
  summary: string
  suggestedQuestions: string[]
  nextActions: Array<{
    kind: InquiryAiNextActionKind
    label: string
    reason: string
    priority: number
  }>
  followupPriority: InquiryAiUrgency
  quoteConversionReady: boolean
  quoteConversionHint: string
  /** 업종·서비스 맥락 메모 (내부 참고) */
  industryContextNote?: string
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
  aiAnalysis?: InquiryAiAnalysis
  aiAnalysisUpdatedAt?: string
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

export type CollectionToneHint = "polite" | "neutral" | "firm"

/** AI 추심 보조 → compose-message kind 와 동기화 */
export type CollectionComposeKind =
  | "invoice_notice"
  | "invoice_balance_request"
  | "overdue_reminder"
  | "overdue_reminder_second"
  | "post_promise_nudge"
  | "followup_due_nudge"

export interface InvoiceCollectionAdvice {
  headline: string
  reason: string
  suggestedTone: CollectionToneHint
  messageKind: CollectionComposeKind
  draftSubject?: string
  draftBody: string
  checklist: string[]
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
  /** 추심·후속: 입금 약속일 */
  promisedPaymentDate?: string
  /** 추심·후속: 다음 연락 예정 */
  nextCollectionFollowupAt?: string
  /** 리마인드 톤 힌트 */
  collectionTone?: CollectionToneHint
  /** 세금계산서(전자) 발행 대상 청구 */
  eTaxInvoiceTarget?: boolean
  /** 사용자가 표시한 발행 필요(자동 발행 아님) */
  eTaxInvoiceNeedIssue?: boolean
  eTaxInvoiceSupplyDate?: string
  eTaxInvoiceIssueDueDate?: string
}

export type TaxInvoiceStatus = "draft" | "ready" | "issuing" | "issued" | "failed" | "canceled"

/** 청구에 연결된 전자세금계산서 발행 관리 행 — 실제 발행은 ASP */
export interface TaxInvoice {
  id: string
  userId: string
  customerId: string
  invoiceId: string
  quoteId?: string
  issueType: string
  status: TaxInvoiceStatus
  taxType: string
  supplyDate?: string
  issueDueDate?: string
  issueDate?: string
  approvalNumber?: string
  totalSupplyAmount: number
  vatAmount: number
  totalAmount: number
  recipientBusinessName?: string
  recipientBusinessNumber?: string
  recipientEmail?: string
  recipientCeoName?: string
  senderBusinessName?: string
  senderBusinessNumber?: string
  senderEmail?: string
  senderCeoName?: string
  senderAddress?: string
  aspProvider?: string
  aspDocumentId?: string
  aspResponseLog: Record<string, unknown>
  failureReason?: string
  createdAt: string
  updatedAt: string
}

/** 설정 화면 — BYOA 카카오 알림톡(또는 동일 페이로드를 받는 프록시) */
export interface MessagingChannelConfig {
  id: string
  userId: string
  channelKind: "kakao_alimtalk"
  providerType: "custom_http"
  apiEndpoint: string
  apiKey: string
  apiKeyHeader: string
  senderKey: string
  templateCode: string
  enabled: boolean
  extraConfig: Record<string, unknown>
  updatedAt?: string
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

/** Pro 전용 공개 업체 소개 랜딩 (`/biz/[slug]`) */
export type BusinessLandingTemplate = "default" | "minimal"

export interface BusinessLandingServiceItem {
  title: string
  description: string
}

export interface BusinessLandingSocialLink {
  label: string
  url: string
}

export interface BusinessLandingFaqItem {
  question: string
  answer: string
}

export interface BusinessPublicPage {
  id: string
  userId: string
  slug: string
  isPublished: boolean
  template: BusinessLandingTemplate
  businessName: string
  headline: string
  introOneLine: string
  about: string
  services: BusinessLandingServiceItem[]
  contactPhone: string
  contactEmail: string
  location: string
  businessHours: string
  socialLinks: BusinessLandingSocialLink[]
  heroImageUrl?: string
  seoTitle: string
  seoDescription: string
  faq: BusinessLandingFaqItem[]
  trustPoints: string[]
  ctaText: string
  inquiryCtaEnabled: boolean
  aiGeneratedAt?: string
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
  /** ASP 식별자 — 사용자 연동 계정으로 발행 */
  taxInvoiceProvider?: string
  /** 없으면 빈 객체로 매핑 */
  taxInvoiceProviderConfig?: TaxInvoiceAspProviderConfig
  taxInvoiceSupplierAddress?: string
}

/** 설정에 저장되는 ASP 연동(JSON). 운영 시 서버 암호화·Vault 권장 */
export type TaxInvoiceAspProviderConfig = {
  enabled?: boolean
  apiKey?: string
  apiSecret?: string
  companyCode?: string
  lastTestAt?: string
  lastTestOk?: boolean
  lastTestError?: string
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
  /** 해당 청구의 세금계산서 발행 행(없으면 미작성) */
  taxInvoice?: TaxInvoice | null
}

/** 고객 상세 — 세금계산서 보조 요약 */
export interface CustomerTaxInvoiceSummary {
  lastStatus?: TaxInvoiceStatus
  lastIssueDate?: string
  lastApprovalNumber?: string
  linkedInvoiceId?: string
  linkedInvoiceNumber?: string
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
  promisedPaymentDate?: string
  nextCollectionFollowupAt?: string
  collectionTone?: CollectionToneHint
}

export interface ReminderFormInput {
  invoiceId: string
  channel: ReminderChannel
  message: string
}
