import Link from "next/link"
import { notFound } from "next/navigation"

import { AdminUserActions } from "@/components/admin/admin-user-actions"
import { requireAdminAccess } from "@/lib/server/admin-auth"
import { formatPlanLabel, getAdminUserDetail } from "@/lib/server/admin-data"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminAccess()
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  if (!supabase) notFound()

  const detail = await getAdminUserDetail(supabase, id)
  if ("error" in detail) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">{detail.error}</p>
        <Link href="/admin/users" className="text-sm text-primary hover:underline">
          ← 목록
        </Link>
      </div>
    )
  }

  const u = detail.user as Record<string, unknown>

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/users" className="text-xs font-semibold text-primary hover:underline">
            ← 사용자 목록
          </Link>
          <h1 className="mt-2 text-xl font-extrabold text-zinc-900">{String(u.full_name ?? "")}</h1>
          <p className="text-sm text-zinc-600">{String(u.email ?? "") || "이메일 미동기 — 로그인 시 갱신됩니다"}</p>
        </div>
      </div>

      {detail.loadErrors.length > 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          일부 블록 로드 경고: {detail.loadErrors.join(" · ")}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <h2 className="text-sm font-bold text-zinc-800">계정·플랜</h2>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-zinc-500">플랜</dt>
                <dd className="font-semibold text-zinc-900">{formatPlanLabel(String(u.plan ?? ""))}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">구독 상태</dt>
                <dd className="text-zinc-800">{String(u.subscription_status ?? "—")}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">체험 종료</dt>
                <dd className="text-zinc-800">
                  {u.trial_ends_at ? new Date(String(u.trial_ends_at)).toLocaleString("ko-KR") : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">해지 예약</dt>
                <dd className="text-zinc-800">{u.cancel_at_period_end ? "예" : "아니오"}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">결제수단</dt>
                <dd className="text-zinc-800">
                  {u.payment_method_brand
                    ? `${String(u.payment_method_brand)} ·••• ${String(u.payment_method_last4 ?? "")}`
                    : "미등록"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">계정</dt>
                <dd className={u.account_disabled ? "text-red-400" : "text-emerald-400"}>
                  {u.account_disabled ? "비활성" : "활성"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <h2 className="text-sm font-bold text-zinc-800">사용량 (이번 usage_month)</h2>
            <p className="mt-1 text-xs text-zinc-500">월 경계 리셋은 bump_user_usage·record_document_send 흐름을 따릅니다.</p>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-zinc-500">월 키</dt>
                <dd className="font-mono text-zinc-900">{String(u.usage_month ?? "—")}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">AI 호출</dt>
                <dd className="tabular-nums text-zinc-900">{String(u.ai_calls_this_month ?? 0)}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">문서 발송</dt>
                <dd className="tabular-nums text-zinc-900">{String(u.document_sends_this_month ?? 0)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <h2 className="text-sm font-bold text-zinc-800">공개 폼·포털</h2>
            <p className="mt-2 text-sm text-zinc-800">
              공개 문의 폼:{" "}
              <strong className="text-zinc-900">
                {detail.businessSettings?.public_inquiry_form_enabled ? "켜짐" : "꺼짐"}
              </strong>
            </p>
            <p className="mt-1 text-sm text-zinc-800">
              포털 고객(토큰 보유): <strong className="text-zinc-900">{detail.portalCustomerCount}</strong> / 전체 고객{" "}
              {detail.customersTotal}
            </p>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <h2 className="text-sm font-bold text-zinc-800">최근 문의·견적·청구</h2>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold text-zinc-500">문의</p>
                <ul className="mt-1 space-y-1 text-xs text-zinc-800">
                  {detail.recentInquiries.map((r) => (
                    <li key={r.id}>
                      {String((r as { stage?: string }).stage ?? "")} · {new Date(r.created_at).toLocaleDateString("ko-KR")}
                    </li>
                  ))}
                  {detail.recentInquiries.length === 0 ? <li className="text-zinc-600">없음</li> : null}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-500">견적</p>
                <ul className="mt-1 space-y-1 text-xs text-zinc-800">
                  {detail.recentQuotes.map((r) => (
                    <li key={r.id}>
                      {r.status} · {new Date(r.created_at).toLocaleDateString("ko-KR")}
                    </li>
                  ))}
                  {detail.recentQuotes.length === 0 ? <li className="text-zinc-600">없음</li> : null}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-500">청구</p>
                <ul className="mt-1 space-y-1 text-xs text-zinc-800">
                  {detail.recentInvoices.map((r) => (
                    <li key={r.id}>
                      {r.payment_status} · {new Date(r.created_at).toLocaleDateString("ko-KR")}
                    </li>
                  ))}
                  {detail.recentInvoices.length === 0 ? <li className="text-zinc-600">없음</li> : null}
                </ul>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <h2 className="text-sm font-bold text-zinc-800">고객센터 티켓</h2>
            <ul className="mt-2 space-y-2 text-sm text-zinc-800">
              {detail.supportTickets.map((t) => (
                <li key={t.id}>
                  <Link href={`/admin/support/${t.id}`} className="font-semibold text-primary hover:underline">
                    {t.subject}
                  </Link>
                  <span className="ml-2 text-xs text-zinc-500">{t.status}</span>
                </li>
              ))}
              {detail.supportTickets.length === 0 ? <li className="text-zinc-600">티켓 없음</li> : null}
            </ul>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <h2 className="text-sm font-bold text-zinc-800">빌링 이벤트</h2>
            <ul className="mt-2 max-h-60 space-y-1 overflow-y-auto text-xs text-zinc-600">
              {detail.billingEvents.map((e) => (
                <li key={e.id}>
                  <span className="text-zinc-500">{new Date(e.created_at).toLocaleString("ko-KR")}</span> ·{" "}
                  <span className="text-zinc-800">{e.kind}</span> — {e.message}
                </li>
              ))}
              {detail.billingEvents.length === 0 ? <li>기록 없음</li> : null}
            </ul>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <h2 className="text-sm font-bold text-zinc-800">알림톡·메시징 실패</h2>
            <ul className="mt-2 space-y-1 text-xs text-red-700">
              {detail.messagingFailures.map((m) => (
                <li key={m.id}>
                  {m.status} · {m.error_message ?? "—"} · {new Date(m.created_at).toLocaleString("ko-KR")}
                </li>
              ))}
              {detail.messagingFailures.length === 0 ? <li className="text-zinc-600">최근 실패 없음</li> : null}
            </ul>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <h2 className="text-sm font-bold text-zinc-800">세금계산서 이슈</h2>
            <ul className="mt-2 space-y-1 text-xs text-zinc-800">
              {detail.taxInvoices.map((t) => (
                <li key={t.id}>
                  {t.status} · {t.failure_reason ?? "—"}
                </li>
              ))}
              {detail.taxInvoices.length === 0 ? <li className="text-zinc-600">실패 사유 없음</li> : null}
            </ul>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <h2 className="text-sm font-bold text-zinc-800">활동 로그</h2>
            <ul className="mt-2 space-y-1 text-xs text-zinc-600">
              {detail.activityLogs.map((a) => (
                <li key={a.id}>
                  {a.action} — {a.description ?? ""} · {new Date(a.created_at).toLocaleString("ko-KR")}
                </li>
              ))}
              {detail.activityLogs.length === 0 ? <li className="text-zinc-600">없음</li> : null}
            </ul>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <h2 className="text-sm font-bold text-zinc-800">운영 메모 이력</h2>
            <ul className="mt-2 space-y-2 text-sm text-zinc-800">
              {detail.adminNotes.map((n) => (
                <li key={n.id} className="border-l-2 border-primary/40 pl-3">
                  <p className="text-xs text-zinc-500">{new Date(n.created_at).toLocaleString("ko-KR")}</p>
                  <p className="whitespace-pre-wrap">{n.body}</p>
                </li>
              ))}
              {detail.adminNotes.length === 0 ? <li className="text-zinc-600">메모 없음</li> : null}
            </ul>
          </section>
        </div>

        <AdminUserActions userId={id} />
      </div>
    </div>
  )
}
