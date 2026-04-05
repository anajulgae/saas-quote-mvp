import { NextResponse } from "next/server"

import { planAllowsFeature } from "@/lib/plan-features"
import { reportServerError } from "@/lib/observability"
import { getAuthenticatedUserForApi } from "@/lib/server/api-auth"
import { completeJsonChat, OpenAiError } from "@/lib/server/openai-chat"

type Kind = "quote_send" | "invoice_notice" | "overdue_reminder"

type Tone = "polite" | "neutral" | "firm"

function parseMessage(obj: unknown): { subject?: string; body: string } {
  if (!obj || typeof obj !== "object") {
    throw new Error("객체 형식이 아닙니다.")
  }
  const o = obj as Record<string, unknown>
  const body = typeof o.body === "string" ? o.body.trim() : ""
  if (!body) {
    throw new Error("body 가 비어 있습니다.")
  }
  const subject = typeof o.subject === "string" ? o.subject.trim() : undefined
  return { subject, body }
}

const toneLabel: Record<Tone, string> = {
  polite: "매우 정중하고 부드럽게",
  neutral: "간결하고 업무적으로",
  firm: "단호하되 무례하지 않게, 연체·독촉 맥락에 맞게",
}

export async function POST(req: Request) {
  const auth = await getAuthenticatedUserForApi()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  if (!planAllowsFeature(auth.plan, "ai_assist")) {
    return NextResponse.json({ error: "현재 플랜에서 AI 기능을 사용할 수 없습니다." }, { status: 403 })
  }

  let kind: Kind
  let tone: Tone
  let context: Record<string, unknown>
  try {
    const body = (await req.json()) as {
      kind?: string
      tone?: string
      context?: Record<string, unknown>
    }
    kind = body.kind as Kind
    tone = (body.tone as Tone) || "neutral"
    context = body.context ?? {}
    if (!["quote_send", "invoice_notice", "overdue_reminder"].includes(kind)) {
      throw new Error("kind")
    }
    if (!["polite", "neutral", "firm"].includes(tone)) {
      tone = "neutral"
    }
  } catch {
    return NextResponse.json({ error: "요청이 올바르지 않습니다." }, { status: 400 })
  }

  const ctxJson = JSON.stringify(context, null, 0)

  const kindInstruction: Record<Kind, string> = {
    quote_send:
      "견적서 이메일 본문. 제목 제안도 함께. 링크 URL이 있으면 본문에 자연스럽게 포함. 인사·맺음말 포함.",
    invoice_notice: "청구·입금 안내 문자/이메일에 붙이기 좋은 짧은~중간 길이 본문. 계좌·금액·기한 반영.",
    overdue_reminder: "미수·연체 리마인드. 납부 재확인 요청. 과장 없이 사실 위주.",
  }

  const system = `한국어 비즈니스 문구 작성. JSON만 출력: subject(제목, 선택), body(본문 전체, 이메일·문자·카카오 붙여넣기용).
톤: ${toneLabel[tone]}.
용도: ${kindInstruction[kind]}`

  try {
    const message = await completeJsonChat(
      [
        { role: "system", content: system },
        { role: "user", content: `맥락(JSON): ${ctxJson}` },
      ],
      parseMessage
    )

    return NextResponse.json({ ok: true as const, message })
  } catch (e) {
    if (e instanceof OpenAiError) {
      if (e.code === "NOT_CONFIGURED") {
        return NextResponse.json({ error: "AI 기능이 설정되지 않았습니다." }, { status: 503 })
      }
      if (e.code === "TIMEOUT") {
        return NextResponse.json(
          { error: "AI 응답이 너무 오래 걸렸습니다. 잠시 후 다시 시도해 주세요." },
          { status: 504 }
        )
      }
      reportServerError(e.message, { route: "compose-message", code: e.code })
      return NextResponse.json({ error: "문구 생성에 실패했습니다." }, { status: 502 })
    }
    reportServerError(e instanceof Error ? e.message : "unknown", { route: "compose-message" })
    return NextResponse.json({ error: "문구 생성에 실패했습니다." }, { status: 502 })
  }
}
