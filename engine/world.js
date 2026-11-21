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
