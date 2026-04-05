import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { demoUser } from "@/lib/demo-data"
import { isDemoLoginEnabled } from "@/lib/demo-flags"
import { fetchUserPlanRow } from "@/lib/user-plan"
import { FLOWBILL_DEMO_SESSION_COOKIE } from "@/lib/demo-session"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export { isSupabaseConfigured } from "@/lib/supabase/server"

export function getDemoCredentials() {
  return {
    email: process.env.DEMO_LOGIN_EMAIL ?? "demo-review@flowbill.kr",
    password: process.env.DEMO_LOGIN_PASSWORD ?? "demo1234!",
  }
}

export async function createSupabaseServerClient() {
  return createServerSupabaseClient()
}

/** 로그인 직후 등 `public.users` 행이 필요할 때 (activity_logs FK 등) */
export async function ensureUserProfile(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  user: {
    id: string
    email?: string | null
    user_metadata?: Record<string, unknown>
  }
) {
  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : user.email ?? "사용자"

  const businessName =
    typeof user.user_metadata?.business_name === "string"
      ? user.user_metadata.business_name
      : fullName

  const phone =
    typeof user.user_metadata?.phone === "string" ? user.user_metadata.phone : null

  await ((supabase.from("users") as unknown) as {
    upsert: (
      value: {
        id: string
        full_name: string
        business_name: string
        phone: string | null
      },
      options: { onConflict: string }
    ) => Promise<unknown>
  }).upsert(
    {
      id: user.id,
      full_name: fullName,
      business_name: businessName,
      phone,
    },
    {
      onConflict: "id",
    }
  )

  await ((supabase.from("business_settings") as unknown) as {
    upsert: (
      value: {
        user_id: string
        business_name: string
        owner_name: string
        email: string | null
        phone: string | null
        payment_terms: string
        bank_account: string
        reminder_message: string
      },
      options: { onConflict: string }
    ) => Promise<unknown>
  }).upsert(
    {
      user_id: user.id,
      business_name: businessName,
      owner_name: fullName,
      email: user.email ?? null,
      phone,
      payment_terms: "선금 50%, 납품 전 잔금 50%",
      bank_account: "",
      reminder_message:
        "안녕하세요. 이전에 전달드린 청구 건의 입금 일정을 확인 부탁드립니다.",
    },
    {
      onConflict: "user_id",
    }
  )

  return {
    fullName,
    businessName,
    phone: phone ?? "",
  }
}

export async function getAppSession() {
  const cookieStore = await cookies()
  const demoSession = cookieStore.get(FLOWBILL_DEMO_SESSION_COOKIE)?.value

  if (demoSession === "1" && isDemoLoginEnabled()) {
    return {
      mode: "demo" as const,
      user: demoUser,
    }
  }
  // 데모가 꺼졌는데 데모 쿠키만 남은 경우: Server Component에서는 쿠키 삭제 불가(런타임 오류) → 무시하고 아래로 진행.
  // 무효 쿠키 제거는 middleware.ts 에서 처리합니다.

  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return null
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    try {
      await supabase.auth.signOut()
    } catch {
      // 쿠키 정리 실패는 무시; 다음 요청에서 미들웨어·로그인 흐름으로 복구
    }
    return null
  }

  const profile = await ensureUserProfile(supabase, user)

  const { plan } = await fetchUserPlanRow(supabase, user.id)

  return {
    mode: "supabase" as const,
    user: {
      id: user.id,
      fullName: profile.fullName ?? user.email ?? "사용자",
      businessName: profile.businessName ?? "내 사업장",
      email: user.email ?? "",
      phone: profile.phone ?? "",
      plan,
    },
  }
}

export async function requireAppSession() {
  const session = await getAppSession()

  if (!session) {
    redirect("/login")
  }

  return session
}

export function getDemoSessionCookieName() {
  return FLOWBILL_DEMO_SESSION_COOKIE
}
