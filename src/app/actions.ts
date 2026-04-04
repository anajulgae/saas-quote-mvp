"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import {
  createSupabaseServerClient,
  ensureUserProfile,
  getDemoCredentials,
  getDemoSessionCookieName,
  isSupabaseConfigured,
} from "@/lib/auth"
import { toUserFacingActionError } from "@/lib/action-errors"
import { isDemoLoginEnabled, isDemoPasswordStrongEnoughForProduction } from "@/lib/demo-flags"
import {
  createActivityLog,
  createInquiryRecord,
  createInvoiceRecord,
  createQuoteRecord,
  createReminderRecord,
  saveBusinessSettingsRecord,
  saveTemplatesRecord,
  updateInquiryRecord,
  updateInvoicePaymentStatusRecord,
  updateInvoiceRecord,
  updateQuoteRecord,
  updateQuoteStatusRecord,
} from "@/lib/data"
import type {
  InquiryStage,
  InvoiceFormInput,
  PaymentStatus,
  QuoteFormInput,
  QuoteStatus,
  ReminderChannel,
} from "@/types/domain"

const inquiryFormSchema = z.object({
  title: z.string().trim().min(1, "문의 제목을 입력해 주세요."),
  customerId: z.string().trim().min(1, "고객을 선택해 주세요."),
  serviceCategory: z.string().trim().min(1, "서비스 카테고리를 입력해 주세요."),
  channel: z.string().trim().min(1, "문의 채널을 입력해 주세요."),
  details: z.string().trim().default(""),
  budgetMin: z.number().int().nonnegative().optional(),
  budgetMax: z.number().int().nonnegative().optional(),
  stage: z.custom<InquiryStage>(),
  followUpAt: z.string().datetime().optional(),
})

function parseOptionalNumber(value: string) {
  if (!value.trim()) {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function normalizeInquiryInput(input: {
  title: string
  customerId: string
  serviceCategory: string
  channel: string
  details: string
  budgetMin: string
  budgetMax: string
  stage: InquiryStage
  followUpAt: string
}) {
  return inquiryFormSchema.parse({
    title: input.title,
    customerId: input.customerId,
    serviceCategory: input.serviceCategory,
    channel: input.channel,
    details: input.details,
    budgetMin: parseOptionalNumber(input.budgetMin),
    budgetMax: parseOptionalNumber(input.budgetMax),
    stage: input.stage,
    followUpAt: input.followUpAt
      ? new Date(input.followUpAt).toISOString()
      : undefined,
  })
}

const quoteItemSchema = z.object({
  name: z.string().trim().min(1, "견적 항목명을 입력해 주세요."),
  description: z.string().trim().optional(),
  quantity: z.number().positive("수량은 0보다 커야 합니다."),
  unitPrice: z.number().nonnegative("단가는 0 이상이어야 합니다."),
})

const quoteFormSchema = z.object({
  customerId: z.string().trim().min(1, "고객을 선택해 주세요."),
  inquiryId: z.string().trim().optional(),
  title: z.string().trim().min(1, "견적 제목을 입력해 주세요."),
  summary: z.string().trim().default(""),
  status: z.custom<QuoteStatus>(),
  validUntil: z.string().optional(),
  sentAt: z.string().optional(),
  items: z.array(quoteItemSchema).min(1, "최소 1개 항목을 입력해 주세요."),
})

const invoiceFormSchema = z.object({
  customerId: z.string().trim().min(1, "고객을 선택해 주세요."),
  quoteId: z.string().trim().optional(),
  invoiceType: z.enum(["deposit", "balance", "final"]),
  amount: z.number().positive("청구 금액을 입력해 주세요."),
  paymentStatus: z.custom<PaymentStatus>(),
  dueDate: z.string().optional(),
  requestedAt: z.string().optional(),
  paidAt: z.string().optional(),
  notes: z.string().trim().default(""),
})

const reminderFormSchema = z.object({
  invoiceId: z.string().trim().min(1),
  channel: z.custom<ReminderChannel>(),
  message: z.string().trim().min(1, "리마인드 내용을 입력해 주세요."),
})

const settingsSchema = z.object({
  businessName: z.string().trim().min(1, "사업장명을 입력해 주세요."),
  ownerName: z.string().trim().min(1, "대표자명을 입력해 주세요."),
  email: z.string().trim().email("올바른 이메일을 입력해 주세요.").or(z.literal("")),
  phone: z.string().trim().default(""),
  paymentTerms: z.string().trim().default(""),
  bankAccount: z.string().trim().default(""),
  reminderMessage: z.string().trim().default(""),
})

const templateSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["quote", "reminder"]),
  name: z.string().trim().min(1, "템플릿 이름을 입력해 주세요."),
  content: z.string().trim().min(1, "템플릿 내용을 입력해 주세요."),
  isDefault: z.boolean(),
})

