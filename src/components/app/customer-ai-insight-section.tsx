"use client"

import { useState } from"react"
import { Loader2, Sparkles } from"lucide-react"
import { toast } from"sonner"

import { Button } from"@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card"

type Insight = {
  headline: string
  bullets: string[]
  suggestedApproach: string
}

export function CustomerAiInsightSection({
  customerId,
  aiAssistEnabled,
}: {
  customerId: string
  aiAssistEnabled: boolean
}) {
  const [insight, setInsight] = useState<Insight | null>(null)
  const [busy, setBusy] = useState(false)

  const load = () => {
    if (!aiAssistEnabled) {
      toast.message("현재 플랜에서 AI 기능을 사용할 수 없습니다.")
      return
    }
    setBusy(true)
    void (async () => {
      try {
        const res = await fetch("/api/ai/customer-insight", {
          method:"POST",
          headers: {"Content-Type":"application/json" },
          credentials:"include",
          body: JSON.stringify({ customerId }),
        })
        const data = (await res.json()) as { error?: string; insight?: Insight }
        if (!res.ok) {
          toast.error(data.error ??"인사이트를 불러오지 못했습니다.")
          return
        }
        if (data.insight) {
          setInsight(data.insight)
          toast.success("AI 인사이트를 불러왔습니다.")
        }
      } catch {
        toast.error("네트워크 오류가 발생했습니다.")
      } finally {
        setBusy(false)
      }
    })()
  }

  if (!aiAssistEnabled) {
    return null
  }

  return (
    <Card className="border-primary/25 bg-primary/[0.03] shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="size-4 text-primary/80" aria-hidden />
              AI 고객 인사이트
            </CardTitle>
            <CardDescription>
              문의·견적·청구 이력을 바탕으로 이번 대응에 도움이 되는 짧은 요약입니다.
            </CardDescription>
          </div>
          <Button type="button" size="sm" variant="secondary" className="h-8 gap-1 text-xs" disabled={busy} onClick={load}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            불러오기
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {!insight ? (
          <p className="text-xs text-muted-foreground">
            아직 생성되지 않았습니다. 「불러오기」를 눌러 주세요. 이력이 거의 없으면 일반적인 안내만 나올 수 있습니다.
          </p>
        ) : (
          <>
            <p className="font-medium text-foreground">{insight.headline}</p>
            {insight.bullets.length ? (
              <ul className="list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                {insight.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : null}
            <p className="text-sm leading-relaxed text-foreground/90">{insight.suggestedApproach}</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
