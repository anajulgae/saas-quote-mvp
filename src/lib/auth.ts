import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { demoUser } from "@/lib/demo-data"

const DEMO_SESSION_COOKIE = "flowbill-demo-session"

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export function getDemoCredentials() {
  return {
    email: process.env.DEMO_LOGIN_EMAIL ?? "demo@flowbill.kr",
    password: process.env.DEMO_LOGIN_PASSWORD ?? "demo1234!",
  }
}

export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) {
    return null
  }

  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            return
          }
        },
      },
    }
  )
}

export async function getAppSession() {
  const cookieStore = await cookies()
  const demoSession = cookieStore.get(DEMO_SESSION_COOKIE)?.value

  if (demoSession === "1") {
    return {
      mode: "demo" as const,
      user: demoUser,
    }
  }

  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return null
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  return {
    mode: "supabase" as const,
    user: {
      id: user.id,
      fullName: user.user_metadata.full_name ?? user.email ?? "사용자",
      businessName: user.user_metadata.business_name ?? "내 사업장",
      email: user.email ?? "",
      phone: user.user_metadata.phone ?? "",
    },
  }
}

export async function requireAppSession() {
  const session = await getAppSession()

  if (!session) {
    redirect("/login")
  }

  return session
}

export function getDemoSessionCookieName() {
  return DEMO_SESSION_COOKIE
}
