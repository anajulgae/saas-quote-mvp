import { reportServerError } from "@/lib/observability"
import { getSiteOrigin } from "@/lib/site-url"
import { createServiceSupabaseClient } from "@/lib/supabase/service"

type PrefsRow = {
  inquiry_email: boolean
}

/**
 * 공개 문의 폼 제출 직후 — 운영자(사업장 설정 이메일)로 알림.
 * RESEND_API_KEY + SUPABASE_SERVICE_ROLE_KEY + notification_preferences.inquiry_email 필요.
 * 실패해도 예외를 던지지 않음.
 */
export async function sendNewInquiryEmailToOperator(input: {
  ownerUserId: string
  inquiryTitle: string
  submitterName: string
  submitterPhone: string
  submitterEmail: string
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    "Bill-IO <onboarding@resend.dev>"

  if (!apiKey) {
    return { ok: false as const, skipped: "no_resend_key" as const }
  }

  const admin = createServiceSupabaseClient()
  if (!admin) {
    return { ok: false as const, skipped: "no_service_role" as const }
  }

  const [{ data: bs }, { data: pref }] = await Promise.all([
    admin.from("business_settings").select("email, business_name").eq("user_id", input.ownerUserId).maybeSingle(),
    admin.from("notification_preferences").select("inquiry_email").eq("user_id", input.ownerUserId).maybeSingle(),
  ])

  const prefs = pref as PrefsRow | null
  if (prefs && prefs.inquiry_email === false) {
    return { ok: false as const, skipped: "user_disabled" as const }
  }

  const to = (bs as { email: string | null; business_name: string } | null)?.email?.trim()
  if (!to) {
    return { ok: false as const, skipped: "no_recipient_email" as const }
  }

  const origin = getSiteOrigin()
  const openUrl = `${origin.replace(/\/$/, "")}/inquiries`

  const biz = (bs as { business_name: string } | null)?.business_name?.trim() || "Bill-IO"
  const html = `
    <p><strong>${biz}</strong> 에 새 문의가 접수되었습니다.</p>
    <ul>
      <li><strong>제목</strong>: ${escapeHtml(input.inquiryTitle)}</li>
      <li><strong>이름</strong>: ${escapeHtml(input.submitterName)}</li>
      <li><strong>연락처</strong>: ${escapeHtml(input.submitterPhone)}</li>
      ${
        input.submitterEmail.trim()
          ? `<li><strong>이메일</strong>: ${escapeHtml(input.submitterEmail.trim())}</li>`
          : ""
      }
      <li><strong>접수 시각</strong>: ${escapeHtml(new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }))}</li>
    </ul>
    <p><a href="${openUrl}">Bill-IO에서 문의 확인하기</a></p>
    <p style="color:#666;font-size:12px">이 메일은 Bill-IO 알림 설정에 따라 발송됩니다.</p>
  `.trim()

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "[Bill-IO] 새 문의가 접수되었습니다",
        html,
      }),
    })

    if (!res.ok) {
      const t = await res.text().catch(() => "")
      reportServerError(`resend ${res.status}: ${t.slice(0, 200)}`, { route: "operator-email" })
      return { ok: false as const, error: "send_failed" as const }
    }

    return { ok: true as const }
  } catch (e) {
    reportServerError(e instanceof Error ? e.message : "resend", { route: "operator-email" })
    return { ok: false as const, error: "send_failed" as const }
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
