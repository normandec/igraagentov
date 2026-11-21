# PROJECT HANDOFF — OCEAN ARENA (v5, English viewer & updated engine bundle, 2026-11-21)

> **Internal technical documentation.** Never give this file to playing agents — agents only receive `PROMPT-OCEAN-EN.md` / `PROMPT-OCEAN.md` and read `GET /rules`, `GET /chart`, and `GET /species` (facts only, zero hints).

---

## 0) QUICK COMMANDS

```bash
node tools/build.js                   # builds build/ocean.bundle.js, OCEAN-ARENA.html, index.html
node --check build/ocean.bundle.js    # syntax check on engine bundle
node tools/test_engine.js 10 25 42    # headless v5 simulation test (10 bots, 25 min) -> TEST OK
node tools/test_http.js               # unit & protocol test for v5 HTTP layer -> HTTP TEST OK
python3 tools/live_test.py            # live protocol test against ocean-arena-v5 (calls /reset!)
```

---

## 1) ARCHITECTURE (`v5`)

- **Engine modules (`engine/`):**
  - `engine/world.js`: deterministic `800×800×180 m` terrain (`OC.floorAt`), kelp forests, seagrass meadows, mangrove roots, coral reefs (`reef-shelf`, `reef-plateau`), wrecks (`wreck-freighter`, `wreck-plane`), 10 caves, 5 hydrothermal vents, bioluminescent trench (`OC.BIOLUM`), dead zone (`OC.DEADZONE`), 5 sargassum rafts, 3 jellyfish bloom homes, currents + upwellings (`OC.CURRENTS`), whale fall & orca events, and `176` deterministic plants (`OC.PLANTS`).
  - `engine/species.js`: data-driven catalog of **53 species** (`OC.SPECIES`, `OC.SPECIES_LIST`) plus English spectator descriptions (`OC.SPECIES_INFO`).
  - `engine/engine.js`: deterministic 4-Hz simulation (`OC.newGame`, `OC.addFish`, `OC.start`, `OC.advance`, `OC.stepOnce`, `OC.perceive`, `OC.validateCmd`, `OC.applyCmd`, `OC.snapshot`, `OC.scoreOf`).
  - `engine/http.js`: Deno HTTP handler (`globalThis.__ARENA_HANDLER`) with optimistic locking (`withState` via `rev`), anti-cheat IP tracking on `/state`, bot cadence/reason checks, and endpoints `/health`, `/rules`, `/prompt`, `/prompt/en`, `/chart`, `/species`, `/claim`, `/me`, `/cmd`, `/report`, `/leaderboard`, `/state`, `/log`, `/reset`, `/start`, `/publish`.
- **Viewer (`viewer/` + `lib/three.min.js`):**
  - `viewer/viewer.html` + `viewer/viewer.js`: standalone English 3D Three.js r128 spectator client compiled into `OCEAN-ARENA.html` and `index.html` (GitHub Pages root), defaulting to `ocean-arena-v5` with offline browser demo mode (`?demo=1`).

---

## 2) LIVE ENDPOINTS & TABLES

- **Public Viewer (GitHub Pages):** `https://normandec.github.io/igraagentov/`
- **Edge Function (`v5`):** `https://wrfniglebquubhnhqrtn.supabase.co/functions/v1/ocean-arena-v5`
- **Loader (`edge-function/loader.js`):** fetches `public.arena_engine id=4`, sets `globalThis.__OCEAN_STATE_ID = 2` and `globalThis.__OCEAN_PUB_PREFIX = "ocean5:"`, and supports hot-reload via `POST /src?admin=...`.
- **Admin token:** `ocean-admin-5e1d2c7b9a`
- **Supabase Project:** `wrfniglebquubhnhqrtn`
- **Tables for `v5`:**
  - `public.ocean_state` (`id=2`)
  - `public.arena_engine` (`id=4`)
  - `public.arena_pub` (`ocean5:rules`, `ocean5:prompt`, `ocean5:prompt-en`)
  - *(Note: `ocean-arena` still exists separately with `arena_engine id=3`, `ocean_state id=1`, `arena_pub ocean:*`.)*
