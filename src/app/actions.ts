"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import {
  createSupabaseServerClient,
  getDemoCredentials,
  getDemoSessionCookieName,
  isSupabaseConfigured,
} from "@/lib/auth"
import { createInquiryRecord, updateInquiryRecord } from "@/lib/data"
import type { InquiryStage } from "@/types/domain"

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

export async function loginAction(_: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "").trim()

  if (!email || !password) {
    return {
      error: "이메일과 비밀번호를 입력해 주세요.",
    }
  }

  if (!isSupabaseConfigured()) {
    const demoCredentials = getDemoCredentials()

    if (
      email !== demoCredentials.email ||
      password !== demoCredentials.password
    ) {
      return {
        error: `데모 로그인은 ${demoCredentials.email} / ${demoCredentials.password} 를 사용해 주세요.`,
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
    return {
      error: "로그인에 실패했습니다. 이메일과 비밀번호를 확인해 주세요.",
    }
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

    return { ok: false as const, error: "문의 저장에 실패했습니다." }
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

    return { ok: false as const, error: "문의 수정에 실패했습니다." }
  }
}
