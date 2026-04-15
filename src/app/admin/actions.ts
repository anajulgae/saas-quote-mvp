"use server"

import { revalidatePath } from "next/cache"

import { requireAdminAccess } from "@/lib/server/admin-auth"
import { normalizePlan } from "@/lib/plan-features"
import { createServerSupabaseClient } from "@/lib/supabase/server"
async function adminCtx() {
  const admin = await requireAdminAccess()
  const supabase = await createServerSupabaseClient()
  if (!supabase) throw new Error("DB 연결 실패")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { supabase: supabase as any, admin }
}

export async function adminUpdateSupportTicketAction(input: {
  ticketId: string
  status: string
  operatorNote?: string
  assigneeAdminId?: string | null
}) {
  const { supabase } = await adminCtx()

  const patch: Record<string, unknown> = { status: input.status }
  if (input.operatorNote !== undefined) patch.operator_note = input.operatorNote
  if (input.assigneeAdminId !== undefined) patch.assignee_admin_id = input.assigneeAdminId
  if (input.status === "resolved") {
    patch.replied_at = new Date().toISOString()
  }

  const { error } = await supabase.from("support_tickets").update(patch).eq("id", input.ticketId)
  if (error) return { ok: false as const, error: error.message }

  revalidatePath("/admin/support")
  revalidatePath(`/admin/support/${input.ticketId}`)
  revalidatePath("/admin")
  return { ok: true as const }
}

export async function adminSetUserPlanAction(input: { userId: string; plan: string }) {
  const { supabase } = await adminCtx()
  const plan = normalizePlan(input.plan)

  const { error: uerr } = await supabase
    .from("users")
    .update({ plan, updated_at: new Date().toISOString() })
    .eq("id", input.userId)
  if (uerr) return { ok: false as const, error: uerr.message }

  const { error: eerr } = await supabase.from("billing_events").insert({
    user_id: input.userId,
    kind: "admin_plan_change",
    message: `운영자에 의해 플랜이 ${plan}(으)로 조정되었습니다.`,
    metadata: {},
  })
  if (eerr) console.warn("[adminSetUserPlanAction] billing_events", eerr.message)

  revalidatePath("/admin/users")
  revalidatePath(`/admin/users/${input.userId}`)
  revalidatePath("/admin/billing")
  return { ok: true as const }
}

export async function adminExtendTrialAction(input: { userId: string; extraDays: number }) {
  const { supabase } = await adminCtx()
  const days = Math.min(Math.max(1, Math.floor(input.extraDays)), 90)

  const { data: row, error: rerr } = await supabase
    .from("users")
    .select("trial_ends_at")
    .eq("id", input.userId)
    .maybeSingle()
  if (rerr || !row) return { ok: false as const, error: rerr?.message ?? "사용자 없음" }

  const base = row.trial_ends_at ? new Date(row.trial_ends_at) : new Date()
  const from = base.getTime() < Date.now() ? new Date() : base
  from.setUTCDate(from.getUTCDate() + days)

  const { error } = await supabase
    .from("users")
    .update({
      trial_ends_at: from.toISOString(),
      subscription_status: "trialing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.userId)
  if (error) return { ok: false as const, error: error.message }

  await supabase.from("billing_events").insert({
    user_id: input.userId,
    kind: "admin_trial_extended",
    message: `체험 기한이 운영자에 의해 ${days}일 연장되었습니다.`,
    metadata: { days },
  })

  revalidatePath("/admin/users")
  revalidatePath(`/admin/users/${input.userId}`)
  revalidatePath("/admin/billing")
  return { ok: true as const }
}

export async function adminEndTrialAction(input: { userId: string }) {
  const { supabase } = await adminCtx()

  const { error } = await supabase
    .from("users")
    .update({
      subscription_status: "trial_expired",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.userId)
  if (error) return { ok: false as const, error: error.message }

  await supabase.from("billing_events").insert({
    user_id: input.userId,
    kind: "admin_trial_ended",
    message: "운영자에 의해 체험이 종료 처리되었습니다.",
    metadata: {},
  })

  revalidatePath("/admin/users")
  revalidatePath(`/admin/users/${input.userId}`)
  return { ok: true as const }
}

export async function adminSetAccountDisabledAction(input: { userId: string; disabled: boolean }) {
  const { supabase, admin } = await adminCtx()
  if (input.userId === admin.userId && input.disabled) {
    return { ok: false as const, error: "본인 계정을 비활성화할 수 없습니다." }
  }

  const { error } = await supabase
    .from("users")
    .update({ account_disabled: input.disabled, updated_at: new Date().toISOString() })
    .eq("id", input.userId)
  if (error) return { ok: false as const, error: error.message }

  await supabase.from("billing_events").insert({
    user_id: input.userId,
    kind: input.disabled ? "admin_account_disabled" : "admin_account_enabled",
    message: input.disabled ? "계정이 운영자에 의해 비활성화되었습니다." : "계정이 운영자에 의해 다시 활성화되었습니다.",
    metadata: {},
  })

  revalidatePath("/admin/users")
  revalidatePath(`/admin/users/${input.userId}`)
  return { ok: true as const }
}

export async function adminAddUserNoteAction(input: { userId: string; body: string }) {
  const { supabase, admin } = await adminCtx()
  const body = input.body.trim()
  if (body.length < 2) return { ok: false as const, error: "메모가 너무 짧습니다." }

  const { error } = await supabase.from("admin_user_notes").insert({
    target_user_id: input.userId,
    author_admin_id: admin.userId,
    body,
  })
  if (error) return { ok: false as const, error: error.message }

  revalidatePath(`/admin/users/${input.userId}`)
  return { ok: true as const }
}

export async function adminAppendBillingNoteAction(input: { userId: string; message: string }) {
  const { supabase } = await adminCtx()
  const msg = input.message.trim()
  if (msg.length < 2) return { ok: false as const, error: "메시지가 너무 짧습니다." }

  const { error } = await supabase.from("billing_events").insert({
    user_id: input.userId,
    kind: "admin_note",
    message: msg,
    metadata: {},
  })
  if (error) return { ok: false as const, error: error.message }

  revalidatePath(`/admin/users/${input.userId}`)
  revalidatePath("/admin/billing")
  return { ok: true as const }
}

export async function adminSetSubscriptionStatusAction(input: {
  userId: string
  status: "trialing" | "active" | "past_due" | "canceled" | "trial_expired"
}) {
  const { supabase } = await adminCtx()

  const { error } = await supabase
    .from("users")
    .update({ subscription_status: input.status, updated_at: new Date().toISOString() })
    .eq("id", input.userId)
  if (error) return { ok: false as const, error: error.message }

  await supabase.from("billing_events").insert({
    user_id: input.userId,
    kind: "admin_subscription_status",
    message: `구독 상태가 운영자에 의해 ${input.status}(으)로 설정되었습니다.`,
    metadata: { status: input.status },
  })

  revalidatePath("/admin/users")
  revalidatePath(`/admin/users/${input.userId}`)
  revalidatePath("/admin/billing")
  return { ok: true as const }
}
