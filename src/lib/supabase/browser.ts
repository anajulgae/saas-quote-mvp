import { createBrowserClient } from "@supabase/ssr"

import type { Database } from "@/types/supabase"

/** 클라이언트 전용 — 비밀번호 재설정 링크의 PKCE·hash 세션 처리 등 */
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
