"use client"

import Link from "next/link"
import { useEffect, useState, useTransition } from "react"
import { Loader2, Receipt } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { updateCustomerTaxInvoiceProfileAction } from "@/app/actions"
import { BILLING_PAGE_PATH } from "@/lib/billing/catalog"
import { formatBusinessRegNoInput, formatDate } from "@/lib/format"
import { planAllowsFeature } from "@/lib/plan-features"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type {
  BillingPlan,
  Customer,
  CustomerTaxInvoiceSummary,
  TaxInvoiceStatus,
} from "@/types/domain"

function taxStatusLabel(s?: TaxInvoiceStatus): string {
  switch (s) {
    case "draft":
      return "초안"
    case "ready":
      return "발행 준비"
    case "issuing":
      return "발행 중"
    case "issued":
      return "발행 완료"
    case "failed":
      return "발행 실패"
    case "canceled":
      return "취소"
    default:
      return "—"
  }
}

export function CustomerTaxInvoiceSidebarCard({
  customer,
  taxInvoiceSummary,
  currentPlan,
}: {
  customer: Customer
  taxInvoiceSummary: CustomerTaxInvoiceSummary | null
  currentPlan: BillingPlan
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const allowed = planAllowsFeature(currentPlan, "e_tax_invoice_asp")

  const [taxBusinessName, setTaxBusinessName] = useState(customer.taxBusinessName ?? "")
  const [taxBusinessRegistrationNumber, setTaxBusinessRegistrationNumber] = useState(
    customer.taxBusinessRegistrationNumber ?? ""
  )
  const [taxCeoName, setTaxCeoName] = useState(customer.taxCeoName ?? "")
  const [taxInvoiceEmail, setTaxInvoiceEmail] = useState(customer.taxInvoiceEmail ?? "")
  const [taxContactName, setTaxContactName] = useState(customer.taxContactName ?? "")
  const [taxAddress, setTaxAddress] = useState(customer.taxAddress ?? "")

  useEffect(() => {
    setTaxBusinessName(customer.taxBusinessName ?? "")
    setTaxBusinessRegistrationNumber(customer.taxBusinessRegistrationNumber ?? "")
    setTaxCeoName(customer.taxCeoName ?? "")
    setTaxInvoiceEmail(customer.taxInvoiceEmail ?? "")
    setTaxContactName(customer.taxContactName ?? "")
    setTaxAddress(customer.taxAddress ?? "")
  }, [customer])

  const save = () => {
    startTransition(async () => {
      const res = await updateCustomerTaxInvoiceProfileAction(customer.id, {
        taxBusinessName,
        taxBusinessRegistrationNumber,
        taxCeoName,
        taxInvoiceEmail,
        taxContactName,
        taxAddress,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("세금계산서용 정보를 저장했습니다.")
      router.refresh()
    })
  }

  return (
    <Card className="border-border/70 shadow-sm" id="tax-invoice-profile">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-2">
          <Receipt className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
          <div>
            <CardTitle className="text-base font-semibold">세금계산서(참고)</CardTitle>
            <CardDescription className="text-[11px] leading-snug">
              발행 작업은 청구 상세에서 진행합니다. 여기서는 공급받는자 정보를 보관합니다.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border/60 bg-muted/15 p-3 text-xs">
          <p className="font-semibold text-foreground">최근 발행 요약</p>
          {taxInvoiceSummary?.lastStatus ? (
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>상태: {taxStatusLabel(taxInvoiceSummary.lastStatus)}</li>
              <li>발행일: {taxInvoiceSummary.lastIssueDate ? formatDate(taxInvoiceSummary.lastIssueDate) : "—"}</li>
              <li className="font-mono text-[11px]">
                승인번호: {taxInvoiceSummary.lastApprovalNumber?.trim() || "—"}
              </li>
              {taxInvoiceSummary.linkedInvoiceId ? (
                <li>
                  <Link
                    href={`/invoices?focus=${taxInvoiceSummary.linkedInvoiceId}`}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    연결 청구{" "}
                    {taxInvoiceSummary.linkedInvoiceNumber
                      ? `(${taxInvoiceSummary.linkedInvoiceNumber})`
                      : ""}
                    로 이동
                  </Link>
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="mt-1 text-muted-foreground">아직 이 고객과 연결된 세금계산서 기록이 없습니다.</p>
          )}
        </div>

        {!allowed ? (
          <p className="text-xs text-muted-foreground">
            세금계산서용 필드 편집은 Business 플랜에서 가능합니다.{" "}
            <Link href={BILLING_PAGE_PATH} className="font-medium text-primary underline-offset-4 hover:underline">
              플랜 안내
            </Link>
          </p>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-medium text-muted-foreground">세금계산서 상호</label>
                <Input className="h-9 text-sm" value={taxBusinessName} onChange={(e) => setTaxBusinessName(e.target.value)} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-medium text-muted-foreground">사업자등록번호</label>
                <Input
                  className="h-9 text-sm tabular-nums"
                  value={taxBusinessRegistrationNumber}
                  onChange={(e) =>
                    setTaxBusinessRegistrationNumber(formatBusinessRegNoInput(e.target.value))
                  }
                  maxLength={12}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">대표자명</label>
                <Input className="h-9 text-sm" value={taxCeoName} onChange={(e) => setTaxCeoName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">수신 이메일</label>
                <Input
                  className="h-9 text-sm"
                  type="email"
                  value={taxInvoiceEmail}
                  onChange={(e) => setTaxInvoiceEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-medium text-muted-foreground">담당자명 (선택)</label>
                <Input className="h-9 text-sm" value={taxContactName} onChange={(e) => setTaxContactName(e.target.value)} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-medium text-muted-foreground">주소 (선택)</label>
                <Textarea
                  className="min-h-[3.5rem] text-sm"
                  value={taxAddress}
                  onChange={(e) => setTaxAddress(e.target.value)}
                />
              </div>
            </div>
            <Button type="button" size="sm" className="h-9 gap-2" disabled={pending} onClick={save}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              세금계산서용 정보 저장
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
