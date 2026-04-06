import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button-variants"
import { formatCurrency, formatDate } from "@/lib/format"
import { getOpsStatusMeta, opsStatusChipVariants } from "@/lib/ops-status-meta"
import type { BillCalendarEvent } from "@/lib/calendar-events"
import { cn } from "@/lib/utils"
import type { InquiryStage, PaymentStatus, QuoteStatus } from "@/types/domain"

function statusChip(event: BillCalendarEvent) {
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

function hrefForEvent(event: BillCalendarEvent) {
  if (event.entityKind === "inquiry") {
    return `/inquiries?focus=${event.relatedEntityId}`
  }
  if (event.entityKind === "invoice") {
    return `/invoices?focus=${event.relatedEntityId}`
  }
  return `/quotes?focus=${event.relatedEntityId}`
}

export function OpsAgendaList({
  title,
  description,
  events,
  emptyText,
}: {
  title: string
  description?: string
  events: BillCalendarEvent[]
  emptyText: string
}) {
  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-0.5 pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description ? <CardDescription className="text-xs">{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {!events.length ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/15 px-3 py-4 text-sm text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <Link
                key={event.id}
                href={hrefForEvent(event)}
                className="flex flex-col gap-2 rounded-xl border border-border/65 bg-card px-3 py-3 shadow-sm transition-colors hover:bg-muted/20"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {formatDate(event.date)} · {event.kindLabel}
                      {event.timeLabel ? ` ${event.timeLabel}` : ""}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-foreground">{event.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{event.customerName}</p>
                  </div>
                  {statusChip(event)}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {event.subtitle ? <span>{event.subtitle}</span> : null}
                  {typeof event.amount === "number" ? (
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatCurrency(event.amount)}
                    </span>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
        {events.length ? (
          <div className="mt-3">
            <span className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "pointer-events-none px-0 text-xs text-muted-foreground")}>
              항목을 누르면 해당 화면 상세로 이동합니다
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
