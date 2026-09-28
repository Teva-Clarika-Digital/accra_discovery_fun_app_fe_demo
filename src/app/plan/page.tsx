import type { Metadata } from "next";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Planner } from "@/components/planner";
import { PLACES } from "@/data";
import { contextFrom } from "@/lib/best-time";
import { DATA_TIERS } from "@/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Plan your days",
  description:
    "A five-day Accra plan that respects real drive times, opening hours and the fact that nightlife comes last.",
  alternates: { canonical: "/plan" },
};

export default function PlanPage() {
  return (
    <PageShell width="narrow">
      <PageHeader
        eyebrow="Planner"
        title="Plan your days"
        lede={`Built from ${DATA_TIERS.active} confirmed-active places out of ${DATA_TIERS.total} in the dataset. It avoids the 07:00–09:00 and 16:00–19:00 gridlock, and never puts a club before dinner.`}
      />
      <Planner source={PLACES} ctx={contextFrom()} />
    </PageShell>
  );
}
