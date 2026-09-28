"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Sharing, done properly.
 *
 * Prefers the native share sheet, falls back to the clipboard, and always confirms
 * visibly — a silent copy is a copy the user does not trust.
 */

export type SharePayload = {
  title: string;
  text?: string;
  url: string;
};

export type ShareState = "idle" | "shared" | "copied" | "failed";

export function useShare() {
  const [state, setState] = useState<ShareState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const flash = useCallback((next: ShareState) => {
    setState(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2200);
  }, []);

  const copy = useCallback(
    async (payload: SharePayload) => {
      try {
        await navigator.clipboard.writeText(payload.url);
        flash("copied");
        return true;
      } catch {
        // Clipboard API needs a secure context and can be blocked by permissions.
        try {
          const area = document.createElement("textarea");
          area.value = payload.url;
          area.setAttribute("readonly", "");
          area.style.position = "fixed";
          area.style.opacity = "0";
          document.body.append(area);
          area.select();
          const ok = document.execCommand("copy");
          area.remove();
          flash(ok ? "copied" : "failed");
          return ok;
        } catch {
          flash("failed");
          return false;
        }
      }
    },
    [flash],
  );

  const share = useCallback(
    async (payload: SharePayload) => {
      const nav =
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
          ? navigator
          : null;

      if (nav) {
        try {
          await nav.share({
            title: payload.title,
            text: payload.text,
            url: payload.url,
          });
          flash("shared");
          return true;
        } catch (error) {
          // A user-cancelled share is not a failure worth shouting about.
          if (error instanceof DOMException && error.name === "AbortError") {
            return false;
          }
          return copy(payload);
        }
      }
      return copy(payload);
    },
    [copy, flash],
  );

  return { share, copy, state, reset: () => setState("idle") };
}

export function shareMessage(state: ShareState): string {
  switch (state) {
    case "shared":
      return "Shared";
    case "copied":
      return "Link copied";
    case "failed":
      return "Copy failed — long-press the address bar";
    default:
      return "";
  }
}

export function absoluteUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).toString();
}
