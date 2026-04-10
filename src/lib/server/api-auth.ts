import { createServerSupabaseClient } from "@/lib/supabase/server"
import { planAllowsFeature } from "@/lib/plan-features"
import { getEffectiveBillingPlan, getUsageLimitsForEffectivePlan, type UserBillingSnapshot } from "@/lib/subscription"
import { fetchUserBillingState } from "@/lib/user-plan"
import type { BillingPlan } from "@/types/domain"

export type ApiAuthOk = {
  ok: true
  userId: string
  /** DB 청구 플랜 */
  plan: BillingPlan
  /** 기능·한도에 쓰는 유효 플랜(체험 중이면 pro) */
  effectivePlan: BillingPlan
  billing: UserBillingSnapshot
}

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

  const billing = await fetchUserBillingState(supabase as never, user.id)
  const effectivePlan = getEffectiveBillingPlan(billing)

  return {
    ok: true,
    userId: user.id,
    plan: billing.plan,
    effectivePlan,
    billing,
  }
}

export function assertAiFeatureAllowed(auth: ApiAuthOk): ApiAuthFail | null {
  if (!planAllowsFeature(auth.effectivePlan, "ai_assist")) {
    return { ok: false, status: 403, message: "현재 플랜에서 AI 기능을 사용할 수 없습니다." }
  }
  const lim = getUsageLimitsForEffectivePlan(auth.effectivePlan).aiCallsPerMonth
  if (auth.billing.aiCallsThisMonth >= lim) {
    return {
      ok: false,
      status: 429,
      message: `이번 달 AI 사용 횟수(${lim}회)를 모두 사용했습니다. 플랜을 업그레이드하거나 다음 달에 다시 시도해 주세요.`,
    }
  }
  return null
}
