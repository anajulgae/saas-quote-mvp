import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <Card className="border-border/55 transition-shadow duration-200 hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        <div className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">{value}</div>
        <p className="text-sm leading-relaxed text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}
