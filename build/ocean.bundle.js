// OCEAN ARENA v5 bundle — built 2026-11-22T10:55:17.759Z from engine/world.js + species.js + engine.js + http.js. DO NOT EDIT BY HAND.
// OCEAN ARENA v5 — world geometry, beaches, coastal mountains, seafloor, landmarks, currents, tides & 10x flora/rocks
var OC = globalThis.OC || (globalThis.OC = {});
(function (OC) {
  var W = 640, L = 640, DMAX = 160;
  OC.W = W; OC.L = L; OC.DMAX = DMAX; OC.VERSION = 'v5';
  OC.THERMO = 36; OC.SURFACE_ZONE = 4.5;
  OC.DAY_SEC = 420;  // 7 min = full day-night cycle
  OC.TIDE_SEC = 600; // 10 min tidal cycle
  OC._tide = 1;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function sstep(e0, e1, x) { var t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
  function smin(a, b, k) { var h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }
  function gauss(x, z, cx, cz, r) { var dx = x - cx, dz = z - cz; return Math.exp(-(dx * dx + dz * dz) / (2 * r * r)); }
  function dist2(ax, az, bx, bz) { var dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; }
  function rnd(s) { s.rs = (s.rs * 1664525 + 1013904223) >>> 0; return s.rs / 4294967296; }
  function mk(seed) { var s = { rs: seed | 0 }; return function () { s.rs = (s.rs + 0x6D2B79F5) | 0; var t = s.rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  OC.clamp = clamp; OC.lerp = lerp; OC.sstep = sstep; OC.smoothstep = sstep;
  OC.smin = smin; OC.gauss = gauss; OC.dist2 = dist2; OC.rnd = rnd; OC.mkRng = mk;

  // ── Landmarks & Zones (enclosed sea inside [~48..592] x [~48..592]) ──────
  OC.KELP = [
    { id: 'kelp-nw', x: 122, z: 162, r: 26, maxD: 30 },
    { id: 'kelp-w',  x: 126, z: 392, r: 30, maxD: 34 },
    { id: 'kelp-sw', x: 215, z: 498, r: 28, maxD: 32 },
    { id: 'kelp-ne', x: 458, z: 148, r: 26, maxD: 30 },
    { id: 'kelp-e',  x: 512, z: 412, r: 26, maxD: 32 }
  ];
  OC.SEAGRASS = [
    { id: 'grass-nw', x: 126, z: 108, r: 36, maxD: 16 },
    { id: 'grass-sw', x: 140, z: 516, r: 40, maxD: 18 },
    { id: 'grass-ne', x: 472, z: 106, r: 34, maxD: 16 },
    { id: 'grass-e',  x: 530, z: 278, r: 34, maxD: 16 }
  ];
  OC.MANGROVE = { id: 'mangrove', x0: 42, x1: 76, z0: 205, z1: 350, maxD: 9 };
  OC.REEFS = [
    { id: 'reef-west',  x: 184, z: 232, r: 42, cleaner: { x: 188, z: 238, d: 13 }, hideMax: 2.5 },
    { id: 'reef-se',    x: 472, z: 345, r: 38, cleaner: { x: 476, z: 350, d: 17 }, hideMax: 2.2 },
    { id: 'reef-north', x: 320, z: 130, r: 32, cleaner: { x: 324, z: 134, d: 12 }, hideMax: 2.0 }
  ];
  OC.WRECKS = [
    { id: 'wreck-cargo',    x: 248, z: 292, rx: 18, rz: 6,   h: 9, yaw: 0.4,  hideMax: 5.0 },
    { id: 'wreck-plane',    x: 395, z: 168, rx: 14, rz: 14,  h: 4, yaw: -0.7, hideMax: 3.0 },
    { id: 'wreck-trawler',  x: 168, z: 435, rx: 12, rz: 4.5, h: 6, yaw: 1.1,  hideMax: 3.5 },
    { id: 'wreck-schooner', x: 516, z: 205, rx: 13, rz: 4,   h: 7, yaw: 2.1,  hideMax: 4.0 }
  ];
  OC.CAVES = [
    { id: 'cave-reef',   x: 186, z: 250, d: 15,  r: 8,   maxSize: 2.2, dweller: 'moray' },
    { id: 'cave-trench', x: 350, z: 432, d: 105, r: 9,   maxSize: 3.5, dweller: 'lobster' },
    { id: 'cave-north',  x: 332, z: 142, d: 13,  r: 7,   maxSize: 2.5, dweller: 'moray' },
    { id: 'cave-east',   x: 488, z: 355, d: 19,  r: 7.5, maxSize: 2.0, dweller: 'octopus' },
    { id: 'cave-biolum', x: 204, z: 452, d: 48,  r: 8,   maxSize: 2.6, dweller: 'lobster' },
    { id: 'cave-south',  x: 265, z: 492, d: 24,  r: 7,   maxSize: 2.4, dweller: 'octopus' }
  ];
  OC.VENTS = [
    { id: 'vent-1', x: 375, z: 442 },
    { id: 'vent-2', x: 396, z: 464 },
    { id: 'vent-3', x: 356, z: 466 },
    { id: 'vent-4', x: 414, z: 436 }
  ];
  OC.ABYSS = { id: 'squid-abyss', x: 382, z: 446, r: 68, minD: 60 };
  OC.BIOLUM = { id: 'biolum', x: 195, z: 450, r: 46, minD: 26 };
  OC.DEADZONE = { id: 'deadzone', x: 470, z: 495, r: 42, minD: 42 };
  OC.SARGASSUM = [
    { id: 'sargassum-1', x: 196, z: 118, r: 15 },
    { id: 'sargassum-2', x: 410, z: 116, r: 16 },
    { id: 'sargassum-3', x: 295, z: 492, r: 15 },
    { id: 'sargassum-4', x: 512, z: 235, r: 14 }
  ];
  OC.JELLY_HOMES = [
    { x: 315, z: 245, r: 22, d0: 6,  d1: 24 },
    { x: 435, z: 325, r: 20, d0: 8,  d1: 28 },
    { x: 245, z: 395, r: 24, d0: 10, d1: 32 },
    { x: 380, z: 195, r: 18, d0: 5,  d1: 22 }
  ];
  OC.CURRENTS = [
    { id: 'north-jet',  kind: 'seg', ax: 120, az: 165, bx: 500, bz: 155, w: 34, d0: 0,  d1: 30, v: 1.3 },
    { id: 'west-rim',   kind: 'seg', ax: 145, az: 150, bx: 155, bz: 490, w: 30, d0: 5,  d1: 38, v: 0.9 },
    { id: 'south-gyre', kind: 'seg', ax: 470, az: 490, bx: 185, bz: 475, w: 36, d0: 8,  d1: 42, v: 1.0 },
    { id: 'upwell-w',   kind: 'up',  x: 290,  z: 215, r: 30,  v: 0.55 },
    { id: 'upwell-e',   kind: 'up',  x: 455,  z: 295, r: 28,  v: 0.45 }
  ];
  OC.WHALE_FALL = { x: 335, z: 390, t: 3200 };
  OC.ORCA_EVENT = { t0: 2100, t1: 4200 };

  // ── Terrain heightfield: >0 = water depth (m), 0 = waterline, <0 = beach & tall coastal mountains ──
  function floorAt(x, z) {
    var cx = Math.max(0, Math.max(-x, x - W));
    var cz = Math.max(0, Math.max(-z, z - L));
    var dIn;
    if (cx > 0 || cz > 0) {
      dIn = -Math.hypot(cx, cz);
    } else {
      var px = Math.min(x, W - x), pz = Math.min(z, L - z);
      dIn = smin(px, pz, 72);
    }
    var shore = 48 +
      7.5 * Math.sin(x * 0.023 + z * 0.013) +
      5.5 * Math.cos(z * 0.029 - x * 0.017) +
      3.5 * Math.sin((x + z) * 0.041);
    shore -= 7 * gauss(x, z, 65, 275, 55); // sheltered mangrove bay on west shore

    var u = dIn - shore;
    if (u < 0) {
      var land = -u;
      var beach = Math.min(land, 15) * 0.24 + 0.14 * Math.sin(x * 0.11 + z * 0.09);
      var fSpan = clamp((land - 13) / 26, 0, 1.35);
      var foothill = land > 13 ? Math.pow(fSpan, 1.25) * 16 : 0;
      var r1 = 1 - Math.abs(Math.sin(x * 0.019 + z * 0.014 + Math.cos(z * 0.021) * 1.4));
      var r2 = 1 - Math.abs(Math.sin(x * 0.037 - z * 0.031 + 0.8));
      var r3 = 0.5 + 0.5 * Math.sin(x * 0.071 + z * 0.059);
      var peakMask = sstep(20, 72, land);
      var peak = peakMask * (22 + 54 * Math.pow(r1, 1.6) + 22 * Math.pow(r2, 1.4) + 10 * r3);
      return Math.round(-(beach + foothill + peak) * 100) / 100;
    }

    var rCenter = Math.hypot(x - 320, z - 320);
    var dSea = 24 + 0.04 * Math.max(0, 220 - rCenter);
    dSea -= 14 * gauss(x, z, 65, 275, 42);    // mangrove bay (~4..8m)
    dSea -= 19 * gauss(x, z, 184, 232, 48);   // reef-west plateau (~13m)
    dSea -= 14 * gauss(x, z, 472, 345, 44);   // reef-se plateau (~16m)
    dSea -= 16 * gauss(x, z, 320, 130, 40);   // reef-north atoll (~13m)
    dSea -= 15 * gauss(x, z, 126, 108, 44);   // grass-nw shallow bay
    dSea -= 15 * gauss(x, z, 140, 516, 46);   // grass-sw shallow bay
    dSea -= 14 * gauss(x, z, 472, 106, 42);   // grass-ne shallow bay
    dSea -= 14 * gauss(x, z, 530, 278, 40);   // grass-e shallow bay
    dSea -= 11 * gauss(x, z, 290, 215, 28);   // west seamount
    dSea -= 10 * gauss(x, z, 455, 295, 26);   // east seamount
    dSea += 30 * gauss(x, z, 320, 340, 105);  // central basin
    dSea += 96 * gauss(x, z, 382, 446, 56);   // Giant Squid Abyssal Canyon (~145m)
    dSea += 40 * gauss(x, z, 195, 450, 44);   // Bioluminescent bowl
    dSea += 38 * gauss(x, z, 470, 495, 42);   // Dead zone depression
    dSea += 1.3 * Math.sin(x * 0.055) * Math.cos(z * 0.048) + 0.6 * Math.sin(x * 0.14 + z * 0.11);
    dSea = clamp(dSea, 5.5, DMAX);

    var tShore = sstep(0, 42, u);
    var shallowSlope = 0.15 + u * 0.26;
    return Math.round(clamp(shallowSlope * (1 - tShore) + dSea * tShore, 0.1, DMAX) * 100) / 100;
  }
  OC.floorAt = floorAt;

  // ── 24 Spawn positions across safe shallow/mid water (unlimited fish build around these) ──
  OC.SPAWNS = [
    { x: 184, z: 222, d: 10 }, { x: 126, z: 112, d: 7 },  { x: 124, z: 162, d: 14 },
    { x: 320, z: 132, d: 10 }, { x: 468, z: 112, d: 8 },  { x: 458, z: 152, d: 14 },
    { x: 128, z: 392, d: 15 }, { x: 144, z: 512, d: 9 },  { x: 215, z: 496, d: 14 },
    { x: 472, z: 342, d: 13 }, { x: 526, z: 278, d: 9 },  { x: 512, z: 412, d: 15 },
    { x: 248, z: 288, d: 16 }, { x: 395, z: 168, d: 14 }, { x: 516, z: 205, d: 14 },
    { x: 168, z: 435, d: 16 }, { x: 290, z: 215, d: 14 }, { x: 455, z: 295, d: 15 },
    { x: 240, z: 165, d: 12 }, { x: 375, z: 245, d: 16 }, { x: 275, z: 435, d: 18 },
    { x: 425, z: 235, d: 14 }, { x: 96,  z: 275, d: 7 },  { x: 325, z: 530, d: 12 }
  ];

  // ── 10x Static Flora, Algae, Corals, Rocks & Boulders (~1,750 items) ─────
  OC.PLANTS = (function () {
    var list = [], s = { rs: 91234 }, id = 1;
    function R() { return rnd(s); }
    function add(type, x, z, r, extra) {
      var fl = floorAt(x, z);
      if (fl < 1.5) return false;
      var p = { id: 'v' + (id++), type: type, x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, d: Math.round(fl * 10) / 10, r: Math.round(r * 10) / 10 };
      if (extra) for (var k in extra) p[k] = extra[k];
      list.push(p);
      return true;
    }

    var reefTypes = ['coral-brain', 'coral-staghorn', 'coral-table', 'coral-pillar', 'seafan', 'seawhip', 'anemone', 'sponge', 'coralline-algae', 'padina', 'boulder'];
    OC.REEFS.forEach(function (rf) {
      var target = 180, tries = 0;
      while (tries++ < 420 && target > 0) {
        var a = R() * 6.283, rr = Math.sqrt(R()) * rf.r * 1.15;
        var tp = reefTypes[Math.floor(R() * reefTypes.length)];
        var rad = tp === 'coral-table' ? 2.6 : tp === 'anemone' ? 1.5 : tp === 'boulder' ? 2.4 : 1.0 + R() * 1.6;
        if (add(tp, rf.x + Math.cos(a) * rr, rf.z + Math.sin(a) * rr, rad, { reef: rf.id })) target--;
      }
    });

    var kelpFloorTypes = ['kelp-sprout', 'macro-algae', 'red-algae', 'algae-rock', 'boulder', 'sponge', 'seawhip'];
    OC.KELP.forEach(function (kf) {
      var target = 70, tries = 0;
      while (tries++ < 220 && target > 0) {
        var a = R() * 6.283, rr = Math.sqrt(R()) * kf.r * 1.25;
        var tp = kelpFloorTypes[Math.floor(R() * kelpFloorTypes.length)];
        if (add(tp, kf.x + Math.cos(a) * rr, kf.z + Math.sin(a) * rr, 1.0 + R() * 2.1)) target--;
      }
    });

    var shallowTypes = ['caulerpa', 'padina', 'macro-algae', 'red-algae', 'algae-rock', 'boulder', 'anemone', 'sponge'];
    OC.SEAGRASS.forEach(function (sg) {
      var target = 65, tries = 0;
      while (tries++ < 220 && target > 0) {
        var a = R() * 6.283, rr = Math.sqrt(R()) * sg.r * 1.15;
        var tp = shallowTypes[Math.floor(R() * shallowTypes.length)];
        if (add(tp, sg.x + Math.cos(a) * rr, sg.z + Math.sin(a) * rr, 0.9 + R() * 1.8)) target--;
      }
    });

    var coastCount = 0, cTries = 0;
    while (coastCount < 140 && cTries++ < 950) {
      var side = cTries % 4, cx, cz;
      if (side === 0) { cx = 60 + R() * 520; cz = 52 + R() * 45; }
      else if (side === 1) { cx = 60 + R() * 520; cz = 543 + R() * 45; }
      else if (side === 2) { cx = 52 + R() * 45; cz = 60 + R() * 520; }
      else { cx = 543 + R() * 45; cz = 60 + R() * 520; }
      var cfl = floorAt(cx, cz);
      if (cfl >= 1.5 && cfl <= 16) {
        var ctp = ['boulder', 'algae-rock', 'macro-algae', 'padina', 'red-algae', 'caulerpa'][Math.floor(R() * 6)];
        if (add(ctp, cx, cz, 1.0 + R() * 2.3)) coastCount++;
      }
    }

    OC.WRECKS.forEach(function (w) {
      for (var i = 0; i < 24; i++) {
        var tp = ['sponge', 'seafan', 'algae-rock', 'boulder', 'red-algae', 'coralline-algae'][i % 6];
        add(tp, w.x + (R() - 0.5) * 34, w.z + (R() - 0.5) * 26, 0.9 + R() * 1.6);
      }
    });
    OC.CAVES.forEach(function (c) {
      for (var i = 0; i < 14; i++) {
        var a = R() * 6.283, rr = 2 + R() * 12;
        var tp = ['boulder', 'rock-spire', 'sponge', 'seafan', 'coralline-algae'][i % 5];
        add(tp, c.x + Math.cos(a) * rr, c.z + Math.sin(a) * rr, 1.2 + R() * 2.2);
      }
    });
    OC.VENTS.forEach(function (v) {
      for (var i = 0; i < 20; i++) {
        var a = R() * 6.283, rr = 2 + R() * 14;
        var tp = i < 12 ? 'tube-worm' : (i % 2 ? 'boulder' : 'rock-spire');
        add(tp, v.x + Math.cos(a) * rr, v.z + Math.sin(a) * rr, 1.1 + R() * 1.6);
      }
    });

    var openCount = 0, oTries = 0;
    var openTypes = ['boulder', 'rock-spire', 'algae-rock', 'sponge', 'seawhip', 'seafan', 'macro-algae', 'red-algae'];
    while (openCount < 210 && oTries++ < 750) {
      var ox = 70 + R() * 500, oz = 70 + R() * 500, ofl = floorAt(ox, oz);
      if (ofl < 3) continue;
      var otp = ofl > 45 ? ['boulder', 'rock-spire', 'sponge', 'seawhip'][Math.floor(R() * 4)] : openTypes[Math.floor(R() * openTypes.length)];
      if (add(otp, ox, oz, 1.2 + R() * 2.8, ofl > 75 ? { deep: true } : null)) openCount++;
    }
    return list;
  })();

  // 20 m spatial hash for O(1) plant queries across 1,760 benthic items
  var PCELL = 20, PGW = Math.ceil(W / PCELL), PGRID = new Array(PGW * Math.ceil(L / PCELL));
  (function buildPlantGrid() {
    for (var i = 0; i < PGRID.length; i++) PGRID[i] = [];
    for (var j = 0; j < OC.PLANTS.length; j++) {
      var p = OC.PLANTS[j], cx = clamp(Math.floor(p.x / PCELL), 0, PGW - 1), cz = clamp(Math.floor(p.z / PCELL), 0, PGW - 1);
      PGRID[cz * PGW + cx].push(p);
    }
  })();

  OC.plantsNear = function (x, z, d, rng) {
    var out = [], r2 = rng * rng;
    var x0 = clamp(Math.floor((x - rng) / PCELL), 0, PGW - 1), x1 = clamp(Math.floor((x + rng) / PCELL), 0, PGW - 1);
    var z0 = clamp(Math.floor((z - rng) / PCELL), 0, PGW - 1), z1 = clamp(Math.floor((z + rng) / PCELL), 0, PGW - 1);
    for (var cz = z0; cz <= z1; cz++) {
      var row = cz * PGW;
      for (var cx = x0; cx <= x1; cx++) {
        var arr = PGRID[row + cx];
        for (var i = 0; i < arr.length; i++) {
          var p = arr[i], dd = d - p.d;
          if (Math.abs(p.x - x) > rng || Math.abs(p.z - z) > rng) continue;
          if (dist2(x, z, p.x, p.z) + dd * dd < r2) out.push(p);
        }
      }
    }
    return out;
  };
  OC.plantAt = function (x, z, d) {
    var best = null, bq = 1e9;
    var x0 = clamp(Math.floor((x - 4) / PCELL), 0, PGW - 1), x1 = clamp(Math.floor((x + 4) / PCELL), 0, PGW - 1);
    var z0 = clamp(Math.floor((z - 4) / PCELL), 0, PGW - 1), z1 = clamp(Math.floor((z + 4) / PCELL), 0, PGW - 1);
    for (var cz = z0; cz <= z1; cz++) {
      var row = cz * PGW;
      for (var cx = x0; cx <= x1; cx++) {
        var arr = PGRID[row + cx];
        for (var i = 0; i < arr.length; i++) {
          var p = arr[i];
          if (Math.abs(p.x - x) > p.r || Math.abs(p.z - z) > p.r) continue;
          var dd = d - p.d, q = dist2(x, z, p.x, p.z) + dd * dd * 0.5;
          if (q < p.r * p.r && q < bq) { bq = q; best = p; }
        }
      }
    }
    return best;
  };

  // ── Public chart (GET /chart) ────────────────────────────────────────────
  OC.chart = function () {
    var f = [];
    OC.KELP.forEach(function (k) { f.push({ type: 'kelp forest', id: k.id, x: k.x, z: k.z, r: k.r, floor: Math.round(floorAt(k.x, k.z)) }); });
    OC.SEAGRASS.forEach(function (k) { f.push({ type: 'seagrass meadow', id: k.id, x: k.x, z: k.z, r: k.r, floor: Math.round(floorAt(k.x, k.z)) }); });
    f.push({ type: 'mangrove roots', id: 'mangrove', x: 58, z: 278, r: 72, note: 'sheltered western cove along the inner sandy shore', floor: 5 });
    OC.REEFS.forEach(function (r) { f.push({ type: 'coral reef', id: r.id, x: r.x, z: r.z, r: r.r, floor: Math.round(floorAt(r.x, r.z)) }); });
    OC.WRECKS.forEach(function (w) { f.push({ type: 'wreck', id: w.id, x: w.x, z: w.z, r: w.rx, floor: Math.round(floorAt(w.x, w.z)) }); });
    OC.CAVES.forEach(function (c) { f.push({ type: 'cave', id: c.id, x: c.x, z: c.z, depth: c.d, r: c.r }); });
    OC.VENTS.forEach(function (v) { f.push({ type: 'hydrothermal vent', id: v.id, x: v.x, z: v.z, depth: Math.round(floorAt(v.x, v.z)) }); });
    OC.SARGASSUM.forEach(function (s) { f.push({ type: 'floating weed raft', id: s.id, x: s.x, z: s.z, r: s.r, depth: 0 }); });
    f.push({ type: 'abyssal canyon', id: OC.ABYSS.id, x: OC.ABYSS.x, z: OC.ABYSS.z, r: OC.ABYSS.r, floor: 142 });
    f.push({ type: 'bioluminescent basin', id: OC.BIOLUM.id, x: OC.BIOLUM.x, z: OC.BIOLUM.z, r: OC.BIOLUM.r, floor: 75 });
    f.push({ type: 'seamount', id: 'seamount-w', x: 290, z: 215, r: 28, top: 22 });
    f.push({ type: 'seamount', id: 'seamount-e', x: 455, z: 295, r: 26, top: 22 });
    f.push({ type: 'coastline', id: 'surrounding-beaches', x: 320, z: 320, r: 272, note: 'all 4 sides are enclosed by shallow sandy beaches rising into coastal mountains' });
    return { w: W, l: L, maxDepth: DMAX, note: 'x,z in metres from the north-west corner; depth in metres below surface (land < 0); heading 0=north 90=east', features: f };
  };

  // ── Queries ──────────────────────────────────────────────────────────────
  OC.kelpAt = function (x, z, d) {
    for (var i = 0; i < OC.KELP.length; i++) {
      var k = OC.KELP[i], fl = floorAt(x, z);
      if (fl > 2 && dist2(x, z, k.x, k.z) < k.r * k.r && d > fl - 20) return k;
    }
    return null;
  };
  OC.seagrassAt = function (x, z, d) {
    for (var i = 0; i < OC.SEAGRASS.length; i++) {
      var s = OC.SEAGRASS[i], fl = floorAt(x, z);
      if (fl > 1.5 && dist2(x, z, s.x, s.z) < s.r * s.r && d > fl - 3) return s;
    }
    return null;
  };
  OC.mangroveAt = function (x, z, d) {
    var m = OC.MANGROVE, fl = floorAt(x, z);
    return (fl > 1 && x >= m.x0 && x <= m.x1 && z >= m.z0 && z <= m.z1 && d <= m.maxD) ? m : null;
  };
  OC.reefAt = function (x, z, d) {
    for (var i = 0; i < OC.REEFS.length; i++) {
      var r = OC.REEFS[i], fl = floorAt(x, z);
      if (fl > 2 && dist2(x, z, r.x, r.z) < r.r * r.r && d > fl - 8) return r;
    }
    return null;
  };
  OC.wreckAt = function (x, z, d) {
    for (var i = 0; i < OC.WRECKS.length; i++) {
      var w = OC.WRECKS[i], c = Math.cos(-w.yaw), s = Math.sin(-w.yaw), dx = x - w.x, dz = z - w.z;
      var lx = dx * c - dz * s, lz = dx * s + dz * c;
      if (Math.abs(lx) < w.rx && Math.abs(lz) < w.rz && d > floorAt(w.x, w.z) - w.h) return w;
    }
    return null;
  };
  OC.caveAt = function (x, z, d) {
    for (var i = 0; i < OC.CAVES.length; i++) {
      var c = OC.CAVES[i], dd = d - c.d;
      if (dist2(x, z, c.x, c.z) + dd * dd < c.r * c.r) return c;
    }
    return null;
  };
  OC.sargassumAt = function (x, z, d) {
    if (d > 3.5) return null;
    for (var i = 0; i < OC.SARGASSUM.length; i++) {
      var s = OC.SARGASSUM[i];
      if (dist2(x, z, s.x, s.z) < s.r * s.r) return s;
    }
    return null;
  };
  OC.ventAt = function (x, z, d) {
    var best = null, bd = 1e9;
    for (var i = 0; i < OC.VENTS.length; i++) {
      var v = OC.VENTS[i], fd = floorAt(v.x, v.z), dd = d - fd, q = dist2(x, z, v.x, v.z) + dd * dd * 0.5;
      if (q < bd) { bd = q; best = v; }
    }
    return { v: best, dist: Math.sqrt(bd) };
  };
  OC.inBiolum = function (x, z, d) { var b = OC.BIOLUM; return d > b.minD && dist2(x, z, b.x, b.z) < b.r * b.r; };
  OC.inDeadzone = function (x, z, d) { var b = OC.DEADZONE; return d > b.minD && dist2(x, z, b.x, b.z) < b.r * b.r; };
  OC.inAbyss = function (x, z, d) { var b = OC.ABYSS; return d > b.minD && dist2(x, z, b.x, b.z) < b.r * b.r; };

  OC.tempAt = function (x, z, d) {
    var t = 21 - 12 * sstep(OC.THERMO - 8, OC.THERMO + 8, d);
    var v = OC.ventAt(x, z, d);
    if (v.dist < 14) t += (34 - t) * (1 - v.dist / 14);
    if (OC.mangroveAt(x, z, d)) t += 3;
    return Math.round(t * 10) / 10;
  };
  OC.tideAt = function (tSec) { return 0.55 + 0.45 * Math.sin(tSec / OC.TIDE_SEC * Math.PI * 2); };
  OC.currentAt = function (x, z, d) {
    var cx = 0, cz = 0, cy = 0, id = null, tide = OC._tide || 1;
    for (var i = 0; i < OC.CURRENTS.length; i++) {
      var c = OC.CURRENTS[i];
      if (c.kind === 'seg') {
        if (d < c.d0 || d > c.d1) continue;
        var vx = c.bx - c.ax, vz = c.bz - c.az, len = Math.sqrt(vx * vx + vz * vz); vx /= len; vz /= len;
        var px = x - c.ax, pz = z - c.az, t = px * vx + pz * vz;
        if (t < 0 || t > len) continue;
        var ox = px - vx * t, oz = pz - vz * t, off = Math.sqrt(ox * ox + oz * oz);
        if (off > c.w) continue;
        var f = c.v * (1 - Math.pow(off / c.w, 2));
        cx += vx * f; cz += vz * f; id = id || c.id;
      } else {
        var q = dist2(x, z, c.x, c.z);
        if (q < c.r * c.r && d < 80) { cy -= c.v * (1 - q / (c.r * c.r)); id = id || c.id; }
      }
    }
    return { x: cx * tide, z: cz * tide, d: cy * tide, id: id };
  };
  OC.dayLight = function (tSec) { var ph = (tSec / OC.DAY_SEC) % 1; var sun = Math.cos(ph * Math.PI * 2); return clamp(0.06 + 0.94 * sstep(-0.25, 0.35, sun), 0.06, 1); };
  OC.phaseName = function (tSec) { var ph = (tSec / OC.DAY_SEC) % 1; if (ph < 0.2 || ph > 0.8) return 'day'; if (ph < 0.3) return 'dusk'; if (ph < 0.7) return 'night'; return 'dawn'; };
  OC.lightAt = function (tSec, d) { return OC.dayLight(tSec) * Math.exp(-d / 45); };
})(OC);

// OCEAN ARENA v5 — 76 marine species: Giant Squid, huge Whale, dense prey & formidable predators
var OC = globalThis.OC || (globalThis.OC = {});
(function (OC) {
  OC.SPECIES = {
    // ── Schooling fish & cephalopod shoals ────────────────────────────────
    'sardine':        { size: 0.15, kind: 'school', habitat: { zone: 'pelagic',  d0: 2,  d1: 30 }, n: 450, count: 8, speed: 2.2, flee: 5.5, food: { e: 8,  catchP: 0.72 }, gather: { phase: 'dusk', x: 295, z: 245, d: 10, note: 'sardines are gathering near the west seamount' } },
    'anchovy':        { size: 0.12, kind: 'school', habitat: { zone: 'pelagic',  d0: 2,  d1: 25 }, n: 520, count: 8, speed: 2.0, flee: 5.0, food: { e: 6,  catchP: 0.78 } },
    'herring':        { size: 0.22, kind: 'school', habitat: { zone: 'pelagic',  d0: 4,  d1: 42 }, n: 420, count: 6, speed: 2.5, flee: 6.2, food: { e: 11, catchP: 0.68 } },
    'damselfish':     { size: 0.14, kind: 'school', habitat: { zone: 'reef',     d0: 6,  d1: 20 }, n: 140, count: 8, speed: 1.9, flee: 4.8, food: { e: 7,  catchP: 0.70 } },
    'lanternfish':    { size: 0.16, kind: 'school', habitat: { zone: 'deep',     d0: 45, d1: 115 }, n: 280, count: 6, speed: 2.1, flee: 5.2, food: { e: 10, catchP: 0.65 }, dayD: 75, nightD: 18 },
    'mackerel':       { size: 0.45, kind: 'school', habitat: { zone: 'pelagic',  d0: 4,  d1: 38 }, n: 120, count: 6, speed: 3.4, flee: 7.5, food: { e: 18, catchP: 0.55, minHunter: 1.3 } },
    'snapper':        { size: 0.7,  kind: 'school', habitat: { zone: 'reef',     d0: 8,  d1: 30 }, n: 65,  count: 6, speed: 2.5, flee: 6.0, food: { e: 26, catchP: 0.45, minHunter: 1.6 } },
    'tuna':           { size: 2.0,  kind: 'school', habitat: { zone: 'pelagic',  d0: 5,  d1: 55 }, n: 24,  count: 4, speed: 6.0, flee: 13,  food: { e: 55, catchP: 0.35, minHunter: 3.0 } },
    'squid':          { size: 0.6,  kind: 'school', pulse: 'jet', habitat: { zone: 'pelagic', d0: 10, d1: 68 }, n: 60, count: 6, speed: 3.0, flee: 8.5, food: { e: 24, catchP: 0.50, minHunter: 1.3 }, defense: { type: 'ink', dmg: 0 }, dayD: 48, nightD: 10 },
    'shrimp':         { size: 0.08, kind: 'school', habitat: { zone: 'seagrass', d0: 2,  d1: 18 }, n: 360, count: 10, speed: 1.0, flee: 2.8, food: { e: 4, catchP: 0.86, bigPenalty: 3 } },
    'krill':          { size: 0.04, kind: 'school', habitat: { zone: 'deep',     d0: 35, d1: 110 }, n: 600, count: 6, speed: 0.6, flee: 1.6, food: { e: 3, catchP: 0.90, maxHunter: 3.0 }, dayD: 72, nightD: 12 },
    'flying fish':    { size: 0.3,  kind: 'school', habitat: { zone: 'surface',  d0: 0.5, d1: 4 }, n: 85,  count: 5, speed: 3.5, flee: 10,  food: { e: 12, catchP: 0.40, minHunter: 1.2 } },
    'salp chain':     { size: 0.5,  kind: 'drift',  habitat: { zone: 'pelagic',  d0: 4,  d1: 42 }, count: 16, speed: 0.2, food: { e: 10, catchP: 0.95 }, respawn: 240 },

    // ── Crustaceans (sideways scuttling crabs, tail-flip lobsters) ───────────
    'crab':           { size: 0.3,  kind: 'crab', habitat: { zone: 'bottom',   d0: 2, d1: 48 }, count: 28, speed: 1.3, flee: 2.8, crabWalk: true, food: { e: 16, catchP: 0.65, minHunter: 1.2 }, defense: { type: 'shell', dmg: 4 }, respawn: 320 },
    'blue crab':      { size: 0.35, kind: 'crab', habitat: { zone: 'seagrass', d0: 2, d1: 22 }, count: 22, speed: 1.6, flee: 3.4, crabWalk: true, food: { e: 18, catchP: 0.60, minHunter: 1.2 }, defense: { type: 'shell', dmg: 5 }, respawn: 300 },
    'hermit crab':    { size: 0.12, kind: 'crab', habitat: { zone: 'bottom',   d0: 2, d1: 24 }, count: 26, speed: 0.8, flee: 1.6, crabWalk: true, food: { e: 9,  catchP: 0.80 }, respawn: 240 },
    'spider crab':    { size: 0.75, kind: 'crab', habitat: { zone: 'bottom',   d0: 28, d1: 95 }, count: 10, speed: 1.1, flee: 2.2, crabWalk: true, food: { e: 28, catchP: 0.55, minHunter: 1.8 }, defense: { type: 'shell', dmg: 7 }, respawn: 420 },
    'lobster':        { size: 0.55, kind: 'crab', habitat: { zone: 'reef',     d0: 6, d1: 40 }, count: 16, speed: 1.2, flee: 4.5, nocturnal: true, tailFlip: true, food: { e: 26, catchP: 0.52, minHunter: 1.8 }, defense: { type: 'shell', dmg: 6 }, respawn: 420 },

    // ── Reef, seagrass & benthic invertebrates & fish ────────────────────────
    'sea urchin':     { size: 0.2,  kind: 'static', habitat: { zone: 'reef',     d0: 3,  d1: 28 }, count: 22, speed: 0,   food: { e: 12, catchP: 0.90 }, defense: { type: 'spines', dmg: 8 }, respawn: 320 },
    'clam':           { size: 0.15, kind: 'static', habitat: { zone: 'bottom',   d0: 2,  d1: 35 }, count: 26, speed: 0,   food: { e: 10, catchP: 0.95 }, respawn: 260 },
    'scallop':        { size: 0.15, kind: 'wander', habitat: { zone: 'bottom',   d0: 2,  d1: 35 }, count: 22, speed: 0.3, flee: 2.4, food: { e: 10, catchP: 0.85 }, respawn: 260 },
    'sea cucumber':   { size: 0.3,  kind: 'static', habitat: { zone: 'bottom',   d0: 6,  d1: 85 }, count: 14, speed: 0,   food: { e: 12, catchP: 0.95 }, respawn: 320 },
    'starfish':       { size: 0.25, kind: 'wander', habitat: { zone: 'reef',     d0: 2,  d1: 35 }, count: 20, speed: 0.14, food: { e: 7,  catchP: 0.95 }, respawn: 320 },
    'nudibranch':     { size: 0.1,  kind: 'wander', habitat: { zone: 'reef',     d0: 4,  d1: 28 }, count: 20, speed: 0.15, food: { e: 3,  catchP: 1.0 }, defense: { type: 'poison', dmg: 12 }, respawn: 320 },
    'seahorse':       { size: 0.15, kind: 'wander', habitat: { zone: 'seagrass', d0: 2,  d1: 16 }, count: 16, speed: 0.3, food: { e: 5,  catchP: 0.90 }, respawn: 260 },
    'tube worms':     { size: 0.4,  kind: 'static', habitat: { zone: 'vent',     d0: 85, d1: 155 }, count: 14, speed: 0,  food: { e: 0 }, respawn: 0 },
    'clownfish':      { size: 0.14, kind: 'wander', habitat: { zone: 'reef',     d0: 6,  d1: 22 }, count: 18, speed: 1.4, flee: 3.4, food: { e: 8, catchP: 0.72 }, respawn: 240 },
    'butterflyfish':  { size: 0.24, kind: 'wander', habitat: { zone: 'reef',     d0: 5,  d1: 22 }, count: 18, speed: 1.6, flee: 3.8, food: { e: 11, catchP: 0.70 }, respawn: 260 },
    'angelfish':      { size: 0.35, kind: 'wander', habitat: { zone: 'reef',     d0: 6,  d1: 26 }, count: 14, speed: 1.7, flee: 4.0, food: { e: 15, catchP: 0.65 }, respawn: 300 },
    'parrotfish':     { size: 0.55, kind: 'wander', habitat: { zone: 'reef',     d0: 5,  d1: 24 }, count: 12, speed: 1.8, flee: 4.4, sleepsNight: true, food: { e: 24, catchP: 0.60, minHunter: 1.5 }, respawn: 360 },
    'surgeonfish':    { size: 0.4,  kind: 'wander', habitat: { zone: 'reef',     d0: 4,  d1: 22 }, count: 12, speed: 2.0, flee: 4.8, food: { e: 16, catchP: 0.65, minHunter: 1.2 }, respawn: 320 },
    'wrasse':         { size: 0.3,  kind: 'wander', habitat: { zone: 'reef',     d0: 5,  d1: 24 }, count: 14, speed: 1.7, flee: 4.2, food: { e: 14, catchP: 0.68 }, respawn: 300 },
    'goatfish':       { size: 0.35, kind: 'wander', habitat: { zone: 'bottom',   d0: 3,  d1: 24 }, count: 12, speed: 1.6, flee: 4.0, food: { e: 15, catchP: 0.70 }, respawn: 300 },
    'triggerfish':    { size: 0.5,  kind: 'wander', habitat: { zone: 'reef',     d0: 6,  d1: 26 }, count: 9,  speed: 2.0, flee: 4.5, food: { e: 20, catchP: 0.55, minHunter: 1.4 }, defense: { type: 'bite', dmg: 5 }, respawn: 360 },
    'pufferfish':     { size: 0.45, kind: 'wander', habitat: { zone: 'reef',     d0: 5,  d1: 24 }, count: 10, speed: 1.4, flee: 2.8, food: { e: 18, catchP: 0.85 }, defense: { type: 'poison', dmg: 35, spines: true }, respawn: 480 },

    // ── Smart Cephalopods (squids, cuttlefish, nautilus, octopus & Giant Squid) ──
    'cuttlefish':     { size: 0.48, kind: 'squid',  habitat: { zone: 'seagrass', d0: 4,  d1: 26 }, count: 10, speed: 1.7, flee: 5.5, pulse: 'fin', food: { e: 22, catchP: 0.58, minHunter: 1.3 }, defense: { type: 'ink', dmg: 0 }, respawn: 360 },
    'nautilus':       { size: 0.50, kind: 'squid',  habitat: { zone: 'deep',     d0: 45, d1: 115 }, count: 8, speed: 1.4, flee: 3.6, pulse: 'jet', dayD: 78, nightD: 38, food: { e: 20, catchP: 0.65, minHunter: 1.4 }, defense: { type: 'shell', dmg: 4 }, respawn: 400 },
    'humboldt squid': { size: 1.6,  kind: 'squid',  habitat: { zone: 'pelagic',  d0: 14, d1: 85 }, count: 5, speed: 4.4, sprint: 10.2, pulse: 'jet', dayD: 62, nightD: 16, hp: 130, food: { e: 65, catchP: 0.40, minHunter: 3.5 }, defense: { type: 'ink', dmg: 0 }, prey: { max: 2.6, minPrey: 0.5, range: 32, detect: ['vision', 'lateral'], dmg: 14, hold: 3, active: 'night', satiety: 90 }, respawn: 600 },
    'octopus':        { size: 1.15, kind: 'octopus', habitat: { zone: 'reef',    d0: 6,  d1: 34 }, count: 8, speed: 1.7, sprint: 5.2, flee: 6.2, hp: 110, food: { e: 45, catchP: 0.40, minHunter: 2.4 }, defense: { type: 'ink', dmg: 0 }, prey: { max: 1.35, minPrey: 0.3, range: 14, detect: ['vision'], dmg: 10, hold: 4, active: 'any', satiety: 100 }, respawn: 520 },
    'giant squid':    { size: 18.0, kind: 'kraken', habitat: { zone: 'abyss',    d0: 50, d1: 142 }, count: 1, speed: 4.8, sprint: 12.2, hp: 1400, food: { e: 360, catchP: 0.25, minHunter: 12.0 }, defense: { type: 'ink', dmg: 18 }, prey: { max: 14.0, minPrey: 0.7, range: 72, detect: ['vision', 'lateral'], dmg: 38, hold: 10, active: 'any', satiety: 140, aggressive: true }, home: { x: 382, z: 446, d: 98, r: 85 }, respawn: 0 },

    // ── Venomous, electric, ambush & mid-tier predators ──────────────────────
    'titan triggerfish': { size: 0.95, kind: 'hunter', habitat: { zone: 'reef',   d0: 6, d1: 24 }, count: 3, speed: 3.6, sprint: 7.5, hp: 95, food: { e: 38, catchP: 0.45, minHunter: 2.2 }, prey: { max: 2.0, minPrey: 0.5, range: 20, detect: ['vision'], dmg: 12, active: 'day', satiety: 70 }, respawn: 500 },
    'lionfish':       { size: 0.42, kind: 'wander', habitat: { zone: 'reef',     d0: 6,  d1: 28 }, count: 5, speed: 0.9, flee: 1.6, food: { e: 12, catchP: 0.85 }, defense: { type: 'venom', dmg: 26 }, respawn: 440 },
    'stonefish':      { size: 0.45, kind: 'wander', habitat: { zone: 'reef',     d0: 5,  d1: 26 }, count: 5, speed: 0.25, buried: true, food: { e: 14, catchP: 0.85 }, defense: { type: 'venom', dmg: 28, touch: true, touchR: 1.7 }, respawn: 500 },
    'sea snake':      { size: 1.2,  kind: 'wander', habitat: { zone: 'reef',     d0: 2,  d1: 24 }, count: 4, speed: 2.1, flee: 4.5, breathes: true, food: { e: 22, catchP: 0.60, minHunter: 2.5 }, defense: { type: 'venom', dmg: 32 }, respawn: 480 },
    'stingray':       { size: 1.4,  kind: 'wander', habitat: { zone: 'bottom',   d0: 3,  d1: 35 }, count: 8, speed: 2.0, flee: 5.5, buried: true, food: { e: 45, catchP: 0.50, minHunter: 3.5 }, defense: { type: 'venom', dmg: 20, touch: true, touchR: 2.0 }, respawn: 480 },
    'electric ray':   { size: 1.3,  kind: 'wander', habitat: { zone: 'bottom',   d0: 6,  d1: 42 }, count: 4, speed: 1.9, flee: 4.2, buried: true, food: { e: 40, catchP: 0.50, minHunter: 3.5 }, defense: { type: 'venom', dmg: 22, touch: true, touchR: 2.5 }, respawn: 520 },
    'eagle ray':      { size: 2.4,  kind: 'wander', habitat: { zone: 'pelagic',  d0: 5,  d1: 35 }, count: 6, speed: 3.2, flee: 6.5, food: { e: 70, catchP: 0.45, minHunter: 5.0 }, respawn: 600 },
    'conger eel':     { size: 2.2,  kind: 'ambush', habitat: { zone: 'wreck',    d0: 14, d1: 50 }, count: 3, speed: 2.2, sprint: 6.2, hp: 140, food: { e: 55, catchP: 0.35, minHunter: 4.0 }, prey: { max: 2.6, minPrey: 0.5, range: 14, detect: ['vision', 'smell'], dmg: 18, hold: 4, active: 'night', satiety: 100 }, respawn: 600 },
    'moray':          { size: 2.0,  kind: 'ambush', habitat: { zone: 'reef',     d0: 8,  d1: 28 }, count: 4, speed: 2.0, sprint: 6.0, hp: 130, food: { e: 50, catchP: 0.35, minHunter: 4.0 }, prey: { max: 2.4, minPrey: 0.5, range: 13, detect: ['vision', 'smell'], dmg: 17, hold: 4, active: 'any', satiety: 100 }, respawn: 600 },
    'grouper':        { size: 2.0,  kind: 'ambush', habitat: { zone: 'reef',     d0: 8,  d1: 35 }, count: 4, speed: 2.3, sprint: 6.5, hp: 175, food: { e: 65, catchP: 0.35, minHunter: 4.0 }, prey: { max: 2.3, minPrey: 0.5, range: 16, detect: ['vision', 'lateral'], dmg: 19, swallow: 1.0, active: 'any', satiety: 110 }, respawn: 640 },
    'giant trevally': { size: 1.9,  kind: 'hunter', habitat: { zone: 'reef',     d0: 4,  d1: 36 }, count: 3, speed: 5.0, sprint: 11.5, hp: 150, food: { e: 65, catchP: 0.38, minHunter: 4.2 }, prey: { max: 2.2, minPrey: 0.6, range: 32, detect: ['vision', 'lateral'], dmg: 18, active: 'day', satiety: 90 }, respawn: 580 },
    'barracuda':      { size: 1.6,  kind: 'hunter', habitat: { zone: 'pelagic',  d0: 3,  d1: 32 }, count: 5, speed: 4.8, sprint: 12.2, hp: 110, food: { e: 55, catchP: 0.42, minHunter: 3.5 }, prey: { max: 2.4, minPrey: 0.5, range: 34, detect: ['vision', 'lateral'], dmg: 17, active: 'day', satiety: 90 }, respawn: 520 },
    'wahoo':          { size: 1.8,  kind: 'hunter', habitat: { zone: 'pelagic',  d0: 4,  d1: 40 }, count: 3, speed: 6.0, sprint: 14.5, hp: 120, food: { e: 60, catchP: 0.38, minHunter: 4.0 }, prey: { max: 2.3, minPrey: 0.6, range: 36, detect: ['vision'], dmg: 18, active: 'day', satiety: 90 }, respawn: 540 },
    'swordfish':      { size: 3.5,  kind: 'hunter', habitat: { zone: 'pelagic',  d0: 10, d1: 85 }, count: 2, speed: 5.8, sprint: 14.5, hp: 230, food: { e: 120, catchP: 0.32, minHunter: 6.0 }, prey: { max: 3.5, minPrey: 0.8, range: 44, detect: ['vision'], dmg: 25, active: 'any', satiety: 110 }, respawn: 720 },
    'anglerfish':     { size: 0.6,  kind: 'ambush', habitat: { zone: 'abyss',    d0: 55, d1: 142 }, count: 3, speed: 0.7, sprint: 4.2, lure: true, hp: 55, food: { e: 24, catchP: 0.75, minHunter: 1.5 }, prey: { max: 1.8, minPrey: 0.4, range: 13, detect: ['vision', 'lateral'], dmg: 14, swallow: 0.95, active: 'any', satiety: 80 }, respawn: 480 },
    'ribbonfish':     { size: 2.4,  kind: 'wander', habitat: { zone: 'deep',     d0: 40, d1: 120 }, count: 4, speed: 2.2, flee: 5.5, food: { e: 55, catchP: 0.55, minHunter: 3.5 }, respawn: 500 },

    // ── Sea turtles, Giant Rays, Sunfish & Gentle Giants (HUGE Whale!) ──────
    'sea turtle':     { size: 1.2,  kind: 'wander', habitat: { zone: 'seagrass', d0: 2,  d1: 28 }, count: 6, speed: 1.8, flee: 3.6, breathes: true, eatsJellies: true, food: { e: 45, catchP: 0.4, minHunter: 4.5 }, defense: { type: 'shell', dmg: 4 }, respawn: 600 },
    'manta ray':      { size: 5.0,  kind: 'passer', habitat: { zone: 'pelagic',  d0: 4,  d1: 42 }, count: 4, speed: 2.8, hp: 420, food: { e: 0 } },
    'sunfish':        { size: 2.5,  kind: 'wander', habitat: { zone: 'pelagic',  d0: 2,  d1: 50 }, count: 3, speed: 1.2, eatsJellies: true, hp: 220, food: { e: 80, catchP: 0.5, minHunter: 5.5 }, respawn: 720 },
    'whale shark':    { size: 14.0, kind: 'passer', habitat: { zone: 'pelagic',  d0: 5,  d1: 45 }, count: 1, speed: 2.4, hp: 2400, food: { e: 0 } },
    'whale':          { size: 55.0, kind: 'passer', habitat: { zone: 'pelagic',  d0: 10, d1: 60 }, count: 1, speed: 4.2, sprint: 9.0, hp: 5500, breathes: true, food: { e: 0 }, waypoints: [[155, 225, 24], [320, 155, 22], [480, 225, 28], [470, 415, 34], [320, 485, 30], [175, 390, 26]] },
    'whale calf':     { size: 16.0, kind: 'passer', habitat: { zone: 'pelagic',  d0: 8,  d1: 45 }, count: 1, speed: 4.0, sprint: 8.5, hp: 1400, breathes: true, food: { e: 0 } },

    // ── Marine Mammals (smart Dolphins, Seals, Orcas) ────────────────────────
    'seal':           { size: 1.8,  kind: 'hunter', habitat: { zone: 'kelp',     d0: 2,  d1: 28 }, count: 4, speed: 3.6, sprint: 8.8, breathes: true, hp: 150, food: { e: 75, catchP: 0.35, minHunter: 5.0 }, prey: { max: 2.2, minPrey: 0.4, range: 30, detect: ['vision'], dmg: 15, active: 'day', satiety: 100 }, respawn: 720 },
    'dolphin':        { size: 2.8,  kind: 'pack',   habitat: { zone: 'pelagic',  d0: 3,  d1: 35 }, count: 6, packs: 2, speed: 5.2, sprint: 11.2, breathes: true, hp: 230, food: { e: 110, catchP: 0.25, minHunter: 6.5 }, prey: { max: 2.6, minPrey: 0.5, range: 52, detect: ['vision', 'echo'], dmg: 19, active: 'any', satiety: 120 }, respawn: 800 },
    'man-o-war':      { size: 0.3,  kind: 'drift',  habitat: { zone: 'surface',  d0: 0.2, d1: 1.5 }, count: 10, speed: 0.2, food: { e: 0 }, defense: { type: 'sting', dmg: 10, perSec: true, touch: true, touchR: 3 }, respawn: 480 },

    // ── Sharks & Apex Predators (10 species, 23 active hunters!) ─────────────
    'great white':    { size: 6.0,  kind: 'shark',  habitat: { zone: 'pelagic',  d0: 6,  d1: 65 }, count: 2, speed: 3.8, sprint: 11.2, sprintT: 36, tiredT: 80, shallowOK: 16, hp: 650, scavenge: true, food: { e: 240, catchP: 0.2, minHunter: 10 }, prey: { max: 5.5, minPrey: 0.9, range: 48, detect: ['vision', 'lateral', 'smell', 'electro'], smell: 120, electro: 18, dmg: 44, swallow: 1.5, active: 'any', satiety: 160 }, waypoints: [[250, 290, 22], [395, 175, 20], [450, 340, 28], [240, 420, 35], [320, 280, 24]], rest: [320, 320, 34] },
    'tiger shark':    { size: 5.0,  kind: 'shark',  habitat: { zone: 'pelagic',  d0: 6,  d1: 55 }, count: 2, speed: 3.6, sprint: 10.2, sprintT: 30, tiredT: 80, shallowOK: 12, hp: 520, scavenge: true, food: { e: 200, catchP: 0.25, minHunter: 9 }, prey: { max: 5.5, minPrey: 0.7, range: 44, detect: ['vision', 'lateral', 'smell', 'electro'], smell: 110, electro: 16, dmg: 38, swallow: 1.4, active: 'night', satiety: 150 }, waypoints: [[184, 232, 13], [472, 345, 17], [320, 130, 13], [140, 516, 10], [320, 320, 34]], rest: [340, 340, 38] },
    'hammerhead':     { size: 4.0,  kind: 'shark',  habitat: { zone: 'pelagic',  d0: 10, d1: 50 }, count: 3, speed: 3.5, sprint: 9.8,  sprintT: 26, tiredT: 70, shallowOK: 16, hp: 360, food: { e: 160, catchP: 0.25, minHunter: 7.5 }, prey: { max: 3.6, minPrey: 0.6, range: 40, detect: ['vision', 'lateral', 'electro'], electro: 34, dmg: 30, swallow: 1.2, active: 'any', satiety: 130 }, waypoints: [[280, 220, 20], [440, 290, 24], [320, 380, 30], [200, 340, 24]], rest: [360, 280, 30] },
    'bull shark':     { size: 3.2,  kind: 'shark',  habitat: { zone: 'coastal',  d0: 3,  d1: 28 }, count: 3, speed: 3.4, sprint: 9.5,  sprintT: 24, tiredT: 60, shallowOK: 4,  hp: 300, food: { e: 130, catchP: 0.30, minHunter: 6 }, prey: { max: 3.8, minPrey: 0.6, range: 36, detect: ['vision', 'lateral', 'smell', 'electro'], smell: 95, electro: 16, dmg: 29, swallow: 1.1, active: 'any', satiety: 110 }, waypoints: [[95, 275, 7], [135, 120, 9], [145, 510, 9], [520, 278, 9], [468, 120, 9]], rest: [190, 300, 14] },
    'reef shark':     { size: 1.8,  kind: 'shark',  habitat: { zone: 'reef',     d0: 5,  d1: 24 }, count: 6, speed: 3.2, sprint: 8.6,  sprintT: 20, tiredT: 55, shallowOK: 5,  hp: 150, food: { e: 80,  catchP: 0.38, minHunter: 4 }, prey: { max: 2.2, minPrey: 0.5, range: 30, detect: ['vision', 'lateral', 'electro'], electro: 14, dmg: 18, swallow: 0.85, active: 'any', satiety: 85 }, waypoints: [[184, 232, 11], [472, 345, 14], [320, 130, 11], [248, 292, 16]], rest: [184, 244, 14] },
    'mako shark':     { size: 3.6,  kind: 'shark',  habitat: { zone: 'pelagic',  d0: 5,  d1: 55 }, count: 2, speed: 5.5, sprint: 15.0, sprintT: 28, tiredT: 75, shallowOK: 16, hp: 340, food: { e: 155, catchP: 0.25, minHunter: 7 }, prey: { max: 3.6, minPrey: 0.7, range: 46, detect: ['vision', 'lateral', 'smell'], smell: 90, dmg: 32, swallow: 1.2, active: 'any', satiety: 120 }, waypoints: [[230, 210, 16], [420, 200, 18], [440, 380, 26], [240, 380, 22]], rest: [320, 260, 26] },
    'blue shark':     { size: 3.0,  kind: 'shark',  habitat: { zone: 'pelagic',  d0: 8,  d1: 60 }, count: 2, speed: 4.4, sprint: 10.6, sprintT: 24, tiredT: 65, shallowOK: 16, hp: 270, scavenge: true, food: { e: 125, catchP: 0.28, minHunter: 6 }, prey: { max: 3.0, minPrey: 0.6, range: 42, detect: ['vision', 'smell', 'lateral'], smell: 105, dmg: 25, swallow: 1.0, active: 'any', satiety: 110 }, waypoints: [[280, 180, 22], [470, 260, 26], [340, 400, 32], [190, 330, 24]], rest: [320, 300, 30] },
    'lemon shark':    { size: 2.8,  kind: 'shark',  habitat: { zone: 'coastal',  d0: 3,  d1: 22 }, count: 2, speed: 3.8, sprint: 9.6,  sprintT: 22, tiredT: 60, shallowOK: 4,  hp: 240, food: { e: 115, catchP: 0.30, minHunter: 5.5 }, prey: { max: 2.8, minPrey: 0.5, range: 34, detect: ['vision', 'lateral', 'electro'], electro: 18, dmg: 23, swallow: 1.0, active: 'any', satiety: 100 }, waypoints: [[126, 115, 7], [470, 112, 7], [526, 278, 8], [140, 512, 8]], rest: [130, 120, 8] },
    'thresher shark': { size: 4.5,  kind: 'shark',  habitat: { zone: 'pelagic',  d0: 15, d1: 85 }, count: 2, speed: 4.8, sprint: 12.2, sprintT: 26, tiredT: 70, shallowOK: 22, hp: 390, food: { e: 175, catchP: 0.25, minHunter: 8 }, prey: { max: 4.0, minPrey: 0.7, range: 44, detect: ['vision', 'lateral'], dmg: 34, swallow: 1.2, active: 'any', satiety: 130 }, waypoints: [[300, 260, 35], [420, 330, 42], [280, 400, 45], [220, 300, 32]], rest: [320, 340, 45] },
    'goblin shark':   { size: 3.5,  kind: 'shark',  habitat: { zone: 'abyss',    d0: 45, d1: 135 }, count: 2, speed: 3.2, sprint: 9.2,  sprintT: 20, tiredT: 70, shallowOK: 35, hp: 310, food: { e: 140, catchP: 0.30, minHunter: 6.5 }, prey: { max: 3.8, minPrey: 0.6, range: 36, detect: ['electro', 'lateral'], electro: 36, dmg: 31, swallow: 1.1, active: 'any', satiety: 120 }, waypoints: [[360, 425, 80], [405, 460, 95], [340, 470, 75], [220, 445, 58]], rest: [380, 450, 92] },
    'orca':           { size: 8.0,  kind: 'shark',  habitat: { zone: 'event',    d0: 4,  d1: 60 }, count: 0, speed: 5.8, sprint: 13.0, sprintT: 40, tiredT: 60, shallowOK: 12, hp: 900, pack: true, food: { e: 0 }, prey: { max: 16.0, minPrey: 1.2, range: 62, detect: ['vision', 'echo'], dmg: 55, huntsSharks: true, huntsNpc: ['seal', 'dolphin', 'whale calf'], prefer: ['whale calf'], aggressive: true, active: 'any', satiety: 200 }, waypoints: [[180, 260, 18], [320, 180, 20], [460, 320, 25], [280, 440, 30]], rest: [320, 280, 22] }
  };

  OC.SPECIES_INFO = {
    'sardine': 'Dense silver baitfish school; packs tightly into baitballs when hunted.',
    'anchovy': 'Shimmering surface/midwater shoal that flees rapidly from predators.',
    'herring': 'Swift pelagic schooling fish cruising open ocean currents.',
    'damselfish': 'Bright cobalt and yellow reef school hugging coral heads.',
    'lanternfish': 'Bioluminescent deep-sea school rising toward shallower water at night.',
    'mackerel': 'Fast torpedo-shaped predators cruising in coordinated packs.',
    'snapper': 'Red reef fish hovering above coral shelves and drop-offs.',
    'tuna': 'High-speed ocean cruisers patrolling the open pelagic zone.',
    'squid': 'Jet-propelled cephalopods that rise at night and release ink when attacked.',
    'shrimp': 'Dense swarms darting through seagrass meadows and sandy bays.',
    'krill': 'Vast deep-water swarms migrating upward every night; whale food.',
    'flying fish': 'Streamlined surface swimmers capable of bursting at extreme speed.',
    'salp chain': 'Translucent colonial tunicates drifting along ocean currents.',
    'crab': 'Sideways-scuttling bottom scavengers that freeze under rocks when threatened.',
    'blue crab': 'Agile coastal crabs patrolling shallow sandy bays and seagrass.',
    'hermit crab': 'Tiny armored bottom dwellers carrying borrowed spiral shells.',
    'spider crab': 'Long-legged deep-sea crabs marching slowly across abyssal sand.',
    'lobster': 'Nocturnal reef crevice dwellers using rapid tail-flip escapes.',
    'sea urchin': 'Spiny bottom grazers guarding reef rubble with sharp spines.',
    'clam': 'Buried filter-feeding bivalves along sandy shelves.',
    'scallop': 'Clapping-shell bottom dwellers capable of short jet hops.',
    'sea cucumber': 'Slow cylindrical bottom detritivores on sand and deep silt.',
    'starfish': 'Five-armed reef crawlers creeping across rocks and coral.',
    'nudibranch': 'Brightly colored sea slugs carrying potent chemical toxin.',
    'seahorse': 'Upright seagrass dwellers drifting quietly among blades.',
    'tube worms': 'Red-plumed hydrothermal vent colonies thriving in scalding heat.',
    'clownfish': 'Bright orange reef fish sheltering among stinging sea anemones.',
    'butterflyfish': 'Delicate patterned reef swimmers picking food from coral.',
    'angelfish': 'Boldly striped reef dwellers gliding between coral tables.',
    'parrotfish': 'Beak-jawed turquoise grazers sleeping among reefs at night.',
    'surgeonfish': 'Vibrant blue-and-yellow reef grazers darting near coral walls.',
    'wrasse': 'Quick reef swimmers including stations that clean parasites and wounds.',
    'goatfish': 'Bottom-rooting sandy-shelf swimmers probing sediment with barbels.',
    'triggerfish': 'Sharp-spined coral reef swimmers with strong crushing jaws.',
    'pufferfish': 'Spiky slow swimmers carrying deadly tetrodotoxin.',
    'cuttlefish': 'Hovering cephalopods rippling lateral fin skirts and flashing ink.',
    'nautilus': 'Ancient chambered cephalopods jetting smoothly along deep canyon walls.',
    'humboldt squid': 'Fierce mid-water nocturnal hunters pulsing in coordinated jet bursts.',
    'octopus': 'Intelligent reef masters crawling from den to den and jetting with ink.',
    'giant squid': 'Colossal 20 m abyssal leviathan patrolling the deep trench with grappling tentacles.',
    'titan triggerfish': 'Aggressive territorial reef fish fiercely defending coral slopes.',
    'lionfish': 'Ornate striped reef stalkers armed with venomous fin spines.',
    'stonefish': 'Camouflaged bottom ambushers delivering powerful venom on contact.',
    'sea snake': 'Banded venomous marine reptiles surfacing periodically for air.',
    'stingray': 'Graceful wing-gliding rays settling onto sand with a venomous tail spine.',
    'electric ray': 'Bottom-hugging rays capable of delivering painful electric shocks.',
    'eagle ray': 'Spotted pelagic rays soaring smoothly across open reefs and shelves.',
    'conger eel': 'Muscular nocturnal crevice predators haunting shipwrecks and caves.',
    'moray': 'Sharp-toothed reef predators striking from coral holes.',
    'grouper': 'Heavy ambush predators lurking beside reefs and wrecks.',
    'giant trevally': 'Powerful silver reef apex cruisers hunting mid-sized fish.',
    'barracuda': 'Razor-toothed ambush torpedoes patrolling mid-water reefs.',
    'wahoo': 'One of the fastest pelagic hunters in the open sea.',
    'swordfish': 'Bill-armed open-water giants slicing through deep pelagic currents.',
    'anglerfish': 'Deep abyssal ambush predators with glowing lures and needle fangs.',
    'ribbonfish': 'Undulating silver deep-sea ribbons shimmering in the twilight zone.',
    'sea turtle': 'Air-breathing armored grazers feeding on seagrass and jellyfish blooms.',
    'manta ray': 'Majestic 5 m filter feeders soaring smoothly through plankton clouds.',
    'sunfish': 'Bizarre towering ocean drifters grazing on jellyfish.',
    'whale shark': 'Gentle 14 m spotted giant filtering plankton clouds near the surface.',
    'whale': 'Colossal 42 m humpback leviathan with a calf; sings at night and slams orcas.',
    'whale calf': 'Young 14 m whale shadowing its mother closely and surfacing together.',
    'seal': 'Agile air-breathing hunters weaving playfully through kelp forests.',
    'dolphin': 'Intelligent echolocating pods that herd baitballs, flank prey and porpoise.',
    'man-o-war': 'Drifting surface siphonophores trailing long venomous tentacles.',
    'great white': 'Massive apex shark hunting by sight, vibration, blood scent and electroreception.',
    'tiger shark': 'Striped nocturnal reef and shallow-water apex predator.',
    'hammerhead': 'Wide-headed shark sweeping reefs and drop-offs with unmatched electroreception.',
    'bull shark': 'Aggressive coastal shark patrolling shallow beaches, mangroves and estuaries.',
    'reef shark': 'Quick, persistent reef patrollers guarding coral shelves.',
    'mako shark': 'Blistering open-water sprint shark chasing fast pelagic prey.',
    'blue shark': 'Sleek oceanic cruiser following scents across open currents.',
    'lemon shark': 'Golden shallow-water shark hunting along sandy beaches and seagrass.',
    'thresher shark': 'Long-tailed deep-shelf shark striking prey with sweeping speed.',
    'goblin shark': 'Eerie deep-abyssal shark hunting in pitch-black trenches via electroreception.',
    'orca': 'Apex marine mammal pack capable of coordinating attacks on sharks and whales.'
  };

  OC.SPECIES_LIST = Object.keys(OC.SPECIES);
  OC.PLAYABLE_SPECIES = ['fish'].concat(OC.SPECIES_LIST);
  OC.SHARK_SPECIES = OC.SPECIES_LIST.filter(function (k) { return OC.SPECIES[k].kind === 'shark' && k !== 'orca'; });
  OC.PREDATOR_SPECIES = ['orca', 'giant squid', 'humboldt squid', 'barracuda', 'wahoo', 'swordfish', 'giant trevally', 'titan triggerfish', 'conger eel', 'moray', 'grouper', 'anglerfish', 'seal'];
  OC.FILTER_FEEDERS = { 'whale': 1, 'whale calf': 1, 'whale shark': 1, 'manta ray': 1, 'salp chain': 1, 'clam': 1, 'krill': 1, 'shrimp': 1 };
  OC.HERBIVORES = { 'sea turtle': 1, 'parrotfish': 1, 'surgeonfish': 1, 'sea urchin': 1, 'sunfish': 1, 'clownfish': 1, 'butterflyfish': 1, 'angelfish': 1, 'damselfish': 1, 'seahorse': 1 };

  OC.ROLE_OF = function (name) {
    if (!name || name === 'fish') return 'fish';
    var sp = OC.SPECIES[name];
    if (!sp) return 'fish';
    if (name === 'dolphin') return 'dolphin';
    if (sp.kind === 'shark' && name !== 'orca') return 'shark';
    if (OC.PREDATOR_SPECIES.indexOf(name) >= 0 || sp.kind === 'hunter' || sp.kind === 'ambush' || sp.kind === 'kraken') return 'predator';
    if (sp.kind === 'crab') return 'crab';
    if (sp.kind === 'octopus' || sp.kind === 'squid') return 'cephalopod';
    if (name === 'whale' || name === 'whale calf' || name === 'whale shark' || name === 'manta ray' || name === 'sunfish' || name === 'sea turtle') return 'giant';
    return 'wildlife';
  };

  OC.ROLE_GUIDE = function (name) {
    var r = OC.ROLE_OF(name), sp = OC.SPECIES[name];
    if (r === 'fish') {
      return 'ROLE: SURVIVOR FISH. Start at size 1.0 and grow up to 10.0 by eating plankton, schools, snails, and smaller creatures. Stay alert for sharks and predators hunting you! Use reefs, kelp, caves, anemones, and currents — and use "say" / POST /say to talk or cooperate with sharks (e.g. sharing prey coordinates) or fellow fish to survive.';
    }
    if (r === 'shark') {
      return 'ROLE: APEX SHARK (' + name.toUpperCase() + '). PRIMARY MISSION: Hunt down and eat player FISH agents and natural prey across the sea! Cooperate with other sharks and shark-allies via "say" (channel "sharks" or "all") to share target coordinates and coordinate pack hunts. Use smell (blood/carrion), lateral sense, electroreception, and stealth.';
    }
    if (r === 'dolphin') {
      return 'ROLE: DOLPHIN POD HUNTER. You are fast, social, and breathe air (surface periodically when depth air drops!). Herd schooling fish (sardines, anchovies, herring, mackerel), hunt mid-sized targets, flank enemies, and actively communicate via "say" with pods, fish, or sharks to coordinate or negotiate.';
    }
    if (r === 'predator') {
      return 'ROLE: MARINE PREDATOR (' + name.toUpperCase() + '). PRIMARY MISSION: Track and eat player fish agents and natural sea prey true to your species biology! Cooperate with sharks and predators via "say" ("sharks" or "all"), ambush or pursue prey using your natural senses' + (sp && sp.defense && sp.defense.type === 'ink' ? ' and ink cloud' : '') + (sp && sp.breathes ? ' (remember to surface to breathe!)' : '') + '.';
    }
    if (r === 'crab') {
      return 'ROLE: CRUSTACEAN (' + name.toUpperCase() + '). Seafloor specialist! Scuttle along the seabed, scavenge carcasses, graze snails and worms, freeze or shelter inside rocks/coral/caves from large hunters, pinch attackers with your claws, and communicate with ocean life (even tip off sharks to threats/prey via "say"!).';
    }
    if (r === 'cephalopod') {
      return 'ROLE: CEPHALOPOD (' + name.toUpperCase() + '). Master of stealth, ink-cloud escapes, and jet propulsion! Shelter in reefs/caves or deep canyon water, hunt small crustaceans/fish by stealth, blast ink if cornered, and coordinate or negotiate with sharks via "say".';
    }
    if (r === 'giant') {
      return 'ROLE: OCEAN GIANT (' + name.toUpperCase() + '). Live true to nature! ' + (OC.FILTER_FEEDERS[name] ? 'Filter-feed plankton clouds and krill swarms' : 'Graze seagrass, algae, and jellyfish blooms') + (sp && sp.breathes ? '; surface regularly to breathe!' : '.') + (name === 'whale' ? ' You are colossal (size 55) — slam attacking orcas/threats and broadcast resonant whale calls via "say"!' : ' Use your mass, shell, or speed to survive and communicate with sharks and ocean animals via "say".');
    }
    return 'ROLE: WILD MARINE LIFE (' + name.toUpperCase() + '). Live and survive like in real nature! Feed according to your species size and habitat, use your natural defenses' + (sp && sp.defense ? ' (' + sp.defense.type + ')' : '') + ', hide from predators, and cooperate with sharks or other agents via "say" to stay alive.';
  };

  OC.pickRandomSpecies = function (g, rndFn) {
    var R = function () { return rndFn ? rndFn(g) : Math.random(); };
    // Weighted bucket across fish, sharks, dolphins, predators, crabs, cephalopods, giants & reef wildlife
    var fCnt = 0, sCnt = 0, i;
    for (i = 0; i < (g.fish || []).length; i++) {
      var rl = OC.ROLE_OF(g.fish[i].species);
      if (rl === 'fish') fCnt++;
      else if (rl === 'shark' || rl === 'predator') sCnt++;
    }
    var roll = R();
    // Balanced ecosystem mix across survivor fish, sharks, predators, dolphins, crabs, cephalopods, giants & wildlife
    var bucket;
    if (fCnt === 0 && (g.fish || []).length >= 1 && roll < 0.40) bucket = 'fish';
    else if (sCnt === 0 && (g.fish || []).length >= 1 && roll < 0.45) bucket = 'shark';
    else if (roll < 0.27) bucket = 'fish';
    else if (roll < 0.46) bucket = 'shark';
    else if (roll < 0.58) bucket = 'predator';
    else if (roll < 0.70) bucket = 'dolphin';
    else if (roll < 0.80) bucket = 'crab';
    else if (roll < 0.89) bucket = 'cephalopod';
    else if (roll < 0.95) bucket = 'giant';
    else bucket = 'wildlife';

    if (bucket === 'fish') return 'fish';
    if (bucket === 'dolphin') return 'dolphin';
    if (bucket === 'shark') return OC.SHARK_SPECIES[Math.floor(R() * OC.SHARK_SPECIES.length)];
    if (bucket === 'predator') {
      var preds = ['barracuda', 'orca', 'giant squid', 'humboldt squid', 'moray', 'grouper', 'wahoo', 'swordfish', 'giant trevally', 'lionfish', 'seal', 'anglerfish'];
      return preds[Math.floor(R() * preds.length)];
    }
    if (bucket === 'crab') {
      var crabs = ['crab', 'blue crab', 'spider crab', 'hermit crab', 'lobster'];
      return crabs[Math.floor(R() * crabs.length)];
    }
    if (bucket === 'cephalopod') {
      var cephs = ['octopus', 'cuttlefish', 'nautilus', 'humboldt squid'];
      return cephs[Math.floor(R() * cephs.length)];
    }
    if (bucket === 'giant') {
      var giants = ['sea turtle', 'manta ray', 'sunfish', 'whale shark', 'whale'];
      return giants[Math.floor(R() * giants.length)];
    }
    var wilds = ['clownfish', 'pufferfish', 'parrotfish', 'surgeonfish', 'angelfish', 'butterflyfish', 'triggerfish', 'stingray', 'electric ray', 'eagle ray', 'sea snake', 'stonefish', 'seahorse', 'ribbonfish'];
    return wilds[Math.floor(R() * wilds.length)];
  };
})(OC);

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

