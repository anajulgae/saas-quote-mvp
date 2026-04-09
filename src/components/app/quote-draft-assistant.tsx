"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronUp, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export type QuoteLineDraft = {
  name: string
  description: string
  quantity: string
  unitPrice: string
}

export type QuoteDraftApplyPayload = {
  title: string
  summary: string
  items: QuoteLineDraft[]
}

type AiQuoteDraft = QuoteDraftApplyPayload & {
  optionalItems?: QuoteLineDraft[]
}

function buildStructuredDraft(serviceCategory: string, scope: string, tone: string): AiQuoteDraft {
  const cat = serviceCategory.trim() || "프로젝트"
  const sc = scope.trim()
  const tn = tone.trim() || "전문적이고 명확한"

  const title = `${cat} 견적 제안`

  const summary = [
    `${cat} 관련 요청을 반영한 견적 안내입니다.`,
    "",
    `■ 작업 범위\n${sc || "(범위를 구체화해 주세요)"}`,
    "",
    "■ 기본 포함",
    "· 사전 협의 및 일정 조율",
    "· 결과물 1차 전달 및 기본 수정 1회",
    "",
    "■ 결제 조건(제안)",
    "선금 50%, 완료 전 잔금 50% — 실제 계약 시 협의 가능",
    "",
    `■ 문체·톤: ${tn}`,
    "",
    "■ 유의사항",
    "범위·일정·수량이 바뀌면 금액과 납기도 함께 조정될 수 있습니다.",
  ].join("\n")

  const items: QuoteLineDraft[] = [
    {
      name: `${cat} — 표준 패키지`,
      description: sc || "범위·산출물을 구체화해 주세요",
      quantity: "1",
      unitPrice: "0",
    },
  ]

  const optionalItems: QuoteLineDraft[] = [
    {
      name: "추가 옵션(선택)",
      description: "옵션별 단가는 실제 범위에 맞게 조정하세요",
      quantity: "1",
      unitPrice: "0",
    },
  ]

  return { title, summary, items, optionalItems }
}

