import type { BusinessSettings, Customer, TaxInvoice } from "@/types/domain"

export type TaxInvoiceReadinessIssue = {
  field: string
  message: string
  hint: string
}

export function validateTaxInvoiceReadiness(params: {
  settings: Pick<
    BusinessSettings,
    "businessName" | "businessRegistrationNumber" | "ownerName" | "email" | "taxInvoiceSupplierAddress"
  >
  customer: Pick<
    Customer,
    | "taxBusinessName"
    | "taxBusinessRegistrationNumber"
    | "taxInvoiceEmail"
    | "companyName"
    | "name"
    | "email"
  >
  taxRow: Pick<
    TaxInvoice,
    | "recipientBusinessName"
    | "recipientBusinessNumber"
    | "recipientEmail"
    | "senderBusinessName"
    | "senderBusinessNumber"
    | "senderEmail"
    | "senderCeoName"
    | "supplyDate"
    | "totalSupplyAmount"
    | "vatAmount"
    | "totalAmount"
  >
}): { ok: true } | { ok: false; issues: TaxInvoiceReadinessIssue[] } {
  const issues: TaxInvoiceReadinessIssue[] = []

  const senderName = params.taxRow.senderBusinessName?.trim() || params.settings.businessName?.trim()
  if (!senderName) {
    issues.push({
      field: "sender.businessName",
      message: "공급자 상호가 없습니다.",
      hint: "설정 → 사업장 정보에서 상호를 입력하세요.",
    })
  }

  const senderBrn =
    params.taxRow.senderBusinessNumber?.trim() || params.settings.businessRegistrationNumber?.trim()
  if (!senderBrn) {
    issues.push({
      field: "sender.businessNumber",
      message: "공급자 사업자등록번호가 없습니다.",
      hint: "설정에서 사업자등록번호를 입력하세요.",
    })
  }

  const senderCeo = params.taxRow.senderCeoName?.trim() || params.settings.ownerName?.trim()
  if (!senderCeo) {
    issues.push({
      field: "sender.ceo",
      message: "공급자 대표자명이 없습니다.",
      hint: "설정에서 대표자명을 입력하세요.",
    })
  }

  const senderEmail = params.taxRow.senderEmail?.trim() || params.settings.email?.trim()
  if (!senderEmail) {
    issues.push({
      field: "sender.email",
      message: "공급자 이메일이 없습니다.",
      hint: "설정에서 이메일을 입력하세요.",
    })
  }

  const recvName =
    params.taxRow.recipientBusinessName?.trim() ||
    params.customer.taxBusinessName?.trim() ||
    params.customer.companyName?.trim() ||
    params.customer.name?.trim()
  if (!recvName) {
    issues.push({
      field: "recipient.businessName",
      message: "공급받는자 상호가 없습니다.",
      hint: "고객의 세금계산서용 상호 또는 회사명/이름을 입력하세요.",
    })
  }

  const recvBrn =
    params.taxRow.recipientBusinessNumber?.trim() || params.customer.taxBusinessRegistrationNumber?.trim()
  if (!recvBrn) {
    issues.push({
      field: "recipient.businessNumber",
      message: "공급받는자 사업자등록번호가 없습니다.",
      hint: "고객 상세에서 세금계산서용 사업자번호를 입력하세요.",
    })
  }

  const recvEmail =
    params.taxRow.recipientEmail?.trim() ||
    params.customer.taxInvoiceEmail?.trim() ||
    params.customer.email?.trim()
  if (!recvEmail) {
    issues.push({
      field: "recipient.email",
      message: "공급받는자 이메일이 없습니다.",
      hint: "고객의 세금계산서 수신 이메일 또는 기본 이메일을 입력하세요.",
    })
  }

  if (!params.taxRow.supplyDate?.trim()) {
    issues.push({
      field: "supplyDate",
      message: "공급일이 없습니다.",
      hint: "청구에서 세금계산서 공급일을 지정하세요.",
    })
  }

  if (params.taxRow.totalAmount <= 0) {
    issues.push({
      field: "amount",
      message: "합계 금액이 올바르지 않습니다.",
      hint: "청구 금액을 확인하세요.",
    })
  }

  return issues.length ? { ok: false, issues } : { ok: true }
}
