import Link from "next/link"

import { requireAdminAccess } from "@/lib/server/admin-auth"
import { getAdminSystemSnapshot } from "@/lib/server/admin-data"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export default async function AdminSystemPage() {
  await requireAdminAccess()
  const supabase = await createServerSupabaseClient()
  if (!supabase) return <p className="text-red-600">DB 실패</p>

  const s = await getAdminSystemSnapshot(supabase)

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-extrabold text-zinc-900">시스템·오류</h1>
        <p className="mt-1 text-sm text-zinc-600">
          APM 대신 DB에 쌓이는 실패·웹훅·메시징·세금계산서 힌트를 모읍니다. `ops_error_events` 는 API에서 적재하면 여기에
          표시됩니다.
        </p>
      </div>

      {s.errors.length > 0 ? <p className="text-sm text-amber-800">조회 경고: {s.errors.join(" · ")}</p> : null}

      <Block title="ops_error_events (최근)">
        {s.opsErrors.length === 0 ? (
          <p className="text-sm text-zinc-600">아직 적재된 운영 오류 이벤트가 없습니다. API·워커에서 insert 하면 여기에 뜹니다.</p>
        ) : (
          <ul className="space-y-2 text-sm text-zinc-700">
            {s.opsErrors.map((e: { id: string; created_at: string; source: string; kind: string; message: string }) => (
              <li key={e.id} className="rounded border border-zinc-200 bg-white px-3 py-2 shadow-sm">
                <span className="text-xs text-zinc-500">{new Date(e.created_at).toLocaleString("ko-KR")}</span>
                <span className="ml-2 text-xs font-mono text-amber-800">{e.source}</span>
                <span className="ml-2 text-xs text-zinc-600">{e.kind}</span>
                <p className="mt-1 text-zinc-800">{e.message}</p>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title="빌링 이벤트 중 오류·실패 키워드">
        {s.billingEventsIssues.length === 0 ? (
          <p className="text-sm text-zinc-600">실패·오류 키워드가 포함된 빌링 메시지가 없습니다.</p>
        ) : (
          <ul className="space-y-1 text-xs text-zinc-600">
            {s.billingEventsIssues.map((e: { id: string; user_id: string; kind: string; message: string }) => (
              <li key={e.id}>
                <Link href={`/admin/users/${e.user_id}`} className="text-primary hover:underline">
                  사용자
                </Link>{" "}
                · {e.kind} — {e.message}
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title="메시징 발송 실패 (7일)">
        {s.messagingFailures.length === 0 ? (
          <p className="text-sm text-zinc-600">실패 로그 없음.</p>
        ) : (
          <ul className="space-y-1 text-xs text-red-700">
            {s.messagingFailures.map((m: { id: string; user_id: string; status: string; error_message: string | null }) => (
              <li key={m.id}>
                <Link href={`/admin/users/${m.user_id}`} className="text-primary hover:underline">
                  사용자
                </Link>{" "}
                · {m.status} · {m.error_message ?? "—"}
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title="미처리 결제 웹훅">
        {s.webhooksPending.length === 0 ? (
          <p className="text-sm text-zinc-600">대기 중인 웹훅 없음.</p>
        ) : (
          <ul className="space-y-1 text-xs text-amber-900">
            {s.webhooksPending.map((w: { id: string; provider: string; event_type: string; created_at: string }) => (
              <li key={w.id}>
                {w.provider} · {w.event_type} · {new Date(w.created_at).toLocaleString("ko-KR")}
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title="전자세금계산서 failure_reason (7일)">
        {s.taxFailures.length === 0 ? (
          <p className="text-sm text-zinc-600">실패 사유 없음.</p>
        ) : (
          <ul className="space-y-1 text-xs text-zinc-700">
            {s.taxFailures.map((t: { id: string; user_id: string; failure_reason: string }) => (
              <li key={t.id}>
                <Link href={`/admin/users/${t.user_id}`} className="text-primary hover:underline">
                  사용자
                </Link>{" "}
                · {t.failure_reason}
              </li>
            ))}
          </ul>
        )}
      </Block>
    </div>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-bold text-zinc-800">{title}</h2>
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">{children}</div>
    </section>
  )
}
