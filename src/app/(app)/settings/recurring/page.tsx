import { redirect } from "next/navigation"

import { RecurringSeriesPanel } from "@/components/app/recurring-series-panel"
import { PageHeader } from "@/components/app/page-header"
import { getAppSession } from "@/lib/auth"
import { getRecurringSeriesList, getCustomersPageData } from "@/lib/data"
import { planAllowsFeature } from "@/lib/plan-features"
import { loadPlanContext } from "@/lib/user-plan"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export default async function RecurringSettingsPage() {
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

  const allowed = planAllowsFeature(effectivePlan as "starter" | "pro" | "business", "recurring_invoices")

  const [seriesList, { customers }] = await Promise.all([
    allowed ? getRecurringSeriesList() : Promise.resolve([]),
    allowed ? getCustomersPageData() : Promise.resolve({ customers: [] }),
  ])

  const customerOptions = customers.map((c) => ({
    id: c.id,
    label: c.companyName || c.name,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="반복 견적/청구 자동화"
        description="매월·매분기 반복되는 견적과 청구를 자동으로 생성합니다."
      />
      <RecurringSeriesPanel
        series={seriesList}
        customers={customerOptions}
        allowed={allowed}
        currentPlan={effectivePlan}
      />
    </div>
  )
}
