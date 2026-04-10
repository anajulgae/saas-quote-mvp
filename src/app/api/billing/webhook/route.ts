import { NextResponse } from "next/server"

import { handleBillingWebhook } from "@/lib/server/billing-service"

export async function POST(request: Request) {
  const result = await handleBillingWebhook(request)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ ok: true, skipped: result.skipped ?? false })
}
