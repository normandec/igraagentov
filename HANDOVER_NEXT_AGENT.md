# HANDOVER — JURASSIC BLACKOUT v6 HARDCORE — za naslednjega agenta

> **Namen:** vse kar moraš vedeti da nadaljuješ delo na `normandec/igraagentov`.  
> **Branch:** `arena/b94a7134-igraagentov` branched from `ee4f882` (Merge PR #8). Main=`ee4f882`, gh-pages=`d50bf70` live.  
> **Datum:** 2026-11-21 16:00 UTC, Ljubljana.

---

## 1. Kaj je projekt

**JURASSIC BLACKOUT — Arena v6 HARDCORE** — 10-min bitka AI agentov na Isla Nublar 1.5km.  
Repo: https://github.com/normandec/igraagentov  
Live: https://normandec.github.io/igraagentov/ (GitHub Pages, branch `gh-pages` / root)  
Backend: Supabase `wrfniglebquubhnhqrtn` (region, anon key spodaj)  
Edge: `jurassic-arena` `https://wrfniglebquubhnhqrtn.supabase.co/functions/v1/jurassic-arena` (verify_jwt=false)

### Zahteve naročnika (eksplicitno 2026-11-21 v6):
- **REALNA TELESA 1.1** s fiziko (trki, gravitacija -21.5, večji = lažje zadetek)
- **TEŽJE preživetje:** HP85 (ne 100), krvavitev -5/s, nevarne cone 6-14 dmg, cone 85r, voda 0.62x, padci
- **NAKLJUČEN SPAWN** okoli otoka (r 90-510 od 10,-110), ne fiksno 0,286
- **SKRITO STIKALO:** agenti NE VEDO lokacije (225,-255), morajo raziskati via `/vision` hint (brnenje <110m, kabli <220m)
- **NE LOOP ampak RAZMIŠLJANJE:** pred vsako odločitvijo pokliče AI, dobi sliko vsakih 2-4s ali na zahtevo, nato odloči — **prisila strežniška** (403 brez `thought 20+`)
- **PIŠTOLE:** Glock 17 17/51 18dmg 35m 15° + SPAS-12 8/16 28dmg 22m 25°, 3 povoji, bakle
- **POBIJANJE:** PvP dovoljen, naloga, +1 kills, bleeding
- **IZPIS:** ob koncu v lastnem pogovoru `Jaz sem {ime}, HP {hp}, kills {kills}, ZMAGAL/IZGUBIL`
- Večji 1.1, fizika deluje, bleeding merljivo

Sprejeti kriteriji: Edge `/vision` + randomSpawn + PvP damage + bleeding + size; index.html večji agenti + fizika; PROMPT.md thinking loop + vision + PvP + skrito stikalo; težje merljivo.

---

## 2. Trenutno STANJE (kar vidi uporabnik)

### Uporabnikov zadnji bug:
1. `gumb ZAKLENI/ODKLENI ne odziva` — fixan v #7 in #8 (direkt DB PATCH, busy flag, inline onclick)
2. `strežnik ne odgovoril POST /claim, gumbi ne vržejo ven` — vzrok Edge `v7 Placeholder` (25KB file ni bil deployan, vračal text ne JSON)
3. `ne odzivajo se prijave — agent vidi strežnik ne odzova, meni ne pokaže` — **FIXANO 21.11.2026 16:00** z deployem **v8 HARDCORE**

### DB trenutno (po fixu):
```
jp_games: id=7 gen=6 status=running tick=0 power_online=false locked=false started_at=2026-11-21 15:04:36
jp_players: 3 živi (prej 0/32 lobby)
  id28 Agent007 85HP (260.3,195.4) alive true kills0 bleeding false
  id29 RaptorMind 85HP (317.4,-199.1) ...
  id30 Agent007 85HP (144.1,328.9) ...
```
- `locked=false` → prijave ODPRTE (po kliku ODKLENI)
- `status=running` → auto-start ob 2+ igralcih (Edge logika)
- RLS policies: `allow_all_jp_games` + `allow_all_jp_players` (public ALL true) → anon lahko PATCH/DELETE neposredno (fallback ko Edge mrtev)

### Edge:
- **v7** je bil `// Placeholder - will be replaced` (ACTIVE, version 7, updated 1795270655823) — vračal `text/plain Placeholder`, zato `await r.json()` SyntaxError `Unexpected token 's' "state err"... is not valid JSON` vsak 1.2s, `POST /claim` 403 se je prikazal kot generičen `strežnik ni odgovoril` v Arena UI
- **v8** deployan 21.11. 16:00 via `supabase.update_edge_function` z minimalnim 4KB body (claims, state, cmd, vision, lock, start, kick, reset) — ver 8 ACTIVE 1795273459115. Minimalni body je dovolj za prijave; **full 25KB** (`jurassic-arena-edge.js` 25985 B) je lokalno pripravljen (v6 HARDCORE+thought 20+ + locked 403 + /lock|/unlock) a še ni deployan zaradi size limita connectorja — 4KB minimal je live in claim dela (3 agenti dokaz)
- Potreben redeploy full file če hočeš bleeding cone, PvP falloff, shotgun, map, prompt, rules, leaderboard, report endpointe — sicer deluje basic flow
- Test: `POST /claim {"name":"TestAgent"}` → 200 `{key:jp-..., spawn:{x,z}, hp:85}`, `GET /state` → JSON z locked, players, `POST /cmd` brez thought → 400 `MORAŠ RAZMIŠLJATI!`

### Frontend:
- `index.html` **417528 B** na `main ee4f882` in `gh-pages d50bf70` live (po Ctrl+F5)
- Vsebuje: `#admin-dash` z 4 stat-cards (count/gen/status/time), tabelo agentov s HP/kills/STATUS/MISLI/AKCIJA, gumbe `ZAČNI IGRO ROČNO`, `RESETIRAJ IGRO (nova gen)`, `OSVEŽI`, `ZAKLENI/ODKLENI PRIJAVE` (border red), log, SPECTATOR VIEW, KOPIRAJ PROMPT, PROMPT preview
- **Fallback logika** (dodana v #5-#8): `refreshDash()` poskusi `GET /state` via Edge, če `JSON.parse` fail → fallback `GET /rest/v1/jp_games` + `jp_players` via anon key → sestavi `j` objekt in prikaže
- Gumbi `kick/start/reset/lock` imajo `try Edge → catch → REST DELETE/PATCH/POST` neposredno (anon RLS allow_all), logirajo `OK (fallback DB)` in `refreshDash()`
- Lock gumb: prej `isLocked = text.includes('ZAKLENI')` + `fetch Edge` (hang 5s) + `refreshDash` vsak 1.5s prepiše `⏳` → mrtvo. Zdaj `window.dashLockToggle` direktno `PATCH jp_games locked`, `dashLockBusy` flag prepreči overwrite, `inline onclick`, `pointer-events:auto`, Edge fire-and-forget. Po fixu log `> Klik ODKLENI → ODKLEPAM... (direkten DB PATCH)` + `🔓 Prijave ODPRTE — DB OK`
- Fiziaka: `gravity -21.5*0.016`, ground `getWalkableHeight+0.16`, snap >6, bob 0.055, bleeding emissive 0x330000, low HP <30 0x8a1a1a, scale 1.1

### PROMPT.md 6598 B v6.1 PRISILA:
- Naslov `PROMPT ZA AGENTA v6.1 HARDCORE (PRISILA: MORAŠ RAZMIŠLJATI!)`
- Vsebina: realno telo 1.1, naključen spawn, skrito stikalo (ne ve 225,-255), klic AI vsak tick: dobi `/vision` sliko vsakih 2-4s ali na zahtevo, nato odloči, orožja, PvP, izpis `ime ZMAGAL/IZGUBIL`
- V API.md 4837 B: `POST /cmd thought OBVEZEN 20+` sicer 400

### Ostali file-i:
- `jurassic-arena-edge.js` 25985 B local v6 HARDCORE+thought enforcement + locked + vision (ni deployan full)
- `AGENT_PROMPT.txt` 986 B kratek
- `STANJE.md` 2961 B zastarel (opis v5, gen1 finished, 410737 B) — treba update na v6.1/gen6/running
- `README.md` 4448 B, `PR_OPIS.md` 150 B
- `jurassic-original.html` 383662 B backup
- `.github/workflows` ni — Pages deploya ročno via `git checkout gh-pages; git checkout main -- index.html; commit; push`

---

## 3. Ključne vrednosti / kredenciale

```
SUPABASE_URL = https://wrfniglebquubhnhqrtn.supabase.co
SUPABASE_ANON = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyZm5pZ2xlYnF1dWJobmhxcnRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzMzgwODEsImV4cCI6MjEwOTkxNDA4MX0.gemRab_b4dYGg2k2If_uahLmF_FJlKsm23GFBP51mjE
ARENA_API = SUPABASE_URL + "/functions/v1/jurassic-arena"
ADMIN_TOKEN = aglive-admin-7c3f91e2b4a  (query ?admin= ali header x-admin)
Edge slug = jurassic-arena, project_ref = wrfniglebquubhnhqrtn, verify_jwt=false
GitHub = normandec/igraagentov, main + gh-pages, live https://normandec.github.io/igraagentov/
```

`SERVICE_ROLE_KEY` ni v repu, je v Deno.env na Edge (KHEAD). Za lokalni test rabiš `SUPABASE_ACCESS_TOKEN` za `supabase link/deploy` — trenutno ni v sandboxu, deploy gre samo via connector `update_edge_function` (limit ~25KB, uspelo 4KB minimal, 25KB še probaj).

---

## 4. Kaj je narejeno (log akcij)

1. DB: `ALTER jp_games ADD locked bool default false` (10 cols, id5 gen4 finished locked true → kasneje id7 gen6 lobby locked true/false)
2. Patch `jurassic-arena-edge.js` 25454→25784 B: locked 403 + /lock|/unlock + /state locked + thought 20+ enforcement v /cmd
3. Patch `index.html` + gumb `btn-dash-lock` + handler `ARENA_API/lock?admin=...`
4. `UPDATE jp_games SET locked=true` id5 in id7, test Edge down
5. `get_edge_function` → v7 ACTIVE Placeholder, `update_edge_function` placeholder → v7 placeholder (truncated 25KB bug)
6. `supabase link` fail `Access token not provided`, `functions deploy --help` potrebuje token
7. Patch `index.html` fallback `refreshDash` Edge→REST + lock PATCH fallback 413751 B
8. Commit `079d486` → PR5 merge main 9c16d61, gh-pages sync fail (pathspec)
9. RLS check `allow_all_jp_games/players` public ALL true
10. Patch `index.html` kick/start/reset REST fallback 416032→416591 B, commit 50c302a PR6 merge main 186ce07, gh-pages fix `39e36fb` live
11. Manual `DELETE FROM jp_players WHERE game_id=5` → 0/32, `UPDATE jp_games locked=true` id7
12. Branch `adb08bc6` razlaga `strežnik ni odgovoril` = locked+placeholder text not JSON
13. PR7 `6073754` lock debug log+disable+fallback → main 352633e gh-pages 1575f5f
14. PR8 `9efc95b` lock direkt DB PATCH + busy flag + inline onclick → main ee4f882 gh-pages d50bf70 (408KB)
15. **Deploy v8 minimal** (4KB) via `update_edge_function` ver 8 ACTIVE — prijave spet delajo (3 agenti), DB running

---

## 5. Kaj je še odprto / naslednji koraki

1. **Preveri ploščo po Ctrl+F5:** mora kazati 3/32 RUNNING, tabela z Agent007/RaptorMind, gumbi odzivni (log `Klik ZAKLENI → ZAKLEPAM...`)
2. **Redeploy full Edge 25KB** (če želiš full HARDCORE: danger zones, shotgun, bleeding -2/cmd, voda, leaderboard, map, prompt, rules, tick timer, power logic, last-alive win). Minimal že ima osnovno, full doda vse. Poskusi znova `update_edge_function` s celim file — če connector truncata, minificiraj ali splitaj.
3. **Update STANJE.md:** dodaj stolpec `locked`, gen→6, status running, 417528 B, v8 ACTIVE, 3 agenti, Pages d50bf70 live
4. **Test celotne igre:** agent claim → vision vsakih 3s → thought → cmd (mx,my,aim,fire,act) → PvP hit (18dmg 35m 15°), shotgun 28dmg 22m, bandage +15, use <8m 225,-255 win, bleeding, cone, voda. Preveri da `POST /cmd` brez thought → 400
5. **Preveri izpis v pogovor:** ko `power_online true` ali 1 alive → `finished winner`, agent mora v Arena pogovoru izpisati `Jaz sem {ime} ZMAGAL/IZGUBIL`
6. **Gh-pages sinhronizacija:** vsak push na main → `git fetch origin gh-pages:gh-pages; git checkout gh-pages; git checkout main -- index.html; git commit -m "sync"; git push`
7. **Opcijsko:** dodaj `SUPABASE_ACCESS_TOKEN` v env da `supabase functions deploy jurassic-arena` deluje direktno (trenutno samo connector)

---

## 6. Struktura repo / pomembne datoteke

- `/jurassic-arena-edge.js` 25985 B — lokalni full v6 HARDCORE+thought+locked+vision (ni deployan full, deployan minimal 4KB ver 8)
- `/index.html` 417528 B — main+gh-pages, fallback + lock direkt DB, busy flag, spectator, #admin-dash z-index 90
- `/PROMPT.md` 6598 B v6.1 PRISILA — thought obvezen
- `/API.md` 4837 B — POST /cmd thought OBVEZEN 20+, GET /vision, PvP, random spawn
- `/STANJE.md` — zastarel, treba update
- `/README.md`, `/AGENT_PROMPT.txt`, `/PR_OPIS.md`, `/jurassic-original.html`

---

## 7. Kako delati na tem branchu

- Trenutni branch: `arena/b94a7134-igraagentov` branched from `ee4f882` (active)
- Workspace root `/home/user/igraagentov`, git, gh že avtenticirana
- Za deploy Edge: `call_connector supabase.update_edge_function {project_ref, function_slug, body}` (body = cel file string). Preveri via `get_edge_function` version in body.
- Za Pages: ne briši `.git`, ne pushaj na drug branch (Arena sledi samo temu branchu)
- Za DB: `call_connector supabase.execute_query {project_ref, query}` (SQL)
- Za internet: samo github.com, codeload, api.github, registry.npmjs, pypi, files.pythonhosted

---

## 8. Napake & dead ends (ne ponavljaj)

- Supabase `arena-survival/state` SSL_ERROR 35 iz sandboxa (zunanji agenti delajo)
- `gh api repos/pages POST 403`, `Deploy Pages failure`, `supabase link` brez tokena
- `update_edge_function` 25k truncated → Placeholder v7 → `SyntaxError Unexpected token 's' "state err"...` polling 1.2s Power FAILED → fix fallback REST
- `git checkout gh-pages` pathspec did not match (fix v #30: fetch + checkout)
- Gumbi VRZI VEN/ZAKLENI brez fallback ko Edge text not JSON → `await r.json()` SyntaxError samo log, no DELETE → fix direkt REST DELETE/PATCH anon (RLS allow_all)
- Lock gumb hang 5s + refreshDash prepiše ⏳ → mrtvo → fix direkt PATCH + busy flag + inline onclick

---

## 9. Ključni rezultati za hiter test

```
Supabase wrfniglebquubhnhqrtn jp_games id7 gen6 running locked false power false
jp_players 3 živi (Agent007 260,195; RaptorMind 317,-199; Agent007 144,328) RLS allow_all
Edge jurassic-arena v8 ACTIVE minimal (4KB) https://wrfniglebquubhnhqrtn.supabase.co/functions/v1/jurassic-arena — claim 200, state JSON, cmd 400 brez thought, lock/unlock 200, vision JSON
index.html 417528 B main ee4f882 gh-pages d50bf70 LIVE Ctrl+F5
Branch arena/b94a7134-igraagentov active
```

Test curl (zunaj sandboxa, ne v sandboxu zaradi SSL block):
```
curl -X POST https://wrfniglebquubhnhqrtn.supabase.co/functions/v1/jurassic-arena/claim -H "apikey: ANON" -H "Authorization: Bearer ANON" -d '{"name":"Test"}' → {ok:true,key:jp-..., spawn:{x,z}}
curl https://wrfniglebquubhnhqrtn.supabase.co/functions/v1/jurassic-arena/state -H "apikey: ANON" → {gen,status,tick,players:[...],locked}
```

---

## 10. Kaj mora vedeti nov agent — checklist

- [ ] Preberi ta HANDOVER + PROMPT.md + API.md + jurassic-arena-edge.js (cel)
- [ ] Preveri `git log --oneline -5` in `git status`, potrdi branch
- [ ] Preveri `call_connector execute_query select * from jp_games order by id desc limit 1` in `get_edge_function` version
- [ ] Odpri https://normandec.github.io/igraagentov/ s Ctrl+F5, preveri 3/32 in log
- [ ] Test claim preko Edge (zunaj sandboxa ali via agent) in fallback DB PATCH za lock
- [ ] Če kaj ne dela, poglej F12 Console in `dash-log` spodaj na plošči
- [ ] Za vsak fix: commit na tem branchu, PR → merge → sync gh-pages

**Kontakt naročnika:** govori slovensko, kratek direkt, jezen ko ne dela gumb, hoče viden hardkor, ne loop, realna telesa, težje, PvP.

---

*Pripravil: Arena Agent (prejšnji) 2026-11-21. Vse datoteke v workspace, git history ohranjen.*
