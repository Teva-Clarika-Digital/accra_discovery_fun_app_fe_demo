import { VIBE_LABEL, type Place, type Vibe } from "@/types/place";
import { haversineKm } from "./geo";
import { dayIndexFor, isOpenAt } from "./hours";
import type { TimeContext } from "./best-time";

/**
 * The five-day planner.
 *
 * Deliberately *not* an AI generator: it is a small, explainable sequencer. It knows
 * four things a generic itinerary tool does not:
 *
 *  1. Accra gridlock — 07:00–09:00 and 16:00–19:00 are not usable driving windows.
 *  2. Nightlife goes last, and it starts late, so a club cannot be stop two.
 *  3. Anything over ~2 h away consumes the entire day on its own.
 *  4. A day caps out at 8 hours of actually doing something. Nobody wants nine stops.
 */

export const MAX_DAYS = 5;
export const DAY_BUDGET_MINUTES = 8 * 60;
export const DAY_START = 9 * 60;
export const NIGHTLIFE_EARLIEST = 21 * 60;

/** Rough city driving speed including Accra traffic, in km/h. */
const CITY_KMH = 22;
const HIGHWAY_KMH = 55;

/** How long a stop is worth, in minutes. */
const DWELL: Readonly<Record<Place["category"], number>> = {
  adventure: 150,
  nightlife: 210,
  sights: 90,
  food: 90,
  beach: 150,
  stay: 0,
  nature: 120,
  shopping: 90,
};

export const DAY_THEMES = [
  "culture",
  "chill",
  "adventure",
  "nightlife",
  "scenic",
  "romantic",
  "party",
  "shopping",
] as const satisfies readonly Vibe[];

export type PlanRequest = {
  readonly days: number;
  /** One theme per day. Short arrays are cycled. */
  readonly themes: readonly Vibe[];
  /** Hard cap on drive time from Accra, in minutes. */
  readonly maxDriveMinutes: number;
  /** Places the user pinned. Always scheduled first. */
  readonly pinnedIds?: readonly string[];
  /** `true` to mix in everything rather than only the chosen theme. */
  readonly surprise?: boolean;
};

export type PlanStop = {
  readonly place: Place;
  /** Minute-of-day the plan suggests arriving. `null` for "flexible". */
  readonly arriveBy: number | null;
  readonly dwellMinutes: number;
  /** Drive minutes from the previous stop. */
  readonly travelMinutes: number;
  readonly note: string;
  readonly warning: string | null;
};

export type PlanDay = {
  readonly index: number;
  readonly title: string;
  readonly theme: Vibe | null;
  readonly stops: readonly PlanStop[];
  readonly totalTravelMinutes: number;
  readonly warnings: readonly string[];
};

function travelMinutesBetween(a: Place, b: Place): number {
  const km = haversineKm(a, b);
  const sameTrip = Math.abs(a.driveMinutes - b.driveMinutes) > 60;
  const kmh = sameTrip ? HIGHWAY_KMH : CITY_KMH;
  return Math.max(5, Math.round((km / kmh) * 60));
}

function inAccraBlackout(minutes: number): boolean {
  const hour = minutes / 60;
  return (hour >= 7 && hour < 9) || (hour >= 16 && hour < 19);
}

function isNightPlace(place: Place): boolean {
  return (
    place.category === "nightlife" ||
    place.vibes.includes("nightlife") ||
    place.vibes.includes("party")
  );
}

function themeOf(place: Place): readonly Vibe[] {
  return place.vibes;
}

function scoreFor(place: Place, theme: Vibe | null, surprise: boolean): number {
  let score = place.energy;
  if (theme && !surprise && !themeOf(place).includes(theme)) score -= 6;
  if (place.priceTier <= 1) score += 1;
  if (place.status !== "active") score -= 20;
  return score;
}

function dayTitle(index: number, theme: Vibe | null, surprise: boolean): string {
  const label = theme ? VIBE_LABEL[theme] : "Mixed";
  return surprise && !theme ? `Day ${index + 1} — mixed` : `Day ${index + 1} — ${label}`;
}

