"use client";

import { useMemo, useState } from "react";
import { DAY_LABEL, DAY_KEYS, VIBE_LABEL, type Place, type Vibe } from "@/types/place";import { Button, Chip, Divider, EmptyState, Pill, SectionLabel } from "./ui";
import { PlaceActions } from "./place-actions";
import { useSaved } from "./saved-provider";
import { useShare, shareMessage, absoluteUrl } from "./use-share";
import {
  DAY_THEMES,
  MAX_DAYS,
  buildPlan,
  planToText,
  type PlanDay,
} from "@/lib/plan";
import { DRIVE_CAP_OPTIONS } from "@/lib/filters";
import type { TimeContext } from "@/lib/best-time";
import { formatClock, formatDrive } from "@/lib/utils";

/**
 * The five-day planner.
 *
 * Not an AI generator: a small explainable sequencer that knows about Accra's gridlock,
 * about nightlife being a late activity, and about a 2-hour drive eating a whole day.
 * Everything it decides is visible, which is the point — a friend can read the plan and
 * argue with it.
 */
export function Planner({
  source,
  ctx,
}: {
  source: readonly Place[];
  ctx: TimeContext;
}) {
  const [days, setDays] = useState(3);
  const [themes, setThemes] = useState<Vibe[]>(["culture", "adventure", "nightlife"]);
  const [maxDrive, setMaxDrive] = useState(120);
  const [surprise, setSurprise] = useState(false);
  const [plan, setPlan] = useState<PlanDay[] | null>(null);
  const { saved } = useSaved();
  const { share, state: shareState } = useShare();

  const effectiveThemes = useMemo(
    () => themes.slice(0, days),
    [themes, days],
  );

  const generate = () => {
    setPlan(
      buildPlan(
        {
          days,
          themes: effectiveThemes,
          maxDriveMinutes: maxDrive,
          pinnedIds: saved,
          surprise,
        },
        source,
        ctx,
      ),
    );
  };

  const toggleTheme = (vibe: Vibe) => {
    setThemes((current) =>
      current.includes(vibe)
        ? current.filter((v) => v !== vibe)
        : [...current, vibe],
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="card p-5">
        <SectionLabel>How many days do you have?</SectionLabel>
        <div className="mt-3 flex flex-wrap gap-2">
          {Array.from({ length: MAX_DAYS }, (_unused, index) => index + 1).map((n) => (
            <Chip key={n} active={days === n} onClick={() => setDays(n)}>
              {n}
            </Chip>
          ))}
        </div>

        <Divider className="my-5" />

        <SectionLabel>Pick a mood per day</SectionLabel>
        <p className="mt-1 text-[12px] text-ink-3">
          Leave a day empty and the planner mixes it up instead. It will always put the
          club last.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DAY_THEMES.map((theme) => (
            <Chip
              key={theme}
              active={themes.includes(theme)}
              onClick={() => toggleTheme(theme)}
            >
              {VIBE_LABEL[theme]}
            </Chip>
          ))}
        </div>

        <Divider className="my-5" />

        <SectionLabel>How far are you willing to drive?</SectionLabel>
        <div className="mt-3 flex flex-wrap gap-2">
          {DRIVE_CAP_OPTIONS.map((minutes) => (
            <Chip
              key={minutes}
              active={maxDrive === minutes}
              onClick={() => setMaxDrive(minutes)}
            >
              {formatDrive(minutes)}
            </Chip>
          ))}
        </div>

        <Divider className="my-5" />

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={surprise}
            onChange={(event) => setSurprise(event.target.checked)}
            className="mt-0.5 size-4 accent-[#0b0b0c]"
          />
          <span className="text-[13px] leading-relaxed text-ink-2">
            <span className="font-semibold text-ink">Surprise me.</span> Ignore my moods
            and just use good judgement. Nightlife still goes last.
          </span>
        </label>

        <Button className="mt-5 w-full" size="lg" onClick={generate}>
          {plan ? "Rebuild the plan" : "Build the plan"}
        </Button>
        {saved.length > 0 && (
          <p className="mt-2 text-center text-[11px] text-ink-3">
            {saved.length} saved {saved.length === 1 ? "place" : "places"} will be
            pinned into the first days.
          </p>
        )}
      </section>

      {plan && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[17px] font-semibold text-ink">Your plan</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  void share({
                    title: "My Accra plan",
                    text: planToText(plan).slice(0, 120),
                    url: absoluteUrl("/plan"),
                  });
                }}
              >
                Share
              </Button>
              <Button variant="secondary" size="sm" onClick={() => window.print()}>
                Print
              </Button>
            </div>
          </div>
          {shareState !== "idle" && (
            <p className="text-[12px] text-ink-3" role="status">
              {shareMessage(shareState)}
            </p>
          )}

          {plan.every((day) => day.stops.length === 0) ? (
            <EmptyState
              glyph="◌"
              title="No plan yet"
              body="Nothing matched. Try a longer drive cap or fewer moods."
            />
          ) : (
            plan.map((day) => <PlanDayCard key={day.index} day={day} />)
          )}
        </section>
      )}
    </div>
  );
}

function PlanDayCard({ day }: { day: PlanDay }) {
  return (
    <article className="card print-plain p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[16px] font-semibold text-ink">{day.title}</h3>
        <Pill tone="neutral">
          {DAY_LABEL[DAY_KEYS[day.index % 7] ?? "sun"]} ·{" "}
          {formatDrive(day.totalTravelMinutes)} driving
        </Pill>
      </div>

      {day.stops.length === 0 ? (
        <p className="text-[13px] text-ink-3">Nothing scheduled for this day.</p>
      ) : (
        <ol className="flex flex-col">
          {day.stops.map((stop, index) => (
            <li key={stop.place.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line bg-canvas text-[11px] font-semibold text-ink tnum">
                  {index + 1}
                </span>
                {index < day.stops.length - 1 && (
                  <span className="my-1 w-px flex-1 bg-line" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1 pb-5">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <h4 className="text-[15px] font-semibold text-ink">
                    {stop.place.name}
                  </h4>
                  {stop.arriveBy !== null && (
                    <span className="text-[12px] text-ink-3 tnum">
                      arrive ~{formatClock(stop.arriveBy)}
                    </span>
                  )}
                  {stop.travelMinutes > 0 && (
                    <span className="text-[12px] text-ink-4 tnum">
                      +{stop.travelMinutes} min drive
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">
                  {stop.note}
                </p>
                {stop.warning && (
                  <p className="mt-1 text-[12px] text-warn">{stop.warning}</p>
                )}
                <div className="mt-2 max-w-sm">
                  <PlaceActions place={stop.place} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {day.warnings.length > 0 && (
        <ul className="mt-1 flex flex-col gap-1 border-t border-line pt-3">
          {day.warnings.map((warning) => (
            <li key={warning} className="text-[12px] leading-relaxed text-ink-3">
              — {warning}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
