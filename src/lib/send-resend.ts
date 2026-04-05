/**
 * Resend HTTP API (의존성 없이 fetch).
 * 환경 변수: RESEND_API_KEY, 선택 RESEND_FROM (예: Bill-IO <quotes@yourdomain.com>)
 */
export async function sendHtmlEmailViaResend(params: {
  to: string
  subject: string
  html: string
  replyTo?: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    throw new Error("RESEND_API_KEY가 설정되어 있지 않습니다. Vercel·서버 환경 변수를 확인해 주세요.")
  }

  const from = process.env.RESEND_FROM?.trim() || "Bill-IO <onboarding@resend.dev>"

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      ...(params.replyTo?.trim() ? { reply_to: params.replyTo.trim() } : {}),
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `이메일 전송에 실패했습니다. (${res.status})`)
  }
}
