import { PublicInquiryRequestPage } from "@/components/app/public-inquiry-request-page"
import { createAnonSupabaseClient } from "@/lib/supabase/anon"
import { isSupabaseConfigured } from "@/lib/supabase/public-config"

export const dynamic = "force-dynamic"

export default async function PublicInquiryFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ source?: string; slug?: string }>
}) {
  const { token } = await params
  const sp = await searchParams
  const landingSource = sp.source === "landing_page" ? "landing_page" : undefined
  const landingSlug = typeof sp.slug === "string" && sp.slug.trim() ? sp.slug.trim().slice(0, 80) : undefined

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-neutral-100 px-4 py-16 text-center text-sm text-neutral-600">
        서비스가 아직 구성되지 않았습니다.
      </div>
    )
  }

  const supabase = createAnonSupabaseClient()!
  const { data, error } = await supabase.rpc("get_public_inquiry_form_payload", { p_token: token })

  if (error) {
    return (
      <PublicInquiryRequestPage
        token={token}
        initialPayload={{ valid: false, reason: "error", businessName: "" }}
        landingSource={landingSource}
        landingSlug={landingSlug}
      />
    )
  }

  return (
    <PublicInquiryRequestPage
      token={token}
      initialPayload={data}
      landingSource={landingSource}
      landingSlug={landingSlug}
    />
  )
}
