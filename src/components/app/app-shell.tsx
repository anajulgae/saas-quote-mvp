"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  CircleHelp,
  CreditCard,
  LayoutDashboard,
  Menu,
  Receipt,
  Settings,
  Users,
  FileText,
  MessagesSquare,
} from "lucide-react"

import { logoutAction } from "@/app/actions"
import { AuthLegalLinks } from "@/components/app/auth-legal-links"
import { NotificationCenter } from "@/components/app/notification-center"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const navigation = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/inquiries", label: "문의", icon: MessagesSquare },
  { href: "/quotes", label: "견적", icon: FileText },
  { href: "/invoices", label: "청구", icon: Receipt },
  { href: "/customers", label: "고객", icon: Users },
  { href: "/analytics", label: "통계", icon: BarChart3 },
  { href: "/billing", label: "요금·구독", icon: CreditCard },
  { href: "/help", label: "고객센터", icon: CircleHelp },
  { href: "/settings", label: "설정", icon: Settings },
]

const HEADER_CONTEXT: { match: string; title: string; description: string }[] = [
  {
    match: "/dashboard",
    title: "대시보드",
    description: "수금·팔로업 요약과 유입·발송·알림 허브",
  },
  {
    match: "/inquiries",
    title: "문의",
    description: "웹폼·포털 접수 → 단계·캘린더 → AI 운영 분석·정리 → 견적 연결",
  },
  {
    match: "/quotes",
    title: "견적",
    description: "AI 풀 초안·문서·공개 링크·메일 발송·청구까지",
  },
  {
    match: "/invoices",
    title: "청구",
    description: "공개 청구·입금·AI 추천·리마인드·추심·캘린더",
  },
  {
    match: "/customers",
    title: "고객",
    description: "거래처·미니 포털·문의·견적·청구·AI 인사이트 맥락",
  },
  {
    match: "/analytics",
    title: "통계",
    description: "문의·견적·청구·수금 전환, AI·문서 발송, 기간별 운영 리포트",
  },
  {
    match: "/billing",
    title: "요금·구독",
    description: "플랜·체험·사용량, 구독 변경·해지, PG 연동 확장 포인트",
  },
  {
    match: "/help",
    title: "고객센터",
    description: "FAQ·공지·가이드·문의 접수, 지원 메일 안내",
  },
  {
    match: "/settings",
    title: "설정",
    description: "사업장·문서·공개 유입·알림·AI·플랜·메시징",
  },
  {
    match: "/settings/landing",
    title: "업체 소개 페이지",
    description: "공개 랜딩·문의 연결·브랜드 노출",
  },
]

function headerForPath(pathname: string | null) {
  const path = pathname ?? "/dashboard"
  const row = HEADER_CONTEXT.find((h) => path === h.match || path.startsWith(`${h.match}/`))
  return row ?? { title: "Bill-IO", description: "견적 · 청구 · 수금 연결 관리" }
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="space-y-1">
      {navigation.map((item) => {
        const Icon = item.icon
        const isActive =
          item.href === "/help"
            ? pathname === "/help" || pathname.startsWith("/help/")
            : pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/12 text-primary ring-1 ring-primary/15 shadow-none"
                : "text-muted-foreground hover:bg-muted/90 hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarContent({
  businessName,
  sidebarSecondary,
}: {
  businessName: string
  sidebarSecondary?: string
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-1.5 border-b border-border/70 px-4 py-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Bill-IO
        </p>
        <p className="text-[10px] leading-snug text-muted-foreground/90">유입 → 견적 → 청구 → 수금</p>
        <h2 className="text-base font-semibold leading-snug tracking-tight text-foreground">
          {businessName}
        </h2>
        {sidebarSecondary ? (
          <p className="truncate text-xs text-muted-foreground" title={sidebarSecondary}>
            {sidebarSecondary}
          </p>
        ) : null}
      </div>
      <div className="flex-1 px-3 py-3">
        <NavLinks />
      </div>
      <div className="space-y-3 border-t border-border/70 p-3">
        <AuthLegalLinks
          showBilling
          navLabel="약관·요금·고객센터"
          className="flex flex-wrap gap-x-1.5 gap-y-1 text-[11px] leading-relaxed text-muted-foreground"
        />
        <form action={logoutAction}>
          <Button type="submit" variant="outline" className="w-full">
            로그아웃
          </Button>
        </form>
      </div>
    </div>
  )
}

function AppHeader({
  businessName,
  sidebarSecondary,
  sessionUserId,
  isDemoSession,
}: {
  businessName: string
  sidebarSecondary?: string
  sessionUserId: string | null
  isDemoSession: boolean
}) {
  const pathname = usePathname()
  const { title, description } = headerForPath(pathname)

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Sheet>
            <SheetTrigger render={<Button variant="outline" size="icon-sm" aria-label="메뉴 열기" />}>
              <Menu className="size-4" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 xl:hidden">
              <SidebarContent businessName={businessName} sidebarSecondary={sidebarSecondary} />
            </SheetContent>
          </Sheet>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{title}</p>
            <p className="truncate text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <NotificationCenter userId={sessionUserId} isDemoSession={isDemoSession} />
      </div>
    </header>
  )
}

export function AppShell({
  businessName,
  sidebarSecondary,
  isDemoSession,
  sessionUserId,
  children,
}: {
  businessName: string
  /** 사업장명과 다른 경우에만 표시 (이메일·이름 중복 방지) */
  sidebarSecondary?: string
  /** 외부 점검용 데모 쿠키 세션 (Supabase·운영 DB 미사용) */
  isDemoSession?: boolean
  /** Supabase 로그인 사용자 id — 알림 Realtime·배지 */
  sessionUserId?: string | null
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_100%_70%_at_50%_-15%,oklch(0.94_0.03_175_/_0.22),transparent_55%),linear-gradient(180deg,oklch(0.997_0.004_260),oklch(0.975_0.008_260))]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-72 border-r border-border/60 bg-card/85 backdrop-blur-md xl:block">
          <SidebarContent businessName={businessName} sidebarSecondary={sidebarSecondary} />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          {isDemoSession ? (
            <div
              role="status"
              className="border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-center text-sm font-medium text-amber-950 dark:text-amber-100"
            >
              테스트용 데모 환경 · 샘플 데이터만 표시됩니다 (운영 DB·실사용자 데이터와 분리)
            </div>
          ) : null}
          <AppHeader
            businessName={businessName}
            sidebarSecondary={sidebarSecondary}
            sessionUserId={sessionUserId ?? null}
            isDemoSession={Boolean(isDemoSession)}
          />
          <main className="flex-1 px-4 py-5 md:px-6 md:py-7">{children}</main>
        </div>
      </div>
    </div>
  )
}