function normalizeQuoteInput(input: {
  customerId: string
  inquiryId: string
  title: string
  summary: string
  status: QuoteStatus
  validUntil: string
  sentAt: string
  items: Array<{
    name: string
    description: string
    quantity: string
    unitPrice: string
  }>
}): QuoteFormInput {
  return quoteFormSchema.parse({
    customerId: input.customerId,
    inquiryId: input.inquiryId || undefined,
    title: input.title,
    summary: input.summary,
    status: input.status,
    validUntil: input.validUntil || undefined,
    sentAt: input.sentAt || undefined,
    items: input.items.map((item) => ({
      name: item.name,
      description: item.description || undefined,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    })),
  })
}

function normalizeInvoiceInput(input: {
  customerId: string
  quoteId: string
  invoiceType: InvoiceFormInput["invoiceType"]
  amount: string
  paymentStatus: PaymentStatus
  dueDate: string
  requestedAt: string
  paidAt: string
  notes: string
}): InvoiceFormInput {
  return invoiceFormSchema.parse({
    customerId: input.customerId,
    quoteId: input.quoteId || undefined,
    invoiceType: input.invoiceType,
    amount: Number(input.amount),
    paymentStatus: input.paymentStatus,
    dueDate: input.dueDate || undefined,
    requestedAt: input.requestedAt || undefined,
    paidAt: input.paidAt || undefined,
    notes: input.notes,
  })
}

export async function loginAction(_: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "").trim()

  if (!email || !password) {
    return {
      error: "이메일과 비밀번호를 입력해 주세요.",
    }
  }

  const demoCredentials = getDemoCredentials()

  if (isDemoLoginEnabled()) {
    if (email === demoCredentials.email && password === demoCredentials.password) {
      if (!isDemoPasswordStrongEnoughForProduction()) {
        return {
          error:
            "공개 데모가 프로덕션에서 비활성화되었습니다. DEMO_LOGIN_PASSWORD(16자 이상)를 환경 변수에 설정한 뒤 다시 시도하세요.",
        }
      }

      const cookieStore = await cookies()
      cookieStore.set(getDemoSessionCookieName(), "1", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 14,
      })

      redirect("/dashboard")
    }
  }

  if (!isSupabaseConfigured()) {
    if (!isDemoLoginEnabled()) {
      return {
        error:
          "이 환경에서는 Supabase가 설정되어야 합니다. 관리자에게 문의하거나 ENABLE_DEMO_LOGIN=true 로 데모를 허용할 수 있습니다.",
      }
    }

    return {
      error: `데모 로그인은 ${demoCredentials.email} 및 설정된 데모 비밀번호를 사용해 주세요.`,
    }
  }

  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return {
      error: "Supabase 설정을 확인해 주세요.",
    }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes("invalid login") || msg.includes("invalid_credentials")) {
      return {
        error: "이메일 또는 비밀번호가 올바르지 않습니다.",
      }
    }
    if (msg.includes("email not confirmed")) {
      return {
        error: "이메일 인증이 완료되지 않았습니다. 메일함을 확인해 주세요.",
      }
    }
    return {
      error: toUserFacingActionError(error, "로그인에 실패했습니다. 잠시 후 다시 시도해 주세요."),
    }
  }

  const {
    data: { user: signedInUser },
  } = await supabase.auth.getUser()

  if (signedInUser) {
    await ensureUserProfile(supabase, signedInUser)
    await createActivityLog({
      action: "auth.login_success",
      description: "로그인에 성공했습니다.",
      metadata: { source: "password" },
    })
  }

  redirect("/dashboard")
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete(getDemoSessionCookieName())

  const supabase = await createSupabaseServerClient()

  if (supabase) {
    await supabase.auth.signOut()
  }

  redirect("/login")
}

