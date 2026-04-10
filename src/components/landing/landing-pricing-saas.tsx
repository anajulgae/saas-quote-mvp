import Link from "next/link"
import { CheckCircle2 } from "lucide-react"

import { buttonVariants } from "@/components/ui/button-variants"
import { PLAN_LABEL, PLAN_PRICE_KRW_MONTH, PLAN_TAGLINE } from "@/lib/billing/catalog"
import { cn } from "@/lib/utils"
import type { BillingPlan } from "@/types/domain"

const comparisonRows = [
  {
    starter: "1 seat with core inquiry, quote, invoice, and collection flow",
    pro: "Adds public landing, AI assist, and more document delivery volume",
    business: "Adds reporting, ASP integration, and larger team-scale operation",
  },
  {
    starter: "document_send includes email, link copy/share, and PDF download",
    pro: "Higher AI and document_send quota for active paid operation",
    business: "Large monthly quota for production-grade SaaS customers",
  },
  {
    starter: "7-day free trial before paid conversion",
    pro: "Automatic billing continues after the trial if payment is saved",
    business: "Custom rollout and sales path for advanced operation needs",
  },
]

const plans: Array<{
  plan: BillingPlan
  highlight: boolean
  summary: string
  cta: string
  href: string
}> = [
  {
    plan: "starter",
    highlight: false,
    summary: "For solo operators who want a clean quote-to-cash workflow.",
    cta: "Start 7-day trial",
    href: "/billing?plan=starter",
  },
  {
    plan: "pro",
    highlight: true,
    summary: "For teams that want AI assist, public landing, and richer customer delivery.",
    cta: "Choose Pro",
    href: "/billing?plan=pro",
  },
  {
    plan: "business",
    highlight: false,
    summary: "For advanced reporting, e-tax invoice ASP, and larger organizations.",
    cta: "Talk to sales",
    href: "/billing?plan=business#business",
  },
]

function priceLabel(plan: BillingPlan) {
  const value = PLAN_PRICE_KRW_MONTH[plan]
  return value == null ? "Contact" : `₩${value.toLocaleString("ko-KR")}`
}

export function LandingPricingSaas() {
  return (
    <section
      id="pricing"
      className="border-y border-border/35 bg-gradient-to-b from-primary/[0.07] via-muted/30 to-muted/18 px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
      aria-labelledby="pricing-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-primary/90">Pricing</p>
          <h2
            id="pricing-heading"
            className="text-2xl font-extrabold tracking-tight text-foreground sm:text-[1.95rem] sm:leading-snug"
          >
            Launch-ready pricing tied to the real billing flow
          </h2>
          <p className="mt-4 text-sm font-medium leading-relaxed text-muted-foreground sm:text-base">
            Every new account starts with a <strong className="text-foreground">7-day free trial</strong>. Logged-in
            users move directly into the billing console, and signed-out users are guided into signup/login before plan
            selection continues.
          </p>
        </div>

        <div className="mb-12 overflow-hidden rounded-2xl border-2 border-border/60 bg-card shadow-md ring-1 ring-black/[0.04]">
          <div className="grid border-b border-border/50 bg-muted/35 text-xs font-extrabold sm:grid-cols-3">
            <div className="border-b border-border/50 px-3 py-3 sm:border-b-0 sm:border-r sm:py-4 sm:pl-5">
              Starter
            </div>
            <div className="flex items-center gap-2 border-b border-border/50 bg-primary/[0.1] px-3 py-3 sm:border-b-0 sm:border-r sm:py-4 sm:pl-5">
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                Recommended
              </span>
              Pro
            </div>
            <div className="px-3 py-3 sm:py-4 sm:pl-5">Business</div>
          </div>

          <div className="grid sm:grid-cols-3">
            <div className="space-y-3 border-border/50 p-4 sm:border-r sm:p-5">
              {comparisonRows.map((row) => (
                <div key={row.starter} className="flex gap-2.5 text-sm font-medium text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground/75" strokeWidth={2} />
                  <span>{row.starter}</span>
                </div>
              ))}
            </div>
            <div className="space-y-3 border-border/50 bg-primary/[0.04] p-4 sm:border-r sm:p-5">
              {comparisonRows.map((row) => (
                <div key={row.pro} className="flex gap-2.5 text-sm font-bold text-foreground">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2} />
                  <span>{row.pro}</span>
                </div>
              ))}
            </div>
            <div className="space-y-3 p-4 sm:p-5">
              {comparisonRows.map((row) => (
                <div key={row.business} className="flex gap-2.5 text-sm font-semibold text-foreground">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-teal-700" strokeWidth={2} />
                  <span>{row.business}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3 lg:items-stretch lg:gap-6">
          {plans.map(({ plan, highlight, summary, cta, href }) => (
            <article
              key={plan}
              className={cn(
                "flex flex-col rounded-2xl border p-6 sm:p-7",
                highlight
                  ? "relative z-[1] border-primary/50 bg-card shadow-xl ring-2 ring-primary/35 lg:scale-[1.02]"
                  : plan === "business"
                    ? "border-dashed border-border/65 bg-card/90"
                    : "border-border/60 bg-card shadow-sm ring-1 ring-black/[0.03]"
              )}
            >
              <div className="mb-2 min-h-[1.75rem]">
                {highlight ? (
                  <span className="inline-flex rounded-full bg-primary px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-primary-foreground shadow-sm">
                    Best launch fit
                  </span>
                ) : null}
              </div>

              <h3 className="text-lg font-extrabold tracking-tight text-foreground">{PLAN_LABEL[plan]}</h3>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">
                {priceLabel(plan)}
                <span className="ml-1 text-sm font-semibold text-muted-foreground">/mo</span>
              </p>
              <p className="mt-3 text-sm font-semibold text-muted-foreground">{PLAN_TAGLINE[plan]}</p>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">{summary}</p>

              <div className="mt-5 rounded-xl border border-primary/22 bg-primary/[0.08] px-3 py-2.5 text-xs font-bold leading-relaxed text-foreground">
                Trial policy:
                <br />
                7 days free first, then automatic billing on the selected plan when payment is saved.
              </div>

              <Link
                href={href}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "mt-8 h-12 w-full justify-center text-[15px] font-extrabold",
                  highlight
                    ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                    : "border-2 border-border/80 bg-background hover:bg-muted/50"
                )}
              >
                {cta}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
