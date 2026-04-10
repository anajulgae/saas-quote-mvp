"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, useTransition } from "react"
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  issueTaxInvoiceAction,
  prepareTaxInvoiceAction,
  refreshTaxInvoiceStatusAction,
  updateInvoiceTaxFlagsAction,
} from "@/app/actions"
import { BILLING_PAGE_PATH } from "@/lib/billing/catalog"
import { formatCurrency, formatDate } from "@/lib/format"
import { opsStatusChipVariants } from "@/lib/ops-status-meta"
import { planAllowsFeature } from "@/lib/plan-features"
import { computeTaxAmountsFromInvoice } from "@/lib/tax-invoice/amounts"
import { getTaxInvoiceListChipMeta } from "@/lib/tax-invoice/list-ui"
import { validateTaxInvoiceReadiness } from "@/lib/tax-invoice/validate-readiness"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { BillingPlan, BusinessSettings, InvoiceWithReminders, Quote } from "@/types/domain"

export function InvoiceTaxInvoiceSection({
  invoice,
  businessSettings,
  quotes,
  currentPlan,
}: {
  invoice: InvoiceWithReminders
  businessSettings: BusinessSettings | null
  quotes: Quote[]
  currentPlan: BillingPlan
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [issueOpen, setIssueOpen] = useState(false)
  const taxAllowed = planAllowsFeature(currentPlan, "e_tax_invoice_asp")

  const customer = invoice.customer
  const tax = invoice.taxInvoice

  const [target, setTarget] = useState(Boolean(invoice.eTaxInvoiceTarget))
  const [needIssue, setNeedIssue] = useState(Boolean(invoice.eTaxInvoiceNeedIssue))
  const [supplyDate, setSupplyDate] = useState(invoice.eTaxInvoiceSupplyDate ?? "")
  const [issueDue, setIssueDue] = useState(invoice.eTaxInvoiceIssueDueDate ?? "")

  useEffect(() => {
    setTarget(Boolean(invoice.eTaxInvoiceTarget))
    setNeedIssue(Boolean(invoice.eTaxInvoiceNeedIssue))
    setSupplyDate(invoice.eTaxInvoiceSupplyDate ?? "")
    setIssueDue(invoice.eTaxInvoiceIssueDueDate ?? "")
  }, [
    invoice.id,
    invoice.eTaxInvoiceTarget,
    invoice.eTaxInvoiceNeedIssue,
    invoice.eTaxInvoiceSupplyDate,
    invoice.eTaxInvoiceIssueDueDate,
  ])

  const linkedQuote = useMemo(
    () => quotes.find((q) => q.id === invoice.quoteId) ?? null,
    [quotes, invoice.quoteId]
  )

  const readiness = useMemo(() => {
    if (!businessSettings || !customer) {
      return {
        ok: false as const,
        issues: [
          {
            field: "settings",
            message: "사업장 설정 또는 고객 정보를 불러올 수 없습니다.",
            hint: "설정과 고객 정보를 확인해 주세요.",
          },
        ],
      }
    }
    const { supply, vat, total } = computeTaxAmountsFromInvoice({
      invoiceAmount: invoice.amount,
      quote: linkedQuote,
    })
    const sd = supplyDate.trim() || invoice.eTaxInvoiceSupplyDate || new Date().toISOString().slice(0, 10)
    const taxRow = tax
      ? {
          recipientBusinessName: tax.recipientBusinessName,
          recipientBusinessNumber: tax.recipientBusinessNumber,
          recipientEmail: tax.recipientEmail,
          senderBusinessName: tax.senderBusinessName,
          senderBusinessNumber: tax.senderBusinessNumber,
          senderEmail: tax.senderEmail,
          senderCeoName: tax.senderCeoName,
          supplyDate: tax.supplyDate,
          totalSupplyAmount: tax.totalSupplyAmount,
          vatAmount: tax.vatAmount,
          totalAmount: tax.totalAmount,
        }
      : {
          recipientBusinessName:
            customer.taxBusinessName?.trim() ||
            customer.companyName?.trim() ||
            customer.name,
          recipientBusinessNumber: customer.taxBusinessRegistrationNumber?.replace(/\D/g, "") ?? "",
          recipientEmail:
            customer.taxInvoiceEmail?.trim() || customer.email?.trim() || "",
          senderBusinessName: businessSettings.businessName,
          senderBusinessNumber: businessSettings.businessRegistrationNumber.replace(/\D/g, ""),
          senderEmail: businessSettings.email?.trim() || "",
          senderCeoName: businessSettings.ownerName,
          supplyDate: sd,
          totalSupplyAmount: supply,
          vatAmount: vat,
          totalAmount: total,
        }

    return validateTaxInvoiceReadiness({
      settings: businessSettings,
      customer,
      taxRow,
    })
  }, [businessSettings, customer, tax, invoice.amount, linkedQuote, supplyDate, invoice.eTaxInvoiceSupplyDate])

  const listMeta = getTaxInvoiceListChipMeta(invoice)

  const dueWarning = useMemo(() => {
    if (!issueDue.trim()) {
      return null
    }
    const d = new Date(`${issueDue}T23:59:59`)
    if (!Number.isFinite(d.getTime())) {
      return null
    }
    return d.getTime() < Date.now()
  }, [issueDue])

  const saveFlags = () => {
    startTransition(async () => {
      const res = await updateInvoiceTaxFlagsAction(invoice.id, {
        eTaxInvoiceTarget: target,
        eTaxInvoiceNeedIssue: needIssue,
        eTaxInvoiceSupplyDate: supplyDate.trim() || null,
        eTaxInvoiceIssueDueDate: issueDue.trim() || null,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("세금계산서 발행 관리 정보를 저장했습니다.")
      router.refresh()
    })
  }

  const runPrepare = () => {
    startTransition(async () => {
      const res = await prepareTaxInvoiceAction(invoice.id)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("발행 준비를 완료했습니다. 내용을 확인한 뒤 발행을 실행하세요.")
      router.refresh()
    })
  }

  const runIssue = () => {
    setIssueOpen(false)
    startTransition(async () => {
      const res = await issueTaxInvoiceAction(invoice.id)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("세금계산서 발행 요청이 완료되었습니다.")
      router.refresh()
    })
  }

  const runRefresh = () => {
    if (!tax?.id) {
      return
    }
    startTransition(async () => {
      const res = await refreshTaxInvoiceStatusAction(tax.id, invoice.id)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("외부 발행 상태를 다시 조회했습니다.")
      router.refresh()
    })
  }

  if (!taxAllowed) {
    return (
      <div className="space-y-2 rounded-lg border border-border/60 bg-muted/15 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-foreground">전자세금계산서</p>
          <span className={opsStatusChipVariants({ tone: "muted", size: "sm", emphasis: false })}>Business</span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          등록한 발급대행(ASP) 계정으로 청구와 연결해 전자세금계산서를 발행·추적할 수 있습니다. Business 플랜에서 이용할 수
          있습니다.
        </p>
        <Link href={BILLING_PAGE_PATH} className={cn(buttonVariants({ size: "sm", variant: "outline" }), "w-full sm:w-auto")}>
          요금·플랜 안내
        </Link>
      </div>
    )
  }

  const issued = tax?.status === "issued"
  const issuing = tax?.status === "issuing"
  const canIssue = tax?.status === "ready" || tax?.status === "failed"
  const canPrepare = target && !issued && !issuing

  return (
    <>
      <div className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-foreground">전자세금계산서</p>
          <span
            className={opsStatusChipVariants({
              tone: listMeta.tone,
              size: "sm",
              emphasis: listMeta.emphasis,
            })}
          >
            {listMeta.label}
          </span>
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Bill-IO는 국세청 직접 송신이 아니라, 설정에 등록한 ASP 계정으로 발행 요청을 보냅니다. 발행 필요 여부는 청구마다
          직접 관리합니다.
        </p>

        <div className="space-y-2 rounded-md border border-border/50 bg-background/60 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium">세금계산서 대상 청구</p>
              <p className="text-[10px] text-muted-foreground">과세 B2B 등 발행이 필요한 청구만 켜 주세요.</p>
            </div>
            <input
              type="checkbox"
              className="size-4 rounded border-input"
              checked={target}
              disabled={pending || issued}
              onChange={(e) => setTarget(e.target.checked)}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium">발행 필요</p>
              <p className="text-[10px] text-muted-foreground">입금과 무관하게, 실제로 발행할 청구임을 표시합니다.</p>
            </div>
            <input
              type="checkbox"
              className="size-4 rounded border-input"
              checked={needIssue}
              disabled={pending || issued || !target}
              onChange={(e) => setNeedIssue(e.target.checked)}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">공급일</label>
              <Input
                type="date"
                className="h-9"
                value={supplyDate}
                onChange={(e) => setSupplyDate(e.target.value)}
                disabled={pending || issued}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">발행 마감(참고)</label>
              <Input
                type="date"
                className="h-9"
                value={issueDue}
                onChange={(e) => setIssueDue(e.target.value)}
                disabled={pending || issued}
              />
            </div>
          </div>
          {dueWarning ? (
            <p className="flex items-start gap-1.5 text-[11px] text-amber-900 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              발행 마감일이 지났습니다. 일정을 갱신하거나 발행을 서두르세요.
            </p>
          ) : null}
          <Button type="button" size="sm" variant="secondary" className="h-8 w-full sm:w-auto" disabled={pending} onClick={saveFlags}>
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            관리 정보 저장
          </Button>
        </div>

        {target ? (
          <div className="space-y-2 rounded-md border border-border/50 bg-background/60 p-2.5">
            <p className="text-xs font-semibold text-muted-foreground">발행 전 점검</p>
            {readiness.ok ? (
              <p className="text-xs text-emerald-900 dark:text-emerald-100">필수 항목이 채워져 있습니다. 발행 준비를 진행할 수 있습니다.</p>
            ) : (
              <ul className="space-y-1.5 text-[11px]">
                {readiness.issues.map((issue) => (
                  <li key={issue.field} className="rounded border border-destructive/25 bg-destructive/[0.06] px-2 py-1.5">
                    <p className="font-medium text-destructive">{issue.message}</p>
                    <p className="mt-0.5 text-muted-foreground">{issue.hint}</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              <Link
                href="/settings#tax-invoice-asp"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8")}
              >
                설정 · ASP·공급자
              </Link>
              {customer ? (
                <Link
                  href={`/customers/${customer.id}#tax-invoice-profile`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8")}
                >
                  고객 · 공급받는자
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        {tax ? (
          <div className="grid gap-2 text-[11px] sm:grid-cols-2">
            <div className="rounded border border-border/40 p-2">
              <p className="text-muted-foreground">공급가액 / 부가세 / 합계</p>
              <p className="mt-0.5 font-medium tabular-nums">
                {formatCurrency(tax.totalSupplyAmount)} · {formatCurrency(tax.vatAmount)} ·{" "}
                {formatCurrency(tax.totalAmount)}
              </p>
            </div>
            <div className="rounded border border-border/40 p-2">
              <p className="text-muted-foreground">공급일 / 발행일</p>
              <p className="mt-0.5 tabular-nums">
                {formatDate(tax.supplyDate)} · {tax.issueDate ? formatDate(tax.issueDate) : "—"}
              </p>
            </div>
            <div className="sm:col-span-2 rounded border border-border/40 p-2">
              <p className="text-muted-foreground">승인번호</p>
              <p className="mt-0.5 font-mono text-xs">{tax.approvalNumber?.trim() || "—"}</p>
            </div>
            <div className="sm:col-span-2 rounded border border-border/40 p-2">
              <p className="text-muted-foreground">공급받는자</p>
              <p className="mt-0.5">
                {tax.recipientBusinessName} · {tax.recipientBusinessNumber || "사업자번호 없음"} ·{" "}
                {tax.recipientEmail || "이메일 없음"}
              </p>
            </div>
          </div>
        ) : null}

        {tax?.failureReason ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/[0.06] p-2 text-[11px]">
            <p className="font-semibold text-destructive">실패 사유</p>
            <p className="mt-1 whitespace-pre-wrap text-foreground/90">{tax.failureReason}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 gap-1.5"
            disabled={pending || !canPrepare || issued || issuing}
            onClick={runPrepare}
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            발행 준비
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5"
            disabled={pending || !canIssue || !readiness.ok || issuing}
            onClick={() => setIssueOpen(true)}
          >
            발행 실행
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            disabled={pending || !tax?.id || !tax.aspDocumentId}
            onClick={runRefresh}
          >
            <RefreshCw className="size-3.5" />
            상태 새로고침
          </Button>
        </div>
        {issued ? (
          <p className="text-[10px] text-muted-foreground">
            이미 발행 완료된 문서입니다. 수정·취소·재발행은 사용 중인 ASP 정책에 따릅니다.
          </p>
        ) : null}
      </div>

      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>전자세금계산서 발행</DialogTitle>
            <DialogDescription>
              등록된 ASP 연동으로 발행 요청을 보냅니다. 실행 전 공급자·공급받는자·금액·공급일을 다시 확인하세요.
            </DialogDescription>
          </DialogHeader>
          <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
            <li>합계 {formatCurrency(invoice.amount)}(청구 기준)</li>
            <li>공급일 {supplyDate || invoice.eTaxInvoiceSupplyDate || "오늘 날짜 기준"}</li>
            <li>실패 시에도 청구 데이터는 유지되며, 실패 사유를 확인한 뒤 다시 시도할 수 있습니다.</li>
          </ul>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setIssueOpen(false)}>
              취소
            </Button>
            <Button type="button" onClick={runIssue} disabled={pending}>
              발행 요청
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
