import Link from "next/link";
import { CATEGORY_COLOR } from "@/lib/colors";
import {
  CATEGORY_LABEL,
  PRICE_LABEL,
  RADIUS_LABEL,
  type Place,
} from "@/types/place";
import { CategoryDot, Pill } from "./ui";
import { cn, formatDrive } from "@/lib/utils";
import { summariseWeek } from "@/lib/hours";
import { bestTimeAdvice, type TimeContext } from "@/lib/best-time";
import { AdviceLine } from "./advice";

/**
 * A place, as a row.
 *
 * Shows the three things that decide a stop: what it is, how far it is, and whether
 * going now is a good idea. Everything else lives on the detail page.
 */
export function PlaceCard({
  place,
  ctx,
  href,
  trailing,
  className,
}: {
  place: Place;
  ctx: TimeContext;
  href?: string;
  trailing?: React.ReactNode;
  className?: string;
}) {
  const advice = bestTimeAdvice(place, ctx);
  const hrefPath = href ?? `/place/${place.id}`;

  return (
    <article
      className={cn(
        "card group relative flex flex-col gap-3 p-4 transition-colors duration-150 hover:border-line-strong",
        place.status === "closed" && "opacity-70",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <CategoryDot color={CATEGORY_COLOR[place.category]} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
              {CATEGORY_LABEL[place.category]}
            </span>
            {place.status !== "active" && (
              <Pill tone={place.status === "closed" ? "dead" : "warn"}>
                {place.status === "closed" ? "Closed" : "Unconfirmed"}
              </Pill>
            )}
            {place.verification === "unverified" && (
              <Pill tone="neutral" className="hidden sm:inline-flex">
                Check first
              </Pill>
            )}
          </div>
          <h3 className="text-[16px] font-semibold leading-snug text-ink">
            <Link
              href={hrefPath}
              className="after:absolute after:inset-0 after:content-['']"
            >
              {place.name}
            </Link>
          </h3>
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-2">
            {place.tagline}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[13px] font-semibold text-ink tnum">
            {PRICE_LABEL[place.priceTier]}
          </div>
          <div className="text-[11px] text-ink-3 tnum">
            {formatDrive(place.driveMinutes)}
          </div>
        </div>
      </div>

      <AdviceLine advice={advice} />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-3">
        <span>{place.area}</span>
        <span aria-hidden className="text-line-strong">
          ·
        </span>
        <span className="tnum">{summariseWeek(place.hours)}</span>
        <span aria-hidden className="text-line-strong">
          ·
        </span>
        <span>{RADIUS_LABEL[place.radius]}</span>
      </div>

      {trailing}
    </article>
  );
}
