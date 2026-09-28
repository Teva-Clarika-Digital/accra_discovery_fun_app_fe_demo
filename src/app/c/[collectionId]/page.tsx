import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapRoute } from "@/components/map/map-route";
import { contextFrom } from "@/lib/best-time";
import { PLACES } from "@/data";
import {
  COLLECTIONS,
  getCollection,
  isCollectionId,
  placesInCollection,
} from "@/data/collections";
import { paramsToQuery } from "@/lib/share";

/** Clock-dependent, so this page is rendered per request rather than cached. */
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ collectionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export function generateStaticParams() {
  return COLLECTIONS.map((collection) => ({ collectionId: collection.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { collectionId } = await params;
  const collection = getCollection(collectionId);
  if (!collection) return { title: "Not found" };

  return {
    title: collection.title,
    description: collection.intro,
    alternates: { canonical: `/c/${collection.id}` },
    openGraph: {
      title: `${collection.title} in Accra`,
      description: collection.intro,
      url: `/c/${collection.id}`,
    },
  };
}

/**
 * A collection is a first-class route, not a query-string variant of the map.
 *
 * `generateStaticParams` + `force-dynamic` is a deliberate combination: the four known
 * ids are enumerated so the route shape is explicit and typos fail loudly in
 * `notFound()`, while the rendered output stays per-request because the "open now" logic
 * depends on the clock.
 */
export default async function CollectionPage({ params, searchParams }: Params) {
  const { collectionId } = await params;
  if (!isCollectionId(collectionId)) notFound();

  const collection = getCollection(collectionId);
  if (!collection) notFound();

  const query = await searchParams;
  const places = placesInCollection(collection.id, PLACES);

  return (
    <MapRoute
      source={places}
      home={collection.center}
      collectionId={collection.id}
      ctx={contextFrom()}
      title={collection.title}
      subtitle={collection.blurb}
      backHref="/"
      initialQuery={paramsToQuery(query)}
    />
  );
}
