import { PageHeader } from "@/components/app/page-header"
import { SettingsForm } from "@/components/app/settings-form"
import { getSettingsPageData } from "@/lib/data"

export default async function SettingsPage() {
  const { settings, templates } = await getSettingsPageData()

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        title="설정"
        description="사업자·결제 안내는 위 카드에서, 견적·리마인드 초안은 아래 템플릿에서 각각 저장합니다."
      />
      <SettingsForm
        initialSettings={settings}
        templates={templates}
      />
    </div>
  )
}
