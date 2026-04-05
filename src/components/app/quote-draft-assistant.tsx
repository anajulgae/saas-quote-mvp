"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronUp, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export type QuoteDraftApplyPayload = {
  title: string
  summary: string
  items: Array<{ name: string; description: string; quantity: string; unitPrice: string }>
}

function buildStructuredDraft(serviceCategory: string, scope: string, tone: string) {
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

  const items: QuoteDraftApplyPayload["items"] = [
    {
      name: `${cat} — 표준 패키지`,
      description: sc || "범위·산출물을 구체화해 주세요",
      quantity: "1",
      unitPrice: "0",
    },
    {
      name: "추가 옵션(선택)",
      description: "옵션별 단가는 실제 범위에 맞게 조정하세요",
      quantity: "1",
      unitPrice: "0",
    },
  ]

  return { title, summary, items }
}

export function QuoteDraftAssistant({
  hasInquiries,
  quotesEmpty,
  onApplyToNewQuote,
}: {
  hasInquiries: boolean
  quotesEmpty: boolean
  onApplyToNewQuote: (payload: QuoteDraftApplyPayload) => void
}) {
  const [serviceCategory, setServiceCategory] = useState("영상 제작")
  const [scope, setScope] = useState("촬영 1회, 숏폼 편집 4편, 자막·썸네일 포함")
  const [tone, setTone] = useState("전문적이고 신뢰감 있는 안내")
  const [panelOpen, setPanelOpen] = useState(quotesEmpty)
  const [draftExpanded, setDraftExpanded] = useState(false)
  const [regenBusy, setRegenBusy] = useState(false)

  const draft = useMemo(
    () => buildStructuredDraft(serviceCategory, scope, tone),
    [scope, serviceCategory, tone]
  )

  const summaryLine = useMemo(() => {
    const line = draft.summary.split("\n").find((l) => l.trim().length > 0)
    if (!line) {
      return "입력을 바꾸면 초안이 갱신됩니다."
    }
    return line.length > 80 ? `${line.slice(0, 80)}…` : line
  }, [draft.summary])

  const handleRegenerate = () => {
    setRegenBusy(true)
    window.setTimeout(() => {
      setRegenBusy(false)
      toast.success("입력하신 내용을 기준으로 초안을 다시 정리했습니다.")
    }, 450)
  }

  const handleApply = () => {
    onApplyToNewQuote({
      title: draft.title,
      summary: draft.summary,
      items: draft.items.map((i) => ({ ...i })),
    })
  }

  if (!panelOpen) {
    return (
      <Card className="border-border/60 bg-muted/10 shadow-none">
        <CardContent className="flex flex-col gap-2 p-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              보조
            </p>
            <p className="text-[13px] font-semibold text-foreground">견적 초안 도우미</p>
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
              범위·결제 문구·항목 뼈대를 채운 뒤 「이 초안으로 견적 작성」으로 본 작성 화면에 넣습니다.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-1 text-xs"
            onClick={() => setPanelOpen(true)}
          >
            <Sparkles className="size-3" />
            열기
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("border-border/70", !quotesEmpty && "ring-1 ring-border/50")}>
      <CardHeader className="space-y-1 pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles className="size-3.5 text-primary/80" />
            견적 초안 도우미
          </CardTitle>
          {!quotesEmpty ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 gap-1 px-2 text-[11px] text-muted-foreground"
              onClick={() => setPanelOpen(false)}
            >
              접기
            </Button>
          ) : null}
        </div>
        <CardDescription className="text-[11px] leading-snug">
          서비스 유형·범위·톤을 넣으면 제목·요약·항목 줄·결제 안내 문구를 한 번에 구성합니다.
        </CardDescription>
        {!hasInquiries ? (
          <p className="rounded border border-amber-500/25 bg-amber-500/[0.07] px-2 py-1.5 text-[10px] leading-snug text-amber-950 dark:text-amber-50/90">
            문의를 등록·연결하면 고객 맥락에 맞는 견적 작성이 더 수월합니다.
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2 pb-4">
        <div className="space-y-1">
          <label className="text-[11px] font-medium">서비스 유형</label>
          <Input
            value={serviceCategory}
            onChange={(event) => setServiceCategory(event.target.value)}
            className="h-8 text-sm"
            placeholder="예: 영상 제작, 웹사이트, 브랜딩"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium">작업 범위</label>
          <Textarea
            value={scope}
            onChange={(event) => setScope(event.target.value)}
            className="min-h-[3.5rem] text-sm"
            placeholder="포함 범위·산출물·납기 희망 등"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium">문체·톤</label>
          <Input
            value={tone}
            onChange={(event) => setTone(event.target.value)}
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
            초안 다시 만들기
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 flex-1 gap-1 text-xs font-semibold"
            onClick={handleApply}
          >
            이 초안으로 견적 작성
          </Button>
        </div>
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
              <p className="text-[10px] font-medium text-muted-foreground">항목 초안</p>
              <ul className="list-inside list-disc text-xs text-muted-foreground">
                {draft.items.map((item) => (
                  <li key={item.name}>
                    {item.name}
                    {item.description ? ` — ${item.description}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{summaryLine}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
