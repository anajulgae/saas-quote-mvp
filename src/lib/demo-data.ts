import type { UserBillingSnapshot } from "@/lib/subscription"

import type {
  ActivityKind,
  ActivityLog,
  AppUser,
  BusinessPublicPage,
  BusinessSettings,
  Customer,
  Inquiry,
  Invoice,
  Reminder,
  Template,
  Quote,
  QuoteItem,
} from "@/types/domain"

export const demoUser: AppUser = {
  id: "user-demo",
  fullName: "김민준",
  businessName: "민준 스튜디오",
  email: "demo@flowbill.kr",
  phone: "010-2841-5532",
  plan: "business",
  effectivePlan: "business",
  subscriptionStatus: "active",
  trialEndsAt: null,
}

/** 설정·빌링 UI 데모용 */
export const demoBillingSnapshot: UserBillingSnapshot = {
  plan: "business",
  subscriptionStatus: "active",
  trialStartedAt: null,
  trialEndsAt: null,
  currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
  cancelAtPeriodEnd: false,
  pendingPlan: null,
  billingProvider: "mock",
  billingProviderSubscriptionId: "mock_sub_demo",
  billingProviderPriceId: "mock_price_business",
  paymentMethodBrand: "mock-card",
  paymentMethodLast4: "4242",
  billingStatusUpdatedAt: new Date().toISOString(),
  usageMonth: new Date().toISOString().slice(0, 7),
  aiCallsThisMonth: 42,
  documentSendsThisMonth: 28,
  billingColumnsMissing: false,
}

export const demoBusinessSettings: BusinessSettings = {
  id: "settings-1",
  userId: demoUser.id,
  businessName: "민준 스튜디오",
  ownerName: "김민준",
  businessRegistrationNumber: "123-45-67890",
  email: "hello@minjunstudio.kr",
  phone: "010-2841-5532",
  paymentTerms: "선금 50%, 납품 전 잔금 50%",
  bankAccount: "국민은행 123456-78-901234 김민준",
  reminderMessage:
    "안녕하세요. 이전에 전달드린 청구 건의 입금 일정을 확인 부탁드립니다.",
  sealEnabled: false,
  sealImageUrl: undefined,
  updatedAt: "2026-01-01T00:00:00.000Z",
  publicInquiryFormEnabled: false,
  publicInquiryFormToken: null,
  publicInquiryIntro: "",
  publicInquiryConsentIntro: "",
  publicInquiryConsentRetention: "",
  publicInquiryCompletionMessage: "",
  taxInvoiceProvider: "mock",
  taxInvoiceProviderConfig: {
    enabled: true,
    apiKey: "demo-mock-key",
    apiSecret: "",
    companyCode: "",
  },
  taxInvoiceSupplierAddress: "서울특별시 (데모)",
}

export const demoBusinessPublicPage: BusinessPublicPage = {
  id: "landing-demo",
  userId: demoUser.id,
  slug: "minjun-studio",
  isPublished: false,
  template: "default",
  businessName: "민준 스튜디오",
  headline: "브랜드에 맞는 영상, 빠르게 제안부터 납품까지",
  introOneLine: "서울·경기 출장 촬영 · 기업·소상공인 홍보 영상 전문",
  about:
    "짧은 러닝타임에 메시지가 담기도록 기획부터 편집까지 한 번에 진행합니다.\n문의를 남겨 주시면 반나절 이내 연락드립니다.",
  services: [
    { title: "기업 홍보 영상", description: "인터뷰·현장 촬영·자막·썸네일까지 패키지" },
    { title: "숏폼·릴스 편집", description: "원본만 주셔도 플랫폼별 포맷으로 전달" },
    { title: "행사 스케치", description: "당일 하이라이트 컷 위주 빠른 편집" },
  ],
  contactPhone: demoBusinessSettings.phone,
  contactEmail: demoBusinessSettings.email,
  location: "서울 · 경기 출장",
  businessHours: "평일 10:00–18:00 (주말은 사전 협의)",
  socialLinks: [{ label: "인스타그램", url: "https://instagram.com" }],
  heroImageUrl: undefined,
  seoTitle: "민준 스튜디오 | 홍보 영상 제작",
  seoDescription: "기업·소상공인 대상 홍보 영상·릴스 편집. 서울·경기 출장.",
  faq: [
    { question: "견적은 얼마나 걸리나요?", answer: "내용 확인 후 영업일 기준 1–2일 내 견적을 드립니다." },
    { question: "원본 파일도 받을 수 있나요?", answer: "계약 범위에 따라 제공 가능 여부를 안내드립니다." },
  ],
  trustPoints: ["현장 경험 다수", "긴급 일정 협의 가능", "수정 1회 기본 포함"],
  ctaText: "무료 상담 문의",
  inquiryCtaEnabled: true,
  updatedAt: "2026-01-01T00:00:00.000Z",
}

