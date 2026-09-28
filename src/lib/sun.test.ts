import { describe, expect, it } from "vitest";
import { inGoldenHour, dayPartFor, sunTimes } from "./sun";
import { ACCRA_CENTER } from "./geo";

/**
 * Regression tests for the solar maths.
 *
 * These are the numbers a human in Accra would check: the sun rises around 06:00 and
 * sets around 18:00 all year, because Accra is only 5.6° north of the equator. If these
 * break, every "golden hour is…" string in the app is wrong, so they are pinned to real
 * ranges rather than to the implementation's own output.
 */

/** `minutes` → `"HH:MM"`, for readable failure messages. */
function clock(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

const ACCRA = { lat: ACCRA_CENTER.lat, lng: ACCRA_CENTER.lng };

/** Midday UTC on the 15th of each month — Ghana is UTC+0, so this is local noon. */
const MONTHS = Array.from({ length: 12 }, (_unused, month) =>
  new Date(Date.UTC(2026, month, 15, 12)),
);

describe("sunTimes", () => {
  it("reports a sunrise before a sunset, in that order, all year", () => {
    for (const date of MONTHS) {
      const sun = sunTimes(ACCRA.lat, ACCRA.lng, date);
      expect(sun.sunrise, clock(sun.sunrise)).toBeLessThan(sun.sunset);
      expect(sun.sunrise).toBeLessThan(12 * 60);
      expect(sun.sunset).toBeGreaterThan(12 * 60);
    }
  });

  it("puts the sunrise and sunset in the real Accra ranges all year", () => {
    for (const date of MONTHS) {
      const sun = sunTimes(ACCRA.lat, ACCRA.lng, date);
      // Accra: 05:45–06:10 sunrise, 17:45–18:15 sunset, year round.
      expect(sun.sunrise).toBeGreaterThanOrEqual(5 * 60 + 40);
      expect(sun.sunrise).toBeLessThanOrEqual(6 * 60 + 15);
      expect(sun.sunset).toBeGreaterThanOrEqual(17 * 60 + 40);
      expect(sun.sunset).toBeLessThanOrEqual(18 * 60 + 20);
    }
  });

  it("puts solar noon within a few minutes of 12:00", () => {
    // Accra is 0.187° west of the Greenwich meridian: ~45 seconds of solar time.
    for (const date of MONTHS) {
      const { solarNoon } = sunTimes(ACCRA.lat, ACCRA.lng, date);
      expect(Math.abs(solarNoon - 12 * 60)).toBeLessThan(20);
    }
  });

  it("brackets sunset with the golden hour, starting before and ending after", () => {
    for (const date of MONTHS) {
      const sun = sunTimes(ACCRA.lat, ACCRA.lng, date);
      expect(sun.goldenHourStart).toBeLessThan(sun.sunset);
      expect(sun.goldenHourEnd).toBeGreaterThan(sun.sunset);
    }
  });

  it("gives a golden-hour window of roughly half an hour", () => {
    for (const date of MONTHS) {
      const sun = sunTimes(ACCRA.lat, ACCRA.lng, date);
      const length = sun.goldenHourEnd - sun.goldenHourStart;
      expect(length).toBeGreaterThan(20);
      expect(length).toBeLessThan(50);
    }
  });

  it("shifts sunset later in the northern summer than the southern winter", () => {
    const june = sunTimes(ACCRA.lat, ACCRA.lng, MONTHS[5] as Date);
    const december = sunTimes(ACCRA.lat, ACCRA.lng, MONTHS[11] as Date);
    expect(june.sunset).toBeGreaterThan(december.sunset);
  });

  it("works south of the equator by mirroring the day length", () => {
    // Cape Town in June has a much shorter day than Accra in June.
    const accra = sunTimes(ACCRA.lat, ACCRA.lng, MONTHS[5] as Date);
    const capeTown = sunTimes(-33.9, 18.4, MONTHS[5] as Date);
    const accraDay = accra.sunset - accra.sunrise;
    const capeDay = capeTown.sunset - capeTown.sunrise;
    expect(capeDay).toBeLessThan(accraDay);
  });
});

describe("inGoldenHour", () => {
  it("is true inside the window and false outside it", () => {
    const date = MONTHS[0] as Date;
    const sun = sunTimes(ACCRA.lat, ACCRA.lng, date);

    expect(inGoldenHour(sun.goldenHourStart, ACCRA.lat, ACCRA.lng, date)).toBe(true);
    expect(inGoldenHour(sun.goldenHourEnd, ACCRA.lat, ACCRA.lng, date)).toBe(true);
    expect(inGoldenHour(12 * 60, ACCRA.lat, ACCRA.lng, date)).toBe(false);
    expect(inGoldenHour(sun.sunset + 180, ACCRA.lat, ACCRA.lng, date)).toBe(false);
  });
});

describe("dayPartFor", () => {
  const date = MONTHS[0] as Date;
  const part = (minutes: number) => dayPartFor(minutes, ACCRA.lat, ACCRA.lng, date);

  it("labels the small hours as late night", () => {
    expect(part(2 * 60)).toBe("late");
    expect(part(4 * 60 + 59)).toBe("late");
  });

  it("labels dawn, morning and afternoon in order", () => {
    expect(part(6 * 60)).toBe("dawn");
    expect(part(8 * 60)).toBe("morning");
    expect(part(14 * 60)).toBe("afternoon");
  });

  it("labels the golden-hour window as sunset", () => {
    const sun = sunTimes(ACCRA.lat, ACCRA.lng, date);
    expect(part(sun.goldenHourStart)).toBe("sunset");
    expect(part(sun.goldenHourEnd + 60)).toBe("sunset");
  });

  it("labels the rest of the evening as evening, then night", () => {
    const sun = sunTimes(ACCRA.lat, ACCRA.lng, date);
    expect(part(sun.goldenHourEnd + 121)).toBe("evening");
    expect(part(23 * 60)).toBe("evening");
    expect(part(23 * 60 + 30)).toBe("night");
  });
});
