"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import {
  createSupabaseServerClient,
  ensureUserProfile,
  getAppSession,
  getDemoCredentials,
  getDemoSessionCookieName,
  isSupabaseConfigured,
} from "@/lib/auth"
import { maskEmailForDisplay } from "@/lib/mask-email"
import { getSiteOrigin } from "@/lib/site-url"
import { toPasswordResetEmailError, toUserFacingActionError } from "@/lib/action-errors"
import { consumePasswordResetRateSlot } from "@/lib/password-reset-rate-limit"
import { isDemoLoginEnabled, isDemoPasswordStrongEnoughForProduction } from "@/lib/demo-flags"
import {
  createActivityLog,
  createCustomerRecord,
  createInquiryRecord,
  createInvoiceRecord,
  createQuoteRecord,
  createReminderRecord,
  deleteQuoteRecord,
  duplicateQuoteRecord,
  ensureInvoiceShareTokenForInvoice,
  ensureQuoteShareTokenForQuote,
  getBusinessFromIdentity,
  getInvoiceOutboundSnapshot,
  getQuoteOutboundSnapshot,
  logInquiryFormShareActionRecord,
  markAllNotificationsReadRecord,
  markNotificationReadRecord,
  saveBusinessSettingsRecord,
  saveNotificationPreferencesRecord,
  savePublicInquiryFormRecord,
  saveTemplatesRecord,
  updateBusinessSealSettingsRecord,
  updateInquiryRecord,
  updateInvoicePaymentStatusRecord,
  updateInvoiceRecord,
  updateQuoteRecord,
  updateQuoteStatusRecord,
} from "@/lib/data"
import { isResendConfigured, sendHtmlEmailViaResend } from "@/lib/send-resend"
import type {
  BusinessSettings,
  InquiryStage,
  InvoiceFormInput,
  PaymentStatus,
  QuoteFormInput,
  QuoteStatus,
  ReminderChannel,
} from "@/types/domain"

const customerCreateSchema = z.object({
  name: z.string().trim().min(1, "고객 이름을 입력해 주세요."),
  companyName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  tagsRaw: z.string().trim().optional(),
})

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
  businessRegistrationNumber: z
    .string()
    .trim()
    .max(30, "사업자등록번호는 30자 이내로 입력해 주세요.")
    .default(""),
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
      quantity: parseInvoiceAmountString(item.quantity),
      unitPrice: parseInvoiceAmountString(item.unitPrice),
    })),
  })
}

function parseInvoiceAmountString(raw: string): number {
  const s = String(raw ?? "")
    .replace(/,/g, "")
    .replace(/[\s원₩]/g, "")
    .trim()
  return Number(s)
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
    amount: parseInvoiceAmountString(input.amount),
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

const signupFormSchema = z
  .object({
    email: z.string().trim().email("올바른 이메일을 입력해 주세요."),
    password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
    confirmPassword: z.string(),
    fullName: z.string().trim().min(1, "이름을 입력해 주세요."),
    businessName: z.string().trim().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["confirmPassword"],
  })

const updatePasswordFormSchema = z
  .object({
    password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["confirmPassword"],
  })

export async function signupAction(_: { error?: string } | undefined, formData: FormData) {
  if (!isSupabaseConfigured()) {
    return {
      error: "현재 환경에서는 온라인 회원가입을 사용할 수 없습니다. 관리자에게 문의해 주세요.",
    }
  }

  const parsed = signupFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    fullName: formData.get("fullName"),
    businessName: formData.get("businessName") ?? "",
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
    }
  }

  const { email, password, fullName, businessName } = parsed.data
  const resolvedBusiness = (businessName ?? "").trim() || fullName

  const supabase = await createSupabaseServerClient()
  if (!supabase) {
    return { error: "인증 설정을 확인해 주세요." }
  }

  const origin = getSiteOrigin()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/dashboard")}`,
      data: {
        full_name: fullName,
        business_name: resolvedBusiness,
      },
    },
  })

  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes("already registered") || msg.includes("user already")) {
      return { error: "이미 가입된 이메일입니다. 로그인을 이용해 주세요." }
    }
    return {
      error: toUserFacingActionError(error, "회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요."),
    }
  }

  if (data.session && data.user) {
    await ensureUserProfile(supabase, data.user)
    await createActivityLog({
      action: "auth.signup_complete",
      description: "회원가입이 완료되었습니다.",
      metadata: { source: "password" },
    })
    redirect("/dashboard")
  }

  redirect(`/signup/check-email?email=${encodeURIComponent(email)}`)
}

