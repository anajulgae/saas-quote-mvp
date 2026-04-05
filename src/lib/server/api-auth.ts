import { createServerSupabaseClient } from "@/lib/supabase/server"
import { normalizePlan } from "@/lib/plan-features"
import type { BillingPlan } from "@/types/domain"

export type ApiAuthOk = { ok: true; userId: string; plan: BillingPlan }
export type ApiAuthFail = { ok: false; status: number; message: string }

export async function getAuthenticatedUserForApi(): Promise<ApiAuthOk | ApiAuthFail> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return { ok: false, status: 503, message: "인증 환경을 확인할 수 없습니다." }
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { ok: false, status: 401, message: "로그인이 필요합니다." }
  }

  const { data: row } = await supabase.from("users").select("plan").eq("id", user.id).maybeSingle()

  const plan = normalizePlan((row as { plan?: string } | null)?.plan)

  return { ok: true, userId: user.id, plan }
}
