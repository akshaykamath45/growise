import { ImageResponse } from "next/og";

export const alt = "Growise — Learn what you’ll actually use next";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          color: "#F8F7FC",
          background: "#151827",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 620,
            height: 620,
            right: -130,
            top: -180,
            borderRadius: "50%",
            background: "radial-gradient(circle, #7468E0 0%, rgba(116,104,224,0) 70%)",
            opacity: 0.75,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 480,
            height: 480,
            right: 90,
            bottom: -250,
            borderRadius: "50%",
            border: "2px solid rgba(180,173,255,.45)",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", position: "relative", zIndex: 1, maxWidth: 760 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 700 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                background: "linear-gradient(135deg, #8B7DFF, #5140D4)",
              }}
            >
              ✦
            </div>
            Growise
          </div>
          <div style={{ marginTop: 105, fontSize: 70, lineHeight: 1.08, letterSpacing: -3, fontWeight: 700 }}>
            Learn what you’ll actually use next.
          </div>
          <div style={{ marginTop: 30, color: "#C8C9D7", fontSize: 30, lineHeight: 1.35 }}>
            Adaptive learning paths shaped around what you explore.
          </div>
        </div>
      </div>
    ),
    size
  );
}