export async function resendSignupConfirmationAction(
  _: { error?: string; ok?: boolean } | undefined,
  formData: FormData
) {
  const email = String(formData.get("email") ?? "").trim()
  if (!email) {
    return { error: "이메일을 입력해 주세요." }
  }
  if (!z.string().email().safeParse(email).success) {
    return { error: "올바른 이메일을 입력해 주세요." }
  }

  if (!isSupabaseConfigured()) {
    return { error: "현재 환경에서는 이용할 수 없습니다." }
  }

  const supabase = await createSupabaseServerClient()
  if (!supabase) {
    return { error: "인증 설정을 확인해 주세요." }
  }

  const origin = getSiteOrigin()
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/dashboard")}`,
    },
  })

  if (error) {
    return {
      error: toUserFacingActionError(error, "인증 메일 재발송에 실패했습니다. 잠시 후 다시 시도해 주세요."),
    }
  }

  return { ok: true as const }
}

export type RequestPasswordResetState =
  | undefined
  | { error: string; invalidEmail?: boolean }
  | { ok: true; maskedEmail: string; email: string }

export async function requestPasswordResetAction(
  _prev: RequestPasswordResetState,
  formData: FormData
): Promise<RequestPasswordResetState> {
  const email = String(formData.get("email") ?? "").trim()
  if (!email) {
    return { error: "이메일을 입력해 주세요.", invalidEmail: true }
  }
  if (!z.string().email().safeParse(email).success) {
    return {
      error: "이메일 형식을 확인해 주세요. 가입·로그인에 쓰는 주소를 정확히 입력했는지도 함께 확인해 주세요.",
      invalidEmail: true,
    }
  }

  if (!isSupabaseConfigured()) {
    return {
      error: "현재 환경에서는 비밀번호 재설정을 사용할 수 없습니다. 관리자에게 문의해 주세요.",
    }
  }

  const supabase = await createSupabaseServerClient()
  if (!supabase) {
    return { error: "인증 설정을 확인해 주세요." }
  }

  const rate = consumePasswordResetRateSlot(email)
  if (!rate.ok) {
    return { error: rate.message, invalidEmail: false }
  }

  const origin = getSiteOrigin()
  /** 메일 링크는 이 URL(+ Supabase가 붙이는 ?code= 등)로 열립니다. Redirect URLs 에 `/reset-password` 를 등록해야 합니다. */
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  })

  if (error) {
    return {
      error: toPasswordResetEmailError(error),
      invalidEmail: false,
    }
  }

  return {
    ok: true as const,
    maskedEmail: maskEmailForDisplay(email),
    email,
  }
}

export type UpdatePasswordState = undefined | { error: string } | { ok: true }

export async function updatePasswordAction(
  _: UpdatePasswordState,
  formData: FormData
): Promise<UpdatePasswordState> {
  if (!isSupabaseConfigured()) {
    return { error: "인증 설정을 확인해 주세요." }
  }

  const supabase = await createSupabaseServerClient()
  if (!supabase) {
    return { error: "인증 설정을 확인해 주세요." }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      error:
        "세션이 없거나 재설정 링크가 만료되었습니다. 비밀번호 찾기를 다시 진행해 주세요.",
    }
  }

  const parsed = updatePasswordFormSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  })

  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return {
      error: issue?.message ?? "입력값을 확인해 주세요.",
    }
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) {
    return {
      error: toUserFacingActionError(error, "비밀번호를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요."),
    }
  }

  await ensureUserProfile(supabase, user)
  await supabase.auth.signOut()
  return { ok: true as const }
}

