/** Small, dependency-free helpers shared across the app. */

export function cn(
  ...values: (string | false | null | undefined)[]
): string {
  return values.filter(Boolean).join(" ");
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/** `95` → `"1 h 35 m"`, `20` → `"20 min"`. */
export function formatDrive(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function formatKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

/** Minutes from midnight → `"23:00"`. Handles values past 24 h. */
export function formatClock(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** `new Date()` in the reference timezone (Ghana is UTC+0 year round). */
export function nowInAccra(at: Date = new Date()): Date {
  return new Date(at.getTime() + (at.getTimezoneOffset() + 0) * 60_000);
}

export function formatRelativeDays(iso: string, at: Date = new Date()): string {
  const then = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(then)) return "unknown";
  const days = Math.floor((at.getTime() - then) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo ago`;
  return `${Math.floor(months / 12)} yr ago`;
}

export function isStale(iso: string, maxDays = 180, at: Date = new Date()): boolean {
  const then = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(then)) return true;
  return (at.getTime() - then) / 86_400_000 > maxDays;
}

export function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

/** Case/diacritic-insensitive haystack for search. */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}
