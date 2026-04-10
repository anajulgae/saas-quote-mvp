import { NextResponse } from "next/server"

import { reportServerError } from "@/lib/observability"
import { guardAiPost } from "@/lib/server/ai-route-guard"
import { bumpUserUsage, logAiUsageActivity } from "@/lib/server/usage-bump"
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
  /** 업종·서비스 맥락 힌트(문의 service_category 등) */
  industryHint?: string
}

/** 클라이언트(견적 폼)가 기대하는 형태 — lineItems·결제·안내는 서버에서 summary로 합침 */
export type QuoteDraftClientPayload = {
  title: string
  summary: string
  items: QuoteLineItem[]
  /** 옵션·부가 항목(견적서에 선택 반영) */
  optionalItems: QuoteLineItem[]
  /** 납기·작업 범위·수정 횟수 등 (요약 본문에 포함) */
  deliveryScopeNotes?: string
  /** 업종별 유의 문구 (요약 본문에 포함) */
  industryCaveats?: string
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

  const deliveryScopeNotes =
    typeof o.deliveryScopeNotes === "string"
      ? o.deliveryScopeNotes.trim()
      : typeof o.scopeDeliveryNotes === "string"
        ? o.scopeDeliveryNotes.trim()
        : ""

  const industryCaveats =
    typeof o.industryCaveats === "string"
      ? o.industryCaveats.trim()
      : typeof o.industryNotes === "string"
        ? o.industryNotes.trim()
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

  const optRaw = o.optionalLineItems ?? o.optionLineItems ?? o.options
  const optionalItems: QuoteLineItem[] = []
  if (Array.isArray(optRaw)) {
    for (const row of optRaw) {
      const it = parseLineItemRow(row)
      if (it) {
        optionalItems.push(it)
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
  if (deliveryScopeNotes) {
    parts.push("", "■ 납기·작업 범위", deliveryScopeNotes)
  }
  if (paymentTerms) {
    parts.push("", "■ 결제 조건", paymentTerms)
  }
  if (noteToCustomer) {
    parts.push("", "■ 고객 안내", noteToCustomer)
  }
  if (industryCaveats) {
    parts.push("", "■ 업종·유의사항", industryCaveats)
  }
  summary = parts.join("\n")

  return {
    title,
    summary,
    items,
    optionalItems,
    deliveryScopeNotes: deliveryScopeNotes || undefined,
    industryCaveats: industryCaveats || undefined,
  }
}

const SYSTEM_PROMPT = `한국 소사업자 견적서 초안(실제 발송 가능한 수준). JSON만. 에세이·마케팅 과장 금지.
키:
- title: 견적 제목(짧고 구체적으로)
- summary: 범위·산출물·일정·검수 흐름 2~5문장
- lineItems: [{name,description,quantity,unitPrice}] 필수 포함 항목 1~6개 (금액 불명시 unitPrice "0")
- optionalLineItems: 옵션·부가 항목 0~4개 (같은 스키마)
- paymentTerms: 선금/잔금·세금계산서 등 한 문단
- noteToCustomer: 고객 안내·연락 방법 한 문단 이하
- deliveryScopeNotes: 납기, 수정 횟수, 범위 변경 시 조건 등 한 문단
- industryCaveats: 업종별 주의(없으면 빈 문자열)
업종 힌트가 있으면 industryCaveats·deliveryScopeNotes에 반영.`

function buildUserMessage(
  serviceCategory: string,
  scope: string,
  tone: string,
  paymentTermsHint: string,
  industryHint: string
): string {
  return [
    `유형(서비스): ${serviceCategory}`,
    industryHint ? `업종·맥락 힌트: ${industryHint}` : "",
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
  const g = await guardAiPost()
  if (!g.ok) {
    return g.response
  }
  const { auth, supabase } = g.ctx

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
  const industryHint = String(body.industryHint ?? "").trim()

  const userMsg = buildUserMessage(serviceCategory, scope, tone, paymentTermsHint, industryHint)

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

    void bumpUserUsage(supabase, "ai")
    void logAiUsageActivity(supabase, {
      userId: auth.userId,
      action: "ai.quote_draft",
      description: `Generated an AI quote draft for ${serviceCategory}.`,
      metadata: {
        serviceCategory,
        hasIndustryHint: Boolean(industryHint),
      },
    })
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
