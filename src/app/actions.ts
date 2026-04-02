"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import {
  createSupabaseServerClient,
  getDemoCredentials,
  getDemoSessionCookieName,
  isSupabaseConfigured,
} from "@/lib/auth"

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
