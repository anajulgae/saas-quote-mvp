import { completeJsonChatForFeature } from "@/lib/server/openai-chat"
import { parseInquiryAiAnalysisFromJson } from "@/lib/inquiry-ai-analysis-parse"
import type { InquiryAiAnalysis, InquiryStage } from "@/types/domain"

export { parseInquiryAiAnalysisFromJson }

const SYSTEM_PROMPT = `당신은 한국 소상공인·프리랜서용 CRM(Bill-IO)의 문의 트리아지 어시스턴트다.
운영자가 "지금 무엇을 해야 하는지" 바로 판단하도록 구조화된 JSON만 출력한다. 설명 문장·마크다운 금지.

키(필수):
- requestType: 다음 중 하나의 문자열만: new_quote_request | general_inquiry | schedule_coordination | re_inquiry | as_revision | other
- requestTypeLabel: 한글 짧은 라벨(예: 신규 견적 요청)
- urgency: high | medium | low (고객 기대 납기·예산 명확성·리스크 반영)
- summary: 2~4문장, 사실 위주
- suggestedQuestions: 문자열 배열, 최대 5개, 고객에게 물어볼 짧은 질문
- nextActions: 배열, 각 원소는 { kind, label, reason, priority(숫자 작을수록 먼저) }
  kind는 반드시 다음 중 하나: convert_quote | complete_customer_info | confirm_schedule | confirm_budget | followup_call | internal_review | other
- followupPriority: high | medium | low
- quoteConversionReady: boolean (견적 초안을 바로 만들어도 되는지)
- quoteConversionHint: 한 문장(왜 그렇게 판단했는지)
- industryContextNote: 선택, 업종·서비스_category 맥락에서 현장 주의 한 줄(없으면 "")

업종 힌트가 있으면 industryContextNote와 summary에 반영하되 개인식별정보는 넣지 않는다.`

export type InquiryAnalyzeInput = {
  title: string
  details: string
  serviceCategory: string
  channel: string
  stage: InquiryStage
  budgetMin?: number
  budgetMax?: number
  followUpAt?: string
  /** 서비스 분류·업종 힌트(설정 없이도 문의 데이터에서 전달) */
  industryHint?: string
}

function buildUserContent(input: InquiryAnalyzeInput): string {
  const budget =
    input.budgetMin != null || input.budgetMax != null
      ? `예산: ${input.budgetMin ?? "?"} ~ ${input.budgetMax ?? "?"} (원 단위로 가정)`
      : "예산: 미기재"
  const fu = input.followUpAt ? `팔로업 예정: ${input.followUpAt}` : "팔로업 예정: 없음"
  const hint = input.industryHint?.trim() ? `업종·서비스 힌트: ${input.industryHint.trim()}` : ""

  return [
    `제목: ${input.title}`,
    `채널: ${input.channel}`,
    `서비스 분류: ${input.serviceCategory}`,
    `단계(stage): ${input.stage}`,
    budget,
    fu,
    hint,
    "",
    "문의 본문:",
    input.details.trim() || "(본문 없음)",
  ]
    .filter(Boolean)
    .join("\n")
}

export async function runInquiryAiAnalysis(input: InquiryAnalyzeInput): Promise<InquiryAiAnalysis> {
  const userContent = buildUserContent(input).slice(0, 12_000)
  const raw = await completeJsonChatForFeature({
    feature: "inquiry_analyze",
    temperature: 0.2,
    maxOutputTokens: 900,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    parse: (obj: unknown) => {
      const parsed = parseInquiryAiAnalysisFromJson(obj)
      if (!parsed) {
        throw new Error("AI 분석 형식이 올바르지 않습니다.")
      }
      return parsed
    },
  })
  return raw
}
