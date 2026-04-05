import type { OpenAiError } from "./openai-chat"

/** Maps OpenAI layer errors to safe Korean copy for API JSON `{ error }`. */
export function openAiErrorUserPayload(e: OpenAiError): { error: string; status: number } {
  switch (e.code) {
    case "NOT_CONFIGURED":
      return {
        error:
          "AI가 아직 연결되지 않았습니다. Vercel(또는 서버) 환경 변수에 OPENAI_API_KEY를 넣고 재배포한 뒤 다시 시도해 주세요.",
        status: 503,
      }
    case "TIMEOUT":
      return {
        error: "AI 응답이 너무 오래 걸렸습니다. 잠시 후 다시 시도해 주세요.",
        status: 504,
      }
    case "HTTP": {
      const s = e.httpStatus ?? 0
      if (s === 401) {
        return {
          error:
            "OpenAI API 키가 올바르지 않습니다. OPENAI_API_KEY를 확인하거나 새 키로 바꾼 뒤 재배포해 주세요.",
          status: 502,
        }
      }
      if (s === 429) {
        return {
          error:
            "OpenAI 사용 한도에 도달했습니다. 잠시 후 다시 시도하거나 OpenAI 결제·한도를 확인해 주세요.",
          status: 429,
        }
      }
      if (s === 503 || s === 502) {
        return {
          error: "OpenAI 서비스가 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요.",
          status: 503,
        }
      }
      return {
        error: `AI 요청이 거절되었습니다(HTTP ${s}). 모델 이름·과금·프로젝트 설정을 확인해 주세요.`,
        status: 502,
      }
    }
    case "EMPTY":
    case "JSON":
    case "PARSE":
      return {
        error: "AI가 예상한 형식으로 답하지 못했습니다. 다시 시도하거나 제목·본문을 직접 입력해 주세요.",
        status: 502,
      }
    default:
      return {
        error: "AI 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        status: 502,
      }
  }
}
