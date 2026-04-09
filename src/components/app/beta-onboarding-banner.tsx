"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ListChecks, UserPlus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "billio-onboarding-checklist-dismissed"

const steps = [
  { title: "고객 등록", body: "거래처를 두고 문의·견적·청구를 같은 맥락에" },
  { title: "문의·유입", body: "내부 등록 또는 공개 문의 폼·포털(Pro) 접수" },
  { title: "견적 발송", body: "AI 초안·공개 링크·PDF·메일로 전달" },
  { title: "청구·수금", body: "공개 청구·리마인드·추심 메모까지 한곳에서" },
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
    <Card className="border-primary/20 bg-primary/[0.035] shadow-none">
      <CardContent className="relative p-3 pt-3.5 sm:p-4 sm:pt-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 size-7 shrink-0"
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
          <X className="size-3.5" />
        </Button>

        <div className="pr-9">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ListChecks className="size-3.5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">처음이신가요? 순서만 기억하세요</p>
              <p className="text-xs text-muted-foreground sm:text-[13px]">
                네 단계만 기억하면 됩니다. 공개 문의·알림·랜딩·AI는 설정·대시보드 허브에서 같이 켜 두세요.
              </p>
            </div>
          </div>

          <ol className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-lg border border-border/50 bg-background/70 px-2.5 py-2 text-[13px] leading-snug"
              >
                <p className="font-medium text-foreground">
                  <span className="text-muted-foreground">{index + 1}. </span>
                  {step.title}
                </p>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-3 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
            <Link
              href="/customers"
              className={cn(
                buttonVariants({ size: "sm" }),
                "inline-flex h-9 w-full items-center justify-center gap-1.5 sm:w-auto"
              )}
            >
              <UserPlus className="size-3.5" />
              첫 고객 등록
            </Link>
            <Link
              href="/inquiries"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "inline-flex h-9 w-full items-center justify-center sm:w-auto"
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
