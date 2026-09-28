import type { Metadata } from "next";
import { MapRoute } from "@/components/map/map-route";
import { contextFrom } from "@/lib/best-time";
import { PLACES } from "@/data";
import { ACCRA_CENTER } from "@/lib/geo";
import { SITE_DESCRIPTION } from "@/lib/site";
import { paramsToQuery } from "@/lib/share";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Map",
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/m" },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** The full map. Same component, same URL contract, no collection filter. */
export default async function MapPage({ searchParams }: PageProps) {
  const query = await searchParams;
  return (
    <MapRoute
      source={PLACES}
      home={ACCRA_CENTER}
      collectionId={null}
      ctx={contextFrom()}
      title="Everything"
      subtitle={`${PLACES.length} places around Accra`}
      initialQuery={paramsToQuery(query)}
    />
  );
}
