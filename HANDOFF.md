# KMB Brain — Handoff

A KMB-focused Hong Kong bus route planner (installable web app / PWA), built with Sum (a non-engineer). This doc lets a fresh session pick up instantly.

## Where it lives
- **Live site:** https://kmb-brain.vercel.app (permanent, no password)
- **Repo:** github.com/hijapego1/kmb-brain (Sum's GitHub: `hijapego1`; has Vercel Hobby)
- **Deploy flow:** Vercel auto-deploys from GitHub `main`. To ship an update, upload changed files to the repo via the GitHub web UI (Add file → Upload files) → Vercel rebuilds in ~45s. No terminal needed.
- **Working folder (this folder):** the source of truth. Edits here are what get uploaded.

## What's in the folder
- `index.html` — the whole app (one file: HTML + CSS + vanilla JS).
- `api/kmb.js` — Vercel **Edge Function** proxying `data.etabus.gov.hk` (avoids browser CORS + rate limits; edge-cached 1h). The app calls `/api/kmb?path=/v1/transport/kmb/...` first, then falls back to direct + public CORS proxies.
- `manifest.json`, `icon-180.png`, `icon-192.png`, `icon-512.png` — PWA icon + manifest.
- `PLAN.md` — original architecture/roadmap.
- (Logic unit tests live in the session outputs folder as `planner.test.mjs`, not the repo.)

## Data + algorithm
- **Data:** KMB open data (`data.etabus.gov.hk`): `/stop`, `/route`, `/route-stop`, `/stop-eta`. KMB + Long Win only. Cached in the browser (IndexedDB), refreshed daily.
- **Indexes:** `stops` (id→name/nameTc/lat/lng), `routeStopList` (rk→[stopId]), `routeSeq` (rk→stop→index), `stopRoutes` (stopId→Set rk), `routeMeta`. `rk = route|bound|serviceType`. A `CELL`-based spatial grid powers `nearbyStops()`.
- **Planner (`plan()`):** round-based RAPTOR-style search. Each round = one more bus trip; `arr[k]`/`par[k]` track cheapest cost + parent per stop with ≤k trips. Footpath transfers via `nearbyStops` within `XFER_WALK`. Up to `MAX_TRANSFERS=5`. `reconstruct()` walks parents back into a leg list. Returns distinct journeys by transfer count, ranked by total time; top 3 shown.
- **Live ETA (Phase 2):** `enrichEta()` pulls `/stop-eta` for boarding stops, refines waits, re-ranks.

## Status (as of 2026-06-22)
**DEPLOYED & LIVE — Sum is beta-testing on their iPhone (home-screen PWA).** Shipped in the latest batch:
1. Bilingual **EN ⇄ 中** toggle (header) — translates UI + uses Chinese stop/route names; Chinese search works; Mix tone; default English; remembers choice.
2. **Multi-transfer up to 5** (RAPTOR). Badge shows transfer count.
3. **3-tier walk preference** (`WALK_TIERS`): 🧍 Stopper (≤100m / ≤400m) · 🚶 Mild (≤300/≤700, default) · 🌝 Moon (≤1000/≤1200). Sets `XFER_WALK` + `MAX_WALK`.
4. **First-run welcome screen** (`#welcome`): asks Language + Walk tier, saves to localStorage (`kmbLang`, `kmbWalk`, `kmbSetup`). Reopen via header **⚙** gear (settings).
5. **App icon** — Sum's own GPT-image double-decker, processed full-bleed (icon-180/192/512.png) + manifest. Original kept as `icon-source.png.jpg`.

### To ship future updates
Edit files in this folder → upload to the GitHub repo (Add file → Upload files, same filenames) → Vercel auto-deploys. After an icon change, on iPhone delete + re-add the home-screen shortcut (iOS caches the old icon).

## ⭐ THE MAIN GOAL — next big build (this is the whole point of the app)
Sum: *"the main goal of this app... otherwise it's just another hkbus.app / KMB app / Citymapper."* The differentiator is **saving money**:

1. **BBI (Bus-Bus Interchange) fare optimization.** When a transfer is BBI-eligible, the 2nd leg is discounted — up to **$6** (**$3** senior/child) or the leg fare, whichever is lower — if you interchange within **2 hours on the same Octopus**. Build: detect BBI-eligible transfers in the planner, show the `-$X` discount + a true fare per journey, and add a **"cheapest"** ranking (not just fastest).
   - **Data path:** `github.com/LOOHP/HK-KMB-Calculator` is the best structured reference (models KMB interchange routes + fares + BBI). Also TD BBI schemes PDF (`td.gov.hk/filemanager/en/content_274/bbi_website_eng_202106.pdf`), `kmb.hk/eng/services/interchange_condition.htm`, and base fares via `hkbus/hk-bus-crawling`.
2. **KMB Fare Saver machines.** Physical machines (malls, MTR exits) where you tap Octopus for a ~$1–$2 discount on your next KMB ride within a time window. Build: locate them and surface "tap the Fare Saver here → save $X" near the boarding stop / along the route.
   - **Data path:** no open dataset exists — crawl KMB's own Fare Saver locations page and **geocode** each to lat/lng (name, address, discount, hours).

## Smaller fine-tunes (do alongside)
- **Hide night routes** (N-prefix) during daytime.
- **Fix stop-name search** — "TST" wrongly resolved to "TERMINAL 1 (ALIGHTING STOP)". Prioritize gazetteer/districts + major stops; drop "ALIGHTING STOP"-type results.
- Sum's own beta-test notes (pending).
- Later: "bus-nerd mode" (V6B / fleet-spotting hints).

## Notes / gotchas
- Sandbox has **no internet**; test the API via the `web_fetch` tool or in the browser. The app fetches client-side.
- Cannot call Sum's **GPT image API** (no key/internet here). For an AI icon, hand Sum a prompt to run themselves.
- Geolocation ("📍 from here") needs the HTTPS site (works on Vercel; not on a local file).
- Keep verifying planner changes with `planner.test.mjs` (copy the pure functions, run with `node`).
