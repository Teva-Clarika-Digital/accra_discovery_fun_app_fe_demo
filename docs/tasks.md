# Tasks — Esther's Hangout App

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked
All phases are sequential unless marked parallel. **Nothing merges without `npm run verify` green.**

---

## Phase 0 — Foundation

- [x] **P0.1** Read and mine `request.pdf`; extract every place, detail and constraint → `docs/session_logs.md`
- [x] **P0.2** Write `docs/project_scope.md` (decoded requirements, scope, non-goals, data model, stack, NFRs)
- [x] **P0.3** Write `docs/tasks.md` (this file) and `docs/session_logs.md`
- [x] **P0.4** Scaffold Next.js 15 (App Router, TS strict) + Tailwind v4 + ESLint + Prettier
- [x] **P0.5** `tsconfig.json` strict + `noUncheckedIndexedAccess`; path alias `@/*`
- [x] **P0.6** Design tokens in `globals.css` (white canvas, warm-neutral ink ramp, single accent, 7-colour category ramp, 8px grid, radii, motion tokens)
- [x] **P0.7** Internal UI kit: `Button`, `Chip`, `Pill`, `Sheet`, `Field`, `Skeleton`, `EmptyState`, `IconButton`
- [x] **P0.8** `src/lib/utils.ts` (`cn`, `clamp`, `formatMinutes`, `slugify`)
- [~] **P0.9** Repo hygiene: `.gitignore`, `.editorconfig`, `.env.example` done; `README.md` deferred to P6.12
- [x] **P0.10** `npm run` scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:e2e`, `verify`

## Phase 1 — Data layer

- [x] **P1.1** `src/types/place.ts` — `Place`, `WeeklyHours`, `BestTimes`, `Category`, `Vibe`, `Region`, `Status`
- [x] **P1.2** Zod schema mirroring the types, used as the single parse boundary
- [x] **P1.3** `src/data/places.ts` — Tier 1 (10 PDF places) with full detail
- [x] **P1.4** `src/data/places.tier2.ts` — Tier 2 (10 PDF-mentioned places)
- [x] **P1.5** `src/data/places.tier3.ts` — Tier 3 (curated additions, ~22 places)
- [x] **P1.6** Merge + derive at import time: `slug` stability, `driveMinutes` sanity, dedupe by id
- [x] **P1.7** Provenance fields: `lastVerified`, `source`, `verification: "verified" | "unverified"` per record
- [x] **P1.8** Ghana bounding-box + phone-format assertions in the schema
- [x] **P1.9** Data tests: every place has lat/lng/hours/activities/vibe; ids unique; status distribution sane

## Phase 2 — Core logic (pure, fully unit-tested)

- [x] **P2.1** `src/lib/geo.ts` — `haversineKm`, `bearing`, `formatDistance`, Accra reference point
- [x] **P2.2** `src/lib/hours.ts` — parse weekly hours, handle **midnight rollover** (`23:00–06:00` is open at 02:00 *and* the previous evening), 24/7, closed days
- [x] **P2.3** `src/lib/hours.ts` — `isOpenNow`, `nextOpening`, `todayHoursLabel`, `openStatusAt`
- [x] **P2.4** `src/lib/sun.ts` — NOAA sunset/sunrise/golden-hour per date + lat/lng, `Africa/Accra` safe
- [x] **P2.5** `src/lib/best-time.ts` — per-place `bestTimes` evaluation → `BestTimeAdvice { verdict, label, window, reason }`
- [x] **P2.6** `src/lib/best-time.ts` — "open now near you" aggregation for the trip-clock banner
- [x] **P2.7** `src/lib/filters.ts` — search + multi-facet filter + sort (distance / best-time / drive-time / name)
- [x] **P2.8** `src/lib/plan.ts` — 5-day itinerary engine: day vibes, sequencing, drive-time chaining, nightlife-last, 8h/day cap, opening-hours sanity
- [x] **P2.9** `src/lib/share.ts` — encode/decode `MapView` (camera + filters + selection) to/from URLSearchParams, versioned
- [x] **P2.10** `src/lib/use-map-state.ts` — URL as store; back/forward correct; SSR-safe
- [x] **P2.11** Unit tests for **all** of P2.1–P2.9 (Vitest), incl. midnight-rollover and DST-free cases

## Phase 3 — Map experience

- [x] **P3.0** Landing page `/` with four bold category cards: **Night Life · Adventures · Daycation Trips · Food**
- [x] **P3.0b** `src/data/collections.ts` — named, curated collections (predicate + copy + accent)
- [x] **P3.0c** Collection route `/c/[collectionId]` — its own interactive map, pre-filtered, own metadata
- [x] **P3.0d** Live counts on each card ("12 places · 4 open now") and a quiet "show me everything" escape hatch
- [x] **P3.1** `/m` and `/` map route; full-bleed, mobile-first
- [x] **P3.2** MapLibre GL, dynamically imported, client-only
- [x] **P3.3** Light/"paper" basemap style, keyless default + env override; **no hard provider dependency**
- [x] **P3.4** Graceful fallback: tile error → plain white canvas, markers still positioned
- [x] **P3.5** Category-coloured markers, one shared silhouette; selected state
- [x] **P3.6** Clustering at low zoom; cluster tap → `fitBounds`
- [x] **P3.7** Viewport culling of markers
- [x] **P3.8** `flyTo` with `prefers-reduced-motion` respected
- [x] **P3.9** "Locate me" with permission-denied fallback
- [x] **P3.10** Marker tap → compact preview card (bottom sheet on mobile)
- [x] **P3.11** Share-this-view button (camera + filters + selection in the URL)
- [x] **P3.11b** `encodeState`/`decodeState` round-trip + taxonomy-degradation tests (Vitest)
- [x] **P3.12** Cold-load URL decode: pages pass `useSearchParams` through `paramsToQuery` → `MapRoute initialQuery` → `decodeState`, so a shared link applies `c/f/w/d/o/n/r/t/q/s/g` on first paint; `decodeState` also merges repeated keys now

## Phase 4 — Discovery: list, detail, table

- [x] **P4.1** Bottom nav shell: Map · List · Plan · Table (+ Saved)
- [x] **P4.2** `/list` — search, filter sheet, sort, result count, saved-only toggle
- [x] **P4.3** Filter sheet: category, venue type, vibe, price tier, max drive time slider, open-now, outdoors
- [x] **P4.4** Place cards: category chip, drive time, best-time verdict, price tier, status pill
- [x] **P4.5** `/place/[slug]` detail page (server-rendered, SEO-complete)
- [x] **P4.6** Live status pill + next-opening line on detail
- [x] **P4.7** Hours grid renderer (today highlighted, midnight rollover shown correctly)
- [x] **P4.8** Best-times block with reason string
- [x] **P4.9** Booking block: `tel:` link, website, `Add to trip`, Google Maps directions deep link
- [x] **P4.10** "Nearby" strip (nearest 4 by distance)
- [x] **P4.11** Provenance footer: `lastVerified`, source, "report a change" mailto/GitHub issue
- [x] **P4.12** Favourites via `localStorage` with availability guard + SSR-safe
- [x] **P4.13** `/table` — real `<table>`, sortable, sticky header, print stylesheet, copy-as-text
- [x] **P4.14** Helpful empty states everywhere

## Phase 5 — Planner & share surface

- [x] **P5.1** `/plan` — day count (1–5) + per-day vibe picker
- [x] **P5.2** Timeline render: stops, drive times between, hours-checked, "too tight" warnings
- [x] **P5.3** "Add to trip" from a place routes into a pre-seeded plan (via URL)
- [x] **P5.4** Share plan (URL) + copy-as-text + print stylesheet
- [x] **P5.5** Web Share API with clipboard fallback + always-visible confirmation
- [x] **P5.6** Deep links render correctly on cold load, no JS required for content

## Phase 6 — Prod-grade hardening

- [x] **P6.1** `app/layout.tsx` metadata base, title template, description, viewport
- [x] **P6.2** Per-place Open Graph + Twitter images (`opengraph-image.tsx` via `ImageResponse`)
- [x] **P6.3** `sitemap.ts`, `robots.ts`, canonical URLs
- [ ] **P6.4** JSON-LD `TouristAttraction` / `LocalBusiness` per place — *not implemented; SEO is metadata + OG + sitemap only*
- [x] **P6.5** PWA: `manifest.webmanifest`, SVG icons, theme colour
- [x] **P6.6** Route-level `error.tsx`, `not-found.tsx`, `loading.tsx` + skeleton shells
- [~] **P6.7** a11y pass: skip-link, focus rings, contrast, reduced-motion, labels done in code; live axe/keyboard pass still pending (P7.4)
- [x] **P6.8** Perf: lazy map chunk, minimal layout shift, 73/73 static/dynamic routes build clean
- [x] **P6.9** Security: non-async security headers in `next.config.ts`, no client secrets, `rel="noopener noreferrer"`, input caps
- [~] **P6.10** Vitest wired into `verify` and **124 tests green**; the 3 Playwright smoke specs are not created
- [ ] **P6.11** GitHub Actions CI: lint → typecheck → test → build
- [ ] **P6.12** `README.md`: local dev, env vars, data refresh ritual, deploy
- [ ] **P6.13** Data verification sweep — every record still `unverified`; this is the Phase 7 human pass

## Phase 7 — Launch (post-code, human work)

- [ ] **P7.1** Verify all Tier 1 records against official sites/phone calls; flip `verification`
- [ ] **P7.2** Verify Tier 2 + Tier 3 coordinates (pins currently approximate)
- [ ] **P7.3** Q1 refresh: re-verify `lastVerified` dates, add newly-opened venues
- [ ] **P7.4** Deploy preview, test on a real phone in Accra (4G + offline)
- [ ] **P7.5** Ship → Vercel production, set `NEXT_PUBLIC_SITE_URL`
- [ ] **P7.6** Set up the quarterly "still active?" ritual (calendar reminder + checklist in README)

---

## Definition of Done (per phase)

1. `npm run verify` (lint + typecheck + unit tests + production build) passes.
2. No `console.log` in shipped code; no `any`; no file over ~400 lines.
3. Keyboard-only pass on any new interactive surface.
4. Mobile viewport pass at 360px width.
5. Updated `docs/session_logs.md` with what was built and what was deliberately skipped.
