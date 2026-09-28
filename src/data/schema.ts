import { z } from "zod";
import {
  CATEGORIES,
  DAY_PARTS,
  PLACE_STATUSES,
  REGIONS,
  VENUE_TYPES,
  VIBES,
} from "@/types/place";

/**
 * Runtime schema for the dataset.
 *
 * Data is the product's biggest liability, so it is validated at a single boundary
 * and a bad record fails the build rather than the UI. See scope §4 "Data quality rules".
 */

const minutes = z.number().int().min(0).max(2880);

const dayHoursSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("closed") }),
  z.object({ kind: z.literal("allday") }),
  z.object({ kind: z.literal("hours"), opens: minutes, closes: minutes }),
]);

const weeklyHoursSchema = z.object({
  sun: dayHoursSchema,
  mon: dayHoursSchema,
  tue: dayHoursSchema,
  wed: dayHoursSchema,
  thu: dayHoursSchema,
  fri: dayHoursSchema,
  sat: dayHoursSchema,
});

const bestTimesSchema = z.object({
  ideal: z.array(z.enum(DAY_PARTS)).min(1),
  idealWindow: z.string().max(80).optional(),
  quietDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  busyDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  goodInRain: z.boolean().optional(),
  why: z.array(z.string().min(3).max(240)).min(1).max(6),
  caution: z.string().max(240).optional(),
});

const bookingSchema = z.object({
  phone: z
    .string()
    .regex(/^\+233[0-9 -]{6,16}$/, "Phone numbers must be Ghanaian (+233…)")
    .optional(),
  phoneDisplay: z.string().max(40).optional(),
  website: z.url().optional(),
  note: z.string().max(240).optional(),
});

const placeSchema = z.object({
  id: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "id must be a lowercase slug"),
  name: z.string().min(2).max(80),
  tagline: z.string().min(8).max(200),
  category: z.enum(CATEGORIES),
  venueType: z.enum(VENUE_TYPES).optional(),
  area: z.string().min(2).max(80),
  region: z.enum(REGIONS),
  address: z.string().max(160).optional(),
  lat: z.number().min(4.0, "Latitude must be inside Ghana").max(11.2),
  lng: z.number().min(-4.2, "Longitude must be inside Ghana").max(1.6),
  priceTier: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
  ]),
  driveMinutes: z.number().int().min(0).max(480),
  radius: z.enum(["accra", "near", "mid", "far"]),
  vibes: z.array(z.enum(VIBES)).min(1).max(4),
  energy: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  outdoors: z.boolean(),
  activities: z.array(z.string().min(2).max(60)).min(1).max(10),
  hours: weeklyHoursSchema,
  bestTimes: bestTimesSchema,
  booking: bookingSchema.optional(),
  mapsUrl: z.url().optional(),
  status: z.enum(PLACE_STATUSES),
  lastVerified: z.iso.date(),
  source: z.url().optional(),
  verification: z.enum(["verified", "unverified"]),
  pinAccuracy: z.enum(["exact", "approximate"]),
  notes: z.string().max(300).optional(),
  dressCode: z.string().max(120).optional(),
  costNote: z.string().max(160).optional(),
});

export const placeListSchema = z.array(placeSchema).min(1);

/** Cross-record checks that a per-record schema cannot express. */
export function assertDataset(places: readonly unknown[]): void {
  placeListSchema.parse(places);

  const seen = new Set<string>();
  for (const place of places as { id: string; drives: unknown }[]) {
    if (seen.has(place.id)) {
      throw new Error(`Duplicate place id: ${place.id}`);
    }
    seen.add(place.id);
  }

  const active = (places as { status: string }[]).filter(
    (p) => p.status === "active",
  );
  if (active.length < 10) {
    throw new Error("Dataset needs at least 10 active places to be useful");
  }
}
