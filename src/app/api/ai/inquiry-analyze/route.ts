import { NextResponse } from "next/server"

import { parseInquiryAiAnalysisFromJson } from "@/lib/inquiry-ai-analysis-parse"
import { updateInquiryAiAnalysisForOwner } from "@/lib/data"
import { reportServerError } from "@/lib/observability"
import { assertAiFeatureAllowed, getAuthenticatedUserForApi } from "@/lib/server/api-auth"
import { bumpUserUsage, logAiUsageActivity } from "@/lib/server/usage-bump"
import { runInquiryAiAnalysis } from "@/lib/server/inquiry-analyze-core"
import { OpenAiError } from "@/lib/server/openai-chat"
import { openAiErrorUserPayload } from "@/lib/server/openai-user-errors"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Database } from "@/types/supabase"

type InquiryRow = Database["public"]["Tables"]["inquiries"]["Row"]

export async function POST(req: Request) {
  const auth = await getAuthenticatedUserForApi()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  let inquiryId = ""
  let force = false
  try {
    const body = (await req.json()) as { inquiryId?: string; force?: boolean }
    inquiryId = String(body.inquiryId ?? "").trim()
    force = Boolean(body.force)
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 })
  }

  if (!inquiryId) {
    return NextResponse.json({ error: "inquiryId 가 필요합니다." }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: "데이터 연결을 확인할 수 없습니다." }, { status: 503 })
  }

  const { data: row, error: fetchError } = await supabase
    .from("inquiries")
    .select("*")
    .eq("id", inquiryId)
    .eq("user_id", auth.userId)
    .maybeSingle()

  if (fetchError) {
    return NextResponse.json({ error: "문의를 불러오지 못했습니다." }, { status: 502 })
  }
  const inquiry = row as InquiryRow | null
  if (!inquiry) {
    return NextResponse.json({ error: "문의를 찾을 수 없습니다." }, { status: 404 })
  }

  if (!force) {
    const cached = parseInquiryAiAnalysisFromJson(inquiry.ai_analysis)
    if (cached) {
      return NextResponse.json({ ok: true as const, analysis: cached, cached: true as const })
    }
  }

  const quotaBlock = assertAiFeatureAllowed(auth)
  if (quotaBlock) {
    return NextResponse.json({ error: quotaBlock.message }, { status: quotaBlock.status })
  }

  try {
    const analysis = await runInquiryAiAnalysis({
      title: inquiry.title,
      details: inquiry.details ?? "",
      serviceCategory: inquiry.service_category,
      channel: inquiry.channel,
      stage: inquiry.stage,
      budgetMin: inquiry.budget_min ?? undefined,
      budgetMax: inquiry.budget_max ?? undefined,
      followUpAt: inquiry.follow_up_at ?? undefined,
      industryHint: inquiry.service_category,
    })

    const saved = await updateInquiryAiAnalysisForOwner(inquiryId, analysis)
    void bumpUserUsage(supabase, "ai")
    void logAiUsageActivity(supabase, {
      userId: auth.userId,
      action: "ai.inquiry_analyze",
      description: `Generated AI inquiry analysis for ${inquiry.title}.`,
      inquiryId,
      customerId: inquiry.customer_id,
      metadata: {
        serviceCategory: inquiry.service_category,
        channel: inquiry.channel,
      },
    })
    if (!saved.ok) {
      return NextResponse.json(
        { ok: true as const, analysis, saved: false as const, saveError: saved.error },
        { status: 200 }
      )
    }

    return NextResponse.json({ ok: true as const, analysis, saved: true as const, cached: false as const })
  } catch (e) {
    if (e instanceof OpenAiError) {
      if (e.code !== "NOT_CONFIGURED" && e.code !== "MODEL_NOT_CONFIGURED") {
        reportServerError(e.message, {
          route: "inquiry-analyze",
          code: e.code,
          httpStatus: e.httpStatus,
          missingEnv: e.missingEnv,
        })
      }
      const { error, status } = openAiErrorUserPayload(e)
      const msg =
        e.code === "EMPTY" || e.code === "JSON" || e.code === "PARSE"
          ? "분석에 실패했습니다. 잠시 후 다시 시도해 주세요."
          : error
      return NextResponse.json({ error: msg }, { status })
    }
    reportServerError(e instanceof Error ? e.message : "unknown", { route: "inquiry-analyze" })
    return NextResponse.json({ error: "분석에 실패했습니다." }, { status: 502 })
  }
}
