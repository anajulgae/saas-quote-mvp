import { NextResponse } from "next/server"
import QRCode from "qrcode"

import { getSiteOrigin } from "@/lib/site-url"

const rateMap = new Map<string, number[]>()
const RATE_WINDOW_MS = 60_000
const RATE_LIMIT = 30

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = rateMap.get(ip) ?? []
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_LIMIT) return true
  recent.push(now)
  rateMap.set(ip, recent)
  return false
}

export async function GET(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const url = searchParams.get("url")
  if (!url || url.length > 2048) {
    return NextResponse.json({ error: "url required" }, { status: 400 })
  }

  try {
    const u = new URL(url)
    if (!["http:", "https:"].includes(u.protocol)) {
      return NextResponse.json({ error: "invalid protocol" }, { status: 400 })
    }
    const siteHost = new URL(getSiteOrigin()).hostname
    if (u.hostname !== siteHost && u.hostname !== "localhost") {
      return NextResponse.json({ error: "domain_not_allowed" }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 })
  }

  try {
    const png = await QRCode.toBuffer(url, {
      type: "png",
      width: 280,
      margin: 2,
      errorCorrectionLevel: "M",
    })
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    })
  } catch {
    return NextResponse.json({ error: "qr_failed" }, { status: 500 })
  }
}
