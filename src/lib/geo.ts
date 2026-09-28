import type { Place } from "@/types/place";

/** Independence Square, Accra. Every drive time in the app is measured from here. */
export const ACCRA_REFERENCE = { lat: 5.6037, lng: -0.187 } as const;

export const ACCRA_CENTER = { lat: 5.6037, lng: -0.187, zoom: 11.4 } as const;

export const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

export type LatLng = { readonly lat: number; readonly lng: number };

/** Great-circle distance in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function distanceFromAccra(place: LatLng): number {
  return haversineKm(ACCRA_REFERENCE, place);
}

/** Initial compass bearing from `a` to `b`, 0 = north. */
export function bearing(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

const COMPASS = [
  "north",
  "north-east",
  "east",
  "south-east",
  "south",
  "south-west",
  "west",
  "north-west",
] as const;

export function compassPoint(degrees: number): (typeof COMPASS)[number] {
  const index = Math.round((((degrees % 360) + 360) % 360) / 45) % 8;
  return COMPASS[index] ?? "north";
}

export function distanceFrom(place: Place, from: LatLng): number {
  return haversineKm(from, place);
}

export type Bounds = {
  readonly south: number;
  readonly west: number;
  readonly north: number;
  readonly east: number;
};

export function boundsOf(places: readonly LatLng[]): Bounds | null {
  if (places.length === 0) return null;
  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;
  for (const p of places) {
    south = Math.min(south, p.lat);
    north = Math.max(north, p.lat);
    west = Math.min(west, p.lng);
    east = Math.max(east, p.lng);
  }
  return { south, west, north, east };
}

export function withinBounds(point: LatLng, bounds: Bounds): boolean {
  return (
    point.lat >= bounds.south &&
    point.lat <= bounds.north &&
    point.lng >= bounds.west &&
    point.lng <= bounds.east
  );
}

/** Nearest `count` places, excluding `id`, ordered by distance. */
export function nearestTo(
  places: readonly Place[],
  origin: LatLng,
  count: number,
  excludeId?: string,
): Place[] {
  return places
    .filter((p) => p.id !== excludeId)
    .map((place) => ({ place, km: haversineKm(origin, place) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, count)
    .map((entry) => entry.place);
}