function buildDay(
  index: number,
  theme: Vibe | null,
  candidates: readonly Place[],
  ctx: TimeContext,
  surprise: boolean,
  pinned: readonly Place[],
): PlanDay {
  const warnings: string[] = [];
  const stops: PlanStop[] = [];
  const dayIndex = dayIndexFor(ctx.at);

  const used = new Set<string>();
  let clock = DAY_START;
  let travel = 0;

  const push = (place: Place, isPinned: boolean) => {
    const previous = stops[stops.length - 1]?.place ?? null;
    const legMinutes = previous ? travelMinutesBetween(previous, place) : 0;
    if (previous) {
      clock += legMinutes;
      travel += legMinutes;
    }

    // Push past the morning rush if we are still on the first leg.
    if (stops.length === 0 && inAccraBlackout(clock) && clock < 9 * 60) {
      clock = 9 * 60;
    }

    const dwell = DWELL[place.category];
    const night = isNightPlace(place);
    const arriveBy = night ? Math.max(clock, NIGHTLIFE_EARLIEST) : clock;

    const open = isOpenAt(place.hours, dayIndex, arriveBy % 1440);
    const warning = !open
      ? `Closed around ${Math.floor((arriveBy % 1440) / 60)}:00 on this day — check hours`
      : null;

    if (!night && previous && clock + dwell > DAY_BUDGET_MINUTES + DAY_START) {
      if (!isPinned) {
        clock -= legMinutes;
        travel -= legMinutes;
        return;
      }
    }

    stops.push({
      place,
      arriveBy,
      dwellMinutes: dwell,
      travelMinutes: legMinutes,
      note:
        place.bestTimes.why[0] ??
        `${Math.round(place.driveMinutes)} min from Accra.`,
      warning,
    });
    used.add(place.id);
    clock = arriveBy + dwell;
  };

  for (const place of pinned) push(place, true);

  const pool = candidates
    .filter((place) => !used.has(place.id) && place.category !== "stay")
    .map((place) => ({ place, score: scoreFor(place, theme, surprise) }))
    .sort(
      (a, b) => b.score - a.score || a.place.driveMinutes - b.place.driveMinutes,
    );

  // Nightlife always last, so it is pulled out of the main pool and appended at the end.
  const daytime = pool.filter((entry) => !isNightPlace(entry.place));
  const nightlife = pool.filter((entry) => isNightPlace(entry.place));

  const isLongDay = pinned.every((p) => p.driveMinutes <= 150) && pinned.length > 0;
  const maxStops = isLongDay ? 4 : 3;

  const wantsNight = theme === "nightlife" || theme === "party" || surprise;
  const hasNightlife = nightlife.length > 0;
  // A night is always the closing act, so hold a slot for it before filling the day.
  const daytimeBudget = wantsNight || hasNightlife ? Math.max(1, maxStops - 1) : maxStops;

  for (const entry of daytime) {
    if (stops.length >= daytimeBudget) break;
    if (entry.place.driveMinutes > 150 && stops.length > 0) continue;
    push(entry.place, false);
  }

  if (wantsNight || hasNightlife) {
    const best = nightlife[0]?.place;
    if (best) push(best, false);
  }

  if (stops.length === 0) {
    warnings.push("Nothing matched this theme inside the drive cap — try a wider radius.");
  }
  if (totalDrive(stops) > 120) {
    warnings.push("Heavy driving today. Consider trimming a stop.");
  }
  if (stops.some((s) => s.warning)) {
    warnings.push("At least one stop falls outside its posted hours.");
  }

  if (isLongDay && pinned.length > 0) {
    warnings.push(
      "This day already had a long drive — keep the stops close to each other.",
    );
  }

  const title = dayTitle(index, theme, surprise);
  return { index, title, theme, stops, totalTravelMinutes: travel, warnings };
}

function totalDrive(stops: readonly PlanStop[]): number {
  return stops.reduce((sum, stop) => sum + stop.travelMinutes, 0);
}

export function buildPlan(
  request: PlanRequest,
  source: readonly Place[],
  ctx: TimeContext = { at: new Date() },
): PlanDay[] {
  const days = Math.max(1, Math.min(MAX_DAYS, Math.round(request.days)));
  const pinnedIds = new Set(request.pinnedIds ?? []);
  const pinned = source.filter((place) => pinnedIds.has(place.id));

  const pool = source.filter(
    (place) =>
      place.status === "active" &&
      place.driveMinutes <= request.maxDriveMinutes,
  );

  const usedDays = new Set<string>();

  return Array.from({ length: days }, (_unused, index) => {
    const theme = request.themes[index % Math.max(1, request.themes.length)] ?? null;
    let candidates = pool;

    if (theme && !request.surprise) {
      const themed = pool.filter((place) => place.vibes.includes(theme));
      if (themed.length >= 3) candidates = themed;
    }

    // Never repeat a place across days unless we run out of ideas.
    const fresh = candidates.filter((place) => !usedDays.has(place.id));
    if (fresh.length >= 3) candidates = fresh;

    const day = buildDay(
      index,
      theme,
      candidates,
      ctx,
      request.surprise === true,
      pinned.filter((place) => !usedDays.has(place.id)).slice(0, 2),
    );

    for (const stop of day.stops) usedDays.add(stop.place.id);
    return day;
  });
}

export function planToText(plan: readonly PlanDay[]): string {
  const lines: string[] = ["Esther's Hangout App", ""];
  for (const day of plan) {
    lines.push(day.title);
    if (day.stops.length === 0) {
      lines.push("  (nothing planned yet)");
    }
    day.stops.forEach((stop, i) => {
      const arrive = stop.arriveBy === null ? "" : ` ~${fmt(stop.arriveBy)}`;
      lines.push(
        `  ${i + 1}. ${stop.place.name}${arrive} · ${stop.travelMinutes} min drive`,
      );
      if (stop.warning) lines.push(`     ! ${stop.warning}`);
    });
    for (const warning of day.warnings) lines.push(`  * ${warning}`);
    lines.push("");
  }
  return lines.join("\n");
}

function fmt(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
