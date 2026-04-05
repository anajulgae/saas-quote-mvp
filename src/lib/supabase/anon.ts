import { createClient } from "@supabase/supabase-js"

import type { Database } from "@/types/supabase"

import { isSupabaseConfigured } from "@/lib/supabase/public-config"

/** 공개 페이지·API용 — 쿠키 없이 anon 키만 사용 */
export function createAnonSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null
  }
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
