import { NextResponse } from "next/server"
import { z } from "zod"

import { planAllowsFeature } from "@/lib/plan-features"
import { reportServerError } from "@/lib/observability"
import { sendNewInquiryEmailToOperator } from "@/lib/server/operator-email"
import { OpenAiError, runInquiryStructureForPublicForm } from "@/lib/server/inquiry-structure-core"
import { createAnonSupabaseClient } from "@/lib/supabase/anon"
import type { BillingPlan } from "@/types/domain"

const bodySchema = z.object({
  token: z.string().trim().min(16),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(8).max(40),
  email: z.string().trim().max(200).optional().default(""),
  title: z.string().trim().min(1).max(500),
  details: z.string().trim().min(4).max(20000),
  serviceCategory: z.string().trim().max(200).optional().default(""),
  hopedDate: z.string().trim().max(32).optional().default(""),
  budgetMin: z.number().int().nonnegative().max(1_000_000_000).optional(),
  budgetMax: z.number().int().nonnegative().max(1_000_000_000).optional(),
  extraNotes: z.string().trim().max(8000).optional().default(""),
  consent: z.literal(true),
  companyWebsite: z.string().optional().default(""),
  source: z.string().trim().max(64).optional().default(""),
  sourceSlug: z.string().trim().max(80).optional().default(""),
})

const rateBuckets = new Map<string, { n: number; reset: number }>()

function allowRate(key: string, max: number, windowMs: number) {
  const now = Date.now()
  const b = rateBuckets.get(key)
  if (!b || now > b.reset) {
    rateBuckets.set(key, { n: 1, reset: now + windowMs })
    return true
  }
  if (b.n >= max) {
    return false
  }
  b.n += 1
  return true
}

function clientIp(request: Request) {
  const xff = request.headers.get("x-forwarded-for")
  if (xff) {
    return xff.split(",")[0]?.trim() || "unknown"
  }
  return request.headers.get("x-real-ip")?.trim() || "local"
}

const errorMessages: Record<string, string> = {
  consent_required: "개인정보 수집·이용에 동의해 주세요.",
  invalid_token: "링크가 올바르지 않습니다.",
  form_unavailable: "문의 폼을 사용할 수 없습니다. 링크가 비활성화되었거나 만료되었을 수 있습니다.",
  validation_title: "제목을 확인해 주세요.",
  validation_name: "이름을 확인해 주세요.",
  validation_phone: "연락처를 확인해 주세요.",
  validation_details: "문의 내용을 조금 더 입력해 주세요.",
  rate_limited: "잠시 후 다시 시도해 주세요.",
}

export async function POST(request: Request) {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." },
      { status: 400 }
    )
  }

  const body = parsed.data
  const ip = clientIp(request)
  const rateKey = `${ip}:${body.token}`
  if (!allowRate(rateKey, 24, 3_600_000)) {
    return NextResponse.json({ ok: false, error: "같은 연결에서 너무 많이 제출했습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 })
  }

  const supabase = createAnonSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "서비스 설정이 완료되지 않았습니다." }, { status: 503 })
  }

  const hopedDate =
    body.hopedDate && /^\d{4}-\d{2}-\d{2}$/.test(body.hopedDate) ? body.hopedDate : null

  const src = body.source.trim().toLowerCase() || null
  const srcSlug = body.sourceSlug.trim() || null

  const { data, error } = await supabase.rpc("submit_public_inquiry", {
    p_token: body.token,
    p_name: body.name,
    p_phone: body.phone,
    p_email: body.email.trim() || "",
    p_title: body.title,
    p_details: body.details,
    p_service_category: body.serviceCategory.trim() || "",
    p_hoped_date: hopedDate,
    p_budget_min: body.budgetMin ?? null,
    p_budget_max: body.budgetMax ?? null,
    p_extra_notes: body.extraNotes.trim() || "",
    p_consent: body.consent,
    p_honeypot: body.companyWebsite ?? "",
    p_source: src,
    p_source_slug: srcSlug,
  })

  if (error) {
    reportServerError(error.message, { route: "public/inquiry", code: "rpc" })
    return NextResponse.json({ ok: false, error: "접수 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }, { status: 502 })
  }

  const result = data as {
    ok?: boolean
    skipped?: boolean
    error?: string
    inquiryId?: string
    customerId?: string
    ownerUserId?: string
    ownerPlan?: string
  }

  if (result?.skipped) {
    return NextResponse.json({ ok: true })
  }

  if (!result?.ok) {
    const code = String(result?.error ?? "unknown")
    const msg = errorMessages[code] ?? "접수할 수 없습니다. 입력 내용을 확인해 주세요."
    const status = code === "rate_limited" ? 429 : 400
    return NextResponse.json({ ok: false, error: msg, code }, { status })
  }

  const inquiryId = result.inquiryId
  const ownerUserId = result.ownerUserId
  const ownerPlan = (result.ownerPlan as BillingPlan | undefined) ?? "free"

  if (ownerUserId && inquiryId) {
    void sendNewInquiryEmailToOperator({
      ownerUserId,
      inquiryTitle: body.title,
      submitterName: body.name,
      submitterPhone: body.phone,
      submitterEmail: body.email,
    })
  }

  if (inquiryId && planAllowsFeature(ownerPlan, "ai_assist")) {
    const rawForAi = [body.title, body.details, body.extraNotes].filter(Boolean).join("\n\n")
    if (rawForAi.length >= 12) {
      try {
        const structured = await runInquiryStructureForPublicForm(rawForAi)
        const mergedDetails = [
          structured.structuredSummary,
          structured.followUpNote ? `■ 팔로업\n${structured.followUpNote}` : "",
          "",
          "— 공개 문의 폼(웹)에서 제출됨 · AI로 요약·정리됨",
        ]
          .filter(Boolean)
          .join("\n\n")

        await supabase.rpc("apply_public_inquiry_ai_draft", {
          p_token: body.token,
          p_inquiry_id: inquiryId,
          p_title: structured.title,
          p_service_category: structured.scopeSummary || "일반",
          p_details: mergedDetails,
        })
      } catch (e) {
        if (e instanceof OpenAiError) {
          if (e.code !== "NOT_CONFIGURED" && e.code !== "MODEL_NOT_CONFIGURED") {
            reportServerError(e.message, { route: "public/inquiry-ai", code: e.code })
          }
        } else {
          reportServerError(e instanceof Error ? e.message : "ai", { route: "public/inquiry-ai" })
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    inquiryId: result.inquiryId,
  })
}
