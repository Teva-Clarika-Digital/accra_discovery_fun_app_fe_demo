import { Skeleton } from "@/components/ui";

/** Instant skeleton for the list route while the server component streams. */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-5 sm:px-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-3 h-4 w-full max-w-md" />
      <div className="mt-6 flex flex-col gap-3">
        {Array.from({ length: 6 }, (_unused, index) => (
          <Skeleton key={index} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}
