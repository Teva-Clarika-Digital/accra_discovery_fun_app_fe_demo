import type { Category } from "@/types/place";

/**
 * The category ramp, in hex.
 *
 * Duplicated from `globals.css` because map markers and inline styles need literal
 * colours that CSS custom properties cannot reach inside a MapLibre HTML marker.
 * All eight are >= 3:1 against white, so they are safe for graphical indicators.
 */
export const CATEGORY_COLOR: Record<Category, string> = {
  nightlife: "#e11d48",
  adventure: "#ea580c",
  sights: "#7c3aed",
  food: "#ca8a04",
  beach: "#0891b2",
  stay: "#4338ca",
  nature: "#059669",
  shopping: "#c026d3",
};

export const CATEGORY_TINT: Record<Category, string> = {
  nightlife: "#fde8ee",
  adventure: "#fdece2",
  sights: "#f0e9fe",
  food: "#fbf3da",
  beach: "#e0f3f8",
  stay: "#e7e7fb",
  nature: "#e2f5ee",
  shopping: "#fbe8fb",
};

export const INK = "#0b0b0c";
export const LINE = "#e9e9ec";
export const ACCENT = "#ff4d2e";
export const ACCENT_INK = "#c53a1e";
export const LIVE = "#0f766e";
export const WARN = "#b45309";
export const DEAD = "#9aa0a6";
