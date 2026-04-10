"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CreditCard,
  FileText,
  LayoutDashboard,
  Menu,
  MessagesSquare,
  Receipt,
  Settings,
  Users,
} from "lucide-react"

import { logoutAction } from "@/app/actions"
import { AuthLegalLinks } from "@/components/app/auth-legal-links"
import { NotificationCenter } from "@/components/app/notification-center"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inquiries", label: "Inquiries", icon: MessagesSquare },
  { href: "/quotes", label: "Quotes", icon: FileText },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
]

const HEADER_CONTEXT: { match: string; title: string; description: string }[] = [
  {
    match: "/dashboard",
    title: "Dashboard",
    description: "Review pipeline, follow-ups, collections, and billing signals at a glance.",
  },
  {
    match: "/inquiries",
    title: "Inquiries",
    description: "Capture inbound requests, qualify them, and move them into quotes.",
  },
  {
    match: "/quotes",
    title: "Quotes",
    description: "Draft, share, email, and convert quotes with AI-assisted workflow.",
  },
  {
    match: "/invoices",
    title: "Invoices",
    description: "Track payment status, reminders, collections, and tax invoice readiness.",
  },
  {
    match: "/customers",
    title: "Customers",
    description: "Keep customer details, activity history, and delivery channels in one place.",
  },
  {
    match: "/billing",
    title: "Billing",
    description: "Manage plans, trials, payment recovery, cancellation, and usage from one console.",
  },
  {
    match: "/settings/landing",
    title: "Public Landing",
    description: "Publish a public business page and connect it to inquiry capture.",
  },
  {
    match: "/settings",
    title: "Settings",
    description: "Configure business profile, templates, notifications, messaging, and plan-linked options.",
  },
]

function headerForPath(pathname: string | null) {
  const path = pathname ?? "/dashboard"
  const row = HEADER_CONTEXT.find((h) => path === h.match || path.startsWith(`${h.match}/`))
  return row ?? { title: "Bill-IO", description: "Quote-to-cash operations for service teams." }
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
        <p className="text-[10px] leading-snug text-muted-foreground/90">Inquiry to quote to billing.</p>
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
          navLabel="Billing, support, and legal links"
          className="flex flex-wrap gap-x-1.5 gap-y-1 text-[11px] leading-relaxed text-muted-foreground"
        />
        <form action={logoutAction}>
          <Button type="submit" variant="outline" className="w-full">
            Log out
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
            <SheetTrigger render={<Button variant="outline" size="icon-sm" aria-label="Open menu" />}>
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
  sidebarSecondary?: string
  isDemoSession?: boolean
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
              Demo workspace: sample data only. Production billing and customer data stay separate.
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
