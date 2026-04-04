import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { isDemoLoginEnabled } from "@/lib/demo-flags"
import { FLOWBILL_DEMO_SESSION_COOKIE } from "@/lib/demo-session"

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/auth/callback",
  "/signup/check-email",
  "/reset-password",
]

function hasSessionCookie(request: NextRequest) {
  const demoCookieActive =
    isDemoLoginEnabled() &&
    request.cookies.get(FLOWBILL_DEMO_SESSION_COOKIE)?.value === "1"
  const supabaseCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"))

  return demoCookieActive || supabaseCookie
}

/** 데모 비활성화 뒤에 남은 데모 쿠키는 미들웨어에서만 삭제 (RSC에서 delete 시 500 가능) */
function stripStaleDemoCookie(request: NextRequest, response: NextResponse) {
  if (
    request.cookies.get(FLOWBILL_DEMO_SESSION_COOKIE)?.value === "1" &&
    !isDemoLoginEnabled()
  ) {
    response.cookies.delete(FLOWBILL_DEMO_SESSION_COOKIE)
  }
  return response
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return stripStaleDemoCookie(request, NextResponse.next())
  }

  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path))
  const isAuthenticated = hasSessionCookie(request)

  if (pathname === "/") {
    if (isAuthenticated) {
      const nextUrl = request.nextUrl.clone()
      nextUrl.pathname = "/dashboard"
      return stripStaleDemoCookie(request, NextResponse.redirect(nextUrl))
    }
    return stripStaleDemoCookie(request, NextResponse.next())
  }

  if (!isPublic && !isAuthenticated) {
    const nextUrl = request.nextUrl.clone()
    nextUrl.pathname = "/login"
    return stripStaleDemoCookie(request, NextResponse.redirect(nextUrl))
  }

  return stripStaleDemoCookie(request, NextResponse.next())
}

export const config = {
  matcher: ["/((?!api).*)"],
}
