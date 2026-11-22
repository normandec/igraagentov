// OCEAN ARENA v5 bundle — built 2026-11-22T09:05:27.764Z from engine/world.js + species.js + engine.js + http.js. DO NOT EDIT BY HAND.
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

// OCEAN ARENA v5 — vrste živali (podatkovno gnan sistem; pogon je generičen).
// kind: school | static | wander | ambush | hunter | drift | shark | pack | passer
// habitat: {zone, d0, d1}  zone: reef|kelp|seagrass|mangrove|wreck|cave|bottom|pelagic|surface|deep|vent|seamount|plateau|trench|anywhere
// food: {e, minHunter, maxHunter, catchP}   — kaj dobi agent, če jo uje (minHunter = najmanjša velikost lovca)
// defense: {type: spines|venom|poison|ink|shell|sting|bite|shock, dmg}  — kaj se zgodi lovcu ob ugrizu (ali dotiku: touch:true)
// prey: {max, swallow, dmg, range, detect:[vision|smell|echo|electro|lateral], active: day|night|any, satiety, aggressive}
(function (OC) {
  var S = OC.SPECIES = {
    // ── jate ──
    'sardine':      { kind: 'school', count: 10, n: 200, size: 0.15, speed: 1.3, flee: 3.8, habitat: { zone: 'pelagic', d0: 8, d1: 40 }, dayD: 26, nightD: 8, food: { e: 6, catchP: 0.7, bigPenalty: 5 } },
    'anchovy':      { kind: 'school', count: 6, n: 300, size: 0.1, speed: 1.1, flee: 3.2, habitat: { zone: 'pelagic', d0: 4, d1: 25 }, dayD: 14, nightD: 5, food: { e: 4, catchP: 0.8, bigPenalty: 4 } },
    'mackerel':     { kind: 'school', count: 4, n: 60, size: 0.6, speed: 2.4, flee: 5.2, habitat: { zone: 'pelagic', d0: 15, d1: 60 }, dayD: 35, nightD: 20, food: { e: 14, catchP: 0.5, minHunter: 1.4 } },
    'snapper':      { kind: 'school', count: 3, n: 30, size: 0.9, speed: 1.8, flee: 4.2, habitat: { zone: 'reef', d0: 10, d1: 40 }, dayD: 20, nightD: 16, food: { e: 22, catchP: 0.45, minHunter: 1.8 } },
    'tuna':         { kind: 'school', count: 2, n: 12, size: 3.0, speed: 3.4, flee: 9, habitat: { zone: 'deep', d0: 30, d1: 90 }, dayD: 60, nightD: 30, food: { e: 90, catchP: 0.3, minHunter: 4.5 } },
    'squid':        { kind: 'school', count: 4, n: 40, size: 0.5, speed: 1.6, flee: 5, habitat: { zone: 'trench', d0: 60, d1: 170 }, dayD: 150, nightD: 30, food: { e: 12, catchP: 0.55, minHunter: 1.0 }, defense: { type: 'ink' }, nocturnal: true, gather: { x: 300, z: 720, d: 30, phase: 'night', note: 'squid gather to spawn over the seagrass at night' } },
    'shrimp':       { kind: 'school', count: 5, n: 400, size: 0.05, speed: 0.6, flee: 1.5, habitat: { zone: 'mangrove', d0: 1, d1: 5 }, food: { e: 1.5, catchP: 0.9, maxHunter: 2.0 } },
    'krill':        { kind: 'school', count: 4, n: 1000, size: 0.02, speed: 0.4, flee: 0.8, habitat: { zone: 'trench', d0: 40, d1: 170 }, dayD: 150, nightD: 25, food: { e: 2.5, catchP: 1, maxHunter: 3.0 } },
    'flying fish':  { kind: 'school', count: 3, n: 40, size: 0.4, speed: 2.2, flee: 7, habitat: { zone: 'surface', d0: 1, d1: 6 }, dayD: 3, nightD: 3, food: { e: 10, catchP: 0.3, minHunter: 1.2 } },
    'salp chain':   { kind: 'drift', count: 6, size: 0.3, speed: 0.1, habitat: { zone: 'pelagic', d0: 10, d1: 50 }, food: { e: 8, catchP: 1, maxHunter: 2.5 } },
    // ── dno / statično ──
    'crab':         { kind: 'wander', count: 40, size: 0.3, speed: 0.3, habitat: { zone: 'bottom', d0: 10, d1: 110 }, food: { e: 15, catchP: 1, minHunter: 1.3 }, respawn: 960 },
    'hermit crab':  { kind: 'wander', count: 16, size: 0.15, speed: 0.2, habitat: { zone: 'bottom', d0: 5, d1: 40 }, food: { e: 6, catchP: 1, minHunter: 1.0 }, defense: { type: 'shell', minHunter: 1.0 }, respawn: 700 },
    'lobster':      { kind: 'wander', count: 8, size: 0.6, speed: 0.4, habitat: { zone: 'cave', d0: 20, d1: 170 }, nocturnal: true, food: { e: 32, catchP: 0.8, minHunter: 1.8 }, defense: { type: 'pinch', dmg: 6 }, respawn: 1500 },
    'sea urchin':   { kind: 'static', count: 24, size: 0.2, habitat: { zone: 'reef', d0: 8, d1: 55 }, food: { e: 9, catchP: 1, minHunter: 1.6 }, defense: { type: 'spines', dmg: 10 }, respawn: 1200 },
    'clam':         { kind: 'static', count: 20, size: 0.25, habitat: { zone: 'seagrass', d0: 20, d1: 40 }, food: { e: 12, catchP: 1, minHunter: 2.2 }, defense: { type: 'shell' }, respawn: 1600 },
    'scallop':      { kind: 'static', count: 14, size: 0.2, habitat: { zone: 'bottom', d0: 15, d1: 60 }, food: { e: 10, catchP: 0.6, minHunter: 1.4 }, respawn: 1200 },
    'sea cucumber': { kind: 'static', count: 18, size: 0.4, habitat: { zone: 'bottom', d0: 30, d1: 170 }, food: { e: 7, catchP: 1, minHunter: 1.2 }, respawn: 1000 },
    'starfish':     { kind: 'static', count: 14, size: 0.3, habitat: { zone: 'bottom', d0: 5, d1: 60 }, food: { e: 2, catchP: 1 }, respawn: 2000 },
    'nudibranch':   { kind: 'static', count: 10, size: 0.08, habitat: { zone: 'reef', d0: 8, d1: 50 }, food: { e: 3, catchP: 1 }, defense: { type: 'poison', dmg: 20 }, respawn: 1500 },
    'seahorse':     { kind: 'static', count: 10, size: 0.1, habitat: { zone: 'seagrass', d0: 20, d1: 40 }, food: { e: 1, catchP: 0.5 }, respawn: 2000 },
    'tube worms':   { kind: 'static', count: 0, size: 0.1 },
    // ── grebenske in obalne ribe ──
    'parrotfish':   { kind: 'wander', count: 10, size: 0.8, speed: 1.2, flee: 3.0, habitat: { zone: 'reef', d0: 8, d1: 45 }, food: { e: 26, catchP: 0.6, minHunter: 1.4 }, respawn: 1800, sleepsNight: true },
    'surgeonfish':  { kind: 'wander', count: 12, size: 0.5, speed: 1.4, flee: 3.4, habitat: { zone: 'reef', d0: 8, d1: 45 }, food: { e: 16, catchP: 0.6, minHunter: 1.0 }, defense: { type: 'spines', dmg: 5 }, respawn: 1500 },
    'wrasse':       { kind: 'wander', count: 10, size: 0.35, speed: 1.3, flee: 3.0, habitat: { zone: 'reef', d0: 8, d1: 50 }, food: { e: 10, catchP: 0.65 }, respawn: 1200 },
    'goatfish':     { kind: 'wander', count: 8, size: 0.5, speed: 0.9, flee: 2.8, habitat: { zone: 'seagrass', d0: 20, d1: 40 }, food: { e: 14, catchP: 0.6, minHunter: 1.0 }, respawn: 1500 },
    'triggerfish':  { kind: 'ambush', count: 4, size: 0.9, speed: 1.6, habitat: { zone: 'reef', d0: 10, d1: 40 }, food: { e: 28, catchP: 0.5, minHunter: 1.8 }, prey: { max: 1.3, dmg: 9, range: 9, detect: ['vision'], active: 'day', aggressive: true, satiety: 40 }, respawn: 2400 },
    'cuttlefish':   { kind: 'wander', count: 8, size: 0.6, speed: 1.0, flee: 3.5, habitat: { zone: 'seagrass', d0: 15, d1: 45 }, camo: 0.35, food: { e: 20, catchP: 0.5, minHunter: 1.0 }, defense: { type: 'ink' }, respawn: 1800 },
    'pufferfish':   { kind: 'wander', count: 8, size: 0.8, speed: 0.5, flee: 1.2, habitat: { zone: 'reef', d0: 8, d1: 30 }, food: { e: 40, catchP: 1, minHunter: 5 }, defense: { type: 'poison', dmg: 24 }, respawn: 2400 },
    'lionfish':     { kind: 'ambush', count: 6, size: 0.7, speed: 0.6, habitat: { zone: 'reef', d0: 10, d1: 50 }, food: { e: 24, catchP: 0.8, minHunter: 3.0 }, defense: { type: 'venom', dmg: 30 }, prey: { max: 0.6, dmg: 8, range: 3, detect: ['vision'], active: 'night', satiety: 60 }, respawn: 3000 },
    'sea snake':    { kind: 'wander', count: 5, size: 0.5, speed: 1.0, flee: 2.0, habitat: { zone: 'reef', d0: 5, d1: 30 }, food: { e: 12, catchP: 0.5, minHunter: 2.5 }, defense: { type: 'venom', dmg: 40 }, prey: { max: 0.5, dmg: 6, range: 3, detect: ['vision'], active: 'any', satiety: 80 }, respawn: 3000 },
    'stingray':     { kind: 'wander', count: 6, size: 1.5, speed: 0.8, flee: 3.0, habitat: { zone: 'bottom', d0: 10, d1: 50 }, buried: true, food: { e: 50, catchP: 0.5, minHunter: 3.0 }, defense: { type: 'sting', dmg: 35, touch: true, touchR: 2.0 }, respawn: 3000 },
    'eagle ray':    { kind: 'wander', count: 3, size: 2.5, speed: 1.6, flee: 4.0, habitat: { zone: 'pelagic', d0: 10, d1: 50 }, food: { e: 70, catchP: 0.4, minHunter: 4.5 }, respawn: 4000 },
    'conger eel':   { kind: 'ambush', count: 4, size: 1.6, speed: 1.2, habitat: { zone: 'wreck', d0: 20, d1: 110 }, food: { e: 45, catchP: 0.5, minHunter: 3.0 }, prey: { max: 1.1, dmg: 16, range: 4, detect: ['vision', 'smell'], active: 'night', satiety: 120 }, respawn: 3000 },
    'moray':        { kind: 'ambush', count: 0, size: 2.0, speed: 1.0, habitat: { zone: 'cave' }, food: { e: 55, catchP: 0.4, minHunter: 3.5 }, prey: { max: 3.9, dmg: 25, range: 6, detect: ['vision', 'lateral'], active: 'any', satiety: 30 }, respawn: 4000 },
    'octopus':      { kind: 'ambush', count: 0, size: 1.2, speed: 1.0, habitat: { zone: 'cave' }, camo: 0.3, food: { e: 40, catchP: 0.5, minHunter: 2.2 }, defense: { type: 'ink' }, prey: { max: 1.2, dmg: 14, range: 4, detect: ['vision'], active: 'night', satiety: 100, hold: 12 }, respawn: 4000 },
    'grouper':      { kind: 'ambush', count: 3, size: 3.5, speed: 1.6, sprint: 6.5, habitat: { zone: 'wreck', d0: 20, d1: 110 }, food: { e: 100, catchP: 0.3, minHunter: 5.5 }, prey: { max: 2.2, swallow: 2.0, dmg: 30, range: 12, detect: ['vision', 'lateral'], active: 'any', satiety: 180 }, respawn: 5000 },
    'barracuda':    { kind: 'hunter', count: 5, size: 2.2, speed: 2.6, sprint: 8.5, habitat: { zone: 'pelagic', d0: 3, d1: 30 }, food: { e: 60, catchP: 0.35, minHunter: 3.6 }, prey: { max: 1.4, swallow: 0.9, dmg: 22, range: 30, detect: ['vision'], active: 'day', satiety: 150, shiny: true }, respawn: 5000 },
    'swordfish':    { kind: 'hunter', count: 2, size: 4.0, speed: 3.0, sprint: 11, habitat: { zone: 'deep', d0: 30, d1: 100 }, food: { e: 120, catchP: 0.25, minHunter: 6.5 }, prey: { max: 3.2, swallow: 1.2, dmg: 40, range: 30, detect: ['vision'], active: 'any', satiety: 200 }, respawn: 0 },
    'anglerfish':   { kind: 'ambush', count: 6, size: 1.0, speed: 0.5, habitat: { zone: 'trench', d0: 140, d1: 176 }, lure: true, food: { e: 30, catchP: 0.6, minHunter: 1.8 }, prey: { max: 1.5, swallow: 1.2, dmg: 30, range: 2.5, detect: ['lateral'], active: 'any', satiety: 120 }, respawn: 3000 },
    // ── nenevarne velike ──
    'sea turtle':   { kind: 'wander', count: 4, size: 2.5, speed: 1.0, flee: 2.2, habitat: { zone: 'seagrass', d0: 5, d1: 40 }, defense: { type: 'shell' }, eatsJellies: true, breathes: true, food: { e: 0, catchP: 0 } },
    'manta ray':    { kind: 'passer', count: 2, size: 6.0, speed: 1.8, habitat: { zone: 'pelagic', d0: 5, d1: 40 }, defense: { type: 'shell' }, food: { e: 0, catchP: 0 }, filter: true },
    'sunfish':      { kind: 'wander', count: 2, size: 5.0, speed: 0.6, flee: 1.0, habitat: { zone: 'pelagic', d0: 5, d1: 60 }, eatsJellies: true, food: { e: 150, catchP: 0.5, minHunter: 8.0 }, defense: { type: 'shell' } },
    'whale':        { kind: 'passer', count: 1, size: 25, speed: 2.2, sprint: 5, habitat: { zone: 'pelagic', d0: 10, d1: 30 }, defense: { type: 'shell' }, food: { e: 0, catchP: 0 }, breathes: true, waypoints: [[110, 340, 18], [330, 120, 22], [600, 160, 20], [720, 480, 24], [460, 620, 110], [300, 600, 120], [180, 470, 20]] },
    'whale calf':   { kind: 'passer', count: 1, size: 8, speed: 2.2, sprint: 4.5, habitat: { zone: 'pelagic', d0: 8, d1: 25 }, hp: 1200, defense: { type: 'shell' }, food: { e: 0, catchP: 0 }, breathes: true },
    // ── plenilci s čutili ──
    'seal':         { kind: 'hunter', count: 3, size: 2.8, speed: 2.5, sprint: 6.5, habitat: { zone: 'surface', d0: 1, d1: 20 }, food: { e: 80, catchP: 0.3, minHunter: 4.6 }, prey: { max: 2.0, swallow: 1.3, dmg: 24, range: 25, detect: ['vision', 'lateral'], active: 'day', satiety: 200 }, breathes: true },
    'dolphin':      { kind: 'pack', count: 5, size: 3.0, speed: 3.0, sprint: 8, habitat: { zone: 'pelagic', d0: 3, d1: 40 }, food: { e: 0, catchP: 0 }, defense: { type: 'bite', dmg: 20 }, prey: { max: 2.0, swallow: 1.4, dmg: 20, range: 60, detect: ['echo', 'vision'], active: 'any', satiety: 240, preferSchools: true }, breathes: true },
    'man-o-war':    { kind: 'drift', count: 6, size: 0.5, speed: 0.15, habitat: { zone: 'surface', d0: 0.5, d1: 3 }, defense: { type: 'sting', dmg: 3, touch: true, touchR: 6, perSec: true }, food: { e: 0, catchP: 0 } },
    'jellyfish bloom': { kind: 'bloom', count: 0 },
    // ── morski psi ──
    'great white':  { kind: 'shark', count: 1, size: 14, speed: 3.0, sprint: 8.2, sprintT: 20, tiredT: 90, hp: 900, prey: { max: 6, swallow: 4.5, dmg: 60, range: 38, smell: 240, detect: ['vision', 'smell', 'lateral'], active: 'any', satiety: 600, ignoreAbove: 9 }, waypoints: [[420, 420, 50], [700, 300, 80], [600, 650, 70], [300, 640, 60], [460, 260, 40], [740, 560, 90]], rest: [720, 480, 110], scavenge: true },
    'tiger shark':  { kind: 'shark', count: 1, size: 11, speed: 2.8, sprint: 7.2, sprintT: 16, tiredT: 80, hp: 700, prey: { max: 5, swallow: 3.5, dmg: 50, range: 30, smell: 200, detect: ['vision', 'smell'], active: 'night', satiety: 480, ignoreAbove: 8 }, waypoints: [[260, 300, 30], [240, 500, 30], [320, 700, 30], [500, 740, 32], [660, 720, 34], [300, 180, 30], [180, 340, 24]], rest: [520, 480, 70], scavenge: true, shallowOK: 12 },
    'hammerhead':   { kind: 'shark', count: 3, pack: 'hammerheads', size: 7, speed: 2.9, sprint: 7.5, sprintT: 14, tiredT: 70, hp: 450, prey: { max: 3.5, swallow: 2.8, dmg: 38, range: 26, smell: 120, detect: ['vision', 'electro', 'smell'], electro: 16, active: 'day', satiety: 360, ignoreAbove: 6 }, waypoints: [[560, 220, 30], [600, 280, 45], [520, 160, 40], [650, 620, 55], [480, 330, 45]], rest: [620, 400, 80] },
    'bull shark':   { kind: 'shark', count: 1, size: 8, speed: 2.6, sprint: 7.0, sprintT: 14, tiredT: 70, hp: 520, prey: { max: 4, swallow: 3.0, dmg: 42, range: 22, smell: 150, detect: ['vision', 'smell', 'lateral'], active: 'any', satiety: 300, aggressive: true, ignoreAbove: 99 }, waypoints: [[60, 300, 8], [80, 520, 12], [160, 400, 18], [120, 200, 16], [60, 650, 10], [220, 620, 20]], rest: [140, 420, 20], shallowOK: 4 },
    'reef shark':   { kind: 'shark', count: 3, size: 4.5, speed: 2.4, sprint: 6.4, sprintT: 12, tiredT: 60, hp: 260, prey: { max: 2.0, swallow: 1.6, dmg: 26, range: 20, smell: 80, detect: ['vision', 'smell'], active: 'night', satiety: 240, ignoreAbove: 3.5, timid: 6 }, waypoints: [[200, 260, 18], [240, 230, 20], [160, 290, 20], [470, 330, 48], [500, 300, 50], [440, 360, 52]], rest: [430, 300, 55], shallowOK: 8 },
    'orca':         { kind: 'shark', count: 0, pack: 'orcas', size: 18, speed: 3.5, sprint: 10, sprintT: 24, tiredT: 40, hp: 1500, prey: { max: 30, swallow: 6, dmg: 90, range: 90, smell: 0, detect: ['echo', 'vision'], active: 'any', satiety: 120, huntsSharks: true, huntsNpc: ['whale calf'], prefer: ['whale calf'], minPrey: 3.0 }, waypoints: [[420, 420, 30], [560, 220, 25], [300, 300, 30], [650, 620, 40], [200, 600, 25]], rest: [400, 100, 30], event: true }
  };
  OC.SPECIES_LIST = Object.keys(S);
  // short spectator descriptions (NOT exposed to agents)
  OC.SPECIES_INFO = { 'whale': 'humpback with calf: dives to the trench for krill, breathes at the surface, sings at night; mother defends calf from orcas', 'whale calf': 'humpback calf — targeted by orcas', 'great white': 'smells blood at 240 m, 8 m/s sprint, swallows up to size 4.5', 'tiger shark': 'nocturnal, coastal, scavenger', 'hammerhead': 'pack of 3, electroreception detects fish hidden on the bottom', 'bull shark': 'shallows/mangroves, attacks everything', 'reef shark': 'nocturnal reef shark, shy around large fish', 'orca': '18–22 min event: hunts sharks and large fish', 'dolphin': 'pod, echolocation detects hidden fish', 'barracuda': 'lightning-fast daytime hunter in the shallows', 'grouper': 'ambushes from wrecks, swallows up to size 2.0', 'anglerfish': 'lure glows in the dark', 'lionfish': 'venomous spines', 'stingray': 'buried in sand; stings on touch', 'pufferfish': 'poisonous except to very large predators', 'moray': 'in caves, bites anything under size 4', 'octopus': 'nocturnal ambush predator, ink cloud', 'seal': 'daytime predator near the surface', 'man-o-war': 'drifting siphonophore, severe stinging tentacles' };
})(OC);

