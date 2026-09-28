import {
  DAY_KEYS,
  DAY_LABEL,
  DAY_SHORT,
  type DayHours,
  type DayKey,
  type WeeklyHours,
} from "@/types/place";
import { formatClock } from "./utils";

/**
 * Opening-hours engine.
 *
 * The important detail this file exists for: **midnight rollover**.
 * A club that runs `fri: 20:00 – 02:00` is *open* at 01:00 on Saturday, and it is
 * also open at 01:00 on Sunday if Saturday ran 20:00–02:00. Times past midnight are
 * written as `"26:00"` (= 02:00 next day) so the schedule stays declarative, and the
 * engine normalises everything into absolute "week minutes" (0 = Sunday 00:00).
 */

const MINUTES_PER_DAY = 1440;
const DAYS_PER_WEEK = 7;
export const WEEK_MINUTES = MINUTES_PER_DAY * DAYS_PER_WEEK;

/** `Date#getDay()` (0 = Sunday) → our `DayKey`. */
export const DAY_KEY_BY_INDEX: readonly DayKey[] = DAY_KEYS;
export const DAY_INDEX_BY_KEY: Readonly<Record<DayKey, number>> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

export type Window = { readonly start: number; readonly end: number };

function dayWindow(dayIndex: number, value: DayHours): Window | null {
  if (value.kind !== "hours") return null;
  const start = dayIndex * MINUTES_PER_DAY + value.opens;
  let end = dayIndex * MINUTES_PER_DAY + value.closes;
  if (end <= start) end += MINUTES_PER_DAY;
  return { start, end };
}

export function weeklyWindows(hours: WeeklyHours): Window[] {
  const out: Window[] = [];
  for (let day = 0; day < DAYS_PER_WEEK; day += 1) {
    const key = DAY_KEY_BY_INDEX[day];
    if (!key) continue;
    const window = dayWindow(day, hours[key]);
    if (window) out.push(window);
  }
  return out;
}

export function isAlwaysOpen(hours: WeeklyHours): boolean {
  return Object.values(hours).every((d) => d.kind === "allday");
}

export function isNeverOpen(hours: WeeklyHours): boolean {
  return Object.values(hours).every((d) => d.kind === "closed");
}

/** Absolute week-minute for a day index + minutes-from-midnight. */
export function absolute(dayIndex: number, minutesOfDay: number): number {
  return dayIndex * MINUTES_PER_DAY + minutesOfDay;
}

function normaliseWeek(value: number): number {
  return ((value % WEEK_MINUTES) + WEEK_MINUTES) % WEEK_MINUTES;
}

export type OpenStatus = {
  readonly open: boolean;
  /** Minute-of-day the current window closes, if we are inside one. */
  readonly untilMinutes: number | null;
  /** Day index the current window closes on (differs from `dayIndex` after midnight). */
  readonly untilDay: number | null;
  readonly opensInMinutes: number | null;
  readonly opensAtMinutes: number | null;
  readonly opensAtDay: number | null;
};

const UNKNOWN: OpenStatus = {
  open: false,
  untilMinutes: null,
  untilDay: null,
  opensInMinutes: null,
  opensAtMinutes: null,
  opensAtDay: null,
};

/**
 * Is the place open at `dayIndex` (0 = Sun) + `minutesOfDay`?
 * Also reports the matching close time and the next opening.
 */
export function openStatusAt(
  hours: WeeklyHours,
  dayIndex: number,
  minutesOfDay: number,
): OpenStatus {
  if (isAlwaysOpen(hours)) {
    return { ...UNKNOWN, open: true, untilMinutes: 1439 };
  }
  if (isNeverOpen(hours)) return UNKNOWN;

  const now = absolute(dayIndex, minutesOfDay);
  const windows = weeklyWindows(hours);

  for (const window of windows) {
    // Offsets handle windows that start on the previous day and spill past midnight,
    // and windows that have not opened yet in an earlier week.
    for (const offset of [0, -WEEK_MINUTES, WEEK_MINUTES]) {
      const start = window.start + offset;
      const end = window.end + offset;
      if (now >= start && now < end) {
        return {
          open: true,
          untilMinutes: end - dayIndex * MINUTES_PER_DAY,
          untilDay: Math.floor((end - 1) / MINUTES_PER_DAY),
          opensInMinutes: 0,
          opensAtMinutes: start - dayIndex * MINUTES_PER_DAY,
          opensAtDay: Math.floor(start / MINUTES_PER_DAY),
        };
      }
    }
  }

  let best: Window | null = null;
  for (const window of windows) {
    for (const offset of [-WEEK_MINUTES, 0, WEEK_MINUTES]) {
      const start = window.start + offset;
      if (start <= now) continue;
      if (!best || start < best.start) best = { start, end: window.end + offset };
    }
  }

  if (!best) return UNKNOWN;
  return {
    open: false,
    untilMinutes: null,
    untilDay: null,
    opensInMinutes: best.start - now,
    opensAtMinutes: best.start - dayIndex * MINUTES_PER_DAY,
    opensAtDay: Math.floor(best.start / MINUTES_PER_DAY),
  };
}

