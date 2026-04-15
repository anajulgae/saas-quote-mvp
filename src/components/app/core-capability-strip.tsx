"use client"

import Link from "next/link"

import { cn } from "@/lib/utils"

export type CoreCapabilityItem = {
  label: string
  /** 내부 링크 — 없으면 안내 문구만(비클릭) */
  href?: string
  /** 시각적 강조(주요 진입점) */
  emphasis?: boolean
}

/**
 * 코어 화면 헤더 아래 — 메뉴를 늘리지 않고 확장 기능 레이어를 한 줄로 노출
 */
export function CoreCapabilityStrip({
  items,
  className,
}: {
  items: CoreCapabilityItem[]
  className?: string
}) {
  if (!items.length) {
    return null
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-1 gap-y-1.5 text-xs leading-tight text-muted-foreground",
        className
      )}
    >
      <span className="mr-0.5 shrink-0 font-medium text-foreground/80">함께 쓰는 기능</span>
      <span className="text-border" aria-hidden>
        ·
      </span>
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="inline-flex items-center gap-x-1">
          {i > 0 ? (
            <span className="text-border" aria-hidden>
              ·
            </span>
          ) : null}
          {item.href ? (
            <Link
              href={item.href}
              className={cn(
                "rounded-md px-1.5 py-0.5 font-medium underline-offset-2 transition-colors hover:text-foreground hover:underline",
                item.emphasis ? "text-primary hover:text-primary" : "text-muted-foreground"
              )}
            >
              {item.label}
            </Link>
          ) : (
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5",
                item.emphasis ? "font-medium text-foreground/90" : ""
              )}
            >
              {item.label}
            </span>
          )}
        </span>
      ))}
    </div>
  )
}
