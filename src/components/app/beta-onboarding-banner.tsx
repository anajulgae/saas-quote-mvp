"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ListChecks, UserPlus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "flowbill-beta-onboarding-dismissed"

const steps = [
  {
    title: "고객 등록",
    body: "거래처 정보를 먼저 남겨 두면 문의·견적에 바로 연결할 수 있어요.",
  },
  {
    title: "문의 등록",
    body: "채널과 일정을 기록해 놓치지 않게 관리해요.",
  },
  {
    title: "견적 발송",
    body: "항목·금액을 묶어 보내고 상태를 추적해요.",
  },
  {
    title: "청구 및 수금",
    body: "선금·잔금과 입금 상태를 한곳에서 확인해요.",
  },
] as const

export function BetaOnboardingBanner() {
  const [hidden, setHidden] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(STORAGE_KEY) === "1")
    } catch {
      setHidden(false)
    }
  }, [])

  if (hidden === null || hidden) {
    return null
  }

  return (
    <Card className="border-primary/25 bg-primary/[0.04]">
      <CardContent className="relative p-4 pt-5 sm:p-5 sm:pt-6">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 size-8 shrink-0"
          aria-label="안내 닫기"
          onClick={() => {
            try {
              localStorage.setItem(STORAGE_KEY, "1")
            } catch {
              // ignore
            }
            setHidden(true)
          }}
        >
          <X className="size-4" />
        </Button>

        <div className="pr-10">
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ListChecks className="size-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-semibold text-foreground">처음 오셨나요? 이렇게 진행해 보세요</p>
              <p className="text-sm text-muted-foreground">
                고객 → 문의 → 견적 → 청구 순으로 쌓이면 대시보드가 살아납니다.
              </p>
            </div>
          </div>

          <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-xl border border-border/60 bg-background/60 px-3 py-3 text-sm"
              >
                <p className="font-medium text-foreground">
                  <span className="text-muted-foreground">{index + 1}. </span>
                  {step.title}
                </p>
                <p className="mt-1.5 leading-snug text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href="/customers"
              className={cn(
                buttonVariants(),
                "inline-flex w-full items-center justify-center gap-2 sm:w-auto"
              )}
            >
              <UserPlus className="size-4" />
              첫 고객 등록
            </Link>
            <Link
              href="/inquiries"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "inline-flex w-full items-center justify-center sm:w-auto"
              )}
            >
              첫 문의 만들기
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
