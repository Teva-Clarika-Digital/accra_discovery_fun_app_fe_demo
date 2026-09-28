# Esther's Hangout App — Project Scope

**Status:** Approved v1.0 · **Owner:** Esther · **Last updated:** 2026-09-28
**Source material:** `request.pdf` (Gemini chat export, 8 pages) + verbal brief
**Doc set:** `project_scope.md` (this file) · `tasks.md` · `session_logs.md`

---

## 1. One-liner

A mobile-first, minimalist-white web app that shows every fun place worth visiting around
Accra (and within a ~2-hour radius of it) on an interactive map, tells you the **best time
to go**, and lets you **share any map view — or any single place — as a link**.

---

## 2. The original ask, decoded

From the PDF transcript, the real requirements hide inside the conversation:

| # | Raw ask (from the PDF) | Decoded requirement |
|---|---|---|
| 1 | "she only has five days" | Trip is **time-boxed to a 5-day window** → the app must help *sequence* places, not just list them |
| 2 | "wants to go clubbing" | A real **nightlife category** is mandatory, with hours that run past midnight |
| 3 | "wants to visit nice places" | A **sights/landmarks category** (Independence Arch, Jamestown Lighthouse, etc.) |
| 4 | "wants some adventures" | A **high-adrenaline category**: quad bikes, jet skis, kayaking, abseiling, paintball |
| 5 | "doesn't have to be more than 1 hour from Accra" | **Distance/drive-time is a first-class filter**, not an afterthought |
| 6 | "please do research and give me a list of places **that are still active**" | Data needs **freshness guarantees** — a `lastVerified` date and a `status` field per place. Venues in Accra open and close constantly. |
| 7 | "Legon Botanical Gardens is no longer functioning" | The app must support **"gone / dormant" records** so a dead listing never gets recommended again |
| 8 | "Aburi is not so much of an adventure" | Places need a **subjective `vibe` / energy rating**, not just a category label |
| 9 | "Bloom is a lounge, not a club" | Need a **fine-grained `venueType`** distinction (nightclub vs lounge vs pub vs beach club) |
| 10 | "include activities around the Kusomobo area" | **Radius must be flexible** — the 1-hour rule is a default, not a hard cap |
| 11 | "I want their locations, their activities, details, opening hours, booking etc" | A **rich Place Detail record** is the atomic unit of the app |
| 12 | "list them in a table… with map links" | The data is *tabular* → the UI should include a **shareable, printable table view** |

> "Kusomobo" is the local name for **Akosombo** (Volta Region). Treat them as the same place in the dataset.

---

## 3. Enhanced product scope

### 3.1 The three things that make this app *not* a plain pinboard

1. **Best-time engine.** Every place gets a `bestTimes` block (golden hour, night, weekday
   quiet, festival/rain fallback). The app computes a **live "go now / come back later"**
   verdict from the visitor's device clock, and a **best hour to arrive** from opening hours
   + sunset + vibe. This is the product's differentiator.
2. **Shareable map state, not just shareable places.** A link encodes the map's
   **camera + filters + selection** (`/m?c=5.56,-0.18,12&f=nightlife,adventure&s=ace-nightclub`).
   The recipient lands on *the exact view* you were looking at. This is the growth loop.
3. **5-day trip planner.** Not a generic itinerary generator: it respects Accra's real
   **traffic reality** (7–9 AM and 4–7 PM gridlock), **opening hours**, and the fact that
   nightlife is a late-night activity that must be scheduled *last* in a day.

### 3.2 Core feature set (v1)

#### A0. Landing page — four big doors
The app opens on a **decision page**, not on a map. A first-time visitor in Accra with
five days does not know what to search for, so the landing page offers **four large,
bold, unmistakable category cards**:

| Card | Leads to | Curated as |
|---|---|---|
| **Night Life** | `/c/nightlife` | Clubs, lounges, pubs, beach clubs, hotel bars. Clustered, drive-time sorted, live "open now" strip |
| **Adventures** | `/c/adventures` | Quad bikes, jet skis, abseiling, kayaking, hikes, canopy walks. Premium + high-adrenaline |
| **Daycation Trips** | `/c/daycations` | Everything over an hour out: Akosombo/Kusomobo, Ada Foah, Wli, Mount Afadja, Cape Coast, Elmina, Kakum, Busua. Includes drive time and a "this replaces a day" warning |
| **Food** | `/c/food` | Street food, markets, restaurants, beach grilled fish |

Rules for the landing page:
- **Four cards only.** Not a category grid of twelve — the whole point is to reduce the
  decision to four taps.
