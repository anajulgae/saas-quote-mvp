import { createClient } from "@supabase/supabase-js"

import type { Database } from "@/types/supabase"

import { isSupabaseConfigured } from "@/lib/supabase/public-config"

/** 공개 RPC 전용(쿠키 세션 없음) */
export function createAnonSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null
  }
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}
