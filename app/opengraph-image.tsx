import { ImageResponse } from "next/og"

export const alt = "MyScriptic — Read, Discover & Earn"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 48,
            fontWeight: 800,
            marginBottom: 24,
          }}
        >
          M
        </div>
        <div style={{ color: "white", fontSize: 56, fontWeight: 700, marginBottom: 12 }}>
          MyScriptic
        </div>
        <div style={{ color: "#94a3b8", fontSize: 24, fontWeight: 400 }}>
          Read, Discover & Earn — eBooks, Audiobooks & Courses
        </div>
      </div>
    ),
    { ...size }
  )
}
