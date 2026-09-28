"use client";

import Link from "next/link";
import type { Place } from "@/types/place";
import type { TimeContext } from "@/lib/best-time";
import { useMapState, useVisiblePlaces } from "../use-map-state";
import { MapToolbar } from "../map-toolbar";
import { FiltersSheet } from "../filters-sheet";
import { DynamicMap } from "./dynamic-map";
import type { Camera } from "./map-experience";

/**
 * The map screen, shared by `/m` and every `/c/[collectionId]`.
 *
 * One component for both so a collection page and the full map can never drift apart.
 * The collection only changes three things: the starting camera, the starting filter
 * set, and the title in the header.
 */
export function MapRoute({
  source,
  home,
  collectionId,
  ctx,
  title,
  subtitle,
  backHref,
  initialQuery = "",
}: {
  source: readonly Place[];
  home: Camera;
  collectionId: string | null;
  ctx: TimeContext;
  title: string;
  subtitle?: string;
  backHref?: string;
  /** Cold-load query string so a shared link reproduces the exact view on first paint. */
  initialQuery?: string;
}) {
  const {
    state,
    select,
    setCamera,
    patch,
    patchFilters,
    reset,
    focusToken,
    showFilters,
    setShowFilters,
  } = useMapState(initialQuery, home, collectionId);

  const { places, savedOnly, setSavedOnly } = useVisiblePlaces(source, state, ctx);

  // "Reset" clears filters, sort, saved-only and the camera in one go.
  const resetAll = () => {
    reset();
    setSavedOnly(false);
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-canvas">
      <DynamicMap
        places={places}
        home={home}
        camera={state.center}
        selectedId={state.selectedId}
        onSelect={select}
        onCameraChange={setCamera}
        ctx={ctx}
        focusToken={focusToken}
        toolbar={
          <div>
            <header className="no-print pointer-events-none flex items-start gap-2">
              <div className="pointer-events-auto flex items-center gap-2">
                {backHref && (
                  <Link
                    href={backHref}
                    aria-label="Back"
                    className="grid size-9 place-items-center rounded-full border border-line bg-canvas text-[14px] text-ink shadow-sm hover:bg-mist"
                  >
                    ←
                  </Link>
                )}
                <div className="rounded-full border border-line bg-canvas/95 px-3.5 py-2 shadow-sm">
                  <h1 className="text-[14px] font-semibold leading-tight text-ink">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="text-[11px] leading-tight text-ink-3">{subtitle}</p>
                  )}
                </div>
              </div>
            </header>
            <MapToolbar
              state={state}
              onPatchFilters={patchFilters}
              onPatch={patch}
              onOpenFilters={() => setShowFilters(true)}
              savedOnly={savedOnly}
              onToggleSaved={() => setSavedOnly((v) => !v)}
              resultCount={places.length}
              totalCount={source.length}
              sharePath={
                collectionId ? `/c/${collectionId}` : "/m"
              }
            />
          </div>
        }
      />

      {showFilters && (
        <FiltersSheet
          filters={state.filters}
          onChange={patchFilters}
          onClose={() => setShowFilters(false)}
          onReset={resetAll}
          resultCount={places.length}
        />
      )}

      <span className="sr-only" aria-live="polite">
        {places.length} places match the current filters.
      </span>
    </div>
  );
}
