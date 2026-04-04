"use client"

import { cn } from "@/lib/utils"

/** 데스크톱 리스트용 테이블 래퍼: 가로 스크롤·테두리·호버 행 스타일은 테이블에 `ops-table` 클래스로 적용 */
export function OpsTableShell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04]",
        className
      )}
    >
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}