export async function createCustomerAction(input: {
  name: string
  companyName: string
  phone: string
  email: string
  notes: string
  tagsRaw: string
}) {
  try {
    const parsed = customerCreateSchema.parse(input)
    const tags = (parsed.tagsRaw ?? "")
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean)

    await createCustomerRecord({
      name: parsed.name,
      companyName: parsed.companyName,
      phone: parsed.phone,
      email: parsed.email,
      notes: parsed.notes,
      tags,
    })

    revalidatePath("/dashboard")
    revalidatePath("/customers")
    revalidatePath("/inquiries")
    revalidatePath("/quotes")

    return { ok: true as const }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false as const, error: error.issues[0]?.message ?? "입력값을 확인해 주세요." }
    }

    return {
      ok: false as const,
      error: toUserFacingActionError(error, "고객 등록에 실패했습니다."),
    }
  }
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

function quoteMutationErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    if (error.message === "DEMO_MODE") {
      return "데모 세션에서는 저장되지 않습니다. 실제 계정으로 로그인해 주세요."
    }
    if (error.message === "QUOTE_NOT_FOUND") {
      return "견적을 찾을 수 없습니다. 목록을 새로고침한 뒤 다시 시도해 주세요."
    }
  }
  return toUserFacingActionError(error, fallback)
}

export async function duplicateQuoteAction(quoteId: string) {
  try {
    await duplicateQuoteRecord(quoteId)
    revalidateBusinessPages()
    revalidatePath("/inquiries")
    revalidatePath("/quotes")
    return { ok: true as const }
  } catch (error) {
    return {
      ok: false as const,
      error: quoteMutationErrorMessage(error, "견적 복제에 실패했습니다."),
    }
  }
}

export async function deleteQuoteAction(quoteId: string) {
  try {
    const result = await deleteQuoteRecord(quoteId)
    const customerId = result.mode === "supabase" ? result.customerId : undefined
    revalidateBusinessPages(customerId)
    revalidatePath("/inquiries")
    revalidatePath("/quotes")
    return { ok: true as const }
  } catch (error) {
    return {
      ok: false as const,
      error: quoteMutationErrorMessage(error, "견적 삭제에 실패했습니다."),
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

export async function saveBusinessSettingsOnlyAction(input: {
  businessName: string
  ownerName: string
  businessRegistrationNumber: string
  email: string
  phone: string
  paymentTerms: string
  bankAccount: string
  reminderMessage: string
}): Promise<{ ok: true; settings: BusinessSettings } | { ok: false; error: string }> {
  try {
    const parsedSettings = settingsSchema.parse(input)
    const result = await saveBusinessSettingsRecord(parsedSettings)
    if (result.mode === "demo") {
      return {
        ok: false as const,
        error:
          "데모 모드에서는 설정이 서버에 저장되지 않습니다. Supabase로 로그인했는지, 환경 변수(NEXT_PUBLIC_SUPABASE_*)가 배포에 있는지 확인해 주세요.",
      }
    }
    revalidatePath("/settings")

    return { ok: true as const, settings: result.settings }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false as const, error: error.issues[0]?.message ?? "입력값을 확인해 주세요." }
    }

    return {
      ok: false as const,
      error: toUserFacingActionError(error, "사업자·결제 설정 저장에 실패했습니다."),
    }
  }
}

export async function saveTemplatesSettingsAction(input: {
  templates: Array<{
    id?: string
    type: "quote" | "reminder"
    name: string
    content: string
    isDefault: boolean
  }>
}) {
  try {
    const parsedTemplates = z.array(templateSchema).parse(input.templates)
    await saveTemplatesRecord(parsedTemplates)
    revalidatePath("/settings")

    return { ok: true as const }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false as const, error: error.issues[0]?.message ?? "입력값을 확인해 주세요." }
    }

    return {
      ok: false as const,
      error: toUserFacingActionError(error, "템플릿 저장에 실패했습니다."),
    }
  }
}

