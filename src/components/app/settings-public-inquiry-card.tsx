"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, RefreshCw, Share2 } from "lucide-react"
import { toast } from "sonner"

import { savePublicInquiryFormSettingsAction } from "@/app/actions"
import { InquiryFormShareDialog } from "@/components/app/inquiry-form-share-dialog"
import { Button } from "@/components/ui/button"
// Card wrapper removed — rendered inside SettingsAccordionItem
import { Textarea } from "@/components/ui/textarea"
import {
  DEFAULT_PUBLIC_INQUIRY_COMPLETION,
  DEFAULT_PUBLIC_INQUIRY_CONSENT_INTRO,
  DEFAULT_PUBLIC_INQUIRY_CONSENT_RETENTION,
} from "@/lib/public-inquiry-defaults"
import type { BusinessSettings } from "@/types/domain"

export function SettingsPublicInquiryCard({
  siteOrigin,
  initialSettings,
}: {
  siteOrigin: string
  initialSettings: BusinessSettings
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [shareOpen, setShareOpen] = useState(false)
  const [enabled, setEnabled] = useState(initialSettings.publicInquiryFormEnabled)
  const [intro, setIntro] = useState(initialSettings.publicInquiryIntro)
  const [consentIntro, setConsentIntro] = useState(
    initialSettings.publicInquiryConsentIntro || DEFAULT_PUBLIC_INQUIRY_CONSENT_INTRO
  )
  const [consentRetention, setConsentRetention] = useState(
    initialSettings.publicInquiryConsentRetention || DEFAULT_PUBLIC_INQUIRY_CONSENT_RETENTION
  )
  const [completionMessage, setCompletionMessage] = useState(
    initialSettings.publicInquiryCompletionMessage || DEFAULT_PUBLIC_INQUIRY_COMPLETION
  )
  const [token, setToken] = useState(initialSettings.publicInquiryFormToken)

  useEffect(() => {
    setEnabled(initialSettings.publicInquiryFormEnabled)
    setIntro(initialSettings.publicInquiryIntro)
    setConsentIntro(
      initialSettings.publicInquiryConsentIntro || DEFAULT_PUBLIC_INQUIRY_CONSENT_INTRO
    )
    setConsentRetention(
      initialSettings.publicInquiryConsentRetention || DEFAULT_PUBLIC_INQUIRY_CONSENT_RETENTION
    )
    setCompletionMessage(
      initialSettings.publicInquiryCompletionMessage || DEFAULT_PUBLIC_INQUIRY_COMPLETION
    )
    setToken(initialSettings.publicInquiryFormToken)
  }, [
    initialSettings.publicInquiryFormEnabled,
    initialSettings.publicInquiryIntro,
    initialSettings.publicInquiryConsentIntro,
    initialSettings.publicInquiryConsentRetention,
    initialSettings.publicInquiryCompletionMessage,
    initialSettings.publicInquiryFormToken,
  ])

  const formUrl = useMemo(() => {
    if (!token) {
      return ""
    }
    const base = siteOrigin.replace(/\/$/, "")
    return `${base}/request/${token}`
  }, [siteOrigin, token])

  const save = (regenerateToken: boolean) => {
    startTransition(async () => {
      const result = await savePublicInquiryFormSettingsAction({
        enabled,
        intro,
        consentIntro,
        consentRetention,
        completionMessage,
        regenerateToken,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setToken(result.settings.publicInquiryFormToken)
      toast.success(regenerateToken ? "링크가 새로 발급되었습니다." : "공개 문의 폼 설정을 저장했습니다.")
      router.refresh()
    })
  }

  return (
    <>
      <div className="space-y-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="size-4 rounded border-border"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            공개 문의 폼 사용
          </label>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">폼 상단 안내 (선택)</label>
            <Textarea
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              className="min-h-[4rem] text-sm"
              placeholder="고객에게 보이는 짧은 안내를 적어 주세요."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">개인정보 수집·이용 안내</label>
            <Textarea
              value={consentIntro}
              onChange={(e) => setConsentIntro(e.target.value)}
              className="min-h-[5rem] text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">보관 기간·안내</label>
            <Textarea
              value={consentRetention}
              onChange={(e) => setConsentRetention(e.target.value)}
              className="min-h-[4rem] text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">제출 완료 화면 문구</label>
            <Textarea
              value={completionMessage}
              onChange={(e) => setCompletionMessage(e.target.value)}
              className="min-h-[3.5rem] text-sm"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              size="sm"
              className="h-9 gap-2"
              disabled={pending}
              onClick={() => save(false)}
            >
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              설정 저장
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 gap-2"
              disabled={pending || !enabled}
              onClick={() => save(true)}
            >
              <RefreshCw className="size-3.5" aria-hidden />
              링크 재발급
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-9 gap-2"
              disabled={!enabled || !formUrl}
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="size-3.5" aria-hidden />
              보내기 (링크·QR·문구)
            </Button>
          </div>

          {formUrl ? (
            <p className="text-[11px] leading-relaxed text-muted-foreground break-all">
              공개 URL: <span className="font-mono text-foreground">{formUrl}</span>
            </p>
          ) : enabled ? (
            <p className="text-[11px] text-muted-foreground">
              저장하면 고유 링크가 발급됩니다. 최초 1회 「설정 저장」을 눌러 주세요.
            </p>
          ) : null}
      </div>

      <InquiryFormShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        formUrl={formUrl}
        businessName={initialSettings.businessName}
        replyEmail={initialSettings.email}
      />
    </>
  )
}
