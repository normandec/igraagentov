// OCEAN ARENA bundle — zgrajeno 2026-11-21T20:53:31.759Z iz engine/world.js + engine.js + http.js. NE UREJAJ ROČNO.
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

// OCEAN ARENA v6 — deterministična simulacija (4 ticki/s) za svet 800×800×180.
// Deluje v Edge Function in v Node testih; vse na globalThis.OC.
(function (OC) {
  var C = {
    TICK_MS: 250, MAX_SEATS: 10, MIN_PLAYERS: 2,
    MAX_TICKS: 6000,         // 25 min
    FAMINE_TICK: 4080,       // po 17 min nič novega ne nastaja
    LOBBY_SEC: 300, IDLE_SEC: 90, MIN_CMD_MS: 2000,
    BITE_CD: 6, SWALLOW_RATIO: 1.6, GROWTH: 0.0046, MAX_SIZE: 10,
    CATCHUP_MAX: 160
  };
  OC.CONST = C;
  OC.COLORS = ['sand', 'kelp', 'blue', 'dark', 'silver', 'red', 'orange'];
  var DT = C.TICK_MS / 1000, D2R = Math.PI / 180, R2D = 180 / Math.PI;
  var clamp = OC.clamp, floorAt = OC.floorAt, rnd = OC.rnd;

  function norm360(a) { a %= 360; return a < 0 ? a + 360 : a; }
  function relAngle(a, b) { return ((a - b) % 360 + 540) % 360 - 180; }
  function distH(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
  function dist3(a, b) { return Math.hypot(a.x - b.x, a.z - b.z, a.d - b.d); }
  function bearing(ax, az, bx, bz) { return norm360(Math.atan2(bx - ax, -(bz - az)) * R2D); }
  function turnToward(cur, target, maxStep) { var d = relAngle(target, cur); return Math.abs(d) <= maxStep ? norm360(target) : norm360(cur + Math.sign(d) * maxStep); }

  function hpMax(sz) { return Math.round(80 + 40 * sz); }
  function enMax(sz) { return Math.round(100 * sz); }
  function cruiseSpeed(sz) { return 2.6 + 1.1 / sz; }
  function reach(sz) { return 1.4 + 0.65 * sz; }
  function biteDmg(sz) { return 14 + 9 * sz; }
  function tSec(g) { return g.tick * DT; }
  function addFeed(g, txt) { g.feed.push({ t: g.tick, txt: txt }); if (g.feed.length > 80) g.feed.shift(); }
  OC.addFeed = addFeed;

  function ev(f, key, txt, num) {
    var last = f.ev[f.ev.length - 1];
    if (last && last.k === key && f.ev.length > 0) {
      last.n = (last.n || 1) + 1; last.tot = (last.tot || 0) + (num || 0);
      last.t = txt + ' (×' + last.n + (num ? ', total ' + Math.round(last.tot) : '') + ')';
      return;
    }
    f.ev.push({ k: key, t: txt, n: 1, tot: num || 0 });
    if (f.ev.length > 40) f.ev.shift();
  }

  // ── Nova igra ────────────────────────────────────────────────────────────
  OC.newGame = function (gen, seed) {
    var g = {
      gen: gen || 1, rs: (seed || Date.now()) >>> 0,
      status: 'lobby', tick: 0, startMs: 0, lastMs: 0,
      firstClaimMs: 0, lobbyUntilMs: 0, manualStart: false,
      famine: false, savedHistory: false,
      fish: [], sharks: [], squids: [], rays: [], turtles: [], barracudas: [], morays: [],
      inks: [], schools: [], lanterns: [], plankton: [], jellies: [], crabs: [], puffers: [], carrion: [],
      snailPool: 75, matPool: 140, wreckPool: 120, grassPool: 80,
      feed: [], nextId: 1, stateHits: {}, winner: null, ranks: null
    };
    var i, r;
    // 5 naprednih morskih psov (3 v tropu + 1 grebenski + 1 globinski)
    var sharkDefs = [
      { id: 'sh1', name: 'modri-trop-1', pack: 'blue', sz: 11, route: 'pelagicA', homeD: 38, minD: 16, maxD: 95 },
      { id: 'sh2', name: 'modri-trop-2', pack: 'blue', sz: 10.5, route: 'pelagicB', homeD: 44, minD: 16, maxD: 95 },
      { id: 'sh3', name: 'modri-trop-3', pack: 'blue', sz: 10.5, route: 'pelagicC', homeD: 48, minD: 16, maxD: 100 },
      { id: 'sh4', name: 'tigrov-greben', pack: null, sz: 12.5, route: 'reefEdge', homeD: 30, minD: 15, maxD: 85 },
      { id: 'sh5', name: 'globinski-span', pack: null, sz: 14, route: 'abyss', homeD: 118, minD: 60, maxD: 170 }
    ];
    for (i = 0; i < sharkDefs.length; i++) {
      var sd = sharkDefs[i], rt = OC.SHARK_ROUTES[sd.route], swp = (i + 2) % rt.length;
      g.sharks.push({
        id: sd.id, name: sd.name, pack: sd.pack, route: sd.route, sz: sd.sz,
        minD: sd.minD, maxD: sd.maxD,
        x: rt[swp].x, z: rt[swp].z, d: rt[swp].d, h: i * 72, spd: 3.0,
        state: 'patrol', wp: (swp + 1) % rt.length, target: null, scentPos: null,
        sprint: 0, tired: 0, sat: 0, kills: 0
      });
    }
    g.shark = g.sharks[0]; // vzvratna združljivost

    // 12 klignjev (squid) — hitri brizgači črnila
    var squidZones = [
      [340, 310, 38], [435, 395, 52], [295, 515, 45], [510, 260, 42], [610, 340, 58],
      [385, 610, 82], [535, 585, 76], [245, 385, 34], [655, 195, 46], [420, 185, 38],
      [325, 415, 44], [465, 295, 40]
    ];
    for (i = 0; i < squidZones.length; i++) {
      var sq = squidZones[i];
      g.squids.push({
        id: 'sq' + (i + 1), x: sq[0], z: sq[1], d: Math.min(sq[2], floorAt(sq[0], sq[1]) - 4),
        hx: sq[0], hz: sq[1], hd: sq[2], h: rnd(g) * 360, spd: 2.2, sz: 2.2,
        hp: 50, hpMax: 50, alive: true, rt: 0, dash: 0, inkCd: 0
      });
    }

    // 6 manta raž (manta ray)
    var rayZones = [[180, 320, 22], [310, 220, 26], [390, 480, 34], [520, 410, 36], [220, 580, 28], [465, 210, 28]];
    for (i = 0; i < rayZones.length; i++) {
      var rz = rayZones[i];
      g.rays.push({
        id: 'ry' + (i + 1), x: rz[0], z: rz[1], d: rz[2], hx: rz[0], hz: rz[1], hd: rz[2],
        h: rnd(g) * 360, spd: 2.4, sz: 3.8, hp: 90, hpMax: 90, alive: true, rt: 0, flee: 0
      });
    }

    // 6 morskih želv (sea turtle)
    var turtleZones = [[125, 270, 14], [155, 550, 16], [205, 245, 12], [170, 435, 14], [285, 180, 16], [460, 135, 22]];
    for (i = 0; i < turtleZones.length; i++) {
      var tz = turtleZones[i];
      g.turtles.push({
        id: 'tu' + (i + 1), x: tz[0], z: tz[1], d: Math.min(tz[2], floorAt(tz[0], tz[1]) - 3),
        hx: tz[0], hz: tz[1], h: rnd(g) * 360, spd: 1.4, sz: 2.8,
        hp: 90, hpMax: 90, alive: true, rt: 0, flee: 0
      });
    }

    // 4 barakude (barracuda) — hitri plenilci ob razbitinah in robovih grebenov
    var cudaZones = [[415, 395, 52], [275, 550, 42], [260, 255, 26], [465, 145, 32]];
    for (i = 0; i < cudaZones.length; i++) {
      var cz = cudaZones[i];
      g.barracudas.push({
        id: 'ba' + (i + 1), x: cz[0], z: cz[1], d: Math.min(cz[2], floorAt(cz[0], cz[1]) - 4),
        hx: cz[0], hz: cz[1], hd: cz[2], h: rnd(g) * 360, spd: 2.6, sz: 3.2,
        hp: 65, hpMax: 65, alive: true, rt: 0, cool: 0, target: null
      });
    }

    // 4 murene (moray eel) — teritorialni zasedni plenilci v jamah in razbitini
    var morayDens = [
      { id: 'mo1', x: 572, z: 205, d: 46 },
      { id: 'mo2', x: 445, z: 682, d: 146 },
      { id: 'mo3', x: 198, z: 242, d: 22 },
      { id: 'mo4', x: 422, z: 412, d: Math.round(floorAt(422, 412) - 2) }
    ];
    for (i = 0; i < morayDens.length; i++) {
      var md = morayDens[i];
      g.morays.push({
        id: md.id, x: md.x, z: md.z, d: md.d, hx: md.x, hz: md.z, hd: md.d,
        h: rnd(g) * 360, sz: 3.4, hp: 75, hpMax: 75, alive: true, rt: 0, cool: 0
      });
    }

    // 18 jat sardel
    var sLoc = [
      [150, 210], [235, 330], [185, 520], [325, 250], [395, 360], [485, 295],
      [535, 445], [340, 470], [615, 285], [270, 625], [295, 195], [140, 325],
      [420, 250], [360, 560], [510, 175], [240, 440], [450, 515], [195, 165]
    ];
    for (i = 0; i < sLoc.length; i++) {
      var sx = sLoc[i][0] + (rnd(g) - 0.5) * 32, sz = sLoc[i][1] + (rnd(g) - 0.5) * 32;
      g.schools.push({ id: 's' + (i + 1), x: sx, z: sz, d: 16 + rnd(g) * 20, hx: sx, hz: sz, h: rnd(g) * 360, n: 160, flee: 0 });
    }
    // 10 jat globokomorskih svetlobnic (lanternfish)
    var lLoc = [[435, 565], [520, 670], [635, 530], [455, 435], [580, 365], [315, 645], [375, 495], [495, 600], [575, 470], [345, 385]];
    for (i = 0; i < lLoc.length; i++) {
      var lx = lLoc[i][0], lz = lLoc[i][1];
      g.lanterns.push({ id: 'l' + (i + 1), x: lx, z: lz, d: 64 + rnd(g) * 34, hx: lx, hz: lz, h: rnd(g) * 360, n: 90, flee: 0 });
    }
    // 24 oblakov planktona
    for (i = 0; i < 24; i++) {
      var px = 80 + rnd(g) * 560, pz = 80 + rnd(g) * 580;
      g.plankton.push({ id: 'p' + (i + 1), x: px, z: pz, d: Math.min(34, floorAt(px, pz) - 4), r: 24 + rnd(g) * 14, amt: 100 });
    }
    // 3 roji meduz
    for (i = 0; i < OC.JELLY_HOMES.length; i++) {
      var jh = OC.JELLY_HOMES[i];
      g.jellies.push({ id: 'j' + (i + 1), homeIdx: i, x: jh.x, z: jh.z, d: (jh.d0 + jh.d1) / 2, r: jh.r, n: 45 });
    }
    // 24 rakov
    var crabCenters = [[210, 250, 48], [165, 435, 38], [130, 310, 35], [465, 130, 28], [420, 410, 22], [272, 565, 18], [278, 175, 22], [330, 360, 45]];
    for (i = 0; i < 24; i++) {
      var cc = crabCenters[i % crabCenters.length], ca = rnd(g) * 6.28, cr = 4 + rnd(g) * cc[2];
      var cx = clamp(cc[0] + Math.cos(ca) * cr, 15, OC.W - 15), cz = clamp(cc[1] + Math.sin(ca) * cr, 15, OC.L - 15);
      g.crabs.push({ id: 'c' + (i + 1), x: cx, z: cz, d: floorAt(cx, cz) - 0.3, alive: true, rt: 0 });
    }
    // 10 napihovalk
    var puffCenters = [[210, 250], [165, 435], [112, 145], [278, 175], [465, 130], [122, 385], [295, 325], [210, 250], [165, 435], [420, 410]];
    for (i = 0; i < 10; i++) {
      var pc = puffCenters[i], pa = rnd(g) * 6.28, pr = 8 + rnd(g) * 22;
      var ux = clamp(pc[0] + Math.cos(pa) * pr, 15, OC.W - 15), uz = clamp(pc[1] + Math.sin(pa) * pr, 15, OC.L - 15);
      g.puffers.push({ id: 'u' + (i + 1), x: ux, z: uz, d: Math.min(20, floorAt(ux, uz) - 2), h: rnd(g) * 360, alive: true, rt: 0 });
    }
    // Začetni kitičev padec (whalefall) mrhovina
    for (i = 0; i < OC.WHALEFALLS.length; i++) {
      var wf = OC.WHALEFALLS[i];
      g.carrion.push({ id: 'k' + (g.nextId++), x: wf.x, z: wf.z, d: floorAt(wf.x, wf.z) - 0.8, sz: 4.5, en: 130, age: 0 });
    }
    return g;
  };

  OC.addFish = function (g, name, model, color, key, ip) {
    var sp = OC.SPAWNS[g.fish.length % OC.SPAWNS.length];
    var f = {
      id: 'f' + (g.fish.length + 1), n: name, model: model, color: color, key: key, ip: ip || null,
      x: sp.x, z: sp.z, d: sp.d, h: norm360(bearing(sp.x, sp.z, 330, 360)), p: 0, spd: 0,
      sz: 1.0, hp: hpMax(1), en: enMax(1) * 0.9, st: 100,
      alive: true, born: g.tick, died: 0, cause: null, killer: null,
      bleed: 0, poison: 0, cool: 0, lunge: 0, hid: false, inJelly: false,
      mud: 0, ambush: 0, wounded: 0, birdWarn: 0, inked: 0,
      zoneSeen: {},
      kills: 0, ate: 0, bites: 0, ev: [],
      cmd: { act: 'swim', speed: 'rest', h: 0, p: 0, target: null, goto: null, until: 0 },
      why: '', cmdN: 0, meN: 0, lastCmdTick: 0, lastMeTick: 0, lastCmdMs: 0, lastMeMs: 0,
      cmdMs: [], whys: [], suspect: false, cheat: false
    };
    g.fish.push(f);
    addFeed(g, name + ' (' + model + ') entered the sea');
    return f;
  };

  // ── Vidljivost in skrivališča ────────────────────────────────────────────
  function inInk(g, o) {
    var inks = g.inks || [];
    for (var i = 0; i < inks.length; i++) {
      if (dist3(o, inks[i]) <= inks[i].r) return true;
    }
    return false;
  }
  function inAnyShelter(x, z, d, sz) {
    if (OC.caveAt(x, z, d) || OC.wreckAt(x, z, d)) return true;
    if (OC.kelpAt(x, z, d) || OC.reefAt(x, z, d) || OC.anemoneAt(x, z, d)) return true;
    if (OC.seagrassAt(x, z, d) && sz <= 3.2) return true;
    var cs = OC.coralShelterAt(x, z, d);
    if (cs && sz <= cs.shelterMax) return true;
    return false;
  }
  function visionOf(g, f) {
    var L = OC.lightAt(tSec(g), f.d);
    var v = 9 + 58 * L;
    if (f.inJelly) v *= 0.65;
    if (OC.anemoneAt(f.x, f.z, f.d)) v *= 0.72;
    if (f.mud > 0) v *= 0.6;
    if (f.inked > 0 || inInk(g, f)) v *= 0.25;
    return v;
  }
  function visMul(g, t, viewer) {
    var m = 0.52 + 0.12 * (t.sz || 1);
    var moving = (t.spd || 0) > 0.8;
    var onBottom = t.d > floorAt(t.x, t.z) - 1.6 && !moving;
    m *= moving ? 1.25 : (onBottom ? 0.4 : 0.8);
    if (t.spd > cruiseSpeed(t.sz || 1) * 1.6) m *= 1.6;
    if (t.bleed > 0) m *= 1.5;
    var kelp = OC.kelpAt(t.x, t.z, t.d), wreck = OC.wreckAt(t.x, t.z, t.d), cave = OC.caveAt(t.x, t.z, t.d),
        reef = OC.reefAt(t.x, t.z, t.d), anem = OC.anemoneAt(t.x, t.z, t.d),
        grass = OC.seagrassAt(t.x, t.z, t.d), cs = OC.coralShelterAt(t.x, t.z, t.d);
    if (cave) { if (!viewer || OC.caveAt(viewer.x, viewer.z, viewer.d) !== cave) return 0; }
    if (kelp) m *= 0.25;
    if (wreck && (t.sz || 1) <= wreck.hideMax) m *= 0.22;
    if (reef && t.hid && (t.sz || 1) <= reef.hideMax) m *= 0.12;
    if (grass && (t.sz || 1) <= 3.0) m *= 0.22;
    if (cs && t.hid && (t.sz || 1) <= cs.shelterMax) m *= 0.16;
    if (anem && (t.sz || 1) <= OC.ANEMONES.maxSize) m *= 0.25;
    if (t.inJelly && (t.sz || 1) <= 1.5) m *= 0.28;
    if (t.mud > 0) m *= (t.color === 'sand' ? 0.22 : 0.35);
    if (inInk(g, t)) m *= 0.32;
    if (OC.inBiolum(t.x, t.z, t.d) && moving) m *= 3;
    // kamuflaža barv
    var L = OC.lightAt(tSec(g), t.d), c = t.color;
    if (c === 'sand' && onBottom && !kelp && !reef) m *= 0.45;
    else if (c === 'kelp' && (kelp || grass)) m *= 0.45;
    else if (c === 'red') m *= t.d > 62 ? 0.4 : (t.d < 28 ? 1.45 : 1);
    else if (c === 'silver' && t.d < 28 && L > 0.4) m *= 0.65;
    else if (c === 'dark' && L < 0.16) m *= 0.6;
    else if (c === 'blue' && !onBottom && t.d >= 22 && t.d <= 70) m *= 0.75;
    else if (c === 'orange') m *= 1.22;
    return m;
  }
  function canSee(g, viewer, t, baseVis) { var dd = dist3(viewer, t); return dd <= (baseVis || visionOf(g, viewer)) * visMul(g, t, viewer) ? dd : -1; }
  OC.visMul = visMul; OC.visionOf = visionOf; OC.canSee = canSee;

  function zonesOf(g, f) {
    var z = [], k = OC.kelpAt(f.x, f.z, f.d), sg = OC.seagrassAt(f.x, f.z, f.d), r = OC.reefAt(f.x, f.z, f.d),
        a = OC.anemoneAt(f.x, f.z, f.d), w = OC.wreckAt(f.x, f.z, f.d), c = OC.caveAt(f.x, f.z, f.d),
        cs = OC.coralShelterAt(f.x, f.z, f.d), v = OC.ventAt(f.x, f.z, f.d), wf = OC.whalefallAt(f.x, f.z, f.d);
    if (k) z.push(k.id); if (sg) z.push(sg.id); if (r) z.push(r.id); if (a) z.push('anemones');
    if (w) z.push(w.id); if (c) z.push(c.id); if (cs) z.push('coral-' + cs.kind); if (wf) z.push(wf.id);
    if (v.dist < 16) z.push(v.v.id + (v.dist < 4.5 ? ' (scalding)' : ''));
    if (OC.inBiolum(f.x, f.z, f.d)) z.push('glowing water'); if (OC.inDeadzone(f.x, f.z, f.d)) z.push('stagnant water');
    if (f.inJelly) z.push('jellyfish bloom'); if (f.inked > 0 || inInk(g, f)) z.push('ink cloud');
    if (f.d < OC.SURFACE_ZONE) z.push('surface');
    if (f.d > floorAt(f.x, f.z) - 1.6) z.push('on the bottom');
    var cur = OC.currentAt(f.x, f.z, f.d); if (cur.id) z.push('current:' + cur.id);
    if (!k && !sg && !r && !a && !w && !c && !cs && !wf) z.push('open water');
    return z;
  }

  // ── Zaznava ribe (GET /me) ──────────────────────────────────────────────
  OC.perceive = function (g, f, nowMs) {
    f.meN++; f.lastMeTick = g.tick;
    var ts = tSec(g), L = OC.lightAt(ts, f.d), vis = visionOf(g, f);
    var see = [], pulses = [], smell = [], i, d, b;
    function pushSee(obj) { see.push(obj); }
    function addPulse(o, fast) {
      var rel = o.sz < f.sz * 0.7 ? 'small' : o.sz > f.sz * 1.6 ? (o.sz > 7 ? 'huge' : 'large') : 'similar';
      pulses.push({ bearing: Math.round(bearing(f.x, f.z, o.x, o.z) / 5) * 5, dist: Math.round(d), size: rel, fast: fast || undefined });
    }

    // druge ribe
    for (i = 0; i < g.fish.length; i++) {
      var o = g.fish[i]; if (o.id === f.id || !o.alive) continue;
      d = canSee(g, f, o, vis);
      if (d >= 0) {
        pushSee({ id: o.id, kind: 'fish', name: o.n, bearing: Math.round(bearing(f.x, f.z, o.x, o.z)), rel: Math.round(relAngle(bearing(f.x, f.z, o.x, o.z), f.h)), dist: Math.round(d * 10) / 10, x: Math.round(o.x), z: Math.round(o.z), depth: Math.round(o.d), size: Math.round(o.sz * 100) / 100, heading: Math.round(o.h), speed: Math.round(o.spd * 10) / 10, moving: o.spd > 0.5, bleeding: o.bleed > 0 });
      } else {
        d = dist3(f, o);
        if (d < 46 && o.spd > 0.8 && !OC.caveAt(o.x, o.z, o.d)) addPulse(o, o.spd > 4.2);
      }
      if (o.bleed > 0 && d < (f.color === 'orange' ? 120 : 95)) {
        b = Math.round(bearing(f.x, f.z, o.x, o.z) / 15) * 15;
        smell.push({ kind: 'blood', bearing: b, strength: Math.round((1 - d / 120) * 10) / 10 });
      }
    }
    // morski psi (vsi 5)
    for (i = 0; i < g.sharks.length; i++) {
      var sh = g.sharks[i];
      d = canSee(g, f, sh, vis);
      if (d >= 0) pushSee({ id: sh.id, kind: 'shark', name: sh.name, bearing: Math.round(bearing(f.x, f.z, sh.x, sh.z)), rel: Math.round(relAngle(bearing(f.x, f.z, sh.x, sh.z), f.h)), dist: Math.round(d * 10) / 10, x: Math.round(sh.x), z: Math.round(sh.z), depth: Math.round(sh.d), size: sh.sz, heading: Math.round(sh.h), speed: Math.round(sh.spd * 10) / 10, state: sh.state });
      else {
        d = dist3(f, sh);
        if (d < 54 && sh.spd > 1.2) pulses.push({ bearing: Math.round(bearing(f.x, f.z, sh.x, sh.z) / 5) * 5, dist: Math.round(d), size: 'huge', fast: sh.spd > 4.8 || undefined });
      }
    }
    // klignji (squids)
    for (i = 0; i < g.squids.length; i++) {
      var sq = g.squids[i]; if (!sq.alive) continue;
      d = canSee(g, f, sq, vis);
      if (d >= 0) pushSee({ id: sq.id, kind: 'squid', bearing: Math.round(bearing(f.x, f.z, sq.x, sq.z)), rel: Math.round(relAngle(bearing(f.x, f.z, sq.x, sq.z), f.h)), dist: Math.round(d * 10) / 10, x: Math.round(sq.x), z: Math.round(sq.z), depth: Math.round(sq.d), size: sq.sz, speed: Math.round(sq.spd * 10) / 10 });
      else { d = dist3(f, sq); if (d < 36 && sq.spd > 3.5) addPulse(sq, true); }
    }
    // manta raže
    for (i = 0; i < g.rays.length; i++) {
      var ry = g.rays[i]; if (!ry.alive) continue;
      d = canSee(g, f, ry, vis);
      if (d >= 0) pushSee({ id: ry.id, kind: 'manta ray', bearing: Math.round(bearing(f.x, f.z, ry.x, ry.z)), rel: Math.round(relAngle(bearing(f.x, f.z, ry.x, ry.z), f.h)), dist: Math.round(d * 10) / 10, x: Math.round(ry.x), z: Math.round(ry.z), depth: Math.round(ry.d), size: ry.sz, speed: Math.round(ry.spd * 10) / 10 });
    }
    // morske želve
    for (i = 0; i < g.turtles.length; i++) {
      var tu = g.turtles[i]; if (!tu.alive) continue;
      d = canSee(g, f, tu, vis);
      if (d >= 0) pushSee({ id: tu.id, kind: 'sea turtle', bearing: Math.round(bearing(f.x, f.z, tu.x, tu.z)), rel: Math.round(relAngle(bearing(f.x, f.z, tu.x, tu.z), f.h)), dist: Math.round(d * 10) / 10, x: Math.round(tu.x), z: Math.round(tu.z), depth: Math.round(tu.d), size: tu.sz });
    }
    // barakude
    for (i = 0; i < g.barracudas.length; i++) {
      var ba = g.barracudas[i]; if (!ba.alive) continue;
      d = canSee(g, f, ba, vis);
      if (d >= 0) pushSee({ id: ba.id, kind: 'barracuda', bearing: Math.round(bearing(f.x, f.z, ba.x, ba.z)), rel: Math.round(relAngle(bearing(f.x, f.z, ba.x, ba.z), f.h)), dist: Math.round(d * 10) / 10, x: Math.round(ba.x), z: Math.round(ba.z), depth: Math.round(ba.d), size: ba.sz, speed: Math.round(ba.spd * 10) / 10 });
    }
    // murene
    for (i = 0; i < g.morays.length; i++) {
      var mo = g.morays[i]; if (!mo.alive) continue;
      d = canSee(g, f, mo, vis);
      if (d >= 0) pushSee({ id: mo.id, kind: 'moray eel', bearing: Math.round(bearing(f.x, f.z, mo.x, mo.z)), rel: Math.round(relAngle(bearing(f.x, f.z, mo.x, mo.z), f.h)), dist: Math.round(d * 10) / 10, x: Math.round(mo.x), z: Math.round(mo.z), depth: Math.round(mo.d), size: mo.sz });
    }
    // jate sardel in svetlobnic
    for (i = 0; i < g.schools.length; i++) {
      var s = g.schools[i]; if (s.n <= 0) continue;
      d = dist3(f, s); if (d <= vis * 1.2) pushSee({ id: s.id, kind: 'sardine school', count: s.n, bearing: Math.round(bearing(f.x, f.z, s.x, s.z)), rel: Math.round(relAngle(bearing(f.x, f.z, s.x, s.z), f.h)), dist: Math.round(d * 10) / 10, x: Math.round(s.x), z: Math.round(s.z), depth: Math.round(s.d) });
    }
    for (i = 0; i < g.lanterns.length; i++) {
      var ls = g.lanterns[i]; if (ls.n <= 0) continue;
      d = dist3(f, ls); if (d <= vis * 1.35 + 14) pushSee({ id: ls.id, kind: 'lanternfish school', count: ls.n, bearing: Math.round(bearing(f.x, f.z, ls.x, ls.z)), rel: Math.round(relAngle(bearing(f.x, f.z, ls.x, ls.z), f.h)), dist: Math.round(d * 10) / 10, x: Math.round(ls.x), z: Math.round(ls.z), depth: Math.round(ls.d) });
    }
    // plankton
    for (i = 0; i < g.plankton.length; i++) {
      var p = g.plankton[i]; if (p.amt < 1) continue;
      d = dist3(f, p); if (d <= vis * 1.1 + p.r) pushSee({ id: p.id, kind: 'plankton cloud', radius: Math.round(p.r), density: Math.round(p.amt), bearing: Math.round(bearing(f.x, f.z, p.x, p.z)), rel: Math.round(relAngle(bearing(f.x, f.z, p.x, p.z), f.h)), dist: Math.round(d * 10) / 10, x: Math.round(p.x), z: Math.round(p.z), depth: Math.round(p.d) });
      else if (d < (f.color === 'orange' ? 115 : 90)) smell.push({ kind: 'plankton', bearing: Math.round(bearing(f.x, f.z, p.x, p.z) / 15) * 15, strength: Math.round((1 - d / 115) * 10) / 10 });
    }
    // meduze
    for (i = 0; i < g.jellies.length; i++) {
      var jl = g.jellies[i];
      d = dist3(f, jl); if (d <= vis + jl.r) pushSee({ id: jl.id, kind: 'jellyfish bloom', radius: jl.r, bearing: Math.round(bearing(f.x, f.z, jl.x, jl.z)), rel: Math.round(relAngle(bearing(f.x, f.z, jl.x, jl.z), f.h)), dist: Math.round(d * 10) / 10, x: Math.round(jl.x), z: Math.round(jl.z), depth: Math.round(jl.d) });
    }
    // oblaki črnila
    for (i = 0; i < g.inks.length; i++) {
      var ik = g.inks[i]; d = dist3(f, ik);
      if (d <= vis + ik.r) pushSee({ id: ik.id, kind: 'ink cloud', radius: ik.r, bearing: Math.round(bearing(f.x, f.z, ik.x, ik.z)), dist: Math.round(d * 10) / 10, x: Math.round(ik.x), z: Math.round(ik.z), depth: Math.round(ik.d) });
    }
    // raki, napihovalke, mrhovina, čistilci
    for (i = 0; i < g.crabs.length; i++) { var cr = g.crabs[i]; if (!cr.alive) continue; d = dist3(f, cr); if (d <= vis) pushSee({ id: cr.id, kind: 'crab', bearing: Math.round(bearing(f.x, f.z, cr.x, cr.z)), rel: Math.round(relAngle(bearing(f.x, f.z, cr.x, cr.z), f.h)), dist: Math.round(d * 10) / 10, x: Math.round(cr.x), z: Math.round(cr.z), depth: Math.round(cr.d) }); }
    for (i = 0; i < g.puffers.length; i++) { var u = g.puffers[i]; if (!u.alive) continue; d = dist3(f, u); if (d <= vis) pushSee({ id: u.id, kind: 'pufferfish', bearing: Math.round(bearing(f.x, f.z, u.x, u.z)), rel: Math.round(relAngle(bearing(f.x, f.z, u.x, u.z), f.h)), dist: Math.round(d * 10) / 10, x: Math.round(u.x), z: Math.round(u.z), depth: Math.round(u.d) }); }
    for (i = 0; i < g.carrion.length; i++) {
      var k = g.carrion[i]; d = dist3(f, k);
      if (d <= vis) pushSee({ id: k.id, kind: 'carcass', remaining: Math.round(k.en), bearing: Math.round(bearing(f.x, f.z, k.x, k.z)), rel: Math.round(relAngle(bearing(f.x, f.z, k.x, k.z), f.h)), dist: Math.round(d * 10) / 10, x: Math.round(k.x), z: Math.round(k.z), depth: Math.round(k.d) });
      else if (d < (f.color === 'orange' ? 165 : 135)) smell.push({ kind: 'carrion', bearing: Math.round(bearing(f.x, f.z, k.x, k.z) / 15) * 15, strength: Math.round((1 - d / 165) * 10) / 10 });
    }
    for (i = 0; i < OC.CLEANERS.length; i++) {
      var cl = OC.CLEANERS[i]; d = dist3(f, cl);
      if (d <= vis) pushSee({ id: cl.id, kind: 'cleaner wrasse station', bearing: Math.round(bearing(f.x, f.z, cl.x, cl.z)), dist: Math.round(d * 10) / 10, x: cl.x, z: cl.z, depth: cl.d });
    }
    see.sort(function (a, b) { return a.dist - b.dist; });
    var events = f.ev.map(function (e) { return e.t; }); f.ev = [];
    var cur = OC.currentAt(f.x, f.z, f.d);
    var out = {
      status: g.status, gen: g.gen, tick: g.tick, t: Math.round(ts),
      timeLeft: Math.max(0, Math.round((C.MAX_TICKS - g.tick) * DT)),
      light: { phase: OC.phaseName(ts), here: Math.round(L * 100) / 100, visionRange: Math.round(vis) },
      you: {
        id: f.id, name: f.n, color: f.color, alive: f.alive,
        x: Math.round(f.x * 10) / 10, z: Math.round(f.z * 10) / 10, depth: Math.round(f.d * 10) / 10,
        floorBelow: Math.round(floorAt(f.x, f.z) * 10) / 10,
        heading: Math.round(f.h), pitch: Math.round(f.p), speed: Math.round(f.spd * 10) / 10,
        hp: Math.round(f.hp), hpMax: hpMax(f.sz), energy: Math.round(f.en), energyMax: enMax(f.sz),
        stamina: Math.round(f.st), size: Math.round(f.sz * 100) / 100,
        bleeding: f.bleed > 0, poisoned: f.poison > 0, hidden: f.hid, inked: f.inked > 0,
        temp: OC.tempAt(f.x, f.z, f.d),
        current: { x: Math.round(cur.x * 10) / 10, z: Math.round(cur.z * 10) / 10, vertical: Math.round(cur.d * 10) / 10 },
        zone: zonesOf(g, f),
        command: { act: f.cmd.act, speed: f.cmd.speed, secondsLeft: Math.max(0, Math.round((f.cmd.until - g.tick) * DT)) },
        kills: f.kills, eaten: Math.round(f.ate), score: scoreOf(g, f)
      },
      see: see.slice(0, 28), pulses: pulses.slice(0, 12), smell: smell.slice(0, 10), events: events,
      fishAlive: g.fish.filter(function (x) { return x.alive; }).length, fishTotal: g.fish.length
    };
    if (g.status === 'lobby') out.lobby = { players: g.fish.length, max: C.MAX_SEATS, manualHold: !!g.manualStart, startsInSec: g.lobbyUntilMs ? Math.max(0, Math.round((g.lobbyUntilMs - (nowMs || Date.now())) / 1000)) : null };
    if (g.status === 'finished' || !f.alive) out.result = { winner: g.winner, cause: f.cause, ranks: g.ranks || OC.rankList(g) };
    return out;
  };

  // ── Validacija ukazov ────────────────────────────────────────────────────
  var ACTS = ['swim', 'hunt', 'feed', 'hide', 'flee', 'lunge'], SPEEDS = ['rest', 'slow', 'cruise', 'fast', 'sprint'];
  OC.validateCmd = function (b) {
    var errs = [], c = {};
    if (!b || typeof b !== 'object') return { ok: false, errs: ['body must be a JSON object'] };
    var why = (b.why || '') + ''; why = why.trim();
    if (why.length < 8 || why.length > 240) errs.push('why: 8–240 characters explaining your current tactical reason');
    c.why = why;
    var act = b.act || 'swim';
    if (ACTS.indexOf(act) < 0) errs.push('act must be one of ' + ACTS.join('|'));
    c.act = act;
    var spd = b.speed || (act === 'hide' ? 'rest' : act === 'lunge' || act === 'flee' ? 'sprint' : 'cruise');
    if (SPEEDS.indexOf(spd) < 0) errs.push('speed must be one of ' + SPEEDS.join('|'));
    c.speed = spd;
    if (b.heading !== undefined) { if (typeof b.heading !== 'number' || !isFinite(b.heading)) errs.push('heading must be degrees 0..360'); else c.h = norm360(b.heading); }
    if (b.pitch !== undefined) { if (typeof b.pitch !== 'number' || !isFinite(b.pitch) || b.pitch < -80 || b.pitch > 80) errs.push('pitch must be degrees -80..80'); else c.p = b.pitch; }
    if (b.goto !== undefined) {
      if (!Array.isArray(b.goto) || b.goto.length < 2 || b.goto.length > 3 || b.goto.some(function (v) { return typeof v !== 'number' || !isFinite(v); })) errs.push('goto must be [x,z] or [x,z,depth]');
      else c.goto = { x: clamp(b.goto[0], 2, OC.W - 2), z: clamp(b.goto[1], 2, OC.L - 2), d: b.goto[2] !== undefined ? clamp(b.goto[2], 1, OC.DMAX - 1) : null };
    }
    if (b.target !== undefined) c.target = (b.target + '').slice(0, 24);
    if ((act === 'hunt' || act === 'flee') && !c.target) errs.push(act + ' requires target (an id from see)');
    var dur = b.dur !== undefined ? Number(b.dur) : 20;
    if (!isFinite(dur) || dur < 2 || dur > 60) errs.push('dur must be 2..60 seconds');
    c.dur = Math.round(dur);
    return { ok: errs.length === 0, errs: errs, cmd: c };
  };

  function normWhyTemplate(s) {
    return s.toLowerCase().replace(/\d+(\.\d+)?/g, '#').replace(/\b(f\d+|s\d+|l\d+|p\d+|c\d+|u\d+|k\d+|sh\d+|sq\d+|ry\d+|tu\d+|ba\d+|mo\d+|kelp-\w+|reef-\w+)\b/g, 'ID').trim();
  }
  OC.applyCmd = function (g, f, cmd, nowMs) {
    if (f.lastCmdMs) f.cmdMs.push(nowMs - f.lastCmdMs); if (f.cmdMs.length > 24) f.cmdMs.shift();
    f.whys.push(cmd.why); if (f.whys.length > 24) f.whys.shift();
    f.lastCmdMs = nowMs; f.lastCmdTick = g.tick; f.cmdN++; f.why = cmd.why;
    if (f.cmdMs.length >= 8) {
      var recent = f.cmdMs.slice(-8), avg = recent.reduce(function (a, b) { return a + b; }, 0) / 8;
      var sd = Math.sqrt(recent.reduce(function (a, b) { return a + (b - avg) * (b - avg); }, 0) / 8);
      if (sd < 250 && avg < 6000) f.suspect = true;
    }
    if (f.whys.length >= 8) {
      var uniq = {}, normSet = {};
      f.whys.forEach(function (w) { uniq[w.toLowerCase()] = 1; normSet[normWhyTemplate(w)] = 1; });
      if (Object.keys(uniq).length <= Math.max(2, f.whys.length / 4)) f.suspect = true;
      var last4 = f.whys.slice(-4).map(normWhyTemplate);
      if (last4.length === 4 && last4[0] === last4[1] && last4[1] === last4[2] && last4[2] === last4[3]) f.suspect = true;
    }
    var h = cmd.h !== undefined ? cmd.h : f.h, p = cmd.p !== undefined ? cmd.p : 0;
    if (cmd.act === 'lunge' && f.st >= 22) { f.st -= 22; f.lunge = 5; }
    f.cmd = { act: cmd.act, speed: cmd.speed, h: h, p: p, target: cmd.target || null, goto: cmd.goto || null, until: g.tick + Math.round(cmd.dur / DT) };
    if (cmd.act !== 'hide') f.hid = false;
  };

  // ── Boj, hranjenje in korak ──────────────────────────────────────────────
  function kill(g, f, cause, killer) {
    if (!f.alive) return;
    f.alive = false; f.died = g.tick; f.cause = cause; f.killer = killer ? killer.id : null;
    if (killer) killer.kills++;
    g.carrion.push({ id: 'k' + (g.nextId++), x: f.x, z: f.z, d: f.d, sz: f.sz, en: Math.max(25, Math.round(35 * f.sz)), age: 0 });
    addFeed(g, f.n + ' ' + cause);
  }
  function hurt(g, f, dmg, cause, evKey, evTxt, killer) {
    f.hp -= dmg;
    if (f.hp <= 0) { f.hp = 0; kill(g, f, cause === 'shark' ? 'was killed by a shark' : cause === 'bite' ? 'was killed by ' + (killer ? killer.n : 'another fish') : cause, killer); }
    else { ev(f, evKey, evTxt, -dmg); if (cause === 'bite' || cause === 'shark' || cause === 'barracuda') f.bleed = Math.max(f.bleed, 80); }
  }
  function findTarget(g, id) {
    if (!id) return null;
    var i;
    if (id === 'shark') return { kind: 'shark', o: g.sharks[0] };
    for (i = 0; i < g.sharks.length; i++) if (g.sharks[i].id === id) return { kind: 'shark', o: g.sharks[i] };
    for (i = 0; i < g.fish.length; i++) if (g.fish[i].id === id && g.fish[i].alive) return { kind: 'fish', o: g.fish[i] };
    for (i = 0; i < g.squids.length; i++) if (g.squids[i].id === id && g.squids[i].alive) return { kind: 'squid', o: g.squids[i] };
    for (i = 0; i < g.rays.length; i++) if (g.rays[i].id === id && g.rays[i].alive) return { kind: 'ray', o: g.rays[i] };
    for (i = 0; i < g.turtles.length; i++) if (g.turtles[i].id === id && g.turtles[i].alive) return { kind: 'turtle', o: g.turtles[i] };
    for (i = 0; i < g.barracudas.length; i++) if (g.barracudas[i].id === id && g.barracudas[i].alive) return { kind: 'barracuda', o: g.barracudas[i] };
    for (i = 0; i < g.morays.length; i++) if (g.morays[i].id === id && g.morays[i].alive) return { kind: 'moray', o: g.morays[i] };
    for (i = 0; i < g.schools.length; i++) if (g.schools[i].id === id && g.schools[i].n > 0) return { kind: 'school', o: g.schools[i] };
    for (i = 0; i < g.lanterns.length; i++) if (g.lanterns[i].id === id && g.lanterns[i].n > 0) return { kind: 'lantern', o: g.lanterns[i] };
    for (i = 0; i < g.plankton.length; i++) if (g.plankton[i].id === id && g.plankton[i].amt >= 1) return { kind: 'plankton', o: g.plankton[i] };
    for (i = 0; i < g.crabs.length; i++) if (g.crabs[i].id === id && g.crabs[i].alive) return { kind: 'crab', o: g.crabs[i] };
    for (i = 0; i < g.puffers.length; i++) if (g.puffers[i].id === id && g.puffers[i].alive) return { kind: 'puffer', o: g.puffers[i] };
    for (i = 0; i < g.carrion.length; i++) if (g.carrion[i].id === id) return { kind: 'carrion', o: g.carrion[i] };
    for (i = 0; i < OC.CLEANERS.length; i++) if (OC.CLEANERS[i].id === id) return { kind: 'cleaner', o: OC.CLEANERS[i] };
    return null;
  }
  function gain(g, f, e, key, txt) {
    f.en = Math.min(enMax(f.sz), f.en + e); f.ate += e;
    var ns = Math.min(C.MAX_SIZE, f.sz + e * C.GROWTH);
    if (Math.floor(ns * 10) > Math.floor(f.sz * 10)) ev(f, 'grow', 'you grew: size ' + (Math.round(ns * 100) / 100));
    f.sz = ns; ev(f, key, txt, e);
  }
  function inFront(f, t, half) { return Math.abs(relAngle(bearing(f.x, f.z, t.x, t.z), f.h)) <= half; }

  function spawnInk(g, x, z, d) {
    g.inks.push({ id: 'ink' + (g.nextId++), x: x, z: z, d: d, r: 10.5, ttl: 72 });
    if (g.inks.length > 12) g.inks.shift();
  }

  function tryBite(g, f, tgt) {
    if (f.cool > 0 || !tgt) return false;
    var o = tgt.o, r = reach(f.sz) + (f.lunge > 0 ? 3.2 : 0), dd = dist3(f, o);
    var rr = tgt.kind === 'school' || tgt.kind === 'lantern' ? r + 6 : tgt.kind === 'plankton' ? r + o.r : tgt.kind === 'carrion' ? r + 2.5 : tgt.kind === 'ray' ? r + 2 : tgt.kind === 'cleaner' ? r + 3 : r;
    if (dd > rr || !inFront(f, o, tgt.kind === 'fish' || tgt.kind === 'shark' ? 75 : 115)) return false;
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
        dmg = Math.round(biteDmg(f.sz) * mul * (behind ? 1.8 : 1) * (o.sz > f.sz * 1.3 && !behind ? 0.6 : 1));
        o.wounded = Math.max(o.wounded, 8);
        hurt(g, o, dmg, 'bite', 'bit:' + f.id, 'bitten by ' + f.n + ' (size ' + (Math.round(f.sz * 10) / 10) + ') from ' + (behind ? 'behind' : 'the side') + ': -' + dmg + ' hp', f);
        ev(f, 'bite:' + o.id, 'you bit ' + o.n + ': -' + dmg + ' hp' + (o.alive ? ' (it has ~' + Math.round(o.hp / hpMax(o.sz) * 100) + '% left)' : ''), dmg);
        if (!o.alive) {
          f.hp = Math.min(hpMax(f.sz), f.hp + 12 * o.sz);
          gain(g, f, 30 * o.sz, 'eatfish', 'you killed ' + o.n + ' and fed on it');
        }
        return true;
      case 'shark':
        f.cool = C.BITE_CD; f.bites++;
        ev(f, 'biteshark', 'you bit ' + (o.name || 'a shark') + '; it turned aggressively');
        o.target = f.id; o.state = 'hunt'; return true;
      case 'squid':
        f.cool = C.BITE_CD; f.bites++; f.hid = false; f.ambush = 0;
        if (o.inkCd <= 0) {
          spawnInk(g, o.x, o.z, o.d);
          o.inkCd = 50; o.dash = 14;
          o.h = norm360(bearing(f.x, f.z, o.x, o.z) + (rnd(g) - 0.5) * 50);
          f.inked = Math.max(f.inked, 28);
          ev(f, 'inked', 'the squid blasted a thick ink cloud in your face');
        }
        if (f.sz < 1.6) {
          hurt(g, f, 14, 'squid beak', 'squidbeak', 'the squid lashed back with its beak: -14 hp');
          return true;
        }
        dmg = Math.round(biteDmg(f.sz) * mul);
        o.hp -= dmg;
        if (o.hp <= 0 || f.sz >= 4.2) {
          o.alive = false; o.rt = 900;
          f.hp = Math.min(hpMax(f.sz), f.hp + 12);
          gain(g, f, 48, 'eatsquid', 'you caught and ate a squid');
        } else {
          ev(f, 'hitsquid', 'you bit a squid (-' + dmg + ' hp); it jetted away');
        }
        return true;
      case 'ray':
        f.cool = C.BITE_CD; f.bites++;
        if (f.sz < 2.2) { ev(f, 'raybig', 'the manta ray is too huge and swift for you'); return true; }
        dmg = Math.round(biteDmg(f.sz) * mul);
        o.hp -= dmg; o.flee = 36; o.h = bearing(f.x, f.z, o.x, o.z);
        if (o.hp <= 0 || f.sz >= 5.8) {
          o.alive = false; o.rt = 1200;
          f.hp = Math.min(hpMax(f.sz), f.hp + 18);
          gain(g, f, 65, 'eatray', 'you took down a manta ray');
        } else ev(f, 'hitray', 'you bit the manta ray (-' + dmg + ' hp); it soared away');
        return true;
      case 'turtle':
        f.cool = C.BITE_CD; f.bites++;
        if (f.sz < 3.6) { ev(f, 'turtleno', 'your teeth slide off the sea turtle\'s heavy shell'); o.flee = 20; return true; }
        dmg = Math.round(biteDmg(f.sz) * mul);
        o.hp -= dmg; o.flee = 25;
        if (o.hp <= 0 || f.sz >= 5.5) {
          o.alive = false; o.rt = 1100;
          gain(g, f, 48, 'eatturtle', 'you cracked a sea turtle');
        } else ev(f, 'hitturtle', 'you battered the sea turtle\'s shell (-' + dmg + ' hp)');
        return true;
      case 'barracuda':
        f.cool = C.BITE_CD; f.bites++;
        dmg = Math.round(biteDmg(f.sz) * mul);
        o.hp -= dmg; o.target = f.id;
        if (o.hp <= 0 || f.sz >= 4.2) {
          o.alive = false; o.rt = 1000;
          f.hp = Math.min(hpMax(f.sz), f.hp + 12);
          gain(g, f, 45, 'eatcuda', 'you killed a barracuda');
        } else {
          ev(f, 'hitcuda', 'you bit a barracuda (-' + dmg + ' hp)');
        }
        return true;
      case 'moray':
        f.cool = C.BITE_CD; f.bites++;
        dmg = Math.round(biteDmg(f.sz) * mul);
        o.hp -= dmg;
        if (o.hp <= 0 || f.sz >= 4.4) {
          o.alive = false; o.rt = 1200;
          f.hp = Math.min(hpMax(f.sz), f.hp + 14);
          gain(g, f, 48, 'eatmoray', 'you overpowered a moray eel');
        } else {
          hurt(g, f, 16, 'moray', 'moraybite', 'the moray eel snapped back from its den: -16 hp');
        }
        return true;
      case 'school':
        f.cool = C.BITE_CD; var pc = f.sz > 5 ? 0.50 : 0.78;
        if (rnd(g) < pc) { o.n -= 1; gain(g, f, f.sz > 5 ? 7 : 13, 'sard', 'you caught a sardine'); }
        else ev(f, 'sardmiss', 'the sardines scattered; missed');
        o.flee = 28; return true;
      case 'lantern':
        f.cool = C.BITE_CD; var lpc = f.sz > 6 ? 0.48 : 0.75;
        if (rnd(g) < lpc) { o.n -= 1; gain(g, f, f.sz > 6 ? 7 : 16, 'lant', 'you caught a lanternfish'); }
        else ev(f, 'lantmiss', 'the lanternfish darted away; missed');
        o.flee = 24; return true;
      case 'plankton':
        if (f.sz > 2.6) { ev(f, 'plank', 'you cannot filter plankton with a mouth this size'); f.cool = C.BITE_CD; return true; }
        if (o.amt < 1) return false; f.cool = 2; var e = Math.min(o.amt, 2.2); o.amt -= e; gain(g, f, e, 'plank', 'filter-feeding on plankton'); return true;
      case 'crab':
        f.cool = C.BITE_CD; if (f.sz < 1.3) { ev(f, 'crabno', 'the crab shell is too hard for you'); return true; }
        o.alive = false; o.rt = 850; gain(g, f, 28, 'crab', 'you cracked a crab'); return true;
      case 'puffer':
        f.cool = C.BITE_CD; if (f.sz >= 4.5) { o.alive = false; o.rt = 2200; f.hp = Math.min(hpMax(f.sz), f.hp + 15); gain(g, f, 50, 'puff', 'you swallowed a pufferfish'); return true; }
        var pDur = f.color === 'orange' ? 20 : 40;
        f.poison = Math.max(f.poison, pDur); o.x += (f.x - o.x) * -0.5;
        ev(f, 'puffpoison', 'the pufferfish inflated; your mouth is full of spines and you feel sick'); return true;
      case 'carrion':
        f.cool = 2; var ce = Math.min(o.en, 2.5); o.en -= ce; gain(g, f, ce, 'carr', 'you fed on a carcass'); return true;
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
    for (i = 0; i < g.squids.length; i++) if (g.squids[i].alive && f.sz >= 2.0) cons('squid', g.squids[i], 2);
    for (i = 0; i < g.carrion.length; i++) cons('carrion', g.carrion[i], 2.5);
    return bd < (rng || 22) ? best : null;
  }

  function stepFish(g, f) {
    var cmd = f.cmd, i;
    f.inJelly = false;
    for (i = 0; i < g.jellies.length; i++) {
      var j = g.jellies[i];
      if (Math.abs(f.d - j.d) < 15 && OC.dist2(f.x, f.z, j.x, j.z) < j.r * j.r) { f.inJelly = true; break; }
    }
    var idleT = (g.tick - f.lastCmdTick) * DT; f.idleWarn = idleT > C.IDLE_SEC * 0.6 ? Math.round(idleT) : 0;
    if (idleT > C.IDLE_SEC) { kill(g, f, 'went limp (no command for ' + C.IDLE_SEC + ' s)'); return; }
    if (g.tick > cmd.until && cmd.act !== 'hide') {
      f.spd = Math.max(0, f.spd - 2 * DT);
      var cu = OC.currentAt(f.x, f.z, f.d);
      f.x = clamp(f.x + cu.x * DT, 2, OC.W - 2); f.z = clamp(f.z + cu.z * DT, 2, OC.L - 2); f.d = clamp(f.d + cu.d * DT, 0.5, floorAt(f.x, f.z) - 0.5);
    } else {
      var tgt = cmd.target ? findTarget(g, cmd.target) : null;
      var wantH = cmd.h, wantP = cmd.p, reqSpd = cmd.speed;
      if (cmd.act === 'hide') { reqSpd = 'rest'; }
      else if (cmd.act === 'flee' && tgt) {
        wantH = norm360(bearing(f.x, f.z, tgt.o.x, tgt.o.z) + 180);
        var dz = f.d - tgt.o.d; wantP = clamp(Math.atan2(Math.abs(dz) < 1 ? -1 : dz, 20) * R2D, -55, 55);
      } else if (cmd.act === 'hunt' && tgt) {
        wantH = bearing(f.x, f.z, tgt.o.x, tgt.o.z);
        wantP = clamp(Math.atan2(tgt.o.d - f.d, Math.max(distH(f, tgt.o), 0.5)) * R2D, -65, 65);
      } else if (cmd.act === 'feed') {
        var ft = tgt || nearestFood(g, f, 26);
        if (ft) { wantH = bearing(f.x, f.z, ft.o.x, ft.o.z); wantP = clamp(Math.atan2(ft.o.d - f.d, Math.max(distH(f, ft.o), 0.5)) * R2D, -55, 55); }
      } else if (cmd.goto) {
        var gd = distH(f, cmd.goto), gdd = cmd.goto.d !== null ? Math.abs(cmd.goto.d - f.d) : 0;
        if (gd < 2 && gdd < 2) { reqSpd = 'rest'; cmd.goto = null; ev(f, 'arrived', 'you arrived at destination'); }
        else { wantH = bearing(f.x, f.z, cmd.goto.x, cmd.goto.z); if (cmd.goto.d !== null) wantP = clamp(Math.atan2(cmd.goto.d - f.d, Math.max(gd, 0.5)) * R2D, -65, 65); }
      }
      var turnRate = (165 - 7 * f.sz) * DT;
      f.h = turnToward(f.h, wantH, turnRate);
      f.p += clamp(wantP - f.p, -120 * DT, 120 * DT);
      var spMap = { rest: 0, slow: 0.45, cruise: 1, fast: 1.55, sprint: 2.35 };
      var mul = spMap[reqSpd] || 1;
      if (reqSpd === 'sprint') {
        if (f.st > 0) {
          if (f.d > floorAt(f.x, f.z) - 2.0 && f.spd < 1.2) f.mud = Math.max(f.mud, 16);
          f.st = Math.max(0, f.st - 11 * DT);
        } else mul = 1.55;
      } else if (!OC.inDeadzone(f.x, f.z, f.d)) {
        var stRegen = (reqSpd === 'rest' ? 9 : reqSpd === 'slow' ? 5 : 2) * (f.color === 'orange' ? 1.45 : 1);
        f.st = Math.min(100, f.st + stRegen * DT);
      }
      if (f.lunge > 0) { mul = 2.75; f.lunge--; }
      var wMul = OC.kelpAt(f.x, f.z, f.d) ? (f.sz > 4 ? 0.52 : 0.78) : 1;
      var woundMul = f.wounded > 0 ? 0.85 : 1;
      var targetSpd = cruiseSpeed(f.sz) * mul * wMul * woundMul;
      f.spd += (targetSpd - f.spd) * clamp(4 * DT, 0, 1);

      var hr = f.h * D2R, pr = f.p * D2R, cur = OC.currentAt(f.x, f.z, f.d);
      var vx = Math.sin(hr) * Math.cos(pr) * f.spd + cur.x, vz = -Math.cos(hr) * Math.cos(pr) * f.spd + cur.z, vd = Math.sin(pr) * f.spd + cur.d;
      var nx = clamp(f.x + vx * DT, 2, OC.W - 2), nz = clamp(f.z + vz * DT, 2, OC.L - 2), nd = f.d + vd * DT;
      var nc = OC.caveAt(nx, nz, nd);
      if (nc && f.sz > nc.maxSize) {
        ev(f, 'cavefit', 'the cave entrance is too narrow for your size (' + (Math.round(f.sz * 10) / 10) + ')');
      } else {
        f.x = nx; f.z = nz; f.d = clamp(nd, 0.3, floorAt(f.x, f.z) - 0.3);
      }

      if (cmd.act === 'hunt' && tgt) tryBite(g, f, tgt);
      else if (cmd.act === 'lunge') { var lt = tgt || nearestFood(g, f, 8); if (lt) tryBite(g, f, lt); }
      else if (cmd.act === 'feed') { var ft2 = tgt || nearestFood(g, f, 14); if (ft2) tryBite(g, f, ft2); }
      else if (cmd.act === 'hide') {
        var wasHid = f.hid;
        f.hid = f.spd < 0.3 && (!!OC.kelpAt(f.x, f.z, f.d) || !!OC.wreckAt(f.x, f.z, f.d) || !!OC.caveAt(f.x, f.z, f.d) || !!OC.reefAt(f.x, f.z, f.d) || !!OC.anemoneAt(f.x, f.z, f.d) || !!OC.seagrassAt(f.x, f.z, f.d) || !!OC.coralShelterAt(f.x, f.z, f.d) || f.d > floorAt(f.x, f.z) - 1.6);
        if (f.hid && !wasHid) { f.ambush = 40; ev(f, 'hid', 'you tucked into cover'); }
      }
    }

    // Sledenje raziskanih con
    var zList = zonesOf(g, f);
    for (i = 0; i < zList.length; i++) {
      var zn = zList[i];
      if (!zn.startsWith('current:') && zn !== 'open water' && zn !== 'surface' && zn !== 'on the bottom') f.zoneSeen[zn] = 1;
    }

    // Poraba energije (Kleiberjevo skaliranje — zanesljiva rast brez neskončnega preživetja brez hrane)
    var spCost = { rest: 0.9, slow: 1.2, cruise: 1.65, fast: 2.7, sprint: 5.2 }[cmd.speed] || 1.5;
    var tempMul = f.d > OC.THERMO ? 0.65 : 1;
    if (OC.ventAt(f.x, f.z, f.d).dist < 16) tempMul = 0.5;
    f.en -= 0.066 * Math.pow(f.sz, 0.78) * spCost * tempMul * DT;
    if (f.en <= 0) { f.en = 0; hurt(g, f, 2.2 * DT, 'starved', 'starv', 'starving: -hp'); if (!f.alive) return; }

    // Okoljski učinki in pasivna hrana
    var v = OC.ventAt(f.x, f.z, f.d);
    if (v.dist < 4.5) { hurt(g, f, 4.2 * DT, 'scalded by a hydrothermal vent', 'vent', 'scalding water burns you'); if (!f.alive) return; }
    else if (v.dist >= 4.5 && v.dist < 13 && !g.famine && g.matPool > 0 && f.en < enMax(f.sz) * 0.95 && f.spd < 2.2) {
      var me = Math.min(g.matPool, 1.4 * DT); g.matPool -= me; gain(g, f, me, 'mat', 'grazing bacterial mats near the warm vent');
    }
    var rAt = OC.reefAt(f.x, f.z, f.d);
    if (rAt && !g.famine && g.snailPool > 0 && f.sz <= 1.75 && f.d > floorAt(f.x, f.z) - 3 && f.en < enMax(f.sz) * 0.95 && f.spd < 2.2) {
      var se = Math.min(g.snailPool, 1.1 * DT); g.snailPool -= se; gain(g, f, se, 'snail', 'nibbling small reef snails');
    }
    if (OC.seagrassAt(f.x, f.z, f.d) && !g.famine && g.grassPool > 0 && f.sz <= 2.4 && f.en < enMax(f.sz) * 0.95 && f.spd < 2.2) {
      var ge = Math.min(g.grassPool, 1.0 * DT); g.grassPool -= ge; gain(g, f, ge, 'graze', 'grazing tiny shrimp in the seagrass');
    }
    if (OC.wreckAt(f.x, f.z, f.d) && !g.famine && g.wreckPool > 0 && f.sz <= 3.6 && f.en < enMax(f.sz) * 0.95 && f.spd < 2.4) {
      var we = Math.min(g.wreckPool, 1.2 * DT); g.wreckPool -= we; gain(g, f, we, 'wreckfood', 'picking barnacles inside the shipwreck');
    }
    if (OC.anemoneAt(f.x, f.z, f.d) && f.sz > OC.ANEMONES.maxSize) {
      hurt(g, f, 1.4 * DT, 'stung by giant anemones', 'anemone', 'the anemones sting your exposed flanks'); if (!f.alive) return;
    }
    if (f.inJelly) {
      if (f.sz > 1.5) { hurt(g, f, 1.5 * DT, 'stung by jellyfish', 'jelly', 'jellyfish sting you'); if (!f.alive) return; }
      else ev(f, 'jellysaf', 'you drift safely among the jellyfish tentacles');
    }
    if (OC.inDeadzone(f.x, f.z, f.d)) { hurt(g, f, 0.55 * DT, 'suffocated in the stagnant basin', 'dead', 'the water here has almost no oxygen'); if (!f.alive) return; }

    // Čistilne postaje
    for (i = 0; i < OC.CLEANERS.length; i++) {
      var cl = OC.CLEANERS[i];
      if (dist3(f, cl) < 4.5 && f.spd < 1.2) {
        if (f.bleed > 0 || f.poison > 0) { f.bleed = 0; f.poison = 0; ev(f, 'clean', 'cleaner wrasses cleaned your wounds and poison'); }
        if (f.hp < hpMax(f.sz) && f.en > 5) { f.hp = Math.min(hpMax(f.sz), f.hp + 1.5 * DT); ev(f, 'heal', 'cleaner wrasses are healing you'); }
      }
    }

    // Ptice na gladini podnevi
    var ts = tSec(g);
    if (f.d < OC.SURFACE_ZONE && OC.dayLight(ts) > 0.55 && f.sz < 3.0) {
      if (f.birdWarn === 0 && rnd(g) < 0.03) { f.birdWarn = 8; ev(f, 'birdshadow', 'a shadow of diving seabirds sweeps across the surface above you'); }
      else if (f.birdWarn === 1 && rnd(g) < 0.14) { hurt(g, f, 25, 'taken by a diving seabird', 'bird', 'a diving seabird struck from above: -25 hp'); if (!f.alive) return; }
    }
    if (f.birdWarn > 0) f.birdWarn--;

    // Statusi in regeneracija
    if (f.bleed > 0) { f.bleed--; hurt(g, f, 0.75 * DT, 'bled out', 'bleed', 'bleeding: -hp'); if (!f.alive) return; }
    if (f.poison > 0) { f.poison--; hurt(g, f, 0.85 * DT, 'poisoned by a pufferfish', 'pois', 'pufferfish toxin: -hp'); if (!f.alive) return; }
    if (f.cool > 0) f.cool--;
    if (f.mud > 0) f.mud--;
    if (f.ambush > 0) f.ambush--;
    if (f.wounded > 0) f.wounded--;
    if (f.inked > 0) f.inked--;
    if (f.hp < hpMax(f.sz) && f.en > enMax(f.sz) * 0.65 && f.bleed === 0 && f.poison === 0) f.hp = Math.min(hpMax(f.sz), f.hp + 0.32 * DT);
  }

  // ── Napredni morski psi: različni teritoriji, vohanje krvi in lov v tropih ──
  function stepSharks(g) {
    var i, j, k;
    // Zberi aktivne lovske tarče tropa (da si trop sporoča pozicije!)
    var packTargets = [];
    for (i = 0; i < g.sharks.length; i++) {
      var s0 = g.sharks[i];
      if (s0.pack && s0.state === 'hunt' && s0.target) {
        var tf0 = findTarget(g, s0.target);
        if (tf0 && tf0.kind === 'fish' && tf0.o.alive) packTargets.push({ shark: s0, prey: tf0.o });
      }
    }

    for (i = 0; i < g.sharks.length; i++) {
      var s = g.sharks[i];
      if (s.sat > 0) s.sat--;
      if (s.tired > 0) s.tired--;
      var rt = OC.SHARK_ROUTES[s.route] || OC.SHARK_PATH;
      var best = null, bs = -1;

      if (s.sat <= 0) {
        // 1) Vid in neposreden vonj krvi / ranjenih rib
        for (j = 0; j < g.fish.length; j++) {
          var f = g.fish[j]; if (!f.alive) continue;
          if (f.sz >= 8.5 && s.target !== f.id) continue;
          if (inAnyShelter(f.x, f.z, f.d, f.sz) || f.inJelly || floorAt(f.x, f.z) < 19) continue;
          if (s.route === 'abyss' && f.d < 48 && f.bleed <= 0) continue;
          var dd = dist3(s, f), vm = visMul(g, f, s), vr = (26 + s.sz * 0.4) * vm;
          // vohanje krvi in ranjenih rib po toku in od daleč!
          var cur = OC.currentAt(f.x, f.z, f.d);
          var downCur = (cur.x * (s.x - f.x) + cur.z * (s.z - f.z)) > 0 ? 1.3 : 1.0;
          var bloodRange = (f.bleed > 0 ? 165 : f.wounded > 0 ? 95 : 0) * downCur;
          if (dd <= vr || dd <= bloodRange) {
            var sc = (f.bleed > 0 ? 220 : 120) - dd + (f.sz <= 4 ? 30 : 0);
            if (sc > bs) { bs = sc; best = f; }
          }
        }
        // 2) Mrhovina (vohajo jo z razdalje 135 m)
        for (j = 0; j < g.carrion.length; j++) {
          var kc = g.carrion[j]; var kd = dist3(s, kc);
          if (kd < 135) { var ksc = 75 - kd; if (ksc > bs) { bs = ksc; best = kc; } }
        }
      }

      var tgt = null, rallyPos = null;
      if (best) {
        s.target = best.id;
        s.state = (best.alive !== undefined && best.sz !== undefined) ? 'hunt' : 'scavenge';
      } else if (s.state === 'hunt' || s.state === 'scavenge') {
        tgt = findTarget(g, s.target);
        if (!tgt) { s.state = 'patrol'; s.target = null; }
      }

      // Lov v tropu: če sosednji morski pes iz istega tropa lovi plen, se mu pridruži z bočnega kota!
      if (s.pack && s.sat <= 0 && !best && s.state !== 'hunt') {
        for (k = 0; k < packTargets.length; k++) {
          var pt = packTargets[k];
          if (pt.shark.id === s.id) continue;
          if (dist3(s, pt.prey) < 200) {
            s.state = 'pack'; s.target = pt.prey.id;
            var flankAngle = ((i % 2 === 0) ? 45 : -45) * D2R;
            var pb = bearing(s.x, s.z, pt.prey.x, pt.prey.z) * D2R + flankAngle;
            rallyPos = { x: clamp(pt.prey.x - Math.sin(pb) * 8, 6, OC.W - 6), z: clamp(pt.prey.z + Math.cos(pb) * 8, 6, OC.L - 6), d: pt.prey.d };
            break;
          }
        }
        if (!rallyPos && s.state === 'pack') { s.state = 'patrol'; s.target = null; }
      }

      if (s.state === 'hunt' || s.state === 'scavenge') {
        tgt = findTarget(g, s.target);
        if (tgt && tgt.kind === 'fish') {
          var tf = tgt.o;
          if (inAnyShelter(tf.x, tf.z, tf.d, tf.sz) || tf.inJelly || floorAt(tf.x, tf.z) < 19 || inInk(g, tf)) {
            tgt = null; s.state = 'patrol'; s.target = null;
          }
        }
        if (!tgt) { s.state = 'patrol'; s.target = null; }
      }

      var wp = rallyPos ? rallyPos : (tgt ? tgt.o : rt[s.wp]);
      if (!tgt && !rallyPos && dist3(s, wp) < 12) { s.wp = (s.wp + 1) % rt.length; wp = rt[s.wp]; }
      var b = bearing(s.x, s.z, wp.x, wp.z); s.h = turnToward(s.h, b, 54 * DT);
      var dh = distH(s, wp), p = clamp(Math.atan2(wp.d - s.d, Math.max(dh, 0.5)) * R2D, -45, 45);
      var spd = 2.9;
      if (tgt || rallyPos) {
        var td = dist3(s, tgt ? tgt.o : rallyPos);
        if (td < 28 && s.tired <= 0) { if (s.sprint <= 0) s.sprint = 18; }
        if (s.sprint > 0) { spd = 6.3; s.sprint--; if (s.sprint === 0) s.tired = 95; }
        else if (s.tired > 0) spd = 1.8;
        else spd = rallyPos ? 3.8 : 3.4;
        if (tgt && td < 4.0 && tgt.kind === 'fish') {
          var f2 = tgt.o;
          if (f2.sz <= 1.5 || f2.hp <= 55) { kill(g, f2, 'was taken by ' + s.name); f2.hp = 0; ev(f2, 'sharkeat', 'the shark took you'); }
          else { hurt(g, f2, 52, 'shark', 'shark', s.name + ' bit you deeply: -52 hp'); }
          s.sat = f2.alive ? 140 : 520; s.state = 'patrol'; s.target = null; if (!f2.alive) s.kills++;
        }
        if (tgt && td < 4.5 && tgt.kind === 'carrion') {
          tgt.o.en -= 8; if (tgt.o.en <= 0) { s.sat = 280; s.state = 'patrol'; s.target = null; }
        }
      } else if (s.tired > 0) spd = 2.0;
      s.spd = spd; var hr = s.h * D2R, pr = p * D2R;
      var nx = clamp(s.x + Math.sin(hr) * Math.cos(pr) * spd * DT, 4, OC.W - 4);
      var nz = clamp(s.z - Math.cos(hr) * Math.cos(pr) * spd * DT, 4, OC.L - 4);
      var nd = s.d + Math.sin(pr) * spd * DT;
      if (floorAt(nx, nz) < 19) { s.state = 'patrol'; s.target = null; s.wp = (s.wp + 1) % rt.length; }
      else { s.x = nx; s.z = nz; }
      s.d = clamp(nd, s.minD, Math.min(s.maxD, floorAt(s.x, s.z) - 2));
    }
  }

  // ── Ostalih 50+ živali, jate in okolje ───────────────────────────────────
  function stepSchoolList(g, list, dayD, nightD, maxN, speedMul, night) {
    var i, j;
    for (i = 0; i < list.length; i++) {
      var s = list[i]; if (s.n <= 0) continue;
      var threat = null, td = 1e9;
      for (j = 0; j < g.fish.length; j++) { var f = g.fish[j]; if (!f.alive || f.spd < 0.3) continue; var dd = dist3(s, f); if (dd < 18 && dd < td) { td = dd; threat = f; } }
      for (j = 0; j < g.sharks.length; j++) { var dd2 = dist3(s, g.sharks[j]); if (dd2 < 24 && dd2 < td) { td = dd2; threat = g.sharks[j]; } }
      var spd = 1.4 * speedMul, want;
      if (threat) { want = norm360(bearing(s.x, s.z, threat.x, threat.z) + 180 + (rnd(g) - 0.5) * 60); spd = 3.8 * speedMul; s.flee = 22; }
      else if (s.flee > 0) { s.flee--; want = s.h; spd = 3.0 * speedMul; }
      else { want = dist3(s, { x: s.hx, z: s.hz, d: s.d }) > 75 ? bearing(s.x, s.z, s.hx, s.hz) : norm360(s.h + (rnd(g) - 0.5) * 40); }
      s.h = turnToward(s.h, want, 120 * DT); var hr = s.h * D2R;
      s.x = clamp(s.x + Math.sin(hr) * spd * DT, 6, OC.W - 6); s.z = clamp(s.z - Math.cos(hr) * spd * DT, 6, OC.L - 6);
      var wd = night ? nightD : dayD; s.d = clamp(s.d + (wd - s.d) * 0.005 + (rnd(g) - 0.5) * 0.3, 3, floorAt(s.x, s.z) - 3);
      if (!g.famine && night && s.n < maxN && rnd(g) < 0.06) s.n++;
    }
  }

  function stepNPC(g) {
    var i, j, ts = tSec(g), ph = OC.phaseName(ts), night = ph === 'night' || ph === 'dusk';
    stepSchoolList(g, g.schools, 22, 9, 180, 1.0, ph === 'night');
    stepSchoolList(g, g.lanterns, 78, 30, 90, 0.9, night);

    // 10 klignjev (squid)
    for (i = 0; i < g.squids.length; i++) {
      var sq = g.squids[i];
      if (!sq.alive) { if (!g.famine) { sq.rt--; if (sq.rt <= 0) { sq.alive = true; sq.hp = sq.hpMax; sq.x = sq.hx; sq.z = sq.hz; } } continue; }
      if (sq.inkCd > 0) sq.inkCd--;
      var pred = null, pd = 1e9;
      for (j = 0; j < g.fish.length; j++) { var f = g.fish[j]; if (f.alive && f.sz > 2.8) { var dd = dist3(sq, f); if (dd < 16 && dd < pd) { pd = dd; pred = f; } } }
      for (j = 0; j < g.sharks.length; j++) { var sd = dist3(sq, g.sharks[j]); if (sd < 24 && sd < pd) { pd = sd; pred = g.sharks[j]; } }
      if (pred && pd < 10 && sq.inkCd <= 0) { spawnInk(g, sq.x, sq.z, sq.d); sq.inkCd = 55; sq.dash = 14; }
      var want = pred ? norm360(bearing(pred.x, pred.z, sq.x, sq.z) + (rnd(g) - 0.5) * 40) : (distH(sq, { x: sq.hx, z: sq.hz }) > 70 ? bearing(sq.x, sq.z, sq.hx, sq.hz) : norm360(sq.h + (rnd(g) - 0.5) * 35));
      sq.h = turnToward(sq.h, want, 140 * DT);
      if (sq.dash > 0) { sq.spd = 8.4; sq.dash--; } else sq.spd = pred ? 4.4 : 2.1;
      var sr = sq.h * D2R;
      sq.x = clamp(sq.x + Math.sin(sr) * sq.spd * DT, 8, OC.W - 8);
      sq.z = clamp(sq.z - Math.cos(sr) * sq.spd * DT, 8, OC.L - 8);
      var wd = night ? Math.max(12, sq.hd - 18) : sq.hd;
      sq.d = clamp(sq.d + (wd - sq.d) * 0.01 + Math.sin(ts + i) * 0.05, 5, floorAt(sq.x, sq.z) - 3);
    }

    // oblaki črnila (inks)
    for (i = g.inks.length - 1; i >= 0; i--) {
      g.inks[i].ttl--;
      g.inks[i].r += 0.04;
      if (g.inks[i].ttl <= 0) g.inks.splice(i, 1);
    }

    // 5 manta raž (rays)
    for (i = 0; i < g.rays.length; i++) {
      var ry = g.rays[i];
      if (!ry.alive) { if (!g.famine) { ry.rt--; if (ry.rt <= 0) { ry.alive = true; ry.hp = ry.hpMax; } } continue; }
      if (ry.flee > 0) ry.flee--;
      var rw = ry.flee > 0 ? ry.h : (distH(ry, { x: ry.hx, z: ry.hz }) > 95 ? bearing(ry.x, ry.z, ry.hx, ry.hz) : norm360(ry.h + (rnd(g) - 0.5) * 18));
      ry.h = turnToward(ry.h, rw, 55 * DT); ry.spd = ry.flee > 0 ? 5.6 : 2.4;
      var rr = ry.h * D2R;
      ry.x = clamp(ry.x + Math.sin(rr) * ry.spd * DT, 12, OC.W - 12); ry.z = clamp(ry.z - Math.cos(rr) * ry.spd * DT, 12, OC.L - 12);
      ry.d = clamp(ry.d + (ry.hd - ry.d) * 0.01 + Math.sin(ts * 0.5 + i) * 0.04, 6, floorAt(ry.x, ry.z) - 3);
    }

    // 6 morskih želv (turtles)
    for (i = 0; i < g.turtles.length; i++) {
      var tu = g.turtles[i];
      if (!tu.alive) { if (!g.famine) { tu.rt--; if (tu.rt <= 0) { tu.alive = true; tu.hp = tu.hpMax; } } continue; }
      if (tu.flee > 0) tu.flee--;
      var tw = distH(tu, { x: tu.hx, z: tu.hz }) > 60 ? bearing(tu.x, tu.z, tu.hx, tu.hz) : norm360(tu.h + (rnd(g) - 0.5) * 20);
      tu.h = turnToward(tu.h, tw, 45 * DT); tu.spd = tu.flee > 0 ? 3.2 : 1.4;
      var tr = tu.h * D2R;
      tu.x = clamp(tu.x + Math.sin(tr) * tu.spd * DT, 10, OC.W - 10); tu.z = clamp(tu.z - Math.cos(tr) * tu.spd * DT, 10, OC.L - 10);
      tu.d = clamp(tu.d + Math.sin(ts * 0.25 + i) * 0.04, 2, floorAt(tu.x, tu.z) - 2);
    }

    // 4 barakude (barracudas)
    for (i = 0; i < g.barracudas.length; i++) {
      var ba = g.barracudas[i];
      if (!ba.alive) { if (!g.famine) { ba.rt--; if (ba.rt <= 0) { ba.alive = true; ba.hp = ba.hpMax; } } continue; }
      if (ba.cool > 0) ba.cool--;
      var bt = null, bd = 1e9;
      if (ba.cool <= 0) {
        for (j = 0; j < g.fish.length; j++) {
          var f2 = g.fish[j];
          if (!f2.alive || f2.sz >= 2.2 || f2.hid || inAnyShelter(f2.x, f2.z, f2.d, f2.sz)) continue;
          var dd2 = dist3(ba, f2);
          if (dd2 < 20 && dd2 < bd) { bd = dd2; bt = f2; }
        }
      }
      var bw = bt ? bearing(ba.x, ba.z, bt.x, bt.z) : (distH(ba, { x: ba.hx, z: ba.hz }) > 65 ? bearing(ba.x, ba.z, ba.hx, ba.hz) : norm360(ba.h + (rnd(g) - 0.5) * 24));
      ba.h = turnToward(ba.h, bw, 95 * DT); ba.spd = bt ? 5.8 : 2.3;
      var br = ba.h * D2R;
      ba.x = clamp(ba.x + Math.sin(br) * ba.spd * DT, 10, OC.W - 10); ba.z = clamp(ba.z - Math.cos(br) * ba.spd * DT, 10, OC.L - 10);
      ba.d = clamp(bt ? ba.d + clamp(bt.d - ba.d, -2, 2) * DT : ba.d + (ba.hd - ba.d) * 0.01, 4, floorAt(ba.x, ba.z) - 2);
      if (bt && dist3(ba, bt) < 2.8 && ba.cool <= 0) {
        ba.cool = 44;
        hurt(g, bt, 15, 'barracuda', 'barracuda', 'a barracuda slashed you: -15 hp');
      }
    }

    // 4 murene (morays) — pazijo na jame in zasedo
    for (i = 0; i < g.morays.length; i++) {
      var mo = g.morays[i];
      if (!mo.alive) { if (!g.famine) { mo.rt--; if (mo.rt <= 0) { mo.alive = true; mo.hp = mo.hpMax; } } continue; }
      if (mo.cool > 0) mo.cool--;
      if (mo.cool <= 0) {
        for (j = 0; j < g.fish.length; j++) {
          var f3 = g.fish[j];
          if (!f3.alive || f3.sz >= 4.2 || f3.spd < 0.7) continue;
          if (dist3(mo, f3) < 6.0) {
            mo.cool = 40;
            hurt(g, f3, 20, 'bitten by a moray eel', 'moray', 'a moray eel struck from the crevice: -20 hp');
            break;
          }
        }
      }
    }

    // plankton
    for (i = 0; i < g.plankton.length; i++) {
      var p = g.plankton[i]; var cur = OC.currentAt(p.x, p.z, p.d);
      p.x = clamp(p.x + cur.x * DT * 0.8 + (rnd(g) - 0.5) * 0.1, 16, OC.W - 16); p.z = clamp(p.z + cur.z * DT * 0.8 + (rnd(g) - 0.5) * 0.1, 16, OC.L - 16);
      var wantD = ph === 'night' ? 10 : 44; p.d = clamp(p.d + (wantD - p.d) * 0.003, 3, floorAt(p.x, p.z) - 2);
      if (!g.famine && p.amt < 110) p.amt += 0.04;
      if (p.amt < 1 && !g.famine && rnd(g) < 0.002) { p.x = 50 + rnd(g) * (OC.W - 100); p.z = 50 + rnd(g) * (OC.L - 100); p.amt = 50; }
    }
    // 3 roji meduz
    for (i = 0; i < g.jellies.length; i++) {
      var jl = g.jellies[i], jh = OC.JELLY_HOMES[jl.homeIdx] || OC.JELLY_HOME, jc = OC.currentAt(jl.x, jl.z, jl.d);
      jl.x += jc.x * DT * 0.5 + (jh.x - jl.x) * 0.0006; jl.z += jc.z * DT * 0.5 + (jh.z - jl.z) * 0.0006;
      jl.d = clamp(jl.d + Math.sin(ts * 0.02 + i) * 0.02, jh.d0, jh.d1);
    }
    // raki & napihovalke
    for (i = 0; i < g.crabs.length; i++) { var c = g.crabs[i]; if (!c.alive && !g.famine) { c.rt--; if (c.rt <= 0) c.alive = true; } }
    for (i = 0; i < g.puffers.length; i++) {
      var u = g.puffers[i];
      if (!u.alive) { if (!g.famine) { u.rt--; if (u.rt <= 0) u.alive = true; } continue; }
      u.h = norm360(u.h + (rnd(g) - 0.5) * 30); var ur = u.h * D2R;
      u.x = clamp(u.x + Math.sin(ur) * 0.6 * DT, 10, OC.W - 10); u.z = clamp(u.z - Math.cos(ur) * 0.6 * DT, 10, OC.L - 10);
      u.d = clamp(u.d, 6, floorAt(u.x, u.z) - 1);
    }
    for (i = g.carrion.length - 1; i >= 0; i--) {
      var k = g.carrion[i]; k.age++; var fl = floorAt(k.x, k.z);
      if (k.d < fl - 0.8) k.d = Math.min(fl - 0.8, k.d + 0.3 * DT);
      if (k.en <= 0 || k.age > 1600) g.carrion.splice(i, 1);
    }
    if (!g.famine) {
      if (g.snailPool < 75) g.snailPool = Math.min(75, g.snailPool + 0.014);
      if (g.matPool < 140) g.matPool = Math.min(140, g.matPool + 0.018);
      if (g.wreckPool < 120) g.wreckPool = Math.min(120, g.wreckPool + 0.015);
      if (g.grassPool < 80) g.grassPool = Math.min(80, g.grassPool + 0.014);
    }
  }

  OC.stepOnce = function (g) {
    g.tick++;
    if (g.tick === C.FAMINE_TICK) { g.famine = true; addFeed(g, 'the sea is growing empty: nothing new is spawning'); }
    for (var i = 0; i < g.fish.length; i++) if (g.fish[i].alive) stepFish(g, g.fish[i]);
    stepSharks(g); stepNPC(g);
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
  OC.start = function (g, nowMs) { g.status = 'running'; g.manualStart = false; g.startMs = nowMs; g.lastMs = nowMs; g.tick = 0; g.fish.forEach(function (f) { f.born = 0; f.lastCmdTick = 0; f.lastMeTick = 0; }); addFeed(g, 'the game has started with ' + g.fish.length + ' fish'); };
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
    var sh0 = g.sharks[0] || g.shark;
    return {
      gen: g.gen, status: g.status, tick: g.tick, t: Math.round(ts), timeLeft: Math.max(0, Math.round((C.MAX_TICKS - g.tick) * DT)),
      phase: OC.phaseName(ts), light: Math.round(OC.dayLight(ts) * 100) / 100, famine: g.famine, manualStart: !!g.manualStart,
      lobbyIn: g.status === 'lobby' && g.lobbyUntilMs ? Math.max(0, Math.round((g.lobbyUntilMs - (nowMs || Date.now())) / 1000)) : null,
      fish: g.fish.map(function (f) { return { id: f.id, n: f.n, model: f.model, color: f.color, x: r1(f.x), z: r1(f.z), d: r1(f.d), h: Math.round(f.h), p: Math.round(f.p), spd: r1(f.spd), sz: r1(f.sz), hp: Math.round(f.hp), hpMax: hpMax(f.sz), en: Math.round(f.en), enMax: enMax(f.sz), st: Math.round(f.st), alive: f.alive, hid: f.hid, bleed: f.bleed > 0, poison: f.poison > 0, mud: f.mud > 0, inked: f.inked > 0, kills: f.kills, ate: Math.round(f.ate), act: f.cmd.act, why: f.why, cmdN: f.cmdN, explored: Object.keys(f.zoneSeen || {}).length, suspect: f.suspect, cheat: f.cheat, cause: f.cause, idle: Math.round((g.tick - f.lastCmdTick) * DT), score: scoreOf(g, f) }; }),
      shark: { id: sh0.id, name: sh0.name, x: r1(sh0.x), z: r1(sh0.z), d: r1(sh0.d), h: Math.round(sh0.h), spd: r1(sh0.spd), sz: sh0.sz, state: sh0.state, tired: sh0.tired > 0, target: sh0.target, kills: sh0.kills },
      sharks: g.sharks.map(function (s) { return { id: s.id, name: s.name, pack: s.pack, x: r1(s.x), z: r1(s.z), d: r1(s.d), h: Math.round(s.h), spd: r1(s.spd), sz: s.sz, state: s.state, tired: s.tired > 0, target: s.target, kills: s.kills }; }),
      squids: g.squids.filter(function (q) { return q.alive; }).map(function (q) { return { id: q.id, x: r1(q.x), z: r1(q.z), d: r1(q.d), h: Math.round(q.h), spd: r1(q.spd), dash: q.dash > 0 }; }),
      rays: g.rays.filter(function (q) { return q.alive; }).map(function (q) { return { id: q.id, x: r1(q.x), z: r1(q.z), d: r1(q.d), h: Math.round(q.h), spd: r1(q.spd) }; }),
      turtles: g.turtles.filter(function (q) { return q.alive; }).map(function (q) { return { id: q.id, x: r1(q.x), z: r1(q.z), d: r1(q.d), h: Math.round(q.h) }; }),
      barracudas: g.barracudas.filter(function (q) { return q.alive; }).map(function (q) { return { id: q.id, x: r1(q.x), z: r1(q.z), d: r1(q.d), h: Math.round(q.h), spd: r1(q.spd) }; }),
      morays: g.morays.filter(function (q) { return q.alive; }).map(function (q) { return { id: q.id, x: r1(q.x), z: r1(q.z), d: r1(q.d), h: Math.round(q.h) }; }),
      inks: g.inks.map(function (ik) { return { id: ik.id, x: r1(ik.x), z: r1(ik.z), d: r1(ik.d), r: r1(ik.r) }; }),
      schools: g.schools.map(function (s) { return { id: s.id, x: r1(s.x), z: r1(s.z), d: r1(s.d), h: Math.round(s.h), n: s.n }; }),
      lanterns: g.lanterns.map(function (s) { return { id: s.id, x: r1(s.x), z: r1(s.z), d: r1(s.d), h: Math.round(s.h), n: s.n }; }),
      plankton: g.plankton.map(function (p) { return { id: p.id, x: r1(p.x), z: r1(p.z), d: r1(p.d), r: p.r, amt: Math.round(p.amt) }; }),
      jellies: g.jellies,
      crabs: g.crabs.filter(function (c) { return c.alive; }).map(function (c) { return { id: c.id, x: r1(c.x), z: r1(c.z), d: r1(c.d) }; }),
      puffers: g.puffers.filter(function (u) { return u.alive; }).map(function (u) { return { id: u.id, x: r1(u.x), z: r1(u.z), d: r1(u.d), h: Math.round(u.h) }; }),
      carrion: g.carrion.map(function (k) { return { id: k.id, x: r1(k.x), z: r1(k.z), d: r1(k.d), sz: r1(k.sz), en: Math.round(k.en) }; }),
      feed: g.feed.slice(-40), winner: g.winner, ranks: g.ranks
    };
  };
  function r1(v) { return Math.round(v * 10) / 10; }
})(OC);

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

