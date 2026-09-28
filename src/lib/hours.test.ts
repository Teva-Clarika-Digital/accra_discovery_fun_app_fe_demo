import { describe, expect, it } from "vitest";
import { ALWAYS, NEVER, schedule, everyDay, hhmm } from "@/data/helpers";
import {
  dayHoursLabel,
  isOpenAt,
  openStatusAt,
  shortDayHoursLabel,
  summariseWeek,
  weeklyWindows,
} from "./hours";

/**
 * The midnight-rollover tests are the important ones.
 *
 * A club that runs Friday 20:00–02:00 is open at 01:00 on *Saturday*, and — because
 * Saturday night also runs 20:00–02:00 — it is open at 01:00 on *Sunday* too. Getting
 * that wrong is the single most embarrassing bug an "is it open now?" app can have.
 */

const hh = (opens: number, closes: number) =>
  ({ kind: "hours", opens, closes }) as const;

const FRI = 5;
const SAT = 6;
const SUN = 0;
const WED = 3;

describe("hhmm", () => {
  it("parses ordinary times", () => {
    expect(hhmm("09:30")).toBe(570);
    expect(hhmm("00:00")).toBe(0);
    expect(hhmm("23:59")).toBe(1439);
  });

  it("allows times past midnight", () => {
    expect(hhmm("26:00")).toBe(1560);
    expect(hhmm("02:00")).toBe(120);
  });

  it("rejects nonsense", () => {
    expect(() => hhmm("9am")).toThrow();
    expect(() => hhmm("99:00")).toThrow();
    expect(() => hhmm("12:75")).toThrow();
  });
});

describe("schedule", () => {
  it("closes any day you do not mention", () => {
    const hours = schedule({ sat: ["10:00", "18:00"] });
    expect(hours.sat).toEqual(hh(600, 1080));
    expect(hours.sun).toEqual({ kind: "closed" });
  });

  it("builds an all-day and a never-open week", () => {
    expect(schedule({ sat: "allday" }).sat).toEqual({ kind: "allday" });
    expect(ALWAYS.sun).toEqual({ kind: "allday" });
    expect(NEVER.sun).toEqual({ kind: "closed" });
  });
});

describe("weeklyWindows", () => {
  it("emits an absolute window per open day", () => {
    const windows = weeklyWindows(schedule({ sat: ["10:00", "18:00"] }));
    expect(windows).toHaveLength(1);
    expect(windows[0]?.start).toBe(SAT * 1440 + 600);
    expect(windows[0]?.end).toBe(SAT * 1440 + 1080);
  });
});

describe("openStatusAt — midnight rollover", () => {
  const club = schedule({
    fri: ["20:00", "02:00"],
    sat: ["20:00", "02:00"],
  });

  it("is closed in the middle of the afternoon", () => {
    const status = openStatusAt(club, SAT, 15 * 60);
    expect(status.open).toBe(false);
  });

  it("is open at 01:00 on Saturday, carried over from Friday", () => {
    const status = openStatusAt(club, SAT, 60);
    expect(status.open).toBe(true);
    // 02:00 the same morning, i.e. 02:00 on Saturday's own day index.
    expect(status.untilMinutes).toBe(120);
    expect(status.untilDay).toBe(SAT);
  });

  it("is open at 01:00 on Sunday, carried over from Saturday", () => {
    const status = openStatusAt(club, SUN, 60);
    expect(status.open).toBe(true);
    // The window opened on Saturday, so it closes on Sunday — same day index.
    expect(status.untilMinutes).toBe(120);
    expect(status.untilDay).toBe(SUN);
  });

  it("is closed at 03:00 on Sunday", () => {
    expect(openStatusAt(club, SUN, 180).open).toBe(false);
  });

  it("is open at 23:00 on Friday, right before the window rolls over", () => {
    const status = openStatusAt(club, FRI, 23 * 60);
    expect(status.open).toBe(true);
    // 26:00 the same night, expressed as 02:00 on Saturday.
    expect(status.untilMinutes).toBe(26 * 60);
    expect(status.untilDay).toBe(SAT);
  });

  it("treats the closing minute as closed", () => {
    expect(openStatusAt(club, FRI, 26 * 60).open).toBe(false);
  });

  it("reports how long until the next opening", () => {
    const status = openStatusAt(club, SAT, 15 * 60);
    expect(status.open).toBe(false);
    expect(status.opensInMinutes).toBe(5 * 60);
    expect(status.opensAtMinutes).toBe(20 * 60);
    expect(status.opensAtDay).toBe(SAT);
  });
});

describe("openStatusAt — all day, never, and ordinary days", () => {
  it("reports an all-day venue as always open", () => {
    expect(openStatusAt(ALWAYS, WED, 3 * 60).open).toBe(true);
    expect(openStatusAt(ALWAYS, WED, 3 * 60).untilMinutes).toBe(1439);
  });

  it("reports a permanently closed venue as never opening", () => {
    const status = openStatusAt(NEVER, WED, 12 * 60);
    expect(status.open).toBe(false);
    expect(status.opensInMinutes).toBeNull();
  });

  it("handles a single ordinary day", () => {
    const shop = everyDay("08:00", "17:00");
    expect(isOpenAt(shop, 1, 9 * 60)).toBe(true);
    expect(isOpenAt(shop, 1, 7 * 60 + 59)).toBe(false);
    expect(isOpenAt(shop, 1, 17 * 60)).toBe(false);
  });
});

describe("labels", () => {
  it("flags closing times that are the next day", () => {
    expect(dayHoursLabel(hh(1200, 1560))).toBe("20:00 – 02:00 (+1 day)");
    expect(dayHoursLabel(hh(600, 1080))).toBe("10:00 – 18:00");
    expect(dayHoursLabel({ kind: "allday" })).toBe("Open 24/7");
    expect(dayHoursLabel({ kind: "closed" })).toBe("Closed");
  });

  it("keeps the compact form free of the +1 day suffix", () => {
    expect(shortDayHoursLabel(hh(1200, 1560))).toBe("20:00–02:00");
  });

  it("collapses a uniform week into one line", () => {
    expect(summariseWeek(ALWAYS)).toBe("Open 24/7");
    expect(summariseWeek(NEVER)).toBe("Closed");
    expect(summariseWeek(everyDay("08:00", "17:00"))).toBe("Every day 08:00–17:00");
  });

  it("splits a varied week into groups", () => {
    const hours = schedule({
      mon: ["09:00", "17:00"],
      tue: ["09:00", "17:00"],
      wed: ["09:00", "17:00"],
      thu: ["09:00", "17:00"],
      fri: ["09:00", "17:00"],
      sat: ["10:00", "16:00"],
      sun: "closed",
    });
    expect(summariseWeek(hours)).toBe("Sun Closed · Mon–Fri 09:00–17:00 · Sat 10:00–16:00");
  });
});
