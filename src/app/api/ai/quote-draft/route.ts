import { NextResponse } from "next/server"

import { planAllowsFeature } from "@/lib/plan-features"
import { reportServerError } from "@/lib/observability"
import { getAuthenticatedUserForApi } from "@/lib/server/api-auth"
import {
  getFallbackModel,
  isQuoteDraftFallbackEnabled,
} from "@/lib/server/openai-config"
import { completeJsonChatForFeature, OpenAiError } from "@/lib/server/openai-chat"
import { openAiErrorUserPayload } from "@/lib/server/openai-user-errors"

type QuoteLineItem = { name: string; description: string; quantity: string; unitPrice: string }

type Body = {
  serviceCategory?: string
  scope?: string
  tone?: string
  paymentTermsHint?: string
}

/** 클라이언트(견적 폼)가 기대하는 형태 — lineItems·결제·안내는 서버에서 summary로 합침 */
export type QuoteDraftClientPayload = {
  title: string
  summary: string
  items: QuoteLineItem[]
}

function parseLineItemRow(row: unknown): QuoteLineItem | null {
  if (!row || typeof row !== "object") {
    return null
  }
  const r = row as Record<string, unknown>
  const name = typeof r.name === "string" ? r.name.trim() : ""
  if (!name) {
    return null
  }
  return {
    name,
    description: typeof r.description === "string" ? r.description.trim() : "",
    quantity:
      typeof r.quantity === "string" || typeof r.quantity === "number" ? String(r.quantity) : "1",
    unitPrice:
      typeof r.unitPrice === "string" || typeof r.unitPrice === "number" ? String(r.unitPrice) : "0",
  }
}

/**
 * AI 계약: title, summary, lineItems[], paymentTerms, noteToCustomer
 * (구 키 items / paymentTermsNote / guidanceNote 호환)
 */
function parseDraft(obj: unknown): QuoteDraftClientPayload {
  if (!obj || typeof obj !== "object") {
    throw new Error("객체 형식이 아닙니다.")
  }
  const o = obj as Record<string, unknown>
  const title = typeof o.title === "string" ? o.title.trim() : ""
  let summary = typeof o.summary === "string" ? o.summary.trim() : ""

  const paymentTerms =
    typeof o.paymentTerms === "string"
      ? o.paymentTerms.trim()
      : typeof o.paymentTermsNote === "string"
        ? o.paymentTermsNote.trim()
        : ""
  const noteToCustomer =
    typeof o.noteToCustomer === "string"
      ? o.noteToCustomer.trim()
      : typeof o.guidanceNote === "string"
        ? o.guidanceNote.trim()
        : ""

  const itemsRaw = o.lineItems ?? o.items
  const items: QuoteLineItem[] = []
  if (Array.isArray(itemsRaw)) {
    for (const row of itemsRaw) {
      const it = parseLineItemRow(row)
      if (it) {
        items.push(it)
      }
    }
  }

  if (!title) {
    throw new Error("title 이 비어 있습니다.")
  }
  if (!summary) {
    throw new Error("summary 가 비어 있습니다.")
  }
  if (!items.length) {
    throw new Error("lineItems 가 비어 있습니다.")
  }

  const parts = [summary]
  if (paymentTerms) {
    parts.push("", "■ 결제 조건", paymentTerms)
  }
  if (noteToCustomer) {
    parts.push("", "■ 고객 안내", noteToCustomer)
  }
  summary = parts.join("\n")

  return { title, summary, items }
}

const SYSTEM_PROMPT = `한국 소사업자 견적 초안. JSON만. 장문 설명 금지.
키: title(짧게), summary(범위·산출물·일정 2~4문장), lineItems[{name,description,quantity,unitPrice}](1~8개, 금액 불명시 unitPrice "0"), paymentTerms(한 문단), noteToCustomer(한 문단 이하).`

function buildUserMessage(serviceCategory: string, scope: string, tone: string, paymentTermsHint: string): string {
  return [
    `유형: ${serviceCategory}`,
    `범위:\n${scope || "(일반 제안)"}`,
    `톤: ${tone}`,
    paymentTermsHint ? `기본 결제 힌트: ${paymentTermsHint}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
}

function shouldTryQuoteFallback(e: unknown): boolean {
  if (!(e instanceof OpenAiError)) {
    return false
  }
  return e.code === "HTTP" || e.code === "EMPTY" || e.code === "JSON" || e.code === "PARSE" || e.code === "TIMEOUT"
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

  const userMsg = buildUserMessage(serviceCategory, scope, tone, paymentTermsHint)

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: userMsg.slice(0, 12_000) },
  ]

  try {
    let draft: QuoteDraftClientPayload
    try {
      draft = await completeJsonChatForFeature({
        feature: "quote_draft",
        temperature: 0.35,
        messages,
        parse: parseDraft,
        phase: "primary",
      })
    } catch (primary) {
      if (!shouldTryQuoteFallback(primary) || !isQuoteDraftFallbackEnabled()) {
        throw primary
      }
      const fbModel = getFallbackModel()
      if (!fbModel) {
        throw primary
      }
      reportServerError(primary instanceof Error ? primary.message : "quote-draft primary failed", {
        route: "quote-draft",
        phase: "fallback_retry",
        fallbackModel: fbModel,
      })
      draft = await completeJsonChatForFeature({
        feature: "quote_draft",
        temperature: 0.35,
        messages,
        parse: parseDraft,
        phase: "fallback",
        modelOverride: fbModel,
      })
    }

    return NextResponse.json({ ok: true as const, draft })
  } catch (e) {
    if (e instanceof OpenAiError) {
      if (e.code !== "NOT_CONFIGURED" && e.code !== "MODEL_NOT_CONFIGURED") {
        reportServerError(e.message, {
          route: "quote-draft",
          code: e.code,
          httpStatus: e.httpStatus,
          missingEnv: e.missingEnv,
        })
      }
      const { error, status } = openAiErrorUserPayload(e)
      const msg =
        e.code === "EMPTY" || e.code === "JSON" || e.code === "PARSE"
          ? "초안 생성에 실패했습니다. 잠시 후 다시 시도하거나 항목을 직접 입력해 주세요."
          : error
      return NextResponse.json({ error: msg }, { status })
    }
    reportServerError(e instanceof Error ? e.message : "unknown", { route: "quote-draft" })
    return NextResponse.json({ error: "초안 생성에 실패했습니다." }, { status: 502 })
  }
}
