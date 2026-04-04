import { type NextRequest, NextResponse } from "next/server"

import { safeAuthNextPath } from "@/lib/site-url"
import { createServerSupabaseClient } from "@/lib/supabase/server"

/**
 * 이메일 확인·OAuth 등 PKCE `code` 쿼리가 붙는 흐름 전용.
 * 비밀번호 재설정은 `resetPasswordForEmail` 의 redirectTo 가 `/reset-password` 로 직행하며,
 * 클라이언트에서 code/hash 를 처리합니다.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const next = safeAuthNextPath(searchParams.get("next"))

  if (!code) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    url.searchParams.set("error", "auth")
    return NextResponse.redirect(url)
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    url.searchParams.set("error", "auth")
    return NextResponse.redirect(url)
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    url.searchParams.set("error", "auth")
    return NextResponse.redirect(url)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