- Each card is **large, high-contrast, and shows a real number** ("12 places · 4 open now")
  rather than stock art, so the page never feels like a template.
- Tapping a card navigates to **its own page with its own interactive map**, pre-filtered
  to that collection, sharing the exact same map component and URL contract as `/m`.
- A single, quieter **"Show me everything"** link to the full map sits below the cards, so
  power users are never trapped in a category.
- The cards are links (`<a>`), not `onClick` divs: crawlable, middle-clickable, and
  keyboard-native.

Each collection is a **first-class, shareable route** (`/c/[id]`), not a query-string
variant of the list — so "here are the best adventures near Accra" is a URL you can send
to a friend, and each collection page gets its own title, description and OG image.

#### A. Interactive map (the home screen)
- Full-bleed map, mobile-first, with a **list ↔ map** segmented toggle.
- **Vector basemap in a light/"paper" style** — the map must not fight the white UI.
  (MapLibre GL + a light style; provider swappable via env var, with a free keyless
  provider as the default so the app boots with zero configuration.)
- **Category-coloured markers** with a single shared "pin" silhouette — colour is the only
  differentiator, so the map stays visually quiet.
- **Clustering** at low zoom; tapping a cluster zooms to its bounds.
- **Viewport-driven loading** — markers outside the visible bounds are not rendered.
- Tapping a marker opens a **compact preview card** → tap through to full detail.
- **Locate me** button (geolocation, graceful denial fallback).
- Smooth **flyTo** transitions between places, with `prefers-reduced-motion` respected.
- **Offline/no-tile fallback:** if the tile provider fails, the map degrades to a plain
  white canvas with markers still positioned — the app must never show a broken box.

#### B. Best-time advisor
- Per-place `bestTimes`: `goldenHour`, `nightlife`, `daytime`, `weekday`, `rainyDay`.
- **"Go now" verdict** per place: `open` / `opens in 2h` / `closed — peak at 22:00` / `closed today`.
- **"Best arrival" window** derived from hours + sunset + category.
- **Sunset calculator** (lat/lng + date → golden hour, civil twilight) — no API key needed.
  This is what makes beach and viewpoint recommendations feel *smart*.
- A **trip-clock banner** ("It's 23:40 — 4 places are open right now") that links into the
  filter view.

#### C. Place detail
- Hero (photo placeholder with graceful fallback), title, one-line vibe.
- **Live status pill**: Open now / Opens 18:00 / Closed.
- **Key facts grid**: category, price tier, drive time from Accra, distance, area/neighbourhood.
- **Activities** list (tag chips).
- **Opening hours** in a human-readable weekly grid, rendered from structured data.
- **Best times** block with the verdict.
- **Booking block**: phone `tel:` link, website link, "Add to trip" button, Google Maps
  deep link (`geo:` / `google.navigation:` on mobile).
- **Share this place** → clipboard + Web Share API.
- **Nearby** (nearest 4 by great-circle distance) → keeps the app feeling explorable.
- **Data provenance footer**: `lastVerified` date + source URL. Required for trust.

#### D. Discovery & filtering
- Free-text search over name, area, tags, activities.
- Filters: **category** (multi), **venue type**, **vibe/energy**, **price tier**,
  **max drive time** (slider, 15m → 2h+), **open now**, **outdoors vs indoors**,
  **kid-safe / no-kid** (soft flag), **has booking contact**.
- Filter state is **URL-encoded** → shareable and back-button-safe.
- Empty states that are *helpful*, not apologetic ("Nothing matches — here's what's nearby instead").

#### E. Trip planner ("5 days")
- A lightweight, opinionated planner — **not** an AI generator.
- Input: number of days (1–5) + a vibe per day (`chill`, `culture`, `adventure`, `nightlife`, `beach`).
- Output: a **timeline per day** with sequenced stops, drive times between them,
  and a sanity check against opening hours.
- The engine respects: opening hours, nightclubs last, and an 8-hour "don't overpack" cap.
- Planner state is **URL-shareable** too.
- Export: copy as text / print stylesheet.

#### F. Share surface
- **Share a place** → `navigator.share` when available, clipboard fallback, always with a
  visible "Link copied" confirmation.
