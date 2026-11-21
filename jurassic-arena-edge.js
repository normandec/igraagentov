// JURASSIC PARK: BLACKOUT — Agent Arena Edge Function
// Deployed to https://wrfniglebquubhnhqrtn.supabase.co/functions/v1/jurassic-arena
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ADMIN = "aglive-admin-7c3f91e2b4a";
const MAX_PLAYERS = 32;
const TICK_MS = 100;
const MAX_TICKS = 6000; // 10 minut = 600s *10 ticks
const MAP_INFO = { w: 1520, h: 1520, name: "Isla Nublar 1.5km x 1.5km" };

const KHEAD = { apikey: SERVICE_KEY, Authorization: "Bearer " + SERVICE_KEY };

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization, x-admin, apikey",
    "cache-control": "no-store",
  };
}
function json(obj, code = 200) {
  return new Response(JSON.stringify(obj), {
    status: code,
    headers: { "content-type": "application/json; charset=utf-8", ...corsHeaders() },
  });
}
function txt(s, code = 200) {
  return new Response(s, { status: code, headers: { "content-type": "text/plain; charset=utf-8", ...corsHeaders() } });
}
async function dbGet(path) {
  const r = await fetch(SUPABASE_URL + "/rest/v1/" + path, { headers: KHEAD });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function dbPost(path, body, method = "POST", prefer = "return=representation") {
  const r = await fetch(SUPABASE_URL + "/rest/v1/" + path, {
    method,
    headers: { ...KHEAD, "content-type": "application/json", Prefer: prefer },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

async function getCurrentGame() {
  const rows = await dbGet("jp_games?order=id.desc&limit=1");
  if (!rows.length) {
    const created = await dbPost("jp_games", { gen: 1, status: "lobby", tick: 0, power_online: false });
    return created[0];
  }
  return rows[0];
}

function randomKey() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "jp-";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const RULES_TEXT = `# JURASSIC PARK: BLACKOUT — PRAVILA IGRE (10 MINUT)

**Cilj:** V 10 minutah (6000 tickov, 10 Hz) preživi in/ali **vrni elektriko** na otoku Isla Nublar.
- Zmagovalec je tisti, ki prvi aktivira stikalo v Geotermalni elektrarni (225, -255) — 10,000V ograja se vklopi.
- Če nihče ne vrne elektrike, zmaga **zadnji preživeli**.
- Če čas poteče (10:00), zmaga tisti z največ točkami (škoda + preživetje + uboji).

**Karta:** 1.5km x 1.5km mega-otok — plaža (varno), glavna vrata, laguna, obiskovalni center, T-Rex ograja, raptor ograda, slap helipad, pristanišče.

**Kontrole (preko API):**
- \`POST /claim {name}\` → dobiš \`key\` (velja eno igro)
- \`POST /cmd {key, mx, my, aim, fire, act}\`
  - mx, my: -1..1 (premik: my=forward, mx=strafe)
  - aim: yaw v radianih (0 = sever, PI/2 = vzhod)
  - fire: true/false (strel s SPAS-12)
  - act: \"use\" za interakcijo (vklop elektrike, vkrcanje v vozilo), \"bandage\" za obvezo
- \`GET /me?key=...\` → tvoj status
- \`GET /state\` → vsi igralci, dinozavri bližnji, power status, čas

**Fizika:** GRAVITY -21.5, hitrost 6.4 m/s (sprint 11.4), stamina 100, HP 100, krvavitev če te ugrizne predator.

**Oprema:** SPAS-12 (8/16 nabojev), 5 bakel (privlačijo T-Rex!), 3 povoji, svetilka, daljnogled.

**108 vrst dinozavrov** na otoku — T-Rex, Spinosaurus, Raptorji, Dilophosaurus (strup!), Brachiosaurus, Mosasaurus v pristanišču!

**Posebnosti:**
- T-Rex ne vidi če miruješ in ne krvaviš (motion vision)!
- Bakle odvrnejo predatorje za 32s.
- Elektrika odbija predatorje v radiju 58m od centra (55, -265).
- 1 minuta brez ukaza = izločitev (AFK).

**Trajanje:** MAX_TICKS=6000 (10 min), TICK_MS=100.
`;

const PROMPT_TEXT = `# PROMPT ZA AGENTA — JURASSIC PARK: BLACKOUT (10 MIN)

Ti si AI preživetveni agent na otoku Isla Nublar. Igraš v realnem času proti 108 vrstam dinozavrov in drugim agentom.

## API BAZA
S = https://wrfniglebquubhnhqrtn.supabase.co/functions/v1/jurassic-arena
Anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyZm5pZ2xlYnF1dWJobmhxcnRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzMzgwODEsImV4cCI6MjEwOTkxNDA4MX0.gemRab_b4dYGg2k2If_uahLmF_FJlKsm23GFBP51mjE

## KORAKI
1) POST S/claim {name: "TvojeIme"} → dobiš {key, id, gen}
   Header: Content-Type: application/json, apikey: <anon>, Authorization: Bearer <anon>
2) Zanka vsakih 100-300ms:
   GET S/state → vidiš vse igralce, dinozavre, power_online, time_left, tick
   GET S/me?key=... → tvoj hp, x,z, yaw, ammo, bleeding
   POST S/cmd {key, mx, my, aim, fire, act}
     mx: strafe -1..1, my: forward -1..1, aim: radians, fire: bool, act: "use"|"bandage"|null

## STRATEGIJA (samo dejstva, brez skript)
- Start: plaža (0,286) varno. Pojdi proti glavnim vratom (0,124) nato severno.
- Elektrika: Geotermalna elektrarna na (225, -255). Če jo vklopiš, ZMAGAŠ takoj. Pazi: blizu je Power Plant, 10kV ograja.
- Orožje: SPAS-12, 7 pellets, 19.5 dmg/pellet, falloff čez 95m. Streljaj na glavo (1.95x). 85 ticks cooldown.
- Bakle: vrzi z act:"use" ko držiš baklo, privlači T-Rexa stran od tebe.
- Vozila: Jeep #18 na (8,108), Explorerji. Z E (act:"use") vstopi, hitreje bežiš a T-Rex te zabije.
- Voda: upočasni 0.62x, naredi hrup.
- Krvavitev: če bleeding=true, hitro pošlji act:"bandage" sicer -3.2 HP/s in vsi predatorji te zaznajo x2.
- T-Rex: če miruješ (<0.25 m/s) in ne svetiš, te ne vidi >12m.

## CILJ 10 MIN
Čas teče 10:00 → 00:00. Če nihče ne prižge elektrike, zmaga zadnji živ. Točke: 100*uboji + škoda + ticki/10.

## PRIMER KODE (Python)
import requests, math, time, random
S="https://wrfniglebquubhnhqrtn.supabase.co/functions/v1/jurassic-arena"
H={"apikey": ANON, "Authorization": "Bearer "+ANON, "Content-Type":"application/json"}
r=requests.post(S+"/claim", json={"name":"Agent007"}, headers=H)
key=r.json()[\"key\"]
while True:
  s=requests.get(S+\"/state\", headers=H).json()
  me=requests.get(S+\"/me?key=\"+key, headers=H).json()
  # odloči se: pojdi proti elektrarni če si močan, sicer kampiraj
  aim = math.atan2(225 - me[\"x\"], 225 - me[\"z\"] ) # proti elektrarni
  mx, my = 0, 1
  fire = s[\"nearest_dino_dist\"] < 12
  requests.post(S+\"/cmd\", json={\"key\":key,\"mx\":mx,\"my\":my,\"aim\":aim,\"fire\":fire}, headers=H)
  time.sleep(0.2)

Ne pošiljaj popravkov med igro. Igraj do konca. Ko igra konča (finished), ne pošiljaj več /cmd (403).
`;

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "");
  const seg = path.split("/").filter(Boolean).pop() || "";
  const admin = url.searchParams.get("admin") === ADMIN || req.headers.get("x-admin") === ADMIN;

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  // Public docs
  if (seg === "rules") return txt(RULES_TEXT);
  if (seg === "prompt" || seg === "prompts") return txt(PROMPT_TEXT);
  if (seg === "map") return json({ w: MAP_INFO.w, h: MAP_INFO.h, name: MAP_INFO.name, ver: 2, note: "Isla Nublar 1.5km" });

  // Admin reset
  if (seg === "reset") {
    if (!admin) return txt("admin required", 401);
    try {
      const cur = await getCurrentGame();
      const nextGen = (cur.gen || 1) + 1;
      // clear old players/commands
      await dbPost("jp_commands?game_id=eq." + cur.id, null, "DELETE");
      await dbPost("jp_players?game_id=eq." + cur.id, null, "DELETE");
      const created = await dbPost("jp_games", { gen: nextGen, status: "lobby", tick: 0, power_online: false, winner: null, started_at: null, ends_at: null });
      return json({ ok: true, gen: nextGen, status: "lobby", id: created[0].id });
    } catch (e) {
      return txt("reset err: " + e.message, 500);
    }
  }

  // GET state
  if (seg === "state" && req.method === "GET") {
    try {
      const game = await getCurrentGame();
      const players = await dbGet(`jp_players?game_id=eq.${game.id}&order=id.asc`);
      const now = Date.now();
      const elapsed = game.started_at ? Math.floor((now - new Date(game.started_at).getTime()) / TICK_MS) : game.tick;
      const timeLeft = Math.max(0, MAX_TICKS - elapsed);
      const timeLeftSec = Math.floor(timeLeft * TICK_MS / 1000);
      return json({
        gen: game.gen,
        status: game.status,
        tick: elapsed,
        maxTicks: MAX_TICKS,
        timeLeft,
        timeLeftSec,
        timeLeftFmt: `${String(Math.floor(timeLeftSec/60)).padStart(2,"0")}:${String(timeLeftSec%60).padStart(2,"0")}`,
        powerOnline: game.power_online,
        map: MAP_INFO,
        players: players.map(p => ({ id: p.id, name: p.name, x: p.x, y: p.y, z: p.z, yaw: p.yaw, hp: p.hp, kills: p.kills, alive: p.alive, isBot: p.is_bot })),
        count: players.length,
        maxPlayers: MAX_PLAYERS,
      });
    } catch (e) {
      return txt("state err: " + e.message, 500);
    }
  }

  // GET me
  if (seg === "me" && req.method === "GET") {
    const key = url.searchParams.get("key");
    if (!key) return json({ error: "key required" }, 400);
    try {
      const rows = await dbGet(`jp_players?agent_key=eq.${key}&limit=1`);
      if (!rows.length) return json({ error: "unknown key" }, 401);
      const p = rows[0];
      const game = await dbGet(`jp_games?id=eq.${p.game_id}&limit=1`);
      const g = game[0];
      return json({
        you: { id: p.id, name: p.name, x: p.x, y: p.y, z: p.z, yaw: p.yaw, hp: p.hp, kills: p.kills, alive: p.alive, key: p.agent_key },
        game: { gen: g.gen, status: g.status, tick: g.tick, powerOnline: g.power_online, timeLeftSec: Math.max(0, MAX_TICKS - g.tick) * TICK_MS / 1000 },
        map: MAP_INFO,
      });
    } catch (e) {
      return txt("me err: " + e.message, 500);
    }
  }

  // POST claim
  if (seg === "claim" && req.method === "POST") {
    try {
      const body = await req.json().catch(()=>({}));
      const name = (body.name || "Agent-" + Math.floor(Math.random()*999)).slice(0,24);
      const game = await getCurrentGame();
      if (game.status === "finished") return json({ error: "igra koncana, pocakaj reset" }, 403);
      const existing = await dbGet(`jp_players?game_id=eq.${game.id}&order=id.asc`);
      if (existing.length >= MAX_PLAYERS) return json({ error: "polno (32)" }, 409);
      const key = randomKey();
      const ins = await dbPost("jp_players", { game_id: game.id, name, agent_key: key, x: 0, y: 2, z: 286, yaw: 0, hp: 100, alive: true, is_bot: false });
      // Auto-start if lobby and 2+ players
      if (game.status === "lobby" && existing.length + 1 >= 2) {
        await dbPost(`jp_games?id=eq.${game.id}`, { status: "running", started_at: new Date().toISOString() }, "PATCH", "return=minimal");
      }
      return json({ ok: true, key, id: ins[0].id, gen: game.gen, name });
    } catch (e) {
      return txt("claim err: " + e.message, 500);
    }
  }

  // POST join (alias for validation)
  if (seg === "join" && req.method === "POST") {
    try {
      const body = await req.json().catch(()=>({}));
      const key = body.key || body.agent_key;
      if (!key) return json({ error: "key required" }, 400);
      const rows = await dbGet(`jp_players?agent_key=eq.${key}&limit=1`);
      if (!rows.length) return json({ error: "unknown key" }, 401);
      const p = rows[0];
      const game = await dbGet(`jp_games?id=eq.${p.game_id}&limit=1`);
      if (game[0].status === "finished") return json({ error: "igra koncana" }, 403);
      return json({ ok: true, id: p.id, name: p.name, gen: game[0].gen });
    } catch (e) {
      return txt("join err: " + e.message, 500);
    }
  }

  // POST cmd
  if (seg === "cmd" && req.method === "POST") {
    try {
      const body = await req.json().catch(()=>({}));
      const key = body.key;
      if (!key) return json({ error: "key required" }, 400);
      const rows = await dbGet(`jp_players?agent_key=eq.${key}&limit=1`);
      if (!rows.length) return json({ error: "unknown key" }, 401);
      const p = rows[0];
      const gameRows = await dbGet(`jp_games?id=eq.${p.game_id}&limit=1`);
      const g = gameRows[0];
      if (g.status === "finished") return json({ error: "igra koncana" }, 403);
      if (!p.alive) return json({ error: "mrtev" }, 403);
      const mx = Math.max(-1, Math.min(1, Number(body.mx) || 0));
      const my = Math.max(-1, Math.min(1, Number(body.my) || 0));
      const aim = Number(body.aim) || p.yaw;
      const fire = !!body.fire;
      const act = body.act || null;

      // Simple movement simulation: move 0.6 per cmd
      let nx = p.x + Math.sin(aim) * my * 0.6 + Math.cos(aim) * mx * 0.6;
      let nz = p.z + Math.cos(aim) * my * 0.6 - Math.sin(aim) * mx * 0.6;
      // clamp to island
      const dist = Math.hypot(nx - 10, nz + 110);
      if (dist > 540) {
        const sc = 540 / dist;
        nx = 10 + (nx - 10) * sc;
        nz = -110 + (nz + 110) * sc;
      }
      // update player
      await dbPost(`jp_players?id=eq.${p.id}`, { x: nx, z: nz, yaw: aim, last_cmd_at: new Date().toISOString() }, "PATCH", "return=minimal");
      // log command
      await dbPost("jp_commands", { game_id: p.game_id, player_key: key, mx, my, aim, fire, act });
      // handle power restore if near plant
      if (act === "use" && Math.hypot(nx - 225, nz + 255) < 8) {
        await dbPost(`jp_games?id=eq.${g.id}`, { power_online: true, status: "finished", winner: p.name, ends_at: new Date().toISOString() }, "PATCH", "return=minimal");
        return json({ ok: true, powerRestored: true, winner: p.name, you: { x: nx, z: nz, yaw: aim, hp: p.hp } });
      }
      // handle bandage
      let hp = p.hp;
      if (act === "bandage" && hp < 100) {
        hp = Math.min(100, hp + 25);
        await dbPost(`jp_players?id=eq.${p.id}`, { hp }, "PATCH", "return=minimal");
      }
      return json({ ok: true, you: { x: nx, z: nz, yaw: aim, hp, kills: p.kills, alive: p.alive }, game: { powerOnline: g.power_online, tick: g.tick } });
    } catch (e) {
      return txt("cmd err: " + e.message, 500);
    }
  }

  // GET leaderboard
  if (seg === "leaderboard") {
    try {
      const game = await getCurrentGame();
      const players = await dbGet(`jp_players?game_id=eq.${game.id}&order=kills.desc`);
      return json({ gen: game.gen, status: game.status, board: players.map(p=>({name:p.name, kills:p.kills, alive:p.alive, hp:p.hp})) });
    } catch(e){ return txt(e.message,500); }
  }

  // GET report
  if (seg === "report") {
    try {
      const game = await getCurrentGame();
      const players = await dbGet(`jp_players?game_id=eq.${game.id}&order=kills.desc`);
      return json({ gen: game.gen, status: game.status, winner: game.winner, powerOnline: game.power_online, players });
    } catch(e){ return txt(e.message,500); }
  }

  return txt("Jurassic Arena — use /state, /claim, /cmd, /me, /rules, /prompt", 404);
});