export const demoCustomers: Customer[] = [
  {
    id: "customer-1",
    userId: demoUser.id,
    name: "박서연",
    companyName: "서연뷰티",
    phone: "010-1111-2222",
    email: "owner@seoyeonbeauty.kr",
    tags: ["뷰티", "단골"],
    notes: "인스타그램 릴스 위주 영상 제작 의뢰",
    createdAt: "2026-03-01T10:00:00+09:00",
  },
  {
    id: "customer-2",
    userId: demoUser.id,
    name: "이정훈",
    companyName: "클린픽 홈서비스",
    phone: "010-2222-3333",
    email: "contact@cleanpick.kr",
    tags: ["청소", "기업"],
    notes: "월 2회 에어컨 청소 패키지 검토 중",
    createdAt: "2026-03-12T14:00:00+09:00",
  },
  {
    id: "customer-3",
    userId: demoUser.id,
    name: "최도윤",
    companyName: "도윤디자인",
    phone: "010-3333-4444",
    email: "hello@doyoon.design",
    tags: ["디자인", "신규"],
    notes: "브랜드 패키지 견적 문의",
    createdAt: "2026-03-18T13:00:00+09:00",
  },
]

export const demoInquiries: Inquiry[] = [
  {
    id: "inquiry-1",
    userId: demoUser.id,
    customerId: "customer-1",
    title: "봄 시즌 매장 홍보 릴스 4편",
    serviceCategory: "영상 제작",
    channel: "카카오톡",
    details: "촬영 1회와 편집 4편 포함. 4월 첫째 주 납기 희망",
    requestedDate: "2026-04-01",
    budgetMin: 600000,
    budgetMax: 900000,
    stage: "quoted",
    followUpAt: "2026-04-02T16:00:00+09:00",
    createdAt: "2026-03-28T11:00:00+09:00",
  },
  {
    id: "inquiry-2",
    userId: demoUser.id,
    customerId: "customer-2",
    title: "시스템 에어컨 5대 청소",
    serviceCategory: "에어컨 청소",
    channel: "전화",
    details: "사무실 이전 전 청소. 세금계산서 필요",
    requestedDate: "2026-04-05",
    budgetMin: 450000,
    budgetMax: 550000,
    stage: "qualified",
    followUpAt: "2026-04-03T10:00:00+09:00",
    createdAt: "2026-03-29T17:00:00+09:00",
  },
  {
    id: "inquiry-3",
    userId: demoUser.id,
    customerId: "customer-3",
    title: "로고 및 명함 패키지",
    serviceCategory: "브랜드 디자인",
    channel: "이메일",
    details: "로고 3안과 명함 시안 포함",
    requestedDate: "2026-04-07",
    budgetMin: 800000,
    budgetMax: 1200000,
    stage: "new",
    followUpAt: "2026-04-02T19:00:00+09:00",
    createdAt: "2026-04-01T09:30:00+09:00",
  },
]

