import Link from "next/link"
import { CheckCircle2 } from "lucide-react"

import { buttonVariants } from "@/components/ui/button-variants"
import { PLAN_LABEL, PLAN_PRICE_USD_MONTH, PLAN_TAGLINE } from "@/lib/billing/catalog"
import { cn } from "@/lib/utils"
import type { BillingPlan } from "@/types/domain"

const comparisonRows = [
  {
    starter: "1석 · 문의→견적→청구→수금 핵심 흐름",
    pro: "AI 고도화·랜딩·카카오·세금계산서 ASP·추심",
    business: "감사 로그·화이트 라벨 PDF·대량 AI·우선 지원",
  },
  {
    starter: "문서 발송: 이메일·링크 공유·PDF 다운로드",
    pro: "활발한 유료 운영에 맞춘 AI·문서 발송 한도 상향",
    business: "프로덕션급 고객을 위한 대용량 월간 한도",
  },
  {
    starter: "유료 전환 전 7일 무료 체험",
    pro: "결제 수단 등록 시 체험 후 자동 갱신",
    business: "다인 팀·맞춤 온보딩·우선 지원 경로",
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
    summary: "1인 운영자가 문의부터 입금까지 깔끔한 흐름을 갖추기에 적합합니다.",
    cta: "7일 무료 체험 시작",
    href: "/billing?plan=starter",
  },
  {
    plan: "pro",
    highlight: true,
    summary: "AI 운영 보조·랜딩·카카오·전자세금계산서·추심까지, 매출 흐름을 넓히는 팀에 맞습니다.",
    cta: "프로 선택",
    href: "/billing?plan=pro",
  },
  {
    plan: "business",
    highlight: false,
    summary: "감사 로그·화이트 라벨 PDF·대량 AI·우선 지원이 필요한 다인 팀에 맞습니다.",
    cta: "영업 문의",
    href: "/billing?plan=business#business",
  },
]

function priceLabel(plan: BillingPlan) {
  const value = PLAN_PRICE_USD_MONTH[plan]
  return value == null ? "문의" : `$${value}`
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
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-primary/90">요금</p>
          <h2
            id="pricing-heading"
            className="text-2xl font-extrabold tracking-tight text-foreground sm:text-[1.95rem] sm:leading-snug"
          >
            실제 결제 흐름과 맞춘 런칭 요금
          </h2>
          <p className="mt-4 text-sm font-medium leading-relaxed text-muted-foreground sm:text-base">
            신규 계정은 <strong className="text-foreground">7일 무료 체험</strong>으로 시작합니다. 로그인한 사용자는
            요금·구독 화면으로 바로 이동하고, 비로그인 사용자는 가입·로그인 후 플랜 선택이 이어집니다.
          </p>
        </div>

        <div className="mb-12 overflow-hidden rounded-2xl border-2 border-border/60 bg-card shadow-md ring-1 ring-black/[0.04]">
          <div className="grid border-b border-border/50 bg-muted/35 text-xs font-extrabold sm:grid-cols-3">
            <div className="border-b border-border/50 px-3 py-3 sm:border-b-0 sm:border-r sm:py-4 sm:pl-5">
              {PLAN_LABEL.starter}
            </div>
            <div className="flex items-center gap-2 border-b border-border/50 bg-primary/[0.1] px-3 py-3 sm:border-b-0 sm:border-r sm:py-4 sm:pl-5">
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                추천
              </span>
              {PLAN_LABEL.pro}
            </div>
            <div className="px-3 py-3 sm:py-4 sm:pl-5">{PLAN_LABEL.business}</div>
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
                  <span className="inline-flex rounded-full bg-primary px-3 py-1 text-[11px] font-extrabold tracking-wide text-primary-foreground shadow-sm">
                    런칭에 추천
                  </span>
                ) : null}
              </div>

              <h3 className="text-lg font-extrabold tracking-tight text-foreground">{PLAN_LABEL[plan]}</h3>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">
                {priceLabel(plan)}
                <span className="ml-1 text-sm font-semibold text-muted-foreground">/월</span>
              </p>
              <p className="mt-3 text-sm font-semibold text-muted-foreground">{PLAN_TAGLINE[plan]}</p>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">{summary}</p>

              <div className="mt-5 rounded-xl border border-primary/22 bg-primary/[0.08] px-3 py-2.5 text-xs font-bold leading-relaxed text-foreground">
                체험 정책
                <br />
                먼저 7일 무료이며, 결제 수단이 등록되면 선택한 플랜으로 자동 청구됩니다.
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
