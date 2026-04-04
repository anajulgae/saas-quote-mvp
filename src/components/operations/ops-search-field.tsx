"use client"

import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function OpsSearchField({
  value,
  onChange,
  placeholder = "검색…",
  className,
  "aria-label": ariaLabel = "검색",
}: {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  className?: string
  "aria-label"?: string
}) {
  return (
    <div className={cn("relative min-w-0 flex-1", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 pl-9"
        aria-label={ariaLabel}
      />
    </div>
  )
}
