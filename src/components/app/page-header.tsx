import { cn } from "@/lib/utils"

export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-border/70 pb-5 md:flex-row md:items-end md:justify-between",
        className
      )}
    >
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[1.65rem] md:leading-snug">
          {title}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
