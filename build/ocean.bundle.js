// OCEAN ARENA bundle — zgrajeno 2026-11-21T20:23:54.720Z iz engine/world.js + engine.js + http.js. NE UREJAJ ROČNO.
// OCEAN ARENA — svet (deljeno med pogonom, gledalcem in testi).
// Vse deterministično, brez naključnih tabel: pogon in gledalec dobita identičen svet.
// Koordinate: x, z ∈ [0, W], d = globina v metrih (0 = gladina, narašča navzdol).
var OC = globalThis.OC || (globalThis.OC = {});
(function (OC) {
  var W = 400, L = 400, DMAX = 130;
  OC.W = W; OC.L = L; OC.DMAX = DMAX;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function sstep(e0, e1, x) { var t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
  function gauss(x, z, cx, cz, r) { var dx = x - cx, dz = z - cz; return Math.exp(-(dx * dx + dz * dz) / (r * r)); }
  OC.clamp = clamp; OC.lerp = lerp; OC.sstep = sstep; OC.gauss = gauss;

  // ── Dno ───────────────────────────────────────────────────────────────────
  function floorAt(x, z) {
    var d = 72 + 9 * Math.sin(x * 0.031) * Math.cos(z * 0.027) + 5 * Math.sin(x * 0.071 + 1.3) * Math.sin(z * 0.063 + 0.4);
    // zahodna polica (plitvo)
    var shelf = sstep(165, 125, x);
    d = lerp(d, 22 + 3 * Math.sin(z * 0.05) + 1.5 * Math.cos(x * 0.11), shelf);
    // greben na polici
    d -= 8 * gauss(x, z, 115, 135, 32);
    // podmorska gora
    var sm = clamp(gauss(x, z, 290, 120, 48) * 1.35, 0, 1);
    d = lerp(d, 18, sm);
    // jarek
    var tr = Math.exp(-Math.pow((z - 350) / 38, 2)) * sstep(150, 185, x) * sstep(320, 285, x);
    d = lerp(d, 126, tr);
    // kotanja (mrtva cona)
    d = lerp(d, 94, gauss(x, z, 350, 300, 34));
    // vzhodna globina
    d = lerp(d, 96, sstep(345, 395, x) * (1 - tr));
    return clamp(d, 8, DMAX);
  }
  OC.floorAt = floorAt;

  // ── Značilnosti sveta ─────────────────────────────────────────────────────
  OC.KELP = [
    { id: 'kelp-n', x: 60, z: 80, r: 28 },
    { id: 'kelp-c', x: 85, z: 200, r: 26 },
    { id: 'kelp-s', x: 45, z: 320, r: 22 }
  ];
  OC.REEF = { id: 'reef', x: 115, z: 135, r: 30, cleaner: { x: 118, z: 140, d: 16 }, hideMax: 2.5 };
  OC.ANEMONES = { id: 'anemones', x: 162, z: 110, r: 15, maxSize: 1.8 };
  OC.WRECK = { id: 'wreck', x: 220, z: 222, rx: 15, rz: 6, h: 7, yaw: 0.6, hideMax: 5.0 };
  OC.CAVES = [
    { id: 'trench-cave', x: 232, z: 345, d: 104, r: 7, maxSize: 3.2, crystal: true },
    { id: 'seamount-cave', x: 282, z: 108, d: 40, r: 6.5, maxSize: 3.5, moray: true },
    { id: 'shelf-cave', x: 150, z: 250, d: 38, r: 8, maxSize: 4.0 },
    { id: 'east-cave', x: 372, z: 60, d: 70, r: 6, maxSize: 3.5 }
  ];
  OC.VENTS = [
    { id: 'vent-1', x: 300, z: 152 }, { id: 'vent-2', x: 313, z: 139 }, { id: 'vent-3', x: 286, z: 162 }
  ];
  OC.WHALEFALL = { id: 'whalefall', x: 205, z: 325, r: 14 };
  OC.BIOLUM = { id: 'biolum', x: 255, z: 358, r: 48, minD: 92 };
  OC.DEADZONE = { id: 'deadzone', x: 350, z: 300, r: 30, minD: 78 };
  OC.JELLY_HOME = { x: 330, z: 232, r: 24, d0: 14, d1: 44 };
  OC.THERMO = 50;             // termoklina (m)
  OC.SURFACE_ZONE = 4;        // m — cona ptic
  // Tokovi: tekoči vrtinec (gyre) + dvig ob gori
  OC.CURRENTS = [
    { id: 'east-jet', kind: 'seg', ax: 140, az: 190, bx: 400, bz: 190, w: 26, d0: 10, d1: 55, v: 1.6 },
    { id: 'south-drift', kind: 'seg', ax: 375, az: 190, bx: 375, bz: 370, w: 24, d0: 10, d1: 70, v: 1.2 },
    { id: 'west-return', kind: 'seg', ax: 375, az: 372, bx: 160, bz: 372, w: 24, d0: 10, d1: 60, v: 1.2 },
    { id: 'north-wall', kind: 'seg', ax: 152, az: 372, bx: 152, bz: 190, w: 22, d0: 10, d1: 40, v: 1.0 },
    { id: 'upwelling', kind: 'up', x: 290, z: 120, r: 34, v: 0.7 }
  ];
  OC.SPAWNS = (function () {
    var a = [];
    for (var i = 0; i < 10; i++) {
      var t = i / 10 * Math.PI * 2;
      var sx = Math.round((200 + 140 * Math.cos(t)) * 10) / 10;
      var sz = Math.round((200 + 140 * Math.sin(t)) * 10) / 10;
      var sd = Math.max(6, Math.min(24, floorAt(sx, sz) - 3));
      a.push({ x: sx, z: sz, d: Math.round(sd * 10) / 10 });
    }
    return a;
  })();
  OC.SHARK_PATH = (function () { var a = []; for (var i = 0; i < 12; i++) { var t = i / 12 * Math.PI * 2; a.push({ x: 215 + 115 * Math.cos(t), z: 215 + 115 * Math.sin(t), d: 40 + 14 * Math.sin(t * 3) }); } return a; })();

  // Javna karta (brez učinkov — samo imena in lega)
  OC.chart = function () {
    var f = [];
    OC.KELP.forEach(function (k) { f.push({ type: 'kelp forest', id: k.id, x: k.x, z: k.z, r: k.r, floor: Math.round(floorAt(k.x, k.z)) }); });
    f.push({ type: 'coral reef', id: 'reef', x: OC.REEF.x, z: OC.REEF.z, r: OC.REEF.r, floor: Math.round(floorAt(OC.REEF.x, OC.REEF.z)) });
    f.push({ type: 'anemone garden', id: OC.ANEMONES.id, x: OC.ANEMONES.x, z: OC.ANEMONES.z, r: OC.ANEMONES.r, floor: Math.round(floorAt(OC.ANEMONES.x, OC.ANEMONES.z)) });
    f.push({ type: 'shipwreck', id: 'wreck', x: OC.WRECK.x, z: OC.WRECK.z, r: OC.WRECK.rx, floor: Math.round(floorAt(OC.WRECK.x, OC.WRECK.z)) });
    OC.CAVES.forEach(function (c) { f.push({ type: 'cave', id: c.id, x: c.x, z: c.z, depth: c.d, r: c.r }); });
    OC.VENTS.forEach(function (v) { f.push({ type: 'hydrothermal vent', id: v.id, x: v.x, z: v.z, depth: Math.round(floorAt(v.x, v.z)) }); });
    f.push({ type: 'whale skeleton', id: OC.WHALEFALL.id, x: OC.WHALEFALL.x, z: OC.WHALEFALL.z, r: OC.WHALEFALL.r, floor: Math.round(floorAt(OC.WHALEFALL.x, OC.WHALEFALL.z)) });
    f.push({ type: 'seamount', id: 'seamount', x: 290, z: 120, r: 48, top: 18 });
    f.push({ type: 'trench', id: 'trench', x: 235, z: 350, r: 80, floor: 126 });
    f.push({ type: 'basin', id: 'basin', x: 350, z: 300, r: 34, floor: 94 });
    f.push({ type: 'shelf', id: 'shelf', x: 70, z: 200, r: 120, floor: 22 });
    return { w: W, l: L, maxDepth: DMAX, note: 'x,z in metres from the north-west corner; depth in metres below the surface', features: f };
  };

  // ── Poizvedbe ────────────────────────────────────────────────────────────
  function dist2(ax, az, bx, bz) { var dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; }
  OC.dist2 = dist2;
  OC.kelpAt = function (x, z, d) {
    for (var i = 0; i < OC.KELP.length; i++) { var k = OC.KELP[i]; if (dist2(x, z, k.x, k.z) < k.r * k.r && d > floorAt(x, z) - 16) return k; }
    return null;
  };
  OC.reefAt = function (x, z, d) { var r = OC.REEF; return (dist2(x, z, r.x, r.z) < r.r * r.r && d > floorAt(x, z) - 6) ? r : null; };
  OC.anemoneAt = function (x, z, d) { var a = OC.ANEMONES; return (dist2(x, z, a.x, a.z) < a.r * a.r && d > floorAt(x, z) - 6) ? a : null; };
  OC.wreckAt = function (x, z, d) {
    var w = OC.WRECK, c = Math.cos(-w.yaw), s = Math.sin(-w.yaw), dx = x - w.x, dz = z - w.z;
    var lx = dx * c - dz * s, lz = dx * s + dz * c, fl = floorAt(w.x, w.z);
    return (Math.abs(lx) < w.rx && Math.abs(lz) < w.rz && d > fl - w.h) ? w : null;
  };
  OC.caveAt = function (x, z, d) {
    for (var i = 0; i < OC.CAVES.length; i++) { var c = OC.CAVES[i]; var dd = d - c.d; if (dist2(x, z, c.x, c.z) + dd * dd < c.r * c.r) return c; }
    return null;
  };
  OC.ventAt = function (x, z, d) {
    var best = null, bd = 1e9;
    for (var i = 0; i < OC.VENTS.length; i++) { var v = OC.VENTS[i]; var fd = floorAt(v.x, v.z); var dd = d - fd; var q = dist2(x, z, v.x, v.z) + dd * dd * 0.5; if (q < bd) { bd = q; best = v; } }
    return { v: best, dist: Math.sqrt(bd) };
  };
  OC.whalefallAt = function (x, z, d) { var w = OC.WHALEFALL; return (dist2(x, z, w.x, w.z) < w.r * w.r && d > floorAt(x, z) - 8) ? w : null; };
  OC.inBiolum = function (x, z, d) { var b = OC.BIOLUM; return d > b.minD && dist2(x, z, b.x, b.z) < b.r * b.r; };
  OC.inDeadzone = function (x, z, d) { var b = OC.DEADZONE; return d > b.minD && dist2(x, z, b.x, b.z) < b.r * b.r; };
  OC.tempAt = function (x, z, d) {
    var t = 19 - 11 * sstep(OC.THERMO - 8, OC.THERMO + 8, d);
    var v = OC.ventAt(x, z, d); if (v.dist < 14) t += (32 - t) * (1 - v.dist / 14);
    return Math.round(t * 10) / 10;
  };
  OC.shelterMul = function (x, z, d) {
    if (OC.caveAt(x, z, d) || OC.wreckAt(x, z, d)) return 0;
    if (OC.kelpAt(x, z, d) || OC.reefAt(x, z, d) || OC.anemoneAt(x, z, d)) return 0.25;
    return 1;
  };
  OC.currentAt = function (x, z, d) {
    var cx = 0, cz = 0, cy = 0, id = null;
    for (var i = 0; i < OC.CURRENTS.length; i++) {
      var c = OC.CURRENTS[i];
      if (c.kind === 'seg') {
        if (d < c.d0 || d > c.d1) continue;
        var vx = c.bx - c.ax, vz = c.bz - c.az, len = Math.sqrt(vx * vx + vz * vz); vx /= len; vz /= len;
        var px = x - c.ax, pz = z - c.az, t = px * vx + pz * vz; if (t < 0 || t > len) continue;
        var ox = px - vx * t, oz = pz - vz * t, off = Math.sqrt(ox * ox + oz * oz); if (off > c.w) continue;
        var f = c.v * (1 - Math.pow(off / c.w, 2)); cx += vx * f; cz += vz * f; id = id || c.id;
      } else if (c.kind === 'up') {
        var q = dist2(x, z, c.x, c.z); if (q < c.r * c.r && d < 70) { cy -= c.v * (1 - q / (c.r * c.r)); id = id || c.id; }
      }
    }
    return { x: cx, z: cz, d: cy, id: id };
  };
  // Svetloba: 0..1 na globini d ob času dneva (phase 0..1, 0 = poldne)
  OC.dayLight = function (tSec) {
    var ph = (tSec / OC.DAY_SEC) % 1; // 0 = poldne
    var sun = Math.cos(ph * Math.PI * 2); // 1 poldne, -1 polnoč
    return clamp(0.06 + 0.94 * sstep(-0.25, 0.35, sun), 0.06, 1);
  };
  OC.DAY_SEC = 360;
  OC.phaseName = function (tSec) {
    var ph = (tSec / OC.DAY_SEC) % 1;
    if (ph < 0.2 || ph > 0.8) return 'day';
    if (ph < 0.3) return 'dusk';
    if (ph < 0.7) return 'night';
    return 'dawn';
  };
  OC.lightAt = function (tSec, d) { return OC.dayLight(tSec) * Math.exp(-d / 42); };
})(OC);

// OCEAN ARENA — pogon simulacije (deterministično; brez omrežja).
// Uporaba: OC.newGame(gen) -> doc; OC.stepOnce(doc); OC.applyCmd(doc, fish, cmd); OC.perceive(doc, fish)
(function (OC) {
  var C = OC.CONST = {
    TICK_MS: 250, MAX_TICKS: 6000, LOBBY_SEC: 300, IDLE_SEC: 90, MIN_CMD_MS: 2000,
    MAX_SEATS: 10, MIN_PLAYERS: 2, FAMINE_TICK: 4080, MAX_SIZE: 10, START_SIZE: 1.0,
    GROWTH: 0.0065, BITE_CD: 5, SWALLOW_RATIO: 1.6, LUNGE_ST: 35, MAX_DUR: 60, DEF_DUR: 20,
    CATCHUP_MAX: 160
  };
  var DT = C.TICK_MS / 1000;
  var TAU = Math.PI * 2, D2R = Math.PI / 180, R2D = 180 / Math.PI;
  var clamp = OC.clamp, floorAt = OC.floorAt;
  var COLORS = OC.COLORS = ['sand', 'kelp', 'blue', 'dark', 'silver', 'red', 'orange'];
  var SPEEDS = OC.SPEEDS = { rest: 0, slow: 0.35, cruise: 1, fast: 1.55, sprint: 2.45 };
  var ACTS = OC.ACTS = ['swim', 'hunt', 'feed', 'hide', 'flee', 'lunge'];

  // ── RNG ──────────────────────────────────────────────────────────────────
  function rnd(g) { g.rs = (g.rs + 0x6D2B79F5) | 0; var t = g.rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  OC.rnd = rnd;

  // ── Geometrija ───────────────────────────────────────────────────────────
  function norm360(a) { a = a % 360; return a < 0 ? a + 360 : a; }
  function bearing(ax, az, bx, bz) { return norm360(Math.atan2(bx - ax, -(bz - az)) * R2D); }
  function relAngle(target, heading) { var r = norm360(target - heading); return r > 180 ? r - 360 : r; }
  function dist3(a, b) { var dx = a.x - b.x, dz = a.z - b.z, dd = a.d - b.d; return Math.sqrt(dx * dx + dz * dz + dd * dd); }
  function distH(a, b) { var dx = a.x - b.x, dz = a.z - b.z; return Math.sqrt(dx * dx + dz * dz); }
  function turnToward(cur, want, maxStep) { var r = relAngle(want, cur); if (Math.abs(r) <= maxStep) return norm360(want); return norm360(cur + (r > 0 ? maxStep : -maxStep)); }
  OC.bearing = bearing; OC.relAngle = relAngle; OC.dist3 = dist3;

  // ── Izpeljane lastnosti ribe ─────────────────────────────────────────────
  function hpMax(sz) { return Math.round(80 + 40 * sz); }
  function enMax(sz) { return Math.round(110 * sz); }
  function cruiseSpeed(sz) { return 2.0 + 1.1 / sz; }
  function reach(sz) { return 1.3 + 0.65 * sz; }
  function biteDmg(sz) { return 13 + 9 * sz; }
  function turnRate(sz) { return 155 / Math.sqrt(sz); } // deg/s
  OC.hpMax = hpMax; OC.enMax = enMax; OC.cruiseSpeed = cruiseSpeed; OC.reach = reach; OC.biteDmg = biteDmg;

  // ── Nova igra ────────────────────────────────────────────────────────────
  OC.newGame = function (gen, seed) {
    var g = { v: 5, gen: gen || 1, status: 'lobby', tick: 0, seed: seed || (gen * 7919 + 13), rs: 0, startMs: 0, lastMs: 0,
      firstClaimMs: 0, lobbyUntilMs: 0, fish: [], feed: [], winner: null, ranks: null, savedHistory: false, nextId: 1, famine: false,
      morayDone: false, snailPool: 55, matPool: 110, wreckPool: 90, whalePool: 320,
      shark: { x: 215, z: 100, d: 40, h: 90, spd: 3, wp: 0, state: 'patrol', target: null, sprint: 0, tired: 0, sat: 0, size: 12, kills: 0 },
      schools: [], lanterns: [], plankton: [], jellies: [], crabs: [], puffers: [], carrion: [], nextK: 1, stateHits: {} };
    g.rs = g.seed | 0;
    var i;
    for (i = 0; i < 8; i++) {
      var sp = OC.SPAWNS[(i * 3) % 10];
      var sx = clamp(sp.x + (rnd(g) - 0.5) * 60, 20, 380), sz_ = clamp(sp.z + (rnd(g) - 0.5) * 60, 20, 380);
      var sfl = floorAt(sx, sz_);
      g.schools.push({ id: 's' + (i + 1), x: sx, z: sz_, d: clamp(10 + rnd(g) * 22, 4, sfl - 3), h: rnd(g) * 360, n: 180, flee: 0, hx: sx, hz: sz_ });
    }
    var lanternSpots = [[240, 340], [320, 260], [190, 290], [340, 170], [260, 220], [180, 170]];
    for (i = 0; i < lanternSpots.length; i++) {
      var lx = lanternSpots[i][0] + (rnd(g) - 0.5) * 35, lz = lanternSpots[i][1] + (rnd(g) - 0.5) * 35;
      var lfl = floorAt(lx, lz);
      g.lanterns.push({ id: 'l' + (i + 1), x: lx, z: lz, d: clamp(65 + rnd(g) * 22, 20, lfl - 3), h: rnd(g) * 360, n: 90, flee: 0, hx: lx, hz: lz });
    }
    for (i = 0; i < 12; i++) g.plankton.push({ id: 'p' + (i + 1), x: 30 + rnd(g) * 340, z: 30 + rnd(g) * 340, d: 38, r: 15, amt: 110 });
    var jh = OC.JELLY_HOME; g.jellies = { x: jh.x, z: jh.z, d: (jh.d0 + jh.d1) / 2, r: jh.r, n: 40 };
    for (i = 0; i < 54; i++) {
      var cx = 20 + rnd(g) * 360, cz = 20 + rnd(g) * 360;
      if (i >= 40) { cx = OC.WRECK.x + (rnd(g) - 0.5) * 24; cz = OC.WRECK.z + (rnd(g) - 0.5) * 10; }
      g.crabs.push({ id: 'c' + (i + 1), x: cx, z: cz, d: floorAt(cx, cz) - 0.5, alive: true, rt: 0 });
    }
    for (i = 0; i < 9; i++) {
      var a = rnd(g) * TAU, rr = 8 + rnd(g) * 22;
      g.puffers.push({ id: 'u' + (i + 1), x: OC.REEF.x + Math.cos(a) * rr, z: OC.REEF.z + Math.sin(a) * rr, d: 11 + rnd(g) * 8, h: rnd(g) * 360, alive: true, rt: 0 });
    }
    return g;
  };

  function addFeed(g, txt) { g.feed.push({ t: g.tick, txt: txt }); if (g.feed.length > 80) g.feed.splice(0, g.feed.length - 80); }
  OC.addFeed = addFeed;
  function ev(f, key, txt, n) {
    var e = f.ev;
    for (var i = e.length - 1; i >= 0 && i >= e.length - 12; i--) { if (e[i].k === key && e[i].t >= f.lastMeTick) { e[i].n += (n || 0); e[i].c++; e[i].txt = txt; return; } }
    e.push({ k: key, txt: txt, n: n || 0, c: 1, t: f.lastMeTick });
    if (e.length > 40) e.splice(0, e.length - 40);
  }

  // ── Prijava ──────────────────────────────────────────────────────────────
  OC.addFish = function (g, name, model, color, key, ip) {
    var id = 'f' + (g.nextId++);
    var sp = OC.SPAWNS[(g.fish.length * 3) % 10];
    var d0 = Math.min(sp.d, floorAt(sp.x, sp.z) - 2);
    var f = { id: id, n: name, model: model || '?', color: COLORS.indexOf(color) >= 0 ? color : 'blue', key: key, ip: ip || null,
      x: sp.x, z: sp.z, d: d0, h: bearing(sp.x, sp.z, 200, 200), p: 0, spd: 0, vd: 0,
      sz: C.START_SIZE, hp: hpMax(C.START_SIZE), en: 85, st: 100, bleed: 0, poison: 0, alive: true, hid: false, cave: null, moray: 0,
      ambush: 0, mud: 0, mudCd: 0, wounded: 0, birdWarn: 0,
      kills: 0, ate: 0, bites: 0, cmdN: 0, meN: 0, lastCmdTick: 0, lastMeTick: 0, lastCmdMs: 0, cmdMs: [], whys: [], ev: [],
      cmd: { act: 'swim', speed: 'rest', h: 0, p: 0, until: 0, target: null, goto: null }, cool: 0, lunge: 0, born: 0, died: null, cause: null,
      suspect: false, cheat: false, why: '', score: 0, zoneSeen: {} };
    f.cmd.h = f.h;
    g.fish.push(f);
    addFeed(g, name + ' entered the water (' + (model || '?') + ')');
    return f;
  };

  // ── Ukaz ─────────────────────────────────────────────────────────────────
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
    return { ok: errs.length === 0, errs: errs, cmd: out };
  };

  function normWhyTemplate(s) {
    return (s || '').toLowerCase().replace(/\d+(\.\d+)?/g, '#').replace(/[^a-zčšžćđ#\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  OC.applyCmd = function (g, f, c, nowMs) {
    f.cmd = { act: c.act, speed: c.speed, h: c.h !== undefined ? c.h : f.cmd.h, p: c.p, until: g.tick + Math.round(c.dur / DT), target: c.target || null, goto: c.goto || null, t0: g.tick };
    if (c.act === 'hide') f.cmd.speed = 'rest';
    if (c.act === 'lunge') {
      if (f.st >= C.LUNGE_ST) { f.lunge = 5; f.st -= C.LUNGE_ST; f.en = Math.max(0, f.en - 3); }
      else ev(f, 'nolunge', 'not enough stamina to lunge (' + Math.round(f.st) + ')');
      f.cmd.act = 'swim'; f.cmd.speed = c.speed === 'rest' ? 'cruise' : c.speed; if (c.target) f.cmd.target = c.target;
    }
    f.why = c.why; f.whys.push(c.why); if (f.whys.length > 15) f.whys.shift();
    f.cmdN++; f.lastCmdTick = g.tick;
    if (nowMs) { f.cmdMs.push(nowMs); if (f.cmdMs.length > 12) f.cmdMs.shift(); f.lastCmdMs = nowMs; }
    // Zaznava strojnega ritma in šablonskih razlogov (odstrani številke pred primerjavo)
    var sus = false;
    if (f.cmdMs.length >= 7) {
      var iv = [], i; for (i = 1; i < f.cmdMs.length; i++) iv.push(f.cmdMs[i] - f.cmdMs[i - 1]);
      var m = iv.reduce(function (a, b) { return a + b; }, 0) / iv.length;
      var v = iv.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / iv.length;
      if (Math.sqrt(v) < 350 && m < 8000) sus = true;
    }
    if (f.whys.length >= 8) {
      var uniqTpl = {}, tpls = [];
      f.whys.forEach(function (w) { var tp = normWhyTemplate(w); uniqTpl[tp] = 1; tpls.push(tp); });
      if (Object.keys(uniqTpl).length <= Math.max(2, Math.floor(f.whys.length / 4))) sus = true;
      var n = tpls.length;
      if (n >= 4 && tpls[n - 1] === tpls[n - 2] && tpls[n - 2] === tpls[n - 3] && tpls[n - 3] === tpls[n - 4]) sus = true;
    }
    f.suspect = sus;
  };

  // ── Vidnost ──────────────────────────────────────────────────────────────
  function tSec(g) { return g.tick * DT; }
  function visionOf(g, f) {
    var L = OC.lightAt(tSec(g), f.d); var v = 6 + 50 * L;
    if (OC.kelpAt(f.x, f.z, f.d)) v *= 0.55;
    if (OC.wreckAt(f.x, f.z, f.d)) v *= 0.5;
    if (OC.anemoneAt(f.x, f.z, f.d)) v *= 0.7;
    if (f.mud > 0) v *= 0.6;
    return v;
  }
  function visMul(g, t, viewer) {
    var m = 0.5 + 0.12 * (t.sz || 1);
    var moving = (t.spd || 0) > 0.8;
    var onBottom = t.d > floorAt(t.x, t.z) - 1.6 && !moving;
    m *= moving ? 1.25 : (onBottom ? 0.4 : 0.8);
    if (t.spd > cruiseSpeed(t.sz || 1) * 1.6) m *= 1.6;
    if (t.bleed > 0) m *= 1.5;
    var kelp = OC.kelpAt(t.x, t.z, t.d), wreck = OC.wreckAt(t.x, t.z, t.d), cave = OC.caveAt(t.x, t.z, t.d), reef = OC.reefAt(t.x, t.z, t.d), anem = OC.anemoneAt(t.x, t.z, t.d);
    if (cave) { if (!viewer || OC.caveAt(viewer.x, viewer.z, viewer.d) !== cave) return 0; }
    if (kelp) m *= 0.25;
    if (wreck) m *= 0.25;
    if (reef && t.hid && t.sz <= OC.REEF.hideMax) m *= 0.12;
    if (anem && t.sz <= OC.ANEMONES.maxSize) m *= 0.25;
    if (t.inJelly && t.sz <= 1.5) m *= 0.28;
    if (t.mud > 0) m *= (t.color === 'sand' ? 0.22 : 0.35);
    if (OC.inBiolum(t.x, t.z, t.d) && moving) m *= 3;
    // kamuflaža
    var L = OC.lightAt(tSec(g), t.d), c = t.color;
    if (c === 'sand' && onBottom && !kelp && !reef) m *= 0.45;
    else if (c === 'kelp' && kelp) m *= 0.45;
    else if (c === 'red') m *= t.d > 55 ? 0.4 : (t.d < 25 ? 1.45 : 1);
    else if (c === 'silver' && t.d < 25 && L > 0.4) m *= 0.65;
    else if (c === 'dark' && L < 0.15) m *= 0.6;
    else if (c === 'blue' && !onBottom && t.d >= 20 && t.d <= 60) m *= 0.75;
    else if (c === 'orange') m *= 1.25;
    return m;
  }
  function canSee(g, viewer, t, baseVis) { var dd = dist3(viewer, t); return dd <= (baseVis || visionOf(g, viewer)) * visMul(g, t, viewer) ? dd : -1; }
  OC.visMul = visMul; OC.visionOf = visionOf; OC.canSee = canSee;

  function zonesOf(g, f) {
    var z = [], k = OC.kelpAt(f.x, f.z, f.d), r = OC.reefAt(f.x, f.z, f.d), a = OC.anemoneAt(f.x, f.z, f.d), w = OC.wreckAt(f.x, f.z, f.d), c = OC.caveAt(f.x, f.z, f.d), v = OC.ventAt(f.x, f.z, f.d), wf = OC.whalefallAt(f.x, f.z, f.d);
    if (k) z.push(k.id); if (r) z.push('reef'); if (a) z.push('anemones'); if (w) z.push('wreck'); if (c) z.push(c.id);
    if (wf) z.push('whalefall');
    if (v.dist < 14) z.push(v.v.id + (v.dist < 4.5 ? ' (scalding)' : ''));
    if (OC.inBiolum(f.x, f.z, f.d)) z.push('glowing water'); if (OC.inDeadzone(f.x, f.z, f.d)) z.push('stagnant water');
    if (f.inJelly) z.push('jellyfish bloom'); if (f.d < OC.SURFACE_ZONE) z.push('surface');
    if (f.d > floorAt(f.x, f.z) - 1.6) z.push('on the bottom');
    var cur = OC.currentAt(f.x, f.z, f.d); if (cur.id) z.push('current:' + cur.id);
    if (!k && !r && !a && !w && !c && !wf) z.push('open water');
    return z;
  }

  // ── Zaznava (/me) ────────────────────────────────────────────────────────
  OC.perceive = function (g, f, nowMs) {
    var see = [], pulses = [], smell = [], vis = visionOf(g, f), i, dd, cur = OC.currentAt(f.x, f.z, f.d);
    var shMul = OC.shelterMul(f.x, f.z, f.d);
    var effCur = { x: cur.x * shMul, z: cur.z * shMul, d: cur.d * shMul };
    function entry(t, kind, extra) {
      var e = { id: t.id, kind: kind, bearing: Math.round(bearing(f.x, f.z, t.x, t.z)), rel: Math.round(relAngle(bearing(f.x, f.z, t.x, t.z), f.h)), dist: Math.round(dist3(f, t) * 10) / 10, x: Math.round(t.x), z: Math.round(t.z), depth: Math.round(t.d * 10) / 10 };
      if (extra) for (var k in extra) e[k] = extra[k];
      return e;
    }
    function pulse(t, kind, fast) {
      var p = { bearing: Math.round(bearing(f.x, f.z, t.x, t.z) / 10) * 10, dist: Math.round(dist3(f, t) / 5) * 5, size: kind };
      if (fast) p.fast = true;
      pulses.push(p);
    }
    function smellOf(src, kind, strength) {
      if (OC.inDeadzone(f.x, f.z, f.d)) return;
      var dx = f.x - src.x, dz = f.z - src.z, dist = distH(f, src); if (dist > 110) return;
      var cl = Math.sqrt(cur.x * cur.x + cur.z * cur.z);
      var down = cl < 0.3 ? 1 : (dx * cur.x + dz * cur.z) / (Math.max(dist, 0.1) * cl);
      if (down < -0.2) return;
      smell.push({ kind: kind, bearing: Math.round(bearing(f.x, f.z, src.x, src.z) / 15) * 15, strength: Math.round(strength * (1 - dist / 120) * 10) / 10 });
    }
    if (g.status === 'running') {
      for (i = 0; i < g.fish.length; i++) {
        var o = g.fish[i]; if (o === f || !o.alive) continue;
        dd = canSee(g, f, o, vis);
        if (dd >= 0) see.push(entry(o, 'fish', { name: o.n, size: Math.round(o.sz * 10) / 10, heading: Math.round(o.h), speed: Math.round(o.spd * 10) / 10, moving: o.spd > 0.8, bleeding: o.bleed > 0 }));
        else {
          var isFast = o.spd > cruiseSpeed(o.sz) * 1.4 || o.lunge > 0;
          var pRng = (isFast ? 18 + 3 * o.sz : 11 + 2.5 * o.sz);
          if (o.spd > 0.8 && OC.caveAt(f.x, f.z, f.d) === OC.caveAt(o.x, o.z, o.d) && dist3(f, o) < pRng) pulse(o, o.sz > f.sz * 1.3 ? 'large' : (o.sz < f.sz * 0.7 ? 'small' : 'similar'), isFast);
        }
        if (o.bleed > 0) smellOf(o, 'blood', 1 + o.sz * 0.3);
      }
      var sh = g.shark; dd = canSee(g, f, sh, vis);
      if (dd >= 0) see.push(entry(sh, 'shark', { size: sh.size, heading: Math.round(sh.h), speed: Math.round(sh.spd * 10) / 10, moving: sh.spd > 0.8 }));
      else if (sh.spd > 0.8 && dist3(f, sh) < 34) pulse(sh, 'huge', sh.spd > 5);
      for (i = 0; i < g.schools.length; i++) { var s = g.schools[i]; if (s.n <= 0) continue; if (dist3(f, s) < vis * 1.6 + 8) see.push(entry(s, 'sardine school', { count: Math.round(s.n / 10) * 10, moving: true })); }
      for (i = 0; i < g.lanterns.length; i++) { var ln = g.lanterns[i]; if (ln.n <= 0) continue; if (dist3(f, ln) < vis * 1.5 + 8) see.push(entry(ln, 'lanternfish school', { count: Math.round(ln.n / 10) * 10, moving: true })); }
      for (i = 0; i < g.plankton.length; i++) { var p = g.plankton[i]; if (p.amt <= 1) continue; if (dist3(f, p) < vis * 1.2 + p.r) { see.push(entry(p, 'plankton cloud', { radius: p.r, density: Math.round(p.amt) })); } else smellOf(p, 'plankton', 0.4); }
      var j = g.jellies; if (dist3(f, j) < vis * 1.4 + j.r) see.push(entry(j, 'jellyfish bloom', { radius: j.r, count: j.n }));
      for (i = 0; i < g.crabs.length; i++) { var c = g.crabs[i]; if (!c.alive) continue; if (dist3(f, c) < Math.min(vis, 18)) see.push(entry(c, 'crab', { size: 0.3 })); }
      for (i = 0; i < g.puffers.length; i++) { var u = g.puffers[i]; if (!u.alive) continue; if (dist3(f, u) < vis * 0.85) see.push(entry(u, 'pufferfish', { size: 0.8, moving: true })); }
      for (i = 0; i < g.carrion.length; i++) { var k = g.carrion[i]; if (dist3(f, k) < vis * 1.1) see.push(entry(k, 'carcass', { size: Math.round(k.sz * 10) / 10, remaining: Math.round(k.en) })); else smellOf(k, 'carrion', 1 + k.sz * 0.4); }
      if (g.whalePool > 1) smellOf(OC.WHALEFALL, 'carrion', 1.8);
      var cw = OC.REEF.cleaner; if (dist3(f, cw) < vis) see.push(entry({ id: 'cleaner', x: cw.x, z: cw.z, d: cw.d }, 'cleaner wrasse station', {}));
    }
    see.sort(function (a, b) { return a.dist - b.dist; }); if (see.length > 24) see.length = 24;
    var events = []; for (i = 0; i < f.ev.length; i++) { var e = f.ev[i]; if (e.t >= f.lastMeTick || f.ev.length - i <= 3) events.push(e.c > 1 ? e.txt + ' (×' + e.c + (e.n ? ', total ' + Math.round(e.n) : '') + ')' : e.txt); }
    var fl = floorAt(f.x, f.z);
    var alive = g.fish.filter(function (x) { return x.alive; }).length;
    var out = {
      status: g.status, gen: g.gen, tick: g.tick, t: Math.round(tSec(g)), timeLeft: Math.max(0, Math.round((C.MAX_TICKS - g.tick) * DT)),
      light: { phase: OC.phaseName(tSec(g)), here: Math.round(OC.lightAt(tSec(g), f.d) * 100) / 100, visionRange: Math.round(vis) },
      you: { id: f.id, name: f.n, alive: f.alive, x: Math.round(f.x * 10) / 10, z: Math.round(f.z * 10) / 10, depth: Math.round(f.d * 10) / 10, floorBelow: Math.round(fl * 10) / 10, heading: Math.round(f.h), pitch: Math.round(f.p), speed: Math.round(f.spd * 10) / 10,
        hp: Math.round(f.hp), hpMax: hpMax(f.sz), energy: Math.round(f.en), energyMax: enMax(f.sz), stamina: Math.round(f.st), size: Math.round(f.sz * 100) / 100, bleeding: f.bleed > 0, poisoned: f.poison > 0, hidden: !!f.hid,
        temp: OC.tempAt(f.x, f.z, f.d), current: { x: Math.round(effCur.x * 10) / 10, z: Math.round(effCur.z * 10) / 10, vertical: Math.round(effCur.d * 10) / 10 }, zone: zonesOf(g, f),
        color: f.color, kills: f.kills, eaten: Math.round(f.ate),
        command: { act: f.cmd.act, speed: f.cmd.speed, heading: Math.round(f.cmd.h), pitch: Math.round(f.cmd.p), target: f.cmd.target, goto: f.cmd.goto ? [f.cmd.goto.x, f.cmd.goto.z, f.cmd.goto.d] : null, secondsLeft: Math.max(0, Math.round((f.cmd.until - g.tick) * DT)) } },
      see: see, pulses: pulses, smell: smell, events: events, fishAlive: alive, fishTotal: g.fish.length
    };
    if (!f.alive) out.you.died = f.cause;
    if (g.status === 'lobby') out.lobby = { seats: g.fish.length + '/' + C.MAX_SEATS, startsInSec: g.lobbyUntilMs ? Math.max(0, Math.round((g.lobbyUntilMs - (nowMs || Date.now())) / 1000)) : null, note: 'waiting for players; poll /me every 20–30 s' };
    if (g.status === 'finished') out.result = { winner: g.winner, ranks: g.ranks };
    if (f.idleWarn) out.warning = 'no command for ' + f.idleWarn + ' s — you are removed after ' + C.IDLE_SEC + ' s without /cmd';
    f.lastMeTick = g.tick; f.meN++;
    return out;
  };

  // ── Simulacija ───────────────────────────────────────────────────────────
  function kill(g, f, cause, killer) {
    f.alive = false; f.died = g.tick; f.cause = cause; f.spd = 0; f.hid = false;
    g.carrion.push({ id: 'k' + (g.nextK++), x: f.x, z: f.z, d: f.d, sz: f.sz, en: 35 * f.sz, age: 0, of: f.id });
    if (killer && killer.id) { killer.kills++; }
    addFeed(g, f.n + ' ' + cause);
  }
  function hurt(g, f, dmg, cause, key, txt, by) {
    if (!f.alive) return; f.hp -= dmg; f.hid = false; f.bleed = Math.max(f.bleed, cause === 'bite' || cause === 'shark' ? 80 : 20);
    ev(f, key, txt, -dmg);
    if (f.hp <= 0) {
      f.hp = 0;
      kill(g, f, cause === 'bite' && by ? 'was eaten by ' + by.n : cause === 'shark' ? 'was taken by the shark' : cause === 'starve' ? 'starved' : cause === 'bird' ? 'was snatched from the surface' : cause === 'moray' ? 'died in a cave' : cause === 'heat' ? 'was boiled at a vent' : cause === 'jelly' ? 'was stung to death' : cause === 'anemone' ? 'was stung in the anemone garden' : cause === 'poison' ? 'died of poison' : cause === 'deadzone' ? 'suffocated in stagnant water' : cause === 'wreck' ? 'bled out on the rusted wreck' : 'died', by);
    }
  }
  function findTarget(g, id) {
    var i;
    if (!id) return null;
    if (id === 'shark') return { kind: 'shark', o: g.shark };
    for (i = 0; i < g.fish.length; i++) if (g.fish[i].id === id && g.fish[i].alive) return { kind: 'fish', o: g.fish[i] };
    for (i = 0; i < g.schools.length; i++) if (g.schools[i].id === id && g.schools[i].n > 0) return { kind: 'school', o: g.schools[i] };
    for (i = 0; i < g.lanterns.length; i++) if (g.lanterns[i].id === id && g.lanterns[i].n > 0) return { kind: 'lantern', o: g.lanterns[i] };
    for (i = 0; i < g.plankton.length; i++) if (g.plankton[i].id === id) return { kind: 'plankton', o: g.plankton[i] };
    for (i = 0; i < g.crabs.length; i++) if (g.crabs[i].id === id && g.crabs[i].alive) return { kind: 'crab', o: g.crabs[i] };
    for (i = 0; i < g.puffers.length; i++) if (g.puffers[i].id === id && g.puffers[i].alive) return { kind: 'puffer', o: g.puffers[i] };
    for (i = 0; i < g.carrion.length; i++) if (g.carrion[i].id === id) return { kind: 'carrion', o: g.carrion[i] };
    if (id === 'cleaner') return { kind: 'cleaner', o: { id: 'cleaner', x: OC.REEF.cleaner.x, z: OC.REEF.cleaner.z, d: OC.REEF.cleaner.d } };
    return null;
  }
  function gain(g, f, e, key, txt) {
    f.en = Math.min(enMax(f.sz), f.en + e); f.ate += e;
    var ns = Math.min(C.MAX_SIZE, f.sz + e * C.GROWTH);
    if (Math.floor(ns * 10) > Math.floor(f.sz * 10)) ev(f, 'grow', 'you grew: size ' + (Math.round(ns * 100) / 100));
    f.sz = ns; ev(f, key, txt, e);
  }

  function inFront(f, t, half) { return Math.abs(relAngle(bearing(f.x, f.z, t.x, t.z), f.h)) <= half; }
  function tryBite(g, f, tgt) {
    if (f.cool > 0 || !tgt) return false;
    var o = tgt.o, r = reach(f.sz) + (f.lunge > 0 ? 3.0 : 0), dd = dist3(f, o);
    var rr = tgt.kind === 'school' || tgt.kind === 'lantern' ? r + 6 : tgt.kind === 'plankton' ? r + o.r : tgt.kind === 'carrion' ? r + 2 : tgt.kind === 'cleaner' ? r + 3 : r;
    if (dd > rr || !inFront(f, o, tgt.kind === 'fish' || tgt.kind === 'shark' ? 75 : 110)) return false;
    var dmg, mul = (f.lunge > 0 ? 1.6 : 1) * (f.ambush > 0 ? 1.5 : 1);
    switch (tgt.kind) {
      case 'fish':
        if (OC.caveAt(f.x, f.z, f.d) !== OC.caveAt(o.x, o.z, o.d)) return false;
        f.cool = C.BITE_CD; f.bites++; f.hid = false; f.ambush = 0;
        if (f.sz >= o.sz * C.SWALLOW_RATIO) {
          kill(g, o, 'was swallowed whole by ' + f.n, f); o.hp = 0;
          ev(o, 'swal', 'you were swallowed whole by ' + f.n + ' (size ' + (Math.round(f.sz * 10) / 10) + ')');
          f.hp = Math.min(hpMax(f.sz), f.hp + 12 * o.sz);
          gain(g, f, 35 * o.sz, 'eatfish', 'you swallowed ' + o.n + ' whole');
          return true;
        }
        var behind = Math.abs(relAngle(bearing(o.x, o.z, f.x, f.z), o.h)) > 125;
        dmg = biteDmg(f.sz) * mul * (behind ? 1.8 : 1) * (o.sz > f.sz * 1.3 && !behind ? 0.6 : 1);
        dmg = Math.round(dmg);
        o.wounded = Math.max(o.wounded, 8);
        hurt(g, o, dmg, 'bite', 'bit:' + f.id, 'bitten by ' + f.n + ' (size ' + (Math.round(f.sz * 10) / 10) + ') from ' + (behind ? 'behind' : 'the ' + (relAngle(bearing(o.x, o.z, f.x, f.z), o.h) < 0 ? 'left' : 'right')) + ': -' + dmg + ' hp', f);
        ev(f, 'bite:' + o.id, 'you bit ' + o.n + ': -' + dmg + ' hp' + (o.alive ? ' (it has ~' + Math.round(o.hp / hpMax(o.sz) * 100) + '% left, size ' + (Math.round(o.sz * 10) / 10) + ')' : ''), dmg);
        if (!o.alive) {
          f.hp = Math.min(hpMax(f.sz), f.hp + 12 * o.sz);
          gain(g, f, 30 * o.sz, 'eatfish', 'you killed ' + o.n + ' and fed on it');
        }
        return true;
      case 'shark':
        f.cool = C.BITE_CD; f.bites++; ev(f, 'biteshark', 'you bit the shark; it snapped back in fury'); g.shark.target = f.id; g.shark.state = 'hunt'; return true;
      case 'school':
        f.cool = C.BITE_CD; var pc = f.sz > 5 ? 0.50 : 0.75;
        if (rnd(g) < pc) { o.n -= 1; gain(g, f, f.sz > 5 ? 6 : 10, 'sard', 'you caught a sardine'); }
        else ev(f, 'sardmiss', 'the sardines scattered; missed');
        o.flee = 28; return true;
      case 'lantern':
        f.cool = C.BITE_CD; var lpc = f.sz > 6 ? 0.45 : 0.72;
        if (rnd(g) < lpc) { o.n -= 1; gain(g, f, f.sz > 6 ? 6 : 14, 'lant', 'you caught a lanternfish'); }
        else ev(f, 'lantmiss', 'the lanternfish darted away; missed');
        o.flee = 24; return true;
      case 'plankton':
        if (f.sz > 2.6) { ev(f, 'plank', 'you cannot filter plankton with a mouth this size'); f.cool = C.BITE_CD; return true; }
        if (o.amt < 1) return false; f.cool = 2; var e = Math.min(o.amt, 1.5); o.amt -= e; gain(g, f, e, 'plank', 'filter-feeding on plankton'); return true;
      case 'crab':
        f.cool = C.BITE_CD; if (f.sz < 1.3) { ev(f, 'crabno', 'the crab shell is too hard for you'); return true; }
        o.alive = false; o.rt = 960; gain(g, f, 22, 'crab', 'you cracked a crab'); return true;
      case 'puffer':
        f.cool = C.BITE_CD; if (f.sz >= 4.5) { o.alive = false; o.rt = 2400; f.hp = Math.min(hpMax(f.sz), f.hp + 15); gain(g, f, 50, 'puff', 'you swallowed a pufferfish'); return true; }
        var pDur = f.color === 'orange' ? 20 : 40;
        f.poison = Math.max(f.poison, pDur); o.x += (f.x - o.x) * -0.5;
        ev(f, 'puffpoison', 'the pufferfish inflated; your mouth is full of spines and you feel sick'); return true;
      case 'carrion':
        f.cool = 2; var ce = Math.min(o.en, 2.2); o.en -= ce; gain(g, f, ce, 'carr', 'you fed on a carcass'); return true;
      case 'cleaner':
        return false;
    }
    return false;
  }

  function nearestFood(g, f, rng) {
    var best = null, bd = 1e9, i, dd;
    function cons(kind, o, extra) { dd = dist3(f, o) - (extra || 0); if (dd < bd) { bd = dd; best = { kind: kind, o: o }; } }
    for (i = 0; i < g.schools.length; i++) if (g.schools[i].n > 0) cons('school', g.schools[i], 6);
    for (i = 0; i < g.lanterns.length; i++) if (g.lanterns[i].n > 0) cons('lantern', g.lanterns[i], 6);
    for (i = 0; i < g.plankton.length; i++) if (g.plankton[i].amt >= 1 && f.sz <= 2.6) cons('plankton', g.plankton[i], g.plankton[i].r);
    for (i = 0; i < g.crabs.length; i++) if (g.crabs[i].alive && f.sz >= 1.3) cons('crab', g.crabs[i], 0);
    for (i = 0; i < g.carrion.length; i++) cons('carrion', g.carrion[i], 2);
    return bd < (rng || 16) ? best : null;
  }

  function stepFish(g, f) {
    var cmd = f.cmd, i;
    f.inJelly = false; var j = g.jellies; if (Math.abs(f.d - j.d) < 15 && OC.dist2(f.x, f.z, j.x, j.z) < j.r * j.r) f.inJelly = true;
    var idleT = (g.tick - f.lastCmdTick) * DT; f.idleWarn = idleT > C.IDLE_SEC * 0.6 ? Math.round(idleT) : 0;
    if (idleT > C.IDLE_SEC) { kill(g, f, 'went limp (no command for ' + C.IDLE_SEC + ' s)'); return; }
    if (g.tick > cmd.until && cmd.act !== 'hide') {
      if (cmd.speed !== 'rest' || cmd.act !== 'swim') ev(f, 'expired', 'your command expired; drifting');
      cmd.act = 'swim'; cmd.speed = 'rest'; cmd.goto = null; cmd.target = null;
    }
    var wantH = cmd.h, wantP = cmd.p, speedMode = cmd.speed, tgt = null;
    if (cmd.act === 'feed') {
      tgt = cmd.target ? findTarget(g, cmd.target) : nearestFood(g, f, 24);
      if (tgt && (tgt.kind === 'fish' || tgt.kind === 'shark')) tgt = null;
      if (tgt && dist3(f, tgt.o) > 1.5) { wantH = bearing(f.x, f.z, tgt.o.x, tgt.o.z); wantP = clamp(Math.atan2(tgt.o.d - f.d, Math.max(distH(f, tgt.o), 0.5)) * R2D, -75, 75); }
      else if (!tgt && cmd.goto) {
        var gdF = distH(f, cmd.goto), gddF = cmd.goto.d !== null ? cmd.goto.d - f.d : 0;
        if (gdF >= 2.5 || Math.abs(gddF) >= 2.5) { wantH = bearing(f.x, f.z, cmd.goto.x, cmd.goto.z); wantP = clamp(Math.atan2(gddF, Math.max(gdF, 0.5)) * R2D, -75, 75); }
      }
    }
    if (cmd.act === 'hunt' || cmd.act === 'flee') {
      tgt = findTarget(g, cmd.target);
      var sameCave = !tgt || OC.caveAt(f.x, f.z, f.d) === OC.caveAt(tgt.o.x, tgt.o.z, tgt.o.d);
      var detect = tgt && sameCave && (tgt.kind === 'fish' || tgt.kind === 'shark' ? canSee(g, f, tgt.o) >= 0 || dist3(f, tgt.o) < 12 : dist3(f, tgt.o) < 90);
      if (!tgt || !detect) { ev(f, 'lost', 'target ' + cmd.target + ' lost; swimming on'); cmd.act = 'swim'; cmd.target = null; tgt = null; }
      else {
        var b = bearing(f.x, f.z, tgt.o.x, tgt.o.z), dh = distH(f, tgt.o);
        wantP = clamp(Math.atan2(tgt.o.d - f.d, Math.max(dh, 0.5)) * R2D, -75, 75);
        if (cmd.act === 'flee') { wantH = norm360(b + 180); wantP = -wantP * 0.5; }
        else { wantH = b; if (speedMode === 'rest') speedMode = 'cruise'; }
      }
    } else if (cmd.goto && cmd.act !== 'feed') {
      var gd = distH(f, cmd.goto), gdd = cmd.goto.d !== null ? cmd.goto.d - f.d : 0;
      if (gd < 2.5 && Math.abs(gdd) < 2.5) { ev(f, 'arrived', 'arrived at goto'); cmd.goto = null; if (cmd.act === 'swim') cmd.speed = 'rest'; speedMode = 'rest'; }
      else { wantH = bearing(f.x, f.z, cmd.goto.x, cmd.goto.z); wantP = clamp(Math.atan2(gdd, Math.max(gd, 0.5)) * R2D, -75, 75); if (gd < 2.5) wantH = f.h; }
    }
    if (cmd.act === 'hide') speedMode = 'rest';
    if (cmd.act === 'feed' && speedMode === 'rest') speedMode = 'slow';
    // obrat
    var tr = turnRate(f.sz) * DT; f.h = turnToward(f.h, wantH, tr); f.p = turnToward(f.p, wantP, tr); if (f.p > 180) f.p -= 360;
    // hitrost
    var cold = f.d > OC.THERMO, mul = SPEEDS[speedMode] || 0, base = cruiseSpeed(f.sz);
    var stRegenMul = (cold ? 0.7 : 1) * (f.poison > 0 ? 0.5 : 1);
    if (speedMode === 'sprint') { if (f.st > 0) f.st = Math.max(0, f.st - 25 * DT); else mul = SPEEDS.fast; }
    else if (!OC.inDeadzone(f.x, f.z, f.d)) f.st = Math.min(100, f.st + (speedMode === 'fast' ? 2 : 8) * DT * stRegenMul);
    var spd = base * mul * (cold ? 0.88 : 1);
    var kelp = OC.kelpAt(f.x, f.z, f.d); if (kelp) spd *= f.sz > 4 ? 0.5 : 0.75;
    var anem = OC.anemoneAt(f.x, f.z, f.d); if (anem && f.sz > OC.ANEMONES.maxSize) spd *= 0.85;
    if (f.inJelly) spd *= 0.85;
    if (f.poison > 0) spd *= 0.85;
    if (f.wounded > 0) { spd *= 0.72; f.wounded--; }
    if (f.lunge > 0) { spd = Math.max(spd, base * 3.4); f.lunge--; }
    f.spd = spd;
    var cur = OC.currentAt(f.x, f.z, f.d), shMul = OC.shelterMul(f.x, f.z, f.d);
    var hr = f.h * D2R, pr = f.p * D2R;
    var vx = Math.sin(hr) * Math.cos(pr) * spd + cur.x * shMul, vz = -Math.cos(hr) * Math.cos(pr) * spd + cur.z * shMul, vd = Math.sin(pr) * spd + cur.d * shMul;
    var nx = clamp(f.x + vx * DT, 1, OC.W - 1), nz = clamp(f.z + vz * DT, 1, OC.L - 1), nd = f.d + vd * DT;
    // jame: vstop omejen z velikostjo
    var cv = OC.caveAt(nx, nz, nd);
    if (cv && f.sz > cv.maxSize && OC.caveAt(f.x, f.z, f.d) !== cv) { ev(f, 'cavesmall', 'the entrance of ' + cv.id + ' is too narrow for you (size ' + (Math.round(f.sz * 10) / 10) + ')'); nx = f.x; nz = f.z; nd = f.d; cv = null; }
    if (cv && cv !== f.cave) {
      f.cave = cv;
      if (cv.moray && !g.morayDone) {
        if (f.sz < 2.6) hurt(g, f, 25, 'moray', 'moray', 'something in the cave bit you: -25 hp');
        else { g.morayDone = true; f.hp = Math.min(hpMax(f.sz), f.hp + 10); gain(g, f, 30, 'moraykill', 'you overpowered the moray inside the cave and feasted'); }
      }
    }
    if (!cv) f.cave = null;
    if (cv && cv.crystal && !OC.inDeadzone(f.x, f.z, f.d)) f.st = Math.min(100, f.st + 4 * DT);
    var nfl = floorAt(nx, nz);
    if (!cv && nd > nfl - 0.6) { nd = nfl - 0.6; if (f.p > 0) f.p = 0; }
    if (nd < 0.4) { nd = 0.4; if (f.p < 0) f.p = 0; }
    if (nd > OC.DMAX - 0.5) nd = OC.DMAX - 0.5;
    f.x = nx; f.z = nz; f.d = nd;
    if (f.cool > 0) f.cool--;
    if (f.mud > 0) f.mud--;
    if (f.mudCd > 0) f.mudCd--;
    if (f.birdWarn > 0) f.birdWarn--;
    // beleži obiskane cone
    var zs = zonesOf(g, f); for (i = 0; i < zs.length; i++) f.zoneSeen[zs[i]] = 1;
    // skrivanje in zaseda
    var reef = OC.reefAt(f.x, f.z, f.d), wreck = OC.wreckAt(f.x, f.z, f.d);
    anem = OC.anemoneAt(f.x, f.z, f.d);
    var wasHid = f.hid;
    f.hid = cmd.act === 'hide' && f.spd < 0.5 && ((reef && f.sz <= OC.REEF.hideMax) || kelp || (wreck && f.sz <= OC.WRECK.hideMax) || (anem && f.sz <= OC.ANEMONES.maxSize) || !!cv || f.d > nfl - 1.6);
    if (wasHid && !f.hid) f.ambush = 8;
    else if (f.ambush > 0) f.ambush--;
    // dvig mulja na dnu ob begu ali skrivanju
    if ((cmd.act === 'flee' || cmd.act === 'hide') && f.d > nfl - 2.2 && f.mudCd <= 0 && !cv && !kelp && !reef) {
      f.mud = 24; f.mudCd = 140; ev(f, 'mud', 'you kicked up a cloud of silt');
    }
    // energija (Kleiberjev zakon: večje ribe porabijo več absolutno, a imajo daljšo rezervo)
    var drain = 0.068 * Math.pow(f.sz, 0.78) * (speedMode === 'rest' ? 1 : speedMode === 'slow' ? 1.3 : speedMode === 'cruise' ? 1.8 : speedMode === 'fast' ? 3.2 : 5.5) * DT;
    if (cold) drain *= 0.65;
    var vn = OC.ventAt(f.x, f.z, f.d); if (vn.dist < 14) drain *= 0.45;
    f.en -= drain;
    if (f.en <= 0) { f.en = 0; hurt(g, f, 2.2 * DT, 'starve', 'starve', 'you are starving: losing hp'); }
    // okolje
    if (vn.dist < 4.5) hurt(g, f, 4 * DT, 'heat', 'heat', 'the water here is scalding: losing hp');
    if (OC.inDeadzone(f.x, f.z, f.d)) hurt(g, f, 0.8 * DT, 'deadzone', 'dead', 'it is hard to breathe here: losing hp');
    if (f.inJelly && f.sz > 1.5) hurt(g, f, (f.color === 'orange' ? 0.75 : 1.5) * DT, 'jelly', 'jelly', 'stung by jellyfish: losing hp');
    if (anem && f.sz > OC.ANEMONES.maxSize) hurt(g, f, (f.color === 'orange' ? 1.5 : 3.0) * DT, 'anemone', 'anemone', 'the anemone tentacles sting you: losing hp');
    if (wreck && speedMode === 'sprint' && rnd(g) < 0.12) hurt(g, f, 5, 'wreck', 'wreck', 'you scraped against rusted metal inside the wreck: -5 hp');
    if (OC.phaseName(tSec(g)) === 'day' && f.sz < 3) {
      if (f.d < 6.5 && f.d >= OC.SURFACE_ZONE && f.birdWarn <= 0) { f.birdWarn = 28; ev(f, 'birdwarn', 'shadows of seabirds sweep across the sunlit surface above'); }
      if (f.d < OC.SURFACE_ZONE && rnd(g) < 0.012) hurt(g, f, 25, 'bird', 'bird', 'something struck you from above: -25 hp');
    }
    if (f.poison > 0) { f.poison--; hurt(g, f, f.color === 'orange' ? 0.35 : 0.65, 'poison', 'poison', 'you feel sick: losing hp'); }
    if (f.bleed > 0) f.bleed--;
    if (!f.alive) return;
    // čistilci
    var cw = OC.REEF.cleaner;
    if (f.spd < 0.5 && dist3(f, cw) < 4.5 && f.en > 5 && (f.hp < hpMax(f.sz) || f.bleed > 0 || f.poison > 0)) {
      var healAmt = (f.color === 'orange' ? 3.5 : 2.0) * DT;
      f.hp = Math.min(hpMax(f.sz), f.hp + healAmt); f.bleed = 0; f.poison = 0;
      ev(f, 'clean', 'cleaner wrasses are picking at your wounds: hp ' + Math.round(f.hp), healAmt);
    }
    // hranjenje / lov
    if (cmd.act === 'hunt' && tgt) tryBite(g, f, tgt);
    else if (cmd.act === 'feed') { if (!tgt || !tryBite(g, f, tgt)) { var nf = nearestFood(g, f); if (nf) tryBite(g, f, nf); } }
    else if (f.lunge > 0 || (cmd.act === 'swim' && cmd.target)) { var lt = findTarget(g, cmd.target); if (lt) tryBite(g, f, lt); }
    // drobna hrana v okolju (končna zaloga, v lakoti se ne obnavlja)
    if (reef && cmd.act === 'feed' && f.sz <= 1.5 && f.cool <= 0 && g.snailPool > 0.5) { f.cool = 4; var se = Math.min(g.snailPool, 0.7); g.snailPool -= se; gain(g, f, se, 'snail', 'you are picking snails off the reef'); }
    if (anem && cmd.act === 'feed' && f.sz <= OC.ANEMONES.maxSize && f.cool <= 0) { f.cool = 4; gain(g, f, 1.1, 'anemfood', 'you picked tiny shrimp from the anemones'); }
    if (wreck && cmd.act === 'feed' && f.sz <= 3.5 && f.cool <= 0 && g.wreckPool > 0.5) { f.cool = 4; var we = Math.min(g.wreckPool, 1.1); g.wreckPool -= we; gain(g, f, we, 'wreckfood', 'you caught barnacles and shrimp in the wreck'); }
    if (vn.dist < 10.5 && vn.dist > 4.5 && cmd.act === 'feed' && f.cool <= 0 && g.matPool > 0.5) { f.cool = 4; var me_ = Math.min(g.matPool, f.sz > 3.5 ? 0.5 : 1.0); g.matPool -= me_; gain(g, f, me_, 'mat', 'you are grazing the bacterial mat'); }
    if (OC.whalefallAt(f.x, f.z, f.d) && cmd.act === 'feed' && f.cool <= 0 && g.whalePool > 0.5) { f.cool = 3; var wfe = Math.min(g.whalePool, 2.2); g.whalePool -= wfe; gain(g, f, wfe, 'whale', 'you tore flesh from the sunken whale skeleton'); }
  }

  function stepShark(g) {
    var s = g.shark, i, best = null, bd = 1e9;
    if (s.sat > 0) s.sat--;
    if (s.tired > 0) s.tired--;
    if (s.sat <= 0) {
      for (i = 0; i < g.fish.length; i++) {
        var f = g.fish[i]; if (!f.alive || f.sz >= 8) continue;
        if (OC.kelpAt(f.x, f.z, f.d) || OC.wreckAt(f.x, f.z, f.d) || OC.caveAt(f.x, f.z, f.d) || OC.reefAt(f.x, f.z, f.d) || OC.anemoneAt(f.x, f.z, f.d) || f.inJelly || floorAt(f.x, f.z) < 20) continue;
        var dd = dist3(s, f), rng = 30 * visMul(g, f, s) + (f.bleed > 0 ? 110 : 0);
        if (dd < rng && dd < bd) { bd = dd; best = f; }
      }
      for (i = 0; i < g.carrion.length; i++) { var k = g.carrion[i]; var kd = dist3(s, k); if (kd < 80 && kd * 1.5 < bd && floorAt(k.x, k.z) >= 20) { bd = kd * 1.5; best = k; } }
    }
    if (best) { s.target = best.id; s.state = best.sz !== undefined && best.alive !== undefined ? 'hunt' : 'scavenge'; }
    else if (s.state !== 'patrol' && (!s.target || !findTarget(g, s.target))) { s.state = 'patrol'; s.target = null; }
    var tgt = s.state === 'patrol' ? null : (findTarget(g, s.target) || null);
    if (tgt && tgt.kind === 'fish') {
      var tf = tgt.o;
      if (OC.kelpAt(tf.x, tf.z, tf.d) || OC.wreckAt(tf.x, tf.z, tf.d) || OC.caveAt(tf.x, tf.z, tf.d) || OC.reefAt(tf.x, tf.z, tf.d) || OC.anemoneAt(tf.x, tf.z, tf.d) || tf.inJelly || floorAt(tf.x, tf.z) < 20) {
        tgt = null; s.state = 'patrol'; s.target = null;
      }
    }
    if (!tgt) { s.state = 'patrol'; s.target = null; }
    var wp = tgt ? tgt.o : OC.SHARK_PATH[s.wp];
    if (!tgt && dist3(s, wp) < 8) { s.wp = (s.wp + 1) % OC.SHARK_PATH.length; wp = OC.SHARK_PATH[s.wp]; }
    var b = bearing(s.x, s.z, wp.x, wp.z); s.h = turnToward(s.h, b, 55 * DT);
    var dh = distH(s, wp), p = clamp(Math.atan2(wp.d - s.d, Math.max(dh, 0.5)) * R2D, -45, 45);
    var spd = 3.0;
    if (tgt) {
      var td = dist3(s, tgt.o);
      if (td < 28 && s.tired <= 0) { if (s.sprint <= 0) s.sprint = 18; }
      if (s.sprint > 0) { spd = 7.4; s.sprint--; if (s.sprint === 0) s.tired = 90; }
      else if (s.tired > 0) spd = 1.6;
      else spd = 3.5;
      if (td < 3.8 && tgt.kind === 'fish') {
        var f2 = tgt.o;
        if (f2.sz <= 4) { kill(g, f2, 'was taken by the shark'); f2.hp = 0; ev(f2, 'sharkeat', 'the shark took you'); }
        else hurt(g, f2, 45, 'shark', 'shark', 'the shark bit you: -45 hp');
        s.sat = 420; s.state = 'patrol'; s.target = null; s.kills++;
      }
      if (td < 4 && tgt.kind === 'carrion') { tgt.o.en -= 6; if (tgt.o.en <= 0) { s.sat = 300; s.state = 'patrol'; s.target = null; } }
    } else if (s.tired > 0) spd = 1.8;
    s.spd = spd; var hr = s.h * D2R, pr = p * D2R;
    var nx = clamp(s.x + Math.sin(hr) * Math.cos(pr) * spd * DT, 2, OC.W - 2), nz = clamp(s.z - Math.cos(hr) * Math.cos(pr) * spd * DT, 2, OC.L - 2), nd = s.d + Math.sin(pr) * spd * DT;
    if (floorAt(nx, nz) < 20) { s.state = 'patrol'; s.target = null; s.wp = (s.wp + 1) % OC.SHARK_PATH.length; } else { s.x = nx; s.z = nz; }
    s.d = clamp(nd, 3, floorAt(s.x, s.z) - 2);
  }

  function stepSchoolList(g, list, dayD, nightD, maxN, speedMul, night) {
    var i, j;
    for (i = 0; i < list.length; i++) {
      var s = list[i]; if (s.n <= 0) continue;
      var threat = null, td = 1e9;
      for (j = 0; j < g.fish.length; j++) { var f = g.fish[j]; if (!f.alive || f.spd < 0.3) continue; var dd = dist3(s, f); if (dd < 16 && dd < td) { td = dd; threat = f; } }
      if (dist3(s, g.shark) < 20) { threat = g.shark; }
      var spd = 1.2 * speedMul, want;
      if (threat) { want = norm360(bearing(s.x, s.z, threat.x, threat.z) + 180 + (rnd(g) - 0.5) * 60); spd = 3.5 * speedMul; s.flee = 22; }
      else if (s.flee > 0) { s.flee--; want = s.h; spd = 2.8 * speedMul; }
      else { want = dist3(s, { x: s.hx, z: s.hz, d: s.d }) > 55 ? bearing(s.x, s.z, s.hx, s.hz) : norm360(s.h + (rnd(g) - 0.5) * 40); }
      s.h = turnToward(s.h, want, 120 * DT); var hr = s.h * D2R;
      s.x = clamp(s.x + Math.sin(hr) * spd * DT, 4, OC.W - 4); s.z = clamp(s.z - Math.cos(hr) * spd * DT, 4, OC.L - 4);
      var wd = night ? nightD : dayD; s.d = clamp(s.d + (wd - s.d) * 0.005 + (rnd(g) - 0.5) * 0.3, 2, floorAt(s.x, s.z) - 3);
      if (!g.famine && night && s.n < maxN && rnd(g) < 0.06) s.n++;
    }
  }

  function stepNPC(g) {
    var i, ts = tSec(g), ph = OC.phaseName(ts), night = ph === 'night' || ph === 'dusk';
    stepSchoolList(g, g.schools, 22, 8, 180, 1.0, ph === 'night');
    stepSchoolList(g, g.lanterns, 72, 28, 90, 0.9, night);
    for (i = 0; i < g.plankton.length; i++) {
      var p = g.plankton[i]; var cur = OC.currentAt(p.x, p.z, p.d);
      p.x = clamp(p.x + cur.x * DT * 0.8 + (rnd(g) - 0.5) * 0.1, 10, OC.W - 10); p.z = clamp(p.z + cur.z * DT * 0.8 + (rnd(g) - 0.5) * 0.1, 10, OC.L - 10);
      var wantD = ph === 'night' ? 9 : 40; p.d = clamp(p.d + (wantD - p.d) * 0.003, 2, floorAt(p.x, p.z) - 2);
      if (!g.famine && p.amt < 110) p.amt += 0.035;
      if (p.amt < 1 && !g.famine && rnd(g) < 0.002) { p.x = 30 + rnd(g) * 340; p.z = 30 + rnd(g) * 340; p.amt = 45; }
    }
    var jl = g.jellies, jc = OC.currentAt(jl.x, jl.z, jl.d), jh = OC.JELLY_HOME;
    jl.x += jc.x * DT * 0.5 + (jh.x - jl.x) * 0.0005; jl.z += jc.z * DT * 0.5 + (jh.z - jl.z) * 0.0005; jl.d = clamp(jl.d + Math.sin(ts * 0.02) * 0.02, jh.d0, jh.d1);
    for (i = 0; i < g.crabs.length; i++) { var c = g.crabs[i]; if (!c.alive && !g.famine) { c.rt--; if (c.rt <= 0) c.alive = true; } }
    for (i = 0; i < g.puffers.length; i++) {
      var u = g.puffers[i];
      if (!u.alive) { if (!g.famine) { u.rt--; if (u.rt <= 0) u.alive = true; } continue; }
      u.h = norm360(u.h + (rnd(g) - 0.5) * 30); var ur = u.h * D2R;
      u.x += Math.sin(ur) * 0.5 * DT; u.z -= Math.cos(ur) * 0.5 * DT;
      if (OC.dist2(u.x, u.z, OC.REEF.x, OC.REEF.z) > 34 * 34) u.h = bearing(u.x, u.z, OC.REEF.x, OC.REEF.z);
      u.d = clamp(u.d, 6, floorAt(u.x, u.z) - 1);
    }
    for (i = g.carrion.length - 1; i >= 0; i--) {
      var k = g.carrion[i]; k.age++; var fl = floorAt(k.x, k.z);
      if (k.d < fl - 0.8) k.d = Math.min(fl - 0.8, k.d + 0.3 * DT);
      if (k.en <= 0 || k.age > 1400) g.carrion.splice(i, 1);
    }
    if (!g.famine) {
      if (g.snailPool < 55) g.snailPool = Math.min(55, g.snailPool + 0.01);
      if (g.matPool < 110) g.matPool = Math.min(110, g.matPool + 0.015);
      if (g.wreckPool < 90) g.wreckPool = Math.min(90, g.wreckPool + 0.012);
    }
  }

  OC.stepOnce = function (g) {
    g.tick++;
    if (g.tick === C.FAMINE_TICK) { g.famine = true; addFeed(g, 'the sea is growing empty: nothing new is spawning'); }
    for (var i = 0; i < g.fish.length; i++) if (g.fish[i].alive) stepFish(g, g.fish[i]);
    stepShark(g); stepNPC(g);
    var alive = g.fish.filter(function (f) { return f.alive; });
    if ((alive.length <= 1 && g.fish.length >= C.MIN_PLAYERS) || g.tick >= C.MAX_TICKS) finish(g, alive);
  };
  function scoreOf(g, f) { var surv = (f.alive ? g.tick : f.died) - f.born; return Math.round(surv * DT / 4 + f.kills * 150 + f.sz * 60 + f.ate / 5); }
  OC.scoreOf = scoreOf;
  function compareFish(g, a, b) {
    if (!!a.cheat !== !!b.cheat) return a.cheat ? 1 : -1;
    if (a.alive !== b.alive) return a.alive ? -1 : 1;
    if (a.alive && b.alive) return scoreOf(g, b) - scoreOf(g, a);
    return (b.died || 0) - (a.died || 0) || (scoreOf(g, b) - scoreOf(g, a));
  }
  OC.rankList = function (g) {
    return g.fish.slice().sort(function (a, b) { return compareFish(g, a, b); }).map(function (f, i) {
      return { rank: i + 1, id: f.id, name: f.n, model: f.model, alive: f.alive, score: scoreOf(g, f), size: Math.round(f.sz * 100) / 100, kills: f.kills, eaten: Math.round(f.ate), survivedSec: Math.round(((f.alive ? g.tick : f.died) - f.born) * DT), decisions: f.cmdN, explored: Object.keys(f.zoneSeen || {}).length, cause: f.cause, suspect: f.suspect, cheat: f.cheat };
    });
  };
  function finish(g, alive) {
    g.status = 'finished';
    g.fish.forEach(function (f) { f.score = scoreOf(g, f); });
    g.ranks = OC.rankList(g);
    g.winner = g.ranks.length ? g.ranks[0].name : null;
    addFeed(g, g.winner ? g.winner + ' wins (' + (alive.length === 1 ? 'last fish alive' : 'highest score at the time limit') + ')' : 'game over');
  }
  OC.start = function (g, nowMs) { g.status = 'running'; g.startMs = nowMs; g.lastMs = nowMs; g.tick = 0; g.fish.forEach(function (f) { f.born = 0; f.lastCmdTick = 0; f.lastMeTick = 0; }); addFeed(g, 'the game has started with ' + g.fish.length + ' fish'); };
  OC.advance = function (g, nowMs) {
    if (g.status !== 'running') return 0;
    var n = Math.floor((nowMs - g.lastMs) / C.TICK_MS); if (n <= 0) return 0;
    if (n > C.CATCHUP_MAX) { n = C.CATCHUP_MAX; g.lastMs = nowMs - n * C.TICK_MS; }
    for (var i = 0; i < n && g.status === 'running'; i++) OC.stepOnce(g);
    g.lastMs += n * C.TICK_MS; return n;
  };

  // ── Posnetek za gledalca ─────────────────────────────────────────────────
  OC.snapshot = function (g, nowMs) {
    var ts = tSec(g);
    return {
      gen: g.gen, status: g.status, tick: g.tick, t: Math.round(ts), timeLeft: Math.max(0, Math.round((C.MAX_TICKS - g.tick) * DT)), phase: OC.phaseName(ts), light: Math.round(OC.dayLight(ts) * 100) / 100, famine: g.famine,
      lobbyIn: g.status === 'lobby' && g.lobbyUntilMs ? Math.max(0, Math.round((g.lobbyUntilMs - (nowMs || Date.now())) / 1000)) : null,
      fish: g.fish.map(function (f) { return { id: f.id, n: f.n, model: f.model, color: f.color, x: r1(f.x), z: r1(f.z), d: r1(f.d), h: Math.round(f.h), p: Math.round(f.p), spd: r1(f.spd), sz: r1(f.sz), hp: Math.round(f.hp), hpMax: hpMax(f.sz), en: Math.round(f.en), enMax: enMax(f.sz), st: Math.round(f.st), alive: f.alive, hid: f.hid, bleed: f.bleed > 0, poison: f.poison > 0, mud: f.mud > 0, kills: f.kills, ate: Math.round(f.ate), act: f.cmd.act, why: f.why, cmdN: f.cmdN, explored: Object.keys(f.zoneSeen || {}).length, suspect: f.suspect, cheat: f.cheat, cause: f.cause, idle: Math.round((g.tick - f.lastCmdTick) * DT), score: scoreOf(g, f) }; }),
      shark: { x: r1(g.shark.x), z: r1(g.shark.z), d: r1(g.shark.d), h: Math.round(g.shark.h), spd: r1(g.shark.spd), state: g.shark.state, tired: g.shark.tired > 0, target: g.shark.target, kills: g.shark.kills },
      schools: g.schools.map(function (s) { return { id: s.id, x: r1(s.x), z: r1(s.z), d: r1(s.d), h: Math.round(s.h), n: s.n }; }),
      lanterns: (g.lanterns || []).map(function (s) { return { id: s.id, x: r1(s.x), z: r1(s.z), d: r1(s.d), h: Math.round(s.h), n: s.n }; }),
      plankton: g.plankton.map(function (p) { return { id: p.id, x: r1(p.x), z: r1(p.z), d: r1(p.d), r: p.r, amt: Math.round(p.amt) }; }),
      jellies: { x: r1(g.jellies.x), z: r1(g.jellies.z), d: r1(g.jellies.d), r: g.jellies.r, n: g.jellies.n },
      crabs: g.crabs.filter(function (c) { return c.alive; }).map(function (c) { return { id: c.id, x: r1(c.x), z: r1(c.z), d: r1(c.d) }; }),
      puffers: g.puffers.filter(function (u) { return u.alive; }).map(function (u) { return { id: u.id, x: r1(u.x), z: r1(u.z), d: r1(u.d), h: Math.round(u.h) }; }),
      carrion: g.carrion.map(function (k) { return { id: k.id, x: r1(k.x), z: r1(k.z), d: r1(k.d), sz: r1(k.sz), en: Math.round(k.en) }; }),
      feed: g.feed.slice(-40), winner: g.winner, ranks: g.ranks
    };
  };
  function r1(v) { return Math.round(v * 10) / 10; }
})(OC);

// OCEAN ARENA — HTTP plast za Supabase Edge Function (naloži jo loader prek new Function).
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
  // transakcija z optimističnim zaklepanjem: fn(doc, now) -> {res, dirty}
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
    if (g.status !== 'lobby' || !g.lobbyUntilMs) return false;
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
      if (seg === '' || seg === 'health') return json({ ok: true, game: 'OCEAN ARENA', endpoints: ['GET /rules', 'GET /chart', 'GET /prompt', 'GET /prompt/en', 'POST /claim', 'GET /me?key=', 'POST /cmd', 'GET /report', 'GET /leaderboard', 'GET /history', 'GET /state (spectators only)'], version: 'v5' });
      if (seg === 'rules') return text((await pub('ocean:rules')) || 'rules not published');
      if (seg === 'prompt' || seg === 'prompts') return text((await pub(sub === 'en' ? 'ocean:prompt-en' : 'ocean:prompt')) || 'prompt not published');
      if (seg === 'chart') return json(OC.chart());
      if (seg === 'publish' && adm && req.method === 'POST') {
        var pb = await readBody(req); if (!pb) return err('bad json'); var res = [];
        for (var k in pb) { var r = await fetch(U + '/rest/v1/arena_pub?on_conflict=key', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, HEAD), body: JSON.stringify({ key: k, body: pb[k], updated_at: new Date().toISOString() }) }); res.push(k + ':' + (r.ok ? pb[k].length : 'ERR ' + r.status)); pubCache[k] = null; }
        return json({ ok: true, results: res });
      }
      if (seg === 'reset' && adm) {
        await dbInsertIfMissing();
        return resp(await withState(async function (g) { var ng = OC.newGame((g.gen || 0) + 1); for (var kk in g) delete g[kk]; Object.assign(g, ng); return { dirty: true, res: { ok: true, gen: g.gen, status: g.status } }; }));
      }
      if (seg === 'start' && adm) {
        return resp(await withState(async function (g, now) {
          if (g.status !== 'lobby') return { dirty: false, res: { ok: false, status: g.status } };
          var sec = +(u.searchParams.get('in') || 0);
          g.lobbyUntilMs = now + sec * 1000;
          lobbyTick(g, now);
          return { dirty: true, res: { ok: true, status: g.status, fish: g.fish.length, lobbyUntilMs: g.lobbyUntilMs } };
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
          if (!g.firstClaimMs) { g.firstClaimMs = now; g.lobbyUntilMs = now + C.LOBBY_SEC * 1000; }
          if (g.fish.length >= C.MAX_SEATS) g.lobbyUntilMs = Math.min(g.lobbyUntilMs, now + 20000);
          return { dirty: true, res: { ok: true, key: f.key, id: f.id, name: f.n, color: f.color, seat: g.fish.length + '/' + C.MAX_SEATS, startsInSec: Math.round((g.lobbyUntilMs - now) / 1000), note: 'keep the key secret; it dies when this game ends. Poll GET /me?key=... every 20–30 s until status is running.' } };
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
          if (g.status === 'lobby') return { dirty: false, res: json({ error: 'not started yet; poll /me until status is running', startsInSec: Math.max(0, Math.round((g.lobbyUntilMs - now) / 1000)) }, 425) };
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

