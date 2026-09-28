import Link from "next/link";
import type { Collection } from "@/data/collections";
import { CATEGORY_TINT } from "@/lib/colors";
import { collectionCounts } from "@/data/collections";
import type { TimeContext } from "@/lib/best-time";
/**
 * A landing card.
 *
 * The brief for these four cards was: bold, unmistakable, and carrying a real number.
 * So no stock photography, no gradient, no icon font — a flat category tint, one glyph,
 * the title at display size, and a live count underneath.
 *
 * It is a real `<a>` (via `next/link`), so it is crawlable, middle-clickable and
 * keyboard-native. No `onClick`.
 */
export function CollectionCard({
  collection,
  ctx,
}: {
  collection: Collection;
  ctx: TimeContext;
}) {
  const { places, openNow } = collectionCounts(collection.id, ctx);
  const tint = CATEGORY_TINT[collection.accent];

  return (
    <Link
      href={`/c/${collection.id}`}
      className="group relative flex min-h-[10.5rem] flex-col justify-between overflow-hidden rounded-card border border-line p-5 transition-[border-color,transform] duration-150 hover:border-ink active:scale-[0.995] sm:min-h-[11.5rem] sm:p-6"
      style={{ backgroundColor: tint }}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          aria-hidden
          className="text-[26px] leading-none text-ink"
        >
          {collection.glyph}
        </span>
        <span
          aria-hidden
          className="mt-1 text-[15px] text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5"
        >
          →
        </span>
      </div>

      <div>
        <h3 className="text-[24px] font-semibold leading-[1.1] tracking-tight text-ink sm:text-[27px]">
          {collection.title}
        </h3>
        <p className="mt-1.5 max-w-[46ch] text-[13px] leading-relaxed text-ink-2">
          {collection.blurb}
        </p>
        <p className="mt-3 text-[12px] font-semibold text-ink tnum">
          {places} {places === 1 ? "place" : "places"}
          {openNow > 0 ? (
            <>
              {" · "}
              <span className="text-live">{openNow} open now</span>
            </>
          ) : (
            <span className="font-normal text-ink-3"> · none open right now</span>
          )}
        </p>
      </div>
    </Link>
  );
}
