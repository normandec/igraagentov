// OCEAN ARENA v5 — 3D spectator viewer (three.js r128 + creatures.js + ocean.js, bundled). Live data from /state or local demo.
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

  // ── Renderer / scene ─────────────────────────────────────────────────────
  var canvas = $('c');
  var QL = OCEAN.loadQuality(qs);
  var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QL.dpr));
  var scene = new T.Scene(); scene.fog = new T.FogExp2(0x0a3550, 0.008);
  var oceanMats = {};
  var camera = new T.PerspectiveCamera(62, 1, 0.3, 1600);
  var hemi = new T.HemisphereLight(0x8fd0ff, 0x08203a, 0.9); scene.add(hemi);
  var sun = new T.DirectionalLight(0xfff2d0, 0.9); sun.position.set(300, 400, 150); scene.add(sun);
  var amb = new T.AmbientLight(0x204a70, 0.5); scene.add(amb);
  var lights = { hemi: hemi, sun: sun, amb: amb };
  function resize() { var w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  window.addEventListener('resize', resize); resize();
  var M = new T.Matrix4(), Q = new T.Quaternion(), V = new T.Vector3(), SC = new T.Vector3();
  function lam(c, o) { var p = { color: c }; if (o) for (var k in o) p[k] = o[k]; return new T.MeshLambertMaterial(p); }

  // ── Seafloor, beaches, coastal mountains & water surface ─────────────────
  (function buildFloor() {
    var seg = QL.floorSeg || 240, pad = 160, sizeW = W + pad * 2, sizeL = L + pad * 2;
    var geo = new T.PlaneGeometry(sizeW, sizeL, seg, seg); geo.rotateX(-Math.PI / 2); geo.translate(W / 2, 0, L / 2);
    var pos = geo.attributes.position, colors = new Float32Array(pos.count * 3), c = new T.Color();
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), z = pos.getZ(i), d = floorAt(x, z); pos.setY(i, -d);
      if (d <= 0) {
        var elev = -d;
        if (elev < 2.2) { // golden sandy beach
          var wet = OC.clamp(1 - elev / 1.4, 0, 1);
          c.setRGB(OC.lerp(0.84, 0.70, wet), OC.lerp(0.76, 0.62, wet), OC.lerp(0.55, 0.43, wet));
        } else if (elev < 18) { // green coastal slopes & dunes
          var ht = OC.clamp((elev - 2.2) / 15.8, 0, 1);
          c.setRGB(OC.lerp(0.28, 0.20, ht), OC.lerp(0.48, 0.36, ht), OC.lerp(0.20, 0.17, ht));
        } else if (elev < 48) { // rocky coastal ridges & evergreen uplands
          var rt = OC.clamp((elev - 18) / 30, 0, 1);
          c.setRGB(OC.lerp(0.24, 0.44, rt), OC.lerp(0.35, 0.42, rt), OC.lerp(0.22, 0.40, rt));
        } else { // high coastal alpine granite peaks
          var pt = OC.clamp((elev - 48) / 30, 0, 1);
          c.setRGB(OC.lerp(0.46, 0.76, pt), OC.lerp(0.45, 0.78, pt), OC.lerp(0.44, 0.82, pt));
        }
      } else {
        var t = OC.clamp((d - 4) / 145, 0, 1);
        c.setRGB(0.68 - 0.56 * t, 0.62 - 0.49 * t, 0.44 - 0.31 * t);
        if (d < 2.2) c.setRGB(0.76, 0.70, 0.50);
        OC.REEFS.forEach(function (rf) { if (OC.gauss(x, z, rf.x, rf.z, rf.r) > 0.42) c.setRGB(0.74, 0.48, 0.42); });
        OC.KELP.forEach(function (k) { if (OC.gauss(x, z, k.x, k.z, k.r) > 0.4) c.setRGB(0.30, 0.42, 0.22); });
        OC.SEAGRASS.forEach(function (k) { if (OC.gauss(x, z, k.x, k.z, k.r) > 0.4) c.setRGB(0.36, 0.56, 0.30); });
        if (x < OC.MANGROVE.x1 && z > OC.MANGROVE.z0 && z < OC.MANGROVE.z1) c.setRGB(0.36, 0.31, 0.20);
        if (OC.gauss(x, z, OC.ABYSS.x, OC.ABYSS.z, OC.ABYSS.r) > 0.45 && d > 55) c.setRGB(0.11, 0.12, 0.19);
        if (OC.gauss(x, z, OC.DEADZONE.x, OC.DEADZONE.z, OC.DEADZONE.r) > 0.4 && d > OC.DEADZONE.minD) c.setRGB(0.20, 0.16, 0.10);
        OC.VENTS.forEach(function (v) { if (OC.gauss(x, z, v.x, v.z, 9) > 0.3) c.setRGB(0.12, 0.10, 0.10); });
      }
      var n = Math.sin(x * 0.9) * Math.cos(z * 1.1) * 0.025 + Math.sin(x * 0.13 + z * 0.21) * Math.cos(x * 0.07 - z * 0.11) * 0.045;
      c.r = OC.clamp(c.r + n, 0, 1); c.g = OC.clamp(c.g + n, 0, 1); c.b = OC.clamp(c.b + n, 0, 1);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(colors, 3)); geo.computeVertexNormals();
    oceanMats.floor = OCEAN.floorMaterial(); oceanMats.floor.userData.u.uCaustics.value = QL.caustics; scene.add(new T.Mesh(geo, oceanMats.floor));
    oceanMats.surf = OCEAN.surfaceMaterial();
    var surfGeo = new T.PlaneGeometry(W + 180, L + 180, QL.surfSeg, QL.surfSeg);
    var sPos = surfGeo.attributes.position, sDepth = new Float32Array(sPos.count);
    for (var si = 0; si < sPos.count; si++) {
      var sx = sPos.getX(si) + W / 2, sz = -sPos.getY(si) + L / 2;
      sDepth[si] = floorAt(sx, sz);
    }
    surfGeo.setAttribute('aDepth', new T.BufferAttribute(sDepth, 1));
    var surf = new T.Mesh(surfGeo, oceanMats.surf);
    surf.rotation.x = -Math.PI / 2; surf.position.set(W / 2, 0, L / 2); surf.renderOrder = 5; scene.add(surf);
    oceanMats.sky = OCEAN.makeSky(); scene.add(oceanMats.sky);
    var th = new T.Mesh(new T.PlaneGeometry(W * 0.85, L * 0.85), new T.MeshBasicMaterial({ color: 0x1a4a7a, transparent: true, opacity: 0.06, side: T.DoubleSide, depthWrite: false })); th.rotation.x = -Math.PI / 2; th.position.set(W / 2, -OC.THERMO, L / 2); scene.add(th);
  })();

  // ── Static features, coastal trees & 10x seafloor flora/rocks ────────────
  var sway = [], featureHits = [];
  (function buildFeatures() {
    var rs = { rs: 1234 }; function R() { return OC.rnd(rs); }
    function inst(geo, mat, n) { var im = new T.InstancedMesh(geo, mat, Math.max(1, n)); im.count = 0; scene.add(im); return im; }
    function put(im, x, y, z, sx, sy, sz, ry, rx, rz) { if (im.count >= im.instanceMatrix.count) return; V.set(x, y, z); Q.setFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0)); SC.set(sx, sy, sz); M.compose(V, Q, SC); im.setMatrixAt(im.count++, M); }
    // kelp
    var stalkGeo = new T.CylinderGeometry(0.08, 0.22, 1, 5, 1); stalkGeo.translate(0, 0.5, 0);
    var stalkMat = lam(0x2f7a2a), leafGeo = new T.SphereGeometry(1, 6, 5), leafMat = lam(0x3f9a3a, { transparent: true, opacity: 0.8 });
    OC.KELP.forEach(function (k) {
      var n = 85, im = new T.InstancedMesh(stalkGeo, stalkMat, n), items = [], lm = new T.InstancedMesh(leafGeo, leafMat, n);
      for (var i = 0; i < n; i++) { var a = R() * Math.PI * 2, r = Math.sqrt(R()) * k.r; var x = k.x + Math.cos(a) * r, z = k.z + Math.sin(a) * r; var fl = Math.max(4, floorAt(x, z)); var h = Math.min(fl - 1.5, 10 + R() * 12); items.push({ x: x, z: z, y: -fl, h: h, ph: R() * 6.28 }); M.makeScale(1.3, 0.9, 1.3); M.setPosition(x, -fl + h, z); lm.setMatrixAt(i, M); }
      im.userData = items; scene.add(im); scene.add(lm); sway.push(im);
    });
    // seagrass
    var bladeGeo = new T.ConeGeometry(0.06, 1.6, 3); bladeGeo.translate(0, 0.8, 0); var bladeMat = lam(0x4a9a3a);
    var blades = inst(bladeGeo, bladeMat, OC.SEAGRASS.length * 420);
    OC.SEAGRASS.forEach(function (s) { for (var i = 0; i < 420; i++) { var a = R() * 6.28, r = Math.sqrt(R()) * s.r; var x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r; var fl = floorAt(x, z); if (fl > 1.2) put(blades, x, -fl, z, 1, 0.7 + R() * 0.8, 1, R() * 6.28, (R() - 0.5) * 0.4, (R() - 0.5) * 0.4); } });
    // mangroves along sheltered inner western shore + coastal shore foliage
    var rootGeo = new T.CylinderGeometry(0.12, 0.2, 1, 5); rootGeo.translate(0, 0.5, 0); var rootMat = lam(0x5a3a22);
    var roots = inst(rootGeo, rootMat, 560), trunks = inst(new T.CylinderGeometry(0.45, 0.75, 1, 7), lam(0x4a2e18), 160), crowns = inst(new T.SphereGeometry(1, 7, 6), lam(0x2e7a2a), 160);
    var mg = OC.MANGROVE;
    for (var i = 0; i < 70; i++) {
      var tx = 36 + R() * 20, tz = mg.z0 + (i + R()) / 70 * (mg.z1 - mg.z0), fl = Math.max(0.5, floorAt(tx, tz));
      put(trunks, tx, -fl + (fl + 5) / 2, tz, 1, fl + 5, 1); put(crowns, tx + (R() - 0.5) * 2, 5 + R() * 2, tz, 4 + R() * 2, 2.5, 4 + R() * 2);
      for (var r2 = 0; r2 < 7; r2++) { var ax = tx + (R() - 0.5) * 7, az = tz + (R() - 0.5) * 7, fl2 = Math.max(0.5, floorAt(ax, az)); put(roots, ax, -fl2, az, 1, fl2 + 1.5, 1, 0, (tx - ax) * 0.12, (tz - az) * 0.12); }
    }
    for (var ct = 0; ct < 90; ct++) {
      var side = ct % 4, cx = side < 2 ? 40 + R() * (W - 80) : (side === 2 ? 4 + R() * 38 : W - 4 - R() * 38), cz = side >= 2 ? 40 + R() * (L - 80) : (side === 0 ? 4 + R() * 38 : L - 4 - R() * 38);
      var cfl = floorAt(cx, cz);
      if (cfl < -2.5 && cfl > -26) { var th2 = 4 + R() * 4; put(trunks, cx, -cfl + th2 * 0.5, cz, 0.65, th2, 0.65); put(crowns, cx, -cfl + th2 + 1.2, cz, 2.8 + R() * 2.2, 2.2 + R() * 1.4, 2.8 + R() * 2.2); }
    }
    // sargassum (floating algae)
    var sarg = inst(new T.SphereGeometry(1, 6, 4), lam(0x7a6a1a, { transparent: true, opacity: 0.85 }), 240);
    OC.SARGASSUM.forEach(function (s) { for (var i = 0; i < 48; i++) { var a = R() * 6.28, r = Math.sqrt(R()) * s.r; put(sarg, s.x + Math.cos(a) * r, -0.3 - R() * 0.6, s.z + Math.sin(a) * r, 1.5 + R() * 2, 0.5 + R() * 0.6, 1.5 + R() * 2, R() * 3); } });
    // reefs: rock rubble
    function rockGeo(seed) { var g = new T.IcosahedronGeometry(1, QL.rays ? 2 : 1), pa = g.attributes.position, v = new T.Vector3(); for (var i = 0; i < pa.count; i++) { v.set(pa.getX(i), pa.getY(i), pa.getZ(i)); var n = 1 + 0.22 * Math.sin(v.x * 3.1 + seed) * Math.cos(v.z * 2.7 - seed) + 0.12 * Math.sin(v.y * 5.3 + v.x * 2 + seed * 2); v.multiplyScalar(n); pa.setXYZ(i, v.x, v.y * 0.75, v.z); } g.computeVertexNormals(); return g; }
    var rubbleGeo = rockGeo(1.3), rubbleMat = lam(0x8a7262), rubble = inst(rubbleGeo, rubbleMat, 390);
    OC.REEFS.forEach(function (rf) { for (var i = 0; i < 130; i++) { var a = R() * 6.28, r = Math.sqrt(R()) * rf.r; var x = rf.x + Math.cos(a) * r, z = rf.z + Math.sin(a) * r, s = 0.5 + R() * 1.4; put(rubble, x, -floorAt(x, z) + s * 0.3, z, s, s * (0.5 + R() * 0.6), s, R() * 3, R(), R()); } var cl = rf.cleaner, cm = new T.Mesh(new T.TorusGeometry(1.6, 0.12, 8, 24), new T.MeshBasicMaterial({ color: 0x7ff8ff, transparent: true, opacity: 0.45 })); cm.position.set(cl.x, -cl.d, cl.z); cm.rotation.x = Math.PI / 2; scene.add(cm); sway.push({ ring: cm }); });
    // 10x plants, algae, corals & seafloor rocks (OC.PLANTS ~1,750 instances)
    var P = OC.PLANTS, cnt = {}; P.forEach(function (p) { cnt[p.type] = (cnt[p.type] || 0) + 1; });
    var coneUp = (function () { var g = new T.ConeGeometry(0.12, 1, 5); g.translate(0, 0.5, 0); return g; })();
    var cylUp = (function () { var g = new T.CylinderGeometry(0.05, 0.09, 1, 4); g.translate(0, 0.5, 0); return g; })();
    var brain = inst(new T.SphereGeometry(1, 10, 8), lam(0xd8b060), cnt['coral-brain'] || 1);
    var stag = inst(coneUp, lam(0xe88a6a), (cnt['coral-staghorn'] || 1) * 7);
    var tableTop = inst(new T.CylinderGeometry(1, 1, 0.25, 9), lam(0xc8a070), cnt['coral-table'] || 1), tableLeg = inst(new T.CylinderGeometry(0.25, 0.4, 1, 6), lam(0xa08060), cnt['coral-table'] || 1);
    var pillar = inst((function () { var g = new T.CylinderGeometry(0.22, 0.32, 1, 7); g.translate(0, 0.5, 0); return g; })(), lam(0xc89a78), (cnt['coral-pillar'] || 1) * 4);
    var fan = inst(new T.PlaneGeometry(1, 1), lam(0xb060d0, { side: T.DoubleSide, transparent: true, opacity: 0.85 }), cnt['seafan'] || 1);
    var whip = inst(cylUp, lam(0xf0d060), (cnt['seawhip'] || 1) * 4);
    var anemBase = inst(new T.SphereGeometry(1, 8, 6, 0, 6.283, 0, 1.6), lam(0x60c0a0), cnt['anemone'] || 1), anemTent = inst((function () { var g = new T.CylinderGeometry(0.04, 0.08, 1, 4); g.translate(0, 0.5, 0); return g; })(), lam(0xa0f0d0), (cnt['anemone'] || 1) * 10);
    var sponge = inst((function () { var g = new T.CylinderGeometry(0.45, 0.35, 1, 7, 1, true); g.translate(0, 0.5, 0); return g; })(), lam(0xf08040, { side: T.DoubleSide }), (cnt['sponge'] || 1) * 3);
    var algae = inst(rockGeo(2.9), lam(0x5a8a3a), cnt['algae-rock'] || 1);
    var coralline = inst(new T.CylinderGeometry(1, 1.1, 0.2, 7), lam(0xc85a82), (cnt['coralline-algae'] || 1) * 2);
    var macroAlgae = inst(coneUp, lam(0x3a7c2c), ((cnt['macro-algae'] || 1) + (cnt['kelp-sprout'] || 1)) * 5);
    var redAlgae = inst(coneUp, lam(0xa82e3c), (cnt['red-algae'] || 1) * 4);
    var caulerpa = inst(coneUp, lam(0x66b83c), (cnt['caulerpa'] || 1) * 5);
    var padina = inst(new T.CylinderGeometry(0.6, 0.1, 0.12, 6, 1, false, 0, 3.8), lam(0x9a8248, { side: T.DoubleSide }), (cnt['padina'] || 1) * 4);
    var boulder = inst(rockGeo(4.1), lam(0x6a6e74), cnt['boulder'] || 1);
    var spire = inst((function () { var g = new T.ConeGeometry(0.7, 2.2, 6); g.translate(0, 1.1, 0); return g; })(), lam(0x4c525c), cnt['rock-spire'] || 1);
    var tube = inst((function () { var g = new T.CylinderGeometry(0.08, 0.1, 1, 5); g.translate(0, 0.5, 0); return g; })(), lam(0xf0f0f0), (cnt['tube-worm'] || 1) * 6), tubeTip = inst(new T.SphereGeometry(0.14, 5, 4), new T.MeshBasicMaterial({ color: 0xff3030 }), (cnt['tube-worm'] || 1) * 6);
    P.forEach(function (p) {
      var y = -p.d, k; featureHits.push({ x: p.x, y: y, z: p.z, r: p.r, id: p.id, name: p.type });
      switch (p.type) {
        case 'coral-brain': put(brain, p.x, y + p.r * 0.35, p.z, p.r * 0.9, p.r * 0.55, p.r * 0.8, R() * 3); break;
        case 'coral-staghorn': for (k = 0; k < 7; k++) put(stag, p.x + (R() - 0.5) * p.r, y, p.z + (R() - 0.5) * p.r, 1.2, 1.2 + R() * 1.6, 1.2, 0, (R() - 0.5) * 0.9, (R() - 0.5) * 0.9); break;
        case 'coral-table': put(tableLeg, p.x, y + 0.6, p.z, 1, 1.2, 1); put(tableTop, p.x, y + 1.3, p.z, p.r, 1, p.r * 0.8, R() * 3); break;
        case 'coral-pillar': for (k = 0; k < 4; k++) put(pillar, p.x + (R() - 0.5) * p.r * 0.8, y, p.z + (R() - 0.5) * p.r * 0.8, 0.7 + R() * 0.5, 1.2 + R() * 2.2, 0.7 + R() * 0.5, R() * 3); break;
        case 'seafan': put(fan, p.x, y + p.r * 0.6, p.z, p.r * 1.2, p.r * 1.2, 1, R() * 3); break;
        case 'seawhip': for (k = 0; k < 4; k++) put(whip, p.x + (R() - 0.5) * 1.5, y, p.z + (R() - 0.5) * 1.5, 1, 2.5 + R() * 3, 1, 0, (R() - 0.5) * 0.3, (R() - 0.5) * 0.3); break;
        case 'anemone': put(anemBase, p.x, y, p.z, p.r * 0.5, p.r * 0.35, p.r * 0.5); for (k = 0; k < 10; k++) { var aa = k / 10 * 6.28; put(anemTent, p.x + Math.cos(aa) * p.r * 0.3, y + p.r * 0.3, p.z + Math.sin(aa) * p.r * 0.3, 1, 0.8 + R() * 0.6, 1, 0, Math.sin(aa) * 0.5, -Math.cos(aa) * 0.5); } break;
        case 'sponge': for (k = 0; k < 3; k++) put(sponge, p.x + (R() - 0.5) * 1.6, y, p.z + (R() - 0.5) * 1.6, 1 + R() * 0.6, 1.2 + R() * 1.4, 1 + R() * 0.6); break;
        case 'algae-rock': put(algae, p.x, y + p.r * 0.3, p.z, p.r, p.r * 0.6, p.r, R() * 3, R() * 0.4); break;
        case 'coralline-algae': for (k = 0; k < 2; k++) put(coralline, p.x + (R() - 0.5) * p.r, y + 0.1, p.z + (R() - 0.5) * p.r, p.r * 0.65, 1, p.r * 0.65, R() * 3); break;
        case 'macro-algae': case 'kelp-sprout': for (k = 0; k < 5; k++) put(macroAlgae, p.x + (R() - 0.5) * p.r, y, p.z + (R() - 0.5) * p.r, 1.6, 1.1 + R() * 2.0, 1.6, R() * 6, (R() - 0.5) * 0.6, (R() - 0.5) * 0.6); break;
        case 'red-algae': for (k = 0; k < 4; k++) put(redAlgae, p.x + (R() - 0.5) * p.r, y, p.z + (R() - 0.5) * p.r, 1.3, 0.8 + R() * 1.1, 1.3, R() * 6, (R() - 0.5) * 0.5, (R() - 0.5) * 0.5); break;
        case 'caulerpa': for (k = 0; k < 5; k++) put(caulerpa, p.x + (R() - 0.5) * p.r * 1.1, y, p.z + (R() - 0.5) * p.r * 1.1, 1.1, 0.7 + R() * 0.9, 1.1, R() * 6, (R() - 0.5) * 0.4, (R() - 0.5) * 0.4); break;
        case 'padina': for (k = 0; k < 4; k++) put(padina, p.x + (R() - 0.5) * p.r, y + 0.25, p.z + (R() - 0.5) * p.r, 0.8 + R() * 0.5, 1, 0.8 + R() * 0.5, R() * 6, (R() - 0.5) * 0.4); break;
        case 'boulder': put(boulder, p.x, y + p.r * 0.3, p.z, p.r * 1.05, p.r * 0.7, p.r * 0.95, R() * 3, R() * 0.4, R() * 0.4); break;
        case 'rock-spire': put(spire, p.x, y - 0.2, p.z, p.r * 0.8, p.r * 1.4, p.r * 0.8, R() * 3, (R() - 0.5) * 0.2); break;
        case 'tube-worm': for (k = 0; k < 6; k++) { var tx3 = p.x + (R() - 0.5) * 2, tz3 = p.z + (R() - 0.5) * 2, th3 = 0.8 + R() * 1.2; put(tube, tx3, y, tz3, 1, th3, 1, 0, (R() - 0.5) * 0.3, (R() - 0.5) * 0.3); put(tubeTip, tx3, y + th3, tz3, 1, 1, 1); } break;
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
      for (var k = 0; k < 8; k++) { var rk = new T.Mesh(rockGeo(R() * 9).scale(c.r * (0.5 + R() * 0.5), c.r * (0.4 + R() * 0.4), c.r * (0.5 + R() * 0.5)), rockMat); var a = R() * 6.28; rk.position.set(Math.cos(a) * c.r * 0.9, (R() - 0.3) * c.r, Math.sin(a) * c.r * 0.9); rk.rotation.set(R() * 3, R() * 3, R() * 3); g.add(rk); }
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
    // bioluminescence & dead zone
    (function () { var b = OC.BIOLUM, n = 900, pos = new Float32Array(n * 3); for (var k = 0; k < n; k++) { var a = R() * 6.28, r = Math.sqrt(R()) * b.r; var x = b.x + Math.cos(a) * r, z = b.z + Math.sin(a) * r; var fl = floorAt(x, z); pos[k * 3] = x; pos[k * 3 + 1] = -(b.minD + R() * Math.max(2, fl - b.minD - 1)); pos[k * 3 + 2] = z; } var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); var p = new T.Points(g, new T.PointsMaterial({ color: 0x9a7cff, size: 0.9, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false })); scene.add(p); sway.push({ glow: p }); })();
    (function () { var dz = OC.DEADZONE, m = new T.Mesh(new T.SphereGeometry(dz.r, 16, 12), new T.MeshBasicMaterial({ color: 0x5a3a10, transparent: true, opacity: 0.13, depthWrite: false })); m.position.set(dz.x, -(dz.minD + 12), dz.z); m.scale.y = 0.5; scene.add(m); })();
    // currents
    OC.CURRENTS.forEach(function (c) {
      var n = 140, pos = new Float32Array(n * 3), items = [];
      for (var k = 0; k < n; k++) items.push({ t: R(), off: (R() - 0.5) * 2, d: R() });
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
      var p = new T.Points(g, new T.PointsMaterial({ color: 0x9fe8ff, size: 0.35, map: OCEAN.softDot(), transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false })); scene.add(p); sway.push({ cur: p, c: c, items: items });
    });
  })();
  var snow = OCEAN.makeSnow(QL.snow); scene.add(snow);
  var rays = OCEAN.makeRays(QL.rays); scene.add(rays);
  var bubbles = OCEAN.makeBubbles(QL.bubbles); scene.add(bubbles);

  // ── 3D Models (CR procedural meshes + vertex-shader swimming) ────────────
  function npcModel(name) { return CR.creature(name); }
  function makeSprite(w, h) { var cv = document.createElement('canvas'); cv.width = w; cv.height = h; var tx = new T.CanvasTexture(cv); var sp = new T.Sprite(new T.SpriteMaterial({ map: tx, transparent: true, depthTest: false })); sp.userData = { cv: cv, tx: tx, key: '' }; sp.center.set(0.5, 0); return sp; }
  function roleEmoji(r, sp) {
    if (r === 'shark') return '🦈';
    if (r === 'dolphin') return '🐬';
    if (r === 'predator') return sp === 'giant squid' || sp === 'humboldt squid' ? '🦑' : sp === 'orca' ? '🐳' : '🦈';
    if (r === 'crab') return sp === 'lobster' ? '🦞' : '🦀';
    if (r === 'cephalopod') return sp === 'octopus' ? '🐙' : '🦑';
    if (r === 'giant') return sp === 'sea turtle' ? '🐢' : '🐋';
    return '🐟';
  }
  function drawLabel(sp, f) {
    var key = [f.n, f.sp || 'fish', f.role || 'fish', f.model, Math.round(f.hp), Math.round(f.en), f.sz, f.hid, f.bleed, f.suspect, f.cheat, f.alive, f.poison, f.cmdN].join('|'); if (sp.userData.key === key) return; sp.userData.key = key;
    var cv = sp.userData.cv, x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height);
    x.fillStyle = 'rgba(3,17,30,0.74)'; roundRect(x, 4, 20, cv.width - 8, 102, 12); x.fill();
    x.font = 'bold 28px sans-serif'; x.fillStyle = f.alive ? '#ffffff' : '#889'; x.textAlign = 'left'; x.fillText(roleEmoji(f.role, f.sp) + ' ' + f.n, 16, 56);
    var spTxt = (f.sp && f.sp !== 'fish' ? f.sp.toUpperCase() : 'FISH') + ' · ' + (f.model || '').slice(0, 14) + ' · ' + f.sz.toFixed(1);
    x.font = '19px sans-serif'; x.fillStyle = f.role === 'shark' || f.role === 'predator' ? '#ff9ba8' : f.role === 'dolphin' ? '#7eeeff' : '#9fd3ff'; x.fillText(spTxt, 16, 83);
    var pct = f.hp / Math.max(1, f.hpMax); x.fillStyle = 'rgba(255,255,255,0.15)'; x.fillRect(16, 96, 344, 8); x.fillStyle = pct > 0.5 ? '#6fe08a' : pct > 0.25 ? '#ffb04a' : '#ff5a4a'; x.fillRect(16, 96, 344 * pct, 8);
    var ep = f.en / Math.max(1, f.enMax); x.fillStyle = 'rgba(255,255,255,0.15)'; x.fillRect(16, 107, 344, 6); x.fillStyle = '#4ad0ff'; x.fillRect(16, 107, 344 * ep, 6);
    var badges = []; if (f.hid) badges.push(['HIDDEN', '#0a3a4a']); if (f.bleed) badges.push(['BLEEDING', '#5a0a2a']); if (f.poison) badges.push(['POISON', '#2a4a0a']); if (f.suspect) badges.push(['BOT?', '#5a3a0a']); if (f.cheat) badges.push(['CHEATER', '#6a0a0a']); if (!f.alive) badges.push(['DEAD', '#333']);
    var bx = cv.width - 14; x.font = 'bold 16px sans-serif'; badges.reverse().forEach(function (b) { var w = x.measureText(b[0]).width + 14; bx -= w + 4; x.fillStyle = b[1]; roundRect(x, bx, 32, w, 22, 5); x.fill(); x.fillStyle = '#fff'; x.fillText(b[0], bx + 7, 49); });
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
  function makePlayerMesh(spName, color) {
    return (!spName || spName === 'fish' || !SP[spName]) ? CR.player(color, 1) : CR.creature(spName);
  }
  function ensureFish(f) {
    var spName = f.sp || 'fish', o = fishObjs[f.id];
    if (o && o.sp === spName) return o;
    var g = makePlayerMesh(spName, f.color);
    var isClassic = (spName === 'fish' || !SP[spName]);
    var len0 = isClassic ? CR.playerLen(1) : (g.userData.len || CR.lenOf(spName));
    var baseSz = (!isClassic && SP[spName]) ? SP[spName].size : 1;
    var len = isClassic ? CR.playerLen(f.sz) : len0 * OC.clamp(f.sz / Math.max(0.1, baseSz), 0.7, 1.6);
    g.scale.setScalar(len / Math.max(0.05, len0));
    var label, bubble;
    if (o) {
      scene.remove(o.g); label = o.label; bubble = o.bubble;
    } else {
      label = makeSprite(384, 128); bubble = makeSprite(512, 192);
      scene.add(label); scene.add(bubble);
    }
    scene.add(g);
    o = fishObjs[f.id] = { g: g, label: label, bubble: bubble, len: len, len0: len0, baseSz: baseSz, sp: spName, id: f.id, ph: f.h || 0, pp: f.p || 0, str: 0 };
    if (g.userData.hit) g.userData.hit.userData.pick = { kind: 'fish', id: f.id };
    return o;
  }
  var protoCache = {};
  function proto(name) { var p = protoCache[name]; if (!p) { var g = CR.creature(name, true); p = protoCache[name] = { geo: g.userData.mesh.geometry, mat: g.userData.mat, len: g.userData.len, mode: g.userData.mode }; } return p; }
  function ensureNpc(a) { var o = npcObjs[a.id]; if (o) return o; var g = npcModel(a.sp); scene.add(g); o = npcObjs[a.id] = { g: g, sp: a.sp, id: a.id, tag: null, ph: a.h || 0, pp: a.p || 0, str: 0 }; g.userData.hit.userData.pick = { kind: 'npc', id: a.id }; return o; }
  // polarized school: individuals swim forward with subtle phase oscillation; tightens into a ball when fleeing
  function ensureSchool(a) {
    var o = schoolObjs[a.id]; if (o) return o; var sp = SP[a.sp], L = CR.lenOf(a.sp), tiny = L < 0.1;
    var n = Math.round((tiny ? 260 : L < 0.3 ? 170 : L < 1 ? 70 : 24) * QL.school), i, ph = [];
    var R = L > 1 ? 9 : L > 0.3 ? 4.5 : 2.6;
    for (i = 0; i < n; i++) { var u = Math.random(), v = Math.random(), w = Math.random(); ph.push({ x: (u - 0.5) * 2 * R, y: (v - 0.5) * R * 0.5, z: (w - 0.5) * 2 * R * 1.4, s: 0.8 + Math.random() * 0.4, ph: Math.random() * 6.28, w1: 0.4 + Math.random() * 0.6, w2: 0.3 + Math.random() * 0.5 }); }
    if (tiny) { var pos = new Float32Array(n * 3), g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); var pts = new T.Points(g, new T.PointsMaterial({ color: a.sp === 'krill' ? 0xffb0a0 : 0xffd8c8, size: 0.12, transparent: true, opacity: 0.85, depthWrite: false })); pts.frustumCulled = false; scene.add(pts); return schoolObjs[a.id] = { pts: pts, ph: ph, nmax: sp.n, R: R }; }
    var pr = proto(a.sp), geo = pr.geo.clone(), phases = new Float32Array(n); for (i = 0; i < n; i++) phases[i] = ph[i].ph; geo.setAttribute('aPhase', new T.InstancedBufferAttribute(phases, 1));
    var mat = CR.cloneSwimMat(pr.mat);
    var im = new T.InstancedMesh(geo, mat, n); im.frustumCulled = false; scene.add(im);
    return schoolObjs[a.id] = { im: im, ph: ph, nmax: sp.n, R: R, u: mat.userData.u, len: pr.len };
  }
  function ensurePlank(p) { var o = plankObjs[p.id]; if (o) return o; var n = 160, pos = new Float32Array(n * 3); for (var i = 0; i < n; i++) { var a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * p.r; pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = (Math.random() - 0.5) * p.r * 0.7; pos[i * 3 + 2] = Math.sin(a) * r; } var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); var pt = new T.Points(g, new T.PointsMaterial({ color: 0x9fe87a, size: 0.22, transparent: true, opacity: 0.7, depthWrite: false })); scene.add(pt); o = plankObjs[p.id] = { pt: pt }; return o; }
  function ensureBloom(j) {
    var o = bloomObjs[j.id]; if (o) return o; var n = Math.round(40 * Math.max(0.5, QL.school)), pr = proto('jellyfish bloom'), geo = pr.geo.clone(), phases = new Float32Array(n), items = [], i;
    for (i = 0; i < n; i++) { phases[i] = Math.random() * 6.28; var a2 = Math.random() * 6.28, r2 = Math.sqrt(Math.random()); items.push({ ox: Math.cos(a2) * r2, oz: Math.sin(a2) * r2, oy: (Math.random() - 0.5), ph: phases[i], s: 0.7 + Math.random() * 0.8 }); }
    geo.setAttribute('aPhase', new T.InstancedBufferAttribute(phases, 1)); var mat = CR.cloneSwimMat(pr.mat); mat.transparent = true; mat.opacity = 0.55; mat.depthWrite = false;
    var im = new T.InstancedMesh(geo, mat, n); im.frustumCulled = false; scene.add(im); return bloomObjs[j.id] = { im: im, items: items, u: mat.userData.u };
  }
  function ensureCarrion(k) { var o = carrionObjs[k.id]; if (o) return o; var g = CR.carcass(k.sz); scene.add(g); return carrionObjs[k.id] = { g: g }; }

  // ── State / adaptive smooth interpolation ────────────────────────────────
  var A = null, B = null, tA = 0, tB = 0, snapDt = 380, LAG = 410, live = { ok: false, demo: false, lastErr: '' }, lastFeedN = 0, lastGen = null;
  function index(s) { s.idx = { fish: {}, npcs: {} }; s.fish.forEach(function (f) { s.idx.fish[f.id] = f; }); s.npcs.forEach(function (a) { s.idx.npcs[a.id] = a; }); return s; }
  function pushState(s) {
    index(s); var now = performance.now();
    if (B) { var dtSample = OC.clamp(now - tB, 140, 1600); snapDt = snapDt * 0.75 + dtSample * 0.25; }
    LAG = OC.clamp(snapDt * 1.08, 280, 950);
    A = B; tA = tB; B = s; tB = now; if (!A) { A = s; tA = now - snapDt; }
    if (lastGen !== null && s.gen !== lastGen) { for (var id in fishObjs) { scene.remove(fishObjs[id].g); scene.remove(fishObjs[id].label); scene.remove(fishObjs[id].bubble); } fishObjs = {}; for (id in carrionObjs) scene.remove(carrionObjs[id].g); carrionObjs = {}; for (id in npcObjs) { scene.remove(npcObjs[id].g); if (npcObjs[id].tag) scene.remove(npcObjs[id].tag); } npcObjs = {}; for (id in schoolObjs) scene.remove(schoolObjs[id].im || schoolObjs[id].pts); schoolObjs = {}; for (id in bloomObjs) scene.remove(bloomObjs[id].im); bloomObjs = {}; $('end').style.display = 'none'; lastFeedN = 0; lastChatKey = ''; lastAdminKey = ''; }
    lastGen = s.gen; if (s.tide) OC._tide = s.tide; updateUI(s);
  }
  function lerpA(a, b, t) { var d = ((b - a) % 360 + 540) % 360 - 180; return a + d * t; }
  function prev(listKey, id) { return (A && A.idx && A.idx[listKey][id]) || null; }

  // ── Camera ───────────────────────────────────────────────────────────────
  var cam = { mode: 'free', yaw: -2.2, pitch: -0.12, pos: new T.Vector3(240, -14, 285), lookPos: null, _snap: false, follow: null, followNpc: null, dist: 16, oyaw: 0.6, opitch: 0.3 }, sharkIdx = -1;
  var keys = {}, drag = null;
  window.addEventListener('keydown', function (e) { if (e.target.tagName === 'INPUT') return; keys[e.code] = true; var k = e.key; if (k >= '0' && k <= '9') { var idx = k === '0' ? 9 : (+k - 1); var f = (B && B.fish[idx]); if (f) selectFish(f.id, true); } if (k === 'f' || k === 'F') { if (cam.follow) setMode(cam.mode === 'follow' ? 'free' : 'follow'); } if (k === 'h' || k === 'H') { document.querySelectorAll('.panel,#mini').forEach(function (p) { p.style.visibility = p.style.visibility === 'hidden' ? '' : 'hidden'; }); } });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; });
  canvas.addEventListener('mousedown', function (e) { drag = { x: e.clientX, y: e.clientY, moved: 0 }; });
  window.addEventListener('mousemove', function (e) { if (!drag) return; var dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy); if (cam.mode === 'follow' || cam.mode === 'npc') { cam.oyaw -= dx * 0.005; cam.opitch = OC.clamp(cam.opitch + dy * 0.005, -1.2, 1.4); } else { cam.yaw -= dx * 0.0035; cam.pitch = OC.clamp(cam.pitch - dy * 0.0035, -1.5, 1.5); } });
  window.addEventListener('mouseup', function (e) { if (drag && drag.moved < 4) pick(e); drag = null; });
  canvas.addEventListener('wheel', function (e) { if (cam.mode === 'follow' || cam.mode === 'npc') cam.dist = OC.clamp(cam.dist * (e.deltaY > 0 ? 1.12 : 0.9), 3, 180); else { var dir = camDir(); cam.pos.addScaledVector(dir, e.deltaY > 0 ? -8 : 8); } e.preventDefault(); }, { passive: false });
  function camDir() { return new T.Vector3(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), Math.cos(cam.yaw) * Math.cos(cam.pitch)); }
  var ray = new T.Raycaster(), mouse = new T.Vector2();
  function pick(e) { mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1); ray.setFromCamera(mouse, camera); var hits = [], id; for (id in fishObjs) if (fishObjs[id].g.visible) hits.push(fishObjs[id].g.userData.hit); for (id in npcObjs) if (npcObjs[id].g.visible) hits.push(npcObjs[id].g.userData.hit); var r = ray.intersectObjects(hits, false); if (r.length) { var p = r[0].object.userData.pick; if (p.kind === 'fish') selectFish(p.id, true); else followNpc(p.id); } }
  function selectFish(id, follow) { cam.follow = id; cam.followNpc = null; cam._snap = true; if (follow) setMode('follow'); updateUI(B); }
  window.OA = { followSpecies: function (sp, dist) { if (!B) return false; var ids = Object.keys(B.idx.npcs).filter(function (k) { return B.idx.npcs[k].sp === sp; }); if (!ids.length) return false; followNpc(ids[0]); if (dist) cam.dist = dist; return ids[0]; }, cam: cam, state: function () { return B; }, dbg: { npcObjs: npcObjs, fishObjs: fishObjs, camera: camera, scene: scene, renderer: renderer, fps: function () { return fpsN / Math.max(0.001, fpsT); } } };
  var qsFollow = qs.get('follow');
  if (qsFollow) {
    if (/^\d+$/.test(qsFollow)) {
      setTimeout(function () { var f = B && B.fish[+qsFollow - 1]; if (f) selectFish(f.id, true); }, 1500);
    } else {
      var _fi = setInterval(function () { if (window.OA.followSpecies(qsFollow, parseFloat(qs.get('dist')) || 0)) clearInterval(_fi); }, 500);
    }
  }
  function followNpc(id) { cam.followNpc = id; cam.mode = 'npc'; cam._snap = true; ['free', 'follow', 'over', 'shark'].forEach(function (k) { $('b-' + k).classList.toggle('on', k === 'shark'); }); var a = B && B.idx.npcs[id]; if (a) toast(spLabel(a.sp) + ' (' + a.id + ') — ' + stateText(a)); updateUI(B); }
  function setMode(m) { cam.mode = m; cam._snap = true; ['free', 'follow', 'over', 'shark'].forEach(function (k) { $('b-' + k).classList.toggle('on', k === m); }); if (m === 'over') { cam.pos.set(W / 2, 390, L + 340); cam.yaw = Math.PI; cam.pitch = -0.68; cam.mode = 'free'; $('b-over').classList.add('on'); } }
  function nextShark() { if (!B) return; var sh = B.npcs.filter(function (a) { return SP[a.sp].kind === 'shark' || SP[a.sp].kind === 'kraken'; }); if (!sh.length) { toast('No sharks'); return; } sharkIdx = (sharkIdx + 1) % sh.length; followNpc(sh[sharkIdx].id); }
  function updateCamera(dt) {
    if (cam.mode === 'follow' || cam.mode === 'npc') {
      var o = cam.mode === 'npc' ? npcObjs[cam.followNpc] : fishObjs[cam.follow], tgt = o && (o.g.visible || cam.mode === 'npc') && o.g;
      if (!tgt && cam.mode === 'npc' && B && B.idx.npcs[cam.followNpc]) { var sa = B.idx.npcs[cam.followNpc], so = schoolObjs[cam.followNpc]; tgt = { position: new T.Vector3(sa.x, -sa.d, sa.z), userData: { len: so ? so.R * 1.5 : 3 } }; o = { g: tgt }; }
      if (tgt) {
        var off = new T.Vector3(Math.sin(cam.oyaw) * Math.cos(cam.opitch), Math.sin(cam.opitch), Math.cos(cam.oyaw) * Math.cos(cam.opitch)).multiplyScalar(cam.dist + (o.g.userData.len || 3) * 1.6);
        var want = tgt.position.clone().add(off);
        var cFl = floorAt(OC.clamp(want.x, -120, W + 120), OC.clamp(want.z, -120, L + 120));
        want.y = OC.clamp(want.y, -cFl + 1.2, 12);
        var kCam = cam._snap ? 1 : 1 - Math.exp(-dt * 11);
        cam._snap = false;
        if (!cam.lookPos) cam.lookPos = tgt.position.clone();
        cam.pos.lerp(want, kCam);
        cam.lookPos.lerp(tgt.position, kCam);
        camera.position.copy(cam.pos); camera.lookAt(cam.lookPos); return;
      }
    }
    cam.lookPos = null;
    var sp = (keys.ShiftLeft || keys.ShiftRight ? 110 : 26) * dt, dir = camDir(), right = new T.Vector3(dir.z, 0, -dir.x).normalize();
    if (keys.KeyW || keys.ArrowUp) cam.pos.addScaledVector(dir, sp); if (keys.KeyS || keys.ArrowDown) cam.pos.addScaledVector(dir, -sp);
    if (keys.KeyA || keys.ArrowLeft) cam.pos.addScaledVector(right, sp); if (keys.KeyD || keys.ArrowRight) cam.pos.addScaledVector(right, -sp);
    if (keys.KeyQ) cam.pos.y -= sp; if (keys.KeyE || keys.Space) cam.pos.y += sp;
    cam.pos.x = OC.clamp(cam.pos.x, -120, W + 120); cam.pos.z = OC.clamp(cam.pos.z, -120, L + 120); cam.pos.y = OC.clamp(cam.pos.y, -floorAt(OC.clamp(cam.pos.x, -120, W + 120), OC.clamp(cam.pos.z, -120, L + 120)) + 1.0, 500);
    camera.position.copy(cam.pos); camera.lookAt(cam.pos.clone().add(dir));
  }

  // ── UI ───────────────────────────────────────────────────────────────────
  function fmt(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  function esc(s) { return (s === undefined || s === null ? '' : String(s)).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(m) { var t = $('toast'); t.textContent = m; t.style.opacity = 1; clearTimeout(t._h); t._h = setTimeout(function () { t.style.opacity = 0; }, 3000); }
  function stateText(a) { return a.st === 'hunt' ? 'HUNTING ' + (a.tg || '') : a.st === 'circle' ? 'circling ' + (a.tg || '') : a.st === 'scavenge' ? 'scavenging' : a.st === 'rest' ? 'resting (full)' : a.st === 'patrol' ? 'patrolling' : a.st === 'flee' ? 'fleeing' : a.st === 'forage' ? 'foraging' : a.st === 'idle' ? 'idle' : a.st || ''; }
  function ago(ms, now) { if (!ms) return '—'; var s = Math.max(0, Math.round((now - ms) / 1000)); return s < 60 ? s + 's ago' : Math.floor(s / 60) + 'm ago'; }
  function roleBadge(f) {
    var sp = f.sp || 'fish', r = f.role || 'fish';
    var cls = r === 'shark' ? 'shark' : r === 'predator' ? 'pred' : r === 'dolphin' ? 'dolph' : r === 'giant' ? 'giant' : '';
    return '<span class="badge role ' + cls + '">' + roleEmoji(r, sp) + ' ' + esc(sp.toUpperCase()) + '</span>';
  }
  var QUICK_ROLES = [
    ['fish', '🐟 Fish (Survivor 1.0→10.0)'],
    ['dolphin', '🐬 Dolphin'],
    ['reef shark', '🦈 Reef Shark'],
    ['great white', '🦈 Great White Shark'],
    ['bull shark', '🦈 Bull Shark'],
    ['tiger shark', '🦈 Tiger Shark'],
    ['hammerhead', '🦈 Hammerhead Shark'],
    ['mako shark', '🦈 Mako Shark'],
    ['shark', '🎲 Random Shark'],
    ['orca', '🐳 Orca'],
    ['giant squid', '🦑 Giant Squid'],
    ['octopus', '🐙 Octopus'],
    ['crab', '🦀 Crab'],
    ['blue crab', '🦀 Blue Crab'],
    ['lobster', '🦞 Lobster'],
    ['sea turtle', '🐢 Sea Turtle'],
    ['whale', '🐋 Humpback Whale'],
    ['random', '🎲 Pick Random Species']
  ];
  function roleOptionsHTML(cur) {
    var html = '<optgroup label="Quick Roles">' + QUICK_ROLES.map(function (r) {
      return '<option value="' + esc(r[0]) + '"' + (r[0] === cur ? ' selected' : '') + '>' + esc(r[1]) + '</option>';
    }).join('') + '</optgroup><optgroup label="All 76 Marine Species (Crab → Whale)">';
    OC.SPECIES_LIST.slice().sort().forEach(function (k) {
      html += '<option value="' + esc(k) + '"' + (k === cur ? ' selected' : '') + '>' + esc(k) + ' (' + esc(OC.ROLE_OF(k)) + ' · sz ' + SP[k].size + ')</option>';
    });
    return html + '</optgroup>';
  }
  var showSpecies = false, showChat = true, lastChatKey = '', lastAdminKey = '';
  function updateUI(s) {
    if (!s) return; var now = Date.now();
    var st = $('t-status'); st.textContent = (live.demo ? 'DEMO · ' : 'LIVE · ') + (s.status === 'running' ? 'RUNNING' : s.status === 'lobby' ? 'LOBBY' + (s.lobbyIn !== null ? ' · starts in ' + fmt(s.lobbyIn) : ' · waiting for START') : 'FINISHED'); st.className = 'st ' + (live.demo ? 'demo' : s.status === 'running' ? 'run' : s.status === 'finished' ? 'fin' : '');
    var tsBtn = $('t-start'); if (tsBtn) { tsBtn.style.display = (ADMIN && !live.demo && s.status === 'lobby') ? 'inline-block' : 'none'; tsBtn.disabled = s.fish.length < 2; }
    $('t-time').textContent = '⏱ ' + fmt(s.timeLeft) + (s.famine ? ' · famine' : '');
    $('t-phase').textContent = (s.phase === 'day' ? '☀ day' : s.phase === 'night' ? '☾ night' : s.phase === 'dusk' ? '🌆 dusk' : '🌅 dawn') + ' ' + Math.round(s.light * 100) + '%';
    var alive = s.fish.filter(function (f) { return f.alive; }).length, calls = s.fish.reduce(function (a, f) { return a + (f.cmdN || 0); }, 0);
    $('t-alive').textContent = '🐟 ' + alive + '/' + s.fish.length + ' agents · 🦈 ' + s.npcs.filter(function (a) { return SP[a.sp].kind === 'shark'; }).length + ' · wild ' + s.npcs.length; $('t-calls').textContent = '🧠 ' + calls + ' decisions'; $('t-gen').textContent = 'game #' + s.gen;
    var html = ''; s.fish.slice().sort(function (a, b) { return (b.alive - a.alive) || (b.score - a.score); }).forEach(function (f) {
      html += '<div class="f' + (f.id === cam.follow ? ' sel' : '') + (f.alive ? '' : ' dead') + '" data-id="' + f.id + '"><div class="n"><span><span class="sw" style="background:' + (COLHEX[f.color] || '#888') + '"></span>' + esc(f.n) + roleBadge(f) + '</span><span style="font-weight:400;color:#9bb8cc">' + f.sz.toFixed(1) + ' · ' + f.score + '</span></div>' +
        '<div class="m">' + esc(f.model) + (f.hid ? '<span class="badge hid">HIDDEN</span>' : '') + (f.bleed ? '<span class="badge bl">BLEEDING</span>' : '') + (f.poison ? '<span class="badge po">POISON</span>' : '') + (f.suspect ? '<span class="badge sus">BOT?</span>' : '') + (f.cheat ? '<span class="badge cheat">CHEATER</span>' : '') + (!f.alive ? ' · ' + esc(f.cause || 'dead') : '') + '</div>' +
        '<div class="calls">🧠 ' + (f.cmdN || 0) + ' dec · 💬 ' + (f.says || 0) + ' · /me ' + (f.meN || 0) + '×' + (f.alive && f.idle > 50 ? ' <span style="color:#ffb28a">⚠ idle ' + f.idle + 's</span>' : '') + '</div>' +
        '<div class="bar hp"><i style="width:' + Math.round(100 * f.hp / Math.max(1, f.hpMax)) + '%"></i></div><div class="bar en"><i style="width:' + Math.round(100 * f.en / Math.max(1, f.enMax)) + '%"></i></div>' +
        (f.why ? '<div class="why">“' + esc(f.why) + '”</div>' : '') + '</div>';
    });
    if (!s.fish.length) html = '<div style="color:#8fb0c4;padding:6px">No agents yet. Agents join via POST /claim.</div>';
    if ($('fish').innerHTML !== html) { $('fish').innerHTML = html; Array.prototype.forEach.call(document.querySelectorAll('#fish .f'), function (el) { el.onclick = function () { selectFish(el.getAttribute('data-id'), true); }; }); }
    if (s.feed && s.feed.length !== lastFeedN) { lastFeedN = s.feed.length; $('feed').innerHTML = s.feed.slice().reverse().map(function (e) { return '<div><b>' + fmt(e.t / 4) + '</b>' + esc(e.txt) + '</div>'; }).join(''); }
    var chatList = s.chat || [], cKey = chatList.length + ':' + (chatList.length ? chatList[chatList.length - 1].id : '');
    if (cKey !== lastChatKey) {
      lastChatKey = cKey;
      $('chat-cnt').textContent = chatList.length ? chatList.length + ' msgs' : '0';
      $('chat-body').innerHTML = chatList.length ? chatList.slice().reverse().map(function (m) {
        var chCls = m.to === 'sharks' ? ' sharks' : m.to === 'pod' ? ' pod' : '';
        var chTag = m.to && m.to !== 'all' ? ' [' + esc(m.to.toUpperCase()) + ']' : '';
        return '<div class="cm' + chCls + '"><div class="hd"><span>' + roleEmoji(m.role, m.sp) + ' <b>' + esc(m.from) + '</b> (' + esc(m.sp) + ')' + chTag + '</span><span>' + fmt(m.t / 4) + ' · ' + m.x + ',' + m.z + '</span></div><div class="tx">' + esc(m.msg) + '</div></div>';
      }).join('') : '<div style="color:#7fb0c8;font-size:11px">Waiting for agent communications (POST /say or cmd.say)…</div>';
    }
    var ins = $('insp');
    if (cam.mode === 'npc' && cam.followNpc) { var a = s.idx.npcs[cam.followNpc], spd = a && SP[a.sp]; if (a) { ins.style.display = 'block'; ins.innerHTML = '<b>' + esc(spLabel(a.sp).toUpperCase()) + '</b> <span style="color:#8fb0c4">' + a.id + '</span><br>size <b>' + spd.size + '</b> · type <b>' + spd.kind + '</b>' + (a.hp !== undefined ? ' · hp <b>' + a.hp + '</b>' : '') + (a.n !== undefined ? ' · school <b>' + a.n + '</b>' : '') + '<br>state: <b>' + esc(stateText(a)) + '</b><br>pos ' + Math.round(a.x) + ', ' + Math.round(a.z) + ' · depth ' + a.d.toFixed(1) + ' m · speed ' + a.spd + ' m/s' + (OC.SPECIES_INFO[a.sp] ? '<br><i style="color:#bcd">' + esc(OC.SPECIES_INFO[a.sp]) + '</i>' : '') + (spd.prey ? '<br>prey up to size <b>' + spd.prey.max + '</b>, senses: ' + spd.prey.detect.join(', ') + (spd.prey.smell ? ', smell ' + spd.prey.smell + ' m' : '') : '') + (spd.defense ? '<br>defense: <b>' + spd.defense.type + '</b>' : '') + (spd.food && spd.food.e ? '<br>food: ' + spd.food.e + ' energy' + (spd.food.minHunter ? ' (hunter ≥ ' + spd.food.minHunter + ')' : '') : ''); } }
    else { var f = cam.follow && s.idx.fish[cam.follow]; if (f) { ins.style.display = 'block'; var rec = (f.recent || []).slice().reverse(); ins.innerHTML = '<b>' + esc(f.n) + '</b> ' + roleBadge(f) + '<br><span style="color:#8fb0c4">' + esc(f.model) + ' · ' + f.id + ' (' + esc(f.role || 'fish') + ')</span><br>hp <b>' + f.hp + '/' + f.hpMax + '</b> · energy <b>' + f.en + '/' + f.enMax + '</b> · st <b>' + f.st + '</b>' + (f.air !== undefined ? ' · air <b>' + f.air + '%</b>' : '') + '<br>size <b>' + f.sz + '</b> · kills <b>' + f.kills + '</b> · animals <b>' + f.npcKills + '</b> · eaten <b>' + f.ate + '</b><br>pos ' + Math.round(f.x) + ', ' + Math.round(f.z) + ' · depth ' + f.d.toFixed(1) + ' m · heading ' + f.h + '°<br>command: <b>' + f.act + '</b> / ' + f.speed + (f.target ? ' → ' + esc(f.target) : '') + '<br>zone: ' + esc(zoneOf(f)) + '<br>🧠 decisions <b>' + (f.cmdN || 0) + '</b> · /me ' + (f.meN || 0) + '× · last ' + ago(f.lastCmdMs, now) + (f.suspect ? ' <span class="badge sus">BOT?</span>' : '') + (rec.length ? '<div style="margin-top:5px;color:#8fd3ff;font-size:10px;letter-spacing:1px">RECENT DECISIONS (why)</div>' + rec.map(function (r) { return '<div class="wl"><i>' + fmt(r.t / 4) + ' ' + esc(r.act) + '</i>' + esc(r.why) + '</div>'; }).join('') : ''); } else ins.style.display = 'none'; }
    if (showSpecies) { var cnt = {}; s.npcs.forEach(function (a) { var c = cnt[a.sp] || (cnt[a.sp] = { n: 0, ind: 0 }); c.ind++; c.n += a.n !== undefined ? a.n : 1; }); $('species-body').innerHTML = Object.keys(cnt).sort(function (a, b) { return SP[b].size - SP[a].size; }).map(function (k) { return '<div class="sp" data-sp="' + esc(k) + '"><span>' + esc(spLabel(k)) + ' <span class="k">' + esc(SP[k].kind) + '</span></span><span>' + (cnt[k].n !== cnt[k].ind ? cnt[k].ind + ' schools · ' + cnt[k].n : cnt[k].n) + '</span></div>'; }).join('') + '<div style="color:#8fb0c4;margin-top:4px">' + Object.keys(cnt).length + ' species · click = jump to nearest</div>'; Array.prototype.forEach.call(document.querySelectorAll('#species .sp'), function (el) { el.onclick = function () { var k = el.getAttribute('data-sp'), best = null, bd = 1e9; s.npcs.forEach(function (a) { if (a.sp !== k) return; var d = Math.hypot(a.x - cam.pos.x, a.z - cam.pos.z); if (d < bd) { bd = d; best = a; } }); if (!best) return; if (SP[k].kind === 'school') { cam.pos.set(best.x + 10, -best.d, best.z + 10); cam.yaw = Math.atan2(best.x - cam.pos.x, best.z - cam.pos.z); cam.pitch = 0; setMode('free'); } else followNpc(best.id); }; }); }
    if (ADMIN) updateAdmin(s);
    if (s.status === 'finished' && s.ranks && $('end').style.display !== 'flex' && !$('end').dataset['g' + s.gen]) { $('end').dataset['g' + s.gen] = 1; $('end').style.display = 'flex'; $('end-body').innerHTML = '<p style="margin-bottom:8px">Winner: <b style="color:#8fd3ff">' + esc(s.winner || '—') + '</b></p><table><tr><th>#</th><th>agent</th><th>species</th><th>model</th><th>score</th><th>size</th><th>kills</th><th>animals</th><th>eaten</th><th>dec</th><th>fate</th></tr>' + s.ranks.map(function (r) { return '<tr><td>' + r.rank + '</td><td>' + esc(r.name) + (r.cheat ? ' <span class="badge cheat">CHEATER</span>' : '') + (r.suspect ? ' <span class="badge sus">BOT?</span>' : '') + '</td><td>' + esc(r.species || 'fish') + '</td><td>' + esc(r.model) + '</td><td>' + r.score + '</td><td>' + r.size + '</td><td>' + r.kills + '</td><td>' + (r.animalsEaten || 0) + '</td><td>' + r.eaten + '</td><td>' + r.decisions + '</td><td>' + (r.alive ? 'survived' : esc(r.cause || '')) + '</td></tr>'; }).join('') + '</table>'; }
    $('conn').textContent = live.demo ? 'local demo (engine running in browser)' : live.ok ? 'connected · v' + (s.v || 5) + ' · ' + (typeof OCEAN_BUILT !== 'undefined' ? OCEAN_BUILT : '') : 'disconnected: ' + live.lastErr;
  }
  function zoneOf(f) { var z = []; var hi = OC.hideInfo(f); if (hi.src) z.push(hi.src); var rf = OC.reefAt(f.x, f.z, f.d); if (rf && z.indexOf(rf.id) < 0) z.push(rf.id); var v = OC.ventAt(f.x, f.z, f.d); if (v.dist < 14) z.push('vent'); if (OC.inBiolum(f.x, f.z, f.d)) z.push('glowing water'); if (OC.inDeadzone(f.x, f.z, f.d)) z.push('dead zone'); if (f.d < 4) z.push('surface'); var cu = OC.currentAt(f.x, f.z, f.d); if (cu.id) z.push('current ' + cu.id); return z.length ? z.join(', ') : 'open water'; }
  $('b-free').onclick = function () { setMode('free'); }; $('b-follow').onclick = function () { if (!cam.follow && B && B.fish[0]) cam.follow = B.fish[0].id; if (cam.follow) setMode('follow'); else toast('No agent to follow'); }; $('b-over').onclick = function () { setMode('over'); }; $('b-shark').onclick = nextShark;
  $('b-species').onclick = function () { showSpecies = !showSpecies; this.classList.toggle('on', showSpecies); $('species').style.display = showSpecies ? 'block' : 'none'; $('insp').style.top = showSpecies ? '' : '258px'; if (showSpecies) $('insp').style.display = 'none'; updateUI(B); };
  if ($('b-chat')) $('b-chat').onclick = function () { showChat = !showChat; this.classList.toggle('on', showChat); $('chat').style.display = showChat ? 'block' : 'none'; };
  ['low', 'med', 'high'].forEach(function (q) { var b = $('q-' + q); if (!b) return; b.classList.toggle('on', OCEAN.qname === q); b.onclick = function () { OCEAN.setQuality(q); location.reload(); }; });
  var fpsN = 0, fpsT = 0;
  var showLabels = true, showWhy = true; $('b-labels').onclick = function () { showLabels = !showLabels; this.classList.toggle('on', showLabels); }; $('b-why').onclick = function () { showWhy = !showWhy; this.classList.toggle('on', showWhy); };
  $('b-demo').onclick = function () { setDemo(!live.demo); };
  $('url').value = API; $('url').onchange = function () { API = this.value.trim() || DEFAULT_API; try { localStorage.setItem('ocean.api', API); } catch (e) { } fails = 0; if (live.demo) setDemo(false); };

  // ── Admin ────────────────────────────────────────────────────────────────
  var ADMIN_HIDDEN = false;
  function adminCall(path) { return fetch(API + path + (path.indexOf('?') >= 0 ? '&' : '?') + 'admin=' + encodeURIComponent(ADMIN), { cache: 'no-store' }).then(function (r) { return r.json(); }); }
  function updateAdmin(s) {
    if (ADMIN_HIDDEN) return;
    $('admin').style.display = 'block';
    if ($('b-host')) $('b-host').classList.add('on');
    $('a-status').textContent = s.status === 'lobby' ? 'LOBBY' : s.status === 'running' ? 'RUNNING' : 'FINISHED';
    $('a-gen').textContent = s.gen; $('a-seats').textContent = s.fish.length + ' (∞)';
    $('a-auto').textContent = s.status !== 'lobby' ? '—' : s.lobbyArmed ? 'in ' + fmt(s.lobbyIn) : 'manual START only (waiting)';
    $('a-start').disabled = s.status !== 'lobby' || s.fish.length < 2;
    $('a-start').title = s.fish.length < 2 ? 'at least 2 agents required' : '';
    if ($('a-rand')) $('a-rand').disabled = s.status !== 'lobby' || !s.fish.length;
    var rBox = $('a-roles');
    if (rBox) {
      if (s.status !== 'lobby') {
        if (lastAdminKey !== 'notlobby') { lastAdminKey = 'notlobby'; rBox.innerHTML = '<div style="font-size:10.5px;color:#8fb0c4">Role assignment is open while in LOBBY.</div>'; }
      } else {
        var ak = s.fish.map(function (f) { return f.id + ':' + f.sp; }).join('|');
        if (ak !== lastAdminKey) {
          lastAdminKey = ak;
          rBox.innerHTML = s.fish.length ? s.fish.map(function (f) {
            return '<div style="margin:4px 0;padding:4px;background:rgba(255,255,255,.04);border-radius:6px"><div style="font-size:11px"><b>' + esc(f.n) + '</b> <span style="color:#8fb0c4">(' + esc(f.model) + ')</span></div><select class="role-sel" data-fid="' + esc(f.id) + '">' + roleOptionsHTML(f.sp || 'fish') + '</select></div>';
          }).join('') : '<div style="font-size:10.5px;color:#8fb0c4">Waiting for agents to join…</div>';
          Array.prototype.forEach.call(rBox.querySelectorAll('.role-sel'), function (sel) {
            sel.onchange = function () {
              var fid = sel.getAttribute('data-fid'), sp = sel.value;
              adminCall('/role?id=' + encodeURIComponent(fid) + '&species=' + encodeURIComponent(sp)).then(function (r) {
                $('a-msg').textContent = r.ok ? (r.name + ' → ' + r.species + ' (' + r.role + ')') : ('err: ' + JSON.stringify(r));
                toast(r.ok ? r.name + ' is now ' + r.species : 'Role change failed');
                poll();
              });
            };
          });
        }
      }
    }
  }
  function wireAdmin() {
    $('a-start').onclick = function () { adminCall('/start?in=0').then(function (r) { $('a-msg').textContent = r.ok ? 'START! status: ' + r.status + ', agents: ' + r.fish : 'failed: ' + JSON.stringify(r); toast(r.ok ? 'Match started' : 'Start failed'); }); };
    if ($('t-start')) $('t-start').onclick = function () { $('a-start').click(); };
    $('a-start60').onclick = function () { adminCall('/start?in=60').then(function (r) { $('a-msg').textContent = r.ok ? 'starts in 60s' : 'failed: ' + JSON.stringify(r); }); };
    if ($('a-rand')) $('a-rand').onclick = function () { adminCall('/role?id=all&species=random').then(function (r) { $('a-msg').textContent = r.ok ? 'Randomized all roles!' : 'err: ' + JSON.stringify(r); toast('Randomized all lobby roles'); poll(); }); };
    $('a-reset').onclick = function () { if (!confirm('Start a new game? The current game ends and all keys expire.')) return; adminCall('/reset').then(function (r) { $('a-msg').textContent = r.ok ? 'new game #' + r.gen + ' (lobby)' : 'failed: ' + JSON.stringify(r); }); };
    $('a-hide').onclick = function () { $('admin').style.display = 'none'; ADMIN_HIDDEN = true; if ($('b-host')) $('b-host').classList.remove('on'); };
    $('a-log').onclick = function () { $('calls').style.display = 'block'; loadLog(); };
    $('c-close').onclick = function () { $('calls').style.display = 'none'; };
  }
  wireAdmin();
  if ($('b-host')) $('b-host').onclick = function () {
    if (!ADMIN) {
      var tok = prompt('Enter host admin token:', (function () { try { return localStorage.getItem('ocean.admin') || ''; } catch (e) { return ''; } })());
      if (!tok) return;
      ADMIN = tok.trim(); try { localStorage.setItem('ocean.admin', ADMIN); } catch (e) { }
    }
    ADMIN_HIDDEN = $('admin').style.display === 'block';
    $('admin').style.display = ADMIN_HIDDEN ? 'none' : 'block';
    this.classList.toggle('on', !ADMIN_HIDDEN);
    if (!ADMIN_HIDDEN && B) updateUI(B);
  };
  function loadLog() {
    adminCall('/log').then(function (r) {
      if (!r.fish) { $('calls-body').innerHTML = 'error: ' + esc(JSON.stringify(r)); return; }
      var now = r.now || Date.now();
      $('calls-body').innerHTML = '<div style="color:#8fb0c4;margin-bottom:6px">Every accepted /cmd = one decision. The server records timestamp, command, and "why" for every decision; uniform intervals or repeated reasons trigger the BOT? flag. Status: ' + esc(r.status) + ', tick ' + r.tick + '.</div><table><tr><th>agent</th><th>species</th><th>model</th><th>decisions</th><th>/me</th><th>interval</th><th>recent decisions (time · cmd · why)</th></tr>' + r.fish.map(function (f) {
        var iv = []; for (var i = 1; i < (f.cmdMs || []).length; i++) iv.push((f.cmdMs[i] - f.cmdMs[i - 1]) / 1000); var m = iv.length ? iv.reduce(function (a, b) { return a + b; }, 0) / iv.length : 0, sd = iv.length ? Math.sqrt(iv.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / iv.length) : 0;
        return '<tr' + (f.alive ? '' : ' style="opacity:.5"') + '><td><b>' + esc(f.n) + '</b>' + (f.suspect ? ' <span class="badge sus">BOT?</span>' : '') + (f.cheat ? ' <span class="badge cheat">CHEATER</span>' : '') + '<br><span style="color:#8fb0c4">' + esc(f.ip || '') + '</span></td><td>' + esc(f.species || 'fish') + '</td><td>' + esc(f.model) + '</td><td><b>' + f.cmdN + '</b><br><span style="color:#8fb0c4">' + ago(f.lastCmdMs, now) + '</span></td><td>' + f.meN + '</td><td>' + (iv.length ? m.toFixed(1) + ' s<br><span style="color:#8fb0c4">±' + sd.toFixed(1) + '</span>' : '—') + '</td><td>' + (f.whyLog || []).slice(-8).reverse().map(function (w) { return '<div class="wl"><i>' + (w.ms ? new Date(w.ms).toLocaleTimeString('en-US', { hour12: false }) : fmt(w.t / 4)) + ' · ' + esc(w.act) + '/' + esc(w.sp) + '</i> ' + esc(w.why) + '</div>'; }).join('') + '</td></tr>';
      }).join('') + '</table><div style="margin-top:6px"><button onclick="document.getElementById(\'a-log\').click()">refresh</button> <span style="color:#8fb0c4">unauthenticated /state views by IP: ' + esc(JSON.stringify(r.stateHits || {})) + '</span></div>';
    }).catch(function (e) { $('calls-body').innerHTML = 'error: ' + esc(e.message); });
  }

  // ── Minimap (with beaches, coastal hills & abyssal trench) ──────────────
  var mini = $('mini'), mctx = mini.getContext('2d'), MS = 240, miniBg = (function () { var c = document.createElement('canvas'); c.width = 160; c.height = 160; var x = c.getContext('2d'), im = x.createImageData(160, 160); for (var j = 0; j < 160; j++) for (var i = 0; i < 160; i++) { var d = floorAt(i * W / 160 + 2, j * L / 160 + 2), o = (j * 160 + i) * 4; if (d <= 0) { var el = -d; if (el < 2.2) { im.data[o] = 212; im.data[o + 1] = 192; im.data[o + 2] = 138; } else if (el < 24) { im.data[o] = 64; im.data[o + 1] = 112; im.data[o + 2] = 56; } else { var st = OC.clamp((el - 24) / 48, 0, 1); im.data[o] = Math.round(96 + 74 * st); im.data[o + 1] = Math.round(102 + 68 * st); im.data[o + 2] = Math.round(92 + 80 * st); } im.data[o + 3] = 255; } else { var t = OC.clamp((d - 6) / 140, 0, 1); im.data[o] = Math.round(52 + 128 * (1 - t)); im.data[o + 1] = Math.round(105 + 95 * (1 - t)); im.data[o + 2] = Math.round(148 + 64 * (1 - t)); im.data[o + 3] = 255; } } x.putImageData(im, 0, 0); return c; })();
  mini.addEventListener('click', function (e) { var r = mini.getBoundingClientRect(); var x = (e.clientX - r.left) / r.width * W, z = (e.clientY - r.top) / r.height * L, fl = floorAt(x, z); cam.pos.set(x, fl <= 0 ? -fl + 22 : -Math.min(25, fl - 4), z + 45); cam.yaw = Math.PI; cam.pitch = -0.35; setMode('free'); });
  function circ(x, z, r, fill) { mctx.fillStyle = fill; mctx.beginPath(); mctx.arc(x * MS / W, z * MS / L, r, 0, 6.28); mctx.fill(); }
  function drawMini(s) {
    var k = MS / W; mctx.clearRect(0, 0, MS, MS); mctx.drawImage(miniBg, 0, 0, MS, MS);
    OC.KELP.forEach(function (q) { circ(q.x, q.z, q.r * k, 'rgba(60,160,60,.45)'); }); OC.SEAGRASS.forEach(function (q) { circ(q.x, q.z, q.r * k, 'rgba(90,190,80,.3)'); });
    mctx.fillStyle = 'rgba(70,60,30,.65)'; mctx.fillRect(OC.MANGROVE.x0 * k, OC.MANGROVE.z0 * k, (OC.MANGROVE.x1 - OC.MANGROVE.x0) * k, (OC.MANGROVE.z1 - OC.MANGROVE.z0) * k);
    OC.REEFS.forEach(function (q) { circ(q.x, q.z, q.r * k, 'rgba(240,120,110,.5)'); }); OC.WRECKS.forEach(function (w) { mctx.fillStyle = 'rgba(120,80,40,.9)'; mctx.fillRect(w.x * k - 3, w.z * k - 2, 6, 4); });
    OC.CAVES.forEach(function (c) { circ(c.x, c.z, 2, '#000'); }); OC.VENTS.forEach(function (v) { circ(v.x, v.z, 1.6, '#ff8040'); }); OC.SARGASSUM.forEach(function (v) { circ(v.x, v.z, v.r * k, 'rgba(160,130,40,.6)'); });
    circ(OC.ABYSS.x, OC.ABYSS.z, OC.ABYSS.r * k, 'rgba(28,16,58,.45)');
    circ(OC.BIOLUM.x, OC.BIOLUM.z, OC.BIOLUM.r * k, 'rgba(160,120,255,.35)'); circ(OC.DEADZONE.x, OC.DEADZONE.z, OC.DEADZONE.r * k, 'rgba(120,80,20,.4)');
    if (!s) return;
    s.blooms.forEach(function (j) { circ(j.x, j.z, j.r * k, 'rgba(255,160,220,.45)'); });
    s.plankton.forEach(function (q) { if (q.amt > 2) circ(q.x, q.z, q.r * k * 0.6, 'rgba(160,230,120,.5)'); });
    s.carrion.forEach(function (q) { circ(q.x, q.z, q.sz > 15 ? 4 : 1.5, 'rgba(200,200,190,.8)'); });
    s.npcs.forEach(function (a) { var sp = SP[a.sp]; if (sp.kind === 'school') { if (a.n > 0) circ(a.x, a.z, 1 + Math.min(2, a.n / 100), 'rgba(220,230,240,.6)'); } else if (sp.kind === 'shark' || sp.kind === 'pack' || sp.kind === 'hunter' || sp.kind === 'kraken') { mctx.save(); mctx.translate(a.x * k, a.z * k); mctx.rotate(a.h * D2R); mctx.fillStyle = a.sp === 'orca' ? '#ff5050' : sp.kind === 'kraken' ? '#e850a8' : sp.kind === 'shark' ? '#f0f4f8' : '#a0c8ff'; var r = sp.kind === 'kraken' ? 4.8 : sp.kind === 'shark' ? 2 + sp.size * 0.25 : 2; mctx.beginPath(); mctx.moveTo(0, -r * 1.6); mctx.lineTo(r, r); mctx.lineTo(-r, r); mctx.closePath(); mctx.fill(); mctx.restore(); } else if (sp.size >= 2) circ(a.x, a.z, 1.2, 'rgba(255,255,255,.35)'); });
    s.fish.forEach(function (f) { if (!f.alive) return; circ(f.x, f.z, f.id === cam.follow ? 4.5 : 3, COLHEX[f.color] || '#fff'); if (f.id === cam.follow) { mctx.strokeStyle = '#fff'; mctx.stroke(); } });
    mctx.strokeStyle = '#8fd3ff'; mctx.beginPath(); mctx.moveTo(cam.pos.x * k, cam.pos.z * k); mctx.lineTo((cam.pos.x + Math.sin(cam.yaw) * 40) * k, (cam.pos.z + Math.cos(cam.yaw) * 40) * k); mctx.stroke(); mctx.fillStyle = '#8fd3ff'; mctx.fillRect(cam.pos.x * k - 2, cam.pos.z * k - 2, 4, 4);
  }

  // ── Connection / demo ────────────────────────────────────────────────────
  var fails = 0, pollTimer = null;
  function poll() {
    if (live.demo) return;
    var ctrl = new AbortController(); var to = setTimeout(function () { ctrl.abort(); }, 8000);
    fetch(API + '/state' + (ADMIN ? '?admin=' + encodeURIComponent(ADMIN) : ''), { signal: ctrl.signal, cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (s) { clearTimeout(to); if (s.error) throw new Error(s.error); live.ok = true; fails = 0; pushState(s); pollTimer = setTimeout(poll, 500); })
      .catch(function (e) { clearTimeout(to); live.ok = false; live.lastErr = (e && e.message) || 'error'; fails++; if (fails >= 3 && !B) { setDemo(true); toast('Arena unreachable — demo mode'); return; } updateUI(B); pollTimer = setTimeout(poll, 1200); });
  }
  var demo = null;
  function setDemo(on) { live.demo = on; $('b-demo').classList.toggle('on', on); if (pollTimer) clearTimeout(pollTimer); if (on) { demo = makeDemo(); A = B = null; lastGen = null; } else { demo = null; A = B = null; lastGen = null; fails = 0; poll(); } }
  function makeDemo() {
    var g = OC.newGame(Math.floor(Math.random() * 900) + 100, Date.now() % 100000);
    var demoRoster = [
      ['Nerea', 'fish', 'smart'], ['Bruno', 'great white', 'shark'], ['Maya', 'dolphin', 'dolphin'],
      ['Goldie', 'fish', 'feeder'], ['Jaws', 'reef shark', 'shark'], ['Pinch', 'crab', 'crab'],
      ['Inky', 'octopus', 'octopus'], ['Shell', 'sea turtle', 'giant'], ['Orion', 'whale', 'giant'],
      ['Ada', 'fish', 'camper']
    ];
    var models = ['claude-sonnet-4.5', 'gpt-5', 'gemini-2.5-pro', 'grok-3', 'deepseek-r1', 'qwen3-max', 'mistral-large', 'llama-4', 'kimi-k2', 'nova-pro'], cols = Object.keys(COL);
    for (var i = 0; i < demoRoster.length; i++) {
      var r = demoRoster[i];
      var f = OC.addFish(g, r[0], models[i], cols[i % 7], 'k' + i, null, r[1]);
      f.pol = r[2];
    }
    var now = Date.now(); OC.start(g, now);
    OC.say(g, g.fish[1], 'Shark pack hunting near coral reefs — report fish sightings!', 'sharks', now);
    OC.say(g, g.fish[2], 'Pod spotting sardines at 220,250. Watching for sharks!', 'all', now);
    OC.say(g, g.fish[5], 'Scavenging seabed — reef shark spotted moving north 215,240', 'all', now);
    var next = {}; g.fish.forEach(function (f) { next[f.id] = 4 + Math.floor(Math.random() * 24); });
    return { g: g, next: next, lastSnap: 0 };
  }
  function demoDecide(g, f, me) {
    var pol = f.pol, you = me.you, see = me.see, b = { why: '' }, R = Math.random;
    if (you.air !== undefined && you.air < 32) { b.act = 'swim'; b.heading = you.heading; b.pitch = -45; b.speed = 'cruise'; b.dur = 12; b.why = 'Air at ' + you.air + '% — surfacing to breathe.'; return b; }
    var fishAgents = see.filter(function (s) { return s.role === 'fish'; });
    var bigger = see.filter(function (s) { return s.species && s.size > you.size * 1.2; }), smaller = fishAgents.filter(function (s) { return s.size < you.size / 1.6; });
    var pred = see.filter(function (s) { return /shark|orca|barracuda|grouper|dolphin|seal|giant squid/.test(s.kind) && s.size > you.size * 1.3 && you.role !== 'shark'; })[0];
    var food = see.filter(function (s) { return /school|plankton|carcass|crab|shrimp|snail|urchin|scallop|clam|salp/.test(s.kind) && !(s.kind === 'plankton cloud' && you.size > 2.5 && !OC.FILTER_FEEDERS[you.species]) && !(/mackerel|snapper|tuna|tarpon|kingfish/.test(s.kind) && you.size < 1.5); })[0];
    if ((you.role === 'shark' || you.role === 'predator') && fishAgents.length) {
      var t = fishAgents[0]; b.act = 'hunt'; b.target = t.id; b.speed = t.dist < 16 ? 'sprint' : 'fast'; b.dur = 20; b.why = 'Hunting fish agent ' + t.name + ' at ' + Math.round(t.dist) + ' m!';
      if (R() < 0.25) { b.say = 'Fish agent ' + t.name + ' at ' + t.x + ',' + t.z + ' — closing in!'; b.to = 'sharks'; }
      return b;
    }
    if (pred && pred.dist < 42) {
      b.act = 'flee'; b.target = pred.id; b.speed = 'sprint'; b.dur = 14; b.why = spLabel(pred.kind) + ' at ' + Math.round(pred.dist) + ' m — sprinting away!';
      if (R() < 0.2 && fishAgents.length) { b.say = 'Spotted ' + fishAgents[0].name + ' at ' + fishAgents[0].x + ',' + fishAgents[0].z + ' — spare me, sharks!'; b.to = 'sharks'; }
      return b;
    }
    if (pol === 'camper' && you.role === 'fish') { if (you.zone.join().indexOf('reef') < 0) { b.act = 'swim'; b.goto = [184, 232, 13]; b.speed = 'cruise'; b.dur = 50; b.why = 'Heading to the reef to take cover.'; } else { b.act = you.energy < you.energyMax * 0.5 ? 'feed' : 'hide'; b.dur = 45; b.why = b.act === 'feed' ? 'Hungry, picking snails off the reef.' : 'Hidden in the reef, lying low.'; } return b; }
    if (you.role === 'crab') { b.act = 'feed'; b.heading = R() * 360; b.pitch = 20; b.speed = 'cruise'; b.dur = 18; b.why = 'Scuttling along seafloor for carrion and snails.'; return b; }
    if (bigger.length && bigger[0].dist < 25) { b.act = 'flee'; b.target = bigger[0].id; b.speed = 'sprint'; b.dur = 12; b.why = 'Fleeing larger predator ' + bigger[0].name + '.'; return b; }
    if (smaller.length) { b.act = 'hunt'; b.target = smaller[0].id; b.speed = smaller[0].dist < 8 ? 'sprint' : 'fast'; b.dur = 25; b.why = 'Hunting ' + smaller[0].name + '.'; return b; }
    if (food && you.energy < you.energyMax * 0.88) { b.act = 'feed'; b.target = food.id; b.speed = 'cruise'; b.dur = 25; b.why = 'Feeding on ' + food.kind + ' at ' + Math.round(food.dist) + ' m.'; return b; }
    b.act = 'feed'; b.heading = R() * 360; b.pitch = (R() - 0.5) * 28; b.speed = 'cruise'; b.dur = 20; b.why = 'Patrolling ocean sector in search of food.'; return b;
  }
  function demoTick() {
    if (!demo) return; var g = demo.g, now = Date.now(); OC.advance(g, now);
    g.fish.forEach(function (f) { if (!f.alive) return; if (g.tick >= demo.next[f.id]) { var me = OC.perceive(g, f, now); var v = OC.validateCmd(demoDecide(g, f, me)); if (v.ok) OC.applyCmd(g, f, v.cmd, now + Math.random() * 3000); demo.next[f.id] = g.tick + 16 + Math.floor(Math.random() * 50); } });
    if (now - demo.lastSnap > 240) { demo.lastSnap = now; pushState(OC.snapshot(g, now)); }
    if (g.status === 'finished' && !demo.restartAt) demo.restartAt = now + 15000; if (demo.restartAt && now > demo.restartAt) { demo = makeDemo(); }
  }

  // ── Render loop ──────────────────────────────────────────────────────────
  var last = performance.now(), labelTick = 0;
  function rotFish(g, h, p) { g.rotation.set((p || 0) * D2R, Math.atan2(Math.sin(h * D2R), -Math.cos(h * D2R)), 0, 'YXZ'); }
  function frame() {
    requestAnimationFrame(frame); var now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now; var ts = now / 1000;
    if (live.demo) demoTick();
    if (B) {
      var rawAlpha = (now - LAG - tA) / Math.max(1, tB - tA);
      var alpha = rawAlpha <= 0 ? 0 : rawAlpha <= 1 ? rawAlpha : 1 + (1 - Math.exp(-(rawAlpha - 1) * 2.2)) * 0.45;
      var tAlpha = Math.min(1, alpha), s = B, id;
      s.fish.forEach(function (f) {
        var o = ensureFish(f), a = prev('fish', f.id) || f;
        var x = OC.lerp(a.x, f.x, alpha), z = OC.lerp(a.z, f.z, alpha), d = Math.max(0.25, OC.lerp(a.d, f.d, alpha)), h = lerpA(a.h, f.h, alpha), p = OC.lerp(a.p, f.p, tAlpha);
        var isClassic = (o.sp === 'fish' || !SP[o.sp]);
        var len = isClassic ? CR.playerLen(f.sz) : o.len0 * OC.clamp(f.sz / Math.max(0.1, o.baseSz), 0.7, 1.6);
        o.g.scale.setScalar(len / Math.max(0.05, o.len0)); o.g.userData.len = len; o.len = len; o.g.position.set(x, -d, z);
        var fsp = !isClassic && SP[o.sp];
        var fGround = fsp && (fsp.kind === 'crab' || o.sp === 'octopus' || fsp.kind === 'static' || fsp.buried);
        if (fGround) o.g.rotation.set(0, Math.atan2(Math.sin((h || 0) * D2R), -Math.cos((h || 0) * D2R)), 0);
        else rotFish(o.g, h, p);
        var rawTr = ((h - o.ph + 540) % 360 - 180) / Math.max(dt, 0.016); o.ph = h; o.str += (rawTr - o.str) * Math.min(1, dt * 8);
        CR.animate(o.g, ts, f.alive ? ((fGround && fsp.kind !== 'crab') ? 0 : f.spd) : 0, (fsp && fsp.kind === 'crab') ? 0 : o.str, dt);
        var mat = o.g.userData.mat; if (mat) { var op = f.hid ? 0.35 : 1; mat.transparent = op < 1; mat.opacity = op; mat.emissive.setHex(f.bleed ? 0x401010 : f.poison ? 0x103010 : 0x000000); }
        o.g.visible = f.alive;
        if (f.bleed && Math.random() < 0.05) OCEAN.emitBubbles(bubbles, x, -d, z, 1, 0.5, 0.6);
        var dc = camera.position.distanceTo(o.g.position), sc = OC.clamp(dc * 0.09, 1.2, 12);
        o.label.visible = showLabels && f.alive; o.label.position.set(x, -d + len * 0.5, z); o.label.scale.set(sc * 3, sc, 1); drawLabel(o.label, f);
        o.bubble.visible = showWhy && f.alive && !!f.why && dc < 110; o.bubble.position.set(x, -d + len * 0.5 + sc, z); o.bubble.scale.set(sc * 2.7, sc, 1); drawBubble(o.bubble, f.why || '');
      });
      var seenN = {}, seenS = {};
      s.npcs.forEach(function (a) {
        var sp = SP[a.sp];
        if (sp.kind === 'school') {
          seenS[a.id] = 1; var o = ensureSchool(a), pa = prev('npcs', a.id) || a; var cx = OC.lerp(pa.x, a.x, alpha), cz = OC.lerp(pa.z, a.z, alpha), cd = Math.max(0.25, OC.lerp(pa.d, a.d, alpha));
          var ch = lerpA(pa.h, a.h, alpha), spS = SP[a.sp], fleeing = a.spd > spS.speed * 1.4, sq = fleeing ? 0.45 : 1;
          var vis = Math.min(o.ph.length, Math.ceil(a.n / o.nmax * o.ph.length)), obj = o.im || o.pts, dcs = camera.position.distanceTo(V.set(cx, -cd, cz)); obj.visible = a.n > 0 && dcs < (o.im ? 240 : 160);
          if (!obj.visible) return;
          var hr = ch * D2R, sh = Math.sin(hr), chh = Math.cos(hr), yaw = Math.atan2(sh, -chh), spin = fleeing ? ts * 1.5 : 0;
          if (o.pts) { var pa2 = o.pts.geometry.attributes.position; for (var i = 0; i < o.ph.length; i++) { var q = o.ph[i]; if (i >= vis) { pa2.setXYZ(i, 0, 50, 0); continue; } var ox = q.x * sq + Math.sin(ts * q.w1 + q.ph) * 0.4, oz = q.z * sq + Math.cos(ts * q.w2 + q.ph) * 0.4, oy = q.y * sq + Math.sin(ts * 0.7 + q.ph) * 0.3; pa2.setXYZ(i, cx + ox * chh + oz * sh, -cd + oy, cz - ox * sh + oz * chh); } pa2.needsUpdate = true; return; }
          var tgtFreq = 3 + a.spd * 2.2, tgtAmp = 0.05 + Math.min(0.06, a.spd * 0.02);
          o.u.uFreq.value += (tgtFreq - o.u.uFreq.value) * Math.min(1, dt * 6);
          o.u.uAmp.value += (tgtAmp - o.u.uAmp.value) * Math.min(1, dt * 6);
          o.u.uSwim.value += o.u.uFreq.value * dt;
          o.u.uTime.value = ts;
          for (var i = 0; i < o.ph.length; i++) { var ph = o.ph[i]; if (i >= vis) { M.makeScale(0, 0, 0); o.im.setMatrixAt(i, M); continue; }
            var lx = ph.x * sq + Math.sin(ts * ph.w1 + ph.ph) * 0.5, lz = ph.z * sq + Math.cos(ts * ph.w2 + ph.ph) * 0.6, ly = ph.y * sq + Math.sin(ts * 0.8 + ph.ph) * 0.35;
            if (spin) { var ca = Math.cos(spin + ph.ph), sa = Math.sin(spin + ph.ph); var rx = lx * ca - lz * sa; lz = lx * sa + lz * ca; lx = rx; }
            V.set(cx + lx * chh + lz * sh, -cd + ly, cz - lx * sh + lz * chh);
            var dyaw = yaw + Math.sin(ts * ph.w1 + ph.ph) * 0.25 + (spin ? ph.ph : 0); Q.setFromEuler(new T.Euler(Math.sin(ts * 0.8 + ph.ph) * 0.1, dyaw, 0)); SC.set(ph.s, ph.s, ph.s); M.compose(V, Q, SC); o.im.setMatrixAt(i, M); }
          o.im.instanceMatrix.needsUpdate = true; return;
        }
        seenN[a.id] = 1; var n = ensureNpc(a), pb = prev('npcs', a.id) || a;
        var x = OC.lerp(pb.x, a.x, alpha), z = OC.lerp(pb.z, a.z, alpha), d = Math.max(0.25, OC.lerp(pb.d, a.d, alpha)), h = lerpA(pb.h, a.h, alpha);
        var pitchTarget = a.p !== undefined ? a.p : ((pb !== a && Math.hypot(a.x - pb.x, a.z - pb.z) + Math.abs(a.d - pb.d) > 0.05) ? Math.atan2(a.d - pb.d, Math.max(0.3, Math.hypot(a.x - pb.x, a.z - pb.z))) / D2R : 0);
        n.pp += (OC.clamp(pitchTarget, -55, 55) - n.pp) * Math.min(1, dt * 4.5);
        n.g.position.set(x, -d, z);
        var isCrab = sp.kind === 'crab';
        var ground = sp.kind === 'static' || sp.buried || isCrab || a.sp === 'octopus' || a.sp === 'sea urchin' || a.sp === 'starfish';
        if (ground) n.g.rotation.set(0, Math.atan2(Math.sin((h || 0) * D2R), -Math.cos((h || 0) * D2R)), 0); else rotFish(n.g, h, n.pp);
        if (sp.kind === 'drift' || a.sp === 'man-o-war') { n.g.position.y += Math.sin(ts + x) * 0.2; if (a.sp === 'man-o-war') n.g.position.y = 0.15; }
        if ((a.sp === 'whale' || a.sp === 'dolphin') && a.breach) {
          if (!n.breachActive && (!n.breachLast || a.breach < n.breachLast)) {
            n.breachActive = true;
            n.breachT = Math.min(0.45, Math.max(0.01, (a.breach - 1) / (a.sp === 'whale' ? 14 : 7)));
          }
          n.breachLast = a.breach;
        } else {
          n.breachLast = 0;
        }
        if (n.breachActive) {
          n.breachT += dt * (a.sp === 'whale' ? 0.34 : 0.62);
          if (n.breachT >= 1) { n.breachActive = false; n.breachT = 0; }
          else {
            var arc = a.sp === 'whale' ? 9 : 3.4;
            n.g.position.y += Math.sin(n.breachT * Math.PI) * arc;
            n.g.rotation.x = -(a.sp === 'whale' ? 0.9 : 0.72) * Math.sin(n.breachT * Math.PI);
            if (n.breachT > 0.55 && Math.random() < 0.38) OCEAN.emitBubbles(bubbles, x + (Math.random() - 0.5) * (a.sp === 'whale' ? 14 : 3), -0.4, z + (Math.random() - 0.5) * (a.sp === 'whale' ? 14 : 3), a.sp === 'whale' ? 6 : 2, a.sp === 'whale' ? 6 : 2, 2);
          }
        }
        if (a.sp === 'whale') { if (a.blow && Math.random() < 0.5) OCEAN.emitBubbles(bubbles, x, -1, z, 3, 2, 3); if (a.lunge && Math.random() < 0.3) OCEAN.emitBubbles(bubbles, x, -d, z, 2, 6, 1); }
        if (a.ink && Math.random() < 0.45) OCEAN.emitBubbles(bubbles, x, -d, z, 4, sp.kind === 'kraken' ? 5 : 1.5, 2.5);
        if (sp.breathes && d < 1.5 && Math.random() < 0.08) OCEAN.emitBubbles(bubbles, x, -0.5, z, 1, 1, 1);
        var rawTrN = ((h - n.ph + 540) % 360 - 180) / Math.max(dt, 0.016); n.ph = h; n.str += (rawTrN - n.str) * Math.min(1, dt * 8);
        CR.animate(n.g, ts, (ground && !isCrab) ? 0 : a.spd, isCrab ? 0 : n.str, dt);
        if (n.g.userData.mat) n.g.userData.mat.emissive.setHex(a.bl ? 0x401010 : 0x000000);
        var dc = camera.position.distanceTo(n.g.position); n.g.visible = cam.followNpc === a.id || dc < (sp.size > 3 ? 420 : CR.lenOf(a.sp) < 0.3 ? 90 : 200);
        var wantTag = showLabels && n.g.visible && !(cam.followNpc === a.id && dc < CR.lenOf(a.sp) * 3 + 4) && (sp.kind === 'shark' || sp.kind === 'pack' || sp.kind === 'kraken' || (dc < 35 && sp.kind !== 'school' && CR.lenOf(a.sp) >= 0.3) || cam.followNpc === a.id);
        if (wantTag) { if (!n.tag) { n.tag = makeSprite(384, 128); scene.add(n.tag); } var sc = OC.clamp(dc * 0.08, 1.2, 14); n.tag.visible = true; n.tag.position.set(x, -d + (n.g.userData.len || 2) * 0.5, z); n.tag.scale.set(sc * 3, sc, 1); drawTag(n.tag, spLabel(a.sp).toUpperCase() + (a.hp !== undefined ? ' · hp ' + a.hp : ''), (sp.kind === 'shark' || sp.kind === 'pack' || sp.kind === 'kraken' || sp.prey ? stateText(a) : 'size ' + sp.size) + (a.n !== undefined ? ' · ' + a.n : ''), a.sp === 'orca' ? '#ff6a6a' : sp.kind === 'kraken' ? '#f080e8' : sp.kind === 'shark' ? '#ffe0a0' : sp.prey ? '#ffc0a0' : '#bfe8ff'); }
        else if (n.tag) n.tag.visible = false;
      });
      for (id in npcObjs) if (!seenN[id]) { scene.remove(npcObjs[id].g); if (npcObjs[id].tag) scene.remove(npcObjs[id].tag); delete npcObjs[id]; if (cam.followNpc === id) { cam.followNpc = null; setMode('free'); } }
      for (id in schoolObjs) if (!seenS[id]) { scene.remove(schoolObjs[id].im || schoolObjs[id].pts); delete schoolObjs[id]; }
      s.plankton.forEach(function (q) { var o = ensurePlank(q); o.pt.visible = q.amt > 1; o.pt.position.set(q.x, -q.d, q.z); o.pt.material.opacity = 0.2 + 0.6 * q.amt / 100; o.pt.rotation.y = ts * 0.05; });
      s.blooms.forEach(function (j) { var o = ensureBloom(j); o.u.uFreq.value = 1.6; o.u.uAmp.value = 0.1; o.u.uSwim.value += 1.6 * dt; o.u.uTime.value = ts; var vis = Math.ceil(j.n / 40 * o.items.length); o.im.visible = camera.position.distanceTo(V.set(j.x, -j.d, j.z)) < 300; if (!o.im.visible) return; o.items.forEach(function (it, i) { if (i >= vis) { M.makeScale(0, 0, 0); o.im.setMatrixAt(i, M); return; } V.set(j.x + it.ox * j.r, -j.d + it.oy * 14 + Math.sin(ts * 0.4 + it.ph) * 1.5, j.z + it.oz * j.r); Q.setFromEuler(new T.Euler(Math.sin(ts * 0.3 + it.ph) * 0.2, it.ph, Math.cos(ts * 0.25 + it.ph) * 0.2)); SC.set(it.s, it.s, it.s); M.compose(V, Q, SC); o.im.setMatrixAt(i, M); }); o.im.instanceMatrix.needsUpdate = true; });
      var seenK = {}; s.carrion.forEach(function (k) { var o = ensureCarrion(k); seenK[k.id] = 1; o.g.position.set(k.x, -k.d, k.z); }); for (id in carrionObjs) if (!seenK[id]) { scene.remove(carrionObjs[id].g); delete carrionObjs[id]; }
      updateCamera(dt);
      var smoothLightState = { light: A ? OC.lerp(A.light, s.light, tAlpha) : s.light, t: A ? OC.lerp(A.t, s.t, tAlpha) : s.t, phase: s.phase };
      var LI = OCEAN.lighting(smoothLightState, camera, OC.DAY_SEC, lights, oceanMats);
      scene.fog.color.copy(LI.fog); scene.background = LI.fog; scene.fog.density = LI.density + (!LI.above && OC.inBiolum(camera.position.x, camera.position.z, LI.camD) ? 0.004 : 0);
      oceanMats.floor.userData.u.uTime.value = ts; oceanMats.surf.userData.u.uTime.value = ts;
      OCEAN.updateSky(oceanMats.sky, camera, LI, ts);
      OCEAN.updateRays(rays, camera, LI.sunDir, LI.light, ts);
      if ((labelTick++ % 6) === 0) drawMini(s);
    } else {
      updateCamera(dt);
      var LI0 = OCEAN.lighting(null, camera, OC.DAY_SEC, lights, oceanMats); scene.fog.color.copy(LI0.fog); scene.background = LI0.fog; scene.fog.density = LI0.density; oceanMats.floor.userData.u.uTime.value = ts; oceanMats.surf.userData.u.uTime.value = ts; OCEAN.updateSky(oceanMats.sky, camera, LI0, ts);
    }
    sway.forEach(function (o) {
      if (o.isInstancedMesh) { if (camera.position.distanceTo(V.set(o.userData[0].x, 0, o.userData[0].z)) > 220) return; var items = o.userData; for (var i = 0; i < items.length; i++) { var it = items[i]; var ang = Math.sin(ts * 0.9 + it.ph) * 0.09; Q.setFromEuler(new T.Euler(ang, 0, Math.cos(ts * 0.7 + it.ph) * 0.09)); V.set(it.x, it.y, it.z); SC.set(1, it.h, 1); M.compose(V, Q, SC); o.setMatrixAt(i, M); } o.instanceMatrix.needsUpdate = true; }
      else if (o.ring) { o.ring.rotation.z = ts; o.ring.material.color.setHSL(0.5, 1, 0.6 + 0.2 * Math.sin(ts * 3)); }
      else if (o.smoke) { var pa = o.smoke.geometry.attributes.position; for (var k = 0; k < pa.count; k++) { var y = pa.getY(k) + dt * 2.5; if (y > o.base + 34) y = o.base; pa.setY(k, y); pa.setX(k, o.x + Math.sin(ts + k) * (y - o.base) * 0.08); } pa.needsUpdate = true; }
      else if (o.glow) { o.glow.material.opacity = 0.55 + 0.35 * Math.sin(ts * 1.7); o.glow.rotation.y = ts * 0.02; }
      else if (o.cur) { var c = o.c, pb = o.cur.geometry.attributes.position; for (var m = 0; m < o.items.length; m++) { var it2 = o.items[m]; if (c.kind === 'seg') { var len = Math.hypot(c.bx - c.ax, c.bz - c.az); it2.t += dt * c.v / len; if (it2.t > 1) it2.t -= 1; var ux = (c.bx - c.ax) / len, uz = (c.bz - c.az) / len; pb.setXYZ(m, c.ax + ux * len * it2.t - uz * it2.off * c.w, -(c.d0 + it2.d * (c.d1 - c.d0)), c.az + uz * len * it2.t + ux * it2.off * c.w); } else { it2.d -= dt * 0.02; if (it2.d < 0) it2.d += 1; pb.setXYZ(m, c.x + Math.cos(it2.off * 3.14) * c.r * it2.t, -(5 + it2.d * 60), c.z + Math.sin(it2.off * 3.14) * c.r * it2.t); } } pb.needsUpdate = true; }
    });
    OCEAN.updateSnow(snow, camera, dt, ts); OCEAN.updateBubbles(bubbles, dt, ts);
    sway.forEach(function (o) { if (o.smoke && Math.random() < 0.15) OCEAN.emitBubbles(bubbles, o.x, o.base - 3, o.z, 1, 1.5, 1.2); });
    renderer.render(scene, camera); fpsN++; fpsT += dt;
  }
  setMode('free');
  if (qs.get('cam')) { var cq = qs.get('cam').split(',').map(Number); if (cq.length >= 5) { cam.pos.set(cq[0], cq[1], cq[2]); cam.yaw = cq[3]; cam.pitch = cq[4]; } }
  if (qs.get('shark')) setTimeout(nextShark, 1500);
  if (qs.get('species') === '1') setTimeout(function () { $('b-species').click(); }, 1200);
  if (qs.get('demo') === '1') setDemo(true); else poll();
  frame();
})();
