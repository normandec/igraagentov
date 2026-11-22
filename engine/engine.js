// OCEAN ARENA v5 — deterministic 4 Hz simulation engine (unlimited seats, manual start, rich AI & locomotion)
(function (OC) {
  var C = OC.CONST = {
    TICK_MS: 250, MAX_TICKS: 6000, LOBBY_SEC: 0, IDLE_SEC: 90, MIN_CMD_MS: 2000,
    MAX_SEATS: 0, MIN_PLAYERS: 2, FAMINE_TICK: 4320, MAX_SIZE: 10, START_SIZE: 1.0,
    GROWTH: 0.004, BITE_CD: 6, SWALLOW_RATIO: 1.6, LUNGE_ST: 40, MAX_DUR: 60, DEF_DUR: 20, CATCHUP_MAX: 120
  };
  var DT = C.TICK_MS / 1000, TAU = Math.PI * 2, D2R = Math.PI / 180, R2D = 180 / Math.PI;
  var clamp = OC.clamp, floorAt = OC.floorAt, SP = OC.SPECIES;
  var COLORS = OC.COLORS = ['sand', 'kelp', 'blue', 'dark', 'silver', 'red', 'orange'];
  var SPEEDS = OC.SPEEDS = { rest: 0, slow: 0.35, cruise: 1, fast: 1.5, sprint: 2.4 };
  var ACTS = OC.ACTS = ['swim', 'hunt', 'feed', 'hide', 'flee', 'lunge'];
  var GRAZE_PLANTS = { 'algae-rock': 1, 'macro-algae': 1, 'red-algae': 1, 'caulerpa': 1, 'padina': 1, 'kelp-sprout': 1, 'coralline-algae': 1 };

  function rnd(g) { g.rs = (g.rs + 0x6D2B79F5) | 0; var t = g.rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  OC.rnd = rnd;
  function norm360(a) { a = a % 360; return a < 0 ? a + 360 : a; }
  function bearing(ax, az, bx, bz) { return norm360(Math.atan2(bx - ax, -(bz - az)) * R2D); }
  function relAngle(target, heading) { var r = norm360(target - heading); return r > 180 ? r - 360 : r; }
  function dist3(a, b) { var dx = a.x - b.x, dz = a.z - b.z, dd = a.d - b.d; return Math.sqrt(dx * dx + dz * dz + dd * dd); }
  function distH(a, b) { var dx = a.x - b.x, dz = a.z - b.z; return Math.sqrt(dx * dx + dz * dz); }
  function turnToward(cur, want, maxStep) { var r = relAngle(want, cur); if (Math.abs(r) <= maxStep) return norm360(want); return norm360(cur + (r > 0 ? maxStep : -maxStep)); }
  OC.bearing = bearing; OC.relAngle = relAngle; OC.dist3 = dist3;
  function hpMax(sz) { return Math.round(80 + 40 * sz); }
  function enMax(sz) { return Math.round(100 * sz); }
  function cruiseSpeed(sz) { return 2.0 + 1.0 / sz; }
  function reach(sz) { return 1.2 + 0.6 * sz; }
  function biteDmg(sz) { return 10 + 8 * sz; }
  function turnRate(sz) { return 150 / Math.sqrt(sz); }
  OC.hpMax = hpMax; OC.enMax = enMax; OC.cruiseSpeed = cruiseSpeed; OC.reach = reach; OC.biteDmg = biteDmg;

  function fishSp(f) { return f.species && f.species !== 'fish' ? SP[f.species] : null; }
  function fishHpMax(f) {
    var sp = fishSp(f); if (!sp) return hpMax(f.sz);
    var base = sp.hp || hpMax(sp.size);
    return Math.max(20, Math.round(base * Math.max(0.7, f.sz / Math.max(0.05, sp.size))));
  }
  function fishEnMax(f) {
    var sp = fishSp(f); if (!sp) return enMax(f.sz);
    return Math.max(80, Math.round(80 * Math.sqrt(Math.max(0.1, f.sz)) + 30 * f.sz));
  }
  function fishCruise(f) { var sp = fishSp(f); return sp ? Math.max(0.45, sp.speed || 0.45) : cruiseSpeed(f.sz); }
  function fishSprint(f) { var sp = fishSp(f); return sp ? Math.max(0.9, sp.sprint || sp.flee || (sp.speed || 0.45) * 1.9) : cruiseSpeed(f.sz) * SPEEDS.sprint; }
  function fishReach(f) {
    if (f.species === 'giant squid') return 11.5;
    var sp = fishSp(f); return sp ? Math.max(1.2, Math.min(12.0, 1.2 + 0.52 * f.sz)) : reach(f.sz);
  }
  function fishBiteDmg(f) {
    var sp = fishSp(f); if (!sp) return biteDmg(f.sz);
    if (sp.prey && sp.prey.dmg) return Math.round(sp.prey.dmg * (0.85 + 0.15 * f.sz / Math.max(0.1, sp.size)));
    return Math.max(5, Math.round(4 + 5 * f.sz));
  }
  function fishTurn(f) { return Math.max(36, 150 / Math.sqrt(Math.max(0.25, f.sz))); }
  function r1(v) { return Math.round(v * 10) / 10; }
  function r2(v) { return Math.round(v * 100) / 100; }
  function tSec(g) { return g.tick * DT; }
  function isNight(g) { return OC.phaseName(tSec(g)) === 'night'; }
  function isDay(g) { return OC.phaseName(tSec(g)) === 'day'; }

  // ── Habitat Spawn (guaranteed inside water, never on beaches/mountains) ──
  function spawnPos(g, sp, idx) {
    var h = sp.habitat || { zone: 'anywhere', d0: 5, d1: 60 }, x = 320, z = 320, d = 15, fl, tries = 0;
    function rndIn(cx, cz, r) {
      var a = rnd(g) * TAU, rr = Math.sqrt(rnd(g)) * r;
      x = clamp(cx + Math.cos(a) * rr, 52, OC.W - 52);
      z = clamp(cz + Math.sin(a) * rr, 52, OC.L - 52);
    }
    while (tries++ < 60) {
      switch (h.zone) {
        case 'reef': var rf = OC.REEFS[idx % OC.REEFS.length]; rndIn(rf.x, rf.z, rf.r * 0.95); break;
        case 'kelp': var k = OC.KELP[idx % OC.KELP.length]; rndIn(k.x, k.z, k.r * 0.95); break;
        case 'seagrass': var sg = OC.SEAGRASS[idx % OC.SEAGRASS.length]; rndIn(sg.x, sg.z, sg.r * 0.95); break;
        case 'mangrove': x = OC.MANGROVE.x0 + rnd(g) * (OC.MANGROVE.x1 - OC.MANGROVE.x0); z = OC.MANGROVE.z0 + rnd(g) * (OC.MANGROVE.z1 - OC.MANGROVE.z0); break;
        case 'wreck': var w = OC.WRECKS[idx % OC.WRECKS.length]; rndIn(w.x, w.z, w.rx * 0.9); break;
        case 'cave': var cv = OC.CAVES[idx % OC.CAVES.length]; x = cv.x; z = cv.z; break;
        case 'vent': var v = OC.VENTS[idx % OC.VENTS.length]; rndIn(v.x, v.z, 10); break;
        case 'abyss': rndIn(OC.ABYSS.x, OC.ABYSS.z, OC.ABYSS.r * 0.85); break;
        case 'deep':
          if (tries % 3 === 0) rndIn(OC.ABYSS.x, OC.ABYSS.z, 95);
          else if (tries % 3 === 1) rndIn(OC.BIOLUM.x, OC.BIOLUM.z, 55);
          else { x = 140 + rnd(g) * 360; z = 140 + rnd(g) * 380; }
          break;
        case 'coastal':
          var cpts = [[115, 110], [140, 515], [472, 108], [525, 280], [72, 275], [320, 122], [320, 520]];
          var cp = cpts[(idx + tries) % cpts.length]; rndIn(cp[0], cp[1], 36); break;
        case 'surface':
        case 'pelagic':
        case 'bottom':
        default: x = 75 + rnd(g) * (OC.W - 150); z = 75 + rnd(g) * (OC.L - 150); break;
      }
      fl = floorAt(x, z);
      if (fl < 1.6) continue;
      if (h.zone === 'bottom' || h.zone === 'reef' || h.zone === 'seagrass' || h.zone === 'wreck' || sp.kind === 'static' || sp.buried || sp.kind === 'crab') {
        d = Math.max(0.8, fl - 0.45);
        if (h.d0 !== undefined && (fl < h.d0 || fl > h.d1)) continue;
      } else if (h.zone === 'cave') {
        d = OC.CAVES[idx % OC.CAVES.length].d;
      } else {
        if (h.zone === 'abyss' && fl < 65) continue;
        if (h.zone === 'deep' && fl < 48) continue;
        if (h.zone === 'pelagic' && fl < 16) continue;
        if (fl <= (h.d0 || 1) + 1.5) continue;
        d = clamp((h.d0 || 2) + rnd(g) * (Math.min(h.d1 || 60, fl - 1.5) - (h.d0 || 2)), 0.6, fl - 1.2);
      }
      return { x: x, z: z, d: d };
    }
    // Safe central water fallback
    return { x: 260 + rnd(g) * 120, z: 220 + rnd(g) * 120, d: clamp(h.d0 || 16, 2, 32) };
  }

  function mkNpc(g, name, idx, pos) {
    var sp = SP[name], px = r1(pos.x), pz = r1(pos.z), pd = r1(pos.d);
    var n = {
      id: 'a' + (g.nextA++), sp: name, x: px, z: pz, d: pd, p: 0, h: Math.round(rnd(g) * 360), spd: 0,
      hp: sp.hp || hpMax(sp.size), alive: true, st: 'idle', tg: null, tm: 0, sat: 0,
      hx: px, hz: pz, hd: pd, rt: 0, wp: 0, sprint: 0, tired: 0, bleed: 0, ph: Math.round(rnd(g) * 100)
    };
    if (sp.kind === 'school') n.n = sp.n;
    if (sp.pack) n.pk = sp.pack;
    if (sp.packs) n.pk = name + '-' + (idx % sp.packs);
    if (sp.kind === 'shark') { n.wp = Math.floor(rnd(g) * sp.waypoints.length); n.st = 'patrol'; }
    if (sp.kind === 'kraken') { n.st = 'patrol'; n.hx = OC.ABYSS.x; n.hz = OC.ABYSS.z; n.hd = 98; }
    g.npcs.push(n); return n;
  }

  OC.newGame = function (gen, seed) {
    var g = {
      v: 5, gen: gen || 1, status: 'lobby', tick: 0, seed: seed || (gen * 7919 + 13), rs: 0, startMs: 0, lastMs: 0,
      firstClaimMs: 0, lobbyUntilMs: null, fish: [], feed: [], chat: [], winner: null, ranks: null,
      nextId: 1, nextA: 1, nextK: 1, nextChat: 1, famine: false, npcs: [], plankton: [], blooms: [], carrion: [],
      stateHits: {}, events: { whale: false, orcas: false, orcasGone: false }
    };
    g.rs = g.seed | 0;
    var i, name, ptries = 0;
    while (g.plankton.length < 18 && ptries++ < 150) {
      var px = 85 + rnd(g) * (OC.W - 170), pz = 85 + rnd(g) * (OC.L - 170);
      if (floorAt(px, pz) >= 22) g.plankton.push({ id: 'p' + (g.plankton.length + 1), x: r1(px), z: r1(pz), d: 28, r: 16, amt: 100 });
    }
    OC.JELLY_HOMES.forEach(function (jh, k) {
      g.blooms.push({ id: 'j' + (k + 1), x: jh.x, z: jh.z, d: (jh.d0 + jh.d1) / 2, r: jh.r, n: 40, hx: jh.x, hz: jh.z, d0: jh.d0, d1: jh.d1 });
    });
    for (name in SP) {
      var sp = SP[name]; if (!sp.count && !(sp.habitat && sp.habitat.zone === 'cave')) continue;
      if (sp.habitat && sp.habitat.zone === 'cave' && !sp.count) {
        OC.CAVES.forEach(function (cv, ci) {
          if (cv.dweller === name) {
            var cnt = name === 'lobster' ? 2 : 1;
            for (var q = 0; q < cnt; q++) mkNpc(g, name, ci, { x: cv.x + (rnd(g) - 0.5) * 3, z: cv.z + (rnd(g) - 0.5) * 3, d: cv.d });
          }
        });
        continue;
      }
      if (sp.habitat && sp.habitat.zone === 'event') continue;
      for (i = 0; i < sp.count; i++) {
        var pos = spawnPos(g, sp, i);
        if (name === 'whale') pos = { x: 165, z: 245, d: 24 };
        else if (name === 'whale calf') pos = { x: 155, z: 253, d: 21 };
        else if (name === 'giant squid') pos = { x: OC.ABYSS.x, z: OC.ABYSS.z, d: 98 };
        else if (sp.kind === 'shark') {
          var w0 = sp.waypoints[i % sp.waypoints.length];
          var sx = clamp(w0[0] + (i - 0.5) * 6, 75, OC.W - 75), sz = clamp(w0[1] + (i - 0.5) * 5, 75, OC.L - 75);
          var sfl = floorAt(sx, sz);
          if (sfl >= (sp.shallowOK || 12) + 2) pos = { x: sx, z: sz, d: clamp(w0[2], 3, sfl - 2) };
        }
        mkNpc(g, name, i, pos);
      }
    }
    return g;
  };

  function addFeed(g, txt) { g.feed.push({ t: g.tick, txt: txt }); if (g.feed.length > 100) g.feed.splice(0, g.feed.length - 100); }
  OC.addFeed = addFeed;
  function ev(f, key, txt, n) {
    var e = f.ev;
    for (var i = e.length - 1; i >= 0 && i >= e.length - 14; i--) {
      if (e[i].k === key && e[i].t >= f.lastMeTick) { e[i].n += (n || 0); e[i].c++; e[i].txt = txt; return; }
    }
    e.push({ k: key, txt: txt, n: n || 0, c: 1, t: f.lastMeTick }); if (e.length > 40) e.splice(0, e.length - 40);
  }

  function resolveSpeciesChoice(g, spec) {
    if (!spec || spec === 'random') return OC.pickRandomSpecies(g, rnd);
    var s = String(spec).trim().toLowerCase();
    if (s === 'fish') return 'fish';
    if (s === 'shark') return OC.SHARK_SPECIES[Math.floor(rnd(g) * OC.SHARK_SPECIES.length)];
    if (s === 'predator') { var pr = ['barracuda', 'orca', 'giant squid', 'humboldt squid', 'moray', 'grouper', 'wahoo', 'swordfish', 'giant trevally', 'lionfish', 'seal']; return pr[Math.floor(rnd(g) * pr.length)]; }
    if (SP[s]) return s;
    return null;
  }
  function placeForSpecies(g, f, idx) {
    var sp = fishSp(f);
    if (sp) {
      var pos = f.species === 'giant squid' ? { x: OC.ABYSS.x + (rnd(g) - 0.5) * 18, z: OC.ABYSS.z + (rnd(g) - 0.5) * 18, d: 96 }
        : f.species === 'whale' ? { x: 220 + rnd(g) * 160, z: 220 + rnd(g) * 160, d: 22 }
        : spawnPos(g, sp, idx);
      f.x = r1(pos.x); f.z = r1(pos.z); f.d = r1(clamp(pos.d, 0.8, Math.max(1.2, floorAt(pos.x, pos.z) - 0.4)));
      f.h = bearing(f.x, f.z, 320, 300);
      f.sz = sp.size;
      f.hp = fishHpMax(f);
      f.en = Math.round(fishEnMax(f) * 0.85);
      f.air = 100;
      f.cmd.h = f.h;
      return;
    }
    var base = OC.SPAWNS[idx % OC.SPAWNS.length], sx = base.x, sz = base.z, sd = base.d, tries = 0;
    function freeWater(x, z, d) {
      var fl = floorAt(x, z); if (fl < 8 || d > fl - 2) return false;
      for (var i = 0; i < g.fish.length; i++) if (g.fish[i] !== f && Math.hypot(g.fish[i].x - x, g.fish[i].z - z, g.fish[i].d - d) < 6) return false;
      return true;
    }
    if (!freeWater(sx, sz, sd)) {
      while (tries++ < 80) {
        var ang = (idx * 2.39996 + tries * 0.7) % TAU;
        var rad = 35 + ((idx * 17 + tries * 23) % 210);
        var cx = clamp(320 + Math.cos(ang) * rad, 65, OC.W - 65), cz = clamp(300 + Math.sin(ang) * rad, 65, OC.L - 65);
        var cfl = floorAt(cx, cz), cd = clamp(8 + (tries % 18), 4, Math.max(6, cfl - 3));
        if (cfl >= 10 && !OC.inAbyss(cx, cz, cd) && freeWater(cx, cz, cd)) { sx = cx; sz = cz; sd = cd; break; }
      }
    }
    f.x = r1(sx); f.z = r1(sz); f.d = r1(clamp(sd, 3, Math.max(4, floorAt(f.x, f.z) - 2)));
    f.h = bearing(f.x, f.z, 320, 300); f.sz = C.START_SIZE; f.hp = hpMax(C.START_SIZE); f.en = 80; f.air = 100; f.cmd.h = f.h;
  }

  // Unlimited player spawns: random species/role across all 76 marine animals + survivor fish!
  OC.addFish = function (g, name, model, color, key, ip, reqSpecies) {
    var id = 'f' + (g.nextId++), idx = g.fish.length;
    var chosen = resolveSpeciesChoice(g, reqSpecies) || OC.pickRandomSpecies(g, rnd);
    var role = OC.ROLE_OF(chosen);
    var f = {
      id: id, n: name, model: model || '?', color: COLORS.indexOf(color) >= 0 ? color : 'blue', key: key, ip: ip || null,
      species: chosen, role: role,
      x: 320, z: 320, d: 12, h: 0, p: 0, spd: 0, sz: C.START_SIZE, hp: 120, en: 80, st: 100, air: 100,
      bleed: 0, poison: 0, ink: 0, held: 0, alive: true, hid: false, cave: null,
      kills: 0, npcKills: 0, ate: 0, bites: 0, cmdN: 0, meN: 0, lastCmdTick: 0, lastMeTick: 0, lastCmdMs: 0, lastSayMs: 0, says: 0,
      cmdMs: [], whys: [], whyLog: [], ev: [],
      cmd: { act: 'swim', speed: 'rest', h: 0, p: 0, until: 0, target: null, goto: null },
      cool: 0, lunge: 0, born: 0, died: null, cause: null, suspect: false, cheat: false, why: '', score: 0
    };
    placeForSpecies(g, f, idx);
    g.fish.push(f);
    addFeed(g, name + ' entered as ' + chosen + ' (' + role + ', ' + (model || '?') + ')');
    return f;
  };

  OC.setRole = function (g, fishId, specChoice) {
    if (g.status !== 'lobby') return { ok: false, error: 'roles can only be changed in the lobby' };
    var chosen = resolveSpeciesChoice(g, specChoice);
    if (!chosen) return { ok: false, error: 'unknown species: ' + specChoice };
    var idx = -1, i;
    for (i = 0; i < g.fish.length; i++) if (g.fish[i].id === fishId) { idx = i; break; }
    if (idx < 0) return { ok: false, error: 'fish not found: ' + fishId };
    var f = g.fish[idx];
    f.species = chosen; f.role = OC.ROLE_OF(chosen);
    placeForSpecies(g, f, idx);
    ev(f, 'role', 'HOST assigned you role: ' + f.species + ' (' + f.role + '). ' + OC.ROLE_GUIDE(f.species));
    addFeed(g, 'Host assigned ' + f.n + ' -> ' + f.species + ' (' + f.role + ')');
    return { ok: true, fish: f };
  };

  OC.say = function (g, f, msg, to, nowMs) {
    var clean = (msg === undefined || msg === null ? '' : String(msg)).trim().replace(/\s+/g, ' ');
    if (clean.length < 2) return { ok: false, error: 'msg must be 2–220 characters' };
    clean = clean.slice(0, 220);
    var ch = (to || 'all') + '';
    if (['all', 'sharks', 'pod', 'fish'].indexOf(ch) < 0) ch = 'all';
    if (!g.chat) g.chat = [];
    var m = {
      id: 'c' + (g.nextChat = (g.nextChat || 1) + 1),
      t: g.tick, ms: nowMs || Date.now(),
      from: f.n, fid: f.id, sp: f.species, role: f.role, to: ch, msg: clean,
      x: r1(f.x), z: r1(f.z), d: r1(f.d)
    };
    g.chat.push(m);
    if (g.chat.length > 80) g.chat.splice(0, g.chat.length - 80);
    f.says = (f.says || 0) + 1;
    if (nowMs) f.lastSayMs = nowMs;
    // If someone broadcasts prey coordinates to sharks (or mentions fish/coordinates), alert NPC sharks too!
    if (ch === 'sharks' || /shark|fish|prey|morsk|rib|reef|kelp|hunt/i.test(clean)) {
      var cm = clean.match(/\b(\d{2,3})\s*[,\/\s]\s*(\d{2,3})\b/);
      var hx = cm ? clamp(+cm[1], 55, OC.W - 55) : f.x, hz = cm ? clamp(+cm[2], 55, OC.L - 55) : f.z;
      g._sharkHint = { x: hx, z: hz, d: clamp(f.d, 5, Math.max(8, floorAt(hx, hz) - 2)), t: g.tick, by: f.n };
    }
    return { ok: true, entry: m };
  };

  OC.validateCmd = function (b) {
    var out = {}, errs = [];
    var act = (b.act || 'swim') + ''; if (ACTS.indexOf(act) < 0) errs.push('act must be one of ' + ACTS.join('|')); out.act = act;
    var sp = (b.speed || 'cruise') + ''; if (!(sp in SPEEDS)) errs.push('speed must be one of ' + Object.keys(SPEEDS).join('|')); out.speed = sp;
    if (b.heading !== undefined) { var h = +b.heading; if (!isFinite(h)) errs.push('heading must be a number (degrees, 0=north 90=east)'); out.h = norm360(h); }
    if (b.pitch !== undefined) { var p = +b.pitch; if (!isFinite(p)) errs.push('pitch must be a number (degrees, +down −up)'); out.p = clamp(p, -80, 80); } else out.p = 0;
    if (b.goto !== undefined) { var gt = b.goto; if (!Array.isArray(gt) || gt.length < 2 || !isFinite(+gt[0]) || !isFinite(+gt[1])) errs.push('goto must be [x, z] or [x, z, depth]'); else out.goto = { x: clamp(+gt[0], 0, OC.W), z: clamp(+gt[1], 0, OC.L), d: gt.length > 2 && isFinite(+gt[2]) ? clamp(+gt[2], 0.5, OC.DMAX) : null }; }
    if (b.target !== undefined && b.target !== null) out.target = (b.target + '').slice(0, 12);
    if ((act === 'hunt' || act === 'flee') && !out.target) errs.push(act + ' requires target (an id you can see)');
    var dur = b.dur === undefined ? C.DEF_DUR : +b.dur; if (!isFinite(dur)) dur = C.DEF_DUR; out.dur = clamp(dur, 2, C.MAX_DUR);
    var why = (b.why === undefined || b.why === null) ? '' : (b.why + '').trim(); if (why.length < 8) errs.push('why is required: 8–240 characters of your own reasoning for this command'); out.why = why.slice(0, 240);
    if (b.say !== undefined && b.say !== null && String(b.say).trim().length >= 2) {
      out.say = String(b.say).trim().slice(0, 220);
      out.to = (b.to && ['all', 'sharks', 'pod', 'fish'].indexOf(String(b.to)) >= 0) ? String(b.to) : 'all';
    }
    return { ok: errs.length === 0, errs: errs, cmd: out };
  };
  OC.applyCmd = function (g, f, c, nowMs) {
    f.cmd = { act: c.act, speed: c.speed, h: c.h !== undefined ? c.h : f.cmd.h, p: c.p, until: g.tick + Math.round(c.dur / DT), target: c.target || null, goto: c.goto || null, t0: g.tick };
    if (c.act === 'hide') f.cmd.speed = 'rest';
    if (c.act === 'lunge') { if (f.st >= C.LUNGE_ST) { f.lunge = 4; f.st -= C.LUNGE_ST; f.en = Math.max(0, f.en - 3); } else ev(f, 'nolunge', 'not enough stamina to lunge (' + Math.round(f.st) + ')'); f.cmd.act = 'swim'; f.cmd.speed = c.speed === 'rest' ? 'cruise' : c.speed; }
    if (c.say) OC.say(g, f, c.say, c.to || 'all', nowMs);
    f.why = c.why; f.whys.push(c.why); if (f.whys.length > 12) f.whys.shift();
    f.whyLog.push({ ms: nowMs || 0, t: g.tick, act: c.act, sp: c.speed, why: c.why }); if (f.whyLog.length > 15) f.whyLog.shift();
    f.cmdN++; f.lastCmdTick = g.tick;
    if (nowMs) { f.cmdMs.push(nowMs); if (f.cmdMs.length > 12) f.cmdMs.shift(); f.lastCmdMs = nowMs; }
    if (f.cmdMs.length >= 8) {
      var iv = [], i; for (i = 1; i < f.cmdMs.length; i++) iv.push(f.cmdMs[i] - f.cmdMs[i - 1]);
      var m = iv.reduce(function (a, b) { return a + b; }, 0) / iv.length, v = iv.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / iv.length;
      var uniq = {}; f.whys.forEach(function (w) { uniq[w] = 1; });
      f.suspect = (Math.sqrt(v) < 250 && m < 6000) || Object.keys(uniq).length <= Math.max(2, Math.floor(f.whys.length / 4));
    }
  };

  // ── Shelter / Vision ─────────────────────────────────────────────────────
  function hideInfo(f, tick) {
    if (tick !== undefined && f._hiTick === tick && f._hi) return f._hi;
    var x = f.x, z = f.z, d = f.d, sz = f.sz || 1, fl = floorAt(x, z), res;
    var cv = OC.caveAt(x, z, d);
    if (cv) res = { src: cv.id, mult: 0, ok: true, solid: true, birdSafe: true };
    else {
      var w = OC.wreckAt(x, z, d);
      if (w) res = { src: w.id, mult: 0.3, ok: sz <= w.hideMax, solid: true, birdSafe: true };
      else {
        var k = OC.kelpAt(x, z, d);
        if (k) res = { src: k.id, mult: 0.25, ok: true, birdSafe: d > 3 };
        else {
          var m = OC.mangroveAt(x, z, d);
          if (m) res = { src: 'mangrove', mult: 0.2, ok: sz <= 1.5, birdSafe: true };
          else {
            var sg = OC.sargassumAt(x, z, d);
            if (sg) res = { src: sg.id, mult: 0.4, ok: sz <= 2.0, birdSafe: true };
            else {
              var pl = OC.plantAt(x, z, d);
              if (pl) {
                if (pl.type === 'anemone') res = { src: 'anemone', mult: 0.1, ok: sz <= 1.2, plant: pl };
                else if (pl.type === 'sponge') res = { src: 'sponge', mult: 0.3, ok: sz <= 1.5, plant: pl };
                else if (pl.type === 'coral-table') res = { src: 'table coral', mult: 0.5, ok: sz <= 2.0, birdSafe: true, plant: pl };
                else if (pl.type === 'seafan' || pl.type === 'seawhip') res = { src: pl.type, mult: 0.6, ok: sz <= 1.0, plant: pl };
                else if (pl.type === 'coral-staghorn' || pl.type === 'coral-brain' || pl.type === 'coral-pillar') res = { src: 'coral', mult: 0.15, ok: sz <= 1.8, plant: pl };
                else if (pl.type === 'macro-algae' || pl.type === 'kelp-sprout') res = { src: pl.type, mult: 0.32, ok: sz <= 1.5, plant: pl };
                else if (pl.type === 'boulder' || pl.type === 'rock-spire') res = { src: 'rock', mult: 0.35, ok: sz <= 1.8, plant: pl };
              }
              if (!res) {
                var rf = OC.reefAt(x, z, d);
                if (rf) res = { src: rf.id, mult: 0.12, ok: sz <= rf.hideMax };
                else {
                  var s = OC.seagrassAt(x, z, d);
                  if (s) res = { src: s.id, mult: 0.5, ok: sz <= 2.0 };
                  else if (d > fl - 1.6) res = { src: 'bottom', mult: 0.4, ok: true };
                  else res = { src: null, mult: 1, ok: false };
                }
              }
            }
          }
        }
      }
    }
    if (tick !== undefined) { f._hiTick = tick; f._hi = res; }
    return res;
  }
  OC.hideInfo = hideInfo;
  function visionOf(g, f) {
    var L = OC.lightAt(tSec(g), f.d), v = 6 + 55 * L;
    var fsp = fishSp(f);
    if (fsp && fsp.prey && fsp.prey.vision) v = Math.max(v, fsp.prey.vision * (0.45 + 0.55 * L));
    if (f.role === 'shark') v *= 1.15;
    if (OC.kelpAt(f.x, f.z, f.d)) v *= 0.55; if (OC.wreckAt(f.x, f.z, f.d)) v *= 0.5; if (OC.caveAt(f.x, f.z, f.d)) v *= 0.4;
    if (f.ink > 0) v *= 0.25; if (OC.mangroveAt(f.x, f.z, f.d)) v *= 0.6;
    return v;
  }
  function visMul(g, t, viewer, viewerDetect) {
    var sz = t.sz || (t.sp && SP[t.sp].size) || 1, m = 0.5 + 0.12 * sz, moving = (t.spd || 0) > 0.8, sp = t.sp ? SP[t.sp] : null;
    var fl = floorAt(t.x, t.z), onBottom = t.d > fl - 1.6 && !moving;
    m *= moving ? 1.25 : (onBottom ? 0.4 : 0.8);
    if (!sp && t.spd > fishCruise(t) * 1.6) m *= 1.6;
    if (t.bleed > 0) m *= 1.5;
    var hi = hideInfo(t, g.tick);
    var vInside = viewer && hi.solid && hideInfo(viewer, g.tick).src === hi.src;
    if (hi.solid && !vInside) return 0;
    if (!sp) { if (hi.src && (t.hid ? hi.ok : (/kelp|mangrove|wreck/.test(hi.src || '')))) m *= hi.mult; else if (hi.src && hi.ok && t.hid) m *= hi.mult; }
    else { if (/kelp|wreck|mangrove/.test(hi.src || '')) m *= hi.mult; if (t.st === 'camo' || t.st === 'freeze') m *= 0.25; if (sp.camo) m *= sp.camo; if (sp.buried && !moving) m *= 0.15; if (sp.lure) m *= 0.15; if (sp.nocturnal && !isNight(g) && sp.kind !== 'school') m *= 0.2; }
    if (t.inJelly && sz <= 1.5) m *= 0.3;
    if (OC.inBiolum(t.x, t.z, t.d) && moving) m *= 3;
    if (!sp) {
      var L = OC.lightAt(tSec(g), t.d), c = t.color;
      if (c === 'sand' && onBottom && !hi.plant && !/kelp|reef/.test(hi.src || '')) m *= 0.5;
      else if (c === 'kelp' && (/kelp|seagrass/.test(hi.src || '') || hi.src === 'mangrove')) m *= 0.5;
      else if (c === 'red') m *= t.d > 60 ? 0.45 : (t.d < 30 ? 1.5 : 1);
      else if (c === 'silver' && t.d < 25 && L > 0.4) m *= 0.7;
      else if (c === 'dark' && L < 0.12) m *= 0.65;
      else if (c === 'blue' && !onBottom && t.d >= 20 && t.d <= 60) m *= 0.8;
      else if (c === 'orange') m *= 1.3;
    }
    if (viewerDetect) {
      var elR = viewer.sp && SP[viewer.sp].prey ? (SP[viewer.sp].prey.electro || 16) : 22;
      if (viewerDetect.indexOf('electro') >= 0 && !hi.solid && dist3(viewer, t) < elR) m = Math.max(m, 1.6);
      if (viewerDetect.indexOf('echo') >= 0 && !hi.solid) m = Math.max(m, 1.3);
    }
    return m;
  }
  function canSee(g, viewer, t, baseVis, detect) { var dd = dist3(viewer, t); return dd <= (baseVis || visionOf(g, viewer)) * visMul(g, t, viewer, detect) ? dd : -1; }
  OC.visMul = visMul; OC.visionOf = visionOf; OC.canSee = canSee;

  function zonesOf(g, f) {
    var z = [], hi = hideInfo(f, g.tick), v = OC.ventAt(f.x, f.z, f.d), fl = floorAt(f.x, f.z);
    if (hi.src && hi.src !== 'bottom') z.push(hi.src);
    var rf = OC.reefAt(f.x, f.z, f.d); if (rf && z.indexOf(rf.id) < 0) z.push(rf.id);
    var sg = OC.seagrassAt(f.x, f.z, f.d); if (sg && z.indexOf(sg.id) < 0) z.push(sg.id);
    if (v.dist < 14) z.push(v.v.id + (v.dist < 4 ? ' (scalding)' : ''));
    if (OC.inBiolum(f.x, f.z, f.d)) z.push('glowing water');
    if (OC.inDeadzone(f.x, f.z, f.d)) z.push('stagnant water');
    if (OC.inAbyss(f.x, f.z, f.d)) z.push('abyssal trench');
    if (f.inJelly) z.push('jellyfish bloom');
    if (f.d < OC.SURFACE_ZONE) z.push('surface');
    if (fl < 6 && fl > 0) z.push('shallow beach');
    if (f.d > fl - 1.6) z.push('on the bottom');
    if (f.d > OC.THERMO) z.push('below thermocline');
    var cur = OC.currentAt(f.x, f.z, f.d); if (cur.id) z.push('current:' + cur.id);
    if (!z.length || (z.length === 1 && /current|thermo/.test(z[0]))) z.unshift('open water');
    return z;
  }

  // ── Perception (GET /me) ─────────────────────────────────────────────────
  OC.perceive = function (g, f, nowMs) {
    var see = [], pulses = [], smell = [], vis = visionOf(g, f), i, dd, cur = OC.currentAt(f.x, f.z, f.d), dark = OC.lightAt(tSec(g), f.d) < 0.1;
    var fsp = fishSp(f), fDetect = fsp && fsp.prey ? fsp.prey.detect : (f.role === 'shark' ? ['smell', 'lateral', 'electro'] : null);
    var isPredRole = (f.role === 'shark' || f.role === 'predator' || f.role === 'dolphin');
    function entry(t, kind, extra) {
      var b = bearing(f.x, f.z, t.x, t.z);
      var e = { id: t.id, kind: kind, bearing: Math.round(b), rel: Math.round(relAngle(b, f.h)), dist: r1(dist3(f, t)), x: Math.round(t.x), z: Math.round(t.z), depth: r1(t.d) };
      if (extra) for (var k in extra) e[k] = extra[k]; return e;
    }
    function pulse(t, kind) { pulses.push({ bearing: Math.round(bearing(f.x, f.z, t.x, t.z) / 10) * 10, dist: Math.round(dist3(f, t) / 5) * 5, size: kind }); }
    function smellOf(src, kind, strength, range) {
      range = (range || 110) * (f.role === 'shark' ? 1.35 : 1);
      var dx = f.x - src.x, dz = f.z - src.z, dist = distH(f, src); if (dist > range) return;
      var cl = Math.sqrt(cur.x * cur.x + cur.z * cur.z), down = cl < 0.3 ? 1 : (dx * cur.x + dz * cur.z) / (dist * cl); if (down < -0.2) return;
      smell.push({ kind: kind, bearing: Math.round(bearing(f.x, f.z, src.x, src.z) / 15) * 15, strength: r1(strength * (1 - dist / (range + 10))) });
    }
    function szClass(s) { return s > f.sz * 3 ? 'huge' : s > f.sz * 1.3 ? 'large' : s < f.sz * 0.7 ? 'small' : 'similar'; }
    if (g.status === 'running') {
      for (i = 0; i < g.fish.length; i++) {
        var o = g.fish[i]; if (o === f || !o.alive) continue;
        dd = canSee(g, f, o, vis * (isPredRole && o.role === 'fish' ? 1.25 : 1), fDetect);
        if (dd >= 0) see.push(entry(o, o.species === 'fish' ? 'fish' : o.species, { name: o.n, role: o.role, species: o.species, size: r1(o.sz), heading: Math.round(o.h), moving: o.spd > 0.8, bleeding: o.bleed > 0, preyTarget: isPredRole && o.role === 'fish' }));
        else if ((o.spd > 0.8 || f.role === 'shark') && dist3(f, o) < (f.role === 'shark' ? 28 : 10 + 2.5 * o.sz)) pulse(o, szClass(o.sz));
        if (o.bleed > 0 || (f.role === 'shark' && o.role === 'fish')) smellOf(o, o.bleed > 0 ? 'blood' : 'fish-scent', o.bleed > 0 ? 1 + o.sz * 0.3 : 0.45, o.bleed > 0 ? 130 : 75);
      }
      for (i = 0; i < g.npcs.length; i++) {
        var a = g.npcs[i]; if (!a.alive) continue; var sp = SP[a.sp], asz = sp.size; dd = dist3(f, a);
        if (dd > vis * 3 + 25) continue;
        if (sp.kind === 'school') { if (a.n <= 0) continue; if (dd < vis * 1.5 + 8) see.push(entry(a, a.sp + ' school', { count: Math.round(a.n / 10) * 10, size: asz, moving: true })); continue; }
        if (sp.lure && dark && dd < 25 && dd > 3) { see.push(entry(a, 'small glowing light', {})); continue; }
        var vdd = canSee(g, f, a, vis, fDetect);
        if (vdd >= 0) { var ex = { size: asz, moving: a.spd > 0.8 }; if (a.bleed > 0) ex.bleeding = true; if (a.pk) ex.group = a.pk; if (a.st === 'hunt' && a.tg === f.id) ex.heading = Math.round(a.h); see.push(entry(a, a.sp, ex)); }
        else if (a.spd > 0.8 && dd < 12 + 2.5 * asz) pulse(a, szClass(asz));
        if (a.bleed > 0) smellOf(a, 'blood', 1 + asz * 0.2);
      }
      for (i = 0; i < g.plankton.length; i++) { var p = g.plankton[i]; if (p.amt <= 1) continue; if (dist3(f, p) < vis * 1.2 + p.r) see.push(entry(p, 'plankton cloud', { radius: p.r, density: Math.round(p.amt) })); else smellOf(p, 'plankton', 0.4); }
      for (i = 0; i < g.blooms.length; i++) { var j = g.blooms[i]; if (dist3(f, j) < vis * 1.4 + j.r) see.push(entry(j, 'jellyfish bloom', { radius: j.r, count: j.n })); }
      for (i = 0; i < g.carrion.length; i++) { var k = g.carrion[i]; if (dist3(f, k) < vis * 1.1) see.push(entry(k, k.sz > 15 ? 'whale carcass' : 'carcass', { size: r1(k.sz), remaining: Math.round(k.en) })); else smellOf(k, 'carrion', 1 + k.sz * 0.4, k.sz > 15 ? 300 : 110); }
      OC.REEFS.forEach(function (rf) { var cw = rf.cleaner; if (dist3(f, cw) < vis) see.push(entry({ id: 'cleaner-' + rf.id, x: cw.x, z: cw.z, d: cw.d }, 'cleaner wrasse station', {})); });
      OC.CAVES.forEach(function (cv) { if (dist3(f, cv) < Math.min(vis, 30)) see.push(entry(cv, 'cave entrance', { id: cv.id })); });
      var pls = OC.plantsNear(f.x, f.z, f.d, Math.min(vis, 16)); pls.sort(function (a, b) { return dist3(f, a) - dist3(f, b); }); pls.slice(0, 8).forEach(function (pl) { see.push(entry(pl, 'plant', { type: pl.type })); });
    }
    see.sort(function (a, b) { return a.dist - b.dist; }); if (see.length > 36) see.length = 36;
    var events = []; for (i = 0; i < f.ev.length; i++) { var e = f.ev[i]; if (e.t >= f.lastMeTick || f.ev.length - i <= 3) events.push(e.c > 1 ? e.txt + ' (×' + e.c + (e.n ? ', total ' + Math.round(e.n) : '') + ')' : e.txt); }
    var visibleChat = [], chList = g.chat || [];
    for (i = Math.max(0, chList.length - 30); i < chList.length; i++) {
      var cm = chList[i];
      var canRead = cm.to === 'all' || cm.fid === f.id || (cm.to === 'sharks' && (f.role === 'shark' || f.role === 'predator')) || (cm.to === 'pod' && f.role === 'dolphin') || (cm.to === 'fish' && f.role === 'fish');
      if (canRead) visibleChat.push({ from: cm.from, species: cm.sp, role: cm.role, to: cm.to, msg: cm.msg, at: [cm.x, cm.z, cm.d], agoSec: Math.max(0, Math.round((g.tick - cm.t) * DT)) });
    }
    if (visibleChat.length > 14) visibleChat = visibleChat.slice(-14);
    var fl = floorAt(f.x, f.z), alive = g.fish.filter(function (x) { return x.alive; }).length;
    var out = {
      status: g.status, gen: g.gen, tick: g.tick, t: Math.round(tSec(g)), timeLeft: Math.max(0, Math.round((C.MAX_TICKS - g.tick) * DT)),
      light: { phase: OC.phaseName(tSec(g)), here: r2(OC.lightAt(tSec(g), f.d)), visionRange: Math.round(vis) },
      you: {
        id: f.id, name: f.n, species: f.species, role: f.role, mission: OC.ROLE_GUIDE(f.species),
        alive: f.alive, x: r1(f.x), z: r1(f.z), depth: r1(f.d), floorBelow: r1(fl),
        heading: Math.round(f.h), pitch: Math.round(f.p), speed: r1(f.spd),
        hp: Math.round(f.hp), hpMax: fishHpMax(f), energy: Math.round(f.en), energyMax: fishEnMax(f), stamina: Math.round(f.st),
        size: r2(f.sz), bleeding: f.bleed > 0, poisoned: f.poison > 0, inked: f.ink > 0, held: f.held > 0, hidden: !!f.hid,
        temp: OC.tempAt(f.x, f.z, f.d), current: { x: r1(cur.x), z: r1(cur.z), vertical: r1(cur.d) }, zone: zonesOf(g, f),
        color: f.color, kills: f.kills, animalsEaten: f.npcKills, eaten: Math.round(f.ate),
        command: { act: f.cmd.act, speed: f.cmd.speed, heading: Math.round(f.cmd.h), pitch: Math.round(f.cmd.p), target: f.cmd.target, goto: f.cmd.goto ? [f.cmd.goto.x, f.cmd.goto.z, f.cmd.goto.d] : null, secondsLeft: Math.max(0, Math.round((f.cmd.until - g.tick) * DT)) }
      },
      see: see, pulses: pulses, smell: smell, chat: visibleChat, events: events, fishAlive: alive, fishTotal: g.fish.length
    };
    if (fsp && fsp.breathes) out.you.air = Math.round(f.air);
    if (fsp && fsp.defense) out.you.defense = fsp.defense;
    if (!f.alive) out.you.died = f.cause;
    if (g.status === 'lobby') out.lobby = {
      fishJoined: g.fish.length, maxSeats: C.MAX_SEATS || null,
      seats: C.MAX_SEATS ? g.fish.length + '/' + C.MAX_SEATS : g.fish.length + ' (unlimited)',
      yourSpecies: f.species, yourRole: f.role, mission: OC.ROLE_GUIDE(f.species),
      startsInSec: g.lobbyUntilMs ? Math.max(0, Math.round((g.lobbyUntilMs - (nowMs || Date.now())) / 1000)) : null,
      manualStart: !g.lobbyUntilMs,
      roster: g.fish.map(function (pf) { return { id: pf.id, name: pf.n, species: pf.species, role: pf.role }; }),
      note: 'roles are random unless the host reassigns them; poll /me every 20–30 s (or use POST /say to talk)'
    };
    if (g.status === 'finished') out.result = { winner: g.winner, ranks: g.ranks };
    if (f.idleWarn) out.warning = 'no command for ' + f.idleWarn + ' s — you are removed after ' + C.IDLE_SEC + ' s without /cmd';
    f.lastMeTick = g.tick; f.meN++;
    return out;
  };

  // ── Combat / Feeding ─────────────────────────────────────────────────────
  function kill(g, f, cause, killer) {
    f.alive = false; f.died = g.tick; f.cause = cause; f.spd = 0; f.hid = false;
    g.carrion.push({ id: 'k' + (g.nextK++), x: f.x, z: f.z, d: f.d, sz: f.sz, en: 30 * f.sz, age: 0, of: f.id });
    if (killer && killer.n) killer.kills++;
    addFeed(g, f.n + ' ' + cause);
  }
  var CAUSES = {
    bite: function (by) { return 'was eaten by ' + by.n; },
    npc: function (by) { return 'was killed by a ' + by.sp; },
    starve: 'starved', bird: 'was snatched from the surface', heat: 'was boiled at a vent',
    jelly: 'was stung to death', poison: 'died of poison', venom: 'died of venom',
    deadzone: 'suffocated in stagnant water', sting: 'died of a sting', spines: 'bled out on spines',
    anemone: 'was stung to death by an anemone'
  };
  function hurt(g, f, dmg, cause, key, txt, by) {
    if (!f.alive) return; f.hp -= dmg; f.hid = false; f.bleed = Math.max(f.bleed, (cause === 'bite' || cause === 'npc') ? 80 : 20);
    ev(f, key, txt, -dmg);
    if (f.hp <= 0) { f.hp = 0; var c = CAUSES[cause]; kill(g, f, typeof c === 'function' ? c(by) : (c || 'died'), by && by.n ? by : null); }
  }
  function findTarget(g, id) {
    var i; if (!id) return null;
    var pfx = id.charAt(0);
    if (pfx === 'f') for (i = 0; i < g.fish.length; i++) if (g.fish[i].id === id && g.fish[i].alive) return { kind: 'fish', o: g.fish[i] };
    if (pfx === 'a') for (i = 0; i < g.npcs.length; i++) if (g.npcs[i].id === id && g.npcs[i].alive) return { kind: 'npc', o: g.npcs[i] };
    if (pfx === 'p') for (i = 0; i < g.plankton.length; i++) if (g.plankton[i].id === id) return { kind: 'plankton', o: g.plankton[i] };
    if (pfx === 'k') for (i = 0; i < g.carrion.length; i++) if (g.carrion[i].id === id) return { kind: 'carrion', o: g.carrion[i] };
    if (pfx === 'j') for (i = 0; i < g.blooms.length; i++) if (g.blooms[i].id === id) return { kind: 'bloom', o: g.blooms[i] };
    for (i = 0; i < OC.CAVES.length; i++) if (OC.CAVES[i].id === id) return { kind: 'place', o: OC.CAVES[i] };
    if (id.slice(0, 8) === 'cleaner-') for (i = 0; i < OC.REEFS.length; i++) if ('cleaner-' + OC.REEFS[i].id === id) { var cw = OC.REEFS[i].cleaner; return { kind: 'place', o: { id: id, x: cw.x, z: cw.z, d: cw.d } }; }
    if (id.slice(0, 2) === 'pl') for (i = 0; i < OC.PLANTS.length; i++) if (OC.PLANTS[i].id === id) return { kind: 'plant', o: OC.PLANTS[i] };
    return null;
  }
  function gain(g, f, e, key, txt) {
    var em = fishEnMax(f); f.en = Math.min(em, f.en + e); f.ate += e;
    var sp = fishSp(f);
    var maxSz = sp ? Math.max(sp.size * 1.35, sp.size + 0.3) : C.MAX_SIZE;
    var growMul = sp ? C.GROWTH * Math.max(0.25, Math.sqrt(sp.size) * 0.45) : C.GROWTH;
    var ns = Math.min(maxSz, f.sz + e * growMul);
    if (Math.floor(ns * 10) > Math.floor(f.sz * 10)) ev(f, 'grow', 'you grew: size ' + r2(ns));
    f.sz = ns; f.hp = Math.min(fishHpMax(f), f.hp + e * 0.12);
    ev(f, key, txt, e);
  }
  function inFront(f, t, half) { return Math.abs(relAngle(bearing(f.x, f.z, t.x, t.z), f.h)) <= half; }
  function npcDie(g, a, by) {
    var sp = SP[a.sp]; a.alive = false; a.rt = g.famine ? 0 : (sp.respawn || 0);
    g.carrion.push({ id: 'k' + (g.nextK++), x: a.x, z: a.z, d: a.d, sz: sp.size, en: 30 * sp.size, age: 0, of: a.id });
    if (by && by.n) by.npcKills++;
    addFeed(g, (by && by.n ? by.n + ' killed a ' : 'a ') + a.sp + (by && by.n ? '' : ' died'));
  }
  function applyDefense(g, f, a, sp) {
    var d = sp.defense; if (!d) return false; var mh = (sp.food && sp.food.minHunter) || 0;
    switch (d.type) {
      case 'poison': if (f.sz >= mh) return false; f.poison = Math.max(f.poison, 40); ev(f, 'poison:' + a.sp, 'the ' + a.sp + ' is toxic; you feel sick'); return true;
      case 'venom': if (f.sz >= mh) return false; f.poison = Math.max(f.poison, 60); hurt(g, f, d.dmg * 0.4, 'venom', 'venom:' + a.sp, 'the ' + a.sp + ' struck you with venom'); return true;
      case 'spines': if (f.sz >= mh) return false; hurt(g, f, d.dmg, 'spines', 'spines:' + a.sp, 'the ' + a.sp + ' has sharp spines: -' + d.dmg + ' hp'); return true;
      case 'shell': if (f.sz >= mh && sp.food && sp.food.e > 0) return false; ev(f, 'shell:' + a.sp, 'your teeth slide off the ' + a.sp + '\'s shell'); return true;
      case 'ink': if (rnd(g) < 0.55) { f.ink = 45; a.ink = g.tick; ev(f, 'ink', 'the ' + a.sp + ' squirted ink in your face and jetted away'); a.h = norm360(a.h + 180); a.tm = 24; a.st = 'flee'; return true; } return false;
      case 'pinch': hurt(g, f, d.dmg, 'bite', 'pinch', 'the ' + a.sp + ' pinched you: -' + d.dmg + ' hp'); return false;
      case 'bite': hurt(g, f, d.dmg, 'npc', 'npcbite:' + a.sp, 'the ' + a.sp + ' bit back: -' + d.dmg + ' hp', a); return true;
      case 'sting': return false;
    }
    return false;
  }
  function applyPlayerDefense(g, attacker, defender) {
    var sp = fishSp(defender); if (!sp || !sp.defense) return;
    var d = sp.defense;
    if (d.type === 'spines' && attacker.sz < defender.sz * 2.5) hurt(g, attacker, Math.round(d.dmg * 0.6), 'spines', 'pspine:' + defender.id, defender.n + '\'s spines pierced you: -' + Math.round(d.dmg * 0.6) + ' hp');
    else if (d.type === 'poison' && attacker.sz < defender.sz * 2.5) { attacker.poison = Math.max(attacker.poison, 35); ev(attacker, 'ppois:' + defender.id, defender.n + ' is toxic!'); }
    else if (d.type === 'venom') { attacker.poison = Math.max(attacker.poison, 45); hurt(g, attacker, Math.round(d.dmg * 0.3), 'venom', 'pven:' + defender.id, defender.n + ' envenomated you'); }
    else if (d.type === 'pinch') hurt(g, attacker, d.dmg, 'bite', 'ppinch:' + defender.id, defender.n + ' pinched you: -' + d.dmg + ' hp', defender);
    else if (d.type === 'ink' && rnd(g) < 0.55) { attacker.ink = Math.max(attacker.ink, 40); ev(attacker, 'pink', defender.n + ' blasted an ink cloud in your face!'); }
  }
  function tryBite(g, f, tgt) {
    if (f.cool > 0 || !tgt) return false;
    var o = tgt.o, r = fishReach(f) + (f.lunge > 0 ? 2.5 : 0), dd = dist3(f, o), mul = f.lunge > 0 ? 1.5 : 1, dmg;
    var rr = tgt.kind === 'npc' && SP[o.sp].kind === 'school' ? r + 6 : tgt.kind === 'plankton' ? r + o.r : tgt.kind === 'carrion' ? r + 2 + (o.sz > 15 ? 6 : 0) : r;
    if (dd > rr || !inFront(f, o, tgt.kind === 'fish' ? 70 : 110)) return false;
    if (tgt.kind === 'fish') {
      f.cool = C.BITE_CD; f.bites++; f.hid = false;
      var osp = fishSp(o), shellMul = osp && osp.defense && osp.defense.type === 'shell' ? 0.55 : 1;
      if (f.sz >= o.sz * C.SWALLOW_RATIO && f.sz >= 2.0) {
        kill(g, o, 'was swallowed whole by ' + f.n, f); o.hp = 0;
        ev(o, 'swal', 'you were swallowed whole by ' + f.n + ' (size ' + r1(f.sz) + ')');
        var swE = Math.min(80, 35 * o.sz);
        gain(g, f, swE, 'eatfish', 'you swallowed ' + o.n + ' whole');
        if ((f.role === 'shark' || f.role === 'predator') && o.role === 'fish') { f.fishKills = (f.fishKills || 0) + 1; f.hp = Math.min(fishHpMax(f), f.hp + fishHpMax(f) * 0.25); ev(f, 'apex:' + o.id, 'APEX HUNT! You caught fish agent ' + o.n + ' (+100 bonus)'); }
        return true;
      }
      var behind = Math.abs(relAngle(bearing(o.x, o.z, f.x, f.z), o.h)) > 130;
      dmg = Math.round(fishBiteDmg(f) * mul * shellMul * (behind ? 1.7 : 1) * (o.sz > f.sz * 1.3 && !behind ? 0.6 : 1));
      hurt(g, o, dmg, 'bite', 'bite:' + f.id, 'bitten by ' + f.n + ' (' + f.species + ', size ' + r1(f.sz) + ') from ' + (behind ? 'behind' : 'the ' + (relAngle(bearing(o.x, o.z, f.x, f.z), o.h) < 0 ? 'left' : 'right')) + ': -' + dmg + ' hp', f);
      applyPlayerDefense(g, f, o);
      ev(f, 'bite:' + o.id, 'you bit ' + o.n + ': -' + dmg + ' hp' + (o.alive ? ' (it has ~' + Math.round(o.hp / fishHpMax(o) * 100) + '% left, size ' + r1(o.sz) + ')' : ''), dmg);
      if (!o.alive) {
        gain(g, f, Math.min(90, 20 * o.sz), 'eatfish', 'you killed ' + o.n + ' and fed on it');
        if ((f.role === 'shark' || f.role === 'predator') && o.role === 'fish') { f.fishKills = (f.fishKills || 0) + 1; f.hp = Math.min(fishHpMax(f), f.hp + fishHpMax(f) * 0.25); ev(f, 'apex:' + o.id, 'APEX HUNT! You hunted fish agent ' + o.n + ' (+100 bonus)'); }
      }
      return true;
    }
    if (tgt.kind === 'npc') {
      var sp = SP[o.sp], fd = sp.food; f.cool = C.BITE_CD; f.bites++; f.hid = false;
      if (sp.kind === 'shark') { if (!o._hostileTo) o._hostileTo = {}; o._hostileTo[f.id] = g.tick + 400; }
      if (sp.kind === 'school') {
        var isFilter = !!OC.FILTER_FEEDERS[f.species];
        var pc = fd.catchP * (fd.bigPenalty && !isFilter && f.sz > fd.bigPenalty ? 0.5 : 1);
        if (fd.minHunter && f.sz < fd.minHunter) { ev(f, 'toofast:' + o.sp, 'the ' + o.sp + ' are too fast for you'); o.tm = 30; return true; }
        if (fd.maxHunter && !isFilter && f.sz > fd.maxHunter) { ev(f, 'toosmall:' + o.sp, 'the ' + o.sp + ' slip through your jaws; too small to bother'); return true; }
        if (sp.defense && sp.defense.type === 'ink' && rnd(g) < 0.35) { f.ink = 35; o.ink = g.tick; ev(f, 'ink', 'the squid inked the water'); }
        if (rnd(g) < pc) { var mouth = isFilter ? 6 : Math.min(3, 0.7 + 0.3 * f.sz); o.n -= Math.max(1, Math.round(mouth)); gain(g, f, fd.e * mouth, 'eat:' + o.sp, 'you caught ' + (mouth >= 1.5 ? 'several ' : 'a ') + o.sp); }
        else ev(f, 'miss:' + o.sp, 'the ' + o.sp + ' scattered; missed');
        o.tm = 30; o.st = 'flee'; return true;
      }
      var small = sp.size * C.SWALLOW_RATIO <= f.sz || (['static', 'wander', 'drift', 'crab', 'squid'].indexOf(sp.kind) >= 0 && sp.size < 1.0);
      if (small || (fd && fd.e > 0 && f.sz >= (fd.minHunter || 0) && sp.kind !== 'shark' && sp.kind !== 'pack' && sp.kind !== 'hunter' && sp.kind !== 'kraken' && sp.size * 1.2 <= f.sz)) {
        if (fd && fd.minHunter && f.sz < fd.minHunter && !(sp.defense && ['poison', 'venom', 'spines', 'shell'].indexOf(sp.defense.type) >= 0)) { ev(f, 'cant:' + o.sp, 'you cannot handle a ' + o.sp + ' at your size'); return true; }
        if (applyDefense(g, f, o, sp)) return true;
        if (!fd || !fd.e) { ev(f, 'inedible:' + o.sp, 'the ' + o.sp + ' is not food'); return true; }
        if (rnd(g) >= (fd.catchP || 1)) { ev(f, 'miss:' + o.sp, 'the ' + o.sp + ' got away'); o.st = 'flee'; o.tm = 24; return true; }
        o.alive = false; o.rt = g.famine ? 0 : (sp.respawn || 0); f.npcKills++; gain(g, f, fd.e, 'eat:' + o.sp, 'you ate a ' + o.sp); return true;
      }
      if (applyDefense(g, f, o, sp) && sp.defense.type !== 'bite') return true;
      dmg = Math.round(fishBiteDmg(f) * mul); o.hp -= dmg; o.bleed = 60;
      ev(f, 'fight:' + o.sp, 'you bit the ' + o.sp + ': -' + dmg + ' (it has ~' + Math.max(0, Math.round(o.hp / (sp.hp || hpMax(sp.size)) * 100)) + '% left)', dmg);
      if (o.hp <= 0) { npcDie(g, o, f); gain(g, f, Math.min(100, 20 * sp.size), 'eat:' + o.sp, 'you killed a ' + o.sp + ' and fed on it'); return true; }
      if (sp.prey) { o.st = 'hunt'; o.tg = f.id; o.sat = 0; var back = Math.round(sp.prey.dmg * 0.7); hurt(g, f, back, 'npc', 'npcbite:' + o.sp, 'the ' + o.sp + ' bit back: -' + back + ' hp', o); }
      else { o.st = 'flee'; o.tm = 40; }
      return true;
    }
    if (tgt.kind === 'plankton') {
      var filterOk = OC.FILTER_FEEDERS[f.species] || f.sz <= 2.5;
      if (!filterOk) { ev(f, 'plank', 'you cannot filter plankton with a mouth this size'); f.cool = C.BITE_CD; return true; }
      if (o.amt < 1) return false; f.cool = 2; var e = Math.min(o.amt, OC.FILTER_FEEDERS[f.species] ? 6.0 : 1.2); o.amt -= e; gain(g, f, e, 'plank', 'filter-feeding on plankton'); return true;
    }
    if (tgt.kind === 'carrion') { f.cool = 2; var scav = f.role === 'crab' ? 2.2 : 1.0; var ce = Math.min(o.en, (o.sz > 15 ? 2.5 : 1.5) * scav); o.en -= ce; gain(g, f, ce * (f.role === 'crab' ? 1.4 : 1), 'carr', 'you fed on a carcass'); return true; }
    if (tgt.kind === 'bloom') {
      if (f.species === 'sea turtle' || f.species === 'sunfish') { f.cool = 3; gain(g, f, 3.2, 'jellyeat', 'feasting on jellyfish'); return true; }
      if (f.sz > 1.5) { ev(f, 'jellybite', 'jellyfish are not worth the stings'); f.cool = C.BITE_CD; return true; }
      f.cool = 4; gain(g, f, 1.0, 'jellyeat', 'nibbling jellyfish'); return true;
    }
    if (tgt.kind === 'plant') { if (GRAZE_PLANTS[o.type] && (f.sz <= 2.4 || OC.HERBIVORES[f.species])) { f.cool = 4; gain(g, f, OC.HERBIVORES[f.species] ? 1.8 : 0.9, 'graze', 'grazing ' + o.type); return true; } if (o.type === 'anemone') { hurt(g, f, 4, 'anemone', 'anem', 'the anemone stung your mouth'); f.cool = C.BITE_CD; return true; } ev(f, 'plant', 'that is not food'); f.cool = C.BITE_CD; return true; }
    return false;
  }
  function nearestFood(g, f, rng) {
    var best = null, bd = 1e9, i, dd;
    function cons(kind, o, extra) { dd = dist3(f, o) - (extra || 0); if (dd < bd) { bd = dd; best = { kind: kind, o: o }; } }
    for (i = 0; i < g.npcs.length; i++) {
      var a = g.npcs[i]; if (!a.alive) continue; var sp = SP[a.sp]; if (!sp.food || !sp.food.e) continue;
      if (sp.defense && ['poison', 'venom', 'sting'].indexOf(sp.defense.type) >= 0) continue;
      if (sp.food.minHunter && f.sz < sp.food.minHunter) continue; if (sp.food.maxHunter && !OC.FILTER_FEEDERS[f.species] && f.sz > sp.food.maxHunter) continue;
      if (sp.kind === 'school') { if (a.n > 0) cons('npc', a, 6); }
      else if (sp.size * 1.2 <= f.sz || sp.size < 0.5) cons('npc', a, 0);
    }
    if (OC.FILTER_FEEDERS[f.species] || f.sz <= 2.5) for (i = 0; i < g.plankton.length; i++) if (g.plankton[i].amt >= 1) cons('plankton', g.plankton[i], g.plankton[i].r);
    for (i = 0; i < g.carrion.length; i++) cons('carrion', g.carrion[i], 2);
    return bd < (rng || 14) ? best : null;
  }

  // ── Player Fish Step ─────────────────────────────────────────────────────
  function stepFish(g, f) {
    var cmd = f.cmd, i, fsp = fishSp(f);
    f.inJelly = false;
    for (i = 0; i < g.blooms.length; i++) { var j = g.blooms[i]; if (Math.abs(f.d - j.d) < 15 && OC.dist2(f.x, f.z, j.x, j.z) < j.r * j.r) f.inJelly = true; }
    var idleT = (g.tick - f.lastCmdTick) * DT; f.idleWarn = idleT > C.IDLE_SEC * 0.6 ? Math.round(idleT) : 0;
    if (idleT > C.IDLE_SEC) { kill(g, f, 'went limp (no command for ' + C.IDLE_SEC + ' s)'); return; }
    if (g.tick > cmd.until && cmd.act !== 'hide') {
      if (cmd.speed !== 'rest' || cmd.act !== 'swim') ev(f, 'expired', 'your command expired; drifting');
      cmd.act = 'swim'; cmd.speed = 'rest'; cmd.goto = null; cmd.target = null;
    }
    var wantH = cmd.h, wantP = cmd.p, speedMode = cmd.speed, tgt = null;
    if (cmd.act === 'feed') {
      tgt = cmd.target ? findTarget(g, cmd.target) : nearestFood(g, f, 35);
      if (tgt && (tgt.kind === 'fish' || tgt.kind === 'place')) tgt = null;
      if (tgt && dist3(f, tgt.o) > 1.5) { wantH = bearing(f.x, f.z, tgt.o.x, tgt.o.z); wantP = clamp(Math.atan2(tgt.o.d - f.d, Math.max(distH(f, tgt.o), 0.5)) * R2D, -75, 75); }
    }
    if (cmd.act === 'hunt' || cmd.act === 'flee') {
      tgt = findTarget(g, cmd.target);
      var detect = tgt && (tgt.kind === 'fish' || tgt.kind === 'npc' ? canSee(g, f, tgt.o) >= 0 || dist3(f, tgt.o) < 12 : dist3(f, tgt.o) < 120);
      if (!tgt || !detect) { ev(f, 'lost', 'target ' + cmd.target + ' lost; swimming on'); cmd.act = 'swim'; cmd.target = null; tgt = null; }
      else {
        var b = bearing(f.x, f.z, tgt.o.x, tgt.o.z), dh = distH(f, tgt.o);
        wantP = clamp(Math.atan2(tgt.o.d - f.d, Math.max(dh, 0.5)) * R2D, -75, 75);
        if (cmd.act === 'flee') {
          if (fsp && fsp.defense && fsp.defense.type === 'ink' && f.st >= 20 && f.cool <= 0) {
            f.st -= 20; f.cool = 12;
            if (tgt.kind === 'fish') tgt.o.ink = Math.max(tgt.o.ink, 45);
            ev(f, 'inkburst', 'you released an ink cloud while fleeing!');
          }
          wantH = norm360(b + 180); wantP = -wantP * 0.5;
        }
        else { wantH = b; if (speedMode === 'rest') speedMode = 'cruise'; if (tgt.kind === 'place' && dist3(f, tgt.o) < 2.5) speedMode = 'rest'; }
      }
    } else if (cmd.goto) {
      var gd = distH(f, cmd.goto), gdd = cmd.goto.d !== null ? cmd.goto.d - f.d : 0;
      if (gd < 2.5 && Math.abs(gdd) < 2.5) { ev(f, 'arrived', 'arrived at goto'); cmd.goto = null; if (cmd.act === 'swim') cmd.speed = 'rest'; speedMode = 'rest'; }
      else { wantH = bearing(f.x, f.z, cmd.goto.x, cmd.goto.z); wantP = clamp(Math.atan2(gdd, Math.max(gd, 0.5)) * R2D, -75, 75); if (gd < 2.5) wantH = f.h; }
    }
    if (cmd.act === 'hide') speedMode = 'rest';
    if (cmd.act === 'feed' && speedMode === 'rest') speedMode = 'slow';
    if (f.held > 0) { speedMode = 'rest'; f.held--; }
    var tr = fishTurn(f) * DT; f.h = turnToward(f.h, wantH, tr); f.p = turnToward(f.p, wantP, tr); if (f.p > 180) f.p -= 360;
    var cold = f.d > OC.THERMO, mul = SPEEDS[speedMode] || 0, base = fishCruise(f);
    if (speedMode === 'sprint') { if (f.st > 0) { f.st = Math.max(0, f.st - 25 * DT); if (fsp) mul = fishSprint(f) / Math.max(0.1, base); } else mul = SPEEDS.fast; }
    else if (!OC.inDeadzone(f.x, f.z, f.d)) f.st = Math.min(100, f.st + (speedMode === 'fast' ? 2 : 8) * DT * (cold ? 0.7 : 1));
    var spd = base * mul * (cold && !(fsp && fsp.habitat && fsp.habitat.zone === 'abyss') ? 0.88 : 1);
    var kelp = OC.kelpAt(f.x, f.z, f.d); if (kelp) spd *= f.sz > 4 ? 0.5 : 0.75;
    if (OC.mangroveAt(f.x, f.z, f.d)) spd *= f.sz > 1.5 ? 0.4 : 0.8;
    if (f.inJelly) spd *= 0.85; if (f.held > 0) spd = 0;
    if (f.lunge > 0) { spd = Math.max(spd, base * 3.2); f.lunge--; }
    f.spd = spd;
    var cur = OC.currentAt(f.x, f.z, f.d), hr = f.h * D2R, pr = f.p * D2R;
    var vx = Math.sin(hr) * Math.cos(pr) * spd + cur.x, vz = -Math.cos(hr) * Math.cos(pr) * spd + cur.z, vd = Math.sin(pr) * spd + cur.d;
    var nx = clamp(f.x + vx * DT, 1, OC.W - 1), nz = clamp(f.z + vz * DT, 1, OC.L - 1), nd = f.d + vd * DT;

    // Keep players out of dry sandy beaches & mountains (floorAt < 1.2m)
    var nfl = floorAt(nx, nz);
    if (nfl < 1.2) {
      if (floorAt(nx, f.z) >= 1.2) { nz = f.z; nfl = floorAt(nx, nz); }
      else if (floorAt(f.x, nz) >= 1.2) { nx = f.x; nfl = floorAt(nx, nz); }
      else { nx = f.x; nz = f.z; nfl = floorAt(nx, nz); }
      ev(f, 'shore', 'the sandy beach stops you from swimming onto dry land');
    }
    var cv = OC.caveAt(nx, nz, nd);
    if (cv && f.sz > cv.maxSize && OC.caveAt(f.x, f.z, f.d) !== cv) { ev(f, 'cavesmall', 'the entrance of ' + cv.id + ' is too narrow for you (size ' + r1(f.sz) + ')'); nx = f.x; nz = f.z; nd = f.d; cv = null; }
    if (cv && cv !== f.cave) f.cave = cv; if (!cv) f.cave = null;
    if (!cv && nd > nfl - 0.4) { nd = Math.max(0.4, nfl - 0.4); if (f.p > 0) f.p = 0; }
    if (nd < 0.4) { nd = 0.4; if (f.p < 0) f.p = 0; } if (nd > OC.DMAX - 0.5) nd = OC.DMAX - 0.5;
    f.x = nx; f.z = nz; f.d = nd;
    if (f.cool > 0) f.cool--;
    var hi = hideInfo(f, g.tick);
    f.hid = cmd.act === 'hide' && f.spd < 0.5 && hi.ok;
    if (cmd.act === 'hide' && f.spd < 0.5 && hi.src && !hi.ok) ev(f, 'nohide', 'you cannot fit into the ' + hi.src + ' at your size');
    // Survival energy burn (capped cleanly for ocean giants so whales don't burn 50x faster)
    var massFactor = Math.min(8.5, Math.pow(Math.max(0.25, f.sz), 0.72));
    var drain = 0.064 * massFactor * (speedMode === 'rest' ? 1 : speedMode === 'slow' ? 1.32 : speedMode === 'cruise' ? 1.85 : speedMode === 'fast' ? 3.1 : 6.1) * DT;
    if (cold) drain *= 0.65; var vn = OC.ventAt(f.x, f.z, f.d); if (vn.dist < 14) drain *= 0.5;
    f.en -= drain; if (f.en <= 0) { f.en = 0; hurt(g, f, 2.2 * DT, 'starve', 'starve', 'you are starving: losing hp'); }
    // Air-breathing marine mammals & sea turtles surface to breathe
    if (fsp && fsp.breathes) {
      if (f.d < 1.8) f.air = Math.min(100, f.air + 20 * DT);
      else {
        var diveRate = f.species === 'whale' ? 0.25 : f.species === 'sea turtle' ? 0.3 : 0.45;
        f.air = Math.max(0, f.air - diveRate * DT);
        if (f.air < 20) ev(f, 'lowair', 'running low on air (' + Math.round(f.air) + '%) — surface above 1.8 m!');
        if (f.air <= 0) hurt(g, f, 1.5 * DT, 'deadzone', 'drown', 'out of breath underwater: surface now!');
      }
    }
    if (vn.dist < 4) hurt(g, f, 4 * DT, 'heat', 'heat', 'the water here is scalding: losing hp');
    if (OC.inDeadzone(f.x, f.z, f.d)) hurt(g, f, 0.65 * DT, 'deadzone', 'dead', 'it is hard to breathe here: losing hp');
    if (f.inJelly && f.sz > 1.5 && f.species !== 'sea turtle' && f.species !== 'sunfish') hurt(g, f, 1.6 * DT, 'jelly', 'jelly', 'stung by jellyfish: losing hp');
    if (hi.src === 'anemone' && !hi.ok && f.species !== 'clownfish') hurt(g, f, 1.1 * DT, 'anemone', 'anem', 'the anemone is stinging you');
    if (f.d < OC.SURFACE_ZONE && f.sz < 3 && isDay(g) && !hi.birdSafe && rnd(g) < 0.015) hurt(g, f, 25, 'bird', 'bird', 'something struck you from above: -25 hp');
    if (f.poison > 0) { f.poison--; hurt(g, f, 0.65, 'poison', 'poison', 'you feel sick: losing hp'); }
    if (f.bleed > 0) f.bleed--; if (f.ink > 0) f.ink--;
    if (!f.alive) return;
    var mHp = fishHpMax(f);
    OC.REEFS.forEach(function (rf) { var cw = rf.cleaner; if (f.spd < 0.5 && dist3(f, cw) < 4 && f.hp < mHp) { f.hp = Math.min(mHp, f.hp + 1.5 * DT); f.bleed = 0; f.poison = 0; ev(f, 'clean', 'cleaner wrasses are picking at your wounds: hp ' + Math.round(f.hp), 1.5 * DT); } });
    if (cmd.act === 'hunt' && tgt && tgt.kind !== 'place') tryBite(g, f, tgt);
    else if (cmd.act === 'feed') { if (!tgt || !tryBite(g, f, tgt)) { var nf = nearestFood(g, f); if (nf) tryBite(g, f, nf); } }
    else if (f.lunge > 0 || (cmd.act === 'swim' && cmd.target)) { var lt = findTarget(g, cmd.target); if (lt) tryBite(g, f, lt); }
    if (cmd.act === 'feed' && f.cool <= 0) {
      if ((OC.reefAt(f.x, f.z, f.d) || OC.seagrassAt(f.x, f.z, f.d) || OC.mangroveAt(f.x, f.z, f.d)) && (f.sz <= 1.6 || f.role === 'crab' || OC.HERBIVORES[f.species])) { f.cool = 4; gain(g, f, f.role === 'crab' ? 1.3 : 0.65, 'snail', 'you are picking snails, algae, and worms off the bottom'); }
      else if (vn.dist < 10 && vn.dist > 4) { f.cool = 4; gain(g, f, 0.9, 'mat', 'you are grazing the bacterial mat'); }
    }
  }

  // ── Lifelike NPC Movement & Steering ─────────────────────────────────────
  function moveNpc(g, a, sp, wantH, spd, wantD, opts) {
    opts = opts || {};
    var prevD = a.d, turnAmt = (opts.turn || 90) * DT;
    if (opts.faceH !== undefined) {
      a.h = turnToward(a.h, opts.faceH, turnAmt);
    } else {
      a.h = turnToward(a.h, wantH, turnAmt);
    }
    var travelR = (opts.moveH !== undefined ? opts.moveH : a.h) * D2R;
    var nx = clamp(a.x + Math.sin(travelR) * spd * DT, 2, OC.W - 2);
    var nz = clamp(a.z - Math.cos(travelR) * spd * DT, 2, OC.L - 2);
    var fl = floorAt(nx, nz);
    var minFl = opts.onBottom ? 1.0 : (sp.shallowOK || (sp.habitat && sp.habitat.zone === 'surface' ? 3 : sp.kind === 'shark' ? 14 : 2.5));
    var badShore = fl < minFl;
    var badShark = sp.kind === 'shark' && ((fl < (sp.shallowOK || 14) && fl < floorAt(a.x, a.z) + 0.05) || (OC.kelpAt(nx, nz, a.d) && !OC.kelpAt(a.x, a.z, a.d)) || (sp.size > 3 && OC.reefAt(nx, nz, a.d) && fl < 14 && !OC.reefAt(a.x, a.z, a.d)));
    if (badShore || badShark) {
      var toCenter = bearing(a.x, a.z, 320, 320);
      a.h = turnToward(a.h, norm360(toCenter + (rnd(g) - 0.5) * 70), Math.max(turnAmt * 2, 45));
      a.tm = Math.max(a.tm || 0, 8);
      if (badShore) { a.spd = spd * 0.2; return; }
    } else {
      a.x = nx; a.z = nz;
    }
    a.spd = spd;
    if (wantD !== undefined) a.d += clamp(wantD - a.d, -spd * DT * 0.85, spd * DT * 0.85);
    var curFl = floorAt(a.x, a.z);
    var minD = sp.habitat && sp.habitat.zone === 'surface' ? 0.35 : (opts.allowSurface ? 0.25 : 0.9);
    a.d = clamp(a.d, minD, Math.max(minD, curFl - (sp.kind === 'static' || opts.onBottom ? 0.35 : 1.0)));
    var horizStep = Math.max(0.05, spd * DT);
    var tgtP = opts.onBottom ? 0 : clamp(Math.atan2(a.d - prevD, horizStep) * R2D, -55, 55);
    a.p = (a.p || 0) + (tgtP - (a.p || 0)) * 0.35;
  }

  function detectPrey(g, a, sp, candidates) {
    var pr = sp.prey, best = null, bd = 1e9, i, ph = OC.phaseName(tSec(g)), twilight = ph === 'dusk' || ph === 'dawn';
    var act = twilight ? 1.25 : pr.active === 'any' ? 1 : (pr.active === 'night' ? (isNight(g) ? 1 : 0.45) : (isDay(g) ? 1 : 0.45));
    var isApexShark = (sp.kind === 'shark' && a.sp !== 'orca');
    for (i = 0; i < candidates.length; i++) {
      var f = candidates[i], fsz = f.sz || SP[f.sp].size; if (!f.alive) continue;
      if (f.sp && !(pr.huntsSharks && SP[f.sp].kind === 'shark') && !(pr.huntsNpc && pr.huntsNpc.indexOf(f.sp) >= 0)) continue;
      // Sharks treat shark-role player agents as packmates unless provoked!
      if (!f.sp && isApexShark && f.role === 'shark' && !(a._hostileTo && a._hostileTo[f.id] > g.tick)) continue;
      var isFishAgent = (!f.sp && (f.role === 'fish' || !f.role));
      if (!isFishAgent && fsz > pr.max && !pr.aggressive) continue;
      if (isFishAgent && sp.kind === 'shark' && fsz > pr.max * 1.45 && !pr.aggressive) continue;
      if (pr.minPrey && fsz < pr.minPrey) continue; if (pr.ignoreAbove && fsz >= pr.ignoreAbove) continue; if (pr.timid && fsz >= pr.timid) continue;
      var rng = pr.range * act * ((pr.prefer && f.sp && pr.prefer.indexOf(f.sp) >= 0) ? 3.5 : isFishAgent ? 1.45 : 1);
      var maxBox = Math.max(rng * 2.2, pr.smell || 100);
      if (Math.abs(a.x - f.x) > maxBox || Math.abs(a.z - f.z) > maxBox) continue;
      var dd = dist3(a, f), det = false;
      var hi = hideInfo(f, g.tick);
      if (pr.detect.indexOf('vision') >= 0 && dd < rng * visMul(g, f, a, pr.detect)) det = true;
      if (!det && pr.detect.indexOf('lateral') >= 0 && f.spd > 0.8 && dd < (isFishAgent ? 34 : 28) && !hi.solid) det = true;
      if (!det && pr.detect.indexOf('smell') >= 0 && f.bleed > 0 && dd < (pr.smell || 100)) det = true;
      if (!det && pr.detect.indexOf('echo') >= 0 && dd < rng && !hi.solid) det = true;
      if (!det && pr.detect.indexOf('electro') >= 0 && dd < (pr.electro || 16) && !hi.solid) det = true;
      if (det && hi.solid && !(pr.detect.indexOf('vision') >= 0 && hideInfo(a, g.tick).src === hi.src)) det = false;
      if (det && a.ban && a.ban.id === f.id && a.ban.until > g.tick) det = false;
      var ed = (pr.prefer && f.sp && pr.prefer.indexOf(f.sp) >= 0) ? dd * 0.01 : isFishAgent ? dd * 0.35 : dd;
      if (det && ed < bd) { bd = ed; best = f; }
    }
    return best;
  }

  function npcAttack(g, a, sp, f) {
    var pr = sp.prey, fsz = f.sz || SP[f.sp].size;
    if (f.sp) {
      var dmg = pr.dmg * 2; f.hp -= dmg; f.bleed = 80;
      if (f.hp <= 0) { npcDie(g, f, a); addFeed(g, 'the ' + a.sp + ' killed the ' + f.sp); a.sat = pr.satiety; a.st = 'rest'; a.tg = null; }
      a.cool = 8; return;
    }
    // Check player's natural species defense (spines, poison, ink, pinch, shell)
    var fsp = fishSp(f), shellMul = (fsp && fsp.defense && fsp.defense.type === 'shell') ? 0.55 : 1;
    if (fsz <= (pr.swallow || 0) && (!fsp || fsp.size <= (pr.swallow || 0))) {
      kill(g, f, 'was swallowed by a ' + a.sp); f.hp = 0; ev(f, 'npcswal', 'a ' + a.sp + ' swallowed you');
      a.sat = sp.kind === 'shark' ? Math.min(40, pr.satiety) : pr.satiety; a.st = sp.kind === 'shark' ? 'rest' : 'idle'; a.tg = null;
      if (a.pk) g.npcs.forEach(function (o) { if (o.pk === a.pk) { o.sat = Math.min(40, pr.satiety * 0.6); o.st = 'rest'; o.tg = null; } });
      return;
    }
    var hitDmg = Math.max(2, Math.round(pr.dmg * shellMul));
    hurt(g, f, hitDmg, 'npc', 'npcbite:' + a.sp, 'a ' + a.sp + ' bit you: -' + hitDmg + ' hp', a);
    if (fsp && fsp.defense) {
      var df = fsp.defense;
      if (df.type === 'ink' && rnd(g) < 0.55) { a.st = 'flee'; a.tm = 28; a.ink = g.tick; a.h = norm360(a.h + 180); ev(f, 'inknpc', 'you inked the attacking ' + a.sp + ' and escaped!'); }
      else if (df.type === 'spines' || df.type === 'venom' || df.type === 'pinch') { a.hp -= df.dmg; a.bleed = 30; ev(f, 'defnpc', 'your ' + df.type + ' hurt the ' + a.sp + '!'); if (a.hp <= 0) npcDie(g, a, f); }
    }
    if (!f.alive) { a.sat = sp.kind === 'shark' ? Math.min(40, pr.satiety) : pr.satiety; a.st = sp.kind === 'shark' ? 'rest' : 'idle'; a.tg = null; }
    else if (pr.hold) { f.held = pr.hold; ev(f, 'held', 'the ' + a.sp + ' is holding you with its tentacles/jaws'); }
    a.cool = 8;
  }

  // ── Schooling fish & squid shoals ────────────────────────────────────────
  function stepSchool(g, a, sp) {
    if (a.n <= 0) { if (!g.famine && rnd(g) < 0.0025) a.n = Math.round(sp.n * 0.35); return; }
    var threat = null, td = 1e9, i, f;
    for (i = 0; i < g.fish.length; i++) {
      f = g.fish[i]; if (!f.alive || f.spd < 0.3) continue;
      if (Math.abs(a.x - f.x) > 18 || Math.abs(a.z - f.z) > 18) continue;
      var dd = dist3(a, f); if (dd < 18 && dd < td) { td = dd; threat = f; }
    }
    if (!threat && g._preds && ((g.tick + a.ph) & 1) === 0) {
      for (i = 0; i < g._preds.length; i++) {
        var prd = g._preds[i];
        if (Math.abs(a.x - prd.x) > 24 || Math.abs(a.z - prd.z) > 24) continue;
        var dp = dist3(a, prd); if (dp < 24 && dp < td) { td = dp; threat = prd; }
      }
    }
    var spd = sp.speed, want = a.h;
    if (threat) {
      want = norm360(bearing(a.x, a.z, threat.x, threat.z) + 180 + (rnd(g) - 0.5) * 60);
      spd = sp.flee; a.tm = 24; a.st = 'flee';
    } else if (a.tm > 0) {
      a.tm--; want = a.h + Math.sin(g.tick * 0.4 + a.ph) * 20; spd = sp.flee * 0.78; a.st = 'flee';
    } else {
      a.st = 'school';
      var homeD = distH(a, { x: a.hx, z: a.hz });
      want = homeD > 55 ? bearing(a.x, a.z, a.hx, a.hz) : norm360(a.h + Math.sin(g.tick * 0.08 + a.ph) * 14 + (rnd(g) - 0.5) * 18);
    }
    // Squid schools pulse rhythmically via jet propulsion!
    if (sp.pulse === 'jet') {
      var jet = 0.52 + 1.05 * Math.pow(Math.max(0, Math.sin(g.tick * 0.55 + a.ph)), 2);
      spd *= jet;
    }
    var wd = sp.dayD !== undefined ? (isNight(g) ? sp.nightD : sp.dayD) : a.hd;
    if (sp.gather && OC.phaseName(tSec(g)) === sp.gather.phase && !threat && a.tm <= 0) {
      var gd = distH(a, sp.gather);
      if (gd > 15) { want = bearing(a.x, a.z, sp.gather.x, sp.gather.z); spd = sp.speed * 1.4; }
      else { want = norm360(a.h + 24); spd = sp.speed * 0.55; }
      wd = sp.gather.d;
      if (!g.gatherTold && gd < 40) { g.gatherTold = g.tick; addFeed(g, sp.gather.note); }
    }
    if (sp.gather && g.gatherTold && g.tick - g.gatherTold > 2000) g.gatherTold = 0;
    moveNpc(g, a, sp, want, spd, wd + Math.sin(g.tick * 0.09 + a.ph) * 1.2, { turn: 125 });
    if (!g.famine && isNight(g) && a.n < sp.n && rnd(g) < 0.05) a.n++;
  }

  // ── Crustaceans (Sideways-scuttling Crabs & Tail-flipping Lobsters!) ─────
  function stepCrustacean(g, a, sp) {
    if (a.cool > 0) a.cool--;
    if (a.dir === undefined) a.dir = rnd(g) < 0.5 ? 1 : -1;
    var night = isNight(g), asleep = sp.nocturnal && isDay(g);
    var threat = null, td = 1e9, i;
    for (i = 0; i < g.fish.length; i++) {
      var f = g.fish[i]; if (!f.alive || f.sz < sp.size * 1.2) continue;
      if (Math.abs(a.x - f.x) > 11 || Math.abs(a.z - f.z) > 11) continue;
      var dd = dist3(a, f); if (dd < 11 && dd < td) { td = dd; threat = f; }
    }
    if (!threat && g._preds && ((g.tick + a.ph) & 1) === 0) {
      for (i = 0; i < g._preds.length; i++) {
        var p = g._preds[i];
        if (Math.abs(a.x - p.x) > 11 || Math.abs(a.z - p.z) > 11) continue;
        var dp = dist3(a, p); if (dp < 11 && dp < td) { td = dp; threat = p; }
      }
    }

    // 1. Threat reaction: crabs freeze/raise claws or scuttle laterally away; lobsters tail-flip!
    if (threat) {
      var away = norm360(bearing(a.x, a.z, threat.x, threat.z) + 180);
      if (sp.tailFlip && td < 9) {
        a.st = 'flee'; a.tm = 18;
        moveNpc(g, a, sp, away, sp.flee, floorAt(a.x, a.z) - 0.35, { onBottom: true, turn: 240, faceH: bearing(a.x, a.z, threat.x, threat.z) });
        return;
      }
      if (td < 4.5 && sp.crabWalk) {
        a.st = 'freeze'; a.spd = 0;
        a.h = turnToward(a.h, bearing(a.x, a.z, threat.x, threat.z), 180 * DT);
        return;
      }
      if (sp.crabWalk) {
        a.st = 'flee'; a.tm = 16;
        var face = bearing(a.x, a.z, threat.x, threat.z);
        var sideMove = norm360(face + (relAngle(away, face) >= 0 ? 85 : -85));
        moveNpc(g, a, sp, face, sp.flee, floorAt(a.x, a.z) - 0.35, { onBottom: true, turn: 160, faceH: face, moveH: sideMove });
        return;
      }
    }
    if (a.tm > 0) { a.tm--; }
    if (asleep && rnd(g) < 0.92) { a.st = 'idle'; a.spd = 0; return; }

    // 2. Scavenge nearby carrion on the bottom
    var bk = null, bq = 48;
    for (i = 0; i < g.carrion.length; i++) {
      var k = g.carrion[i];
      if (Math.abs(a.x - k.x) > 48 || Math.abs(a.z - k.z) > 48) continue;
      var kd = dist3(a, k);
      if (kd < bq && k.d > floorAt(k.x, k.z) - 6) { bq = kd; bk = k; }
    }
    if (bk) {
      a.st = 'scavenge';
      var bCar = bearing(a.x, a.z, bk.x, bk.z);
      if (bq < 2.2) { a.spd = 0.05; bk.en = Math.max(0, bk.en - 0.25); return; }
      if (sp.crabWalk) {
        var faceC = norm360(bCar - 90 * a.dir);
        moveNpc(g, a, sp, faceC, sp.speed * 1.15, floorAt(a.x, a.z) - 0.35, { onBottom: true, turn: 120, faceH: faceC, moveH: bCar });
      } else {
        moveNpc(g, a, sp, bCar, sp.speed * 1.15, floorAt(a.x, a.z) - 0.35, { onBottom: true, turn: 120 });
      }
      return;
    }

    // 3. Natural burst-and-pause sideways foraging scuttle
    var burst = Math.sin(g.tick * 0.22 + a.ph);
    if (burst < -0.25) { a.st = 'forage'; a.spd = 0; return; }
    if (rnd(g) < 0.03) a.dir = -a.dir;
    var far = distH(a, { x: a.hx, z: a.hz }) > 26;
    var moveH = far ? bearing(a.x, a.z, a.hx, a.hz) : norm360((a.mh !== undefined ? a.mh : a.h) + (rnd(g) - 0.5) * 45);
    a.mh = moveH;
    a.st = 'scuttle';
    var spd = sp.speed * (0.65 + 0.55 * Math.max(0, burst));
    if (sp.crabWalk) {
      var faceBody = norm360(moveH - 90 * a.dir);
      moveNpc(g, a, sp, faceBody, spd, floorAt(a.x, a.z) - 0.35, { onBottom: true, turn: 110, faceH: faceBody, moveH: moveH });
    } else {
      moveNpc(g, a, sp, moveH, spd, floorAt(a.x, a.z) - 0.35, { onBottom: true, turn: 100 });
    }
  }

  // ── Smart Cephalopods: Squid, Cuttlefish, Nautilus ───────────────────────
  function stepSquid(g, a, sp) {
    if (a.cool > 0) a.cool--; if (a.sat > 0) a.sat--;
    var night = isNight(g), twilight = OC.phaseName(tSec(g)) === 'dusk' || OC.phaseName(tSec(g)) === 'dawn';
    var threat = null, td = 1e9, i;
    for (i = 0; i < g.fish.length; i++) {
      var f = g.fish[i]; if (!f.alive || f.sz < sp.size * 1.35) continue;
      if (Math.abs(a.x - f.x) > 18 || Math.abs(a.z - f.z) > 18) continue;
      var dd = dist3(a, f); if (dd < 18 && dd < td) { td = dd; threat = f; }
    }
    if (!threat && g._preds && ((g.tick + a.ph) & 1) === 0) {
      for (i = 0; i < g._preds.length; i++) {
        var p = g._preds[i]; if (p === a || SP[p.sp].size < sp.size * 1.6) continue;
        if (Math.abs(a.x - p.x) > 22 || Math.abs(a.z - p.z) > 22) continue;
        var dp = dist3(a, p); if (dp < 22 && dp < td) { td = dp; threat = p; }
      }
    }
    if (threat && td < 16) {
      if (sp.defense && sp.defense.type === 'ink' && td < 7 && !threat.sp && (threat.ink || 0) <= 0 && rnd(g) < 0.25) {
        threat.ink = 32; a.ink = g.tick; ev(threat, 'ink', 'the ' + a.sp + ' blasted ink and jetted away');
      }
      a.st = 'jet'; a.tm = 20;
      var esc = norm360(bearing(a.x, a.z, threat.x, threat.z) + 180 + (rnd(g) - 0.5) * 40);
      var jetBurst = (sp.flee || sp.sprint || sp.speed * 2.5) * (0.7 + 0.6 * Math.abs(Math.sin(g.tick * 0.7 + a.ph)));
      moveNpc(g, a, sp, esc, jetBurst, clamp(a.d + (rnd(g) - 0.5) * 6, 3, floorAt(a.x, a.z) - 2), { turn: 200 });
      return;
    }

    // Humboldt squid hunts fish & smaller schools at night/twilight
    if (sp.prey && a.sat <= 0 && (night || twilight || isDay(g) && a.d > 40)) {
      var prey = detectPrey(g, a, sp, g.fish);
      if (prey) {
        a.st = 'hunt'; a.tg = prey.id; var pdd = dist3(a, prey);
        if (pdd < reach(sp.size) + 0.8 && a.cool <= 0) { npcAttack(g, a, sp, prey); return; }
        var jSpd = (pdd < 18 ? sp.sprint : sp.speed * 1.25) * (0.65 + 0.7 * Math.pow(Math.max(0, Math.sin(g.tick * 0.65 + a.ph)), 2));
        moveNpc(g, a, sp, bearing(a.x, a.z, prey.x, prey.z), jSpd, prey.d, { turn: 165 });
        return;
      }
    }

    // Cuttlefish hover & camouflage near reefs/seagrass
    if (sp.pulse === 'fin') {
      if (Math.sin(g.tick * 0.07 + a.ph) > 0.55) { a.st = 'camo'; a.spd = 0.15; return; }
      a.st = 'forage';
      var farC = distH(a, { x: a.hx, z: a.hz }) > 32;
      var wantC = farC ? bearing(a.x, a.z, a.hx, a.hz) : norm360(a.h + Math.sin(g.tick * 0.15 + a.ph) * 28);
      moveNpc(g, a, sp, wantC, sp.speed * 0.75, clamp(floorAt(a.x, a.z) - 2.2, 2, 26), { turn: 110 });
      return;
    }

    // Rhythmic jet-pulse migration (nautilus / humboldt squid)
    a.st = 'patrol'; a.tg = null;
    var wantD = sp.dayD !== undefined ? (night ? sp.nightD : sp.dayD) : a.hd;
    var farS = distH(a, { x: a.hx, z: a.hz }) > 70;
    var wantH = farS ? bearing(a.x, a.z, a.hx, a.hz) : norm360(a.h + Math.sin(g.tick * 0.12 + a.ph) * 18);
    var pulse = 0.55 + 1.05 * Math.pow(Math.max(0, Math.sin(g.tick * 0.5 + a.ph)), 2);
    moveNpc(g, a, sp, wantH, sp.speed * pulse, wantD + Math.sin(g.tick * 0.08 + a.ph) * 3, { turn: 130 });
  }

  // ── Intelligent Den-to-Den Octopus ────────────────────────────────────────
  function stepOctopus(g, a, sp) {
    if (a.cool > 0) a.cool--; if (a.sat > 0) a.sat--;
    var i, threat = null, td = 1e9;
    for (i = 0; i < g.fish.length; i++) {
      var f = g.fish[i]; if (!f.alive || f.sz < 1.8) continue;
      if (Math.abs(a.x - f.x) > 14 || Math.abs(a.z - f.z) > 14) continue;
      var dd = dist3(a, f); if (dd < 14 && dd < td) { td = dd; threat = f; }
    }
    if (!threat && g._preds && ((g.tick + a.ph) & 1) === 0) for (i = 0; i < g._preds.length; i++) {
      var p = g._preds[i]; if (SP[p.sp].size > 1.8) {
        if (Math.abs(a.x - p.x) > 16 || Math.abs(a.z - p.z) > 16) continue;
        var dp = dist3(a, p); if (dp < 16 && dp < td) { td = dp; threat = p; }
      }
    }
    if (threat && td < 12) {
      if (td < 6 && !threat.sp && (threat.ink || 0) <= 0 && rnd(g) < 0.35) { threat.ink = 36; a.ink = g.tick; ev(threat, 'ink', 'the octopus squirted ink and bolted into cover'); }
      a.st = 'jet';
      moveNpc(g, a, sp, norm360(bearing(a.x, a.z, threat.x, threat.z) + 180), sp.flee, floorAt(a.x, a.z) - 0.6, { onBottom: true, turn: 210 });
      return;
    }
    var prey = a.sat > 0 ? null : detectPrey(g, a, sp, g.fish);
    if (prey) {
      a.st = 'hunt'; a.tg = prey.id; var pdd = dist3(a, prey);
      if (pdd < reach(sp.size) + 0.6 && a.cool <= 0) npcAttack(g, a, sp, prey);
      else moveNpc(g, a, sp, bearing(a.x, a.z, prey.x, prey.z), sp.sprint, prey.d, { onBottom: true, turn: 180 });
      return;
    }
    if (Math.sin(g.tick * 0.09 + a.ph) > 0.35) { a.st = 'camo'; a.spd = 0; return; }
    a.st = 'forage';
    var farO = distH(a, { x: a.hx, z: a.hz }) > 24;
    var wantO = farO ? bearing(a.x, a.z, a.hx, a.hz) : norm360(a.h + (rnd(g) - 0.5) * 40);
    moveNpc(g, a, sp, wantO, sp.speed * 0.85, floorAt(a.x, a.z) - 0.5, { onBottom: true, turn: 130 });
  }

  // ── Giant Squid ("orjaški ligenj") — Abyssal Canyon Leviathan ─────────────
  function stepGiantSquid(g, a, sp) {
    if (a.cool > 0) a.cool--; if (a.sat > 0) a.sat--;
    var night = isNight(g);
    var cands = g.fish;
    if (a.sat <= 0 && g._preds) {
      cands = g.fish.concat(g._preds.filter(function (o) { return o !== a && o.sp !== 'whale' && o.sp !== 'whale calf' && SP[o.sp].size <= 7 && dist3(a, o) < 75; }));
    }
    var prey = a.sat > 0 ? null : detectPrey(g, a, sp, cands);
    // Low-HP ink burst retreat deeper into abyss
    if (a.hp < sp.hp * 0.35 && a.tm <= 0) {
      a.st = 'jet'; a.tm = 32; a.ink = g.tick;
      for (var fi = 0; fi < g.fish.length; fi++) if (g.fish[fi].alive && dist3(a, g.fish[fi]) < 22) g.fish[fi].ink = Math.max(g.fish[fi].ink, 45);
      addFeed(g, 'the giant squid erupts in ink and retreats into the abyss!');
    }
    if (a.tm > 0) {
      a.tm--;
      moveNpc(g, a, sp, bearing(a.x, a.z, OC.ABYSS.x, OC.ABYSS.z), sp.sprint, 128, { turn: 150 });
      return;
    }
    if (prey) {
      a.st = 'hunt'; a.tg = prey.id;
      var dd = dist3(a, prey);
      var tentReach = 11.5; // long feeding tentacles!
      if (dd < tentReach && a.cool <= 0) {
        if (!prey.sp && dd > 5) {
          // Pull gripped fish gently inward toward beak
          prey.x = r2(prey.x + (a.x - prey.x) * 0.35);
          prey.z = r2(prey.z + (a.z - prey.z) * 0.35);
          prey.d = r2(prey.d + (a.d - prey.d) * 0.35);
        }
        npcAttack(g, a, sp, prey);
        return;
      }
      var pulseH = 0.72 + 0.68 * Math.pow(Math.max(0, Math.sin(g.tick * 0.6 + a.ph)), 2);
      var hSpd = (dd < 34 ? sp.sprint : sp.speed * 1.45) * pulseH;
      moveNpc(g, a, sp, bearing(a.x, a.z, prey.x, prey.z), hSpd, prey.d, { turn: 135 });
      return;
    }
    a.st = 'patrol'; a.tg = null;
    // Diel vertical patrol in the Giant Squid Abyssal Canyon
    var orbitR = 54, ang = g.tick * 0.015 + a.ph * 0.1;
    var tx = OC.ABYSS.x + Math.cos(ang) * orbitR, tz = OC.ABYSS.z + Math.sin(ang * 1.3) * orbitR;
    var patrolD = (night ? 56 : 102) + Math.sin(g.tick * 0.025) * 14;
    var pulseP = 0.6 + 0.85 * Math.pow(Math.max(0, Math.sin(g.tick * 0.42 + a.ph)), 2);
    moveNpc(g, a, sp, bearing(a.x, a.z, tx, tz), sp.speed * pulseP, clamp(patrolD, 45, floorAt(tx, tz) - 4), { turn: 75 });
  }

  // ── Wander / Ambush / Hunter ─────────────────────────────────────────────
  function stepWander(g, a, sp) {
    var i, threat = null, td = 1e9;
    if (sp.flee) for (i = 0; i < g.fish.length; i++) { var f = g.fish[i]; if (!f.alive || f.sz < sp.size * 0.8 || f.spd < 0.3) continue; var dd = dist3(a, f); if (dd < 11 && dd < td) { td = dd; threat = f; } }
    var night = isNight(g), asleep = (sp.sleepsNight && night) || (sp.nocturnal && !night);
    if (sp.breathes) {
      if (a.breath === undefined) a.breath = Math.floor(rnd(g) * 450);
      a.breath++;
      if (a.breath > 650) {
        a.st = 'surfacing';
        moveNpc(g, a, sp, a.h + 2, sp.speed * 1.15, 0.5, { turn: 45, allowSurface: true });
        if (a.d < 1.3) a.breath = 0;
        return;
      }
    }
    if (sp.eatsJellies && g.blooms.length) {
      var bl = g.blooms[0], bdd = 1e9;
      g.blooms.forEach(function (b) { var q = dist3(a, b); if (q < bdd) { bdd = q; bl = b; } });
      if (bdd > 10) { moveNpc(g, a, sp, bearing(a.x, a.z, bl.x, bl.z), sp.speed, bl.d, { turn: 75 }); return; }
      if (bl.n > 5 && rnd(g) < 0.01) bl.n--;
      a.st = 'forage'; a.spd = 0.25; return;
    }
    if (threat && !asleep) { a.st = 'flee'; a.tm = 20; moveNpc(g, a, sp, norm360(bearing(a.x, a.z, threat.x, threat.z) + 180), sp.flee, a.d, { turn: 165 }); return; }
    if (a.st === 'flee' && a.tm > 0) { a.tm--; moveNpc(g, a, sp, a.h, sp.flee * 0.8, a.d); return; }
    a.st = 'idle';
    if (asleep || (sp.buried && Math.sin(g.tick * 0.05 + a.ph) < 0.7)) { a.spd = 0; return; }
    var far = distH(a, { x: a.hx, z: a.hz }) > 32, want = far ? bearing(a.x, a.z, a.hx, a.hz) : norm360(a.h + Math.sin(g.tick * 0.07 + a.ph) * 20 + (rnd(g) - 0.5) * 35);
    var onB = sp.habitat.zone === 'bottom' || sp.habitat.zone === 'reef' || sp.habitat.zone === 'seagrass' || sp.buried;
    moveNpc(g, a, sp, want, sp.speed * (0.55 + rnd(g) * 0.45), onB ? floorAt(a.x, a.z) - 0.4 : a.hd + Math.sin(g.tick * 0.04 + a.ph) * 2.5, { onBottom: onB, turn: 85 });
  }

  function stepAmbush(g, a, sp) {
    if (a.cool > 0) a.cool--;
    if (a.sat > 0) { a.sat--; a.spd = 0; if (distH(a, { x: a.hx, z: a.hz }) > 2) moveNpc(g, a, sp, bearing(a.x, a.z, a.hx, a.hz), sp.speed, a.hd); return; }
    var prey = detectPrey(g, a, sp, g.fish);
    if (prey && dist3(a, prey) < sp.prey.range) {
      a.st = 'hunt'; a.tg = prey.id; var dd = dist3(a, prey);
      if (dd < reach(sp.size) + 0.5 && a.cool <= 0) npcAttack(g, a, sp, prey);
      else if (distH(a, { x: a.hx, z: a.hz }) < sp.prey.range * 1.25) moveNpc(g, a, sp, bearing(a.x, a.z, prey.x, prey.z), sp.sprint || sp.speed * 2.5, prey.d, { turn: 200 });
      return;
    }
    a.st = 'idle'; a.tg = null; a.spd = 0;
    if (distH(a, { x: a.hx, z: a.hz }) > 2) moveNpc(g, a, sp, bearing(a.x, a.z, a.hx, a.hz), sp.speed, a.hd);
  }

  function stepHunter(g, a, sp) {
    if (a.cool > 0) a.cool--; if (a.sat > 0) a.sat--;
    if (sp.breathes) {
      if (a.breath === undefined) a.breath = Math.floor(rnd(g) * 400);
      a.breath++;
      if (a.breath > 520) {
        a.st = 'surfacing';
        moveNpc(g, a, sp, a.h + 5, sp.speed * 1.1, 0.45, { turn: 70, allowSurface: true });
        if (a.d < 1.2) a.breath = 0;
        return;
      }
    }
    var prey = a.sat > 0 ? null : detectPrey(g, a, sp, g.fish);
    if (!prey && a.sat <= 0 && g._schools) {
      var bs = null, bd = 1e9;
      for (var i = 0; i < g._schools.length; i++) {
        var o = g._schools[i];
        if (o.alive && o.n > 0 && SP[o.sp].size < sp.size * 0.55) {
          var q = dist3(a, o); if (q < 65 && q < bd) { bd = q; bs = o; }
        }
      }
      if (bs) {
        moveNpc(g, a, sp, bearing(a.x, a.z, bs.x, bs.z), sp.speed * 1.35, bs.d, { turn: 130 });
        if (bd < 6 && rnd(g) < 0.06) { bs.n = Math.max(0, bs.n - 1); bs.tm = 20; if (rnd(g) < 0.25) a.sat = sp.prey.satiety * 0.3; }
        a.st = 'forage'; return;
      }
    }
    if (prey) {
      a.st = 'hunt'; a.tg = prey.id; var dd = dist3(a, prey);
      if (dd < reach(sp.size) + 0.6 && a.cool <= 0) npcAttack(g, a, sp, prey);
      else moveNpc(g, a, sp, bearing(a.x, a.z, prey.x, prey.z), dd < 25 ? (sp.sprint || sp.speed * 2) : sp.speed * 1.25, prey.d, { turn: 165 });
      return;
    }
    a.st = 'patrol'; a.tg = null;
    if (!a.wpt || distH(a, a.wpt) < 8) { var p = spawnPos(g, sp, Math.floor(rnd(g) * 6)); a.wpt = { x: p.x, z: p.z, d: p.d }; }
    var cruiseM = 0.88 + 0.24 * Math.sin(g.tick * 0.14 + a.ph);
    moveNpc(g, a, sp, bearing(a.x, a.z, a.wpt.x, a.wpt.z) + Math.sin(g.tick * 0.08 + a.ph) * 10, sp.speed * cruiseM, a.wpt.d + Math.sin(g.tick * 0.05 + a.ph) * 2.5, { turn: 95 });
  }

  // ── Smart Dolphin Pod AI: Porpoising, Baitball Herding & Pincer Flanking ──
  function stepPack(g, a, sp) {
    var members = [], leader = null, i;
    for (i = 0; i < g.npcs.length; i++) { var o = g.npcs[i]; if (o.pk === a.pk && o.alive) members.push(o); }
    leader = members[0] || a;
    var myIdx = members.indexOf(a);
    if (a.cool > 0) a.cool--; if (a.sat > 0) a.sat--;
    if (a.breath === undefined) a.breath = Math.floor(rnd(g) * 240);
    a.breath++;

    // Graceful pod porpoise / surfacing breath every ~40-60s
    if (a.breath > 200 && a.st !== 'hunt') {
      a.st = 'porpoise';
      moveNpc(g, a, sp, a.h + 4, sp.speed * 1.25, 0.3, { turn: 90, allowSurface: true });
      if (a.d < 1.1) { a.breath = 0; a.breach = g.tick; }
      return;
    }

    var shared = null;
    if (leader && leader.tg && leader.st === 'hunt') shared = findTarget(g, leader.tg);
    var prey = (shared && shared.o.alive) ? shared.o : (a.sat > 0 ? null : detectPrey(g, a, sp, g.fish));
    if (prey && (prey.sz || 0) <= sp.prey.max) {
      a.st = 'hunt'; a.tg = prey.id; var dd = dist3(a, prey);
      // Predictive intercept + flanking pincer!
      var leadT = Math.min(2.0, dd / Math.max(2, sp.sprint));
      var px = prey.x + Math.sin((prey.h || 0) * D2R) * (prey.spd || 0) * leadT;
      var pz = prey.z - Math.cos((prey.h || 0) * D2R) * (prey.spd || 0) * leadT;
      var tx = px, tz = pz;
      if (dd > 11 && myIdx > 0) {
        var flank = (myIdx % 2 === 1 ? 1 : -1) * 75;
        var fb = norm360(bearing(prey.x, prey.z, a.x, a.z) + flank);
        tx = px + Math.sin(fb * D2R) * 8; tz = pz - Math.cos(fb * D2R) * 8;
      }
      if (dd < reach(sp.size) + 0.7 && a.cool <= 0) npcAttack(g, a, sp, prey);
      else moveNpc(g, a, sp, bearing(a.x, a.z, tx, tz), dd < 32 ? sp.sprint : sp.speed * 1.35, prey.d, { turn: 190 });
      return;
    }

    // Cooperative baitball herding when schools nearby!
    if (a.sat <= 0 && g._schools) {
      var bs = null, bsd = 75;
      for (i = 0; i < g._schools.length; i++) {
        var sc = g._schools[i];
        if (sc.alive && sc.n > 20 && SP[sc.sp].size <= 0.7) {
          var q = dist3(a, sc); if (q < bsd) { bsd = q; bs = sc; }
        }
      }
      if (bs) {
        a.st = 'herd';
        var orbAng = g.tick * 0.14 + myIdx * (TAU / Math.max(1, members.length));
        var ring = bsd < 16 && (g.tick % 40) < 10 ? 1.5 : 11; // tighten & dart through!
        var hx = bs.x + Math.cos(orbAng) * ring, hz = bs.z + Math.sin(orbAng) * ring;
        moveNpc(g, a, sp, bearing(a.x, a.z, hx, hz), sp.speed * 1.3, bs.d, { turn: 165 });
        if (bsd < 6 && rnd(g) < 0.08) { bs.n = Math.max(0, bs.n - 2); bs.tm = 24; if (rnd(g) < 0.2) a.sat = 40; }
        return;
      }
    }

    // Scenic coordinated pod cruise
    a.st = 'patrol'; a.tg = null;
    if (a === leader) {
      if (!a.wpt || distH(a, a.wpt) < 12) { var p = spawnPos(g, sp, Math.floor(rnd(g) * 6)); a.wpt = { x: p.x, z: p.z, d: clamp(p.d, 3, 22) }; }
      var wH = bearing(a.x, a.z, a.wpt.x, a.wpt.z) + Math.sin(g.tick * 0.06 + a.ph) * 12;
      moveNpc(g, a, sp, wH, sp.speed * (0.9 + 0.2 * Math.sin(g.tick * 0.1)), a.wpt.d + Math.sin(g.tick * 0.12) * 3, { turn: 100 });
    } else {
      var side = myIdx % 2 === 1 ? 1 : -1, rank = Math.ceil(myIdx / 2);
      var ang = leader.h + 148 * side;
      var lx = leader.x + Math.sin(ang * D2R) * (5 + rank * 3.5), lz = leader.z - Math.cos(ang * D2R) * (5 + rank * 3.5);
      var ld = distH(a, { x: lx, z: lz });
      moveNpc(g, a, sp, ld > 2.5 ? bearing(a.x, a.z, lx, lz) : leader.h, ld > 14 ? sp.speed * 1.55 : sp.speed * 1.02, clamp(leader.d + Math.sin(g.tick * 0.15 + myIdx) * 1.4, 0.8, 30), { turn: 120 });
    }
  }

  // ── Sharks & Orcas ───────────────────────────────────────────────────────
  function stepShark(g, a, sp) {
    var pr = sp.prey, i;
    if (a.cool > 0) a.cool--; if (a.tm > 0) a.tm--;
    if (a.sprint > 0) { a.sprint--; if (a.sprint === 0) a.tired = sp.tiredT; } else if (a.tired > 0) a.tired--;
    if (a.sat > 0) {
      a.sat--; a.st = 'rest'; a.tg = null;
      var rp = sp.rest;
      if (distH(a, { x: rp[0], z: rp[1] }) > 12) moveNpc(g, a, sp, bearing(a.x, a.z, rp[0], rp[1]), sp.speed * 0.65, rp[2]);
      else moveNpc(g, a, sp, a.h + 6, 0.7, rp[2], { turn: 40 });
      return;
    }
    var cands = g.fish;
    if (pr.huntsSharks) cands = g.fish.concat(g.npcs.filter(function (o) { return o.alive && (SP[o.sp].kind === 'shark' || (pr.huntsNpc && pr.huntsNpc.indexOf(o.sp) >= 0)) && o !== a && o.pk !== a.pk; }));
    var prey = detectPrey(g, a, sp, cands);
    if (!prey && a.pk) {
      for (i = 0; i < g.npcs.length; i++) { var m = g.npcs[i]; if (m !== a && m.alive && m.pk === a.pk && m.st === 'hunt' && m.tg) { var t = findTarget(g, m.tg); if (t && t.o.alive && dist3(a, t.o) < 120) { prey = t.o; break; } } }
    }
    if (prey) {
      var dd = dist3(a, prey);
      if (!prey.sp && a.circ === undefined && dd < 28 && dd > reach(sp.size) + 4 && a.sprint <= 0) a.circ = 24;
      if (a.circ > 0) {
        a.circ--; a.st = 'circle'; a.tg = prey.id;
        var cb = bearing(a.x, a.z, prey.x, prey.z);
        moveNpc(g, a, sp, cb + 75, sp.speed * 1.1, prey.d + 2, { turn: 95 });
        if (a.circ % 8 === 0 && !prey.sp) ev(prey, 'circled:' + a.sp, 'a ' + a.sp + ' is circling you at ' + Math.round(dd) + ' m');
        return;
      }
      if (a.circ === 0) a.circ = -1;
      if (a.tg === prey.id) { a.chase = (a.chase || 0) + 1; if (a.chase > 240) { a.ban = { id: prey.id, until: g.tick + 600 }; a.chase = 0; a.tg = null; a.st = 'patrol'; return; } } else a.chase = 0;
      a.st = 'hunt'; a.tg = prey.id; a.tm = 40;
      var tx = prey.x, tz = prey.z;
      if (a.pk && dd > 15) {
        var packMembers = g.npcs.filter(function (o) { return o.pk === a.pk; }), idx = packMembers.indexOf(a), off = (idx - 1) * 70;
        var b0 = bearing(prey.x, prey.z, a.x, a.z) + off;
        tx = prey.x + Math.sin(b0 * D2R) * 10; tz = prey.z - Math.cos(b0 * D2R) * 10;
      }
      if (dd < 30 && a.sprint <= 0 && a.tired <= 0) a.sprint = sp.sprintT;
      var spd = a.sprint > 0 ? sp.sprint : (a.tired > 0 ? sp.speed * 0.55 : sp.speed * 1.18);
      if (dd < reach(sp.size) + 1 && a.cool <= 0) npcAttack(g, a, sp, prey);
      else moveNpc(g, a, sp, bearing(a.x, a.z, tx, tz), spd, prey.d, { turn: 115 });
      return;
    }
    if (a.st === 'hunt' && a.tm > 0 && a.tg) { var lt = findTarget(g, a.tg); if (lt && lt.o.alive) { moveNpc(g, a, sp, bearing(a.x, a.z, lt.o.x, lt.o.z), sp.speed, lt.o.d); return; } }
    if (a.circ !== undefined && a.tm <= 0) delete a.circ;
    if (sp.scavenge || pr.smell) {
      var bk = null, bq = 1e9;
      for (i = 0; i < g.carrion.length; i++) { var k = g.carrion[i]; var q = dist3(a, k), rng = (pr.smell || 100) * (k.sz > 15 ? 2.5 : 1); if (q < rng && q < bq && floorAt(k.x, k.z) >= (sp.shallowOK || 14)) { bq = q; bk = k; } }
      if (bk) {
        a.st = 'scavenge'; a.tg = bk.id;
        if (bq < reach(sp.size) + 3) { a.spd = 0.5; bk.en -= 3; if (bk.en <= 0 || rnd(g) < 0.002) a.sat = pr.satiety * 0.5; return; }
        moveNpc(g, a, sp, bearing(a.x, a.z, bk.x, bk.z), sp.speed, bk.d); return;
      }
    }
    // Follow cooperative shark chat hint if fresh (< 25s)
    if (sp.kind === 'shark' && a.sp !== 'orca' && g._sharkHint && g.tick - g._sharkHint.t < 100) {
      var hd = distH(a, g._sharkHint);
      if (hd > 14 && floorAt(g._sharkHint.x, g._sharkHint.z) >= (sp.shallowOK || 14)) {
        a.st = 'hunt-call';
        moveNpc(g, a, sp, bearing(a.x, a.z, g._sharkHint.x, g._sharkHint.z), sp.speed * 1.25, g._sharkHint.d, { turn: 105 });
        return;
      }
    }
    // Proactively sweep toward active player fish agents within acoustic/electro scent range
    if (sp.kind === 'shark' && a.sp !== 'orca') {
      var bf = null, bfd = 135;
      for (i = 0; i < g.fish.length; i++) {
        var pf = g.fish[i]; if (!pf.alive || pf.role === 'shark' || pf.hid) continue;
        if (Math.abs(a.x - pf.x) > bfd || Math.abs(a.z - pf.z) > bfd) continue;
        var pfd = dist3(a, pf);
        if ((pf.spd > 0.9 || pf.bleed > 0 || pf.role === 'fish') && pfd < bfd && floorAt(pf.x, pf.z) >= (sp.shallowOK || 14)) { bfd = pfd; bf = pf; }
      }
      if (bf) {
        a.st = 'stalk';
        moveNpc(g, a, sp, bearing(a.x, a.z, bf.x, bf.z), sp.speed * 1.12, clamp(bf.d, 2, floorAt(bf.x, bf.z) - 2), { turn: 95 });
        return;
      }
    }
    a.st = 'patrol'; a.tg = null;
    var wps = sp.waypoints, wp = wps[a.wp % wps.length];
    if (pr.active === 'night' && isDay(g) && sp.rest && rnd(g) < 0.6) {
      var rwp = { x: sp.rest[0], z: sp.rest[1], d: sp.rest[2] };
      if (distH(a, rwp) < 12) { moveNpc(g, a, sp, a.h + 4, 0.85, sp.rest[2]); return; }
      moveNpc(g, a, sp, bearing(a.x, a.z, rwp.x, rwp.z), sp.speed * 0.85, rwp.d); return;
    }
    if (distH(a, { x: wp[0], z: wp[1] }) < 12) { var nw = a.wp; if (wps.length > 1) while (nw === a.wp) nw = Math.floor(rnd(g) * wps.length); a.wp = nw; wp = wps[nw]; }
    var glide = 0.88 + 0.24 * Math.sin(g.tick * 0.1 + a.ph);
    moveNpc(g, a, sp, bearing(a.x, a.z, wp[0], wp[1]) + Math.sin(g.tick * 0.07 + a.ph) * 10, sp.speed * glide * (a.tired > 0 ? 0.6 : 1), wp[2] + Math.sin(g.tick * 0.02 + a.ph) * 4, { turn: 80 });
  }

  // ── Filter-feeders & Massive Humpback Whale + Calf ───────────────────────
  function stepPasser(g, a, sp) {
    if (a.sp === 'whale' || a.sp === 'whale calf') return stepWhale(g, a, sp);
    var bp = null, bd = 1e9;
    g.plankton.forEach(function (p) { var q = dist3(a, p); if (p.amt > 20 && q < bd) { bd = q; bp = p; } });
    if (bp && bd > 7) moveNpc(g, a, sp, bearing(a.x, a.z, bp.x, bp.z), sp.speed, bp.d, { turn: 35 });
    else { if (bp) bp.amt = Math.max(0, bp.amt - 0.06); moveNpc(g, a, sp, a.h + 5, sp.speed * 0.78, a.d + Math.sin(g.tick * 0.04 + a.ph) * 1.5, { turn: 35 }); }
  }
  function whaleEvent(g, a, txt, key, range) { for (var i = 0; i < g.fish.length; i++) { var f = g.fish[i]; if (f.alive && dist3(f, a) < range) ev(f, key, txt); } }
  function stepWhale(g, a, sp) {
    var i; if (a.wst === undefined) { a.wst = 'cruise'; a.wt = 0; a.breath = 0; a.wp = 0; a.song = 0; }
    a.wt++; a.breath++;
    if (a.sp === 'whale calf') {
      var mom = null; for (i = 0; i < g.npcs.length; i++) if (g.npcs[i].sp === 'whale' && g.npcs[i].alive) { mom = g.npcs[i]; break; }
      if (!mom) { moveNpc(g, a, sp, a.h + 3, sp.speed * 0.8, 12, { turn: 30 }); return; }
      var ang = mom.h + 148, lx = mom.x + Math.sin(ang * D2R) * 18, lz = mom.z - Math.cos(ang * D2R) * 18, ld = distH(a, { x: lx, z: lz });
      var wantD = mom.wst === 'surface' ? 0.8 : Math.min(mom.d + 3, 40);
      moveNpc(g, a, sp, ld > 4 ? bearing(a.x, a.z, lx, lz) : mom.h, ld > 30 ? sp.sprint : (ld > 8 ? mom.spd * 1.2 : mom.spd), wantD, { turn: 36, allowSurface: true });
      a.st = mom.wst === 'feed' ? 'waits above' : mom.st; return;
    }
    var calf = null, orca = null, od = 1e9;
    for (i = 0; i < g.npcs.length; i++) { var o = g.npcs[i]; if (!o.alive) continue; if (o.sp === 'whale calf') calf = o; if (o.sp === 'orca') { var q = dist3(o, calf || a); if (q < od) { od = q; orca = o; } } }
    if (orca && od < 65) {
      a.wst = 'defend'; a.wt = 0; a.st = 'defends calf';
      var tx = calf ? (calf.x + orca.x) / 2 : orca.x, tz = calf ? (calf.z + orca.z) / 2 : orca.z, dd = dist3(a, orca);
      if (dd < 24 && a.cool <= 0) { orca.hp -= 180; orca.bleed = 60; orca.st = 'flee'; orca.tm = 50; orca.sat = 80; a.cool = 24; addFeed(g, 'the giant whale slams an orca with its tail'); whaleEvent(g, a, 'a thunderous tail slap shakes the sea', 'whale:slap', 240); if (orca.hp <= 0) { npcDie(g, orca, a); addFeed(g, 'the orca was killed by the whale'); } }
      else moveNpc(g, a, sp, bearing(a.x, a.z, tx, tz), sp.sprint, orca.d, { turn: 55 });
      if (a.cool > 0) a.cool--; return;
    }
    if (a.cool > 0) a.cool--;
    var night = isNight(g);
    if (a.wst !== 'surface' && a.wst !== 'feed' && a.breath > 420) { a.wst = 'surface'; a.wt = 0; }
    if (a.wst === 'surface') {
      a.st = 'surfacing'; moveNpc(g, a, sp, a.h + 2, sp.speed * 0.85, 0.8, { turn: 28, allowSurface: true });
      if (a.d < 2.0 && a.wt > 20) { a.breath = 0; a.wst = 'cruise'; a.wt = 0; a.blow = g.tick; addFeed(g, 'the giant whale blows at the surface'); whaleEvent(g, a, 'a colossal whale blows at the surface nearby', 'whale:blow', 180); if (rnd(g) < 0.4) { a.breach = g.tick; addFeed(g, 'the giant whale breaches!'); } }
      return;
    }
    if (a.wst === 'cruise' && a.breath > 40 && a.breath < 200 && rnd(g) < 0.008) {
      var best = null, bd = 1e9;
      for (i = 0; i < g.npcs.length; i++) { var k = g.npcs[i]; if (k.alive && k.sp === 'krill' && k.n > 200) { var q2 = distH(a, k); if (q2 < bd) { bd = q2; best = k; } } }
      if (best) { a.wst = 'feed'; a.wt = 0; a.tg = best.id; }
    }
    if (a.wst === 'feed') {
      var kt = findTarget(g, a.tg); a.st = 'lunge-feeding';
      if (!kt || !kt.o.alive || kt.o.n <= 50 || a.wt > 360 || a.breath > 580) { a.wst = 'surface'; a.wt = 0; a.tg = null; return; }
      var kd = dist3(a, kt.o);
      if (kd < 14) { kt.o.n = Math.max(0, kt.o.n - 8); a.lunge = g.tick; moveNpc(g, a, sp, a.h + 25, sp.speed * 0.65, kt.o.d, { turn: 50 }); }
      else moveNpc(g, a, sp, bearing(a.x, a.z, kt.o.x, kt.o.z), sp.speed, kt.o.d, { turn: 28 });
      return;
    }
    if (night && g.tick - a.song > 580 && rnd(g) < 0.012) { a.song = g.tick; addFeed(g, 'a whale is singing'); whaleEvent(g, a, 'a deep, resonant whale song rolls across the sea', 'whale:song', 420); }
    a.st = (night && g.tick - a.song < 120) ? 'singing' : 'cruise';
    var wps = sp.waypoints, wp = wps[a.wp % wps.length];
    if (distH(a, { x: wp[0], z: wp[1] }) < 28) { a.wp = (a.wp + 1) % wps.length; wp = wps[a.wp]; }
    var cruiseD = (wp[2] > 55) ? 30 : wp[2];
    moveNpc(g, a, sp, bearing(a.x, a.z, wp[0], wp[1]), sp.speed * (night ? 0.72 : 1), cruiseD + Math.sin(g.tick * 0.02) * 4, { turn: 16 });
  }

  function stepDrift(g, a, sp) {
    var cur = OC.currentAt(a.x, a.z, a.d);
    var nx = clamp(a.x + cur.x * DT * 0.6 + (rnd(g) - 0.5) * 0.05, 48, OC.W - 48);
    var nz = clamp(a.z + cur.z * DT * 0.6 + (rnd(g) - 0.5) * 0.05, 48, OC.L - 48);
    if (floorAt(nx, nz) > 2) { a.x = nx; a.z = nz; }
    a.spd = 0.12;
    a.d = clamp(a.d, sp.habitat.d0, Math.min(sp.habitat.d1, Math.max(1.5, floorAt(a.x, a.z) - 1)));
  }

  function stepNpcs(g) {
    var i, j;
    // Fast per-tick caches for hunters & packs
    g._schools = []; g._preds = [];
    for (i = 0; i < g.npcs.length; i++) {
      var q = g.npcs[i]; if (!q.alive) continue;
      var qsp = SP[q.sp];
      if (qsp.kind === 'school') g._schools.push(q);
      else if (qsp.kind === 'shark' || qsp.kind === 'hunter' || qsp.kind === 'pack' || qsp.kind === 'kraken') g._preds.push(q);
    }
    for (i = 0; i < g.npcs.length; i++) {
      var a = g.npcs[i], sp = SP[a.sp];
      if (!a.alive) {
        if (a.rt > 0 && !g.famine) { a.rt--; if (a.rt <= 0) { a.alive = true; a.hp = sp.hp || hpMax(sp.size); a.x = a.hx; a.z = a.hz; a.d = a.hd; if (sp.kind === 'school') a.n = sp.n; } }
        continue;
      }
      if (a.bleed > 0) a.bleed--;
      switch (sp.kind) {
        case 'school': stepSchool(g, a, sp); break;
        case 'static': a.spd = 0; break;
        case 'crab': stepCrustacean(g, a, sp); break;
        case 'squid': stepSquid(g, a, sp); break;
        case 'octopus': stepOctopus(g, a, sp); break;
        case 'kraken': stepGiantSquid(g, a, sp); break;
        case 'wander': stepWander(g, a, sp); break;
        case 'ambush': stepAmbush(g, a, sp); break;
        case 'hunter': stepHunter(g, a, sp); break;
        case 'pack': stepPack(g, a, sp); break;
        case 'shark': stepShark(g, a, sp); break;
        case 'passer': stepPasser(g, a, sp); break;
        case 'drift': stepDrift(g, a, sp); break;
      }
      if (sp.defense && sp.defense.touch) {
        var tr = sp.defense.touchR;
        for (j = 0; j < g.fish.length; j++) {
          var f = g.fish[j]; if (!f.alive) continue;
          if (Math.abs(a.x - f.x) > tr || Math.abs(a.z - f.z) > tr) continue;
          if (dist3(a, f) < tr) {
            if (sp.defense.perSec && f.species !== 'sea turtle' && f.species !== 'sunfish') hurt(g, f, sp.defense.dmg * DT, 'sting', 'sting:' + a.sp, 'tentacles of a ' + a.sp + ' are burning you');
            else if (!sp.defense.perSec && f.spd < 0.5 && f.d > floorAt(f.x, f.z) - 2 && f.sz < 6) {
              hurt(g, f, sp.defense.dmg, 'sting', 'sting:' + a.sp, 'a hidden ' + a.sp + ' struck you: -' + sp.defense.dmg + ' hp');
              a.st = 'flee'; a.tm = 30;
            }
          }
        }
      }
    }
    var night = isNight(g), ts = tSec(g);
    for (i = 0; i < g.plankton.length; i++) {
      var p = g.plankton[i], cur = OC.currentAt(p.x, p.z, p.d);
      var px = clamp(p.x + cur.x * DT * 0.8, 70, OC.W - 70), pz = clamp(p.z + cur.z * DT * 0.8, 70, OC.L - 70);
      if (floorAt(px, pz) > 10) { p.x = px; p.z = pz; }
      var wantD = night ? 9 : 34; p.d = clamp(p.d + (wantD - p.d) * 0.003, 2, Math.max(4, floorAt(p.x, p.z) - 2));
      if (!g.famine && p.amt < 100) p.amt += 0.03;
      if (p.amt < 1 && !g.famine && rnd(g) < 0.0015) {
        var rx = 90 + rnd(g) * (OC.W - 180), rz = 90 + rnd(g) * (OC.L - 180);
        if (floorAt(rx, rz) >= 18) { p.x = rx; p.z = rz; p.amt = 45; }
      }
    }
    for (i = 0; i < g.blooms.length; i++) {
      var jl = g.blooms[i], jc = OC.currentAt(jl.x, jl.z, jl.d);
      var jx = jl.x + jc.x * DT * 0.5 + (jl.hx - jl.x) * 0.001, jz = jl.z + jc.z * DT * 0.5 + (jl.hz - jl.z) * 0.001;
      if (floorAt(jx, jz) > jl.d0 + 2) { jl.x = jx; jl.z = jz; }
      jl.d = clamp(jl.d + Math.sin(ts * 0.02 + i) * 0.02, jl.d0, jl.d1);
      if (!g.famine && jl.n < 40 && rnd(g) < 0.01) jl.n++;
    }
    for (i = g.carrion.length - 1; i >= 0; i--) {
      var k = g.carrion[i]; k.age++; var fl = floorAt(k.x, k.z);
      if (k.d < fl - 0.8) k.d = Math.min(fl - 0.8, k.d + 0.3 * DT);
      if (k.en <= 0 || k.age > (k.sz > 15 ? 9000 : 1400)) g.carrion.splice(i, 1);
    }
    if (g.tick === OC.WHALE_FALL.t) {
      var wf = OC.WHALE_FALL;
      g.carrion.push({ id: 'k' + (g.nextK++), x: wf.x, z: wf.z, d: 30, sz: 55, en: 4200, age: 0, of: 'whale' });
      addFeed(g, 'a massive whale carcass is sinking into the deep basin');
    }
    if (g.tick === OC.ORCA_EVENT.t0) {
      for (i = 0; i < 3; i++) mkNpc(g, 'orca', i, { x: 145 + i * 10, z: 310 + i * 14, d: 18 });
      addFeed(g, 'a pod of orcas has entered the sea!');
    }
    if (g.tick === OC.ORCA_EVENT.t1) {
      g.npcs.forEach(function (o) { if (o.sp === 'orca') { o.alive = false; o.rt = 0; } });
      addFeed(g, 'the orcas have moved on');
    }
    delete g._schools; delete g._preds;
  }

  OC.stepOnce = function (g) {
    g.tick++; OC._tide = OC.tideAt(tSec(g));
    if (g.tick === C.FAMINE_TICK) { g.famine = true; addFeed(g, 'the sea is growing empty: nothing new is spawning'); }
    for (var i = 0; i < g.fish.length; i++) if (g.fish[i].alive) stepFish(g, g.fish[i]);
    stepNpcs(g);
    if (g.tick % 4 === 0) compact(g);
    var alive = g.fish.filter(function (f) { return f.alive; });
    if ((alive.length <= 1 && g.fish.length >= C.MIN_PLAYERS) || g.tick >= C.MAX_TICKS) finish(g, alive);
  };
  function compact(g) {
    var i, a;
    for (i = 0; i < g.npcs.length; i++) { a = g.npcs[i]; a.x = r2(a.x); a.z = r2(a.z); a.d = r2(a.d); a.h = r2(a.h); if (a.p) a.p = r1(a.p); a.spd = r2(a.spd); if (a.hp !== undefined) a.hp = r2(a.hp); }
    for (i = 0; i < g.fish.length; i++) { a = g.fish[i]; a.x = r2(a.x); a.z = r2(a.z); a.d = r2(a.d); a.h = r2(a.h); a.p = r2(a.p); a.en = r2(a.en); a.hp = r2(a.hp); a.st = r2(a.st); a.sz = Math.round(a.sz * 10000) / 10000; a.ate = r2(a.ate); }
    for (i = 0; i < g.plankton.length; i++) { a = g.plankton[i]; a.x = r2(a.x); a.z = r2(a.z); a.d = r2(a.d); a.amt = r2(a.amt); }
    for (i = 0; i < g.blooms.length; i++) { a = g.blooms[i]; a.x = r2(a.x); a.z = r2(a.z); a.d = r2(a.d); }
    for (i = 0; i < g.carrion.length; i++) { a = g.carrion[i]; a.d = r2(a.d); a.en = r2(a.en); }
  }
  function scoreOf(g, f) {
    var surv = (f.alive ? g.tick : f.died) - f.born;
    var fsp = fishSp(f), baseSz = fsp ? Math.max(0.2, fsp.size) : 1;
    var relSz = f.sz / baseSz;
    var ateScore = (f.ate / Math.max(80, baseSz * 25)) * 20;
    return Math.round(surv * DT / 4 + f.kills * 150 + (f.fishKills || 0) * 100 + relSz * 80 + ateScore + f.npcKills * 5);
  }
  OC.scoreOf = scoreOf;
  function finish(g, alive) {
    g.status = 'finished';
    g.fish.forEach(function (f) { f.score = scoreOf(g, f); });
    var ranked = g.fish.slice().sort(function (a, b) { if (a.cheat !== b.cheat) return a.cheat ? 1 : -1; if (a.alive !== b.alive) return a.alive ? -1 : 1; if (a.alive && b.alive) return b.score - a.score; return (b.died || 0) - (a.died || 0); });
    g.ranks = ranked.map(function (f, i) { return { rank: i + 1, id: f.id, name: f.n, model: f.model, species: f.species, role: f.role, alive: f.alive, score: f.score, size: r2(f.sz), kills: f.kills, fishAgentKills: f.fishKills || 0, animalsEaten: f.npcKills, eaten: Math.round(f.ate), survivedSec: Math.round(((f.alive ? g.tick : f.died) - f.born) * DT), decisions: f.cmdN, cause: f.cause, suspect: f.suspect, cheat: f.cheat }; });
    g.winner = ranked.length ? ranked[0].n : null;
    addFeed(g, g.winner ? g.winner + ' wins (' + (alive.length === 1 ? 'last alive' : alive.length === 0 ? 'last to die' : 'highest score at the time limit') + ')' : 'game over');
  }
  OC.start = function (g, nowMs) {
    g.status = 'running'; g.startMs = nowMs; g.lastMs = nowMs; g.tick = 0;
    g.fish.forEach(function (f) { f.born = 0; f.lastCmdTick = 0; f.lastMeTick = 0; });
    addFeed(g, 'the game has started with ' + g.fish.length + ' agents');
  };
  OC.advance = function (g, nowMs) {
    if (g.status !== 'running') return 0;
    var n = Math.floor((nowMs - g.lastMs) / C.TICK_MS); if (n <= 0) return 0;
    if (n > C.CATCHUP_MAX) { n = C.CATCHUP_MAX; g.lastMs = nowMs - n * C.TICK_MS; }
    for (var i = 0; i < n && g.status === 'running'; i++) OC.stepOnce(g);
    g.lastMs += n * C.TICK_MS; return n;
  };

  OC.snapshot = function (g, nowMs) {
    var ts = tSec(g);
    return {
      v: 5, gen: g.gen, status: g.status, tick: g.tick, t: Math.round(ts), timeLeft: Math.max(0, Math.round((C.MAX_TICKS - g.tick) * DT)),
      phase: OC.phaseName(ts), light: r2(OC.dayLight(ts)), famine: g.famine, tide: r2(OC.tideAt(ts)),
      lobbyIn: g.status === 'lobby' && g.lobbyUntilMs ? Math.max(0, Math.round((g.lobbyUntilMs - nowMs) / 1000)) : null, lobbyArmed: !!g.lobbyUntilMs,
      fish: g.fish.map(function (f) {
        var fsp = fishSp(f);
        return {
          id: f.id, n: f.n, model: f.model, color: f.color, sp: f.species, role: f.role,
          x: r2(f.x), z: r2(f.z), d: r2(f.d), h: r1(f.h), p: r1(f.p), spd: r1(f.spd),
          sz: r1(f.sz), hp: Math.round(f.hp), hpMax: fishHpMax(f), en: Math.round(f.en), enMax: fishEnMax(f), st: Math.round(f.st),
          air: fsp && fsp.breathes ? Math.round(f.air) : undefined,
          alive: f.alive, hid: f.hid, bleed: f.bleed > 0, poison: f.poison > 0, ink: f.ink > 0, kills: f.kills, npcKills: f.npcKills,
          ate: Math.round(f.ate), act: f.cmd.act, speed: f.cmd.speed, target: f.cmd.target, why: f.why, cmdN: f.cmdN, says: f.says || 0, suspect: f.suspect,
          cheat: f.cheat, cause: f.cause, idle: Math.round((g.tick - f.lastCmdTick) * DT), score: scoreOf(g, f), meN: f.meN, lastCmdMs: f.lastCmdMs,
          recent: f.whyLog.slice(-6).map(function (w) { return { t: w.t, ms: w.ms, act: w.act, why: w.why }; })
        };
      }),
      npcs: g.npcs.filter(function (a) { return a.alive; }).map(function (a) {
        var sp = SP[a.sp], o = { id: a.id, sp: a.sp, x: r2(a.x), z: r2(a.z), d: r2(a.d), h: r1(a.h), spd: r1(a.spd), st: a.st };
        if (a.p && Math.abs(a.p) > 0.5) o.p = r1(a.p);
        if (a.n !== undefined) o.n = a.n; if (a.tg) o.tg = a.tg; if (a.bleed > 0) o.bl = 1;
        if (a.ink && g.tick - a.ink < 14) o.ink = 1;
        if (a.breach && g.tick - a.breach < 32) o.breach = 1;
        if (a.hp !== undefined && (sp.kind === 'shark' || sp.kind === 'kraken')) o.hp = Math.round(a.hp);
        if (a.sp === 'whale') { if (a.blow && g.tick - a.blow < 40) o.blow = 1; if (a.lunge && g.tick - a.lunge < 8) o.lunge = 1; }
        return o;
      }),
      plankton: g.plankton.map(function (p) { return { id: p.id, x: r1(p.x), z: r1(p.z), d: r1(p.d), r: p.r, amt: Math.round(p.amt) }; }),
      blooms: g.blooms.map(function (j) { return { id: j.id, x: r1(j.x), z: r1(j.z), d: r1(j.d), r: j.r, n: j.n }; }),
      carrion: g.carrion.map(function (k) { return { id: k.id, x: r1(k.x), z: r1(k.z), d: r1(k.d), sz: r1(k.sz), en: Math.round(k.en) }; }),
      feed: g.feed.slice(-50), chat: (g.chat || []).slice(-50), winner: g.winner, ranks: g.ranks
    };
  };
})(OC);
