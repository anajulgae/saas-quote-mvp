import { cache } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { demoUser } from "@/lib/demo-data"
import { isDemoLoginEnabled } from "@/lib/demo-flags"
import { getEffectiveBillingPlan } from "@/lib/subscription"
import { rowToSnapshot, syncExpiredStates } from "@/lib/user-plan"
import { FLOWBILL_DEMO_SESSION_COOKIE } from "@/lib/demo-session"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export { isSupabaseConfigured } from "@/lib/supabase/public-config"

export function getDemoCredentials() {
  const email = process.env.DEMO_LOGIN_EMAIL
  const password = process.env.DEMO_LOGIN_PASSWORD
  if (!email || !password) {
    console.warn("[getDemoCredentials] DEMO_LOGIN_EMAIL / DEMO_LOGIN_PASSWORD env vars not set")
    return { email: "", password: "" }
  }
  return { email, password }
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
        email: string | null
      },
      options: { onConflict: string }
    ) => Promise<unknown>
  }).upsert(
    {
      id: user.id,
      full_name: fullName,
      business_name: businessName,
      phone,
      email: user.email?.trim() ? user.email.trim().toLowerCase() : null,
    },
    {
      onConflict: "id",
    }
  )

  // ⚠️ business_settings 는 여기서 upsert 하면 안 됨: 매 요청마다 가입 시 기본값으로 설정 화면 저장분을 덮어씀.
  // 행이 없을 때만(트리거 누락·레거시 계정) 초기 삽입한다.
  const { data: existingSettings, error: settingsLookupError } = await supabase
    .from("business_settings")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (settingsLookupError) {
    throw settingsLookupError
  }

  if (!existingSettings) {
    const { error: insertSettingsError } = await (
      supabase.from("business_settings") as unknown as {
        insert: (v: {
          user_id: string
          business_name: string
          owner_name: string
          email: string | null
          phone: string | null
          payment_terms: string
          bank_account: string
          reminder_message: string
        }) => Promise<{ error: { code?: string; message?: string } | null }>
      }
    ).insert({
      user_id: user.id,
      business_name: businessName,
      owner_name: fullName,
      email: user.email ?? null,
      phone,
      payment_terms: "선금 50%, 납품 전 잔금 50%",
      bank_account: "",
      reminder_message:
        "안녕하세요. 이전에 전달드린 청구 건의 입금 일정을 확인 부탁드립니다.",
    })

    if (insertSettingsError) {
      const code = insertSettingsError.code
      if (code !== "23505") {
        throw insertSettingsError
      }
    }
  }

  const { error: notifPrefErr } = await supabase.from("notification_preferences").insert({
    user_id: user.id,
  })
  if (notifPrefErr && notifPrefErr.code !== "23505") {
    // 테이블 미마이그레이션 등은 로그인 흐름을 막지 않음
    console.warn("[ensureUserProfile] notification_preferences insert:", notifPrefErr.message)
  }

  return {
    fullName,
    businessName,
    phone: phone ?? "",
  }
}

/**
 * 세션 + 프로필 + 빌링 상태를 한 번에 조회.
 * React cache()로 같은 렌더 요청 내에서 중복 호출을 방지.
 */
export const getAppSession = cache(async () => {
  const cookieStore = await cookies()
  const demoSession = cookieStore.get(FLOWBILL_DEMO_SESSION_COOKIE)?.value

  if (demoSession === "1" && isDemoLoginEnabled()) {
    return {
      mode: "demo" as const,
      user: demoUser,
    }
  }

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
      // ignore
    }
    return null
  }

  // 프로필 + account_disabled + 빌링 상태를 단일 쿼리로 조회
  const { data: row, error: rowErr } = await supabase
    .from("users")
    .select(
      "full_name, business_name, phone, account_disabled, plan, subscription_status, trial_started_at, trial_ends_at, current_period_end, cancel_at_period_end, pending_plan, billing_provider, billing_provider_subscription_id, billing_provider_price_id, stripe_customer_id, payment_method_brand, payment_method_last4, billing_status_updated_at, usage_month, ai_calls_this_month, document_sends_this_month"
    )
    .eq("id", user.id)
    .maybeSingle()

  if (rowErr) {
    console.warn("[getAppSession] user row lookup:", rowErr.message)
  }

  if (row && (row as Record<string, unknown>).account_disabled) {
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore
    }
    return null
  }

  // 프로필이 아직 없으면(최초 가입 직후) ensureUserProfile로 생성
  if (!row) {
    const profile = await ensureUserProfile(supabase, user)
    return {
      mode: "supabase" as const,
      user: {
        id: user.id,
        fullName: profile.fullName,
        businessName: profile.businessName,
        email: user.email ?? "",
        phone: profile.phone ?? "",
        plan: "starter" as const,
        effectivePlan: "starter" as const,
        subscriptionStatus: "active" as const,
        trialEndsAt: null as string | null,
      },
    }
  }

  // 이미 가져온 row로 빌링 스냅샷 생성 (추가 DB 쿼리 없음)
  const snap = rowToSnapshot(row as Record<string, unknown>, false)
  const billing = await syncExpiredStates(supabase as never, user.id, snap)
  const effectivePlan = getEffectiveBillingPlan(billing)

  const fullName = typeof row.full_name === "string" ? row.full_name : user.email ?? "사용자"
  const businessName = typeof row.business_name === "string" ? row.business_name : fullName

  return {
    mode: "supabase" as const,
    user: {
      id: user.id,
      fullName,
      businessName,
      email: user.email ?? "",
      phone: typeof row.phone === "string" ? row.phone : "",
      plan: billing.plan,
      effectivePlan,
      subscriptionStatus: billing.subscriptionStatus,
      trialEndsAt: billing.trialEndsAt,
    },
  }
})

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
