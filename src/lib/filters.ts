import {
  CATEGORIES,
  VENUE_TYPES,
  VIBES,
  type Category,
  type Place,
  type PriceTier,
  type VenueType,
  type Vibe,
} from "@/types/place";
import { haversineKm, type LatLng } from "./geo";
import { bestTimeAdvice, type TimeContext } from "./best-time";
import { dayIndexFor, isOpenAt, minutesOfDay } from "./hours";
import { normalizeText } from "./utils";

/**
 * Discovery: search, multi-facet filtering and sorting.
 *
 * The drive-time cap defaults to 120 minutes because the brief said "within an hour of
 * Accra" — but it is a *default*, not a rule, and collection pages clear it.
 */

export type SortKey = "best" | "drive" | "name" | "energy";

export const SORT_LABEL: Record<SortKey, string> = {
  best: "Best time now",
  drive: "Closest first",
  name: "A – Z",
  energy: "Most intense",
};

export const DRIVE_CAP_OPTIONS = [30, 60, 90, 120, 180, 240, 480] as const;

export type Filters = {
  readonly q: string;
  readonly categories: readonly Category[];
  readonly vibes: readonly Vibe[];
  readonly venueTypes: readonly VenueType[];
  /** `null` means "no distance cap". */
  readonly maxDriveMinutes: number | null;
  readonly openNow: boolean;
  /** `null` means "either". */
  readonly outdoors: boolean | null;
  readonly priceTiers: readonly PriceTier[];
  readonly includeDormant: boolean;
};

export const DEFAULT_FILTERS: Filters = {
  q: "",
  categories: [],
  vibes: [],
  venueTypes: [],
  maxDriveMinutes: 120,
  openNow: false,
  outdoors: null,
  priceTiers: [],
  includeDormant: false,
};

export const NO_DRIVE_CAP: Filters = { ...DEFAULT_FILTERS, maxDriveMinutes: null };

export function isDefaultFilters(filters: Filters): boolean {
  return (
    filters.q.trim() === "" &&
    filters.categories.length === 0 &&
    filters.vibes.length === 0 &&
    filters.venueTypes.length === 0 &&
    filters.maxDriveMinutes === DEFAULT_FILTERS.maxDriveMinutes &&
    !filters.openNow &&
    filters.outdoors === null &&
    filters.priceTiers.length === 0 &&
    !filters.includeDormant
  );
}

export function activeFilterCount(filters: Filters): number {
  let n = 0;
  n += filters.categories.length;
  n += filters.vibes.length;
  n += filters.venueTypes.length;
  n += filters.priceTiers.length;
  if (filters.maxDriveMinutes !== DEFAULT_FILTERS.maxDriveMinutes) n += 1;
  if (filters.openNow) n += 1;
  if (filters.outdoors !== null) n += 1;
  return n;
}

function haystack(place: Place): string {
  return normalizeText(
    [
      place.name,
      place.tagline,
      place.area,
      place.region,
      place.category,
      place.venueType ?? "",
      place.vibes.join(" "),
      place.activities.join(" "),
    ].join(" "),
  );
}

const HAYSTACK_CACHE = new WeakMap<Place, string>();

function cachedHaystack(place: Place): string {
  let value = HAYSTACK_CACHE.get(place);
  if (value === undefined) {
    value = haystack(place);
    HAYSTACK_CACHE.set(place, value);
  }
  return value;
}

export function matchesQuery(place: Place, query: string): boolean {
  const q = normalizeText(query.trim());
  if (!q) return true;
  const hay = cachedHaystack(place);
  return q
    .split(/\s+/)
    .every((token) => token.length > 0 && hay.includes(token));
}

export function matchesFacets(place: Place, filters: Filters): boolean {
  if (!filters.includeDormant && place.status === "closed") return false;
  if (filters.categories.length > 0 && !filters.categories.includes(place.category)) {
    return false;
  }
  if (filters.vibes.length > 0 && !place.vibes.some((v) => filters.vibes.includes(v))) {
    return false;
  }
  if (
    filters.venueTypes.length > 0 &&
    (place.venueType === undefined || !filters.venueTypes.includes(place.venueType))
  ) {
    return false;
  }
  if (
    filters.maxDriveMinutes !== null &&
    place.driveMinutes > filters.maxDriveMinutes
  ) {
    return false;
  }
  if (filters.outdoors !== null && place.outdoors !== filters.outdoors) return false;
  if (
    filters.priceTiers.length > 0 &&
    !filters.priceTiers.includes(place.priceTier)
  ) {
    return false;
  }
  return true;
}

export function matchesOpenNow(
  place: Place,
  filters: Filters,
  ctx: TimeContext,
): boolean {
  if (!filters.openNow) return true;
  return isOpenAt(place.hours, dayIndexFor(ctx.at), minutesOfDay(ctx.at));
}

export function filterPlaces(
  places: readonly Place[],
  filters: Filters,
  ctx: TimeContext = { at: new Date() },
): Place[] {
  return places.filter(
    (place) =>
      matchesQuery(place, filters.q) &&
      matchesFacets(place, filters) &&
      matchesOpenNow(place, filters, ctx),
  );
}

export function sortPlaces(
  places: readonly Place[],
  sort: SortKey,
  ctx: TimeContext = { at: new Date() },
  origin?: LatLng,
): Place[] {
  const out = [...places];
  switch (sort) {
    case "name":
      return out.sort((a, b) => a.name.localeCompare(b.name));
    case "energy":
      return out.sort((a, b) => b.energy - a.energy || a.name.localeCompare(b.name));
    case "drive":
      return out.sort(
        (a, b) =>
          a.driveMinutes - b.driveMinutes || a.name.localeCompare(b.name),
      );
    case "best":
    default: {
      const ref = origin;
      return out.sort((a, b) => {
        const scoreA = bestTimeAdvice(a, ctx).score;
        const scoreB = bestTimeAdvice(b, ctx).score;
        if (scoreB !== scoreA) return scoreB - scoreA;
        if (ref) {
          const dA = haversineKm(ref, a);
          const dB = haversineKm(ref, b);
          if (dA !== dB) return dA - dB;
        }
        return a.driveMinutes - b.driveMinutes;
      });
    }
  }
}

export function searchAndSort(
  places: readonly Place[],
  filters: Filters,
  sort: SortKey,
  ctx: TimeContext = { at: new Date() },
  origin?: LatLng,
): Place[] {
  return sortPlaces(filterPlaces(places, filters, ctx), sort, ctx, origin);
}

export function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export { CATEGORIES, VIBES, VENUE_TYPES };
