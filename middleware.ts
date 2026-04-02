import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const PUBLIC_PATHS = ["/login"]

function hasSessionCookie(request: NextRequest) {
  const demoCookie = request.cookies.get("flowbill-demo-session")?.value === "1"
  const supabaseCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"))

  return demoCookie || supabaseCookie
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

  if (isPublic && isAuthenticated) {
    const nextUrl = request.nextUrl.clone()
    nextUrl.pathname = "/dashboard"
    return NextResponse.redirect(nextUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api).*)"],
}
