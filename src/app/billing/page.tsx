import type { Metadata } from "next"
import Link from "next/link"

import { BillingConsoleClient } from "@/components/billing/billing-console-client"
import { buttonVariants } from "@/components/ui/button-variants"
import { getAppSession } from "@/lib/auth"
import {
  BILLING_UPGRADE_CONTACT_COPY,
  PLAN_LABEL,
  PLAN_PRICE_KRW_MONTH,
  PLAN_TAGLINE,
  SUPPORT_EMAIL_ENV,
} from "@/lib/billing/catalog"
import { getBillingConsoleData } from "@/lib/data"
import { cn } from "@/lib/utils"
import type { BillingPlan } from "@/types/domain"

export const metadata: Metadata = {
  title: "Billing",
  description:
    "Manage subscription, trial, usage, automatic billing, downgrade, cancellation, and payment recovery in one place.",
  alternates: { canonical: "/billing" },
}

const PLANS: BillingPlan[] = ["starter", "pro", "business"]

function priceLabel(plan: BillingPlan) {
  const value = PLAN_PRICE_KRW_MONTH[plan]
  return value == null ? "Contact" : `₩${value.toLocaleString("ko-KR")}/mo`
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>
}) {
  const sp = await searchParams
  const selectedPlan =
    sp.plan === "starter" || sp.plan === "pro" || sp.plan === "business" ? sp.plan : null

  const session = await getAppSession()
  const consoleData =
    session?.mode === "supabase" || session?.mode === "demo" ? await getBillingConsoleData() : null

  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim()
  const supportEmail = process.env[SUPPORT_EMAIL_ENV]?.trim()

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-wrap gap-2">
          <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 px-2")}>
            Home
          </Link>
          <Link href="/settings" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 px-2")}>
            Settings
          </Link>
          <Link href="/help" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 px-2")}>
            Help
          </Link>
        </div>

        <section className="space-y-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Subscription and billing</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {BILLING_UPGRADE_CONTACT_COPY}
            </p>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/[0.05] px-4 py-4">
            <p className="text-sm font-medium text-foreground">
              Every new workspace starts with a 7-day trial. If a payment method is saved before the trial ends,
              automatic billing continues on the selected plan without service interruption.
            </p>
            {selectedPlan ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Current entry intent: <strong className="text-foreground">{PLAN_LABEL[selectedPlan]}</strong>
              </p>
            ) : null}
          </div>
        </section>

        {consoleData ? (
          <BillingConsoleClient
            billing={consoleData.billing}
            effectivePlan={consoleData.effectivePlan}
            portalEnabledCount={consoleData.portalEnabledCount}
            publicInquiryFormCount={consoleData.publicInquiryFormCount}
            seatUsedCount={consoleData.seatUsedCount}
            runtime={consoleData.runtime}
            events={consoleData.events}
          />
        ) : (
          <section className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-6">
            <h2 className="text-lg font-semibold">Sign in to manage the real subscription state</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You can still review pricing here, but trial status, payment recovery, automatic renewal, and usage limits
              are only shown after login.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={`/signup${selectedPlan ? `?plan=${selectedPlan}` : ""}`}
                className={cn(buttonVariants({ size: "lg" }), "h-11")}
              >
                Create account
              </Link>
              <Link
                href={`/login${selectedPlan ? `?next=/billing?plan=${selectedPlan}` : "?next=/billing"}`}
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11")}
              >
                Sign in
              </Link>
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="border-b border-border/50 bg-muted/30 px-4 py-3 text-sm font-semibold">Plan overview</div>
          <div className="grid divide-y divide-border/50 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {PLANS.map((plan) => (
              <div key={plan} className="p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-primary">{PLAN_LABEL[plan]}</p>
                <p className="mt-1 text-lg font-bold">{priceLabel(plan)}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{PLAN_TAGLINE[plan]}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold">document_send policy</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The `document_send` quota tracks actual delivery or export behavior. Internal preview alone does not count.
            </p>
            <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>Email send</li>
              <li>Share link copy or share action</li>
              <li>PDF download / print-to-PDF</li>
              <li>BYOA message send</li>
            </ul>
          </div>

          <div id="business" className="rounded-2xl border border-dashed border-border/70 p-5">
            <h2 className="text-base font-semibold">Business sales / custom rollout</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Use Business for e-tax invoice ASP, advanced reporting, larger team access, and higher monthly volume.
            </p>
            {contactEmail ? (
              <a
                href={`mailto:${contactEmail}?subject=Bill-IO%20Business%20Inquiry`}
                className={cn(buttonVariants({ variant: "outline" }), "mt-4 inline-flex h-10")}
              >
                {contactEmail}
              </a>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">
                Set <code className="rounded bg-muted px-1">NEXT_PUBLIC_CONTACT_EMAIL</code> to show the Business
                inquiry CTA.
              </p>
            )}
          </div>
        </section>

        {supportEmail ? (
          <p className="text-center text-xs text-muted-foreground">
            Support:{" "}
            <a href={`mailto:${supportEmail}`} className="font-medium text-primary hover:underline">
              {supportEmail}
            </a>
          </p>
        ) : null}
      </div>
    </div>
  )
}
