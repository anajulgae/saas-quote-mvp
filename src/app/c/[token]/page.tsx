import { notFound } from "next/navigation"

import {
  CustomerPortalView,
  type CustomerPortalPayload,
} from "@/components/public/customer-portal-view"
import { getSiteOrigin } from "@/lib/site-url"
import { createAnonSupabaseClient } from "@/lib/supabase/anon"

export const dynamic = "force-dynamic"

function isPortalPayload(data: unknown): data is CustomerPortalPayload {
  if (!data || typeof data !== "object") {
    return false
  }
  const o = data as Record<string, unknown>
  return o.valid === true && typeof o.businessName === "string" && Array.isArray(o.quotes)
}

export default async function CustomerPortalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const raw = token?.trim()
  if (!raw || raw.length < 12) {
    notFound()
  }

  const supabase = createAnonSupabaseClient()
  if (!supabase) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-sm text-muted-foreground">
        서비스 설정을 확인할 수 없습니다.
      </div>
    )
  }

  const { data, error } = await supabase.rpc("get_customer_portal_payload", { p_token: raw })

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-center text-sm text-muted-foreground">
        포털 정보를 불러오지 못했습니다.
      </div>
    )
  }

  const body = data as Record<string, unknown> | null
  if (!body || body.valid !== true) {
    const reason = typeof body?.reason === "string" ? body.reason : "unknown"
    const title =
      reason === "unavailable"
        ? "이 링크는 현재 사용할 수 없습니다."
        : reason === "not_found"
          ? "링크를 찾을 수 없습니다."
          : "유효하지 않은 링크입니다."
    const desc =
      reason === "unavailable"
        ? "운영 플랜이 바뀌었거나 포털이 비활성화되었을 수 있습니다. 업체에 직접 문의해 주세요."
        : "주소를 다시 확인하거나 업체에 새 안내를 요청해 주세요."

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{desc}</p>
      </div>
    )
  }

  if (!isPortalPayload(body)) {
    notFound()
  }

  const siteOrigin = getSiteOrigin()

  return <CustomerPortalView payload={body} siteOrigin={siteOrigin} />
}
