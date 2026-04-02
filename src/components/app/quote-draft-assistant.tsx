"use client"

import { useMemo, useState } from "react"
import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

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

export function QuoteDraftAssistant() {
  const [serviceCategory, setServiceCategory] = useState("영상 제작")
  const [scope, setScope] = useState("촬영 1회, 릴스 편집 4편, 자막 포함")
  const [tone, setTone] = useState("깔끔하고 전문적인 안내형")

  const draft = useMemo(
    () => buildDraft(serviceCategory, scope, tone),
    [scope, serviceCategory, tone]
  )

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4" />
          AI 견적 초안 생성
        </CardTitle>
        <CardDescription>
          실제 AI 연동 전에도 데모 흐름을 테스트할 수 있도록 규칙 기반 초안을 제공합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">서비스 카테고리</label>
          <Input
            value={serviceCategory}
            onChange={(event) => setServiceCategory(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">작업 범위</label>
          <Textarea
            value={scope}
            onChange={(event) => setScope(event.target.value)}
            className="min-h-24"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">문체 톤</label>
          <Input value={tone} onChange={(event) => setTone(event.target.value)} />
        </div>
        <Button variant="outline" className="w-full">
          <Sparkles className="size-4" />
          초안 새로 만들기
        </Button>
        <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
          <p className="mb-2 text-sm font-medium">생성된 초안</p>
          <pre className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {draft}
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}
