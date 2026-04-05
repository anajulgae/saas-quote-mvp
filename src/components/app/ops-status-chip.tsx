import type { ButtonHTMLAttributes } from "react"

import { cn } from "@/lib/utils"
import {
  getInquiryStageMeta,
  getOpsTimeHintMeta,
  getPaymentStatusMeta,
  getQuoteStatusMeta,
  opsStatusChipVariants,
  opsToolbarFilterClass,
  type OpsTimeHintKind,
} from "@/lib/ops-status-meta"
import type { InquiryStage, PaymentStatus, QuoteStatus } from "@/types/domain"

type ChipSize = "sm" | "md"

export function OpsStatusChip(
  props:
    | { domain: "inquiry"; stage: InquiryStage; size?: ChipSize; className?: string }
    | { domain: "quote"; status: QuoteStatus; size?: ChipSize; className?: string }
    | { domain: "payment"; status: PaymentStatus; size?: ChipSize; className?: string }
) {
  const size = props.size ?? "md"
  const meta =
    props.domain === "inquiry"
      ? getInquiryStageMeta(props.stage)
      : props.domain === "quote"
        ? getQuoteStatusMeta(props.status)
        : getPaymentStatusMeta(props.status)

  return (
    <span
      className={cn(
        opsStatusChipVariants({
          tone: meta.tone,
          size,
          emphasis: meta.emphasis,
        }),
        props.className
      )}
    >
      {meta.label}
    </span>
  )
}

export function OpsTimeHintChip({
  kind,
  size = "sm",
  className,
}: {
  kind: OpsTimeHintKind
  size?: ChipSize
  className?: string
}) {
  const meta = getOpsTimeHintMeta(kind)
  return (
    <span
      className={cn(
        opsStatusChipVariants({
          tone: meta.tone,
          size,
          emphasis: meta.emphasis,
        }),
        "w-fit",
        className
      )}
    >
      {meta.label}
    </span>
  )
}

export function OpsToolbarFilterButton({
  selected,
  accent = "default",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  selected: boolean
  accent?: "default" | "danger"
}) {
  return (
    <button
      type="button"
      className={cn(opsToolbarFilterClass(selected, accent), className)}
      {...rest}
    >
      {children}
    </button>
  )
}
