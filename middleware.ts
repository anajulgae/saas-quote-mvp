import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { isDemoLoginEnabled } from "@/lib/demo-flags"
import { FLOWBILL_DEMO_SESSION_COOKIE } from "@/lib/demo-session"

const PUBLIC_PATHS = ["/login"]

function hasSessionCookie(request: NextRequest) {
  const demoCookieActive =
    isDemoLoginEnabled() &&
    request.cookies.get(FLOWBILL_DEMO_SESSION_COOKIE)?.value === "1"
  const supabaseCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"))

  return demoCookieActive || supabaseCookie
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path))
  const isAuthenticated = hasSessionCookie(request)

  if (pathname === "/") {
    const nextUrl = request.nextUrl.clone()
    nextUrl.pathname = isAuthenticated ? "/dashboard" : "/login"
    return NextResponse.redirect(nextUrl)
  }

  if (!isPublic && !isAuthenticated) {
    const nextUrl = request.nextUrl.clone()
    nextUrl.pathname = "/login"
    return NextResponse.redirect(nextUrl)
  }

  // /login: 만료된 sb-* 쿠키가 남아 있어도 여기서 대시보드로 보내지 않음(세션 없을 때 /login 루프 방지).
  // 로그인 성공 후 이동은 loginAction의 redirect("/dashboard")가 처리합니다.

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api).*)"],
}
