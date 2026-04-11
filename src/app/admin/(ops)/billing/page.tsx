import Link from "next/link"

import { requireAdminAccess } from "@/lib/server/admin-auth"
import { formatPlanLabel, getAdminBillingOps } from "@/lib/server/admin-data"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function AdminBillingPage() {
  await requireAdminAccess()
  const supabase = await createServerSupabaseClient()
  if (!supabase) return <p className="text-red-600">DB 실패</p>

  const b = await getAdminBillingOps(supabase)

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-extrabold text-zinc-900">구독·결제 운영</h1>
        <p className="mt-1 text-sm text-zinc-600">체험 만료·결제 실패·해지 예약·웹훅·빌링 이벤트를 한 흐름으로 봅니다.</p>
      </div>

      {b.errors.length > 0 ? (
        <p className="text-sm text-amber-800">일부 블록 경고: {b.errors.join(" · ")}</p>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-bold text-zinc-800">플랜별 사용자 수</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(b.planDistribution).map(([p, n]) => (
            <span key={p} className="rounded-md border border-zinc-200 bg-zinc-100 px-3 py-1 text-sm text-zinc-800">
              {formatPlanLabel(p)} · {n}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-amber-900">체험 만료 예정 (7일)</h2>
        <MiniTable
          rows={b.trialExpiring as { id: string; email: string | null; full_name: string; trial_ends_at: string | null }[]}
          cols={[
            { k: "full_name", label: "이름" },
            { k: "email", label: "이메일" },
            { k: "trial_ends_at", label: "종료", fmt: (v) => (v ? new Date(String(v)).toLocaleString("ko-KR") : "—") },
          ]}
        />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-red-700">결제 실패 (past_due)</h2>
        <MiniTable
          rows={b.pastDue as { id: string; email: string | null; full_name: string }[]}
          cols={[
            { k: "full_name", label: "이름" },
            { k: "email", label: "이메일" },
          ]}
        />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-zinc-800">해지 예약</h2>
        <MiniTable
          rows={
            b.cancelScheduled as {
              id: string
              email: string | null
              full_name: string
              current_period_end: string | null
            }[]
          }
          cols={[
            { k: "full_name", label: "이름" },
            { k: "email", label: "이메일" },
            {
              k: "current_period_end",
              label: "기간 종료",
              fmt: (v) => (v ? new Date(String(v)).toLocaleDateString("ko-KR") : "—"),
            },
          ]}
        />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-zinc-800">결제수단 미등록 (trialing/active)</h2>
        <MiniTable
          rows={b.noPaymentMethod as { id: string; email: string | null; full_name: string }[]}
          cols={[
            { k: "full_name", label: "이름" },
            { k: "email", label: "이메일" },
          ]}
        />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-zinc-800">billing_events 최근</h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-200 hover:bg-transparent">
                <TableHead className="text-zinc-600">시각</TableHead>
                <TableHead className="text-zinc-600">사용자</TableHead>
                <TableHead className="text-zinc-600">종류</TableHead>
                <TableHead className="text-zinc-600">메시지</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {b.recentBillingEvents.map((e) => (
                <TableRow key={e.id} className="border-zinc-200 text-xs text-zinc-700">
                  <TableCell>{new Date(e.created_at).toLocaleString("ko-KR")}</TableCell>
                  <TableCell>
                    <Link href={`/admin/users/${e.user_id}`} className="text-primary hover:underline">
                      {e.user_id.slice(0, 8)}…
                    </Link>
                  </TableCell>
                  <TableCell>{e.kind}</TableCell>
                  <TableCell>{e.message}</TableCell>
                </TableRow>
              ))}
              {b.recentBillingEvents.length === 0 ? (
                <TableRow className="border-zinc-200">
                  <TableCell colSpan={4} className="text-center text-zinc-500">
                    이벤트 없음
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-zinc-800">웹훅 수신 (최근)</h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-200 hover:bg-transparent">
                <TableHead className="text-zinc-600">시각</TableHead>
                <TableHead className="text-zinc-600">provider</TableHead>
                <TableHead className="text-zinc-600">유형</TableHead>
                <TableHead className="text-zinc-600">처리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {b.recentWebhooks.map((w) => (
                <TableRow key={w.id} className="border-zinc-200 text-xs text-zinc-700">
                  <TableCell>{new Date(w.created_at).toLocaleString("ko-KR")}</TableCell>
                  <TableCell>{w.provider}</TableCell>
                  <TableCell>{w.event_type}</TableCell>
                  <TableCell>{w.processed ? "완료" : "대기"}</TableCell>
                </TableRow>
              ))}
              {b.recentWebhooks.length === 0 ? (
                <TableRow className="border-zinc-200">
                  <TableCell colSpan={4} className="text-center text-zinc-500">
                    웹훅 기록 없음 (또는 미연동)
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}

function MiniTable({
  rows,
  cols,
}: {
  rows: Record<string, unknown>[]
  cols: { k: string; label: string; fmt?: (v: unknown) => string }[]
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-200 hover:bg-transparent">
            {cols.map((c) => (
              <TableHead key={c.k} className="text-zinc-600">
                {c.label}
              </TableHead>
            ))}
            <TableHead className="text-zinc-600">액션</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow className="border-zinc-200">
              <TableCell colSpan={cols.length + 1} className="text-center text-sm text-zinc-500">
                데이터 없음 — 정상일 수 있습니다.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={String(r.id)} className="border-zinc-200 text-sm text-zinc-800">
                {cols.map((c) => (
                  <TableCell key={c.k}>
                    {c.fmt ? c.fmt(r[c.k]) : String(r[c.k] ?? "—")}
                  </TableCell>
                ))}
                <TableCell>
                  <Link href={`/admin/users/${String(r.id)}`} className="text-xs font-bold text-primary hover:underline">
                    사용자
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
