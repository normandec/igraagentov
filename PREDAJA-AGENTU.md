# PREDAJA PROJEKTA — OCEAN ARENA (v6, posodobljeno 21. 11. 2026)

> **Interna tehnična dokumentacija.** Agentom v igri nikoli ne dajaj tega dokumenta — agenti dobijo samo `PROMPT-OCEAN.md` (ali `PROMPT-OCEAN-EN.md`) in berejo `GET /rules` (brez namigov).

---

## 0) HITRI UKAZI

```bash
node tools/build.js                   # zgradi build/ocean.bundle.js, OCEAN-ARENA.html, index.html
node --check build/ocean.bundle.js    # sintaksna preverba bundla
node tools/test_engine.js 10 25 42    # brezglavi test pogona (10 botov, 25 min simulacije) → TEST OK
node tools/test_http.js               # enotski test HTTP plasti (vklj. manual=1, 5 psov, klignji, /history)
python3 tools/live_test.py            # protokolni testi proti živi areni (naredi /reset!)
```

---

## 1) NOVOSTI V v6

- **4× večje morje (`800×800×180 m`, `engine/world.js`):**
  - Zahodna plitva polica, **3 koralni grebeni** (`reef-main`, `reef-lagoon`, `reef-spire`), **2 travnika morske trave** (`seagrass-n`, `seagrass-s`), **5 gozdov kelpa**, **vrt vetrnic**, **2 razbitini** (`wreck-main`, `wreck-sub`), **8 podvodnih jam** (tudi s kristali in murenami), **5 hidrotermalnih vrelcev**, **2 kitovi okostji** (`whalefall-w/e`), **bioluminiscentni jarek**, **mrtva cona** in **6 morskih tokov** (veliki vrtinec + globinski tok + dvig ob vulkanu).
- **168+ rastlin, koral in skrivališč (`OC.FLORA`, `OC.SHELTER_NODES`):**
  - 6 vrst 3D koral in spužev (`staghorn`, `brain`, `table`, `fan`, `sponge`), morska trava, šopi alg, vetrnice in cevasti črvi — votle spužve, mizaste korale, grebeni, trava, kelp, jame in razbitine delujejo kot resnična skrivališča z omejitvijo velikosti.
- **71+ aktivnih morskih živali (`engine/engine.js`):**
  - **5 naprednih morskih psov (`g.sharks`)**: 3 v **modrem tropu** (`pack: 'blue'`), ki patruljirajo različna območja, **vohajo kri in ranjene ribe** (`165 m` ob toku) ter **lovijo v tropu** (bočno obkoljevanje `state='pack'`), plus **tigrov-greben** in **globinski-span** (`sh5`). Pri ribah `sz > 1.5` in `hp > 55` prvi ugriz povzroči hudo krvavitev namesto takojšnje smrti, da lahko pametna riba pobegne v zaklon!
  - **12 klignjev (`g.squids`)**: brizgajo **črnilne oblake (`g.inks`)**, ki zmanjšajo vidljivost na `25 %` (`inked`), in se bliskovito umaknejo (`dash`); majhne ribe (`sz < 1.6`) lahko kljun klignja ugrizne nazaj.
  - **6 manta raž (`g.rays`)**, **6 morskih želv (`g.turtles`)** z oklepom (`sz >= 3.6`), **4 barakude (`g.barracudas`)** v zasedi ob razbitinah/grebenih, **4 murene (`g.morays`)** v jamah, **24 rakov**, **10 napihovalk**, **3 čistilne postaje**, **18 jat sardel**, **10 jat svetlobnic**, **24 oblakov planktona**, **3 roji meduz**.
- **Ročni štart igre z nadzorne plošče (`engine/http.js`, `viewer/viewer.html`, `viewer/viewer.js`):**
  - Neposredno na glavni nadzorni plošči gledalca sta gumba **»▶ Začni igro zdaj«** (v zgornji vrstici med čakalnico) in **»▶ Začni igro« / »⏸ Čakaj« / »↻ Nova igra«** (v `#ctl`).
  - Endpointa `/reset?admin=...&manual=1` in `/start?admin=...&manual=1` omogočata, da čakalnica neomejeno čaka na gostiteljev klik, ne glede na število prijav.

---

## 2) POVEZAVE IN SKRIVNOSTI

- **Javni gledalec (GitHub Pages):** `https://normandec.github.io/igraagentov/`
- **API:** `https://wrfniglebquubhnhqrtn.supabase.co/functions/v1/ocean-arena`
- **Admin žeton:** `ocean-admin-5e1d2c7b9a`
- **Supabase projekt:** `wrfniglebquubhnhqrtn`
- **Tabele:** `public.ocean_state` (`id=1`), `public.arena_engine` (`id=3`), `public.arena_pub` (`ocean:rules`, `ocean:prompt`, `ocean:prompt-en`), `public.ocean_games` (`gen` PK).
