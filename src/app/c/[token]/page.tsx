import type { Metadata } from "next"
import { notFound } from "next/navigation"

import {
  buildCustomerPortalMetadata,
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const raw = token?.trim()
  if (!raw || raw.length < 12) {
    return { title: "거래 안내" }
  }
  const supabase = createAnonSupabaseClient()
  if (!supabase) {
    return { title: "거래 안내 · Bill-IO" }
  }
  const { data, error } = await supabase.rpc("get_customer_portal_payload", { p_token: raw })
  if (error) {
    return { title: "거래 안내 · Bill-IO" }
  }
  const body = data as Record<string, unknown> | null
  return buildCustomerPortalMetadata(body)
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
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#f6f7f9] px-6 text-center dark:bg-[#0c0f14]">
        <h1 className="text-lg font-semibold text-[#0f172a] dark:text-white">잠시 연결할 수 없습니다</h1>
        <p className="max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          안내 페이지를 불러오는 데 필요한 설정을 확인할 수 없습니다. 잠시 후 다시 시도하시거나 업체에 직접 문의해 주세요.
        </p>
      </div>
    )
  }

  const { data, error } = await supabase.rpc("get_customer_portal_payload", { p_token: raw })

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#f6f7f9] px-6 text-center dark:bg-[#0c0f14]">
        <h1 className="text-lg font-semibold text-[#0f172a] dark:text-white">안내를 불러오지 못했습니다</h1>
        <p className="max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          일시적인 오류일 수 있습니다. 링크를 다시 열어 보시거나, 문제가 계속되면 업체 담당자에게 연락해 주세요.
        </p>
      </div>
    )
  }

  const body = data as Record<string, unknown> | null
  if (!body || body.valid !== true) {
    const reason = typeof body?.reason === "string" ? body.reason : "unknown"
    const title =
      reason === "unavailable"
        ? "지금은 이 안내 링크를 쓸 수 없습니다"
        : reason === "not_found"
          ? "링크를 찾을 수 없습니다"
          : "유효하지 않은 링크입니다"
    const desc =
      reason === "unavailable"
        ? "서비스 설정이 바뀌었거나 이 안내가 종료되었을 수 있습니다. 업체에 직접 문의해 주시면 새로 안내받으실 수 있습니다."
        : "주소가 잘못되었거나 만료되었을 수 있습니다. 업체에 올바른 안내 링크를 요청해 주세요."

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#f6f7f9] px-6 text-center dark:bg-[#0c0f14]">
        <h1 className="text-lg font-semibold text-[#0f172a] dark:text-white">{title}</h1>
        <p className="max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-300">{desc}</p>
      </div>
    )
  }

  if (!isPortalPayload(body)) {
    notFound()
  }

  const siteOrigin = getSiteOrigin()

  return <CustomerPortalView payload={body} siteOrigin={siteOrigin} />
}
