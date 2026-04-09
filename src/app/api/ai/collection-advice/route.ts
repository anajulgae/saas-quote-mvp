import { NextResponse } from "next/server"

import { invoiceTypeOptions } from "@/lib/constants"
import type { CollectionToneHint } from "@/types/domain"
import { planAllowsFeature } from "@/lib/plan-features"
import { reportServerError } from "@/lib/observability"
import { getAuthenticatedUserForApi } from "@/lib/server/api-auth"
import { runCollectionAdviceAi } from "@/lib/server/collection-advice-core"
import { OpenAiError } from "@/lib/server/openai-chat"
import { openAiErrorUserPayload } from "@/lib/server/openai-user-errors"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Database } from "@/types/supabase"

type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"]

function invoiceTypeLabel(type: string) {
  return invoiceTypeOptions.find((o) => o.value === type)?.label ?? type
}

export async function POST(req: Request) {
  const auth = await getAuthenticatedUserForApi()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  if (!planAllowsFeature(auth.plan, "ai_assist")) {
    return NextResponse.json({ error: "현재 플랜에서 AI 기능을 사용할 수 없습니다." }, { status: 403 })
  }

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

  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: "데이터 연결을 확인할 수 없습니다." }, { status: 503 })
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
