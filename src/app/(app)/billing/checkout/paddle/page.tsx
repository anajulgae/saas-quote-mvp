import { redirect } from "next/navigation"

import { PaddleCheckoutLauncher } from "@/components/billing/paddle-checkout-launcher"
import { getAppSession } from "@/lib/auth"
import { getBillingProviderName } from "@/lib/billing/provider"
import { getPaddlePriceIdForPlan } from "@/lib/billing/providers/paddle-provider"
import { normalizePlan } from "@/lib/plan-features"
import { beginCheckoutForPlan } from "@/lib/server/billing-service"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { fetchUserBillingState } from "@/lib/user-plan"

export const metadata = {
  title: "Paddle 결제",
  robots: { index: false, follow: false },
}

export default async function PaddleCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>
}) {
  const sp = await searchParams
  const plan = normalizePlan(sp.plan)
  const checkoutPath = `/billing/checkout/paddle?plan=${encodeURIComponent(plan)}`

  const session = await getAppSession()
  if (!session?.user?.id || session.mode !== "supabase") {
    redirect(`/login?next=${encodeURIComponent(checkoutPath)}`)
  }

  if (getBillingProviderName() !== "paddle") {
    redirect("/billing")
  }

  const priceId = getPaddlePriceIdForPlan(plan)
  if (!priceId) {
    redirect("/billing")
  }

  const email = session.user.email?.trim() ?? ""
  if (!email) {
    redirect("/settings")
  }

  const supabase = await createServerSupabaseClient()
  let needsCheckoutPrep = true
  if (supabase) {
    const billing = await fetchUserBillingState(supabase, session.user.id)
    needsCheckoutPrep =
      !billing.billingProviderSubscriptionId ||
      billing.subscriptionStatus === "incomplete" ||
      billing.subscriptionStatus === "pending" ||
      billing.subscriptionStatus === "trial_expired" ||
      billing.subscriptionStatus === "canceled"
  }

  if (needsCheckoutPrep) {
    const prep = await beginCheckoutForPlan({
      userId: session.user.id,
      email,
      plan,
    })
    if (!prep.ok) {
      redirect("/billing")
    }
  }

  return (
    <div className="min-h-[50vh]">
      <PaddleCheckoutLauncher plan={plan} priceId={priceId} userId={session.user.id} email={email} />
    </div>
  )
}