// OCEAN ARENA v5 — pogon simulacije (deterministično; brez omrežja).
(function (OC) {
  var C = OC.CONST = {
    TICK_MS: 250, MAX_TICKS: 6000, LOBBY_SEC: 300, IDLE_SEC: 90, MIN_CMD_MS: 2000,
    MAX_SEATS: 10, MIN_PLAYERS: 2, FAMINE_TICK: 4320, MAX_SIZE: 10, START_SIZE: 1.0,
    GROWTH: 0.004, BITE_CD: 6, SWALLOW_RATIO: 1.6, LUNGE_ST: 40, MAX_DUR: 60, DEF_DUR: 20, CATCHUP_MAX: 120
  };
  var DT = C.TICK_MS / 1000, TAU = Math.PI * 2, D2R = Math.PI / 180, R2D = 180 / Math.PI;
  var clamp = OC.clamp, floorAt = OC.floorAt, SP = OC.SPECIES;
  var COLORS = OC.COLORS = ['sand', 'kelp', 'blue', 'dark', 'silver', 'red', 'orange'];
  var SPEEDS = OC.SPEEDS = { rest: 0, slow: 0.35, cruise: 1, fast: 1.5, sprint: 2.4 };
  var ACTS = OC.ACTS = ['swim', 'hunt', 'feed', 'hide', 'flee', 'lunge'];

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
  function r1(v) { return Math.round(v * 10) / 10; }
  function tSec(g) { return g.tick * DT; }
  function isNight(g) { var p = OC.phaseName(tSec(g)); return p === 'night'; }
  function isDay(g) { return OC.phaseName(tSec(g)) === 'day'; }

  // ── Habitati / spawn ─────────────────────────────────────────────────────
  function spawnPos(g, sp, idx) {
    var h = sp.habitat || { zone: 'anywhere', d0: 5, d1: 60 }, x, z, d, fl, tries = 0, i;
    function rndIn(cx, cz, r) { var a = rnd(g) * TAU, rr = Math.sqrt(rnd(g)) * r; x = clamp(cx + Math.cos(a) * rr, 2, OC.W - 2); z = clamp(cz + Math.sin(a) * rr, 2, OC.L - 2); }
    while (tries++ < 30) {
      switch (h.zone) {
        case 'reef': var rf = OC.REEFS[idx % 2]; rndIn(rf.x, rf.z, rf.r * 0.9); break;
        case 'kelp': var k = OC.KELP[idx % OC.KELP.length]; rndIn(k.x, k.z, k.r * 0.9); break;
        case 'seagrass': var sg = OC.SEAGRASS[idx % 2]; rndIn(sg.x, sg.z, sg.r * 0.9); break;
        case 'mangrove': x = 3 + rnd(g) * 28; z = OC.MANGROVE.z0 + rnd(g) * (OC.MANGROVE.z1 - OC.MANGROVE.z0); break;
        case 'wreck': var w = OC.WRECKS[idx % 2]; rndIn(w.x, w.z, w.rx * 0.8); break;
        case 'cave': var cv = OC.CAVES[idx % OC.CAVES.length]; x = cv.x; z = cv.z; break;
        case 'surface': x = 20 + rnd(g) * (OC.W - 40); z = 20 + rnd(g) * (OC.L - 40); break;
        case 'deep': x = 300 + rnd(g) * 480; z = 200 + rnd(g) * 500; break;
        case 'trench': x = 300 + rnd(g) * 250; z = 575 + rnd(g) * 70; break;
        case 'vent': var v = OC.VENTS[idx % OC.VENTS.length]; rndIn(v.x, v.z, 10); break;
        case 'seamount': rndIn(560, 220, 50); break;
        case 'plateau': rndIn(400, 400, 100); break;
        default: x = 20 + rnd(g) * (OC.W - 40); z = 20 + rnd(g) * (OC.L - 40);
      }
      fl = floorAt(x, z);
      if (h.zone === 'bottom' || h.zone === 'reef' || h.zone === 'seagrass' || h.zone === 'wreck' || sp.kind === 'static' || sp.buried) { d = fl - 0.5; if (h.d0 !== undefined && (fl < h.d0 || fl > h.d1)) continue; }
      else if (h.zone === 'cave') d = OC.CAVES[idx % OC.CAVES.length].d;
      else { d = clamp(h.d0 + rnd(g) * (h.d1 - h.d0), 0.5, fl - 1.5); if (h.zone === 'deep' && fl < 70) continue; if (h.zone === 'pelagic' && fl < 25) continue; }
      break;
    }
    return { x: x, z: z, d: d };
  }
  function mkNpc(g, name, idx, pos) {
    var sp = SP[name], px = Math.round(pos.x * 10) / 10, pz = Math.round(pos.z * 10) / 10, pd = Math.round(pos.d * 10) / 10, n = { id: 'a' + (g.nextA++), sp: name, x: px, z: pz, d: pd, h: Math.round(rnd(g) * 360), spd: 0, hp: sp.hp || hpMax(sp.size), alive: true, st: 'idle', tg: null, tm: 0, sat: 0, hx: px, hz: pz, hd: pd, rt: 0, wp: 0, sprint: 0, tired: 0, bleed: 0 };
    if (sp.kind === 'school') n.n = sp.n;
    if (sp.pack) n.pk = sp.pack;
    if (sp.kind === 'shark') { n.wp = Math.floor(rnd(g) * sp.waypoints.length); n.st = 'patrol'; }
    g.npcs.push(n); return n;
  }

  OC.newGame = function (gen, seed) {
    var g = { v: 5, gen: gen || 1, status: 'lobby', tick: 0, seed: seed || (gen * 7919 + 13), rs: 0, startMs: 0, lastMs: 0, firstClaimMs: 0, lobbyUntilMs: 0,
      fish: [], feed: [], winner: null, ranks: null, nextId: 1, nextA: 1, nextK: 1, famine: false, npcs: [], plankton: [], blooms: [], carrion: [], stateHits: {}, events: { whale: false, orcas: false, orcasGone: false } };
    g.rs = g.seed | 0;
    var i, name;
    for (i = 0; i < 14; i++) g.plankton.push({ id: 'p' + (i + 1), x: 40 + rnd(g) * 720, z: 40 + rnd(g) * 720, d: 40, r: 16, amt: 100 });
    OC.JELLY_HOMES.forEach(function (jh, k) { g.blooms.push({ id: 'j' + (k + 1), x: jh.x, z: jh.z, d: (jh.d0 + jh.d1) / 2, r: jh.r, n: 40, hx: jh.x, hz: jh.z, d0: jh.d0, d1: jh.d1 }); });
    for (name in SP) {
      var sp = SP[name]; if (!sp.count && !(sp.habitat && sp.habitat.zone === 'cave')) continue;
      if (sp.habitat && sp.habitat.zone === 'cave' && !sp.count) { // prebivalci jam
        OC.CAVES.forEach(function (cv, ci) { if (cv.dweller === name) { var cnt = name === 'lobster' ? 2 : 1; for (var q = 0; q < cnt; q++) mkNpc(g, name, ci, { x: cv.x + (rnd(g) - 0.5) * 3, z: cv.z + (rnd(g) - 0.5) * 3, d: cv.d }); } });
        continue;
      }
      if (sp.event) continue;
      for (i = 0; i < sp.count; i++) { var pos = spawnPos(g, sp, i); if (name === 'whale') pos = { x: 120, z: 300, d: 18 }; if (name === 'whale calf') pos = { x: 112, z: 306, d: 15 }; if (sp.kind === 'shark') { var w0 = sp.waypoints[i % sp.waypoints.length]; pos = { x: w0[0] + i * 6, z: w0[1] + i * 4, d: w0[2] }; } mkNpc(g, name, i, pos); }
    }
    return g;
  };

  function addFeed(g, txt) { g.feed.push({ t: g.tick, txt: txt }); if (g.feed.length > 100) g.feed.splice(0, g.feed.length - 100); }
  OC.addFeed = addFeed;
  function ev(f, key, txt, n) {
    var e = f.ev;
    for (var i = e.length - 1; i >= 0 && i >= e.length - 14; i--) { if (e[i].k === key && e[i].t >= f.lastMeTick) { e[i].n += (n || 0); e[i].c++; e[i].txt = txt; return; } }
    e.push({ k: key, txt: txt, n: n || 0, c: 1, t: f.lastMeTick }); if (e.length > 40) e.splice(0, e.length - 40);
  }

  OC.addFish = function (g, name, model, color, key, ip) {
    var id = 'f' + (g.nextId++), sp = OC.SPAWNS[(g.fish.length * 3) % 10];
    var f = { id: id, n: name, model: model || '?', color: COLORS.indexOf(color) >= 0 ? color : 'blue', key: key, ip: ip || null,
      x: sp.x, z: sp.z, d: sp.d, h: bearing(sp.x, sp.z, 420, 420), p: 0, spd: 0, sz: C.START_SIZE, hp: hpMax(C.START_SIZE), en: 80, st: 100, bleed: 0, poison: 0, ink: 0, held: 0, alive: true, hid: false, cave: null,
      kills: 0, npcKills: 0, ate: 0, bites: 0, cmdN: 0, meN: 0, lastCmdTick: 0, lastMeTick: 0, lastCmdMs: 0, cmdMs: [], whys: [], whyLog: [], ev: [],
      cmd: { act: 'swim', speed: 'rest', h: 0, p: 0, until: 0, target: null, goto: null }, cool: 0, lunge: 0, born: 0, died: null, cause: null, suspect: false, cheat: false, why: '', score: 0 };
    f.cmd.h = f.h; g.fish.push(f); addFeed(g, name + ' entered the water (' + (model || '?') + ')'); return f;
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
    return { ok: errs.length === 0, errs: errs, cmd: out };
  };
  OC.applyCmd = function (g, f, c, nowMs) {
    f.cmd = { act: c.act, speed: c.speed, h: c.h !== undefined ? c.h : f.cmd.h, p: c.p, until: g.tick + Math.round(c.dur / DT), target: c.target || null, goto: c.goto || null, t0: g.tick };
    if (c.act === 'hide') f.cmd.speed = 'rest';
    if (c.act === 'lunge') { if (f.st >= C.LUNGE_ST) { f.lunge = 4; f.st -= C.LUNGE_ST; f.en = Math.max(0, f.en - 3); } else ev(f, 'nolunge', 'not enough stamina to lunge (' + Math.round(f.st) + ')'); f.cmd.act = 'swim'; f.cmd.speed = c.speed === 'rest' ? 'cruise' : c.speed; }
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

  // ── Skrivališča / vidnost ────────────────────────────────────────────────
  function hideInfo(f) { // kje je in ali ga to lahko skrije
    var x = f.x, z = f.z, d = f.d, sz = f.sz || 1, fl = floorAt(x, z);
    var cv = OC.caveAt(x, z, d); if (cv) return { src: cv.id, mult: 0, ok: true, solid: true, birdSafe: true };
    var w = OC.wreckAt(x, z, d); if (w) return { src: w.id, mult: 0.3, ok: sz <= w.hideMax, solid: true, birdSafe: true };
    var k = OC.kelpAt(x, z, d); if (k) return { src: k.id, mult: 0.25, ok: true, birdSafe: d > 3 };
    var m = OC.mangroveAt(x, z, d); if (m) return { src: 'mangrove', mult: 0.2, ok: sz <= 1.5, birdSafe: true };
    var sg = OC.sargassumAt(x, z, d); if (sg) return { src: sg.id, mult: 0.4, ok: sz <= 2.0, birdSafe: true };
    var pl = OC.plantAt(x, z, d);
    if (pl) {
      if (pl.type === 'anemone') return { src: 'anemone', mult: 0.1, ok: sz <= 1.2, plant: pl };
      if (pl.type === 'sponge') return { src: 'sponge', mult: 0.3, ok: sz <= 1.5, plant: pl };
      if (pl.type === 'coral-table') return { src: 'table coral', mult: 0.5, ok: sz <= 2.0, birdSafe: true, plant: pl };
      if (pl.type === 'seafan' || pl.type === 'seawhip') return { src: pl.type, mult: 0.6, ok: sz <= 1.0, plant: pl };
      if (pl.type === 'coral-staghorn' || pl.type === 'coral-brain') return { src: 'coral', mult: 0.15, ok: sz <= 1.8, plant: pl };
    }
    var rf = OC.reefAt(x, z, d); if (rf) return { src: rf.id, mult: 0.12, ok: sz <= rf.hideMax };
    var s = OC.seagrassAt(x, z, d); if (s) return { src: s.id, mult: 0.5, ok: sz <= 2.0 };
    if (d > fl - 1.6) return { src: 'bottom', mult: 0.4, ok: true };
    return { src: null, mult: 1, ok: false };
  }
  OC.hideInfo = hideInfo;
  function visionOf(g, f) {
    var L = OC.lightAt(tSec(g), f.d), v = 6 + 55 * L;
    if (OC.kelpAt(f.x, f.z, f.d)) v *= 0.55; if (OC.wreckAt(f.x, f.z, f.d)) v *= 0.5; if (OC.caveAt(f.x, f.z, f.d)) v *= 0.4;
    if (f.ink > 0) v *= 0.3; if (OC.mangroveAt(f.x, f.z, f.d)) v *= 0.6;
    return v;
  }
  function visMul(g, t, viewer, viewerDetect) { // t: riba ali NPC
    var sz = t.sz || (t.sp && SP[t.sp].size) || 1, m = 0.5 + 0.12 * sz, moving = (t.spd || 0) > 0.8, sp = t.sp ? SP[t.sp] : null;
    var fl = floorAt(t.x, t.z), onBottom = t.d > fl - 1.6 && !moving;
    m *= moving ? 1.25 : (onBottom ? 0.4 : 0.8);
    if (!sp && t.spd > cruiseSpeed(sz) * 1.6) m *= 1.6;
    if (t.bleed > 0) m *= 1.5;
    var hi = hideInfo(t);
    var vInside = viewer && hi.solid && hideInfo(viewer).src === hi.src;
    if (hi.solid && !vInside) return 0;
    if (!sp) { if (hi.src && (t.hid ? hi.ok : (hi.src === 'kelp' || /kelp/.test(hi.src || '') || hi.src === 'mangrove' || /wreck/.test(hi.src || '')))) m *= hi.mult; else if (hi.src && hi.ok && t.hid) m *= hi.mult; }
    else { if (/kelp|wreck|mangrove/.test(hi.src || '')) m *= hi.mult; if (sp.camo) m *= sp.camo; if (sp.buried && !moving) m *= 0.15; if (sp.lure) m *= 0.15; if (sp.nocturnal && !isNight(g) && sp.kind !== 'school') m *= 0.2; }
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
    if (viewerDetect) { // posebna čutila plenilcev
      if (viewerDetect.indexOf('electro') >= 0 && !hi.solid && dist3(viewer, t) < (SP[viewer.sp].prey.electro || 16)) m = Math.max(m, 1.5);
      if (viewerDetect.indexOf('echo') >= 0 && !hi.solid) m = Math.max(m, 1.2);
    }
    return m;
  }
  function canSee(g, viewer, t, baseVis, detect) { var dd = dist3(viewer, t); return dd <= (baseVis || visionOf(g, viewer)) * visMul(g, t, viewer, detect) ? dd : -1; }
  OC.visMul = visMul; OC.visionOf = visionOf; OC.canSee = canSee;

  function zonesOf(g, f) {
    var z = [], hi = hideInfo(f), v = OC.ventAt(f.x, f.z, f.d), fl = floorAt(f.x, f.z);
    if (hi.src && hi.src !== 'bottom') z.push(hi.src);
    var rf = OC.reefAt(f.x, f.z, f.d); if (rf && z.indexOf(rf.id) < 0) z.push(rf.id);
    var sg = OC.seagrassAt(f.x, f.z, f.d); if (sg && z.indexOf(sg.id) < 0) z.push(sg.id);
    if (v.dist < 14) z.push(v.v.id + (v.dist < 4 ? ' (scalding)' : ''));
    if (OC.inBiolum(f.x, f.z, f.d)) z.push('glowing water'); if (OC.inDeadzone(f.x, f.z, f.d)) z.push('stagnant water');
    if (f.inJelly) z.push('jellyfish bloom'); if (f.d < OC.SURFACE_ZONE) z.push('surface'); if (f.d > fl - 1.6) z.push('on the bottom');
    if (f.d > OC.THERMO) z.push('below thermocline');
    var cur = OC.currentAt(f.x, f.z, f.d); if (cur.id) z.push('current:' + cur.id);
    if (!z.length || (z.length === 1 && /current|thermo/.test(z[0]))) z.unshift('open water');
    return z;
  }

  // ── Zaznava ──────────────────────────────────────────────────────────────
  OC.perceive = function (g, f, nowMs) {
    var see = [], pulses = [], smell = [], vis = visionOf(g, f), i, dd, cur = OC.currentAt(f.x, f.z, f.d), dark = OC.lightAt(tSec(g), f.d) < 0.1;
    function entry(t, kind, extra) { var b = bearing(f.x, f.z, t.x, t.z); var e = { id: t.id, kind: kind, bearing: Math.round(b), rel: Math.round(relAngle(b, f.h)), dist: r1(dist3(f, t)), x: Math.round(t.x), z: Math.round(t.z), depth: r1(t.d) }; if (extra) for (var k in extra) e[k] = extra[k]; return e; }
    function pulse(t, kind) { pulses.push({ bearing: Math.round(bearing(f.x, f.z, t.x, t.z) / 10) * 10, dist: Math.round(dist3(f, t) / 5) * 5, size: kind }); }
    function smellOf(src, kind, strength, range) { range = range || 110; var dx = f.x - src.x, dz = f.z - src.z, dist = distH(f, src); if (dist > range) return; var cl = Math.sqrt(cur.x * cur.x + cur.z * cur.z); var down = cl < 0.3 ? 1 : (dx * cur.x + dz * cur.z) / (dist * cl); if (down < -0.2) return; smell.push({ kind: kind, bearing: Math.round(bearing(f.x, f.z, src.x, src.z) / 15) * 15, strength: r1(strength * (1 - dist / (range + 10))) }); }
    function szClass(s) { return s > f.sz * 3 ? 'huge' : s > f.sz * 1.3 ? 'large' : s < f.sz * 0.7 ? 'small' : 'similar'; }
    if (g.status === 'running') {
      for (i = 0; i < g.fish.length; i++) {
        var o = g.fish[i]; if (o === f || !o.alive) continue; dd = canSee(g, f, o, vis);
        if (dd >= 0) see.push(entry(o, 'fish', { name: o.n, size: r1(o.sz), heading: Math.round(o.h), moving: o.spd > 0.8, bleeding: o.bleed > 0 }));
        else if (o.spd > 0.8 && dist3(f, o) < 10 + 2.5 * o.sz) pulse(o, szClass(o.sz));
        if (o.bleed > 0) smellOf(o, 'blood', 1 + o.sz * 0.3);
      }
      for (i = 0; i < g.npcs.length; i++) {
        var a = g.npcs[i]; if (!a.alive) continue; var sp = SP[a.sp], asz = sp.size; dd = dist3(f, a);
        if (dd > vis * 3 + 20) continue;
        if (sp.kind === 'school') { if (a.n <= 0) continue; if (dd < vis * 1.5 + 8) see.push(entry(a, a.sp + ' school', { count: Math.round(a.n / 10) * 10, size: asz, moving: true })); continue; }
        if (sp.lure && dark && dd < 25 && dd > 3) { see.push(entry(a, 'small glowing light', {})); continue; }
        var vdd = canSee(g, f, a, vis);
        if (vdd >= 0) { var ex = { size: asz, moving: a.spd > 0.8 }; if (a.bleed > 0) ex.bleeding = true; if (a.pk) ex.group = a.pk; if (a.st === 'hunt' && a.tg === f.id) ex.heading = Math.round(a.h); see.push(entry(a, a.sp, ex)); }
        else if (a.spd > 0.8 && dd < 12 + 2.5 * asz) pulse(a, szClass(asz));
        if (a.bleed > 0) smellOf(a, 'blood', 1 + asz * 0.2);
      }
      for (i = 0; i < g.plankton.length; i++) { var p = g.plankton[i]; if (p.amt <= 1) continue; if (dist3(f, p) < vis * 1.2 + p.r) see.push(entry(p, 'plankton cloud', { radius: p.r, density: Math.round(p.amt) })); else smellOf(p, 'plankton', 0.4); }
      for (i = 0; i < g.blooms.length; i++) { var j = g.blooms[i]; if (dist3(f, j) < vis * 1.4 + j.r) see.push(entry(j, 'jellyfish bloom', { radius: j.r, count: j.n })); }
      for (i = 0; i < g.carrion.length; i++) { var k = g.carrion[i]; if (dist3(f, k) < vis * 1.1) see.push(entry(k, k.sz > 15 ? 'whale carcass' : 'carcass', { size: r1(k.sz), remaining: Math.round(k.en) })); else smellOf(k, 'carrion', 1 + k.sz * 0.4, k.sz > 15 ? 300 : 110); }
      OC.REEFS.forEach(function (rf) { var cw = rf.cleaner; if (dist3(f, cw) < vis) see.push(entry({ id: 'cleaner-' + rf.id, x: cw.x, z: cw.z, d: cw.d }, 'cleaner wrasse station', {})); });
      OC.CAVES.forEach(function (cv) { if (dist3(f, cv) < Math.min(vis, 30)) see.push(entry(cv, 'cave entrance', { id: cv.id })); });
      var pls = OC.plantsNear(f.x, f.z, f.d, Math.min(vis, 16)); pls.sort(function (a, b) { return dist3(f, a) - dist3(f, b); }); pls.slice(0, 6).forEach(function (pl) { see.push(entry(pl, 'plant', { type: pl.type })); });
    }
    see.sort(function (a, b) { return a.dist - b.dist; }); if (see.length > 30) see.length = 30;
    var events = []; for (i = 0; i < f.ev.length; i++) { var e = f.ev[i]; if (e.t >= f.lastMeTick || f.ev.length - i <= 3) events.push(e.c > 1 ? e.txt + ' (×' + e.c + (e.n ? ', total ' + Math.round(e.n) : '') + ')' : e.txt); }
    var fl = floorAt(f.x, f.z), alive = g.fish.filter(function (x) { return x.alive; }).length;
    var out = {
      status: g.status, gen: g.gen, tick: g.tick, t: Math.round(tSec(g)), timeLeft: Math.max(0, Math.round((C.MAX_TICKS - g.tick) * DT)),
      light: { phase: OC.phaseName(tSec(g)), here: Math.round(OC.lightAt(tSec(g), f.d) * 100) / 100, visionRange: Math.round(vis) },
      you: { id: f.id, name: f.n, alive: f.alive, x: r1(f.x), z: r1(f.z), depth: r1(f.d), floorBelow: r1(fl), heading: Math.round(f.h), pitch: Math.round(f.p), speed: r1(f.spd),
        hp: Math.round(f.hp), hpMax: hpMax(f.sz), energy: Math.round(f.en), energyMax: enMax(f.sz), stamina: Math.round(f.st), size: Math.round(f.sz * 100) / 100, bleeding: f.bleed > 0, poisoned: f.poison > 0, inked: f.ink > 0, held: f.held > 0, hidden: !!f.hid,
        temp: OC.tempAt(f.x, f.z, f.d), current: { x: r1(cur.x), z: r1(cur.z), vertical: r1(cur.d) }, zone: zonesOf(g, f), color: f.color, kills: f.kills, animalsEaten: f.npcKills, eaten: Math.round(f.ate),
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

  // ── Boj / hrana ──────────────────────────────────────────────────────────
  function kill(g, f, cause, killer) {
    f.alive = false; f.died = g.tick; f.cause = cause; f.spd = 0; f.hid = false;
    g.carrion.push({ id: 'k' + (g.nextK++), x: f.x, z: f.z, d: f.d, sz: f.sz, en: 30 * f.sz, age: 0, of: f.id });
    if (killer && killer.n) killer.kills++;
    addFeed(g, f.n + ' ' + cause);
  }
  var CAUSES = { bite: function (by) { return 'was eaten by ' + by.n; }, npc: function (by) { return 'was killed by a ' + by.sp; }, starve: 'starved', bird: 'was snatched from the surface', heat: 'was boiled at a vent', jelly: 'was stung to death', poison: 'died of poison', venom: 'died of venom', deadzone: 'suffocated in stagnant water', sting: 'died of a sting', spines: 'bled out on spines', anemone: 'was stung to death by an anemone' };
  function hurt(g, f, dmg, cause, key, txt, by) {
    if (!f.alive) return; f.hp -= dmg; f.hid = false; f.bleed = Math.max(f.bleed, (cause === 'bite' || cause === 'npc') ? 80 : 20);
    ev(f, key, txt, -dmg);
    if (f.hp <= 0) { f.hp = 0; var c = CAUSES[cause]; kill(g, f, typeof c === 'function' ? c(by) : (c || 'died'), by && by.n ? by : null); }
  }
  function findTarget(g, id) {
    var i; if (!id) return null;
    for (i = 0; i < g.fish.length; i++) if (g.fish[i].id === id && g.fish[i].alive) return { kind: 'fish', o: g.fish[i] };
    for (i = 0; i < g.npcs.length; i++) if (g.npcs[i].id === id && g.npcs[i].alive) return { kind: 'npc', o: g.npcs[i] };
    for (i = 0; i < g.plankton.length; i++) if (g.plankton[i].id === id) return { kind: 'plankton', o: g.plankton[i] };
    for (i = 0; i < g.carrion.length; i++) if (g.carrion[i].id === id) return { kind: 'carrion', o: g.carrion[i] };
    for (i = 0; i < g.blooms.length; i++) if (g.blooms[i].id === id) return { kind: 'bloom', o: g.blooms[i] };
    for (i = 0; i < OC.CAVES.length; i++) if (OC.CAVES[i].id === id) return { kind: 'place', o: OC.CAVES[i] };
    for (i = 0; i < OC.REEFS.length; i++) if ('cleaner-' + OC.REEFS[i].id === id) { var cw = OC.REEFS[i].cleaner; return { kind: 'place', o: { id: id, x: cw.x, z: cw.z, d: cw.d } }; }
    for (i = 0; i < OC.PLANTS.length; i++) if (OC.PLANTS[i].id === id) return { kind: 'plant', o: OC.PLANTS[i] };
    return null;
  }
  function gain(g, f, e, key, txt) { f.en = Math.min(enMax(f.sz), f.en + e); f.ate += e; var ns = Math.min(C.MAX_SIZE, f.sz + e * C.GROWTH); if (Math.floor(ns * 10) > Math.floor(f.sz * 10)) ev(f, 'grow', 'you grew: size ' + (Math.round(ns * 100) / 100)); f.sz = ns; ev(f, key, txt, e); }
  function inFront(f, t, half) { return Math.abs(relAngle(bearing(f.x, f.z, t.x, t.z), f.h)) <= half; }
  function npcDie(g, a, by) { var sp = SP[a.sp]; a.alive = false; a.rt = g.famine ? 0 : (sp.respawn || 0); g.carrion.push({ id: 'k' + (g.nextK++), x: a.x, z: a.z, d: a.d, sz: sp.size, en: 30 * sp.size, age: 0, of: a.id }); if (by && by.n) { by.npcKills++; } addFeed(g, (by && by.n ? by.n + ' killed a ' : 'a ') + a.sp + (by && by.n ? '' : ' died')); }
  function applyDefense(g, f, a, sp) { // vrne true, če obramba prepreči hranjenje
    var d = sp.defense; if (!d) return false; var mh = (sp.food && sp.food.minHunter) || 0;
    switch (d.type) {
      case 'poison': if (f.sz >= mh) return false; f.poison = Math.max(f.poison, 40); ev(f, 'poison:' + a.sp, 'the ' + a.sp + ' is toxic; you feel sick'); return true;
      case 'venom': if (f.sz >= mh) return false; f.poison = Math.max(f.poison, 60); hurt(g, f, d.dmg * 0.4, 'venom', 'venom:' + a.sp, 'the ' + a.sp + ' struck you with venom'); return true;
      case 'spines': if (f.sz >= mh) return false; hurt(g, f, d.dmg, 'spines', 'spines:' + a.sp, 'the ' + a.sp + ' has sharp spines: -' + d.dmg + ' hp'); return true;
      case 'shell': if (f.sz >= mh && sp.food && sp.food.e > 0) return false; ev(f, 'shell:' + a.sp, 'your teeth slide off the ' + a.sp + '\'s shell'); return true;
      case 'ink': if (rnd(g) < 0.5) { f.ink = 40; ev(f, 'ink', 'the ' + a.sp + ' squirted ink in your face and slipped away'); a.h = norm360(a.h + 180); a.tm = 20; return true; } return false;
      case 'pinch': hurt(g, f, d.dmg, 'bite', 'pinch', 'the ' + a.sp + ' pinched you: -' + d.dmg + ' hp'); return false;
      case 'bite': hurt(g, f, d.dmg, 'npc', 'npcbite:' + a.sp, 'the ' + a.sp + ' bit back: -' + d.dmg + ' hp', a); return true;
      case 'sting': return false;
    }
    return false;
  }
  function tryBite(g, f, tgt) {
    if (f.cool > 0 || !tgt) return false;
    var o = tgt.o, r = reach(f.sz) + (f.lunge > 0 ? 2.5 : 0), dd = dist3(f, o), mul = f.lunge > 0 ? 1.5 : 1, dmg;
    var rr = tgt.kind === 'npc' && SP[o.sp].kind === 'school' ? r + 6 : tgt.kind === 'plankton' ? r + o.r : tgt.kind === 'carrion' ? r + 2 + (o.sz > 15 ? 6 : 0) : r;
    if (dd > rr || !inFront(f, o, tgt.kind === 'fish' ? 70 : 110)) return false;
    if (tgt.kind === 'fish') {
      f.cool = C.BITE_CD; f.bites++; f.hid = false;
      if (f.sz >= o.sz * C.SWALLOW_RATIO) { kill(g, o, 'was swallowed whole by ' + f.n, f); o.hp = 0; ev(o, 'swal', 'you were swallowed whole by ' + f.n + ' (size ' + r1(f.sz) + ')'); gain(g, f, 35 * o.sz, 'eatfish', 'you swallowed ' + o.n + ' whole'); return true; }
      var behind = Math.abs(relAngle(bearing(o.x, o.z, f.x, f.z), o.h)) > 130;
      dmg = Math.round(biteDmg(f.sz) * mul * (behind ? 1.7 : 1) * (o.sz > f.sz * 1.3 && !behind ? 0.6 : 1));
      hurt(g, o, dmg, 'bite', 'bit:' + f.id, 'bitten by ' + f.n + ' (size ' + r1(f.sz) + ') from ' + (behind ? 'behind' : 'the ' + (relAngle(bearing(o.x, o.z, f.x, f.z), o.h) < 0 ? 'left' : 'right')) + ': -' + dmg + ' hp', f);
      ev(f, 'bite:' + o.id, 'you bit ' + o.n + ': -' + dmg + ' hp' + (o.alive ? ' (it has ~' + Math.round(o.hp / hpMax(o.sz) * 100) + '% left, size ' + r1(o.sz) + ')' : ''), dmg);
      if (!o.alive) gain(g, f, 20 * o.sz, 'eatfish', 'you killed ' + o.n + ' and fed on it');
      return true;
    }
    if (tgt.kind === 'npc') {
      var sp = SP[o.sp], fd = sp.food; f.cool = C.BITE_CD; f.bites++; f.hid = false;
      if (sp.kind === 'school') { var pc = fd.catchP * (fd.bigPenalty && f.sz > fd.bigPenalty ? 0.5 : 1); if (fd.minHunter && f.sz < fd.minHunter) { ev(f, 'toofast:' + o.sp, 'the ' + o.sp + ' are too fast for you'); o.tm = 30; return true; } if (fd.maxHunter && f.sz > fd.maxHunter) { ev(f, 'toosmall:' + o.sp, 'the ' + o.sp + ' slip through your jaws; too small to bother'); return true; } if (sp.defense && sp.defense.type === 'ink' && rnd(g) < 0.3) { f.ink = 30; ev(f, 'ink', 'the squid inked the water'); } if (rnd(g) < pc) { var mouth = Math.min(3, 0.7 + 0.3 * f.sz); o.n -= Math.max(1, Math.round(mouth)); gain(g, f, fd.e * mouth, 'eat:' + o.sp, 'you caught ' + (mouth >= 1.5 ? 'several ' : 'a ') + o.sp); } else ev(f, 'miss:' + o.sp, 'the ' + o.sp + ' scattered; missed'); o.tm = 30; o.st = 'flee'; return true; }
      var small = sp.size * C.SWALLOW_RATIO <= f.sz || ['static', 'wander', 'drift'].indexOf(sp.kind) >= 0 && sp.size < 1.0;
      if (small || (fd && fd.e > 0 && f.sz >= (fd.minHunter || 0) && sp.kind !== 'shark' && sp.kind !== 'pack' && sp.kind !== 'hunter' && sp.size * 1.2 <= f.sz)) {
        if (fd && fd.minHunter && f.sz < fd.minHunter && !(sp.defense && ['poison', 'venom', 'spines', 'shell'].indexOf(sp.defense.type) >= 0)) { ev(f, 'cant:' + o.sp, 'you cannot handle a ' + o.sp + ' at your size'); return true; }
        if (applyDefense(g, f, o, sp)) return true;
        if (!fd || !fd.e) { ev(f, 'inedible:' + o.sp, 'the ' + o.sp + ' is not food'); return true; }
        if (rnd(g) >= (fd.catchP || 1)) { ev(f, 'miss:' + o.sp, 'the ' + o.sp + ' got away'); o.st = 'flee'; o.tm = 24; return true; }
        o.alive = false; o.rt = g.famine ? 0 : (sp.respawn || 0); f.npcKills++; gain(g, f, fd.e, 'eat:' + o.sp, 'you ate a ' + o.sp); return true;
      }
      // velika žival: boj
      if (applyDefense(g, f, o, sp) && sp.defense.type !== 'bite') return true;
      dmg = Math.round(biteDmg(f.sz) * mul); o.hp -= dmg; o.bleed = 60;
      ev(f, 'fight:' + o.sp, 'you bit the ' + o.sp + ': -' + dmg + ' (it has ~' + Math.max(0, Math.round(o.hp / (sp.hp || hpMax(sp.size)) * 100)) + '% left)', dmg);
      if (o.hp <= 0) { npcDie(g, o, f); gain(g, f, 20 * sp.size, 'eat:' + o.sp, 'you killed a ' + o.sp + ' and fed on it'); return true; }
      if (sp.prey) { o.st = 'hunt'; o.tg = f.id; o.sat = 0; var back = Math.round(sp.prey.dmg * 0.7); hurt(g, f, back, 'npc', 'npcbite:' + o.sp, 'the ' + o.sp + ' bit back: -' + back + ' hp', o); }
      else { o.st = 'flee'; o.tm = 40; }
      return true;
    }
    if (tgt.kind === 'plankton') { if (f.sz > 2.5) { ev(f, 'plank', 'you cannot filter plankton with a mouth this size'); f.cool = C.BITE_CD; return true; } if (o.amt < 1) return false; f.cool = 2; var e = Math.min(o.amt, 1.2); o.amt -= e; gain(g, f, e, 'plank', 'filter-feeding on plankton'); return true; }
    if (tgt.kind === 'carrion') { f.cool = 2; var ce = Math.min(o.en, o.sz > 15 ? 2.5 : 1.5); o.en -= ce; gain(g, f, ce, 'carr', 'you fed on a carcass'); return true; }
    if (tgt.kind === 'bloom') { if (f.sz > 1.5) { ev(f, 'jellybite', 'jellyfish are not worth the stings'); f.cool = C.BITE_CD; return true; } f.cool = 4; gain(g, f, 1.0, 'jellyeat', 'nibbling jellyfish'); return true; }
    if (tgt.kind === 'plant') { if (o.type === 'algae-rock' && f.sz <= 2.0) { f.cool = 4; gain(g, f, 0.8, 'graze', 'grazing algae'); return true; } if (o.type === 'anemone') { hurt(g, f, 4, 'anemone', 'anem', 'the anemone stung your mouth'); f.cool = C.BITE_CD; return true; } ev(f, 'plant', 'that is not food'); f.cool = C.BITE_CD; return true; }
    return false;
  }
  function nearestFood(g, f, rng) {
    var best = null, bd = 1e9, i, dd;
    function cons(kind, o, extra) { dd = dist3(f, o) - (extra || 0); if (dd < bd) { bd = dd; best = { kind: kind, o: o }; } }
    for (i = 0; i < g.npcs.length; i++) { var a = g.npcs[i]; if (!a.alive) continue; var sp = SP[a.sp]; if (!sp.food || !sp.food.e) continue; if (sp.defense && ['poison', 'venom', 'sting'].indexOf(sp.defense.type) >= 0) continue; if (sp.food.minHunter && f.sz < sp.food.minHunter) continue; if (sp.food.maxHunter && f.sz > sp.food.maxHunter) continue; if (sp.kind === 'school') { if (a.n > 0) cons('npc', a, 6); } else if (sp.size * 1.2 <= f.sz || sp.size < 0.5) cons('npc', a, 0); }
    for (i = 0; i < g.plankton.length; i++) if (g.plankton[i].amt >= 1 && f.sz <= 2.5) cons('plankton', g.plankton[i], g.plankton[i].r);
    for (i = 0; i < g.carrion.length; i++) cons('carrion', g.carrion[i], 2);
    return bd < (rng || 14) ? best : null;
  }

  // ── Riba ─────────────────────────────────────────────────────────────────
  function stepFish(g, f) {
    var cmd = f.cmd, i;
    f.inJelly = false; for (i = 0; i < g.blooms.length; i++) { var j = g.blooms[i]; if (Math.abs(f.d - j.d) < 15 && OC.dist2(f.x, f.z, j.x, j.z) < j.r * j.r) f.inJelly = true; }
    var idleT = (g.tick - f.lastCmdTick) * DT; f.idleWarn = idleT > C.IDLE_SEC * 0.6 ? Math.round(idleT) : 0;
    if (idleT > C.IDLE_SEC) { kill(g, f, 'went limp (no command for ' + C.IDLE_SEC + ' s)'); return; }
    if (g.tick > cmd.until && cmd.act !== 'hide') { if (cmd.speed !== 'rest' || cmd.act !== 'swim') ev(f, 'expired', 'your command expired; drifting'); cmd.act = 'swim'; cmd.speed = 'rest'; cmd.goto = null; cmd.target = null; }
    var wantH = cmd.h, wantP = cmd.p, speedMode = cmd.speed, tgt = null;
    if (cmd.act === 'feed') { tgt = cmd.target ? findTarget(g, cmd.target) : nearestFood(g, f, 35); if (tgt && (tgt.kind === 'fish' || tgt.kind === 'place')) tgt = null; if (tgt && dist3(f, tgt.o) > 1.5) { wantH = bearing(f.x, f.z, tgt.o.x, tgt.o.z); wantP = clamp(Math.atan2(tgt.o.d - f.d, Math.max(distH(f, tgt.o), 0.5)) * R2D, -75, 75); } }
    if (cmd.act === 'hunt' || cmd.act === 'flee') {
      tgt = findTarget(g, cmd.target);
      var detect = tgt && (tgt.kind === 'fish' || tgt.kind === 'npc' ? canSee(g, f, tgt.o) >= 0 || dist3(f, tgt.o) < 12 : dist3(f, tgt.o) < 120);
      if (!tgt || !detect) { ev(f, 'lost', 'target ' + cmd.target + ' lost; swimming on'); cmd.act = 'swim'; cmd.target = null; tgt = null; }
      else { var b = bearing(f.x, f.z, tgt.o.x, tgt.o.z), dh = distH(f, tgt.o); wantP = clamp(Math.atan2(tgt.o.d - f.d, Math.max(dh, 0.5)) * R2D, -75, 75); if (cmd.act === 'flee') { wantH = norm360(b + 180); wantP = -wantP * 0.5; } else { wantH = b; if (speedMode === 'rest') speedMode = 'cruise'; if (tgt.kind === 'place') { if (dist3(f, tgt.o) < 2.5) { speedMode = 'rest'; } } } }
    } else if (cmd.goto) {
      var gd = distH(f, cmd.goto), gdd = cmd.goto.d !== null ? cmd.goto.d - f.d : 0;
      if (gd < 2.5 && Math.abs(gdd) < 2.5) { ev(f, 'arrived', 'arrived at goto'); cmd.goto = null; if (cmd.act === 'swim') cmd.speed = 'rest'; speedMode = 'rest'; }
      else { wantH = bearing(f.x, f.z, cmd.goto.x, cmd.goto.z); wantP = clamp(Math.atan2(gdd, Math.max(gd, 0.5)) * R2D, -75, 75); if (gd < 2.5) wantH = f.h; }
    }
    if (cmd.act === 'hide') speedMode = 'rest';
    if (cmd.act === 'feed' && speedMode === 'rest') speedMode = 'slow';
    if (f.held > 0) { speedMode = 'rest'; f.held--; }
    var tr = turnRate(f.sz) * DT; f.h = turnToward(f.h, wantH, tr); f.p = turnToward(f.p, wantP, tr); if (f.p > 180) f.p -= 360;
    var cold = f.d > OC.THERMO, mul = SPEEDS[speedMode] || 0, base = cruiseSpeed(f.sz);
    if (speedMode === 'sprint') { if (f.st > 0) f.st = Math.max(0, f.st - 25 * DT); else mul = SPEEDS.fast; }
    else if (!OC.inDeadzone(f.x, f.z, f.d)) f.st = Math.min(100, f.st + (speedMode === 'fast' ? 2 : 8) * DT * (cold ? 0.7 : 1));
    var spd = base * mul * (cold ? 0.88 : 1);
    var kelp = OC.kelpAt(f.x, f.z, f.d); if (kelp) spd *= f.sz > 4 ? 0.5 : 0.75;
    if (OC.mangroveAt(f.x, f.z, f.d)) spd *= f.sz > 1.5 ? 0.4 : 0.8;
    if (f.inJelly) spd *= 0.85; if (f.held > 0) spd = 0;
    if (f.lunge > 0) { spd = Math.max(spd, base * 3.2); f.lunge--; }
    f.spd = spd;
    var cur = OC.currentAt(f.x, f.z, f.d), hr = f.h * D2R, pr = f.p * D2R;
    var vx = Math.sin(hr) * Math.cos(pr) * spd + cur.x, vz = -Math.cos(hr) * Math.cos(pr) * spd + cur.z, vd = Math.sin(pr) * spd + cur.d;
    var nx = clamp(f.x + vx * DT, 1, OC.W - 1), nz = clamp(f.z + vz * DT, 1, OC.L - 1), nd = f.d + vd * DT;
    var cv = OC.caveAt(nx, nz, nd);
    if (cv && f.sz > cv.maxSize && OC.caveAt(f.x, f.z, f.d) !== cv) { ev(f, 'cavesmall', 'the entrance of ' + cv.id + ' is too narrow for you (size ' + r1(f.sz) + ')'); nx = f.x; nz = f.z; nd = f.d; cv = null; }
    if (cv && cv !== f.cave) f.cave = cv; if (!cv) f.cave = null;
    var nfl = floorAt(nx, nz);
    if (!cv && nd > nfl - 0.6) { nd = nfl - 0.6; if (f.p > 0) f.p = 0; }
    if (nd < 0.4) { nd = 0.4; if (f.p < 0) f.p = 0; } if (nd > OC.DMAX - 0.5) nd = OC.DMAX - 0.5;
    f.x = nx; f.z = nz; f.d = nd;
    if (f.cool > 0) f.cool--;
    var hi = hideInfo(f);
    f.hid = cmd.act === 'hide' && f.spd < 0.5 && hi.ok;
    if (cmd.act === 'hide' && f.spd < 0.5 && hi.src && !hi.ok) ev(f, 'nohide', 'you cannot fit into the ' + hi.src + ' at your size');
    // energija
    var drain = 0.055 * Math.pow(f.sz, 1.1) * (speedMode === 'rest' ? 1 : speedMode === 'slow' ? 1.3 : speedMode === 'cruise' ? 1.8 : speedMode === 'fast' ? 3 : 6) * DT;
    if (cold) drain *= 0.65; var vn = OC.ventAt(f.x, f.z, f.d); if (vn.dist < 14) drain *= 0.5;
    f.en -= drain; if (f.en <= 0) { f.en = 0; hurt(g, f, 2 * DT, 'starve', 'starve', 'you are starving: losing hp'); }
    // okolje
    if (vn.dist < 4) hurt(g, f, 4 * DT, 'heat', 'heat', 'the water here is scalding: losing hp');
    if (OC.inDeadzone(f.x, f.z, f.d)) hurt(g, f, 0.5 * DT, 'deadzone', 'dead', 'it is hard to breathe here: losing hp');
    if (f.inJelly && f.sz > 1.5) hurt(g, f, 1.5 * DT, 'jelly', 'jelly', 'stung by jellyfish: losing hp');
    if (hi.src === 'anemone' && !hi.ok) hurt(g, f, 1.0 * DT, 'anemone', 'anem', 'the anemone is stinging you');
    if (f.d < OC.SURFACE_ZONE && f.sz < 3 && isDay(g) && !hi.birdSafe && rnd(g) < 0.012) hurt(g, f, 25, 'bird', 'bird', 'something struck you from above: -25 hp');
    if (f.poison > 0) { f.poison--; hurt(g, f, 0.6, 'poison', 'poison', 'you feel sick: losing hp'); }
    if (f.bleed > 0) f.bleed--; if (f.ink > 0) f.ink--;
    if (!f.alive) return;
    OC.REEFS.forEach(function (rf) { var cw = rf.cleaner; if (f.spd < 0.5 && dist3(f, cw) < 4 && f.hp < hpMax(f.sz)) { f.hp = Math.min(hpMax(f.sz), f.hp + 1.5 * DT); f.bleed = 0; f.poison = 0; ev(f, 'clean', 'cleaner wrasses are picking at your wounds: hp ' + Math.round(f.hp), 1.5 * DT); } });
    if (cmd.act === 'hunt' && tgt && tgt.kind !== 'place') tryBite(g, f, tgt);
    else if (cmd.act === 'feed') { if (!tgt || !tryBite(g, f, tgt)) { var nf = nearestFood(g, f); if (nf) tryBite(g, f, nf); } }
    else if (f.lunge > 0 || (cmd.act === 'swim' && cmd.target)) { var lt = findTarget(g, cmd.target); if (lt) tryBite(g, f, lt); }
    if (cmd.act === 'feed' && f.cool <= 0) {
      if ((OC.reefAt(f.x, f.z, f.d) || OC.seagrassAt(f.x, f.z, f.d) || OC.mangroveAt(f.x, f.z, f.d)) && f.sz <= 1.5) { f.cool = 4; gain(g, f, 0.6, 'snail', 'you are picking snails and worms off the bottom'); }
      else if (vn.dist < 10 && vn.dist > 4) { f.cool = 4; gain(g, f, 0.9, 'mat', 'you are grazing the bacterial mat'); }
    }
  }

  // ── NPC ──────────────────────────────────────────────────────────────────
  function moveNpc(g, a, sp, wantH, spd, wantD, opts) {
    opts = opts || {}; a.h = turnToward(a.h, wantH, (opts.turn || 90) * DT); var hr = a.h * D2R;
    var nx = clamp(a.x + Math.sin(hr) * spd * DT, 2, OC.W - 2), nz = clamp(a.z - Math.cos(hr) * spd * DT, 2, OC.L - 2), fl = floorAt(nx, nz);
    if (sp.kind === 'shark') { var minFl = sp.shallowOK || 20, fl0 = floorAt(a.x, a.z), bad = (fl < minFl && fl < fl0 + 0.05) || (OC.kelpAt(nx, nz, a.d) && !OC.kelpAt(a.x, a.z, a.d)) || (sp.size > 3 && OC.reefAt(nx, nz, a.d) && fl < 18 && !OC.reefAt(a.x, a.z, a.d)); if (bad) { a.h = norm360(a.h + 120); a.tm = 8; return; } }
    a.x = nx; a.z = nz; a.spd = spd;
    if (wantD !== undefined) a.d += clamp(wantD - a.d, -spd * DT * 0.8, spd * DT * 0.8);
    a.d = clamp(a.d, sp.habitat && sp.habitat.zone === 'surface' ? 0.5 : 1, floorAt(a.x, a.z) - (sp.kind === 'static' || opts.onBottom ? 0.4 : 1.2));
  }
  function detectPrey(g, a, sp, candidates) { // candidates: ribe (in za orke tudi NPC)
    var pr = sp.prey, best = null, bd = 1e9, i, ph = OC.phaseName(tSec(g)), twilight = ph === 'dusk' || ph === 'dawn', act = twilight ? 1.25 : pr.active === 'any' ? 1 : (pr.active === 'night' ? (isNight(g) ? 1 : 0.45) : (isDay(g) ? 1 : 0.45));
    for (i = 0; i < candidates.length; i++) {
      var f = candidates[i], fsz = f.sz || SP[f.sp].size; if (!f.alive) continue;
      if (f.sp && !(pr.huntsSharks && SP[f.sp].kind === 'shark') && !(pr.huntsNpc && pr.huntsNpc.indexOf(f.sp) >= 0)) continue;
      if (fsz > pr.max && !pr.aggressive) continue; if (pr.minPrey && fsz < pr.minPrey) continue; if (pr.ignoreAbove && fsz >= pr.ignoreAbove) continue; if (pr.timid && fsz >= pr.timid) continue;
      var dd = dist3(a, f), rng = pr.range * act * ((pr.prefer && f.sp && pr.prefer.indexOf(f.sp) >= 0) ? 3.5 : 1), det = false;
      var hi = hideInfo(f);
      if (pr.detect.indexOf('vision') >= 0 && dd < rng * visMul(g, f, a, pr.detect)) det = true;
      if (!det && pr.detect.indexOf('lateral') >= 0 && f.spd > 0.8 && dd < 25 && !hi.solid) det = true;
      if (!det && pr.detect.indexOf('smell') >= 0 && f.bleed > 0 && dd < (pr.smell || 100)) det = true;
      if (!det && pr.detect.indexOf('echo') >= 0 && dd < rng && !hi.solid) det = true;
      if (!det && pr.detect.indexOf('electro') >= 0 && dd < (pr.electro || 16) && !hi.solid) det = true;
      if (det && hi.solid && !(pr.detect.indexOf('vision') >= 0 && hideInfo(a).src === hi.src)) det = false;
      if (det && a.ban && a.ban.id === f.id && a.ban.until > g.tick) det = false;
      var ed = (pr.prefer && f.sp && pr.prefer.indexOf(f.sp) >= 0) ? dd * 0.01 : dd;
      if (det && ed < bd) { bd = ed; best = f; }
    }
    return best;
  }
  function npcAttack(g, a, sp, f) {
    var pr = sp.prey, fsz = f.sz || SP[f.sp].size;
    if (f.sp) { // NPC proti NPC (orke)
      var dmg = pr.dmg * 2; f.hp -= dmg; f.bleed = 80; if (f.hp <= 0) { npcDie(g, f, a); addFeed(g, 'the ' + a.sp + 's killed the ' + f.sp); a.sat = pr.satiety; a.st = 'rest'; a.tg = null; } return;
    }
    if (fsz <= (pr.swallow || 0)) { kill(g, f, 'was swallowed by a ' + a.sp); f.hp = 0; ev(f, 'npcswal', 'a ' + a.sp + ' swallowed you'); a.sat = pr.satiety; a.st = sp.kind === 'shark' ? 'rest' : 'idle'; a.tg = null; if (a.pk) g.npcs.forEach(function (o) { if (o.pk === a.pk) { o.sat = pr.satiety * 0.6; o.st = 'rest'; o.tg = null; } }); return; }
    hurt(g, f, pr.dmg, 'npc', 'npcbite:' + a.sp, 'a ' + a.sp + ' bit you: -' + pr.dmg + ' hp', a);
    if (!f.alive) { a.sat = pr.satiety; a.st = sp.kind === 'shark' ? 'rest' : 'idle'; a.tg = null; }
    else if (pr.hold) { f.held = pr.hold; ev(f, 'held', 'the ' + a.sp + ' is holding you'); }
    a.cool = 8;
  }
  function stepSchool(g, a, sp) {
    if (a.n <= 0) { if (!g.famine && rnd(g) < 0.002) a.n = Math.round(sp.n * 0.3); return; }
    var threat = null, td = 1e9, i;
    for (i = 0; i < g.fish.length; i++) { var f = g.fish[i]; if (!f.alive || f.spd < 0.3) continue; var dd = dist3(a, f); if (dd < 16 && dd < td) { td = dd; threat = f; } }
    var spd = sp.speed, want;
    if (threat) { want = norm360(bearing(a.x, a.z, threat.x, threat.z) + 180 + (rnd(g) - 0.5) * 60); spd = sp.flee; a.tm = 24; }
    else if (a.tm > 0) { a.tm--; want = a.h; spd = sp.flee * 0.8; }
    else want = distH(a, { x: a.hx, z: a.hz }) > 60 ? bearing(a.x, a.z, a.hx, a.hz) : norm360(a.h + (rnd(g) - 0.5) * 40);
    var wd = sp.dayD !== undefined ? (isNight(g) ? sp.nightD : sp.dayD) : a.hd; if (sp.habitat.zone === 'mangrove') wd = 2;
    if (sp.gather && OC.phaseName(tSec(g)) === sp.gather.phase && !threat && a.tm <= 0) { var gd = distH(a, sp.gather); if (gd > 15) { want = bearing(a.x, a.z, sp.gather.x, sp.gather.z); spd = sp.speed * 1.4; } else { want = norm360(a.h + 25); spd = sp.speed * 0.5; } wd = sp.gather.d; if (!g.gatherTold && gd < 40) { g.gatherTold = g.tick; addFeed(g, sp.gather.note); } }
    if (sp.gather && g.gatherTold && g.tick - g.gatherTold > 2000) g.gatherTold = 0;
    moveNpc(g, a, sp, want, spd, wd + (rnd(g) - 0.5) * 0.4, { turn: 120 });
    if (!g.famine && isNight(g) && a.n < sp.n && rnd(g) < 0.05) a.n++;
  }
  function stepWander(g, a, sp) {
    var i, threat = null, td = 1e9;
    if (sp.flee) for (i = 0; i < g.fish.length; i++) { var f = g.fish[i]; if (!f.alive || f.sz < sp.size * 0.8 || f.spd < 0.3) continue; var dd = dist3(a, f); if (dd < 10 && dd < td) { td = dd; threat = f; } }
    var night = isNight(g); var asleep = (sp.sleepsNight && night) || (sp.nocturnal && !night);
    if (sp.breathes) { if (a.breath === undefined) a.breath = Math.floor(rnd(g) * 600); a.breath++; if (a.breath > 900) { a.st = 'surfacing'; moveNpc(g, a, sp, a.h + 2, sp.speed, 0.6, { turn: 40 }); if (a.d < 1.5) a.breath = 0; return; } }
    if (sp.eatsJellies) { var bl = g.blooms[0], bdd = 1e9; g.blooms.forEach(function (b) { var q = dist3(a, b); if (q < bdd) { bdd = q; bl = b; } }); if (bdd > 10) { moveNpc(g, a, sp, bearing(a.x, a.z, bl.x, bl.z), sp.speed, bl.d); return; } if (bl.n > 5 && rnd(g) < 0.01) bl.n--; a.spd = 0.2; return; }
    if (threat && !asleep) { a.st = 'flee'; a.tm = 20; moveNpc(g, a, sp, norm360(bearing(a.x, a.z, threat.x, threat.z) + 180), sp.flee, a.d, { turn: 160 }); return; }
    if (a.st === 'flee' && a.tm > 0) { a.tm--; moveNpc(g, a, sp, a.h, sp.flee * 0.8, a.d); return; }
    a.st = 'idle';
    if (asleep || (sp.buried && rnd(g) < 0.97)) { a.spd = 0; return; }
    var far = distH(a, { x: a.hx, z: a.hz }) > 30, want = far ? bearing(a.x, a.z, a.hx, a.hz) : norm360(a.h + (rnd(g) - 0.5) * 50);
    var onB = sp.habitat.zone === 'bottom' || sp.habitat.zone === 'reef' || sp.habitat.zone === 'seagrass' || sp.buried;
    moveNpc(g, a, sp, want, sp.speed * (0.5 + rnd(g) * 0.5), onB ? floorAt(a.x, a.z) - 0.4 : a.hd, { onBottom: onB });
  }
  function stepAmbush(g, a, sp) {
    if (a.cool > 0) a.cool--; if (a.sat > 0) { a.sat--; a.spd = 0; if (distH(a, { x: a.hx, z: a.hz }) > 2) moveNpc(g, a, sp, bearing(a.x, a.z, a.hx, a.hz), sp.speed, a.hd); return; }
    var prey = detectPrey(g, a, sp, g.fish);
    if (prey && dist3(a, prey) < sp.prey.range) {
      a.st = 'hunt'; a.tg = prey.id; var dd = dist3(a, prey);
      if (dd < reach(sp.size) + 0.5 && a.cool <= 0) npcAttack(g, a, sp, prey); else if (distH(a, { x: a.hx, z: a.hz }) < sp.prey.range * 1.2) moveNpc(g, a, sp, bearing(a.x, a.z, prey.x, prey.z), sp.sprint || sp.speed * 2.5, prey.d, { turn: 200 });
      return;
    }
    a.st = 'idle'; a.tg = null; a.spd = 0;
    if (distH(a, { x: a.hx, z: a.hz }) > 2) moveNpc(g, a, sp, bearing(a.x, a.z, a.hx, a.hz), sp.speed, a.hd);
  }
  function stepHunter(g, a, sp) {
    if (a.cool > 0) a.cool--; if (a.sat > 0) { a.sat--; }
    var prey = a.sat > 0 ? null : detectPrey(g, a, sp, g.fish);
    if (!prey && a.sat <= 0) { // jate kot hrana (vizualno: lovi jate)
      var bs = null, bd = 1e9; for (var i = 0; i < g.npcs.length; i++) { var o = g.npcs[i]; if (o.alive && SP[o.sp].kind === 'school' && o.n > 0 && SP[o.sp].size < sp.size * 0.5) { var q = dist3(a, o); if (q < 60 && q < bd) { bd = q; bs = o; } } }
      if (bs) { moveNpc(g, a, sp, bearing(a.x, a.z, bs.x, bs.z), sp.speed * 1.3, bs.d, { turn: 120 }); if (bd < 6 && rnd(g) < 0.05) { bs.n--; bs.tm = 20; if (rnd(g) < 0.2) a.sat = sp.prey.satiety * 0.3; } a.st = 'forage'; return; }
    }
    if (prey) { a.st = 'hunt'; a.tg = prey.id; var dd = dist3(a, prey); if (dd < reach(sp.size) + 0.5 && a.cool <= 0) npcAttack(g, a, sp, prey); else moveNpc(g, a, sp, bearing(a.x, a.z, prey.x, prey.z), dd < 25 ? (sp.sprint || sp.speed * 2) : sp.speed * 1.2, prey.d, { turn: 160 }); return; }
    a.st = 'patrol'; a.tg = null;
    if (!a.wpt || distH(a, a.wpt) < 6) { var p = spawnPos(g, sp, Math.floor(rnd(g) * 4)); a.wpt = { x: p.x, z: p.z, d: p.d }; }
    moveNpc(g, a, sp, bearing(a.x, a.z, a.wpt.x, a.wpt.z), sp.speed, sp.breathes && rnd(g) < 0.01 ? 1 : a.wpt.d);
  }
  function stepPack(g, a, sp) { // delfini: vodja patruljira, drugi sledijo; skupna tarča
    var leader = null, i; for (i = 0; i < g.npcs.length; i++) { var o = g.npcs[i]; if (o.pk === a.pk && o.alive) { leader = o; break; } }
    if (a.cool > 0) a.cool--; if (a.sat > 0) a.sat--;
    var shared = null; if (leader && leader.tg && leader.st === 'hunt') shared = findTarget(g, leader.tg);
    var prey = (shared && shared.o.alive) ? shared.o : (a.sat > 0 ? null : detectPrey(g, a, sp, g.fish));
    if (prey && (prey.sz || 0) <= sp.prey.max) { a.st = 'hunt'; a.tg = prey.id; var dd = dist3(a, prey); var idx = g.npcs.indexOf(a) % 3, off = (idx - 1) * 70; var tx = prey.x, tz = prey.z; if (dd > 12) { var b0 = bearing(prey.x, prey.z, a.x, a.z) + off; tx = prey.x + Math.sin(b0 * D2R) * 8; tz = prey.z - Math.cos(b0 * D2R) * 8; } if (dd < reach(sp.size) + 0.5 && a.cool <= 0) npcAttack(g, a, sp, prey); else moveNpc(g, a, sp, bearing(a.x, a.z, tx, tz), dd < 30 ? sp.sprint : sp.speed * 1.3, prey.d, { turn: 180 }); return; }
    a.st = 'patrol'; a.tg = null;
    if (a === leader) { if (!a.wpt || distH(a, a.wpt) < 8) { var p = spawnPos(g, sp, 0); a.wpt = { x: p.x, z: p.z, d: p.d }; } moveNpc(g, a, sp, bearing(a.x, a.z, a.wpt.x, a.wpt.z), sp.speed, rnd(g) < 0.02 ? 1 : a.wpt.d); }
    else if (leader) { var k = g.npcs.indexOf(a) % 5, ang = leader.h + 150 + k * 20, lx = leader.x + Math.sin(ang * D2R) * (4 + k * 2), lz = leader.z - Math.cos(ang * D2R) * (4 + k * 2); var ld = distH(a, { x: lx, z: lz }); moveNpc(g, a, sp, ld > 2 ? bearing(a.x, a.z, lx, lz) : leader.h, ld > 15 ? sp.speed * 1.6 : sp.speed, leader.d + (k - 2) * 0.8); }
  }
  function stepShark(g, a, sp) {
    var pr = sp.prey, i;
    if (a.cool > 0) a.cool--; if (a.tm > 0) a.tm--;
    if (a.sprint > 0) { a.sprint--; if (a.sprint === 0) a.tired = sp.tiredT; } else if (a.tired > 0) a.tired--;
    if (a.sat > 0) { a.sat--; a.st = 'rest'; a.tg = null; var rp = sp.rest; if (distH(a, { x: rp[0], z: rp[1] }) > 10) moveNpc(g, a, sp, bearing(a.x, a.z, rp[0], rp[1]), sp.speed * 0.6, rp[2]); else { a.spd = 0.3; moveNpc(g, a, sp, a.h + 5, 0.6, rp[2]); } return; }
    // 1) tarče: vid/elektro/eho/kri
    var cands = g.fish; if (pr.huntsSharks) { cands = g.fish.concat(g.npcs.filter(function (o) { return o.alive && (SP[o.sp].kind === 'shark' || (pr.huntsNpc && pr.huntsNpc.indexOf(o.sp) >= 0)) && o !== a && o.pk !== a.pk; })); }
    var prey = detectPrey(g, a, sp, cands);
    if (!prey && a.pk) { for (i = 0; i < g.npcs.length; i++) { var m = g.npcs[i]; if (m !== a && m.alive && m.pk === a.pk && m.st === 'hunt' && m.tg) { var t = findTarget(g, m.tg); if (t && t.o.alive && dist3(a, t.o) < 120) { prey = t.o; break; } } } }
    if (prey) {
      var dd = dist3(a, prey);
      // ritual: pred napadom morski pes kroži okoli plena (6 s), riba to čuti
      if (!prey.sp && a.circ === undefined && dd < 28 && dd > reach(sp.size) + 4 && a.sprint <= 0) { a.circ = 24; }
      if (a.circ > 0) { a.circ--; a.st = 'circle'; a.tg = prey.id; var cb = bearing(a.x, a.z, prey.x, prey.z); moveNpc(g, a, sp, cb + 75, sp.speed * 1.1, prey.d + 2, { turn: 90 }); if (a.circ % 8 === 0 && !prey.sp) ev(prey, 'circled:' + a.sp, 'a ' + a.sp + ' is circling you at ' + Math.round(dd) + ' m'); return; }
      if (a.circ === 0) a.circ = -1;
      if (a.tg === prey.id) { a.chase = (a.chase || 0) + 1; if (a.chase > 240) { a.ban = { id: prey.id, until: g.tick + 600 }; a.chase = 0; a.tg = null; a.st = 'patrol'; return; } } else a.chase = 0;
      a.st = 'hunt'; a.tg = prey.id; a.tm = 40;
      var tx = prey.x, tz = prey.z; if (a.pk && dd > 15) { var idx = g.npcs.filter(function (o) { return o.pk === a.pk; }).indexOf(a), off = (idx - 1) * 70, b0 = bearing(prey.x, prey.z, a.x, a.z) + off; tx = prey.x + Math.sin(b0 * D2R) * 10; tz = prey.z - Math.cos(b0 * D2R) * 10; }
      if (dd < 30 && a.sprint <= 0 && a.tired <= 0) a.sprint = sp.sprintT;
      var spd = a.sprint > 0 ? sp.sprint : (a.tired > 0 ? sp.speed * 0.5 : sp.speed * 1.15);
      if (dd < reach(sp.size) + 1 && a.cool <= 0) npcAttack(g, a, sp, prey); else moveNpc(g, a, sp, bearing(a.x, a.z, tx, tz), spd, prey.d, { turn: 110 });
      return;
    }
    if (a.st === 'hunt' && a.tm > 0 && a.tg) { var lt = findTarget(g, a.tg); if (lt && lt.o.alive) { moveNpc(g, a, sp, bearing(a.x, a.z, lt.o.x, lt.o.z), sp.speed, lt.o.d); return; } }
    if (a.circ !== undefined && a.tm <= 0) delete a.circ;
    // 2) vonj (mrhovina) → investigate
    if (sp.scavenge || pr.smell) {
      var bk = null, bq = 1e9; for (i = 0; i < g.carrion.length; i++) { var k = g.carrion[i]; var q = dist3(a, k); var rng = (pr.smell || 100) * (k.sz > 15 ? 2.5 : 1); if (q < rng && q < bq && floorAt(k.x, k.z) >= (sp.shallowOK || 20)) { bq = q; bk = k; } }
      if (bk) { a.st = 'scavenge'; a.tg = bk.id; if (bq < reach(sp.size) + 3) { a.spd = 0.4; bk.en -= 3; if (bk.en <= 0 || rnd(g) < 0.002) { a.sat = pr.satiety * 0.5; } return; } moveNpc(g, a, sp, bearing(a.x, a.z, bk.x, bk.z), sp.speed, bk.d); return; }
    }
    // 3) patrulja po točkah zanimanja (tiger ponoči v plitvine, podnevi počitek v globini)
    a.st = 'patrol'; a.tg = null;
    var wps = sp.waypoints, wp = wps[a.wp];
    if (pr.active === 'night' && isDay(g) && sp.rest && rnd(g) < 0.6) { wp = { x: sp.rest[0], z: sp.rest[1], d: sp.rest[2] }; var rd = distH(a, wp); if (rd < 12) { moveNpc(g, a, sp, a.h + 4, 0.8, sp.rest[2]); return; } moveNpc(g, a, sp, bearing(a.x, a.z, wp.x, wp.z), sp.speed * 0.8, wp.d); return; }
    if (distH(a, { x: wp[0], z: wp[1] }) < 10) { var nw = a.wp; while (nw === a.wp) nw = Math.floor(rnd(g) * wps.length); a.wp = nw; wp = wps[nw]; }
    moveNpc(g, a, sp, bearing(a.x, a.z, wp[0], wp[1]) + (rnd(g) - 0.5) * 10, sp.speed * (a.tired > 0 ? 0.6 : 1), wp[2] + Math.sin(g.tick * 0.01 + a.id.length) * 5);
  }
  function stepPasser(g, a, sp) {
    if (a.sp === 'whale' || a.sp === 'whale calf') return stepWhale(g, a, sp);
    var bp = null, bd = 1e9; g.plankton.forEach(function (p) { var q = dist3(a, p); if (p.amt > 20 && q < bd) { bd = q; bp = p; } });
    if (bp && bd > 6) moveNpc(g, a, sp, bearing(a.x, a.z, bp.x, bp.z), sp.speed, bp.d, { turn: 30 }); else { if (bp) bp.amt = Math.max(0, bp.amt - 0.05); moveNpc(g, a, sp, a.h + 6, sp.speed * 0.7, a.d, { turn: 30 }); }
  }
  // ── kit (grbavec) z mladičem: krožna pot, potop po kril (jarek), dih na gladini, nočna pesem, obramba pred orkami ──
  function whaleEvent(g, a, txt, key, range) { for (var i = 0; i < g.fish.length; i++) { var f = g.fish[i]; if (f.alive && dist3(f, a) < range) ev(f, key, txt); } }
  function stepWhale(g, a, sp) {
    var i, pr; if (a.wst === undefined) { a.wst = 'cruise'; a.wt = 0; a.breath = 0; a.wp = 0; a.song = 0; }
    a.wt++; a.breath++;
    if (a.sp === 'whale calf') { // mladič: sledi materi, diha, ko diha ona
      var mom = null; for (i = 0; i < g.npcs.length; i++) if (g.npcs[i].sp === 'whale' && g.npcs[i].alive) { mom = g.npcs[i]; break; }
      if (!mom) { moveNpc(g, a, sp, a.h + 3, sp.speed * 0.8, 12, { turn: 30 }); return; }
      var ang = mom.h + 150, lx = mom.x + Math.sin(ang * D2R) * 9, lz = mom.z - Math.cos(ang * D2R) * 9, ld = distH(a, { x: lx, z: lz });
      var wantD = mom.wst === 'surface' ? 0.6 : Math.min(mom.d + 2, 40);
      moveNpc(g, a, sp, ld > 3 ? bearing(a.x, a.z, lx, lz) : mom.h, ld > 25 ? sp.sprint : (ld > 6 ? mom.spd * 1.2 : mom.spd), wantD, { turn: 40 });
      a.st = mom.wst === 'feed' ? 'waits above' : mom.st; return;
    }
    // orke v bližini mladiča → mati se postavi med orke in mladiča, udari z repom
    var calf = null, orca = null, od = 1e9; for (i = 0; i < g.npcs.length; i++) { var o = g.npcs[i]; if (!o.alive) continue; if (o.sp === 'whale calf') calf = o; if (o.sp === 'orca') { var q = dist3(o, calf || a); if (q < od) { od = q; orca = o; } } }
    if (orca && od < 60) {
      a.wst = 'defend'; a.wt = 0; a.st = 'defends calf';
      var tx = calf ? (calf.x + orca.x) / 2 : orca.x, tz = calf ? (calf.z + orca.z) / 2 : orca.z, dd = dist3(a, orca);
      if (dd < reach(sp.size) + 6 && a.cool <= 0) { orca.hp -= 140; orca.bleed = 60; orca.st = 'flee'; orca.tm = 50; orca.sat = 80; a.cool = 24; addFeed(g, 'the whale slams an orca with its tail'); whaleEvent(g, a, 'a thunderous tail slap shakes the water', 'whale:slap', 200); if (orca.hp <= 0) { npcDie(g, orca, a); addFeed(g, 'the orca was killed by the whale'); } }
      else moveNpc(g, a, sp, bearing(a.x, a.z, tx, tz), sp.sprint, orca.d, { turn: 60 });
      if (a.cool > 0) a.cool--; return;
    }
    if (a.cool > 0) a.cool--;
    var night = isNight(g);
    // dih: vsakih ~110 s (po potopu prej)
    if (a.wst !== 'surface' && a.wst !== 'feed' && a.breath > 440) { a.wst = 'surface'; a.wt = 0; }
    if (a.wst === 'surface') {
      a.st = 'surfacing'; moveNpc(g, a, sp, a.h + 2, sp.speed * 0.8, 0.6, { turn: 30 });
      if (a.d < 1.5 && a.wt > 20) { a.breath = 0; a.wst = 'cruise'; a.wt = 0; a.blow = g.tick; addFeed(g, 'the whale blows at the surface'); whaleEvent(g, a, 'a whale blows at the surface nearby', 'whale:blow', 160); if (rnd(g) < 0.35) { a.breach = g.tick; addFeed(g, 'the whale breaches!'); } }
      return;
    }
    // hranjenje: potop v jarek, ko je kril blizu poti (ne ponoči, ko kril pride gor — takrat je na površju)
    if (a.wst === 'cruise' && a.breath > 40 && a.breath < 200 && rnd(g) < 0.008) { var best = null, bd = 1e9; for (i = 0; i < g.npcs.length; i++) { var k = g.npcs[i]; if (k.alive && k.sp === 'krill' && k.n > 200) { var q2 = distH(a, k); if (q2 < bd) { bd = q2; best = k; } } } if (best) { a.wst = 'feed'; a.wt = 0; a.tg = best.id; } }
    if (a.wst === 'feed') {
      var kt = findTarget(g, a.tg); a.st = 'lunge-feeding';
      if (!kt || !kt.o.alive || kt.o.n <= 50 || a.wt > 360 || a.breath > 600) { a.wst = 'surface'; a.wt = 0; a.tg = null; return; }
      var kd = dist3(a, kt.o);
      if (kd < 12) { kt.o.n = Math.max(0, kt.o.n - 6); a.lunge = g.tick; moveNpc(g, a, sp, a.h + 25, sp.speed * 0.6, kt.o.d, { turn: 60 }); }
      else moveNpc(g, a, sp, bearing(a.x, a.z, kt.o.x, kt.o.z), sp.speed, kt.o.d, { turn: 30 });
      return;
    }
    // pesem (noč): vsakih ~2.5 min, slišijo ribe do 400 m
    if (night && g.tick - a.song > 600 && rnd(g) < 0.01) { a.song = g.tick; addFeed(g, 'a whale is singing'); whaleEvent(g, a, 'a long, low whale song rolls through the water', 'whale:song', 400); }
    a.st = (night && g.tick - a.song < 120) ? 'singing' : 'cruise';
    var wps = sp.waypoints, wp = wps[a.wp % wps.length];
    if (distH(a, { x: wp[0], z: wp[1] }) < 25) { a.wp = (a.wp + 1) % wps.length; wp = wps[a.wp]; }
    var cruiseD = (wp[2] > 60) ? 30 : wp[2];
    moveNpc(g, a, sp, bearing(a.x, a.z, wp[0], wp[1]), sp.speed * (night ? 0.7 : 1), cruiseD + Math.sin(g.tick * 0.02) * 4, { turn: 18 });
  }
  function stepDrift(g, a, sp) { var cur = OC.currentAt(a.x, a.z, a.d); a.x = clamp(a.x + cur.x * DT * 0.6 + (rnd(g) - 0.5) * 0.05, 3, OC.W - 3); a.z = clamp(a.z + cur.z * DT * 0.6 + (rnd(g) - 0.5) * 0.05, 3, OC.L - 3); a.spd = 0.1; a.d = clamp(a.d, sp.habitat.d0, Math.min(sp.habitat.d1, floorAt(a.x, a.z) - 1)); }

  function stepNpcs(g) {
    var i, j;
    for (i = 0; i < g.npcs.length; i++) {
      var a = g.npcs[i], sp = SP[a.sp];
      if (!a.alive) { if (a.rt > 0 && !g.famine) { a.rt--; if (a.rt <= 0) { a.alive = true; a.hp = sp.hp || hpMax(sp.size); a.x = a.hx; a.z = a.hz; a.d = a.hd; if (sp.kind === 'school') a.n = sp.n; } } continue; }
      if (a.bleed > 0) a.bleed--;
      switch (sp.kind) {
        case 'school': stepSchool(g, a, sp); break;
        case 'static': a.spd = 0; break;
        case 'wander': stepWander(g, a, sp); break;
        case 'ambush': stepAmbush(g, a, sp); break;
        case 'hunter': stepHunter(g, a, sp); break;
        case 'pack': stepPack(g, a, sp); break;
        case 'shark': stepShark(g, a, sp); break;
        case 'passer': stepPasser(g, a, sp); break;
        case 'drift': stepDrift(g, a, sp); break;
      }
      // dotik (pik)
      if (sp.defense && sp.defense.touch) for (j = 0; j < g.fish.length; j++) { var f = g.fish[j]; if (!f.alive) continue; if (dist3(a, f) < sp.defense.touchR) { if (sp.defense.perSec) hurt(g, f, sp.defense.dmg * DT, 'sting', 'sting:' + a.sp, 'tentacles of a ' + a.sp + ' are burning you'); else if (f.spd < 0.5 && f.d > floorAt(f.x, f.z) - 2 && f.sz < 6) { hurt(g, f, sp.defense.dmg, 'sting', 'sting:' + a.sp, 'a buried ' + a.sp + ' stung you: -' + sp.defense.dmg + ' hp'); a.st = 'flee'; a.tm = 30; } } }
    }
    // plankton, meduze, mrhovina
    var night = isNight(g), ts = tSec(g);
    for (i = 0; i < g.plankton.length; i++) { var p = g.plankton[i]; var cur = OC.currentAt(p.x, p.z, p.d); p.x = clamp(p.x + cur.x * DT * 0.8, 10, OC.W - 10); p.z = clamp(p.z + cur.z * DT * 0.8, 10, OC.L - 10); var wantD = night ? 9 : 42; p.d = clamp(p.d + (wantD - p.d) * 0.003, 2, floorAt(p.x, p.z) - 2); if (!g.famine && p.amt < 100) p.amt += 0.03; if (p.amt < 1 && !g.famine && rnd(g) < 0.001) { p.x = 40 + rnd(g) * 720; p.z = 40 + rnd(g) * 720; p.amt = 40; } }
    for (i = 0; i < g.blooms.length; i++) { var jl = g.blooms[i], jc = OC.currentAt(jl.x, jl.z, jl.d); jl.x += jc.x * DT * 0.5 + (jl.hx - jl.x) * 0.0005; jl.z += jc.z * DT * 0.5 + (jl.hz - jl.z) * 0.0005; jl.d = clamp(jl.d + Math.sin(ts * 0.02 + i) * 0.02, jl.d0, jl.d1); if (!g.famine && jl.n < 40 && rnd(g) < 0.01) jl.n++; }
    for (i = g.carrion.length - 1; i >= 0; i--) { var k = g.carrion[i]; k.age++; var fl = floorAt(k.x, k.z); if (k.d < fl - 0.8) k.d = Math.min(fl - 0.8, k.d + 0.3 * DT); if (k.en <= 0 || k.age > (k.sz > 15 ? 9000 : 1400)) g.carrion.splice(i, 1); }
    // dogodki
    if (g.tick === OC.WHALE_FALL.t) { var wf = OC.WHALE_FALL; g.carrion.push({ id: 'k' + (g.nextK++), x: wf.x, z: wf.z, d: 30, sz: 25, en: 3000, age: 0, of: 'whale' }); addFeed(g, 'a dead whale is sinking into the trench'); }
    if (g.tick === OC.ORCA_EVENT.t0) { for (i = 0; i < 2; i++) mkNpc(g, 'orca', i, { x: 70, z: 380 + i * 12, d: 22 }); addFeed(g, 'a pod of orcas has entered the arena'); }
    if (g.tick === OC.ORCA_EVENT.t1) { g.npcs.forEach(function (o) { if (o.sp === 'orca') { o.alive = false; o.rt = 0; } }); addFeed(g, 'the orcas have moved on'); }
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
  function r2(v) { return Math.round(v * 100) / 100; }
  function compact(g) { var i, a; for (i = 0; i < g.npcs.length; i++) { a = g.npcs[i]; a.x = r2(a.x); a.z = r2(a.z); a.d = r2(a.d); a.h = r2(a.h); a.spd = r2(a.spd); if (a.hp !== undefined) a.hp = r2(a.hp); } for (i = 0; i < g.fish.length; i++) { a = g.fish[i]; a.x = r2(a.x); a.z = r2(a.z); a.d = r2(a.d); a.h = r2(a.h); a.p = r2(a.p); a.en = r2(a.en); a.hp = r2(a.hp); a.st = r2(a.st); a.sz = Math.round(a.sz * 10000) / 10000; a.ate = r2(a.ate); } for (i = 0; i < g.plankton.length; i++) { a = g.plankton[i]; a.x = r2(a.x); a.z = r2(a.z); a.d = r2(a.d); a.amt = r2(a.amt); } for (i = 0; i < g.blooms.length; i++) { a = g.blooms[i]; a.x = r2(a.x); a.z = r2(a.z); a.d = r2(a.d); } for (i = 0; i < g.carrion.length; i++) { a = g.carrion[i]; a.d = r2(a.d); a.en = r2(a.en); } }
  function scoreOf(g, f) { var surv = (f.alive ? g.tick : f.died) - f.born; return Math.round(surv * DT / 4 + f.kills * 150 + f.sz * 60 + f.ate / 5 + f.npcKills * 5); }
  OC.scoreOf = scoreOf;
  function finish(g, alive) {
    g.status = 'finished';
    g.fish.forEach(function (f) { f.score = scoreOf(g, f); });
    var ranked = g.fish.slice().sort(function (a, b) { if (a.cheat !== b.cheat) return a.cheat ? 1 : -1; if (a.alive !== b.alive) return a.alive ? -1 : 1; if (a.alive && b.alive) return b.score - a.score; return (b.died || 0) - (a.died || 0); });
    g.ranks = ranked.map(function (f, i) { return { rank: i + 1, id: f.id, name: f.n, model: f.model, alive: f.alive, score: f.score, size: Math.round(f.sz * 100) / 100, kills: f.kills, animalsEaten: f.npcKills, eaten: Math.round(f.ate), survivedSec: Math.round(((f.alive ? g.tick : f.died) - f.born) * DT), decisions: f.cmdN, cause: f.cause, suspect: f.suspect, cheat: f.cheat }; });
    g.winner = ranked.length ? ranked[0].n : null;
    addFeed(g, g.winner ? g.winner + ' wins (' + (alive.length === 1 ? 'last fish alive' : alive.length === 0 ? 'last to die' : 'highest score at the time limit') + ')' : 'game over');
  }
  OC.start = function (g, nowMs) { g.status = 'running'; g.startMs = nowMs; g.lastMs = nowMs; g.tick = 0; g.fish.forEach(function (f) { f.born = 0; f.lastCmdTick = 0; f.lastMeTick = 0; }); addFeed(g, 'the game has started with ' + g.fish.length + ' fish'); };
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
      v: 5, gen: g.gen, status: g.status, tick: g.tick, t: Math.round(ts), timeLeft: Math.max(0, Math.round((C.MAX_TICKS - g.tick) * DT)), phase: OC.phaseName(ts), light: Math.round(OC.dayLight(ts) * 100) / 100, famine: g.famine, tide: Math.round(OC.tideAt(ts) * 100) / 100,
      lobbyIn: g.status === 'lobby' && g.lobbyUntilMs ? Math.max(0, Math.round((g.lobbyUntilMs - nowMs) / 1000)) : null, lobbyArmed: !!g.lobbyUntilMs,
      fish: g.fish.map(function (f) { return { id: f.id, n: f.n, model: f.model, color: f.color, x: r1(f.x), z: r1(f.z), d: r1(f.d), h: Math.round(f.h), p: Math.round(f.p), spd: r1(f.spd), sz: r1(f.sz), hp: Math.round(f.hp), hpMax: hpMax(f.sz), en: Math.round(f.en), enMax: enMax(f.sz), st: Math.round(f.st), alive: f.alive, hid: f.hid, bleed: f.bleed > 0, poison: f.poison > 0, ink: f.ink > 0, kills: f.kills, npcKills: f.npcKills, ate: Math.round(f.ate), act: f.cmd.act, speed: f.cmd.speed, target: f.cmd.target, why: f.why, cmdN: f.cmdN, suspect: f.suspect, cheat: f.cheat, cause: f.cause, idle: Math.round((g.tick - f.lastCmdTick) * DT), score: scoreOf(g, f), meN: f.meN, lastCmdMs: f.lastCmdMs, recent: f.whyLog.slice(-6).map(function (w) { return { t: w.t, ms: w.ms, act: w.act, why: w.why }; }) }; }),
      npcs: g.npcs.filter(function (a) { return a.alive; }).map(function (a) { var o = { id: a.id, sp: a.sp, x: r1(a.x), z: r1(a.z), d: r1(a.d), h: Math.round(a.h), spd: r1(a.spd), st: a.st }; if (a.n !== undefined) o.n = a.n; if (a.tg) o.tg = a.tg; if (a.bleed > 0) o.bl = 1; if (a.hp !== undefined && SP[a.sp].kind === 'shark') o.hp = Math.round(a.hp); if (a.sp === 'whale') { if (a.blow && g.tick - a.blow < 40) o.blow = 1; if (a.breach && g.tick - a.breach < 40) o.breach = 1; if (a.lunge && g.tick - a.lunge < 8) o.lunge = 1; } return o; }),
      plankton: g.plankton.map(function (p) { return { id: p.id, x: r1(p.x), z: r1(p.z), d: r1(p.d), r: p.r, amt: Math.round(p.amt) }; }),
      blooms: g.blooms.map(function (j) { return { id: j.id, x: r1(j.x), z: r1(j.z), d: r1(j.d), r: j.r, n: j.n }; }),
      carrion: g.carrion.map(function (k) { return { id: k.id, x: r1(k.x), z: r1(k.z), d: r1(k.d), sz: r1(k.sz), en: Math.round(k.en) }; }),
      feed: g.feed.slice(-50), winner: g.winner, ranks: g.ranks
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
      if (seg === '' || seg === 'health') return json({ ok: true, game: 'OCEAN ARENA', endpoints: ['GET /rules', 'GET /chart', 'GET /species', 'GET /prompt', 'GET /prompt/en', 'POST /claim', 'GET /me?key=', 'POST /cmd', 'GET /report', 'GET /leaderboard', 'GET /state (spectators only)'], version: 'v5', species: OC.SPECIES_LIST.length, plants: OC.PLANTS.length, map: [OC.W, OC.L, OC.DMAX] });
      if (seg === 'rules') return text((await pub(PUBK + 'rules')) || 'rules not published');
      if (seg === 'prompt' || seg === 'prompts') return text((await pub(sub === 'en' ? PUBK + 'prompt-en' : PUBK + 'prompt')) || 'prompt not published');
      if (seg === 'chart') return json(OC.chart());
      if (seg === 'species') return json({ note: 'facts only: what each species is; discover the rest in the water', species: OC.SPECIES_LIST.map(function (k) { var v = OC.SPECIES[k]; return { name: k, kind: v.kind, size: v.size, habitat: v.habitat ? v.habitat.zone : '-', edible: !!(v.food && v.food.e), defense: v.defense ? v.defense.type : null, predator: !!v.prey }; }) });
      if (seg === 'publish' && adm && req.method === 'POST') {
        var pb = await readBody(req); if (!pb) return err('bad json'); var res = [];
        for (var k in pb) { var r = await fetch(U + '/rest/v1/arena_pub?on_conflict=key', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, HEAD), body: JSON.stringify({ key: k, body: pb[k], updated_at: new Date().toISOString() }) }); res.push(k + ':' + (r.ok ? pb[k].length : 'ERR ' + r.status)); pubCache[k] = null; }
        return json({ ok: true, results: res });
      }
      if (seg === 'reset' && adm) {
        await dbInsertIfMissing();
        return resp(await withState(async function (g) { var ng = OC.newGame((g.gen || 0) + 1); for (var kk in g) delete g[kk]; Object.assign(g, ng); return { res: { ok: true, gen: g.gen, status: g.status } }; }));
      }
      if (seg === 'start' && adm) return resp(await withState(async function (g, now) { if (g.status !== 'lobby') return { res: { ok: false, status: g.status } }; var sec = +(u.searchParams.get('in') || 0); g.lobbyUntilMs = now + sec * 1000; lobbyTick(g, now); return { res: { ok: true, status: g.status, fish: g.fish.length, lobbyUntilMs: g.lobbyUntilMs } }; }));
      if (seg === 'log' && adm) return resp(await withState(async function (g) { return { dirty: false, res: { stateHits: g.stateHits, fish: g.fish.map(function (f) { return { id: f.id, n: f.n, model: f.model, ip: f.ip, alive: f.alive, cmdN: f.cmdN, meN: f.meN, lastCmdMs: f.lastCmdMs, whys: f.whys, whyLog: f.whyLog, cmdMs: f.cmdMs, suspect: f.suspect, cheat: f.cheat }; }), now: Date.now(), startMs: g.startMs, status: g.status, tick: g.tick } }; }, true));

      if (seg === 'state') {
        var ip = ipOf(req);
        return resp(await withState(async function (g, now) {
          var dirty = g.status === 'running';
          if (ip && !adm) { g.stateHits[ip] = (g.stateHits[ip] || 0) + 1; dirty = true; g.fish.forEach(function (f) { if (f.ip === ip && !f.cheat) { f.cheat = true; OC.addFeed(g, f.n + ' peeked at the spectator feed (flagged)'); } }); }
          var snap = OC.snapshot(g, now); return { dirty: dirty, res: snap };
        }, true));
      }
      if (seg === 'leaderboard' || seg === 'report') return resp(await withState(async function (g) { return { dirty: false, res: { gen: g.gen, status: g.status, tick: g.tick, winner: g.winner, ranks: g.ranks || g.fish.slice().sort(function (a, b) { return OC.scoreOf(g, b) - OC.scoreOf(g, a); }).map(function (f, i) { return { rank: i + 1, id: f.id, name: f.n, model: f.model, alive: f.alive, score: OC.scoreOf(g, f), size: Math.round(f.sz * 100) / 100, kills: f.kills, eaten: Math.round(f.ate), decisions: f.cmdN, cause: f.cause, suspect: f.suspect, cheat: f.cheat }; }) } }; }, true));

      if (seg === 'claim' && req.method === 'POST') {
        var b = await readBody(req); if (!b) return err('body must be JSON: {"name":"...","model":"...","color":"blue"}');
        var name = ((b.name || '') + '').replace(/[^\w\- ]/g, '').trim().slice(0, 16); if (name.length < 2) return err('name: 2–16 letters/digits');
        var model = ((b.model || '') + '').trim().slice(0, 40); if (model.length < 2) return err('model is required: the exact name of the AI model making the decisions (e.g. "claude-sonnet-4.5", "gpt-5", "gemini-2.5-pro")');
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
          return { res: { ok: true, key: f.key, id: f.id, name: f.n, color: f.color, seat: g.fish.length + '/' + C.MAX_SEATS, startsInSec: Math.round((g.lobbyUntilMs - now) / 1000), note: 'keep the key secret; it dies when this game ends. Poll GET /me?key=... every 20–30 s until status is running.' } };
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
          if (g.status === 'lobby') return { dirty: false, res: json({ error: 'not started yet; poll /me until status is running', startsInSec: Math.max(0, Math.round((g.lobbyUntilMs - now) / 1000)) }, 425) };
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

