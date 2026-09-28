import type { Metadata } from "next";
import { PageShell, PageHeader } from "@/components/page-shell";
import { ListView } from "@/components/list-view";
import { PLACES } from "@/data";
import { contextFrom } from "@/lib/best-time";
import { SITE_DESCRIPTION } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All places",
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/list" },
};

/** The list view: the same data and the same URL contract as the map, as rows. */
export default function ListPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Directory"
        title="All places"
        lede="Every place in the app, filterable. The map and this list share the same URL, so a link to one opens the other in the same state."
      />
      <ListView source={PLACES} ctx={contextFrom()} />
    </PageShell>
  );
}
