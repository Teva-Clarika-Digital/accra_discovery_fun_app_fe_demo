"use client";

import { useMemo, useState } from "react";
import type { Place } from "@/types/place";
import { CATEGORIES, CATEGORY_LABEL, PRICE_LABEL } from "@/types/place";
import { CATEGORY_COLOR } from "@/lib/colors";
import { summariseWeek } from "@/lib/hours";
import { matchesQuery, type SortKey } from "@/lib/filters";
import { formatDrive } from "@/lib/utils";
import { CategoryDot, Chip, EmptyState } from "./ui";

type Row = {
  readonly place: Place;
  readonly status: string;
  readonly hours: string;
  readonly booking: string;
  readonly map: string;
};

/**
 * The table.
 *
 * This is the view the source document actually asked for: a grid of locations,
 * activities, hours, booking details and a map link, one row per place. It is built to
 * be printed and pasted into a message — `@media print` flattens the borders and the
 * app chrome disappears.
 */
export function TableView({ source }: { source: readonly Place[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [includeDormant, setIncludeDormant] = useState(true);
  const [sort, setSort] = useState<SortKey>("drive");

  const rows = useMemo<Row[]>(() => {
    const filtered = source.filter((place) => {
      if (!includeDormant && place.status !== "active") return false;
      if (category && place.category !== category) return false;
      return matchesQuery(place, query);
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "energy":
          return b.energy - a.energy;
        case "best":
          return a.driveMinutes - b.driveMinutes;
        case "drive":
        default:
          return a.driveMinutes - b.driveMinutes;
      }
    });

    return sorted.map((place) => ({
      place,
      status:
        place.status === "active"
          ? "Active"
          : place.status === "dormant"
            ? "Unconfirmed"
            : "Closed",
      hours: summariseWeek(place.hours),
      booking:
        place.booking?.phoneDisplay ??
        place.booking?.phone ??
        place.booking?.website ??
        "—",
      map:
        place.mapsUrl ??
        `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`,
    }));
  }, [source, query, category, includeDormant, sort]);

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex flex-col gap-3">
        <label className="sr-only" htmlFor="table-search">
          Search the table
        </label>
        <input
          id="table-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search the table…"
          className="h-11 w-full rounded-full border border-line bg-canvas px-4 text-[14px] text-ink placeholder:text-ink-4"
        />

        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
          <Chip active={category === null} onClick={() => setCategory(null)}>
            Everything
          </Chip>
          {CATEGORIES.map((value) => (
            <Chip
              key={value}
              active={category === value}
              onClick={() => setCategory(category === value ? null : value)}
            >
              <CategoryDot color={CATEGORY_COLOR[value]} />
              {CATEGORY_LABEL[value]}
            </Chip>
          ))}
          <Chip
            active={includeDormant}
            onClick={() => setIncludeDormant((v) => !v)}
          >
            Show unconfirmed
          </Chip>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] text-ink-3 tnum">
            <span className="font-semibold text-ink">{rows.length}</span> rows
          </p>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="table-sort">
              Sort
            </label>
            <select
              id="table-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="h-9 rounded-full border border-line bg-canvas px-3 text-[12px] font-medium text-ink"
            >
              <option value="drive">Closest first</option>
              <option value="name">A – Z</option>
              <option value="energy">Most intense</option>
            </select>
            <button
              type="button"
              onClick={() => window.print()}
              className="h-9 rounded-full border border-line bg-canvas px-3.5 text-[12px] font-medium text-ink hover:bg-mist"
            >
              Print
            </button>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          glyph="◌"
          title="No rows"
          body="Nothing matches that search. Clear it and try again."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] border-collapse text-left text-[13px]">
            <caption className="sr-only">
              Every place in Esther&apos;s Hangout App, with drive time, hours, booking
              and a map link.
            </caption>
            <thead>
              <tr className="border-b border-line-strong">
                <Th>Place</Th>
                <Th>Activities</Th>
                <Th align="right">Drive</Th>
                <Th>Hours</Th>
                <Th align="right">Price</Th>
                <Th>Status</Th>
                <Th>Booking</Th>
                <Th>Map</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.place.id}
                  className="border-b border-line align-top"
                >
                  <Td>
                    <a
                      href={`/place/${row.place.id}`}
                      className="font-semibold text-ink hover:underline"
                    >
                      {row.place.name}
                    </a>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-3">
                      <CategoryDot color={CATEGORY_COLOR[row.place.category]} />
                      {CATEGORY_LABEL[row.place.category]} · {row.place.area}
                    </span>
                  </Td>
                  <Td className="max-w-[16rem] text-ink-2">
                    {row.place.activities.slice(0, 4).join(", ")}
                  </Td>
                  <Td align="right" className="tnum text-ink-2">
                    {formatDrive(row.place.driveMinutes)}
                  </Td>
                  <Td className="max-w-[14rem] text-ink-2 tnum">{row.hours}</Td>
                  <Td align="right" className="text-ink-2">
                    {PRICE_LABEL[row.place.priceTier]}
                  </Td>
                  <Td>
                    <span
                      className={
                        row.place.status === "active"
                          ? "text-live"
                          : row.place.status === "dormant"
                            ? "text-warn"
                            : "text-dead"
                      }
                    >
                      {row.status}
                    </span>
                  </Td>
                  <Td className="max-w-[12rem] break-words text-ink-2">
                    {row.booking}
                  </Td>
                  <Td>
                    <a
                      href={row.map}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink-2 underline underline-offset-2 hover:text-ink"
                    >
                      Open
                    </a>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-4 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  className,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={`px-3 py-2.5 ${align === "right" ? "text-right" : "text-left"} ${className ?? ""}`}
    >
      {children}
    </td>
  );
}
