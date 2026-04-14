"use client"

import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 px-4">
      <div className="flex size-12 items-center justify-center rounded-full bg-red-100">
        <AlertTriangle className="size-6 text-red-600" />
      </div>
      <div className="max-w-sm text-center">
        <h2 className="text-base font-semibold text-zinc-900">운영 콘솔 오류</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          관리 페이지를 불러오는 중 문제가 발생했습니다.
        </p>
        {error.digest && (
          <p className="mt-1 text-xs text-zinc-400">오류 코드: {error.digest}</p>
        )}
      </div>
      <Button variant="outline" onClick={reset}>
        다시 시도
      </Button>
    </div>
  )
}
