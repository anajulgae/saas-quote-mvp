import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import type { InquiryStage, PaymentStatus, QuoteStatus } from "@/types/domain"

/** 상태칩·필터 톤 — 제품 전역 동일 규칙 */
export type OpsStatusTone =
  | "neutral"
  | "muted"
  | "info"
  | "brand"
  | "success"
  | "warning"
  | "danger"

export type OpsStatusMeta = {
  label: string
  tone: OpsStatusTone
  /** 연체·거절 등 한 단계 더 눈에 띄게 */
  emphasis: boolean
}

const toneClass: Record<OpsStatusTone, string> = {
  neutral:
    "border-border/70 bg-card text-foreground [--ops-chip-ring:theme(colors.border)]",
  muted:
    "border-border/55 bg-muted/55 text-muted-foreground [--ops-chip-ring:theme(colors.border)]",
  info: "border-sky-500/30 bg-sky-500/10 text-sky-950 dark:text-sky-100 [--ops-chip-ring:theme(colors.sky.500)]",
  brand:
    "border-primary/35 bg-primary/12 text-primary [--ops-chip-ring:theme(colors.primary)]",
  success:
    "border-emerald-500/35 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 [--ops-chip-ring:theme(colors.emerald.500)]",
  warning:
    "border-amber-500/40 bg-amber-500/12 text-amber-950 dark:text-amber-50 [--ops-chip-ring:theme(colors.amber.500)]",
  danger:
    "border-destructive/40 bg-destructive/12 text-destructive [--ops-chip-ring:theme(colors.destructive)]",
}

export const opsStatusChipVariants = cva(
  "inline-flex max-w-full shrink-0 items-center justify-center rounded-full border font-semibold tracking-wide whitespace-nowrap transition-colors",
  {
    variants: {
      tone: toneClass,
      size: {
        sm: "h-[18px] px-1.5 text-[10px] leading-none",
        md: "h-5 px-2 py-0 text-[11px] leading-none",
      },
      emphasis: {
        false: "",
        true: "shadow-sm ring-1 ring-[var(--ops-chip-ring)]/25",
      },
    },
    defaultVariants: {
      tone: "neutral",
      size: "md",
      emphasis: false,
    },
  }
)

export type OpsStatusChipVariantProps = VariantProps<typeof opsStatusChipVariants>

const toolbarFilterBase =
  "inline-flex h-8 shrink-0 items-center justify-center rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

/** 툴바 필터 pill — 상태칩과 맞춘 둥근 형태 */
export function opsToolbarFilterClass(
  selected: boolean,
  accent: "default" | "danger" = "default"
): string {
  if (selected && accent === "danger") {
    return `${toolbarFilterBase} border-destructive/45 bg-destructive/14 text-destructive hover:bg-destructive/18`
  }
  if (selected) {
    return `${toolbarFilterBase} border-primary/40 bg-primary/12 text-primary hover:bg-primary/16`
  }
  return `${toolbarFilterBase} border-border/70 bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground`
}

export const INQUIRY_STAGE_VALUES = [
  "new",
  "qualified",
  "quoted",
  "won",
  "lost",
] as const satisfies readonly InquiryStage[]

export const QUOTE_STATUS_VALUES = [
  "draft",
  "sent",
  "approved",
  "rejected",
  "expired",
] as const satisfies readonly QuoteStatus[]

export const PAYMENT_STATUS_VALUES = [
  "pending",
  "deposit_paid",
  "partially_paid",
  "paid",
  "overdue",
] as const satisfies readonly PaymentStatus[]

export function getInquiryStageMeta(stage: InquiryStage): OpsStatusMeta {
  switch (stage) {
    case "new":
      return { label: "신규 문의", tone: "info", emphasis: false }
    case "qualified":
      return { label: "검토 중", tone: "muted", emphasis: false }
    case "quoted":
      return { label: "견적 발송", tone: "brand", emphasis: false }
    case "won":
      return { label: "수주 완료", tone: "success", emphasis: false }
    case "lost":
      return { label: "보류·실패", tone: "muted", emphasis: false }
    default: {
      const _x: never = stage
      return { label: String(_x), tone: "neutral", emphasis: false }
    }
  }
}

