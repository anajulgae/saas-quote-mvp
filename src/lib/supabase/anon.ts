import { createClient } from "@supabase/supabase-js"

import { isSupabaseConfigured } from "@/lib/supabase/public-config"

/** 공개 RPC 전용(쿠키 세션 없음) */
export function createAnonSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}
