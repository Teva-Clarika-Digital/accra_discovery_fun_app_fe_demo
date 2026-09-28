"use client";

import dynamic from "next/dynamic";

/**
 * MapLibre touches `window` at import time, so the map is code-split behind a
 * `ssr: false` boundary. This keeps ~200KB of WebGL out of the first paint and means
 * a map failure can never take the rest of the page down with it.
 */
export const DynamicMap = dynamic(
  () => import("./map-experience").then((mod) => mod.MapExperience),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full w-full place-items-center bg-mist">
        <div className="flex flex-col items-center gap-2">
          <span
            aria-hidden
            className="size-6 animate-spin rounded-full border-2 border-line border-t-ink"
          />
          <span className="text-[12px] text-ink-3">Loading the map…</span>
        </div>
      </div>
    ),
  },
);
