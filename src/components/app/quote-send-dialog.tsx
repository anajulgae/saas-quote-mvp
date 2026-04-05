"use client"

import { useEffect, useState, useTransition } from "react"
import { ExternalLink, Link2, Loader2, Mail, MessageCircle } from "lucide-react"
import { toast } from "sonner"

import {
  ensureQuoteShareLinkAction,
  logQuoteKakaoTemplateCopiedAction,
  logQuoteShareLinkCopiedAction,
  sendQuoteEmailAction,
} from "@/app/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { QuoteWithItems } from "@/types/domain"

export function QuoteSendDialog({
  quote,
  open,
  onOpenChange,
  emailBodyTemplate,
  onAfterSend,
}: {
  quote: QuoteWithItems | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 설정의 기본 견적 템플릿 본문 — 이메일 초안 앞부분에 반영 */
  emailBodyTemplate: string
  onAfterSend?: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [shareUrl, setShareUrl] = useState("")
  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [includeLink, setIncludeLink] = useState(true)
  const [markAsSent, setMarkAsSent] = useState(true)

  useEffect(() => {
    if (!open || !quote) {
      return
    }
    setSubject(`[Bill-IO] 견적서 ${quote.quoteNumber} 전달드립니다`)
    const tpl = emailBodyTemplate.trim()
    const core =
      "안녕하세요.\n\n요청하신 견적서를 전달드립니다.\n아래 링크에서 내용을 확인해 주시고, PDF가 필요하시면 링크에서 인쇄·PDF 저장을 이용해 주세요.\n"
    setBody(tpl ? `${tpl}\n\n${core}` : core)
    setTo(quote.customer?.email?.trim() ?? "")
    setIncludeLink(true)
    setMarkAsSent(quote.status === "draft")
    setShareUrl("")

    startTransition(async () => {
      const res = await ensureQuoteShareLinkAction(quote.id)
      if (res.ok) {
        setShareUrl(res.url)
      }
    })
  }, [open, quote, emailBodyTemplate])

  const handleSendEmail = () => {
    if (!quote) {
      return
    }
    startTransition(async () => {
      const res = await sendQuoteEmailAction({
        quoteId: quote.id,
        to: to.trim(),
        subject: subject.trim(),
        body: body.trim(),
        includePublicLink: includeLink,
        markAsSent,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      if ("demo" in res && res.demo) {
        toast.success("데모 모드에서는 실제 이메일이 발송되지 않습니다.")
      } else {
        toast.success("이메일을 보냈습니다.")
      }
      onAfterSend?.()
      onOpenChange(false)
    })
  }

  const copyShareLink = () => {
    if (!quote) {
      return
    }
    startTransition(async () => {
      let url = shareUrl
      if (!url) {
        const res = await ensureQuoteShareLinkAction(quote.id)
        if (!res.ok) {
          toast.error(res.error)
          return
        }
        url = res.url
        setShareUrl(url)
      }
      try {
        await navigator.clipboard.writeText(url)
        const logRes = await logQuoteShareLinkCopiedAction(quote.id)
        if (!logRes.ok) {
          toast.error(logRes.error)
          return
        }
        toast.success("고객 공유 링크를 복사했습니다.")
      } catch {
        toast.error("클립보드 복사에 실패했습니다.")
      }
    })
  }

  const openPdfPrint = () => {
    if (!quote) {
      return
    }
    window.open(`/quotes/${quote.id}/print`, "_blank", "noopener,noreferrer")
  }

  const copyKakaoMessage = () => {
    if (!quote) {
      return
    }
    startTransition(async () => {
      let url = shareUrl
      if (!url) {
        const res = await ensureQuoteShareLinkAction(quote.id)
        if (!res.ok) {
          toast.error(res.error)
          return
        }
        url = res.url
        setShareUrl(url)
      }
      const text = `[Bill-IO] 견적 안내\n${quote.title}\n견적번호 ${quote.quoteNumber}\n\n아래 링크에서 견적서를 확인해 주세요.\n${url}\n\n감사합니다.`
      try {
        await navigator.clipboard.writeText(text)
        const logRes = await logQuoteKakaoTemplateCopiedAction(quote.id)
        if (!logRes.ok) {
          toast.error(logRes.error)
          return
        }
        toast.success("카카오톡에 붙여넣기 좋은 문구를 복사했습니다.")
      } catch {
        toast.error("클립보드 복사에 실패했습니다.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>견적서 보내기</DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            고객에게 공유 링크·이메일·PDF로 견적서를 전달합니다. 공개 링크는 로그인 없이 열립니다.
          </DialogDescription>
        </DialogHeader>

        {quote ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-mono font-medium text-foreground">{quote.quoteNumber}</span>
              <span className="mx-1.5 text-border">·</span>
              {quote.title}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={isPending}
                onClick={copyShareLink}
              >
                <Link2 className="size-3.5" />
                공유 링크 복사
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={openPdfPrint}
              >
                <ExternalLink className="size-3.5" />
                인쇄·PDF
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={isPending}
                onClick={copyKakaoMessage}
              >
                <MessageCircle className="size-3.5" />
                카톡 문구 복사
              </Button>
            </div>

            {shareUrl ? (
              <p className="break-all rounded border border-dashed border-border/70 bg-background px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
                {shareUrl}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">공유 링크를 준비하는 중…</p>
            )}

            <div className="space-y-2 border-t border-border/50 pt-3">
              <p className="text-xs font-semibold text-foreground">이메일 보내기</p>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">받는 사람</label>
                <Input className="h-9" value={to} onChange={(e) => setTo(e.target.value)} type="email" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">제목</label>
                <Input className="h-9" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">본문</label>
                <Textarea className="min-h-[8rem] text-sm" value={body} onChange={(e) => setBody(e.target.value)} />
              </div>
              <label className="flex cursor-pointer items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  className="mt-0.5 size-3.5 rounded border-border"
                  checked={includeLink}
                  onChange={(e) => setIncludeLink(e.target.checked)}
                />
                <span>본문 말미에 고객 공유 링크를 자동으로 붙입니다.</span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  className="mt-0.5 size-3.5 rounded border-border"
                  checked={markAsSent}
                  onChange={(e) => setMarkAsSent(e.target.checked)}
                  disabled={quote.status !== "draft"}
                />
                <span>발송 후 견적 상태를 &quot;발송됨&quot;으로 바꿉니다. (초안일 때만 권장)</span>
              </label>
            </div>
          </div>
        ) : null}

        <DialogFooter className="border-t-0 bg-transparent p-0 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
          <Button
            type="button"
            className="gap-1.5"
            disabled={isPending || !quote || !to.trim()}
            onClick={handleSendEmail}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
            이메일 발송
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
