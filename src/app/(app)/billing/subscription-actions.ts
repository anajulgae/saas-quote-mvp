"use server"

import { revalidatePath } from "next/cache"

import { getAppSession } from "@/lib/auth"
import { PLAN_LABEL } from "@/lib/billing/catalog"
import { normalizePlan } from "@/lib/plan-features"
import {
  beginCheckoutForPlan,
  changePlanOrCheckout,
  openBillingPortalForUser,
  resumeUserSubscription,
  scheduleUserSubscriptionCancel,
} from "@/lib/server/billing-service"

function revalidateBillingSurfaces() {
  revalidatePath("/billing")
  revalidatePath("/settings")
  revalidatePath("/dashboard")
}

async function requireBillingSession() {
  const session = await getAppSession()
  if (!session?.user?.id || session.mode !== "supabase") {
    return null
  }
  return session
}

export async function selectSubscriptionPlanAction(
  planRaw: string
): Promise<{ ok: true; redirectUrl?: string } | { ok: false; error: string }> {
  const session = await requireBillingSession()
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." }
  }

  const result = await changePlanOrCheckout({
    userId: session.user.id,
    email: session.user.email,
    plan: normalizePlan(planRaw),
  })
  if (!result.ok) {
    return result
  }

  revalidateBillingSurfaces()
  return result
}

export async function startCheckoutAction(
  planRaw: string
): Promise<{ ok: true; redirectUrl?: string } | { ok: false; error: string }> {
  const session = await requireBillingSession()
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." }
  }
  const result = await beginCheckoutForPlan({
    userId: session.user.id,
    email: session.user.email,
    plan: normalizePlan(planRaw),
  })
  if (!result.ok) {
    return result
  }
  revalidateBillingSurfaces()
  return result
}

export async function openBillingPortalAction(): Promise<
  { ok: true; redirectUrl?: string } | { ok: false; error: string }
> {
  const session = await requireBillingSession()
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." }
  }
  const result = await openBillingPortalForUser({ userId: session.user.id })
  if (!result.ok) {
    return result
  }
  return result
}

export async function scheduleSubscriptionCancelAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const session = await requireBillingSession()
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." }
  }
  const result = await scheduleUserSubscriptionCancel(session.user.id)
  if (!result.ok) {
    return result
  }
  revalidateBillingSurfaces()
  return { ok: true }
}

export async function resumeSubscriptionAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const session = await requireBillingSession()
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." }
  }
  const result = await resumeUserSubscription(session.user.id)
  if (!result.ok) {
    return result
  }
  revalidateBillingSurfaces()
  return { ok: true }
}

export async function scheduleDowngradeAction(
  targetRaw: string
): Promise<{ ok: true; redirectUrl?: string } | { ok: false; error: string }> {
  return selectSubscriptionPlanAction(targetRaw)
}

export async function clearPendingPlanAction(): Promise<{ ok: true }> {
  revalidateBillingSurfaces()
  return { ok: true }
}
