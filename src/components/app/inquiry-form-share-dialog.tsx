"use client"

import { useCallback } from "react"
import { Copy, Mail, MessageCircle, QrCode, Smartphone } from "lucide-react"
import { toast } from "sonner"

import { logInquiryFormShareAction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

function buildShareLines(businessName: string, formUrl: string) {
  const head = businessName.trim() || "담당"
  const body = `${head} 문의 폼입니다.\n아래 링크에서 문의 내용을 남겨 주세요.\n\n${formUrl}`
  return body
}

export function InquiryFormShareDialog({
  open,
  onOpenChange,
  formUrl,
  businessName,
  replyEmail,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  formUrl: string
  businessName: string
  replyEmail?: string
}) {
  const lines = buildShareLines(businessName, formUrl)
  const mailSubject = encodeURIComponent(
    `${businessName.trim() || "문의"} — 온라인 문의 안내`
  )
  const mailBody = encodeURIComponent(lines)
  const mailto = `mailto:?subject=${mailSubject}&body=${mailBody}`

  const copy = useCallback(
    async (kind: "link" | "kakao" | "sms", text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        toast.success(kind === "link" ? "링크를 복사했습니다." : "문구를 복사했습니다.")
        void logInquiryFormShareAction(
          kind === "link" ? "link_copied" : kind === "kakao" ? "kakao_copied" : "sms_copied"
        )
      } catch {
        toast.error("복사에 실패했습니다.")
      }
    },
    []
  )

  const openMail = () => {
    void logInquiryFormShareAction("email_opened")
    window.location.href = mailto
  }

  const qrSrc = formUrl ? `/api/public/inquiry-qr?url=${encodeURIComponent(formUrl)}` : ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-4">
        <DialogHeader>
          <DialogTitle>문의 폼 보내기</DialogTitle>
          <DialogDescription>
            링크·이메일·카카오·문자에 쓸 문구와 QR을 한곳에서 복사할 수 있습니다. (SMS 자동 발송은 포함하지
            않습니다.)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs break-all text-muted-foreground">
          {formUrl || "먼저 폼을 활성화하고 링크를 발급해 주세요."}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-10 justify-start gap-2 py-2 text-left text-sm"
            disabled={!formUrl}
            onClick={() => copy("link", formUrl)}
          >
            <Copy className="size-4 shrink-0" aria-hidden />
            링크 복사
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-10 justify-start gap-2 py-2 text-left text-sm"
            disabled={!formUrl}
            onClick={openMail}
          >
            <Mail className="size-4 shrink-0" aria-hidden />
            이메일 작성
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-10 justify-start gap-2 py-2 text-left text-sm"
            disabled={!formUrl}
            onClick={() => copy("kakao", lines)}
          >
            <MessageCircle className="size-4 shrink-0" aria-hidden />
            카카오용 문구 복사
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-10 justify-start gap-2 py-2 text-left text-sm"
            disabled={!formUrl}
            onClick={() => copy("sms", lines)}
          >
            <Smartphone className="size-4 shrink-0" aria-hidden />
            문자용 문구 복사
          </Button>
        </div>

        {formUrl ? (
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
              onLoad={() => {
                void logInquiryFormShareAction("qr_viewed")
              }}
            />
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              인쇄·현장 안내에 활용해 보세요.
            </p>
          </div>
        ) : null}

        {replyEmail ? (
          <p className="text-[11px] text-muted-foreground">
            회신 주소 안내: <span className="font-medium text-foreground">{replyEmail}</span>
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
