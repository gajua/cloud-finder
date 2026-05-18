import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.shortName} — 내일 새벽 운해 가능성`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: 64,
          background: "linear-gradient(145deg, #0c4a6e 0%, #0c0a09 55%)",
          color: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#7dd3fc",
            }}
          >
            Cloud Finder
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: 56,
              fontWeight: 700,
              lineHeight: 1.15,
              maxWidth: 900,
            }}
          >
            내일 새벽, 운해가 올까요?
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 28,
              lineHeight: 1.45,
              color: "#cbd5e1",
              maxWidth: 880,
            }}
          >
            기상청 예보로 한국 주요 산의 운해 가능성을 지도에서 확인하세요.
          </p>
        </div>
        <p style={{ margin: 0, fontSize: 22, color: "#94a3b8" }}>
          북한산 · 설악산 · 지리산 등 8개 산
        </p>
      </div>
    ),
    { ...size },
  );
}
