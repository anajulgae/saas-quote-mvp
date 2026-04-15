"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { BookOpen, CheckCircle2, ChevronDown, ExternalLink, Loader2, Save } from "lucide-react"
import { toast } from "sonner"

import { saveMessagingChannelConfigAction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Input } from "@/components/ui/input"
import { planAllowsFeature } from "@/lib/plan-features"
import { cn } from "@/lib/utils"
import type { BillingPlan, MessagingChannelConfig } from "@/types/domain"

function StepItem({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {step}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <div className="mt-1 text-sm leading-relaxed text-muted-foreground">{children}</div>
      </div>
    </div>
  )
}

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
  const [showAdvanced, setShowAdvanced] = useState(Boolean(initialConfig?.apiEndpoint))

  const allowed = planAllowsFeature(currentPlan, "kakao_byoa_messaging")
  const isConfigured = Boolean(initialConfig?.apiEndpoint && initialConfig?.enabled)

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
    <div className="space-y-5">
      {/* 현재 상태 뱃지 */}
      {isConfigured ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-800 dark:bg-emerald-950/30">
          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">카카오 알림톡 연동 완료</span>
        </div>
      ) : null}

      {/* 핵심 안내 — 비용 없음 강조 */}
      <div className="rounded-lg border border-blue-200/60 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
          Bill-IO에서 추가 비용이 발생하지 않습니다
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-blue-800/80 dark:text-blue-200/70">
          카카오 알림톡은 <strong>본인의 Solapi·NHN Cloud 계정</strong>을 연결하는 방식입니다.
          Bill-IO는 중계만 하며 별도 수수료를 받지 않습니다.
          Solapi 가입 시 무료 크레딧이 제공되어 소규모 발송은 무료로 시작할 수 있습니다.
        </p>
      </div>

      {!allowed ? (
        <div className="rounded-lg border border-dashed border-border/70 bg-muted/15 p-4">
          <p className="text-sm text-muted-foreground">Pro 이상 플랜에서 사용할 수 있습니다.</p>
          <Link href="/billing?plan=pro" className={cn(buttonVariants({ size: "sm" }), "mt-3 inline-flex")}>
            Pro로 업그레이드
          </Link>
        </div>
      ) : (
        <>
          {/* 쉬운 설정 가이드 */}
          <div className="space-y-4">
            <p className="text-sm font-semibold">설정 방법 (약 5분 소요)</p>
            <div className="space-y-4">
              <StepItem step={1} title="Solapi 가입 (무료)">
                <a
                  href="https://solapi.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  solapi.com <ExternalLink className="size-3" />
                </a>
                에서 회원가입하세요. 사업자 인증을 완료하면 알림톡 발송이 가능합니다.
              </StepItem>
              <StepItem step={2} title="카카오 채널 + 알림톡 템플릿 등록">
                <a
                  href="https://business.kakao.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  카카오 비즈니스 <ExternalLink className="size-3" />
                </a>
                에서 채널을 만들고, Solapi에서 알림톡 템플릿을 검수받으세요.
              </StepItem>
              <StepItem step={3} title="프록시 서버 설정 후 아래에 주소 입력">
                Bill-IO가 보내는 JSON을 Solapi API 형식으로 변환하는 간단한 프록시가 필요합니다.
                {" "}
                <Link href="/settings/kakao-alimtalk-guide" className="font-medium text-primary hover:underline">
                  상세 가이드 보기
                </Link>
              </StepItem>
            </div>
          </div>

          {/* 연결 설정 — 접을 수 있음 */}
          <div className="rounded-lg border border-border/60">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/20 transition-colors"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              <span className="text-sm font-medium">연결 설정</span>
              <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", showAdvanced && "rotate-180")} />
            </button>
            {showAdvanced ? (
              <div className="space-y-4 border-t border-border/50 px-4 py-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-border"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                  />
                  알림톡 발송 사용
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm font-medium">발송 프록시 주소 (HTTPS)</label>
                    <Input
                      className="h-9 font-mono text-sm"
                      value={apiEndpoint}
                      onChange={(e) => setApiEndpoint(e.target.value)}
                      placeholder="https://api.example.com/bill-io/kakao"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">인증 헤더</label>
                    <Input
                      className="h-9"
                      value={apiKeyHeader}
                      onChange={(e) => setApiKeyHeader(e.target.value)}
                      placeholder="Authorization"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">API 키</label>
                    <Input
                      className="h-9 font-mono text-sm"
                      type="password"
                      autoComplete="off"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">발신 프로필 키</label>
                    <Input
                      className="h-9 font-mono text-sm"
                      value={senderKey}
                      onChange={(e) => setSenderKey(e.target.value)}
                      placeholder="senderKey"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">템플릿 코드</label>
                    <Input
                      className="h-9 font-mono text-sm"
                      value={templateCode}
                      onChange={(e) => setTemplateCode(e.target.value)}
                      placeholder="templateCode"
                    />
                  </div>
                </div>

                <Button type="button" size="sm" className="gap-1.5" disabled={isPending} onClick={save}>
                  {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                  저장
                </Button>
              </div>
            ) : null}
          </div>

          {/* 참고 링크 */}
          <div className="flex flex-wrap gap-2">
            <Link
              href="/settings/kakao-alimtalk-guide"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 gap-1.5")}
            >
              <BookOpen className="size-3.5" />
              전체 설정 가이드
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
