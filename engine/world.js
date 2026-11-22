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
