import { NextResponse } from "next/server"

import { planAllowsFeature } from "@/lib/plan-features"
import { reportServerError } from "@/lib/observability"
import { getAuthenticatedUserForApi } from "@/lib/server/api-auth"
import { completeJsonChat, OpenAiError } from "@/lib/server/openai-chat"

type QuoteDraftItem = { name: string; description: string; quantity: string; unitPrice: string }

type Body = {
  serviceCategory?: string
  scope?: string
  tone?: string
  paymentTermsHint?: string
}

function parseDraft(obj: unknown): {
  title: string
  summary: string
  items: QuoteDraftItem[]
  paymentTermsNote?: string
  guidanceNote?: string
} {
  if (!obj || typeof obj !== "object") {
    throw new Error("객체 형식이 아닙니다.")
  }
  const o = obj as Record<string, unknown>
  const title = typeof o.title === "string" ? o.title.trim() : ""
  let summary = typeof o.summary === "string" ? o.summary.trim() : ""
  const paymentTermsNote = typeof o.paymentTermsNote === "string" ? o.paymentTermsNote.trim() : ""
  const guidanceNote = typeof o.guidanceNote === "string" ? o.guidanceNote.trim() : ""

  if (paymentTermsNote || guidanceNote) {
    const parts = [summary]
    if (paymentTermsNote) {
      parts.push("", "■ 결제 조건(안)", paymentTermsNote)
    }
    if (guidanceNote) {
      parts.push("", "■ 안내", guidanceNote)
    }
    summary = parts.filter(Boolean).join("\n")
  }

  const itemsRaw = o.items
  const items: QuoteDraftItem[] = []
  if (Array.isArray(itemsRaw)) {
    for (const row of itemsRaw) {
      if (!row || typeof row !== "object") {
        continue
      }
      const r = row as Record<string, unknown>
      items.push({
        name: typeof r.name === "string" ? r.name : "항목",
        description: typeof r.description === "string" ? r.description : "",
        quantity: typeof r.quantity === "string" || typeof r.quantity === "number" ? String(r.quantity) : "1",
        unitPrice:
          typeof r.unitPrice === "string" || typeof r.unitPrice === "number" ? String(r.unitPrice) : "0",
      })
    }
  }

  if (!title) {
    throw new Error("title 이 비어 있습니다.")
  }
  if (!summary) {
    throw new Error("summary 가 비어 있습니다.")
  }
  if (!items.length) {
    throw new Error("items 가 비어 있습니다.")
  }

  return { title, summary, items, paymentTermsNote, guidanceNote }
}

export async function POST(req: Request) {
  const auth = await getAuthenticatedUserForApi()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  if (!planAllowsFeature(auth.plan, "ai_assist")) {
    return NextResponse.json({ error: "현재 플랜에서 AI 초안을 사용할 수 없습니다." }, { status: 403 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 })
  }

  const serviceCategory = String(body.serviceCategory ?? "").trim() || "프로젝트"
  const scope = String(body.scope ?? "").trim()
  const tone = String(body.tone ?? "").trim() || "전문적이고 신뢰감 있는"
  const paymentTermsHint = String(body.paymentTermsHint ?? "").trim()

  const system = `당신은 한국 소규모 사업자용 견적 작성 도우미입니다. JSON만 출력합니다.
키: title(짧은 견적 제목), summary(본문 요약·범위·유의사항 등 여러 문단), items(배열: name, description, quantity 문자열, unitPrice 문자열 숫자만),
paymentTermsNote(결제·선금 조건 문장), guidanceNote(고객 안내 한두 문단).
금액이 불명확하면 unitPrice는 "0"으로 두고 설명에 반영하세요.`

  const userMsg = [
    `서비스 유형: ${serviceCategory}`,
    `작업 범위·요청:\n${scope || "(입력 없음 — 일반적인 제안 초안)"}`,
    `문체·톤: ${tone}`,
    paymentTermsHint ? `사업장 기본 결제 조건(참고): ${paymentTermsHint}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")

  try {
    const draft = await completeJsonChat(
      [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      parseDraft
    )

    return NextResponse.json({ ok: true as const, draft })
  } catch (e) {
    if (e instanceof OpenAiError) {
      if (e.code === "NOT_CONFIGURED") {
        return NextResponse.json(
          { error: "AI 기능이 아직 설정되지 않았습니다. 관리자에게 OPENAI_API_KEY 설정을 요청해 주세요." },
          { status: 503 }
        )
      }
      if (e.code === "TIMEOUT") {
        return NextResponse.json(
          { error: "AI 응답이 너무 오래 걸렸습니다. 잠시 후 다시 시도해 주세요." },
          { status: 504 }
        )
      }
      reportServerError(e.message, { route: "quote-draft", code: e.code })
      return NextResponse.json({ error: "초안 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." }, { status: 502 })
    }
    reportServerError(e instanceof Error ? e.message : "unknown", { route: "quote-draft" })
    return NextResponse.json({ error: "초안 생성에 실패했습니다." }, { status: 502 })
  }
}
