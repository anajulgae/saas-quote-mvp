import Link from "next/link"

import { createAnonSupabaseClient } from "@/lib/supabase/anon"
import { isSupabaseConfigured } from "@/lib/supabase/public-config"

export const dynamic = "force-dynamic"

export default async function PublicInquiryThanksPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  let businessName = ""
  let message = "접수가 완료되었습니다. 담당자가 확인한 뒤 연락드리겠습니다."

  if (isSupabaseConfigured()) {
    const supabase = createAnonSupabaseClient()!
    const { data } = await supabase.rpc("get_public_inquiry_form_payload", { p_token: token })
    const p = data as {
      valid?: boolean
      businessName?: string
      completionMessage?: string
    } | null
    if (p?.valid) {
      businessName = p.businessName ?? ""
      if (p.completionMessage?.trim()) {
        message = p.completionMessage.trim()
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f5f2] px-4 py-20 text-neutral-900">
      <div className="mx-auto max-w-lg rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">접수 완료</p>
        {businessName ? (
          <h1 className="mt-2 text-xl font-bold tracking-tight text-neutral-900">{businessName}</h1>
        ) : null}
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">{message}</p>
        <p className="mt-4 text-xs text-neutral-500">
          동일 내용을 반복 제출하지 않도록 유의해 주세요. 급하신 경우 유선으로 연락해 주세요.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex text-sm font-medium text-neutral-900 underline underline-offset-4"
        >
          Bill-IO 홈으로
        </Link>
      </div>
    </div>
  )
}
