"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ListChecks, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const STORAGE_KEY = "flowbill-beta-onboarding-dismissed"

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
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:pt-6">
        <div className="flex gap-3">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ListChecks className="size-4" aria-hidden />
          </div>
          <div className="min-w-0 space-y-2">
            <p className="font-semibold text-foreground">베타 시작: 이렇게만 따라가 보세요</p>
            <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
              <li>
                <Link href="/customers" className="font-medium text-foreground underline-offset-4 hover:underline">
                  고객
                </Link>
                에서 첫 고객을 등록합니다.
              </li>
              <li>
                <Link href="/inquiries" className="font-medium text-foreground underline-offset-4 hover:underline">
                  문의
                </Link>
                에서 그 고객으로 문의를 만듭니다.
              </li>
              <li>
                <Link href="/quotes" className="font-medium text-foreground underline-offset-4 hover:underline">
                  견적
                </Link>
                →{" "}
                <Link href="/invoices" className="font-medium text-foreground underline-offset-4 hover:underline">
                  청구
                </Link>
                순으로 이어 붙여 봅니다.
              </li>
              <li>
                <Link href="/settings" className="font-medium text-foreground underline-offset-4 hover:underline">
                  설정
                </Link>
                에서 사업장명·계좌·리마인드 문구를 맞춥니다.
              </li>
            </ol>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 self-end sm:self-start"
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
      </CardContent>
    </Card>
  )
}
