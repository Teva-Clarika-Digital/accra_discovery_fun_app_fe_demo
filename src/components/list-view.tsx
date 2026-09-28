"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Place } from "@/types/place";
import { CATEGORIES, CATEGORY_LABEL } from "@/types/place";
import { CATEGORY_COLOR } from "@/lib/colors";
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  searchAndSort,
  toggle,
  type SortKey,
} from "@/lib/filters";
import type { TimeContext } from "@/lib/best-time";
import { encodeState, DEFAULT_STATE, type MapState } from "@/lib/share";
import { PlaceCard } from "./place-card";
import { EmptyState, Chip, CategoryDot } from "./ui";
import { useSaved } from "./saved-provider";
import { cn } from "@/lib/utils";

/**
 * The list view — the same map state, rendered as rows.
 *
 * This is the accessibility and battery answer to the map: every place the map shows is
 * here as a link, reachable by keyboard, and identical filter state. It shares the URL
 * contract with the map so a link to one view opens the other.
 */
export function ListView({
  source,
  ctx,
  collectionId = null,
}: {
  source: readonly Place[];
  ctx: TimeContext;
  collectionId?: string | null;
}) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortKey>("best");
  const [savedOnly, setSavedOnly] = useState(false);
  const [draft, setDraft] = useState("");
  const { saved, ready } = useSaved();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      const state: MapState = {
        ...DEFAULT_STATE,
        collection: collectionId,
        filters,
        sort,
      };
      const query = encodeState(state);
      window.history.replaceState(
        window.history.state,
        "",
        query ? `${window.location.pathname}?${query}` : window.location.pathname,
      );
    }, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [filters, sort, collectionId]);

  const places = useMemo(() => {
    const base = savedOnly && ready ? source.filter((p) => saved.includes(p.id)) : source;
    return searchAndSort(base, filters, sort, ctx);
  }, [source, filters, sort, ctx, savedOnly, ready, saved]);

  const count = activeFilterCount(filters);

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-20 -mx-4 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <label className="sr-only" htmlFor="place-search">
          Search places
        </label>
        <div className="relative">
          <span
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-ink-4"
          >
            ⌕
          </span>
          <input
            id="place-search"
            type="search"
            inputMode="search"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setFilters((current) => ({ ...current, q: event.target.value }));
            }}
            placeholder="Search clubs, jollof, waterfalls…"
            className="h-11 w-full rounded-full border border-line bg-canvas pl-9 pr-3 text-[14px] text-ink placeholder:text-ink-4 focus:border-ink-3"
          />
        </div>

        <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto">
          <Chip
            active={filters.openNow}
            onClick={() => setFilters((f) => ({ ...f, openNow: !f.openNow }))}
            className="shrink-0"
          >
            Open now
          </Chip>
          {CATEGORIES.map((category) => (
            <Chip
              key={category}
              active={filters.categories.includes(category)}
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  categories: toggle(f.categories, category),
                }))
              }
              className="shrink-0"
            >
              <CategoryDot color={CATEGORY_COLOR[category]} />
              {CATEGORY_LABEL[category]}
            </Chip>
          ))}
          <Chip
            active={savedOnly}
            onClick={() => setSavedOnly((v) => !v)}
            className="shrink-0"
          >
            ★ Saved
          </Chip>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] text-ink-3 tnum">
          <span className="font-semibold text-ink">{places.length}</span>{" "}
          {places.length === 1 ? "place" : "places"}
          {count > 0 && <span> · {count} filters on</span>}
        </p>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="list-sort">
            Sort
          </label>
          <select
            id="list-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className="h-9 rounded-full border border-line bg-canvas px-3 text-[12px] font-medium text-ink"
          >
            <option value="best">Best time now</option>
            <option value="drive">Closest first</option>
            <option value="energy">Most intense</option>
            <option value="name">A – Z</option>
          </select>
          {count > 0 && (
            <button
              type="button"
              onClick={() => {
                setFilters(DEFAULT_FILTERS);
                setDraft("");
              }}
              className={cn(
                "text-[12px] font-medium text-ink-2 underline decoration-line-strong underline-offset-4",
                "hover:text-ink",
              )}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {places.length === 0 ? (
        <EmptyState
          glyph="◌"
          title="Nothing matches"
          body="No place in this collection matches those filters. Try clearing a category, widening the drive time, or including unconfirmed venues."
          action={
            <button
              type="button"
              onClick={() => {
                setFilters({ ...DEFAULT_FILTERS, includeDormant: true });
                setSavedOnly(false);
                setDraft("");
              }}
              className="text-[13px] font-medium text-ink underline underline-offset-4"
            >
              Widen the search
            </button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {places.map((place) => (
            <li key={place.id}>
              <PlaceCard place={place} ctx={ctx} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
