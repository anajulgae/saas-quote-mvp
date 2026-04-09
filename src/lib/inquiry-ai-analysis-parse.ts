import type {
  InquiryAiAnalysis,
  InquiryAiNextActionKind,
  InquiryAiRequestType,
  InquiryAiUrgency,
} from "@/types/domain"

const REQUEST_TYPES: InquiryAiRequestType[] = [
  "new_quote_request",
  "general_inquiry",
  "schedule_coordination",
  "re_inquiry",
  "as_revision",
  "other",
]

const URGENCY: InquiryAiUrgency[] = ["high", "medium", "low"]

const ACTION_KINDS: InquiryAiNextActionKind[] = [
  "convert_quote",
  "complete_customer_info",
  "confirm_schedule",
  "confirm_budget",
  "followup_call",
  "internal_review",
  "other",
]

function asRequestType(v: unknown): InquiryAiRequestType {
  return REQUEST_TYPES.includes(v as InquiryAiRequestType) ? (v as InquiryAiRequestType) : "other"
}

function asUrgency(v: unknown): InquiryAiUrgency {
  return URGENCY.includes(v as InquiryAiUrgency) ? (v as InquiryAiUrgency) : "medium"
}

function asActionKind(v: unknown): InquiryAiNextActionKind {
  return ACTION_KINDS.includes(v as InquiryAiNextActionKind) ? (v as InquiryAiNextActionKind) : "other"
}

/**
 * DB `ai_analysis` JSON 또는 AI 원본 객체를 안전히 `InquiryAiAnalysis`로 변환.
 * 실패 시 `undefined` (기존 업무 흐름은 계속 동작).
 */
export function parseInquiryAiAnalysisFromJson(value: unknown): InquiryAiAnalysis | undefined {
  if (!value || typeof value !== "object") {
    return undefined
  }
  const o = value as Record<string, unknown>
  const summary = typeof o.summary === "string" ? o.summary.trim() : ""
  if (!summary) {
    return undefined
  }
  const requestTypeLabel =
    typeof o.requestTypeLabel === "string" && o.requestTypeLabel.trim()
      ? o.requestTypeLabel.trim()
      : typeof o.requestTypeLabelKo === "string" && o.requestTypeLabelKo.trim()
        ? o.requestTypeLabelKo.trim()
        : "기타"

  const questionsRaw = o.suggestedQuestions
  const suggestedQuestions: string[] = []
  if (Array.isArray(questionsRaw)) {
    for (const q of questionsRaw) {
      if (typeof q === "string" && q.trim()) {
        suggestedQuestions.push(q.trim())
      }
      if (suggestedQuestions.length >= 8) {
        break
      }
    }
  }

  const actionsRaw = o.nextActions
  const nextActions: InquiryAiAnalysis["nextActions"] = []
  if (Array.isArray(actionsRaw)) {
    for (const row of actionsRaw) {
      if (!row || typeof row !== "object") {
        continue
      }
      const a = row as Record<string, unknown>
      const label = typeof a.label === "string" ? a.label.trim() : ""
      if (!label) {
        continue
      }
      const reason = typeof a.reason === "string" ? a.reason.trim() : ""
      const pr = typeof a.priority === "number" && Number.isFinite(a.priority) ? a.priority : 99
      nextActions.push({
        kind: asActionKind(a.kind),
        label,
        reason,
        priority: pr,
      })
    }
  }
  nextActions.sort((x, y) => x.priority - y.priority)

  const quoteHint =
    typeof o.quoteConversionHint === "string"
      ? o.quoteConversionHint.trim()
      : typeof o.quoteConversionHintKo === "string"
        ? o.quoteConversionHintKo.trim()
        : ""

  return {
    requestType: asRequestType(o.requestType),
    requestTypeLabel,
    urgency: asUrgency(o.urgency),
    summary,
    suggestedQuestions,
    nextActions,
    followupPriority: asUrgency(o.followupPriority ?? o.urgency),
    quoteConversionReady: Boolean(o.quoteConversionReady),
    quoteConversionHint: quoteHint || (o.quoteConversionReady ? "견적 작성을 검토해 보세요." : "추가 확인 후 견적 전환을 판단하세요."),
    industryContextNote:
      typeof o.industryContextNote === "string" && o.industryContextNote.trim()
        ? o.industryContextNote.trim()
        : undefined,
  }
}
