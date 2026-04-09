import { completeJsonChatForFeature } from "@/lib/server/openai-chat"
import type {
  CollectionComposeKind,
  CollectionToneHint,
  InvoiceCollectionAdvice,
  PaymentStatus,
} from "@/types/domain"

function parseCollectionAdvice(obj: unknown): InvoiceCollectionAdvice {
  if (!obj || typeof obj !== "object") {
    throw new Error("객체 형식이 아닙니다.")
  }
  const o = obj as Record<string, unknown>
  const headline = typeof o.headline === "string" ? o.headline.trim() : ""
  const reason = typeof o.reason === "string" ? o.reason.trim() : ""
  const draftBody = typeof o.draftBody === "string" ? o.draftBody.trim() : ""
  if (!headline || !reason || !draftBody) {
    throw new Error("headline, reason, draftBody 이 필요합니다.")
  }
  const toneRaw = typeof o.suggestedTone === "string" ? o.suggestedTone.trim().toLowerCase() : "neutral"
  const suggestedTone: CollectionToneHint =
    toneRaw === "polite" || toneRaw === "firm" ? toneRaw : "neutral"

  const mk = typeof o.messageKind === "string" ? o.messageKind.trim() : ""
  const allowed: CollectionComposeKind[] = [
    "invoice_notice",
    "invoice_balance_request",
    "overdue_reminder",
    "overdue_reminder_second",
    "post_promise_nudge",
    "followup_due_nudge",
  ]
  const messageKind = allowed.includes(mk as CollectionComposeKind)
    ? (mk as CollectionComposeKind)
    : "invoice_notice"

  const draftSubject =
    typeof o.draftSubject === "string" && o.draftSubject.trim() ? o.draftSubject.trim() : undefined

  const checklist: string[] = []
  if (Array.isArray(o.checklist)) {
    for (const row of o.checklist) {
      if (typeof row === "string" && row.trim()) {
        checklist.push(row.trim())
      }
      if (checklist.length >= 6) {
        break
      }
    }
  }

  if (draftBody.length > 4000) {
    throw new Error("draftBody 가 너무 깁니다.")
  }

  return {
    headline,
    reason,
    suggestedTone,
    messageKind,
    draftSubject,
    draftBody,
    checklist,
  }
}

const SYSTEM_PROMPT = `Bill-IO 청구·추심 어시스턴트. 한국어 JSON만. 에세이 금지.
입력은 청구·고객·리마인드 맥락이다. "지금 무엇을 해야 하는지"를 운영자에게 알려준다.

출력 키:
- headline: 한 줄 권장 액션 제목
- reason: 2~3문장, 왜 이 조치인지(상태·기한·약속일·리마인드 이력 반영)
- suggestedTone: polite | neutral | firm
- messageKind: 아래 중 정확히 하나
  - invoice_notice (첫 청구·입금 안내)
  - invoice_balance_request (부분 입금 후 잔금)
  - overdue_reminder (연체 1차)
  - overdue_reminder_second (연체 2차·재촉)
  - post_promise_nudge (약속 입금일 이후 재안내)
  - followup_due_nudge (다음 연락 예정일 도래·후속)
- draftSubject: 선택, 이메일 제목 후보(≤80자)
- draftBody: 필수, 고객에게 보낼 본문 초안(≤1200자), 과장·협박 금지
- checklist: 문자열 배열, 운영자가 할 일 2~5개(짧게)`

export type CollectionAdviceInput = {
  paymentStatus: PaymentStatus
  amount: number
  dueDate?: string
  paidAt?: string
  promisedPaymentDate?: string
  nextCollectionFollowupAt?: string
  invoiceTypeLabel: string
  customerLabel: string
  reminderCount: number
  lastReminderAt?: string
  collectionToneDefault?: CollectionToneHint
}

export async function runCollectionAdviceAi(input: CollectionAdviceInput): Promise<InvoiceCollectionAdvice> {
  const ctx = {
    paymentStatus: input.paymentStatus,
    amountWon: input.amount,
    dueDate: input.dueDate ?? null,
    paidAt: input.paidAt ?? null,
    promisedPaymentDate: input.promisedPaymentDate ?? null,
    nextCollectionFollowupAt: input.nextCollectionFollowupAt ?? null,
    invoiceType: input.invoiceTypeLabel,
    customer: input.customerLabel,
    reminderCount: input.reminderCount,
    lastReminderAt: input.lastReminderAt ?? null,
    defaultTone: input.collectionToneDefault ?? "neutral",
  }
  let ctxJson = JSON.stringify(ctx)
  if (ctxJson.length > 6000) {
    ctxJson = ctxJson.slice(0, 6000) + "…"
  }

  return completeJsonChatForFeature({
    feature: "collection_advice",
    temperature: 0.25,
    maxOutputTokens: 900,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: ctxJson },
    ],
    parse: parseCollectionAdvice,
  })
}
