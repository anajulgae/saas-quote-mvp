/**
 * Resend HTTP API (의존성 없이 fetch).
 * 환경 변수: RESEND_API_KEY 필수
 * RESEND_FROM: 인증된 발신 주소(권장). 없으면 설정의 사용자 이메일을 From으로 시도(도메인 미인증 시 Resend가 거절할 수 있음).
 */
function escapeFromDisplayName(name: string): string {
  return name.replace(/[\r\n"\\]/g, " ").trim().slice(0, 120) || "Bill-IO"
}

export async function sendHtmlEmailViaResend(params: {
  to: string
  subject: string
  html: string
  /** 설정 화면의 사업자/대표 표시명 */
  fromDisplayName?: string
  /** 설정 화면의 이메일 — 발신자로 사용(도메인은 Resend에서 인증 필요) */
  fromEmail?: string
  /** 답장 주소(기본: fromEmail) */
  replyTo?: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    throw new Error("RESEND_API_KEY가 설정되어 있지 않습니다. Vercel·서버 환경 변수를 확인해 주세요.")
  }

  const envFrom = process.env.RESEND_FROM?.trim()
  const userEmail = params.fromEmail?.trim()
  const hasUserEmail = Boolean(userEmail && userEmail.includes("@"))

  let from: string
  if (envFrom) {
    from = envFrom
  } else if (hasUserEmail) {
    const dn = escapeFromDisplayName(params.fromDisplayName ?? "")
    from = `"${dn}" <${userEmail}>`
  } else {
    from = "Bill-IO <onboarding@resend.dev>"
  }

  const replyTo = (params.replyTo?.trim() || userEmail || "").trim() || undefined

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
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    const hint =
      res.status === 403 || res.status === 422
        ? " Resend에서 발신 도메인·주소를 인증했는지, 또는 환경 변수 RESEND_FROM(인증된 주소)를 설정해 주세요."
        : ""
    throw new Error((text || `이메일 전송에 실패했습니다. (${res.status})`) + hint)
  }
}
