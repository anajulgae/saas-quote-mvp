"use client"

import { useState } from "react"
import { Copy, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import type { CollectionToneHint, InvoiceCollectionAdvice } from "@/types/domain"

export function InvoiceCollectionAiPanel({
  invoiceId,
  aiAssistEnabled,
  onSuggestedTone,
}: {
  invoiceId: string
  aiAssistEnabled: boolean
  onSuggestedTone?: (tone: CollectionToneHint) => void
}) {
  const [advice, setAdvice] = useState<InvoiceCollectionAdvice | null>(null)
  const [busy, setBusy] = useState(false)

  const load = () => {
    if (!aiAssistEnabled) {
      toast.message("현재 플랜에서 AI 기능을 사용할 수 없습니다.")
      return
    }
    setBusy(true)
    void (async () => {
      try {
        const res = await fetch("/api/ai/collection-advice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ invoiceId }),
        })
        const data = (await res.json()) as { error?: string; advice?: InvoiceCollectionAdvice }
        if (!res.ok) {
          toast.error(data.error ?? "추천을 받지 못했습니다.")
          return
        }
        if (data.advice) {
          setAdvice(data.advice)
          onSuggestedTone?.(data.advice.suggestedTone)
          toast.success("다음 액션과 문구 초안을 준비했습니다.")
        }
      } catch {
        toast.error("네트워크 오류가 발생했습니다.")
      } finally {
        setBusy(false)
      }
    })()
  }

  const copyDraft = async () => {
    if (!advice?.draftBody) {
      return
    }
    try {
      await navigator.clipboard.writeText(
        advice.draftSubject ? `${advice.draftSubject}\n\n${advice.draftBody}` : advice.draftBody
      )
      toast.success("문구를 클립보드에 복사했습니다.")
    } catch {
      toast.error("복사에 실패했습니다.")
    }
  }

  if (!aiAssistEnabled) {
    return (
      <div className="rounded-lg border border-border/50 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
        AI 추심·리마인드 보조는 AI가 포함된 플랜에서 사용할 수 있습니다.
      </div>
    )
  }

  return (
    <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Sparkles className="size-3.5 text-primary/80" aria-hidden />
          AI 추천 액션 · 문구
        </p>
        <div className="flex flex-wrap gap-1">
          <Button type="button" variant="secondary" size="sm" className="h-7 gap-1 text-[10px]" disabled={busy} onClick={load}>
            {busy ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
            상황 분석
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-[10px]"
            disabled={!advice}
            onClick={() => void copyDraft()}
          >
            <Copy className="size-3" />
            복사
          </Button>
        </div>
      </div>

      {!advice ? (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          청구 상태·기한·리마인드 이력을 보고 지금 할 일과 고객 메시지 초안을 제안합니다. 「상황 분석」을 눌러 주세요.
        </p>
      ) : (
        <div className="space-y-2 text-xs">
          <div>
            <p className="font-medium text-foreground">{advice.headline}</p>
            <p className="mt-1 text-muted-foreground">{advice.reason}</p>
          </div>
          <p className="text-[10px] text-muted-foreground">
            권장 톤:{" "}
            <span className="font-medium text-foreground">
              {advice.suggestedTone === "polite" ? "정중형" : advice.suggestedTone === "firm" ? "단호형" : "기본형"}
            </span>
            · 메시지 유형: <span className="font-mono text-[10px]">{advice.messageKind}</span>
          </p>
          {advice.checklist.length ? (
            <div>
              <p className="mb-0.5 text-[10px] font-semibold text-muted-foreground">체크리스트</p>
              <ul className="list-inside list-disc text-[11px] text-muted-foreground">
                {advice.checklist.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="rounded-md border border-border/50 bg-background/80 p-2">
            {advice.draftSubject ? (
              <p className="text-[10px] font-medium text-muted-foreground">제목 후보</p>
            ) : null}
            {advice.draftSubject ? <p className="text-[11px]">{advice.draftSubject}</p> : null}
            <p className="mt-1 text-[10px] font-medium text-muted-foreground">본문 초안</p>
            <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground/90">{advice.draftBody}</p>
          </div>
          <p className="text-[10px] text-muted-foreground">
            리마인드 기록·발송 창에서 필요하면 「리마인드」메뉴와 연결해 사용하세요. 문구는 사실 확인 후 발송하세요.
          </p>
        </div>
      )}
    </div>
  )
}
