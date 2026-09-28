/**
 * Site-wide constants. One place to change the name, the tagline and the canonical
 * origin, so metadata, the footer and the share links can never disagree.
 */

export const SITE_NAME = "Esther's Hangout App";

export const SITE_TAGLINE = "What to do in Accra, and when to do it.";

export const SITE_DESCRIPTION =
  "A map of clubs, adventures, daycation trips and food around Accra — with the best time to go for every place, drive times, and a five-day planner that understands Ghanaian traffic.";

export const SITE_SHORT = "Accra, timed right.";

/**
 * `NEXT_PUBLIC_SITE_URL` is the deployed origin. An empty or whitespace value is treated
 * the same as unset (Vercel commonly exposes an empty variable), and the fallback is
 * localhost so `next build` and local `next start` never emit production URLs by accident.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000"
).replace(/\/+$/, "");

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/m", label: "Map" },
  { href: "/list", label: "List" },
  { href: "/plan", label: "Plan" },
  { href: "/table", label: "Table" },
] as const;

/** The four landing doors, in the order they must appear. */
export const COLLECTION_ORDER = [
  "nightlife",
  "adventures",
  "daycations",
  "food",
] as const;
