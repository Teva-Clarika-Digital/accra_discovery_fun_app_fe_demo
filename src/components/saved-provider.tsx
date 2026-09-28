"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/**
 * Favourites, in `localStorage`.
 *
 * No account, no server. Guarded because Safari private mode throws on `setItem` and
 * some embedded browsers block storage entirely — in that case the app carries on
 * working, it just forgets.
 *
 * This uses `useSyncExternalStore` rather than `useState` + `useEffect` on purpose:
 *
 *  - The store is genuinely external (localStorage), which is what that hook is for.
 *  - It is hydration-safe for free: the server snapshot is the empty list, so the
 *    server and the first client render agree, and the real value arrives immediately
 *    after hydration.
 *  - It subscribes to the `storage` event, so saving a place in one tab updates the
 *    other. A `useEffect` version would silently not do that.
 */

const KEY = "eha:saved:v1";

const EMPTY: readonly string[] = [];

/** Cached so `getSnapshot` returns a stable reference between calls. */
let cachedRaw: string | null = null;
let cachedValue: readonly string[] = EMPTY;

function parse(raw: string | null): readonly string[] {
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  if (!raw) {
    cachedValue = EMPTY;
    return cachedValue;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    cachedValue = Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : EMPTY;
  } catch {
    cachedValue = EMPTY;
  }
  return cachedValue;
}

function getSnapshot(): readonly string[] {
  try {
    return parse(window.localStorage.getItem(KEY));
  } catch {
    return EMPTY;
  }
}

function getServerSnapshot(): readonly string[] {
  return EMPTY;
}

function subscribe(onStoreChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    // A `clear()` from another tab sends key === null; treat it as our key.
    if (event.key === null || event.key === KEY) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

function persist(ids: readonly string[]): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
    return true;
  } catch {
    return false;
  }
}

/** `false` on the server, `true` after hydration. Used to gate saved-only UI. */
function subscribeToNothing(): () => void {
  return () => {};
}
const getClient = () => true;
const getServer = () => false;

type SavedContextValue = {
  saved: readonly string[];
  /** `false` until hydration, so consumers can avoid a saved/unsaved flicker. */
  ready: boolean;
  isSaved: (id: string) => boolean;
  toggle: (id: string) => void;
  clear: () => void;
};

const SavedContext = createContext<SavedContextValue | null>(null);

export function SavedProvider({ children }: { children: ReactNode }) {
  const saved = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = useSyncExternalStore(subscribeToNothing, getClient, getServer);

  const toggle = useCallback(
    (id: string) => {
      const current = getSnapshot();
      const next = current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id];
      if (persist(next)) {
        // Same-tab listeners do not receive `storage`, so notify by hand.
        window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
      }
    },
    [],
  );

  const clear = useCallback(() => {
    if (persist([])) {
      window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    }
  }, []);

  const value = useMemo<SavedContextValue>(
    () => ({
      saved,
      ready,
      isSaved: (id) => saved.includes(id),
      toggle,
      clear,
    }),
    [saved, ready, toggle, clear],
  );

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function useSaved(): SavedContextValue {
  const value = useContext(SavedContext);
  if (!value) {
    throw new Error("useSaved must be used inside <SavedProvider>");
  }
  return value;
}
