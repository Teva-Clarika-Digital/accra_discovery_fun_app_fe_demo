/**
 * Core domain types for Esther's Hangout App.
 *
 * The `Place` record is the atomic unit of the product. Everything the UI renders
 * derives from it, and every field below has a job — see `docs/project_scope.md` §4.
 */

export const CATEGORIES = [
  "nightlife",
  "adventure",
  "sights",
  "food",
  "beach",
  "stay",
  "nature",
  "shopping",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  nightlife: "Nightlife",
  adventure: "Adventure",
  sights: "Sights",
  food: "Food",
  beach: "Beach",
  stay: "Stay",
  nature: "Nature",
  shopping: "Shopping",
};

/**
 * `venueType` exists because "Bloom Bar is a lounge, not a club" (see session log).
 * A "lounge" is not an acceptable answer to "where do we dance?".
 */
export const VENUE_TYPES = [
  "nightclub",
  "lounge",
  "pub",
  "beach-club",
  "club-hotel",
  "hotel",
  "resort",
  "garden",
  "waterfall",
  "beach",
  "landmark",
  "market",
  "mall",
  "restaurant",
  "museum",
  "bridge",
  "lake",
  "monument",
  "viewpoint",
  "national-park",
  "hill",
  "river",
  "town",
  "village",
  "zoo",
  "stadium",
] as const;
export type VenueType = (typeof VENUE_TYPES)[number];

export const VENUE_TYPE_LABEL: Record<VenueType, string> = {
  nightclub: "Nightclub",
  lounge: "Lounge",
  pub: "Pub",
  "beach-club": "Beach club",
  "club-hotel": "Hotel + club",
  hotel: "Hotel",
  resort: "Resort",
  garden: "Garden",
  waterfall: "Waterfall",
  beach: "Beach",
  landmark: "Landmark",
  market: "Market",
  mall: "Mall",
  restaurant: "Restaurant",
  museum: "Museum",
  bridge: "Bridge",
  lake: "Lake",
  monument: "Monument",
  viewpoint: "Viewpoint",
  "national-park": "National park",
  hill: "Hill",
  river: "River",
  town: "Town",
  village: "Village",
  zoo: "Zoo",
  stadium: "Stadium",
};

/**
 * `vibe` is the subjective feel of a place, deliberately separate from `category`.
 * Directly answers "Aburi Botanical Gardens is not so much of an adventure".
 */
export const VIBES = [
  "chill",
  "culture",
  "adventure",
  "nightlife",
  "scenic",
  "romantic",
  "party",
  "shopping",
] as const;
export type Vibe = (typeof VIBES)[number];

export const VIBE_LABEL: Record<Vibe, string> = {
  chill: "Chill",
  culture: "Culture",
  adventure: "Adventure",
  nightlife: "Nightlife",
  scenic: "Scenic",
  romantic: "Romantic",
  party: "Party",
  shopping: "Shopping",
};

export const REGIONS = [
  "Greater Accra",
  "Eastern",
  "Volta",
  "Western",
  "Central",
  "Ashanti",
] as const;
export type Region = (typeof REGIONS)[number];

/** 0 = free/cheap, 3 = splurge. Deliberately tier-only: numbers rot, tiers don't. */
export type PriceTier = 0 | 1 | 2 | 3;
export const PRICE_LABEL: Record<PriceTier, string> = {
  0: "Free",
  1: "$",
  2: "$$",
  3: "$$$",
};

/**
 * `status` answers the "is it still active?" question that the source research got
 * wrong once already (Legon Botanical Gardens). Only `active` places are ever
 * recommended by the planner or the "tonight" banner.
 */
export const PLACE_STATUSES = ["active", "dormant", "closed"] as const;
export type PlaceStatus = (typeof PLACE_STATUSES)[number];

export const STATUS_LABEL: Record<PlaceStatus, string> = {
  active: "Open",
  dormant: "Unconfirmed",
  closed: "Closed",
};

/** How far a human needs to travel from the Accra reference point. */
export type RadiusBand = "accra" | "near" | "mid" | "far";
export const RADIUS_LABEL: Record<RadiusBand, string> = {
  accra: "In Accra",
  near: "Under an hour",
  mid: "1–2 hours",
  far: "Day trip",
};

/** 0 = Sunday … 6 = Saturday (matches `Date#getDay`). */
export const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export const DAY_LABEL: Record<DayKey, string> = {
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
};

export const DAY_SHORT: Record<DayKey, string> = {
  sun: "Sun",
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
};

export type DayHours =
  | { readonly kind: "closed" }
  | { readonly kind: "allday" }
  | {
      readonly kind: "hours";
      /** Minutes from midnight. May be > 1440 for "past midnight" closing times. */
      readonly opens: number;
      readonly closes: number;
    };

export type WeeklyHours = { readonly [K in DayKey]: DayHours };

export const DAY_PARTS = [
  "dawn",
  "morning",
  "afternoon",
  "sunset",
  "evening",
  "night",
  "late",
] as const;
export type DayPart = (typeof DAY_PARTS)[number];

export const DAY_PART_LABEL: Record<DayPart, string> = {
  dawn: "Early morning",
  morning: "Morning",
  afternoon: "Afternoon",
  sunset: "Golden hour",
  evening: "Evening",
  night: "Night",
  late: "Late night",
};

export type BestTimes = {
  /** Ordered sweet spots. The first one that is currently reachable wins. */
  readonly ideal: readonly DayPart[];
  /** Human label for the ideal window, e.g. "18:00 – 20:00". */
  readonly idealWindow?: string;
  /** Quieter days (0 = Sunday). */
  readonly quietDays?: readonly number[];
  /** Busiest days (0 = Sunday). */
  readonly busyDays?: readonly number[];
  /** Does it hold up when it rains? */
  readonly goodInRain?: boolean;
  /** Verbatim reasons shown in the UI. */
  readonly why: readonly string[];
  /** Practical warning, e.g. "book 2–3 days ahead for Saturday tables". */
  readonly caution?: string;
};

export type Booking = {
  readonly phone?: string;
  readonly phoneDisplay?: string;
  readonly website?: string;
  readonly note?: string;
};

export type Place = {
  readonly id: string;
  readonly name: string;
  readonly tagline: string;
  readonly category: Category;
  readonly venueType?: VenueType;
  readonly area: string;
  readonly region: Region;
  readonly address?: string;
  readonly lat: number;
  readonly lng: number;
  readonly priceTier: PriceTier;
  /** Driving minutes from the Accra reference point. */
  readonly driveMinutes: number;
  readonly radius: RadiusBand;
  readonly vibes: readonly Vibe[];
  /** How hard it hits, 1 (very mellow) – 5 (very intense). */
  readonly energy: 1 | 2 | 3 | 4 | 5;
  readonly outdoors: boolean;
  readonly activities: readonly string[];
  readonly hours: WeeklyHours;
  readonly bestTimes: BestTimes;
  readonly booking?: Booking;
  readonly mapsUrl?: string;
  readonly status: PlaceStatus;
  /** ISO date (YYYY-MM-DD) of the last human check. */
  readonly lastVerified: string;
  /** Provenance for the record. */
  readonly source?: string;
  readonly verification: "verified" | "unverified";
  /** Is the map pin exact or eyeballed? */
  readonly pinAccuracy: "exact" | "approximate";
  readonly notes?: string;
  readonly dressCode?: string;
  readonly costNote?: string;
};

export type PlaceDraft = Omit<Place, "id" | "vibes"> & {
  readonly id?: string;
  readonly vibes: readonly Vibe[];
};
