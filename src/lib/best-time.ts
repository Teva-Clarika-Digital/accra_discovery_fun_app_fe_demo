import {
  DAY_PART_LABEL,
  type DayPart,
  type Place,
  type Vibe,
} from "@/types/place";
import {
  describeClosing,
  describeOpening,
  minutesOfDay,
  dayIndexFor,
  openStatusAt,
} from "./hours";
import { dayPartFor, inGoldenHour, sunTimes } from "./sun";
import { formatClock } from "./utils";

/**
 * The best-time advisor.
 *
 * Every place carries an `ideal` list of day parts. This module turns that plus the
 * live clock, the weekly hours and today's sunset into one sentence a human can act on:
 * "Open now · peak 22:00–02:00" or "Closed · comes back tomorrow 13:00".
 *
 * It is deliberately a pure function so it can be unit-tested, and so the server and
 * the client agree on what "now" means for a given timestamp.
 */

export type Verdict =
  | "open-peak"
  | "open-good"
  | "open-between"
  | "opens-soon"
  | "closed-peak-later"
  | "closed";

export type Advice = {
  readonly verdict: Verdict;
  /** Short pill text, e.g. `"Open now"`. */
  readonly label: string;
  /** One actionable sentence. */
  readonly detail: string;
  /** The window the app recommends, when it can work one out. */
  readonly window: string | null;
  /** 0–100. Used for sorting "what should I do right now". */
  readonly score: number;
  readonly open: boolean;
  readonly idealNow: boolean;
  readonly dayPart: DayPart;
  readonly reason: string | null;
};

const VERDICT_WEIGHT: Record<Verdict, number> = {
  "open-peak": 100,
  "open-good": 78,
  "open-between": 55,
  "opens-soon": 40,
  "closed-peak-later": 18,
  closed: 4,
};

export type TimeContext = {
  readonly at: Date;
};

export function contextFrom(date: Date = new Date()): TimeContext {
  return { at: date };
}

function resolveWindow(
  place: Place,
  at: Date,
): { label: string; from: number; to: number } | null {
  if (place.bestTimes.idealWindow) {
    return { label: place.bestTimes.idealWindow, from: 0, to: 0 };
  }
  const sun = sunTimes(place.lat, place.lng, at);
  const first = place.bestTimes.ideal[0];
  if (!first) return null;
  if (first === "sunset") {
    return {
      label: `${formatClock(sun.goldenHourStart)} – ${formatClock(sun.goldenHourEnd + 30)}`,
      from: sun.goldenHourStart,
      to: sun.goldenHourEnd + 30,
    };
  }
  return null;
}

