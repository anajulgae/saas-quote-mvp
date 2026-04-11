import Link from "next/link"

import { requireAdminAccess } from "@/lib/server/admin-auth"
import { formatPlanLabel, listAdminUsers } from "@/lib/server/admin-data"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string; sub?: string }>
}) {
  await requireAdminAccess()
  const sp = await searchParams
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return <p className="text-sm text-red-600">DB 연결 실패</p>
  }

  const { rows, error } = await listAdminUsers(supabase, {
    q: sp.q,
    plan: sp.plan,
    subscriptionStatus: sp.sub,
    limit: 80,
    offset: 0,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-zinc-900">사용자</h1>
        <p className="mt-1 text-sm text-zinc-600">이름·이메일·플랜·구독·사용량·최근 활동을 한 번에 추적합니다.</p>
      </div>

      <form className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end" method="get">
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs font-semibold text-zinc-500">검색</label>
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="이메일·이름·상호"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-600"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-zinc-500">플랜</label>
          <select
            name="plan"
            defaultValue={sp.plan ?? "all"}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
          >
            <option value="all">전체</option>
            <option value="starter">스타터</option>
            <option value="pro">프로</option>
            <option value="business">비즈니스</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-zinc-500">구독 상태</label>
          <select
            name="sub"
            defaultValue={sp.sub ?? "all"}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
          >
            <option value="all">전체</option>
            <option value="trialing">trialing</option>
            <option value="active">active</option>
            <option value="past_due">past_due</option>
            <option value="canceled">canceled</option>
            <option value="trial_expired">trial_expired</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
        >
          조회
        </button>
      </form>

      {error ? <p className="text-sm text-red-600">목록 오류: {error}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 hover:bg-transparent">
              <TableHead className="text-zinc-600">이메일 / 이름</TableHead>
              <TableHead className="text-zinc-600">플랜</TableHead>
              <TableHead className="text-zinc-600">구독</TableHead>
              <TableHead className="text-zinc-600">체험 종료</TableHead>
              <TableHead className="text-right text-zinc-600">AI</TableHead>
              <TableHead className="text-right text-zinc-600">발송</TableHead>
              <TableHead className="text-zinc-600">상태</TableHead>
              <TableHead className="text-zinc-600">가입</TableHead>
              <TableHead className="text-zinc-600">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="border-zinc-200">
                <TableCell colSpan={9} className="py-10 text-center text-sm text-zinc-500">
                  조건에 맞는 사용자가 없습니다. 검색어·필터를 바꾸거나 DB에 사용자 행이 있는지 확인하세요.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((u) => (
                <TableRow key={u.id} className="border-zinc-200 text-zinc-800">
                  <TableCell>
                    <div className="font-medium text-zinc-900">{u.full_name}</div>
                    <div className="text-xs text-zinc-500">{u.email ?? "(이메일 미동기)"}</div>
                  </TableCell>
                  <TableCell className="text-sm">{formatPlanLabel(u.plan)}</TableCell>
                  <TableCell className="text-xs">{u.subscription_status ?? "—"}</TableCell>
                  <TableCell className="text-xs text-zinc-600">
                    {u.trial_ends_at ? new Date(u.trial_ends_at).toLocaleDateString("ko-KR") : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{u.ai_calls_this_month}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{u.document_sends_this_month}</TableCell>
                  <TableCell className="text-xs">
                    {u.account_disabled ? (
                      <span className="text-red-600">비활성</span>
                    ) : u.cancel_at_period_end ? (
                      <span className="text-amber-700">해지예약</span>
                    ) : (
                      <span className="text-zinc-500">정상</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-zinc-500">
                    {new Date(u.created_at).toLocaleDateString("ko-KR")}
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/users/${u.id}`} className="text-xs font-bold text-primary hover:underline">
                      상세
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
