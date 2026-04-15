import { NextResponse } from "next/server"

import { createServiceSupabaseClient } from "@/lib/supabase/service"
import type { Database } from "@/types/supabase"

export const dynamic = "force-dynamic"
export const maxDuration = 60

type RuleRow = Database["public"]["Tables"]["auto_remind_rules"]["Row"]

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

  const { data: rules, error: rulesError } = await admin
    .from("auto_remind_rules")
    .select("*")
    .eq("enabled", true)

  if (rulesError) {
    console.error("[auto-remind] Failed to load rules:", rulesError)
    return NextResponse.json({ error: "Failed to load rules" }, { status: 500 })
  }

  const allRules = (rules ?? []) as RuleRow[]
  let totalSent = 0
  const errors: string[] = []

  for (const rule of allRules) {
    try {
      const sent = await processRule(admin, rule)
      totalSent += sent
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`rule ${rule.id}: ${msg}`)
      console.error(`[auto-remind] Error processing rule ${rule.id}:`, err)
    }
  }

  return NextResponse.json({
    ok: true,
    rulesProcessed: allRules.length,
    remindersSent: totalSent,
    errors: errors.length > 0 ? errors : undefined,
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processRule(admin: any, rule: RuleRow) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - rule.trigger_days)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const { data: invoices, error: invError } = await admin
    .from("invoices")
    .select("id, invoice_number, amount, due_date, payment_status, customer_id, user_id")
    .eq("user_id", rule.user_id)
    .in("payment_status", ["pending", "overdue", "partially_paid"])
    .lte("due_date", cutoffStr)

  if (invError) throw invError
  if (!invoices || invoices.length === 0) return 0

  let sent = 0

  for (const inv of invoices) {
    const { data: existingReminders } = await admin
      .from("reminders")
      .select("id")
      .eq("invoice_id", inv.id)
      .eq("auto_rule_id", rule.id)
      .limit(1)

    if (existingReminders && existingReminders.length > 0) continue

    const message = buildMessage(rule.message_template, {
      invoiceNumber: inv.invoice_number,
      amount: inv.amount,
      dueDate: inv.due_date ?? "",
    })

    if (rule.channel === "email") {
      await sendReminderEmail(admin, rule.user_id, inv.customer_id, message, inv.invoice_number)
    }

    await admin.from("reminders").insert({
      user_id: rule.user_id,
      invoice_id: inv.id,
      channel: rule.channel as "email" | "manual",
      message,
      auto_rule_id: rule.id,
    })

    await admin.from("activity_logs").insert({
      user_id: rule.user_id,
      invoice_id: inv.id,
      customer_id: inv.customer_id,
      action: "reminder.auto_sent",
      description: `자동 리마인드 발송: ${inv.invoice_number} (${rule.name || "규칙"})`,
    })

    sent++
  }

  return sent
}

function buildMessage(
  template: string,
  vars: { invoiceNumber: string; amount: number; dueDate: string }
) {
  if (!template.trim()) {
    return `안녕하세요, 청구서 ${vars.invoiceNumber} (${new Intl.NumberFormat("ko-KR").format(vars.amount)}원)의 입금 기한(${vars.dueDate})이 경과되었습니다. 확인 부탁드립니다.`
  }
  return template
    .replace(/\{\{invoiceNumber\}\}/g, vars.invoiceNumber)
    .replace(/\{\{amount\}\}/g, new Intl.NumberFormat("ko-KR").format(vars.amount))
    .replace(/\{\{dueDate\}\}/g, vars.dueDate)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendReminderEmail(
  admin: any,
  userId: string,
  customerId: string,
  message: string,
  invoiceNumber: string
) {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM?.trim() || "Bill-IO <onboarding@resend.dev>"
  if (!apiKey) return

  const { data: customer } = await admin
    .from("customers")
    .select("email, name, company_name")
    .eq("id", customerId)
    .single()
  if (!customer?.email) return

  const { data: user } = await admin
    .from("users")
    .select("business_name, full_name")
    .eq("id", userId)
    .single()

  const businessName = user?.business_name || user?.full_name || "Bill-IO"

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: customer.email,
        subject: `[${businessName}] 입금 안내 — ${invoiceNumber}`,
        text: message,
      }),
    })
  } catch (err) {
    console.error("[auto-remind] Email send failed:", err)
  }
}
