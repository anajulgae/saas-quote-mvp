import Link from "next/link"

import { buttonVariants } from "@/components/ui/button-variants"
import { SUPPORT_EMAIL_ENV } from "@/lib/billing/catalog"
import { cn } from "@/lib/utils"

const HELP_NAV = [
  { href: "/help", label: "홈" },
  { href: "/help/faq", label: "FAQ" },
  { href: "/help/notices", label: "공지" },
  { href: "/help/guides", label: "가이드" },
  { href: "/help/contact", label: "문의" },
] as const

/** 앱 셸 사이드바 안에서만 쓰는 고객센터 하위 내비게이션 */
export default function HelpLayout({ children }: { children: React.ReactNode }) {
  const support = process.env[SUPPORT_EMAIL_ENV]?.trim()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">고객센터</h1>
          <p className="mt-1 text-sm text-muted-foreground">전화 없이 FAQ·가이드·문의 접수로 도와드립니다.</p>
        </div>
        {support ? (
          <a
            href={`mailto:${support}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 w-fit shrink-0")}
          >
            메일: {support}
          </a>
        ) : null}
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="고객센터 메뉴">
        {HELP_NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-8 border-border/70 text-xs font-semibold"
            )}
          >
            {n.label}
          </Link>
        ))}
        <Link
          href="/billing"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-8 border-border/70 text-xs font-semibold"
          )}
        >
          요금·구독
        </Link>
      </nav>

      <div className="max-w-3xl">{children}</div>
    </div>
  )
}
