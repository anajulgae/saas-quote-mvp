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
  { title: "고객 등록", body: "거래처를 등록해 문의·견적에 연결" },
  { title: "문의 등록", body: "채널·일정을 기록해 팔로업 관리" },
  { title: "견적 발송", body: "항목·금액 묶어 발송·상태 추적" },
  { title: "청구·수금", body: "선금·잔금·입금 상태 확인" },
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
                고객 → 문의 → 견적 → 청구 순으로 쌓이면 대시보드가 채워집니다.
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
