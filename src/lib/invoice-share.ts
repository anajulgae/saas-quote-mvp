import { createClient } from "@supabase/supabase-js"

import type { QuoteDocumentIssuer } from "@/components/app/quote-document"
import type { InvoiceDocumentInvoice } from "@/components/app/invoice-document"
import { demoBusinessSettings, demoCustomers, demoInvoices, demoQuotes } from "@/lib/demo-data"
import { isSupabaseConfigured } from "@/lib/supabase/public-config"
import type { Customer, InvoiceType, PaymentStatus } from "@/types/domain"
import type { Database, Json } from "@/types/supabase"

export type ParsedInvoiceSharePayload = {
  invoice: InvoiceDocumentInvoice & { id: string }
  customer?: Customer
  issuer: QuoteDocumentIssuer
  linkedQuote?: { quoteNumber: string; title: string }
}

function asRecord(v: Json): Record<string, Json> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, Json>
  }
  return null
}

export function parseInvoiceSharePayload(raw: Json | null): ParsedInvoiceSharePayload | null {
  if (!raw || typeof raw !== "object") {
    return null
  }
  const root = raw as Record<string, Json>
  const inv = asRecord(root.invoice)
  const issuerJson = asRecord(root.issuer)
  if (!inv || !issuerJson) {
    return null
  }

  const cust = asRecord(root.customer)
  const customer: Customer | undefined = cust?.id
    ? {
        id: String(cust.id),
        userId: "",
        name: String(cust.name ?? ""),
        companyName: cust.company_name ? String(cust.company_name) : undefined,
        phone: cust.phone ? String(cust.phone) : "",
        email: cust.email ? String(cust.email) : "",
        tags: [],
        createdAt: "",
      }
    : undefined

  const lq = asRecord(root.linked_quote)
  const linkedQuote =
    lq && lq.quote_number
      ? { quoteNumber: String(lq.quote_number), title: String(lq.title ?? "") }
      : undefined

  const issuer: QuoteDocumentIssuer = {
    businessName: String(issuerJson.business_name ?? ""),
    ownerName: String(issuerJson.owner_name ?? ""),
    businessRegistrationNumber: issuerJson.business_registration_number
      ? String(issuerJson.business_registration_number)
      : undefined,
    email: issuerJson.email ? String(issuerJson.email) : "",
    phone: issuerJson.phone ? String(issuerJson.phone) : "",
    paymentTerms: issuerJson.payment_terms ? String(issuerJson.payment_terms) : "",
    bankAccount: issuerJson.bank_account ? String(issuerJson.bank_account) : "",
    sealImageUrl: issuerJson.seal_image_url ? String(issuerJson.seal_image_url) : undefined,
    sealEnabled: Boolean(issuerJson.seal_enabled),
  }

  const invoice: InvoiceDocumentInvoice & { id: string } = {
    id: String(inv.id ?? ""),
    invoiceNumber: String(inv.invoice_number ?? ""),
    invoiceType: String(inv.invoice_type ?? "final") as InvoiceType,
    amount: Number(inv.amount ?? 0),
    paymentStatus: String(inv.payment_status ?? "pending") as PaymentStatus,
    dueDate: inv.due_date ? String(inv.due_date) : undefined,
    requestedAt: inv.requested_at ? String(inv.requested_at) : undefined,
    paidAt: inv.paid_at ? String(inv.paid_at) : undefined,
    notes: String(inv.notes ?? ""),
    createdAt: String(inv.created_at ?? ""),
  }

  return { invoice, customer, issuer, linkedQuote }
}

export function parseDemoInvoiceSharePayload(token: string): ParsedInvoiceSharePayload | null {
  const trimmed = token.trim()
  if (!trimmed) {
    return null
  }
  const inv = demoInvoices.find((i) => i.publicShareToken === trimmed)
  if (!inv) {
    return null
  }
  const customer = demoCustomers.find((c) => c.id === inv.customerId)
  const quote = inv.quoteId ? demoQuotes.find((q) => q.id === inv.quoteId) : undefined
  const issuer: QuoteDocumentIssuer = {
    businessName: demoBusinessSettings.businessName,
    ownerName: demoBusinessSettings.ownerName,
    businessRegistrationNumber: demoBusinessSettings.businessRegistrationNumber || undefined,
    email: demoBusinessSettings.email,
    phone: demoBusinessSettings.phone,
    paymentTerms: demoBusinessSettings.paymentTerms,
    bankAccount: demoBusinessSettings.bankAccount,
    sealImageUrl: demoBusinessSettings.sealImageUrl,
    sealEnabled: demoBusinessSettings.sealEnabled,
  }
  const invoice: InvoiceDocumentInvoice & { id: string } = {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    invoiceType: inv.invoiceType,
    amount: inv.amount,
    paymentStatus: inv.paymentStatus,
    dueDate: inv.dueDate,
    requestedAt: inv.requestedAt,
    paidAt: inv.paidAt,
    notes: inv.notes ?? "",
    createdAt: inv.createdAt ?? "",
  }
  const linkedQuote = quote ? { quoteNumber: quote.quoteNumber, title: quote.title } : undefined
  return { invoice, customer, issuer, linkedQuote }
}

export async function fetchInvoiceSharePayloadByToken(token: string): Promise<ParsedInvoiceSharePayload | null> {
  const trimmed = token.trim()
  if (!trimmed) {
    return null
  }

  if (isSupabaseConfigured()) {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data, error } = await (
      supabase as unknown as {
        rpc(
          name: "get_invoice_share_payload",
          args: { p_token: string }
        ): Promise<{ data: Json | null; error: { message: string } | null }>
      }
    ).rpc("get_invoice_share_payload", { p_token: trimmed })
    if (!error && data != null) {
      const parsed = parseInvoiceSharePayload(data as Json)
      if (parsed) {
        return parsed
      }
    }
  }

  return parseDemoInvoiceSharePayload(trimmed)
}
