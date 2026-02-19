import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Decorative gradient orb */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            right: "-120px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(16,185,129,0.25) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "-80px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(20,184,166,0.2) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Icon */}
        <div
          style={{
            width: "88px",
            height: "88px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #059669, #14b8a6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "32px",
            boxShadow: "0 8px 32px rgba(16,185,129,0.4)",
          }}
        >
          <span style={{ fontSize: "44px" }}>🌊</span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "64px",
            fontWeight: 700,
            background: "linear-gradient(90deg, #10b981, #14b8a6)",
            backgroundClip: "text",
            color: "transparent",
            lineHeight: 1.1,
            marginBottom: "16px",
            display: "flex",
          }}
        >
          OpenChat
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "28px",
            color: "#8b949e",
            marginBottom: "40px",
            display: "flex",
          }}
        >
          Free AI Chat Powered by Venice
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: "flex",
            gap: "12px",
          }}
        >
          {["Text Generation", "Image Creation", "Code Assistant", "Web Search", "File Analysis"].map(
            (feature) => (
              <div
                key={feature}
                style={{
                  padding: "10px 20px",
                  borderRadius: "999px",
                  border: "1px solid rgba(16,185,129,0.3)",
                  background: "rgba(16,185,129,0.1)",
                  color: "#10b981",
                  fontSize: "18px",
                  fontWeight: 500,
                  display: "flex",
                }}
              >
                {feature}
              </div>
            ),
          )}
        </div>

        {/* Footer note */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            fontSize: "18px",
            color: "#484f58",
            display: "flex",
          }}
        >
          No sign-up required · Privacy-focused · Open source
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
