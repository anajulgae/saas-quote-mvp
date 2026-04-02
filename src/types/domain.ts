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

export interface AppUser {
  id: string
  fullName: string
  businessName: string
  email: string
  phone: string
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
}

export interface BusinessSettings {
  id: string
  userId: string
  businessName: string
  ownerName: string
  email: string
  phone: string
  paymentTerms: string
  bankAccount: string
  reminderMessage: string
}

export interface TimelineEvent {
  id: string
  label: string
  description: string
  createdAt: string
}

export interface CustomerSummary extends Customer {
  inquiryCount: number
  quoteCount: number
  invoiceCount: number
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
