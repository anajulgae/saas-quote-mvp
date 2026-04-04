"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, LayoutDashboard, Menu, Receipt, Settings, Users, FileText, MessagesSquare } from "lucide-react"

import { logoutAction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const navigation = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/inquiries", label: "문의", icon: MessagesSquare },
  { href: "/quotes", label: "견적", icon: FileText },
  { href: "/invoices", label: "청구", icon: Receipt },
  { href: "/customers", label: "고객", icon: Users },
  { href: "/settings", label: "설정", icon: Settings },
]

const HEADER_CONTEXT: { match: string; title: string; description: string }[] = [
  { match: "/dashboard", title: "대시보드", description: "이번 달 견적·수금과 후속조치 요약" },
  { match: "/inquiries", title: "문의", description: "유입부터 수주까지 단계별 관리" },
  { match: "/quotes", title: "견적", description: "견적서 작성·발송·상태 추적" },
  { match: "/invoices", title: "청구", description: "청구·입금·리마인드" },
  { match: "/customers", title: "고객", description: "거래처 정보와 이력" },
  { match: "/settings", title: "설정", description: "계정·사업장·연동" },
]

function headerForPath(pathname: string | null) {
  const path = pathname ?? "/dashboard"
  const row = HEADER_CONTEXT.find((h) => path === h.match || path.startsWith(`${h.match}/`))
  return row ?? { title: "FlowBill AI", description: "견적 · 청구 · 수금 연결 관리" }
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="space-y-1">
      {navigation.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          FlowBill AI
        </p>
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
      <div className="border-t border-border/70 p-3">
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
}: {
  businessName: string
  sidebarSecondary?: string
}) {
  const pathname = usePathname()
  const { title, description } = headerForPath(pathname)

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur">
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
        <Button variant="outline" size="icon-sm" aria-label="알림" className="shrink-0">
          <Bell className="size-4" />
        </Button>
      </div>
    </header>
  )
}

export function AppShell({
  businessName,
  sidebarSecondary,
  isDemoSession,
  children,
}: {
  businessName: string
  /** 사업장명과 다른 경우에만 표시 (이메일·이름 중복 방지) */
  sidebarSecondary?: string
  /** 외부 점검용 데모 쿠키 세션 (Supabase·운영 DB 미사용) */
  isDemoSession?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fafafa,#f4f4f5_45%,#f8fafc)]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-72 border-r border-border/70 bg-background/90 backdrop-blur xl:block">
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
          <AppHeader businessName={businessName} sidebarSecondary={sidebarSecondary} />
          <main className="flex-1 px-4 py-5 md:px-6 md:py-7">{children}</main>
        </div>
      </div>
    </div>
  )
}
