import { NextResponse } from "next/server"

import { openBillingPortalForUser } from "@/lib/server/billing-service"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function POST() {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: "인증 구성을 확인할 수 없습니다." }, { status: 503 })
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  const result = await openBillingPortalForUser({ userId: user.id })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true, redirectUrl: result.redirectUrl })
}
