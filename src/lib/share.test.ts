import { describe, expect, it } from "vitest";
import {
  DEFAULT_STATE,
  STATE_VERSION,
  buildShareUrl,
  cameraFor,
  decodeState,
  encodeState,
  paramsToQuery,
  stateToQuery,
  type MapState,
} from "./share";
import { DEFAULT_FILTERS } from "./filters";
import { ACCRA_CENTER } from "./geo";

/**
 * "Share any map view" is the growth loop, so the URL contract is a hard interface:
 * whatever a user is looking at has to survive a round-trip through a query string
 * exactly, and anything unrecognised has to degrade to a default rather than throw.
 */

const FULL_STATE: MapState = {
  center: { lat: 5.5705, lng: -0.189, zoom: 12 },
  collection: "nightlife",
  filters: {
    ...DEFAULT_FILTERS,
    categories: ["nightlife", "adventure"],
    vibes: ["party", "scenic"],
    venueTypes: ["nightclub"],
    maxDriveMinutes: 60,
    openNow: true,
    outdoors: false,
    priceTiers: [1, 3],
    includeDormant: true,
    q: "rooftop bar",
  },
  sort: "drive",
  selectedId: "ace-nightclub",
};

describe("encodeState", () => {
  it("stamps the version", () => {
    expect(new URLSearchParams(encodeState(DEFAULT_STATE)).get("v")).toBe(STATE_VERSION);
  });

  it("omits every default so plain links stay short", () => {
    const query = new URLSearchParams(encodeState(DEFAULT_STATE));
    expect(query.get("f")).toBeNull();
    expect(query.get("o")).toBeNull();
    expect(query.get("r")).toBeNull();
    expect(query.get("d")).toBeNull();
    expect(query.get("s")).toBeNull();
  });

  it("always writes the camera", () => {
    expect(new URLSearchParams(encodeState(DEFAULT_STATE)).get("c")).toBe(
      `${ACCRA_CENTER.lat.toFixed(4)},${ACCRA_CENTER.lng.toFixed(4)},${ACCRA_CENTER.zoom.toFixed(2)}`,
    );
  });

  it("encodes no distance cap as the letter n, not a number", () => {
    const state: MapState = {
      ...DEFAULT_STATE,
      filters: { ...DEFAULT_FILTERS, maxDriveMinutes: null },
    };
    expect(new URLSearchParams(encodeState(state)).get("d")).toBe("n");
  });

  it("round-trips every field it writes", () => {
    const decoded = decodeState(encodeState(FULL_STATE));
    expect(decoded).toEqual(FULL_STATE);
  });

  it("handles repeated server-side values via paramsToQuery", () => {
    const query = paramsToQuery({ f: ["nightlife", "food"], s: undefined, q: "rooftop" });
    expect(decodeState(query).filters.categories).toEqual(["nightlife", "food"]);
    expect(decodeState(query).filters.q).toBe("rooftop");
    expect(decodeState(query).selectedId).toBeNull();
  });

  it("is aliased by stateToQuery", () => {
    expect(stateToQuery(FULL_STATE)).toBe(encodeState(FULL_STATE));
  });
});

describe("decodeState", () => {
  it("returns the defaults for an empty query", () => {
    expect(decodeState("")).toEqual(DEFAULT_STATE);
  });

  it("clamps a nonsense camera instead of trusting it", () => {
    const decoded = decodeState("c=999,999,999");
    expect(decoded.center.lat).toBe(90);
    expect(decoded.center.lng).toBe(180);
    expect(decoded.center.zoom).toBe(20);
  });

  it("clamps the drive cap to a sane range", () => {
    expect(decodeState("d=1").filters.maxDriveMinutes).toBe(5);
    expect(decodeState("d=99999").filters.maxDriveMinutes).toBe(480);
  });

  it("drops filter values that are not in the taxonomy", () => {
    const decoded = decodeState("f=nightlife.notacategory&w=party&t=chaos");
    expect(decoded.filters.categories).toEqual(["nightlife"]);
    expect(decoded.filters.vibes).toEqual(["party"]);
    expect(decoded.sort).toBe("best");
  });

  it("ignores a version it does not know, keeping the rest of the view", () => {
    const decoded = decodeState("v=99&f=nightlife&o=1");
    expect(decoded.filters.categories).toEqual(["nightlife"]);
    expect(decoded.filters.openNow).toBe(true);
  });

  it("distinguishes outdoors-only from indoors-only", () => {
    expect(decodeState("n=1").filters.outdoors).toBe(true);
    expect(decodeState("n=2").filters.outdoors).toBe(false);
    expect(decodeState("").filters.outdoors).toBeNull();
  });

  it("trims the search term", () => {
    expect(decodeState("q=%20%20spa%20%20").filters.q).toBe("spa");
  });
});

describe("buildShareUrl", () => {
  it("joins origin and path without doubling slashes", () => {
    const url = buildShareUrl("https://example.com/", "/m", FULL_STATE);
    expect(url.startsWith("https://example.com/m?v=")).toBe(true);
  });
});

describe("cameraFor", () => {
  const collectionCenter = { lat: 5.5705, lng: -0.189, zoom: 12 };

  it("centres on the collection when the link has no camera of its own", () => {
    const result = cameraFor(collectionCenter, DEFAULT_STATE);
    expect(result.center).toEqual(collectionCenter);
  });

  it("leaves an explicit camera alone", () => {
    const state: MapState = {
      ...DEFAULT_STATE,
      center: { lat: 5.1, lng: -1.2, zoom: 9 },
    };
    expect(cameraFor(collectionCenter, state).center).toEqual(state.center);
  });

  it("is a no-op with no collection", () => {
    expect(cameraFor(null, DEFAULT_STATE)).toBe(DEFAULT_STATE);
  });
});
