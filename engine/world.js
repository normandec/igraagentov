// OCEAN ARENA v6 — svet 800×800×180 m (deljeno med pogonom, gledalcem in testi).
// Vse deterministično, brez naključnih tabel: pogon in gledalec dobita identičen svet.
// Koordinate: x, z ∈ [0, W], d = globina v metrih (0 = gladina, narašča navzdol).
var OC = globalThis.OC || (globalThis.OC = {});
(function (OC) {
  var W = 800, L = 800, DMAX = 180;
  OC.W = W; OC.L = L; OC.DMAX = DMAX;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function sstep(e0, e1, x) { var t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
  function gauss(x, z, cx, cz, r) { var dx = x - cx, dz = z - cz; return Math.exp(-(dx * dx + dz * dz) / (r * r)); }
  function rnd(g) { g.rs = (g.rs * 1664525 + 1013904223) >>> 0; return g.rs / 4294967296; }
  OC.clamp = clamp; OC.lerp = lerp; OC.sstep = sstep; OC.gauss = gauss; OC.rnd = rnd;

  // ── Dno ───────────────────────────────────────────────────────────────────
  function floorAt(x, z) {
    var d = 92 + 12 * Math.sin(x * 0.017) * Math.cos(z * 0.015) + 7 * Math.sin(x * 0.041 + 1.1) * Math.sin(z * 0.037 + 0.6);
    // zahodna plitva polica
    var shelf = sstep(310, 225, x);
    d = lerp(d, 26 + 4 * Math.sin(z * 0.025) + 2.5 * Math.cos(x * 0.05), shelf);
    // veliki koralni greben + laguna
    d -= 11 * gauss(x, z, 210, 250, 56);
    d -= 8 * gauss(x, z, 165, 435, 44);
    // podmorska gora (vulkan z vrelci)
    var sm = clamp(gauss(x, z, 585, 220, 82) * 1.4, 0, 1);
    d = lerp(d, 22, sm);
    // severovzhodni grebenček / stolp
    var p2 = clamp(gauss(x, z, 465, 130, 46) * 1.25, 0, 1);
    d = lerp(d, 34, p2);
    // globoki jarek na jugu
    var tr = Math.exp(-Math.pow((z - 690) / 62, 2)) * sstep(260, 330, x) * sstep(690, 610, x);
    d = lerp(d, 174, tr);
    // mrtva kotanja na jugovzhodu
    d = lerp(d, 132, gauss(x, z, 695, 525, 58));
    // vzhodna globina
    d = lerp(d, 128, sstep(690, 790, x) * (1 - tr));
    return clamp(d, 8, DMAX);
  }
  OC.floorAt = floorAt;

  // ── Značilnosti sveta ─────────────────────────────────────────────────────
  OC.KELP = [
    { id: 'kelp-nw', x: 112, z: 145, r: 42 },
    { id: 'kelp-w', x: 122, z: 385, r: 44 },
    { id: 'kelp-sw', x: 96, z: 655, r: 38 },
    { id: 'kelp-mid', x: 295, z: 325, r: 34 },
    { id: 'kelp-ne', x: 445, z: 115, r: 35 }
  ];
  OC.SEAGRASS = [
    { id: 'seagrass-n', x: 118, z: 265, r: 46 },
    { id: 'seagrass-s', x: 152, z: 555, r: 44 }
  ];
  OC.REEFS = [
    { id: 'reef-main', x: 210, z: 250, r: 58, hideMax: 2.8 },
    { id: 'reef-lagoon', x: 165, z: 435, r: 44, hideMax: 2.6 },
    { id: 'reef-spire', x: 465, z: 130, r: 36, hideMax: 3.0 }
  ];
  OC.REEF = OC.REEFS[0];
  OC.ANEMONES = { id: 'anemones', x: 278, z: 175, r: 24, maxSize: 2.0 };
  OC.WRECKS = [
    { id: 'wreck-main', x: 420, z: 410, rx: 22, rz: 9, h: 10, yaw: 0.55, hideMax: 5.5 },
    { id: 'wreck-sub', x: 272, z: 565, rx: 16, rz: 6, h: 7, yaw: -0.4, hideMax: 4.2 }
  ];
  OC.WRECK = OC.WRECKS[0];
  OC.CAVES = [
    { id: 'trench-cave', x: 445, z: 682, d: 146, r: 10, maxSize: 3.6, crystal: true },
    { id: 'abyss-grotto', x: 565, z: 695, d: 148, r: 9.5, maxSize: 3.8, crystal: true },
    { id: 'seamount-cave', x: 572, z: 205, d: 46, r: 8.5, maxSize: 3.6, moray: true },
    { id: 'reef-cave', x: 198, z: 242, d: 22, r: 7.5, maxSize: 2.5 },
    { id: 'lagoon-cave', x: 158, z: 442, d: 24, r: 7.5, maxSize: 2.8 },
    { id: 'shelf-cave', x: 265, z: 465, d: 48, r: 9.5, maxSize: 4.2 },
    { id: 'spire-cave', x: 472, z: 122, d: 44, r: 8, maxSize: 3.5, crystal: true },
    { id: 'east-cave', x: 735, z: 155, d: 98, r: 9, maxSize: 4.0 }
  ];
  OC.VENTS = [
    { id: 'vent-1', x: 595, z: 248 },
    { id: 'vent-2', x: 618, z: 228 },
    { id: 'vent-3', x: 572, z: 266 },
    { id: 'vent-4', x: 632, z: 256 },
    { id: 'vent-5', x: 552, z: 242 }
  ];
  OC.WHALEFALLS = [
    { id: 'whalefall-w', x: 405, z: 625, r: 18 },
    { id: 'whalefall-e', x: 645, z: 605, r: 16 }
  ];
  OC.WHALEFALL = OC.WHALEFALLS[0];
  OC.CLEANERS = [
    { id: 'cleaner-reef', x: 214, z: 256, d: 18 },
    { id: 'cleaner-lagoon', x: 168, z: 432, d: 19 },
    { id: 'cleaner-spire', x: 462, z: 136, d: 30 }
  ];
  OC.BIOLUM = { id: 'biolum', x: 485, z: 690, r: 92, minD: 120 };
  OC.DEADZONE = { id: 'deadzone', x: 695, z: 525, r: 52, minD: 102 };
  OC.JELLY_HOMES = [
    { x: 635, z: 420, r: 34, d0: 18, d1: 58 },
    { x: 360, z: 265, r: 28, d0: 16, d1: 48 },
    { x: 520, z: 515, r: 30, d0: 24, d1: 68 }
  ];
  OC.JELLY_HOME = OC.JELLY_HOMES[0];
  OC.THERMO = 58;             // termoklina (m)
  OC.SURFACE_ZONE = 4.5;      // m — cona ptic

  // 160 determinističnih rastlinskih in koralnih struktur (korale, vetrnice, spužve, morske pahljače, trave)
  // Vrste: staghorn | brain | table | fan | sponge | anemone | seagrass | kelp-clump | tubeworm
  OC.FLORA = (function () {
    var list = [], rs = { rs: 90210 };
    function add(kind, x, z, r, shelterMax) {
      x = clamp(Math.round(x * 10) / 10, 12, W - 12);
      z = clamp(Math.round(z * 10) / 10, 12, L - 12);
      list.push({
        id: 'fl' + (list.length + 1),
        kind: kind, x: x, z: z, d: Math.round(floorAt(x, z) * 10) / 10,
        r: r || 2.8, shelterMax: shelterMax || 0,
        sc: 0.75 + rnd(rs) * 0.9, yaw: rnd(rs) * 6.28
      });
    }
    var i, a, rr, k;
    // Korale na glavnem grebenu in laguni (68 koral: staghorn, brain, table, fan, sponge)
    var coralTypes = ['staghorn', 'brain', 'table', 'fan', 'sponge'];
    for (i = 0; i < 42; i++) {
      a = rnd(rs) * 6.28; rr = Math.sqrt(rnd(rs)) * 54;
      add(coralTypes[i % coralTypes.length], 210 + Math.cos(a) * rr, 250 + Math.sin(a) * rr, 3.6, (i % 3 === 0) ? 2.6 : 0);
    }
    for (i = 0; i < 26; i++) {
      a = rnd(rs) * 6.28; rr = Math.sqrt(rnd(rs)) * 40;
      add(coralTypes[(i + 2) % coralTypes.length], 165 + Math.cos(a) * rr, 435 + Math.sin(a) * rr, 3.5, (i % 3 === 0) ? 2.4 : 0);
    }
    // Stolpni greben (18 globljih koral in spužev)
    for (i = 0; i < 18; i++) {
      a = rnd(rs) * 6.28; rr = Math.sqrt(rnd(rs)) * 34;
      add(i % 2 ? 'fan' : 'sponge', 465 + Math.cos(a) * rr, 130 + Math.sin(a) * rr, 3.6, (i % 3 === 0) ? 2.8 : 0);
    }
    // Vrt vetrnic (18 velikih vetrnic)
    for (i = 0; i < 18; i++) {
      a = rnd(rs) * 6.28; rr = Math.sqrt(rnd(rs)) * 22;
      add('anemone', 278 + Math.cos(a) * rr, 175 + Math.sin(a) * rr, 3.2, 2.0);
    }
    // Morski travniki (28 snopov morske trave)
    for (i = 0; i < 28; i++) {
      var sg = OC.SEAGRASS[i % 2];
      a = rnd(rs) * 6.28; rr = Math.sqrt(rnd(rs)) * (sg.r - 4);
      add('seagrass', sg.x + Math.cos(a) * rr, sg.z + Math.sin(a) * rr, 4.2, 2.8);
    }
    // Dodatni šopi alg na robovih gozdov in polici (20)
    for (i = 0; i < 20; i++) {
      k = OC.KELP[i % OC.KELP.length];
      a = rnd(rs) * 6.28; rr = Math.sqrt(rnd(rs)) * (k.r - 3);
      add('kelp-clump', k.x + Math.cos(a) * rr, k.z + Math.sin(a) * rr, 4.0, 0);
    }
    // Cevasti črvi / globoke vrelčne kolonije in spužve okoli razbitin in gore (16)
    for (i = 0; i < 16; i++) {
      if (i < 10) {
        var v = OC.VENTS[i % OC.VENTS.length];
        a = rnd(rs) * 6.28; rr = 4 + rnd(rs) * 9;
        add('tubeworm', v.x + Math.cos(a) * rr, v.z + Math.sin(a) * rr, 2.5, 0);
      } else {
        var w = OC.WRECKS[i % 2];
        a = rnd(rs) * 6.28; rr = 6 + rnd(rs) * 14;
        add('sponge', w.x + Math.cos(a) * rr, w.z + Math.sin(a) * rr, 3.4, 2.4);
      }
    }
    return list; // 42+26+18+18+28+20+16 = 168 rastlin/koral!
  })();
  OC.SHELTER_NODES = OC.FLORA.filter(function (n) { return n.shelterMax > 0; });

  // Morski tokovi (veliki vrtinec + globinski tok + dvig ob gori)
  OC.CURRENTS = [
    { id: 'east-jet', kind: 'seg', ax: 240, az: 355, bx: 780, bz: 355, w: 38, d0: 10, d1: 68, v: 2.2 },
    { id: 'south-drift', kind: 'seg', ax: 735, az: 355, bx: 735, bz: 720, w: 34, d0: 12, d1: 88, v: 1.6 },
    { id: 'west-return', kind: 'seg', ax: 735, az: 725, bx: 280, bz: 725, w: 36, d0: 12, d1: 75, v: 1.6 },
    { id: 'north-wall', kind: 'seg', ax: 275, az: 725, bx: 275, bz: 355, w: 32, d0: 10, d1: 52, v: 1.4 },
    { id: 'abyss-stream', kind: 'seg', ax: 280, az: 685, bx: 690, bz: 685, w: 30, d0: 105, d1: 170, v: 1.5 },
    { id: 'upwelling', kind: 'up', x: 585, z: 220, r: 52, v: 0.9 }
  ];

  // Začetne točke igralcev (zmeren obroč v sredini, da se hitro srečajo ali razbežijo v zaklone)
  OC.SPAWNS = (function () {
    var a = [];
    for (var i = 0; i < 10; i++) {
      var t = i / 10 * Math.PI * 2;
      var sx = Math.round((330 + 185 * Math.cos(t)) * 10) / 10;
      var sz = Math.round((360 + 185 * Math.sin(t)) * 10) / 10;
      var sd = Math.max(8, Math.min(28, floorAt(sx, sz) - 4));
      a.push({ x: sx, z: sz, d: Math.round(sd * 10) / 10 });
    }
    return a;
  })();

  // Poti za več vrst morskih psov (različni lovni teritoriji po celem 800×800 morju)
  OC.SHARK_ROUTES = {
    pelagicA: [
      { x: 340, z: 260, d: 34 }, { x: 520, z: 320, d: 42 }, { x: 460, z: 490, d: 52 },
      { x: 320, z: 540, d: 44 }, { x: 265, z: 380, d: 30 }, { x: 400, z: 200, d: 36 }
    ],
    pelagicB: [
      { x: 540, z: 460, d: 48 }, { x: 670, z: 360, d: 54 }, { x: 610, z: 180, d: 34 },
      { x: 440, z: 260, d: 38 }, { x: 390, z: 430, d: 46 }, { x: 510, z: 600, d: 58 }
    ],
    pelagicC: [
      { x: 295, z: 480, d: 38 }, { x: 420, z: 585, d: 62 }, { x: 630, z: 550, d: 56 },
      { x: 685, z: 290, d: 44 }, { x: 490, z: 185, d: 36 }, { x: 335, z: 315, d: 32 }
    ],
    reefEdge: [
      { x: 265, z: 225, d: 28 }, { x: 278, z: 365, d: 30 }, { x: 235, z: 495, d: 32 },
      { x: 210, z: 620, d: 38 }, { x: 185, z: 350, d: 26 }, { x: 240, z: 155, d: 28 }
    ],
    abyss: [
      { x: 375, z: 645, d: 118 }, { x: 480, z: 690, d: 136 }, { x: 635, z: 635, d: 115 },
      { x: 685, z: 460, d: 102 }, { x: 575, z: 325, d: 88 }, { x: 425, z: 465, d: 92 }
    ]
  };
  OC.SHARK_PATH = OC.SHARK_ROUTES.pelagicA;

  // Javna karta (brez učinkov — samo imena in lega)
  OC.chart = function () {
    var f = [];
    OC.KELP.forEach(function (k) { f.push({ type: 'kelp forest', id: k.id, x: k.x, z: k.z, r: k.r, floor: Math.round(floorAt(k.x, k.z)) }); });
    OC.SEAGRASS.forEach(function (s) { f.push({ type: 'seagrass meadow', id: s.id, x: s.x, z: s.z, r: s.r, floor: Math.round(floorAt(s.x, s.z)) }); });
    OC.REEFS.forEach(function (r) { f.push({ type: 'coral reef', id: r.id, x: r.x, z: r.z, r: r.r, floor: Math.round(floorAt(r.x, r.z)) }); });
    f.push({ type: 'anemone garden', id: OC.ANEMONES.id, x: OC.ANEMONES.x, z: OC.ANEMONES.z, r: OC.ANEMONES.r, floor: Math.round(floorAt(OC.ANEMONES.x, OC.ANEMONES.z)) });
    OC.WRECKS.forEach(function (w) { f.push({ type: 'shipwreck', id: w.id, x: w.x, z: w.z, r: w.rx, floor: Math.round(floorAt(w.x, w.z)) }); });
    OC.CAVES.forEach(function (c) { f.push({ type: 'cave', id: c.id, x: c.x, z: c.z, depth: c.d, r: c.r }); });
    OC.VENTS.forEach(function (v) { f.push({ type: 'hydrothermal vent', id: v.id, x: v.x, z: v.z, depth: Math.round(floorAt(v.x, v.z)) }); });
    OC.WHALEFALLS.forEach(function (wf) { f.push({ type: 'whale skeleton', id: wf.id, x: wf.x, z: wf.z, r: wf.r, floor: Math.round(floorAt(wf.x, wf.z)) }); });
    f.push({ type: 'seamount', id: 'seamount', x: 585, z: 220, r: 82, top: 22 });
    f.push({ type: 'trench', id: 'trench', x: 475, z: 690, r: 160, floor: 174 });
    f.push({ type: 'basin', id: 'basin', x: 695, z: 525, r: 58, floor: 132 });
    f.push({ type: 'shelf', id: 'shelf', x: 140, z: 380, r: 210, floor: 26 });
    return { w: W, l: L, maxDepth: DMAX, note: 'x,z in metres from the north-west corner; depth in metres below the surface', features: f };
  };

  // ── Poizvedbe ────────────────────────────────────────────────────────────
  function dist2(ax, az, bx, bz) { var dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; }
  OC.dist2 = dist2;
  OC.kelpAt = function (x, z, d) {
    for (var i = 0; i < OC.KELP.length; i++) { var k = OC.KELP[i]; if (dist2(x, z, k.x, k.z) < k.r * k.r && d > floorAt(x, z) - 22) return k; }
    return null;
  };
  OC.seagrassAt = function (x, z, d) {
    for (var i = 0; i < OC.SEAGRASS.length; i++) { var s = OC.SEAGRASS[i]; if (dist2(x, z, s.x, s.z) < s.r * s.r && d > floorAt(x, z) - 4.5) return s; }
    return null;
  };
  OC.reefAt = function (x, z, d) {
    for (var i = 0; i < OC.REEFS.length; i++) { var r = OC.REEFS[i]; if (dist2(x, z, r.x, r.z) < r.r * r.r && d > floorAt(x, z) - 8) return r; }
    return null;
  };
  OC.anemoneAt = function (x, z, d) { var a = OC.ANEMONES; return (dist2(x, z, a.x, a.z) < a.r * a.r && d > floorAt(x, z) - 7) ? a : null; };
  OC.wreckAt = function (x, z, d) {
    for (var i = 0; i < OC.WRECKS.length; i++) {
      var w = OC.WRECKS[i], c = Math.cos(-w.yaw), s = Math.sin(-w.yaw), dx = x - w.x, dz = z - w.z;
      var lx = dx * c - dz * s, lz = dx * s + dz * c, fl = floorAt(w.x, w.z);
      if (Math.abs(lx) < w.rx && Math.abs(lz) < w.rz && d > fl - w.h) return w;
    }
    return null;
  };
  OC.caveAt = function (x, z, d) {
    for (var i = 0; i < OC.CAVES.length; i++) { var c = OC.CAVES[i]; var dd = d - c.d; if (dist2(x, z, c.x, c.z) + dd * dd < c.r * c.r) return c; }
    return null;
  };
  OC.coralShelterAt = function (x, z, d) {
    var nodes = OC.SHELTER_NODES;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (dist2(x, z, n.x, n.z) < n.r * n.r && d > n.d - 4.5) return n;
    }
    return null;
  };
  OC.ventAt = function (x, z, d) {
    var best = null, bd = 1e9;
    for (var i = 0; i < OC.VENTS.length; i++) { var v = OC.VENTS[i]; var fd = floorAt(v.x, v.z); var dd = d - fd; var q = dist2(x, z, v.x, v.z) + dd * dd * 0.5; if (q < bd) { bd = q; best = v; } }
    return { v: best, dist: Math.sqrt(bd) };
  };
  OC.whalefallAt = function (x, z, d) {
    for (var i = 0; i < OC.WHALEFALLS.length; i++) { var w = OC.WHALEFALLS[i]; if (dist2(x, z, w.x, w.z) < w.r * w.r && d > floorAt(x, z) - 9) return w; }
    return null;
  };
  OC.inBiolum = function (x, z, d) { var b = OC.BIOLUM; return d > b.minD && dist2(x, z, b.x, b.z) < b.r * b.r; };
  OC.inDeadzone = function (x, z, d) { var b = OC.DEADZONE; return d > b.minD && dist2(x, z, b.x, b.z) < b.r * b.r; };
  OC.tempAt = function (x, z, d) {
    var t = 20 - 13 * sstep(OC.THERMO - 10, OC.THERMO + 10, d);
    var v = OC.ventAt(x, z, d); if (v.dist < 16) t += (34 - t) * (1 - v.dist / 16);
    return Math.round(t * 10) / 10;
  };
  OC.shelterMul = function (x, z, d) {
    if (OC.caveAt(x, z, d) || OC.wreckAt(x, z, d)) return 0;
    if (OC.kelpAt(x, z, d) || OC.reefAt(x, z, d) || OC.anemoneAt(x, z, d) || OC.seagrassAt(x, z, d) || OC.coralShelterAt(x, z, d)) return 0.25;
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
        var q = dist2(x, z, c.x, c.z); if (q < c.r * c.r && d < 95) { cy -= c.v * (1 - q / (c.r * c.r)); id = id || c.id; }
      }
    }
    return { x: cx, z: cz, d: cy, id: id };
  };

  // Svetloba (dan/noč 6 min = 360 s; štart opoldne = 1.0)
  OC.DAY_SEC = 360;
  OC.dayLight = function (tSec) { return 0.54 + 0.46 * Math.cos(tSec / OC.DAY_SEC * Math.PI * 2); };
  OC.phaseName = function (tSec) {
    var p = (tSec % OC.DAY_SEC) / OC.DAY_SEC;
    return p < 0.18 || p > 0.82 ? 'day' : p < 0.32 ? 'dusk' : p < 0.68 ? 'night' : 'dawn';
  };
  OC.lightAt = function (tSec, depth) { return OC.dayLight(tSec) * Math.exp(-depth / 48); };
})(OC);
