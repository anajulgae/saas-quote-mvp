"use client"

import { useCallback } from "react"
import { Copy, Mail, MessageCircle, QrCode, Smartphone } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

function buildShareLines(businessName: string, landingUrl: string) {
  const head = businessName.trim() || "담당"
  return `${head} 업체 소개 페이지입니다.\n아래 링크에서 서비스를 확인하고 문의를 남겨 주세요.\n\n${landingUrl}`
}

export function LandingShareDialog({
  open,
  onOpenChange,
  landingUrl,
  businessName,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  landingUrl: string
  businessName: string
}) {
  const lines = buildShareLines(businessName, landingUrl)
  const mailSubject = encodeURIComponent(`${businessName.trim() || "업체"} 소개 페이지`)
  const mailBody = encodeURIComponent(lines)
  const mailto = `mailto:?subject=${mailSubject}&body=${mailBody}`

  const copy = useCallback(async (kind: "link" | "kakao" | "sms", text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(kind === "link" ? "링크를 복사했습니다." : "문구를 복사했습니다.")
    } catch {
      toast.error("복사에 실패했습니다.")
    }
  }, [])

  const qrSrc = landingUrl ? `/api/public/inquiry-qr?url=${encodeURIComponent(landingUrl)}` : ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-4">
        <DialogHeader>
          <DialogTitle>소개 페이지 공유</DialogTitle>
          <DialogDescription>
            공개 링크·QR·이메일·카카오·문자용 문구를 한곳에서 복사할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs break-all text-muted-foreground">
          {landingUrl || "먼저 페이지를 공개하고 slug를 저장해 주세요."}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-10 justify-start gap-2 py-2 text-left text-sm"
            disabled={!landingUrl}
            onClick={() => copy("link", landingUrl)}
          >
            <Copy className="size-4 shrink-0" aria-hidden />
            링크 복사
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-10 justify-start gap-2 py-2 text-left text-sm"
            disabled={!landingUrl}
            onClick={() => {
              window.location.href = mailto
            }}
          >
            <Mail className="size-4 shrink-0" aria-hidden />
            이메일 작성
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-10 justify-start gap-2 py-2 text-left text-sm"
            disabled={!landingUrl}
            onClick={() => copy("kakao", lines)}
          >
            <MessageCircle className="size-4 shrink-0" aria-hidden />
            카카오용 문구 복사
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-10 justify-start gap-2 py-2 text-left text-sm"
            disabled={!landingUrl}
            onClick={() => copy("sms", lines)}
          >
            <Smartphone className="size-4 shrink-0" aria-hidden />
            문자용 문구 복사
          </Button>
        </div>

        {landingUrl ? (
          <div className="rounded-xl border border-border/60 bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <QrCode className="size-4" aria-hidden />
              QR 코드
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSrc}
              alt=""
              width={200}
              height={200}
              className={cn("mx-auto mt-3 rounded-lg border border-border/50 bg-white p-2")}
            />
            <p className="mt-2 text-center text-xs text-muted-foreground">
              명함·현장 안내에 활용해 보세요.
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
