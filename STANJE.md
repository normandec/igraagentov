# STANJE — JURASSIC BLACKOUT 10-MIN ARENA (v5, 21.11.2026 13:45)

## Deploy
- **GitHub:** https://github.com/normandec/igraagentov — branch `main` (00b2aaf + v5 nadzorna plošča)
- **Glavni gledalec:** `index.html` (409k) — ena datoteka, 0 zunanjih virov razen Three.js CDN. Prva stran je **nadzorna plošča** (`#admin-dash`), ki skrije 3D dokler ne klikneš **SPECTATOR VIEW**.
- **GitHub Pages (uradno):** https://normandec.github.io/igraagentov/ — ⚠️ **zahteva 1 klik za vklop** (Settings → Pages → Source: Deploy from branch `main` / root, Save). Po vklopu je javna za ves svet. Workflow `.github/workflows/pages.yml` pripravljen (pada `Setup Pages` dokler ni vklopljen).
- **Takojšnja javna povezava (LIVE PREVIEW):** https://8000-${E2B_SANDBOX_ID}.e2b.app — tunel te seje, deluje zdaj.
- **Lokalno:** `python3 -m http.server 8000` → http://localhost:8000 → nadzorna plošča → spectator.

## Backend (Supabase)
- Projekt: `wrfniglebquubhnhqrtn` (eu-central-1, ACTIVE_HEALTHY)
- Edge Function: `jurassic-arena` v4 ACTIVE, verify_jwt=false, https://wrfniglebquubhnhqrtn.supabase.co/functions/v1/jurassic-arena
  - Public: `GET /state`, `GET /me?key=`, `GET /rules`, `GET /prompt`, `GET /map`, `GET /leaderboard`, `GET /report`, `POST /claim`, `POST /join`, `POST /cmd`
  - Admin (`?admin=aglive-admin-7c3f91e2b4a`): `POST /start`, `POST /kick?key=`, `POST /reset`
  - Minificiran body v4 (start/kick dodana), CORS * , no-store
- Tabele: `jp_games` (id=2, gen=1, lobby tick0), `jp_players` (2 demo: Demo-Alpha/Bravo), `jp_commands` — RLS allow_all (public)
- Ključi: anon `eyJ...gemRa` (v PROMPT.md), service_role za Edge, admin token `aglive-admin-7c3f91e2b4a`
- Pravila: TICK_MS=100, MAX_TICKS=6000 (10 min), 32 igralcev, 60s AFK (ročno kick), 10kV elektrika na (225,-255) radij 8m

## Nadzorna plošča (index.html #admin-dash)
- CSS: gradient background, 4 stat-cards, 2-panel grid (tabela agentov + spectator panel), responsive
- HTML: header z stats (dash-count/gen/status/time), tabela #agent-tbody, gumbi start/reset/refresh/spectate/copy-prompt, log #dash-log, tick/power/winner panel, prompt preview, btn-open-game
- JS: ADMIN_TOKEN, ARENA_API, SUPABASE_ANON, refreshDash() GET /state → update vse elemente, kick gumbi (POST /kick?admin=&key=id), focus/sledi gumbi (teleport spectatorPos + yaw), openSpectator()/closeSpectator() + setPerspective hook, polling 1500ms, fetch PROMPT.md preview, animate() na koncu
- Popravek v5: kick po `p.id` (ne agent_key, ker /state ne vrača ključa), prikaz `ID X`, teleports set(ag.x, getWalkableHeight+18, ag.z+14)

## Igra
- **Trajanje:** 10:00 countdown, progress bar, power beacon na minimap (225,-255)
- **Zmaga:** prvi `act:"use"` v radiju 8m od (225,-255) → power_online=true, status finished, winner ime. Če nihče, zadnji živ ali največ točk (100*kills + ticki/10).
- **Grafika:** bloom 0.42, exposure 1.22, volumetric fog, contrast/saturate boost
- **HUD:** 10-min timer (match-hud), leaderboard, spectator banner, minimap
- **Multiplayer:** ghost agenti z name tagi (Three.js Sprite), polling 1.2s, demo boti če prazno
- **108 vrst dinozavrov** + Jeep/Explorer/Helikopter + fizika (veter, eksplozije, bleeding, motion vision T-Rex)

## Testirano
- `python3 -m http.server 8000` → 200 text/html, preview dela
- `index.html` nadzorna plošča vidna kot prva stran, spectator gumb dela
- DB: jp_games gen1 lobby, 2 demo igralca
- Edge v4 deploy OK — /state, /claim, /cmd, /me, /rules, /prompt, /map, /reset, /start, /kick
- GitHub push: arena/a2f766d1 → main (00b2aaf merge PR#1), nova veja arena/fa4361d5-igraagentov za v5
- Workflow deploy poskus → Setup Pages failure (pričakovano, potreben ročni vklop)

## Odprto
- GitHub Pages aktivacija (1 klik Settings → Pages → main/root) → potem https://normandec.github.io/igraagentov/ 200
- Pravi agenti: kopiraj PROMPT.md v N Arena pogovorov, gledaj nadzorno ploščo
- Reset za novo igro: curl "https://wrfniglebquubhnhqrtn.supabase.co/functions/v1/jurassic-arena/reset?admin=aglive-admin-7c3f91e2b4a" ali gumb RESETIRAJ
- Po resetu/koncu preveri /state status finished + winner

## Datoteke
- `index.html` 409k — nadzorna plošča + 3D arena
- `jurassic-arena-edge.js` 16k — Edge function vir (deployan kot v4 minificiran)
- `jurassic-original.html` 383k — original brez arene
- `PROMPT.md` 5.8k, `AGENT_PROMPT.txt` 1k, `API.md` 8k, `README.md` 4k, `STANJE.md` v5
- `.github/workflows/pages.yml` — Pages deploy
