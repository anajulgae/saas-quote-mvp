import { createHash } from "node:crypto"

import type { Json } from "@/types/supabase"

function shortHash(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16)
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

export function buildDocumentSendDedupeKey(input: {
  documentKind: "quote" | "invoice"
  documentId: string
  channel: "email" | "share_link" | "pdf_download" | "kakao_byoa"
  fingerprint?: string
}) {
  const base = `${input.documentKind}:${input.documentId}:${input.channel}:${todayKey()}`
  return input.fingerprint ? `${base}:${shortHash(input.fingerprint)}` : base
}

export async function recordDocumentSendUsage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  input: {
    documentKind: "quote" | "invoice"
    documentId: string
    channel: "email" | "share_link" | "pdf_download" | "kakao_byoa"
    dedupeKey: string
    metadata?: Json
  }
) {
  const { data, error } = await supabase.rpc("record_document_send", {
    p_document_kind: input.documentKind,
    p_document_id: input.documentId,
    p_channel: input.channel,
    p_dedupe_key: input.dedupeKey,
    p_metadata: input.metadata ?? {},
  })
  if (error) {
    console.warn("[recordDocumentSendUsage]", error.message)
    return { ok: false as const, counted: false }
  }
  const row = data as { ok?: boolean; counted?: boolean } | null
  return {
    ok: Boolean(row?.ok),
    counted: Boolean(row?.counted),
  }
}
