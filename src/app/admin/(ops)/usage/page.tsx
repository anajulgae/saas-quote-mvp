import Link from "next/link"

import { requireAdminAccess } from "@/lib/server/admin-auth"
import { formatPlanLabel, getAdminUsageSnapshot } from "@/lib/server/admin-data"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function AdminUsagePage() {
  await requireAdminAccess()
  const supabase = await createServerSupabaseClient()
  if (!supabase) return <p className="text-red-600">DB 실패</p>

  const u = await getAdminUsageSnapshot(supabase)

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-extrabold text-zinc-900">사용량·리소스</h1>
        <p className="mt-1 text-sm text-zinc-600">
          AI·문서 발송·공개 폼·포털 활성 규모를 봅니다. 월별 합계는 `users.usage_month` 가 현재 월인 행만 합산합니다.
        </p>
      </div>

      {u.error ? <p className="text-sm text-amber-800">데이터 경고: {u.error}</p> : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-zinc-500">집계 월</p>
          <p className="mt-1 text-2xl font-extrabold text-zinc-900">{u.month}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-zinc-500">공개 문의 폼 ON</p>
          <p className="mt-1 text-2xl font-extrabold text-zinc-900">{u.publicFormsEnabled}</p>
          <p className="mt-1 text-xs text-zinc-500">business_settings.public_inquiry_form_enabled</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-zinc-500">포털 토큰 보유 고객(근사)</p>
          <p className="mt-1 text-2xl font-extrabold text-zinc-900">{u.customersWithPortalApprox}</p>
          <p className="mt-1 text-xs text-zinc-500">샘플 최대 5000명 기준 고유 user_id 수</p>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-zinc-800">플랜별 이번 달 합계</h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-200 hover:bg-transparent">
                <TableHead className="text-zinc-600">플랜</TableHead>
                <TableHead className="text-right text-zinc-600">사용자 수</TableHead>
                <TableHead className="text-right text-zinc-600">AI 합</TableHead>
                <TableHead className="text-right text-zinc-600">발송 합</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(u.byPlan).map(([plan, agg]) => (
                <TableRow key={plan} className="border-zinc-200 text-sm text-zinc-800">
                  <TableCell>{formatPlanLabel(plan)}</TableCell>
                  <TableCell className="text-right tabular-nums">{agg.n}</TableCell>
                  <TableCell className="text-right tabular-nums">{agg.ai}</TableCell>
                  <TableCell className="text-right tabular-nums">{agg.doc}</TableCell>
                </TableRow>
              ))}
              {Object.keys(u.byPlan).length === 0 ? (
                <TableRow className="border-zinc-200">
                  <TableCell colSpan={4} className="text-center text-zinc-500">
                    이번 달 usage_month 일치 행이 없습니다.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-zinc-800">AI 호출 상위</h2>
        <RankTable rows={u.topAi} kind="ai" />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-zinc-800">문서 발송 상위</h2>
        <RankTable rows={u.topDoc} kind="doc" />
      </section>
    </div>
  )
}

function RankTable({
  rows,
  kind,
}: {
  rows: {
    id: string
    email: string | null
    full_name: string
    plan: string
    ai_calls_this_month: number
    document_sends_this_month: number
  }[]
  kind: "ai" | "doc"
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-200 hover:bg-transparent">
            <TableHead className="text-zinc-600">사용자</TableHead>
            <TableHead className="text-zinc-600">플랜</TableHead>
            <TableHead className="text-right text-zinc-600">{kind === "ai" ? "AI" : "발송"}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow className="border-zinc-200">
              <TableCell colSpan={3} className="text-center text-sm text-zinc-500">
                데이터 없음
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.id} className="border-zinc-200 text-sm text-zinc-800">
                <TableCell>
                  <Link href={`/admin/users/${r.id}`} className="font-medium text-primary hover:underline">
                    {r.full_name}
                  </Link>
                  <div className="text-xs text-zinc-500">{r.email ?? ""}</div>
                </TableCell>
                <TableCell>{formatPlanLabel(r.plan)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {kind === "ai" ? r.ai_calls_this_month : r.document_sends_this_month}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
