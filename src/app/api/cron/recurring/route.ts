import { NextResponse } from "next/server"

import { createServiceSupabaseClient } from "@/lib/supabase/service"
import type { Database } from "@/types/supabase"

export const dynamic = "force-dynamic"
export const maxDuration = 60

type SeriesRow = Database["public"]["Tables"]["recurring_series"]["Row"]

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const adminClient = createServiceSupabaseClient()
  if (!adminClient) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 })
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = adminClient as any

  const today = new Date().toISOString().slice(0, 10)

  const { data: series, error: seriesError } = await admin
    .from("recurring_series")
    .select("*")
    .eq("enabled", true)
    .lte("next_run_date", today)

  if (seriesError) {
    console.error("[recurring] Failed to load series:", seriesError)
    return NextResponse.json({ error: "Failed to load series" }, { status: 500 })
  }

  const allSeries = (series ?? []) as SeriesRow[]
  let created = 0
  const errors: string[] = []

  for (const s of allSeries) {
    try {
      if (s.max_runs != null && s.total_runs >= s.max_runs) {
        await admin.from("recurring_series").update({ enabled: false }).eq("id", s.id)
        continue
      }
      await processSeries(admin, s)
      created++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`series ${s.id}: ${msg}`)
      console.error(`[recurring] Error processing series ${s.id}:`, err)
    }
  }

  return NextResponse.json({
    ok: true,
    seriesProcessed: allSeries.length,
    documentsCreated: created,
    errors: errors.length > 0 ? errors : undefined,
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processSeries(admin: any, s: SeriesRow) {
  const now = new Date().toISOString()

  if (s.document_type === "invoice") {
    const invoiceNumber = `INV-R-${Date.now().toString(36).toUpperCase()}`
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)

    await admin.from("invoices").insert({
      user_id: s.user_id,
      customer_id: s.customer_id,
      invoice_number: invoiceNumber,
      invoice_type: s.invoice_type as "deposit" | "balance" | "final",
      amount: Number(s.amount),
      payment_status: "pending",
      due_date: dueDate.toISOString().slice(0, 10),
      notes: s.notes || `자동 생성 — ${s.name || "반복 청구"}`,
      recurring_series_id: s.id,
    })

    await admin.from("activity_logs").insert({
      user_id: s.user_id,
      customer_id: s.customer_id,
      action: "invoice.auto_created",
      description: `반복 청구 자동 생성: ${invoiceNumber} (${s.name || "시리즈"})`,
    })
  } else {
    const quoteNumber = `QT-R-${Date.now().toString(36).toUpperCase()}`
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + 30)

    await admin.from("quotes").insert({
      user_id: s.user_id,
      customer_id: s.customer_id,
      quote_number: quoteNumber,
      title: s.title || `자동 견적 — ${s.name}`,
      status: "draft",
      total: Number(s.amount),
      valid_until: validUntil.toISOString().slice(0, 10),
      notes: s.notes,
      recurring_series_id: s.id,
    })

    await admin.from("activity_logs").insert({
      user_id: s.user_id,
      customer_id: s.customer_id,
      action: "quote.auto_created",
      description: `반복 견적 자동 생성: ${quoteNumber} (${s.name || "시리즈"})`,
    })
  }

  const nextDate = computeNextRunDate(s.next_run_date, s.frequency, s.day_of_month)
  await admin
    .from("recurring_series")
    .update({
      last_run_at: now,
      total_runs: s.total_runs + 1,
      next_run_date: nextDate,
      updated_at: now,
    })
    .eq("id", s.id)
}

function computeNextRunDate(currentDate: string, frequency: string, dayOfMonth: number): string {
  const d = new Date(currentDate)
  switch (frequency) {
    case "weekly":
      d.setDate(d.getDate() + 7)
      break
    case "biweekly":
      d.setDate(d.getDate() + 14)
      break
    case "monthly":
      d.setMonth(d.getMonth() + 1)
      d.setDate(Math.min(dayOfMonth, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
      break
    case "quarterly":
      d.setMonth(d.getMonth() + 3)
      d.setDate(Math.min(dayOfMonth, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
      break
    case "yearly":
      d.setFullYear(d.getFullYear() + 1)
      break
    default:
      d.setMonth(d.getMonth() + 1)
  }
  return d.toISOString().slice(0, 10)
}