export async function createInquiryAction(input: {
  title: string
  customerId: string
  serviceCategory: string
  channel: string
  details: string
  budgetMin: string
  budgetMax: string
  stage: InquiryStage
  followUpAt: string
}) {
  try {
    const parsed = normalizeInquiryInput(input)
    await createInquiryRecord(parsed)
    revalidatePath("/dashboard")
    revalidatePath("/inquiries")
    revalidatePath("/customers")
    revalidatePath(`/customers/${parsed.customerId}`)

    return { ok: true as const }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false as const, error: error.issues[0]?.message ?? "입력값을 확인해 주세요." }
    }

    return {
      ok: false as const,
      error: toUserFacingActionError(error, "문의 저장에 실패했습니다."),
    }
  }
}

export async function updateInquiryAction(
  inquiryId: string,
  input: {
    title: string
    customerId: string
    serviceCategory: string
    channel: string
    details: string
    budgetMin: string
    budgetMax: string
    stage: InquiryStage
    followUpAt: string
  }
) {
  try {
    const parsed = normalizeInquiryInput(input)
    await updateInquiryRecord(inquiryId, parsed)
    revalidatePath("/dashboard")
    revalidatePath("/inquiries")
    revalidatePath("/customers")
    revalidatePath(`/customers/${parsed.customerId}`)

    return { ok: true as const }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false as const, error: error.issues[0]?.message ?? "입력값을 확인해 주세요." }
    }

    return {
      ok: false as const,
      error: toUserFacingActionError(error, "문의 수정에 실패했습니다."),
    }
  }
}

function revalidateBusinessPages(customerId?: string) {
  revalidatePath("/dashboard")
  revalidatePath("/quotes")
  revalidatePath("/invoices")
  revalidatePath("/customers")

  if (customerId) {
    revalidatePath(`/customers/${customerId}`)
  }
}

export async function createQuoteAction(input: {
  customerId: string
  inquiryId: string
  title: string
  summary: string
  status: QuoteStatus
  validUntil: string
  sentAt: string
  items: Array<{
    name: string
    description: string
    quantity: string
    unitPrice: string
  }>
}) {
  try {
    const parsed = normalizeQuoteInput(input)
    await createQuoteRecord(parsed)
    revalidateBusinessPages(parsed.customerId)
    revalidatePath("/inquiries")

    return { ok: true as const }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false as const, error: error.issues[0]?.message ?? "입력값을 확인해 주세요." }
    }

    return {
      ok: false as const,
      error: toUserFacingActionError(error, "견적 저장에 실패했습니다."),
    }
  }
}

export async function updateQuoteAction(
  quoteId: string,
  input: {
    customerId: string
    inquiryId: string
    title: string
    summary: string
    status: QuoteStatus
    validUntil: string
    sentAt: string
    items: Array<{
      name: string
      description: string
      quantity: string
      unitPrice: string
    }>
  }
) {
  try {
    const parsed = normalizeQuoteInput(input)
    await updateQuoteRecord(quoteId, parsed)
    revalidateBusinessPages(parsed.customerId)
    revalidatePath("/inquiries")

    return { ok: true as const }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false as const, error: error.issues[0]?.message ?? "입력값을 확인해 주세요." }
    }

    return {
      ok: false as const,
      error: toUserFacingActionError(error, "견적 수정에 실패했습니다."),
    }
  }
}

