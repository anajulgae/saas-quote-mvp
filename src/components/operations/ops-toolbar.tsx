"use client"

import { cn } from "@/lib/utils"

/** 검색·필터·정렬·CTA를 한 줄(또는 줄바꿈)에 묶는 운영 화면 상단 바 */
export function OpsToolbar({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border/50 bg-muted/20 p-3 sm:flex-row sm:flex-wrap sm:items-center",
        className
      )}
    >
      {children}
    </div>
  )
}
