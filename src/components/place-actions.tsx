"use client";

import type { Place } from "@/types/place";
import { Button, buttonClass } from "./ui";
import { useSaved } from "./saved-provider";
import { useShare, shareMessage, absoluteUrl } from "./use-share";

/**
 * Save / share / directions.
 *
 * The share target is a *place* URL, not a map URL: "look at this place" is the message
 * you send a friend, and the place page is self-contained.
 */
export function PlaceActions({ place }: { place: Place }) {
  const { isSaved, toggle, ready } = useSaved();
  const { share, state } = useShare();
  const saved = ready && isSaved(place.id);

  const directions =
    place.mapsUrl ??
    `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;

  const phone = place.booking?.phone;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={saved ? "secondary" : "primary"}
          onClick={() => toggle(place.id)}
          aria-pressed={saved}
        >
          {saved ? "★ Saved" : "☆ Save"}
        </Button>

        <Button
          variant="secondary"
          onClick={() => {
            void share({
              title: place.name,
              text: `${place.tagline} — ${place.area}`,
              url: absoluteUrl(`/place/${place.id}`),
            });
          }}
        >
          Share
        </Button>

        <a
          href={directions}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass("secondary")}
        >
          Directions
        </a>

        {phone && (
          <a href={`tel:${phone}`} className={buttonClass("secondary")}>
            Call
          </a>
        )}
      </div>

      {state !== "idle" && (
        <p className="text-[12px] text-ink-3" role="status">
          {shareMessage(state)}
        </p>
      )}
    </div>
  );
}
