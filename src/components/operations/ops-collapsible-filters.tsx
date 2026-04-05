"use client"

import { ChevronDown, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** 툴바에서 추가 필터를 접었다 펼칩니다 */
export function OpsCollapsibleFilters({
  open,
  onOpenChange,
  label = "추가 필터",
  children,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  label?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("w-full border-t border-border/40 pt-2 sm:border-t-0 sm:pt-0", className)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-full justify-start gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground sm:w-auto"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
      >
        {open ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
        {label}
      </Button>
      {open ? (
        <div className="mt-2 flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">{children}</div>
      ) : null}
    </div>
  )
}
