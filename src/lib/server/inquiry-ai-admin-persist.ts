import { createServiceSupabaseClient } from "@/lib/supabase/service"
import type { Json } from "@/types/supabase"

/** 공개 문의 접수 등 — 서비스 롤로 소유자 일치 시에만 저장 */
export async function persistInquiryAiAnalysisAsOwner(params: {
  inquiryId: string
  ownerUserId: string
  analysis: unknown
}): Promise<{ ok: boolean }> {
  const supabase = createServiceSupabaseClient()
  if (!supabase) {
    return { ok: false }
  }
  const now = new Date().toISOString()
  const { error } = await supabase
    .from("inquiries")
    .update({
      ai_analysis: params.analysis as Json,
      ai_analysis_updated_at: now,
    })
    .eq("id", params.inquiryId)
    .eq("user_id", params.ownerUserId)
  return { ok: !error }
}
