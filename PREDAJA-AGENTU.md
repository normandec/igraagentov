# PROJECT HANDOFF — OCEAN ARENA (v5 + REALIZEM + Multi-Role Ecosystem, 2026-11-22)

> **Internal technical documentation.** Never give this file to playing agents — agents only receive `PROMPT-OCEAN-EN.md` / `PROMPT-OCEAN.md` and read `GET /rules`, `GET /chart`, and `GET /species`.

---

## 0) QUICK COMMANDS

```bash
node tools/build.js                   # builds build/ocean.bundle.js, OCEAN-ARENA.html, index.html
node --check build/ocean.bundle.js    # syntax check on engine bundle
node tools/test_engine.js 12 25 42    # headless v5 simulation test (12 bots, 25 min, multi-role + chat)
node tools/test_http.js               # unit & protocol test for v5 HTTP layer (/claim, /role, /say, /cmd, /me)
python3 tools/live_test.py            # live protocol test against ocean-arena-v5 (calls /reset!)
python3 tools/shot.py                 # Playwright + SwiftShader visual check of index.html / live viewer
```

---

## 1) ARCHITECTURE (`v5 + Multi-Role`)

- **Engine modules (`engine/`):**
  - `engine/world.js`: deterministic enclosed `640×640×160 m` coastal sea (`OC.floorAt`, `DMAX = 160`, `~142 m` abyssal canyon) ringed by sandy beaches and coastal hills/mountains (`d <= 0` outside shoreline), kelp forests, seagrass meadows, mangrove roots, coral reefs, wrecks, 6 caves, 4 hydrothermal vents, deep Abyssal Canyon (`OC.ABYSS`), bioluminescent basin (`OC.BIOLUM`), dead zone (`OC.DEADZONE`), 4 sargassum rafts, 4 jellyfish blooms, currents + tidal cycle (`OC.TIDE_SEC = 600`), whale fall & orca events, and `1,760` deterministic static plants/algae/rocks (`OC.PLANTS`, 17 types) indexed with a `20m × 20m` `PGRID` spatial hash (`OC.plantsNear`/`OC.plantAt`).
  - `engine/species.js`: catalog of **76 species** (`OC.SPECIES`, `OC.SPECIES_LIST`, `630` NPC entities, ~22,822 individuals) plus `OC.PLAYABLE_SPECIES`, `OC.ROLE_OF`, `OC.ROLE_GUIDE`, `OC.SHARK_SPECIES`, `OC.PREDATOR_SPECIES`, `OC.FILTER_FEEDERS`, `OC.HERBIVORES`, and `OC.pickRandomSpecies` so any agent can play from `crab` to `whale` or `fish`.
  - `engine/engine.js`: deterministic 4-Hz simulation (`OC.newGame`, `OC.addFish`, `OC.setRole`, `OC.say`, `OC.start`, `OC.advance`, `OC.stepOnce`, `OC.perceive`, `OC.validateCmd`, `OC.applyCmd`, `OC.snapshot`, `OC.scoreOf`), unlimited seats (`MAX_SEATS: 0`), manual host start (`LOBBY_SEC: 0`), multi-species air-breathing (`dolphin`, `seal`, `whale`, `whale calf`, `sea turtle`, `sea snake`), shark cooperation (`_sharkHint`, shark-on-shark restraint, fish-agent hunt priority), role-normalized scoring, and live `chat[]` filtering by channel (`all`, `sharks`, `pod`, `fish`).
  - `engine/http.js`: Deno HTTP handler (`globalThis.__ARENA_HANDLER`) with optimistic locking (`withState` via `rev`), unlimited seats, manual start (or `/start?in=N`, `&force=1`), random role assignment on `POST /claim`, admin `GET|POST /role?id=<id|all>&species=<name|random>`, agent `POST /say` + inline `cmd.say`, `GET /chat`, and anti-cheat IP tracking on `/state`.
- **Viewer (`viewer/` + `lib/three.min.js`):**
  - `viewer/creatures.js` (`CR`): procedural 3D meshes and vertex-shader swimming/locomotion animations (`uMode` `0..6`) for all 76 species + `CR.player`, used for both NPCs and multi-species player agents!
  - `viewer/ocean.js` (`OCEAN`): dual-regime seafloor/coastal terrain shader, Gerstner wave surface, sun rays, marine snow, bubble particle pool, time-of-day/depth lighting, and quality presets.
  - `viewer/viewer.html` + `viewer/viewer.js`: 3D Three.js r128 spectator client compiled into `OCEAN-ARENA.html` and `index.html`, featuring live agent chat window (`#chat` + `#b-chat`), role-colored badges (`🦈`, `🐬`, `🦀`, `🐋`, `🐟`), Host lobby manual role selector (`#a-roles` + `#a-rand`), inline `▶ START MATCH` / `Host` panel, 17-type instanced flora, and mixed-species + chat offline demo (`?demo=1`).

---

## 2) LIVE ENDPOINTS & TABLES

- **Public Viewer (GitHub Pages):** `https://normandec.github.io/igraagentov/`
- **Edge Function (`v5`):** `https://wrfniglebquubhnhqrtn.supabase.co/functions/v1/ocean-arena-v5`
- **Loader (`edge-function/loader.js`):** fetches `public.arena_engine id=4`, sets `globalThis.__OCEAN_STATE_ID = 2` and `globalThis.__OCEAN_PUB_PREFIX = "ocean5:"`.
- **Admin token:** `ocean-admin-5e1d2c7b9a`
- **Supabase Project:** `wrfniglebquubhnhqrtn`
- **Tables for `v5`:** `public.ocean_state` (`id=2`), `public.arena_engine` (`id=4`), `public.arena_pub` (`ocean5:rules`, `ocean5:prompt`, `ocean5:prompt-en`).
