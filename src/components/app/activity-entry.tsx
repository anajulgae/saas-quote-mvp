import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import {
  Bell,
  FileText,
  MessageSquare,
  Wallet,
  type LucideIcon,
} from "lucide-react"

import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ActivityKind } from "@/types/domain"

const kindIcon: Record<ActivityKind, LucideIcon> = {
  inquiry: MessageSquare,
  quote: FileText,
  invoice: Wallet,
  reminder: Bell,
  other: FileText,
}

const kindAccent: Record<ActivityKind, string> = {
  inquiry: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  quote: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  invoice: "bg-primary/10 text-primary dark:text-primary",
  reminder: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
  other: "bg-muted text-muted-foreground",
}

export function ActivityEntry({
  label,
  description,
  createdAt,
  kind = "other",
  action,
  className,
}: {
  label: string
  description: string
  createdAt: string
  kind?: ActivityKind
  action?: string
  className?: string
}) {
  const Icon = kindIcon[kind] ?? FileText
  const relative = (() => {
    try {
      return formatDistanceToNow(new Date(createdAt), {
        addSuffix: true,
        locale: ko,
      })
    } catch {
      return ""
    }
  })()

  return (
    <div className={cn("flex gap-3 rounded-xl border border-border/60 bg-card/40 p-3 sm:p-4", className)}>
      <div
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
          kindAccent[kind]
        )}
      >
        <Icon className="size-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-sm font-semibold leading-tight">{label}</p>
          {action ? (
            <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              {action}
            </span>
          ) : null}
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <time dateTime={createdAt}>{formatDateTime(createdAt)}</time>
          {relative ? <span aria-hidden>·</span> : null}
          {relative ? <span>{relative}</span> : null}
        </div>
      </div>
    </div>
  )
}