export const demoQuotes: Quote[] = [
  {
    id: "quote-1",
    userId: demoUser.id,
    customerId: "customer-1",
    inquiryId: "inquiry-1",
    quoteNumber: "Q-2026-041",
    title: "서연뷰티 릴스 제작 패키지",
    summary: "릴스 4편, 촬영 1회, 자막/썸네일 포함",
    status: "sent",
    subtotal: 800000,
    tax: 80000,
    total: 880000,
    sentAt: "2026-04-01T12:00:00+09:00",
    validUntil: "2026-04-08",
    createdAt: "2026-04-01T11:40:00+09:00",
    publicShareToken: "shr_demo_quote_2026_01",
  },
  {
    id: "quote-2",
    userId: demoUser.id,
    customerId: "customer-2",
    inquiryId: "inquiry-2",
    quoteNumber: "Q-2026-042",
    title: "클린픽 사무실 에어컨 청소",
    summary: "시스템 에어컨 5대 분해 청소",
    status: "draft",
    subtotal: 500000,
    tax: 50000,
    total: 550000,
    validUntil: "2026-04-10",
    createdAt: "2026-04-02T08:30:00+09:00",
    publicShareToken: "shr_demo_quote_2026_02",
  },
]

export const demoQuoteItems: QuoteItem[] = [
  {
    id: "item-1",
    quoteId: "quote-1",
    name: "매장 촬영 1회",
    description: "반나절 현장 촬영",
    quantity: 1,
    unitPrice: 300000,
    lineTotal: 300000,
  },
  {
    id: "item-2",
    quoteId: "quote-1",
    name: "릴스 편집 4편",
    description: "자막, 음악, 썸네일 포함",
    quantity: 4,
    unitPrice: 125000,
    lineTotal: 500000,
  },
  {
    id: "item-3",
    quoteId: "quote-2",
    name: "시스템 에어컨 청소",
    description: "5대 분해 세척",
    quantity: 5,
    unitPrice: 100000,
    lineTotal: 500000,
  },
]

export const demoInvoices: Invoice[] = [
  {
    id: "invoice-1",
    userId: demoUser.id,
    customerId: "customer-1",
    quoteId: "quote-1",
    invoiceNumber: "I-2026-021",
    invoiceType: "deposit",
    amount: 440000,
    paymentStatus: "deposit_paid",
    dueDate: "2026-04-03",
    paidAt: "2026-04-02T09:20:00+09:00",
    requestedAt: "2026-04-01T12:10:00+09:00",
    notes: "계약 확정 후 바로 입금 완료",
    publicShareToken: "demoInvoiceShareToken02",
  },
  {
    id: "invoice-2",
    userId: demoUser.id,
    customerId: "customer-1",
    quoteId: "quote-1",
    invoiceNumber: "I-2026-022",
    invoiceType: "balance",
    amount: 440000,
    paymentStatus: "pending",
    dueDate: "2026-04-10",
    requestedAt: "2026-04-01T12:15:00+09:00",
    notes: "납품 전 잔금 예정",
    publicShareToken: "demoInvoiceShareToken01",
    createdAt: "2026-04-01T12:15:00+09:00",
  },
  {
    id: "invoice-3",
    userId: demoUser.id,
    customerId: "customer-2",
    quoteId: "quote-2",
    invoiceNumber: "I-2026-023",
    invoiceType: "deposit",
    amount: 275000,
    paymentStatus: "overdue",
    dueDate: "2026-04-01",
    requestedAt: "2026-03-30T10:00:00+09:00",
    notes: "리마인드 2회 발송",
    publicShareToken: "demoInvoiceShareToken03",
  },
]

export const demoReminders: Reminder[] = [
  {
    id: "reminder-1",
    userId: demoUser.id,
    invoiceId: "invoice-3",
    channel: "kakao",
    message: "안녕하세요. 선금 입금 일정 확인 부탁드립니다.",
    sentAt: "2026-04-01T11:30:00+09:00",
  },
  {
    id: "reminder-2",
    userId: demoUser.id,
    invoiceId: "invoice-3",
    channel: "manual",
    message: "전화로 일정 재확인, 내일 오전 입금 예정 답변",
    sentAt: "2026-04-02T09:10:00+09:00",
  },
]

