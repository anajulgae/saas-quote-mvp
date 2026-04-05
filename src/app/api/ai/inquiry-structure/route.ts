import { NextResponse } from "next/server"

import { planAllowsFeature } from "@/lib/plan-features"
import { reportServerError } from "@/lib/observability"
import { getAuthenticatedUserForApi } from "@/lib/server/api-auth"
import { completeJsonChatForFeature, OpenAiError } from "@/lib/server/openai-chat"
import { openAiErrorUserPayload } from "@/lib/server/openai-user-errors"

/** API 응답·AI 계약 (필드명은 env 프롬프트와 일치) */
export type InquiryStructuredPayload = {
  title: string
  channel: string
  scopeSummary: string
  structuredSummary: string
  followUpNote: string
}

function str(o: Record<string, unknown>, k: string): string {
  return typeof o[k] === "string" ? (o[k] as string).trim() : ""
}

function parseStructure(obj: unknown): InquiryStructuredPayload {
  if (!obj || typeof obj !== "object") {
    throw new Error("객체 형식이 아닙니다.")
  }
  const o = obj as Record<string, unknown>
  const title = str(o, "title") || str(o, "suggestedTitle")
  const channel = str(o, "channel") || "카카오톡"
  const scopeSummary = str(o, "scopeSummary") || str(o, "estimatedScope")
  const structuredSummary = str(o, "structuredSummary") || str(o, "requestSummary")
  const followUpNote = str(o, "followUpNote") || str(o, "followupMemo")
  if (!structuredSummary.trim() && !title.trim()) {
    throw new Error("structuredSummary 또는 title 이 필요합니다.")
  }
  return {
    title: title.trim() || "신규 문의",
    channel,
    scopeSummary,
    structuredSummary,
    followUpNote,
  }
}

const SYSTEM_PROMPT = `한국어 문의 원문→구조화. JSON만 출력. 설명 문장 금지.
키: title(한 줄), channel(카카오톡|전화|이메일|방문|기타), scopeSummary(업종·범위 한 줄), structuredSummary(핵심 요약 2~4문장), followUpNote(내부 팔로업 한 줄, 없으면 "").
값은 짧게.`

export async function POST(req: Request) {
  const auth = await getAuthenticatedUserForApi()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  if (!planAllowsFeature(auth.plan, "ai_assist")) {
    return NextResponse.json({ error: "현재 플랜에서 AI 기능을 사용할 수 없습니다." }, { status: 403 })
  }

  let rawText = ""
  try {
    const body = (await req.json()) as { rawText?: string }
    rawText = String(body.rawText ?? "").trim()
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 })
  }

  if (rawText.length < 8) {
    return NextResponse.json({ error: "문의 원문을 조금 더 입력해 주세요." }, { status: 400 })
  }

  try {
    const structured = await completeJsonChatForFeature({
      feature: "inquiry_structure",
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: rawText.slice(0, 8000) },
      ],
      parse: parseStructure,
    })

    if (!structured.title.trim()) {
      structured.title = "신규 문의"
    }

    return NextResponse.json({ ok: true as const, structured })
  } catch (e) {
    if (e instanceof OpenAiError) {
      if (e.code !== "NOT_CONFIGURED" && e.code !== "MODEL_NOT_CONFIGURED") {
        reportServerError(e.message, {
          route: "inquiry-structure",
          code: e.code,
          httpStatus: e.httpStatus,
          missingEnv: e.missingEnv,
        })
      }
      const { error, status } = openAiErrorUserPayload(e)
      const msg =
        e.code === "EMPTY" || e.code === "JSON" || e.code === "PARSE"
          ? "구조화에 실패했습니다. 잠시 후 다시 시도하거나 내용을 직접 입력해 주세요."
          : error
      return NextResponse.json({ error: msg }, { status })
    }
    reportServerError(e instanceof Error ? e.message : "unknown", { route: "inquiry-structure" })
    return NextResponse.json({ error: "구조화에 실패했습니다." }, { status: 502 })
  }
}
