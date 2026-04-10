import Link from "next/link"

import { buttonVariants } from "@/components/ui/button-variants"
import { SUPPORT_EMAIL_ENV } from "@/lib/billing/catalog"
import { cn } from "@/lib/utils"

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  const support = process.env[SUPPORT_EMAIL_ENV]?.trim()

  const nav = [
    { href: "/help", label: "홈" },
    { href: "/help/faq", label: "FAQ" },
    { href: "/help/notices", label: "공지" },
    { href: "/help/guides", label: "가이드" },
    { href: "/help/contact", label: "문의" },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <Link href="/" className="text-sm font-semibold text-primary hover:underline">
              Bill-IO
            </Link>
            <p className="text-lg font-bold tracking-tight">고객센터</p>
            <p className="text-xs text-muted-foreground">전화 없이 FAQ·가이드·문의 접수로 도와드립니다.</p>
          </div>
          {support ? (
            <a
              href={`mailto:${support}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 shrink-0")}
            >
              메일: {support}
            </a>
          ) : null}
        </div>
        <nav className="mx-auto flex max-w-3xl flex-wrap gap-2 border-t border-border/40 px-4 py-2 sm:px-6" aria-label="고객센터">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {n.label}
            </Link>
          ))}
          <Link
            href="/billing"
            className="rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            요금·구독
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
