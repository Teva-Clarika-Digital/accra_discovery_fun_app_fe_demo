import Link from "next/link";
import { EmptyState } from "@/components/ui";

/**
 * 404.
 *
 * The most likely cause is a mistyped collection id, so the recovery is a link to the
 * four known collections rather than a generic apology.
 */
export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 pt-16">
      <EmptyState
        glyph="◌"
        title="That page is not here"
        body="The link may be old, or the place may have been renamed. Everything in the app is one tap away."
        action={
          <Link
            href="/"
            className="text-[13px] font-medium text-ink underline underline-offset-4"
          >
            Back to the four doors
          </Link>
        }
      />
    </div>
  );
}
