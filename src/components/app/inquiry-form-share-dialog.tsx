"use client"

import { useCallback, useMemo, useState } from "react"
import { Code, Copy, Mail, MessageCircle, QrCode, Smartphone } from "lucide-react"
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
  const [embedTab, setEmbedTab] = useState<"iframe" | "script">("iframe")
  const [showEmbed, setShowEmbed] = useState(false)

  const iframeSnippet = useMemo(() => {
    if (!formUrl) return ""
    const embedUrl = formUrl.includes("?") ? `${formUrl}&embed=1` : `${formUrl}?embed=1`
    return `<iframe src="${embedUrl}" style="width:100%;min-height:600px;border:none;" loading="lazy" allow="clipboard-write"></iframe>`
  }, [formUrl])

  const scriptSnippet = useMemo(() => {
    if (!formUrl) return ""
    try {
      const origin = new URL(formUrl).origin
      const urlToken = formUrl.split("/request/")[1]?.split("?")[0] ?? ""
      return `<script src="${origin}/widget.js" data-token="${urlToken}"></script>`
    } catch {
      return ""
    }
  }, [formUrl])

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
            <p className="mt-2 text-center text-xs text-muted-foreground">
              인쇄·현장 안내에 활용해 보세요.
            </p>
          </div>
        ) : null}

        {formUrl ? (
          <div className="rounded-xl border border-border/60 bg-card p-4">
            <button
              type="button"
              className="flex w-full items-center gap-2 text-sm font-medium text-foreground"
              onClick={() => setShowEmbed((v) => !v)}
            >
              <Code className="size-4" aria-hidden />
              개발자용 임베드 코드
              <span className="ml-auto text-xs text-muted-foreground">{showEmbed ? "접기" : "펼치기"}</span>
            </button>
            {showEmbed && (
              <div className="mt-3 space-y-3">
                <p className="rounded-md bg-amber-50 px-2.5 py-1.5 text-xs leading-snug text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  직접 HTML을 편집할 수 있는 자체 웹사이트에서만 동작합니다. 네이버 블로그·티스토리·Wix 등 외부 플랫폼에서는 보안 정책으로 차단될 수 있으며, 이 경우 위의 <strong>링크 복사</strong>를 이용해 주세요.
                </p>
                <div className="flex gap-1 rounded-lg bg-muted/40 p-0.5">
                  <button
                    type="button"
                    className={cn(
                      "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      embedTab === "iframe"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setEmbedTab("iframe")}
                  >
                    iframe
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      embedTab === "script"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setEmbedTab("script")}
                  >
                    플로팅 버튼
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {embedTab === "iframe"
                      ? "문의 폼을 페이지에 직접 삽입합니다."
                      : "페이지 우하단에 플로팅 버튼이 나타납니다."}
                  </p>
                  <pre className="whitespace-pre-wrap break-all rounded-lg border border-border/50 bg-muted/30 p-2 text-sm leading-relaxed text-foreground">
                    {embedTab === "iframe" ? iframeSnippet : scriptSnippet}
                  </pre>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => copy("link", embedTab === "iframe" ? iframeSnippet : scriptSnippet)}
                  >
                    <Copy className="size-3" aria-hidden />
                    코드 복사
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {replyEmail ? (
          <p className="text-xs text-muted-foreground">
            회신 주소 안내: <span className="font-medium text-foreground">{replyEmail}</span>
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
