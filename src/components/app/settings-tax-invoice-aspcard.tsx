"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, useTransition } from "react"
import { ExternalLink, Loader2, Save } from "lucide-react"
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

  const providerMeta: ProviderMeta | null = useMemo(() => getProviderMeta(provider), [provider])

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
    <div className="space-y-4">
      {!allowed ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/15 p-4 text-sm">
            <p className="text-muted-foreground">
              이 기능은 Pro 이상 플랜에서 사용할 수 있습니다. 플랜을 올리면 설정 저장·연결 테스트·청구 발행 흐름이
              활성화됩니다.
            </p>
            <Link
              href={BILLING_PAGE_PATH}
              className={cn(buttonVariants({ size: "sm" }), "mt-3 inline-flex")}
            >
              요금·플랜 안내
            </Link>
          </div>
        ) : (
          <>
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
                  <Input
                    className="h-9 font-mono text-sm"
                    value={fieldValues.apiKey ?? ""}
                    onChange={(e) => updateField("apiKey", e.target.value)}
                    placeholder="제공사가 안내한 키"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">API Secret</label>
                  <Input
                    className="h-9 font-mono text-sm"
                    type="password"
                    value={fieldValues.apiSecret ?? ""}
                    onChange={(e) => updateField("apiSecret", e.target.value)}
                    placeholder="비워 두면 기존 값 유지"
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-medium">회사/가맹 코드 (선택)</label>
                  <Input
                    className="h-9 max-w-md font-mono text-sm"
                    value={fieldValues.companyCode ?? ""}
                    onChange={(e) => updateField("companyCode", e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">공급자 주소 (세금계산서용)</label>
              <Textarea
                className="min-h-[4rem] text-sm"
                value={supplierAddress}
                onChange={(e) => setSupplierAddress(e.target.value)}
                placeholder="발행 확인 화면에 표시할 주소(선택)"
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
            ) : (
              <p className="text-sm text-muted-foreground">아직 연결 테스트 기록이 없습니다.</p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" className="h-9 gap-2" disabled={pending} onClick={save}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                연동 저장
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9"
                disabled={testPending || pending}
                onClick={test}
              >
                {testPending ? <Loader2 className="size-4 animate-spin" /> : null}
                연결 테스트
              </Button>
              <Link
                href="/settings/tax-invoice-guide"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-9 gap-1.5")}
              >
                사용 설명서
              </Link>
            </div>
          </>
        )}
    </div>
  )
}