export async function updateQuoteStatusAction(
  quoteId: string,
  status: QuoteStatus,
  customerId?: string
) {
  try {
    await updateQuoteStatusRecord(quoteId, status)
    revalidateBusinessPages(customerId)
    revalidatePath("/inquiries")
    return { ok: true as const }
  } catch (error) {
    return {
      ok: false as const,
      error: toUserFacingActionError(error, "견적 상태 변경에 실패했습니다."),
    }
  }
}

export async function createInvoiceAction(input: {
  customerId: string
  quoteId: string
  invoiceType: InvoiceFormInput["invoiceType"]
  amount: string
  paymentStatus: PaymentStatus
  dueDate: string
  requestedAt: string
  paidAt: string
  notes: string
}) {
  try {
    const parsed = normalizeInvoiceInput(input)
    await createInvoiceRecord(parsed)
    revalidateBusinessPages(parsed.customerId)
    return { ok: true as const }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false as const, error: error.issues[0]?.message ?? "입력값을 확인해 주세요." }
    }

    return {
      ok: false as const,
      error: toUserFacingActionError(error, "청구 저장에 실패했습니다."),
    }
  }
}

export async function updateInvoiceAction(
  invoiceId: string,
  input: {
    customerId: string
    quoteId: string
    invoiceType: InvoiceFormInput["invoiceType"]
    amount: string
    paymentStatus: PaymentStatus
    dueDate: string
    requestedAt: string
    paidAt: string
    notes: string
  }
) {
  try {
    const parsed = normalizeInvoiceInput(input)
    await updateInvoiceRecord(invoiceId, parsed)
    revalidateBusinessPages(parsed.customerId)
    return { ok: true as const }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false as const, error: error.issues[0]?.message ?? "입력값을 확인해 주세요." }
    }

    return {
      ok: false as const,
      error: toUserFacingActionError(error, "청구 수정에 실패했습니다."),
    }
  }
}

export async function updateInvoicePaymentStatusAction(
  invoiceId: string,
  status: PaymentStatus,
  customerId?: string
) {
  try {
    await updateInvoicePaymentStatusRecord(invoiceId, status)
    revalidateBusinessPages(customerId)
    return { ok: true as const }
  } catch (error) {
    return {
      ok: false as const,
      error: toUserFacingActionError(error, "결제 상태 변경에 실패했습니다."),
    }
  }
}

export async function createReminderAction(input: {
  invoiceId: string
  channel: ReminderChannel
  message: string
  customerId?: string
}) {
  try {
    const parsed = reminderFormSchema.parse(input)
    await createReminderRecord(parsed)
    revalidateBusinessPages(input.customerId)
    return { ok: true as const }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false as const, error: error.issues[0]?.message ?? "입력값을 확인해 주세요." }
    }

    return {
      ok: false as const,
      error: toUserFacingActionError(error, "리마인드 저장에 실패했습니다."),
    }
  }
}

export async function saveSettingsAction(input: {
  businessName: string
  ownerName: string
  email: string
  phone: string
  paymentTerms: string
  bankAccount: string
  reminderMessage: string
  templates: Array<{
    id?: string
    type: "quote" | "reminder"
    name: string
    content: string
    isDefault: boolean
  }>
}) {
  try {
    const parsedSettings = settingsSchema.parse({
      businessName: input.businessName,
      ownerName: input.ownerName,
      email: input.email,
      phone: input.phone,
      paymentTerms: input.paymentTerms,
      bankAccount: input.bankAccount,
      reminderMessage: input.reminderMessage,
    })
    const parsedTemplates = z.array(templateSchema).parse(input.templates)

    await saveBusinessSettingsRecord(parsedSettings)
    await saveTemplatesRecord(parsedTemplates)
    revalidatePath("/settings")

    return { ok: true as const }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false as const, error: error.issues[0]?.message ?? "입력값을 확인해 주세요." }
    }

    return {
      ok: false as const,
      error: toUserFacingActionError(error, "설정 저장에 실패했습니다."),
    }
  }
}
