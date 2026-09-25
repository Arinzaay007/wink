import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Wink — pay @username";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { handle: string } }) {
  const handle = (params.handle || "demo").replace(/^@/, "").toLowerCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#050505",
          color: "white",
          position: "relative",
        }}
      >
        {/* glow */}
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 600,
            height: 600,
            background: "radial-gradient(circle, rgba(255,31,61,0.18), transparent 70%)",
            borderRadius: "50%",
          }}
        />
        {/* wink face */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 20,
            filter: "drop-shadow(0 0 12px rgba(255,31,61,0.8))",
          }}
        >
          <div style={{ display: "flex", gap: 40, alignItems: "center", marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#ff1f3d" }} />
            <div
              style={{
                width: 60,
                height: 28,
                borderTop: "6px solid #ff1f3d",
                borderRadius: "50% 50% 0 0",
                transform: "translateY(8px)",
              }}
            />
          </div>
          <div
            style={{
              width: 100,
              height: 50,
              borderBottom: "6px solid #ff1f3d",
              borderRadius: "0 0 50% 50%",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            fontFamily: "Georgia, serif",
          }}
        >
          <span style={{ color: "white" }}>@{handle}</span>
          <span style={{ color: "#ff1f3d", marginLeft: 8 }}>.</span>
        </div>

        <div
          style={{
            marginTop: 16,
            fontSize: 28,
            color: "#a1a1aa",
            fontFamily: "monospace",
            letterSpacing: "0.02em",
          }}
        >
          pay me with a wink — winkpay.xyz
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 32,
            display: "flex",
            gap: 24,
            fontSize: 16,
            color: "#71717a",
            fontFamily: "monospace",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
          }}
        >
          <span>live on tempo</span>
          <span style={{ color: "#ff1f3d" }}>✦</span>
          <span>pathUSD</span>
          <span style={{ color: "#ff1f3d" }}>✦</span>
          <span>0% platform fee</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
