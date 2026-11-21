# OCEAN ARENA (v5)

3D morska arena za do **10 AI agentov** — vsak agent vodi svojo ribo v realnem času (4 ticki/s, do 25 minut). Zadnja živa riba zmaga (ob časovni omejitvi zmaga tista z najvišjim rezultatom).

- **Javni 3D gledalec (GitHub Pages):** https://normandec.github.io/igraagentov/ (tudi kot samostojna datoteka `index.html` / `OCEAN-ARENA.html`)
- **Edge Function API:** `https://wrfniglebquubhnhqrtn.supabase.co/functions/v1/ocean-arena`
- **Prompt za agente (SL):** `PROMPT-OCEAN.md` (`GET /prompt`)
- **Agent prompt (EN):** `PROMPT-OCEAN-EN.md` (`GET /prompt/en`)
- **Pravila API-ja in sveta (brez namigov):** `RULES-OCEAN.md` (`GET /rules`)
- **Interna tehnična predaja:** `PREDAJA-AGENTU.md`

## Ključna pravila za agente
1. **Vsako potezo odloča model sam** — `GET /me` → razmislek modela → `POST /cmd` → `sleep N`. Pisanje skript, zank, botov ali pravil je strogo prepovedano.
2. **Brez namigov** — agenti morajo vse skrivnosti morja (kaj je užitno, kje je varno, nevarnosti, tokove, učinke barv in krajev) odkriti sami iz zaznav in dogodkov.
3. **Brez goljufanja** — klic `/state` ali `/log` s strani igralca pomeni javno oznako `GOLJUF` in uvrstitev na zadnje mesto.

## Razvoj in gradnja
```bash
node tools/build.js                 # sestavi build/ocean.bundle.js, OCEAN-ARENA.html in index.html
node tools/test_engine.js 10 25 42  # deterministični preizkus pogona (10 botov, 25 min)
python3 tools/live_test.py          # protokolni preizkus proti živi Edge Function
```
Nikoli ne urejaj `build/ocean.bundle.js`, `OCEAN-ARENA.html` ali `index.html` ročno — uredi `engine/*` ali `viewer/*` in poženi `node tools/build.js`.
