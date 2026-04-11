import Link from "next/link"
import { notFound } from "next/navigation"

import { AdminTicketForm } from "@/components/admin/admin-ticket-form"
import { requireAdminAccess } from "@/lib/server/admin-auth"
import { SUPPORT_CATEGORY_LABEL, SUPPORT_TICKET_STATUS_LABEL } from "@/lib/server/admin-data"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export default async function AdminSupportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminAccess()
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  if (!supabase) notFound()

  const { data: t, error } = await supabase.from("support_tickets").select("*").eq("id", id).maybeSingle()
  if (error || !t) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/admin/support" className="text-xs font-semibold text-primary hover:underline">
        ← 티켓 목록
      </Link>
      <div>
        <h1 className="text-xl font-extrabold text-zinc-900">{t.subject}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {SUPPORT_TICKET_STATUS_LABEL[t.status] ?? t.status} · {SUPPORT_CATEGORY_LABEL[t.category] ?? t.category} ·{" "}
          {new Date(t.created_at).toLocaleString("ko-KR")}
        </p>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <h2 className="text-sm font-bold text-zinc-600">고객 본문</h2>
        <pre className="mt-2 whitespace-pre-wrap text-sm text-zinc-800">{t.body}</pre>
        <p className="mt-3 text-xs text-zinc-500">회신: {t.contact_email}</p>
        {t.user_id ? (
          <p className="mt-1 text-xs">
            <Link href={`/admin/users/${t.user_id}`} className="text-primary hover:underline">
              연결된 사용자 프로필 →
            </Link>
          </p>
        ) : (
          <p className="mt-1 text-xs text-zinc-600">비로그인 제출 (user_id 없음)</p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-zinc-800">처리</h2>
        <AdminTicketForm ticketId={t.id} initialStatus={t.status} initialNote={t.operator_note} />
      </section>
    </div>
  )
}
