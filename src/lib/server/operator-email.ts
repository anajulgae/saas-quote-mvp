import { reportServerError } from "@/lib/observability"
import { getSiteOrigin } from "@/lib/site-url"
import { createServiceSupabaseClient } from "@/lib/supabase/service"

type PrefsRow = {
  inquiry_email: boolean
}

export type NewInquiryEmailSource = "public_form" | "customer_portal" | "other"

/**
 * 공개 문의 폼·고객 포털 제출 직후 — 운영자(사업장 설정 이메일)로 알림.
 * RESEND_API_KEY + SUPABASE_SERVICE_ROLE_KEY + notification_preferences.inquiry_email 필요.
 * 실패해도 예외를 던지지 않음(문의 생성은 유지).
 */
export async function sendNewInquiryEmailToOperator(input: {
  ownerUserId: string
  inquiryId: string
  inquiryTitle: string
  submitterName: string
  submitterPhone: string
  submitterEmail: string
  source: NewInquiryEmailSource
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    "Bill-IO <onboarding@resend.dev>"

  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[Bill-IO] 새 문의 운영자 메일 생략: RESEND_API_KEY 없음")
    }
    return { ok: false as const, skipped: "no_resend_key" as const }
  }

  const admin = createServiceSupabaseClient()
  if (!admin) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[Bill-IO] 새 문의 운영자 메일 생략: SUPABASE_SERVICE_ROLE_KEY 없음(설정·수신 주소 조회 불가)")
    }
    return { ok: false as const, skipped: "no_service_role" as const }
  }

  const [{ data: bs }, { data: pref }] = await Promise.all([
    admin.from("business_settings").select("email, business_name").eq("user_id", input.ownerUserId).maybeSingle(),
    admin.from("notification_preferences").select("inquiry_email").eq("user_id", input.ownerUserId).maybeSingle(),
  ])

  const prefs = pref as PrefsRow | null
  if (prefs && prefs.inquiry_email === false) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[Bill-IO] 새 문의 운영자 메일 생략: 알림 설정에서 이메일 꺼짐")
    }
    return { ok: false as const, skipped: "user_disabled" as const }
  }

  const to = (bs as { email: string | null; business_name: string } | null)?.email?.trim()
  if (!to) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[Bill-IO] 새 문의 운영자 메일 생략: 설정에 사업장 이메일(business_settings.email) 없음")
    }
    return { ok: false as const, skipped: "no_recipient_email" as const }
  }

  const origin = getSiteOrigin().replace(/\/$/, "")
  const openUrl = `${origin}/inquiries?focus=${encodeURIComponent(input.inquiryId)}`

  const biz = (bs as { business_name: string } | null)?.business_name?.trim() || "Bill-IO"
  const pathLabel =
    input.source === "customer_portal"
      ? "고객 포털(거래 안내 링크)"
      : input.source === "public_form"
        ? "공개 문의 폼"
        : "문의 접수"

  const subject =
    input.source === "customer_portal"
      ? "[Bill-IO] 고객 포털에서 문의가 접수되었습니다"
      : "[Bill-IO] 새 문의가 접수되었습니다"

  const html = `
    <p><strong>${escapeHtml(biz)}</strong> · ${escapeHtml(pathLabel)}</p>
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
    <p><a href="${openUrl}">Bill-IO에서 이 문의 바로 열기</a></p>
    <p style="color:#666;font-size:12px">알림 설정에서 이메일 수신을 끌 수 있습니다.</p>
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
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const t = await res.text().catch(() => "")
      reportServerError(`resend ${res.status}: ${t.slice(0, 200)}`, { route: "operator-email" })
      return { ok: false as const, error: "send_failed" as const }
    }

    const { error: logErr } = await admin.from("activity_logs").insert({
      user_id: input.ownerUserId,
      inquiry_id: input.inquiryId,
      action: "notification.operator_email_sent",
      description: "새 문의 알림 메일을 발송했습니다.",
      metadata: {
        channel: "email",
        kind: "new_inquiry",
        source: input.source,
      },
    })
    if (logErr) {
      reportServerError(logErr.message, { route: "operator-email", code: "activity_log" })
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
