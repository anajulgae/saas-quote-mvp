import { redirect } from "next/navigation"

import { getAppSession } from "@/lib/auth"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export type AdminContext = {
  userId: string
  email: string
  adminRole: string | null
}

/** 데모 세션·비로그인 차단 후 is_admin 확인 */
export async function requireAdminAccess(): Promise<AdminContext> {
  const session = await getAppSession()
  if (!session) {
    redirect("/login?next=%2Fadmin")
  }
  if (session.mode === "demo") {
    redirect("/admin/forbidden?reason=demo")
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    redirect("/admin/forbidden?reason=db")
  }

  const { data, error } = await supabase
    .from("users")
    .select("is_admin, admin_role")
    .eq("id", session.user.id)
    .maybeSingle()

  if (error) {
    console.warn("[requireAdminAccess]", error.message)
    redirect("/admin/forbidden?reason=lookup")
  }

  const row = data as { is_admin?: boolean; admin_role?: string | null } | null
  if (!row?.is_admin) {
    redirect("/admin/forbidden")
  }

  return {
    userId: session.user.id,
    email: session.user.email,
    adminRole: row.admin_role ?? null,
  }
}
