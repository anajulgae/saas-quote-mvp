"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ClipboardList, Loader2, RefreshCw, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { InquiryAiAnalysis, InquiryAiUrgency, InquiryWithCustomer } from "@/types/domain"

function urgencyLabel(u: InquiryAiUrgency) {
  if (u === "high") {
    return "높음"
  }
  if (u === "low") {
    return "낮음"
  }
  return "보통"
}

function urgencyClass(u: InquiryAiUrgency) {
  if (u === "high") {
    return "border-destructive/40 bg-destructive/10 text-destructive"
  }
  if (u === "low") {
    return "border-border/60 bg-muted/40 text-muted-foreground"
  }
  return "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-50"
}

function actionHref(kind: string, customerId: string): string | null {
  if (kind === "convert_quote") {
    return `/quotes?customer=${encodeURIComponent(customerId)}&new=1`
  }
  if (kind === "complete_customer_info") {
    return `/customers/${encodeURIComponent(customerId)}`
  }
  return null
}

export function InquiryAiAnalysisPanel({
  inquiry,
  aiAssistEnabled,
}: {
  inquiry: InquiryWithCustomer
  aiAssistEnabled: boolean
}) {
  const router = useRouter()
  const [analysis, setAnalysis] = useState<InquiryAiAnalysis | null>(inquiry.aiAnalysis ?? null)
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    setAnalysis(inquiry.aiAnalysis ?? null)
    setLocalError(null)
  }, [inquiry.id, inquiry.aiAnalysis])

  const run = (force: boolean) => {
    if (!aiAssistEnabled) {
      toast.message("현재 플랜에서 AI 기능을 사용할 수 없습니다.")
      return
    }
    setBusy(true)
    setLocalError(null)
    void (async () => {
      try {
        const res = await fetch("/api/ai/inquiry-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ inquiryId: inquiry.id, force }),
        })
        const data = (await res.json()) as {
          error?: string
          analysis?: InquiryAiAnalysis
          cached?: boolean
          saved?: boolean
        }
        if (!res.ok) {
          setLocalError(data.error ?? "분석에 실패했습니다.")
          toast.error(data.error ?? "분석에 실패했습니다.")
          return
        }
        if (data.analysis) {
          setAnalysis(data.analysis)
        }
        if (data.cached) {
          toast.message("저장된 AI 분석을 불러왔습니다.")
        } else {
          toast.success(data.saved === false ? "분석은 완료됐으나 저장에 실패했습니다." : "AI 분석을 반영했습니다.")
        }
        router.refresh()
      } catch {
        setLocalError("네트워크 오류가 발생했습니다.")
        toast.error("네트워크 오류가 발생했습니다.")
      } finally {
        setBusy(false)
      }
    })()
  }

  if (!aiAssistEnabled) {
    return (
      <div className="rounded-lg border border-border/50 bg-muted/10 px-3 py-2.5 text-xs text-muted-foreground">
        AI 문의 분석은 Pro 등 AI가 포함된 플랜에서 사용할 수 있습니다.
      </div>
    )
  }

  return (
    <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Sparkles className="size-3.5 text-primary/80" aria-hidden />
          AI 운영 분석
        </p>
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-[10px]"
            disabled={busy}
            onClick={() => run(false)}
          >
            {busy ? <Loader2 className="size-3 animate-spin" /> : <ClipboardList className="size-3" />}
            불러오기
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 gap-1 text-[10px]"
            disabled={busy}
            onClick={() => run(true)}
          >
            {busy ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
            다시 분석
          </Button>
        </div>
      </div>

      {localError ? (
        <p className="text-[11px] text-destructive">{localError}</p>
      ) : null}

      {!analysis ? (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          아직 분석 결과가 없습니다. 「불러오기」로 캐시를 확인하거나 「다시 분석」을 눌러 주세요. 공개 문의 폼으로 접수된 건은 접수 직후 자동 분석될 수
          있습니다.
        </p>
      ) : (
        <div className="space-y-2 text-xs">
          <div className="flex flex-wrap gap-1.5">
            <span
              className={cn(
                "inline-flex rounded-full border px-2 py-px text-[10px] font-medium",
                urgencyClass(analysis.urgency)
              )}
            >
              긴급도 {urgencyLabel(analysis.urgency)}
            </span>
            <span className="inline-flex rounded-full border border-border/60 bg-card px-2 py-px text-[10px] font-medium">
              {analysis.requestTypeLabel}
            </span>
            {analysis.quoteConversionReady ? (
              <span className="inline-flex rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-px text-[10px] font-medium text-emerald-900 dark:text-emerald-100">
                견적 전환 검토
              </span>
            ) : null}
          </div>
          <p className="leading-relaxed text-foreground/90">{analysis.summary}</p>
          <p className="text-[10px] font-medium text-muted-foreground">팔로업 우선순위: {urgencyLabel(analysis.followupPriority)}</p>
          <p className="text-[10px] text-muted-foreground">{analysis.quoteConversionHint}</p>

          {analysis.nextActions.length ? (
            <div>
              <p className="mb-1 text-[10px] font-semibold text-muted-foreground">추천 다음 액션</p>
              <ul className="space-y-1.5">
                {analysis.nextActions.slice(0, 5).map((a, i) => {
                  const href = actionHref(a.kind, inquiry.customerId)
                  return (
                    <li
                      key={`${a.label}-${i}`}
                      className="rounded-md border border-border/50 bg-background/80 px-2 py-1.5 text-[11px]"
                    >
                      <div className="font-medium text-foreground">{a.label}</div>
                      {a.reason ? <p className="mt-0.5 text-muted-foreground">{a.reason}</p> : null}
                      {href ? (
                        <Link
                          href={href}
                          className="mt-1 inline-block text-[10px] font-medium text-primary underline-offset-2 hover:underline"
                        >
                          바로 이동
                        </Link>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          {analysis.suggestedQuestions.length ? (
            <div>
              <p className="mb-1 text-[10px] font-semibold text-muted-foreground">고객에게 확인하면 좋은 질문</p>
              <ul className="list-inside list-disc text-[11px] text-muted-foreground">
                {analysis.suggestedQuestions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {analysis.industryContextNote ? (
            <p className="text-[10px] text-muted-foreground">
              <span className="font-medium text-foreground/80">맥락: </span>
              {analysis.industryContextNote}
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}