export function isOpenAt(
  hours: WeeklyHours,
  dayIndex: number,
  minutesOfDay: number,
): boolean {
  return openStatusAt(hours, dayIndex, minutesOfDay).open;
}

/** `"01:00 – 07:00"`, `"Open 24/7"`, `"Closed"`, `"20:00 – 02:00 (+1 day)"`. */
export function dayHoursLabel(value: DayHours): string {
  if (value.kind === "allday") return "Open 24/7";
  if (value.kind === "closed") return "Closed";
  const suffix = value.closes > MINUTES_PER_DAY ? " (+1 day)" : "";
  return `${formatClock(value.opens)} – ${formatClock(value.closes)}${suffix}`;
}

export function shortDayHoursLabel(value: DayHours): string {
  if (value.kind === "allday") return "24/7";
  if (value.kind === "closed") return "Closed";
  return `${formatClock(value.opens)}–${formatClock(value.closes)}`;
}

/** A compact one-line summary, e.g. `"Mon–Fri 08:00–17:00 · Sat–Sun 10:00–16:00"`. */
export function summariseWeek(hours: WeeklyHours): string {
  if (isAlwaysOpen(hours)) return "Open 24/7";
  if (isNeverOpen(hours)) return "Closed";

  const groups: { days: number[]; value: DayHours }[] = [];
  for (let day = 0; day < DAYS_PER_WEEK; day += 1) {
    const key = DAY_KEY_BY_INDEX[day];
    if (!key) continue;
    const value = hours[key];
    const last = groups[groups.length - 1];
    if (last && sameDayHours(last.value, value)) {
      last.days.push(day);
    } else {
      groups.push({ days: [day], value });
    }
  }

  return groups
    .map((group) => {
      const label = shortDayHoursLabel(group.value);
      const [first, last] = [group.days[0] ?? 0, group.days[group.days.length - 1] ?? 0];
      if (group.days.length === 1) return `${DAY_SHORT[DAY_KEY_BY_INDEX[first] ?? "sun"]} ${label}`;
      if (first === 0 && last === 6) return `Every day ${label}`;
      return `${DAY_SHORT[DAY_KEY_BY_INDEX[first] ?? "sun"]}–${DAY_SHORT[DAY_KEY_BY_INDEX[last] ?? "sun"]} ${label}`;
    })
    .join(" · ");
}

function sameDayHours(a: DayHours, b: DayHours): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "hours" && b.kind === "hours") {
    return a.opens === b.opens && a.closes === b.closes;
  }
  return true;
}

export function dayKeyFor(date: Date): DayKey {
  return DAY_KEY_BY_INDEX[date.getDay()] ?? "sun";
}

export function dayIndexFor(date: Date): number {
  return date.getDay();
}

export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** Human phrase for a future opening, e.g. `"today 20:00"`, `"tomorrow 13:00"`. */
export function describeOpening(
  opensAtMinutes: number,
  todayIndex: number,
  opensAtDay: number,
): string {
  const time = formatClock(opensAtMinutes);
  const dayDelta = (((opensAtDay - todayIndex) % 7) + 7) % 7;
  if (dayDelta === 0) return `today ${time}`;
  if (dayDelta === 1) return `tomorrow ${time}`;
  return `${DAY_LABEL[DAY_KEY_BY_INDEX[((opensAtDay % 7) + 7) % 7] ?? "sun"]} ${time}`;
}

/** Human phrase for a closing time, e.g. `"until 07:00"`, `"until 02:00 tomorrow"`. */
export function describeClosing(
  untilMinutes: number,
  todayIndex: number,
  untilDay: number,
): string {
  const time = formatClock(untilMinutes);
  const dayDelta = (((untilDay - todayIndex) % 7) + 7) % 7;
  if (dayDelta === 0) return `until ${time}`;
  if (dayDelta === 1) return `until ${time} tomorrow`;
  return `until ${DAY_LABEL[DAY_KEY_BY_INDEX[((untilDay % 7) + 7) % 7] ?? "sun"]} ${time}`;
}

export { DAY_LABEL, DAY_SHORT, normaliseWeek };
