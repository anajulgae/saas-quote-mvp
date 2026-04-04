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
  email: string
  phone: string
  paymentTerms: string
  bankAccount: string
  reminderMessage: string
}) {
  try {
    const parsedSettings = settingsSchema.parse(input)
    await saveBusinessSettingsRecord(parsedSettings)
    revalidatePath("/settings")

    return { ok: true as const }
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
    email: input.email,
    phone: input.phone,
    paymentTerms: input.paymentTerms,
    bankAccount: input.bankAccount,
    reminderMessage: input.reminderMessage,
  })
  if (!biz.ok) {
    return biz
  }
  return saveTemplatesSettingsAction({ templates: input.templates })
}
