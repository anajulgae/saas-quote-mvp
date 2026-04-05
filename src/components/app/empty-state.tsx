import type { ReactNode } from "react"
import { Inbox } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function EmptyState({
  title,
  description,
  children,
  className,
}: {
  title: string
  description: string
  /** 다음 행동(링크·버튼 등) */
  children?: ReactNode
  className?: string
}) {
  return (
    <Card
      className={cn(
        "border border-dashed border-border/70 bg-muted/15 shadow-none ring-0",
        className
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
            aria-hidden
          >
            <Inbox className="size-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base font-semibold leading-snug">{title}</CardTitle>
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardHeader>
      {children ? (
        <CardContent className="space-y-3 pt-0">
          <div className="flex flex-wrap gap-2 pl-[3.25rem]">{children}</div>
        </CardContent>
      ) : null}
    </Card>
  )
}
