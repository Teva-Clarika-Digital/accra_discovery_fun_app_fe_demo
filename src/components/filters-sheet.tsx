"use client";

import {
  CATEGORIES,
  CATEGORY_LABEL,
  PRICE_LABEL,
  VIBES,
  VIBE_LABEL,
  type PriceTier,
} from "@/types/place";
import { CATEGORY_COLOR } from "@/lib/colors";
import {
  DRIVE_CAP_OPTIONS,
  toggle,
  type Filters,
} from "@/lib/filters";
import { formatDrive } from "@/lib/utils";
import { Button, CategoryDot, Chip, Divider, SectionLabel } from "./ui";

/**
 * Filter sheet. Every facet the app actually uses, no more, no less.
 *
 * Distance is the headline control because the original brief was literally "within an
 * hour of Accra" — and the answer had to be adjustable, because Akosombo is not.
 */
export function FiltersSheet({
  filters,
  onChange,
  onClose,
  onReset,
  resultCount,
}: {
  filters: Filters;
  onChange: (next: Partial<Filters>) => void;
  onClose: () => void;
  onReset: () => void;
  resultCount: number;
}) {
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Filters">
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="absolute inset-0 bg-ink/25"
      />
      <div className="animate-sheet-in sheet absolute inset-x-0 bottom-0 mx-auto max-h-[88vh] w-full max-w-md overflow-y-auto p-5">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line-strong" aria-hidden />

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-ink">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 place-items-center rounded-full text-ink-3 hover:bg-mist hover:text-ink"
          >
            ✕
          </button>
        </div>

        <section className="mb-5">
          <SectionLabel>How far from Accra?</SectionLabel>
          <div className="mt-2 flex flex-wrap gap-2">
            {DRIVE_CAP_OPTIONS.map((minutes) => (
              <Chip
                key={minutes}
                active={filters.maxDriveMinutes === minutes}
                onClick={() => onChange({ maxDriveMinutes: minutes })}
              >
                {formatDrive(minutes)}
              </Chip>
            ))}
            <Chip
              active={filters.maxDriveMinutes === null}
              onClick={() => onChange({ maxDriveMinutes: null })}
            >
              No limit
            </Chip>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-3">
            The brief said &ldquo;no more than an hour&rdquo;. Akosombo is not, so this
            is a dial rather than a rule.
          </p>
        </section>

        <Divider className="mb-5" />

        <section className="mb-5">
          <SectionLabel>Right now</SectionLabel>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip
              active={filters.openNow}
              onClick={() => onChange({ openNow: !filters.openNow })}
            >
              Open right now
            </Chip>
            <Chip
              active={filters.outdoors === true}
              onClick={() =>
                onChange({ outdoors: filters.outdoors === true ? null : true })
              }
            >
              Outdoors
            </Chip>
            <Chip
              active={filters.outdoors === false}
              onClick={() =>
                onChange({ outdoors: filters.outdoors === false ? null : false })
              }
            >
              Indoors
            </Chip>
            <Chip
              active={filters.includeDormant}
              onClick={() =>
                onChange({ includeDormant: !filters.includeDormant })
              }
            >
              Include unconfirmed
            </Chip>
          </div>
        </section>

        <Divider className="mb-5" />

        <section className="mb-5">
          <SectionLabel>Category</SectionLabel>
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <Chip
                key={category}
                active={filters.categories.includes(category)}
                onClick={() =>
                  onChange({ categories: toggle(filters.categories, category) })
                }
              >
                <CategoryDot color={CATEGORY_COLOR[category]} />
                {CATEGORY_LABEL[category]}
              </Chip>
            ))}
          </div>
        </section>

        <Divider className="mb-5" />

        <section className="mb-5">
          <SectionLabel>Vibe</SectionLabel>
          <div className="mt-2 flex flex-wrap gap-2">
            {VIBES.map((vibe) => (
              <Chip
                key={vibe}
                active={filters.vibes.includes(vibe)}
                onClick={() => onChange({ vibes: toggle(filters.vibes, vibe) })}
              >
                {VIBE_LABEL[vibe]}
              </Chip>
            ))}
          </div>
        </section>

        <Divider className="mb-5" />

        <section className="mb-5">
          <SectionLabel>Price</SectionLabel>
          <div className="mt-2 flex flex-wrap gap-2">
            {([0, 1, 2, 3] as const).map((tier: PriceTier) => (
              <Chip
                key={tier}
                active={filters.priceTiers.includes(tier)}
                onClick={() => onChange({ priceTiers: toggle(filters.priceTiers, tier) })}
              >
                {PRICE_LABEL[tier]}
              </Chip>
            ))}
          </div>
        </section>

        <div className="sticky bottom-0 -mx-5 mt-2 flex items-center gap-2 border-t border-line bg-canvas px-5 pt-4">
          <Button variant="ghost" onClick={onReset}>
            Reset
          </Button>
          <Button className="flex-1" onClick={onClose}>
            Show {resultCount} {resultCount === 1 ? "place" : "places"}
          </Button>
        </div>
      </div>
    </div>
  );
}
