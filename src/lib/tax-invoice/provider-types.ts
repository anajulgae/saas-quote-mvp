import type { TaxInvoice } from "@/types/domain"

export type TaxInvoiceProviderId = "mock" | string

export type TaxInvoiceIssuePayload = {
  provider: TaxInvoiceProviderId
  /** ASP에 넘기는 정규화 페이로드(제공사별 매핑 전) */
  document: {
    supplyDate: string
    totalSupplyAmount: number
    vatAmount: number
    totalAmount: number
    sender: {
      businessName: string
      businessNumber: string
      ceoName: string
      email: string
      address?: string
    }
    recipient: {
      businessName: string
      businessNumber: string
      ceoName?: string
      email: string
    }
    issueType: string
    taxType: string
    /** 내부 참조 */
    billIoTaxInvoiceId: string
    billIoInvoiceId: string
  }
  credentials: Record<string, string>
}

export type TaxInvoiceIssueResult =
  | {
      ok: true
      documentId: string
      approvalNumber?: string
      issuedAt?: string
      raw: Record<string, unknown>
    }
  | { ok: false; errorMessage: string; raw?: Record<string, unknown> }

export type TaxInvoiceStatusResult =
  | {
      ok: true
      status: "issued" | "processing" | "failed" | "unknown"
      approvalNumber?: string
      issuedAt?: string
      raw: Record<string, unknown>
    }
  | { ok: false; errorMessage: string }

export interface TaxInvoiceProviderAdapter {
  id: TaxInvoiceProviderId
  displayName: string
  validateConfig(credentials: Record<string, string>): { ok: true } | { ok: false; message: string }
  createIssuePayload(tax: TaxInvoice): TaxInvoiceIssuePayload
  issueTaxInvoice(payload: TaxInvoiceIssuePayload): Promise<TaxInvoiceIssueResult>
  getIssueStatus(documentId: string, credentials: Record<string, string>): Promise<TaxInvoiceStatusResult>
  cancelTaxInvoice?(
    documentId: string,
    credentials: Record<string, string>
  ): Promise<{ ok: true } | { ok: false; message: string }>
}
