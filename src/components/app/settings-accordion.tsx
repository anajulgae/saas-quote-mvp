"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export function SettingsAccordionItem({
  id,
  title,
  badge,
  description,
  defaultOpen = false,
  children,
}: {
  id?: string
  title: string
  badge?: React.ReactNode
  description?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      id={id}
      className="rounded-xl border border-border/70 bg-card overflow-hidden"
    >
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors sm:px-5"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
            {badge}
          </div>
          {description && !open ? (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open ? (
        <div className="border-t border-border/50 px-4 py-4 sm:px-5">
          {children}
        </div>
      ) : null}
    </div>
  )
}

export function SettingsAccordionGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="relative py-0.5">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <span className="w-full border-t border-border/60" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
      </div>
      {children}
    </div>
  )
}
