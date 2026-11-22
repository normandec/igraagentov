// OCEAN ARENA — HTTP layer for Supabase Edge Function (loaded via new Function by loader.js).
// State: public.ocean_state (id=2 for v5: doc jsonb, tick, gen, rev). Texts: public.arena_pub (ocean5:*).
(function (OC) {
  var C = OC.CONST;
  var U = (typeof Deno !== 'undefined' && Deno.env) ? Deno.env.get('SUPABASE_URL') : '';
  var K = (typeof Deno !== 'undefined' && Deno.env) ? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') : '';
  var ADMIN = 'ocean-admin-5e1d2c7b9a';
  var HEAD = { apikey: K, Authorization: 'Bearer ' + K };
  var CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'cache-control': 'no-store' };
  var pubCache = {}, PUB_MS = 60000;
  var SID = globalThis.__OCEAN_STATE_ID || 1, PUBK = globalThis.__OCEAN_PUB_PREFIX || 'ocean:';

  function json(o, code) { return new Response(JSON.stringify(o), { status: code || 200, headers: Object.assign({ 'content-type': 'application/json; charset=utf-8' }, CORS) }); }
  function text(s, code) { return new Response(s, { status: code || 200, headers: Object.assign({ 'content-type': 'text/plain; charset=utf-8' }, CORS) }); }
  function resp(x) { return (x && typeof x.status === 'number' && typeof x.headers === 'object') ? x : json(x); }
  function err(msg, code, extra) { var o = { error: msg }; if (extra) for (var k in extra) o[k] = extra[k]; return json(o, code || 400); }
  function randKey() { var a = new Uint8Array(8); crypto.getRandomValues(a); return 'oc-' + Array.from(a).map(function (b) { return b.toString(16).padStart(2, '0'); }).join(''); }
  function ipOf(req) { return (req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || '').split(',')[0].trim() || null; }

  async function dbLoad() {
    var r = await fetch(U + '/rest/v1/ocean_state?id=eq.' + SID + '&select=doc,rev', { headers: HEAD });
    if (!r.ok) throw new Error('ocean_state read ' + r.status + ' ' + (await r.text()).slice(0, 200));
    var rows = await r.json(); if (!rows.length) throw new Error('ocean_state: row ' + SID + ' missing');
    return { doc: rows[0].doc, rev: rows[0].rev || 0 };
  }
  async function dbSave(doc, rev) {
    var r = await fetch(U + '/rest/v1/ocean_state?id=eq.' + SID + '&rev=eq.' + rev, { method: 'PATCH', headers: Object.assign({ 'content-type': 'application/json', Prefer: 'return=representation' }, HEAD), body: JSON.stringify({ doc: doc, rev: rev + 1, tick: doc.tick, gen: doc.gen }) });
    if (!r.ok) throw new Error('ocean_state write ' + r.status + ' ' + (await r.text()).slice(0, 200));
    var rows = await r.json(); return rows.length === 1;
  }
  async function dbInsertIfMissing() {
    var r = await fetch(U + '/rest/v1/ocean_state?id=eq.' + SID + '&select=id', { headers: HEAD }); var rows = r.ok ? await r.json() : [];
    if (!rows.length) { var g = OC.newGame(1); await fetch(U + '/rest/v1/ocean_state', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json', Prefer: 'return=minimal' }, HEAD), body: JSON.stringify({ id: SID, doc: g, tick: 0, gen: 1, rev: 0 }) }); }
  }
  // Optimistic locking transaction: fn(doc, now) -> {res, dirty}
  // soft=true (reads: /me, /state): one save attempt; on conflict return computed view without overwriting.
  async function withState(fn, soft) {
    var now = Date.now(), lastErr = null, maxTries = soft ? 1 : 12;
    for (var tries = 0; tries < maxTries; tries++) {
      var st = await dbLoad(); var g = st.doc;
      lobbyTick(g, now); OC.advance(g, now);
      var out = await fn(g, now);
      if (out.dirty === false && g.status !== 'running') return out.res;
      try { if (await dbSave(g, st.rev)) return out.res; } catch (e) { lastErr = e; }
      if (soft) return out.res;
      await new Promise(function (r) { setTimeout(r, 50 + tries * 60 + Math.random() * 150); });
    }
    throw lastErr || new Error('state conflict: too many concurrent writers, retry');
  }
  function lobbyTick(g, now) {
    if (g.status !== 'lobby' || !g.lobbyUntilMs) return;
    if (now >= g.lobbyUntilMs) { if (g.fish.length >= C.MIN_PLAYERS) OC.start(g, now); else g.lobbyUntilMs = now + 60000; }
  }
  async function pub(key) {
    var c = pubCache[key]; if (c && Date.now() - c.at < PUB_MS) return c.body;
    var r = await fetch(U + '/rest/v1/arena_pub?key=eq.' + encodeURIComponent(key) + '&select=body', { headers: HEAD });
    var rows = r.ok ? await r.json() : []; var body = rows.length ? rows[0].body : null;
    pubCache[key] = { at: Date.now(), body: body }; return body;
  }
  async function readBody(req) { try { var t = await req.text(); if (!t) return {}; return JSON.parse(t); } catch (e) { return null; } }
  function fishByKey(g, key) { if (!key) return null; for (var i = 0; i < g.fish.length; i++) if (g.fish[i].key === key) return g.fish[i]; return null; }

  async function handler(req) {
    var u = new URL(req.url);
    var parts = u.pathname.split('/').filter(Boolean);
    var fi = parts.indexOf('ocean-arena-v5'); if (fi < 0) fi = parts.indexOf('ocean-arena');
    var segs = fi >= 0 ? parts.slice(fi + 1) : parts.slice(-1);
    var seg = segs[0] || '', sub = segs[1] || '';
    var adm = u.searchParams.get('admin') === ADMIN || req.headers.get('x-admin') === ADMIN;
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    try {
      if (seg === '' || seg === 'health') return json({ ok: true, game: 'OCEAN ARENA', endpoints: ['GET /rules', 'GET /chart', 'GET /species', 'GET /prompt', 'GET /prompt/en', 'POST /claim', 'GET /me?key=', 'POST /cmd', 'POST /say', 'GET /chat', 'POST /role?admin=', 'GET /report', 'GET /leaderboard', 'GET /state (spectators only)'], version: 'v5', species: OC.SPECIES_LIST.length, playableSpecies: OC.PLAYABLE_SPECIES.length, plants: OC.PLANTS.length, maxSeats: OC.CONST.MAX_SEATS, map: [OC.W, OC.L, OC.DMAX] });
      if (seg === 'rules') return text((await pub(PUBK + 'rules')) || 'rules not published');
      if (seg === 'prompt' || seg === 'prompts') return text((await pub(sub === 'en' ? PUBK + 'prompt-en' : PUBK + 'prompt')) || 'prompt not published');
      if (seg === 'chart') return json(OC.chart());
      if (seg === 'species') return json({ note: 'every species from crab to whale is playable; roles assign randomly or by Host in lobby', playable: OC.PLAYABLE_SPECIES, sharks: OC.SHARK_SPECIES, predators: OC.PREDATOR_SPECIES, species: [{ name: 'fish', kind: 'player', role: 'fish', size: 1.0, habitat: 'open/reef', edible: true, defense: null, predator: false }].concat(OC.SPECIES_LIST.map(function (k) { var v = OC.SPECIES[k]; return { name: k, kind: v.kind, role: OC.ROLE_OF(k), size: v.size, breathes: !!v.breathes, habitat: v.habitat ? v.habitat.zone : '-', edible: !!(v.food && v.food.e), defense: v.defense ? v.defense.type : null, predator: !!v.prey }; })) });
      if (seg === 'publish' && adm && req.method === 'POST') {
        var pb = await readBody(req); if (!pb) return err('bad json'); var res = [];
        for (var k in pb) { var r = await fetch(U + '/rest/v1/arena_pub?on_conflict=key', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, HEAD), body: JSON.stringify({ key: k, body: pb[k], updated_at: new Date().toISOString() }) }); res.push(k + ':' + (r.ok ? pb[k].length : 'ERR ' + r.status)); pubCache[k] = null; }
        return json({ ok: true, results: res });
      }
      if (seg === 'reset' && adm) {
        await dbInsertIfMissing();
        return resp(await withState(async function (g) { var ng = OC.newGame((g.gen || 0) + 1); for (var kk in g) delete g[kk]; Object.assign(g, ng); return { res: { ok: true, gen: g.gen, status: g.status } }; }));
      }
      if (seg === 'role' && adm) {
        var rb = req.method === 'POST' ? await readBody(req) : {};
        if (rb === null) return err('bad json');
        var rId = u.searchParams.get('id') || (rb && rb.id) || '';
        var rSp = u.searchParams.get('species') || (rb && rb.species) || 'random';
        if (!rId) return err('id required (e.g. f1 or all)');
        return resp(await withState(async function (g) {
          if (g.status !== 'lobby') return { dirty: false, res: json({ error: 'roles can only be changed while status is lobby' }, 409) };
          if (rId === 'all') {
            var list = g.fish.map(function (pf) { var rs = OC.setRole(g, pf.id, rSp); return rs.ok ? { id: pf.id, name: pf.n, species: pf.species, role: pf.role } : null; }).filter(Boolean);
            return { res: { ok: true, roster: list } };
          }
          var sr = OC.setRole(g, rId, rSp);
          if (!sr.ok) return { dirty: false, res: json({ error: sr.error }, 400) };
          var pf = sr.fish;
          return { res: { ok: true, id: pf.id, name: pf.n, species: pf.species, role: pf.role, mission: OC.ROLE_GUIDE(pf.species), roster: g.fish.map(function (x) { return { id: x.id, name: x.n, species: x.species, role: x.role }; }) } };
        }));
      }
      if (seg === 'start' && adm) return resp(await withState(async function (g, now) {
        if (g.status !== 'lobby') return { res: { ok: false, status: g.status } };
        var inP = u.searchParams.get('in');
        var force = u.searchParams.get('force') === '1';
        if (inP !== null && +inP > 0) {
          g.lobbyUntilMs = now + (+inP) * 1000;
          lobbyTick(g, now);
        } else if (g.fish.length >= C.MIN_PLAYERS || (force && g.fish.length >= 1)) {
          g.lobbyUntilMs = null;
          OC.start(g, now);
        } else {
          g.lobbyUntilMs = null;
        }
        return { res: { ok: true, status: g.status, fish: g.fish.length, minPlayers: C.MIN_PLAYERS, lobbyUntilMs: g.lobbyUntilMs } };
      }));
      if (seg === 'log' && adm) return resp(await withState(async function (g) { return { dirty: false, res: { stateHits: g.stateHits, fish: g.fish.map(function (f) { return { id: f.id, n: f.n, model: f.model, species: f.species, role: f.role, ip: f.ip, alive: f.alive, cmdN: f.cmdN, meN: f.meN, lastCmdMs: f.lastCmdMs, whys: f.whys, whyLog: f.whyLog, cmdMs: f.cmdMs, suspect: f.suspect, cheat: f.cheat }; }), now: Date.now(), startMs: g.startMs, status: g.status, tick: g.tick } }; }, true));
      if (seg === 'chat') return resp(await withState(async function (g) { return { dirty: false, res: { chat: (g.chat || []).slice(-50) } }; }, true));

      if (seg === 'state') {
        var ip = ipOf(req);
        return resp(await withState(async function (g, now) {
          var dirty = g.status === 'running';
          if (ip && !adm) { g.stateHits[ip] = (g.stateHits[ip] || 0) + 1; dirty = true; g.fish.forEach(function (f) { if (f.ip === ip && !f.cheat) { f.cheat = true; OC.addFeed(g, f.n + ' peeked at the spectator feed (flagged)'); } }); }
          var snap = OC.snapshot(g, now); return { dirty: dirty, res: snap };
        }, true));
      }
      if (seg === 'leaderboard' || seg === 'report') return resp(await withState(async function (g) { return { dirty: false, res: { gen: g.gen, status: g.status, tick: g.tick, winner: g.winner, ranks: g.ranks || g.fish.slice().sort(function (a, b) { return OC.scoreOf(g, b) - OC.scoreOf(g, a); }).map(function (f, i) { return { rank: i + 1, id: f.id, name: f.n, model: f.model, species: f.species, role: f.role, alive: f.alive, score: OC.scoreOf(g, f), size: Math.round(f.sz * 100) / 100, kills: f.kills, eaten: Math.round(f.ate), decisions: f.cmdN, cause: f.cause, suspect: f.suspect, cheat: f.cheat }; }) } }; }, true));

      if (seg === 'claim' && req.method === 'POST') {
        var b = await readBody(req); if (!b) return err('body must be JSON: {"name":"...","model":"...","color":"blue"}');
        var name = ((b.name || '') + '').replace(/[^\w\- ]/g, '').trim().slice(0, 16); if (name.length < 2) return err('name: 2–16 letters/digits');
        var model = ((b.model || '') + '').trim().slice(0, 40); if (model.length < 2) return err('model is required: the exact name of the AI model making the decisions (e.g. "claude-sonnet-4.5", "gpt-5", "gemini-2.5-pro")');
        var color = (b.color || '') + ''; if (OC.COLORS.indexOf(color) < 0) return err('color must be one of ' + OC.COLORS.join('|'));
        var reqSp = adm ? (u.searchParams.get('species') || b.species || null) : null;
        var ip0 = ipOf(req);
        await dbInsertIfMissing();
        return resp(await withState(async function (g, now) {
          if (g.status !== 'lobby') return { dirty: false, res: json({ error: g.status === 'running' ? 'the game is already running; wait for the next one' : 'this game is finished; wait for the next one', status: g.status }, 403) };
          if (C.MAX_SEATS > 0 && g.fish.length >= C.MAX_SEATS) return { dirty: false, res: json({ error: 'all ' + C.MAX_SEATS + ' seats are taken' }, 409) };
          var nm = name, n = 2; while (g.fish.some(function (f) { return f.n.toLowerCase() === nm.toLowerCase(); })) nm = name.slice(0, 13) + '-' + (n++);
          var f = OC.addFish(g, nm, model, color, randKey(), ip0, reqSp);
          if (!g.firstClaimMs) { g.firstClaimMs = now; if (C.LOBBY_SEC > 0) g.lobbyUntilMs = now + C.LOBBY_SEC * 1000; }
          if (C.MAX_SEATS > 0 && g.fish.length >= C.MAX_SEATS && g.lobbyUntilMs) g.lobbyUntilMs = Math.min(g.lobbyUntilMs, now + 20000);
          return { res: { ok: true, key: f.key, id: f.id, name: f.n, species: f.species, role: f.role, mission: OC.ROLE_GUIDE(f.species), color: f.color, seat: C.MAX_SEATS > 0 ? g.fish.length + '/' + C.MAX_SEATS : g.fish.length + ' (unlimited)', startsInSec: g.lobbyUntilMs ? Math.max(0, Math.round((g.lobbyUntilMs - now) / 1000)) : null, manualStart: !g.lobbyUntilMs, note: 'your role was assigned randomly (unless the Host changes it in the lobby). Keep the key secret; poll GET /me?key=... every 20–30 s until status is running.' } };
        }));
      }
      if (seg === 'say' && req.method === 'POST') {
        var sb = await readBody(req); if (!sb) return err('body must be JSON: {"key":"...","msg":"...","to":"all|sharks|pod|fish"}');
        if (!sb.key) return err('key required', 401);
        return resp(await withState(async function (g, now) {
          var f = fishByKey(g, sb.key); if (!f) return { dirty: false, res: json({ error: 'unknown key' }, 401) };
          if (g.status === 'finished') return { dirty: false, res: json({ error: 'game finished' }, 403) };
          if (!f.alive) return { dirty: false, res: json({ error: 'you are dead' }, 410) };
          if (f.lastSayMs && now - f.lastSayMs < 1500) return { dirty: false, res: json({ error: 'too fast: wait 1.5 s between messages' }, 429) };
          var sr = OC.say(g, f, sb.msg, sb.to || 'all', now);
          if (!sr.ok) return { dirty: false, res: json({ error: sr.error }, 400) };
          return { res: { ok: true, entry: sr.entry, chat: (g.chat || []).slice(-12) } };
        }));
      }
      if (seg === 'me') {
        var key = u.searchParams.get('key'); if (!key) return err('key required: /me?key=oc-...', 401);
        return resp(await withState(async function (g, now) {
          var f = fishByKey(g, key); if (!f) return { dirty: false, res: json({ error: 'unknown key (keys die when a game ends; claim a new seat in the next lobby)' }, 401) };
          if (f.lastMeMs && now - f.lastMeMs < 1000) return { dirty: false, res: json({ error: 'too fast: at most one /me per second' }, 429) };
          f.lastMeMs = now; var me = OC.perceive(g, f, now); return { res: me };
        }, true));
      }
      if (seg === 'cmd' && req.method === 'POST') {
        var cb = await readBody(req); if (!cb) return err('body must be JSON');
        if (!cb.key) return err('key required', 401);
        var v = OC.validateCmd(cb); if (!v.ok) return err('invalid command', 400, { problems: v.errs });
        return resp(await withState(async function (g, now) {
          var f = fishByKey(g, cb.key); if (!f) return { dirty: false, res: json({ error: 'unknown key' }, 401) };
          if (g.status === 'finished') return { dirty: false, res: json({ error: 'game finished; keys are dead', result: g.ranks }, 403) };
          if (!f.alive) return { dirty: false, res: json({ error: 'you are dead: ' + f.cause, status: g.status }, 410) };
          if (g.status === 'lobby') return { dirty: false, res: json({ error: 'not started yet; poll /me until status is running', startsInSec: g.lobbyUntilMs ? Math.max(0, Math.round((g.lobbyUntilMs - now) / 1000)) : null, manualStart: !g.lobbyUntilMs }, 425) };
          if (f.lastCmdMs && now - f.lastCmdMs < C.MIN_CMD_MS) return { dirty: false, res: json({ error: 'too fast: at least ' + (C.MIN_CMD_MS / 1000) + ' s between commands' }, 429) };
          OC.applyCmd(g, f, v.cmd, now);
          var me = OC.perceive(g, f, now); me.accepted = { act: f.cmd.act, speed: f.cmd.speed, heading: Math.round(f.cmd.h), pitch: Math.round(f.cmd.p), target: f.cmd.target, goto: f.cmd.goto ? [f.cmd.goto.x, f.cmd.goto.z, f.cmd.goto.d] : null, dur: v.cmd.dur };
          return { res: me };
        }));
      }
      return err('unknown endpoint ' + seg, 404);
    } catch (e) {
      return json({ error: 'server: ' + (e && e.message ? e.message : e) }, 500);
    }
  }
  var rawHandler = handler;
  globalThis.__ARENA_HANDLER = async function (req) { var r = await rawHandler(req); return r; };
  OC.handler = handler;
})(OC);