/** 우측 오버레이 시트 안에만 쓰는 본문(헤더는 OpsDetailSheet) */
export function QuoteDraftAssistantForm({
  hasInquiries,
  quotesEmpty,
  paymentTermsHint = "",
  onApplyToNewQuote,
}: {
  hasInquiries: boolean
  quotesEmpty: boolean
  /** 설정의 결제 조건 등 — AI가 참고합니다 */
  paymentTermsHint?: string
  onApplyToNewQuote: (payload: QuoteDraftApplyPayload) => void
}) {
  const [serviceCategory, setServiceCategory] = useState("영상 제작")
  const [industryHint, setIndustryHint] = useState("")
  const [scope, setScope] = useState("촬영 1회, 숏폼 편집 4편, 자막·썸네일 포함")
  const [tone, setTone] = useState("전문적이고 신뢰감 있는 안내")
  const [draftExpanded, setDraftExpanded] = useState(false)
  const [regenBusy, setRegenBusy] = useState(false)
  const [aiDraft, setAiDraft] = useState<AiQuoteDraft | null>(null)
  const [optionalPick, setOptionalPick] = useState<Set<number>>(new Set())

  const computedDraft = useMemo(
    () => buildStructuredDraft(serviceCategory, scope, tone),
    [scope, serviceCategory, tone]
  )

  const draft = aiDraft ?? computedDraft

  useEffect(() => {
    const opts = draft.optionalItems
    if (opts?.length) {
      setOptionalPick(new Set(opts.map((_, i) => i)))
    } else {
      setOptionalPick(new Set())
    }
  }, [draft])

  const bumpInput = (patch: Partial<{ serviceCategory: string; scope: string; tone: string }>) => {
    setAiDraft(null)
    if (patch.serviceCategory !== undefined) {
      setServiceCategory(patch.serviceCategory)
    }
    if (patch.scope !== undefined) {
      setScope(patch.scope)
    }
    if (patch.tone !== undefined) {
      setTone(patch.tone)
    }
  }

  const summaryLine = useMemo(() => {
    const line = draft.summary.split("\n").find((l) => l.trim().length > 0)
    if (!line) {
      return "입력을 바꾸면 초안이 갱신됩니다."
    }
    return line.length > 80 ? `${line.slice(0, 80)}…` : line
  }, [draft.summary])

  const handleRegenerate = () => {
    setRegenBusy(true)
    void (async () => {
      try {
        const hint = industryHint.trim() || serviceCategory.trim()
        const res = await fetch("/api/ai/quote-draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            serviceCategory,
            scope,
            tone,
            paymentTermsHint: paymentTermsHint.trim() || undefined,
            industryHint: hint || undefined,
          }),
        })
        const data = (await res.json()) as {
          error?: string
          draft?: {
            title: string
            summary: string
            items: Array<{ name: string; description?: string; quantity?: string | number; unitPrice?: string | number }>
            optionalItems?: Array<{
              name: string
              description?: string
              quantity?: string | number
              unitPrice?: string | number
            }>
          }
        }
        if (!res.ok) {
          toast.error(data.error ?? "초안을 만들지 못했습니다.")
          return
        }
        if (!data.draft?.title || !data.draft.summary || !data.draft.items?.length) {
          toast.error("응답 형식이 올바르지 않습니다.")
          return
        }
        const mapLine = (i: {
          name: string
          description?: string
          quantity?: string | number
          unitPrice?: string | number
        }): QuoteLineDraft => ({
          name: i.name,
          description: i.description ?? "",
          quantity: String(i.quantity ?? "1"),
          unitPrice: String(i.unitPrice ?? "0"),
        })
        const optionalItems = (data.draft.optionalItems ?? []).map(mapLine)
        setAiDraft({
          title: data.draft.title,
          summary: data.draft.summary,
          items: data.draft.items.map(mapLine),
          optionalItems: optionalItems.length ? optionalItems : undefined,
        })
        toast.success("AI 초안을 반영했습니다. 미리보기를 확인해 주세요.")
      } catch {
        toast.error("네트워크 오류로 초안을 받지 못했습니다.")
      } finally {
        setRegenBusy(false)
      }
    })()
  }

  const handleApply = () => {
    const base = draft.items.map((i) => ({ ...i }))
    const opt = (draft.optionalItems ?? []).filter((_, i) => optionalPick.has(i)).map((i) => ({ ...i }))
    onApplyToNewQuote({
      title: draft.title,
      summary: draft.summary,
      items: base.length || opt.length ? [...base, ...opt] : base,
    })
  }

  const optionalItems = draft.optionalItems ?? []

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-border/60 bg-muted/10 p-3 sm:p-4",
        !quotesEmpty && "ring-1 ring-border/40"
      )}
    >
      <div className="space-y-1">
        <p className="text-xs leading-snug text-muted-foreground">
          서비스 유형·업종 맥락·범위·톤을 넣은 뒤 AI로 초안을 만들거나, 로컬 규칙 초안을 그대로 쓸 수 있습니다.
        </p>
        {!hasInquiries ? (
          <p className="rounded border border-amber-500/25 bg-amber-500/[0.07] px-2 py-1.5 text-[10px] leading-snug text-amber-950 dark:text-amber-50/90">
            문의를 등록·연결하면 고객 맥락에 맞는 견적 작성이 더 수월합니다.
          </p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-medium">서비스 유형</label>
        <Input
          value={serviceCategory}
          onChange={(event) => bumpInput({ serviceCategory: event.target.value })}
          className="h-8 text-sm"
          placeholder="예: 영상 제작, 웹사이트, 브랜딩"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[11px] font-medium">업종·맥락 힌트 (선택)</label>
        <Input
          value={industryHint}
          onChange={(event) => {
            setIndustryHint(event.target.value)
            setAiDraft(null)
          }}
          className="h-8 text-sm"
          placeholder="예: 애견미용 / 영상 제작 — 납기·수정 횟수 중요"
        />
        <p className="text-[10px] text-muted-foreground">비어 있으면 서비스 유형과 동일하게 AI에 전달됩니다.</p>
      </div>
      <div className="space-y-1">
        <label className="text-[11px] font-medium">작업 범위</label>
        <Textarea
          value={scope}
          onChange={(event) => bumpInput({ scope: event.target.value })}
          className="min-h-[3.5rem] text-sm"
          placeholder="포함 범위·산출물·납기 희망 등"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[11px] font-medium">문체·톤</label>
        <Input
          value={tone}
          onChange={(event) => bumpInput({ tone: event.target.value })}
          className="h-8 text-sm"
          placeholder="예: 간결·전문·친근"
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 flex-1 gap-1 text-xs"
          disabled={regenBusy}
          onClick={handleRegenerate}
        >
          {regenBusy ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Sparkles className="size-3" />
          )}
          AI로 초안 생성
        </Button>
        <Button type="button" size="sm" className="h-8 flex-1 gap-1 text-xs font-semibold" onClick={handleApply}>
          이 초안으로 견적 작성
        </Button>
      </div>
      {optionalItems.length ? (
        <div className="rounded-md border border-border/50 bg-background/60 px-2 py-2">
          <p className="text-[10px] font-semibold text-muted-foreground">옵션 항목 — 견적에 포함</p>
          <ul className="mt-1.5 space-y-2">
            {optionalItems.map((item, idx) => (
              <li key={`${item.name}-${idx}`} className="flex items-start gap-2 text-xs">
                <input
                  id={`opt-${idx}`}
                  type="checkbox"
                  className="mt-1 size-3.5 shrink-0 rounded border border-input accent-primary"
                  checked={optionalPick.has(idx)}
                  onChange={(e) => {
                    const on = e.target.checked
                    setOptionalPick((prev) => {
                      const next = new Set(prev)
                      if (on) {
                        next.add(idx)
                      } else {
                        next.delete(idx)
                      }
                      return next
                    })
                  }}
                />
                <label htmlFor={`opt-${idx}`} className="cursor-pointer leading-snug text-muted-foreground">
                  <span className="font-medium text-foreground">{item.name}</span>
                  {item.description ? <span className="block text-[11px]">{item.description}</span> : null}
                  <span className="block font-mono text-[10px] text-muted-foreground/90">
                    {item.quantity} × {item.unitPrice}원
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="rounded-md border border-border/60 bg-muted/15 p-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium text-foreground">미리보기</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 gap-0.5 px-1.5 text-[10px] text-muted-foreground"
            onClick={() => setDraftExpanded((o) => !o)}
          >
            {draftExpanded ? (
              <>
                요약만
                <ChevronUp className="size-3" />
              </>
            ) : (
              <>
                전체
                <ChevronDown className="size-3" />
              </>
            )}
          </Button>
        </div>
        {draftExpanded ? (
          <div className="mt-2 space-y-2">
            <p className="text-[11px] font-medium text-foreground/90">{draft.title}</p>
            <pre className="max-h-52 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
              {draft.summary}
            </pre>
            <p className="text-[10px] font-medium text-muted-foreground">기본 항목</p>
            <ul className="list-inside list-disc text-xs text-muted-foreground">
              {draft.items.map((item) => (
                <li key={item.name}>
                  {item.name}
                  {item.description ? ` — ${item.description}` : ""}
                </li>
              ))}
            </ul>
            {optionalItems.length ? (
              <>
                <p className="text-[10px] font-medium text-muted-foreground">옵션 항목</p>
                <ul className="list-inside list-disc text-xs text-muted-foreground">
                  {optionalItems.map((item) => (
                    <li key={`o-${item.name}`}>
                      {item.name}
                      {item.description ? ` — ${item.description}` : ""}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{summaryLine}</p>
        )}
      </div>
    </div>
  )
}
