"use client"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

/** 견적·청구 등 우측 상세 패널 */
export function OpsDetailSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  contentClassName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  contentClassName?: string
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton
        className={cn(
          "flex h-full w-full !max-w-full flex-col gap-0 border-l border-border/60 p-0 sm:!max-w-md md:!max-w-lg lg:!max-w-xl",
          contentClassName
        )}
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border/60 px-4 py-4 text-left sm:px-5">
          <SheetTitle className="text-base leading-snug">{title}</SheetTitle>
          {description ? (
            <SheetDescription className="text-xs leading-relaxed">{description}</SheetDescription>
          ) : null}
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-border/60 bg-muted/10 px-4 py-3 sm:px-5">{footer}</div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
