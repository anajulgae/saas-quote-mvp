import { NextResponse } from "next/server"

import { planAllowsFeature } from "@/lib/plan-features"
import { reportServerError } from "@/lib/observability"
import { getAuthenticatedUserForApi } from "@/lib/server/api-auth"
import { completeJsonChat, OpenAiError } from "@/lib/server/openai-chat"
import { openAiErrorUserPayload } from "@/lib/server/openai-user-errors"

function parseStructure(obj: unknown): {
  suggestedTitle: string
  customerHint: string
  requestSummary: string
  channel: string
  estimatedScope: string
  followupMemo: string
} {
  if (!obj || typeof obj !== "object") {
    throw new Error("객체 형식이 아닙니다.")
  }
  const o = obj as Record<string, unknown>
  return {
    suggestedTitle: typeof o.suggestedTitle === "string" ? o.suggestedTitle.trim() : "",
    customerHint: typeof o.customerHint === "string" ? o.customerHint.trim() : "",
    requestSummary: typeof o.requestSummary === "string" ? o.requestSummary.trim() : "",
    channel: typeof o.channel === "string" ? o.channel.trim() : "카카오톡",
    estimatedScope: typeof o.estimatedScope === "string" ? o.estimatedScope.trim() : "",
    followupMemo: typeof o.followupMemo === "string" ? o.followupMemo.trim() : "",
  }
}

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

  const system = `한국어로 문의 원문을 구조화합니다. JSON만 출력.
키: suggestedTitle(한 줄 제목), customerHint(거래처/담당자 추정 이름 또는 빈 문자열),
requestSummary(핵심 요청 요약), channel(카카오톡|전화|이메일|방문|기타 중 하나),
estimatedScope(업종·서비스 범위 한 줄), followupMemo(내부 팔로업 메모)`

  try {
    const structured = await completeJsonChat(
      [
        { role: "system", content: system },
        { role: "user", content: rawText.slice(0, 12000) },
      ],
      parseStructure
    )

    if (!structured.suggestedTitle) {
      structured.suggestedTitle = "신규 문의"
    }

    return NextResponse.json({ ok: true as const, structured })
  } catch (e) {
    if (e instanceof OpenAiError) {
      if (e.code !== "NOT_CONFIGURED") {
        reportServerError(e.message, {
          route: "inquiry-structure",
          code: e.code,
          httpStatus: e.httpStatus,
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
