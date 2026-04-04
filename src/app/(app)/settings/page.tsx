import { PageHeader } from "@/components/app/page-header"
import { SettingsForm } from "@/components/app/settings-form"
import { getSettingsPageData } from "@/lib/data"

export default async function SettingsPage() {
  const { settings, templates } = await getSettingsPageData()

  return (
    <div className="space-y-6">
      <PageHeader
        title="설정"
        description="사업자 정보, 결제 조건, 기본 템플릿을 관리합니다."
      />
      <SettingsForm
        initialSettings={settings}
        templates={templates}
      />
    </div>
  )
}
