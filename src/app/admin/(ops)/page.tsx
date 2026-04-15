import Link from "next/link"

import { requireAdminAccess } from "@/lib/server/admin-auth"
import { formatPlanLabel, getAdminDashboardKpis } from "@/lib/server/admin-data"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

function Kpi({
  label,
  value,
  hint,
  warn,
}: {
  label: string
  value: string | number
  hint?: string
  warn?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-200 bg-white p-4 shadow-sm",
        warn && "border-amber-300 bg-amber-50"
      )}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums text-zinc-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  )
}

export default async function AdminDashboardPage() {
  await requireAdminAccess()
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return <p className="text-sm text-red-600">Supabase 클라이언트를 만들 수 없습니다.</p>
  }

  const k = await getAdminDashboardKpis(supabase)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-extrabold text-zinc-900">운영 개요</h1>
        <p className="mt-1 text-sm text-zinc-600">
          실시간 판단용 지표입니다. 화려한 차트보다 이상 징후·구독·문의·사용량을 우선합니다.
        </p>
      </div>

      {k.alerts.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-bold text-amber-900">주의</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-amber-900/90">
            {k.alerts.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-bold text-zinc-800">사용자·구독</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="전체 사용자" value={k.totals.users} />
          <Kpi label="구독 활성(체험+유료)" value={k.totals.activeSubscription} hint="trialing + active" />
          <Kpi label="체험 중" value={k.totals.trialing} />
          <Kpi label="유료 active" value={k.totals.paidActive} />
          <Kpi
            label="체험 만료 예정(7일)"
            value={k.totals.trialExpiring7d}
            warn={k.totals.trialExpiring7d > 0}
          />
          <Kpi label="결제 실패 past_due" value={k.totals.pastDue} warn={k.totals.pastDue > 0} />
          <Kpi label="해지 예약" value={k.totals.cancelScheduled} />
          <Kpi label="체험 만료 상태" value={k.totals.trialExpired} hint="trial_expired" />
          <Kpi label="비활성 계정" value={k.totals.disabledAccounts} />
          <Kpi label="운영자 계정" value={k.totals.admins} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold text-zinc-800">기간 지표 (7일 / 30일)</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            label="신규 가입 7일"
            value={k.periods.signups7d}
            hint={`전기간 대비: ${k.periods.signupsPrev7d}`}
          />
          <Kpi label="신규 가입 30일" value={k.periods.signups30d} hint={`전 30일: ${k.periods.signupsPrev30d}`} />
          <Kpi label="고객센터 문의 7일" value={k.periods.supportTickets7d} />
          <Kpi label="고객센터 문의 30일" value={k.periods.supportTickets30d} />
          <Kpi label="공개 문의 제출 7일" value={k.periods.publicInquiries7d} />
          <Kpi label="공개 문의 제출 30일" value={k.periods.publicInquiries30d} />
          <Kpi label="document_send 7일" value={k.periods.documentSends7d} />
          <Kpi label="document_send 30일" value={k.periods.documentSends30d} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold text-zinc-800">이번 달 사용량 합계</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Kpi label="AI 호출 합계" value={k.usageMonth.aiCallsSum} hint={`월: ${k.usageMonth.month}`} />
          <Kpi label="문서 발송 합계" value={k.usageMonth.documentSendsSum} />
          <Kpi label="집계 대상 사용자 수" value={k.usageMonth.usersInMonth} hint="usage_month 일치 행" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold text-zinc-800">플랜 분포</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(k.planDistribution).map(([plan, n]) => (
            <span
              key={plan}
              className="rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-800"
            >
              {formatPlanLabel(plan)} · {n}
            </span>
          ))}
          {Object.keys(k.planDistribution).length === 0 ? (
            <span className="text-sm text-zinc-500">아직 사용자 행이 없거나 플랜 데이터가 비어 있습니다.</span>
          ) : null}
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-zinc-800">바로가기</h2>
          <Link href="/admin/billing" className="text-xs font-semibold text-primary hover:underline">
            구독·결제 이슈 목록 →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="미처리 웹훅" value={k.webhookUnprocessed} warn={k.webhookUnprocessed > 0} />
        </div>
      </section>
    </div>
  )
}
