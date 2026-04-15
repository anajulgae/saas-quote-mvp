import { redirect } from "next/navigation"

import { AutoRemindRulesPanel } from "@/components/app/auto-remind-rules-panel"
import { PageHeader } from "@/components/app/page-header"
import { getAppSession } from "@/lib/auth"
import { getAutoRemindRules } from "@/lib/data"
import { planAllowsFeature } from "@/lib/plan-features"
import { loadPlanContext } from "@/lib/user-plan"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export default async function AutoRemindSettingsPage() {
  const session = await getAppSession()
  if (!session) redirect("/login")

  let effectivePlan: string = "starter"
  if (session.mode === "supabase") {
    const supabase = await createServerSupabaseClient()
    if (supabase) {
      const ctx = await loadPlanContext(supabase, session.user.id)
      effectivePlan = ctx.effectivePlan
    }
  } else {
    effectivePlan = session.user.effectivePlan ?? session.user.plan
  }

  const allowed = planAllowsFeature(effectivePlan as "starter" | "pro" | "business", "auto_remind")

  const rules = allowed ? await getAutoRemindRules() : []

  return (
    <div className="space-y-6">
      <PageHeader
        title="자동 리마인드 스케줄러"
        description="연체 또는 입금 기한 경과 청구에 자동으로 이메일 리마인드를 보냅니다."
      />
      <AutoRemindRulesPanel rules={rules} allowed={allowed} currentPlan={effectivePlan} />
    </div>
  )
}
