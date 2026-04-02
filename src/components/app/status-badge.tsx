import { Badge } from "@/components/ui/badge"
import type { InquiryStage, PaymentStatus, QuoteStatus } from "@/types/domain"

const inquiryStageMap: Record<
  InquiryStage,
  { label: string; variant: "outline" | "secondary" | "default" | "ghost" }
> = {
  new: { label: "신규 문의", variant: "outline" },
  qualified: { label: "검토 중", variant: "secondary" },
  quoted: { label: "견적 발송", variant: "default" },
  won: { label: "수주 완료", variant: "default" },
  lost: { label: "보류/실패", variant: "ghost" },
}

const quoteStatusMap: Record<
  QuoteStatus,
  {
    label: string
    variant: "outline" | "secondary" | "default" | "destructive" | "ghost"
  }
> = {
  draft: { label: "초안", variant: "outline" },
  sent: { label: "발송됨", variant: "secondary" },
  approved: { label: "승인", variant: "default" },
  rejected: { label: "거절", variant: "destructive" },
  expired: { label: "만료", variant: "ghost" },
}

const paymentStatusMap: Record<
  PaymentStatus,
  {
    label: string
    variant: "outline" | "secondary" | "default" | "destructive"
  }
> = {
  pending: { label: "입금 대기", variant: "outline" },
  deposit_paid: { label: "선금 입금", variant: "secondary" },
  partially_paid: { label: "부분 입금", variant: "secondary" },
  paid: { label: "입금 완료", variant: "default" },
  overdue: { label: "연체", variant: "destructive" },
}

export function InquiryStageBadge({ stage }: { stage: InquiryStage }) {
  const config = inquiryStageMap[stage]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const config = quoteStatusMap[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config = paymentStatusMap[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
