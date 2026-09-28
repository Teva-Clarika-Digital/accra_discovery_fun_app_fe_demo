"use client";

import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Place } from "@/types/place";
import { CATEGORY_COLOR } from "@/lib/colors";
import type { TimeContext } from "@/lib/best-time";
import { Button, Pill } from "../ui";
import { PlacePreviewSheet } from "./place-preview-sheet";

/**
 * The interactive map.
 *
 * Design constraints that shaped this file:
 *  - The basemap must be light so it does not fight the white UI. Default is a keyless
 *    "positron" style; the provider is swappable with `NEXT_PUBLIC_MAP_STYLE_URL`.
 *  - The app must never show a broken box. If the style fails we swap in a blank white
 *    style, and markers still position correctly.
 *  - Colour is the only thing distinguishing a pin, so all pins share one silhouette.
 */

const DEFAULT_STYLE =
  "https://tiles.openfreemap.org/styles/positron";

/** A style with no sources at all. MapLibre still positions markers against it. */
const BLANK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "bg", type: "background", paint: { "background-color": "#ffffff" } }],
};

export type Camera = {
  readonly lat: number;
  readonly lng: number;
  readonly zoom: number;
};

type Cluster = {
  readonly key: string;
  readonly lat: number;
  readonly lng: number;
  readonly places: readonly Place[];
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Cheap grid clustering. Fine for ~100 markers and much easier to style than vector clusters. */
function buildClusters(places: readonly Place[], zoom: number): Cluster[] {
  const cell = zoom < 9 ? 0.75 : zoom < 10.5 ? 0.3 : zoom < 12 ? 0.1 : 0.03;
  const buckets = new Map<string, Place[]>();

  for (const place of places) {
    const key = `${Math.round(place.lat / cell)}:${Math.round(place.lng / cell)}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(place);
    else buckets.set(key, [place]);
  }

  const out: Cluster[] = [];
  for (const [key, group] of buckets) {
    const lat =
      group.reduce((sum, p) => sum + p.lat, 0) / group.length;
    const lng =
      group.reduce((sum, p) => sum + p.lng, 0) / group.length;
    out.push({ key, lat, lng, places: group });
  }
  return out;
}

function markerElement(
  cluster: Cluster,
  selectedId: string | null,
  onPick: (places: readonly Place[]) => void,
): HTMLButtonElement {
  const isCluster = cluster.places.length > 1;
  const place = cluster.places[0];
  const selected = !isCluster && place?.id === selectedId;
  const color = isCluster
    ? "#0b0b0c"
    : (place ? CATEGORY_COLOR[place.category] : "#0b0b0c");

  const el = document.createElement("button");
  el.type = "button";
  el.className = "eha-marker";
  el.setAttribute("aria-label", place ? place.name : "Places here");
  const size = isCluster ? 34 : 24;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.backgroundColor = color;
  el.style.borderRadius = "50%";
  el.style.border = isCluster ? "3px solid #0b0b0c" : "3px solid #ffffff";
  el.style.boxShadow = isCluster
    ? "0 2px 8px rgb(11 11 12 / 22%)"
    : "0 1px 4px rgb(11 11 12 / 28%)";
  el.style.transform = selected ? "scale(1.35)" : "scale(1)";
  el.style.transition = "transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1)";
  el.style.zIndex = selected ? "30" : isCluster ? "20" : "10";
  el.style.cursor = "pointer";
  el.style.display = "grid";
  el.style.placeItems = "center";
  el.style.color = "#ffffff";
  el.style.font = "600 11px/1 ui-sans-serif, system-ui, sans-serif";
  el.style.padding = "0";

  if (isCluster) {
    el.textContent = String(cluster.places.length);
  } else {
    const dot = document.createElement("span");
    dot.style.width = "6px";
    dot.style.height = "6px";
    dot.style.borderRadius = "50%";
    dot.style.background = "#ffffff";
    el.append(dot);
  }

  el.addEventListener("click", (event) => {
    event.stopPropagation();
    onPick(cluster.places);
  });

  return el;
}

export function MapExperience({
  places,
  home,
  camera,
  selectedId,
  onSelect,
  onCameraChange,
  ctx,
  focusToken = 0,
  toolbar,
}: {
  places: readonly Place[];
  home: Camera;
  camera: Camera | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCameraChange: (camera: Camera) => void;
  ctx: TimeContext;
  focusToken?: number;
  toolbar?: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const styleFailedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [tileFallback, setTileFallback] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const clusters = useMemo(
    () => buildClusters(places, camera?.zoom ?? home.zoom),
    [places, camera?.zoom, home.zoom],
  );

  const selected = useMemo(
    () => places.find((p) => p.id === selectedId) ?? null,
    [places, selectedId],
  );

  // --- create the map once -------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const style = process.env.NEXT_PUBLIC_MAP_STYLE_URL || DEFAULT_STYLE;

    const map = new maplibregl.Map({
      container,
      style,
      center: [home.lng, home.lat],
      zoom: home.zoom,
      minZoom: 3,
      maxZoom: 17,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      fadeDuration: 0,
    });

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-left",
    );

    map.on("load", () => setReady(true));

    map.on("error", (event: maplibregl.ErrorEvent) => {
      // A failed style must not leave the user staring at a black rectangle.
      if (styleFailedRef.current) return;
      const message = event.error?.message ?? "";
      const isStyleProblem =
        !map.isStyleLoaded() || /style|tile|json|fetch|load/i.test(message);
      if (isStyleProblem) {
        styleFailedRef.current = true;
        setTileFallback(true);
        map.setStyle(BLANK_STYLE);
      }
    });

    const emitCamera = () => {
      const center = map.getCenter();
      onCameraChange({
        lat: Number(center.lat.toFixed(4)),
        lng: Number(center.lng.toFixed(4)),
        zoom: Number(map.getZoom().toFixed(2)),
      });
    };
    map.on("moveend", emitCamera);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Camera changes are pushed up by the parent; we do not re-create the map for them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- markers -------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    for (const marker of markersRef.current) marker.remove();
    markersRef.current = [];

    for (const cluster of clusters) {
      const el = markerElement(cluster, selectedId, (group) => {
        if (group.length === 1) {
          onSelect(group[0]?.id ?? null);
          return;
        }
        const bounds = new maplibregl.LngLatBounds();
        for (const place of group) bounds.extend([place.lng, place.lat]);
        map.fitBounds(bounds, {
          padding: 80,
          maxZoom: 15,
          duration: prefersReducedMotion() ? 0 : 500,
        });
      });
      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([cluster.lng, cluster.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, [clusters, ready, selectedId, onSelect]);

  // --- fly to a newly selected place --------------------------------------
  useEffect(() => {
    if (!selected || focusToken === 0) return;
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({
      center: [selected.lng, selected.lat],
      zoom: Math.max(map.getZoom(), 13),
      duration: prefersReducedMotion() ? 0 : 600,
      offset: [0, -40],
    });
  }, [selected, focusToken]);

  const locate = () => {
    const map = mapRef.current;
    if (!map) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocateError("This browser can't share your location.");
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        map.easeTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: 13,
          duration: prefersReducedMotion() ? 0 : 600,
        });
      },
      () => {
        setLocating(false);
        setLocateError("Location permission denied — centring on Accra instead.");
        map.easeTo({
          center: [home.lng, home.lat],
          zoom: home.zoom,
          duration: prefersReducedMotion() ? 0 : 600,
        });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 120_000 },
    );
  };

  const recentre = () => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({
      center: [home.lng, home.lat],
      zoom: home.zoom,
      duration: prefersReducedMotion() ? 0 : 500,
    });
  };

  const zoom = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({
      zoom: map.getZoom() + delta,
      duration: prefersReducedMotion() ? 0 : 250,
    });
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-canvas">
      <div ref={containerRef} className="absolute inset-0" />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center bg-mist text-[12px] text-ink-3">
          Loading the map…
        </div>
      )}

      {tileFallback && (
        <div className="absolute inset-x-0 top-3 z-20 mx-auto w-fit max-w-[90%]">
          <Pill tone="soon">
            Offline basemap — pins are still positioned correctly
          </Pill>
        </div>
      )}

      <div className="absolute right-3 top-3 z-20 flex flex-col gap-2">
        <div className="flex flex-col overflow-hidden rounded-full border border-line bg-canvas shadow-sm">
          <button
            type="button"
            onClick={() => zoom(1)}
            aria-label="Zoom in"
            className="grid size-11 place-items-center text-lg text-ink hover:bg-mist"
          >
            +
          </button>
          <span className="mx-3 border-t border-line" />
          <button
            type="button"
            onClick={() => zoom(-1)}
            aria-label="Zoom out"
            className="grid size-11 place-items-center text-lg text-ink hover:bg-mist"
          >
            −
          </button>
        </div>
        <button
          type="button"
          onClick={locate}
          aria-label="Show my location"
          className="grid size-11 place-items-center rounded-full border border-line bg-canvas text-[15px] shadow-sm hover:bg-mist"
        >
          {locating ? "…" : "◎"}
        </button>
        <button
          type="button"
          onClick={recentre}
          aria-label="Recentre on the collection"
          className="grid size-11 place-items-center rounded-full border border-line bg-canvas text-[15px] shadow-sm hover:bg-mist"
        >
          ⌖
        </button>
      </div>

      {locateError && (
        <p className="safe-bottom absolute inset-x-0 bottom-20 z-20 mx-auto w-fit max-w-[92%] rounded-full border border-line bg-canvas/95 px-3 py-1.5 text-[11px] text-ink-2 shadow-sm">
          {locateError}
        </p>
      )}

      {toolbar}

      {selected && (
        <PlacePreviewSheet
          place={selected}
          ctx={ctx}
          onClose={() => onSelect(null)}
        />
      )}

      {!selected && places.length === 0 && (
        <div className="absolute inset-x-4 bottom-24 z-20 mx-auto max-w-sm">
          <p className="rounded-card border border-dashed border-line-strong bg-canvas/95 p-4 text-center text-[13px] text-ink-2">
            Nothing matches these filters. Widen the drive time or clear a facet.
          </p>
        </div>
      )}

      <span className="sr-only">
        {places.length} places on the map. Use the list view for a keyboard-accessible
        version.
      </span>

      {!ready && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2">
          <Button variant="secondary" size="sm" onClick={recentre}>
            Reset view
          </Button>
        </div>
      )}
    </div>
  );
}
