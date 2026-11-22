// OCEAN ARENA v5 — svet (deljeno med pogonom, gledalcem in testi). Vse deterministično.
// Koordinate: x, z ∈ [0, W], d = globina (m), 0 = gladina. Heading: 0 = sever (−z), 90 = vzhod (+x).
var OC = globalThis.OC || (globalThis.OC = {});
(function (OC) {
  var W = 800, L = 800, DMAX = 180;
  OC.W = W; OC.L = L; OC.DMAX = DMAX; OC.VERSION = 'v5';
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function sstep(e0, e1, x) { var t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
  function gauss(x, z, cx, cz, r) { var dx = x - cx, dz = z - cz; return Math.exp(-(dx * dx + dz * dz) / (r * r)); }
  function dist2(ax, az, bx, bz) { var dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; }
  OC.clamp = clamp; OC.lerp = lerp; OC.sstep = sstep; OC.gauss = gauss; OC.dist2 = dist2;
  function mk(seed) { var s = { rs: seed | 0 }; return function () { s.rs = (s.rs + 0x6D2B79F5) | 0; var t = s.rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  OC.mkRng = mk;

  // ── Dno ───────────────────────────────────────────────────────────────────
  function floorAt(x, z) {
    var d = 78 + 10 * Math.sin(x * 0.017) * Math.cos(z * 0.014) + 5 * Math.sin(x * 0.041 + 1.3) * Math.sin(z * 0.037 + 0.4) + 2.5 * Math.sin(x * 0.11) * Math.cos(z * 0.09);
    d = lerp(d, 24 + 3 * Math.sin(z * 0.03) + 1.5 * Math.cos(x * 0.07), sstep(270, 220, x));          // zahodna polica
    d = lerp(d, 5 + 1.5 * Math.sin(z * 0.2), sstep(45, 15, x));                                        // mangrove (plitvo)
    d = lerp(d, 34 + 2 * Math.sin(x * 0.05), sstep(170, 120, z) * sstep(230, 300, x));                 // severna peščina
    d = lerp(d, 30 + 2 * Math.cos(x * 0.04), sstep(690, 740, z));                                      // južna polica
    d -= 9 * gauss(x, z, 200, 260, 40);                                                                  // greben 1 (polica)
    d -= 7 * gauss(x, z, 470, 330, 34);                                                                  // greben 2 (plato)
    d = lerp(d, 60 + 3 * Math.sin(x * 0.03) * Math.cos(z * 0.03), gauss(x, z, 400, 400, 120) * 0.9);    // osrednji plato
    d = lerp(d, 15, clamp(gauss(x, z, 560, 220, 70) * 1.35, 0, 1));                                      // gora A
    d = lerp(d, 40, clamp(gauss(x, z, 650, 620, 60) * 1.3, 0, 1));                                       // gora B
    var tr = Math.exp(-Math.pow((z - 610) / 48, 2)) * sstep(240, 290, x) * sstep(610, 560, x);
    d = lerp(d, 176, tr);                                                                                 // jarek
    var cy = Math.exp(-Math.pow((x - 420) / 16, 2)) * sstep(470, 520, z) * sstep(590, 560, z);
    d = lerp(d, 110, cy * (1 - tr));                                                                      // kanjon
    d = lerp(d, 122, gauss(x, z, 700, 420, 44));                                                          // kotanja
    d = lerp(d, 132, sstep(700, 780, x) * (1 - tr));                                                      // vzhodna globina
    d = lerp(d, 100, gauss(x, z, 720, 150, 30));                                                          // jama letala
    return clamp(d, 3, DMAX);
  }
  OC.floorAt = floorAt;

  // ── Cone (zones) ─────────────────────────────────────────────────────────
  OC.KELP = [
    { id: 'kelp-w1', x: 120, z: 140, r: 36 }, { id: 'kelp-w2', x: 110, z: 420, r: 40 }, { id: 'kelp-w3', x: 160, z: 560, r: 30 },
    { id: 'kelp-s1', x: 220, z: 760, r: 34 }, { id: 'kelp-s2', x: 420, z: 770, r: 38 }, { id: 'kelp-s3', x: 620, z: 760, r: 30 }
  ];
  OC.SEAGRASS = [{ id: 'seagrass-n', x: 420, z: 95, r: 70 }, { id: 'seagrass-sw', x: 300, z: 720, r: 45 }];
  OC.MANGROVE = { id: 'mangrove', x0: 0, x1: 34, z0: 120, z1: 700 };
  OC.REEFS = [
    { id: 'reef-shelf', x: 200, z: 260, r: 42, cleaner: { x: 204, z: 268, d: 14 }, hideMax: 2.5 },
    { id: 'reef-plateau', x: 470, z: 330, r: 34, cleaner: { x: 474, z: 336, d: 50 }, hideMax: 2.0 }
  ];
  OC.WRECKS = [
    { id: 'wreck-freighter', x: 380, z: 420, rx: 22, rz: 7, h: 9, yaw: 0.5, hideMax: 5.0 },
    { id: 'wreck-plane', x: 720, z: 150, rx: 12, rz: 10, h: 4, yaw: -0.8, hideMax: 3.0 }
  ];
  OC.CAVES = [
    { id: 'cave-trench-n', x: 300, z: 590, d: 150, r: 8, maxSize: 3.0, dweller: 'lobster' },
    { id: 'cave-trench-s', x: 520, z: 640, d: 160, r: 7, maxSize: 3.5, dweller: 'moray' },
    { id: 'cave-seamount', x: 548, z: 205, d: 36, r: 6, maxSize: 2.5, dweller: 'moray' },
    { id: 'cave-shelf', x: 240, z: 380, d: 40, r: 9, maxSize: 4.0, dweller: 'octopus' },
    { id: 'cave-canyon', x: 428, z: 530, d: 96, r: 7, maxSize: 3.0, dweller: 'lobster' },
    { id: 'cave-east', x: 760, z: 300, d: 118, r: 7, maxSize: 3.5, dweller: 'moray' },
    { id: 'cave-north', x: 600, z: 60, d: 70, r: 8, maxSize: 4.5, dweller: null },
    { id: 'cave-seamount-b', x: 640, z: 585, d: 58, r: 6, maxSize: 2.0, dweller: 'octopus' },
    { id: 'cave-south', x: 520, z: 745, d: 26, r: 7, maxSize: 3.0, dweller: 'lobster' },
    { id: 'cave-basin', x: 735, z: 452, d: 112, r: 8, maxSize: 4.0, dweller: null }
  ];
  OC.VENTS = [{ id: 'vent-a1', x: 572, z: 262 }, { id: 'vent-a2', x: 590, z: 246 }, { id: 'vent-a3', x: 556, z: 276 }, { id: 'vent-t1', x: 360, z: 650 }, { id: 'vent-t2', x: 380, z: 662 }];
  OC.BIOLUM = { id: 'biolum', x: 420, z: 612, r: 110, minD: 130 };
  OC.DEADZONE = { id: 'deadzone', x: 700, z: 420, r: 40, minD: 105 };
  OC.SARGASSUM = [{ id: 'sargassum-1', x: 330, z: 200, r: 14 }, { id: 'sargassum-2', x: 600, z: 470, r: 12 }, { id: 'sargassum-3', x: 250, z: 650, r: 10 }, { id: 'sargassum-4', x: 700, z: 700, r: 12 }, { id: 'sargassum-5', x: 480, z: 40, r: 9 }];
  OC.JELLY_HOMES = [{ x: 640, z: 360, r: 26, d0: 14, d1: 44 }, { x: 300, z: 480, r: 22, d0: 20, d1: 50 }, { x: 560, z: 720, r: 20, d0: 10, d1: 30 }];
  OC.THERMO = 55; OC.SURFACE_ZONE = 4; OC.DAY_SEC = 420;
  OC.CURRENTS = [
    { id: 'north-jet', kind: 'seg', ax: 250, az: 180, bx: 800, bz: 180, w: 32, d0: 10, d1: 60, v: 1.7 },
    { id: 'east-drift', kind: 'seg', ax: 760, az: 180, bx: 760, bz: 720, w: 28, d0: 10, d1: 90, v: 1.3 },
    { id: 'south-return', kind: 'seg', ax: 760, az: 722, bx: 260, bz: 722, w: 28, d0: 10, d1: 60, v: 1.3 },
    { id: 'west-wall', kind: 'seg', ax: 258, az: 722, bx: 258, bz: 180, w: 26, d0: 10, d1: 45, v: 1.1 },
    { id: 'canyon-flow', kind: 'seg', ax: 420, az: 470, bx: 420, bz: 600, w: 18, d0: 60, d1: 120, v: 1.4 },
    { id: 'mangrove-rip', kind: 'seg', ax: 30, az: 400, bx: 130, bz: 400, w: 14, d0: 1, d1: 12, v: 1.0 },
    { id: 'upwelling-a', kind: 'up', x: 560, z: 220, r: 45, v: 0.7 }, { id: 'upwelling-b', kind: 'up', x: 650, z: 620, r: 40, v: 0.5 }
  ];
  OC.SPAWNS = (function () { var a = []; for (var i = 0; i < 10; i++) { var t = i / 10 * Math.PI * 2; a.push({ x: 420 + 250 * Math.cos(t), z: 420 + 250 * Math.sin(t), d: 28 }); } return a; })();
  OC.WHALE_FALL = { x: 440, z: 620, t: 480 * 4 };     // minuta 8: kit potone v jarek
  OC.ORCA_EVENT = { t0: 18 * 60 * 4, t1: 22 * 60 * 4 };   // minuta 18–22: orke

  // ── Rastline (statične, deterministične) ─────────────────────────────────
  // type: seafan, anemone, sponge, coral-brain, coral-staghorn, coral-table, algae-rock, seawhip, tube-worm
  OC.PLANTS = (function () {
    var R = mk(777), P = [], id = 1;
    function add(type, x, z, r, extra) { x = clamp(x, 2, W - 2); z = clamp(z, 2, L - 2); var p = { id: 'v' + (id++), type: type, x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, d: Math.round(floorAt(x, z) * 10) / 10, r: r }; if (extra) for (var k in extra) p[k] = extra[k]; P.push(p); }
    OC.REEFS.forEach(function (rf) {
      var n = rf.id === 'reef-shelf' ? 48 : 34;
      for (var i = 0; i < n; i++) { var a = R() * 6.283, rr = Math.sqrt(R()) * rf.r * 0.95; var t = ['coral-brain', 'coral-staghorn', 'coral-table', 'seafan', 'anemone', 'sponge'][Math.floor(R() * 6)]; add(t, rf.x + Math.cos(a) * rr, rf.z + Math.sin(a) * rr, t === 'coral-table' ? 3 : t === 'anemone' ? 1.6 : 2.2, { reef: rf.id }); }
    });
    OC.WRECKS.forEach(function (w) { for (var i = 0; i < 8; i++) add(['sponge', 'seafan', 'anemone', 'coral-staghorn'][i % 4], w.x + (R() - 0.5) * w.rx * 2.4, w.z + (R() - 0.5) * w.rz * 3, 1.8); });
    for (var i = 0; i < 26; i++) { var x = 260 + R() * 440, z = 240 + R() * 320; add(['seawhip', 'sponge', 'seafan', 'algae-rock'][i % 4], x, z, 2); }   // plato
    for (var j = 0; j < 14; j++) { var v = OC.VENTS[j % OC.VENTS.length]; add('tube-worm', v.x + (R() - 0.5) * 16, v.z + (R() - 0.5) * 16, 1.5); }
    for (var k = 0; k < 16; k++) add('algae-rock', 60 + R() * 180, 100 + R() * 560, 2.2);                                              // polica
    for (var m = 0; m < 12; m++) add(['seawhip', 'sponge'][m % 2], 560 + R() * 200, 500 + R() * 200, 2);                               // gora B
    for (var q = 0; q < 10; q++) add('seafan', 300 + R() * 300, 560 + R() * 90, 2.5, { deep: true });                                   // rob jarka
    return P;
  })();

  OC.plantsNear = function (x, z, d, rng) { var out = []; for (var i = 0; i < OC.PLANTS.length; i++) { var p = OC.PLANTS[i]; var dd = d - p.d; var q = dist2(x, z, p.x, p.z) + dd * dd; if (q < rng * rng) out.push(p); } return out; };
  OC.plantAt = function (x, z, d) { var best = null, bq = 1e9; for (var i = 0; i < OC.PLANTS.length; i++) { var p = OC.PLANTS[i]; var dd = d - p.d; var q = dist2(x, z, p.x, p.z) + dd * dd * 0.5; if (q < p.r * p.r && q < bq) { bq = q; best = p; } } return best; };

  // ── Javna karta ──────────────────────────────────────────────────────────
  OC.chart = function () {
    var f = [];
    OC.KELP.forEach(function (k) { f.push({ type: 'kelp forest', id: k.id, x: k.x, z: k.z, r: k.r, floor: Math.round(floorAt(k.x, k.z)) }); });
    OC.SEAGRASS.forEach(function (k) { f.push({ type: 'seagrass meadow', id: k.id, x: k.x, z: k.z, r: k.r, floor: Math.round(floorAt(k.x, k.z)) }); });
    f.push({ type: 'mangrove roots', id: 'mangrove', x: 17, z: 410, r: 290, note: 'strip along the western edge, x < 34', floor: 5 });
    OC.REEFS.forEach(function (r) { f.push({ type: 'coral reef', id: r.id, x: r.x, z: r.z, r: r.r, floor: Math.round(floorAt(r.x, r.z)) }); });
    OC.WRECKS.forEach(function (w) { f.push({ type: 'wreck', id: w.id, x: w.x, z: w.z, r: w.rx, floor: Math.round(floorAt(w.x, w.z)) }); });
    OC.CAVES.forEach(function (c) { f.push({ type: 'cave', id: c.id, x: c.x, z: c.z, depth: c.d, r: c.r }); });
    OC.VENTS.forEach(function (v) { f.push({ type: 'hydrothermal vent', id: v.id, x: v.x, z: v.z, depth: Math.round(floorAt(v.x, v.z)) }); });
    OC.SARGASSUM.forEach(function (s) { f.push({ type: 'floating weed raft', id: s.id, x: s.x, z: s.z, r: s.r, depth: 0 }); });
    f.push({ type: 'seamount', id: 'seamount-a', x: 560, z: 220, r: 70, top: 15 }); f.push({ type: 'seamount', id: 'seamount-b', x: 650, z: 620, r: 60, top: 40 });
    f.push({ type: 'trench', id: 'trench', x: 420, z: 610, r: 170, floor: 176 }); f.push({ type: 'canyon', id: 'canyon', x: 420, z: 530, r: 20, floor: 110 });
    f.push({ type: 'basin', id: 'basin', x: 700, z: 420, r: 44, floor: 122 }); f.push({ type: 'plateau', id: 'plateau', x: 400, z: 400, r: 120, floor: 60 });
    f.push({ type: 'shelf', id: 'west-shelf', x: 130, z: 400, r: 300, floor: 24 }); f.push({ type: 'shelf', id: 'south-shelf', x: 450, z: 760, r: 300, floor: 30 }); f.push({ type: 'sand flats', id: 'north-flats', x: 450, z: 80, r: 200, floor: 34 });
    return { w: W, l: L, maxDepth: DMAX, note: 'x,z in metres from the north-west corner; depth in metres below the surface; heading 0=north 90=east', features: f };
  };

  // ── Poizvedbe ────────────────────────────────────────────────────────────
  OC.kelpAt = function (x, z, d) { for (var i = 0; i < OC.KELP.length; i++) { var k = OC.KELP[i]; if (dist2(x, z, k.x, k.z) < k.r * k.r && d > floorAt(x, z) - 18) return k; } return null; };
  OC.seagrassAt = function (x, z, d) { for (var i = 0; i < OC.SEAGRASS.length; i++) { var k = OC.SEAGRASS[i]; if (dist2(x, z, k.x, k.z) < k.r * k.r && d > floorAt(x, z) - 2.2) return k; } return null; };
  OC.mangroveAt = function (x, z, d) { var m = OC.MANGROVE; return (x >= m.x0 && x <= m.x1 && z >= m.z0 && z <= m.z1) ? m : null; };
  OC.reefAt = function (x, z, d) { for (var i = 0; i < OC.REEFS.length; i++) { var r = OC.REEFS[i]; if (dist2(x, z, r.x, r.z) < r.r * r.r && d > floorAt(x, z) - 7) return r; } return null; };
  OC.wreckAt = function (x, z, d) { for (var i = 0; i < OC.WRECKS.length; i++) { var w = OC.WRECKS[i], c = Math.cos(-w.yaw), s = Math.sin(-w.yaw), dx = x - w.x, dz = z - w.z; var lx = dx * c - dz * s, lz = dx * s + dz * c; if (Math.abs(lx) < w.rx && Math.abs(lz) < w.rz && d > floorAt(w.x, w.z) - w.h) return w; } return null; };
  OC.caveAt = function (x, z, d) { for (var i = 0; i < OC.CAVES.length; i++) { var c = OC.CAVES[i]; var dd = d - c.d; if (dist2(x, z, c.x, c.z) + dd * dd < c.r * c.r) return c; } return null; };
  OC.sargassumAt = function (x, z, d) { if (d > 3) return null; for (var i = 0; i < OC.SARGASSUM.length; i++) { var s = OC.SARGASSUM[i]; if (dist2(x, z, s.x, s.z) < s.r * s.r) return s; } return null; };
  OC.ventAt = function (x, z, d) { var best = null, bd = 1e9; for (var i = 0; i < OC.VENTS.length; i++) { var v = OC.VENTS[i]; var fd = floorAt(v.x, v.z); var dd = d - fd; var q = dist2(x, z, v.x, v.z) + dd * dd * 0.5; if (q < bd) { bd = q; best = v; } } return { v: best, dist: Math.sqrt(bd) }; };
  OC.inBiolum = function (x, z, d) { var b = OC.BIOLUM; return d > b.minD && dist2(x, z, b.x, b.z) < b.r * b.r; };
  OC.inDeadzone = function (x, z, d) { var b = OC.DEADZONE; return d > b.minD && dist2(x, z, b.x, b.z) < b.r * b.r; };
  OC.tempAt = function (x, z, d) { var t = 20 - 12 * sstep(OC.THERMO - 8, OC.THERMO + 8, d); var v = OC.ventAt(x, z, d); if (v.dist < 14) t += (34 - t) * (1 - v.dist / 14); if (OC.mangroveAt(x, z, d)) t += 3; return Math.round(t * 10) / 10; };
  // tidal cycle: current strength oscillates with a 10 min period (engine sets OC._tide each tick, viewer sets it from snapshot)
  OC.TIDE_SEC = 600; OC._tide = 1;
  OC.tideAt = function (tSec) { return 0.55 + 0.45 * Math.sin(tSec / OC.TIDE_SEC * Math.PI * 2); };
  OC.currentAt = function (x, z, d) {
    var cx = 0, cz = 0, cy = 0, id = null, tide = OC._tide || 1;
    for (var i = 0; i < OC.CURRENTS.length; i++) {
      var c = OC.CURRENTS[i];
      if (c.kind === 'seg') {
        if (d < c.d0 || d > c.d1) continue;
        var vx = c.bx - c.ax, vz = c.bz - c.az, len = Math.sqrt(vx * vx + vz * vz); vx /= len; vz /= len;
        var px = x - c.ax, pz = z - c.az, t = px * vx + pz * vz; if (t < 0 || t > len) continue;
        var ox = px - vx * t, oz = pz - vz * t, off = Math.sqrt(ox * ox + oz * oz); if (off > c.w) continue;
        var f = c.v * (1 - Math.pow(off / c.w, 2)); cx += vx * f; cz += vz * f; id = id || c.id;
      } else { var q = dist2(x, z, c.x, c.z); if (q < c.r * c.r && d < 80) { cy -= c.v * (1 - q / (c.r * c.r)); id = id || c.id; } }
    }
    return { x: cx * tide, z: cz * tide, d: cy * tide, id: id };
  };
  OC.dayLight = function (tSec) { var ph = (tSec / OC.DAY_SEC) % 1; var sun = Math.cos(ph * Math.PI * 2); return clamp(0.06 + 0.94 * sstep(-0.25, 0.35, sun), 0.06, 1); };
  OC.phaseName = function (tSec) { var ph = (tSec / OC.DAY_SEC) % 1; if (ph < 0.2 || ph > 0.8) return 'day'; if (ph < 0.3) return 'dusk'; if (ph < 0.7) return 'night'; return 'dawn'; };
  OC.lightAt = function (tSec, d) { return OC.dayLight(tSec) * Math.exp(-d / 45); };
})(OC);
