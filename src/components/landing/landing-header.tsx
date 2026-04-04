"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const nav = [
  { href: "#features", label: "기능" },
  { href: "#pricing", label: "요금제" },
  { href: "#faq", label: "FAQ" },
] as const

export function LandingHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header
      className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md supports-backdrop-filter:bg-background/80"
      role="banner"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
        >
          <span
            className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm"
            aria-hidden
          >
            B
          </span>
          <span className="text-base sm:text-lg">Bill-IO</span>
        </Link>

        <nav
          className="hidden items-center gap-8 md:flex"
          aria-label="주요 메뉴"
        >
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "ghost", size: "default" }),
              "hidden h-9 px-3 text-sm font-medium sm:inline-flex"
            )}
          >
            로그인
          </Link>
          <Link
            href="/signup"
            className={cn(
              buttonVariants({ variant: "default", size: "default" }),
              "hidden h-9 bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 sm:inline-flex"
            )}
          >
            무료로 시작하기
          </Link>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="md:hidden"
                  aria-label="메뉴 열기"
                />
              }
            >
              <Menu className="size-4" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100%,20rem)]">
              <SheetHeader>
                <SheetTitle className="text-left">메뉴</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-2 pb-4" aria-label="모바일 메뉴">
                {nav.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </a>
                ))}
                <hr className="my-2 border-border/70" />
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                  onClick={() => setOpen(false)}
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="mx-3 mt-1 flex h-10 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                  onClick={() => setOpen(false)}
                >
                  무료로 시작하기
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
