import { NextResponse } from "next/server"

import { normalizePlan } from "@/lib/plan-features"
import { beginCheckoutForPlan } from "@/lib/server/billing-service"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
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

  let body: { plan?: string }
  try {
    body = (await request.json()) as { plan?: string }
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 })
  }

  const result = await beginCheckoutForPlan({
    userId: user.id,
    email: user.email ?? "",
    plan: normalizePlan(body.plan),
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ ok: true, redirectUrl: result.redirectUrl })
}
