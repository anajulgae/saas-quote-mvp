"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDate } from "@/lib/format"
import { getOpsStatusMeta, opsStatusChipVariants, type OpsStatusTone } from "@/lib/ops-status-meta"
import type { BillCalendarEvent } from "@/lib/calendar-events"
import { cn } from "@/lib/utils"
import type { InquiryStage, PaymentStatus, QuoteStatus } from "@/types/domain"

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function monthLabel(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`
}

function startOfCalendarGrid(date: Date) {
  const first = startOfMonth(date)
  return new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay())
}

function formatDateKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function accentClass(tone: OpsStatusTone, emphasis: boolean) {
  const map: Record<OpsStatusTone, string> = {
    neutral: "border-border/65 bg-background text-foreground",
    muted: "border-border/55 bg-muted/40 text-muted-foreground",
    info: "border-sky-500/30 bg-sky-500/[0.08] text-sky-950 dark:text-sky-100",
    brand: "border-primary/30 bg-primary/[0.08] text-primary",
    success: "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-950 dark:text-emerald-100",
    warning: "border-amber-500/35 bg-amber-500/[0.09] text-amber-950 dark:text-amber-100",
    danger: "border-destructive/35 bg-destructive/[0.08] text-destructive",
  }
  return cn(map[tone], emphasis ? "ring-1 ring-current/10" : "")
}

function renderStatusChip(event: BillCalendarEvent) {
  if (!event.statusDomain || !event.statusValue) {
    return null
  }

  const meta =
    event.statusDomain === "inquiry"
      ? getOpsStatusMeta("inquiry", event.statusValue as InquiryStage)
      : event.statusDomain === "payment"
        ? getOpsStatusMeta("payment", event.statusValue as PaymentStatus)
        : getOpsStatusMeta("quote", event.statusValue as QuoteStatus)

  return (
    <span
      className={opsStatusChipVariants({
        tone: meta.tone,
        size: "sm",
        emphasis: meta.emphasis,
      })}
    >
      {meta.label}
    </span>
  )
}

type OpsCalendarViewProps = {
  events: BillCalendarEvent[]
  emptyTitle: string
  emptyDescription: string
  onEventClick?: (event: BillCalendarEvent) => void
  className?: string
}

export function OpsCalendarView({
  events,
  emptyTitle,
  emptyDescription,
  onEventClick,
  className,
}: OpsCalendarViewProps) {
  const today = useMemo(() => new Date(), [])
  const [currentMonth, setCurrentMonth] = useState(() =>
    startOfMonth(events[0] ? new Date(events[0].sortAt) : today)
  )
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)

  const groupedEvents = useMemo(() => {
    const grouped = new Map<string, BillCalendarEvent[]>()
    for (const event of events) {
      const list = grouped.get(event.dateKey) ?? []
      list.push(event)
      grouped.set(event.dateKey, list)
    }
    for (const [key, list] of grouped) {
      grouped.set(
        key,
        [...list].sort((a, b) => a.sortAt - b.sortAt || a.title.localeCompare(b.title, "ko"))
      )
    }
    return grouped
  }, [events])

  const days = useMemo(() => {
    const start = startOfCalendarGrid(currentMonth)
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      return date
    })
  }, [currentMonth])

  const resolvedSelectedDateKey = useMemo(() => {
    if (selectedDateKey && groupedEvents.has(selectedDateKey)) {
      return selectedDateKey
    }
    const todayKey = formatDateKey(today)
    if (groupedEvents.has(todayKey)) {
      return todayKey
    }
    return [...groupedEvents.keys()].sort()[0] ?? null
  }, [groupedEvents, selectedDateKey, today])

  const selectedEvents = resolvedSelectedDateKey ? groupedEvents.get(resolvedSelectedDateKey) ?? [] : []

  if (!events.length) {
    return (
      <Card className={cn("border-border/70", className)}>
        <CardContent className="flex min-h-52 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
          <p className="text-sm font-semibold text-foreground">{emptyTitle}</p>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{emptyDescription}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("border-border/70", className)}>
      <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base font-semibold">달력형 보조 뷰</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">날짜가 잡힌 일정·기한만 모아 봅니다.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setCurrentMonth(startOfMonth(today))}>
            오늘
          </Button>
          <div className="inline-flex items-center rounded-lg border border-border/70 bg-background">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="rounded-r-none"
              onClick={() => setCurrentMonth((prev) => addMonths(prev, -1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="min-w-[7.5rem] px-2 text-center text-sm font-semibold">{monthLabel(currentMonth)}</div>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="rounded-l-none"
              onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted-foreground">
          {["일", "월", "화", "수", "목", "금", "토"].map((label) => (
            <div key={label} className="py-1">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {days.map((date) => {
            const key = formatDateKey(date)
            const dayEvents = groupedEvents.get(key) ?? []
            const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
            const isToday = key === formatDateKey(today)
            const isSelected = key === resolvedSelectedDateKey
            const visibleEvents = dayEvents.slice(0, 3)
            const hiddenCount = Math.max(0, dayEvents.length - visibleEvents.length)
            return (
              <div
                key={key}
                className={cn(
                  "flex min-h-[132px] flex-col rounded-xl border p-2",
                  isCurrentMonth ? "border-border/70 bg-card" : "border-border/45 bg-muted/20 text-muted-foreground",
                  isToday && "border-primary/45 ring-1 ring-primary/15",
                  isSelected && "shadow-sm"
                )}
              >
                <button
                  type="button"
                  className="flex items-center justify-between text-left"
                  onClick={() => setSelectedDateKey(dayEvents.length ? key : null)}
                >
                  <span
                    className={cn(
                      "inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                      isToday && "bg-primary/12 text-primary"
                    )}
                  >
                    {date.getDate()}
                  </span>
                  {dayEvents.length ? (
                    <span className="text-[10px] text-muted-foreground">{dayEvents.length}건</span>
                  ) : null}
                </button>

                <div className="mt-2 space-y-1">
                  {visibleEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      className={cn(
                        "flex w-full flex-col items-start rounded-lg border px-2 py-1.5 text-left",
                        accentClass(event.accent, event.emphasis)
                      )}
                      onClick={() => {
                        setSelectedDateKey(key)
                        onEventClick?.(event)
                      }}
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="line-clamp-1 text-[11px] font-semibold">
                          {event.kindLabel}
                          {event.timeLabel ? ` · ${event.timeLabel}` : ""}
                        </span>
                      </div>
                      <span className="mt-0.5 line-clamp-1 text-[11px] font-medium">{event.title}</span>
                      <span className="line-clamp-1 text-[10px] opacity-80">{event.customerName}</span>
                    </button>
                  ))}
                  {hiddenCount > 0 ? (
                    <button
                      type="button"
                      className="w-full rounded-md border border-dashed border-border/70 px-2 py-1 text-left text-[11px] font-medium text-muted-foreground hover:bg-muted/35"
                      onClick={() => setSelectedDateKey(key)}
                    >
                      + {hiddenCount}건 더보기
                    </button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>

        {resolvedSelectedDateKey && selectedEvents.length ? (
          <section className="rounded-xl border border-border/70 bg-muted/15 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">선택한 날짜</p>
                <p className="text-sm font-semibold text-foreground">{formatDate(resolvedSelectedDateKey)}</p>
              </div>
              <span className="text-xs text-muted-foreground">{selectedEvents.length}건 일정</span>
            </div>
            <div className="mt-3 space-y-2">
              {selectedEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  className={cn(
                    "flex w-full flex-col gap-2 rounded-xl border px-3 py-3 text-left shadow-sm transition-colors hover:bg-background",
                    accentClass(event.accent, event.emphasis)
                  )}
                  onClick={() => onEventClick?.(event)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold opacity-85">
                        {event.kindLabel}
                        {event.timeLabel ? ` · ${event.timeLabel}` : ""}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-sm font-semibold">{event.title}</p>
                      <p className="mt-0.5 text-xs opacity-80">{event.customerName}</p>
                    </div>
                    {renderStatusChip(event)}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs opacity-85">
                    {event.subtitle ? <span>{event.subtitle}</span> : null}
                    {typeof event.amount === "number" ? (
                      <span className="font-semibold tabular-nums">{formatCurrency(event.amount)}</span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </CardContent>
    </Card>
  )
}
