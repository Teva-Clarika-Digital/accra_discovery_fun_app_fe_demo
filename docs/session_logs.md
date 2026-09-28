# Session Logs — Esther's Hangout App

Append-only. One entry per working session: what was asked, what was found, what was decided,
what was built, what was skipped. Newest entries at the bottom.

Format: `## Session N — YYYY-MM-DD — <title>`

---

## Session 1 — 2026-09-28 — Project intake, PDF mining & scope authoring

### Request
- Create `docs/project_scope.md`, `docs/tasks.md`, `docs/session_logs.md`.
- Read `request.pdf` (Python) and decode it into a real product brief.
- Build direction: mobile-first React/Next.js, interactive map of fun places + best times to
  visit, shareable map of any given location, minimalist white-background design,
  "prod grade but not complicated", fun to use. App name: **Esther's Hangout App**.
- Constraint given at the end of the session: **build is allowed, do not start any servers.**

### Source material
`request.pdf` — a printout of a Gemini chat, 8 pages, no images, text + hyperlinks only.

**Extraction method (Python):** `pymupdf` was already available; `pdfplumber` was not.
`pymupdf` text extraction needed `PYTHONIOENCODING=utf-8` because the document contains
bullet/arrow glyphs (`ΓÇï`, `ΓÇô`, `ΓÇö`) that blow up the default Windows `cp1252`
console codec with `UnicodeEncodeError`. Hyperlink targets were recovered separately with
`page.get_links()`.

```python
import pymupdf
d = pymupdf.open("request.pdf")
for p in d:
    print(p.get_text())
    print(p.get_links())
```
(Windows: `$env:PYTHONIOENCODING="utf-8"` before running.)

### What the PDF actually contains (findings)
A friend of the user is visiting **Accra, Ghana** for 7 days, with **~5 usable days** left.
Her three stated wants: **clubbing**, **nice places**, **adventures**. Radius constraint:
"doesn't have to be more than 1 hour from Accra… it can be within Accra as well." The final
request is a master table of every place with **location, activities, details, operating hours,
booking, and map links**.

Conversation arc, and what each turn tells us:

1. **First answer (Bloom Bar, Carbon, Plot7, Independence Arch, Jamestown lighthouse, Legon
   Botanical Gardens high ropes, Aburi Botanical Gardens)** — mostly rejected by the user.
2. **Rejection 1 — "Legon Botanical Gardens is no longer functioning."**
   → *Requirement discovered: the app must be able to represent a dead venue, because
   that failure happened mid-conversation and the research was confidently wrong.*
   → *Requirement discovered: "still active" was an explicit ask. Freshness is a feature.*
3. **Rejection 2 — "Aburi is not so much of an adventure."**
   → *Requirement discovered: a `category` label is insufficient; places need a
   subjective `vibe`/energy rating so "a nice place to visit" ≠ "an adventure".*
4. **Refinement — "look at things like safari village, water activities, quad bikes, high-end
   activities."** → adventure = *paid, high-adrenaline, premium*.
5. **Scope widening — "also include activities around the Kusomobo area."**
   → *Kusomobo = Akosombo, Volta Region (~2h from Accra). The 1-hour rule is a default,
   not a hard cap. The radius must be a filter, not a constraint.*
6. **Rejection 3 — "Bloom is not a club, it's more of a lounge, like a pub thing."**
   → *Requirement discovered: `venueType` must distinguish nightclub / lounge / pub /
   beach-club. A "lounge" is not an answer to "where do we dance".*
7. **Extras — "Are there hotels with clubs in Ghana? Also look around the Accra circle,
   Labadi, Labone areas."** → hotel-with-nightlife became a real sub-category.
8. **Final request — a single table with map links.** → the table view is a first-class
   feature, not an afterthought.

