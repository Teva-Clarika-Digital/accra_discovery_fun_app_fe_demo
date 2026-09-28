import type { Metadata } from "next";
import { PageShell, PageHeader } from "@/components/page-shell";
import { TableView } from "@/components/table-view";
import { PLACES } from "@/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Table",
  description:
    "Every place in one printable table: activities, drive time, opening hours, price, status, booking and a map link.",
  alternates: { canonical: "/table" },
};

export default function TablePage() {
  return (
    <PageShell width="wide">
      <PageHeader
        eyebrow="Everything at once"
        title="The table"
        lede="One row per place with activities, drive time, opening hours, price, status, booking details and a map link. Built to be printed."
      />
      <TableView source={PLACES} />
    </PageShell>
  );
}
