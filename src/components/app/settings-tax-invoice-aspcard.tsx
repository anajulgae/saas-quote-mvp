"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, useTransition } from "react"
import { CheckCircle2, ChevronDown, ExternalLink, Loader2, Save } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { saveTaxInvoiceAspSettingsAction, testTaxInvoiceAspConnectionAction } from "@/app/actions"
import { BILLING_PAGE_PATH } from "@/lib/billing/catalog"
import { formatDateTime } from "@/lib/format"
import { getProviderMeta, getAllProviderOptions, type ProviderMeta } from "@/lib/tax-invoice/provider-catalog"
import { planAllowsFeature } from "@/lib/plan-features"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { BillingPlan, BusinessSettings } from "@/types/domain"

const providerOptions = getAllProviderOptions()

export function SettingsTaxInvoiceAspCard({
  currentPlan,
  initialSettings,
}: {
  currentPlan: BillingPlan
  initialSettings: BusinessSettings
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [testPending, startTestTransition] = useTransition()
  const allowed = planAllowsFeature(currentPlan, "e_tax_invoice_asp")

  const cfg = initialSettings.taxInvoiceProviderConfig ?? {}
  const [provider, setProvider] = useState(initialSettings.taxInvoiceProvider ?? "popbill")
  const [enabled, setEnabled] = useState(Boolean(cfg.enabled))
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [supplierAddress, setSupplierAddress] = useState(
    initialSettings.taxInvoiceSupplierAddress ?? ""
  )
  const [showConfig, setShowConfig] = useState(Boolean(cfg.enabled))

  const providerMeta: ProviderMeta | null = useMemo(() => getProviderMeta(provider), [provider])
  const isConfigured = Boolean(cfg.enabled && cfg.apiKey)

  useEffect(() => {
    const c = initialSettings.taxInvoiceProviderConfig ?? {}
    setProvider(initialSettings.taxInvoiceProvider ?? "popbill")
    setEnabled(Boolean(c.enabled))
    const vals: Record<string, string> = {}
    if (c.apiKey) vals.apiKey = c.apiKey
    if (c.apiSecret) vals.apiSecret = ""
    if (c.companyCode) vals.companyCode = c.companyCode
    for (const [k, v] of Object.entries(c)) {
      if (typeof v === "string" && k !== "enabled" && k !== "lastTestAt" && k !== "lastTestOk" && k !== "lastTestError") {
        if (k === "apiSecret") continue
        vals[k] = v
      }
    }
    setFieldValues(vals)
    setSupplierAddress(initialSettings.taxInvoiceSupplierAddress ?? "")
  }, [initialSettings])

  useEffect(() => {
    if (provider !== (initialSettings.taxInvoiceProvider ?? "popbill")) {
      setFieldValues({})
    }
  }, [provider, initialSettings.taxInvoiceProvider])

  const updateField = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }))
  }

  const save = () => {
    startTransition(async () => {
      const res = await saveTaxInvoiceAspSettingsAction({
        provider,
        enabled,
        apiKey: fieldValues.apiKey ?? fieldValues.certKey ?? fieldValues.authCode ?? fieldValues.accessToken ?? "",
        apiSecret: fieldValues.apiSecret ?? fieldValues.secretKey ?? fieldValues.clientSecret ?? "",
        companyCode: fieldValues.companyCode ?? fieldValues.corpNum ?? "",
        supplierAddress,
        extraFields: fieldValues,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("전자세금계산서 연동 설정을 저장했습니다.")
      router.refresh()
    })
  }

  const test = () => {
    startTestTransition(async () => {
      const res = await testTaxInvoiceAspConnectionAction()
      if (!res.ok) {
        toast.error(res.error)
        router.refresh()
        return
      }
      toast.success(res.message)
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      {/* 연동 완료 상태 */}
      {isConfigured ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-800 dark:bg-emerald-950/30">
          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            전자세금계산서 연동 완료 ({providerMeta?.displayName ?? provider})
          </span>
        </div>
      ) : null}

      {/* 핵심 안내 — 무료 강조 */}
      <div className="rounded-lg border border-blue-200/60 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
          Bill-IO에서 추가 비용이 발생하지 않습니다
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-blue-800/80 dark:text-blue-200/70">
          전자세금계산서는 <strong>본인의 발급대행(ASP) 계정</strong>을 연결하는 방식입니다.
          Bill-IO는 발행 요청만 전달하며 별도 수수료를 받지 않습니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <div className="rounded-md border border-emerald-300/60 bg-emerald-50 px-2.5 py-1.5 dark:border-emerald-800 dark:bg-emerald-950/30">
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">팝빌</span>
            <span className="ml-1.5 text-emerald-600 dark:text-emerald-400">월 100건 무료</span>
          </div>
          <div className="rounded-md border border-emerald-300/60 bg-emerald-50 px-2.5 py-1.5 dark:border-emerald-800 dark:bg-emerald-950/30">
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">바로빌</span>
            <span className="ml-1.5 text-emerald-600 dark:text-emerald-400">월 50건 무료</span>
          </div>
          <div className="rounded-md border border-emerald-300/60 bg-emerald-50 px-2.5 py-1.5 dark:border-emerald-800 dark:bg-emerald-950/30">
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">스마트빌</span>
            <span className="ml-1.5 text-emerald-600 dark:text-emerald-400">건당 100원~</span>
          </div>
        </div>
      </div>

      {!allowed ? (
        <div className="rounded-lg border border-dashed border-border/70 bg-muted/15 p-4">
          <p className="text-sm text-muted-foreground">Pro 이상 플랜에서 사용할 수 있습니다.</p>
          <Link href={BILLING_PAGE_PATH} className={cn(buttonVariants({ size: "sm" }), "mt-3 inline-flex")}>
            요금·플랜 안내
          </Link>
        </div>
      ) : (
        <>
          {/* 간단 가이드 */}
          <div className="space-y-3">
            <p className="text-sm font-semibold">설정 방법</p>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
                <span>아래에서 사용할 제공사를 선택하세요 (추천: <strong className="text-foreground">팝빌</strong> — 월 100건 무료)</span>
              </li>
              <li className="flex gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</span>
                <span>해당 제공사 사이트에서 회원가입 후 API 키를 발급받으세요</span>
              </li>
              <li className="flex gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">3</span>
                <span>발급받은 키를 아래 폼에 입력하고 저장하면 완료!</span>
              </li>
            </ol>
            <Link
              href="/settings/tax-invoice-guide"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 gap-1.5")}
            >
              제공사별 상세 가이드
            </Link>
          </div>

          {/* 설정 폼 — 접을 수 있음 */}
          <div className="rounded-lg border border-border/60">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/20 transition-colors"
              onClick={() => setShowConfig((v) => !v)}
            >
              <span className="text-sm font-medium">제공사 연결 설정</span>
              <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", showConfig && "rotate-180")} />
            </button>
            {showConfig ? (
              <div className="space-y-4 border-t border-border/50 px-4 py-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-border"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                  />
                  전자세금계산서 연동 사용
                </label>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">제공사 선택</label>
                  <select
                    className="flex h-9 w-full max-w-md rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-input/30"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                  >
                    {providerOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                {providerMeta ? (
                  <div className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{providerMeta.displayName}</p>
                        <p className="text-sm text-muted-foreground">{providerMeta.shortDescription}</p>
                      </div>
                      <span className="shrink-0 rounded border border-border/50 bg-muted/30 px-1.5 py-0.5 text-xs font-mono">
                        {providerMeta.apiType}
                      </span>
                    </div>
                    {providerMeta.docsUrl ? (
                      <a
                        href={providerMeta.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="size-3.5" />
                        API 문서 보기
                      </a>
                    ) : null}
                  </div>
                ) : null}

                {providerMeta ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {providerMeta.fields.map((field) => (
                      <div key={field.key} className={cn("space-y-1.5", field.type === "text" && field.key.includes("Endpoint") && "sm:col-span-2")}>
                        <label className="text-sm font-medium">
                          {field.label}
                          {field.required ? <span className="ml-0.5 text-destructive">*</span> : null}
                        </label>
                        {field.type === "select" ? (
                          <select
                            className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-input/30"
                            value={fieldValues[field.key] ?? (field.options?.[0]?.value ?? "")}
                            onChange={(e) => updateField(field.key, e.target.value)}
                          >
                            {field.options?.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            className="h-9 font-mono text-sm"
                            type={field.type}
                            value={fieldValues[field.key] ?? ""}
                            onChange={(e) => updateField(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            autoComplete={field.type === "password" ? "new-password" : "off"}
                          />
                        )}
                        {field.helpText ? (
                          <p className="text-xs text-muted-foreground">{field.helpText}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">API Key</label>
                      <Input className="h-9 font-mono text-sm" value={fieldValues.apiKey ?? ""} onChange={(e) => updateField("apiKey", e.target.value)} placeholder="제공사가 안내한 키" autoComplete="off" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">API Secret</label>
                      <Input className="h-9 font-mono text-sm" type="password" value={fieldValues.apiSecret ?? ""} onChange={(e) => updateField("apiSecret", e.target.value)} placeholder="비워 두면 기존 값 유지" autoComplete="new-password" />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-sm font-medium">회사/가맹 코드 (선택)</label>
                      <Input className="h-9 max-w-md font-mono text-sm" value={fieldValues.companyCode ?? ""} onChange={(e) => updateField("companyCode", e.target.value)} autoComplete="off" />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">공급자 주소 (선택)</label>
                  <Textarea
                    className="min-h-[4rem] text-sm"
                    value={supplierAddress}
                    onChange={(e) => setSupplierAddress(e.target.value)}
                    placeholder="세금계산서에 표시할 주소"
                  />
                </div>

                {cfg.lastTestAt ? (
                  <p className="text-sm text-muted-foreground">
                    마지막 연결 테스트: {formatDateTime(cfg.lastTestAt)}
                    {cfg.lastTestOk === false && cfg.lastTestError ? (
                      <span className="ml-1 text-destructive">· {cfg.lastTestError}</span>
                    ) : null}
                    {cfg.lastTestOk ? <span className="ml-1 text-emerald-700 dark:text-emerald-300">· 성공</span> : null}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" className="h-9 gap-2" disabled={pending} onClick={save}>
                    {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    연동 저장
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="h-9" disabled={testPending || pending} onClick={test}>
                    {testPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    연결 테스트
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
