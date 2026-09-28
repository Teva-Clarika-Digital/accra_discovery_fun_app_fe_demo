import Link from "next/link";
import { CollectionCard } from "@/components/collection-card";
import { PageShell } from "@/components/page-shell";
import { Pill } from "@/components/ui";
import { COLLECTIONS } from "@/data/collections";
import { PLACES, RECOMMENDABLE } from "@/data";
import { contextFrom, countOpenNow } from "@/lib/best-time";
import { SITE_TAGLINE } from "@/lib/site";
import { formatClock } from "@/lib/utils";

export const revalidate = 60;

/**
 * The landing page.
 *
 * Deliberately a *decision* page, not a feed. A first-time visitor in Accra with five
 * days does not know what to search for, so there are exactly four cards and one quiet
 * escape hatch. Everything else the app can do is one tap from `/m`, `/list`, `/plan`
 * and `/table`.
 */
export default function HomePage() {
  const ctx = contextFrom();
  const now = ctx.at;
  const openCount = countOpenNow(RECOMMENDABLE, ctx);

  return (
    <PageShell width="narrow">
      <header className="mb-7">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">
          {formatClock(now.getHours() * 60 + now.getMinutes())} in Accra
        </p>
        <h1 className="text-balance text-[30px] font-semibold leading-[1.1] tracking-tight text-ink sm:text-[38px]">
          {SITE_TAGLINE}
        </h1>
        <p className="mt-3 max-w-prose text-[14px] leading-relaxed text-ink-2">
          {PLACES.length} places within a few hours of central Accra, each with
          drive time, opening hours and the window it is actually worth
          visiting.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Pill tone={openCount > 0 ? "live" : "neutral"}>
            {openCount > 0
              ? `${openCount} open right now`
              : "Nothing open right now — the map still works"}
          </Pill>
          <Pill tone="warn">{RECOMMENDABLE.length} confirmed active</Pill>
        </div>
      </header>

      <h2 className="sr-only">Choose a category</h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {COLLECTIONS.map((collection) => (
          <li key={collection.id}>
            <CollectionCard collection={collection} ctx={ctx} />
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col items-center gap-2">
        <Link
          href="/m"
          className="text-[14px] font-medium text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink hover:decoration-ink"
        >
          Show me everything
        </Link>
        <p className="max-w-xs text-center text-[11px] leading-relaxed text-ink-4">
          Powered by :{" "}
          <a
            href="https://www.clarikadigital.net"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-ink-3 underline decoration-line-strong underline-offset-4 hover:text-ink hover:decoration-ink"
          >
            Teva Clarika Digital
          </a>
        </p>
      </div>
    </PageShell>
  );
}
