import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageShell, PageHeader } from "@/components/page-shell";
import { PlaceCard } from "@/components/place-card";
import { PlaceActions } from "@/components/place-actions";
import { AdviceLine } from "@/components/advice";
import { Chip, Divider, Pill, SectionLabel } from "@/components/ui";
import { getPlace, PLACES } from "@/data";
import { bestTimeAdvice, contextFrom } from "@/lib/best-time";
import { nearestTo } from "@/lib/geo";
import { dayHoursLabel, openStatusAt, dayKeyFor, minutesOfDay, dayIndexFor } from "@/lib/hours";
import {
  CATEGORY_LABEL,
  DAY_KEYS,
  DAY_LABEL,
  DAY_PART_LABEL,
  PRICE_LABEL,
  RADIUS_LABEL,
  VENUE_TYPE_LABEL,
  VIBE_LABEL,
} from "@/types/place";
import { formatDrive, formatRelativeDays, isStale } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return PLACES.map((place) => ({ id: place.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const place = getPlace(id);
  if (!place) return { title: "Not found" };
  return {
    title: place.name,
    description: `${place.tagline} — ${place.area}. Drive time, opening hours, the best window to go, and how to book.`,
    alternates: { canonical: `/place/${place.id}` },
  };
}

/**
 * The place page.
 *
 * Ordered by what someone standing in a taxi actually needs: is it open, is it the
 * right time, how far is it, can I call it. The honesty block is last but always
 * present — an app that invents opening hours must say so.
 */
export default async function PlacePage({ params }: Params) {
  const { id } = await params;
  const place = getPlace(id);
  if (!place) notFound();

  const ctx = contextFrom();
  const advice = bestTimeAdvice(place, ctx);
  const status = openStatusAt(
    place.hours,
    dayIndexFor(ctx.at),
    minutesOfDay(ctx.at),
  );
  const nearby = nearestTo(PLACES, place, 4, place.id).filter(
    (p) => p.status === "active",
  );

  const stale = isStale(place.lastVerified);

  return (
    <PageShell>
      <Link
        href="/list"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink"
      >
        ← All places
      </Link>

      <PageHeader
        eyebrow={`${CATEGORY_LABEL[place.category]}${place.venueType ? ` · ${VENUE_TYPE_LABEL[place.venueType]}` : ""}`}
        title={place.name}
        lede={place.tagline}
        action={
          <Pill tone={place.status === "active" ? "live" : place.status === "dormant" ? "warn" : "dead"}>
            {place.status === "active"
              ? "Confirmed active"
              : place.status === "dormant"
                ? "Unconfirmed"
                : "Closed"}
          </Pill>
        }
      />

      <div className="mb-5 flex flex-col gap-2">
        <AdviceLine advice={advice} className="text-[13px]" />
        {advice.window && (
          <p className="text-[12px] text-ink-3">
            Suggested window: <span className="font-medium text-ink-2 tnum">{advice.window}</span>
          </p>
        )}
      </div>

      <PlaceActions place={place} />

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Drive from Accra" value={formatDrive(place.driveMinutes)} />
        <Stat label="Price" value={PRICE_LABEL[place.priceTier]} />
        <Stat label="Where" value={`${place.area}`} sub={RADIUS_LABEL[place.radius]} />
        <Stat
          label="Right now"
          value={status.open ? "Open" : "Closed"}
          sub={place.costNote ?? place.dressCode ?? undefined}
          tone={status.open ? "live" : "dead"}
        />
      </div>

      {place.address && (
        <p className="mt-3 text-[13px] leading-relaxed text-ink-2">{place.address}</p>
      )}

      {place.activities.length > 0 && (
        <section className="mt-7">
          <SectionLabel>What you actually do there</SectionLabel>
          <ul className="mt-2 flex flex-wrap gap-2">
            {place.activities.map((activity) => (
              <li key={activity}>
                <span className="inline-flex rounded-full border border-line bg-mist px-3 py-1 text-[12px] text-ink-2">
                  {activity}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Divider className="my-7" />

      <section>
        <SectionLabel>Opening hours</SectionLabel>
        <p className="mt-1 mb-3 text-[12px] text-ink-3">
          {status.open && status.untilMinutes !== null
            ? `Open now — ${dayHoursLabel(place.hours[dayKeyFor(ctx.at)])}`
            : "Closed at the moment you are looking."}
        </p>
        <dl className="overflow-hidden rounded-card border border-line">
          {DAY_KEYS.map((key, index) => {
            const today = index === ctx.at.getDay();
            return (
              <div
                key={key}
                className={`flex items-center justify-between border-b border-line px-4 py-2 text-[13px] last:border-b-0 ${
                  today ? "bg-mist" : ""
                }`}
              >
                <dt className={today ? "font-semibold text-ink" : "text-ink-2"}>
                  {DAY_LABEL[key]}
                  {today && (
                    <span className="ml-2 text-[10px] font-normal uppercase tracking-wider text-ink-4">
                      today
                    </span>
                  )}
                </dt>
                <dd className="tnum text-ink-2">{dayHoursLabel(place.hours[key])}</dd>
              </div>
            );
          })}
        </dl>
      </section>

      <Divider className="my-7" />

      <section>
        <SectionLabel>Best time to go</SectionLabel>
        <ul className="mt-2 flex flex-wrap gap-2">
          {place.bestTimes.ideal.map((part) => (
            <li key={part}>
              <Chip>{DAY_PART_LABEL[part]}</Chip>
            </li>
          ))}
          {place.bestTimes.goodInRain && (
            <li>
              <Chip>Works in the rain</Chip>
            </li>
          )}
        </ul>
        {place.bestTimes.why.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5">
            {place.bestTimes.why.map((reason) => (
              <li key={reason} className="text-[13px] leading-relaxed text-ink-2">
                — {reason}
              </li>
            ))}
          </ul>
        )}
        {place.bestTimes.caution && (
          <p className="mt-3 rounded-card border border-warn/25 bg-warn-soft px-3 py-2 text-[12px] leading-relaxed text-warn">
            {place.bestTimes.caution}
          </p>
        )}
        {(place.bestTimes.quietDays?.length || place.bestTimes.busyDays?.length) && (
          <p className="mt-3 text-[12px] leading-relaxed text-ink-3">
            {place.bestTimes.quietDays?.length
              ? `Quieter: ${dayList(place.bestTimes.quietDays)}. `
              : ""}
            {place.bestTimes.busyDays?.length
              ? `Busiest: ${dayList(place.bestTimes.busyDays)}.`
              : ""}
          </p>
        )}
      </section>

      {(place.vibes.length > 0 || place.notes || place.dressCode) && (
        <>
          <Divider className="my-7" />
          <section className="flex flex-col gap-4">
            {place.vibes.length > 0 && (
              <div>
                <SectionLabel>Vibe</SectionLabel>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {place.vibes.map((vibe) => (
                    <li key={vibe}>
                      <Chip>{VIBE_LABEL[vibe]}</Chip>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {place.dressCode && (
              <p className="text-[13px] text-ink-2">
                <span className="font-semibold text-ink">Dress code: </span>
                {place.dressCode}
              </p>
            )}
            {place.notes && (
              <p className="text-[13px] leading-relaxed text-ink-2">{place.notes}</p>
            )}
          </section>
        </>
      )}

      <Divider className="my-7" />

      {/* Honesty block. The PDF research got one venue wrong; this is the receipt. */}
      <section className="rounded-card border border-line bg-mist p-4">
        <SectionLabel>How sure are we?</SectionLabel>
        <dl className="mt-2 flex flex-col gap-1 text-[12px] leading-relaxed text-ink-2">
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-ink-4">Checked</dt>
            <dd>
              {place.lastVerified} ({formatRelativeDays(place.lastVerified, ctx.at)})
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-ink-4">Verification</dt>
            <dd>
              {place.verification === "verified"
                ? "Checked by a human."
                : "From the original research, not yet confirmed by a human."}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-ink-4">Pin</dt>
            <dd>
              {place.pinAccuracy === "exact"
                ? "Exact location."
                : "Approximate pin — check the address before you set off."}
            </dd>
          </div>
          {place.source && (
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-ink-4">Source</dt>
              <dd className="break-all">{place.source}</dd>
            </div>
          )}
        </dl>
        {stale && (
          <p className="mt-3 text-[12px] font-medium text-warn">
            This record is over six months old. Call before you travel.
          </p>
        )}
      </section>

      {nearby.length > 0 && (
        <>
          <Divider className="my-7" />
          <section>
            <SectionLabel>Nearby</SectionLabel>
            <ul className="mt-2 flex flex-col gap-3">
              {nearby.map((other) => (
                <li key={other.id}>
                  <PlaceCard place={other} ctx={ctx} />
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </PageShell>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string | undefined;
  tone?: "live" | "dead";
}) {
  return (
    <div className="rounded-card border border-line p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-4">
        {label}
      </p>
      <p
        className={`mt-1 text-[15px] font-semibold ${
          tone === "live" ? "text-live" : tone === "dead" ? "text-dead" : "text-ink"
        } tnum`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] leading-tight text-ink-3">{sub}</p>}
    </div>
  );
}

function dayList(days: readonly number[]): string {
  return days
    .map((index) => DAY_LABEL[DAY_KEYS[index] ?? "sun"] ?? "Sunday")
    .join(", ");
}
