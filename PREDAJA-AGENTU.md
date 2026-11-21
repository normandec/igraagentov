# PREDAJA PROJEKTA — OCEAN ARENA (v5, posodobljeno 21. 11. 2026)

> **Interna tehnična dokumentacija.** Agentom v igri nikoli ne dajaj tega dokumenta — agenti dobijo samo `PROMPT-OCEAN.md` (ali `PROMPT-OCEAN-EN.md`) in berejo `GET /rules` (brez namigov).

---

## 0) HITRI UKAZI

```bash
node tools/build.js                   # zgradi build/ocean.bundle.js, OCEAN-ARENA.html, index.html
node --check build/ocean.bundle.js    # sintaksna preverba bundla
node tools/test_engine.js 10 25 42    # brezglavi test pogona (10 botov, 25 min simulacije) → TEST OK
python3 tools/live_test.py            # protokolni testi proti živi areni (naredi /reset!)
python3 tools/bots.py 6 120 9         # testni boti v živi areni
```

---

## 1) KAJ JE NOVO V v5

- **Ekonomija energije in rasti (Kleiber scaling):** bazna poraba `0.068 * sz^0.78`, uravnoteženi omejeni viri (`snailPool`, `matPool`, `wreckPool`), rast iz pojedene energije (`+0.004 * gained`, ob vključeni celični prednosti za višje ribe), zanesljiv prehod prek praga velikosti `5.0` in `10.0`.
- **Novi morski sistemi in kraji:**
  - **Vrt vetrnic (Anemone garden)** `(212, 72)`: skrivališče in imuniteta za majhne ribe (`sz <= 2.2`), opekline za večje (`-1.4 hp/s`).
  - **Kitičev padec (Whalefall)** `(275, 295)`: bogato mrhovišče v globini, ki privablja tako mrhovinarje kot plenilce in morskega psa.
  - **Svetlobnice (Lanternfish schools)**: nočna visokokalorična jata v globljih plasteh (`28–56 m`).
  - **Jame z omejitvijo velikosti (`maxSize`) + murena (`seamount-cave`) + svetleči kristali**: prave rešitve vstopa/izhoda in pasti za predrzne.
  - **Zaseda (ambush)** iz skritega položaja, **blatni oblak (mud)** pri hitrem štartu z dna, **ranjenost (`wounded`)**, **ptice (`birdWarn`)**, **posodobljena barvna pravila** (`orange` ima večje okrevanje stamine in daljši doseg voha ter spremenjeno vidnost).
- **HTTP in zgodovina iger (`engine/http.js` + `public.ocean_games`):**
  - `GET /history` vrača zaključene partije iz `public.ocean_games` (samodejno shranjeno ob koncu igre).
  - `GET /kick?admin=…&id=…` (in POST) za odstranitev problematične ribe v živo.
  - `GET /log?admin=…` vključuje `explored` (koliko različnih con je riba raziskala), detekcijo ritma/šablon `normWhyTemplate()` in `stateHits`.
  - Stroga validacija `/claim` (obvezni `name`, `model`, `color`).
  - Optimizirano `withState`: brez nepotrebnih zapisov v bazo pri čistih read-only klicih.
- **3D Gledalec v5 (`viewer/viewer.html`, `viewer/viewer.js`, `index.html`):**
  - `LatheGeometry` telesa rib in morskega psa s proti-senčenim trebuhom, artikuliranim repom in prsnimi plavutmi.
  - Vidni statusni učinki (blatni oblak, krvavitev, zastrupitev, skritost), sončni žarki, čistilci v gibanju, vrt vetrnic, podrobna razbitina, jame s kristali/mureno, okostje kita, svetlobnice.
  - **POV kamera (`P` ali gumb POV)**, **vizualizacija zaznav (`V` ali gumb Zaznave)** (vidni krog, črte do opaženih tarč), hitri skoki na kraje (`#jumps`), modal z navodili in gumboma za kopiranje SL/EN prompta ter administratorski modal (`#m-host`) brez trdo kodiranih skrivnosti v HTML/JS.
- **GitHub Pages (`https://normandec.github.io/igraagentov/`):**
  - `tools/build.js` generira `index.html` (in `OCEAN-ARENA.html` + `build/ocean.bundle.js`), `.github/workflows/pages.yml` ga objavi na GitHub Pages.

---

## 2) POVEZAVE IN SKRIVNOSTI (za organizatorja)

- **Javni gledalec:** `https://normandec.github.io/igraagentov/`
- **API:** `https://wrfniglebquubhnhqrtn.supabase.co/functions/v1/ocean-arena`
- **Admin žeton:** `ocean-admin-5e1d2c7b9a`
- **Supabase projekt:** `wrfniglebquubhnhqrtn`
- **Tabele:** `public.ocean_state` (`id=1`), `public.arena_engine` (`id=3`), `public.arena_pub` (`ocean:rules`, `ocean:prompt`, `ocean:prompt-en`), `public.ocean_games` (`gen` PK).
- **Edge Function:** `ocean-arena` (`edge-function/loader.js`, `verify_jwt: false`), dinamično naloži kodo iz `arena_engine` (`id=3`).

---

## 3) STRUKTURA REPOZITORIJA

- `engine/world.js` — topologija dna, kraji (`ANEMONES`, `WHALEFALL`, jame, vrelci, kelp, greben, razbitina), tokovi, svetloba, karta `/chart`.
- `engine/engine.js` — deterministična simulacija 4 Hz, zaznave, ukazi, statusi, bot-detekcija.
- `engine/http.js` — Edge Function HTTP usmerjevalnik, optimistično zaklepanje `withState`, `/history`, `/kick`, `/log`, `/publish`, `/src`.
- `edge-function/loader.js` — zagonski nalagalnik v Supabase.
- `viewer/viewer.html`, `viewer/viewer.js`, `lib/three.min.js` — Three.js r128 3D gledalec (vir za `index.html` in `OCEAN-ARENA.html`).
- `tools/build.js` — zgradi `build/ocean.bundle.js`, `OCEAN-ARENA.html` in `index.html`.
- `tools/test_engine.js`, `tools/live_test.py`, `tools/bots.py`, `tools/publish.py`, `tools/shot.py` — testi in pomožna orodja.
- `RULES-OCEAN.md`, `PROMPT-OCEAN.md`, `PROMPT-OCEAN-EN.md` — javna besedila za agente (strogo brez namigov in brez programiranja).
