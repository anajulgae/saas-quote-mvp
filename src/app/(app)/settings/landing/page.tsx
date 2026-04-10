import Link from "next/link"

import { PageHeader } from "@/components/app/page-header"
import { SettingsLandingEditor } from "@/components/app/settings-landing-editor"
import { buttonVariants } from "@/components/ui/button-variants"
import { getLandingPageEditorData } from "@/lib/data"
import { planAllowsFeature } from "@/lib/plan-features"
import { getSiteOrigin } from "@/lib/site-url"
import { cn } from "@/lib/utils"
import type { BusinessPublicPage } from "@/types/domain"

export const dynamic = "force-dynamic"
export const revalidate = 0

function mergeLandingFromSettings(page: BusinessPublicPage, businessName: string, phone: string, email: string) {
  const bn = page.businessName.trim() ? page.businessName : businessName
  return {
    ...page,
    businessName: bn,
    contactPhone: page.contactPhone.trim() ? page.contactPhone : phone,
    contactEmail: page.contactEmail.trim() ? page.contactEmail : email,
    seoTitle: page.seoTitle.trim() ? page.seoTitle : `${bn} | 소개`,
    seoDescription: page.seoDescription.trim()
      ? page.seoDescription
      : page.introOneLine.trim() || `${bn} 서비스 안내 및 문의`,
  }
}

export default async function SettingsLandingPage() {
  const { page, settings, currentPlan, planColumnMissing } = await getLandingPageEditorData()
  const siteOrigin = getSiteOrigin()
  const canUse = planAllowsFeature(currentPlan, "mini_landing")
  const initial = mergeLandingFromSettings(page, settings.businessName, settings.phone, settings.email)

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        title="업체 소개 페이지"
        description="Pro·Business 공개 랜딩입니다. slug로 /biz/주소 가 접속되며, 문의하기는 공개 문의 폼과 연결됩니다."
      />

      <p>
        <Link href="/settings" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 px-2")}>
          ← 설정으로
        </Link>
      </p>

      {!canUse ? (
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-4 text-sm text-foreground">
          <p className="font-medium">Pro 이상 플랜에서 이용할 수 있습니다</p>
          <p className="mt-1 text-xs text-muted-foreground">
            소개 랜딩·AI 소개 초안·공개 링크는 Pro·Business에서 사용할 수 있습니다. 업그레이드 후 다시 방문해 주세요.
            {planColumnMissing ? " (`users.plan` 컬럼이 없으면 무료로 처리됩니다. 마이그레이션을 확인해 주세요.)" : ""}
          </p>
          <Link href="/billing?plan=pro" className={cn(buttonVariants({ size: "sm" }), "mt-3 inline-flex h-9")}>
            요금 안내 보기
          </Link>
        </div>
      ) : (
        <SettingsLandingEditor
          initialPage={initial}
          siteOrigin={siteOrigin}
          inquiryFormEnabled={settings.publicInquiryFormEnabled}
          inquiryFormToken={settings.publicInquiryFormToken}
        />
      )}
    </div>
  )
}
