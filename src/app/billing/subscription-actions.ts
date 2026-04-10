"use server"

import { revalidatePath } from "next/cache"

import { getAppSession } from "@/lib/auth"
import { normalizePlan } from "@/lib/plan-features"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { BillingPlan } from "@/types/domain"

function nextMonthIso(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return d.toISOString()
}

export async function selectSubscriptionPlanAction(planRaw: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getAppSession()
  if (!session?.user?.id || session.mode !== "supabase") {
    return { ok: false, error: "로그인이 필요합니다." }
  }
  const plan = normalizePlan(planRaw)
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return { ok: false, error: "서버 연결을 확인할 수 없습니다." }
  }

  const { error: uErr } = await supabase
    .from("users")
    .update({
      plan,
      subscription_status: "active",
      trial_ends_at: null,
      cancel_at_period_end: false,
      pending_plan: null,
      current_period_end: nextMonthIso(),
    })
    .eq("id", session.user.id)

  if (uErr) {
    return { ok: false, error: uErr.message }
  }

  const { error: evErr } = await supabase.rpc("append_billing_event", {
    p_kind: "plan_change",
    p_message: `구독 플랜을 ${plan}(으)로 설정했습니다. (PG 연동 시 실제 결제와 동기화)`,
    p_metadata: { plan },
  })
  if (evErr) {
    console.warn("[selectSubscriptionPlanAction]", evErr.message)
  }

  revalidatePath("/billing")
  revalidatePath("/settings")
  revalidatePath("/dashboard")
  return { ok: true }
}

export async function scheduleSubscriptionCancelAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getAppSession()
  if (!session?.user?.id || session.mode !== "supabase") {
    return { ok: false, error: "로그인이 필요합니다." }
  }
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return { ok: false, error: "서버 연결을 확인할 수 없습니다." }
  }

  const { error: uErr } = await supabase
    .from("users")
    .update({ cancel_at_period_end: true })
    .eq("id", session.user.id)

  if (uErr) {
    return { ok: false, error: uErr.message }
  }

  const { error: evErr } = await supabase.rpc("append_billing_event", {
    p_kind: "cancel_scheduled",
    p_message: "현재 갱신 주기 말일에 해지 예약됨(시뮬레이션). PG 연동 시 실제 청구 종료와 맞춥니다.",
    p_metadata: {},
  })
  if (evErr) {
    console.warn("[scheduleSubscriptionCancelAction]", evErr.message)
  }

  revalidatePath("/billing")
  revalidatePath("/settings")
  return { ok: true }
}

export async function resumeSubscriptionAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getAppSession()
  if (!session?.user?.id || session.mode !== "supabase") {
    return { ok: false, error: "로그인이 필요합니다." }
  }
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return { ok: false, error: "서버 연결을 확인할 수 없습니다." }
  }

  const { error: uErr } = await supabase
    .from("users")
    .update({ cancel_at_period_end: false })
    .eq("id", session.user.id)

  if (uErr) {
    return { ok: false, error: uErr.message }
  }

  const { error: evErr } = await supabase.rpc("append_billing_event", {
    p_kind: "cancel_resumed",
    p_message: "해지 예약을 철회했습니다.",
    p_metadata: {},
  })
  if (evErr) {
    console.warn("[resumeSubscriptionAction]", evErr.message)
  }

  revalidatePath("/billing")
  return { ok: true }
}

export async function scheduleDowngradeAction(targetRaw: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getAppSession()
  if (!session?.user?.id || session.mode !== "supabase") {
    return { ok: false, error: "로그인이 필요합니다." }
  }
  const target = normalizePlan(targetRaw) as BillingPlan
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return { ok: false, error: "서버 연결을 확인할 수 없습니다." }
  }

  const { error: uErr } = await supabase.from("users").update({ pending_plan: target }).eq("id", session.user.id)

  if (uErr) {
    return { ok: false, error: uErr.message }
  }

  const { error: evErr } = await supabase.rpc("append_billing_event", {
    p_kind: "downgrade_scheduled",
    p_message: `다음 갱신일 이후 ${target} 플랜으로 다운그레이드 예약(시뮬레이션).`,
    p_metadata: { pending_plan: target },
  })
  if (evErr) {
    console.warn("[scheduleDowngradeAction]", evErr.message)
  }

  revalidatePath("/billing")
  return { ok: true }
}

export async function clearPendingPlanAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getAppSession()
  if (!session?.user?.id || session.mode !== "supabase") {
    return { ok: false, error: "로그인이 필요합니다." }
  }
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return { ok: false, error: "서버 연결을 확인할 수 없습니다." }
  }

  const { error: uErr } = await supabase.from("users").update({ pending_plan: null }).eq("id", session.user.id)

  if (uErr) {
    return { ok: false, error: uErr.message }
  }

  revalidatePath("/billing")
  return { ok: true }
}
