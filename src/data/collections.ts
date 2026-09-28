import { PLACES, RECOMMENDABLE } from "./index";
import { contextFrom, countOpenNow, type TimeContext } from "@/lib/best-time";
import type { Category, Place, RadiusBand, VenueType, Vibe } from "@/types/place";

/**
 * Collections — the four big doors on the landing page.
 *
 * A collection is a *curated* subset, not a category filter. "Daycation Trips" in
 * particular has no equivalent in the category taxonomy: it is defined by distance.
 * Each collection owns its own copy, its own glyph and its own map centre, so
 * `/c/daycations` feels like a deliberately-designed page rather than the same map with
 * a filter switched on.
 *
 * Every collection is a real route (`/c/[id]`), which makes "here are the best
 * adventures near Accra" a URL you can send to a friend.
 *
 * The filter shape below is a plain TypeScript type rather than a Zod schema: it is
 * static, in-repo configuration, never user input, so TypeScript already guarantees
 * every collection is well formed. Runtime validation here would be ceremony.
 */

export type CollectionFilter = {
  /** Match when *any* of these clauses hit (default) or *all* of them. */
  readonly mode: "any" | "all";
  readonly categories?: readonly Category[];
  readonly venueTypes?: readonly VenueType[];
  readonly radius?: readonly RadiusBand[];
  readonly vibes?: readonly Vibe[];
  readonly activityKeywords?: readonly string[];
  readonly minDriveMinutes?: number;
  /** Include places not marked `active`. Off by default — never recommend a dead venue. */
  readonly includeDormant?: boolean;
};

export type Collection = {
  readonly id: string;
  /** Card headline, rendered verbatim. Two or three words. */
  readonly title: string;
  readonly blurb: string;
  readonly intro: string;
  /** A single glyph. No stock photography, no icon font. */
  readonly glyph: string;
  /** Accent token name — see `globals.css`. */
  readonly accent: Category | "beach";
  readonly center: {
    readonly lat: number;
    readonly lng: number;
    readonly zoom: number;
  };
  readonly filter: CollectionFilter;
  /** One-line stat shown on the card, e.g. "1 h 35 m max". */
  readonly stat: (source: readonly Place[]) => string;
};

const FOOD_KEYWORDS = [
  "street food",
  "grilled fish",
  "seafood",
  "food court",
  "ghanaian",
  "waakye",
  "market",
  "jollof",
  "banku",
  "mix grill",
  "west african",
] as const satisfies readonly string[];

export function isFoodKeyword(activity: string): boolean {
  return FOOD_KEYWORDS.some((keyword) => activity.toLowerCase().includes(keyword));
}

export const COLLECTIONS: readonly Collection[] = [
  {
    id: "nightlife",
    title: "Night Life",
    blurb: "Clubs, lounges, pubs and beach bars — plus what is open right now.",
    intro:
      "Accra's nightlife splits into real clubs, lounges, pubs and beach clubs, and the difference matters. Every entry below says which one it is, when it opens, and whether it is open at the moment you are looking.",
    glyph: "◐",
    accent: "nightlife",
    center: { lat: 5.5705, lng: -0.189, zoom: 12 },
    filter: {
      mode: "all",
      categories: ["nightlife"],
      includeDormant: true,
    },
    stat: (source) => {
      const hotels = source.filter((p) => p.outdoors === false).length;
      return `${source.length} spots · ${hotels} indoors`;
    },
  },
  {
    id: "adventures",
    title: "Adventures",
    blurb: "Quad bikes, jet skis, abseiling, rafting, kayaking and real hikes.",
    intro:
      "The adrenaline end of the list: paid, high-energy activities you actually have to do something on. Charming gardens and viewpoints are deliberately not here — they are lovely, but they are not adventures.",
    glyph: "△",
    accent: "adventure",
    center: { lat: 5.95, lng: -0.25, zoom: 9.9 },
    filter: { mode: "all", categories: ["adventure"] },
    stat: (source) => {
      const peak = source.reduce((max, p) => Math.max(max, p.energy), 0);
      return `${source.length} activities · up to ${peak}/5 energy`;
    },
  },
  {
    id: "daycations",
    title: "Daycation Trips",
    blurb: "Everything worth leaving the city for: Kusomombo, Ada Foah, Wli, Cape Coast.",
    intro:
      "These replace a day rather than join one. Each entry shows its real drive time from central Accra, and anything past about two hours is flagged so you do not try to club and commute in the same evening.",
    glyph: "→",
    accent: "beach",
    center: { lat: 6.1, lng: -0.25, zoom: 9 },
    filter: { mode: "all", radius: ["mid", "far"] },
    stat: (source) => {
      const max = source.reduce((m, p) => Math.max(m, p.driveMinutes), 0);
      const h = Math.floor(max / 60);
      return `${source.length} trips · up to ${h} h out`;
    },
  },
  {
    id: "food",
    title: "Food",
    blurb: "Street food, markets, restaurants and grilled fish on the sand.",
    intro:
      "From Osu's street grills to Makola's food market and the seafood stands along the La Bypass strip. Good food is the one thing in Accra that is never a bad decision.",
    glyph: "●",
    accent: "food",
    center: { lat: 5.565, lng: -0.181, zoom: 12.3 },
    filter: {
      mode: "any",
      categories: ["food"],
      venueTypes: ["restaurant", "market"],
      activityKeywords: FOOD_KEYWORDS,
      includeDormant: true,
    },
    stat: (source) => {
      const cheap = source.filter((p) => p.priceTier <= 1).length;
      return `${source.length} places · ${cheap} budget`;
    },
  },
] as const;

