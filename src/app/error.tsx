"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

/**
 * Route-level error boundary.
 *
 * The commonest real failure here is a map style that will not load, so the recovery is
 * a link to the list and table views, which need no network at all.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-4 pt-16 text-center">
      <span aria-hidden className="text-2xl text-ink-4">
        △
      </span>
      <h1 className="text-[19px] font-semibold text-ink">Something broke</h1>
      <p className="max-w-sm text-[13px] leading-relaxed text-ink-2">
        {error.message || "An unexpected error occurred."}
      </p>
      {error.digest && (
        <p className="text-[11px] text-ink-4">Reference: {error.digest}</p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="secondary" onClick={() => router.push("/list")}>
          Open the list instead
        </Button>
        <Link
          href="/"
          className="text-[13px] font-medium text-ink-2 underline underline-offset-4 hover:text-ink"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
