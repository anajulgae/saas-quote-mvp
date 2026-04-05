/**
 * 기능별 OpenAI 모델·출력 한도 — 전부 환경 변수 (하드코딩 금지).
 * 운영에서 모델만 바꿀 때는 Vercel env 와 이 파일의 ENV 키 이름만 보면 됨.
 *
 * 기능 전용 env(예: OPENAI_MODEL_COMPOSE_MESSAGE)가 비어 있으면 **OPENAI_MODEL**을 사용합니다.
 * 잘못된 기능별 모델명으로 400/404가 나면 openai-chat에서 OPENAI_MODEL로 1회 재시도합니다.
 */

export type AiFeatureKey = "inquiry_structure" | "compose_message" | "quote_draft"

/** Vercel/서버 로그·비용 추적용 라벨 */
export const AI_FEATURE_LOG_LABEL: Record<AiFeatureKey, string> = {
  inquiry_structure: "inquiry-structure",
  compose_message: "compose-message",
  quote_draft: "quote-draft",
}

const MODEL_ENV_NAME: Record<AiFeatureKey, string> = {
  inquiry_structure: "OPENAI_MODEL_INQUIRY_STRUCTURE",
  compose_message: "OPENAI_MODEL_COMPOSE_MESSAGE",
  quote_draft: "OPENAI_MODEL_QUOTE_DRAFT",
}

const MAX_TOKENS_ENV_NAME: Record<AiFeatureKey, string> = {
  inquiry_structure: "OPENAI_MAX_OUTPUT_TOKENS_INQUIRY",
  compose_message: "OPENAI_MAX_OUTPUT_TOKENS_MESSAGE",
  quote_draft: "OPENAI_MAX_OUTPUT_TOKENS_QUOTE",
}

/** 기본 max output (env 미설정 시) — 보수적 */
const DEFAULT_MAX_OUTPUT: Record<AiFeatureKey, number> = {
  inquiry_structure: 500,
  compose_message: 600,
  quote_draft: 1400,
}

export type ResolvedModel = { model: string } | { missingEnv: string }

export function resolveModelForFeature(feature: AiFeatureKey): ResolvedModel {
  const envName = MODEL_ENV_NAME[feature]
  const specific = process.env[envName]?.trim()
  if (specific) {
    return { model: specific }
  }
  const shared = process.env.OPENAI_MODEL?.trim()
  if (shared) {
    return { model: shared }
  }
  return { missingEnv: envName }
}

export function getMaxOutputTokensForFeature(feature: AiFeatureKey, override?: number): number {
  if (override !== undefined && Number.isFinite(override) && override > 0) {
    return Math.min(Math.floor(override), 16_000)
  }
  const envName = MAX_TOKENS_ENV_NAME[feature]
  const raw = process.env[envName]?.trim()
  const n = raw ? Number(raw) : NaN
  if (Number.isFinite(n) && n > 0) {
    return Math.min(Math.floor(n), 16_000)
  }
  return DEFAULT_MAX_OUTPUT[feature]
}

export function getOpenAiTimeoutMs(): number {
  return Math.min(Math.max(Number(process.env.OPENAI_TIMEOUT_MS ?? "55000") || 55000, 5000), 120_000)
}

/** quote-draft 주 모델 실패 시 1회 재시도용 모델 (보통 nano) */
export function getFallbackModel(): string | undefined {
  return process.env.OPENAI_MODEL_FALLBACK?.trim() || undefined
}

/** `true` / `1` / `yes` 이면 quote-draft 실패 시 fallback 모델로 1회 재시도 */
export function isQuoteDraftFallbackEnabled(): boolean {
  const v = process.env.OPENAI_QUOTE_DRAFT_FALLBACK?.trim().toLowerCase()
  return v === "1" || v === "true" || v === "yes"
}

export function logAiInvocation(meta: {
  feature: AiFeatureKey
  model: string
  maxOutputTokens: number
  phase: "primary" | "fallback"
}) {
  const label = AI_FEATURE_LOG_LABEL[meta.feature]
  console.info(
    "[bill-io-ai]",
    JSON.stringify({
      feature: label,
      model: meta.model,
      maxOutputTokens: meta.maxOutputTokens,
      phase: meta.phase,
      ts: new Date().toISOString(),
    })
  )
}