- **Share a map view** → the camera + filters + selection, as above.
- **Share a table** → the "list" view rendered as a clean, printable, copyable table
  (this is the direct answer to the PDF's final "list it all in a table" request).
- Every shared link works on a cold load, on mobile, and degrades gracefully without JS-heavy
  features (deep links render server-side).

#### G. Table view
- The dataset as a real `<table>`: Name · Type · Area · Drive time · Best time · Hours · Book.
- Sortable columns, sticky header, horizontal scroll on mobile, print stylesheet.

### 3.3 Explicit non-goals (v1)

- **No user accounts, no auth, no database.** (v1 is read-only + localStorage favourites.)
- **No live "is this place open right now" API.** Hours are curated data, not scraped.
- **No booking transactions.** We link out; we do not sell.
- **No crowd/queue telemetry, no reviews, no ratings from users.**
- **No native app.** PWA only.
- **No multi-country support.** Ghana only, Accra-centric.
- **No i18n.** English only (with i18n-safe string structure if cheap to do).

---

## 4. Data model

The atomic unit is the **Place**. Strictly typed, validated at build time.

```ts
type Place = {
  id: string;                 // stable slug, e.g. "ace-nightclub"
  name: string;
  tagline: string;            // one line, human
  category: Category;         // nightlife | adventure | sights | food | beach | stay | nature
  venueType?: VenueType;      // nightclub | lounge | pub | beach-club | resort | hotel | ...
  area: string;               // "Osu, Accra" / "Adukrom, Eastern Region"
  region: Region;             // Greater Accra | Eastern | Volta | Western | Central
  address?: string;
  lat: number;
  lng: number;
  priceTier: 0 | 1 | 2 | 3;   // free / ₵ / ₵₵ / ₵₵₵ (Ghanaian Cedis)
  driveMinutes: number;       // from Accra reference point (5.6037, -0.1870)
  vibe: Vibe[];               // chill | culture | adventure | nightlife | scenic | romantic | party
  energy: 1 | 2 | 3 | 4 | 5;  // how hard it hits
  outdoors: boolean;
  activities: string[];       // ["quad biking", "canopy walk", ...]
  hours: WeeklyHours;         // structured, not a string
  bestTimes: BestTimes;
  booking?: { phone?: string; website?: string; note?: string };
  mapsUrl?: string;           // explicit Google Maps link if known
  status: "active" | "dormant" | "closed";
  lastVerified: string;       // ISO date
  source?: string;            // provenance URL
  image?: string;
  notes?: string;             // "smart casual", "cash only", "book 3 days ahead"
};
```

**Data quality rules (enforced by a Zod schema + a build-time test):**
- Every place **must** have `lat`, `lng`, `driveMinutes`, `hours`, `status`, `lastVerified`.
- Every place **must** have at least one `activity` and one `vibe`.
- `status: "closed"` places are **excluded from recommendations** but still render with a
  clear "no longer operating" notice — this is the direct lesson from the "Legon Botanical
  Gardens is no longer functioning" moment in the PDF.
- Phone numbers must be Ghanaian format (`+233…`) and phone-free if absent.
- Coordinates are asserted to be inside Ghana's bounding box (roughly 4.0–11.2 N, −4.0–1.4 E).

### 4.1 Seed dataset

**Tier 1 — from the PDF research (must be present, 10 places):**
Safari Valley Resort · Aqua Safari Resort · Akosombo/Adomi Bridge adventure zone ·
Ace Nightclub · Front/Back · MAD Club · Labadi Beach Hotel · La Palm Royal Beach Hotel ·
Alisa Hotel (North Ridge) · Paloma Hotel (Ring Road)

**Tier 2 — also from the PDF, mentioned but not detailed (10 places):**
Independence Arch · Jamestown Lighthouse · Carbon · Bloom Bar · Plot7 · Tantra Nightclub ·
Soho Beach Club · Aburi Botanical Gardens · Shai Hills Nature Reserve · Kwame Nkrumah Memorial Park

**Tier 3 — high-confidence additions to round out a 5-day trip (target 20–30 total):**
Coco Beach · Busua (day trip) · Elmina/St. George's Castle · Cape Coast + Castle ·
Kakum canopy walkway · Wli Waterfalls · Boti Falls · Lake Volta Akosombo dam/jetty ·
Ada Foah beach · Keta beach road · Tafi Atome · Kwame Nkrumah University Park · Marina Mall ·
Accra Mall · Labadi beach clubs · Osu Oxford Street food street · Makola Market ·
Bonwire kente village · Akosombo Bypass scenic viewpoints · Aburi Hills viewpoints ·
Ada Foah crocodile sanctuary.

> **Verification policy:** all Tier 1 phone numbers, hours and coordinates come from
> AI research in the PDF and **must be re-verified before public launch**. Until then each
> record carries `lastVerified` + a `verification: "unverified" | "verified"` flag and the UI
> surfaces a subtle "check before you go" affordance on unverified contact details.
> The dataset is the product's main liability — it needs a documented, repeatable refresh
> ritual (see §7).

---

## 5. Tech stack & rationale

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + React 19** | SSG/ISR for instant loads, real URLs for sharing, first-class image/metadata handling, easy static export |
| Language | **TypeScript, `strict: true`** | A typed place record is a correctness requirement, not a nicety |
| Styling | **Tailwind CSS v4** + a small token layer | Minimalist white design is easiest as constrained design tokens |
| Map | **MapLibre GL JS** | Free, no vendor lock-in, GPU-accelerated, works great on mobile |
| Basemap | **Light/positron style via a keyless provider by default**, swappable by env | Zero-config boot + no vendor lock-in |
| State | **URL as source of truth** (`nuqs`-style) | Sharing *is* the product; back-button correctness is free |
| Validation | **Zod** at the data boundary | Bad data must fail the build, not the UI |
| Tests | **Vitest** (logic) + **Playwright** (3 smoke flows) | Logic is where the real risk lives (time, geo, filters) |
| CI | **GitHub Actions**: lint → typecheck → test → build | Prod-grade means the build is provably green |
| Hosting | **Vercel** (or any static/Node host) | Zero-config, edge CDN, preview deploys per PR |

**Deliberate non-choices:** no Redux/Zustand (URL is the store), no component library
(a custom minimalist kit is the design), no database, no CMS, no mapbox (paid + token).

---

## 6. Design system — "minimalist white"

The brief is *minimalist white background*. Interpretation, tightened:

- **Canvas:** pure white `#FFFFFF`. **No grey page background.** Elevation is communicated by
  hairline borders and shadow, never by a grey fill.
- **Ink:** near-black `#0B0B0C` primary text; a 4-step neutral ramp for secondary text,
  borders, and subtle fills. Greys are *warm-neutral*, never blue-grey.
- **Accent:** exactly **one** accent (a saturated coral/amber) used only for
  *actions and live status*. It is never used for decoration.
- **Category colour:** a 7-colour categorical ramp (accessible in light mode) used
  **only** for map markers and category chips — never for large fills.
- **Type:** one family, 3 weights, tight tracking on headings, generous line-height on body.
  Display sizes are restrained — this is a *utility* app with personality, not a poster.
- **Layout:** 8px spacing grid, max content width ~480px on mobile / full-bleed map,
  bottom sheet instead of modals on mobile, sheet is drag-to-dismiss.
- **Radius:** 16px cards, 999px pills. **Borders:** 1px hairline everywhere instead of
  heavy shadows.
- **Motion:** 150–250ms, `cubic-bezier(0.2, 0.8, 0.2, 1)`, transform/opacity only.
  Fully disabled under `prefers-reduced-motion`.
- **Dark mode:** explicit non-goal for v1 (the brief is a white app). Token layer is
  structured so it can be added later without refactor.
- **Mobile-first:** bottom nav (Map · List · Plan · Table), thumb-reachable,
  safe-area insets respected, 44px minimum tap targets.
- **No UI framework.** A tiny internal kit (`Button`, `Chip`, `Sheet`, `Pill`,
  `Field`, `Skeleton`) so the look is 100% ours.

---

## 7. Data refresh & trust (the "still active" requirement)

This is the part most likely to rot. It gets a real process, not a good intention:

1. **Every record has `lastVerified` + `status`.** A place unverified for > 180 days is
   automatically badged "check before you go" in the UI.
2. **A documented quarterly ritual** (in `tasks.md`) to re-verify hours/phone/status and
   add newly-opened venues.
3. **A "report a change" affordance** in the detail footer that opens a prefilled
   `mailto:`/GitHub-issue form. Zero backend, real signal.
4. **No claim of live accuracy in the copy.** The app says "hours as of <date>",
   never "open now" without the qualifier implied by the data's staleness.

---

## 8. Non-functional requirements (prod-grade bar)

- **Performance budget:** LCP < 2.0s on mid-range Android/4G; initial JS < 130 kB gzipped
  (map chunk lazy-loaded, only on the map route); map interaction 55–60 fps;
  no layout shift on load (skeletons reserve space).
- **Accessibility:** WCAG 2.1 AA — full keyboard operability, visible focus rings,
  `aria-*` on the sheet/list, contrast ≥ 4.5:1 for text, the map has a keyboard-accessible
  list fallback (never map-only), reduced-motion honoured.
- **SEO:** per-place pages with real `<title>`/`<meta description>`, Open Graph + Twitter
  cards, `sitemap.xml`, `robots.txt`, JSON-LD `LocalBusiness`/`TouristAttraction` per place,
  canonical URLs.
- **PWA:** installable manifest, generated icons, theme color, offline shell for the
  last-viewed place (caching a *subset* only — no stale-data trap).
- **Resilience:** error boundaries at route + component level, loading skeletons,
  tile-failure fallback, geolocation-denial fallback, empty states for every list.
- **Security:** no secrets in the client, strict CSP, no third-party trackers by default,
  `rel="noopener noreferrer"` on all external links, input length caps.
- **Correctness:** opening-hours logic must be correct across midnight rollover
  (e.g. a club open 23:00–06:00 is *open* at 02:00 **and** on the previous evening) and
  across Ghana's timezone (`Africa/Accra`, UTC+0, no DST) — unit-tested.
- **Maintainability:** no file > ~400 lines, no `any`, no `console.log` in prod paths,
  data layer isolated so the dataset can move to a CMS later without touching UI.

---

## 9. UX flow (the 30-second story)

1. **Land** on the map, white and quiet, already centred on Accra, with a friendly
   "Hey Esther 👋 — here's what's worth your 5 days" header.
2. **Tap a marker** → preview card → full detail with a live **"go now"** verdict.
3. **Slide the "tonight" chip** → filter to open-now nightlife, sorted by drive time.
4. **Tap "Plan my trip"** → 5-day vibe picker → a day-by-day timeline that actually fits.
5. **Tap "Share"** → send the map view to a friend; they open exactly what you saw.
6. **Favourite** a couple of places (localStorage) → "Saved" tab on the home map.

---

## 10. Success criteria

- A cold visitor on a phone in Accra can find a *specific* place and its best time in < 60 seconds.
- Any view can be shared and reproduced exactly by someone else.
- Zero client-side errors during a normal 5-day-planning session.
- The dataset can be updated by one person in under an hour per quarter.
- `npm run verify` (lint + typecheck + test + build) is green and is required to merge.

---

## 11. Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Venue data goes stale (venues close/rename fast) | High | `lastVerified` + `status` + quarterly ritual + "report a change" |
| PDF research is wrong (AI-generated hours/phones) | High | Explicit `verification: "unverified"` flag surfaced in UI; verification task in Phase 5 |
| Map provider outage / rate limits | Medium | Keyless default, style provider swappable, plain-canvas fallback, no hard dependency |
| MapLibre bundle bloat on mobile | Medium | Dynamic import, only on map route; measured against the 130 kB budget |
| Over-scoping into a "social travel app" | Medium | Non-goals in §3.3 are binding; new social features require a scope amendment |
| Offline support quietly serves stale hours | Medium | Cache only the shell + last-viewed place; always show the data's `lastVerified` date |

---

## 12. Release plan

| Milestone | Contents | Gate |
|---|---|---|
| **M0 — Foundation** | Next.js scaffold, design tokens, typed data layer, schema + data tests | Build green |
| **M1 — Landing** | Four category cards, collection routes, brand + copy | Mobile pass on `/` |
| **M2 — Map** | MapLibre light style, markers, clustering, preview card, share-camera | Perf budget met |
| **M3 — Detail & time** | Place pages, hours, best-time engine, sunset, status pills | Unit tests green |
| **M4 — Discovery** | List, search, filters, table view, favourites | Keyboard + a11y pass |
| **M5 — Plan** | 5-day planner, share page, print styles | E2E smoke green |
| **M6 — Launch hardening** | SEO/OG, PWA, error boundaries, CI, README, data verification sweep | `npm run verify` green |

---

## 13. Open questions (answered by default, easy to change)

1. **Coordinates for Tier 3 additions** are approximations. → *Default: ship approximations
   with a visible "approximate pin" tolerance; refine during verification sweep.*
2. **Does the planner persist?** → *Default: no. URL only, so plans are shared, not stored.*
3. **Favourites?** → *Default: `localStorage`, with a "not on this device" note if unavailable.*
4. **Photos?** → *Default: no real photography (licensing/time). Use a generated
   typographic/gradient placeholder keyed on the place's category — stays on-brand and
   can't go stale.*
5. **Currency/prices?** → *Default: price tier only (0–3), no numbers, since Ghana pricing
   moves and numbers would rot.*

---

## 14. Glossary

- **Accra reference point** — `5.6037, -0.1870` (Independence Square). All drive times
  are measured from here.
- **Kusomobo** — local name for Akosombo, Volta Region.
- **Golden hour** — ~60 min before sunset to ~20 min after, sun low and warm.
- **Vibe** — the subjective feel of a place, distinct from its `category`.
- **Status** — `active` (open, verified) · `dormant` (may be closed) · `closed` (gone).
