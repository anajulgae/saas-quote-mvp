/** 클라이언트·서버 공통 — next/headers 등 서버 전용 모듈에 의존하지 않음 */
export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
