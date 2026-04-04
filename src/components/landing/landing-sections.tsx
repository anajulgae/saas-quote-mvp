import Link from "next/link"
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  RefreshCw,
  Users,
  Wallet,
} from "lucide-react"

import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

import { DashboardMockPreview } from "./dashboard-mock-preview"

export function LandingHero() {
  const trust = [
    "문의·견적·청구·수금을 한 흐름으로 연결",
    "선금·잔금·미수를 한눈에 정리",
    "오늘 처리할 후속 조치를 놓치지 않게",
  ]

  return (
    <section
      className="border-b border-border/50 bg-gradient-to-b from-primary/[0.06] via-background to-background px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
      aria-labelledby="hero-heading"
    >
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_min(100%,440px)] lg:items-center lg:gap-14">
        <div className="space-y-8">
          <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            소규모 사업자를 위한 견적·청구·수금 관리
          </p>
          <div className="space-y-4">
            <h1
              id="hero-heading"
              className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[2.65rem] lg:leading-[1.12]"
            >
              고객 문의부터 수금까지,
              <br className="hidden sm:block" /> 끊기지 않는 업무 흐름
            </h1>
            <p className="max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              프리랜서·1인 사업자·소규모 서비스업을 위한 운영 도구입니다. 견적과 청구를 한곳에서
              정리하고, 입금 단계와 리마인드를 빠르게 확인하세요.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-12 min-h-12 w-full justify-center bg-primary px-6 text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90 sm:w-auto"
              )}
            >
              무료로 시작하기
            </Link>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-12 min-h-12 w-full justify-center border-2 border-border bg-background px-6 text-base font-semibold text-foreground shadow-sm hover:bg-muted/40 sm:w-auto"
              )}
            >
              로그인
            </Link>
            <a
              href="#features"
              className="inline-flex h-12 w-full items-center justify-center gap-1 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:h-auto sm:w-auto"
            >
              기능 살펴보기
              <ArrowRight className="size-4" aria-hidden />
            </a>
          </div>
          <ul className="grid gap-3 sm:grid-cols-1 sm:gap-2.5">
            {trust.map((line) => (
              <li key={line} className="flex gap-2.5 text-sm leading-snug text-foreground">
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
        <DashboardMockPreview className="lg:translate-y-1" />
      </div>
    </section>
  )
}

export function LandingProblemSolution() {
  const rows = [
    {
      problem: "견적·청구·메모가 파일·메신저에 흩어져 있다",
      solve: "고객·문의·견적·청구를 계정 안에서 단계별로 묶어 둡니다.",
    },
    {
      problem: "선금·잔금·미수 여부를 매번 다시 확인한다",
      solve: "입금 단계와 상태를 화면에서 바로 구분해 후속 조치로 이어집니다.",
    },
    {
      problem: "지난 문의·견적 이력을 찾느라 시간이 걸린다",
      solve: "고객 단위로 흐름이 쌓여, 다음 액션을 빠르게 결정할 수 있습니다.",
    },
  ]

  return (
    <section
      id="pain"
      className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      aria-labelledby="pain-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2
            id="pain-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            작은 팀에서 반복되는 정리 비용
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Bill-IO는 실무에서 자주 겪는 세 가지를 기준으로 설계했습니다.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {rows.map((row) => (
            <article
              key={row.problem}
              className="flex flex-col rounded-2xl border border-border/60 bg-card p-6 shadow-sm ring-1 ring-primary/[0.04] transition-shadow duration-200 hover:shadow-md"
            >
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">문제</p>
              <p className="mt-2 text-sm font-medium leading-snug text-foreground">{row.problem}</p>
              <div className="my-4 h-px bg-border/80" />
              <p className="text-xs font-semibold tracking-wide text-primary">Bill-IO</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{row.solve}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function LandingFeatures() {
  const items = [
    {
      icon: FileText,
      title: "견적 작성",
      desc: "항목과 금액을 정리해 견적서 형태로 빠르게 남깁니다.",
    },
    {
      icon: Wallet,
      title: "청구·입금 추적",
      desc: "청구와 선금·잔금·완납 등 상태를 구분해 흐름을 유지합니다.",
    },
    {
      icon: Users,
      title: "고객·이력",
      desc: "고객 단위로 문의와 견적·청구가 이어져 맥락을 잃지 않습니다.",
    },
    {
      icon: ClipboardList,
      title: "후속 조치",
      desc: "오늘 처리할 일을 모아 놓치기 쉬운 일정을 줄입니다.",
    },
    {
      icon: Bell,
      title: "리마인드 기록",
      desc: "안내 문구와 기록을 남겨 커뮤니케이션을 일관되게 가져갑니다.",
    },
    {
      icon: RefreshCw,
      title: "템플릿 활용",
      desc: "자주 쓰는 표현을 템플릿으로 두어 작성 시간을 줄입니다.",
    },
  ]

  return (
    <section
      id="features"
      className="border-y border-border/50 bg-muted/30 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2
            id="features-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            핵심 기능
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            견적·청구 운영에 필요한 요소를 한 제품 안에서 다룹니다.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ icon: Icon, title, desc }) => (
            <article
              key={title}
              className="group rounded-2xl border border-border/60 bg-card p-6 shadow-sm ring-1 ring-black/[0.02] transition-shadow duration-200 hover:shadow-md"
            >
              <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <Icon className="size-5" strokeWidth={1.75} aria-hidden />
              </div>
              <h3 className="text-base font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function LandingHowItWorks() {
  const steps = [
    { step: "1", title: "고객 등록", desc: "거래처 정보를 등록해 이후 문서와 연결합니다." },
    { step: "2", title: "문의·견적", desc: "문의를 받고 견적을 작성·발송합니다." },
    { step: "3", title: "청구 생성", desc: "확정된 금액으로 청구를 만들고 단계를 표시합니다." },
    { step: "4", title: "입금·후속", desc: "입금 상태를 확인하고 리마인드·후속을 관리합니다." },
  ]

  return (
    <section
      id="how"
      className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      aria-labelledby="how-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2
            id="how-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            사용 흐름
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            복잡한 온보딩 없이, 업무 순서대로 진행할 수 있습니다.
          </p>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li
              key={s.step}
              className="relative flex gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-sm ring-1 ring-black/[0.02]"
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm"
                aria-hidden
              >
                {s.step}
              </span>
              <div>
                <h3 className="font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function LandingPricing() {
  const plans = [
    {
      name: "Starter",
      price: "₩0",
      period: "/월",
      blurb: "도입·검토용",
      features: ["기본 대시보드", "고객·문의·견적·청구", "이력 조회"],
      cta: "무료로 시작",
      href: "/signup",
      highlight: false,
    },
    {
      name: "Pro",
      price: "₩39,000",
      period: "/월",
      blurb: "1인·소규모 팀에 적합",
      features: [
        "Starter 전체",
        "미수·후속 정리 강화",
        "리마인드·템플릿",
        "이메일 지원",
      ],
      cta: "Pro 시작하기",
      href: "/signup",
      highlight: true,
    },
    {
      name: "Business",
      price: "문의",
      period: "",
      blurb: "맞춤·다수 좌석",
      features: ["Pro 기준 협의", "온보딩·운영 문의", "도입 일정 조율"],
      cta: "문의하기",
      href: "/signup",
      highlight: false,
    },
  ]

  return (
    <section
      id="pricing"
      className="border-y border-border/50 bg-muted/20 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      aria-labelledby="pricing-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2
            id="pricing-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            요금제
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            팀 규모에 맞게 선택하세요. 결제 연동 전에도 플랜 구조를 미리 확인할 수 있습니다.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={cn(
                "flex flex-col rounded-2xl border bg-card p-6 shadow-sm",
                plan.highlight
                  ? "border-primary shadow-elevated-sm ring-2 ring-primary/20 lg:scale-[1.02]"
                  : "border-border/60"
              )}
            >
              {plan.highlight ? (
                <p className="mb-3 inline-flex w-fit rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground shadow-sm">
                  추천
                </p>
              ) : (
                <div className="mb-3 h-6" aria-hidden />
              )}
              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.blurb}</p>
              <p className="mt-5 flex items-baseline gap-0.5">
                <span className="text-3xl font-semibold tracking-tight text-foreground">
                  {plan.price}
                </span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </p>
              <ul className="mt-6 flex flex-1 flex-col gap-2.5 text-sm text-muted-foreground">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "mt-8 h-11 w-full justify-center font-semibold",
                  plan.highlight
                    ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                    : "border-2 border-border/70 bg-background font-semibold hover:bg-muted/60"
                )}
              >
                {plan.cta}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

const faqItems = [
  {
    q: "어떤 업종에 적합한가요?",
    a: "프리랜서, 1인 사업자, 소규모 서비스·컨설팅·제작 업종 등 견적과 청구가 반복되는 운영에 맞춰 두었습니다.",
  },
  {
    q: "무료로 시작할 수 있나요?",
    a: "Starter 플랜으로 가입해 핵심 흐름을 먼저 써 보실 수 있습니다. 이후 필요 시 상위 플랜으로 조정할 수 있습니다.",
  },
  {
    q: "고객 데이터는 계정별로 분리되나요?",
    a: "네. 로그인한 계정 기준으로 데이터가 분리되며, 다른 계정과 섞이지 않도록 설계되어 있습니다.",
  },
  {
    q: "모바일에서도 사용할 수 있나요?",
    a: "반응형 웹으로 제공되어 스마트폰·태블릿 브라우저에서도 이용할 수 있습니다.",
  },
  {
    q: "나중에 요금제를 변경할 수 있나요?",
    a: "가능합니다. 운영 정책에 따라 플랜 전환·해지 절차는 앱 내 안내 또는 고객 지원을 통해 안내됩니다.",
  },
]

export function LandingFaq() {
  return (
    <section
      id="faq"
      className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <h2
            id="faq-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            자주 묻는 질문
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            도입 전에 궁금한 점을 정리했습니다.
          </p>
        </div>
        <div className="space-y-2">
          {faqItems.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-border/70 bg-card px-4 py-1 shadow-sm open:pb-3 open:shadow-md"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 text-left text-sm font-semibold text-foreground outline-none marker:content-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="text-muted-foreground transition group-open:rotate-180">▼</span>
              </summary>
              <p className="border-t border-border/60 pt-3 text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

export function LandingFinalCta() {
  return (
    <section
      className="shadow-elevated relative mx-4 mb-16 overflow-hidden rounded-3xl border border-primary/20 bg-primary px-6 py-14 text-center sm:mx-6 sm:py-16 lg:mx-auto lg:max-w-6xl lg:px-8"
      aria-labelledby="final-cta-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,oklch(1_0_0_/_0.12),transparent_65%)]"
        aria-hidden
      />
      <div className="relative">
        <LayoutDashboard className="mx-auto mb-4 size-10 text-primary-foreground/90" aria-hidden />
        <h2
          id="final-cta-heading"
          className="text-balance text-2xl font-semibold tracking-tight text-primary-foreground sm:text-3xl"
        >
          지금 바로 운영 흐름을 정리해 보세요
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-primary-foreground/85 sm:text-base">
          가입 후 고객과 견적·청구를 한곳에서 이어 관리할 수 있습니다. 별도 설치 없이 웹에서
          시작합니다.
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-12 min-h-12 border-0 bg-primary-foreground px-8 text-base font-semibold text-primary shadow-md hover:bg-primary-foreground/92"
            )}
          >
            무료로 시작하기
          </Link>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-12 min-h-12 border-2 border-primary-foreground/35 bg-transparent px-8 text-base font-semibold text-primary-foreground hover:bg-primary-foreground/10"
            )}
          >
            로그인
          </Link>
        </div>
        <p className="mt-6 text-xs text-primary-foreground/75">
          계정별 데이터 분리 · SSL 접속 · 상용 서비스 기준으로 운영됩니다
        </p>
      </div>
    </section>
  )
}

export function LandingFooter() {
  const links = [
    { href: "#features", label: "기능" },
    { href: "#pricing", label: "요금제" },
    { href: "#faq", label: "FAQ" },
    { href: "/login", label: "로그인" },
    { href: "/signup", label: "회원가입" },
  ]

  return (
    <footer
      className="border-t border-border/70 bg-muted/30 px-4 py-12 sm:px-6 lg:px-8"
      role="contentinfo"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm">
              B
            </span>
            Bill-IO
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            견적·청구·수금까지 한 흐름으로 이어 주는 소규모 사업자용 운영 도구입니다.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="푸터 링크">
          {links.map((l) => (
            <a
              key={l.href + l.label}
              href={l.href}
              className="font-medium text-muted-foreground hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>
      </div>
      <p className="mx-auto mt-10 max-w-6xl text-center text-xs text-muted-foreground md:text-left">
        © {new Date().getFullYear()} Bill-IO. All rights reserved.
      </p>
    </footer>
  )
}
