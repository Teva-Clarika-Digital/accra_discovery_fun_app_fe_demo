import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Standard page frame.
 *
 * The map pages opt out of this (they are full-bleed `100dvh`), which is why the
 * padding lives here rather than in the root layout.
 */
export function PageShell({
  children,
  className,
  width = "default",
}: {
  children: ReactNode;
  className?: string;
  width?: "default" | "narrow" | "wide" | "full";
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 pt-5 pb-28 sm:px-6",
        width === "narrow" && "max-w-lg",
        width === "default" && "max-w-3xl",
        width === "wide" && "max-w-5xl",
        width === "full" && "max-w-none",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  lede,
  action,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">
            {eyebrow}
          </p>
        )}
        <h1 className="text-balance text-[26px] font-semibold leading-[1.15] tracking-tight text-ink sm:text-[32px]">
          {title}
        </h1>
        {lede && (
          <p className="mt-2 max-w-prose text-[14px] leading-relaxed text-ink-2">
            {lede}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}