/** 사업자 설정과 템플릿을 한 번에 저장 (필요 시 호출용) */
export async function saveSettingsAction(input: {
  businessName: string
  ownerName: string
  businessRegistrationNumber: string
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
  const biz = await saveBusinessSettingsOnlyAction({
    businessName: input.businessName,
    ownerName: input.ownerName,
    businessRegistrationNumber: input.businessRegistrationNumber,
    email: input.email,
    phone: input.phone,
    paymentTerms: input.paymentTerms,
    bankAccount: input.bankAccount,
    reminderMessage: input.reminderMessage,
  })
  if (!biz.ok) {
    return biz
  }
  const tpl = await saveTemplatesSettingsAction({ templates: input.templates })
  if (!tpl.ok) {
    return tpl
  }
  return { ok: true as const, settings: biz.settings }
}

function escapeHtmlForEmail(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

const sendQuoteEmailInputSchema = z.object({
  quoteId: z.string().trim().min(1),
  to: z.string().trim().email("받는 사람 이메일을 확인해 주세요."),
  subject: z.string().trim().min(1, "제목을 입력해 주세요."),
  body: z.string().trim().min(1, "본문을 입력해 주세요."),
  includePublicLink: z.boolean(),
  markAsSent: z.boolean(),
})

export async function ensureQuoteShareLinkAction(quoteId: string) {
  try {
    const id = z.string().trim().min(1).parse(quoteId)
    const { token } = await ensureQuoteShareTokenForQuote(id)
    const url = `${getSiteOrigin()}/quote-view/${encodeURIComponent(token)}`
    revalidatePath("/quotes")
    return { ok: true as const, url, token }
  } catch (error) {
    return {
      ok: false as const,
      error: toUserFacingActionError(error, "공유 링크를 만들지 못했습니다."),
    }
  }
}

export async function logQuoteShareLinkCopiedAction(quoteId: string) {
  try {
    const id = z.string().trim().min(1).parse(quoteId)
    const snap = await getQuoteOutboundSnapshot(id)
    if (!snap) {
      return { ok: false as const, error: "견적을 찾을 수 없습니다." }
    }
    await createActivityLog({
      action: "quote.share_link_copied",
      description: `「${snap.title}」(${snap.quoteNumber}) 고객 공유 링크를 복사했습니다.`,
      quoteId: id,
      customerId: snap.customerId,
    })
    return { ok: true as const }
  } catch (error) {
    return {
      ok: false as const,
      error: toUserFacingActionError(error, "활동 기록에 실패했습니다."),
    }
  }
}

export async function logQuoteKakaoTemplateCopiedAction(quoteId: string) {
  try {
    const id = z.string().trim().min(1).parse(quoteId)
    const snap = await getQuoteOutboundSnapshot(id)
    if (!snap) {
      return { ok: false as const, error: "견적을 찾을 수 없습니다." }
    }
    await createActivityLog({
      action: "quote.kakao_share_prepared",
      description: `「${snap.title}」(${snap.quoteNumber}) 카카오톡용 안내 문구를 복사했습니다.`,
      quoteId: id,
      customerId: snap.customerId,
    })
    return { ok: true as const }
  } catch (error) {
    return {
      ok: false as const,
      error: toUserFacingActionError(error, "활동 기록에 실패했습니다."),
    }
  }
}

const sealSettingsSchema = z.object({
  sealImageUrl: z.string().nullable(),
  sealEnabled: z.boolean(),
})

export async function saveSealSettingsAction(input: z.infer<typeof sealSettingsSchema>) {
  try {
    const parsed = sealSettingsSchema.parse(input)

    if (parsed.sealImageUrl && parsed.sealImageUrl.length > 520_000) {
      return {
        ok: false as const,
        error: "직인 이미지 데이터가 너무 큽니다. PNG로 저장하거나 크기를 줄여 주세요.",
      }
    }

    await updateBusinessSealSettingsRecord({
      sealImageUrl: parsed.sealImageUrl,
      sealEnabled: parsed.sealEnabled,
    })
    revalidatePath("/settings")
    revalidatePath("/quotes")

    return { ok: true as const }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false as const, error: error.issues[0]?.message ?? "입력값을 확인해 주세요." }
    }
    return {
      ok: false as const,
      error: toUserFacingActionError(error, "직인 설정을 저장하지 못했습니다."),
    }
  }
}

