import { describe, expect, it } from "vitest";
import { PLACES, RECOMMENDABLE, getPlace, placesByIds } from "@/data";
import { DEFAULT_FILTERS, filterPlaces, matchesQuery, searchAndSort, sortPlaces, toggle } from "@/lib/filters";
import { bestTimeAdvice, contextFrom } from "@/lib/best-time";
import { isOpenAt } from "@/lib/hours";

/**
 * Filtering is the difference between "a list of places" and "an answer", so the tests
 * lean on the real dataset rather than fixtures — the taxonomy and the records have to
 * agree, and only the real data can prove that.
 */

const CTX = contextFrom();

function filters(overrides: Partial<typeof DEFAULT_FILTERS> = {}) {
  return { ...DEFAULT_FILTERS, ...overrides };
}

describe("the dataset", () => {
  it("has no duplicate ids", () => {
    const ids = PLACES.map((place) => place.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has at least ten confirmed-active places to recommend", () => {
    expect(RECOMMENDABLE.length).toBeGreaterThanOrEqual(10);
  });

  it("never recommends a closed or dormant place", () => {
    expect(RECOMMENDABLE.every((place) => place.status === "active")).toBe(true);
  });

  it("keeps a closed venue in the dataset, flagged", () => {
    const legon = getPlace("legon-botanical-gardens");
    expect(legon?.status).toBe("closed");
  });

  it("resolves ids and ignores unknown ones", () => {
    expect(getPlace("nope")).toBeUndefined();
    const [first] = PLACES;
    expect(placesByIds([first?.id ?? "", "nope"])).toHaveLength(1);
  });

  it("only marks research-derived records as unverified", () => {
    // Some record must be unverified, otherwise the honesty UI is dead code.
    expect(PLACES.some((place) => place.verification === "unverified")).toBe(true);
  });
});

describe("matchesQuery", () => {
  const club = getPlace("ace-nightclub");
  const busua = getPlace("busua-beach");

  it("matches everything for an empty query", () => {
    expect(PLACES.every((place) => matchesQuery(place, ""))).toBe(true);
    expect(PLACES.every((place) => matchesQuery(place, "   "))).toBe(true);
  });

  it("is case- and accent-insensitive", () => {
    expect(matchesQuery(club!, "ACE")).toBe(true);
    expect(matchesQuery(club!, "ace nightclub")).toBe(true);
  });

  it("requires every token to match", () => {
    expect(matchesQuery(busua!, "busua beach")).toBe(true);
    expect(matchesQuery(busua!, "busua accra")).toBe(false);
  });

  it("searches activities, not just names", () => {
    expect(PLACES.some((place) => matchesQuery(place, "jet ski"))).toBe(true);
  });
});

describe("filterPlaces", () => {
  it("hides closed places unless dormant records are included", () => {
    const strict = filterPlaces(PLACES, filters(), CTX);
    const loose = filterPlaces(PLACES, filters({ includeDormant: true }), CTX);
    expect(loose.length).toBeGreaterThan(strict.length);
    expect(strict.some((place) => place.status === "closed")).toBe(false);
  });

  it("applies the default two-hour drive cap", () => {
    const within = filterPlaces(PLACES, filters(), CTX);
    expect(within.every((place) => place.driveMinutes <= 120)).toBe(true);
  });

  it("treats a null drive cap as no cap", () => {
    const all = filterPlaces(PLACES, filters({ maxDriveMinutes: null, includeDormant: true }), CTX);
    expect(all).toHaveLength(PLACES.length);
  });

  it("narrows by category", () => {
    const food = filterPlaces(PLACES, filters({ categories: ["food"] }), CTX);
    expect(food.every((place) => place.category === "food")).toBe(true);
    expect(food.length).toBeGreaterThan(0);
  });

  it("narrows by price tier", () => {
    const budget = filterPlaces(PLACES, filters({ priceTiers: [0, 1] }), CTX);
    expect(budget.every((place) => place.priceTier <= 1)).toBe(true);
  });

  it("narrows by outdoors / indoors", () => {
    const out = filterPlaces(PLACES, filters({ outdoors: true }), CTX);
    const inside = filterPlaces(PLACES, filters({ outdoors: false }), CTX);
    expect(out.every((place) => place.outdoors)).toBe(true);
    expect(inside.every((place) => !place.outdoors)).toBe(true);
  });

  it("filters to genuinely open places when asked for open-now", () => {
    const open = filterPlaces(PLACES, filters({ openNow: true }), CTX);
    const dayIndex = CTX.at.getDay();
    const minutes = CTX.at.getHours() * 60 + CTX.at.getMinutes();
    expect(
      open.every((place) => isOpenAt(place.hours, dayIndex, minutes)),
    ).toBe(true);
  });

  it("combines facets with AND", () => {
    const both = filterPlaces(
      PLACES,
      filters({ categories: ["food"], maxDriveMinutes: 30 }),
      CTX,
    );
    expect(
      both.every(
        (place) => place.category === "food" && place.driveMinutes <= 30,
      ),
    ).toBe(true);
  });

  it("can legitimately return nothing", () => {
    expect(
      filterPlaces(
        PLACES,
        filters({ q: "zzzzznotaplace", maxDriveMinutes: null }),
        CTX,
      ),
    ).toHaveLength(0);
  });
});

describe("sortPlaces", () => {
  it("sorts by name alphabetically", () => {
    const sorted = sortPlaces(PLACES, "name", CTX);
    const names = sorted.map((place) => place.name);
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
  });

  it("sorts by drive time, closest first", () => {
    const sorted = sortPlaces(PLACES, "drive", CTX);
    for (let i = 1; i < sorted.length; i += 1) {
      const previous = sorted[i - 1]!.driveMinutes;
      const current = sorted[i]!.driveMinutes;
      expect(previous).toBeLessThanOrEqual(current);
    }
  });

  it("puts the best advice for right now first", () => {
    const sorted = sortPlaces(RECOMMENDABLE, "best", CTX);
    const scores = sorted.map((place) => bestTimeAdvice(place, CTX).score);
    for (let i = 1; i < scores.length; i += 1) {
      expect(scores[i - 1]!).toBeGreaterThanOrEqual(scores[i]!);
    }
  });

  it("does not mutate its input", () => {
    const input = [...PLACES];
    sortPlaces(input, "name", CTX);
    expect(input.map((p) => p.id)).toEqual(PLACES.map((p) => p.id));
  });
});

describe("searchAndSort and toggle", () => {
  it("filters then sorts", () => {
    const result = searchAndSort(PLACES, filters({ categories: ["beach"] }), "name", CTX);
    expect(result.every((place) => place.category === "beach")).toBe(true);
    expect(result.map((p) => p.name)).toEqual([...result.map((p) => p.name)].sort((a, b) => a.localeCompare(b)));
  });

  it("adds and removes a value", () => {
    const base = ["nightlife" as const];
    expect(toggle(base, "food")).toEqual(["nightlife", "food"]);
    expect(toggle(["nightlife", "food"], "food")).toEqual(["nightlife"]);
  });
});
