import type { ReactNode } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string
  description: string
  /** 다음 행동(링크·버튼 등) */
  children?: ReactNode
}) {
  return (
    <Card className="border-dashed border-border/70 bg-muted/30">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{description}</p>
        {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
      </CardContent>
    </Card>
  )
}
