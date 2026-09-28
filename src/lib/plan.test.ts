import { describe, expect, it } from "vitest";
import { PLACES, RECOMMENDABLE, getPlace } from "@/data";
import {
  DAY_BUDGET_MINUTES,
  MAX_DAYS,
  NIGHTLIFE_EARLIEST,
  buildPlan,
  planToText,
  type PlanDay,
} from "./plan";
import type { TimeContext } from "./best-time";

/**
 * The planner's value is that it is *explainable and correct about Accra*. These tests
 * pin the three rules that make it worth more than a generic itinerary generator:
 * nightlife goes last and starts late, the drive cap is respected, and no place is
 * repeated while there is still something unused to offer.
 */

const CTX: TimeContext = { at: new Date(2026, 0, 2, 8, 0) };

function stopsOf(day: PlanDay) {
  return day.stops.map((stop) => stop.place);
}

describe("buildPlan", () => {
  it("returns the number of days asked for, and no more than the cap", () => {
    expect(buildPlan({ days: 3, themes: [], maxDriveMinutes: 120 }, RECOMMENDABLE, CTX)).toHaveLength(3);
    expect(buildPlan({ days: 1, themes: [], maxDriveMinutes: 120 }, RECOMMENDABLE, CTX)).toHaveLength(1);
    expect(buildPlan({ days: 99, themes: [], maxDriveMinutes: 120 }, RECOMMENDABLE, CTX)).toHaveLength(MAX_DAYS);
    expect(buildPlan({ days: 0, themes: [], maxDriveMinutes: 120 }, RECOMMENDABLE, CTX)).toHaveLength(1);
  });

  it("only uses places inside the drive cap", () => {
    const plan = buildPlan({ days: 3, themes: [], maxDriveMinutes: 60 }, RECOMMENDABLE, CTX);
    for (const day of plan) {
      for (const stop of stopsOf(day)) {
        expect(stop.driveMinutes).toBeLessThanOrEqual(60);
      }
    }
  });

  it("never schedules a closed or dormant place", () => {
    const plan = buildPlan({ days: 5, themes: [], maxDriveMinutes: 480 }, RECOMMENDABLE, CTX);
    for (const day of plan) {
      for (const stop of stopsOf(day)) {
        expect(stop.status).toBe("active");
      }
    }
  });

  it("puts nightlife last and never before 21:00", () => {
    const plan = buildPlan(
      { days: 4, themes: ["nightlife"], maxDriveMinutes: 120, surprise: true },
      RECOMMENDABLE,
      CTX,
    );
    let sawNightlife = false;
    for (const day of plan) {
      const nightIndex = day.stops.findIndex((stop) => stop.place.category === "nightlife");
      if (nightIndex === -1) continue;
      expect(nightIndex).toBe(day.stops.length - 1);
      const arrive = day.stops[nightIndex]!.arriveBy;
      expect(arrive).not.toBeNull();
      expect(arrive!).toBeGreaterThanOrEqual(NIGHTLIFE_EARLIEST);
      sawNightlife = true;
    }
    expect(sawNightlife).toBe(true);
  });

  it("never puts nightlife before a daytime stop on the same day", () => {
    const plan = buildPlan({ days: 5, themes: [], maxDriveMinutes: 120, surprise: true }, RECOMMENDABLE, CTX);
    for (const day of plan) {
      const categories = day.stops.map((stop) => stop.place.category);
      const firstNight = categories.indexOf("nightlife");
      if (firstNight > -1) {
        expect(categories.slice(firstNight)).toEqual(["nightlife"]);
      }
    }
  });

  it("avoids repeating a place while the dataset still has fresh ones", () => {
    const plan = buildPlan({ days: 5, themes: [], maxDriveMinutes: 480, surprise: true }, RECOMMENDABLE, CTX);
    const ids = plan.flatMap((day) => stopsOf(day).map((place) => place.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("respects the eight-hour day budget", () => {
    const plan = buildPlan({ days: 3, themes: [], maxDriveMinutes: 120, surprise: true }, RECOMMENDABLE, CTX);
    for (const day of plan) {
      for (const stop of day.stops) {
        const isNightStop =
          stop.place.category === "nightlife" ||
          stop.place.vibes.includes("nightlife") ||
          stop.place.vibes.includes("party");
        // Nightlife is exempt: it starts late by design and lands after the day ends.
        if (!isNightStop) {
          expect(stop.arriveBy === null || stop.arriveBy <= 9 * 60 + DAY_BUDGET_MINUTES).toBe(true);
        }
      }
    }
  });

  it("keeps every stop's start time in clock order", () => {
    const plan = buildPlan({ days: 3, themes: [], maxDriveMinutes: 120, surprise: true }, RECOMMENDABLE, CTX);
    for (const day of plan) {
      const times = day.stops
        .map((stop) => stop.arriveBy)
        .filter((value): value is number => value !== null);
      expect(times).toEqual([...times].sort((a, b) => a - b));
    }
  });

  it("schedules pinned places first", () => {
    const pinnedId = "labadi-beach";
    const plan = buildPlan(
      { days: 2, themes: ["culture"], maxDriveMinutes: 120, pinnedIds: [pinnedId] },
      PLACES,
      CTX,
    );
    expect(plan[0]?.stops[0]?.place.id).toBe(pinnedId);
  });

  it("warns instead of crashing when nothing matches the drive cap", () => {
    const plan = buildPlan({ days: 1, themes: [], maxDriveMinutes: 5 }, RECOMMENDABLE, CTX);
    const day = plan[0]!;
    if (day.stops.length === 0) {
      expect(day.warnings.length).toBeGreaterThan(0);
    }
  });

  it("labels every day with its number", () => {
    const plan = buildPlan({ days: 2, themes: ["culture", "party"], maxDriveMinutes: 120 }, RECOMMENDABLE, CTX);
    expect(plan[0]?.title).toContain("Day 1");
    expect(plan[1]?.title).toContain("Day 2");
  });

  it("is deterministic for identical input", () => {
    const request = { days: 3, themes: ["culture", "adventure"] as const, maxDriveMinutes: 120 };
    const a = buildPlan({ ...request, themes: [...request.themes] }, RECOMMENDABLE, CTX);
    const b = buildPlan({ ...request, themes: [...request.themes] }, RECOMMENDABLE, CTX);
    expect(a.map((d) => d.stops.map((s) => s.place.id))).toEqual(
      b.map((d) => d.stops.map((s) => s.place.id)),
    );
  });
});

describe("planToText", () => {
  it("renders one numbered line per stop", () => {
    const plan = buildPlan({ days: 2, themes: ["culture"], maxDriveMinutes: 120 }, RECOMMENDABLE, CTX);
    const text = planToText(plan);
    expect(text).toContain("Esther's Hangout App");
    expect(text).toContain("Day 1");
    expect(text).toContain("Day 2");
    expect(text).toMatch(/\n {2}1\. /);
  });

  it("handles an empty day without throwing", () => {
    const text = planToText([
      { index: 0, title: "Day 1 — Mixed", theme: null, stops: [], totalTravelMinutes: 0, warnings: [] },
    ]);
    expect(text).toContain("(nothing planned yet)");
  });
});

describe("sanity of the fixtures", () => {
  it("uses real records from the dataset", () => {
    expect(getPlace("labadi-beach")).toBeDefined();
    expect(PLACES.length).toBeGreaterThan(20);
  });
});
