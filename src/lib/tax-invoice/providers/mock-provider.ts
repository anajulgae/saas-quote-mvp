import type {
  TaxInvoiceIssuePayload,
  TaxInvoiceIssueResult,
  TaxInvoiceProviderAdapter,
  TaxInvoiceStatusResult,
} from "@/lib/tax-invoice/provider-types"
import type { TaxInvoice } from "@/types/domain"

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export const mockTaxInvoiceProvider: TaxInvoiceProviderAdapter = {
  id: "mock",
  displayName: "Mock ASP (개발·연동 테스트)",

  validateConfig(credentials) {
    const key = credentials.apiKey?.trim() ?? ""
    if (!key) {
      return { ok: false, message: "API Key(테스트용)를 입력해 주세요." }
    }
    return { ok: true }
  },

  createIssuePayload(tax: TaxInvoice): TaxInvoiceIssuePayload {
    return {
      provider: "mock",
      document: {
        supplyDate: tax.supplyDate ?? new Date().toISOString().slice(0, 10),
        totalSupplyAmount: tax.totalSupplyAmount,
        vatAmount: tax.vatAmount,
        totalAmount: tax.totalAmount,
        sender: {
          businessName: tax.senderBusinessName ?? "",
          businessNumber: tax.senderBusinessNumber ?? "",
          ceoName: tax.senderCeoName ?? "",
          email: tax.senderEmail ?? "",
          address: tax.senderAddress,
        },
        recipient: {
          businessName: tax.recipientBusinessName ?? "",
          businessNumber: tax.recipientBusinessNumber ?? "",
          ceoName: tax.recipientCeoName,
          email: tax.recipientEmail ?? "",
        },
        issueType: tax.issueType,
        taxType: tax.taxType,
        billIoTaxInvoiceId: tax.id,
        billIoInvoiceId: tax.invoiceId,
      },
      credentials: {},
    }
  },

  async issueTaxInvoice(payload: TaxInvoiceIssuePayload): Promise<TaxInvoiceIssueResult> {
    await sleep(450)
    const docId = `mock-doc-${payload.document.billIoTaxInvoiceId.slice(0, 8)}`
    const approval = `MOCK${String(Date.now()).slice(-10)}`
    return {
      ok: true,
      documentId: docId,
      approvalNumber: approval,
      issuedAt: new Date().toISOString(),
      raw: { mock: true, payloadSummary: payload.document.totalAmount },
    }
  },

  async getIssueStatus(documentId: string, _credentials: Record<string, string>): Promise<TaxInvoiceStatusResult> {
    await sleep(200)
    if (!documentId.startsWith("mock-doc-")) {
      return { ok: false, errorMessage: "알 수 없는 문서 ID입니다." }
    }
    return {
      ok: true,
      status: "issued",
      approvalNumber: `MOCK${documentId.slice(-6)}`,
      issuedAt: new Date().toISOString(),
      raw: { mock: true },
    }
  },
}
