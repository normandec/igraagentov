# STANJE — JURASSIC BLACKOUT 10-MIN ARENA (v4, 21.11.2026 13:20)

## Deploy
- **GitHub:** https://github.com/normandec/igraagentov
- **Glavni gledalec:** `index.html` (394k) — ena datoteka, 0 zunanjih virov razen Three.js CDN
- **GitHub Pages (uradno):** https://normandec.github.io/igraagentov/ — ⚠️ **zahteva 1 klik za vklop** (Settings → Pages → Source: Deploy from branch `main` / root, Save). Po vklopu je javna za ves svet.
- **Takojšnja javna povezava (LIVE PREVIEW):** https://8000-${E2B_SANDBOX_ID}.e2b.app (deluje zdaj, tunel te seje)
- **Lokalno:** `python3 -m http.server 8000` → http://localhost:8000

## Backend (Supabase)
- Projekt: `wrfniglebquubhnhqrtn` (eu-central-1)
- Edge Function: `jurassic-arena` v2 ACTIVE, verify_jwt=false
  - Endpoints: `/state`, `/claim`, `/join`, `/cmd`, `/me`, `/rules`, `/prompt`, `/map`, `/reset?admin=...`, `/leaderboard`, `/report`
- Tabele: `jp_games` (id=2, gen=1, lobby), `jp_players` (2 demo), `jp_commands`
- Anon key: `eyJhbGciOi...` (v PROMPT.md), service_role za admin
- Pravila: TICK_MS=100, MAX_TICKS=6000 (10 min), 32 igralcev, 60s AFK, 10kV elektrika na (225,-255)

## Igra
- **Trajanje:** 10:00 countdown, progress bar, warn/crit animacije
- **Zmaga:** prvi `act:"use"` na (225,-255) → powerOnline=true → finished + winner. Če nihče, zadnji preživi ali največ točk.
- **Grafika:** bloom 0.42, exposure 1.22, volumetric fog, contrast/saturate boost, power progress
- **HUD:** 10-min timer + status + 2/32 agentov, live leaderboard (desno), spectator banner, minimap z power beacon
- **Multiplayer:** ghost agenti z name tagi (Three.js Sprite), pozicije iz Supabase polling 1.2s, demo boti če prazno
- **108 vrst dinozavrov** + Jeep/Explorer/Helikopter + fizika (veter, eksplozije, bleeding)

## Testirano
- `curl -I http://localhost:8000/index.html` → 200 text/html
- `index.html` → title vsebuje "10 MIN AGENT ARENA"
- DB: `jp_games` gen1 lobby, 2 demo igralca (Demo-Alpha, Demo-Bravo)
- Edge function v2 deploy OK
- GitHub push: `arena/a2f766d1-igraagentov` → `main` + `gh-pages`, workflow deploy poskus (Setup Pages neuspeh zaradi manjkajoče aktivacije — potreben ročni vklop)

## Odprto
- GitHub Pages aktivacija (1 klik v Settings) — po tem `https://normandec.github.io/igraagentov/` 200 text/html
- Pravi agenti: prilepi `PROMPT.md` v N Arena pogovorov, gledaj `V ŽIVO`
- Reset: `curl "https://wrfniglebquubhnhqrtn.supabase.co/functions/v1/jurassic-arena/reset?admin=aglive-admin-7c3f91e2b4a"`
