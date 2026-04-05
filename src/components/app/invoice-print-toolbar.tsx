"use client"

import Link from "next/link"
import { Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

export function InvoicePrintToolbar() {
  return (
    <div className="print:hidden sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur-sm">
      <p className="text-sm text-muted-foreground">
        인쇄 대화상자에서 &quot;PDF로 저장&quot;을 선택하면 청구서 PDF를 만들 수 있습니다.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/invoices"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "inline-flex gap-1.5")}
        >
          목록으로
        </Link>
        <Button type="button" size="sm" className="gap-1.5" onClick={() => window.print()}>
          <Printer className="size-4" />
          인쇄 / PDF 저장
        </Button>
      </div>
    </div>
  )
}