const BY_ID = new Map(COLLECTIONS.map((c) => [c.id, c]));

export function getCollection(id: string): Collection | undefined {
  return BY_ID.get(id);
}

export function isCollectionId(id: string): boolean {
  return BY_ID.has(id);
}

function matchesKeyword(place: Place, keywords: readonly string[]): boolean {
  return place.activities.some((activity) =>
    keywords.some((keyword) => activity.toLowerCase().includes(keyword)),
  );
}

/** Apply a collection's filter to a set of places. */
export function placesInCollection(
  id: string,
  source: readonly Place[] = PLACES,
): Place[] {
  const collection = BY_ID.get(id);
  if (!collection) return [];
  const { filter } = collection;

  return source.filter((place) => {
    if (!filter.includeDormant && place.status !== "active") return false;

    const clauses: boolean[] = [];
    if (filter.categories) {
      clauses.push(filter.categories.includes(place.category));
    }
    if (filter.venueTypes) {
      clauses.push(
        place.venueType !== undefined && filter.venueTypes.includes(place.venueType),
      );
    }
    if (filter.radius) {
      clauses.push(filter.radius.includes(place.radius));
    }
    if (filter.vibes) {
      clauses.push(place.vibes.some((v: Vibe) => filter.vibes?.includes(v)));
    }
    if (filter.activityKeywords) {
      clauses.push(matchesKeyword(place, filter.activityKeywords));
    }
    if (typeof filter.minDriveMinutes === "number") {
      clauses.push(place.driveMinutes >= filter.minDriveMinutes);
    }
    if (clauses.length === 0) return true;
    return filter.mode === "all"
      ? clauses.every(Boolean)
      : clauses.some(Boolean);
  });
}

/**
 * Which slice of the dataset a collection is allowed to see.
 *
 * Collections that deliberately include unconfirmed venues (nightlife, food) see every
 * record; the rest only ever see `RECOMMENDABLE`, so a dormant venue can never end up
 * on the Adventures card.
 */
function collectionSource(collection: Collection): readonly Place[] {
  return collection.filter.includeDormant ? PLACES : RECOMMENDABLE;
}

/** Count shown on a landing card: active places by default. */
export function collectionStat(id: string): string {
  const collection = BY_ID.get(id);
  if (!collection) return "";
  return collection.stat(placesInCollection(id, collectionSource(collection)));
}

export type CollectionCounts = {
  readonly places: number;
  readonly openNow: number;
};

/**
 * The number on a landing card. The scope asks for a real figure rather than stock art —
 * `"12 places · 4 open now"` — because a live count makes the page feel like it is
 * actually looking at Accra tonight.
 */
export function collectionCounts(
  id: string,
  ctx: TimeContext = contextFrom(),
): CollectionCounts {
  const collection = BY_ID.get(id);
  if (!collection) return { places: 0, openNow: 0 };
  const places = placesInCollection(id, collectionSource(collection));
  return { places: places.length, openNow: countOpenNow(places, ctx) };
}

export function collectionVibes(id: string): Vibe[] {
  const seen = new Set<Vibe>();
  for (const place of placesInCollection(id)) {
    for (const vibe of place.vibes) seen.add(vibe);
  }
  return [...seen];
}

export type { Category, RadiusBand };