export function bestTimeAdvice(
  place: Place,
  ctx: TimeContext = contextFrom(),
): Advice {
  const at = ctx.at;
  const dayIndex = dayIndexFor(at);
  const now = minutesOfDay(at);
  const dayPart = dayPartFor(now, place.lat, place.lng, at);
  const status = openStatusAt(place.hours, dayIndex, now);
  const window = resolveWindow(place, at);

  const idealNow =
    place.status === "closed"
      ? false
      : place.bestTimes.ideal.includes(dayPart);

  if (place.status === "closed") {
    return {
      verdict: "closed",
      label: "Closed",
      detail:
        place.notes ??
        "This place is no longer operating. It stays in the app as a warning, not a recommendation.",
      window: null,
      score: 0,
      open: false,
      idealNow: false,
      dayPart,
      reason: place.notes ?? null,
    };
  }

  if (status.open) {
    const closing =
      status.untilMinutes === null
        ? null
        : describeClosing(status.untilMinutes, dayIndex, status.untilDay ?? dayIndex);

    if (idealNow) {
      const golden = dayPart === "sunset" && inGoldenHour(now, place.lat, place.lng, at);
      return {
        verdict: "open-peak",
        label: golden ? "Golden hour now" : "Perfect time now",
        detail: closing
          ? `${DAY_PART_LABEL[dayPart]} is the sweet spot — ${closing}.`
          : `${DAY_PART_LABEL[dayPart]} is the sweet spot.`,
        window: window?.label ?? null,
        score: VERDICT_WEIGHT["open-peak"] + (golden ? 3 : 0),
        open: true,
        idealNow: true,
        dayPart,
        reason: place.bestTimes.why[0] ?? null,
      };
    }

    return {
      verdict: "open-good",
      label: "Open now",
      detail: closing
        ? `Open, but ${DAY_PART_LABEL[dayPart].toLowerCase()} is not its best bit — ${closing}.`
        : `Open now. Best is ${window?.label ?? place.bestTimes.idealWindow ?? "later"}.`,
      window: window?.label ?? place.bestTimes.idealWindow ?? null,
      score: VERDICT_WEIGHT["open-good"],
      open: true,
      idealNow: false,
      dayPart,
      reason: place.bestTimes.why[0] ?? null,
    };
  }

  const opensIn = status.opensInMinutes;

  if (opensIn !== null && opensIn <= 120) {
    return {
      verdict: "opens-soon",
      label: "Opens soon",
      detail: `Opens ${describeOpening(
        status.opensAtMinutes ?? 0,
        dayIndex,
        status.opensAtDay ?? dayIndex,
      )} — ${window?.label ?? place.bestTimes.idealWindow ?? "go a little later"}.`,
      window: window?.label ?? place.bestTimes.idealWindow ?? null,
      score: VERDICT_WEIGHT["opens-soon"] + Math.max(0, 20 - Math.round(opensIn / 6)),
      open: false,
      idealNow: false,
      dayPart,
      reason: null,
    };
  }

  return {
    verdict: "closed-peak-later",
    label: "Closed now",
    detail:
      opensIn === null
        ? "Closed — check the hours before you plan around it."
        : `Closed now. Next window ${describeOpening(
            status.opensAtMinutes ?? 0,
            dayIndex,
            status.opensAtDay ?? dayIndex,
          )}, best at ${
            window?.label ?? place.bestTimes.idealWindow ?? "opening time"
          }.`,
    window: window?.label ?? place.bestTimes.idealWindow ?? null,
    score: VERDICT_WEIGHT["closed-peak-later"],
    open: false,
    idealNow: false,
    dayPart,
    reason: null,
  };
}

/** Compact form for map pins and list rows. */
export function adviceLabel(advice: Advice): string {
  if (advice.verdict === "open-peak") return "Go now";
  if (advice.verdict === "open-good") return "Open now";
  if (advice.verdict === "opens-soon") return "Opens soon";
  if (advice.verdict === "closed") return "Closed";
  return "Closed now";
}

export function adviceTone(
  advice: Advice,
): "live" | "soon" | "later" | "dead" {
  if (advice.verdict === "closed") return "dead";
  if (advice.open) return "live";
  if (advice.verdict === "opens-soon") return "soon";
  return "later";
}

/** Ranked "what should I do right now" list. Only ever active places. */
export function openNow(
  places: readonly Place[],
  ctx: TimeContext = contextFrom(),
  limit = 4,
): { place: Place; advice: Advice }[] {
  return places
    .filter((p) => p.status === "active")
    .map((place) => ({ place, advice: bestTimeAdvice(place, ctx) }))
    .filter((entry) => entry.advice.open)
    .sort((a, b) => b.advice.score - a.advice.score)
    .slice(0, limit);
}

export function countOpenNow(
  places: readonly Place[],
  ctx: TimeContext = contextFrom(),
): number {
  const dayIndex = dayIndexFor(ctx.at);
  const now = minutesOfDay(ctx.at);
  return places.filter(
    (p) =>
      p.status === "active" &&
      openStatusAt(p.hours, dayIndex, now).open,
  ).length;
}

const VIBE_DAY_PART: Record<Vibe, readonly DayPart[]> = {
  chill: ["morning", "sunset", "evening"],
  culture: ["morning", "afternoon"],
  adventure: ["morning", "afternoon"],
  nightlife: ["night", "late", "evening"],
  scenic: ["sunset", "morning", "afternoon"],
  romantic: ["sunset", "evening"],
  party: ["night", "late"],
  shopping: ["afternoon", "evening", "morning"],
};

export function dayPartForVibe(vibe: Vibe): readonly DayPart[] {
  return VIBE_DAY_PART[vibe];
}
