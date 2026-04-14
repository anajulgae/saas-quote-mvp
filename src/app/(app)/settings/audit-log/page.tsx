import type { Metadata } from "next"
import Link from "next/link"

import { PageHeader } from "@/components/app/page-header"
import { buttonVariants } from "@/components/ui/button-variants"
import { BILLING_PAGE_PATH } from "@/lib/billing/catalog"
import { getAuditLogData } from "@/lib/data"
import { formatDateTime } from "@/lib/format"
import { planAllowsFeature } from "@/lib/plan-features"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "감사 로그",
  description: "모든 견적·청구·설정 변경 이력을 시간순으로 확인합니다.",
}

const ACTION_LABELS: Record<string, string> = {
  "quote.created": "견적 생성",
  "quote.updated": "견적 수정",
  "quote.deleted": "견적 삭제",
  "quote.duplicated": "견적 복제",
  "quote.status_changed": "견적 상태 변경",
  "quote.share_token_issued": "견적 공유 링크 발급",
  "quote.linked_to_inquiry": "견적→문의 연결",
  "invoice.created": "청구 생성",
  "invoice.updated": "청구 수정",
  "invoice.payment_status_changed": "결제 상태 변경",
  "invoice.share_token_issued": "청구 공유 링크 발급",
  "invoice.collection_plan_updated": "수금 계획 수정",
  "invoice.messaging_kakao_sent": "카카오 알림톡 발송",
  "customer.created": "고객 등록",
  "customer.portal_token_issued": "고객 포털 발급",
  "inquiry.created": "문의 등록",
  "inquiry.updated": "문의 수정",
  "messaging.channel_saved": "메시징 채널 설정",
  "settings.seal_updated": "직인 설정 변경",
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

function actionColor(action: string): string {
  if (action.includes("created") || action.includes("registered")) return "bg-emerald-500"
  if (action.includes("updated") || action.includes("changed")) return "bg-blue-500"
  if (action.includes("deleted")) return "bg-red-500"
  if (action.includes("sent") || action.includes("issued")) return "bg-amber-500"
  return "bg-muted-foreground"
}

export default async function AuditLogPage() {
  const data = await getAuditLogData({ limit: 200 })

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader title="감사 로그" description="변경 이력을 확인하려면 로그인하세요." />
      </div>
    )
  }

  if (!planAllowsFeature(data.effectivePlan, "audit_log")) {
    return (
      <div className="space-y-6">
        <PageHeader title="감사 로그" description="모든 견적·청구·설정 변경 이력을 시간순으로 확인합니다." />
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            감사 로그는 <strong>Business 플랜</strong>에서 사용할 수 있습니다.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            모든 견적·청구·수금·설정 변경 이력을 타임라인으로 추적하고 내보낼 수 있습니다.
          </p>
          <Link
            href={BILLING_PAGE_PATH}
            className={cn(buttonVariants({ size: "sm" }), "mt-4 inline-flex")}
          >
            플랜 안내
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="감사 로그" description="모든 견적·청구·설정 변경 이력을 시간순으로 확인합니다." />

      <div className="flex items-center gap-2">
        <Link
          href="/settings"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8")}
        >
          ← 설정
        </Link>
        <span className="text-xs text-muted-foreground">총 {data.total}건</span>
      </div>

      {data.entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
          아직 기록된 활동이 없습니다.
        </p>
      ) : (
        <div className="relative space-y-0 border-l-2 border-border/40 pl-6">
          {data.entries.map((entry) => (
            <div key={entry.id} className="relative pb-6">
              <span
                className={cn(
                  "absolute -left-[31px] top-1.5 size-2.5 rounded-full ring-2 ring-background",
                  actionColor(entry.action)
                )}
              />
              <div className="flex flex-col gap-0.5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium">
                    {actionLabel(entry.action)}
                  </span>
                  <time className="text-[10px] text-muted-foreground">
                    {formatDateTime(entry.createdAt)}
                  </time>
                </div>
                <p className="text-xs leading-relaxed text-foreground/90">
                  {entry.description}
                </p>
                {entry.customerName ? (
                  <p className="text-[10px] text-muted-foreground">
                    고객: {entry.customerName}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