### Places extracted from the PDF
**Tier 1 — fully detailed in the PDF (10):**
Safari Valley Resort (Adukrom, Okere District, Eastern Region · quad biking, 580m tree-to-tree
canopy walk, safari tours, golf-cart rides, cycling, 9-hole golf, wildlife · open daily ·
safarivalleyresort.com · +233 59 691 4394) · Aqua Safari Resort (10 Agorkpo St, Big Ada/Ada
Foah · jet skiing, speed boating, Volta cruises, Segway, crocodile island, water sports ·
24/7 · aquasafariresort.com · +233 54 011 0193) · Akosombo/Adomi Bridge zone (hiking, abseiling,
Volta kayaking, paintball, Lake Volta cruises · ~08:00–17:00 · book via local operators /
Royal Senchi) · Ace Nightclub (9 Klottey Crescent, Labone · Afrobeats/hip-hop/amapiano, full bar,
table service · Fri–Sun 01:00–07:00 · +233 20 272 7280) · Front/Back (First Osu Lane, Osu ·
speakeasy, art, cocktails, private lounges, late DJ · Tue–Thu & Sun 13:00–03:00, Fri–Sat
20:00–06:00 · frontbackaccra.com · +233 50 904 8001) · MAD Club (Lagos Ave at Lome St junction,
East Legon · upscale, VIP tables, light shows, guest DJs · Fri–Sun 23:00–06:00 · +233 53 131
0989 · smart casual–formal) · Labadi Beach Hotel (1 La Bypass, Labadi · bars, lounges, beach
DJ parties, live bands · hotel 24/7, parties 18:00–late · +233 30 277 2501) · La Palm Royal
Beach Hotel (100 La Bypass, Labadi · oceanfront nightclub, beach parties, live music · late
nights · +233 30 277 1720 · walk-in) · Alisa Hotel (21 Dr Isert Rd, North Ridge, near Circle ·
Annabel's-style bar/lounge, themed party nights, DJ nights, poolside · 11:00–02:00 daily ·
+233 30 221 4244) · Paloma Hotel (Ring Road Central, near Kwame Nkrumah Circle · open-air
bar/lounge/pub complex, late-night food, DJ · 17:00–late daily · +233 30 222 8700).

**Tier 2 — mentioned in the PDF but not detailed (10):**
Independence Arch · Jamestown Lighthouse · Carbon · Bloom Bar · Plot7 · Tantra Nightclub ·
Soho Beach Club · Aburi Botanical Gardens · Shai Hills Nature Reserve · Kwame Nkrumah
Memorial Park.

**Explicitly rejected in the PDF (2):** Legon Botanical Gardens high-ropes course — *"no
longer functioning"*; Aburi Botanical Gardens — *"not so much of an adventure"*.
→ both are carried in the dataset as `status: "closed"` / `status: "dormant"` so the failure
mode is visible and never recommended again.

**Hotel/boutique recommendations made in the PDF:** Amber Hotel and ESP Hotel (Labone).

### Data-integrity verdict
The PDF's content is **AI-generated research**, not first-party fact. Hours such as
"Open 24/7" for a water-sports resort and "Fri–Sun 01:00–07:00" for Ace are plausible but
unverified. **Every record therefore ships with `verification: "unverified"` + a
`lastVerified` date, and the UI surfaces a "check before you go" affordance until a human
confirms it.** This became a first-class requirement (scope §7).

### Decisions taken this session
| # | Decision | Rationale |
|---|---|---|
| D1 | **Next.js 15 App Router** (not Vite SPA) | Real shareable URLs are the core feature; SSR/SSG gives cold-load detail pages and trivial SEO |
| D2 | **MapLibre GL** + keyless light/positron style, env-swappable | Free, no token, mobile-fast, no vendor lock-in. Satisfies the "minimalist white" look better than a colourful raster style |
| D3 | **URL is the store** (`?c=lat,lng,z&f=…&s=slug`) | "Share any map view" *is* the product; back/forward correctness comes free; no Redux/Zustand |
| D4 | **No database, no auth, no CMS in v1** | "Build nothing complicated". A typed, build-time-validated JSON dataset is the whole content layer, and it can move to a CMS later behind the same interface |
| D5 | **`status` + `lastVerified` on every place** | Directly answers the "still active" ask and the Legon failure |
| D6 | **`vibe` + `energy` separate from `category`** | Directly answers "Aburi isn't an adventure" |
| D7 | **`venueType` distinct from `category`** | Directly answers "Bloom is a lounge, not a club" |
| D8 | **Best-time engine is pure + unit-tested** | Real logic (midnight rollover, sunset) that must not be guessed in a component |
| D9 | **No real photos**; typographic/gradient placeholders by category | Avoids licensing + staleness, stays on-brand |
| D10 | **No dark mode in v1** | The brief is explicitly a white app; token layer is structured so it can be added later |
| D11 | **Sunset/golden hour computed locally (NOAA algorithm)** | No API key, no network dependency, and it's what makes beach/viewpoint advice feel smart |
| D12 | **Distance/drive-time is a first-class filter, not a cap** | The user widened the radius to Akosombo mid-conversation |

