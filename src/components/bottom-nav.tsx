"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Bottom navigation — thumb-reachable, four destinations plus the plan.
 * `Map` is the escape hatch: it always works, whatever you filtered.
 */

const ITEMS = [
  { href: "/", label: "Home", glyph: "⌂" },
  { href: "/m", label: "Map", glyph: "◎" },
  { href: "/list", label: "List", glyph: "☰" },
  { href: "/plan", label: "Plan", glyph: "◷" },
  { href: "/table", label: "Table", glyph: "▦" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="safe-bottom no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 backdrop-blur-md"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold tracking-tight transition-colors",
                  active ? "text-ink" : "text-ink-4 hover:text-ink-2",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "text-[17px] leading-none transition-transform duration-150",
                    active && "scale-110",
                  )}
                >
                  {item.glyph}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
