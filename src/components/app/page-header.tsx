import { cn } from "@/lib/utils"

export function PageHeader({
  title,
  description,
  action,
  className,
  /** 코어 화면에서 확장 기능(공개 폼·AI·알림 등)을 메뉴 없이 드러낼 때 */
  capabilityStrip,
}: {
  title: string
  description: string
  action?: React.ReactNode
  className?: string
  capabilityStrip?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-border/70 pb-5 md:flex-row md:items-end md:justify-between",
        className
      )}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[1.65rem] md:leading-snug">
          {title}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        {capabilityStrip ? <div className="max-w-3xl pt-1">{capabilityStrip}</div> : null}
      </div>
      {action ? <div className="shrink-0 md:pb-0.5">{action}</div> : null}
    </div>
  )
}
