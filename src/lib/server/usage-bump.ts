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

export async function logAiUsageActivity(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string
    action:
      | "ai.inquiry_structure"
      | "ai.inquiry_analyze"
      | "ai.quote_draft"
      | "ai.compose_message"
      | "ai.collection_advice"
      | "ai.customer_insight"
    description: string
    inquiryId?: string | null
    quoteId?: string | null
    invoiceId?: string | null
    customerId?: string | null
    metadata?: Record<string, string | number | boolean | null | undefined>
  }
) {
  const { error } = await supabase.from("activity_logs").insert({
    user_id: input.userId,
    customer_id: input.customerId ?? null,
    inquiry_id: input.inquiryId ?? null,
    quote_id: input.quoteId ?? null,
    invoice_id: input.invoiceId ?? null,
    action: input.action,
    description: input.description,
    metadata: input.metadata ?? {},
  })

  if (error) {
    console.warn("[logAiUsageActivity]", error.message)
  }
}
