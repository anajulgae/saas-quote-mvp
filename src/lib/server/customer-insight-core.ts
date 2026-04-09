import { completeJsonChatForFeature } from "@/lib/server/openai-chat"

export type CustomerAiInsightResult = {
  headline: string
  bullets: string[]
  suggestedApproach: string
}

function parseCustomerInsight(obj: unknown): CustomerAiInsightResult {
  if (!obj || typeof obj !== "object") {
    throw new Error("객체 형식이 아닙니다.")
  }
  const o = obj as Record<string, unknown>
  const headline = typeof o.headline === "string" ? o.headline.trim() : ""
  const suggestedApproach = typeof o.suggestedApproach === "string" ? o.suggestedApproach.trim() : ""
  if (!headline || !suggestedApproach) {
    throw new Error("headline 과 suggestedApproach 가 필요합니다.")
  }
  const bullets: string[] = []
  const br = o.bullets
  if (Array.isArray(br)) {
    for (const row of br) {
      if (typeof row === "string" && row.trim()) {
        bullets.push(row.trim())
      }
      if (bullets.length >= 6) {
        break
      }
    }
  }
  return { headline, bullets, suggestedApproach }
}

const SYSTEM_PROMPT = `Bill-IO 고객 인사이트. 한국어 JSON만. 개인정보·주소·전화를 새로 추측하지 말 것.
입력은 해당 고객의 요약된 거래 이력이다. "이번 대응에 도움이 되는" 짧은 통찰만.

출력 키:
- headline: 한 줄
- bullets: 문자열 배열 최대 5개 (반복 패턴·금액대·응답/결제 경향 등)
- suggestedApproach: 2~3문장, 다음 제안/주의`

export async function runCustomerInsightAi(userJson: string): Promise<CustomerAiInsightResult> {
  const content = userJson.length > 8000 ? userJson.slice(0, 8000) + "…" : userJson
  return completeJsonChatForFeature({
    feature: "inquiry_analyze",
    temperature: 0.2,
    maxOutputTokens: 700,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content },
    ],
    parse: parseCustomerInsight,
  })
}
