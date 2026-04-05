import { createClient } from "@supabase/supabase-js"

import type { QuoteDocumentIssuer, QuoteDocumentQuote } from "@/components/app/quote-document"
import { demoBusinessSettings, demoCustomers, demoQuoteItems, demoQuotes } from "@/lib/demo-data"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import type { Customer, QuoteItem, QuoteStatus } from "@/types/domain"
import type { Database, Json } from "@/types/supabase"

export type ParsedQuoteSharePayload = {
  quote: QuoteDocumentQuote & { id: string; status: QuoteStatus }
  customer?: Customer
  issuer: QuoteDocumentIssuer
}

function asRecord(v: Json): Record<string, Json> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, Json>
  }
  return null
}

export function parseQuoteSharePayload(raw: Json | null): ParsedQuoteSharePayload | null {
  if (!raw || typeof raw !== "object") {
    return null
  }
  const root = raw as Record<string, Json>
  const q = asRecord(root.quote)
  const issuerJson = asRecord(root.issuer)
  if (!q || !issuerJson) {
    return null
  }

  const itemsRaw = root.items
  const items: QuoteItem[] = Array.isArray(itemsRaw)
    ? itemsRaw.map((row, i) => {
        const r = asRecord(row) ?? {}
        return {
          id: String(r.id ?? `item-${i}`),
          quoteId: String(q.id ?? ""),
          name: String(r.name ?? ""),
          description: r.description ? String(r.description) : undefined,
          quantity: Number(r.quantity ?? 0),
          unitPrice: Number(r.unit_price ?? 0),
          lineTotal: Number(r.line_total ?? 0),
        }
      })
    : []

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

  const quote: QuoteDocumentQuote & { id: string; status: QuoteStatus } = {
    id: String(q.id ?? ""),
    quoteNumber: String(q.quote_number ?? ""),
    title: String(q.title ?? ""),
    summary: String(q.summary ?? ""),
    status: (String(q.status ?? "draft")) as QuoteStatus,
    subtotal: Number(q.subtotal ?? 0),
    tax: Number(q.tax ?? 0),
    total: Number(q.total ?? 0),
    validUntil: q.valid_until ? String(q.valid_until) : undefined,
    sentAt: q.sent_at ? String(q.sent_at) : undefined,
    createdAt: String(q.created_at ?? ""),
    items,
  }

  return { quote, customer, issuer }
}

/** 데모·로컬 미구성 환경: 공유 토큰으로 견적 페이로드 구성 */
export function parseDemoQuoteSharePayload(token: string): ParsedQuoteSharePayload | null {
  const trimmed = token.trim()
  if (!trimmed) {
    return null
  }
  const quote = demoQuotes.find((q) => q.publicShareToken === trimmed)
  if (!quote) {
    return null
  }
  const customer = demoCustomers.find((c) => c.id === quote.customerId)
  const items = demoQuoteItems.filter((i) => i.quoteId === quote.id)
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
  const docQuote: QuoteDocumentQuote & { id: string; status: QuoteStatus } = {
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    title: quote.title,
    summary: quote.summary,
    status: quote.status,
    subtotal: quote.subtotal,
    tax: quote.tax,
    total: quote.total,
    validUntil: quote.validUntil,
    sentAt: quote.sentAt,
    createdAt: quote.createdAt,
    items,
  }
  return { quote: docQuote, customer, issuer }
}

export async function fetchQuoteSharePayloadByToken(token: string): Promise<ParsedQuoteSharePayload | null> {
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
          name: "get_quote_share_payload",
          args: { p_token: string }
        ): Promise<{ data: Json | null; error: { message: string } | null }>
      }
    ).rpc("get_quote_share_payload", { p_token: trimmed })

    if (!error && data != null) {
      const parsed = parseQuoteSharePayload(data as Json)
      if (parsed) {
        return parsed
      }
    }
  }

  return parseDemoQuoteSharePayload(trimmed)
}
