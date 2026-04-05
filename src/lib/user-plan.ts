import type { SupabaseClient } from "@supabase/supabase-js"

import { normalizePlan } from "@/lib/plan-features"
import type { BillingPlan } from "@/types/domain"
import type { Database } from "@/types/supabase"

export type UserPlanFetchResult = {
  plan: BillingPlan
  /**
   * true: `users.plan` 컬럼이 없음 → `supabase/migrations/0004_user_plan.sql` 미적용 가능성이 큼.
   * 앱은 `free`로 동작을 유지합니다.
   */
  columnMissing: boolean
}

/**
 * `public.users.plan` 조회. 마이그레이션 누락 시에도 앱이 죽지 않도록 완화합니다.
 */
export async function fetchUserPlanRow(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserPlanFetchResult> {
  const { data, error } = await supabase.from("users").select("plan").eq("id", userId).maybeSingle()

  if (error) {
    const msg = (error.message ?? "").toLowerCase()
    const code = String((error as { code?: string }).code ?? "")
    const undefinedColumn = code === "42703" || (msg.includes("column") && msg.includes("plan"))
    const doesNotExist = msg.includes("does not exist") && msg.includes("plan")
    if (undefinedColumn || doesNotExist) {
      return { plan: "free", columnMissing: true }
    }
    return { plan: "free", columnMissing: false }
  }

  const row = data as { plan?: string } | null
  return {
    plan: normalizePlan(row?.plan),
    columnMissing: false,
  }
}
