import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_SHORT, SITE_TAGLINE } from "@/lib/site";

export const dynamic = "force-static";

/**
 * Installable web app.
 *
 * `display: standalone` plus a maskable icon set, so adding it to a phone home screen
 * gives a white canvas rather than a browser chrome strip — the whole point of the
 * design.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — ${SITE_TAGLINE}`,
    short_name: SITE_SHORT,
    description: SITE_TAGLINE,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["travel", "lifestyle", "navigation"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Open the map", url: "/m" },
      { name: "Plan your days", url: "/plan" },
    ],
  };
}
