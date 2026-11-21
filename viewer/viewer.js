// OCEAN ARENA v5 — 3D spectator viewer (three.js r128, bundled). Live data from /state or local demo.
(function () {
  var T = THREE, SP = OC.SPECIES;
  var DEFAULT_API = 'https://wrfniglebquubhnhqrtn.supabase.co/functions/v1/ocean-arena-v5';
  var qs = new URLSearchParams(location.search), ADMIN = qs.get('admin') || '';
  var API = qs.get('api') || (function () { try { return localStorage.getItem('ocean.api'); } catch (e) { return null; } })() || DEFAULT_API;
  var COL = { sand: 0xd8c08a, kelp: 0x3f8a3a, blue: 0x2f7fd0, dark: 0x2a2d3a, silver: 0xc8d0d8, red: 0xc62f2f, orange: 0xf08a24 };
  var COLHEX = { sand: '#d8c08a', kelp: '#5fb45a', blue: '#4f9fe8', dark: '#6a6f85', silver: '#c8d0d8', red: '#e64f4f', orange: '#f08a24' };
  var W = OC.W, L = OC.L, floorAt = OC.floorAt, D2R = Math.PI / 180;
  var $ = function (id) { return document.getElementById(id); };
  function spLabel(n) { return n === 'orca' ? 'ORCA' : n; }

  // ── Renderer / scena ─────────────────────────────────────────────────────
  var canvas = $('c');
  var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  var scene = new T.Scene(); scene.fog = new T.FogExp2(0x0a3550, 0.008);
  var camera = new T.PerspectiveCamera(62, 1, 0.3, 1600);
  var hemi = new T.HemisphereLight(0x8fd0ff, 0x08203a, 0.9); scene.add(hemi);
  var sun = new T.DirectionalLight(0xfff2d0, 0.9); sun.position.set(300, 400, 150); scene.add(sun);
  var amb = new T.AmbientLight(0x204a70, 0.5); scene.add(amb);
  function resize() { var w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  window.addEventListener('resize', resize); resize();
  var M = new T.Matrix4(), Q = new T.Quaternion(), V = new T.Vector3(), SC = new T.Vector3();
  function lam(c, o) { var p = { color: c }; if (o) for (var k in o) p[k] = o[k]; return new T.MeshLambertMaterial(p); }

  // ── Seafloor, walls, surface ─────────────────────────────────────────────
  (function buildFloor() {
    var seg = 200, geo = new T.PlaneGeometry(W, L, seg, seg); geo.rotateX(-Math.PI / 2); geo.translate(W / 2, 0, L / 2);
    var pos = geo.attributes.position, colors = new Float32Array(pos.count * 3), c = new T.Color();
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), z = pos.getZ(i), d = floorAt(x, z); pos.setY(i, -d);
      var t = OC.clamp((d - 10) / 150, 0, 1);
      c.setRGB(0.62 - 0.48 * t, 0.57 - 0.42 * t, 0.40 - 0.26 * t);
      OC.REEFS.forEach(function (rf) { if (OC.gauss(x, z, rf.x, rf.z, rf.r) > 0.45) c.setRGB(0.72, 0.46, 0.42); });
      OC.KELP.forEach(function (k) { if (OC.gauss(x, z, k.x, k.z, k.r) > 0.4) c.setRGB(0.30, 0.42, 0.22); });
      OC.SEAGRASS.forEach(function (k) { if (OC.gauss(x, z, k.x, k.z, k.r) > 0.4) c.setRGB(0.36, 0.55, 0.30); });
      if (x < OC.MANGROVE.x1 && z > OC.MANGROVE.z0 && z < OC.MANGROVE.z1) c.setRGB(0.35, 0.30, 0.20);
      if (OC.gauss(x, z, OC.DEADZONE.x, OC.DEADZONE.z, OC.DEADZONE.r) > 0.4 && d > OC.DEADZONE.minD) c.setRGB(0.20, 0.16, 0.10);
      OC.VENTS.forEach(function (v) { if (OC.gauss(x, z, v.x, v.z, 9) > 0.3) c.setRGB(0.12, 0.10, 0.10); });
      var n = Math.sin(x * 0.9) * Math.cos(z * 1.1) * 0.03; c.r += n; c.g += n; c.b += n;
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(colors, 3)); geo.computeVertexNormals();
    scene.add(new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true })));
    var wallMat = new T.MeshBasicMaterial({ color: 0x06253a, transparent: true, opacity: 0.35, side: T.DoubleSide });
    [[W / 2, 0, 0, W, 0], [W / 2, 0, L, W, 0], [0, 0, L / 2, L, Math.PI / 2], [W, 0, L / 2, L, Math.PI / 2]].forEach(function (a) { var m = new T.Mesh(new T.PlaneGeometry(a[3], OC.DMAX), wallMat); m.position.set(a[0], -OC.DMAX / 2, a[2]); m.rotation.y = a[4]; scene.add(m); });
    var surf = new T.Mesh(new T.PlaneGeometry(W * 3, L * 3, 1, 1), new T.MeshBasicMaterial({ color: 0x5fb0ea, transparent: true, opacity: 0.32, side: T.DoubleSide, depthWrite: false }));
    surf.rotation.x = -Math.PI / 2; surf.position.set(W / 2, 0, L / 2); scene.add(surf);
    var th = new T.Mesh(new T.PlaneGeometry(W, L), new T.MeshBasicMaterial({ color: 0x1a4a7a, transparent: true, opacity: 0.07, side: T.DoubleSide, depthWrite: false })); th.rotation.x = -Math.PI / 2; th.position.set(W / 2, -OC.THERMO, L / 2); scene.add(th);
  })();

  // ── Static features ──────────────────────────────────────────────────────
  var sway = [], featureHits = [];
  (function buildFeatures() {
    var rs = { rs: 1234 }; function R() { return OC.rnd(rs); }
    function inst(geo, mat, n) { var im = new T.InstancedMesh(geo, mat, n); im.count = 0; scene.add(im); return im; }
    function put(im, x, y, z, sx, sy, sz, ry, rx, rz) { V.set(x, y, z); Q.setFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0)); SC.set(sx, sy, sz); M.compose(V, Q, SC); im.setMatrixAt(im.count++, M); }
    // kelp
    var stalkGeo = new T.CylinderGeometry(0.08, 0.22, 1, 5, 1); stalkGeo.translate(0, 0.5, 0);
    var stalkMat = lam(0x2f7a2a), leafGeo = new T.SphereGeometry(1, 6, 5), leafMat = lam(0x3f9a3a, { transparent: true, opacity: 0.8 });
    OC.KELP.forEach(function (k) {
      var n = 80, im = new T.InstancedMesh(stalkGeo, stalkMat, n), items = [], lm = new T.InstancedMesh(leafGeo, leafMat, n);
      for (var i = 0; i < n; i++) { var a = R() * Math.PI * 2, r = Math.sqrt(R()) * k.r; var x = k.x + Math.cos(a) * r, z = k.z + Math.sin(a) * r; var fl = floorAt(x, z); var h = Math.min(fl - 2, 10 + R() * 12); items.push({ x: x, z: z, y: -fl, h: h, ph: R() * 6.28 }); M.makeScale(1.3, 0.9, 1.3); M.setPosition(x, -fl + h, z); lm.setMatrixAt(i, M); }
      im.userData = items; scene.add(im); scene.add(lm); sway.push(im);
    });
    // seagrass
    var bladeGeo = new T.ConeGeometry(0.06, 1.6, 3); bladeGeo.translate(0, 0.8, 0); var bladeMat = lam(0x4a9a3a);
    var blades = inst(bladeGeo, bladeMat, 1200);
    OC.SEAGRASS.forEach(function (s) { for (var i = 0; i < 600; i++) { var a = R() * 6.28, r = Math.sqrt(R()) * s.r; var x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r; put(blades, x, -floorAt(x, z), z, 1, 0.7 + R() * 0.8, 1, R() * 6.28, (R() - 0.5) * 0.4, (R() - 0.5) * 0.4); } });
    // mangroves: roots, trunks, canopies
    var rootGeo = new T.CylinderGeometry(0.12, 0.2, 1, 5); rootGeo.translate(0, 0.5, 0); var rootMat = lam(0x5a3a22);
    var roots = inst(rootGeo, rootMat, 520), trunks = inst(new T.CylinderGeometry(0.5, 0.8, 1, 7), lam(0x4a2e18), 70), crowns = inst(new T.SphereGeometry(1, 7, 6), lam(0x2e7a2a), 70);
    var mg = OC.MANGROVE; for (var i = 0; i < 70; i++) { var tx = 2 + R() * 18, tz = mg.z0 + (i + R()) / 70 * (mg.z1 - mg.z0); var fl = floorAt(tx, tz); put(trunks, tx, -fl + (fl + 5) / 2, tz, 1, fl + 5, 1); put(crowns, tx + (R() - 0.5) * 2, 5 + R() * 2, tz, 4 + R() * 2, 2.5, 4 + R() * 2); for (var r2 = 0; r2 < 7; r2++) { var ax = tx + (R() - 0.5) * 7, az = tz + (R() - 0.5) * 7; var fl2 = floorAt(ax, az); put(roots, ax, -fl2, az, 1, fl2 + 1.5, 1, 0, (tx - ax) * 0.12, (tz - az) * 0.12); } }
    // sargassum (floating algae)
    var sarg = inst(new T.SphereGeometry(1, 6, 4), lam(0x7a6a1a, { transparent: true, opacity: 0.85 }), 220);
    OC.SARGASSUM.forEach(function (s) { for (var i = 0; i < 44; i++) { var a = R() * 6.28, r = Math.sqrt(R()) * s.r; put(sarg, s.x + Math.cos(a) * r, -0.3 - R() * 0.6, s.z + Math.sin(a) * r, 1.5 + R() * 2, 0.5 + R() * 0.6, 1.5 + R() * 2, R() * 3); } });
    // reefs: rock rubble
    var rubbleGeo = new T.DodecahedronGeometry(1, 0), rubbleMat = lam(0x9a7a6a), rubble = inst(rubbleGeo, rubbleMat, 260);
    OC.REEFS.forEach(function (rf) { for (var i = 0; i < 130; i++) { var a = R() * 6.28, r = Math.sqrt(R()) * rf.r; var x = rf.x + Math.cos(a) * r, z = rf.z + Math.sin(a) * r, s = 0.5 + R() * 1.4; put(rubble, x, -floorAt(x, z) + s * 0.3, z, s, s * (0.5 + R() * 0.6), s, R() * 3, R(), R()); } var cl = rf.cleaner, cm = new T.Mesh(new T.TorusGeometry(1.6, 0.18, 8, 24), new T.MeshBasicMaterial({ color: 0x7ff8ff })); cm.position.set(cl.x, -cl.d, cl.z); cm.rotation.x = Math.PI / 2; scene.add(cm); sway.push({ ring: cm }); });
    // plants (176 individual instances by type)
    var P = OC.PLANTS, cnt = {}; P.forEach(function (p) { cnt[p.type] = (cnt[p.type] || 0) + 1; });
    var brain = inst(new T.SphereGeometry(1, 10, 8), lam(0xd8b060), cnt['coral-brain'] || 1);
    var stag = inst((function () { var g = new T.ConeGeometry(0.12, 1, 5); g.translate(0, 0.5, 0); return g; })(), lam(0xe88a6a), (cnt['coral-staghorn'] || 1) * 7);
    var tableTop = inst(new T.CylinderGeometry(1, 1, 0.25, 9), lam(0xc8a070), cnt['coral-table'] || 1), tableLeg = inst(new T.CylinderGeometry(0.25, 0.4, 1, 6), lam(0xa08060), cnt['coral-table'] || 1);
    var fan = inst(new T.PlaneGeometry(1, 1), lam(0xb060d0, { side: T.DoubleSide, transparent: true, opacity: 0.85 }), cnt['seafan'] || 1);
    var whip = inst((function () { var g = new T.CylinderGeometry(0.05, 0.09, 1, 4); g.translate(0, 0.5, 0); return g; })(), lam(0xf0d060), (cnt['seawhip'] || 1) * 4);
    var anemBase = inst(new T.SphereGeometry(1, 8, 6, 0, 6.283, 0, 1.6), lam(0x60c0a0), cnt['anemone'] || 1), anemTent = inst((function () { var g = new T.CylinderGeometry(0.04, 0.08, 1, 4); g.translate(0, 0.5, 0); return g; })(), lam(0xa0f0d0), (cnt['anemone'] || 1) * 10);
    var sponge = inst((function () { var g = new T.CylinderGeometry(0.45, 0.35, 1, 7, 1, true); g.translate(0, 0.5, 0); return g; })(), lam(0xf08040, { side: T.DoubleSide }), (cnt['sponge'] || 1) * 3);
    var algae = inst(new T.DodecahedronGeometry(1, 0), lam(0x5a8a3a), cnt['algae-rock'] || 1);
    var tube = inst((function () { var g = new T.CylinderGeometry(0.08, 0.1, 1, 5); g.translate(0, 0.5, 0); return g; })(), lam(0xf0f0f0), (cnt['tube-worm'] || 1) * 6), tubeTip = inst(new T.SphereGeometry(0.14, 5, 4), new T.MeshBasicMaterial({ color: 0xff3030 }), (cnt['tube-worm'] || 1) * 6);
    P.forEach(function (p) {
      var y = -p.d, k; var hit = { x: p.x, y: y, z: p.z, r: p.r, id: p.id, name: p.type }; featureHits.push(hit);
      switch (p.type) {
        case 'coral-brain': put(brain, p.x, y + p.r * 0.35, p.z, p.r * 0.9, p.r * 0.55, p.r * 0.8, R() * 3); break;
        case 'coral-staghorn': for (k = 0; k < 7; k++) put(stag, p.x + (R() - 0.5) * p.r, y, p.z + (R() - 0.5) * p.r, 1.2, 1.2 + R() * 1.6, 1.2, 0, (R() - 0.5) * 0.9, (R() - 0.5) * 0.9); break;
        case 'coral-table': put(tableLeg, p.x, y + 0.6, p.z, 1, 1.2, 1); put(tableTop, p.x, y + 1.3, p.z, p.r, 1, p.r * 0.8, R() * 3); break;
        case 'seafan': put(fan, p.x, y + p.r * 0.6, p.z, p.r * 1.2, p.r * 1.2, 1, R() * 3); break;
        case 'seawhip': for (k = 0; k < 4; k++) put(whip, p.x + (R() - 0.5) * 1.5, y, p.z + (R() - 0.5) * 1.5, 1, 2.5 + R() * 3, 1, 0, (R() - 0.5) * 0.3, (R() - 0.5) * 0.3); break;
        case 'anemone': put(anemBase, p.x, y, p.z, p.r * 0.5, p.r * 0.35, p.r * 0.5); for (k = 0; k < 10; k++) { var aa = k / 10 * 6.28; put(anemTent, p.x + Math.cos(aa) * p.r * 0.3, y + p.r * 0.3, p.z + Math.sin(aa) * p.r * 0.3, 1, 0.8 + R() * 0.6, 1, 0, Math.sin(aa) * 0.5, -Math.cos(aa) * 0.5); } break;
        case 'sponge': for (k = 0; k < 3; k++) put(sponge, p.x + (R() - 0.5) * 1.6, y, p.z + (R() - 0.5) * 1.6, 1 + R() * 0.6, 1.2 + R() * 1.4, 1 + R() * 0.6); break;
        case 'algae-rock': put(algae, p.x, y + p.r * 0.3, p.z, p.r, p.r * 0.6, p.r, R() * 3, R() * 0.4); break;
        case 'tube-worm': for (k = 0; k < 6; k++) { var tx2 = p.x + (R() - 0.5) * 2, tz2 = p.z + (R() - 0.5) * 2, th2 = 0.8 + R() * 1.2; put(tube, tx2, y, tz2, 1, th2, 1, 0, (R() - 0.5) * 0.3, (R() - 0.5) * 0.3); put(tubeTip, tx2, y + th2, tz2, 1, 1, 1); } break;
      }
    });
    // wrecks
    var hullMat = lam(0x4a3a2a);
    OC.WRECKS.forEach(function (wk) {
      var wfl = floorAt(wk.x, wk.z), wg = new T.Group(); wg.position.set(wk.x, -wfl, wk.z); wg.rotation.y = -wk.yaw;
      if (/plane/.test(wk.id)) {
        var fus = new T.Mesh(new T.CylinderGeometry(1.6, 1.2, wk.rx * 2, 10), lam(0x8a8a90)); fus.rotation.z = Math.PI / 2; fus.rotation.y = 0.1; fus.position.y = 1.4; wg.add(fus);
        var wing = new T.Mesh(new T.BoxGeometry(6, 0.3, wk.rz * 2.2), lam(0x7a7a80)); wing.position.set(0, 1.2, 0); wing.rotation.x = 0.1; wg.add(wing);
        var tail = new T.Mesh(new T.BoxGeometry(0.3, 4, 3), lam(0x7a7a80)); tail.position.set(-wk.rx + 1, 3, 0); wg.add(tail);
        for (var w2 = 0; w2 < 7; w2++) { var win = new T.Mesh(new T.CircleGeometry(0.35, 8), new T.MeshBasicMaterial({ color: 0x050505 })); win.position.set(-wk.rx + 4 + w2 * 2.6, 1.8, 1.62); wg.add(win); }
      } else {
        var hull = new T.Mesh(new T.BoxGeometry(wk.rx * 2, wk.h, wk.rz * 2), hullMat); hull.position.y = wk.h / 2 - 1; hull.rotation.z = 0.25; wg.add(hull);
        var cabin = new T.Mesh(new T.BoxGeometry(8, 4, 7), lam(0x5a4a3a)); cabin.position.set(-4, wk.h + 1, 0); cabin.rotation.z = 0.25; wg.add(cabin);
        var mast = new T.Mesh(new T.CylinderGeometry(0.3, 0.4, 18, 6), hullMat); mast.position.set(4, wk.h + 6, 0); mast.rotation.z = 0.6; wg.add(mast);
        for (var j = 0; j < 6; j++) { var hole = new T.Mesh(new T.CircleGeometry(1.2, 10), new T.MeshBasicMaterial({ color: 0x050505 })); hole.position.set(-wk.rx + 4 + j * 6, wk.h / 2, wk.rz + 0.05); wg.add(hole); }
      }
      scene.add(wg); featureHits.push({ x: wk.x, y: -wfl + 3, z: wk.z, r: wk.rx, id: wk.id, name: 'wreck' });
    });
    // caves
    var rockMat = lam(0x3a3f48);
    OC.CAVES.forEach(function (c) {
      var g = new T.Group(); g.position.set(c.x, -c.d, c.z);
      for (var k = 0; k < 8; k++) { var rk = new T.Mesh(new T.DodecahedronGeometry(c.r * (0.5 + R() * 0.5), 0), rockMat); var a = R() * 6.28; rk.position.set(Math.cos(a) * c.r * 0.9, (R() - 0.3) * c.r, Math.sin(a) * c.r * 0.9); rk.rotation.set(R() * 3, R() * 3, R() * 3); g.add(rk); }
      var mouth = new T.Mesh(new T.SphereGeometry(c.r * 0.75, 12, 10), new T.MeshBasicMaterial({ color: 0x010204 })); g.add(mouth);
      scene.add(g); featureHits.push({ x: c.x, y: -c.d, z: c.z, r: c.r, id: c.id, name: 'cave (max size ' + c.maxSize + ')' });
    });
    // vents
    OC.VENTS.forEach(function (v) {
      var fl = floorAt(v.x, v.z), cone = new T.Mesh(new T.ConeGeometry(3, 6, 8), lam(0x1a1512)); cone.position.set(v.x, -fl + 2.5, v.z); scene.add(cone);
      var n = 70, pos = new Float32Array(n * 3); for (var k = 0; k < n; k++) { pos[k * 3] = v.x + (R() - 0.5) * 2; pos[k * 3 + 1] = -fl + 5 + R() * 30; pos[k * 3 + 2] = v.z + (R() - 0.5) * 2; }
      var pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(pos, 3));
      var pts = new T.Points(pg, new T.PointsMaterial({ color: 0x555555, size: 1.6, transparent: true, opacity: 0.55, depthWrite: false })); scene.add(pts); sway.push({ smoke: pts, base: -fl + 5, x: v.x, z: v.z });
      featureHits.push({ x: v.x, y: -fl + 3, z: v.z, r: 5, id: v.id, name: 'hydrothermal vent' });
    });
    // biolum
    (function () { var b = OC.BIOLUM, n = 900, pos = new Float32Array(n * 3); for (var k = 0; k < n; k++) { var a = R() * 6.28, r = Math.sqrt(R()) * b.r; var x = b.x + Math.cos(a) * r, z = b.z + Math.sin(a) * r; var fl = floorAt(x, z); pos[k * 3] = x; pos[k * 3 + 1] = -(b.minD + R() * Math.max(2, fl - b.minD - 1)); pos[k * 3 + 2] = z; } var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); var p = new T.Points(g, new T.PointsMaterial({ color: 0x9a7cff, size: 0.9, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false })); scene.add(p); sway.push({ glow: p }); })();
    (function () { var dz = OC.DEADZONE, m = new T.Mesh(new T.SphereGeometry(dz.r, 16, 12), new T.MeshBasicMaterial({ color: 0x5a3a10, transparent: true, opacity: 0.13, depthWrite: false })); m.position.set(dz.x, -(dz.minD + 12), dz.z); m.scale.y = 0.5; scene.add(m); })();
    // tokovi
    OC.CURRENTS.forEach(function (c) {
      var n = 140, pos = new Float32Array(n * 3), items = [];
      for (var k = 0; k < n; k++) items.push({ t: R(), off: (R() - 0.5) * 2, d: R() });
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
      var p = new T.Points(g, new T.PointsMaterial({ color: 0x9fe8ff, size: 0.7, transparent: true, opacity: 0.5, blending: T.AdditiveBlending, depthWrite: false })); scene.add(p); sway.push({ cur: p, c: c, items: items });
    });
  })();
  var snow = (function () { var n = 1600, pos = new Float32Array(n * 3); for (var i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 120; pos[i * 3 + 1] = (Math.random() - 0.5) * 120; pos[i * 3 + 2] = (Math.random() - 0.5) * 120; } var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); var p = new T.Points(g, new T.PointsMaterial({ color: 0xbfe8ff, size: 0.12, transparent: true, opacity: 0.35, depthWrite: false })); scene.add(p); return p; })();

  // ── 3D Models ────────────────────────────────────────────────────────────
  function fishModel(colorHex, len, opts) {
    opts = opts || {}; var g = new T.Group(); var mat = lam(colorHex);
    var body = new T.Mesh(new T.SphereGeometry(0.5, 14, 10), mat); body.scale.set((opts.flat ? 0.9 : 0.42) * len, (opts.flat ? 0.12 : opts.tall ? 0.9 : 0.5) * len, len * (opts.long ? 1.6 : 1)); g.add(body);
    var tail = new T.Mesh(new T.ConeGeometry(0.28 * len, 0.45 * len, 3), mat); tail.rotation.order = 'YXZ'; tail.rotation.x = -Math.PI / 2; tail.scale.set(0.25, 1, 1); tail.position.z = -0.62 * len * (opts.long ? 1.6 : 1); if (!opts.flat) g.add(tail);
    var dorsal = new T.Mesh(new T.ConeGeometry(0.16 * len, (opts.shark ? 0.55 : 0.3) * len, 3), mat); dorsal.scale.set(0.25, 1, 1); dorsal.position.set(0, 0.3 * len, -0.05 * len); if (!opts.flat) g.add(dorsal);
    if (opts.hammer) { var hm = new T.Mesh(new T.BoxGeometry(0.9 * len, 0.1 * len, 0.18 * len), mat); hm.position.set(0, 0, 0.45 * len); g.add(hm); }
    if (opts.beak) { var bk = new T.Mesh(new T.ConeGeometry(0.08 * len, 0.3 * len, 6), mat); bk.rotation.x = Math.PI / 2; bk.position.set(0, -0.02 * len, 0.6 * len); g.add(bk); }
    if (opts.sword) { var sw = new T.Mesh(new T.ConeGeometry(0.04 * len, 0.8 * len, 5), mat); sw.rotation.x = Math.PI / 2; sw.position.set(0, 0, 0.85 * len); g.add(sw); }
    if (opts.belly) { var be = new T.Mesh(new T.SphereGeometry(0.5, 10, 8), lam(opts.belly)); be.scale.set(0.36 * len, 0.3 * len, 0.8 * len); be.position.y = -0.12 * len; g.add(be); }
    if (opts.flat) { var tl = new T.Mesh(new T.CylinderGeometry(0.03 * len, 0.01 * len, 0.9 * len, 4), mat); tl.rotation.x = Math.PI / 2; tl.position.z = -0.9 * len; g.add(tl); }
    if (opts.spines) for (var s = 0; s < 7; s++) { var sp = new T.Mesh(new T.ConeGeometry(0.03 * len, 0.5 * len, 4), lam(0xffffff)); sp.position.set(Math.sin(s) * 0.2 * len, 0.3 * len, (s - 3) * 0.1 * len); sp.rotation.z = Math.sin(s * 2) * 0.8; g.add(sp); }
    var eyeMat = new T.MeshBasicMaterial({ color: 0x111111 }); [-1, 1].forEach(function (sgn) { var e = new T.Mesh(new T.SphereGeometry(0.05 * len, 8, 6), eyeMat); e.position.set(sgn * (opts.hammer ? 0.44 : 0.14) * len, 0.08 * len, (opts.hammer ? 0.45 : 0.36) * len); g.add(e); });
    var hit = new T.Mesh(new T.SphereGeometry(Math.max(1.5, len * 0.8), 8, 6), new T.MeshBasicMaterial({ visible: false })); g.add(hit);
    g.userData.tail = tail; g.userData.hit = hit; g.userData.mat = mat; g.userData.body = body;
    return g;
  }
  var PAL = { sardine: 0xc8d8e8, anchovy: 0xb8c8d8, mackerel: 0x4a8aa8, snapper: 0xe07060, tuna: 0x3a5a8a, squid: 0xe8c0c8, shrimp: 0xf0b0a0, krill: 0xf0a0a0, 'flying fish': 0x80b0e0, 'salp chain': 0xd0f0ff, crab: 0xc84a2a, 'hermit crab': 0xb08050, lobster: 0x8a3a2a, 'sea urchin': 0x2a1a3a, clam: 0xd8d0c0, scallop: 0xe8a080, 'sea cucumber': 0x5a4a2a, starfish: 0xf07030, nudibranch: 0xf040c0, seahorse: 0xe8c060, 'tube worms': 0xffffff, parrotfish: 0x30c0a0, surgeonfish: 0x3060e0, wrasse: 0x60d070, goatfish: 0xf0d080, triggerfish: 0x6a6a30, cuttlefish: 0xa08870, pufferfish: 0xe8d060, lionfish: 0xd04030, 'sea snake': 0x202830, stingray: 0x7a7060, 'eagle ray': 0x3a3a40, 'conger eel': 0x6a7070, moray: 0x5a7a40, octopus: 0xb06040, grouper: 0x7a5a3a, barracuda: 0xa0b0c0, swordfish: 0x4a6a9a, anglerfish: 0x1a1a1a, 'sea turtle': 0x5a7a3a, 'manta ray': 0x1a1a22, sunfish: 0x9a9aa0, whale: 0x4a5a70, seal: 0x7a7068, dolphin: 0x8a98a8, 'man-o-war': 0xa0c0ff, 'great white': 0x6a7680, 'tiger shark': 0x7a7a60, hammerhead: 0x8a8a80, 'bull shark': 0x6a6a60, 'reef shark': 0x8a9090, orca: 0x101014 };
  function npcModel(name) {
    var sp = SP[name], sz = sp.size, len = 1.6 + 1.0 * Math.min(sz, 6) + (sz > 6 ? (sz - 6) * 0.8 : 0), col = PAL[name] || 0x889, g, i, m;
    function lines(n, length) { var lp = []; for (var k = 0; k < n; k++) { var a = k / n * 6.28; lp.push(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3, Math.cos(a) * 0.9, -length, Math.sin(a) * 0.9); } var lg = new T.BufferGeometry(); lg.setAttribute('position', new T.BufferAttribute(new Float32Array(lp), 3)); return new T.LineSegments(lg, new T.LineBasicMaterial({ color: col })); }
    switch (name) {
      case 'crab': case 'hermit crab': case 'lobster': case 'shrimp': g = new T.Group(); m = new T.Mesh(new T.BoxGeometry(1, 0.35, 0.7), lam(col)); g.add(m); var lg = lines(8, 0.5); lg.rotation.x = Math.PI / 2; lg.scale.set(1.2, 1, 1); g.add(lg); g.scale.setScalar(0.8 + sz); break;
      case 'sea urchin': g = new T.Group(); m = new T.Mesh(new T.IcosahedronGeometry(0.4, 1), lam(col)); g.add(m); for (i = 0; i < 14; i++) { var sp2 = new T.Mesh(new T.ConeGeometry(0.03, 0.9, 4), lam(0x1a1020)); var a = i * 2.4, b = i * 0.7; sp2.position.set(Math.cos(a) * Math.sin(b) * 0.4, Math.cos(b) * 0.4, Math.sin(a) * Math.sin(b) * 0.4); sp2.lookAt(sp2.position.clone().multiplyScalar(3)); sp2.rotateX(Math.PI / 2); g.add(sp2); } break;
      case 'clam': case 'scallop': g = new T.Group(); m = new T.Mesh(new T.SphereGeometry(0.5, 8, 6, 0, 6.283, 0, 1.57), lam(col)); m.scale.set(1.2, 0.5, 1); g.add(m); break;
      case 'sea cucumber': g = new T.Group(); m = new T.Mesh(new T.SphereGeometry(0.5, 8, 6), lam(col)); m.scale.set(0.5, 0.4, 1.8); g.add(m); break;
      case 'starfish': g = new T.Group(); for (i = 0; i < 5; i++) { var arm = new T.Mesh(new T.ConeGeometry(0.22, 1, 4), lam(col)); arm.rotation.z = -Math.PI / 2; arm.rotation.y = i / 5 * 6.28; arm.position.set(Math.cos(i / 5 * 6.28) * 0.5, 0.1, -Math.sin(i / 5 * 6.28) * 0.5); arm.rotation.set(Math.PI / 2, 0, -i / 5 * 6.28 - Math.PI / 2); g.add(arm); } break;
      case 'nudibranch': case 'seahorse': g = new T.Group(); m = new T.Mesh(new T.SphereGeometry(0.3, 6, 5), lam(col)); m.scale.set(0.6, name === 'seahorse' ? 2.2 : 0.6, name === 'seahorse' ? 0.6 : 1.4); g.add(m); break;
      case 'tube worms': g = new T.Group(); for (i = 0; i < 5; i++) { var tb = new T.Mesh(new T.CylinderGeometry(0.08, 0.1, 1.2, 5), lam(0xf0f0f0)); tb.position.set((i - 2) * 0.3, 0.6, (i % 2) * 0.3); g.add(tb); var tip = new T.Mesh(new T.SphereGeometry(0.13, 5, 4), new T.MeshBasicMaterial({ color: 0xff3030 })); tip.position.set((i - 2) * 0.3, 1.2, (i % 2) * 0.3); g.add(tip); } break;
      case 'octopus': case 'cuttlefish': case 'squid': g = new T.Group(); m = new T.Mesh(new T.SphereGeometry(0.5, 10, 8), lam(col)); m.scale.set(0.8, name === 'squid' ? 0.6 : 0.8, name === 'squid' ? 2.2 : 1); g.add(m); var ten = lines(8, 1.6); ten.position.y = -0.2; if (name !== 'octopus') { ten.rotation.x = -Math.PI / 2; ten.position.set(0, 0, 0.6); } g.add(ten); g.scale.setScalar(0.8 + sz); break;
      case 'man-o-war': g = new T.Group(); m = new T.Mesh(new T.SphereGeometry(0.6, 10, 8), lam(col, { transparent: true, opacity: 0.55 })); m.scale.set(1, 0.7, 1.6); g.add(m); var tn = lines(6, 5); g.add(tn); break;
      case 'stingray': case 'eagle ray': case 'manta ray': g = fishModel(col, len, { flat: true }); break;
      case 'sea turtle': g = new T.Group(); m = new T.Mesh(new T.SphereGeometry(0.5, 10, 8, 0, 6.283, 0, 1.57), lam(col)); m.scale.set(len * 0.5, len * 0.25, len * 0.6); g.add(m); var hd = new T.Mesh(new T.SphereGeometry(0.12 * len, 8, 6), lam(0x7a8a4a)); hd.position.set(0, 0.03 * len, 0.38 * len); g.add(hd); [-1, 1].forEach(function (sg) { var fl = new T.Mesh(new T.BoxGeometry(0.4 * len, 0.04 * len, 0.18 * len), lam(0x7a8a4a)); fl.position.set(sg * 0.4 * len, 0, 0.1 * len); fl.rotation.y = sg * 0.4; g.add(fl); }); g.userData.hit = new T.Mesh(new T.SphereGeometry(len, 6, 4), new T.MeshBasicMaterial({ visible: false })); g.add(g.userData.hit); break;
      case 'sunfish': g = fishModel(col, len, { tall: true }); break;
      case 'conger eel': case 'moray': case 'sea snake': g = fishModel(col, len * 0.8, { long: true }); break;
      case 'swordfish': g = fishModel(col, len, { sword: true }); break;
      case 'dolphin': g = fishModel(col, len, { beak: true, belly: 0xd8e0e8 }); break;
      case 'orca': g = fishModel(col, len, { shark: true, belly: 0xffffff }); break;
      case 'hammerhead': g = fishModel(col, len, { shark: true, hammer: true }); break;
      case 'great white': case 'tiger shark': case 'bull shark': case 'reef shark': g = fishModel(col, len, { shark: true, belly: name === 'great white' ? 0xe8ecf0 : null }); break;
      case 'lionfish': g = fishModel(col, len, { spines: true }); break;
      case 'pufferfish': g = new T.Group(); m = new T.Mesh(new T.IcosahedronGeometry(0.55, 0), lam(col)); g.add(m); g.scale.setScalar(0.8 + sz); break;
      case 'anglerfish': g = fishModel(col, len); var lure = new T.Mesh(new T.SphereGeometry(0.12, 6, 5), new T.MeshBasicMaterial({ color: 0xbfffdf })); lure.position.set(0, 0.5 * len, 0.5 * len); g.add(lure); g.userData.lure = lure; break;
      case 'seal': g = fishModel(col, len, { belly: 0xb0a898 }); break;
      case 'whale': g = fishModel(col, len, { belly: 0xb8c0c8 }); break;
      default: g = fishModel(col, len);
    }
    if (!g.userData.hit) { var hit = new T.Mesh(new T.SphereGeometry(Math.max(1.2, len * 0.7), 6, 4), new T.MeshBasicMaterial({ visible: false })); g.add(hit); g.userData.hit = hit; }
    g.userData.len = len; return g;
  }
  function makeSprite(w, h) { var cv = document.createElement('canvas'); cv.width = w; cv.height = h; var tx = new T.CanvasTexture(cv); var sp = new T.Sprite(new T.SpriteMaterial({ map: tx, transparent: true, depthTest: false })); sp.userData = { cv: cv, tx: tx, key: '' }; sp.center.set(0.5, 0); return sp; }
  function drawLabel(sp, f) {
    var key = [f.n, f.model, Math.round(f.hp), Math.round(f.en), f.sz, f.hid, f.bleed, f.suspect, f.cheat, f.alive, f.poison, f.cmdN].join('|'); if (sp.userData.key === key) return; sp.userData.key = key;
    var cv = sp.userData.cv, x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height);
    x.fillStyle = 'rgba(3,17,30,0.72)'; roundRect(x, 4, 24, cv.width - 8, 96, 12); x.fill();
    x.font = 'bold 30px sans-serif'; x.fillStyle = f.alive ? '#ffffff' : '#889'; x.textAlign = 'left'; x.fillText(f.n, 18, 60);
    x.font = '20px sans-serif'; x.fillStyle = '#9fd3ff'; x.fillText((f.model || '').slice(0, 20) + '  ·  ' + f.sz.toFixed(1) + (f.cmdN !== undefined ? '  ·  ' + f.cmdN + ' dec.' : ''), 18, 86);
    var pct = f.hp / Math.max(1, f.hpMax); x.fillStyle = 'rgba(255,255,255,0.15)'; x.fillRect(18, 98, 340, 8); x.fillStyle = pct > 0.5 ? '#6fe08a' : pct > 0.25 ? '#ffb04a' : '#ff5a4a'; x.fillRect(18, 98, 340 * pct, 8);
    var ep = f.en / Math.max(1, f.enMax); x.fillStyle = 'rgba(255,255,255,0.15)'; x.fillRect(18, 108, 340, 6); x.fillStyle = '#4ad0ff'; x.fillRect(18, 108, 340 * ep, 6);
    var badges = []; if (f.hid) badges.push(['HIDDEN', '#0a3a4a']); if (f.bleed) badges.push(['BLEEDING', '#5a0a2a']); if (f.poison) badges.push(['POISON', '#2a4a0a']); if (f.suspect) badges.push(['BOT?', '#5a3a0a']); if (f.cheat) badges.push(['CHEATER', '#6a0a0a']); if (!f.alive) badges.push(['DEAD', '#333']);
    var bx = cv.width - 14; x.font = 'bold 16px sans-serif'; badges.reverse().forEach(function (b) { var w = x.measureText(b[0]).width + 14; bx -= w + 4; x.fillStyle = b[1]; roundRect(x, bx, 36, w, 22, 5); x.fill(); x.fillStyle = '#fff'; x.fillText(b[0], bx + 7, 53); });
    sp.userData.tx.needsUpdate = true;
  }
  function drawTag(sp, title, sub, color) {
    var key = title + '|' + sub + '|' + color; if (sp.userData.key === key) return; sp.userData.key = key;
    var cv = sp.userData.cv, x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height);
    x.fillStyle = 'rgba(3,17,30,0.6)'; roundRect(x, 4, 40, cv.width - 8, 80, 10); x.fill();
    x.font = 'bold 26px sans-serif'; x.fillStyle = color || '#ffe0a0'; x.textAlign = 'center'; x.fillText(title, cv.width / 2, 72);
    x.font = '19px sans-serif'; x.fillStyle = '#cfe3f0'; x.fillText(sub || '', cv.width / 2, 100); sp.userData.tx.needsUpdate = true;
  }
  function drawBubble(sp, why) {
    if (sp.userData.key === why) return; sp.userData.key = why; var cv = sp.userData.cv, x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height);
    x.font = '22px sans-serif'; var lines = wrap(x, why, cv.width - 60).slice(0, 5); var h = lines.length * 28 + 28;
    x.fillStyle = 'rgba(255,255,255,0.93)'; roundRect(x, 10, cv.height - h, cv.width - 20, h - 14, 14); x.fill(); x.beginPath(); x.moveTo(cv.width / 2 - 12, cv.height - 14); x.lineTo(cv.width / 2 + 12, cv.height - 14); x.lineTo(cv.width / 2, cv.height); x.fill();
    x.fillStyle = '#0a2030'; x.textAlign = 'left'; lines.forEach(function (l, i) { x.fillText(l, 26, cv.height - h + 10 + (i + 1) * 28 - 6); }); sp.userData.tx.needsUpdate = true;
  }
  function wrap(x, text, maxW) { var words = text.split(/\s+/), lines = [], cur = ''; words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (x.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }); if (cur) lines.push(cur); return lines; }
  function roundRect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }

  // ── Dynamic objects ──────────────────────────────────────────────────────
  var fishObjs = {}, npcObjs = {}, schoolObjs = {}, plankObjs = {}, carrionObjs = {}, bloomObjs = {};
  var tinyGeo = new T.ConeGeometry(0.12, 0.6, 4); tinyGeo.rotateX(Math.PI / 2);
  function ensureFish(f) { var o = fishObjs[f.id]; if (o) return o; var len = 1.6 + 1.0 * f.sz, g = fishModel(COL[f.color] || 0x888888, 1); g.scale.setScalar(len); var label = makeSprite(384, 128), bubble = makeSprite(512, 192); scene.add(g); scene.add(label); scene.add(bubble); o = fishObjs[f.id] = { g: g, label: label, bubble: bubble, len: len, id: f.id }; g.userData.hit.userData.pick = { kind: 'fish', id: f.id }; return o; }
  function ensureNpc(a) { var o = npcObjs[a.id]; if (o) return o; var g = npcModel(a.sp); scene.add(g); o = npcObjs[a.id] = { g: g, sp: a.sp, id: a.id, tag: null }; g.userData.hit.userData.pick = { kind: 'npc', id: a.id }; return o; }
  function ensureSchool(a) { var o = schoolObjs[a.id]; if (o) return o; var sp = SP[a.sp], n = sp.size < 0.05 ? 90 : 60, s = 0.6 + sp.size * 1.2, im = new T.InstancedMesh(tinyGeo, lam(PAL[a.sp] || 0xc8d8e8), n), ph = []; for (var i = 0; i < n; i++) ph.push({ a: Math.random() * 6.28, r: 1 + Math.random() * (sp.size > 1 ? 8 : 5), y: (Math.random() - 0.5) * 3, w: 0.6 + Math.random() * 0.5 }); scene.add(im); o = schoolObjs[a.id] = { im: im, ph: ph, s: s, nmax: sp.n }; return o; }
  function ensurePlank(p) { var o = plankObjs[p.id]; if (o) return o; var n = 160, pos = new Float32Array(n * 3); for (var i = 0; i < n; i++) { var a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * p.r; pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = (Math.random() - 0.5) * p.r * 0.7; pos[i * 3 + 2] = Math.sin(a) * r; } var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); var pt = new T.Points(g, new T.PointsMaterial({ color: 0x9fe87a, size: 0.22, transparent: true, opacity: 0.7, depthWrite: false })); scene.add(pt); o = plankObjs[p.id] = { pt: pt }; return o; }
  function ensureBloom(j) { var o = bloomObjs[j.id]; if (o) return o; var grp = new T.Group(), items = []; var bell = new T.SphereGeometry(0.7, 10, 8, 0, 6.283, 0, 1.6), bm = lam(0xffa0d0, { transparent: true, opacity: 0.45, side: T.DoubleSide }); for (var i = 0; i < 36; i++) { var g = new T.Group(); g.add(new T.Mesh(bell, bm)); var lp = []; for (var k = 0; k < 5; k++) { var a = k / 5 * 6.28; lp.push(Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4, Math.cos(a) * 0.6, -3 - Math.random() * 2, Math.sin(a) * 0.6); } var lg = new T.BufferGeometry(); lg.setAttribute('position', new T.BufferAttribute(new Float32Array(lp), 3)); g.add(new T.LineSegments(lg, new T.LineBasicMaterial({ color: 0xffc0e0, transparent: true, opacity: 0.5 }))); var a2 = Math.random() * 6.28, r2 = Math.sqrt(Math.random()); items.push({ g: g, ox: Math.cos(a2) * r2, oz: Math.sin(a2) * r2, oy: (Math.random() - 0.5), ph: Math.random() * 6.28 }); grp.add(g); } scene.add(grp); return bloomObjs[j.id] = { grp: grp, items: items }; }
  function ensureCarrion(k) { var o = carrionObjs[k.id]; if (o) return o; var g = fishModel(k.sz > 15 ? 0x5a5a60 : 0x8a8a80, 1, k.sz > 15 ? { belly: 0x9a9a90 } : {}); g.scale.setScalar(1.6 + k.sz); g.rotation.z = Math.PI; scene.add(g); return carrionObjs[k.id] = { g: g }; }

  // ── State / interpolation ────────────────────────────────────────────────
  var A = null, B = null, tA = 0, tB = 0, LAG = 650, live = { ok: false, demo: false, lastErr: '' }, lastFeedN = 0, lastGen = null;
  function index(s) { s.idx = { fish: {}, npcs: {} }; s.fish.forEach(function (f) { s.idx.fish[f.id] = f; }); s.npcs.forEach(function (a) { s.idx.npcs[a.id] = a; }); return s; }
  function pushState(s) {
    index(s); var now = performance.now(); A = B; tA = tB; B = s; tB = now; if (!A) { A = s; tA = now - 500; }
    if (lastGen !== null && s.gen !== lastGen) { for (var id in fishObjs) { scene.remove(fishObjs[id].g); scene.remove(fishObjs[id].label); scene.remove(fishObjs[id].bubble); } fishObjs = {}; for (id in carrionObjs) scene.remove(carrionObjs[id].g); carrionObjs = {}; for (id in npcObjs) { scene.remove(npcObjs[id].g); if (npcObjs[id].tag) scene.remove(npcObjs[id].tag); } npcObjs = {}; for (id in schoolObjs) scene.remove(schoolObjs[id].im); schoolObjs = {}; $('end').style.display = 'none'; lastFeedN = 0; }
    lastGen = s.gen; updateUI(s);
  }
  function lerpA(a, b, t) { var d = ((b - a) % 360 + 540) % 360 - 180; return a + d * t; }
  function prev(listKey, id) { return (A && A.idx && A.idx[listKey][id]) || null; }

  // ── Camera ───────────────────────────────────────────────────────────────
  var cam = { mode: 'free', yaw: 2.4, pitch: -0.25, pos: new T.Vector3(520, -20, 520), follow: null, followNpc: null, dist: 16, oyaw: 0.6, opitch: 0.3 }, sharkIdx = -1;
  var keys = {}, drag = null;
  window.addEventListener('keydown', function (e) { if (e.target.tagName === 'INPUT') return; keys[e.code] = true; var k = e.key; if (k >= '0' && k <= '9') { var idx = k === '0' ? 9 : (+k - 1); var f = (B && B.fish[idx]); if (f) selectFish(f.id, true); } if (k === 'f' || k === 'F') { if (cam.follow) setMode(cam.mode === 'follow' ? 'free' : 'follow'); } if (k === 'h' || k === 'H') { document.querySelectorAll('.panel,#mini').forEach(function (p) { p.style.visibility = p.style.visibility === 'hidden' ? '' : 'hidden'; }); } });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; });
  canvas.addEventListener('mousedown', function (e) { drag = { x: e.clientX, y: e.clientY, moved: 0 }; });
  window.addEventListener('mousemove', function (e) { if (!drag) return; var dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy); if (cam.mode === 'follow' || cam.mode === 'npc') { cam.oyaw -= dx * 0.005; cam.opitch = OC.clamp(cam.opitch + dy * 0.005, -1.2, 1.4); } else { cam.yaw -= dx * 0.0035; cam.pitch = OC.clamp(cam.pitch - dy * 0.0035, -1.5, 1.5); } });
  window.addEventListener('mouseup', function (e) { if (drag && drag.moved < 4) pick(e); drag = null; });
  canvas.addEventListener('wheel', function (e) { if (cam.mode === 'follow' || cam.mode === 'npc') cam.dist = OC.clamp(cam.dist * (e.deltaY > 0 ? 1.12 : 0.9), 4, 160); else { var dir = camDir(); cam.pos.addScaledVector(dir, e.deltaY > 0 ? -8 : 8); } e.preventDefault(); }, { passive: false });
  function camDir() { return new T.Vector3(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), Math.cos(cam.yaw) * Math.cos(cam.pitch)); }
  var ray = new T.Raycaster(), mouse = new T.Vector2();
  function pick(e) { mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1); ray.setFromCamera(mouse, camera); var hits = [], id; for (id in fishObjs) if (fishObjs[id].g.visible) hits.push(fishObjs[id].g.userData.hit); for (id in npcObjs) if (npcObjs[id].g.visible) hits.push(npcObjs[id].g.userData.hit); var r = ray.intersectObjects(hits, false); if (r.length) { var p = r[0].object.userData.pick; if (p.kind === 'fish') selectFish(p.id, true); else followNpc(p.id); } }
  function selectFish(id, follow) { cam.follow = id; cam.followNpc = null; if (follow) setMode('follow'); updateUI(B); }
  function followNpc(id) { cam.followNpc = id; cam.mode = 'npc'; ['free', 'follow', 'over', 'shark'].forEach(function (k) { $('b-' + k).classList.toggle('on', k === 'shark'); }); var a = B && B.idx.npcs[id]; if (a) toast(spLabel(a.sp) + ' (' + a.id + ') — ' + stateText(a)); updateUI(B); }
  function setMode(m) { cam.mode = m; ['free', 'follow', 'over', 'shark'].forEach(function (k) { $('b-' + k).classList.toggle('on', k === m); }); if (m === 'over') { cam.pos.set(W / 2, 420, L + 420); cam.yaw = Math.PI; cam.pitch = -0.72; cam.mode = 'free'; $('b-over').classList.add('on'); } }
  function nextShark() { if (!B) return; var sh = B.npcs.filter(function (a) { return SP[a.sp].kind === 'shark'; }); if (!sh.length) { toast('No sharks'); return; } sharkIdx = (sharkIdx + 1) % sh.length; followNpc(sh[sharkIdx].id); }
  function updateCamera(dt) {
    if (cam.mode === 'follow' || cam.mode === 'npc') {
      var o = cam.mode === 'npc' ? npcObjs[cam.followNpc] : fishObjs[cam.follow], tgt = o && o.g.visible && o.g;
      if (tgt) { var off = new T.Vector3(Math.sin(cam.oyaw) * Math.cos(cam.opitch), Math.sin(cam.opitch), Math.cos(cam.oyaw) * Math.cos(cam.opitch)).multiplyScalar(cam.dist + (o.g.userData.len || 3) * 1.6); var want = tgt.position.clone().add(off); want.y = Math.min(want.y, 2); want.y = Math.max(want.y, -floorAt(OC.clamp(want.x, 0, W), OC.clamp(want.z, 0, L)) + 1); cam.pos.lerp(want, 1 - Math.pow(0.001, dt)); camera.position.copy(cam.pos); camera.lookAt(tgt.position); return; }
    }
    var sp = (keys.ShiftLeft || keys.ShiftRight ? 110 : 24) * dt, dir = camDir(), right = new T.Vector3(dir.z, 0, -dir.x).normalize();
    if (keys.KeyW || keys.ArrowUp) cam.pos.addScaledVector(dir, sp); if (keys.KeyS || keys.ArrowDown) cam.pos.addScaledVector(dir, -sp);
    if (keys.KeyA || keys.ArrowLeft) cam.pos.addScaledVector(right, sp); if (keys.KeyD || keys.ArrowRight) cam.pos.addScaledVector(right, -sp);
    if (keys.KeyQ) cam.pos.y -= sp; if (keys.KeyE || keys.Space) cam.pos.y += sp;
    cam.pos.x = OC.clamp(cam.pos.x, -80, W + 80); cam.pos.z = OC.clamp(cam.pos.z, -80, L + 80); cam.pos.y = OC.clamp(cam.pos.y, -floorAt(OC.clamp(cam.pos.x, 0, W), OC.clamp(cam.pos.z, 0, L)) + 0.8, 500);
    camera.position.copy(cam.pos); camera.lookAt(cam.pos.clone().add(dir));
  }

  // ── UI ───────────────────────────────────────────────────────────────────
  function fmt(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  function esc(s) { return (s === undefined || s === null ? '' : String(s)).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(m) { var t = $('toast'); t.textContent = m; t.style.opacity = 1; clearTimeout(t._h); t._h = setTimeout(function () { t.style.opacity = 0; }, 3000); }
  function stateText(a) { return a.st === 'hunt' ? 'HUNTING ' + (a.tg || '') : a.st === 'scavenge' ? 'scavenging' : a.st === 'rest' ? 'resting (full)' : a.st === 'patrol' ? 'patrolling' : a.st === 'flee' ? 'fleeing' : a.st === 'forage' ? 'foraging' : a.st === 'idle' ? 'idle' : a.st || ''; }
  function ago(ms, now) { if (!ms) return '—'; var s = Math.max(0, Math.round((now - ms) / 1000)); return s < 60 ? s + 's ago' : Math.floor(s / 60) + 'm ago'; }
  var showSpecies = false;
  function updateUI(s) {
    if (!s) return; var now = Date.now();
    var st = $('t-status'); st.textContent = (live.demo ? 'DEMO · ' : 'LIVE · ') + (s.status === 'running' ? 'RUNNING' : s.status === 'lobby' ? 'LOBBY' + (s.lobbyIn !== null ? ' · starts in ' + fmt(s.lobbyIn) : ' · waiting for START') : 'FINISHED'); st.className = 'st ' + (live.demo ? 'demo' : s.status === 'running' ? 'run' : s.status === 'finished' ? 'fin' : '');
    $('t-time').textContent = '⏱ ' + fmt(s.timeLeft) + (s.famine ? ' · famine' : '');
    $('t-phase').textContent = (s.phase === 'day' ? '☀ day' : s.phase === 'night' ? '☾ night' : s.phase === 'dusk' ? '🌆 dusk' : '🌅 dawn') + ' ' + Math.round(s.light * 100) + '%';
    var alive = s.fish.filter(function (f) { return f.alive; }).length, calls = s.fish.reduce(function (a, f) { return a + (f.cmdN || 0); }, 0);
    $('t-alive').textContent = '🐟 ' + alive + '/' + s.fish.length + ' alive · 🦈 ' + s.npcs.filter(function (a) { return SP[a.sp].kind === 'shark'; }).length + ' · animals ' + s.npcs.length; $('t-calls').textContent = '🧠 ' + calls + ' decisions'; $('t-gen').textContent = 'game #' + s.gen;
    var html = ''; s.fish.slice().sort(function (a, b) { return (b.alive - a.alive) || (b.score - a.score); }).forEach(function (f) {
      html += '<div class="f' + (f.id === cam.follow ? ' sel' : '') + (f.alive ? '' : ' dead') + '" data-id="' + f.id + '"><div class="n"><span><span class="sw" style="background:' + (COLHEX[f.color] || '#888') + '"></span>' + esc(f.n) + '</span><span style="font-weight:400;color:#9bb8cc">' + f.sz.toFixed(2) + ' · ' + f.score + '</span></div>' +
        '<div class="m">' + esc(f.model) + (f.hid ? '<span class="badge hid">HIDDEN</span>' : '') + (f.bleed ? '<span class="badge bl">BLEEDING</span>' : '') + (f.poison ? '<span class="badge po">POISON</span>' : '') + (f.suspect ? '<span class="badge sus">BOT?</span>' : '') + (f.cheat ? '<span class="badge cheat">CHEATER</span>' : '') + (!f.alive ? ' · ' + esc(f.cause || 'dead') : '') + '</div>' +
        '<div class="calls">🧠 ' + (f.cmdN || 0) + ' decisions · /me ' + (f.meN || 0) + '× · last ' + (f.alive ? (f.lastCmdMs ? ago(f.lastCmdMs, now) : '—') : '—') + (f.alive && f.idle > 50 ? ' <span style="color:#ffb28a">⚠ idle ' + f.idle + 's</span>' : '') + '</div>' +
        '<div class="bar hp"><i style="width:' + Math.round(100 * f.hp / Math.max(1, f.hpMax)) + '%"></i></div><div class="bar en"><i style="width:' + Math.round(100 * f.en / Math.max(1, f.enMax)) + '%"></i></div>' +
        (f.why ? '<div class="why">“' + esc(f.why) + '”</div>' : '') + '</div>';
    });
    if (!s.fish.length) html = '<div style="color:#8fb0c4;padding:6px">No fish yet. Agents join via POST /claim.</div>';
    $('fish').innerHTML = html;
    Array.prototype.forEach.call(document.querySelectorAll('#fish .f'), function (el) { el.onclick = function () { selectFish(el.getAttribute('data-id'), true); }; });
    if (s.feed && s.feed.length !== lastFeedN) { lastFeedN = s.feed.length; $('feed').innerHTML = s.feed.slice().reverse().map(function (e) { return '<div><b>' + fmt(e.t / 4) + '</b>' + esc(e.txt) + '</div>'; }).join(''); }
    var ins = $('insp');
    if (cam.mode === 'npc' && cam.followNpc) { var a = s.idx.npcs[cam.followNpc], spd = a && SP[a.sp]; if (a) { ins.style.display = 'block'; ins.innerHTML = '<b>' + esc(spLabel(a.sp).toUpperCase()) + '</b> <span style="color:#8fb0c4">' + a.id + '</span><br>size <b>' + spd.size + '</b> · type <b>' + spd.kind + '</b>' + (a.hp !== undefined ? ' · hp <b>' + a.hp + '</b>' : '') + (a.n !== undefined ? ' · school <b>' + a.n + '</b>' : '') + '<br>state: <b>' + esc(stateText(a)) + '</b><br>pos ' + Math.round(a.x) + ', ' + Math.round(a.z) + ' · depth ' + a.d.toFixed(1) + ' m · speed ' + a.spd + ' m/s' + (OC.SPECIES_INFO[a.sp] ? '<br><i style="color:#bcd">' + esc(OC.SPECIES_INFO[a.sp]) + '</i>' : '') + (spd.prey ? '<br>prey up to size <b>' + spd.prey.max + '</b>, senses: ' + spd.prey.detect.join(', ') + (spd.prey.smell ? ', smell ' + spd.prey.smell + ' m' : '') : '') + (spd.defense ? '<br>defense: <b>' + spd.defense.type + '</b>' : '') + (spd.food && spd.food.e ? '<br>food: ' + spd.food.e + ' energy' + (spd.food.minHunter ? ' (hunter ≥ ' + spd.food.minHunter + ')' : '') : ''); } }
    else { var f = cam.follow && s.idx.fish[cam.follow]; if (f) { ins.style.display = 'block'; var rec = (f.recent || []).slice().reverse(); ins.innerHTML = '<b>' + esc(f.n) + '</b> <span style="color:#8fb0c4">' + esc(f.model) + ' · ' + f.id + '</span><br>hp <b>' + f.hp + '/' + f.hpMax + '</b> · energy <b>' + f.en + '/' + f.enMax + '</b> · stamina <b>' + f.st + '</b><br>size <b>' + f.sz + '</b> · kills <b>' + f.kills + '</b> · animals <b>' + f.npcKills + '</b> · eaten <b>' + f.ate + '</b><br>pos ' + Math.round(f.x) + ', ' + Math.round(f.z) + ' · depth ' + f.d.toFixed(1) + ' m · heading ' + f.h + '°<br>command: <b>' + f.act + '</b> / ' + f.speed + (f.target ? ' → ' + esc(f.target) : '') + '<br>zone: ' + esc(zoneOf(f)) + '<br>🧠 decisions <b>' + (f.cmdN || 0) + '</b> · /me ' + (f.meN || 0) + '× · last ' + ago(f.lastCmdMs, now) + (f.suspect ? ' <span class="badge sus">BOT?</span>' : '') + (rec.length ? '<div style="margin-top:5px;color:#8fd3ff;font-size:10px;letter-spacing:1px">RECENT DECISIONS (why)</div>' + rec.map(function (r) { return '<div class="wl"><i>' + fmt(r.t / 4) + ' ' + esc(r.act) + '</i>' + esc(r.why) + '</div>'; }).join('') : ''); } else ins.style.display = 'none'; }
    if (showSpecies) { var cnt = {}; s.npcs.forEach(function (a) { var c = cnt[a.sp] || (cnt[a.sp] = { n: 0, ind: 0 }); c.ind++; c.n += a.n !== undefined ? a.n : 1; }); $('species-body').innerHTML = Object.keys(cnt).sort(function (a, b) { return SP[b].size - SP[a].size; }).map(function (k) { return '<div class="sp" data-sp="' + esc(k) + '"><span>' + esc(spLabel(k)) + ' <span class="k">' + esc(SP[k].kind) + '</span></span><span>' + (cnt[k].n !== cnt[k].ind ? cnt[k].ind + ' schools · ' + cnt[k].n : cnt[k].n) + '</span></div>'; }).join('') + '<div style="color:#8fb0c4;margin-top:4px">' + Object.keys(cnt).length + ' species · click = jump to nearest</div>'; Array.prototype.forEach.call(document.querySelectorAll('#species .sp'), function (el) { el.onclick = function () { var k = el.getAttribute('data-sp'), best = null, bd = 1e9; s.npcs.forEach(function (a) { if (a.sp !== k) return; var d = Math.hypot(a.x - cam.pos.x, a.z - cam.pos.z); if (d < bd) { bd = d; best = a; } }); if (!best) return; if (SP[k].kind === 'school') { cam.pos.set(best.x + 10, -best.d, best.z + 10); cam.yaw = Math.atan2(best.x - cam.pos.x, best.z - cam.pos.z); cam.pitch = 0; setMode('free'); } else followNpc(best.id); }; }); }
    if (ADMIN) updateAdmin(s);
    if (s.status === 'finished' && s.ranks && $('end').style.display !== 'flex' && !$('end').dataset['g' + s.gen]) { $('end').dataset['g' + s.gen] = 1; $('end').style.display = 'flex'; $('end-body').innerHTML = '<p style="margin-bottom:8px">Winner: <b style="color:#8fd3ff">' + esc(s.winner || '—') + '</b></p><table><tr><th>#</th><th>fish</th><th>model</th><th>score</th><th>size</th><th>kills</th><th>animals</th><th>eaten</th><th>decisions</th><th>fate</th></tr>' + s.ranks.map(function (r) { return '<tr><td>' + r.rank + '</td><td>' + esc(r.name) + (r.cheat ? ' <span class="badge cheat">CHEATER</span>' : '') + (r.suspect ? ' <span class="badge sus">BOT?</span>' : '') + '</td><td>' + esc(r.model) + '</td><td>' + r.score + '</td><td>' + r.size + '</td><td>' + r.kills + '</td><td>' + (r.animalsEaten || 0) + '</td><td>' + r.eaten + '</td><td>' + r.decisions + '</td><td>' + (r.alive ? 'survived' : esc(r.cause || '')) + '</td></tr>'; }).join('') + '</table>'; }
    $('conn').textContent = live.demo ? 'local demo (engine running in browser)' : live.ok ? 'connected · v' + (s.v || 5) + ' · ' + (typeof OCEAN_BUILT !== 'undefined' ? OCEAN_BUILT : '') : 'disconnected: ' + live.lastErr;
  }
  function zoneOf(f) { var z = []; var hi = OC.hideInfo(f); if (hi.src) z.push(hi.src); var rf = OC.reefAt(f.x, f.z, f.d); if (rf && z.indexOf(rf.id) < 0) z.push(rf.id); var v = OC.ventAt(f.x, f.z, f.d); if (v.dist < 14) z.push('vent'); if (OC.inBiolum(f.x, f.z, f.d)) z.push('glowing water'); if (OC.inDeadzone(f.x, f.z, f.d)) z.push('dead zone'); if (f.d < 4) z.push('surface'); var cu = OC.currentAt(f.x, f.z, f.d); if (cu.id) z.push('current ' + cu.id); return z.length ? z.join(', ') : 'open water'; }
  $('b-free').onclick = function () { setMode('free'); }; $('b-follow').onclick = function () { if (!cam.follow && B && B.fish[0]) cam.follow = B.fish[0].id; if (cam.follow) setMode('follow'); else toast('No fish to follow'); }; $('b-over').onclick = function () { setMode('over'); }; $('b-shark').onclick = nextShark;
  $('b-species').onclick = function () { showSpecies = !showSpecies; this.classList.toggle('on', showSpecies); $('species').style.display = showSpecies ? 'block' : 'none'; $('insp').style.top = showSpecies ? '' : '258px'; if (showSpecies) $('insp').style.display = 'none'; updateUI(B); };
  var showLabels = true, showWhy = true; $('b-labels').onclick = function () { showLabels = !showLabels; this.classList.toggle('on', showLabels); }; $('b-why').onclick = function () { showWhy = !showWhy; this.classList.toggle('on', showWhy); };
  $('b-demo').onclick = function () { setDemo(!live.demo); };
  $('url').value = API; $('url').onchange = function () { API = this.value.trim() || DEFAULT_API; try { localStorage.setItem('ocean.api', API); } catch (e) { } fails = 0; if (live.demo) setDemo(false); };

  // ── Admin ────────────────────────────────────────────────────────────────
  function adminCall(path) { return fetch(API + path + (path.indexOf('?') >= 0 ? '&' : '?') + 'admin=' + encodeURIComponent(ADMIN), { cache: 'no-store' }).then(function (r) { return r.json(); }); }
  function updateAdmin(s) { $('admin').style.display = 'block'; $('a-status').textContent = s.status === 'lobby' ? 'LOBBY' : s.status === 'running' ? 'RUNNING' : 'FINISHED'; $('a-gen').textContent = s.gen; $('a-seats').textContent = s.fish.length + '/10'; $('a-auto').textContent = s.status !== 'lobby' ? '—' : s.lobbyArmed ? 'in ' + fmt(s.lobbyIn) : 'disabled (waiting for you)'; $('a-start').disabled = s.status !== 'lobby' || s.fish.length < 2; $('a-start').title = s.fish.length < 2 ? 'at least 2 fish required' : ''; }
  if (ADMIN) {
    $('a-start').onclick = function () { adminCall('/start?in=0').then(function (r) { $('a-msg').textContent = r.ok ? 'START! status: ' + r.status + ', fish: ' + r.fish : 'failed: ' + JSON.stringify(r); toast(r.ok ? 'Game starting' : 'Start failed'); }); };
    $('a-start60').onclick = function () { adminCall('/start?in=60').then(function (r) { $('a-msg').textContent = r.ok ? 'starts in 60s' : 'failed: ' + JSON.stringify(r); }); };
    $('a-reset').onclick = function () { if (!confirm('Start a new game? The current game ends and all keys expire.')) return; adminCall('/reset').then(function (r) { $('a-msg').textContent = r.ok ? 'new game #' + r.gen + ' (lobby)' : 'failed: ' + JSON.stringify(r); }); };
    $('a-hide').onclick = function () { $('admin').style.display = 'none'; ADMIN_HIDDEN = true; };
    $('a-log').onclick = function () { $('calls').style.display = 'block'; loadLog(); };
    $('c-close').onclick = function () { $('calls').style.display = 'none'; };
  }
  var ADMIN_HIDDEN = false; var _updAdmin = updateAdmin; updateAdmin = function (s) { if (ADMIN_HIDDEN) return; _updAdmin(s); };
  function loadLog() {
    adminCall('/log').then(function (r) {
      if (!r.fish) { $('calls-body').innerHTML = 'error: ' + esc(JSON.stringify(r)); return; }
      var now = r.now || Date.now();
      $('calls-body').innerHTML = '<div style="color:#8fb0c4;margin-bottom:6px">Every accepted /cmd = one decision. The server records timestamp, command, and "why" for every decision; uniform intervals or repeated reasons trigger the BOT? flag. Status: ' + esc(r.status) + ', tick ' + r.tick + '.</div><table><tr><th>fish</th><th>model</th><th>decisions</th><th>/me</th><th>interval</th><th>recent decisions (time · cmd · why)</th></tr>' + r.fish.map(function (f) {
        var iv = []; for (var i = 1; i < (f.cmdMs || []).length; i++) iv.push((f.cmdMs[i] - f.cmdMs[i - 1]) / 1000); var m = iv.length ? iv.reduce(function (a, b) { return a + b; }, 0) / iv.length : 0, sd = iv.length ? Math.sqrt(iv.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / iv.length) : 0;
        return '<tr' + (f.alive ? '' : ' style="opacity:.5"') + '><td><b>' + esc(f.n) + '</b>' + (f.suspect ? ' <span class="badge sus">BOT?</span>' : '') + (f.cheat ? ' <span class="badge cheat">CHEATER</span>' : '') + '<br><span style="color:#8fb0c4">' + esc(f.ip || '') + '</span></td><td>' + esc(f.model) + '</td><td><b>' + f.cmdN + '</b><br><span style="color:#8fb0c4">' + ago(f.lastCmdMs, now) + '</span></td><td>' + f.meN + '</td><td>' + (iv.length ? m.toFixed(1) + ' s<br><span style="color:#8fb0c4">±' + sd.toFixed(1) + '</span>' : '—') + '</td><td>' + (f.whyLog || []).slice(-8).reverse().map(function (w) { return '<div class="wl"><i>' + (w.ms ? new Date(w.ms).toLocaleTimeString('en-US', { hour12: false }) : fmt(w.t / 4)) + ' · ' + esc(w.act) + '/' + esc(w.sp) + '</i> ' + esc(w.why) + '</div>'; }).join('') + '</td></tr>';
      }).join('') + '</table><div style="margin-top:6px"><button onclick="document.getElementById(\'a-log\').click()">refresh</button> <span style="color:#8fb0c4">unauthenticated /state views by IP: ' + esc(JSON.stringify(r.stateHits || {})) + '</span></div>';
    }).catch(function (e) { $('calls-body').innerHTML = 'error: ' + esc(e.message); });
  }

  // ── Minimap ──────────────────────────────────────────────────────────────
  var mini = $('mini'), mctx = mini.getContext('2d'), MS = 240, miniBg = (function () { var c = document.createElement('canvas'); c.width = 120; c.height = 120; var x = c.getContext('2d'), im = x.createImageData(120, 120); for (var j = 0; j < 120; j++) for (var i = 0; i < 120; i++) { var d = floorAt(i * W / 120 + 3, j * L / 120 + 3), t = OC.clamp((d - 8) / 172, 0, 1), o = (j * 120 + i) * 4; im.data[o] = 60 + 130 * (1 - t); im.data[o + 1] = 110 + 90 * (1 - t); im.data[o + 2] = 150 + 60 * (1 - t); im.data[o + 3] = 255; } x.putImageData(im, 0, 0); return c; })();
  mini.addEventListener('click', function (e) { var r = mini.getBoundingClientRect(); var x = (e.clientX - r.left) / r.width * W, z = (e.clientY - r.top) / r.height * L; cam.pos.set(x, -Math.min(25, floorAt(x, z) - 5), z + 45); cam.yaw = Math.PI; cam.pitch = -0.3; setMode('free'); });
  function circ(x, z, r, fill) { mctx.fillStyle = fill; mctx.beginPath(); mctx.arc(x * MS / W, z * MS / L, r, 0, 6.28); mctx.fill(); }
  function drawMini(s) {
    var k = MS / W; mctx.clearRect(0, 0, MS, MS); mctx.drawImage(miniBg, 0, 0, MS, MS);
    OC.KELP.forEach(function (q) { circ(q.x, q.z, q.r * k, 'rgba(60,160,60,.45)'); }); OC.SEAGRASS.forEach(function (q) { circ(q.x, q.z, q.r * k, 'rgba(90,190,80,.3)'); });
    mctx.fillStyle = 'rgba(70,60,30,.6)'; mctx.fillRect(0, OC.MANGROVE.z0 * k, OC.MANGROVE.x1 * k, (OC.MANGROVE.z1 - OC.MANGROVE.z0) * k);
    OC.REEFS.forEach(function (q) { circ(q.x, q.z, q.r * k, 'rgba(240,120,110,.5)'); }); OC.WRECKS.forEach(function (w) { mctx.fillStyle = 'rgba(120,80,40,.9)'; mctx.fillRect(w.x * k - 3, w.z * k - 2, 6, 4); });
    OC.CAVES.forEach(function (c) { circ(c.x, c.z, 2, '#000'); }); OC.VENTS.forEach(function (v) { circ(v.x, v.z, 1.6, '#ff8040'); }); OC.SARGASSUM.forEach(function (v) { circ(v.x, v.z, v.r * k, 'rgba(160,130,40,.6)'); });
    circ(OC.BIOLUM.x, OC.BIOLUM.z, OC.BIOLUM.r * k, 'rgba(160,120,255,.35)'); circ(OC.DEADZONE.x, OC.DEADZONE.z, OC.DEADZONE.r * k, 'rgba(120,80,20,.4)');
    if (!s) return;
    s.blooms.forEach(function (j) { circ(j.x, j.z, j.r * k, 'rgba(255,160,220,.45)'); });
    s.plankton.forEach(function (q) { if (q.amt > 2) circ(q.x, q.z, q.r * k * 0.6, 'rgba(160,230,120,.5)'); });
    s.carrion.forEach(function (q) { circ(q.x, q.z, q.sz > 15 ? 4 : 1.5, 'rgba(200,200,190,.8)'); });
    s.npcs.forEach(function (a) { var sp = SP[a.sp]; if (sp.kind === 'school') { if (a.n > 0) circ(a.x, a.z, 1 + Math.min(2, a.n / 100), 'rgba(220,230,240,.6)'); } else if (sp.kind === 'shark' || sp.kind === 'pack' || sp.kind === 'hunter') { mctx.save(); mctx.translate(a.x * k, a.z * k); mctx.rotate(a.h * D2R); mctx.fillStyle = a.sp === 'orca' ? '#ff5050' : sp.kind === 'shark' ? '#f0f4f8' : '#a0c8ff'; var r = sp.kind === 'shark' ? 2 + sp.size * 0.25 : 2; mctx.beginPath(); mctx.moveTo(0, -r * 1.6); mctx.lineTo(r, r); mctx.lineTo(-r, r); mctx.closePath(); mctx.fill(); mctx.restore(); } else if (sp.size >= 2) circ(a.x, a.z, 1.2, 'rgba(255,255,255,.35)'); });
    s.fish.forEach(function (f) { if (!f.alive) return; circ(f.x, f.z, f.id === cam.follow ? 4.5 : 3, COLHEX[f.color] || '#fff'); if (f.id === cam.follow) { mctx.strokeStyle = '#fff'; mctx.stroke(); } });
    mctx.strokeStyle = '#8fd3ff'; mctx.beginPath(); mctx.moveTo(cam.pos.x * k, cam.pos.z * k); mctx.lineTo((cam.pos.x + Math.sin(cam.yaw) * 40) * k, (cam.pos.z + Math.cos(cam.yaw) * 40) * k); mctx.stroke(); mctx.fillStyle = '#8fd3ff'; mctx.fillRect(cam.pos.x * k - 2, cam.pos.z * k - 2, 4, 4);
  }

  // ── Connection / demo ────────────────────────────────────────────────────
  var fails = 0, pollTimer = null;
  function poll() {
    if (live.demo) return;
    var ctrl = new AbortController(); var to = setTimeout(function () { ctrl.abort(); }, 8000);
    fetch(API + '/state' + (ADMIN ? '?admin=' + encodeURIComponent(ADMIN) : ''), { signal: ctrl.signal, cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (s) { clearTimeout(to); if (s.error) throw new Error(s.error); live.ok = true; fails = 0; pushState(s); pollTimer = setTimeout(poll, 1000); })
      .catch(function (e) { clearTimeout(to); live.ok = false; live.lastErr = (e && e.message) || 'error'; fails++; if (fails >= 3 && !B) { setDemo(true); toast('Arena unreachable — demo mode'); return; } updateUI(B); pollTimer = setTimeout(poll, 1500); });
  }
  var demo = null;
  function setDemo(on) { live.demo = on; $('b-demo').classList.toggle('on', on); if (pollTimer) clearTimeout(pollTimer); if (on) { demo = makeDemo(); A = B = null; lastGen = null; } else { demo = null; A = B = null; lastGen = null; fails = 0; poll(); } }
  function makeDemo() {
    var g = OC.newGame(Math.floor(Math.random() * 900) + 100, Date.now() % 100000); var names = ['Nerea', 'Bruno', 'Goldie', 'Silent', 'Maya', 'Oscar', 'Vida', 'Luke', 'Ada', 'Roc'], models = ['model-A', 'model-B', 'model-C', 'model-D', 'model-E', 'model-F', 'model-G', 'model-H', 'model-I', 'model-J'], pol = ['smart', 'hunter', 'feeder', 'random', 'smart', 'feeder', 'camper', 'hunter', 'smart', 'feeder'], cols = Object.keys(COL);
    for (var i = 0; i < 10; i++) { var f = OC.addFish(g, names[i], models[i] + ' (demo ' + pol[i] + ')', cols[i % 7], 'k' + i); f.pol = pol[i]; }
    var now = Date.now(); OC.start(g, now); var next = {}; g.fish.forEach(function (f) { next[f.id] = 4 + Math.floor(Math.random() * 30); });
    return { g: g, next: next, lastSnap: 0 };
  }
  function demoDecide(g, f, me) {
    var pol = f.pol, you = me.you, see = me.see, b = { why: '' }, R = Math.random;
    var fishSeen = see.filter(function (s) { return s.kind === 'fish'; }), bigger = fishSeen.filter(function (s) { return s.size > you.size * 1.2; }), smaller = fishSeen.filter(function (s) { return s.size < you.size / 1.6; });
    var pred = see.filter(function (s) { return /shark|orca|barracuda|grouper|dolphin|seal/.test(s.kind) && s.size > you.size * 1.4; })[0];
    var food = see.filter(function (s) { return /school|plankton|carcass|crab|shrimp|snail|urchin|scallop|clam|salp/.test(s.kind) && !(s.kind === 'plankton cloud' && you.size > 2.5) && !(/mackerel|snapper|tuna/.test(s.kind) && you.size < 1.5); })[0];
    if (pred && pred.dist < 45) { b.act = 'flee'; b.target = pred.id; b.speed = 'sprint'; b.dur = 15; b.why = pred.kind + ' at ' + Math.round(pred.dist) + ' m — sprinting away.'; return b; }
    if (pol === 'random') { b.act = 'swim'; b.heading = R() * 360; b.pitch = (R() - 0.5) * 40; b.speed = 'cruise'; b.dur = 20; b.why = 'Swimming randomly to see what turns up.'; return b; }
    if (pol === 'camper') { if (you.zone.join().indexOf('reef') < 0) { b.act = 'swim'; b.goto = [200, 260, 14]; b.speed = 'cruise'; b.dur = 60; b.why = 'Heading to the reef to take cover.'; } else { b.act = you.energy < you.energyMax * 0.5 ? 'feed' : 'hide'; b.dur = 60; b.why = b.act === 'feed' ? 'Hungry, picking snails off the reef.' : 'Hidden in the reef, lying low.'; } return b; }
    if (bigger.length && bigger[0].dist < 25) { if (pol === 'smart') { var k = OC.KELP[1]; b.act = 'swim'; b.goto = [k.x, k.z, 18]; b.speed = 'sprint'; b.why = 'Larger fish ' + bigger[0].name + ' nearby — heading into kelp for cover.'; } else { b.act = 'flee'; b.target = bigger[0].id; b.speed = 'sprint'; b.dur = 12; b.why = 'Fleeing from ' + bigger[0].name + ' (size ' + bigger[0].size + ').'; } return b; }
    if ((pol === 'hunter' || pol === 'smart') && smaller.length) { b.act = 'hunt'; b.target = smaller[0].id; b.speed = smaller[0].dist < 8 ? 'sprint' : 'fast'; b.dur = 25; b.why = 'Hunting ' + smaller[0].name + ' — small enough to swallow.'; return b; }
    if (pol === 'smart' && me.smell.length && you.energy < you.energyMax * 0.6) { b.act = 'feed'; b.heading = me.smell[0].bearing; b.speed = 'cruise'; b.dur = 20; b.why = 'Scent of ' + me.smell[0].kind + ' at ' + me.smell[0].bearing + '° — investigating.'; return b; }
    if (food && you.energy < you.energyMax * 0.85) { b.act = 'feed'; b.target = food.id; b.speed = 'cruise'; b.dur = 25; b.why = 'Feeding on ' + food.kind + ' at ' + Math.round(food.dist) + ' m.'; return b; }
    b.act = 'feed'; b.heading = R() * 360; b.pitch = (R() - 0.5) * 30; b.speed = 'cruise'; b.dur = 20; b.why = 'Foraging in a new direction.'; return b;
  }
  function demoTick() {
    if (!demo) return; var g = demo.g, now = Date.now(); OC.advance(g, now);
    g.fish.forEach(function (f) { if (!f.alive) return; if (g.tick >= demo.next[f.id]) { var me = OC.perceive(g, f, now); var v = OC.validateCmd(demoDecide(g, f, me)); if (v.ok) OC.applyCmd(g, f, v.cmd, now + Math.random() * 3000); demo.next[f.id] = g.tick + 16 + Math.floor(Math.random() * 50); } });
    if (now - demo.lastSnap > 400) { demo.lastSnap = now; pushState(OC.snapshot(g, now)); }
    if (g.status === 'finished' && !demo.restartAt) demo.restartAt = now + 15000; if (demo.restartAt && now > demo.restartAt) { demo = makeDemo(); }
  }

  // ── Render loop ──────────────────────────────────────────────────────────
  var last = performance.now(), labelTick = 0;
  function rotFish(g, h, p) { g.rotation.set((p || 0) * D2R, Math.atan2(Math.sin(h * D2R), -Math.cos(h * D2R)), 0, 'YXZ'); }
  function frame() {
    requestAnimationFrame(frame); var now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now; var ts = now / 1000;
    if (live.demo) demoTick();
    updateCamera(dt);
    if (B) {
      var alpha = OC.clamp((now - LAG - tA) / Math.max(1, tB - tA), 0, 1.3), s = B, id;
      s.fish.forEach(function (f) {
        var o = ensureFish(f), a = prev('fish', f.id) || f;
        var x = OC.lerp(a.x, f.x, alpha), z = OC.lerp(a.z, f.z, alpha), d = OC.lerp(a.d, f.d, alpha), h = lerpA(a.h, f.h, alpha), p = OC.lerp(a.p, f.p, alpha);
        var len = 1.6 + 1.0 * f.sz; o.g.scale.setScalar(len); o.g.userData.len = len; o.g.position.set(x, -d, z); rotFish(o.g, h, p);
        o.g.userData.tail.rotation.y = Math.sin(ts * (4 + f.spd * 3) + f.id.length) * (0.15 + Math.min(0.5, f.spd * 0.12));
        var mat = o.g.userData.mat; var op = f.hid ? 0.35 : 1; mat.transparent = op < 1; mat.opacity = op; o.g.visible = f.alive; mat.emissive.setHex(f.bleed ? 0x401010 : f.poison ? 0x103010 : 0x000000);
        var dc = camera.position.distanceTo(o.g.position), sc = OC.clamp(dc * 0.09, 1.2, 12);
        o.label.visible = showLabels && f.alive; o.label.position.set(x, -d + len * 0.5, z); o.label.scale.set(sc * 3, sc, 1); drawLabel(o.label, f);
        o.bubble.visible = showWhy && f.alive && !!f.why && dc < 110; o.bubble.position.set(x, -d + len * 0.5 + sc, z); o.bubble.scale.set(sc * 2.7, sc, 1); drawBubble(o.bubble, f.why || '');
      });
      var seenN = {}, seenS = {};
      s.npcs.forEach(function (a) {
        var sp = SP[a.sp];
        if (sp.kind === 'school') {
          seenS[a.id] = 1; var o = ensureSchool(a), pa = prev('npcs', a.id) || a; var cx = OC.lerp(pa.x, a.x, alpha), cz = OC.lerp(pa.z, a.z, alpha), cd = OC.lerp(pa.d, a.d, alpha);
          var vis = Math.min(o.ph.length, Math.ceil(a.n / o.nmax * o.ph.length)); o.im.visible = a.n > 0 && camera.position.distanceTo(V.set(cx, -cd, cz)) < 260;
          if (!o.im.visible) return;
          for (var i = 0; i < o.ph.length; i++) { var ph = o.ph[i]; if (i >= vis) { M.makeScale(0, 0, 0); o.im.setMatrixAt(i, M); continue; } var an = ph.a + ts * ph.w; V.set(cx + Math.cos(an) * ph.r, -cd + ph.y + Math.sin(ts * 1.3 + ph.a) * 0.5, cz + Math.sin(an) * ph.r); Q.setFromEuler(new T.Euler(0, Math.atan2(-Math.sin(an), Math.cos(an)) + Math.PI, 0)); SC.set(o.s, o.s, o.s); M.compose(V, Q, SC); o.im.setMatrixAt(i, M); } o.im.instanceMatrix.needsUpdate = true; return;
        }
        seenN[a.id] = 1; var n = ensureNpc(a), pb = prev('npcs', a.id) || a;
        var x = OC.lerp(pb.x, a.x, alpha), z = OC.lerp(pb.z, a.z, alpha), d = OC.lerp(pb.d, a.d, alpha), h = lerpA(pb.h, a.h, alpha);
        n.g.position.set(x, -d, z);
        if (sp.kind === 'static' || sp.buried || a.sp === 'crab' || a.sp === 'lobster' || a.sp === 'hermit crab') n.g.rotation.set(0, (h || 0) * D2R, 0); else rotFish(n.g, h, 0);
        if (sp.kind === 'drift' || a.sp === 'man-o-war') n.g.position.y += Math.sin(ts + x) * 0.2;
        if (n.g.userData.tail) n.g.userData.tail.rotation.y = Math.sin(ts * (3 + a.spd * 2) + x) * (0.1 + Math.min(0.4, a.spd * 0.08));
        if (n.g.userData.mat) n.g.userData.mat.emissive.setHex(a.bl ? 0x401010 : 0x000000);
        var dc = camera.position.distanceTo(n.g.position); n.g.visible = dc < (sp.size > 3 ? 420 : 200);
        var wantTag = showLabels && n.g.visible && (sp.kind === 'shark' || sp.kind === 'pack' || (dc < 35 && sp.kind !== 'school') || cam.followNpc === a.id);
        if (wantTag) { if (!n.tag) { n.tag = makeSprite(384, 128); scene.add(n.tag); } var sc = OC.clamp(dc * 0.08, 1.2, 14); n.tag.visible = true; n.tag.position.set(x, -d + (n.g.userData.len || 2) * 0.5, z); n.tag.scale.set(sc * 3, sc, 1); drawTag(n.tag, spLabel(a.sp).toUpperCase() + (a.hp !== undefined ? ' · hp ' + a.hp : ''), (sp.kind === 'shark' || sp.kind === 'pack' || sp.prey ? stateText(a) : 'size ' + sp.size) + (a.n !== undefined ? ' · ' + a.n : ''), a.sp === 'orca' ? '#ff6a6a' : sp.kind === 'shark' ? '#ffe0a0' : sp.prey ? '#ffc0a0' : '#bfe8ff'); }
        else if (n.tag) n.tag.visible = false;
      });
      for (id in npcObjs) if (!seenN[id]) { scene.remove(npcObjs[id].g); if (npcObjs[id].tag) scene.remove(npcObjs[id].tag); delete npcObjs[id]; if (cam.followNpc === id) { cam.followNpc = null; setMode('free'); } }
      for (id in schoolObjs) if (!seenS[id]) { scene.remove(schoolObjs[id].im); delete schoolObjs[id]; }
      s.plankton.forEach(function (q) { var o = ensurePlank(q); o.pt.visible = q.amt > 1; o.pt.position.set(q.x, -q.d, q.z); o.pt.material.opacity = 0.2 + 0.6 * q.amt / 100; o.pt.rotation.y = ts * 0.05; });
      s.blooms.forEach(function (j) { var o = ensureBloom(j); o.grp.position.set(j.x, -j.d, j.z); var vis = Math.ceil(j.n / 40 * o.items.length); o.items.forEach(function (it, i) { it.g.visible = i < vis; it.g.position.set(it.ox * j.r, it.oy * 14 + Math.sin(ts * 0.8 + it.ph) * 1.2, it.oz * j.r); it.g.scale.y = 0.85 + 0.25 * Math.sin(ts * 2 + it.ph); }); });
      var seenK = {}; s.carrion.forEach(function (k) { var o = ensureCarrion(k); seenK[k.id] = 1; o.g.position.set(k.x, -k.d, k.z); }); for (id in carrionObjs) if (!seenK[id]) { scene.remove(carrionObjs[id].g); delete carrionObjs[id]; }
      var camD = Math.max(0, -camera.position.y), Lc = (s.light || 1) * Math.exp(-camD / 42), above = camera.position.y > 0;
      var fc = new T.Color().setRGB(0.02 + 0.10 * Lc, 0.10 + 0.35 * Lc, 0.20 + 0.45 * Lc); if (above) fc.setRGB(0.55, 0.75, 0.95);
      scene.fog.color.copy(fc); scene.background = fc; scene.fog.density = above ? 0.0012 : 0.005 + 0.018 * (1 - Lc) + (OC.inBiolum(camera.position.x, camera.position.z, camD) ? 0.004 : 0);
      hemi.intensity = 0.25 + 0.8 * (s.light || 1); sun.intensity = 0.2 + 0.9 * (s.light || 1); amb.intensity = 0.35 + 0.3 * (s.light || 1);
      if ((labelTick++ % 6) === 0) drawMini(s);
    }
    sway.forEach(function (o) {
      if (o.isInstancedMesh) { if (camera.position.distanceTo(V.set(o.userData[0].x, 0, o.userData[0].z)) > 220) return; var items = o.userData; for (var i = 0; i < items.length; i++) { var it = items[i]; var ang = Math.sin(ts * 0.9 + it.ph) * 0.09; Q.setFromEuler(new T.Euler(ang, 0, Math.cos(ts * 0.7 + it.ph) * 0.09)); V.set(it.x, it.y, it.z); SC.set(1, it.h, 1); M.compose(V, Q, SC); o.setMatrixAt(i, M); } o.instanceMatrix.needsUpdate = true; }
      else if (o.ring) { o.ring.rotation.z = ts; o.ring.material.color.setHSL(0.5, 1, 0.6 + 0.2 * Math.sin(ts * 3)); }
      else if (o.smoke) { var pa = o.smoke.geometry.attributes.position; for (var k = 0; k < pa.count; k++) { var y = pa.getY(k) + dt * 2.5; if (y > o.base + 34) y = o.base; pa.setY(k, y); pa.setX(k, o.x + Math.sin(ts + k) * (y - o.base) * 0.08); } pa.needsUpdate = true; }
      else if (o.glow) { o.glow.material.opacity = 0.55 + 0.35 * Math.sin(ts * 1.7); o.glow.rotation.y = ts * 0.02; }
      else if (o.cur) { var c = o.c, pb = o.cur.geometry.attributes.position; for (var m = 0; m < o.items.length; m++) { var it2 = o.items[m]; if (c.kind === 'seg') { var len = Math.hypot(c.bx - c.ax, c.bz - c.az); it2.t += dt * c.v / len; if (it2.t > 1) it2.t -= 1; var ux = (c.bx - c.ax) / len, uz = (c.bz - c.az) / len; pb.setXYZ(m, c.ax + ux * len * it2.t - uz * it2.off * c.w, -(c.d0 + it2.d * (c.d1 - c.d0)), c.az + uz * len * it2.t + ux * it2.off * c.w); } else { it2.d -= dt * 0.02; if (it2.d < 0) it2.d += 1; pb.setXYZ(m, c.x + Math.cos(it2.off * 3.14) * c.r * it2.t, -(5 + it2.d * 60), c.z + Math.sin(it2.off * 3.14) * c.r * it2.t); } } pb.needsUpdate = true; }
    });
    snow.position.copy(camera.position); snow.rotation.y = ts * 0.01;
    renderer.render(scene, camera);
  }
  setMode('free');
  if (qs.get('cam')) { var cq = qs.get('cam').split(',').map(Number); if (cq.length >= 5) { cam.pos.set(cq[0], cq[1], cq[2]); cam.yaw = cq[3]; cam.pitch = cq[4]; } }
  if (qs.get('follow')) { setTimeout(function () { var f = B && B.fish[+qs.get('follow') - 1]; if (f) selectFish(f.id, true); }, 1500); }
  if (qs.get('shark')) setTimeout(nextShark, 1500);
  if (qs.get('species') === '1') setTimeout(function () { $('b-species').click(); }, 1200);
  if (qs.get('demo') === '1') setDemo(true); else poll();
  frame();
})();
