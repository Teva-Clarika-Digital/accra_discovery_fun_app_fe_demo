"use client";

import Link from "next/link";
import type { Place } from "@/types/place";
import { CATEGORY_COLOR } from "@/lib/colors";
import { adviceTone, bestTimeAdvice, type TimeContext } from "@/lib/best-time";
import { dayHoursLabel, dayKeyFor, openStatusAt, summariseWeek } from "@/lib/hours";
import { DAY_LABEL } from "@/types/place";
import { cn, formatDrive } from "@/lib/utils";
import { buttonClass, CategoryDot, Pill } from "../ui";
import { useSaved } from "../saved-provider";
import { useShare, shareMessage, absoluteUrl } from "../use-share";

/**
 * Marker tap → this sheet. One tap gets you the decision; two taps get you the page.
 * It is a sheet, not a modal, because on a phone a modal is a dead end.
 */
export function PlacePreviewSheet({
  place,
  ctx,
  onClose,
}: {
  place: Place;
  ctx: TimeContext;
  onClose: () => void;
}) {
  const advice = bestTimeAdvice(place, ctx);
  const tone = adviceTone(advice);
  const today = dayKeyFor(ctx.at);
  const status = openStatusAt(place.hours, ctx.at.getDay(), ctx.at.getHours() * 60 + ctx.at.getMinutes());
  const { isSaved, toggle, ready } = useSaved();
  const { share, state } = useShare();
  const saved = ready && isSaved(place.id);

  const directions = place.mapsUrl ?? `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;

  return (
    <div
      className="animate-sheet-in sheet absolute inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md p-4"
      role="dialog"
      aria-label={place.name}
    >
      <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-line-strong" aria-hidden />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1.5">
            <CategoryDot color={CATEGORY_COLOR[place.category]} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
              {place.area}
            </span>
          </div>
          <h2 className="text-[17px] font-semibold leading-tight text-ink">
            {place.name}
          </h2>
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-2">
            {place.tagline}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-mist hover:text-ink"
        >
          ✕
        </button>
      </div>

      <p
        className={cn(
          "mt-3 rounded-xl border px-3 py-2 text-[12px] leading-relaxed",
          tone === "live" && "border-live/25 bg-live-soft text-live",
          tone === "soon" && "border-warn/25 bg-warn-soft text-warn",
          tone === "later" && "border-line bg-mist text-ink-2",
          tone === "dead" && "border-line bg-mist text-dead",
        )}
      >
        <strong className="font-semibold">{advice.label}.</strong> {advice.detail}
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
        <div>
          <dt className="text-ink-4">Drive from Accra</dt>
          <dd className="font-medium text-ink tnum">{formatDrive(place.driveMinutes)}</dd>
        </div>
        <div>
          <dt className="text-ink-4">Today</dt>
          <dd className="font-medium text-ink">
            {dayHoursLabel(place.hours[today])}
            {status.open && status.untilMinutes !== null && (
              <span className="text-ink-3"> · open now</span>
            )}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-ink-4">Week</dt>
          <dd className="font-medium text-ink tnum">{summariseWeek(place.hours)}</dd>
        </div>
      </dl>

      {place.status !== "active" && (
        <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
          {place.status === "closed"
            ? `No longer operating. Kept here so nobody wastes a trip. Last checked ${place.lastVerified}.`
            : `Not confirmed recently. Call ahead before you travel — last checked ${place.lastVerified}.`}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={`/place/${place.id}`}
          className={buttonClass("primary", "sm", "flex-1")}
        >
          Full details
        </Link>
        <a
          href={directions}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass("secondary", "sm")}
        >
          Directions
        </a>
        <button
          type="button"
          onClick={() => toggle(place.id)}
          aria-pressed={saved}
          aria-label={saved ? "Remove from saved" : "Save place"}
          className={buttonClass("secondary", "sm", "w-11 px-0")}
        >
          {saved ? "★" : "☆"}
        </button>
        <button
          type="button"
          onClick={() => {
            void share({
              title: place.name,
              text: place.tagline,
              url: absoluteUrl(`/place/${place.id}`),
            });
          }}
          aria-label="Share this place"
          className={buttonClass("secondary", "sm", "w-11 px-0")}
        >
          ↗
        </button>
      </div>

      {state !== "idle" && (
        <p className="mt-2 text-center text-[11px] text-ink-3">
          {shareMessage(state)}
        </p>
      )}

      <p className="mt-2 text-center text-[10px] text-ink-4">
        {DAY_LABEL[today]} hours as of {place.lastVerified}
      </p>

      {place.dressCode && (
        <p className="mt-1 text-center text-[10px] text-ink-4">
          Dress code: {place.dressCode}
        </p>
      )}

      <Pill tone="neutral" className="sr-only">
        {advice.verdict}
      </Pill>
    </div>
  );
}
