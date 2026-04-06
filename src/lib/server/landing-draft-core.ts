import { completeJsonChatForFeature, OpenAiError } from "@/lib/server/openai-chat"
import type {
  BusinessLandingFaqItem,
  BusinessLandingServiceItem,
} from "@/types/domain"

export type LandingDraftInput = {
  businessName: string
  industry: string
  region: string
  servicesHint: string
  strengths: string
  targetCustomers: string
  tone: "default" | "friendly" | "professional"
}

export type LandingDraftAiResult = {
  headline: string
  introOneLine: string
  about: string
  services: BusinessLandingServiceItem[]
  ctaText: string
  faq: BusinessLandingFaqItem[]
  trustPoints: string[]
  seoTitle: string
  seoDescription: string
}

function str(o: Record<string, unknown>, k: string): string {
  return typeof o[k] === "string" ? (o[k] as string).trim() : ""
}

function parseServices(raw: unknown): BusinessLandingServiceItem[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const out: BusinessLandingServiceItem[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue
    }
    const o = item as Record<string, unknown>
    const title = str(o, "title") || str(o, "name")
    const description = str(o, "description") || str(o, "body")
    if (title) {
      out.push({ title: title.slice(0, 120), description: description.slice(0, 400) })
    }
    if (out.length >= 6) {
      break
    }
  }
  return out
}

function parseFaq(raw: unknown): BusinessLandingFaqItem[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const out: BusinessLandingFaqItem[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue
    }
    const o = item as Record<string, unknown>
    const q = str(o, "question") || str(o, "q")
    const a = str(o, "answer") || str(o, "a")
    if (q && a) {
      out.push({ question: q.slice(0, 200), answer: a.slice(0, 800) })
    }
    if (out.length >= 5) {
      break
    }
  }
  return out.slice(0, 3)
}

function parseTrust(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const out: string[] = []
  for (const item of raw) {
    if (typeof item === "string" && item.trim()) {
      out.push(item.trim().slice(0, 200))
    }
    if (out.length >= 3) {
      break
    }
  }
  return out
}

export function parseLandingDraft(obj: unknown): LandingDraftAiResult {
  if (!obj || typeof obj !== "object") {
    throw new Error("객체 형식이 아닙니다.")
  }
  const o = obj as Record<string, unknown>
  const headline = str(o, "headline") || str(o, "mainHeadline")
  const introOneLine = str(o, "introOneLine") || str(o, "tagline") || str(o, "oneLiner")
  const about = str(o, "about") || str(o, "description") || str(o, "introBody")
  const ctaText = str(o, "ctaText") || str(o, "cta") || "무료 상담 문의"
  const seoTitle = str(o, "seoTitle")
  const seoDescription = str(o, "seoDescription")
  const services = parseServices(o.services)
  const faq = parseFaq(o.faq)
  const trustPoints = parseTrust(o.trustPoints)

  if (!headline && !introOneLine && !about) {
    throw new Error("headline·introOneLine·about 중 하나는 필요합니다.")
  }

  return {
    headline: headline.slice(0, 200) || introOneLine.slice(0, 200),
    introOneLine: introOneLine.slice(0, 220) || headline.slice(0, 220),
    about: about.slice(0, 4000),
    services: services.length ? services : [{ title: "맞춤 서비스", description: "문의를 남겨 주시면 상세히 안내드립니다." }],
    ctaText: ctaText.slice(0, 80),
    faq,
    trustPoints,
    seoTitle: seoTitle.slice(0, 200),
    seoDescription: seoDescription.slice(0, 320),
  }
}

const TONE_HINT: Record<LandingDraftInput["tone"], string> = {
  default: "톤: 명확하고 신뢰감 있게, 과장 없이.",
  friendly: "톤: 친근하고 부담 없게, 존댓말.",
  professional: "톤: 절제된 비즈니스 톤, 전문적.",
}

const SYSTEM = `한국어 소규모 사업자용 단일 랜딩 페이지 초안 생성기. JSON만 출력. 설명 문장 금지.
키: headline(메인 헤드라인 한 줄), introOneLine(한 줄 소개), about(본문 2~5문단, 줄바꿈 \\n), services(배열 3~6개, 각 {title, description}), ctaText(버튼 문구 짧게), faq(배열 2~3개 {question, answer}), trustPoints(문자열 배열 2~3개, 짧은 신뢰 포인트), seoTitle(60자 내외), seoDescription(120~160자 권장).
서비스 설명은 구체적으로. 허위 수상·인증은 쓰지 말 것.`

export async function runLandingDraftAi(input: LandingDraftInput): Promise<LandingDraftAiResult> {
  const userBlock = [
    `업체명: ${input.businessName}`,
    `업종: ${input.industry}`,
    `지역: ${input.region}`,
    `주요 서비스(키워드): ${input.servicesHint}`,
    `강점·특징: ${input.strengths}`,
    `타깃 고객: ${input.targetCustomers}`,
    TONE_HINT[input.tone],
  ].join("\n")

  return completeJsonChatForFeature({
    feature: "landing_draft",
    temperature: 0.35,
    maxOutputTokens: 1800,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: userBlock.slice(0, 6000) },
    ],
    parse: parseLandingDraft,
  })
}

export { OpenAiError }
