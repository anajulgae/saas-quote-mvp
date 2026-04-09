import { PageHeader } from "@/components/app/page-header"
import { SettingsForm } from "@/components/app/settings-form"
import { getSettingsPageData } from "@/lib/data"
import { computeBusinessSettingsFormKey } from "@/lib/settings-form-key"
import { getSiteOrigin } from "@/lib/site-url"

/** 저장 직후에도 DB 최신값이 내려가도록 RSC 캐시 비활성화 */
export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function SettingsPage() {
  const {
    settings,
    templates,
    currentPlan,
    planColumnMissing,
    notificationPreferences,
    messagingChannelConfig,
  } = await getSettingsPageData()
  const businessFormKey = computeBusinessSettingsFormKey(settings)
  const siteOrigin = getSiteOrigin()

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        title="설정"
        description="사업자·직인·문서, 공개 문의·업체 랜딩, 알림·메시징, AI·템플릿, 플랜까지 — 메뉴 밖에 숨겨 둔 운영 기능의 통합 진입점입니다."
      />
      <SettingsForm
        key={businessFormKey}
        initialSettings={settings}
        templates={templates}
        currentPlan={currentPlan}
        planColumnMissing={planColumnMissing}
        siteOrigin={siteOrigin}
        initialNotificationPreferences={notificationPreferences}
        messagingChannelConfig={messagingChannelConfig}
      />
    </div>
  )
}
