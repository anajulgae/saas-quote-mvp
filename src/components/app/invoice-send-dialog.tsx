"use client"

import { useEffect, useState } from "react"
import { ExternalLink, Link2, Loader2, Mail, MessageCircle, RefreshCw, Sparkles } from "lucide-react"
import { toast } from "sonner"

import {
  ensureInvoiceShareLinkAction,
  logInvoiceKakaoTemplateCopiedAction,
  logInvoiceShareLinkCopiedAction,
  sendInvoiceEmailAction,
  sendInvoiceKakaoByoaAction,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency, formatDate } from "@/lib/format"
import { buildKakaoInvoiceShareText, buildSmsInvoiceShareText } from "@/lib/kakao-share"
import type { InvoiceWithReminders } from "@/types/domain"

type MessageTone = "polite" | "neutral" | "firm"

const messageToneSelectItems: Record<MessageTone, string> = {
  polite: "정중형",
  neutral: "기본형",
  firm: "단호형",
}

export function InvoiceSendDialog({
  invoice,
  open,
  onOpenChange,
  paymentTerms,
  bankAccount,
  businessName = "",
  kakaoByoaAllowed,
  onAfterSend,
}: {
  invoice: InvoiceWithReminders | null
  open: boolean
  onOpenChange: (open: boolean) => void
  paymentTerms: string
  bankAccount: string
  businessName?: string
  kakaoByoaAllowed: boolean
  onAfterSend?: () => void
}) {
  const [shareUrl, setShareUrl] = useState("")
  const [shareLoading, setShareLoading] = useState(false)
  const [shareError, setShareError] = useState("")
  const [actionBusy, setActionBusy] = useState(false)

  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [includeLink, setIncludeLink] = useState(true)
  const [messageTone, setMessageTone] = useState<MessageTone>("neutral")
  const [aiBusy, setAiBusy] = useState(false)
  const [alimPhone, setAlimPhone] = useState("")
  const [alimBusy, setAlimBusy] = useState(false)

  const invoiceId = invoice?.id

  useEffect(() => {
    if (!open || !invoice) {
      return
    }
    const digits = (invoice.customer?.phone ?? "").replace(/\D/g, "")
    setAlimPhone(digits.length >= 10 ? invoice.customer?.phone?.trim() ?? "" : "")
    setSubject(`[Bill-IO] 청구서 ${invoice.invoiceNumber} 안내드립니다`)
    const terms = paymentTerms.trim()
    const acct = bankAccount.trim()
    const lines = [
      "안녕하세요.",
      "",
      `청구번호 ${invoice.invoiceNumber} · 금액 ${formatCurrency(invoice.amount)}`,
      invoice.dueDate ? `입금 기한 ${formatDate(invoice.dueDate)}` : "",
      "",
      "아래 링크에서 청구서 전문을 확인하실 수 있습니다. PDF가 필요하시면 링크에서 인쇄·PDF 저장을 이용해 주세요.",
      "",
      terms ? `결제 조건:\n${terms}` : "",
      acct ? `\n입금 계좌:\n${acct}` : "",
    ]
      .filter(Boolean)
      .join("\n")
    setBody(lines.trim())
    setTo(invoice.customer?.email?.trim() ?? "")
    setIncludeLink(true)
  }, [
    open,
    invoiceId,
    invoice?.invoiceNumber,
    invoice?.amount,
    invoice?.dueDate,
    invoice?.customer?.email,
    paymentTerms,
    bankAccount,
  ])

  useEffect(() => {
    if (!open || !invoiceId) {
      return
    }
    setShareUrl("")
    setShareError("")
    let cancelled = false

    ;(async () => {
      setShareLoading(true)
      try {
        const res = await ensureInvoiceShareLinkAction(invoiceId)
        if (cancelled) {
          return
        }
        if (res.ok) {
          setShareUrl(res.url)
          setShareError("")
        } else {
          setShareError(res.error)
          toast.error(res.error)
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "공유 링크를 불러오지 못했습니다."
          setShareError(msg)
          toast.error(msg)
        }
      } finally {
        if (!cancelled) {
          setShareLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, invoiceId])

  const retryShareLink = () => {
    if (!invoiceId) {
      return
    }
    setShareUrl("")
    setShareError("")
    setShareLoading(true)
    void (async () => {
      try {
        const res = await ensureInvoiceShareLinkAction(invoiceId)
        if (res.ok) {
          setShareUrl(res.url)
          setShareError("")
          toast.success("공유 링크를 준비했습니다.")
        } else {
          setShareError(res.error)
          toast.error(res.error)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "공유 링크를 불러오지 못했습니다."
        setShareError(msg)
        toast.error(msg)
      } finally {
        setShareLoading(false)
      }
    })()
  }

  const handleSendEmail = () => {
    if (!invoice) {
      return
    }
    setActionBusy(true)
    void (async () => {
      try {
        const res = await sendInvoiceEmailAction({
          invoiceId: invoice.id,
          to: to.trim(),
          subject: subject.trim(),
          body: body.trim(),
          includePublicLink: includeLink,
        })
        if (!res.ok) {
          toast.error(res.error)
          return
        }
        if ("demo" in res && res.demo) {
          toast.success("데모 세션에서는 실제 메일이 전달되지 않으며, 발송 기록만 남습니다.")
        } else {
          toast.success("이메일을 보냈습니다.")
        }
        onAfterSend?.()
        onOpenChange(false)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "이메일 발송에 실패했습니다.")
      } finally {
        setActionBusy(false)
      }
    })()
  }

  const copyShareLink = () => {
    if (!invoice) {
      return
    }
    setActionBusy(true)
    void (async () => {
      try {
        let url = shareUrl
        if (!url) {
          const res = await ensureInvoiceShareLinkAction(invoice.id)
          if (!res.ok) {
            toast.error(res.error)
            setShareError(res.error)
            return
          }
          url = res.url
          setShareUrl(url)
        }
        await navigator.clipboard.writeText(url)
        const logRes = await logInvoiceShareLinkCopiedAction(invoice.id)
        if (!logRes.ok) {
          toast.error(logRes.error)
          return
        }
        toast.success("고객 공유 링크를 복사했습니다.")
      } catch {
        toast.error("클립보드 복사에 실패했습니다. 링크를 직접 선택해 복사해 주세요.")
      } finally {
        setActionBusy(false)
      }
    })()
  }

  const openPdfPrint = () => {
    if (!invoice) {
      return
    }
    window.open(`/invoices/${invoice.id}/print`, "_blank", "noopener,noreferrer")
  }

  const copySmsMessage = () => {
    if (!invoice) {
      return
    }
    setActionBusy(true)
    void (async () => {
      try {
        let url = shareUrl
        if (!url) {
          const res = await ensureInvoiceShareLinkAction(invoice.id)
          if (!res.ok) {
            toast.error(res.error)
            setShareError(res.error)
            return
          }
          url = res.url
          setShareUrl(url)
        }
        const text = buildSmsInvoiceShareText({
          invoiceNumber: invoice.invoiceNumber,
          amountLabel: formatCurrency(invoice.amount),
          publicUrl: url,
          businessName: businessName.trim() || undefined,
        })
        await navigator.clipboard.writeText(text)
        toast.success("문자용 짧은 안내를 복사했습니다.")
      } catch {
        toast.error("클립보드 복사에 실패했습니다.")
      } finally {
        setActionBusy(false)
      }
    })()
  }

  const sendAlimtalkByoa = () => {
    if (!invoice) {
      return
    }
    setAlimBusy(true)
    void (async () => {
      try {
        const res = await sendInvoiceKakaoByoaAction({
          invoiceId: invoice.id,
          recipientPhone: alimPhone.trim(),
        })
        if (!res.ok) {
          toast.error(res.error)
          return
        }
        toast.success("알림톡 발송을 요청했습니다. 외부 채널에서 결과를 확인해 주세요.")
        onAfterSend?.()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "요청에 실패했습니다.")
      } finally {
        setAlimBusy(false)
      }
    })()
  }

  const copyKakaoMessage = () => {
    if (!invoice) {
      return
    }
    setActionBusy(true)
    void (async () => {
      try {
        let url = shareUrl
        if (!url) {
          const res = await ensureInvoiceShareLinkAction(invoice.id)
          if (!res.ok) {
            toast.error(res.error)
            setShareError(res.error)
            return
          }
          url = res.url
          setShareUrl(url)
        }
        const text = buildKakaoInvoiceShareText({
          invoiceNumber: invoice.invoiceNumber,
          amountLabel: formatCurrency(invoice.amount),
          publicUrl: url,
          businessName: businessName.trim() || undefined,
        })
        await navigator.clipboard.writeText(text)
        const logRes = await logInvoiceKakaoTemplateCopiedAction(invoice.id)
        if (!logRes.ok) {
          toast.error(logRes.error)
          return
        }
        toast.success("카카오톡에 붙여넣기 좋은 문구를 복사했습니다.")
      } catch {
        toast.error("클립보드 복사에 실패했습니다.")
      } finally {
        setActionBusy(false)
      }
    })()
  }

  const composeWithAi = () => {
    if (!invoice) {
      return
    }
    setAiBusy(true)
    void (async () => {
      try {
        let link = shareUrl
        if (!link) {
          const res = await ensureInvoiceShareLinkAction(invoice.id)
          if (!res.ok) {
            toast.error(res.error)
            return
          }
          link = res.url
          setShareUrl(link)
        }
        const res = await fetch("/api/ai/compose-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            kind: "invoice_notice",
            tone: messageTone,
            context: {
              invoiceNumber: invoice.invoiceNumber,
              amount: formatCurrency(invoice.amount),
              dueDate: invoice.dueDate ? formatDate(invoice.dueDate) : "",
              customerName:
                invoice.customer?.companyName?.trim() || invoice.customer?.name || "",
              shareUrl: link,
              businessName: businessName.trim(),
              paymentTerms: paymentTerms.trim().slice(0, 800),
              bankAccount: bankAccount.trim().slice(0, 400),
            },
          }),
        })
        const data = (await res.json()) as { error?: string; message?: { subject?: string; body: string } }
        if (!res.ok) {
          toast.error(data.error ?? "문구 생성에 실패했습니다.")
          return
        }
        if (data.message?.subject) {
          setSubject(data.message.subject)
        }
        setBody(data.message?.body ?? "")
        toast.success("제목·본문에 AI 초안을 넣었습니다. 확인 후 발송해 주세요.")
      } catch {
        toast.error("문구 생성 중 오류가 났습니다.")
      } finally {
        setAiBusy(false)
      }
    })()
  }

  const busy = shareLoading || actionBusy || aiBusy || alimBusy

  const previewVariables =
    invoice && shareUrl
      ? {
          shareUrl,
          docType: "invoice",
          invoiceNumber: invoice.invoiceNumber,
          amountWon: String(invoice.amount),
        }
      : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>청구서 보내기</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            고객에게 공유 링크·이메일·PDF로 청구서를 전달합니다. 공개 링크는 로그인 없이 열립니다.
          </DialogDescription>
        </DialogHeader>

        {invoice ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-mono font-medium text-foreground">{invoice.invoiceNumber}</span>
              <span className="mx-1.5 text-border">·</span>
              {formatCurrency(invoice.amount)}
              {invoice.dueDate ? (
                <>
                  <span className="mx-1.5 text-border">·</span>
                  기한 {formatDate(invoice.dueDate)}
                </>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={busy}
                onClick={copyShareLink}
              >
                <Link2 className="size-3.5" />
                공유 링크 복사
              </Button>
              <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={openPdfPrint}>
                <ExternalLink className="size-3.5" />
                인쇄·PDF
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={busy}
                onClick={copyKakaoMessage}
              >
                <MessageCircle className="size-3.5" />
                카톡 문구 복사
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={busy}
                onClick={copySmsMessage}
              >
                문자 문구 복사
              </Button>
            </div>

            {shareLoading ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin shrink-0" aria-hidden />
                공유 링크를 준비하는 중…
              </p>
            ) : shareError ? (
              <div className="space-y-2 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <p className="font-medium">링크를 만들 수 없습니다</p>
                <p className="whitespace-pre-wrap leading-relaxed">{shareError}</p>
                <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5" onClick={retryShareLink}>
                  <RefreshCw className="size-3.5" />
                  다시 시도
                </Button>
              </div>
            ) : shareUrl ? (
              <p className="break-all rounded border border-dashed border-border/70 bg-background px-2 py-1.5 font-mono text-xs text-muted-foreground">
                {shareUrl}
              </p>
            ) : null}

            {kakaoByoaAllowed ? (
              <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/[0.04] p-3">
                <p className="text-xs font-semibold text-foreground">카카오 알림톡 (BYOA)</p>
                <p className="text-sm leading-snug text-muted-foreground">
                  설정에 저장한 <strong className="font-medium text-foreground/85">본인 프록시</strong>로
                  발송 요청만 전달합니다. 비용·승인 템플릿은 사용 중인 알림톡 사업자에서 관리합니다.
                </p>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">수신 번호</label>
                  <Input
                    className="h-9 font-mono text-xs"
                    value={alimPhone}
                    onChange={(e) => setAlimPhone(e.target.value)}
                    placeholder="01012345678"
                  />
                </div>
                {previewVariables ? (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer font-medium text-foreground/80">미리보기 (variables)</summary>
                    <pre className="mt-2 max-h-32 overflow-auto rounded border border-border/60 bg-muted/30 p-2 font-mono text-xs">
                      {JSON.stringify(
                        { billIoVersion: 1, channelKind: "kakao_alimtalk", variables: previewVariables },
                        null,
                        2
                      )}
                    </pre>
                  </details>
                ) : (
                  <p className="text-xs text-muted-foreground">공유 링크가 준비되면 미리보기가 표시됩니다.</p>
                )}
                <Button
                  type="button"
                  size="sm"
                  className="h-9 gap-1.5"
                  disabled={busy || !invoiceId}
                  onClick={sendAlimtalkByoa}
                >
                  {alimBusy ? <Loader2 className="size-3.5 animate-spin" /> : <MessageCircle className="size-3.5" />}
                  알림톡 발송 요청
                </Button>
              </div>
            ) : null}

            <div className="space-y-2 border-t border-border/50 pt-3">
              <p className="text-xs font-semibold text-foreground">이메일 보내기</p>
              <p className="text-sm leading-snug text-muted-foreground">
                발신 주소는 설정에 등록한 이메일을 사용합니다. 도메인 인증이 필요하면{" "}
                <code className="rounded bg-muted px-1">RESEND_FROM</code>을 설정해 주세요.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">문체</label>
                  <Select
                    value={messageTone}
                    items={messageToneSelectItems}
                    onValueChange={(v) => setMessageTone((v as MessageTone) ?? "neutral")}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue>{messageToneSelectItems[messageTone]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="polite">정중형</SelectItem>
                      <SelectItem value="neutral">기본형</SelectItem>
                      <SelectItem value="firm">단호형</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 gap-1.5"
                  disabled={busy || !invoice}
                  onClick={composeWithAi}
                >
                  {aiBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                  AI로 제목·본문
                </Button>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">받는 사람</label>
                <Input className="h-9" value={to} onChange={(e) => setTo(e.target.value)} type="email" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">제목</label>
                <Input className="h-9" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">본문</label>
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
            disabled={busy || !invoice || !to.trim()}
            onClick={handleSendEmail}
          >
            {actionBusy ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
            이메일 발송
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
