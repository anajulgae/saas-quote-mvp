"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { BookOpen, ExternalLink, Loader2, Save } from "lucide-react"
import { toast } from "sonner"

import { saveMessagingChannelConfigAction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
// Card wrapper removed — rendered inside SettingsAccordionItem
import { Input } from "@/components/ui/input"
import { planAllowsFeature } from "@/lib/plan-features"
import { cn } from "@/lib/utils"
import type { BillingPlan, MessagingChannelConfig } from "@/types/domain"

export function SettingsMessagingChannelCard({
  currentPlan,
  initialConfig,
}: {
  currentPlan: BillingPlan
  initialConfig: MessagingChannelConfig | null
}) {
  const [isPending, startTransition] = useTransition()
  const [apiEndpoint, setApiEndpoint] = useState(initialConfig?.apiEndpoint ?? "")
  const [apiKeyHeader, setApiKeyHeader] = useState(initialConfig?.apiKeyHeader ?? "Authorization")
  const [apiKey, setApiKey] = useState(initialConfig?.apiKey ?? "")
  const [senderKey, setSenderKey] = useState(initialConfig?.senderKey ?? "")
  const [templateCode, setTemplateCode] = useState(initialConfig?.templateCode ?? "")
  const [enabled, setEnabled] = useState(Boolean(initialConfig?.enabled))

  const allowed = planAllowsFeature(currentPlan, "kakao_byoa_messaging")

  const save = () => {
    startTransition(async () => {
      const res = await saveMessagingChannelConfigAction({
        apiEndpoint,
        apiKey,
        apiKeyHeader,
        senderKey,
        templateCode,
        enabled,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("메시징 채널 설정을 저장했습니다.")
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Link
          href="/settings/kakao-alimtalk-guide"
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "h-8 w-fit gap-1.5 inline-flex")}
        >
          <BookOpen className="size-3.5" aria-hidden />
          알림톡 설정 가이드 (전체)
        </Link>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <a href="https://business.kakao.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline">
            카카오 비즈니스 <ExternalLink className="size-3 opacity-70" />
          </a>
          <a href="https://developers.solapi.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline">
            Solapi 개발자 <ExternalLink className="size-3 opacity-70" />
          </a>
          <a href="https://docs.nhncloud.com/ko/Notification/KakaoTalk%20Bizmessage/ko/Overview/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline">
            NHN 문서 <ExternalLink className="size-3 opacity-70" />
          </a>
        </div>
      </div>
        {!allowed ? (
          <p className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            Pro 이상에서 설정·발송할 수 있습니다. Starter에서는 링크 복사·이메일·카톡 문구 복사로 안내할 수
            있습니다.
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-medium">HTTPS 발송 엔드포인트</label>
            <p className="text-[10px] leading-snug text-muted-foreground">
              POST로 <code className="rounded bg-muted px-1">BillIoMessagingPayloadV1</code> JSON을 받는 주소
              (예: Cloud Functions, 자체 API)
            </p>
            <Input
              className="h-9 font-mono text-xs"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              placeholder="https://api.example.com/bill-io/kakao"
              disabled={!allowed}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">인증 헤더 이름</label>
            <Input
              className="h-9"
              value={apiKeyHeader}
              onChange={(e) => setApiKeyHeader(e.target.value)}
              placeholder="Authorization"
              disabled={!allowed}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">API 키 / 토큰 값</label>
            <p className="text-[10px] text-muted-foreground">프록시가 요구하는 값(비어 있으면 헤더만 전송)</p>
            <Input
              className="h-9 font-mono text-xs"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={!allowed}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">발신 프로필 키 (senderKey)</label>
            <Input
              className="h-9 font-mono text-xs"
              value={senderKey}
              onChange={(e) => setSenderKey(e.target.value)}
              disabled={!allowed}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">알림톡 템플릿 코드</label>
            <Input
              className="h-9 font-mono text-xs"
              value={templateCode}
              onChange={(e) => setTemplateCode(e.target.value)}
              disabled={!allowed}
            />
          </div>
        </div>

        <label
          className={cn(
            "flex cursor-pointer items-start gap-2 text-xs",
            !allowed && "cursor-not-allowed opacity-60"
          )}
        >
          <input
            type="checkbox"
            className="mt-0.5 size-3.5 rounded border-border"
            checked={enabled}
            disabled={!allowed}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span>이 채널 사용 (견적·청구 발송에서 알림톡 요청 가능)</span>
        </label>

        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          disabled={!allowed || isPending}
          onClick={save}
        >
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          저장
        </Button>
    </div>
  )
}
