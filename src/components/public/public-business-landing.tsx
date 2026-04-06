import Link from "next/link"

import { cn } from "@/lib/utils"

export type PublicLandingPageView = {
  slug: string
  template: string
  businessName: string
  headline: string
  introOneLine: string
  about: string
  services: Array<{ title: string; description: string }>
  contactPhone: string
  contactEmail: string
  location: string
  businessHours: string
  socialLinks: Array<{ label: string; url: string }>
  heroImageUrl?: string | null
  faq: Array<{ question: string; answer: string }>
  trustPoints: string[]
  ctaText: string
  inquiryCtaEnabled: boolean
}

function splitAbout(text: string): string[] {
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
}

export function PublicBusinessLanding({
  page,
  inquiryHref,
  siteName,
}: {
  page: PublicLandingPageView
  inquiryHref: string | null
  /** 푸터 등에 표시할 서비스명 */
  siteName: string
}) {
  const minimal = page.template === "minimal"
  const accent = minimal ? "text-slate-800" : "text-teal-700"
  const accentBg = minimal ? "bg-slate-900" : "bg-teal-600"
  const accentRing = minimal ? "ring-slate-900/10" : "ring-teal-700/15"

  const aboutParas = splitAbout(page.about)
  const showCta = Boolean(page.inquiryCtaEnabled && inquiryHref)

  return (
    <div className="min-h-screen bg-[#f8f9fb] text-slate-900 antialiased">
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10 sm:py-12">
          {page.heroImageUrl ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={page.heroImageUrl}
                alt=""
                className="aspect-[21/9] w-full object-cover sm:aspect-[24/9]"
              />
            </div>
          ) : (
            <div
              className={cn(
                "flex aspect-[21/9] max-h-40 items-center justify-center rounded-2xl border border-dashed border-slate-300/90 bg-slate-100/80 text-sm font-medium text-slate-500 sm:aspect-[24/9]",
                accentRing,
                "ring-1"
              )}
            >
              {page.businessName || "업체 소개"}
            </div>
          )}
          <div className="space-y-2">
            <p className={cn("text-xs font-semibold uppercase tracking-[0.2em]", accent)}>소개</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {page.headline || page.businessName || "환영합니다"}
            </h1>
            {page.introOneLine ? (
              <p className="text-lg text-slate-600 sm:text-xl">{page.introOneLine}</p>
            ) : null}
          </div>
          {showCta ? (
            <div>
              <Link
                href={inquiryHref!}
                className={cn(
                  "inline-flex h-12 items-center justify-center rounded-xl px-7 text-sm font-semibold text-white shadow-md transition hover:opacity-95",
                  accentBg
                )}
              >
                {page.ctaText || "문의하기"}
              </Link>
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-12 px-4 py-12 sm:py-14">
        {aboutParas.length ? (
          <section className="space-y-4" aria-labelledby="about-heading">
            <h2 id="about-heading" className="text-lg font-semibold text-slate-950">
              소개
            </h2>
            <div className="space-y-3 text-sm leading-relaxed text-slate-600 sm:text-base">
              {aboutParas.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        ) : null}

        {page.services.length ? (
          <section className="space-y-4" aria-labelledby="services-heading">
            <h2 id="services-heading" className="text-lg font-semibold text-slate-950">
              주요 서비스
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {page.services.map((s, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm"
                >
                  <p className="font-semibold text-slate-900">{s.title}</p>
                  {s.description ? (
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {page.trustPoints.length ? (
          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm" aria-label="신뢰 포인트">
            <h2 className="text-lg font-semibold text-slate-950">이런 점을 지향합니다</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {page.trustPoints.map((t, i) => (
                <li key={i} className="flex gap-2">
                  <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", accentBg)} aria-hidden />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section
          className="grid gap-6 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-6"
          aria-labelledby="contact-heading"
        >
          <div>
            <h2 id="contact-heading" className="text-lg font-semibold text-slate-950">
              연락처
            </h2>
            <dl className="mt-3 space-y-2 text-sm text-slate-600">
              {page.contactPhone ? (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">전화</dt>
                  <dd>
                    <a className="text-slate-800 underline-offset-2 hover:underline" href={`tel:${page.contactPhone}`}>
                      {page.contactPhone}
                    </a>
                  </dd>
                </div>
              ) : null}
              {page.contactEmail ? (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">이메일</dt>
                  <dd>
                    <a
                      className="break-all text-slate-800 underline-offset-2 hover:underline"
                      href={`mailto:${page.contactEmail}`}
                    >
                      {page.contactEmail}
                    </a>
                  </dd>
                </div>
              ) : null}
              {page.location ? (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">지역</dt>
                  <dd>{page.location}</dd>
                </div>
              ) : null}
              {page.businessHours ? (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">영업시간</dt>
                  <dd className="whitespace-pre-wrap">{page.businessHours}</dd>
                </div>
              ) : null}
            </dl>
          </div>
          {page.socialLinks.length ? (
            <div>
              <h3 className="text-sm font-semibold text-slate-950">SNS·링크</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {page.socialLinks.map((s, i) => (
                  <li key={i}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-slate-800 underline-offset-2 hover:underline"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="hidden sm:block" aria-hidden />
          )}
        </section>

        {page.faq.length ? (
          <section className="space-y-4" aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="text-lg font-semibold text-slate-950">
              자주 묻는 질문
            </h2>
            <div className="divide-y divide-slate-200 rounded-xl border border-slate-200/90 bg-white">
              {page.faq.map((f, i) => (
                <div key={i} className="px-4 py-4 sm:px-5">
                  <p className="font-medium text-slate-900">{f.question}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.answer}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {showCta ? (
          <section className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50 px-5 py-8 text-center shadow-sm">
            <p className="text-sm text-slate-600">프로젝트나 일정이 있으시면 편하게 남겨 주세요.</p>
            <Link
              href={inquiryHref!}
              className={cn(
                "mt-4 inline-flex h-12 min-w-[12rem] items-center justify-center rounded-xl px-8 text-sm font-semibold text-white shadow-md transition hover:opacity-95",
                accentBg
              )}
            >
              {page.ctaText || "문의하기"}
            </Link>
          </section>
        ) : null}
      </main>

      <footer className="border-t border-slate-200/80 bg-white py-8 text-center text-xs text-slate-500">
        <p>
          © {new Date().getFullYear()} {page.businessName || "사업자"}. {siteName}로 문의를 관리합니다.
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
          <Link href="/terms" className="underline-offset-2 hover:underline">
            이용약관
          </Link>
          <Link href="/privacy" className="underline-offset-2 hover:underline">
            개인정보처리방침
          </Link>
        </div>
      </footer>
    </div>
  )
}
