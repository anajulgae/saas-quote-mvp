import type { SupabaseClient } from "@supabase/supabase-js"

import { computeTaxAmountsFromInvoice } from "@/lib/tax-invoice/amounts"
import { getTaxInvoiceProvider } from "@/lib/tax-invoice/registry"
import { validateTaxInvoiceReadiness } from "@/lib/tax-invoice/validate-readiness"
import { formatBusinessRegNoInput } from "@/lib/format"
import type {
  BusinessSettings,
  Customer,
  Invoice,
  Quote,
  TaxInvoice,
  TaxInvoiceAspProviderConfig,
  TaxInvoiceStatus,
} from "@/types/domain"
import type { Database, Json } from "@/types/supabase"

type TxRow = Database["public"]["Tables"]["tax_invoices"]["Row"]

export function mapTaxInvoiceRow(row: TxRow): TaxInvoice {
  return {
    id: row.id,
    userId: row.user_id,
    customerId: row.customer_id,
    invoiceId: row.invoice_id,
    quoteId: row.quote_id ?? undefined,
    issueType: row.issue_type,
    status: row.status as TaxInvoiceStatus,
    taxType: row.tax_type,
    supplyDate: row.supply_date ?? undefined,
    issueDueDate: row.issue_due_date ?? undefined,
    issueDate: row.issue_date ?? undefined,
    approvalNumber: row.approval_number ?? undefined,
    totalSupplyAmount: row.total_supply_amount,
    vatAmount: row.vat_amount,
    totalAmount: row.total_amount,
    recipientBusinessName: row.recipient_business_name ?? undefined,
    recipientBusinessNumber: row.recipient_business_number ?? undefined,
    recipientEmail: row.recipient_email ?? undefined,
    recipientCeoName: row.recipient_ceo_name ?? undefined,
    senderBusinessName: row.sender_business_name ?? undefined,
    senderBusinessNumber: row.sender_business_number ?? undefined,
    senderEmail: row.sender_email ?? undefined,
    senderCeoName: row.sender_ceo_name ?? undefined,
    senderAddress: row.sender_address ?? undefined,
    aspProvider: row.asp_provider ?? undefined,
    aspDocumentId: row.asp_document_id ?? undefined,
    aspResponseLog:
      row.asp_response_log && typeof row.asp_response_log === "object" && !Array.isArray(row.asp_response_log)
        ? (row.asp_response_log as Record<string, unknown>)
        : {},
    failureReason: row.failure_reason ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function parseAspConfig(raw: Json | null | undefined): TaxInvoiceAspProviderConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {}
  }
  return raw as TaxInvoiceAspProviderConfig
}

function credentialsFromConfig(config: TaxInvoiceAspProviderConfig): Record<string, string> {
  return {
    apiKey: config.apiKey?.trim() ?? "",
    apiSecret: config.apiSecret?.trim() ?? "",
    companyCode: config.companyCode?.trim() ?? "",
  }
}

export async function fetchTaxInvoicesByInvoiceIds(
  supabase: SupabaseClient<Database>,
  userId: string,
  invoiceIds: string[]
): Promise<Map<string, TaxInvoice>> {
  const map = new Map<string, TaxInvoice>()
  if (!invoiceIds.length) {
    return map
  }
  const { data, error } = await supabase
    .from("tax_invoices")
    .select("*")
    .eq("user_id", userId)
    .in("invoice_id", invoiceIds)

  if (error) {
    throw error
  }
  for (const row of data ?? []) {
    map.set(row.invoice_id, mapTaxInvoiceRow(row as TxRow))
  }
  return map
}

