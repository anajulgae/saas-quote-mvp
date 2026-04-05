type ChatRole = "system" | "user" | "assistant"

export type ChatMessage = { role: ChatRole; content: string }

export class OpenAiError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_CONFIGURED" | "HTTP" | "EMPTY" | "JSON" | "PARSE" | "TIMEOUT",
    /** set when code === "HTTP" — used for user-facing hints */
    readonly httpStatus?: number
  ) {
    super(message)
    this.name = "OpenAiError"
  }
}

export async function completeJsonChat<T>(messages: ChatMessage[], parse: (obj: unknown) => T): Promise<T> {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) {
    throw new OpenAiError("OPENAI_API_KEY 가 설정되지 않았습니다.", "NOT_CONFIGURED")
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini"
  const timeoutMs = Math.min(Math.max(Number(process.env.OPENAI_TIMEOUT_MS ?? "55000") || 55000, 5000), 120000)

  let res: Response
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        response_format: { type: "json_object" },
        messages,
      }),
      signal: AbortSignal.timeout(timeoutMs),
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
    return parse(parsed)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "형식 검증 실패"
    throw new OpenAiError(msg, "PARSE")
  }
}
