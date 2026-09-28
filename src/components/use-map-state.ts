"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Place } from "@/types/place";
import {
  DEFAULT_STATE,
  cameraFor,
  decodeState,
  encodeState,
  type MapState,
} from "@/lib/share";
import { filterPlaces, sortPlaces } from "@/lib/filters";
import type { TimeContext } from "@/lib/best-time";
import { useSaved } from "./saved-provider";

/**
 * URL ⇄ state bridge.
 *
 * The URL is the *share contract* (an incoming link must reproduce the view exactly),
 * but the live render source is local state so panning the map does not trigger a
 * navigation on every frame. Changes are mirrored back with `history.replaceState`,
 * which is instant and server-free.
 */
export function useMapState(
  initialQuery: string,
  defaultCenter: { lat: number; lng: number; zoom: number },
  defaultCollection: string | null,
) {
  const [state, setState] = useState<MapState>(() => {
    const decoded = decodeState(new URLSearchParams(initialQuery));
    return cameraFor(
      defaultCollection ? defaultCenter : null,
      decoded.collection === defaultCollection ? decoded : { ...decoded, collection: defaultCollection },
    );
  });

  const [focusToken, setFocusToken] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const query = encodeState(state);
      window.history.replaceState(
        window.history.state,
        "",
        query ? `${window.location.pathname}?${query}` : window.location.pathname,
      );
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state]);

  const select = useCallback((id: string | null) => {
    setState((current) => ({ ...current, selectedId: id }));
    if (id) setFocusToken((n) => n + 1);
  }, []);

  const setCamera = useCallback(
    (camera: { lat: number; lng: number; zoom: number }) => {
      setState((current) =>
        current.center.lat === camera.lat &&
        current.center.lng === camera.lng &&
        current.center.zoom === camera.zoom
          ? current
          : { ...current, center: camera },
      );
    },
    [],
  );

  const patch = useCallback((next: Partial<MapState>) => {
    setState((current) => ({ ...current, ...next }));
  }, []);

  const patchFilters = useCallback(
    (next: Partial<MapState["filters"]>) => {
      setState((current) => ({ ...current, filters: { ...current.filters, ...next } }));
    },
    [],
  );

  const reset = useCallback(() => {
    setState({
      ...DEFAULT_STATE,
      collection: defaultCollection,
      center: defaultCenter,
    });
  }, [defaultCollection, defaultCenter]);

  return {
    state,
    select,
    setCamera,
    patch,
    patchFilters,
    reset,
    focusToken,
    showFilters,
    setShowFilters,
    query: encodeState(state),
  };
}

export function useVisiblePlaces(
  source: readonly Place[],
  state: MapState,
  ctx: TimeContext,
) {
  const { saved, ready } = useSaved();
  const [savedOnly, setSavedOnly] = useState(false);

  const places = useMemo(() => {
    const base = savedOnly && ready ? source.filter((p) => saved.includes(p.id)) : source;
    return sortPlaces(filterPlaces(base, state.filters, ctx), state.sort, ctx);
  }, [source, state.filters, state.sort, ctx, savedOnly, ready, saved]);

  return { places, savedOnly, setSavedOnly };
}
