import Link from "next/link"

import { requireAdminAccess } from "@/lib/server/admin-auth"
import { listAdminSupportTickets, SUPPORT_CATEGORY_LABEL, SUPPORT_TICKET_STATUS_LABEL } from "@/lib/server/admin-data"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; cat?: string }>
}) {
  await requireAdminAccess()
  const sp = await searchParams
  const supabase = await createServerSupabaseClient()
  if (!supabase) return <p className="text-red-600">DB 실패</p>

  const { rows, error } = await listAdminSupportTickets(supabase, {
    status: sp.status,
    category: sp.cat,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-zinc-900">고객센터 운영</h1>
        <p className="mt-1 text-sm text-zinc-600">티켓 상태·카테고리·내부 메모로 전화 없이도 처리 흐름을 유지합니다.</p>
      </div>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div>
          <label className="text-xs text-zinc-500">상태</label>
          <select
            name="status"
            defaultValue={sp.status ?? "all"}
            className="mt-0.5 block rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
          >
            <option value="all">전체</option>
            <option value="new">신규</option>
            <option value="in_progress">처리중</option>
            <option value="resolved">답변완료</option>
            <option value="on_hold">보류</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-500">카테고리</label>
          <select
            name="cat"
            defaultValue={sp.cat ?? "all"}
            className="mt-0.5 block rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
          >
            <option value="all">전체</option>
            <option value="general">일반</option>
            <option value="bug">오류</option>
            <option value="billing">결제/구독</option>
            <option value="feature">기능 제안</option>
            <option value="refund">환불</option>
            <option value="cancel">해지</option>
          </select>
        </div>
        <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">
          적용
        </button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 hover:bg-transparent">
              <TableHead className="text-zinc-600">시각</TableHead>
              <TableHead className="text-zinc-600">상태</TableHead>
              <TableHead className="text-zinc-600">분류</TableHead>
              <TableHead className="text-zinc-600">제목</TableHead>
              <TableHead className="text-zinc-600">연락처</TableHead>
              <TableHead className="text-zinc-600">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="border-zinc-200">
                <TableCell colSpan={6} className="py-10 text-center text-sm text-zinc-500">
                  티켓이 없습니다. 고객이 /help/contact 에서 제출하면 여기에 쌓입니다.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((t) => (
                <TableRow key={t.id} className="border-zinc-200 text-sm text-zinc-700">
                  <TableCell className="whitespace-nowrap text-xs text-zinc-500">
                    {new Date(t.created_at).toLocaleString("ko-KR")}
                  </TableCell>
                  <TableCell>{SUPPORT_TICKET_STATUS_LABEL[t.status] ?? t.status}</TableCell>
                  <TableCell>{SUPPORT_CATEGORY_LABEL[t.category] ?? t.category}</TableCell>
                  <TableCell className="max-w-[200px] truncate font-medium text-zinc-900">{t.subject}</TableCell>
                  <TableCell className="text-xs">{t.contact_email}</TableCell>
                  <TableCell>
                    <Link href={`/admin/support/${t.id}`} className="text-xs font-bold text-primary hover:underline">
                      열기
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
