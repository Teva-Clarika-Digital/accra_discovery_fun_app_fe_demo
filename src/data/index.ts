import type { Place } from "@/types/place";
import { assertDataset } from "./schema";
import { TIER_1 } from "./tier1";
import { TIER_2 } from "./tier2";
import { TIER_3A } from "./tier3-accra";
import { TIER_3B } from "./tier3-daycations";
import { TIER_4 } from "./tier4-extras";

/**
 * The single dataset boundary.
 *
 * Merges the research tiers, validates the whole thing once, and exposes the derived
 * lookups the rest of the app needs. Validation is deliberately eager: a bad record
 * must fail `next build`, never the UI.
 *
 * Tiers, in order of how much we trust them:
 *   tier1        — detailed in `request.pdf` (AI research, unconfirmed)
 *   tier2        — mentioned in `request.pdf`, no details given
 *   tier3-accra  — in-city additions (high-confidence, well-known venues)
 *   tier3-daycat — out-of-city daycations
 *   tier4        — added to give the four landing cards enough substance
 */
const ALL_PLACES: readonly Place[] = [
  ...TIER_1,
  ...TIER_2,
  ...TIER_3A,
  ...TIER_3B,
  ...TIER_4,
];

assertDataset(ALL_PLACES);

export const PLACES: readonly Place[] = [...ALL_PLACES].sort((a, b) =>
  a.name.localeCompare(b.name),
);

const BY_ID = new Map(PLACES.map((place) => [place.id, place]));

export function getPlace(id: string): Place | undefined {
  return BY_ID.get(id);
}

export function placesByIds(ids: readonly string[]): Place[] {
  return ids
    .map((id) => BY_ID.get(id))
    .filter((place): place is Place => place !== undefined);
}

/** Only these are ever recommended by the planner, the banner or the "tonight" filter. */
export const RECOMMENDABLE: readonly Place[] = PLACES.filter(
  (p) => p.status === "active",
);

export const DATA_TIERS = {
  tier1: TIER_1.length,
  tier2: TIER_2.length,
  tier3Accra: TIER_3A.length,
  tier3Daycations: TIER_3B.length,
  tier4: TIER_4.length,
  total: PLACES.length,
  active: RECOMMENDABLE.length,
} as const;

export { TIER_1, TIER_2, TIER_3A, TIER_3B, TIER_4 };
