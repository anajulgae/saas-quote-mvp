import { createClient } from "@supabase/supabase-js"

import { isSupabaseConfigured } from "@/lib/supabase/public-config"

/** 공개 견적 페이지 로드 시 열람 카운트·(첫 열람 시) 활동 로그 */
export async function recordPublicQuoteShareOpen(token: string): Promise<void> {
  const trimmed = token.trim()
  if (!trimmed || !isSupabaseConfigured()) {
    return
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  await supabase.rpc("bump_quote_share_open", { p_token: trimmed })
}

/** 공개 청구 페이지 로드 시 열람 카운트·(첫 열람 시) 활동 로그 */
export async function recordPublicInvoiceShareOpen(token: string): Promise<void> {
  const trimmed = token.trim()
  if (!trimmed || !isSupabaseConfigured()) {
    return
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  await supabase.rpc("bump_invoice_share_open", { p_token: trimmed })
}
