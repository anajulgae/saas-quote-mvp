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
import { SettingsTaxInvoiceAspCard } from "@/components/app/settings-tax-invoice-aspcard"
import { SettingsAccordionItem, SettingsAccordionGroup } from "@/components/app/settings-accordion"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { BILLING_PAGE_PATH, PLAN_LABEL } from "@/lib/billing/catalog"
import { formatBusinessRegNoInput } from "@/lib/format"
import { planAllowsFeature } from "@/lib/plan-features"
import { computeTemplatesSyncKey } from "@/lib/settings-form-key"
import {
  getEffectiveBillingPlan,
  getUsageLimitsForEffectivePlan,
  trialRemainingLabel,
  type UserBillingSnapshot,
} from "@/lib/subscription"
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
    <p className={cn("text-xs leading-snug text-muted-foreground", className)}>{children}</p>
  )
}

function SectionBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-md border border-border/70 bg-muted/40 px-1.5 py-0.5 text-xs font-medium text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
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
  billing,
  planColumnMissing,
  siteOrigin,
  initialNotificationPreferences,
  messagingChannelConfig,
}: {
  initialSettings: BusinessSettings
  templates: Template[]
  currentPlan: BillingPlan
  billing: UserBillingSnapshot
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

  useEffect(() => {
    setTemplateState(templates.length ? templates : defaultTemplates(initialSettings.userId))
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      toast.success("직인 설정이 저장되었습니다.")
      router.refresh()
    })
  }

  const onSealFile = (file: File | null) => {
    if (!file) {
      return
    }
    if (file.size > 1_000_000) {
      toast.error("1MB 이하의 이미지를 사용해 주세요.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setSealUrl(typeof reader.result === "string" ? reader.result : null)
    }
    reader.readAsDataURL(file)
  }

  const effectivePlan = getEffectiveBillingPlan(billing)
  const usageLimits = getUsageLimitsForEffectivePlan(effectivePlan)

  return (
    <div className="space-y-3 md:space-y-4">
      {planColumnMissing ? (
        <div
          className="rounded-xl border border-amber-500/40 bg-amber-500/[0.08] px-4 py-3 text-sm text-amber-950 dark:text-amber-50/95"
          role="status"
        >
          <p className="font-semibold text-foreground">데이터베이스: 플랜·구독 컬럼 미적용</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            마이그레이션 적용 후 체험·사용량·빌링 기능이 정상 동작합니다.
          </p>
        </div>
      ) : null}

      {/* 구독 요약 — 항상 열림 */}
      <Card className="border-border/60 bg-muted/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">구독 및 요금</CardTitle>
          <CardDescription>
            플랜 변경·해지는{" "}
            <Link href={BILLING_PAGE_PATH} className="font-medium text-primary underline-offset-4 hover:underline">
              구독 콘솔
            </Link>
            에서 관리합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-semibold">
              청구 플랜: {PLAN_LABEL[billing.plan]}
            </span>
            <span
              className={cn(
                "rounded-full border border-border/70 px-3 py-1 text-xs font-semibold",
                effectivePlan === "business"
                  ? "bg-violet-500/10 text-violet-950 dark:text-violet-100"
                  : effectivePlan === "pro"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
              )}
            >
              기능 적용: {PLAN_LABEL[effectivePlan]}
            </span>
            {billing.subscriptionStatus === "trialing" ? (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-950 dark:text-amber-50">
                7일 체험 · {trialRemainingLabel(billing) ?? "진행 중"}
              </span>
            ) : null}
          </div>
          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <p>AI 사용: <span className="font-medium tabular-nums text-foreground">{billing.aiCallsThisMonth} / {usageLimits.aiCallsPerMonth}</span> 회</p>
            <p>이메일 발송: <span className="font-medium tabular-nums text-foreground">{billing.documentSendsThisMonth} / {usageLimits.documentSendsPerMonth}</span> 건</p>
            <p>고객 포털: <span className="font-medium tabular-nums text-foreground">{usageLimits.maxPortalCustomers}</span>명</p>
            <p>팀 좌석: <span className="font-medium tabular-nums text-foreground">{usageLimits.seats}</span></p>
          </div>
          {billing.currentPeriodEnd ? (
            <p className="text-xs text-muted-foreground">
              다음 갱신: <span className="font-medium text-foreground">{new Date(billing.currentPeriodEnd).toLocaleDateString("ko-KR")}</span>
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href={BILLING_PAGE_PATH} className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-9")}>
              구독 콘솔 열기
            </Link>
            <Link href="/help" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9")}>
              결제·구독 가이드
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 사업자 기본 정보 */}
      <SettingsAccordionItem
        title="사업자 및 안내 설정"
        description="상호·대표·결제조건·계좌·직인·리마인드 문구"
        defaultOpen={false}
      >
        <div className="space-y-5">
          <div>
            <h4 className="text-sm font-medium mb-2">사업자 기본 정보</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">사업장명</label>
                <Input className="h-9" value={settings.businessName} onChange={(e) => setSettings((s) => ({ ...s, businessName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">대표자명</label>
                <Input className="h-9" value={settings.ownerName} onChange={(e) => setSettings((s) => ({ ...s, ownerName: e.target.value }))} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium">사업자 등록번호</label>
                <Input className="h-9 max-w-md tabular-nums" value={settings.businessRegistrationNumber} onChange={(e) => setSettings((s) => ({ ...s, businessRegistrationNumber: formatBusinessRegNoInput(e.target.value) }))} placeholder="123-45-67890" inputMode="numeric" autoComplete="off" maxLength={12} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">이메일</label>
                <Input className="h-9" type="email" value={settings.email} onChange={(e) => setSettings((s) => ({ ...s, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">연락처</label>
                <Input className="h-9" value={settings.phone} onChange={(e) => setSettings((s) => ({ ...s, phone: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="border-t border-border/40 pt-4">
            <h4 className="text-sm font-medium mb-2">결제 및 안내</h4>
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">결제 조건</label>
                <Input className="h-9" value={settings.paymentTerms} onChange={(e) => setSettings((s) => ({ ...s, paymentTerms: e.target.value }))} placeholder="예: 선금 50%, 잔금 납품 전" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">계좌 안내</label>
                <Input className="h-9" value={settings.bankAccount} onChange={(e) => setSettings((s) => ({ ...s, bankAccount: e.target.value }))} placeholder="은행·계좌·예금주" />
              </div>
            </div>
          </div>

          <div className="border-t border-border/40 pt-4">
            <h4 className="text-sm font-medium mb-2">직인·서명</h4>
            <FieldHint className="mb-2">PNG 투명 배경 권장. 견적서·청구서에 표시됩니다.</FieldHint>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex min-h-[88px] min-w-[88px] items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/20 p-2">
                {sealUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sealUrl} alt="직인 미리보기" className="max-h-20 max-w-[7rem] object-contain" />
                ) : (
                  <span className="px-2 text-center text-xs text-muted-foreground">미등록</span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex h-9 cursor-pointer items-center rounded-md border border-border/70 bg-background px-3 text-sm font-medium hover:bg-muted/40">
                    이미지 선택
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => onSealFile(e.target.files?.[0] ?? null)} />
                  </label>
                  <Button type="button" variant="outline" size="sm" className="h-9" disabled={!sealUrl} onClick={() => setSealUrl(null)}>삭제</Button>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4 rounded border-border" checked={sealEnabled} onChange={(e) => setSealEnabled(e.target.checked)} disabled={!sealUrl} />
                  견적서에 직인 표시
                </label>
                <Button type="button" size="sm" className="h-9 w-fit gap-2" disabled={isSealPending} onClick={saveSeal}>
                  {isSealPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  직인 설정 저장
                </Button>
              </div>
            </div>
            {errorSeal ? <p className="mt-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorSeal}</p> : null}
          </div>

          <div className="border-t border-border/40 pt-4">
            <h4 className="text-sm font-medium mb-2">기본 리마인드 문구</h4>
            <FieldHint className="mb-2">청구 리마인드 작성 시 기본값으로 들어갑니다.</FieldHint>
            <Textarea value={settings.reminderMessage} onChange={(e) => setSettings((s) => ({ ...s, reminderMessage: e.target.value }))} className="min-h-[5rem] text-sm" placeholder="안내 멘트를 입력하세요" />
          </div>

          <div className="flex items-center justify-end border-t border-border/40 pt-4">
            <Button type="button" onClick={saveBusiness} disabled={isBizPending} size="sm" className="h-9 gap-2">
              {isBizPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              사업자 정보 저장
            </Button>
          </div>
          {errorBusiness ? <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorBusiness}</p> : null}
        </div>
      </SettingsAccordionItem>

      {/* 업체 소개 */}
      <SettingsAccordionItem
        id="mini-landing"
        title="업체 소개 페이지"
        badge={<SectionBadge>Pro</SectionBadge>}
        description="고객에게 보여줄 소개 랜딩 + 온라인 문의 연결"
      >
        <div className="flex flex-wrap items-center gap-2">
          {planAllowsFeature(currentPlan, "mini_landing") ? (
            <Link href="/settings/landing" className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-9")}>편집·공개 설정</Link>
          ) : (
            <>
              <Link href="/billing?plan=pro" className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-9")}>Pro로 업그레이드</Link>
              <p className="text-sm text-muted-foreground">무료 플랜에서는 이 기능을 사용할 수 없습니다.</p>
            </>
          )}
        </div>
      </SettingsAccordionItem>

      {/* 외부 서비스 연동 — 추가 옵션 그룹 */}
      <SettingsAccordionGroup label="외부 서비스 연동 (추가 옵션)">
        <SettingsAccordionItem
          title="카카오 알림톡"
          badge={<SectionBadge>Pro · 무료 연동</SectionBadge>}
          description="본인 Solapi/NHN 계정 연결 — Bill-IO 추가 비용 없음"
        >
          <SettingsMessagingChannelCard currentPlan={currentPlan} initialConfig={messagingChannelConfig} />
        </SettingsAccordionItem>

        <SettingsAccordionItem
          id="tax-invoice-asp"
          title="전자세금계산서 발행"
          badge={<SectionBadge>Pro · 무료 연동</SectionBadge>}
          description="팝빌 월 100건 무료 등 — Bill-IO 추가 비용 없음"
        >
          <SettingsTaxInvoiceAspCard currentPlan={currentPlan} initialSettings={settings} />
        </SettingsAccordionItem>
      </SettingsAccordionGroup>

      {/* 공개 문의 폼 */}
      <SettingsAccordionItem
        id="public-inquiry"
        title="고객 공개 문의 폼"
        description="링크·QR로 고객 문의를 자동 수집"
      >
        <SettingsPublicInquiryCard siteOrigin={siteOrigin} initialSettings={settings} />
      </SettingsAccordionItem>

      {/* 알림 설정 */}
      <SettingsAccordionItem
        id="notifications-prefs"
        title="알림 설정"
        description="이메일 알림 수신 여부 관리"
      >
        <SettingsNotificationPreferencesCard initial={initialNotificationPreferences} />
      </SettingsAccordionItem>

      {/* 자동화 */}
      <SettingsAccordionGroup label="자동화">
        <SettingsAccordionItem
          id="auto-remind"
          title="자동 리마인드 스케줄러"
          badge={<SectionBadge>Pro</SectionBadge>}
          description="연체 청구에 자동 이메일 리마인드 발송"
        >
          <div className="flex flex-wrap items-center gap-2">
            {planAllowsFeature(currentPlan, "auto_remind") ? (
              <Link href="/settings/auto-remind" className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-9")}>규칙 관리</Link>
            ) : (
              <>
                <Link href="/billing?plan=pro" className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-9")}>Pro로 업그레이드</Link>
                <p className="text-sm text-muted-foreground">Pro 이상 플랜에서 자동 리마인드를 사용할 수 있습니다.</p>
              </>
            )}
          </div>
        </SettingsAccordionItem>

        <SettingsAccordionItem
          id="recurring-invoices"
          title="반복 견적/청구 자동화"
          badge={<SectionBadge>Pro</SectionBadge>}
          description="매월·매분기 반복 견적/청구 자동 생성"
        >
          <div className="flex flex-wrap items-center gap-2">
            {planAllowsFeature(currentPlan, "recurring_invoices") ? (
              <Link href="/settings/recurring" className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-9")}>반복 설정 관리</Link>
            ) : (
              <>
                <Link href="/billing?plan=pro" className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-9")}>Pro로 업그레이드</Link>
                <p className="text-sm text-muted-foreground">Pro 이상 플랜에서 반복 자동화를 사용할 수 있습니다.</p>
              </>
            )}
          </div>
        </SettingsAccordionItem>
      </SettingsAccordionGroup>

      {/* Business 전용 */}
      <SettingsAccordionGroup label="Business 전용">
        <SettingsAccordionItem
          id="audit-log"
          title="감사 로그"
          badge={<SectionBadge>Business</SectionBadge>}
          description="모든 변경 이력을 타임라인으로 추적"
        >
          <div className="flex flex-wrap items-center gap-2">
            {planAllowsFeature(currentPlan, "audit_log") ? (
              <Link href="/settings/audit-log" className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-9")}>감사 로그 보기</Link>
            ) : (
              <>
                <Link href="/billing?plan=business" className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-9")}>Business로 업그레이드</Link>
                <p className="text-sm text-muted-foreground">Business 플랜에서 모든 변경 이력을 추적할 수 있습니다.</p>
              </>
            )}
          </div>
        </SettingsAccordionItem>

        <SettingsAccordionItem
          id="white-label"
          title="화이트 라벨 PDF"
          badge={<SectionBadge>Business</SectionBadge>}
          description="견적서·청구서 PDF의 Bill-IO 워터마크 제거"
        >
          {planAllowsFeature(currentPlan, "white_label_pdf") ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                활성화됨
              </span>
              <span className="text-sm text-muted-foreground">Bill-IO 로고가 표시되지 않습니다.</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/billing?plan=business" className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-9")}>Business로 업그레이드</Link>
              <p className="text-sm text-muted-foreground">Business 플랜에서 브랜드 없는 문서를 전달할 수 있습니다.</p>
            </div>
          )}
        </SettingsAccordionItem>
      </SettingsAccordionGroup>

      {/* 템플릿 */}
      <SettingsAccordionGroup label="템플릿">
        <SettingsAccordionItem
          title="기본 템플릿"
          description="견적 요약·리마인드 본문 초안 관리"
        >
          <div className="space-y-3">
            {templateState.map((template, index) => {
              const isQuote = template.type === "quote"
              return (
                <div key={`${template.id || template.type}-${index}`} className="rounded-lg border border-border/60 bg-muted/10 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{isQuote ? "기본 견적 템플릿" : "기본 리마인드 템플릿"}</span>
                    <SectionBadge className={cn(isQuote ? "border-primary/30 bg-primary/[0.06] text-primary" : "border-amber-500/25 bg-amber-500/[0.06] text-amber-900 dark:text-amber-100")}>
                      {isQuote ? "견적 작성 시" : "리마인드 작성 시"}
                    </SectionBadge>
                  </div>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">템플릿 제목</label>
                      <Input className="h-8 text-sm" value={template.name} onChange={(e) => setTemplateState((c) => c.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">내용</label>
                      <Textarea value={template.content} onChange={(e) => setTemplateState((c) => c.map((item, i) => i === index ? { ...item, content: e.target.value } : item))} className="min-h-[5rem] text-sm" />
                    </div>
                  </div>
                </div>
              )
            })}
            <div className="flex justify-end pt-2">
              <Button type="button" variant="secondary" size="sm" className="h-9 gap-2" onClick={saveTemplates} disabled={isTplPending}>
                {isTplPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                템플릿 저장
              </Button>
            </div>
            {errorTemplates ? <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorTemplates}</p> : null}
          </div>
        </SettingsAccordionItem>
      </SettingsAccordionGroup>
    </div>
  )
}
