import { NextResponse } from "next/server"
import QRCode from "qrcode"

export async function GET(request: Request) {
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
        "Cache-Control": "private, max-age=300",
      },
    })
  } catch {
    return NextResponse.json({ error: "qr_failed" }, { status: 500 })
  }
}
