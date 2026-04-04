import { type NextRequest, NextResponse } from "next/server"

import { safeAuthNextPath } from "@/lib/site-url"
import { createServerSupabaseClient } from "@/lib/supabase/server"

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
