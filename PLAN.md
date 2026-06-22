# KMB Brain — HK Bus Route Planner (Plan)

A KMB-focused, bus-nerd route planner for Hong Kong. Type where you are and where
you're going; it finds the nearest stops, builds direct + 1-transfer bus options
from **real route + stop + live-ETA data**, and ranks them so it never suggests a
bus that just left.

Decisions locked for this build: **Web app / PWA now, native later** · **KMB only**
(includes Long Win — same API) · **Plan → then build** this session.

---

## 1. Data sources (all free, no API key)

| Data | Endpoint | Used for |
|---|---|---|
| All stops (with GPS) | `…/v1/transport/kmb/stop` | Nearest-stop search |
| All routes | `…/v1/transport/kmb/route` | Route list, origin/dest names |
| Route → stop sequences | `…/v1/transport/kmb/route-stop` | The route graph (which stops, in order) |
| Live ETA at a stop | `…/v1/transport/kmb/stop-eta/{stopId}` | Real-time waiting time |

Base URL: `https://data.etabus.gov.hk`. JSON, refreshed every ~1 min for ETA,
daily for routes/stops. Official Transport Department open data.

**BBI / fares (Phase 3):** no clean government API. The community repo
`hkbus/hk-bus-crawling` crawls fares + interchange discounts daily — that's the
data path for fare logic and the `-$4` interchange machine rules later.

**Note:** the official `kmb.hk/interchange_bbi.html` page is a JavaScript app, so
plain scraping returns nothing — the open-data API above is the correct source.

---

## 2. The "brain" — data model

Three in-memory indexes, built once on first load and cached on your phone:

- **Stops index** — `stopId → { name, lat, long }`. Powers distance maths.
- **Route → stops** — `routeKey → [stopId in seq order]`. The route graph.
- **Stop → routes** — `stopId → [routeKey]`. "What can I catch from here?"

`routeKey = route + direction + serviceType` (e.g. `92-outbound-1`), because the
same route number runs both directions and sometimes has variants.

Built once, stored in the browser (IndexedDB), refreshed daily. First launch shows
a one-time "Building KMB brain…" screen (~5–10s); after that it's instant.

---

## 3. Planning algorithm (Phase 1)

A. **Resolve origin + destination** to coordinates:
   - "from here" → phone GPS
   - Known HK landmark ("TST", "Sai Kung", "Mong Kok") → built-in gazetteer
   - Otherwise → fuzzy match against bus-stop names

B. **Nearest stops** — haversine distance to every stop; keep those within ~800 m
   walk of origin and of destination.

C. **Direct routes** — any route that serves an origin-area stop *and* a
   destination-area stop, with the origin stop **earlier in the sequence** than the
   destination stop (correct direction).

D. **1-transfer routes** — route R1 from an origin stop to an interchange stop X,
   then route R2 from X (or a stop within short walking distance of X) to a
   destination stop, with sequence order respected on both legs.

E. **Score each option** = walk time + in-vehicle time (estimated from stop count)
   + transfer/boarding wait (from live ETA). Return the **top 3**.

Limited to 0 and 1 transfer for the MVP — covers the vast majority of real trips.

---

## 4. Live ETA (Phase 2)

For each option's boarding stop + route, pull `stop-eta` and show the next 1–3
arrivals. The **first ETA becomes the boarding/transfer wait**, so options get
re-ranked by *actual* waiting time — the core "don't suggest a bus that just left"
feature.

---

## 5. Screens (MVP)

- **Search** — origin field (with "📍 from here"), destination field, Go.
- **Results** — top 3 option cards: total time, fare (later), transfer badge,
  walk legs, and live next-bus countdown per leg.
- **Option detail** — step-by-step: walk → board route X (live ETA) → ride N stops
  → transfer at Y → board route Z → walk to destination.

KMB look: red/white, big tap targets, mobile-first.

---

## 6. Phase roadmap (matches your phases)

| Phase | What | Status this session |
|---|---|---|
| **1 — Planner** | Text/GPS → nearest stops → direct + 1-transfer → top 3 | **Building now** |
| **2 — Live ETA** | Real-time ETA re-ranks options | **Wiring now** |
| **3 — Jared mode** | BBI/fare optimisation, `-$4` logic, avoid-walking, prefer-bus, V6B / fleet-spotting hints | Designed, built later |

---

## 7. Bus-nerd mode (Phase 3 ideas)

- **BBI awareness** — flag when a transfer qualifies for an interchange discount.
- **Fare optimiser** — cheapest vs fastest toggle; show `-$X` interchange savings.
- **Fleet/route hints** — highlight routes likely to run specific deckers (e.g.
  V6B sightings), surfaced from route-assignment patterns. Best-effort, community
  data — clearly labelled as "for fun, not guaranteed".
- **Prefer-bus toggle** — never suggest MTR even if faster.

---

## 8. Getting it onto your iPhone (PWA)

1. I give you a single `index.html`.
2. Drag it onto **app.netlify.com/drop** (free, no account) → you get an `https://` URL.
3. Open that URL in Safari → **Share → Add to Home Screen**.
4. Now there's an app icon. It opens full-screen, uses GPS, pulls live ETA.

(HTTPS hosting is needed because iOS only gives GPS to secure pages — Netlify Drop
gives that instantly and free. A local file won't get GPS.)

---

## 9. Honest limits (MVP)

- KMB/Long Win only — no Citybus, GMB, MTR, ferries yet (by design).
- Max 1 transfer in the MVP search.
- In-vehicle time is **estimated** (stop count), not from a live traffic feed —
  good for ranking, not a to-the-minute guarantee.
- Fares/BBI are Phase 3 — Phase 1–2 focus on *route + time*, not dollars.
- Landmark gazetteer starts small (major districts) and grows; unknown text falls
  back to stop-name matching.