export async function sendQuoteEmailAction(input: z.infer<typeof sendQuoteEmailInputSchema>) {
  try {
    const parsed = sendQuoteEmailInputSchema.parse(input)
    const snap = await getQuoteOutboundSnapshot(parsed.quoteId)
    if (!snap) {
      return { ok: false as const, error: "견적을 찾을 수 없습니다." }
    }

    const { token } = await ensureQuoteShareTokenForQuote(parsed.quoteId)
    const shareUrl = `${getSiteOrigin()}/quote-view/${encodeURIComponent(token)}`

    let bodyText = parsed.body
    if (parsed.includePublicLink) {
      bodyText += `\n\n견적서 보기 (링크):\n${shareUrl}`
    }

    const session = await getAppSession()
    if (session?.mode === "demo") {
      revalidatePath("/quotes")
      return { ok: true as const, demo: true as const }
    }
    if (!session) {
      return { ok: false as const, error: "로그인이 필요합니다." }
    }

    if (!isResendConfigured()) {
      return {
        ok: false as const,
        error:
          "견적 메일 발송 API(Resend)가 설정되지 않았습니다. 배포 환경에 RESEND_API_KEY를 넣고, 가능하면 RESEND_FROM(인증된 발신 주소)도 설정해 주세요.",
      }
    }

    const sender = await getBusinessFromIdentity()
    const senderLine =
      sender.email.trim().length > 0
        ? `발신: ${escapeHtmlForEmail(sender.displayName)} · ${escapeHtmlForEmail(sender.email)}`
        : `발신: ${escapeHtmlForEmail(sender.displayName)} (설정에서 이메일을 등록해 주세요)`

    const bodyHtml = escapeHtmlForEmail(bodyText).replace(/\n/g, "<br/>")
    const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#111"><p style="margin:0 0 14px;color:#555;font-size:13px;border-bottom:1px solid #eee;padding-bottom:10px">${senderLine}</p>${bodyHtml}</div>`

    await sendHtmlEmailViaResend({
      to: parsed.to,
      subject: parsed.subject,
      html,
      fromDisplayName: sender.displayName,
      fromEmail: sender.email || undefined,
      replyTo: sender.email || undefined,
    })

    await createActivityLog({
      action: "quote.email_sent",
      description: `「${snap.title}」(${snap.quoteNumber}) 견적서를 이메일로 보냈습니다. (${parsed.to})`,
      quoteId: parsed.quoteId,
      customerId: snap.customerId,
      metadata: {
        include_public_link: parsed.includePublicLink ? "yes" : "no",
      },
    })

    if (parsed.markAsSent && snap.status === "draft") {
      await updateQuoteStatusRecord(parsed.quoteId, "sent")
    }

    revalidatePath("/quotes")
    return { ok: true as const }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false as const, error: error.issues[0]?.message ?? "입력값을 확인해 주세요." }
    }
    return {
      ok: false as const,
      error: toUserFacingActionError(error, "이메일을 보내지 못했습니다."),
    }
  }
}

export async function ensureInvoiceShareLinkAction(invoiceId: string) {
  try {
    const id = z.string().trim().min(1).parse(invoiceId)
    const { token } = await ensureInvoiceShareTokenForInvoice(id)
    const url = `${getSiteOrigin()}/invoice-view/${encodeURIComponent(token)}`
    revalidatePath("/invoices")
    return { ok: true as const, url, token }
  } catch (error) {
    return {
      ok: false as const,
      error: toUserFacingActionError(error, "공유 링크를 만들지 못했습니다."),
    }
  }
}

export async function logInvoiceShareLinkCopiedAction(invoiceId: string) {
  try {
    const id = z.string().trim().min(1).parse(invoiceId)
    const snap = await getInvoiceOutboundSnapshot(id)
    if (!snap) {
      return { ok: false as const, error: "청구를 찾을 수 없습니다." }
    }
    await createActivityLog({
      action: "invoice.share_link_copied",
      description: `「${snap.invoiceNumber}」 청구 고객 공유 링크를 복사했습니다.`,
      invoiceId: id,
      customerId: snap.customerId,
    })
    return { ok: true as const }
  } catch (error) {
    return {
      ok: false as const,
      error: toUserFacingActionError(error, "활동 기록에 실패했습니다."),
    }
  }
}

