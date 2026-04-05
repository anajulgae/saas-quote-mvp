import type { AiFeatureKey } from "./openai-config"
import {
  getMaxOutputTokensForFeature,
  getOpenAiTimeoutMs,
  logAiInvocation,
  resolveModelForFeature,
} from "./openai-config"

type ChatRole = "system" | "user" | "assistant"

export type ChatMessage = { role: ChatRole; content: string }

export class OpenAiError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_CONFIGURED"
      | "MODEL_NOT_CONFIGURED"
      | "HTTP"
      | "EMPTY"
      | "JSON"
      | "PARSE"
      | "TIMEOUT",
    readonly httpStatus?: number,
    /** MODEL_NOT_CONFIGURED 시 어떤 env 키가 비었는지 */
    readonly missingEnv?: string
  ) {
    super(message)
    this.name = "OpenAiError"
  }
}

export type JsonChatFeatureRequest<T> = {
  feature: AiFeatureKey
  messages: ChatMessage[]
  parse: (obj: unknown) => T
  maxOutputTokens?: number
  temperature?: number
  /** 로그용: 주 모델 vs fallback */
  phase?: "primary" | "fallback"
  /** 설정 시 기능별 env 대신 이 모델로 호출 (quote-draft fallback 등) */
  modelOverride?: string
}

/**
 * 기능별 모델·max tokens·로깅을 적용한 JSON 전용 채팅 완성.
 * API 라우트는 이 함수만 호출하고, 프롬프트/파서는 라우트(또는 별도 빌더)에서 유지한다.
 */
export async function completeJsonChatForFeature<T>(params: JsonChatFeatureRequest<T>): Promise<T> {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) {
    throw new OpenAiError("OPENAI_API_KEY 가 설정되지 않았습니다.", "NOT_CONFIGURED")
  }

  let model: string
  if (params.modelOverride) {
    model = params.modelOverride
  } else {
    const r = resolveModelForFeature(params.feature)
    if ("missingEnv" in r) {
      throw new OpenAiError(
        `${r.missingEnv}에 사용할 모델명을 설정해 주세요.`,
        "MODEL_NOT_CONFIGURED",
        undefined,
        r.missingEnv
      )
    }
    model = r.model
  }

  const maxOutputTokens = getMaxOutputTokensForFeature(params.feature, params.maxOutputTokens)
  const timeoutMs = getOpenAiTimeoutMs()
  const temperature = params.temperature ?? 0.25
  const phase: "primary" | "fallback" = params.phase ?? (params.modelOverride ? "fallback" : "primary")

  logAiInvocation({
    feature: params.feature,
    model,
    maxOutputTokens,
    phase,
  })

  return runOpenAiJsonChat<T>({
    apiKey: key,
    model,
    messages: params.messages,
    parse: params.parse,
    maxOutputTokens,
    timeoutMs,
    temperature,
  })
}

type RunParams<T> = {
  apiKey: string
  model: string
  messages: ChatMessage[]
  parse: (obj: unknown) => T
  maxOutputTokens: number
  timeoutMs: number
  temperature: number
}

async function runOpenAiJsonChat<T>(p: RunParams<T>): Promise<T> {
  let res: Response
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${p.apiKey}`,
      },
      body: JSON.stringify({
        model: p.model,
        temperature: p.temperature,
        max_tokens: p.maxOutputTokens,
        response_format: { type: "json_object" },
        messages: p.messages,
      }),
      signal: AbortSignal.timeout(p.timeoutMs),
    })
  } catch (e) {
    const name = e instanceof Error ? e.name : ""
    if (name === "TimeoutError" || name === "AbortError") {
      throw new OpenAiError("AI 응답이 지연되어 중단되었습니다. 잠시 후 다시 시도해 주세요.", "TIMEOUT")
    }
    throw e
  }

  if (!res.ok) {
    throw new OpenAiError(`OpenAI 요청 실패 (${res.status})`, "HTTP", res.status)
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const raw = data.choices?.[0]?.message?.content
  if (!raw?.trim()) {
    throw new OpenAiError("응답이 비어 있습니다.", "EMPTY")
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new OpenAiError("JSON 파싱에 실패했습니다.", "JSON")
  }

  try {
    return p.parse(parsed)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "형식 검증 실패"
    throw new OpenAiError(msg, "PARSE")
  }
}