### Deliverables this session
- `docs/project_scope.md` — decoded requirements, enhanced scope, feature set A–G, explicit
  non-goals, data model, seed-dataset tiers, stack table, design system, data-refresh policy,
  NFRs, UX flow, success criteria, risks, 6-milestone release plan, open questions, glossary.
- `docs/tasks.md` — 8 phases (0–7) with ~90 checkable tasks and a per-phase Definition of Done.
- `docs/session_logs.md` — this entry.

---

## Session 2 — 2026-09-28 — Full build, then a green lint → typecheck → test → build chain

### Request
- Implement the whole app from `docs/project_scope.md`: four-card landing page, collection
  routes, interactive shareable map, list/detail/table, planner, saved places, PWA/SEO metadata,
  and unit coverage.
- Recurring constraint honoured: **build is allowed, do not start any servers.**

### What was built
- Landing `/` with four real-count cards (Night Life · Adventures · Daycation Trips · Food) and a
  quiet "show me everything" link.
- Routes: `/c/[collectionId]`, `/m`, `/list`, `/place/[id]`, `/plan`, `/table`, plus
  `error.tsx`, `not-found.tsx`, `loading.tsx`, `sitemap.ts`, `robots.ts`, `manifest.ts`,
  `opengraph-image.tsx`, `icon/icon-maskable/apple-icon` SVGs.
- Components: `ui.tsx` kit, `bottom-nav`, `place-card`, `place-actions`, `advice`, `list-view`,
  `table-view`, `planner`, `collection-card`, `page-shell`, `use-share` (Web Share + clipboard),
  `saved-provider` (`useSyncExternalStore`), and the map stack (`dynamic-map`,
  `map-experience` with grid clustering + fitBounds + reduced-motion, `map-toolbar`,
  `filters-sheet`, `place-preview-sheet`, `use-map-state`).
- `src/data/collections.ts` rewritten: static typed filters (no runtime ceremony), per-card
  counts, collection-aware sources (dormant-inclusive for Night Life and Food, `RECOMMENDABLE`
  otherwise).
- Validation gate: `src/data/index.ts` eagerly validates the merged dataset at import; a passing
  build therefore means the dataset itself is well formed.

### Bugs found and fixed by the new unit tests (this session)
1. **`src/lib/sun.ts`** — original NOAA port had the golden hour inverted and no separate solar
   transit; rewrote and sanity-checked Accra (Jan sunrise 06:04 / sunset 17:54 / golden 17:25–18:08).
2. **`src/lib/hours.ts`** — `openStatusAt` added `dayIndex` twice when computing `untilDay` /
   `opensAtDay` from absolute week-minutes, so a Fri 20:00–02:00 window "closed at 02:00 Thursday".
   Now uses the absolute day directly; midnight-rollover suite green.
3. **`src/lib/plan.ts`** — nightlife was silently dropped once the daytime budget filled the day.
   The plan now reserves a closing slot and exempts night stops from the 8-hour daytime cap.
4. **`src/lib/share.ts`** — decoder now trims `q` to match the encoder.
5. **Toolchain** — ESLint 10 + flat config were incompatible with the plugin stack; downgraded to
   the 9.39.x line and scoped type-aware rules.

### Validation (all run, all green)
| Check | Result |
|---|---|
| `npm test` | 7 files, **125 tests passed** |
| `npx tsc --noEmit` | clean |
| `npm run lint` | clean |
| `npm run build` | **73 / 73 pages**, routes as expected |

### After-build follow-ups this session
- **P3.12 closed**: `/m` and `/c/[collectionId]` now pass the server `searchParams` through
  `paramsToQuery` → `MapRoute initialQuery` → `decodeState`, so a shared URL fully reproduces the
  view on cold load. `decodeState` also merges repeated query keys (`f=a&f=b` ≡ `f=a.b`); two tests
  cover this.

### Deliberately skipped / known gaps
- No server was started; no live browser/axe/device pass yet.
- Every dataset record still ships `verification: "unverified"` — human sweep is Phase 7 work.
- README, CI, and Playwright smoke specs are not created (tasks P6.11 / P6.12 / P6.10 split).
- JSON-LD per place is not implemented; SEO relies on metadata + OG + sitemap.
