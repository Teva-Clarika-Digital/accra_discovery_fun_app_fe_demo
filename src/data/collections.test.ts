import { describe, expect, it } from "vitest";
import {
  COLLECTIONS,
  collectionCounts,
  collectionStat,
  collectionVibes,
  getCollection,
  isCollectionId,
  placesInCollection,
} from "./collections";
import { PLACES } from "./index";
import { isFoodKeyword } from "./collections";
import { contextFrom } from "@/lib/best-time";
import { CATEGORY_LABEL, DAY_KEYS, RADIUS_LABEL, VENUE_TYPES, VIBES } from "@/types/place";
import { CATEGORY_COLOR, CATEGORY_TINT } from "@/lib/colors";

/**
 * The four landing cards are the front door of the app, and each one is a *promise*:
 * "these are the clubs", "these are the adrenaline things", "these replace a day",
 * "this is where the food is". These tests hold each promise to its data.
 */

const CTX = contextFrom();

describe("COLLECTIONS", () => {
  it("has exactly the four doors the brief asked for, in order", () => {
    expect(COLLECTIONS.map((c) => c.title)).toEqual([
      "Night Life",
      "Adventures",
      "Daycation Trips",
      "Food",
    ]);
  });

  it("exposes a working route id for each", () => {
    for (const collection of COLLECTIONS) {
      expect(collection.id).toMatch(/^[a-z]+$/);
      expect(isCollectionId(collection.id)).toBe(true);
    }
    expect(isCollectionId("brunch")).toBe(false);
    expect(getCollection("brunch")).toBeUndefined();
  });

  it("gives each one copy, a glyph and a map centre inside Ghana", () => {
    for (const collection of COLLECTIONS) {
      expect(collection.blurb.length).toBeGreaterThan(20);
      expect(collection.intro.length).toBeGreaterThan(40);
      expect(collection.glyph.length).toBeGreaterThan(0);
      expect(collection.center.lat).toBeGreaterThan(4);
      expect(collection.center.lat).toBeLessThan(11.5);
      expect(collection.center.lng).toBeGreaterThan(-4);
      expect(collection.center.lng).toBeLessThan(1.6);
      expect(collection.center.zoom).toBeGreaterThan(5);
      expect(collection.center.zoom).toBeLessThan(18);
    }
  });

  it("has a colour token that actually exists", () => {
    for (const collection of COLLECTIONS) {
      expect(CATEGORY_COLOR[collection.accent]).toMatch(/^#[0-9a-f]{6}$/i);
      expect(CATEGORY_TINT[collection.accent]).toMatch(/^#[0-9a-f]{6}$/i);
      expect(CATEGORY_LABEL[collection.accent]).toBeTruthy();
    }
  });
});

describe("placesInCollection", () => {
  it("never returns an empty collection", () => {
    for (const collection of COLLECTIONS) {
      expect(
        placesInCollection(collection.id),
        collection.id,
      ).not.toHaveLength(0);
    }
  });

  it("keeps nightlife to nightlife venues", () => {
    for (const place of placesInCollection("nightlife")) {
      expect(place.category).toBe("nightlife");
    }
  });

  it("keeps adventures to the adrenaline end", () => {
    const adventures = placesInCollection("adventures");
    expect(adventures.every((place) => place.category === "adventure")).toBe(true);
    // Explicit brief requirement: a charming garden is not an adventure.
    expect(adventures.some((place) => place.venueType === "garden")).toBe(false);
  });

  it("only recommends confirmed-active places on the adventures card", () => {
    for (const place of placesInCollection("adventures")) {
      expect(place.status).toBe("active");
    }
  });

  it("keeps daycations to the places that replace a day", () => {
    const daycations = placesInCollection("daycations");
    expect(daycations.length).toBeGreaterThan(3);
    for (const place of daycations) {
      expect(["mid", "far"]).toContain(place.radius);
      expect(RADIUS_LABEL[place.radius]).toBeTruthy();
    }
  });

  it("keeps food to places that qualify on some clause, with real food coverage", () => {
    const food = placesInCollection("food");
    for (const place of food) {
      const matches = [
        place.category === "food",
        place.venueType === "restaurant",
        place.venueType === "market",
        place.activities.some(isFoodKeyword),
      ];
      expect(matches.some(Boolean), place.id).toBe(true);
    }
    // Sanity: the card must actually contain food-category, restaurant and market entries.
    expect(food.some((place) => place.category === "food")).toBe(true);
    expect(food.some((place) => place.venueType === "restaurant")).toBe(true);
    expect(food.some((place) => place.venueType === "market")).toBe(true);
  });

  it("never leaks a closed venue into any card", () => {
    for (const collection of COLLECTIONS) {
      const places = placesInCollection(collection.id);
      expect(
        places.some((place) => place.status === "closed"),
        collection.id,
      ).toBe(false);
    }
  });

  it("returns nothing for an unknown id rather than throwing", () => {
    expect(placesInCollection("nope")).toEqual([]);
  });
});

describe("collectionCounts and collectionStat", () => {
  it("counts the same places the card links to", () => {
    for (const collection of COLLECTIONS) {
      const { places } = collectionCounts(collection.id, CTX);
      expect(places).toBe(placesInCollection(collection.id).length);
    }
  });

  it("never reports more open than total", () => {
    for (const collection of COLLECTIONS) {
      const { places, openNow } = collectionCounts(collection.id, CTX);
      expect(openNow).toBeLessThanOrEqual(places);
      expect(openNow).toBeGreaterThanOrEqual(0);
    }
  });

  it("writes a stat line with real numbers in it", () => {
    for (const collection of COLLECTIONS) {
      const stat = collectionStat(collection.id);
      expect(stat).toMatch(/\d/);
    }
  });

  it("reports zeroes for an unknown collection", () => {
    expect(collectionCounts("nope", CTX)).toEqual({ places: 0, openNow: 0 });
    expect(collectionStat("nope")).toBe("");
  });
});

describe("collectionVibes", () => {
  it("returns only real vibes, with no duplicates", () => {
    for (const collection of COLLECTIONS) {
      const vibes = collectionVibes(collection.id);
      expect(new Set(vibes).size).toBe(vibes.length);
      for (const vibe of vibes) {
        expect(VIBES).toContain(vibe);
      }
    }
  });
});

describe("taxonomy integrity", () => {
  it("gives every category a distinct colour", () => {
    const colors = Object.values(CATEGORY_COLOR);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it("only ever produces venue types from the list", () => {
    for (const place of PLACES) {
      if (place.venueType !== undefined) {
        expect(VENUE_TYPES).toContain(place.venueType);
      }
    }
  });

  it("keeps weekly hours to exactly seven days", () => {
    for (const place of PLACES) {
      expect(Object.keys(place.hours).sort()).toEqual([...DAY_KEYS].sort());
    }
  });
});
