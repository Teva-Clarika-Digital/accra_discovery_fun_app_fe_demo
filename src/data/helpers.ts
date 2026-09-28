import type { DayHours, DayKey, WeeklyHours } from "@/types/place";

/**
 * `"23:30"` → 1410.
 * Hours past midnight are written as `"26:00"` (= 02:00 next day) so a club
 * that runs 23:00–06:00 can be expressed without a special case.
 */
export function hhmm(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid time: ${value}`);
  }
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 47 || m > 59) {
    throw new Error(`Invalid time: ${value}`);
  }
  return h * 60 + m;
}

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const satisfies readonly DayKey[];

type DaySpec = readonly [string, string] | "allday" | "closed";

function toDayHours(value: DaySpec): DayHours {
  if (value === "allday") return { kind: "allday" };
  if (value === "closed") return { kind: "closed" };
  return { kind: "hours", opens: hhmm(value[0]), closes: hhmm(value[1]) };
}

type Spec = Partial<Record<DayKey, DaySpec>>;

/** Build the spec object without fighting the type system on `Object.fromEntries`. */
function allDays(value: DaySpec): Spec {
  const out = {} as Spec;
  for (const day of DAYS) out[day] = value;
  return out;
}

/**
 * Build a weekly schedule from a compact spec. Any day you omit is closed.
 *
 * ```ts
 * schedule({ fri: ["20:00", "02:00"], sat: ["20:00", "02:00"] })
 * ```
 */
export function schedule(spec: Spec = {}): WeeklyHours {
  const out = {} as Record<DayKey, DayHours>;
  for (const day of DAYS) {
    const value = spec[day];
    out[day] = value === undefined ? { kind: "closed" } : toDayHours(value);
  }
  return out;
}

/** Open the same window every day, e.g. a lodge that runs 08:00–17:00 daily. */
export function everyDay(opens: string, closes: string): WeeklyHours {
  return schedule(allDays([opens, closes]));
}

export const ALWAYS: WeeklyHours = schedule(allDays("allday"));

export const NEVER: WeeklyHours = schedule(allDays("closed"));
