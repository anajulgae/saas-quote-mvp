import { completeJsonChatForFeature, OpenAiError } from "@/lib/server/openai-chat"

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

export function parseInquiryStructure(
  obj: unknown,
  opts?: { defaultChannel?: string }
): InquiryStructuredPayload {
  if (!obj || typeof obj !== "object") {
    throw new Error("객체 형식이 아닙니다.")
  }
  const o = obj as Record<string, unknown>
  const title = str(o, "title") || str(o, "suggestedTitle")
  const channel = str(o, "channel") || opts?.defaultChannel || "카카오톡"
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
키: title(한 줄), channel(고정값 "웹폼" 권장), scopeSummary(업종·범위 한 줄), structuredSummary(핵심 요약 2~4문장), followUpNote(내부 팔로업 한 줄, 없으면 "").
값은 짧게.`

/**
 * 공개 폼 제출 후 서버에서만 호출. 실패 시 예외 — 호출부에서 삼켜야 함.
 */
export async function runInquiryStructureForPublicForm(rawText: string): Promise<InquiryStructuredPayload> {
  const structured = await completeJsonChatForFeature({
    feature: "inquiry_structure",
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: rawText.slice(0, 8000) },
    ],
    parse: (raw) => parseInquiryStructure(raw, { defaultChannel: "웹폼" }),
  })
  if (!structured.title.trim()) {
    structured.title = "신규 문의"
  }
  return structured
}

export { OpenAiError }
