"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const NAV = [
  { href: "/admin", label: "개요" },
  { href: "/admin/users", label: "사용자" },
  { href: "/admin/billing", label: "구독·결제" },
  { href: "/admin/support", label: "고객센터" },
  { href: "/admin/usage", label: "사용량" },
  { href: "/admin/system", label: "시스템" },
  { href: "/admin/content", label: "콘텐츠" },
] as const

export function AdminShell({
  children,
  adminEmail,
  adminRole,
}: {
  children: React.ReactNode
  adminEmail: string
  adminRole: string | null
}) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen">
      <aside className="relative hidden w-52 shrink-0 flex-col border-r border-zinc-200 bg-white md:flex">
        <div className="flex h-14 items-center border-b border-zinc-200 px-4">
          <Link href="/admin" className="text-sm font-extrabold tracking-tight text-zinc-900">
            Bill-IO <span className="text-zinc-500">운영</span>
          </Link>
        </div>
        <nav className="space-y-0.5 p-2">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-zinc-200 text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto border-t border-zinc-200 p-3 text-xs text-zinc-500">
          <p className="truncate font-medium text-zinc-700">{adminEmail}</p>
          {adminRole ? <p className="mt-0.5 text-zinc-500">역할: {adminRole}</p> : null}
          <Link href="/dashboard" className="mt-2 inline-block text-primary underline-offset-2 hover:underline">
            사용자 앱
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white/90 px-4 backdrop-blur md:hidden">
          <Link href="/admin" className="text-sm font-bold text-zinc-900">
            Bill-IO 운영
          </Link>
          <Link href="/dashboard" className="text-xs text-primary">
            앱
          </Link>
        </header>
        <div className="border-b border-zinc-200 bg-zinc-50 md:hidden">
          <nav className="flex gap-1 overflow-x-auto p-2">
            {NAV.map((item) => {
              const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "shrink-0 rounded-md px-2.5 py-1.5 text-xs font-semibold",
                    active ? "bg-zinc-200 text-zinc-900" : "text-zinc-600"
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
