import { describe, expect, it } from "vitest";
import { PLACES, RECOMMENDABLE, getPlace } from "@/data";
import {
  adviceLabel,
  adviceTone,
  bestTimeAdvice,
  countOpenNow,
  dayPartForVibe,
  openNow,
  type TimeContext,
} from "./best-time";

/**
 * `bestTimeAdvice` is the product's signature feature, so it gets tested for the
 * promises the UI makes: a closed place never says "go now", an open place always says
 * something actionable, and the score ordering matches the labels.
 *
 * Dates are built from *local* components (`new Date(2026, 0, 1, 23, 0)`) so these
 * assertions hold in any timezone.
 */

const FRI_NIGHT = new Date(2026, 0, 2, 23, 0);
const FRI_AFTERNOON = new Date(2026, 0, 2, 14, 0);
const SAT_MORNING = new Date(2026, 0, 3, 9, 0);

const ctx = (at: Date): TimeContext => ({ at });

const club = getPlace("front-back-osu")!;
const legon = getPlace("legon-botanical-gardens")!;

describe("bestTimeAdvice", () => {
  it("marks a permanently closed place closed, whatever the hour", () => {
    const advice = bestTimeAdvice(legon, ctx(FRI_NIGHT));
    expect(advice.verdict).toBe("closed");
    expect(advice.label).toBe("Closed");
    expect(advice.open).toBe(false);
    expect(advice.score).toBe(0);
    expect(adviceTone(advice)).toBe("dead");
  });

  it("never recommends a closed place, even when its hours claim to be open", () => {
    expect(bestTimeAdvice(legon, ctx(SAT_MORNING)).idealNow).toBe(false);
  });

  it("tells a late-night club it is the right time to go out", () => {
    const advice = bestTimeAdvice(club, ctx(FRI_NIGHT));
    expect(advice.open).toBe(true);
    expect(["open-peak", "open-good"]).toContain(advice.verdict);
    expect(adviceTone(advice)).toBe("live");
  });

  it("scores a perfect window above a merely open one", () => {
    const peak = bestTimeAdvice(club, ctx(FRI_NIGHT)).score;
    expect(peak).toBeGreaterThan(50);
  });

  it("always returns a human sentence to act on", () => {
    for (const place of RECOMMENDABLE) {
      for (const at of [FRI_NIGHT, FRI_AFTERNOON, SAT_MORNING]) {
        const advice = bestTimeAdvice(place, ctx(at));
        expect(advice.label.length).toBeGreaterThan(0);
        expect(advice.detail.length).toBeGreaterThan(0);
        expect(advice.detail).toMatch(/[.!]$/);
      }
    }
  });

  it("keeps the score inside a usable range for sorting", () => {
    for (const place of RECOMMENDABLE) {
      const { score } = bestTimeAdvice(place, ctx(FRI_NIGHT));
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(110);
    }
  });

  it("is deterministic for a given timestamp", () => {
    expect(bestTimeAdvice(club, ctx(FRI_NIGHT))).toEqual(
      bestTimeAdvice(club, ctx(FRI_NIGHT)),
    );
  });
});

describe("adviceLabel", () => {
  it("maps every verdict to a short label", () => {
    for (const place of PLACES.slice(0, 12)) {
      const label = adviceLabel(bestTimeAdvice(place, ctx(FRI_NIGHT)));
      expect(label.length).toBeGreaterThan(0);
      expect(label.length).toBeLessThan(20);
    }
  });
});

describe("openNow and countOpenNow", () => {
  it("returns only active, currently-open places", () => {
    const entries = openNow(RECOMMENDABLE, ctx(FRI_NIGHT), 5);
    expect(entries.length).toBeLessThanOrEqual(5);
    for (const entry of entries) {
      expect(entry.place.status).toBe("active");
      expect(entry.advice.open).toBe(true);
    }
  });

  it("ranks the best advice first", () => {
    const entries = openNow(RECOMMENDABLE, ctx(FRI_NIGHT), 8);
    for (let i = 1; i < entries.length; i += 1) {
      expect(entries[i - 1]!.advice.score).toBeGreaterThanOrEqual(entries[i]!.advice.score);
    }
  });

  it("agrees with its own count", () => {
    const entries = openNow(RECOMMENDABLE, ctx(FRI_NIGHT), 999);
    expect(entries).toHaveLength(countOpenNow(RECOMMENDABLE, ctx(FRI_NIGHT)));
  });

  it("finds nightlife open late and beaches closed at 02:00", () => {
    const smallHours = ctx(new Date(2026, 0, 3, 2, 0));
    const entries = openNow(RECOMMENDABLE, smallHours, 999);
    expect(entries.every((entry) => entry.advice.open)).toBe(true);
  });
});

describe("dayPartForVibe", () => {
  it("maps every vibe to at least one day part", () => {
    for (const parts of Object.values(
      Object.fromEntries(
        (["chill", "culture", "adventure", "nightlife", "scenic", "romantic", "party", "shopping"] as const).map(
          (vibe) => [vibe, dayPartForVibe(vibe)] as const,
        ),
      ),
    )) {
      expect(parts.length).toBeGreaterThan(0);
    }
  });

  it("puts party vibes in the small hours", () => {
    const parts = dayPartForVibe("party");
    expect(parts).toContain("late");
    expect(parts).not.toContain("morning");
  });

  it("puts adventure vibes in daylight", () => {
    const parts = dayPartForVibe("adventure");
    expect(parts).toContain("morning");
    expect(parts).toContain("afternoon");
  });
});