export async function logInvoiceKakaoTemplateCopiedAction(invoiceId: string) {
  try {
    const id = z.string().trim().min(1).parse(invoiceId)
    const snap = await getInvoiceOutboundSnapshot(id)
    if (!snap) {
      return { ok: false as const, error: "청구를 찾을 수 없습니다." }
    }
    await createActivityLog({
      action: "invoice.kakao_share_prepared",
      description: `「${snap.invoiceNumber}」 카카오톡용 청구 안내 문구를 복사했습니다.`,
      invoiceId: id,
      customerId: snap.customerId,
    })
    return { ok: true as const }
  } catch (error) {
    return {
      ok: false as const,
      error: toUserFacingActionError(error, "활동 기록에 실패했습니다."),
    }
  }
}

const sendInvoiceEmailInputSchema = z.object({
  invoiceId: z.string().trim().min(1),
  to: z.string().trim().email("받는 사람 이메일을 확인해 주세요."),
  subject: z.string().trim().min(1, "제목을 입력해 주세요."),
  body: z.string().trim().min(1, "본문을 입력해 주세요."),
  includePublicLink: z.boolean(),
})

export async function sendInvoiceEmailAction(input: z.infer<typeof sendInvoiceEmailInputSchema>) {
  try {
    const parsed = sendInvoiceEmailInputSchema.parse(input)
    const snap = await getInvoiceOutboundSnapshot(parsed.invoiceId)
    if (!snap) {
      return { ok: false as const, error: "청구를 찾을 수 없습니다." }
    }

    const { token } = await ensureInvoiceShareTokenForInvoice(parsed.invoiceId)
    const shareUrl = `${getSiteOrigin()}/invoice-view/${encodeURIComponent(token)}`

    let bodyText = parsed.body
    if (parsed.includePublicLink) {
      bodyText += `\n\n청구서 보기 (링크):\n${shareUrl}`
    }

    const session = await getAppSession()
    if (session?.mode === "demo") {
      revalidatePath("/invoices")
      return { ok: true as const, demo: true as const }
    }
    if (!session) {
      return { ok: false as const, error: "로그인이 필요합니다." }
    }

    if (!isResendConfigured()) {
      return {
        ok: false as const,
        error:
          "메일 발송 API(Resend)가 설정되지 않았습니다. 배포 환경에 RESEND_API_KEY를 넣고, 가능하면 RESEND_FROM(인증된 발신 주소)도 설정해 주세요.",
      }
    }

    const sender = await getBusinessFromIdentity()
    const senderLine =
      sender.email.trim().length > 0
        ? `발신: ${escapeHtmlForEmail(sender.displayName)} · ${escapeHtmlForEmail(sender.email)}`
        : `발신: ${escapeHtmlForEmail(sender.displayName)} (설정에서 이메일을 등록해 주세요)`

    const bodyHtml = escapeHtmlForEmail(bodyText).replace(/\n/g, "<br/>")
    const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#111"><p style="margin:0 0 14px;color:#555;font-size:13px;border-bottom:1px solid #eee;padding-bottom:10px">${senderLine}</p>${bodyHtml}</div>`

    await sendHtmlEmailViaResend({
      to: parsed.to,
      subject: parsed.subject,
      html,
      fromDisplayName: sender.displayName,
      fromEmail: sender.email || undefined,
      replyTo: sender.email || undefined,
    })

    await createActivityLog({
      action: "invoice.email_sent",
      description: `「${snap.invoiceNumber}」 청구서를 이메일로 보냈습니다. (${parsed.to})`,
      invoiceId: parsed.invoiceId,
      customerId: snap.customerId,
      metadata: {
        include_public_link: parsed.includePublicLink ? "yes" : "no",
      },
    })

    revalidatePath("/invoices")
    return { ok: true as const }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false as const, error: error.issues[0]?.message ?? "입력값을 확인해 주세요." }
    }
    return {
      ok: false as const,
      error: toUserFacingActionError(error, "이메일을 보내지 못했습니다."),
    }
  }
}

const publicInquiryFormSaveSchema = z.object({
  enabled: z.boolean(),
  intro: z.string().max(4000).optional().default(""),
  consentIntro: z.string().max(8000).optional().default(""),
  consentRetention: z.string().max(8000).optional().default(""),
  completionMessage: z.string().max(4000).optional().default(""),
  regenerateToken: z.boolean().optional().default(false),
})

