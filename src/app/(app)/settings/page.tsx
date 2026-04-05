import { PageHeader } from "@/components/app/page-header"
import { SettingsForm } from "@/components/app/settings-form"
import { getSettingsPageData } from "@/lib/data"
import { computeBusinessSettingsFormKey } from "@/lib/settings-form-key"

/** 저장 직후에도 DB 최신값이 내려가도록 RSC 캐시 비활성화 */
export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function SettingsPage() {
  const { settings, templates, currentPlan, planColumnMissing } = await getSettingsPageData()
  const businessFormKey = computeBusinessSettingsFormKey(settings)

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        title="설정"
        description="사업자·결제 안내는 위 카드에서, 견적·리마인드 초안은 아래 템플릿에서 각각 저장합니다."
      />
      <SettingsForm
        key={businessFormKey}
        initialSettings={settings}
        templates={templates}
        currentPlan={currentPlan}
        planColumnMissing={planColumnMissing}
      />
    </div>
  )
}
