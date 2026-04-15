"use client"

import Link from "next/link"
import { useEffect, useState, useTransition } from "react"
import { Loader2, Save } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { saveTaxInvoiceAspSettingsAction, testTaxInvoiceAspConnectionAction } from "@/app/actions"
import { BILLING_PAGE_PATH } from "@/lib/billing/catalog"
import { formatDateTime } from "@/lib/format"
import { listTaxInvoiceProviderOptions } from "@/lib/tax-invoice/registry"
import { planAllowsFeature } from "@/lib/plan-features"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { BillingPlan, BusinessSettings } from "@/types/domain"

const providerOptions = listTaxInvoiceProviderOptions()

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
  const [provider, setProvider] = useState(initialSettings.taxInvoiceProvider ?? "mock")
  const [enabled, setEnabled] = useState(Boolean(cfg.enabled))
  const [apiKey, setApiKey] = useState(cfg.apiKey ?? "")
  const [apiSecret, setApiSecret] = useState(cfg.apiSecret ?? "")
  const [companyCode, setCompanyCode] = useState(cfg.companyCode ?? "")
  const [supplierAddress, setSupplierAddress] = useState(
    initialSettings.taxInvoiceSupplierAddress ?? ""
  )

  useEffect(() => {
    const c = initialSettings.taxInvoiceProviderConfig ?? {}
    setProvider(initialSettings.taxInvoiceProvider ?? "mock")
    setEnabled(Boolean(c.enabled))
    setApiKey(c.apiKey ?? "")
    setApiSecret(c.apiSecret ?? "")
    setCompanyCode(c.companyCode ?? "")
    setSupplierAddress(initialSettings.taxInvoiceSupplierAddress ?? "")
  }, [initialSettings])

  const save = () => {
    startTransition(async () => {
      const res = await saveTaxInvoiceAspSettingsAction({
        provider,
        enabled,
        apiKey,
        apiSecret,
        companyCode,
        supplierAddress,
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
    <Card className="border-border/70" id="tax-invoice-asp">
      <CardHeader className="space-y-1 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base font-semibold">전자세금계산서 ASP 연동</CardTitle>
          <span className="rounded-md border border-border/70 bg-muted/40 px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
            Pro · 사용자 BYOA
          </span>
        </div>
        <CardDescription className="text-sm leading-relaxed">
          Bill-IO가 대신 과금하는 발행 서비스가 아닙니다. 등록한 발급대행(ASP) 계정으로 청구 화면에서 발행 요청을 보냅니다.
          자격증명은 DB에 저장되므로 운영 환경에서는 암호화·Vault 적용을 권장합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                className="size-3.5 rounded border-border"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              전자세금계산서 연동 사용
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium">제공사</label>
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
              <div className="space-y-1.5">
                <label className="text-xs font-medium">API Key</label>
                <Input
                  className="h-9 font-mono text-xs"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="제공사가 안내한 키"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">API Secret</label>
                <Input
                  className="h-9 font-mono text-xs"
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="비워 두면 기존 값 유지"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium">회사/가맹 코드 (선택)</label>
                <Input
                  className="h-9 max-w-md font-mono text-xs"
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium">공급자 주소 (세금계산서용)</label>
                <Textarea
                  className="min-h-[4rem] text-sm"
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                  placeholder="발행 확인 화면에 표시할 주소(선택)"
                />
              </div>
            </div>

            {cfg.lastTestAt ? (
              <p className="text-xs text-muted-foreground">
                마지막 연결 테스트: {formatDateTime(cfg.lastTestAt)}
                {cfg.lastTestOk === false && cfg.lastTestError ? (
                  <span className="ml-1 text-destructive">· {cfg.lastTestError}</span>
                ) : null}
                {cfg.lastTestOk ? <span className="ml-1 text-emerald-700 dark:text-emerald-300">· 성공</span> : null}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">아직 연결 테스트 기록이 없습니다.</p>
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
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
