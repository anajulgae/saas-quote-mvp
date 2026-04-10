import { NextResponse } from "next/server"

import { reportServerError } from "@/lib/observability"
import { guardAiPost } from "@/lib/server/ai-route-guard"
import { bumpUserUsage, logAiUsageActivity } from "@/lib/server/usage-bump"
import { completeJsonChatForFeature, OpenAiError } from "@/lib/server/openai-chat"
import { openAiErrorUserPayload } from "@/lib/server/openai-user-errors"

type Kind =
  | "quote_send"
  | "invoice_notice"
  | "invoice_balance_request"
  | "overdue_reminder"
  | "overdue_reminder_second"
  | "post_promise_nudge"
  | "followup_due_nudge"

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
  if (body.length > 4000) {
    throw new Error("body 가 너무 깁니다.")
  }
  return { subject, body }
}

const toneLabel: Record<Tone, string> = {
  polite: "매우 정중·간결",
  neutral: "업무적·짧게",
  firm: "단호·무례 금지, 사실 위주",
}

/** 한 줄 지시 — 토큰 절약 */
const kindLine: Record<Kind, string> = {
  quote_send: "견적 메일: 인사+본문+맺음. URL 있으면 1회만 포함.",
  invoice_notice: "첫 청구·입금 안내: 금액·기한·계좌 맥락 반영, 과장 없음.",
  invoice_balance_request: "부분 입금 확인 후 잔금 요청: 이미 납부된 부분 언급, 잔액·기한 명확히.",
  overdue_reminder: "연체 1차 안내: 납부 재확인, 짧고 사실 위주.",
  overdue_reminder_second: "연체 2차 안내: 재촉이지만 무례 금지, 다음 조치·기한 제시.",
  post_promise_nudge: "약속 입금일 이후 재안내: 약속일 상기, 확인 요청.",
  followup_due_nudge: "예정된 후속 연락 시점: 정중히 입금·일정 확인.",
}

const SYSTEM_PREFIX = `한국어 비즈니스 문구. JSON만. 키: subject(선택,≤80자), body(필수,≤1200자, 이메일·문자용). 장황한 마케팅 금지.`

export async function POST(req: Request) {
  const g = await guardAiPost()
  if (!g.ok) {
    return g.response
  }
  const { auth, supabase } = g.ctx

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
    const allowed: Kind[] = [
      "quote_send",
      "invoice_notice",
      "invoice_balance_request",
      "overdue_reminder",
      "overdue_reminder_second",
      "post_promise_nudge",
      "followup_due_nudge",
    ]
    if (!allowed.includes(kind)) {
      throw new Error("kind")
    }
    if (!["polite", "neutral", "firm"].includes(tone)) {
      tone = "neutral"
    }
  } catch {
    return NextResponse.json({ error: "요청이 올바르지 않습니다." }, { status: 400 })
  }

  let ctxJson = JSON.stringify(context)
  if (ctxJson.length > 5000) {
    ctxJson = ctxJson.slice(0, 5000) + "…"
  }

  const system = `${SYSTEM_PREFIX}
톤: ${toneLabel[tone]}.
${kindLine[kind]}`

  try {
    const message = await completeJsonChatForFeature({
      feature: "compose_message",
      temperature: 0.25,
      messages: [
        { role: "system", content: system },
        { role: "user", content: ctxJson },
      ],
      parse: parseMessage,
    })

    void bumpUserUsage(supabase, "ai")
    void logAiUsageActivity(supabase, {
      userId: auth.userId,
      action: "ai.compose_message",
      description: `Generated an AI message for ${kind}.`,
      metadata: {
        kind,
        tone,
      },
    })
    return NextResponse.json({ ok: true as const, message })
  } catch (e) {
    if (e instanceof OpenAiError) {
      if (e.code !== "NOT_CONFIGURED" && e.code !== "MODEL_NOT_CONFIGURED") {
        reportServerError(e.message, {
          route: "compose-message",
          code: e.code,
          httpStatus: e.httpStatus,
          missingEnv: e.missingEnv,
        })
      }
      const { error, status } = openAiErrorUserPayload(e)
      const msg =
        e.code === "EMPTY" || e.code === "JSON" || e.code === "PARSE"
          ? "문구 생성에 실패했습니다. 잠시 후 다시 시도하거나 제목·본문을 직접 입력해 주세요."
          : error
      return NextResponse.json({ error: msg }, { status })
    }
    reportServerError(e instanceof Error ? e.message : "unknown", { route: "compose-message" })
    return NextResponse.json({ error: "문구 생성에 실패했습니다." }, { status: 502 })
  }
}
