"use client"

import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 px-4">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-6 text-destructive" />
      </div>
      <div className="max-w-sm text-center">
        <h2 className="text-base font-semibold">문제가 발생했습니다</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          페이지를 불러오는 중 오류가 발생했습니다. 아래 버튼을 눌러 다시 시도하거나, 문제가 지속되면 고객센터로 문의해 주세요.
        </p>
        {error.digest && (
          <p className="mt-1 text-xs text-muted-foreground/70">오류 코드: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={reset}>
          다시 시도
        </Button>
        <Button variant="secondary" onClick={() => (window.location.href = "/dashboard")}>
          대시보드로 이동
        </Button>
      </div>
    </div>
  )
}
