import { OpsStatusChip } from "@/components/app/ops-status-chip"
import type { InquiryStage, PaymentStatus, QuoteStatus } from "@/types/domain"

export function InquiryStageBadge({
  stage,
  className,
}: {
  stage: InquiryStage
  className?: string
}) {
  return <OpsStatusChip domain="inquiry" stage={stage} className={className} />
}

export function QuoteStatusBadge({
  status,
  className,
}: {
  status: QuoteStatus
  className?: string
}) {
  return <OpsStatusChip domain="quote" status={status} className={className} />
}

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: PaymentStatus
  className?: string
}) {
  return <OpsStatusChip domain="payment" status={status} className={className} />
}
