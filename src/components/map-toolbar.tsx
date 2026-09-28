"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CATEGORIES, CATEGORY_LABEL } from "@/types/place";
import { CATEGORY_COLOR } from "@/lib/colors";
import { activeFilterCount, toggle, type SortKey } from "@/lib/filters";
import { useShare, shareMessage, absoluteUrl } from "./use-share";
import { CategoryDot } from "./ui";
import { formatDrive } from "@/lib/utils";
import type { MapState } from "@/lib/share";
import { encodeState } from "@/lib/share";
import { cn } from "@/lib/utils";

/**
 * The map screen's chrome.
 *
 * One floating glass panel instead of a litter of pills: the title bar on top, the
 * filter strip underneath. Everything is a fast-finger target, the panels are
 * translucent so the map stays the star, and nothing else floats over the canvas.
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
  backHref,
  title,
  subtitle,
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
  backHref?: string;
  title: string;
  subtitle?: string;
}) {
  const { share, state: shareState } = useShare();
  const count = activeFilterCount(state.filters);

  const driveHint =
    state.filters.maxDriveMinutes !== null
      ? ` · ≤${formatDrive(state.filters.maxDriveMinutes)}`
      : "";

  return (
    <div className="no-print pointer-events-none absolute inset-x-0 top-0 z-20">
      <div className="pointer-events-auto mx-auto flex w-full max-w-3xl flex-col gap-2 p-3">
        {/* --- title bar ------------------------------------------------- */}
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-canvas/90 py-2 pl-2.5 pr-2 shadow-lg shadow-ink/10 backdrop-blur-md">
          {backHref && (
            <Link
              href={backHref}
              aria-label="Back"
              className="grid size-9 shrink-0 place-items-center rounded-full text-[15px] text-ink hover:bg-ink/5 active:scale-95"
            >
              ←
            </Link>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[14px] font-semibold leading-tight text-ink">
              {title}
            </h1>
            {subtitle && (
              <p className="truncate text-[11px] leading-tight text-ink-3">
                {subtitle}
              </p>
            )}
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums",
              resultCount > 0
                ? "bg-mist text-ink-2"
                : "bg-warn-soft text-warn",
            )}
          >
            {resultCount === totalCount
              ? `${resultCount}${driveHint}`
              : `${resultCount}/${totalCount}${driveHint}`}
          </span>
          <select
            aria-label="Sort places"
            value={state.sort}
            onChange={(event) =>
              onPatch({ sort: event.target.value as SortKey })
            }
            className="h-9 shrink-0 rounded-full border border-line bg-canvas px-2 text-[12px] font-medium text-ink-2 hover:border-line-strong focus:border-ink focus:outline-none"
          >
            <option value="best">Best now</option>
            <option value="drive">Closest</option>
            <option value="energy">Wildest</option>
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
            className="grid size-9 shrink-0 place-items-center rounded-full text-ink transition-colors hover:bg-ink/5"
          >
            ↗
          </button>
        </div>

        {/* --- active filter strip -------------------------------------- */}
        <div className="no-scrollbar flex items-center gap-1 overflow-x-auto rounded-full border border-line bg-canvas/70 p-1 shadow-md shadow-ink/10 backdrop-blur-md">
          <ChipPill
            active={count > 0}
            onClick={onOpenFilters}
            label={`Filters${count > 0 ? ` · ${count}` : ""}`}
          />
          <Divider />
          <ChipPill
            active={state.filters.openNow}
            onClick={() => onPatchFilters({ openNow: !state.filters.openNow })}
            label="Open now"
          />
          {CATEGORIES.map((category) => (
            <ChipPill
              key={category}
              active={state.filters.categories.includes(category)}
              onClick={() =>
                onPatchFilters({
                  categories: toggle(state.filters.categories, category),
                })
              }
            >
              <CategoryDot color={CATEGORY_COLOR[category]} />
              {CATEGORY_LABEL[category]}
            </ChipPill>
          ))}
          <Divider />
          <ChipPill
            active={savedOnly}
            onClick={onToggleSaved}
            label="★ Saved"
          />
        </div>

        {shareState !== "idle" && (
          <p className="mx-auto w-fit rounded-full border border-line bg-canvas/95 px-3 py-1 text-[11px] text-ink-2 shadow-md backdrop-blur-sm">
            {shareMessage(shareState)}
          </p>
        )}
      </div>
    </div>
  );
}

function ChipPill({
  active = false,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label?: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-[30px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12px] font-medium transition-colors duration-150",
        active
          ? "bg-ink text-white"
          : "bg-transparent text-ink-2 hover:bg-ink/10",
      )}
    >
      {label ?? children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-line" />;
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