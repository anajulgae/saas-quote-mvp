"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

function buildDraft(serviceCategory: string, scope: string, tone: string) {
  if (!serviceCategory || !scope) {
    return ""
  }

  return [
    `${serviceCategory} 관련 요청을 기준으로 아래 범위로 견적 초안을 제안합니다.`,
    "",
    `1. 작업 범위: ${scope}`,
    "2. 기본 포함 사항: 사전 커뮤니케이션, 일정 조율, 1차 결과물 제공, 기본 수정 1회",
    "3. 결제 조건: 선금 50%, 완료 전 잔금 50%",
    `4. 문체 톤: ${tone}`,
    "5. 추가 안내: 범위 변경 시 금액과 일정이 함께 조정될 수 있습니다.",
  ].join("\n")
}

function draftSummary(full: string) {
  const line = full.split("\n").find((l) => l.trim().length > 0)
  if (!line) {
    return "입력값을 바꾸면 초안 미리보기가 갱신됩니다."
  }
  return line.length > 72 ? `${line.slice(0, 72)}…` : line
}

export function QuoteDraftAssistant({
  hasInquiries,
  quotesEmpty,
}: {
  hasInquiries: boolean
  quotesEmpty: boolean
}) {
  const [serviceCategory, setServiceCategory] = useState("영상 제작")
  const [scope, setScope] = useState("촬영 1회, 릴스 편집 4편, 자막 포함")
  const [tone, setTone] = useState("깔끔하고 전문적인 안내형")
  const [expanded, setExpanded] = useState(!quotesEmpty)
  const [draftOpen, setDraftOpen] = useState(false)

  const draft = useMemo(
    () => buildDraft(serviceCategory, scope, tone),
    [scope, serviceCategory, tone]
  )

  const preferCollapsed = quotesEmpty

  if (preferCollapsed && !expanded) {
    return (
      <Card className="border-border/60 bg-muted/15 shadow-none">
        <CardContent className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">보조 기능</p>
            <p className="text-sm font-medium text-foreground">AI 견적 초안 도우미</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              문구 초안만 빠르게 뽑아볼 때 사용하세요. 실제 견적은 문의 연결 후 만드는 것을 권장합니다.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 gap-1.5"
            onClick={() => setExpanded(true)}
          >
            <Sparkles className="size-3.5" />
            초안 도우미 열기
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        "border-border/70",
        preferCollapsed && expanded && "ring-1 ring-border/60"
      )}
    >
      <CardHeader className="space-y-1 pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="size-4 text-muted-foreground" />
            AI 견적 초안 생성
          </CardTitle>
          {preferCollapsed ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 gap-1 text-xs text-muted-foreground"
              onClick={() => setExpanded(false)}
            >
              접기
            </Button>
          ) : null}
        </div>
        <CardDescription className="text-xs leading-relaxed">
          실제 AI 연동 전에도 규칙 기반 초안으로 문구를 점검할 수 있습니다.
        </CardDescription>
        {!hasInquiries ? (
          <p className="rounded-md border border-amber-500/25 bg-amber-500/10 px-2.5 py-2 text-[11px] leading-snug text-amber-950 dark:text-amber-100/90">
            문의 없이도 문구 초안을 테스트할 수 있지만, 실제 견적은 문의를 등록한 뒤 연결해 만드는 것을
            권장합니다.
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium">서비스 카테고리</label>
          <Input
            value={serviceCategory}
            onChange={(event) => setServiceCategory(event.target.value)}
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">작업 범위</label>
          <Textarea
            value={scope}
            onChange={(event) => setScope(event.target.value)}
            className="min-h-[4.5rem] text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">문체 톤</label>
          <Input
            value={tone}
            onChange={(event) => setTone(event.target.value)}
            className="h-9"
          />
        </div>
        <Button type="button" variant="outline" size="sm" className="h-9 w-full gap-1.5">
          <Sparkles className="size-3.5" />
          초안 새로 만들기
        </Button>
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-foreground">생성된 초안</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground"
              onClick={() => setDraftOpen((o) => !o)}
            >
              {draftOpen ? (
                <>
                  요약만
                  <ChevronUp className="size-3" />
                </>
              ) : (
                <>
                  전체 보기
                  <ChevronDown className="size-3" />
                </>
              )}
            </Button>
          </div>
          {draftOpen ? (
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
              {draft || "카테고리와 작업 범위를 입력하세요."}
            </pre>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{draftSummary(draft)}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
