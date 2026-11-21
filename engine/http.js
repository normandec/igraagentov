// OCEAN ARENA v6 — HTTP plast za Supabase Edge Function (naloži jo loader prek new Function).
// Stanje: public.ocean_state (id=1: doc jsonb, tick, gen, rev). Besedila: public.arena_pub (ocean:*). Zgodovina: public.ocean_games.
(function (OC) {
  var C = OC.CONST;
  var U = (typeof Deno !== 'undefined' && Deno.env) ? Deno.env.get('SUPABASE_URL') : '';
  var K = (typeof Deno !== 'undefined' && Deno.env) ? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') : '';
  var ADMIN = 'ocean-admin-5e1d2c7b9a';
  var HEAD = { apikey: K, Authorization: 'Bearer ' + K };
  var CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'cache-control': 'no-store' };
  var pubCache = {}, PUB_MS = 60000;

  function json(o, code) { return new Response(JSON.stringify(o), { status: code || 200, headers: Object.assign({ 'content-type': 'application/json; charset=utf-8' }, CORS) }); }
  function text(s, code) { return new Response(s, { status: code || 200, headers: Object.assign({ 'content-type': 'text/plain; charset=utf-8' }, CORS) }); }
  function resp(x) { return (x && typeof x.status === 'number' && typeof x.headers === 'object') ? x : json(x); }
  function err(msg, code, extra) { var o = { error: msg }; if (extra) for (var k in extra) o[k] = extra[k]; return json(o, code || 400); }
  function randKey() { var a = new Uint8Array(8); crypto.getRandomValues(a); return 'oc-' + Array.from(a).map(function (b) { return b.toString(16).padStart(2, '0'); }).join(''); }
  function ipOf(req) { return (req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || '').split(',')[0].trim() || null; }

  async function dbLoad() {
    var r = await fetch(U + '/rest/v1/ocean_state?id=eq.1&select=doc,rev', { headers: HEAD });
    if (!r.ok) throw new Error('ocean_state read ' + r.status + ' ' + (await r.text()).slice(0, 200));
    var rows = await r.json(); if (!rows.length) throw new Error('ocean_state: row 1 missing');
    return { doc: rows[0].doc, rev: rows[0].rev || 0 };
  }
  async function dbSave(doc, rev) {
    var r = await fetch(U + '/rest/v1/ocean_state?id=eq.1&rev=eq.' + rev, { method: 'PATCH', headers: Object.assign({ 'content-type': 'application/json', Prefer: 'return=representation' }, HEAD), body: JSON.stringify({ doc: doc, rev: rev + 1, tick: doc.tick, gen: doc.gen }) });
    if (!r.ok) throw new Error('ocean_state write ' + r.status + ' ' + (await r.text()).slice(0, 200));
    var rows = await r.json(); return rows.length === 1;
  }
  async function dbInsertIfMissing() {
    var r = await fetch(U + '/rest/v1/ocean_state?id=eq.1&select=id', { headers: HEAD }); var rows = r.ok ? await r.json() : [];
    if (!rows.length) { var g = OC.newGame(1); await fetch(U + '/rest/v1/ocean_state', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json', Prefer: 'return=minimal' }, HEAD), body: JSON.stringify({ id: 1, doc: g, tick: 0, gen: 1, rev: 0 }) }); }
  }
  async function saveGameHistory(g) {
    if (!U || !K || g.savedHistory || g.status !== 'finished') return;
    g.savedHistory = true;
    try {
      var alive = g.fish.filter(function (f) { return f.alive; }).length;
      var payload = {
        gen: g.gen,
        winner: g.winner,
        reason: alive === 1 ? 'last fish alive' : (alive > 1 ? 'highest score at time limit' : 'all perished'),
        ticks: g.tick,
        duration_sec: Math.round(g.tick * (C.TICK_MS / 1000)),
        ranks: g.ranks || OC.rankList(g),
        finished_at: new Date().toISOString()
      };
      await fetch(U + '/rest/v1/ocean_games?on_conflict=gen', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, HEAD), body: JSON.stringify(payload) });
    } catch (e) { /* zgodovina ne sme ustaviti igre */ }
  }
  async function withState(fn) {
    var now = Date.now(), lastErr = null;
    for (var tries = 0; tries < 7; tries++) {
      var st = await dbLoad(); var g = st.doc;
      var lobChanged = lobbyTick(g, now);
      var adv = OC.advance(g, now);
      var out = await fn(g, now);
      var needSave = (adv > 0) || lobChanged || (out.dirty !== false);
      if (g.status === 'finished' && !g.savedHistory) { await saveGameHistory(g); needSave = true; }
      if (!needSave) return out.res;
      try { if (await dbSave(g, st.rev)) return out.res; } catch (e) { lastErr = e; }
      await new Promise(function (r) { setTimeout(r, 40 + Math.random() * 120); });
    }
    throw lastErr || new Error('state conflict: too many concurrent writers, retry');
  }
  function lobbyTick(g, now) {
    if (g.status !== 'lobby' || g.manualStart || !g.lobbyUntilMs) return false;
    if (now >= g.lobbyUntilMs) {
      if (g.fish.length >= C.MIN_PLAYERS) { OC.start(g, now); return true; }
      g.lobbyUntilMs = now + 60000; return true;
    }
    return false;
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
    var parts = u.pathname.split('/').filter(Boolean); var fi = parts.indexOf('ocean-arena'); var segs = fi >= 0 ? parts.slice(fi + 1) : parts.slice(-1);
    var seg = segs[0] || '', sub = segs[1] || '';
    var adm = u.searchParams.get('admin') === ADMIN || req.headers.get('x-admin') === ADMIN;
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    try {
      if (seg === '' || seg === 'health') return json({ ok: true, game: 'OCEAN ARENA', endpoints: ['GET /rules', 'GET /chart', 'GET /prompt', 'GET /prompt/en', 'POST /claim', 'GET /me?key=', 'POST /cmd', 'GET /report', 'GET /leaderboard', 'GET /history', 'GET /state (spectators only)'], version: 'v6' });
      if (seg === 'rules') return text((await pub('ocean:rules')) || 'rules not published');
      if (seg === 'prompt' || seg === 'prompts') return text((await pub(sub === 'en' ? 'ocean:prompt-en' : 'ocean:prompt')) || 'prompt not published');
      if (seg === 'chart') return json(OC.chart());
      if (seg === 'publish' && adm && req.method === 'POST') {
        var pb = await readBody(req); if (!pb) return err('bad json'); var res = [];
        for (var k in pb) { var r = await fetch(U + '/rest/v1/arena_pub?on_conflict=key', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, HEAD), body: JSON.stringify({ key: k, body: pb[k], updated_at: new Date().toISOString() }) }); res.push(k + ':' + (r.ok ? pb[k].length : 'ERR ' + r.status)); pubCache[k] = null; }
        return json({ ok: true, results: res });
      }
      if (seg === 'reset' && adm) {
        var manual = u.searchParams.get('manual') === '1';
        await dbInsertIfMissing();
        return resp(await withState(async function (g) {
          var ng = OC.newGame((g.gen || 0) + 1);
          ng.manualStart = manual;
          for (var kk in g) delete g[kk]; Object.assign(g, ng);
          return { dirty: true, res: { ok: true, gen: g.gen, status: g.status, manualStart: !!g.manualStart } };
        }));
      }
      if (seg === 'start' && adm) {
        return resp(await withState(async function (g, now) {
          if (g.status !== 'lobby') return { dirty: false, res: { ok: false, status: g.status, error: 'igra ni v čakalnici' } };
          if (u.searchParams.get('manual') === '1') {
            g.manualStart = true; g.lobbyUntilMs = 0;
            return { dirty: true, res: { ok: true, status: g.status, manualStart: true, fish: g.fish.length } };
          }
          var sec = +(u.searchParams.get('in') || 0);
          var force = u.searchParams.get('force') === '1';
          if (sec <= 0 && g.fish.length < C.MIN_PLAYERS && !force) {
            return { dirty: false, res: { ok: false, status: g.status, fish: g.fish.length, error: 'za začetek sta potrebni vsaj ' + C.MIN_PLAYERS + ' ribi (trenutno ' + g.fish.length + ')' } };
          }
          g.manualStart = false;
          g.lobbyUntilMs = now + sec * 1000;
          if (sec <= 0 && (g.fish.length >= C.MIN_PLAYERS || force)) OC.start(g, now);
          else lobbyTick(g, now);
          return { dirty: true, res: { ok: true, status: g.status, fish: g.fish.length, manualStart: false, lobbyUntilMs: g.lobbyUntilMs } };
        }));
      }
      if (seg === 'kick' && adm) {
        var who = (u.searchParams.get('id') || '').trim();
        if (!who) return err('id required');
        return resp(await withState(async function (g) {
          var idx = g.fish.findIndex(function (f) { return f.id === who || f.n === who; });
          if (idx < 0) return { dirty: false, res: err('fish not found', 404) };
          var f = g.fish[idx];
          if (g.status === 'lobby') { g.fish.splice(idx, 1); OC.addFeed(g, f.n + ' was removed from lobby'); }
          else if (f.alive) { f.alive = false; f.hp = 0; f.died = g.tick; f.cause = 'removed by host'; OC.addFeed(g, f.n + ' was removed by host'); }
          return { dirty: true, res: { ok: true, removed: f.id, name: f.n } };
        }));
      }
      if (seg === 'log' && adm) return resp(await withState(async function (g) { return { dirty: false, res: { stateHits: g.stateHits, fish: g.fish.map(function (f) { return { id: f.id, n: f.n, model: f.model, ip: f.ip, cmdN: f.cmdN, meN: f.meN, explored: Object.keys(f.zoneSeen || {}).length, whys: f.whys, cmdMs: f.cmdMs, suspect: f.suspect, cheat: f.cheat }; }) } }; }));
      if (seg === 'history') {
        try {
          var hr = await fetch(U + '/rest/v1/ocean_games?order=gen.desc&limit=20', { headers: HEAD });
          var hrows = hr.ok ? await hr.json() : [];
          return json({ ok: true, games: hrows });
        } catch (e) { return json({ ok: true, games: [] }); }
      }

      if (seg === 'state') {
        var ip = ipOf(req);
        return resp(await withState(async function (g, now) {
          var dirty = false;
          if (ip && !adm) {
            g.stateHits[ip] = (g.stateHits[ip] || 0) + 1;
            dirty = true;
            g.fish.forEach(function (f) { if (f.ip === ip && !f.cheat) { f.cheat = true; OC.addFeed(g, f.n + ' peeked at the spectator feed (flagged)'); } });
          }
          var snap = OC.snapshot(g, now);
          return { dirty: dirty, res: snap };
        }));
      }
      if (seg === 'leaderboard' || seg === 'report') return resp(await withState(async function (g) { return { dirty: false, res: { gen: g.gen, status: g.status, tick: g.tick, winner: g.winner, ranks: g.ranks || OC.rankList(g) } }; }));

      if (seg === 'claim' && req.method === 'POST') {
        var b = await readBody(req); if (!b) return err('body must be JSON: {"name":"...","model":"...","color":"blue"}');
        var name = ((b.name || '') + '').replace(/[^\w\- ]/g, '').trim().slice(0, 16); if (name.length < 2) return err('name: 2–16 letters/digits');
        var model = ((b.model || '') + '').trim().slice(0, 48);
        if (model.length < 2 || /[<>\[\]]|vpi[sš]i|exact.*model|your.*model|ime modela/i.test(model)) {
          return err('model is required: send the exact AI model name making the decisions (e.g. "claude-sonnet-4.5", "gpt-5", "gemini-2.5-pro")');
        }
        var color = (b.color || '') + ''; if (OC.COLORS.indexOf(color) < 0) return err('color must be one of ' + OC.COLORS.join('|'));
        var ip0 = ipOf(req);
        await dbInsertIfMissing();
        return resp(await withState(async function (g, now) {
          if (g.status !== 'lobby') return { dirty: false, res: json({ error: g.status === 'running' ? 'the game is already running; wait for the next one' : 'this game is finished; wait for the next one', status: g.status }, 403) };
          if (g.fish.length >= C.MAX_SEATS) return { dirty: false, res: json({ error: 'all ' + C.MAX_SEATS + ' seats are taken' }, 409) };
          var nm = name, n = 2; while (g.fish.some(function (f) { return f.n.toLowerCase() === nm.toLowerCase(); })) nm = name.slice(0, 13) + '-' + (n++);
          var f = OC.addFish(g, nm, model, color, randKey(), ip0);
          if (!g.firstClaimMs) g.firstClaimMs = now;
          if (!g.manualStart) {
            if (!g.lobbyUntilMs) g.lobbyUntilMs = now + C.LOBBY_SEC * 1000;
            if (g.fish.length >= C.MAX_SEATS) g.lobbyUntilMs = Math.min(g.lobbyUntilMs, now + 20000);
          }
          return { dirty: true, res: { ok: true, key: f.key, id: f.id, name: f.n, color: f.color, seat: g.fish.length + '/' + C.MAX_SEATS, manualHold: !!g.manualStart, startsInSec: g.lobbyUntilMs ? Math.round((g.lobbyUntilMs - now) / 1000) : null, note: 'keep the key secret; it dies when this game ends. Poll GET /me?key=... every 20–30 s until status is running.' } };
        }));
      }
      if (seg === 'me') {
        var key = u.searchParams.get('key'); if (!key) return err('key required: /me?key=oc-...', 401);
        return resp(await withState(async function (g, now) {
          var f = fishByKey(g, key); if (!f) return { dirty: false, res: json({ error: 'unknown key (keys die when a game ends; claim a new seat in the next lobby)' }, 401) };
          if (f.lastMeMs && now - f.lastMeMs < 1000) return { dirty: false, res: json({ error: 'too fast: at most one /me per second' }, 429) };
          f.lastMeMs = now; var me = OC.perceive(g, f, now); return { dirty: true, res: me };
        }));
      }
      if (seg === 'cmd' && req.method === 'POST') {
        var cb = await readBody(req); if (!cb) return err('body must be JSON');
        if (!cb.key) return err('key required', 401);
        var v = OC.validateCmd(cb); if (!v.ok) return err('invalid command', 400, { problems: v.errs });
        return resp(await withState(async function (g, now) {
          var f = fishByKey(g, cb.key); if (!f) return { dirty: false, res: json({ error: 'unknown key' }, 401) };
          if (g.status === 'finished') return { dirty: false, res: json({ error: 'game finished; keys are dead', result: g.ranks }, 403) };
          if (!f.alive) return { dirty: false, res: json({ error: 'you are dead: ' + f.cause, status: g.status }, 410) };
          if (g.status === 'lobby') return { dirty: false, res: json({ error: 'not started yet; poll /me until status is running', manualHold: !!g.manualStart, startsInSec: g.lobbyUntilMs ? Math.max(0, Math.round((g.lobbyUntilMs - now) / 1000)) : null }, 425) };
          if (f.lastCmdMs && now - f.lastCmdMs < C.MIN_CMD_MS) return { dirty: false, res: json({ error: 'too fast: at least ' + (C.MIN_CMD_MS / 1000) + ' s between commands' }, 429) };
          OC.applyCmd(g, f, v.cmd, now);
          var me = OC.perceive(g, f, now); me.accepted = { act: f.cmd.act, speed: f.cmd.speed, heading: Math.round(f.cmd.h), pitch: Math.round(f.cmd.p), target: f.cmd.target, goto: f.cmd.goto ? [f.cmd.goto.x, f.cmd.goto.z, f.cmd.goto.d] : null, dur: v.cmd.dur };
          return { dirty: true, res: me };
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
