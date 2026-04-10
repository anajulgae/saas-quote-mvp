import { NextResponse } from "next/server"

import { getCustomerDetailData } from "@/lib/data"
import { reportServerError } from "@/lib/observability"
import { guardAiPost } from "@/lib/server/ai-route-guard"
import { bumpUserUsage } from "@/lib/server/usage-bump"
import { runCustomerInsightAi } from "@/lib/server/customer-insight-core"
import { OpenAiError } from "@/lib/server/openai-chat"
import { openAiErrorUserPayload } from "@/lib/server/openai-user-errors"

export async function POST(req: Request) {
  const g = await guardAiPost()
  if (!g.ok) {
    return g.response
  }
  const { supabase } = g.ctx

  let customerId = ""
  try {
    const body = (await req.json()) as { customerId?: string }
    customerId = String(body.customerId ?? "").trim()
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 })
  }

  if (!customerId) {
    return NextResponse.json({ error: "customerId 가 필요합니다." }, { status: 400 })
  }

  try {
    const detail = await getCustomerDetailData(customerId)
    if (!detail.customer) {
      return NextResponse.json({ error: "고객을 찾을 수 없습니다." }, { status: 404 })
    }

    const c = detail.customer
    const snapshot = {
      customer: {
        display: c.companyName?.trim() || c.name,
        tags: c.tags?.slice(0, 12) ?? [],
        notesSnippet: c.notes ? String(c.notes).slice(0, 400) : "",
      },
      inquiries: detail.inquiries.slice(0, 12).map((i) => ({
        title: i.title,
        category: i.serviceCategory,
        stage: i.stage,
        createdAt: i.createdAt,
      })),
      quotes: detail.quotes.slice(0, 12).map((q) => ({
        title: q.title,
        total: q.total,
        status: q.status,
        createdAt: q.createdAt,
      })),
      invoices: detail.invoices.slice(0, 12).map((inv) => ({
        amount: inv.amount,
        paymentStatus: inv.paymentStatus,
        invoiceType: inv.invoiceType,
        requestedAt: inv.requestedAt,
        dueDate: inv.dueDate,
      })),
      recentTimeline: detail.timeline.slice(0, 15).map((t) => ({
        kind: t.kind,
        label: t.label,
        description: t.description?.slice(0, 200),
        at: t.createdAt,
      })),
    }

    const insight = await runCustomerInsightAi(JSON.stringify(snapshot))

    void bumpUserUsage(supabase, "ai")
    return NextResponse.json({ ok: true as const, insight })
  } catch (e) {
    if (e instanceof OpenAiError) {
      if (e.code !== "NOT_CONFIGURED" && e.code !== "MODEL_NOT_CONFIGURED") {
        reportServerError(e.message, {
          route: "customer-insight",
          code: e.code,
          httpStatus: e.httpStatus,
          missingEnv: e.missingEnv,
        })
      }
      const { error, status } = openAiErrorUserPayload(e)
      const msg =
        e.code === "EMPTY" || e.code === "JSON" || e.code === "PARSE"
          ? "인사이트를 만들지 못했습니다. 잠시 후 다시 시도해 주세요."
          : error
      return NextResponse.json({ error: msg }, { status })
    }
    reportServerError(e instanceof Error ? e.message : "unknown", { route: "customer-insight" })
    return NextResponse.json({ error: "인사이트를 만들지 못했습니다." }, { status: 502 })
  }
}
