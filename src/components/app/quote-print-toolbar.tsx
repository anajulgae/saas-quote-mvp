"use client"

import { useTransition } from "react"
import Link from "next/link"
import { Printer } from "lucide-react"
import { toast } from "sonner"

import { recordDocumentPdfDownloadAction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

export function QuotePrintToolbar({ quoteId }: { quoteId: string }) {
  const [pending, startTransition] = useTransition()

  const handlePrint = () => {
    startTransition(async () => {
      const result = await recordDocumentPdfDownloadAction({
        documentKind: "quote",
        documentId: quoteId,
      })
      if (!result.ok) {
        toast.error(result.error)
      }
      window.print()
    })
  }

  return (
    <div className="print:hidden sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur-sm">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          인쇄 화면에서 "PDF로 저장"을 선택하면 document_send 사용량에 포함됩니다.
        </p>
        <p className="text-xs text-muted-foreground">
          단순 미리보기는 집계하지 않고, 실제 저장/인쇄 버튼 클릭만 문서 전달로 기록합니다.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/quotes"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "inline-flex gap-1.5")}
        >
          목록으로
        </Link>
        <Button type="button" size="sm" className="gap-1.5" onClick={handlePrint} disabled={pending}>
          <Printer className="size-4" />
          인쇄 / PDF 저장
        </Button>
      </div>
    </div>
  )
}
