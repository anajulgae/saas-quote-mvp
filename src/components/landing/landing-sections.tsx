import Link from "next/link"
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  FileText,
  Globe,
  LayoutDashboard,
  MessageCircle,
  Send,
  Sparkles,
  Users,
  Wallet,
  Wrench,
  Zap,
} from "lucide-react"

import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

import { DashboardMockPreview } from "./dashboard-mock-preview"
import { LandingFlowMock } from "./landing-flow-mock"

export function LandingHero() {
  const trust = [
    "공개 링크만 걸면 문의가 쌓입니다 — 카톡·인스타 바이오에 그대로",
    "견적·청구·미수 상태를 한 화면에서 — 다시 헤매지 않음",
    "AI가 문의·견적·청구까지 ‘빈 화면’ 시간을 줄입니다 — 운영 분석·풀 초안·수금 문구",
  ]

  return (
    <section
      className="relative border-b border-border/40 bg-gradient-to-b from-primary/[0.13] via-background to-background px-4 pb-16 pt-11 sm:px-6 sm:pb-20 sm:pt-14 lg:px-8 lg:pb-28 lg:pt-[4.75rem]"
      aria-labelledby="hero-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_-25%,oklch(0.55_0.09_175_/_0.16),transparent_58%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_1fr] lg:gap-14 xl:grid-cols-[1.08fr_0.98fr]">
          <div className="space-y-7 sm:space-y-8">
            <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary/35 bg-primary/[0.14] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
              프리랜서 · 1인 사업 · 소규모 서비스업
            </p>
            <div className="space-y-4 sm:space-y-5">
              <h1
                id="hero-heading"
                className="text-balance text-[1.95rem] font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-4xl sm:leading-[1.06] lg:text-[2.85rem] lg:leading-[1.05]"
              >
                견적 앱으로 끝내지 마세요.
                <br className="hidden sm:block" />
                <span className="text-primary">문의부터 입금까지 한 흐름.</span>
              </h1>
              <p className="max-w-xl text-pretty text-[15px] font-semibold leading-relaxed text-muted-foreground sm:text-[1.05rem] sm:leading-relaxed">
                접수 → 정리 → 견적 발송 → 청구 → 수금·리마인드까지{" "}
                <span className="font-bold text-foreground">끊기지 않게</span> 이어집니다. AI는 문의 유형·다음 액션,
                견적 항목·옵션·납기, 입금 상황별 안내 문구까지 보조합니다. 카톡·전화에 흩어진 걸 다시 찾느라 쓰던
                시간을 줄입니다.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-14 min-h-14 w-full justify-center bg-primary px-8 text-base font-bold text-primary-foreground shadow-lg ring-2 ring-primary/35 ring-offset-2 ring-offset-background transition-colors hover:bg-primary/92 sm:w-auto"
                )}
              >
                무료로 시작하기
              </Link>
              <Link
                href="#why"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "group h-14 w-full justify-center border-2 border-foreground/15 bg-background px-8 text-base font-bold shadow-sm hover:border-primary/30 hover:bg-muted/50 sm:w-auto"
                )}
              >
                차별점·기능 보기
                <ArrowRight
                  className="ml-1.5 size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 w-full items-center justify-center text-sm font-bold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:h-auto sm:w-auto"
              >
                로그인
              </Link>
            </div>
            <div className="rounded-2xl border border-border/65 bg-card/95 p-4 shadow-md ring-1 ring-black/[0.04] backdrop-blur-sm sm:p-5">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                5초 만에 요약
              </p>
              <ul className="grid gap-3 sm:gap-2.5">
                {trust.map((line) => (
                  <li key={line} className="flex gap-3 text-sm font-bold leading-snug text-foreground">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={2} aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <DashboardMockPreview className="lg:translate-y-0.5" />
        </div>
      </div>
    </section>
  )
}

export function LandingProblemSolution() {
  const rows = [
    {
      problem: "문의가 카톡·문자·전화·DM에 흩어져 ‘그 고객’ 내용을 다시 찾는다",
      solve: "공개 폼 링크로 접수를 한곳에 모으고, 문의 카드에 단계·메모를 남깁니다.",
    },
    {
      problem: "견적 보냈는데 승인·유효기한·후속을 엑셀·메모에 따로 적는다",
      solve: "견적 상태와 일정이 대시보드·캘린더에 붙어, 다음 액션이 화면에서 보입니다.",
    },
    {
      problem: "청구 후 입금됐는지, 언제 독촉할지 머릿속·채팅으로만 기억한다",
      solve: "입금 단계·공개 청구 URL·리마인드와 추심 메모를 같은 고객 흐름에 둡니다.",
    },
    {
      problem: "부분 입금·연체·재안내를 손으로만 챙기다 빼먹는다",
      solve: "미수 목록과 ‘다음 연락일’로 팔로업을 놓치지 않게 정리합니다.",
    },
    {
      problem: "고객마다 어떤 견적·청구를 보냈는지 헷갈린다",
      solve: "고객 단위로 문의→견적→청구가 이어져 지금 어디까지인지 한 번에 봅니다.",
    },
    {
      problem: "홈페이지 없이 ‘정식 접수 창구’를 만들기 어렵다",
      solve: "전용 URL 폼과(Pro) 업체 소개 페이지로 링크만으로 유입을 받습니다.",
    },
  ]

  return (
    <section
      id="pain"
      className="border-y border-border/35 bg-muted/45 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      aria-labelledby="pain-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-primary/90">현실부터</p>
          <h2
            id="pain-heading"
            className="text-2xl font-extrabold tracking-tight text-foreground sm:text-[1.95rem] sm:leading-snug"
          >
            익숙한 삽질, Bill-IO는 여기서 끊습니다
          </h2>
          <p className="mt-4 text-sm font-medium leading-relaxed text-muted-foreground sm:text-base">
            견적만 잘 써도 <strong className="font-bold text-foreground">수금 전까지 관리가 비어 있으면</strong> 다시
            엑셀·카톡으로 돌아갑니다. 아래 중 두 개만 맞아도, 한 흐름으로 묶을 가치가 있습니다.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {rows.map((row) => (
            <article
              key={row.problem}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm ring-1 ring-black/[0.04] transition-[box-shadow,border-color] duration-200 hover:border-primary/28 hover:shadow-md"
            >
              <div className="border-b border-border/50 bg-muted/25 px-4 py-3.5 sm:px-5 sm:py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-rose-700/90">지금 이렇게 돌아가죠</p>
                <p className="mt-2 text-sm font-bold leading-snug text-foreground">{row.problem}</p>
              </div>
              <div className="flex flex-1 flex-col border-l-[3px] border-l-primary bg-gradient-to-b from-primary/[0.06] to-card px-4 py-3.5 sm:px-5 sm:py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Bill-IO에선</p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-muted-foreground">{row.solve}</p>
              </div>
            </article>
          ))}
        </div>
        <p className="mx-auto mt-12 max-w-2xl text-center text-sm font-semibold text-foreground">
          단순 견적표가 아니라,{" "}
          <span className="text-primary">문의 접수 → 발송 → 청구 → 수금·리마인드</span>까지 잇는 운영 플랫폼입니다.
        </p>
      </div>
    </section>
  )
}

/** 핵심 차별화는 크게, 나머지는 보조 — 일반 SaaS 카드 나열 탈피 */
export function LandingDifferentiators() {
  const spotlight: {
    badge: string
    title: string
    lead: string
    bullets: string[]
    icon: typeof Globe
  }[] = [
    {
      badge: "유입",
      title: "링크만내면 문의가 ‘접수’됩니다",
      lead:
        "일반 견적 툴은 ‘내가 입력’에만 강합니다. Bill-IO는 고객이 스스로 남긴 요청이 문의함으로 들어오게 만듭니다. 홈페이지 없이도 공식 창구가 생깁니다.",
      bullets: [
        "공개 문의 폼 URL — 카톡·인스타 바이오에 그대로",
        "(Pro) 업체 소개 `/biz` 페이지에서 소개와 접수를 한 번에",
        "놓치기 쉬운 DM·전화를 줄이는 ‘한 줄 주소’",
      ],
      icon: Globe,
    },
    {
      badge: "고객 경험",
      title: "고객은 로그인 없이 견적·청구를 확인합니다",
      lead:
        "견적 보내고 끝이면 고객은 다시 물어봅니다. 공개 링크·PDF·직인으로 보내고, (Pro) 미니 포털에서 요약을 한 페이지로 보여 주면 문의가 줄어듭니다.",
      bullets: [
        "공개 견적·청구 링크로 전달 통일",
        "PDF·직인 이미지까지 한 흐름에서",
        "(Pro) 고객 포털 — ‘뭐 보냈더라?’를 줄임",
      ],
      icon: Users,
    },
    {
      badge: "속도 · 수금",
      title: "AI가 운영 흐름을 보조하고, 입금이 늦어도 다음 연락을 놓치지 않습니다",
      lead:
        "문의는 유형·긴급도·추천 질문·다음 액션까지, 견적은 기본·옵션·납기·고객 안내까지 초안을 올립니다. 청구는 입금 단계별 추천·메시지 초안, 고객 상세에서는 이력 인사이트까지(플랜·설정에 따름). 알림·캘린더·리마인드가 같은 맥락에 붙습니다.",
      bullets: [
        "문의 AI — 요약·구조화에 더해 운영 분석·견적 전환 힌트",
        "견적 AI — 항목·옵션·결제·납기까지 발송 직전 수준 초안",
        "청구·수금 AI — 다음 액션·리마인드·추심 본문 초안",
      ],
      icon: Zap,
    },
  ]

  const secondary: { icon: typeof Bell; title: string; benefit: string }[] = [
    {
      icon: Send,
      title: "발송 · PDF · 직인",
      benefit: "링크·파일·도장까지 한 패키지로 고객에게 전달합니다.",
    },
    {
      icon: Wallet,
      title: "청구 URL · 미수 추적",
      benefit: "공개 청구·입금 단계를 한곳에서 보고, AI 추천·문구로 다음 연락을 정리합니다.",
    },
    {
      icon: CalendarDays,
      title: "캘린더 · 일정",
      benefit: "견적 만료·입금 기한·팔로업을 목록과 달력에서 같이 봅니다.",
    },
    {
      icon: Bell,
      title: "알림",
      benefit: "새 문의·후속 일정을 브라우저·메일 등으로 바로 알립니다.",
    },
  ]

  return (
    <section
      id="why"
      className="border-y border-border/35 bg-background px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
      aria-labelledby="why-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-primary/90">왜 Bill-IO인가</p>
          <h2
            id="why-heading"
            className="text-2xl font-extrabold tracking-tight text-foreground sm:text-[1.95rem] sm:leading-snug"
          >
            견적서만 잘 만드는 앱과 뭐가 다를까요?
          </h2>
          <p className="mt-4 text-sm font-medium leading-relaxed text-muted-foreground sm:text-base">
            대부분의 도구는 <strong className="font-bold text-foreground">‘문서 작성’</strong>에 멈춥니다. Bill-IO는{" "}
            <strong className="font-bold text-foreground">고객이 들어오는 입구</strong>부터{" "}
            <strong className="font-bold text-foreground">돈이 들어오는 끝</strong>까지 같은 데이터로 이어집니다. 아래
            세 가지가 그 증거입니다.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 lg:gap-7">
          {spotlight.map(({ badge, title, lead, bullets, icon: Icon }) => (
            <article
              key={title}
              className="flex flex-col rounded-2xl border-2 border-border/55 bg-gradient-to-b from-card via-card to-muted/20 p-6 shadow-md ring-1 ring-black/[0.04] transition-[border-color,box-shadow] hover:border-primary/25 hover:shadow-lg sm:p-7"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <span className="inline-flex rounded-full bg-primary/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary ring-1 ring-primary/20">
                  {badge}
                </span>
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/18">
                  <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                </span>
              </div>
              <h3 className="text-lg font-extrabold leading-snug tracking-tight text-foreground">{title}</h3>
              <p className="mt-3 text-sm font-medium leading-relaxed text-muted-foreground">{lead}</p>
              <ul className="mt-5 space-y-2.5 border-t border-border/50 pt-5">
                {bullets.map((b) => (
                  <li key={b} className="flex gap-2 text-sm font-semibold leading-snug text-foreground">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2} aria-hidden />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-14">
          <p className="mb-5 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            같은 계정 안에서 이어지는 나머지
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {secondary.map(({ icon: Icon, title: t, benefit }) => (
              <div
                key={t}
                className="rounded-xl border border-border/55 bg-muted/20 p-4 ring-1 ring-black/[0.02] sm:p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="size-4 text-primary" strokeWidth={1.75} aria-hidden />
                  <h4 className="text-sm font-bold text-foreground">{t}</h4>
                </div>
                <p className="text-[13px] font-medium leading-relaxed text-muted-foreground">{benefit}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="mx-auto mt-12 max-w-2xl text-center text-sm font-semibold text-muted-foreground">
          <Link href="/signup" className="font-bold text-primary underline-offset-4 hover:underline">
            무료로 시작
          </Link>
          해 흐름을 먼저 밟아 보세요. Pro에서 랜딩·포털·향상된 AI 운영 보조가 열립니다.
        </p>
      </div>
    </section>
  )
}

export function LandingIndustries() {
  const industries: {
    icon: typeof FileText
    title: string
    inquiry: string
    docs: string
    flow: string
  }[] = [
    {
      icon: FileText,
      title: "영상 제작 · 촬영",
      inquiry: "기간·컷 수·로케이션 문의가 카톡으로 들어옴",
      docs: "단가표 견적 → 수정안 → 최종 견적 PDF, 잔금 청구",
      flow: "문의 폼으로 요청을 모으고, 견적 단계·잔금 청구까지 한 고객 줄로 관리",
    },
    {
      icon: LayoutDashboard,
      title: "디자인 · 브랜딩",
      inquiry: "브리프·레퍼런스가 메일·슬랙에 흩어짐",
      docs: "라운드마다 추가 견적·청구서를 남기고 포털로 고객에게 공유",
      flow: "문의별로 시안·견적·청구 이력을 묶어 ‘지금 몇 라운드인지’가 보임",
    },
    {
      icon: Wrench,
      title: "설치 · 수리 · 필드",
      inquiry: "출장·부품 문의가 전화·문자로 옴",
      docs: "현장 견적 → 자재비 청구 → 완료 후 잔금",
      flow: "접수 링크로 일단 받고, 견적 발송 후 입금 단계·재방문 일정을 캘린더에",
    },
    {
      icon: Sparkles,
      title: "청소 · 케어",
      inquiry: "평수·정기/입주 견적 문의가 반복됨",
      docs: "템플릿 견적 → 계약 후 선금 청구 → 정기 청구",
      flow: "반복 패턴은 AI 견적·문의 초안으로 빠르게, 미수는 추천 문구·리마인드로",
    },
    {
      icon: CalendarDays,
      title: "미용 · 예약형 서비스",
      inquiry: "예약·시술 문의가 SNS DM으로 섞임",
      docs: "시술 견적·선금 청구 → 방문 후 추가 청구",
      flow: "고객별 예약·견적·청구 상태를 한 화면에서, 다음 방문 전에 확인",
    },
    {
      icon: Users,
      title: "프리랜서 · 소규모 스튜디오",
      inquiry: "의뢰 범위가 매번 달라 문의부터 다시 정리",
      docs: "제안서 견적 → 승인 후 착수금·잔금 청구",
      flow: "혼자 운영해도 접수~청구까지 끊기지 않게, 링크 하나로 유입",
    },
  ]

  return (
    <section
      id="industries"
      className="bg-muted/30 px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
      aria-labelledby="industries-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-primary/90">업종별로</p>
          <h2
            id="industries-heading"
            className="text-2xl font-extrabold tracking-tight text-foreground sm:text-[1.95rem] sm:leading-snug"
          >
            내 업에 대입해 보세요
          </h2>
          <p className="mt-4 text-sm font-medium leading-relaxed text-muted-foreground sm:text-base">
            “이런 분들께”가 아니라,{" "}
            <strong className="font-bold text-foreground">어떤 문의 → 어떤 문서 → 어떻게 관리</strong>하는지까지
            적었습니다. 비슷한 줄이 보이면 이미 Bill-IO가 맞는지 검증할 단계입니다.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {industries.map(({ icon: Icon, title, inquiry, docs, flow }) => (
            <article
              key={title}
              className="flex flex-col rounded-2xl border border-border/60 bg-card p-5 shadow-sm ring-1 ring-black/[0.03] transition-[border-color,box-shadow] hover:border-primary/22 hover:shadow-md sm:p-6"
            >
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/18">
                  <Icon className="size-[1.2rem]" strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="text-base font-extrabold text-foreground">{title}</h3>
              </div>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">받는 문의</dt>
                  <dd className="mt-1 font-semibold leading-snug text-foreground">{inquiry}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">보내는 문서</dt>
                  <dd className="mt-1 font-semibold leading-snug text-foreground">{docs}</dd>
                </div>
                <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-3">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-primary">Bill-IO로</dt>
                  <dd className="mt-1 font-semibold leading-relaxed text-muted-foreground">{flow}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function LandingHowItWorks() {
  const steps = [
    {
      step: "1",
      title: "고객이 링크로 요청",
      scene: "휴대폰에서 공개 폼 작성",
      desc: "바이오·명함의 URL로 접수. 내부에서 직접 등록도 가능합니다.",
    },
    {
      step: "2",
      title: "Bill-IO가 문의로 정리",
      scene: "카드에 단계·메모·첨부",
      desc: "흩어진 내용을 한 카드로 묶고, AI로 요약·구조화와 운영 분석(유형·긴급도·다음 액션)을 지원합니다.",
    },
    {
      step: "3",
      title: "견적 생성",
      scene: "템플릿 + 풀 초안",
      desc: "기본·옵션 항목, 납기·결제·고객 안내까지 초안을 올린 뒤 검토·발송합니다.",
    },
    {
      step: "4",
      title: "링크 · PDF · 알림톡 등으로 발송",
      scene: "고객이 바로 열어봄",
      desc: "공개 링크·PDF·직인으로 전달. 발송 상태를 추적합니다.",
    },
    {
      step: "5",
      title: "승인 후 청구",
      scene: "선금·잔금 나눠 청구",
      desc: "공개 청구 URL로 요청하고 입금 단계를 기록합니다.",
    },
    {
      step: "6",
      title: "수금 · 리마인드",
      scene: "연체 시 다음 연락일",
      desc: "입금 단계별 AI 추천·문구 초안과 미수·추심 메모·알림으로 다음 연락을 놓치지 않습니다.",
    },
  ]

  return (
    <section
      id="how"
      className="border-y border-border/35 bg-background px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
      aria-labelledby="how-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-primary/90">사용 흐름</p>
          <h2
            id="how-heading"
            className="text-2xl font-extrabold tracking-tight text-foreground sm:text-[1.95rem] sm:leading-snug"
          >
            내일 업무가 이렇게 바뀝니다
          </h2>
          <p className="mt-4 text-sm font-medium leading-relaxed text-muted-foreground sm:text-base">
            숫자 나열이 아니라, <strong className="font-bold text-foreground">실제 하루 일정</strong>에 대입해 보세요.
            오른쪽 요약은 제품 안에서 보게 될 한 줄 흐름입니다.
          </p>
        </div>
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_min(100%,300px)] lg:gap-14 xl:grid-cols-[1fr_min(100%,320px)]">
          <ol className="relative space-y-0">
            {steps.map((s, idx) => (
              <li
                key={s.step}
                className={cn(
                  "relative grid gap-4 pb-8 pl-0 sm:grid-cols-[auto_1fr] sm:gap-5 sm:pb-10 sm:pl-2",
                  idx !== steps.length - 1 &&
                    "before:absolute before:left-[1.15rem] before:top-12 before:hidden before:h-[calc(100%-0.5rem)] before:w-px before:bg-border/70 sm:before:block"
                )}
              >
                <div className="flex items-start gap-3 sm:flex-col sm:items-center sm:pt-0.5">
                  <span
                    className="relative z-[1] flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground shadow-md ring-2 ring-primary/25"
                    aria-hidden
                  >
                    {s.step}
                  </span>
                </div>
                <div
                  className={cn(
                    "rounded-2xl border p-4 shadow-sm sm:p-5",
                    idx === 0
                      ? "border-primary/35 bg-primary/[0.05] ring-1 ring-primary/12"
                      : "border-border/55 bg-card ring-1 ring-black/[0.03]"
                  )}
                >
                  <h3 className="font-extrabold tracking-tight text-foreground">{s.title}</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-primary">{s.scene}</p>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mx-auto w-full max-w-sm lg:mx-0 lg:sticky lg:top-24">
            <LandingFlowMock />
          </div>
        </div>
      </div>
    </section>
  )
}

export function LandingPricing() {
  const starterHighlights = [
    "1인·문의→견적→청구→수금 한 흐름",
    "공개 문의 폼·고객 포털 각 1·AI 월 할당(플랜 기준)",
    "PDF·기본 발송·알림",
  ]
  const proHighlights = [
    "Starter 대비 AI·발송·포털 한도 확대",
    "업체 소개 랜딩(`/biz`)·고객 포털 본격 활용",
    "카카오 채널(BYOA)·추심·리마인드 고도화",
    "문의·견적·청구·고객 AI 보조(운영 분석·풀 초안·수금 문구)",
  ]
  const businessHighlights = [
    "다인 팀·좌석 확장(제품 로드맵과 연동)",
    "전자세금계산서 ASP·고급 리포트",
    "AI 대량 사용·API/웹훅 확장 여지",
    "우선 지원·맞춤 온보딩",
  ]

  const plans: {
    name: string
    price: string
    period: string
    blurb: string
    who: string
    tagline?: string
    cta: string
    href: string
    highlight: boolean
  }[] = [
    {
      name: "Starter",
      price: "₩29,000",
      period: "/월",
      blurb: "1인 핵심 운영",
      who: "혼자 견적·청구까지 끊지 않게 쓰는 사장님",
      tagline: "가입 후 7일간 Pro 수준으로 체험한 뒤, Starter로 계속하거나 업그레이드할 수 있습니다.",
      cta: "7일 체험으로 시작",
      href: "/signup",
      highlight: false,
    },
    {
      name: "Pro",
      price: "₩59,000",
      period: "/월",
      blurb: "소규모 팀·유입·자동화",
      who: "링크 유입·포털·AI·카카오까지 쓰고 싶은 팀",
      tagline: "랜딩·포털·AI·추심까지 — 장사 운영에 필요한 자동화가 모입니다.",
      cta: "Pro 자세히",
      href: "/billing?plan=pro",
      highlight: true,
    },
    {
      name: "Business",
      price: "₩129,000",
      period: "/월",
      blurb: "팀·세금계산서·대량",
      who: "여러 명 협업·전자세금계산서·맞춤 한도",
      tagline: "더 큰 한도와 우선 지원이 필요하면 Business 또는 맞춤 견적을 선택하세요.",
      cta: "Business·맞춤 문의",
      href: "/billing#business",
      highlight: false,
    },
  ]

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
            얼마가 아니라, 무엇이 열리는지
          </h2>
          <p className="mt-4 text-sm font-medium leading-relaxed text-muted-foreground sm:text-base">
            <strong className="font-bold text-foreground">7일 무료 체험</strong>으로 Pro 수준 AI·한도를 먼저 써 보고, 이후{" "}
            <strong className="font-bold text-foreground">Starter / Pro / Business</strong> 중에서 고르면 됩니다.{" "}
            <Link href="/billing" className="font-bold text-primary underline-offset-4 hover:underline">
              요금·구독 화면
            </Link>
            에서 플랜·사용량·해지까지 한 번에 확인할 수 있습니다.
          </p>
        </div>

        <div className="mb-12 overflow-hidden rounded-2xl border-2 border-border/60 bg-card shadow-md ring-1 ring-black/[0.04]">
          <div className="grid border-b border-border/50 bg-muted/35 text-xs font-extrabold sm:grid-cols-3">
            <div className="border-b border-border/50 px-3 py-3 sm:border-b-0 sm:border-r sm:py-4 sm:pl-5">
              Starter
            </div>
            <div className="flex items-center gap-2 border-b border-border/50 bg-primary/[0.1] px-3 py-3 sm:border-b-0 sm:border-r sm:py-4 sm:pl-5">
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                추천
              </span>
              Pro
            </div>
            <div className="px-3 py-3 sm:py-4 sm:pl-5">Business</div>
          </div>
          <div className="grid sm:grid-cols-3">
            <ul className="space-y-2.5 border-border/50 p-4 sm:border-r sm:p-5">
              {starterHighlights.map((f) => (
                <li key={f} className="flex gap-2.5 text-sm font-medium text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground/75" strokeWidth={2} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <ul className="space-y-2.5 border-border/50 bg-primary/[0.04] p-4 sm:border-r sm:p-5">
              {proHighlights.map((f) => (
                <li key={f} className="flex gap-2.5 text-sm font-bold text-foreground">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <ul className="space-y-2.5 p-4 sm:p-5">
              {businessHighlights.map((f) => (
                <li key={f} className="flex gap-2.5 text-sm font-semibold text-foreground">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-teal-700" strokeWidth={2} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3 lg:items-stretch lg:gap-6">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={cn(
                "flex flex-col rounded-2xl border p-6 sm:p-7",
                plan.highlight
                  ? "relative z-[1] border-primary/50 bg-card shadow-xl ring-2 ring-primary/35 lg:scale-[1.02]"
                  : plan.name === "Business"
                    ? "border-dashed border-border/65 bg-card/90"
                    : "border-border/60 bg-card shadow-sm ring-1 ring-black/[0.03]"
              )}
            >
              <div className="mb-2 min-h-[1.75rem]">
                {plan.highlight ? (
                  <span className="inline-flex rounded-full bg-primary px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-primary-foreground shadow-sm">
                    수금까지 쓸 때
                  </span>
                ) : null}
              </div>
              <h3 className="text-lg font-extrabold tracking-tight text-foreground">{plan.name}</h3>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">{plan.blurb}</p>
              <p className="mt-2 text-xs font-bold leading-snug text-foreground/90">{plan.who}</p>
              {plan.tagline ? (
                <p className="mt-3 rounded-xl border border-primary/22 bg-primary/[0.08] px-3 py-2.5 text-xs font-bold leading-relaxed text-foreground">
                  {plan.tagline}
                </p>
              ) : null}
              <p className="mt-5 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tracking-tight text-foreground">{plan.price}</span>
                <span className="text-sm font-semibold text-muted-foreground">{plan.period}</span>
              </p>
              <Link
                href={plan.href}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "mt-8 h-12 w-full justify-center text-[15px] font-extrabold",
                  plan.highlight
                    ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                    : "border-2 border-border/80 bg-background hover:bg-muted/50"
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
    q: "어떤 업종에 잘 맞나요?",
    a: "견적·청구 대화가 잦은 영상·디자인·설치/수리·청소·미용·예약형·프리랜서·소규모 스튜디오 등에 맞춰 두었습니다. 위 ‘업종’ 카드에 문의·문서·관리 예시를 적어 두었으니 대입해 보세요.",
  },
  {
    q: "고객은 로그인해야 하나요?",
    a: "아니요. 공개 문의 폼, 공개 견적·청구 링크, (Pro) 고객 미니 포털은 링크만으로 열 수 있습니다. 계정이 있는 건 운영자(사장님·팀)뿐입니다.",
  },
  {
    q: "문의는 어떻게 접수되나요?",
    a: "가입 후 발급되는 공개 폼 URL로 고객이 직접 제출하거나, 내부에서 직접 등록할 수 있습니다. 접수된 건은 문의 목록에 카드로 쌓입니다.",
  },
  {
    q: "홈페이지 없이도 문의를 받을 수 있나요?",
    a: "네. 인스타·카톡 프로필에 폼 링크만 올려도 공식 접수 창구가 됩니다. Pro에서는 업체 소개 랜딩(`/biz`)으로 소개와 문의를 한 페이지에 묶을 수 있습니다.",
  },
  {
    q: "AI는 어떤 일을 도와주나요?",
    a: "문의는 요약·구조화에 더해 유형·긴급도·추천 질문·다음 액션·견적 전환 힌트까지, 견적은 항목·옵션·납기·결제·고객 안내까지 초안을, 청구는 입금 상황별 추천·리마인드·추심 본문을, 고객 상세는 이력 기반 인사이트를 제안합니다. 발송 메일·카톡용 제목·본문 초안도 이어집니다. 모두 검토 후 사용하는 운영 보조이며, 플랜·설정에 따라 범위가 달라질 수 있습니다.",
  },
  {
    q: "견적서와 청구서는 고객에게 어떻게 내나요?",
    a: "공개 링크, PDF, 직인 이미지 등으로 전달할 수 있게 이어져 있습니다. 고객은 링크만으로 열어보고, (Pro) 포털에서 요약을 한 번에 볼 수도 있습니다.",
  },
  {
    q: "입금 상태와 리마인드도 관리할 수 있나요?",
    a: "네. 입금 단계를 기록하고, 리마인드·추심 메모·알림으로 다음 연락을 놓치지 않게 정리할 수 있습니다.",
  },
  {
    q: "체험 기간이 끝나면 어떻게 되나요?",
    a: "7일 Pro 체험이 끝나면 구독을 선택하지 않은 계정은 trial_expired 상태가 되고, Starter 기준 기능·AI 한도로 돌아갑니다. /billing 에서 언제든 플랜을 고를 수 있습니다.",
  },
  {
    q: "플랜은 어떻게 바꾸나요? 구독 해지는요?",
    a: "로그인 후 /billing 구독 콘솔에서 업그레이드·다운그레이드 예약·해지 예약을 할 수 있습니다. PG가 붙기 전까지는 DB 플랜이 즉시 바뀌는 시뮬레이션이며, 이벤트는 billing_events에 남습니다.",
  },
  {
    q: "전자세금계산서는 어떻게 발행하나요?",
    a: "Business 플랜에서 ASP(발급대행) 연동을 설정한 뒤, 청구 상세에서 발행 흐름을 진행합니다. 설정·플랜은 /settings 과 /billing 을 참고하세요.",
  },
  {
    q: "카카오 연동은 어떻게 하나요?",
    a: "Pro 이상에서 알림톡 BYOA 엔드포인트를 설정에 저장합니다. 무료 체험 중에도 Pro 기능을 쓸 수 있어 동일하게 시험해 볼 수 있습니다.",
  },
]

export function LandingFaq() {
  return (
    <section
      id="faq"
      className="bg-background px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-11 text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-primary/90">FAQ</p>
          <h2
            id="faq-heading"
            className="text-2xl font-extrabold tracking-tight text-foreground sm:text-[1.95rem]"
          >
            실사용자가 먼저 묻는 것들
          </h2>
          <p className="mt-4 text-sm font-medium leading-relaxed text-muted-foreground sm:text-base">
            결제·도입 전에 헷갈리기 쉬운 지점만 모았습니다.
          </p>
        </div>
        <div className="space-y-2.5">
          {faqItems.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-border/55 bg-card/95 shadow-sm ring-1 ring-black/[0.02] open:border-border/70 open:shadow-md"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 text-left outline-none marker:content-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden sm:px-5 sm:py-4">
                <span className="pr-2 text-sm font-bold leading-snug text-foreground">{item.q}</span>
                <ChevronDown
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                  strokeWidth={2}
                  aria-hidden
                />
              </summary>
              <div className="border-t border-border/50 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
                <p className="text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </div>
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
      className="shadow-elevated relative mx-4 mb-16 overflow-hidden rounded-3xl border border-primary/35 bg-primary px-6 py-14 text-center sm:mx-6 sm:py-[4.75rem] lg:mx-auto lg:max-w-6xl lg:px-12"
      aria-labelledby="final-cta-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_0%,oklch(1_0_0_/_0.18),transparent_60%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-2xl">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary-foreground/14 ring-1 ring-primary-foreground/25">
          <MessageCircle className="size-7 text-primary-foreground" strokeWidth={1.75} aria-hidden />
        </div>
        <h2
          id="final-cta-heading"
          className="text-balance text-[1.8rem] font-extrabold leading-tight tracking-tight text-primary-foreground sm:text-3xl sm:leading-snug lg:text-[2.2rem]"
        >
          링크 하나로 접수와 운영 흐름을 시작하세요
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm font-semibold leading-relaxed text-primary-foreground/92 sm:text-base">
          <strong className="font-extrabold text-primary-foreground">무료로 시작</strong>하고 첫 문의를 받아 보세요.
          문의·견적·청구가 한 줄로 이어지고, Pro에서는 AI 운영 분석·풀 초안·수금 문구까지 같은 맥락에서 켜집니다.
        </p>
        <div className="mt-10 flex flex-col items-stretch gap-3 sm:items-center">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-14 min-w-[13rem] border-0 bg-primary-foreground px-10 text-base font-extrabold text-primary shadow-lg hover:bg-primary-foreground/95"
              )}
            >
              무료로 시작하기
            </Link>
            <Link
              href="#why"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-14 min-w-[10rem] border-2 border-primary-foreground/50 bg-transparent px-8 text-base font-extrabold text-primary-foreground hover:bg-primary-foreground/[0.12]"
              )}
            >
              차별점 다시 보기
            </Link>
          </div>
          <Link
            href="/login"
            className="text-center text-sm font-bold text-primary-foreground/90 underline-offset-4 hover:underline"
          >
            이미 계정이 있으면 로그인
          </Link>
        </div>
        <p className="mt-8 text-[11px] font-bold uppercase tracking-wider text-primary-foreground/75">
          브라우저만 있으면 OK · 데이터는 계정별로 분리
        </p>
      </div>
    </section>
  )
}

export function LandingFooter() {
  const links = [
    { href: "#why", label: "차별점" },
    { href: "#how", label: "사용 흐름" },
    { href: "#industries", label: "업종" },
    { href: "#pricing", label: "요금" },
    { href: "#faq", label: "FAQ" },
    { href: "/billing", label: "플랜 안내" },
    { href: "/privacy", label: "개인정보처리방침" },
    { href: "/terms", label: "이용약관" },
    { href: "/login", label: "로그인" },
    { href: "/signup", label: "회원가입" },
  ]

  return (
    <footer
      className="border-t border-border/50 bg-muted/40 px-4 py-12 sm:px-6 lg:px-8"
      role="contentinfo"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm">
              B
            </span>
            Bill-IO
          </div>
          <p className="mt-3 text-sm font-medium leading-relaxed text-muted-foreground">
            문의 접수부터 견적·청구·수금·리마인드까지. AI 운영 보조로 빈 화면 시간을 줄이고, 소규모 사업자가 놓치기
            쉬운 흐름을 한 제품에서 잇습니다.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="푸터 링크">
          {links.map((l) => (
            <a
              key={l.href + l.label}
              href={l.href}
              className="font-semibold text-muted-foreground hover:text-foreground"
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

/** @deprecated 호환용 — 신규 랜딩은 LandingDifferentiators만 사용 */
export const LandingFeatures = LandingDifferentiators
