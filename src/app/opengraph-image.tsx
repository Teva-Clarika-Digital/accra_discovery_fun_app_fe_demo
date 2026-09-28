import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Open Graph card.
 *
 * Built with the same tokens and the same four-door mark as the app icon, so a shared
 * link is visually continuous with the landing page. No external font is fetched — the
 * system default is enough for two words and a sentence.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#ffffff",
          padding: 80,
          color: "#0b0b0c",
        }}
      >
        <div style={{ display: "flex", gap: 20 }}>
          {["#e11d48", "#ea580c", "#0891b2", "#ca8a04"].map((color) => (
            <div
              key={color}
              style={{ width: 64, height: 64, borderRadius: 20, background: color }}
            />
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -2 }}>
            What to do in Accra, and when to do it.
          </div>
          <div style={{ fontSize: 30, color: "#45454b" }}>{SITE_TAGLINE}</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#78787f" }}>
          <span>{SITE_NAME}</span>
          <span>clubs · adventures · daycations · food</span>
        </div>
      </div>
    ),
    size,
  );
}
