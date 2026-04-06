import { createClient } from "@supabase/supabase-js"

import type { Database } from "@/types/supabase"

import { isSupabaseConfigured } from "@/lib/supabase/public-config"

/** 서버 전용 — RLS 우회(이메일 발송 시 설정·프리퍼런스 조회 등). 환경변수 없으면 null */
export function createServiceSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!key) {
    return null
  }
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
