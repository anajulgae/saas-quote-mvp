"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"

import {
  saveBusinessSettingsOnlyAction,
  saveSealSettingsAction,
  saveTemplatesSettingsAction,
} from "@/app/actions"
import { SettingsNotificationPreferencesCard } from "@/components/app/settings-notification-preferences-card"
import { SettingsMessagingChannelCard } from "@/components/app/settings-messaging-channel-card"
import { SettingsPublicInquiryCard } from "@/components/app/settings-public-inquiry-card"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatBusinessRegNoInput } from "@/lib/format"
import { planAllowsFeature } from "@/lib/plan-features"
import { computeTemplatesSyncKey } from "@/lib/settings-form-key"
import { cn } from "@/lib/utils"
import type {
  BillingPlan,
  BusinessSettings,
  MessagingChannelConfig,
  NotificationPreferences,
  Template,
} from "@/types/domain"

function FieldHint({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-[11px] leading-snug text-muted-foreground", className)}>{children}</p>
  )
}

function SectionBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-md border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  )
}

function SettingsSection({
  title,
  badge,
  children,
  className,
}: {
  title: string
  badge?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("space-y-3 border-t border-border/50 pt-4 first:border-t-0 first:pt-0", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
        {badge}
      </div>
      {children}
    </section>
  )
}

const defaultTemplates = (userId: string): Template[] => [
  {
    id: "",
    userId,
    type: "quote",
    name: "기본 견적 템플릿",
    content: "",
    isDefault: true,
  },
  {
    id: "",
    userId,
    type: "reminder",
    name: "기본 리마인드 템플릿",
    content: "",
    isDefault: true,
  },
]

export function SettingsForm({
  initialSettings,
  templates,
  currentPlan,
  planColumnMissing,
  siteOrigin,
  initialNotificationPreferences,
  messagingChannelConfig,
}: {
  initialSettings: BusinessSettings
  templates: Template[]
  currentPlan: BillingPlan
  planColumnMissing: boolean
  siteOrigin: string
  initialNotificationPreferences: NotificationPreferences
  messagingChannelConfig: MessagingChannelConfig | null
}) {
  const router = useRouter()
  const [isBizPending, startBizTransition] = useTransition()
  const [isTplPending, startTplTransition] = useTransition()
  const [isSealPending, startSealTransition] = useTransition()
  const [settings, setSettings] = useState(initialSettings)
  const [sealUrl, setSealUrl] = useState<string | null>(initialSettings.sealImageUrl ?? null)
  const [sealEnabled, setSealEnabled] = useState(initialSettings.sealEnabled)
  const [templateState, setTemplateState] = useState<Template[]>(
    templates.length ? templates : defaultTemplates(initialSettings.userId)
  )
  const [errorBusiness, setErrorBusiness] = useState("")
  const [errorTemplates, setErrorTemplates] = useState("")
  const [errorSeal, setErrorSeal] = useState("")

  const templatesServerKey = useMemo(() => computeTemplatesSyncKey(templates), [templates])

  // 사업자 카드는 페이지 `key`로 리마운트. 템플릿만 서버와 동기화.
  useEffect(() => {
    setTemplateState(templates.length ? templates : defaultTemplates(initialSettings.userId))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- templatesServerKey에 요약 포함
  }, [templatesServerKey])

  const saveBusiness = () => {
    setErrorBusiness("")

    startBizTransition(async () => {
      const result = await saveBusinessSettingsOnlyAction({
        businessName: settings.businessName,
        ownerName: settings.ownerName,
        businessRegistrationNumber: settings.businessRegistrationNumber,
        email: settings.email,
        phone: settings.phone,
        paymentTerms: settings.paymentTerms,
        bankAccount: settings.bankAccount,
        reminderMessage: settings.reminderMessage,
      })

      if (!result.ok) {
        setErrorBusiness(result.error)
        toast.error(result.error)
        return
      }

      setSettings(result.settings)
      setSealUrl(result.settings.sealImageUrl ?? null)
      setSealEnabled(result.settings.sealEnabled)
      toast.success("사업자·결제·리마인드 기본 문구가 저장되었습니다.")
      router.refresh()
    })
  }

  const saveTemplates = () => {
    setErrorTemplates("")

    startTplTransition(async () => {
      const result = await saveTemplatesSettingsAction({
        templates: templateState.map((template) => ({
          id: template.id || undefined,
          type: template.type,
          name: template.name,
          content: template.content,
          isDefault: template.isDefault,
        })),
      })

      if (!result.ok) {
        setErrorTemplates(result.error)
        toast.error(result.error)
        return
      }

      toast.success("기본 템플릿이 저장되었습니다.")
      router.refresh()
    })
  }

  const saveSeal = () => {
    setErrorSeal("")
    startSealTransition(async () => {
      const result = await saveSealSettingsAction({
        sealImageUrl: sealUrl,
        sealEnabled,
      })
      if (!result.ok) {
        setErrorSeal(result.error)
        toast.error(result.error)
        return
      }
      toast.success("직인 설정을 저장했습니다.")
      router.refresh()
    })
  }

  const onSealFile = (file: File | null) => {
    if (!file) {
      return
    }
    if (file.size > 400 * 1024) {
      toast.error("파일 크기는 400KB 이하를 권장합니다. PNG로 줄여 주세요.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setSealUrl(typeof reader.result === "string" ? reader.result : null)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-5 md:space-y-6">
      {planColumnMissing ? (
        <div
          className="rounded-xl border border-amber-500/40 bg-amber-500/[0.08] px-4 py-3 text-sm text-amber-950 dark:text-amber-50/95"
          role="status"
        >
          <p className="font-semibold text-foreground">데이터베이스: 플랜 컬럼 미적용</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Supabase에 <code className="rounded bg-background/80 px-1">0004_user_plan.sql</code> 마이그레이션이
            적용되지 않은 것으로 보입니다. 지금은 모두 Free로 동작합니다. SQL Editor에서 해당 파일을 실행한 뒤 이
            안내가 사라지는지 확인해 주세요.
          </p>
        </div>
      ) : null}

      <Card className="border-border/60 bg-muted/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">요금제</CardTitle>
          <CardDescription>
            계정 플랜입니다. 상세·업그레이드 안내는{" "}
            <a href="/billing" className="font-medium text-primary underline-offset-4 hover:underline">
              요금제 페이지
            </a>
            에서 확인할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm">
          <span
            className={cn(
              "rounded-full border border-border/70 px-3 py-1 text-xs font-semibold",
              currentPlan === "pro" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}
          >
            {currentPlan === "pro" ? "Pro" : "Free"}
          </span>
          <p className="text-muted-foreground">
            결제 모듈(예: Stripe, 국내 PG)은 <code className="rounded bg-muted px-1">users.plan</code> 과
            연동해 갱신하는 구조로 두었습니다.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="space-y-1 pb-3">
          <CardTitle className="text-base font-semibold">사업자 및 안내 설정</CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            아래 내용은 Supabase에 저장되며, 견적·청구 화면과 리마인드 작성에 반복 반영됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-0 pb-4">
          <SettingsSection
            title="사업자 기본 정보"
            badge={<SectionBadge>견적·청구 문구에 사용</SectionBadge>}
          >
            <FieldHint>상호·대표·연락처가 견적서·청구 안내에 함께 쓰입니다.</FieldHint>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">사업장명</label>
                <Input
                  className="h-9"
                  value={settings.businessName}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      businessName: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">대표자명</label>
                <Input
                  className="h-9"
                  value={settings.ownerName}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, ownerName: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium">사업자 등록번호</label>
                <FieldHint>견적서 발신 정보에 표시됩니다. 없으면 비워 두어도 됩니다.</FieldHint>
                <Input
                  className="h-9 max-w-md tabular-nums"
                  value={settings.businessRegistrationNumber}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      businessRegistrationNumber: formatBusinessRegNoInput(event.target.value),
                    }))
                  }
                  placeholder="예: 123-45-67890"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={12}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">이메일</label>
                <Input
                  className="h-9"
                  type="email"
                  value={settings.email}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">연락처</label>
                <Input
                  className="h-9"
                  value={settings.phone}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            title="결제 및 안내"
            badge={<SectionBadge>상대방 안내 문구</SectionBadge>}
          >
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">결제 조건</label>
                <FieldHint>견적·청구 생성 시 기본 안내 문구로 활용할 수 있습니다.</FieldHint>
                <Input
                  className="h-9"
                  value={settings.paymentTerms}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, paymentTerms: event.target.value }))
                  }
                  placeholder="예: 선금 50%, 잔금 납품 전"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">계좌 안내</label>
                <FieldHint>상대방에게 보여줄 기본 입금 안내입니다.</FieldHint>
                <Input
                  className="h-9"
                  value={settings.bankAccount}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, bankAccount: event.target.value }))
                  }
                  placeholder="은행·계좌·예금주"
                />
              </div>
            </div>
          </SettingsSection>

          <SettingsSection title="직인·서명" badge={<SectionBadge>견적서·PDF</SectionBadge>}>
            <FieldHint>
              PNG·투명 배경을 권장합니다. 견적서 하단 발신 블록에 표시되며, 인쇄·PDF·고객 공유 페이지에 동일하게 반영됩니다.
            </FieldHint>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex min-h-[88px] min-w-[88px] items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/20 p-2">
                {sealUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sealUrl} alt="직인 미리보기" className="max-h-20 max-w-[7rem] object-contain" />
                ) : (
                  <span className="px-2 text-center text-[11px] text-muted-foreground">미등록</span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex h-9 cursor-pointer items-center rounded-md border border-border/70 bg-background px-3 text-xs font-medium hover:bg-muted/40">
                    이미지 선택
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(e) => onSealFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9"
                    disabled={!sealUrl}
                    onClick={() => setSealUrl(null)}
                  >
                    삭제
                  </Button>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="size-3.5 rounded border-border"
                    checked={sealEnabled}
                    onChange={(e) => setSealEnabled(e.target.checked)}
                    disabled={!sealUrl}
                  />
                  견적서에 직인 표시
                </label>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 w-fit gap-2"
                  disabled={isSealPending}
                  onClick={saveSeal}
                >
                  {isSealPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                  직인 설정 저장
                </Button>
              </div>
            </div>
            {errorSeal ? (
              <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {errorSeal}
              </p>
            ) : null}
          </SettingsSection>

          <SettingsSection
            title="기본 리마인드 문구"
            badge={<SectionBadge>청구 리마인드</SectionBadge>}
          >
            <FieldHint>청구 화면에서 리마인드를 새로 쓸 때 입력란 기본값으로 들어갑니다.</FieldHint>
            <Textarea
              value={settings.reminderMessage}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  reminderMessage: event.target.value,
                }))
              }
              className="min-h-[5.5rem] text-sm"
              placeholder="안내 멘트를 입력하세요"
            />
          </SettingsSection>

          <div className="mt-4 flex flex-col gap-3 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] leading-snug text-muted-foreground">
              위 영역만 저장합니다. 템플릿은 아래 카드에서 따로 저장하세요.
            </p>
            <Button
              type="button"
              onClick={saveBusiness}
              disabled={isBizPending}
              size="sm"
              className="h-9 w-full shrink-0 gap-2 sm:w-auto"
            >
              {isBizPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Save className="size-4" aria-hidden />
              )}
              사업자·결제 정보 저장
            </Button>
          </div>
          {errorBusiness ? (
            <p className="mt-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorBusiness}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/70" id="mini-landing">
        <CardHeader className="space-y-1 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base font-semibold">업체 소개 페이지</CardTitle>
            <SectionBadge>Pro</SectionBadge>
          </div>
          <CardDescription className="text-xs leading-relaxed">
            고객에게 보여 줄 단일 소개 랜딩입니다. 공개 문의 폼과 연결해 온라인 문의를 받을 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          {planAllowsFeature(currentPlan, "mini_landing") ? (
            <Link
              href="/settings/landing"
              className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-9")}
            >
              편집·공개 설정
            </Link>
          ) : (
            <>
              <Link
                href="/billing?plan=pro"
                className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-9")}
              >
                Pro로 업그레이드
              </Link>
              <p className="text-xs text-muted-foreground">무료 플랜에서는 이 기능을 사용할 수 없습니다.</p>
            </>
          )}
        </CardContent>
      </Card>

      <SettingsMessagingChannelCard currentPlan={currentPlan} initialConfig={messagingChannelConfig} />

      <section id="public-inquiry">
        <SettingsPublicInquiryCard siteOrigin={siteOrigin} initialSettings={settings} />
      </section>

      <SettingsNotificationPreferencesCard initial={initialNotificationPreferences} />

      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <span className="w-full border-t border-border/60" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            템플릿
          </span>
        </div>
      </div>

      <Card className="border-border/70">
        <CardHeader className="space-y-1 pb-3">
          <CardTitle className="text-base font-semibold">기본 템플릿</CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            견적 요약·리마인드 본문의 출발점입니다. 각각 견적/청구 흐름에서 초안으로 불러옵니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          {templateState.map((template, index) => {
            const isQuote = template.type === "quote"
            return (
              <div
                key={`${template.id || template.type}-${index}`}
                className="rounded-lg border border-border/60 bg-muted/10 p-3"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {isQuote ? "기본 견적 템플릿" : "기본 리마인드 템플릿"}
                    </span>
                    <SectionBadge
                      className={cn(
                        isQuote
                          ? "border-primary/30 bg-primary/[0.06] text-primary"
                          : "border-amber-500/25 bg-amber-500/[0.06] text-amber-900 dark:text-amber-100"
                      )}
                    >
                      {isQuote ? "견적 작성 시 사용" : "리마인드 작성 시 사용"}
                    </SectionBadge>
                  </div>
                  {template.isDefault ? (
                    <span className="rounded-full border border-border/60 bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      기본값
                    </span>
                  ) : null}
                </div>
                <FieldHint className="mb-2">
                  {isQuote
                    ? "견적 생성 시 요약란 초안으로 채워집니다."
                    : "리마인드 작성 시 메시지 기본값으로 들어갑니다."}
                </FieldHint>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">템플릿 제목</label>
                    <Input
                      className="h-8 text-sm"
                      value={template.name}
                      onChange={(event) =>
                        setTemplateState((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, name: event.target.value } : item
                          )
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">내용</label>
                    <Textarea
                      value={template.content}
                      onChange={(event) =>
                        setTemplateState((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, content: event.target.value } : item
                          )
                        )
                      }
                      className="min-h-[5.5rem] text-sm"
                    />
                  </div>
                </div>
              </div>
            )
          })}

          <div className="flex flex-col gap-3 border-t border-border/50 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] leading-snug text-muted-foreground">
              견적·리마인드 템플릿만 저장합니다. 사업자 정보는 위 카드에서 저장하세요.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 w-full shrink-0 gap-2 sm:w-auto"
              onClick={saveTemplates}
              disabled={isTplPending}
            >
              {isTplPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Save className="size-4" aria-hidden />
              )}
              템플릿 저장
            </Button>
          </div>
          {errorTemplates ? (
            <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorTemplates}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
