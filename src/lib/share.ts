import {
  CATEGORIES,
  VENUE_TYPES,
  VIBES,
  type Category,
  type Vibe,
} from "@/types/place";
import { ACCRA_CENTER } from "./geo";
import { DEFAULT_FILTERS, type Filters, type SortKey } from "./filters";
import { clamp } from "./utils";

/**
 * The share contract.
 *
 * "Share any map view" is the growth loop of this app, so map state has to survive a
 * round-trip through a URL exactly. One versioned query string, one encoder, one
 * decoder, and tests proving they are inverses.
 *
 * Shape:  /m?v=1&c=5.6037,-0.187,12.1&f=nightlife.adventure&d=120&o=1&t=nightlife&s=ace-nightclub
 *
 *   c  camera  lat,lng,zoom
 *   f  categories (dot separated)
 *   w  vibes
 *   d  max drive minutes ("n" for no cap)
 *   o  open now (1)
 *   n  outdoors only (1) / indoors only (2)
 *   r  include dormant (1)
 *   t  sort key
 *   q  search text
 *   s  selected place id
 *   g  collection id
 */

export const STATE_VERSION = "1";

export type MapState = {
  readonly center: { readonly lat: number; readonly lng: number; readonly zoom: number };
  readonly collection: string | null;
  readonly filters: Filters;
  readonly sort: SortKey;
  readonly selectedId: string | null;
};

export const DEFAULT_STATE: MapState = {
  center: ACCRA_CENTER,
  collection: null,
  filters: DEFAULT_FILTERS,
  sort: "best",
  selectedId: null,
};

const SORTS: readonly SortKey[] = ["best", "drive", "name", "energy"];

const inList = <T extends string>(list: readonly T[], values: readonly string[]): T[] => {
  const parts = values.flatMap((value) => value.split(".")).filter(Boolean);
  return parts.filter((part): part is T => (list as readonly string[]).includes(part));
};

function num(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function flag(value: string | null): boolean {
  return value === "1";
}

export function encodeState(state: MapState): string {
  const params = new URLSearchParams();
  params.set("v", STATE_VERSION);
  params.set(
    "c",
    [
      state.center.lat.toFixed(4),
      state.center.lng.toFixed(4),
      state.center.zoom.toFixed(2),
    ].join(","),
  );
  if (state.collection) params.set("g", state.collection);

  const { filters, sort, selectedId } = state;
  if (filters.categories.length > 0) params.set("f", filters.categories.join("."));
  if (filters.vibes.length > 0) params.set("w", filters.vibes.join("."));
  if (filters.venueTypes.length > 0) params.set("y", filters.venueTypes.join("."));
  if (filters.priceTiers.length > 0) {
    params.set("p", filters.priceTiers.join("."));
  }
  if (filters.maxDriveMinutes !== DEFAULT_FILTERS.maxDriveMinutes) {
    params.set("d", filters.maxDriveMinutes === null ? "n" : String(filters.maxDriveMinutes));
  }
  if (filters.openNow) params.set("o", "1");
  if (filters.outdoors !== null) params.set("n", filters.outdoors ? "1" : "2");
  if (filters.includeDormant) params.set("r", "1");
  if (sort !== "best") params.set("t", sort);
  if (filters.q.trim()) params.set("q", filters.q.trim().slice(0, 60));
  if (selectedId) params.set("s", selectedId);

  return params.toString();
}

export function decodeState(input: URLSearchParams | string): MapState {
  const params =
    typeof input === "string" ? new URLSearchParams(input) : input;

  const raw = params.get("c")?.split(",").map(Number) ?? [];
  const lat = Number.isFinite(raw[0]) ? (raw[0] as number) : ACCRA_CENTER.lat;
  const lng = Number.isFinite(raw[1]) ? (raw[1] as number) : ACCRA_CENTER.lng;
  const zoom = Number.isFinite(raw[2]) ? (raw[2] as number) : ACCRA_CENTER.zoom;

  const drive = params.get("d");
  const maxDriveMinutes =
    drive === null
      ? DEFAULT_FILTERS.maxDriveMinutes
      : drive === "n"
        ? null
        : clamp(Math.round(num(drive, 120)), 5, 480);

  const outdoorFlag = params.get("n");

  const sortRaw = params.get("t") as SortKey | null;

  return {
    center: {
      lat: clamp(lat, -90, 90),
      lng: clamp(lng, -180, 180),
      zoom: clamp(zoom, 1, 20),
    },
    collection: params.get("g"),
    filters: {
      q: (params.get("q") ?? "").trim(),
      categories: inList<Category>(CATEGORIES, params.getAll("f")),
      vibes: inList<Vibe>(VIBES, params.getAll("w")),
      venueTypes: inList((VENUE_TYPES as readonly string[]), params.getAll("y")) as Filters["venueTypes"][number][],
      maxDriveMinutes,
      openNow: flag(params.get("o")),
      outdoors:
        outdoorFlag === "1" ? true : outdoorFlag === "2" ? false : null,
      priceTiers: inList(["0", "1", "2", "3"] as const, params.getAll("p")).map(
        (tier) => Number(tier) as Filters["priceTiers"][number],
      ),
      includeDormant: flag(params.get("r")),
    },
    sort: sortRaw && SORTS.includes(sortRaw) ? sortRaw : "best",
    selectedId: params.get("s"),
  };
}

export function stateToQuery(state: MapState): string {
  return encodeState(state);
}

/** Serialise a server-side `searchParams` record into query strings for `decodeState`. */
export function paramsToQuery(
  params: Record<string, string | string[] | undefined>,
): string {
  const formatted = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      formatted.append(key, item);
    }
  }
  return formatted.toString();
}

export function buildShareUrl(
  origin: string,
  pathname: string,
  state: MapState,
): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}${pathname}?${encodeState(state)}`;
}

/** Map a collection + filters onto a starting camera, so `?c=` is optional. */
export function cameraFor(
  collectionCenter: { lat: number; lng: number; zoom: number } | null,
  state: MapState,
): MapState {
  if (!collectionCenter) return state;
  const hasExplicitCamera = state.center.lat !== ACCRA_CENTER.lat ||
    state.center.lng !== ACCRA_CENTER.lng ||
    state.center.zoom !== ACCRA_CENTER.zoom;
  if (hasExplicitCamera) return state;
  return { ...state, center: collectionCenter };
}
