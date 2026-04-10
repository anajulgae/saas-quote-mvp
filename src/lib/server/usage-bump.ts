import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/supabase"

export async function bumpUserUsage(
  supabase: SupabaseClient<Database>,
  kind: "ai" | "document_send"
): Promise<boolean> {
  const { data, error } = await supabase.rpc("bump_user_usage", { p_kind: kind })
  if (error) {
    console.warn("[bumpUserUsage]", error.message)
    return false
  }
  const row = data as { ok?: boolean } | null
  return Boolean(row?.ok)
}