export function getQuoteStatusMeta(status: QuoteStatus): OpsStatusMeta {
  switch (status) {
    case "draft":
      return { label: "초안", tone: "neutral", emphasis: false }
    case "sent":
      return { label: "발송됨", tone: "brand", emphasis: false }
    case "approved":
      return { label: "승인", tone: "success", emphasis: false }
    case "rejected":
      return { label: "거절", tone: "danger", emphasis: true }
    case "expired":
      return { label: "만료", tone: "warning", emphasis: false }
    default: {
      const _x: never = status
      return { label: String(_x), tone: "neutral", emphasis: false }
    }
  }
}

/** 도메인·값으로 통합 조회 (대시보드·로그 등에서 스위치 없이 사용) */
export function getOpsStatusMeta(
  ...args:
    | ["inquiry", InquiryStage]
    | ["quote", QuoteStatus]
    | ["payment", PaymentStatus]
): OpsStatusMeta {
  const [kind, value] = args
  if (kind === "inquiry") {
    return getInquiryStageMeta(value)
  }
  if (kind === "quote") {
    return getQuoteStatusMeta(value)
  }
  return getPaymentStatusMeta(value)
}

/** 상태칩(`get*Meta`)과 동일 톤 — 테이블·시트의 상태 SelectTrigger에 사용 */
const opsSelectTriggerToneBase: Record<OpsStatusTone, string> = {
  neutral:
    "border-border/70 bg-card text-foreground hover:bg-muted/35 dark:bg-input/25 dark:hover:bg-input/40",
  muted:
    "border-border/55 bg-muted/50 text-muted-foreground hover:bg-muted/65",
  info: "border-sky-500/35 bg-sky-500/10 text-sky-950 hover:bg-sky-500/[0.18] dark:text-sky-100",
  brand:
    "border-primary/40 bg-primary/10 text-primary hover:bg-primary/[0.18]",
  success:
    "border-emerald-500/40 bg-emerald-500/12 text-emerald-950 hover:bg-emerald-500/[0.18] dark:text-emerald-100",
  warning:
    "border-amber-500/45 bg-amber-500/12 text-amber-950 hover:bg-amber-500/[0.18] dark:text-amber-50",
  danger:
    "border-destructive/45 bg-destructive/10 text-destructive hover:bg-destructive/[0.16]",
}

export function opsStatusSelectTriggerClass(tone: OpsStatusTone, emphasis: boolean): string {
  return cn(
    opsSelectTriggerToneBase[tone],
    emphasis && "font-semibold shadow-sm ring-2 ring-current/12"
  )
}

export function getPaymentStatusMeta(status: PaymentStatus): OpsStatusMeta {
  switch (status) {
    case "pending":
      return { label: "입금 대기", tone: "neutral", emphasis: false }
    case "deposit_paid":
      return { label: "선금 입금", tone: "info", emphasis: false }
    case "partially_paid":
      return { label: "부분 입금", tone: "warning", emphasis: false }
    case "paid":
      return { label: "입금 완료", tone: "success", emphasis: false }
    case "overdue":
      return { label: "연체", tone: "danger", emphasis: true }
    default: {
      const _x: never = status
      return { label: String(_x), tone: "neutral", emphasis: false }
    }
  }
}

/** 견적 유효기한·청구 입금 기한 등 시간 경고 (상태와 별도) */
export type OpsTimeHintKind =
  | "quote_past_due"
  | "quote_due_soon"
  | "invoice_overdue"
  | "invoice_due_soon"

export function getOpsTimeHintMeta(kind: OpsTimeHintKind): OpsStatusMeta {
  switch (kind) {
    case "quote_past_due":
      return { label: "유효기한 경과", tone: "danger", emphasis: true }
    case "quote_due_soon":
      return { label: "유효기한 임박", tone: "warning", emphasis: false }
    case "invoice_overdue":
      return { label: "연체·기한 초과", tone: "danger", emphasis: true }
    case "invoice_due_soon":
      return { label: "입금 기한 임박", tone: "warning", emphasis: false }
    default: {
      const _k: never = kind
      return { label: String(_k), tone: "neutral", emphasis: false }
    }
  }
}

/** 공개 문서·고객용 한 줄 설명 (칩 라벨과 어조 통일) */
export function paymentStatusDocumentLine(status: PaymentStatus): string {
  switch (status) {
    case "pending":
      return "입금 대기 중입니다."
    case "deposit_paid":
      return "선금 입금이 확인되었습니다."
    case "partially_paid":
      return "부분 입금이 확인되었습니다."
    case "paid":
      return "입금이 완료되었습니다."
    case "overdue":
      return "입금 기한이 지났습니다. 확인이 필요합니다."
    default:
      return "결제 상태를 확인 중입니다."
  }
}