export async function savePublicInquiryFormSettingsAction(raw: z.infer<typeof publicInquiryFormSaveSchema>) {
  const session = await getAppSession()
  if (!session?.user?.id) {
    return { ok: false as const, error: "로그인이 필요합니다." }
  }
  if (session.mode === "demo") {
    return { ok: false as const, error: "데모 환경에서는 공개 문의 폼을 사용할 수 없습니다." }
  }
  try {
    const parsed = publicInquiryFormSaveSchema.parse(raw)
    const result = await savePublicInquiryFormRecord({
      enabled: parsed.enabled,
      intro: parsed.intro ?? "",
      consentIntro: parsed.consentIntro ?? "",
      consentRetention: parsed.consentRetention ?? "",
      completionMessage: parsed.completionMessage ?? "",
      regenerateToken: parsed.regenerateToken ?? false,
    })
    revalidatePath("/settings")
    revalidatePath("/inquiries")
    return { ok: true as const, settings: result.settings }
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { ok: false as const, error: e.issues[0]?.message ?? "입력값을 확인해 주세요." }
    }
    return {
      ok: false as const,
      error: toUserFacingActionError(e, "공개 문의 폼 설정을 저장하지 못했습니다."),
    }
  }
}

export async function logInquiryFormShareAction(kind: string) {
  const session = await getAppSession()
  if (!session?.user?.id || session.mode === "demo") {
    return
  }
  const allowed = new Set(["link_copied", "email_opened", "kakao_copied", "sms_copied", "qr_viewed"])
  if (!allowed.has(kind)) {
    return
  }
  try {
    await logInquiryFormShareActionRecord(kind)
  } catch {
    return
  }
}

const notificationPrefsSchema = z.object({
  inquiryInApp: z.boolean(),
  inquiryBrowser: z.boolean(),
  inquiryEmail: z.boolean(),
  quoteEventsInApp: z.boolean(),
  quoteEventsBrowser: z.boolean(),
  quoteEventsEmail: z.boolean(),
  invoiceEventsInApp: z.boolean(),
  invoiceEventsBrowser: z.boolean(),
  invoiceEventsEmail: z.boolean(),
  reminderEventsInApp: z.boolean(),
  reminderEventsBrowser: z.boolean(),
  reminderEventsEmail: z.boolean(),
})

export async function saveNotificationPreferencesAction(raw: z.infer<typeof notificationPrefsSchema>) {
  const session = await getAppSession()
  if (!session?.user?.id) {
    return { ok: false as const, error: "로그인이 필요합니다." }
  }
  if (session.mode === "demo") {
    return { ok: false as const, error: "데모 환경에서는 알림 설정을 저장할 수 없습니다." }
  }
  try {
    const parsed = notificationPrefsSchema.parse(raw)
    const prefs = await saveNotificationPreferencesRecord(parsed)
    revalidatePath("/settings")
    return { ok: true as const, preferences: prefs }
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { ok: false as const, error: e.issues[0]?.message ?? "입력값을 확인해 주세요." }
    }
    return {
      ok: false as const,
      error: toUserFacingActionError(e, "알림 설정을 저장하지 못했습니다."),
    }
  }
}

export async function markNotificationReadAction(notificationId: string) {
  const session = await getAppSession()
  if (!session?.user?.id || session.mode === "demo") {
    return { ok: false as const, error: "알림을 처리할 수 없습니다." }
  }
  try {
    await markNotificationReadRecord(notificationId)
    return { ok: true as const }
  } catch (e) {
    return {
      ok: false as const,
      error: toUserFacingActionError(e, "읽음 처리에 실패했습니다."),
    }
  }
}

export async function markAllNotificationsReadAction() {
  const session = await getAppSession()
  if (!session?.user?.id || session.mode === "demo") {
    return { ok: false as const, error: "알림을 처리할 수 없습니다." }
  }
  try {
    await markAllNotificationsReadRecord()
    return { ok: true as const }
  } catch (e) {
    return {
      ok: false as const,
      error: toUserFacingActionError(e, "모두 읽음 처리에 실패했습니다."),
    }
  }
}