export async function fetchTaxInvoiceSummaryForCustomer(
  supabase: SupabaseClient<Database>,
  userId: string,
  customerId: string
): Promise<{
  lastStatus?: TaxInvoiceStatus
  lastIssueDate?: string
  lastApprovalNumber?: string
  linkedInvoiceId?: string
  linkedInvoiceNumber?: string
} | null> {
  const { data: rows, error } = await supabase
    .from("tax_invoices")
    .select("status, issue_date, approval_number, invoice_id")
    .eq("user_id", userId)
    .eq("customer_id", customerId)
    .order("updated_at", { ascending: false })
    .limit(1)

  if (error) {
    throw error
  }
  const row = rows?.[0]
  if (!row) {
    return null
  }

  let invoiceNumber: string | undefined
  if (row.invoice_id) {
    const { data: inv } = await supabase
      .from("invoices")
      .select("invoice_number")
      .eq("id", row.invoice_id)
      .eq("user_id", userId)
      .maybeSingle()
    invoiceNumber = inv?.invoice_number ?? undefined
  }

  return {
    lastStatus: row.status as TaxInvoiceStatus,
    lastIssueDate: row.issue_date ?? undefined,
    lastApprovalNumber: row.approval_number ?? undefined,
    linkedInvoiceId: row.invoice_id,
    linkedInvoiceNumber: invoiceNumber,
  }
}

export async function countTaxInvoiceDashboardSignals(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ needAttention: number; failed: number }> {
  const { data: invRows, error: invErr } = await supabase
    .from("invoices")
    .select("id, e_tax_invoice_target, e_tax_invoice_need_issue")
    .eq("user_id", userId)

  if (invErr) {
    throw invErr
  }

  const { data: taxRows, error: taxErr } = await supabase
    .from("tax_invoices")
    .select("invoice_id, status")
    .eq("user_id", userId)

  if (taxErr) {
    throw taxErr
  }

  const taxByInv = new Map((taxRows ?? []).map((r) => [r.invoice_id, r.status as string]))

  let needAttention = 0
  let failed = 0

  for (const r of invRows ?? []) {
    if (!r.e_tax_invoice_target) {
      continue
    }
    const st = taxByInv.get(r.id)
    if (st === "failed") {
      failed += 1
    }
    if (!r.e_tax_invoice_need_issue) {
      continue
    }
    if (!st || st === "draft" || st === "ready" || st === "issuing" || st === "failed") {
      needAttention += 1
    }
  }

  return { needAttention, failed }
}

export async function saveTaxInvoiceAspSettings(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: {
    provider: string
    config: TaxInvoiceAspProviderConfig
    supplierAddress?: string
  }
): Promise<void> {
  const { error } = await supabase
    .from("business_settings")
    .update({
      tax_invoice_provider: input.provider.trim() || null,
      tax_invoice_provider_config: input.config as unknown as Json,
      tax_invoice_supplier_address: input.supplierAddress?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)

  if (error) {
    throw error
  }
}

export async function testTaxInvoiceAspConnection(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const { data: row, error } = await supabase
    .from("business_settings")
    .select("tax_invoice_provider, tax_invoice_provider_config")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw error
  }
  const providerId = row?.tax_invoice_provider?.trim() ?? ""
  const config = parseAspConfig(row?.tax_invoice_provider_config)
  const provider = getTaxInvoiceProvider(providerId)
  if (!provider) {
    return { ok: false, message: "전자세금계산서 제공사를 선택해 주세요." }
  }
  const creds = credentialsFromConfig(config)
  const v = provider.validateConfig(creds)
  if (!v.ok) {
    const now = new Date().toISOString()
    await supabase
      .from("business_settings")
      .update({
        tax_invoice_provider_config: {
          ...config,
          lastTestAt: now,
          lastTestOk: false,
          lastTestError: v.message,
        } as unknown as Json,
        updated_at: now,
      })
      .eq("user_id", userId)
    return { ok: false, message: v.message }
  }

  const now = new Date().toISOString()
  await supabase
    .from("business_settings")
    .update({
      tax_invoice_provider_config: {
        ...config,
        lastTestAt: now,
        lastTestOk: true,
        lastTestError: null,
      } as unknown as Json,
      updated_at: now,
    })
    .eq("user_id", userId)

  return { ok: true, message: `${provider.displayName} 연결 정보 형식이 올바릅니다. (실제 발행은 청구에서 진행)` }
}

