import { ImageResponse } from "next/og"

export const alt = "Bill-IO — 문의부터 수금까지 한 흐름으로"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(145deg, #f0fdf4 0%, #f8fafc 45%, #ecfeff 100%)",
          padding: 64,
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 16,
            background: "linear-gradient(135deg, #059669, #0d9488)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 36,
            fontWeight: 800,
            marginBottom: 28,
          }}
        >
          B
        </div>
        <div
          style={{
            fontSize: 52,
            fontWeight: 800,
            color: "#0f172a",
            lineHeight: 1.12,
            letterSpacing: -0.02,
            maxWidth: 980,
          }}
        >
          카톡·견적·청구 흩어져 있나요?
        </div>
        <div
          style={{
            fontSize: 34,
            fontWeight: 700,
            color: "#0f766e",
            marginTop: 16,
            maxWidth: 920,
            lineHeight: 1.2,
          }}
        >
          링크 하나로 접수 → 견적 → 청구 → 수금까지.
        </div>
        <div style={{ fontSize: 22, color: "#64748b", marginTop: 28, maxWidth: 800, lineHeight: 1.45 }}>
          소규모 사업자용 운영 플랫폼 Bill-IO
        </div>
      </div>
    ),
    { ...size }
  )
}
