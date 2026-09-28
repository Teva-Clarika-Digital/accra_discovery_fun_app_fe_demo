"use client";

import { CATEGORIES, CATEGORY_LABEL } from "@/types/place";
import { CATEGORY_COLOR } from "@/lib/colors";
import { activeFilterCount, toggle } from "@/lib/filters";
import { useShare, shareMessage, absoluteUrl } from "./use-share";
import { CategoryDot, Chip, Pill } from "./ui";
import { formatDrive } from "@/lib/utils";
import type { MapState } from "@/lib/share";
import { encodeState } from "@/lib/share";
import type { SortKey } from "@/lib/filters";

/**
 * The strip that floats above the map.
 *
 * It is the only chrome on the map screen, so it carries: what you are looking at,
 * the four fastest filters, the saved toggle, and the share button.
 */
export function MapToolbar({
  state,
  onPatchFilters,
  onPatch,
  onOpenFilters,
  savedOnly,
  onToggleSaved,
  resultCount,
  totalCount,
  sharePath,
}: {
  state: MapState;
  onPatchFilters: (next: Partial<MapState["filters"]>) => void;
  onPatch: (next: Partial<MapState>) => void;
  onOpenFilters: () => void;
  savedOnly: boolean;
  onToggleSaved: () => void;
  resultCount: number;
  totalCount: number;
  sharePath: string;
}) {
  const { share, state: shareState } = useShare();
  const count = activeFilterCount(state.filters);

  return (
    <div className="no-print pointer-events-none absolute inset-x-0 top-0 z-20">
      <div className="pointer-events-auto flex flex-col gap-2 p-3">
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
          <Chip
            onClick={onOpenFilters}
            active={count > 0}
            className="shrink-0 shadow-sm"
          >
            {count > 0 ? `Filters · ${count}` : "Filters"}
          </Chip>

          <Chip
            active={state.filters.openNow}
            onClick={() => onPatchFilters({ openNow: !state.filters.openNow })}
            className="shrink-0 shadow-sm"
          >
            Open now
          </Chip>

          {CATEGORIES.map((category) => (
            <Chip
              key={category}
              active={state.filters.categories.includes(category)}
              onClick={() =>
                onPatchFilters({
                  categories: toggle(state.filters.categories, category),
                })
              }
              className="shrink-0 shadow-sm"
            >
              <CategoryDot color={CATEGORY_COLOR[category]} />
              {CATEGORY_LABEL[category]}
            </Chip>
          ))}

          <Chip
            active={state.filters.maxDriveMinutes === null}
            onClick={() =>
              onPatchFilters({
                maxDriveMinutes:
                  state.filters.maxDriveMinutes === null ? 120 : null,
              })
            }
            className="shrink-0 shadow-sm"
          >
            Any distance
          </Chip>

          <Chip
            active={savedOnly}
            onClick={onToggleSaved}
            className="shrink-0 shadow-sm"
          >
            ★ Saved
          </Chip>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Pill tone={resultCount > 0 ? "neutral" : "warn"} className="shadow-sm">
            {resultCount === totalCount
              ? `${resultCount} places`
              : `${resultCount} of ${totalCount}`}
            {state.filters.maxDriveMinutes !== null && (
              <span className="text-ink-4">
                {" "}
                · ≤{formatDrive(state.filters.maxDriveMinutes)}
              </span>
            )}
          </Pill>

          <div className="flex items-center gap-2">
            <select
              aria-label="Sort places"
              value={state.sort}
              onChange={(event) =>
                onPatch({ sort: event.target.value as SortKey })
              }
              className="h-9 rounded-full border border-line bg-canvas px-3 text-[12px] font-medium text-ink shadow-sm"
            >
              <option value="best">Best time now</option>
              <option value="drive">Closest first</option>
              <option value="energy">Most intense</option>
              <option value="name">A – Z</option>
            </select>

            <button
              type="button"
              onClick={() => {
                void share({
                  title: "Esther's Hangout App",
                  text: shareLabel(state),
                  url: absoluteUrl(`${sharePath}?${shareQuery(state)}`),
                });
              }}
              aria-label="Share this map view"
              className="grid size-9 place-items-center rounded-full border border-line bg-canvas text-[13px] text-ink shadow-sm hover:bg-mist"
            >
              ↗
            </button>
          </div>
        </div>

        {shareState !== "idle" && (
          <p className="self-end rounded-full border border-line bg-canvas px-3 py-1 text-[11px] text-ink-2 shadow-sm">
            {shareMessage(shareState)}
          </p>
        )}
      </div>
    </div>
  );
}

function shareLabel(state: MapState): string {
  const parts: string[] = [];
  if (state.filters.categories.length > 0) {
    parts.push(state.filters.categories.map((c) => CATEGORY_LABEL[c]).join(", "));
  }
  if (state.filters.openNow) parts.push("open right now");
  if (state.filters.vibes.length > 0) parts.push(state.filters.vibes.join(", "));
  if (state.selectedId) parts.push("one spot selected");
  return parts.length > 0
    ? `Look at this: ${parts.join(" · ")}`
    : "Look at this map";
}

function shareQuery(state: MapState): string {
  return encodeState(state);
}
