import { NextResponse } from "next/server"

import { invoiceTypeOptions } from "@/lib/constants"
import type { CollectionToneHint } from "@/types/domain"
import { reportServerError } from "@/lib/observability"
import { guardAiPost } from "@/lib/server/ai-route-guard"
import { bumpUserUsage } from "@/lib/server/usage-bump"
import { runCollectionAdviceAi } from "@/lib/server/collection-advice-core"
import { OpenAiError } from "@/lib/server/openai-chat"
import { openAiErrorUserPayload } from "@/lib/server/openai-user-errors"
import type { Database } from "@/types/supabase"

type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"]

function invoiceTypeLabel(type: string) {
  return invoiceTypeOptions.find((o) => o.value === type)?.label ?? type
}

export async function POST(req: Request) {
  const g = await guardAiPost()
  if (!g.ok) {
    return g.response
  }
  const { auth, supabase } = g.ctx

  let invoiceId = ""
  try {
    const body = (await req.json()) as { invoiceId?: string }
    invoiceId = String(body.invoiceId ?? "").trim()
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 })
  }

  if (!invoiceId) {
    return NextResponse.json({ error: "invoiceId 가 필요합니다." }, { status: 400 })
  }

  const { data: invRow, error: invErr } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("user_id", auth.userId)
    .maybeSingle()

  if (invErr) {
    return NextResponse.json({ error: "청구를 불러오지 못했습니다." }, { status: 502 })
  }
  const inv = invRow as InvoiceRow | null
  if (!inv) {
    return NextResponse.json({ error: "청구를 찾을 수 없습니다." }, { status: 404 })
  }

  const [{ data: custRow }, { data: reminderRows }] = await Promise.all([
    supabase.from("customers").select("name, company_name").eq("id", inv.customer_id).maybeSingle(),
    supabase.from("reminders").select("sent_at").eq("invoice_id", invoiceId).order("sent_at", { ascending: false }),
  ])

  const cust = custRow as { name: string; company_name: string | null } | null
  const customerLabel = cust?.company_name?.trim() || cust?.name || "고객"
  const reminders = (reminderRows ?? []) as { sent_at: string }[]
  const reminderCount = reminders.length
  const lastReminderAt = reminders[0]?.sent_at

  try {
    const advice = await runCollectionAdviceAi({
      paymentStatus: inv.payment_status,
      amount: inv.amount,
      dueDate: inv.due_date ?? undefined,
      paidAt: inv.paid_at ?? undefined,
      promisedPaymentDate: inv.promised_payment_date ?? undefined,
      nextCollectionFollowupAt: inv.next_collection_followup_at ?? undefined,
      invoiceTypeLabel: invoiceTypeLabel(inv.invoice_type),
      customerLabel,
      reminderCount,
      lastReminderAt,
      collectionToneDefault: (inv.collection_tone as CollectionToneHint | null) ?? undefined,
    })

    void bumpUserUsage(supabase, "ai")
    return NextResponse.json({ ok: true as const, advice })
  } catch (e) {
    if (e instanceof OpenAiError) {
      if (e.code !== "NOT_CONFIGURED" && e.code !== "MODEL_NOT_CONFIGURED") {
        reportServerError(e.message, {
          route: "collection-advice",
          code: e.code,
          httpStatus: e.httpStatus,
          missingEnv: e.missingEnv,
        })
      }
      const { error, status } = openAiErrorUserPayload(e)
      const msg =
        e.code === "EMPTY" || e.code === "JSON" || e.code === "PARSE"
          ? "추천을 만들지 못했습니다. 잠시 후 다시 시도해 주세요."
          : error
      return NextResponse.json({ error: msg }, { status })
    }
    reportServerError(e instanceof Error ? e.message : "unknown", { route: "collection-advice" })
    return NextResponse.json({ error: "추천을 만들지 못했습니다." }, { status: 502 })
  }
}
