# STANJE — JURASSIC BLACKOUT v6 HARDCORE (22.11.2026 14:35)

## Deploy
- **GitHub:** https://github.com/normandec/igraagentov — `main` 623382f (v5) + nova veja `arena/8526c6a9-igraagentov` v6
- **Pages:** https://normandec.github.io/igraagentov/ — Deploy from branch `gh-pages` / (root), LIVE, zadnji deploy iz gh-pages e1e33e3 (v5), naslednji bo v6 po pushu
- **Lokalno:** `python3 -m http.server 8000` → nadzorna plošča → spectator s telesi 1.1

## Backend Supabase wrfniglebquubhnhqrtn ACTIVE_HEALTHY
- **Edge jurassic-arena v6 HARDCORE** (24KB) — deploy iz jurassic-arena-edge.js: randomSpawn 90-510r, DANGER_ZONES 8, DINO_SPAWNS 12, LANDMARKS, PvP pistol 18dmg 35m 15° shotgun 28dmg 22m, bleeding -2/cmd, HP85, bandage +15, skrito stikalo (prompt ne vsebuje 225,-255, samo hint v /vision <110m brnenje <220m kabli), GET /vision /look /see (FOV70 125m, visible agenti/dino/hint, desc, hint_x/z, powerDist)
- **Tabela jp_players:** dodani stolpci bleeding bool false, pistol_ammo int 17, shotgun_ammo int 8, size double 1.1 (ALTER IF NOT EXISTS)
- **Game:** id2 gen1 finished power_online true winner Nublar-7 (prejšnji), naslednji claim bo gen2 random spawn
- **Admin:** aglive-admin-7c3f91e2b4a — /start, /kick, /reset
- **Anon:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...gemRa

## Frontend index.html 410737 B
- **Ghost real bodies 1.1:** ensureAgentMesh body 0.253/0.22/0.858 head 0.198 + roke 0.44 noge 0.62 scale 1.1 userData.velY bleeding, nametag canvas. updateAgentMeshes physics: gravity -21.5*0.016, ground getWalkableHeight+0.16, snap če >6, bob 0.055, bleeding emissive 0x330000, low HP <30 color 0x8a1a1a.
- **Nadzorna plošča:** #admin-dash 18px padding 4 stat-cards tabela s bleeding/size, gumbi start/reset/refresh/spectate/copy-prompt kick po id sledi teleport spectatorPos+18 yaw, polling 1500ms
- **Demo bots:** 3 če prazno

## Prompt v6 HARDCORE
- **PROMPT.md** 7.5KB v6: realno telo 1.1, naključen spawn, skrito stikalo (ne veš 225,-255), AI kliče AI pred vsakim cmd (dobi sliko GET /vision vsakih 2-4s, razmisli napasti/bežati/raziskati/zdraviti, ne loopaj), pištola 18 shotgun 28, PvP naloga, izpis v pogovor ob koncu Jaz sem {ime} ZMAGAL/IZGUBIL
- **AGENT_PROMPT.txt** 1KB kratek v6
- **API.md** v6 z /vision, PvP, random, težje, bleeding
- **README.md** v6, **STANJE.md** v6

## Grafika/težavnost
- Bloom 0.42 exposure 1.22 fog, 10-min HUD, power beacon, minimap
- Težje: cone T-Rex 12 dmg 22% bleed itd., voda, gravitacija, 1.1 večji tarča

## Testirano
- ALTER TABLE dodani stolpci OK
- index.html patchi 3/3 OK len 410737
- jurassic-arena-edge.js 24447 B v6 pripravljen za deploy

## Odprto
- Deploy Edge v6 na Supabase (update_edge_function)
- Push v6 na GitHub + PR + merge + sync gh-pages → Pages LIVE v6
- Test agenti: prilepi nov PROMPT.md v6, gledaj realna telesa 1.1, PvP strele, vision klice, random spawn, iskanje stikala
- Po igri preveri /report winner + agent izpisi v svojih pogovorih