export async function updateInvoiceTaxFlags(
  supabase: SupabaseClient<Database>,
  userId: string,
  invoiceId: string,
  input: {
    eTaxInvoiceTarget: boolean
    eTaxInvoiceNeedIssue: boolean
    eTaxInvoiceSupplyDate?: string | null
    eTaxInvoiceIssueDueDate?: string | null
  }
): Promise<void> {
  const { error } = await supabase
    .from("invoices")
    .update({
      e_tax_invoice_target: input.eTaxInvoiceTarget,
      e_tax_invoice_need_issue: input.eTaxInvoiceNeedIssue,
      e_tax_invoice_supply_date: input.eTaxInvoiceSupplyDate ?? null,
      e_tax_invoice_issue_due_date: input.eTaxInvoiceIssueDueDate ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)
    .eq("user_id", userId)

  if (error) {
    throw error
  }
}

export async function updateCustomerTaxProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
  customerId: string,
  input: {
    taxBusinessName?: string
    taxBusinessRegistrationNumber?: string
    taxCeoName?: string
    taxInvoiceEmail?: string
    taxContactName?: string
    taxAddress?: string
  }
): Promise<void> {
  const { error } = await supabase
    .from("customers")
    .update({
      tax_business_name: input.taxBusinessName?.trim() || null,
      tax_business_registration_number: formatBusinessRegNoInput(input.taxBusinessRegistrationNumber ?? "") || null,
      tax_ceo_name: input.taxCeoName?.trim() || null,
      tax_invoice_email: input.taxInvoiceEmail?.trim() || null,
      tax_contact_name: input.taxContactName?.trim() || null,
      tax_address: input.taxAddress?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", customerId)
    .eq("user_id", userId)

  if (error) {
    throw error
  }
}

async function loadInvoiceBundle(
  supabase: SupabaseClient<Database>,
  userId: string,
  invoiceId: string
): Promise<{
  invoice: Invoice
  customer: Customer
  quote: Quote | null
  settings: BusinessSettings
  taxRow: TxRow | null
}> {
  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .maybeSingle()

  if (invErr) {
    throw invErr
  }
  if (!inv) {
    throw new Error("청구를 찾을 수 없습니다.")
  }

  const { data: cust, error: cErr } = await supabase
    .from("customers")
    .select("*")
    .eq("id", inv.customer_id)
    .eq("user_id", userId)
    .maybeSingle()

  if (cErr) {
    throw cErr
  }
  if (!cust) {
    throw new Error("고객을 찾을 수 없습니다.")
  }

  let quote: Quote | null = null
  if (inv.quote_id) {
    const { data: q, error: qErr } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", inv.quote_id)
      .eq("user_id", userId)
      .maybeSingle()
    if (qErr) {
      throw qErr
    }
    if (q) {
      quote = {
        id: q.id,
        userId: q.user_id,
        customerId: q.customer_id,
        inquiryId: q.inquiry_id ?? undefined,
        quoteNumber: q.quote_number,
        title: q.title,
        summary: q.summary ?? "",
        status: q.status,
        subtotal: q.subtotal,
        tax: q.tax,
        total: q.total,
        sentAt: q.sent_at ?? undefined,
        validUntil: q.valid_until ?? undefined,
        createdAt: q.created_at,
        updatedAt: q.updated_at,
      }
    }
  }

  const { data: bs, error: bsErr } = await supabase
    .from("business_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (bsErr) {
    throw bsErr
  }
  if (!bs) {
    throw new Error("사업장 설정이 없습니다.")
  }

  const settings: BusinessSettings = {
    id: bs.id,
    userId: bs.user_id,
    businessName: bs.business_name,
    ownerName: bs.owner_name,
    businessRegistrationNumber: formatBusinessRegNoInput(bs.business_registration_number ?? ""),
    email: bs.email ?? "",
    phone: bs.phone ?? "",
    paymentTerms: bs.payment_terms ?? "",
    bankAccount: bs.bank_account ?? "",
    reminderMessage: bs.reminder_message ?? "",
    sealImageUrl: bs.seal_image_url ?? undefined,
    sealEnabled: Boolean(bs.seal_enabled),
    updatedAt: bs.updated_at,
    publicInquiryFormEnabled: Boolean(bs.public_inquiry_form_enabled),
    publicInquiryFormToken: bs.public_inquiry_form_token ?? null,
    publicInquiryIntro: bs.public_inquiry_intro ?? "",
    publicInquiryConsentIntro: bs.public_inquiry_consent_intro ?? "",
    publicInquiryConsentRetention: bs.public_inquiry_consent_retention ?? "",
    publicInquiryCompletionMessage: bs.public_inquiry_completion_message ?? "",
    taxInvoiceProvider: bs.tax_invoice_provider ?? undefined,
    taxInvoiceProviderConfig: parseAspConfig(bs.tax_invoice_provider_config),
    taxInvoiceSupplierAddress: bs.tax_invoice_supplier_address ?? undefined,
  }

  const { data: tax, error: tErr } = await supabase
    .from("tax_invoices")
    .select("*")
    .eq("invoice_id", invoiceId)
    .eq("user_id", userId)
    .maybeSingle()

  if (tErr) {
    throw tErr
  }

  const invoice: Invoice = {
    id: inv.id,
    userId: inv.user_id,
    customerId: inv.customer_id,
    quoteId: inv.quote_id ?? undefined,
    invoiceNumber: inv.invoice_number,
    invoiceType: inv.invoice_type,
    amount: inv.amount,
    paymentStatus: inv.payment_status,
    dueDate: inv.due_date ?? undefined,
    paidAt: inv.paid_at ?? undefined,
    requestedAt: inv.requested_at ?? undefined,
    notes: inv.notes ?? undefined,
    createdAt: inv.created_at,
    updatedAt: inv.updated_at,
    publicShareToken: inv.public_share_token ?? undefined,
    shareOpenCount: inv.share_open_count ?? undefined,
    shareLastOpenedAt: inv.share_last_opened_at ?? undefined,
    promisedPaymentDate: inv.promised_payment_date ?? undefined,
    nextCollectionFollowupAt: inv.next_collection_followup_at ?? undefined,
    collectionTone:
      inv.collection_tone === "polite" || inv.collection_tone === "firm" ? inv.collection_tone : "neutral",
    eTaxInvoiceTarget: Boolean(inv.e_tax_invoice_target),
    eTaxInvoiceNeedIssue: Boolean(inv.e_tax_invoice_need_issue),
    eTaxInvoiceSupplyDate: inv.e_tax_invoice_supply_date ?? undefined,
    eTaxInvoiceIssueDueDate: inv.e_tax_invoice_issue_due_date ?? undefined,
  }

  const customer: Customer = {
    id: cust.id,
    userId: cust.user_id,
    name: cust.name,
    companyName: cust.company_name ?? undefined,
    phone: cust.phone ?? "",
    email: cust.email ?? "",
    notes: cust.notes ?? undefined,
    tags: cust.tags ?? [],
    createdAt: cust.created_at,
    updatedAt: cust.updated_at,
    portalToken: cust.portal_token ?? undefined,
    taxBusinessName: cust.tax_business_name ?? undefined,
    taxBusinessRegistrationNumber: cust.tax_business_registration_number
      ? formatBusinessRegNoInput(cust.tax_business_registration_number)
      : undefined,
    taxCeoName: cust.tax_ceo_name ?? undefined,
    taxInvoiceEmail: cust.tax_invoice_email ?? undefined,
    taxContactName: cust.tax_contact_name ?? undefined,
    taxAddress: cust.tax_address ?? undefined,
  }

  return { invoice, customer, quote, settings, taxRow: tax as TxRow | null }
}

export async function prepareTaxInvoiceForInvoice(
  supabase: SupabaseClient<Database>,
  userId: string,
  invoiceId: string
): Promise<TaxInvoice> {
  const { invoice, customer, quote, settings, taxRow } = await loadInvoiceBundle(
    supabase,
    userId,
    invoiceId
  )

  if (!invoice.eTaxInvoiceTarget) {
    throw new Error("먼저 이 청구를 세금계산서 대상으로 표시해 주세요.")
  }

  if (taxRow?.status === "issued") {
    throw new Error("이미 발행 완료된 세금계산서가 있습니다. 수정·재발행은 제공사 정책에 따릅니다.")
  }

  const { supply, vat, total } = computeTaxAmountsFromInvoice({
    invoiceAmount: invoice.amount,
    quote,
  })

  const supplyDate =
    invoice.eTaxInvoiceSupplyDate ?? new Date().toISOString().slice(0, 10)
  const issueDue = invoice.eTaxInvoiceIssueDueDate ?? null

  const providerId = settings.taxInvoiceProvider?.trim() ?? ""
  const aspProvider = providerId || null

  const insertOrUpdate = {
    user_id: userId,
    customer_id: customer.id,
    invoice_id: invoice.id,
    quote_id: invoice.quoteId ?? null,
    issue_type: "normal",
    status: "ready" as const,
    tax_type: "taxable",
    supply_date: supplyDate,
    issue_due_date: issueDue,
    total_supply_amount: supply,
    vat_amount: vat,
    total_amount: total,
    recipient_business_name:
      customer.taxBusinessName?.trim() || customer.companyName?.trim() || customer.name,
    recipient_business_number: customer.taxBusinessRegistrationNumber?.replace(/\D/g, "") ?? "",
    recipient_email: customer.taxInvoiceEmail?.trim() || customer.email?.trim() || "",
    recipient_ceo_name: customer.taxCeoName?.trim() || null,
    sender_business_name: settings.businessName,
    sender_business_number: settings.businessRegistrationNumber.replace(/\D/g, ""),
    sender_email: settings.email?.trim() || "",
    sender_ceo_name: settings.ownerName,
    sender_address: settings.taxInvoiceSupplierAddress?.trim() || null,
    asp_provider: aspProvider,
    failure_reason: null,
    updated_at: new Date().toISOString(),
  }

  let saved: TxRow
  if (taxRow) {
    const { data, error } = await supabase
      .from("tax_invoices")
      .update(insertOrUpdate)
      .eq("id", taxRow.id)
      .eq("user_id", userId)
      .select("*")
      .single()

    if (error) {
      throw error
    }
    saved = data as TxRow
  } else {
    const { data, error } = await supabase
      .from("tax_invoices")
      .insert({
        ...insertOrUpdate,
        asp_response_log: {},
      })
      .select("*")
      .single()

    if (error) {
      throw error
    }
    saved = data as TxRow
  }

  return mapTaxInvoiceRow(saved)
}

export async function issueTaxInvoiceForInvoice(
  supabase: SupabaseClient<Database>,
  userId: string,
  invoiceId: string
): Promise<TaxInvoice> {
  const { invoice, customer, settings, taxRow } = await loadInvoiceBundle(supabase, userId, invoiceId)

  if (!taxRow) {
    throw new Error("먼저 발행 준비를 실행해 주세요.")
  }

  if (taxRow.status === "issued") {
    throw new Error("이미 발행된 문서입니다.")
  }

  if (taxRow.status === "issuing") {
    throw new Error("발행 처리 중입니다. 잠시 후 상태를 새로고침해 주세요.")
  }

  const mapped = mapTaxInvoiceRow(taxRow)
  const readiness = validateTaxInvoiceReadiness({
    settings,
    customer,
    taxRow: mapped,
  })
  if (!readiness.ok) {
    throw new Error(readiness.issues[0]?.message ?? "발행 정보가 부족합니다.")
  }

  const providerId = settings.taxInvoiceProvider?.trim() ?? ""
  const provider = getTaxInvoiceProvider(providerId)
  if (!provider) {
    throw new Error("설정에서 전자세금계산서 ASP를 선택하고 연결 정보를 저장해 주세요.")
  }

  const config = settings.taxInvoiceProviderConfig ?? {}
  if (!config.enabled) {
    throw new Error("설정에서 전자세금계산서 연동 사용을 켜 주세요.")
  }

  const creds = credentialsFromConfig(config)
  const v = provider.validateConfig(creds)
  if (!v.ok) {
    throw new Error(v.message)
  }

  const { error: upIssuing } = await supabase
    .from("tax_invoices")
    .update({
      status: "issuing",
      failure_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taxRow.id)
    .eq("user_id", userId)

  if (upIssuing) {
    throw upIssuing
  }

  const payload = provider.createIssuePayload(mapped)
  payload.credentials = creds

  const result = await provider.issueTaxInvoice(payload)

  if (!result.ok) {
    await supabase
      .from("tax_invoices")
      .update({
        status: "failed",
        failure_reason: result.errorMessage,
        asp_response_log: (result.raw ?? { error: result.errorMessage }) as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taxRow.id)
      .eq("user_id", userId)
    throw new Error(result.errorMessage)
  }

  const { data: issued, error: issErr } = await supabase
    .from("tax_invoices")
    .update({
      status: "issued",
      issue_date: result.issuedAt ?? new Date().toISOString(),
      approval_number: result.approvalNumber ?? null,
      asp_document_id: result.documentId,
      asp_response_log: result.raw as unknown as Json,
      failure_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taxRow.id)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (issErr) {
    throw issErr
  }

  return mapTaxInvoiceRow(issued as TxRow)
}

export async function refreshTaxInvoiceStatus(
  supabase: SupabaseClient<Database>,
  userId: string,
  taxInvoiceId: string
): Promise<TaxInvoice> {
  const { data: row, error } = await supabase
    .from("tax_invoices")
    .select("*")
    .eq("id", taxInvoiceId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw error
  }
  if (!row) {
    throw new Error("세금계산서 행을 찾을 수 없습니다.")
  }

  const docId = row.asp_document_id?.trim()
  if (!docId) {
    return mapTaxInvoiceRow(row as TxRow)
  }

  const { data: bs } = await supabase
    .from("business_settings")
    .select("tax_invoice_provider, tax_invoice_provider_config")
    .eq("user_id", userId)
    .maybeSingle()

  const provider = getTaxInvoiceProvider(bs?.tax_invoice_provider ?? "")
  const config = parseAspConfig(bs?.tax_invoice_provider_config)
  if (!provider) {
    return mapTaxInvoiceRow(row as TxRow)
  }

  const creds = credentialsFromConfig(config)
  const st = await provider.getIssueStatus(docId, creds)

  if (!st.ok) {
    await supabase
      .from("tax_invoices")
      .update({
        failure_reason: st.errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taxInvoiceId)
      .eq("user_id", userId)
    throw new Error(st.errorMessage)
  }

  let newStatus: TaxInvoiceStatus = row.status as TaxInvoiceStatus
  if (st.status === "issued") {
    newStatus = "issued"
  } else if (st.status === "failed") {
    newStatus = "failed"
  } else if (st.status === "processing") {
    newStatus = "issuing"
  }

  const { data: updated, error: uErr } = await supabase
    .from("tax_invoices")
    .update({
      status: newStatus,
      approval_number: st.approvalNumber ?? row.approval_number,
      issue_date: st.issuedAt ?? row.issue_date,
      asp_response_log: st.raw as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taxInvoiceId)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (uErr) {
    throw uErr
  }

  return mapTaxInvoiceRow(updated as TxRow)
}