export const demoActivityLogs: ActivityLog[] = [
  {
    id: "activity-1",
    userId: demoUser.id,
    action: "invoice.reminder_sent",
    description: "클린픽 홈서비스에 미수 리마인드를 발송했습니다.",
    createdAt: "2026-04-02T09:10:00+09:00",
  },
  {
    id: "activity-2",
    userId: demoUser.id,
    action: "invoice.deposit_paid",
    description: "서연뷰티 선금 입금이 확인되었습니다.",
    createdAt: "2026-04-02T09:20:00+09:00",
  },
  {
    id: "activity-3",
    userId: demoUser.id,
    action: "quote.sent",
    description: "서연뷰티 릴스 제작 견적서를 발송했습니다.",
    createdAt: "2026-04-01T12:00:00+09:00",
  },
]

export const demoTemplates: Template[] = [
  {
    id: "template-1",
    userId: demoUser.id,
    type: "quote",
    name: "영상 제작 기본 견적",
    isDefault: true,
    content:
      "프로젝트 범위, 촬영 횟수, 편집 편수, 수정 횟수, 납기, 결제 조건을 포함한 견적 문구",
  },
  {
    id: "template-2",
    userId: demoUser.id,
    type: "reminder",
    name: "미수 1차 리마인드",
    isDefault: true,
    content:
      "안녕하세요. 이전에 전달드린 청구 건의 입금 기한이 도래하여 일정 확인 부탁드립니다.",
  },
]

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

export function getCustomerById(customerId: string) {
  return demoCustomers.find((customer) => customer.id === customerId)
}

export function getQuoteItems(quoteId: string) {
  return demoQuoteItems.filter((item) => item.quoteId === quoteId)
}

export function getCustomerTimeline(customerId: string) {
  const inquiryEvents = demoInquiries
    .filter((item) => item.customerId === customerId)
    .map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      label: "문의 등록",
      description: item.title,
      kind: "inquiry" as ActivityKind,
    }))

  const quoteEvents = demoQuotes
    .filter((item) => item.customerId === customerId)
    .map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      label: "견적 생성",
      description: `${item.quoteNumber} · ${item.title}`,
      kind: "quote" as ActivityKind,
    }))

  const invoiceEvents = demoInvoices
    .filter((item) => item.customerId === customerId)
    .map((item) => ({
      id: item.id,
      createdAt: item.requestedAt ?? item.paidAt ?? item.dueDate ?? item.invoiceNumber,
      label: "청구 생성",
      description: `${item.invoiceNumber} · ${item.invoiceType}`,
      kind: "invoice" as ActivityKind,
    }))

  return [...inquiryEvents, ...quoteEvents, ...invoiceEvents].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  )
}

export function getDashboardMetrics() {
  const quoteCountThisMonth = demoQuotes.filter((quote) =>
    quote.createdAt.startsWith("2026-04")
  ).length

  const outstandingAmount = demoInvoices
    .filter((invoice) => invoice.paymentStatus !== "paid")
    .filter((invoice) => invoice.paymentStatus !== "deposit_paid")
    .reduce((sum, invoice) => sum + invoice.amount, 0)

  const waitingPayments = demoInvoices.filter(
    (invoice) =>
      invoice.paymentStatus === "pending" ||
      invoice.paymentStatus === "partially_paid" ||
      invoice.paymentStatus === "overdue"
  ).length

  const followUpsToday = demoInquiries.filter((inquiry) =>
    inquiry.followUpAt?.startsWith("2026-04-02")
  ).length

  return {
    quoteCountThisMonth,
    outstandingAmount,
    waitingPayments,
    followUpsToday,
  }
}
