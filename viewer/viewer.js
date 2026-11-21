// OCEAN ARENA v6 — 3D gledalec (Three.js r128, vgrajen). 800×800×180 morje, 168 rastlin/koral, 70+ živali, trop morskih psov, klignji.
(function () {
  var T = THREE;
  var DEFAULT_API = 'https://wrfniglebquubhnhqrtn.supabase.co/functions/v1/ocean-arena';
  var qs = new URLSearchParams(location.search);
  var API = qs.get('api') || (function () { try { return localStorage.getItem('ocean.api'); } catch (e) { return null; } })() || DEFAULT_API;
  var ADM = qs.get('admin') || (function () { try { return localStorage.getItem('ocean.admin'); } catch (e) { return ''; } })() || '';
  var COL = { sand: 0xd8c08a, kelp: 0x3f8a3a, blue: 0x2f7fd0, dark: 0x2c3244, silver: 0xc8d4e0, red: 0xc83232, orange: 0xf08a24 };
  var COLHEX = { sand: '#d8c08a', kelp: '#5fb45a', blue: '#4f9fe8', dark: '#6a7290', silver: '#c8d4e0', red: '#e65050', orange: '#f08a24' };
  var W = OC.W, L = OC.L, floorAt = OC.floorAt;
  var $ = function (id) { return document.getElementById(id); };

  // ── Renderer / scena ─────────────────────────────────────────────────────
  var canvas = $('c');
  var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  var scene = new T.Scene();
  scene.fog = new T.FogExp2(0x0b3a5c, 0.0085);
  var camera = new T.PerspectiveCamera(62, 1, 0.25, 1400);
  var hemi = new T.HemisphereLight(0x98dcff, 0x071e36, 0.95); scene.add(hemi);
  var sun = new T.DirectionalLight(0xfff4d4, 0.95); sun.position.set(220, 320, 140); scene.add(sun);
  var amb = new T.AmbientLight(0x204e74, 0.55); scene.add(amb);
  function resize() { var w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  window.addEventListener('resize', resize); resize();

  // ── Dno in gladina ───────────────────────────────────────────────────────
  var surfMesh = null, raysGroup = new T.Group();
  (function buildFloor() {
    var seg = 192, geo = new T.PlaneGeometry(W, L, seg, seg); geo.rotateX(-Math.PI / 2); geo.translate(W / 2, 0, L / 2);
    var pos = geo.attributes.position, colors = new Float32Array(pos.count * 3), c = new T.Color();
    var reefs = OC.REEFS || [OC.REEF], wfs = OC.WHALEFALLS || (OC.WHALEFALL ? [OC.WHALEFALL] : []), grasses = OC.SEAGRASS || [];
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), z = pos.getZ(i), d = floorAt(x, z); pos.setY(i, -d);
      var t = OC.clamp((d - 10) / 165, 0, 1);
      c.setRGB(0.64 - 0.50 * t, 0.58 - 0.44 * t, 0.44 - 0.28 * t);
      for (var r = 0; r < reefs.length; r++) if (OC.gauss(x, z, reefs[r].x, reefs[r].z, reefs[r].r) > 0.40) c.setRGB(0.76, 0.45, 0.42);
      for (var s = 0; s < grasses.length; s++) if (OC.gauss(x, z, grasses[s].x, grasses[s].z, grasses[s].r) > 0.36) c.setRGB(0.30, 0.50, 0.25);
      if (OC.ANEMONES && OC.gauss(x, z, OC.ANEMONES.x, OC.ANEMONES.z, OC.ANEMONES.r) > 0.40) c.setRGB(0.58, 0.34, 0.54);
      for (var k = 0; k < OC.KELP.length; k++) if (OC.gauss(x, z, OC.KELP[k].x, OC.KELP[k].z, OC.KELP[k].r) > 0.38) c.setRGB(0.26, 0.41, 0.20);
      if (OC.gauss(x, z, OC.DEADZONE.x, OC.DEADZONE.z, OC.DEADZONE.r) > 0.35 && d > 100) c.setRGB(0.20, 0.15, 0.09);
      for (var wi = 0; wi < wfs.length; wi++) if (OC.gauss(x, z, wfs[wi].x, wfs[wi].z, wfs[wi].r) > 0.38) c.setRGB(0.24, 0.24, 0.27);
      for (var v = 0; v < OC.VENTS.length; v++) {
        var vg = OC.gauss(x, z, OC.VENTS[v].x, OC.VENTS[v].z, 12);
        if (vg > 0.55) c.setRGB(0.11, 0.09, 0.09);
        else if (vg > 0.24) c.setRGB(0.34, 0.31, 0.24);
      }
      var n = (Math.sin(x * 0.55) * Math.cos(z * 0.65) + Math.sin(x * 0.17 + z * 0.21)) * 0.025;
      c.r = OC.clamp(c.r + n, 0, 1); c.g = OC.clamp(c.g + n, 0, 1); c.b = OC.clamp(c.b + n, 0, 1);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(colors, 3)); geo.computeVertexNormals();
    scene.add(new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true })));
    var wallMat = new T.MeshBasicMaterial({ color: 0x08304a, transparent: true, opacity: 0.26, side: T.DoubleSide, depthWrite: false });
    [[W / 2, 0, 0, W, 0], [W / 2, 0, L, W, 0], [0, 0, L / 2, L, Math.PI / 2], [W, 0, L / 2, L, Math.PI / 2]].forEach(function (a) {
      var m = new T.Mesh(new T.PlaneGeometry(a[3], OC.DMAX), wallMat); m.position.set(a[0], -OC.DMAX / 2, a[2]); m.rotation.y = a[4]; scene.add(m);
    });
    var surfGeo = new T.PlaneGeometry(W * 2.4, L * 2.4, 28, 28);
    surfMesh = new T.Mesh(surfGeo, new T.MeshBasicMaterial({ color: 0x6ec2f5, transparent: true, opacity: 0.32, side: T.DoubleSide, depthWrite: false }));
    surfMesh.rotation.x = -Math.PI / 2; surfMesh.position.set(W / 2, 0, L / 2); scene.add(surfMesh);
    var rayGeo = new T.ConeGeometry(16, 62, 12, 1, true);
    var rayMat = new T.MeshBasicMaterial({ color: 0xaee8ff, transparent: true, opacity: 0.05, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false });
    for (var r2 = 0; r2 < 24; r2++) {
      var rm = new T.Mesh(rayGeo, rayMat.clone());
      rm.position.set(60 + ((r2 * 137) % 680), -28, 60 + ((r2 * 223) % 680));
      rm.rotation.z = 0.14; rm.rotation.x = -0.08;
      raysGroup.add(rm);
    }
    scene.add(raysGroup);
  })();

  // ── 168+ rastlin, koral, skrivališč, razbitin in geologije ─────────────────
  var sway = [];
  (function buildFeatures() {
    var rs = { rs: 1234 }; function R() { return OC.rnd(rs); }
    var M = new T.Matrix4(), Q = new T.Quaternion(), V = new T.Vector3(), SC = new T.Vector3(), E = new T.Euler();

    // Skale in balvani na morskem dnu (180 skal)
    var rockGeo = new T.DodecahedronGeometry(1.0, 0), rockMat = new T.MeshLambertMaterial({ color: 0x454e56 });
    var rockMesh = new T.InstancedMesh(rockGeo, rockMat, 180);
    for (var rk = 0; rk < 180; rk++) {
      var rx = 20 + R() * (W - 40), rz = 20 + R() * (L - 40), rfl = floorAt(rx, rz);
      V.set(rx, -rfl + 0.3, rz); Q.setFromEuler(E.set(R() * 2, R() * 6, R() * 2));
      var sc = 1.2 + R() * 3.8; SC.set(sc * (0.8 + R() * 0.6), sc * (0.45 + R() * 0.6), sc * (0.8 + R() * 0.6));
      M.compose(V, Q, SC); rockMesh.setMatrixAt(rk, M);
    }
    rockMesh.instanceMatrix.needsUpdate = true; scene.add(rockMesh);

    // 5 gozdov kelpa (po 120 stebel = 600 stebel)
    var stalkGeo = new T.CylinderGeometry(0.08, 0.24, 1, 5, 1); stalkGeo.translate(0, 0.5, 0);
    var stalkMat = new T.MeshLambertMaterial({ color: 0x2f7a2a });
    var leafGeo = new T.SphereGeometry(1, 6, 5), leafMat = new T.MeshLambertMaterial({ color: 0x45a33c, transparent: true, opacity: 0.85 });
    var bladderGeo = new T.SphereGeometry(0.28, 6, 5), bladderMat = new T.MeshLambertMaterial({ color: 0x7bc244 });
    OC.KELP.forEach(function (k) {
      var n = 120, im = new T.InstancedMesh(stalkGeo, stalkMat, n), items = [];
      for (var i = 0; i < n; i++) {
        var a = R() * 6.28, r = Math.sqrt(R()) * k.r, x = k.x + Math.cos(a) * r, z = k.z + Math.sin(a) * r;
        var fl = floorAt(x, z), h = Math.min(fl - 2, 12 + R() * 16);
        items.push({ x: x, z: z, y: -fl, h: h, ph: R() * 6.28 });
      }
      im.userData = items; scene.add(im); sway.push(im);
      var lm = new T.InstancedMesh(leafGeo, leafMat, n), bm = new T.InstancedMesh(bladderGeo, bladderMat, n);
      for (var j = 0; j < n; j++) {
        var it = items[j];
        M.makeScale(0.75, 0.28, 1.35); M.setPosition(it.x + 0.35, it.y + it.h * 0.72, it.z); lm.setMatrixAt(j, M);
        M.makeScale(1, 1, 1); M.setPosition(it.x, it.y + it.h * 0.92, it.z); bm.setMatrixAt(j, M);
      }
      lm.instanceMatrix.needsUpdate = true; bm.instanceMatrix.needsUpdate = true;
      scene.add(lm); scene.add(bm);
    });

    // Travniki morske trave (320 travnih snopov)
    var bladeGeo = new T.ConeGeometry(0.14, 2.8, 4); bladeGeo.translate(0, 1.4, 0);
    var bladeMat = new T.MeshLambertMaterial({ color: 0x3ea648 });
    (OC.SEAGRASS || []).forEach(function (sg) {
      var n = 160, im = new T.InstancedMesh(bladeGeo, bladeMat, n), items = [];
      for (var i = 0; i < n; i++) {
        var a = R() * 6.28, r = Math.sqrt(R()) * sg.r, x = sg.x + Math.cos(a) * r, z = sg.z + Math.sin(a) * r;
        items.push({ x: x, z: z, y: -floorAt(x, z), h: 0.7 + R() * 0.9, ph: R() * 6.28 });
      }
      im.userData = items; scene.add(im); sway.push(im);
    });

    // 168 rastlin in koral iz OC.FLORA (staghorn, brain, table, fan, sponge, anemone, tubeworm, seagrass, kelp-clump)
    var byKind = {};
    (OC.FLORA || []).forEach(function (fl) { (byKind[fl.kind] = byKind[fl.kind] || []).push(fl); });
    function placeInst(list, geo, mat, fn) {
      if (!list || !list.length) return;
      var im = new T.InstancedMesh(geo, mat, list.length);
      for (var i = 0; i < list.length; i++) { fn(list[i], i, im); }
      im.instanceMatrix.needsUpdate = true; scene.add(im);
    }
    placeInst(byKind.brain, new T.SphereGeometry(1.5, 10, 8, 0, 6.283, 0, 1.7), new T.MeshLambertMaterial({ color: 0xd9a05b }), function (n, i, im) {
      V.set(n.x, -n.d - 0.1, n.z); Q.setFromEuler(E.set(0, n.yaw, 0)); SC.setScalar(n.sc); M.compose(V, Q, SC); im.setMatrixAt(i, M);
    });
    placeInst(byKind.table, new T.CylinderGeometry(2.4, 0.5, 0.9, 10), new T.MeshLambertMaterial({ color: 0x7d8fe6 }), function (n, i, im) {
      V.set(n.x, -n.d + 1.1 * n.sc, n.z); Q.setFromEuler(E.set(0.08, n.yaw, 0)); SC.setScalar(n.sc); M.compose(V, Q, SC); im.setMatrixAt(i, M);
    });
    placeInst(byKind.staghorn, new T.ConeGeometry(0.45, 3.6, 5), new T.MeshLambertMaterial({ color: 0xf46d6d }), function (n, i, im) {
      V.set(n.x, -n.d + 1.6 * n.sc, n.z); Q.setFromEuler(E.set(0.18, n.yaw, -0.14)); SC.set(n.sc * 1.4, n.sc * 1.1, n.sc * 1.4); M.compose(V, Q, SC); im.setMatrixAt(i, M);
    });
    placeInst(byKind.fan, new T.BoxGeometry(2.8, 3.4, 0.18), new T.MeshLambertMaterial({ color: 0xc254cc }), function (n, i, im) {
      V.set(n.x, -n.d + 1.7 * n.sc, n.z); Q.setFromEuler(E.set(0, n.yaw, 0.1)); SC.setScalar(n.sc); M.compose(V, Q, SC); im.setMatrixAt(i, M);
    });
    placeInst(byKind.sponge, new T.CylinderGeometry(0.95, 0.72, 2.6, 9, 1, true), new T.MeshLambertMaterial({ color: 0xf09d38, side: T.DoubleSide }), function (n, i, im) {
      V.set(n.x, -n.d + 1.2 * n.sc, n.z); Q.setFromEuler(E.set(0, n.yaw, 0)); SC.setScalar(n.sc); M.compose(V, Q, SC); im.setMatrixAt(i, M);
    });
    placeInst(byKind.tubeworm, new T.CylinderGeometry(0.16, 0.12, 2.2, 6), new T.MeshLambertMaterial({ color: 0xe64040 }), function (n, i, im) {
      V.set(n.x, -n.d + 1.0 * n.sc, n.z); Q.setFromEuler(E.set(0.12, n.yaw, 0)); SC.setScalar(n.sc); M.compose(V, Q, SC); im.setMatrixAt(i, M);
    });
    // Večkrake razvejane korale in velikanske školjke na grebenih
    var clamMat = new T.MeshLambertMaterial({ color: 0x9fa8c8 });
    (OC.REEFS || [OC.REEF]).forEach(function (rf) {
      for (var c = 0; c < 40; c++) {
        var a = R() * 6.28, r = Math.sqrt(R()) * rf.r * 0.9, x = rf.x + Math.cos(a) * r, z = rf.z + Math.sin(a) * r, fl = floorAt(x, z);
        var col = [0xf26b5e, 0xf2a74b, 0xd85598, 0x52c4b0, 0x9070e8][Math.floor(R() * 5)];
        var m = new T.Mesh(R() < 0.5 ? new T.DodecahedronGeometry(0.75 + R() * 1.1, 0) : new T.ConeGeometry(0.5 + R() * 0.7, 2.1 + R() * 1.8, 6), new T.MeshLambertMaterial({ color: col }));
        m.position.set(x, -fl + 0.7, z); m.rotation.set(R() * 0.3, R() * 6, R() * 0.3); scene.add(m);
      }
      var arch = new T.Mesh(new T.TorusGeometry(6.5, 1.35, 8, 16, Math.PI), new T.MeshLambertMaterial({ color: 0xc26e68 }));
      arch.position.set(rf.x - 4, -floorAt(rf.x, rf.z), rf.z + 4); arch.rotation.y = 0.6; scene.add(arch);
      var clam = new T.Mesh(new T.SphereGeometry(1.4, 8, 6, 0, 6.28, 0, 1.4), clamMat);
      clam.position.set(rf.x + 8, -floorAt(rf.x + 8, rf.z), rf.z); clam.scale.set(1.4, 0.5, 1.0); scene.add(clam);
    });

    // Vrt vetrnic (animirane lovke)
    if (OC.ANEMONES) {
      var anems = [], stemMat = new T.MeshLambertMaterial({ color: 0xb64a86 }), tentMat = new T.MeshLambertMaterial({ color: 0xff82d8, emissive: 0x350825 });
      var anNodes = byKind.anemone || [];
      for (var ai = 0; ai < (anNodes.length || 18); ai++) {
        var anN = anNodes[ai], ax = anN ? anN.x : OC.ANEMONES.x + (R() - 0.5) * 32, az = anN ? anN.z : OC.ANEMONES.z + (R() - 0.5) * 32;
        var afl = floorAt(ax, az), ag = new T.Group(); ag.position.set(ax, -afl, az);
        ag.add(new T.Mesh(new T.CylinderGeometry(0.65, 0.85, 0.9, 8), stemMat));
        for (var ti = 0; ti < 7; ti++) {
          var ta = ti / 7 * 6.28, tn = new T.Mesh(new T.ConeGeometry(0.14, 1.7 + R() * 0.9, 5), tentMat);
          tn.position.set(Math.cos(ta) * 0.42, 1.05, Math.sin(ta) * 0.42); tn.rotation.z = -Math.cos(ta) * 0.35; tn.rotation.x = Math.sin(ta) * 0.35; ag.add(tn);
        }
        scene.add(ag); anems.push({ g: ag, ph: R() * 6.28 });
      }
      sway.push({ anems: anems });
    }

    // 3 čistilne postaje
    (OC.CLEANERS || []).forEach(function (cl) {
      var ring = new T.Mesh(new T.TorusGeometry(2.6, 0.12, 8, 24), new T.MeshBasicMaterial({ color: 0x60f0ff, transparent: true, opacity: 0.72 }));
      ring.position.set(cl.x, -cl.d, cl.z); ring.rotation.x = Math.PI / 2; scene.add(ring);
      var wrasses = [], wGeo = new T.ConeGeometry(0.14, 0.75, 5); wGeo.rotateX(Math.PI / 2);
      var wMat = new T.MeshLambertMaterial({ color: 0x58f0ff, emissive: 0x104055 });
      for (var wi = 0; wi < 6; wi++) {
        var wm = new T.Mesh(wGeo, wMat); scene.add(wm);
        wrasses.push({ m: wm, a: wi / 6 * 6.28, r: 1.3 + (wi % 2) * 0.8, dy: (wi % 3 - 1) * 0.5 });
      }
      sway.push({ ring: ring, wrasses: wrasses, cx: cl.x, cy: -cl.d, cz: cl.z });
    });

    // 2 razbitini (hull, rebra, jambor, sidro, zaboji)
    (OC.WRECKS || [OC.WRECK]).forEach(function (w) {
      var wg = new T.Group(), wfl = floorAt(w.x, w.z), sc = w.rx / 15;
      wg.position.set(w.x, -wfl, w.z); wg.rotation.y = w.yaw; wg.rotation.z = 0.14; wg.scale.setScalar(sc);
      var wood = new T.MeshLambertMaterial({ color: 0x5a422d }), darkWood = new T.MeshLambertMaterial({ color: 0x3b2a1c });
      var hull = new T.Mesh(new T.BoxGeometry(28, 8, 10), wood); hull.position.y = 4; wg.add(hull);
      var bow = new T.Mesh(new T.ConeGeometry(5.5, 9, 5), darkWood); bow.rotation.z = -Math.PI / 2; bow.position.set(17.5, 4.2, 0); wg.add(bow);
      var mast = new T.Mesh(new T.CylinderGeometry(0.32, 0.52, 20, 7), darkWood); mast.position.set(2, 12, 0); mast.rotation.z = 0.16; wg.add(mast);
      var spar = new T.Mesh(new T.CylinderGeometry(0.18, 0.22, 11, 6), darkWood); spar.position.set(2.5, 16, 0); spar.rotation.x = Math.PI / 2; wg.add(spar);
      for (var rx = -10; rx <= 10; rx += 4) {
        var rib = new T.Mesh(new T.TorusGeometry(5.2, 0.35, 6, 12, Math.PI), darkWood);
        rib.rotation.y = Math.PI / 2; rib.position.set(rx, 4.5, 0); wg.add(rib);
      }
      var crate = new T.Mesh(new T.BoxGeometry(2.2, 2.2, 2.2), wood); crate.position.set(-15, 1.1, 4); crate.rotation.y = 0.4; wg.add(crate);
      scene.add(wg);
    });

    // 8 podvodnih jam s kristali in mehurčki
    var rockCavMat = new T.MeshLambertMaterial({ color: 0x262e38, side: T.DoubleSide });
    var crysMat = new T.MeshBasicMaterial({ color: 0x55f0ff, transparent: true, opacity: 0.85 });
    OC.CAVES.forEach(function (cv) {
      var g = new T.Group(); g.position.set(cv.x, -cv.d, cv.z);
      var shell = new T.Mesh(new T.SphereGeometry(cv.r, 14, 10, 0, Math.PI * 1.45), rockCavMat);
      g.add(shell);
      var hole = new T.Mesh(new T.SphereGeometry(cv.r * 0.7, 10, 8), new T.MeshBasicMaterial({ color: 0x02060c, side: T.BackSide }));
      g.add(hole);
      if (cv.crystal) {
        for (var ci = 0; ci < 5; ci++) {
          var cr = new T.Mesh(new T.OctahedronGeometry(0.75 + (ci % 2) * 0.45), crysMat);
          cr.scale.set(0.5, 1.8, 0.5); cr.position.set((ci - 2) * 1.6, -cv.r * 0.38, (ci % 2 - 0.5) * 2.2); g.add(cr);
        }
      }
      scene.add(g);
    });

    // 5 hidrotermalnih vrelcev z dimom in mehurčki
    OC.VENTS.forEach(function (v) {
      var fl = floorAt(v.x, v.z);
      var ch = new T.Mesh(new T.ConeGeometry(2.8, 7.5, 7), new T.MeshLambertMaterial({ color: 0x221d1b }));
      ch.position.set(v.x, -fl + 3.5, v.z); scene.add(ch);
      var n = 45, pos = new Float32Array(n * 3);
      for (var k = 0; k < n; k++) { pos[k * 3] = v.x + (R() - 0.5) * 2.2; pos[k * 3 + 1] = -fl + 7 + R() * 38; pos[k * 3 + 2] = v.z + (R() - 0.5) * 2.2; }
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
      var pts = new T.Points(g, new T.PointsMaterial({ color: 0xffaa60, size: 1.05, transparent: true, opacity: 0.48, depthWrite: false }));
      scene.add(pts); sway.push({ smoke: pts, base: -fl + 7, x: v.x, z: v.z });
    });

    // 2 kitovi okostji (whalefalls)
    (OC.WHALEFALLS || (OC.WHALEFALL ? [OC.WHALEFALL] : [])).forEach(function (wf, idx) {
      var wffl = floorAt(wf.x, wf.z), wfg = new T.Group();
      wfg.position.set(wf.x, -wffl + 0.5, wf.z); wfg.rotation.y = 0.6 + idx * 1.2;
      var boneMat = new T.MeshLambertMaterial({ color: 0xd8d2c2 });
      var spine = new T.Mesh(new T.CylinderGeometry(0.38, 0.6, 18, 8), boneMat); spine.rotation.z = Math.PI / 2; spine.position.y = 0.55; wfg.add(spine);
      var skull = new T.Mesh(new T.ConeGeometry(2.1, 5.2, 7), boneMat); skull.rotation.z = -Math.PI / 2; skull.scale.set(0.6, 1, 1.1); skull.position.set(10.5, 1.1, 0); wfg.add(skull);
      for (var ri = -6; ri <= 7; ri += 1.6) {
        var rib = new T.Mesh(new T.TorusGeometry(2.6 - Math.abs(ri) * 0.14, 0.24, 6, 12, Math.PI * 1.15), boneMat);
        rib.rotation.y = Math.PI / 2; rib.rotation.z = -0.1; rib.position.set(ri, 0.3, 0); wfg.add(rib);
      }
      scene.add(wfg);
    });

    // Bioluminiscenčni jarek
    (function () {
      var b = OC.BIOLUM, n = 1400, pos = new Float32Array(n * 3);
      for (var k = 0; k < n; k++) { var a = R() * 6.28, r = Math.sqrt(R()) * b.r, x = b.x + Math.cos(a) * r, z = b.z + Math.sin(a) * r, fl = floorAt(x, z); pos[k * 3] = x; pos[k * 3 + 1] = -(b.minD + R() * Math.max(2, fl - b.minD - 1)); pos[k * 3 + 2] = z; }
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
      var p = new T.Points(g, new T.PointsMaterial({ color: 0x9a84ff, size: 1.1, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false }));
      scene.add(p); sway.push({ glow: p });
    })();

    // Mrtva cona
    (function () {
      var dz = OC.DEADZONE, m = new T.Mesh(new T.SphereGeometry(dz.r, 18, 12), new T.MeshBasicMaterial({ color: 0x5a3a10, transparent: true, opacity: 0.16, depthWrite: false }));
      m.position.set(dz.x, -(dz.minD + 14), dz.z); m.scale.y = 0.5; scene.add(m);
    })();

    // Morski tokovi
    OC.CURRENTS.forEach(function (c) {
      var n = 220, pos = new Float32Array(n * 3), items = [];
      for (var k = 0; k < n; k++) items.push({ t: R(), off: (R() - 0.5) * 2, d: R() });
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
      var p = new T.Points(g, new T.PointsMaterial({ color: 0x9fe8ff, size: 0.8, transparent: true, opacity: 0.5, blending: T.AdditiveBlending, depthWrite: false }));
      scene.add(p); sway.push({ cur: p, c: c, items: items });
    });

    // Termoklina
    var th = new T.Mesh(new T.PlaneGeometry(W, L), new T.MeshBasicMaterial({ color: 0x1a4a7a, transparent: true, opacity: 0.06, side: T.DoubleSide, depthWrite: false }));
    th.rotation.x = -Math.PI / 2; th.position.set(W / 2, -OC.THERMO, L / 2); scene.add(th);
  })();

  // Morski sneg okoli kamere
  var snow = (function () {
    var n = 1800, pos = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 140; pos[i * 3 + 1] = (Math.random() - 0.5) * 140; pos[i * 3 + 2] = (Math.random() - 0.5) * 140; }
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
    var p = new T.Points(g, new T.PointsMaterial({ color: 0xbfe8ff, size: 0.14, transparent: true, opacity: 0.35, depthWrite: false }));
    scene.add(p); return p;
  })();

  // ── 3D modeli rib, morskih psov, klignjev, raž, želv, barakud in muren ───
  var fishBodyGeo = (function () {
    var pts = [];
    for (var i = 0; i <= 14; i++) {
      var t = i / 14, r;
      if (t < 0.12) r = 0.04 + 0.09 * (t / 0.12);
      else if (t < 0.68) r = 0.13 + 0.15 * Math.sin(((t - 0.12) / 0.56) * Math.PI * 0.78);
      else r = 0.28 * Math.cos(((t - 0.68) / 0.32) * Math.PI * 0.48);
      pts.push(new T.Vector2(Math.max(0.01, r), (t - 0.5) * 1.15));
    }
    var g = new T.LatheGeometry(pts, 14); g.rotateX(Math.PI / 2); return g;
  })();

  function fishModel(colorHex, len, opts) {
    opts = opts || {};
    var g = new T.Group();
    var mat = new T.MeshLambertMaterial({ color: colorHex });
    var finColor = new T.Color(colorHex).multiplyScalar(0.78);
    var finMat = new T.MeshLambertMaterial({ color: finColor, side: T.DoubleSide });
    var bellyMat = new T.MeshLambertMaterial({ color: opts.shark ? 0xdde6ee : new T.Color(colorHex).lerp(new T.Color(0xf4f8fc), 0.55) });

    var body = new T.Mesh(fishBodyGeo, mat);
    body.scale.set(opts.shark ? 0.72 : opts.cuda ? 0.42 : 0.68, opts.shark ? 0.85 : opts.cuda ? 0.55 : 0.95, opts.cuda ? 1.55 : 1.0);
    g.add(body);
    var belly = new T.Mesh(new T.SphereGeometry(0.18, 10, 8), bellyMat);
    belly.scale.set(0.68, 0.55, opts.cuda ? 2.8 : 2.1); belly.position.set(0, -0.09, 0.06); g.add(belly);

    var tailPivot = new T.Group(); tailPivot.position.set(0, 0, opts.cuda ? -0.82 : -0.52);
    var tUp = new T.Mesh(new T.ConeGeometry(0.12, opts.shark ? 0.55 : 0.38, 4), finMat);
    tUp.scale.set(0.2, 1, 0.9); tUp.rotation.x = -0.6; tUp.position.set(0, 0.12, -0.18); tailPivot.add(tUp);
    var tLo = new T.Mesh(new T.ConeGeometry(0.10, opts.shark ? 0.38 : 0.32, 4), finMat);
    tLo.scale.set(0.2, 1, 0.9); tLo.rotation.x = -Math.PI + 0.6; tLo.position.set(0, -0.10, -0.16); tailPivot.add(tLo);
    g.add(tailPivot);

    var dorsal = new T.Mesh(new T.ConeGeometry(0.13, opts.shark ? 0.54 : 0.28, 4), finMat);
    dorsal.scale.set(0.18, 1, 1.25); dorsal.rotation.x = -0.35; dorsal.position.set(0, 0.25, -0.04); g.add(dorsal);

    var finGeo = new T.ConeGeometry(0.10, opts.shark ? 0.54 : 0.30, 4); finGeo.translate(0, 0.14, 0);
    var finL = new T.Mesh(finGeo, finMat); finL.scale.set(0.22, 1, 0.9); finL.position.set(0.15, -0.07, 0.14); finL.rotation.z = -1.2; finL.rotation.y = -0.35; g.add(finL);
    var finR = new T.Mesh(finGeo, finMat); finR.scale.set(0.22, 1, 0.9); finR.position.set(-0.15, -0.07, 0.14); finR.rotation.z = 1.2; finR.rotation.y = 0.35; g.add(finR);

    var sclMat = new T.MeshBasicMaterial({ color: opts.shark ? 0x1a1e24 : 0xeef6ff });
    var pupMat = new T.MeshBasicMaterial({ color: 0x05080c });
    [-1, 1].forEach(function (s) {
      var ey = new T.Mesh(new T.SphereGeometry(0.045, 8, 6), sclMat); ey.position.set(s * 0.115, 0.06, 0.34); g.add(ey);
      var pu = new T.Mesh(new T.SphereGeometry(0.028, 6, 6), pupMat); pu.position.set(s * 0.132, 0.06, 0.355); g.add(pu);
    });

    var hit = new T.Mesh(new T.SphereGeometry(1.1, 8, 6), new T.MeshBasicMaterial({ visible: false })); g.add(hit);
    var mudCloud = new T.Mesh(new T.SphereGeometry(0.95, 10, 8), new T.MeshBasicMaterial({ color: 0xb59c6a, transparent: true, opacity: 0.35, depthWrite: false }));
    mudCloud.visible = false; g.add(mudCloud);
    g.userData = { tail: tailPivot, finL: finL, finR: finR, hit: hit, mat: mat, finMat: finMat, bellyMat: bellyMat, mudCloud: mudCloud };
    return g;
  }

  // Kigenj (squid) s plaščem, stranskima plavutima in 8 gibljivimi lovkami
  function squidModel() {
    var g = new T.Group();
    var mMat = new T.MeshLambertMaterial({ color: 0xe6688a, emissive: 0x220815 });
    var mantle = new T.Mesh(new T.ConeGeometry(0.32, 1.5, 10), mMat); mantle.rotation.x = Math.PI / 2; mantle.position.z = 0.35; g.add(mantle);
    var head = new T.Mesh(new T.SphereGeometry(0.26, 8, 8), mMat); head.position.z = -0.32; g.add(head);
    var fin = new T.Mesh(new T.ConeGeometry(0.35, 0.5, 4), mMat); fin.scale.set(1.3, 1, 0.15); fin.rotation.x = Math.PI / 2; fin.position.z = 0.95; g.add(fin);
    var eyeM = new T.MeshBasicMaterial({ color: 0x7ff6ff });
    [-1, 1].forEach(function (s) { var e = new T.Mesh(new T.SphereGeometry(0.07, 6, 6), eyeM); e.position.set(s * 0.2, 0.05, -0.32); g.add(e); });
    var tentPivot = new T.Group(); tentPivot.position.z = -0.45;
    var tGeo = new T.ConeGeometry(0.05, 1.35, 4); tGeo.rotateX(-Math.PI / 2); tGeo.translate(0, 0, -0.65);
    for (var i = 0; i < 8; i++) {
      var a = i / 8 * 6.28, tm = new T.Mesh(tGeo, mMat);
      tm.position.set(Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0);
      tentPivot.add(tm);
    }
    g.add(tentPivot);
    g.userData = { mat: mMat, tents: tentPivot };
    return g;
  }

  // Manta raža (manta ray) z dvema kriloma
  function rayModel() {
    var g = new T.Group(), mat = new T.MeshLambertMaterial({ color: 0x26384d, side: T.DoubleSide });
    var core = new T.Mesh(new T.SphereGeometry(0.42, 8, 6), mat); core.scale.set(1.2, 0.26, 1.6); g.add(core);
    var wGeo = new T.ConeGeometry(0.75, 1.85, 3); wGeo.rotateZ(-Math.PI / 2); wGeo.translate(0.9, 0, 0);
    var wL = new T.Mesh(wGeo, mat); wL.scale.set(1, 0.08, 1.1); g.add(wL);
    var wR = new T.Mesh(wGeo, mat); wR.scale.set(-1, 0.08, 1.1); g.add(wR);
    var tail = new T.Mesh(new T.CylinderGeometry(0.02, 0.05, 1.6, 5), mat); tail.rotation.x = Math.PI / 2; tail.position.z = -1.1; g.add(tail);
    g.userData = { wL: wL, wR: wR }; return g;
  }

  // Morska želva (sea turtle)
  function turtleModel() {
    var g = new T.Group(), shellM = new T.MeshLambertMaterial({ color: 0x4b7035 }), skinM = new T.MeshLambertMaterial({ color: 0x739850 });
    var sh = new T.Mesh(new T.SphereGeometry(0.55, 10, 8, 0, 6.28, 0, 1.6), shellM); sh.scale.set(0.95, 0.55, 1.25); g.add(sh);
    var hd = new T.Mesh(new T.SphereGeometry(0.18, 7, 6), skinM); hd.position.set(0, -0.02, 0.72); g.add(hd);
    var flGeo = new T.BoxGeometry(0.55, 0.06, 0.22);
    [[-0.55, 0.28], [0.55, 0.28], [-0.45, -0.45], [0.45, -0.45]].forEach(function (p) {
      var fl = new T.Mesh(flGeo, skinM); fl.position.set(p[0], -0.05, p[1]); fl.rotation.y = p[0] > 0 ? -0.4 : 0.4; g.add(fl);
    });
    return g;
  }

  // Murena (moray eel)
  function morayModel() {
    var g = new T.Group(), m = new T.MeshLambertMaterial({ color: 0x5c7e38 });
    var segs = [];
    for (var i = 0; i < 6; i++) {
      var sm = new T.Mesh(new T.SphereGeometry(0.22 - i * 0.02, 7, 6), m);
      sm.scale.set(0.7, 0.9, 1.5); sm.position.z = -i * 0.48; g.add(sm); segs.push(sm);
    }
    g.userData = { segs: segs }; return g;
  }

  function makeLabel() { var cv = document.createElement('canvas'); cv.width = 384; cv.height = 128; var tx = new T.CanvasTexture(cv); var sp = new T.Sprite(new T.SpriteMaterial({ map: tx, transparent: true, depthTest: false })); sp.userData = { cv: cv, tx: tx, key: '' }; sp.center.set(0.5, 0); return sp; }
  function drawLabel(sp, f) {
    var key = [f.n, f.model, Math.round(f.hp), Math.round(f.en), f.sz, f.hid, f.bleed, f.poison, f.inked, f.suspect, f.cheat, f.alive].join('|'); if (sp.userData.key === key) return; sp.userData.key = key;
    var cv = sp.userData.cv, x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height);
    x.fillStyle = 'rgba(3,17,30,0.75)'; roundRect(x, 4, 24, cv.width - 8, 96, 12); x.fill();
    x.font = 'bold 30px sans-serif'; x.fillStyle = f.alive ? '#ffffff' : '#889'; x.textAlign = 'left'; x.fillText(f.n, 18, 60);
    x.font = '20px sans-serif'; x.fillStyle = '#9fd3ff'; x.fillText((f.model || '').slice(0, 22) + '  ·  ' + f.sz.toFixed(1), 18, 86);
    var pct = f.hp / Math.max(1, f.hpMax); x.fillStyle = 'rgba(255,255,255,0.15)'; x.fillRect(18, 98, 340, 8); x.fillStyle = pct > 0.5 ? '#6fe08a' : pct > 0.25 ? '#ffb04a' : '#ff5a4a'; x.fillRect(18, 98, 340 * pct, 8);
    var ep = f.en / Math.max(1, f.enMax); x.fillStyle = 'rgba(255,255,255,0.15)'; x.fillRect(18, 108, 340, 6); x.fillStyle = '#4ad0ff'; x.fillRect(18, 108, 340 * ep, 6);
    var badges = []; if (f.hid) badges.push(['SKRIT', '#0a3a4a']); if (f.bleed) badges.push(['KRVAVI', '#5a0a2a']); if (f.poison) badges.push(['STRUP', '#2d4a10']); if (f.inked) badges.push(['ČRNILO', '#181842']); if (f.suspect) badges.push(['BOT?', '#5a3a0a']); if (f.cheat) badges.push(['GOLJUF', '#6a0a0a']); if (!f.alive) badges.push(['MRTEV', '#333']);
    var bx = cv.width - 14; x.font = 'bold 16px sans-serif'; badges.reverse().forEach(function (b) { var w = x.measureText(b[0]).width + 14; bx -= w + 4; x.fillStyle = b[1]; roundRect(x, bx, 36, w, 22, 5); x.fill(); x.fillStyle = '#fff'; x.fillText(b[0], bx + 7, 53); });
    sp.userData.tx.needsUpdate = true;
  }
  function makeBubble() { var cv = document.createElement('canvas'); cv.width = 512; cv.height = 192; var tx = new T.CanvasTexture(cv); var sp = new T.Sprite(new T.SpriteMaterial({ map: tx, transparent: true, depthTest: false })); sp.userData = { cv: cv, tx: tx, key: '' }; sp.center.set(0.5, 0); return sp; }
  function drawBubble(sp, why) {
    if (sp.userData.key === why) return; sp.userData.key = why; var cv = sp.userData.cv, x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height); if (!why) { sp.userData.tx.needsUpdate = true; return; }
    x.font = 'italic 22px sans-serif'; var lines = wrap(x, why, cv.width - 50).slice(0, 5); var h = lines.length * 28 + 24;
    x.fillStyle = 'rgba(255,255,255,0.92)'; roundRect(x, 10, cv.height - h - 10, cv.width - 20, h, 14); x.fill();
    x.beginPath(); x.moveTo(cv.width / 2 - 10, cv.height - 10); x.lineTo(cv.width / 2 + 10, cv.height - 10); x.lineTo(cv.width / 2, cv.height); x.fill();
    x.fillStyle = '#0a2030'; lines.forEach(function (l, i) { x.fillText(l, 26, cv.height - h + 10 + (i + 1) * 28 - 6); }); sp.userData.tx.needsUpdate = true;
  }
  function wrap(x, text, maxW) { var words = text.split(/\s+/), lines = [], cur = ''; words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (x.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }); if (cur) lines.push(cur); return lines; }
  function roundRect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }

  // ── Dinamične entitete ───────────────────────────────────────────────────
  var fishObjs = {}, sharkObjs = {}, squidObjs = {}, rayObjs = {}, turtleObjs = {}, cudaObjs = {}, morayObjs = {}, inkObjs = {};
  var schoolObjs = {}, lanternObjs = {}, plankObjs = {}, crabMesh = null, pufferObjs = {}, carrionObjs = {}, jellySwarms = [];
  var tinyGeo = new T.ConeGeometry(0.12, 0.6, 4); tinyGeo.rotateX(Math.PI / 2);
  var sardMat = new T.MeshLambertMaterial({ color: 0xc8d8e8 });
  var lantMat = new T.MeshBasicMaterial({ color: 0x62ecff });

  function ensureFish(f) {
    var o = fishObjs[f.id]; if (o) return o;
    var len = 1.6 + 1.0 * f.sz, g = fishModel(COL[f.color] || 0x888888, 1); g.scale.setScalar(len);
    var label = makeLabel(), bubble = makeBubble(); scene.add(g); scene.add(label); scene.add(bubble);
    o = fishObjs[f.id] = { g: g, label: label, bubble: bubble, len: len, id: f.id }; g.userData.hit.userData.fishId = f.id; return o;
  }
  function removeFishObj(id) { var o = fishObjs[id]; if (!o) return; scene.remove(o.g); scene.remove(o.label); scene.remove(o.bubble); delete fishObjs[id]; }
  function ensureSharkObj(s) {
    var id = s.id || 'sh1', o = sharkObjs[id]; if (o) return o;
    var col = s.pack ? 0x3b5875 : (id === 'sh5' ? 0x2d323c : 0x52606c);
    var g = fishModel(col, 1, { shark: true }); g.scale.setScalar((s.sz || 11) * 0.85);
    scene.add(g); var lb = makeLabel(); scene.add(lb);
    return sharkObjs[id] = { g: g, label: lb };
  }
  function ensureSquid(q) { if (squidObjs[q.id]) return squidObjs[q.id]; var g = squidModel(); g.scale.setScalar(2.4); scene.add(g); return squidObjs[q.id] = { g: g }; }
  function ensureRay(q) { if (rayObjs[q.id]) return rayObjs[q.id]; var g = rayModel(); g.scale.setScalar(3.6); scene.add(g); return rayObjs[q.id] = { g: g }; }
  function ensureTurtle(q) { if (turtleObjs[q.id]) return turtleObjs[q.id]; var g = turtleModel(); g.scale.setScalar(2.6); scene.add(g); return turtleObjs[q.id] = { g: g }; }
  function ensureCuda(q) { if (cudaObjs[q.id]) return cudaObjs[q.id]; var g = fishModel(0x70a2b8, 1, { cuda: true }); g.scale.setScalar(3.2); scene.add(g); return cudaObjs[q.id] = { g: g }; }
  function ensureMoray(q) { if (morayObjs[q.id]) return morayObjs[q.id]; var g = morayModel(); g.scale.setScalar(2.4); scene.add(g); return morayObjs[q.id] = { g: g }; }
  function ensureInk(ik) {
    if (inkObjs[ik.id]) return inkObjs[ik.id];
    var m = new T.Mesh(new T.SphereGeometry(1, 12, 10), new T.MeshBasicMaterial({ color: 0x0b0a18, transparent: true, opacity: 0.72, depthWrite: false }));
    scene.add(m); return inkObjs[ik.id] = { m: m };
  }
  function ensureSchool(s, map, mat) { var o = map[s.id]; if (o) return o; var n = 90, im = new T.InstancedMesh(tinyGeo, mat, n), ph = []; for (var i = 0; i < n; i++) ph.push({ a: Math.random() * 6.28, r: 1 + Math.random() * 5, y: (Math.random() - 0.5) * 3, w: 0.6 + Math.random() * 0.5 }); scene.add(im); o = map[s.id] = { im: im, ph: ph }; return o; }
  function ensurePlank(p) { var o = plankObjs[p.id]; if (o) return o; var n = 150, pos = new Float32Array(n * 3); for (var i = 0; i < n; i++) { var a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * p.r; pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = (Math.random() - 0.5) * p.r * 0.6; pos[i * 3 + 2] = Math.sin(a) * r; } var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); var pt = new T.Points(g, new T.PointsMaterial({ color: 0x9fe87a, size: 0.24, transparent: true, opacity: 0.68, depthWrite: false })); scene.add(pt); o = plankObjs[p.id] = { pt: pt }; return o; }
  function ensureJellySwarm(idx) {
    if (jellySwarms[idx]) return jellySwarms[idx];
    var jg = new T.Group(), items = [], bell = new T.SphereGeometry(0.7, 10, 8, 0, 6.283, 0, 1.6), bm = new T.MeshLambertMaterial({ color: 0xffa0d0, transparent: true, opacity: 0.45, side: T.DoubleSide });
    for (var i = 0; i < 32; i++) {
      var g = new T.Group(); g.add(new T.Mesh(bell, bm));
      var lp = []; for (var k = 0; k < 4; k++) { var a = k / 4 * 6.28; lp.push(Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4, Math.cos(a) * 0.6, -3 - Math.random() * 2, Math.sin(a) * 0.6); }
      var lg = new T.BufferGeometry(); lg.setAttribute('position', new T.BufferAttribute(new Float32Array(lp), 3));
      g.add(new T.LineSegments(lg, new T.LineBasicMaterial({ color: 0xffc0e0, transparent: true, opacity: 0.5 })));
      var a2 = Math.random() * 6.28, r2 = Math.sqrt(Math.random());
      items.push({ g: g, ox: Math.cos(a2) * r2, oz: Math.sin(a2) * r2, oy: Math.random() - 0.5, ph: Math.random() * 6.28 }); jg.add(g);
    }
    scene.add(jg); return jellySwarms[idx] = { grp: jg, items: items };
  }
  var crabGeo = new T.BoxGeometry(0.8, 0.28, 0.58), crabMat = new T.MeshLambertMaterial({ color: 0xc84a2a });
  function ensurePuffer(u) { var o = pufferObjs[u.id]; if (o) return o; var m = new T.Mesh(new T.IcosahedronGeometry(0.62, 0), new T.MeshLambertMaterial({ color: 0xe8d060 })); scene.add(m); return pufferObjs[u.id] = { m: m }; }
  function ensureCarrion(k) { var o = carrionObjs[k.id]; if (o) return o; var g = fishModel(0x8a8a80, 1); g.scale.setScalar(1.6 + k.sz); g.rotation.z = Math.PI / 2; scene.add(g); return carrionObjs[k.id] = { g: g }; }

  // ── Zaznava izbrane ribe ─────────────────────────────────────────────────
  var senseRing = (function () {
    var m = new T.Mesh(new T.RingGeometry(0.95, 1.0, 48), new T.MeshBasicMaterial({ color: 0x70e0ff, transparent: true, opacity: 0.35, side: T.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); return m;
  })();
  var senseLines = (function () {
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(60), 3));
    var l = new T.LineSegments(g, new T.LineBasicMaterial({ color: 0x80f0ff, transparent: true, opacity: 0.5 }));
    l.visible = false; l.frustumCulled = false; scene.add(l); return l;
  })();
  var showSense = false;

  // ── Stanje in interpolacija ──────────────────────────────────────────────
  var A = null, B = null, tA = 0, tB = 0, LAG = 650, live = { ok: false, demo: false, lastErr: '' }, lastFeedN = 0, lastGen = null;
  var pendingFollow = qs.get('follow') ? +qs.get('follow') : null;
  function pushState(s) {
    var now = performance.now(); A = B; tA = tB; B = s; tB = now; if (!A) { A = s; tA = now - 500; }
    if (lastGen !== null && s.gen !== lastGen) {
      Object.keys(fishObjs).forEach(removeFishObj);
      for (var cid in carrionObjs) scene.remove(carrionObjs[cid].g); carrionObjs = {};
      $('end').style.display = 'none'; lastFeedN = 0; cam.follow = null;
    }
    lastGen = s.gen;
    if (pendingFollow && s.fish && s.fish.length) { var pf = s.fish[pendingFollow - 1]; if (pf) { pendingFollow = null; selectFish(pf.id, true); } }
    updateUI(s);
  }
  function lerpA(a, b, t) { var d = ((b - a) % 360 + 540) % 360 - 180; return a + d * t; }
  function interp(id, listKey) { var arr = A && A[listKey]; if (!arr) return {}; for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return { a: arr[i] }; return {}; }

  // ── Kamera & kontrole ────────────────────────────────────────────────────
  var cam = { mode: 'free', follow: null, sharkIdx: 0, pos: new T.Vector3(240, -18, 360), yaw: Math.PI, pitch: -0.2, dist: 24, oyaw: 0, opitch: 0.25 };
  var keys = {}, drag = null, hudHidden = false;
  window.addEventListener('keydown', function (e) {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    keys[e.code] = true;
    if (e.code === 'KeyF') { if (cam.follow) setMode(cam.mode === 'follow' ? 'free' : 'follow'); }
    if (e.code === 'KeyP') { if (!cam.follow && B && B.fish[0]) cam.follow = B.fish[0].id; if (cam.follow) setMode(cam.mode === 'pov' ? 'follow' : 'pov'); }
    if (e.code === 'KeyH') { hudHidden = !hudHidden;['top', 'list', 'feed', 'ctl', 'mini', 'insp', 'jumps'].forEach(function (id) { $(id).style.display = hudHidden ? 'none' : ''; }); }
    var d = e.code.match(/^Digit(\d)$/); if (d && B) { var idx = d[1] === '0' ? 9 : +d[1] - 1; if (B.fish[idx]) selectFish(B.fish[idx].id, true); }
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; });
  canvas.addEventListener('mousedown', function (e) { drag = { x: e.clientX, y: e.clientY, moved: 0 }; });
  window.addEventListener('mousemove', function (e) {
    if (!drag) return; var dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
    if (cam.mode === 'follow' || cam.mode === 'shark') { cam.oyaw -= dx * 0.006; cam.opitch = OC.clamp(cam.opitch + dy * 0.006, -1.2, 1.3); }
    else { cam.yaw -= dx * 0.005; cam.pitch = OC.clamp(cam.pitch - dy * 0.005, -1.4, 1.4); }
  });
  window.addEventListener('mouseup', function (e) { if (drag && drag.moved < 4) pick(e); drag = null; });
  canvas.addEventListener('wheel', function (e) {
    if (cam.mode === 'follow' || cam.mode === 'shark') cam.dist = OC.clamp(cam.dist * (e.deltaY > 0 ? 1.12 : 0.9), 4, 160);
    else { var dir = camDir(); cam.pos.addScaledVector(dir, e.deltaY > 0 ? -10 : 10); }
    e.preventDefault();
  }, { passive: false });
  function camDir() { return new T.Vector3(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), Math.cos(cam.yaw) * Math.cos(cam.pitch)); }
  var ray = new T.Raycaster(), mouse = new T.Vector2();
  function pick(e) { mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1); ray.setFromCamera(mouse, camera); var hits = []; for (var id in fishObjs) hits.push(fishObjs[id].g.userData.hit); var r = ray.intersectObjects(hits, false); if (r.length) selectFish(r[0].object.userData.fishId, true); }
  function selectFish(id, follow) { cam.follow = id; if (follow && cam.mode !== 'pov') setMode('follow'); updateUI(B); }
  function setMode(m) {
    cam.mode = m;
    ['free', 'follow', 'pov', 'over', 'shark'].forEach(function (k) { var el = $('b-' + k); if (el) el.classList.toggle('on', k === m); });
    if (m === 'over') { cam.pos.set(W / 2, 260, L + 340); cam.yaw = Math.PI; cam.pitch = -0.62; cam.mode = 'free'; $('b-over').classList.add('on'); }
  }
  function jumpTo(x, z, d) { setMode('free'); cam.pos.set(x, -d + 8, z + 34); cam.yaw = Math.PI; cam.pitch = -0.22; }
  var JUMPS = {
    reef: [210, 250, 22], lagoon: [165, 435, 22], anemones: [278, 175, 22], grass: [118, 265, 20],
    kelp: [122, 385, 22], wreck: [420, 410, 68], vents: [595, 248, 48], whale: [405, 625, 134],
    trench: [485, 690, 154], dead: [695, 525, 118]
  };
  document.querySelectorAll('#jumps button').forEach(function (b) {
    b.onclick = function () { var j = JUMPS[b.getAttribute('data-jump')]; if (j) jumpTo(j[0], j[1], j[2]); };
  });

  function updateCamera(dt) {
    if (cam.mode === 'pov' && cam.follow && fishObjs[cam.follow] && B) {
      var o = fishObjs[cam.follow];
      if (o) {
        var fwd = new T.Vector3(0, 0, 1).applyEuler(o.g.rotation).normalize();
        var eye = o.g.position.clone().addScaledVector(fwd, o.g.scale.z * 0.55 + 0.3).add(new T.Vector3(0, o.g.scale.y * 0.2, 0));
        camera.position.copy(eye); camera.lookAt(eye.clone().addScaledVector(fwd, 18)); return;
      }
    }
    if (cam.mode === 'follow' || cam.mode === 'shark') {
      var shList = B && B.sharks && B.sharks.length ? B.sharks : null;
      var shId = shList ? shList[cam.sharkIdx % shList.length].id : 'sh1';
      var tgt = cam.mode === 'shark' ? ((sharkObjs[shId] || sharkObjs[Object.keys(sharkObjs)[0]]) && (sharkObjs[shId] || sharkObjs[Object.keys(sharkObjs)[0]]).g) : (cam.follow && fishObjs[cam.follow] && fishObjs[cam.follow].g);
      if (tgt) {
        var off = new T.Vector3(Math.sin(cam.oyaw) * Math.cos(cam.opitch), Math.sin(cam.opitch), Math.cos(cam.oyaw) * Math.cos(cam.opitch)).multiplyScalar(cam.dist);
        var want = tgt.position.clone().add(off);
        want.y = Math.min(want.y, 2);
        want.y = Math.max(want.y, -floorAt(OC.clamp(want.x, 0, W), OC.clamp(want.z, 0, L)) + 1);
        cam.pos.lerp(want, 1 - Math.pow(0.001, dt));
        camera.position.copy(cam.pos); camera.lookAt(tgt.position); return;
      }
    }
    var sp = (keys.ShiftLeft || keys.ShiftRight ? 95 : 28) * dt, dir = camDir(), right = new T.Vector3(dir.z, 0, -dir.x).normalize();
    if (keys.KeyW || keys.ArrowUp) cam.pos.addScaledVector(dir, sp); if (keys.KeyS || keys.ArrowDown) cam.pos.addScaledVector(dir, -sp);
    if (keys.KeyA || keys.ArrowLeft) cam.pos.addScaledVector(right, sp); if (keys.KeyD || keys.ArrowRight) cam.pos.addScaledVector(right, -sp);
    if (keys.KeyQ) cam.pos.y -= sp; if (keys.KeyE || keys.Space) cam.pos.y += sp;
    cam.pos.x = OC.clamp(cam.pos.x, -80, W + 80); cam.pos.z = OC.clamp(cam.pos.z, -80, L + 400); cam.pos.y = OC.clamp(cam.pos.y, -OC.DMAX + 0.5, 420);
    if (cam.pos.x >= 0 && cam.pos.x <= W && cam.pos.z >= 0 && cam.pos.z <= L) cam.pos.y = Math.max(cam.pos.y, -floorAt(cam.pos.x, cam.pos.z) + 0.8);
    camera.position.copy(cam.pos); camera.lookAt(cam.pos.clone().add(dir));
  }

  // ── UI ───────────────────────────────────────────────────────────────────
  function fmt(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  function updateUI(s) {
    if (!s) return;
    var st = $('t-status');
    var lobTxt = s.manualStart ? ' · ČAKA NA ŠTART' : (s.lobbyIn !== null ? ' · štart čez ' + fmt(s.lobbyIn) : '');
    st.textContent = (live.demo ? 'DEMO · ' : 'V ŽIVO · ') + (s.status === 'running' ? 'IGRA TEČE' : s.status === 'lobby' ? 'ČAKALNICA' + lobTxt : 'KONEC');
    st.className = 'st ' + (live.demo ? 'demo' : s.status === 'running' ? 'run' : s.status === 'finished' ? 'fin' : '');
    $('b-top-start').style.display = (!live.demo && s.status === 'lobby') ? 'inline-block' : 'none';
    $('b-qhold').classList.toggle('on', !!s.manualStart);
    $('t-time').textContent = '⏱ ' + fmt(s.timeLeft) + (s.famine ? ' · lakota' : '');
    $('t-phase').textContent = (s.phase === 'day' ? '☀ dan' : s.phase === 'night' ? '☾ noč' : s.phase === 'dusk' ? '🌆 mrak' : '🌅 zora') + ' ' + Math.round(s.light * 100) + '%';
    var alive = s.fish.filter(function (f) { return f.alive; }).length;
    $('t-alive').textContent = '🐟 ' + alive + '/' + s.fish.length + ' živih';
    var npcN = (s.sharks ? s.sharks.length : 1) + (s.squids ? s.squids.length : 0) + (s.rays ? s.rays.length : 0) + (s.turtles ? s.turtles.length : 0) + (s.barracudas ? s.barracudas.length : 0) + (s.morays ? s.morays.length : 0) + (s.crabs ? s.crabs.length : 0) + (s.puffers ? s.puffers.length : 0);
    $('t-eco').textContent = '🦈 ' + (s.sharks ? s.sharks.length : 1) + ' psov · 🦑 ' + (s.squids ? s.squids.length : 0) + ' klignjev · ' + npcN + ' živali';
    $('t-gen').textContent = 'igra #' + s.gen;
    $('l-count').textContent = s.fish.length + '/10';
    var html = '';
    s.fish.slice().sort(function (a, b) { return (!!a.cheat - !!b.cheat) || (b.alive - a.alive) || (b.score - a.score); }).forEach(function (f) {
      html += '<div class="f' + (f.id === cam.follow ? ' sel' : '') + (f.alive ? '' : ' dead') + '" data-id="' + f.id + '"><div class="n"><span><span class="sw" style="background:' + (COLHEX[f.color] || '#888') + '"></span>' + esc(f.n) + '</span><span style="font-weight:400;color:#9bb8cc">' + f.sz.toFixed(2) + ' · ' + f.score + '</span></div>' +
        '<div class="m">' + esc(f.model) + (f.hid ? '<span class="badge hid">SKRIT</span>' : '') + (f.bleed ? '<span class="badge bl">KRVAVI</span>' : '') + (f.poison ? '<span class="badge poi">STRUP</span>' : '') + (f.inked ? '<span class="badge ink">ČRNILO</span>' : '') + (f.suspect ? '<span class="badge sus">BOT?</span>' : '') + (f.cheat ? '<span class="badge cheat">GOLJUF</span>' : '') + (!f.alive ? ' · ' + esc(f.cause || 'mrtev') : '') + '</div>' +
        '<div class="bar hp"><i style="width:' + Math.round(100 * f.hp / Math.max(1, f.hpMax)) + '%"></i></div><div class="bar en"><i style="width:' + Math.round(100 * f.en / Math.max(1, f.enMax)) + '%"></i></div>' +
        (f.why ? '<div class="why">„' + esc(f.why) + '“</div>' : '') + '</div>';
    });
    if (!s.fish.length) html = '<div style="color:#8fb0c4;padding:6px">Še ni rib. Agenti se prijavijo s POST /claim.</div>';
    $('fish').innerHTML = html;
    Array.prototype.forEach.call(document.querySelectorAll('#fish .f'), function (el) { el.onclick = function () { selectFish(el.getAttribute('data-id'), true); }; });
    if (s.feed && s.feed.length !== lastFeedN) { lastFeedN = s.feed.length; $('feed').innerHTML = s.feed.slice().reverse().map(function (e) { return '<div><b>' + fmt(e.t / 4) + '</b>' + esc(e.txt) + '</div>'; }).join(''); }
    var f = cam.follow && s.fish.find(function (x) { return x.id === cam.follow; }); var ins = $('insp');
    if (f) {
      ins.style.display = 'block'; var zone = zoneOf(f);
      ins.innerHTML = '<b>' + esc(f.n) + '</b> · ' + esc(f.model) + '<br>velikost <b>' + f.sz.toFixed(2) + '</b> · hp <b>' + f.hp + '/' + f.hpMax + '</b> · energija <b>' + f.en + '/' + f.enMax + '</b> · stamina ' + f.st + '<br>globina <b>' + f.d + ' m</b> · hitrost ' + f.spd + ' m/s · smer ' + f.h + '°<br>cona: ' + esc(zone) + '<br>ukaz: <b>' + f.act + '</b> · odločitev ' + f.cmdN + (f.explored !== undefined ? ' · con ' + f.explored : '') + ' · brez ukaza ' + f.idle + ' s<br>ulovi ' + f.kills + ' · pojedel ' + f.ate + ' · točke ' + f.score + (f.alive ? '' : '<br><span style="color:#ffb0a0">' + esc(f.cause || '') + '</span>');
    } else ins.style.display = 'none';
    if (s.status === 'finished' && s.ranks && $('end').style.display !== 'flex' && !$('end').dataset['g' + s.gen]) {
      $('end').dataset['g' + s.gen] = 1; $('end').style.display = 'flex';
      $('end-body').innerHTML = '<p style="margin-bottom:8px">Zmagovalec: <b style="color:#8fd3ff">' + esc(s.winner || '—') + '</b></p><table><tr><th>#</th><th>riba</th><th>model</th><th>točke</th><th>velikost</th><th>ulovi</th><th>pojedel</th><th>odločitev</th><th>usoda</th></tr>' + s.ranks.map(function (r) { return '<tr><td>' + r.rank + '</td><td>' + esc(r.name) + (r.cheat ? ' <span class="badge cheat">GOLJUF</span>' : '') + (r.suspect ? ' <span class="badge sus">BOT?</span>' : '') + '</td><td>' + esc(r.model) + '</td><td>' + r.score + '</td><td>' + r.size + '</td><td>' + r.kills + '</td><td>' + r.eaten + '</td><td>' + r.decisions + '</td><td>' + (r.alive ? 'preživel' : esc(r.cause || '')) + '</td></tr>'; }).join('') + '</table>';
    }
    $('conn').textContent = live.demo ? 'demo (lokalni pogon)' : (live.ok ? 'povezano' : 'ni povezave: ' + live.lastErr);
    if ($('m-host').style.display === 'flex') renderAdminFish(s);
  }
  function zoneOf(f) {
    var z = []; var k = OC.kelpAt(f.x, f.z, f.d); if (k) z.push(k.id);
    if (OC.seagrassAt && OC.seagrassAt(f.x, f.z, f.d)) z.push('travnik');
    if (OC.reefAt(f.x, f.z, f.d)) z.push('greben');
    if (OC.anemoneAt && OC.anemoneAt(f.x, f.z, f.d)) z.push('anemone');
    if (OC.wreckAt(f.x, f.z, f.d)) z.push('razbitina');
    var c = OC.caveAt(f.x, f.z, f.d); if (c) z.push(c.id);
    if (OC.whalefallAt && OC.whalefallAt(f.x, f.z, f.d)) z.push('kitovo okostje');
    var v = OC.ventAt(f.x, f.z, f.d); if (v.dist < 16) z.push('vrelec');
    if (OC.inBiolum(f.x, f.z, f.d)) z.push('svetleča voda');
    if (OC.inDeadzone(f.x, f.z, f.d)) z.push('mrtva cona');
    if (f.d < 4.5) z.push('gladina'); if (f.d > floorAt(f.x, f.z) - 1.6) z.push('na dnu');
    var cu = OC.currentAt(f.x, f.z, f.d); if (cu.id) z.push('tok ' + cu.id);
    return z.length ? z.join(', ') : 'odprto morje';
  }
  function esc(s) { return (s === undefined || s === null ? '' : String(s)).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(m) { var t = $('toast'); t.textContent = m; t.style.opacity = 1; clearTimeout(t._h); t._h = setTimeout(function () { t.style.opacity = 0; }, 2800); }

  $('b-free').onclick = function () { setMode('free'); };
  $('b-follow').onclick = function () { if (!cam.follow && B && B.fish[0]) cam.follow = B.fish[0].id; if (cam.follow) setMode('follow'); else toast('Ni ribe za sledenje'); };
  $('b-pov').onclick = function () { if (!cam.follow && B && B.fish[0]) cam.follow = B.fish[0].id; if (cam.follow) setMode('pov'); else toast('Izberi ribo za pogled iz oči'); };
  $('b-over').onclick = function () { setMode('over'); };
  $('b-shark').onclick = function () { if (cam.mode === 'shark') cam.sharkIdx = (cam.sharkIdx + 1) % 5; setMode('shark'); if (B && B.sharks && B.sharks[cam.sharkIdx]) toast('Sledim psu: ' + B.sharks[cam.sharkIdx].name); };
  var showLabels = true, showWhy = true;
  $('b-labels').onclick = function () { showLabels = !showLabels; this.classList.toggle('on', showLabels); };
  $('b-why').onclick = function () { showWhy = !showWhy; this.classList.toggle('on', showWhy); };
  $('b-sense').onclick = function () { showSense = !showSense; this.classList.toggle('on', showSense); };
  $('b-demo').onclick = function () { setDemo(!live.demo); };
  $('url').value = API; $('url').onchange = function () { API = this.value.trim() || DEFAULT_API; try { localStorage.setItem('ocean.api', API); } catch (e) { } fails = 0; if (live.demo) setDemo(false); };

  // Navodila & Prijava modal
  var promptCache = { sl: null, en: null };
  function copyText(txt, okMsg) {
    if (!txt) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(function () { toast(okMsg); }).catch(function () { fallbackCopy(txt, okMsg); });
    } else fallbackCopy(txt, okMsg);
  }
  function fallbackCopy(txt, okMsg) {
    try {
      var ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); toast(okMsg);
    } catch (e) { toast('Kopiraj ročno iz okna spodaj'); }
  }
  function loadPrompt(lang) {
    if (promptCache[lang]) { $('prompt-preview').textContent = promptCache[lang]; return Promise.resolve(promptCache[lang]); }
    var path = lang === 'en' ? '/prompt/en' : '/prompt';
    $('prompt-preview').textContent = 'Nalagam ' + API + path + ' …';
    return fetch(API + path).then(function (r) { return r.text(); }).then(function (txt) {
      promptCache[lang] = txt; $('prompt-preview').textContent = txt; return txt;
    }).catch(function () { $('prompt-preview').textContent = 'API baza: ' + API + '\nPokliči GET /rules in POST /claim za prijavo.'; return null; });
  }
  $('b-info').onclick = function () { $('m-info').style.display = 'flex'; loadPrompt('sl'); };
  $('b-copy-sl').onclick = function () { loadPrompt('sl').then(function (t) { if (t) copyText(t, 'Slovenski prompt kopiran'); }); };
  $('b-copy-en').onclick = function () { loadPrompt('en').then(function (t) { if (t) copyText(t, 'Angleški prompt kopiran'); }); };
  $('b-copy-api').onclick = function () { copyText(API, 'URL arene kopiran'); };

  // Gostitelj / Admin nadzor (tudi neposredno na nadzorni plošči!)
  $('adm-key').value = ADM;
  function openHost() { $('m-host').style.display = 'flex'; if (B) renderAdminFish(B); setTimeout(function () { if ($('adm-key').focus) $('adm-key').focus(); }, 20); }
  $('b-host').onclick = openHost;
  $('b-adm-save').onclick = function () { ADM = $('adm-key').value.trim(); try { localStorage.setItem('ocean.admin', ADM); } catch (e) { } toast('Admin ključ shranjen'); fails = 0; };
  function admCall(path) {
    if (!ADM) { toast('Najprej vnesi in shrani admin ključ'); openHost(); return Promise.resolve(); }
    return fetch(API + path + (path.indexOf('?') >= 0 ? '&' : '?') + 'admin=' + encodeURIComponent(ADM), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) { toast(d.error ? 'Pozor: ' + d.error : 'OK: ' + (d.status || JSON.stringify(d))); if (live.demo) setDemo(false); else poll(); })
      .catch(function (e) { toast('Napaka: ' + e.message); });
  }
  $('b-top-start').onclick = function () { admCall('/start?in=0' + (B && B.fish && B.fish.length === 1 ? '&force=1' : '')); };
  $('b-qstart').onclick = function () { admCall('/start?in=0' + (B && B.fish && B.fish.length === 1 ? '&force=1' : '')); };
  $('b-qhold').onclick = function () { admCall('/start?manual=1'); };
  $('b-qreset').onclick = function () { admCall('/reset?manual=1'); };
  $('b-adm-start').onclick = function () { admCall('/start?in=0' + (B && B.fish && B.fish.length === 1 ? '&force=1' : '')); };
  $('b-adm-hold').onclick = function () { admCall('/start?manual=1'); };
  $('b-adm-wait').onclick = function () { admCall('/start?in=300'); };
  $('b-adm-reset-man').onclick = function () { admCall('/reset?manual=1'); };
  $('b-adm-reset').onclick = function () { admCall('/reset'); };
  function renderAdminFish(s) {
    var box = $('adm-fish'); if (!box || !s) return;
    box.innerHTML = '<table><tr><th>ID</th><th>Ime</th><th>Model</th><th>Stanje</th><th>Akcija</th></tr>' + s.fish.map(function (f) {
      return '<tr><td>' + esc(f.id) + '</td><td>' + esc(f.n) + '</td><td>' + esc(f.model) + '</td><td>' + (f.alive ? 'živ (' + f.sz + ')' : 'mrtev') + '</td><td><button data-kick="' + esc(f.id) + '" class="warn">Vrzi ven</button></td></tr>';
    }).join('') + '</table>';
    box.querySelectorAll('button[data-kick]').forEach(function (btn) { btn.onclick = function () { admCall('/kick?id=' + encodeURIComponent(btn.getAttribute('data-kick'))); }; });
  }

  // Minimapa (800×800)
  var mini = $('mini'), mctx = mini.getContext('2d'), miniBg = (function () { var c = document.createElement('canvas'); c.width = 100; c.height = 100; var x = c.getContext('2d'), im = x.createImageData(100, 100); for (var j = 0; j < 100; j++) for (var i = 0; i < 100; i++) { var d = floorAt(i * 8 + 4, j * 8 + 4), t = OC.clamp((d - 8) / 168, 0, 1), o = (j * 100 + i) * 4; im.data[o] = 60 + 130 * (1 - t); im.data[o + 1] = 110 + 90 * (1 - t); im.data[o + 2] = 150 + 60 * (1 - t); im.data[o + 3] = 255; } x.putImageData(im, 0, 0); return c; })();
  mini.addEventListener('click', function (e) { var r = mini.getBoundingClientRect(); var x = (e.clientX - r.left) / r.width * W, z = (e.clientY - r.top) / r.height * L; cam.pos.set(x, -Math.min(35, floorAt(x, z) - 5), z + 55); cam.yaw = Math.PI; cam.pitch = -0.3; setMode('free'); });
  function drawMini(s) {
    var k = 220 / W; mctx.clearRect(0, 0, 220, 220); mctx.drawImage(miniBg, 0, 0, 220, 220);
    OC.KELP.forEach(function (q) { mctx.fillStyle = 'rgba(60,160,60,.45)'; mctx.beginPath(); mctx.arc(q.x * k, q.z * k, q.r * k, 0, 6.28); mctx.fill(); });
    (OC.SEAGRASS || []).forEach(function (q) { mctx.fillStyle = 'rgba(80,190,110,.35)'; mctx.beginPath(); mctx.arc(q.x * k, q.z * k, q.r * k, 0, 6.28); mctx.fill(); });
    (OC.REEFS || [OC.REEF]).forEach(function (q) { mctx.fillStyle = 'rgba(240,120,110,.5)'; mctx.beginPath(); mctx.arc(q.x * k, q.z * k, q.r * k, 0, 6.28); mctx.fill(); });
    if (OC.ANEMONES) { mctx.fillStyle = 'rgba(255,110,200,.55)'; mctx.beginPath(); mctx.arc(OC.ANEMONES.x * k, OC.ANEMONES.z * k, OC.ANEMONES.r * k, 0, 6.28); mctx.fill(); }
    (OC.WRECKS || [OC.WRECK]).forEach(function (w) { mctx.fillStyle = 'rgba(130,90,50,.85)'; mctx.fillRect(w.x * k - 3, w.z * k - 1.5, 6, 3); });
    (OC.WHALEFALLS || []).forEach(function (wf) { mctx.fillStyle = 'rgba(220,215,195,.8)'; mctx.fillRect(wf.x * k - 2.5, wf.z * k - 1.5, 5, 3); });
    OC.CAVES.forEach(function (c) { mctx.fillStyle = '#000'; mctx.beginPath(); mctx.arc(c.x * k, c.z * k, 1.8, 0, 6.28); mctx.fill(); });
    OC.VENTS.forEach(function (v) { mctx.fillStyle = '#ff8040'; mctx.beginPath(); mctx.arc(v.x * k, v.z * k, 1.4, 0, 6.28); mctx.fill(); });
    mctx.fillStyle = 'rgba(160,120,255,.30)'; mctx.beginPath(); mctx.arc(OC.BIOLUM.x * k, OC.BIOLUM.z * k, OC.BIOLUM.r * k, 0, 6.28); mctx.fill();
    mctx.fillStyle = 'rgba(120,80,20,.38)'; mctx.beginPath(); mctx.arc(OC.DEADZONE.x * k, OC.DEADZONE.z * k, OC.DEADZONE.r * k, 0, 6.28); mctx.fill();
    if (!s) return;
    var jArr = Array.isArray(s.jellies) ? s.jellies : (s.jellies ? [s.jellies] : []);
    jArr.forEach(function (jl) { mctx.fillStyle = 'rgba(255,160,220,.45)'; mctx.beginPath(); mctx.arc(jl.x * k, jl.z * k, jl.r * k, 0, 6.28); mctx.fill(); });
    s.schools.forEach(function (q) { if (q.n > 0) { mctx.fillStyle = 'rgba(220,230,240,.75)'; mctx.beginPath(); mctx.arc(q.x * k, q.z * k, 1.3 + q.n / 120, 0, 6.28); mctx.fill(); } });
    (s.lanterns || []).forEach(function (q) { if (q.n > 0) { mctx.fillStyle = 'rgba(100,240,255,.8)'; mctx.beginPath(); mctx.arc(q.x * k, q.z * k, 1.3 + q.n / 80, 0, 6.28); mctx.fill(); } });
    (s.squids || []).forEach(function (q) { mctx.fillStyle = '#ff70b8'; mctx.fillRect(q.x * k - 1, q.z * k - 1, 2, 2); });
    var shArr = (s.sharks && s.sharks.length) ? s.sharks : (s.shark ? [s.shark] : []);
    shArr.forEach(function (sh) { mctx.save(); mctx.translate(sh.x * k, sh.z * k); mctx.rotate(sh.h * Math.PI / 180); mctx.fillStyle = sh.state === 'hunt' ? '#ff8888' : sh.state === 'pack' ? '#ffd070' : '#e8eef4'; mctx.beginPath(); mctx.moveTo(0, -4.5); mctx.lineTo(3, 3.8); mctx.lineTo(-3, 3.8); mctx.closePath(); mctx.fill(); mctx.restore(); });
    s.fish.forEach(function (f) { if (!f.alive) return; mctx.fillStyle = COLHEX[f.color] || '#fff'; mctx.beginPath(); mctx.arc(f.x * k, f.z * k, f.id === cam.follow ? 4.2 : 2.8, 0, 6.28); mctx.fill(); if (f.id === cam.follow) { mctx.strokeStyle = '#fff'; mctx.stroke(); } });
    mctx.strokeStyle = '#8fd3ff'; mctx.beginPath(); mctx.moveTo(cam.pos.x * k, cam.pos.z * k); mctx.lineTo((cam.pos.x + Math.sin(cam.yaw) * 40) * k, (cam.pos.z + Math.cos(cam.yaw) * 40) * k); mctx.stroke(); mctx.fillStyle = '#8fd3ff'; mctx.fillRect(cam.pos.x * k - 2, cam.pos.z * k - 2, 4, 4);
  }

  // ── Povezava / demo ──────────────────────────────────────────────────────
  var fails = 0, pollTimer = null;
  function poll() {
    if (live.demo) return;
    var ctrl = new AbortController(); var to = setTimeout(function () { ctrl.abort(); }, 6000);
    fetch(API + '/state' + (ADM ? '?admin=' + encodeURIComponent(ADM) : ''), { signal: ctrl.signal, cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (s) { clearTimeout(to); if (s.error) throw new Error(s.error); live.ok = true; fails = 0; pushState(s); pollTimer = setTimeout(poll, 500); })
      .catch(function (e) { clearTimeout(to); live.ok = false; live.lastErr = (e && e.message) || 'napaka'; fails++; if (fails >= 3 && !B) { setDemo(true); toast('Arena ni dosegljiva — demo način'); return; } updateUI(B); pollTimer = setTimeout(poll, 1500); });
  }
  var demo = null;
  function setDemo(on) {
    live.demo = on; $('b-demo').classList.toggle('on', on); if (pollTimer) clearTimeout(pollTimer);
    if (on) { demo = makeDemo(); A = B = null; lastGen = null; } else { demo = null; A = B = null; lastGen = null; fails = 0; poll(); }
  }
  function makeDemo() {
    var g = OC.newGame(Math.floor(Math.random() * 900) + 100, Date.now() % 100000);
    var names = ['Nerea', 'Bruno', 'Zlatka', 'Tihomir', 'Maja', 'Oskar', 'Vida', 'Luka'];
    var models = ['claude-sonnet', 'gpt-5', 'gemini-pro', 'grok-4', 'qwen3', 'kimi-k2', 'bot-camper', 'bot-random'];
    var pol = ['smart', 'hunter', 'smart', 'feeder', 'smart', 'feeder', 'camper', 'random'], cols = Object.keys(COL);
    for (var i = 0; i < 8; i++) { var f = OC.addFish(g, names[i], models[i] + ' (demo)', cols[i % 7], 'k' + i); f.pol = pol[i]; }
    var now = Date.now(); OC.start(g, now); var next = {}; g.fish.forEach(function (f) { next[f.id] = 4 + Math.floor(Math.random() * 30); });
    return { g: g, next: next, lastSnap: 0 };
  }
  function demoDecide(g, f, me) {
    var pol = f.pol, you = me.you, see = me.see, b = { why: '' }, R = Math.random;
    var fishSeen = see.filter(function (s) { return s.kind === 'fish'; }), bigger = fishSeen.filter(function (s) { return s.size > you.size * 1.2; }), smaller = fishSeen.filter(function (s) { return s.size < you.size / 1.55; });
    var shk = see.filter(function (s) { return s.kind === 'shark'; })[0];
    var food = see.filter(function (s) { return ['sardine school', 'lanternfish school', 'plankton cloud', 'crab', 'carcass', 'squid'].indexOf(s.kind) >= 0 && !(s.kind === 'plankton cloud' && you.size > 2.6) && !(s.kind === 'crab' && you.size < 1.3) && !(s.kind === 'squid' && you.size < 1.9); })[0];
    if (shk && shk.dist < 46) { b.act = 'flee'; b.target = shk.id; b.speed = 'sprint'; b.dur = 14; b.why = 'Morski pes ' + (shk.name || '') + ' na ' + Math.round(shk.dist) + ' m — bežim!'; return b; }
    if (pol === 'random') { b.act = 'swim'; b.heading = R() * 360; b.pitch = (R() - 0.5) * 40; b.speed = 'cruise'; b.dur = 20; b.why = 'Plavam naključno in opazujem.'; return b; }
    if (pol === 'camper') { if (you.zone.indexOf('reef-main') < 0) { b.act = 'swim'; b.goto = [214, 256, 18]; b.speed = 'cruise'; b.dur = 60; b.why = 'Grem na glavni koralni greben.'; } else { b.act = you.energy < you.energyMax * 0.5 ? 'feed' : 'hide'; b.dur = 60; b.why = b.act === 'feed' ? 'Pobiram hrano na grebenu.' : 'Skrit med koralami.'; } return b; }
    if (bigger.length && bigger[0].dist < 28) { var k = OC.KELP[0]; b.act = 'swim'; b.goto = [k.x, k.z, 20]; b.speed = 'sprint'; b.dur = 14; b.why = 'Večja riba ' + bigger[0].name + ' — v kelp!'; return b; }
    if ((pol === 'hunter' || pol === 'smart') && smaller.length) { b.act = (pol === 'smart' && smaller[0].dist < 10 && you.stamina >= 40) ? 'lunge' : 'hunt'; b.target = smaller[0].id; b.speed = smaller[0].dist < 8 ? 'sprint' : 'fast'; b.dur = 20; b.why = 'Lovim ' + smaller[0].name + '!'; return b; }
    if (pol === 'smart' && me.smell.length && you.energy < you.energyMax * 0.65) { b.act = 'feed'; b.heading = me.smell[0].bearing; b.speed = 'cruise'; b.dur = 20; b.why = 'Sledim vonju po ' + me.smell[0].kind + '.'; return b; }
    if (food && you.energy < you.energyMax * 0.9) { b.act = 'feed'; b.target = food.id; b.speed = 'cruise'; b.dur = 20; b.why = 'Hranim se: ' + food.kind + ' (' + Math.round(food.dist) + ' m).'; return b; }
    b.act = 'feed'; b.heading = R() * 360; b.pitch = (R() - 0.5) * 30; b.speed = 'cruise'; b.dur = 20; b.why = 'Iščem klignje in jate v novi smeri.'; return b;
  }
  function demoTick() {
    if (!demo) return; var g = demo.g, now = Date.now(); OC.advance(g, now);
    g.fish.forEach(function (f) { if (!f.alive) return; if (g.tick >= demo.next[f.id]) { var me = OC.perceive(g, f, now); var v = OC.validateCmd(demoDecide(g, f, me)); if (v.ok) OC.applyCmd(g, f, v.cmd, now + 2000 + Math.random() * 3000); demo.next[f.id] = g.tick + 16 + Math.floor(Math.random() * 50); } });
    if (now - demo.lastSnap > 400) { demo.lastSnap = now; pushState(OC.snapshot(g, now)); }
    if (g.status === 'finished' && !demo.restartAt) demo.restartAt = now + 15000; if (demo.restartAt && now > demo.restartAt) { demo = makeDemo(); }
  }

  // ── Zanka ────────────────────────────────────────────────────────────────
  var last = performance.now(), M = new T.Matrix4(), Q = new T.Quaternion(), V = new T.Vector3(), SC = new T.Vector3();
  function syncPool(arr, map, ensureFn, removeFn, updateFn) {
    var seen = {};
    (arr || []).forEach(function (item) { var o = ensureFn(item); seen[item.id] = 1; updateFn(item, o); });
    for (var id in map) if (!seen[id]) { removeFn(map[id]); delete map[id]; }
  }

  function frame() {
    requestAnimationFrame(frame); var now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now; var ts = now / 1000;
    if (live.demo) demoTick();
    updateCamera(dt);
    if (B) {
      var alpha = OC.clamp((now - LAG - tA) / Math.max(1, tB - tA), 0, 1.3), s = B;
      var seenF = {}; s.fish.forEach(function (f) { seenF[f.id] = 1; });
      for (var fid in fishObjs) if (!seenF[fid]) removeFishObj(fid);

      s.fish.forEach(function (f) {
        var o = ensureFish(f), pr = interp(f.id, 'fish'), a = pr.a || f;
        var x = OC.lerp(a.x, f.x, alpha), z = OC.lerp(a.z, f.z, alpha), d = OC.lerp(a.d, f.d, alpha), h = lerpA(a.h, f.h, alpha), p = OC.lerp(a.p, f.p, alpha);
        var len = 1.6 + 1.0 * f.sz; o.g.scale.setScalar(len); o.g.position.set(x, -d, z);
        o.g.rotation.set(p * Math.PI / 180, Math.atan2(Math.sin(h * Math.PI / 180), -Math.cos(h * Math.PI / 180)), 0, 'YXZ');
        o.g.userData.tail.rotation.y = Math.sin(ts * (4.5 + f.spd * 3.2) + f.id.length) * (0.14 + Math.min(0.55, f.spd * 0.13));
        var finFl = Math.sin(ts * (3 + f.spd * 2)) * 0.25;
        o.g.userData.finL.rotation.x = finFl; o.g.userData.finR.rotation.x = -finFl;
        o.g.userData.mudCloud.visible = !!f.mud && f.alive;
        var mat = o.g.userData.mat, op = f.alive ? (f.hid ? 0.32 : 1) : 0.0;
        mat.transparent = op < 1; mat.opacity = op;
        o.g.userData.finMat.transparent = op < 1; o.g.userData.finMat.opacity = op;
        o.g.userData.bellyMat.transparent = op < 1; o.g.userData.bellyMat.opacity = op;
        o.g.visible = f.alive;
        mat.emissive.setHex(f.bleed ? 0x551010 : f.poison ? 0x1a4810 : f.inked ? 0x101038 : 0x000000);
        var dc = camera.position.distanceTo(o.g.position), sc = OC.clamp(dc * 0.09, 1.2, 9);
        var hideSelfPov = cam.mode === 'pov' && f.id === cam.follow;
        if (hideSelfPov) o.g.visible = false;
        o.label.visible = showLabels && f.alive && !hideSelfPov; o.label.position.set(x, -d + len * 0.55, z); o.label.scale.set(sc * 3, sc, 1); drawLabel(o.label, f);
        o.bubble.visible = showWhy && f.alive && !!f.why && dc < 105 && !hideSelfPov; o.bubble.position.set(x, -d + len * 0.55 + sc, z); o.bubble.scale.set(sc * 2.7, sc, 1); drawBubble(o.bubble, f.why || '');
      });

      var selF = cam.follow && s.fish.find(function (x) { return x.id === cam.follow && x.alive; });
      if (showSense && selF) {
        var Lf = (s.light || 1) * Math.exp(-selF.d / 48), visR = 9 + 58 * Lf;
        senseRing.visible = true; senseRing.position.set(selF.x, -selF.d, selF.z); senseRing.scale.setScalar(visR);
        var pa = senseLines.geometry.attributes.position, li = 0;
        s.fish.forEach(function (o2) { if (!o2.alive || o2.id === selF.id || li >= 9) return; if (Math.hypot(o2.x - selF.x, o2.z - selF.z, o2.d - selF.d) <= visR * 1.4) { pa.setXYZ(li * 2, selF.x, -selF.d, selF.z); pa.setXYZ(li * 2 + 1, o2.x, -o2.d, o2.z); li++; } });
        for (var zi = li * 2; zi < 20; zi++) pa.setXYZ(zi, 0, 0, 0);
        pa.needsUpdate = true; senseLines.visible = li > 0;
      } else { senseRing.visible = false; senseLines.visible = false; }

      // 5 morskih psov (tudi v tropih!)
      var shList = (s.sharks && s.sharks.length) ? s.sharks : (s.shark ? [Object.assign({ id: 'sh1', name: 'MORSKI PES', sz: 12 }, s.shark)] : []);
      shList.forEach(function (sb) {
        var sh = ensureSharkObj(sb), pr = interp(sb.id, 'sharks'), sa = pr.a || (A && A.shark) || sb;
        var sx = OC.lerp(sa.x, sb.x, alpha), sz_ = OC.lerp(sa.z, sb.z, alpha), sd = OC.lerp(sa.d, sb.d, alpha), shh = lerpA(sa.h, sb.h, alpha);
        sh.g.position.set(sx, -sd, sz_); sh.g.rotation.set(0, Math.atan2(Math.sin(shh * Math.PI / 180), -Math.cos(shh * Math.PI / 180)), 0);
        sh.g.userData.tail.rotation.y = Math.sin(ts * (3 + sb.spd)) * 0.28;
        sh.g.userData.mat.emissive.setHex(sb.state === 'hunt' ? 0x450a08 : sb.state === 'pack' ? 0x3a2406 : 0x000000);
        sh.label.visible = showLabels; sh.label.position.set(sx, -sd + 5.2, sz_);
        var sdc = camera.position.distanceTo(sh.g.position), ssc = OC.clamp(sdc * 0.085, 1.4, 9.5);
        sh.label.scale.set(ssc * 3, ssc, 1);
        drawLabel(sh.label, { n: (sb.name || 'MORSKI PES').toUpperCase(), model: sb.state === 'hunt' ? 'LOVI ' + (sb.target || '') : sb.state === 'pack' ? 'TROP FLANK ' + (sb.target || '') : sb.state === 'scavenge' ? 'voha mrhovino' : (sb.tired ? 'utrujen' : 'patrulja'), hp: 1, hpMax: 1, en: 1, enMax: 1, sz: sb.sz || 12, alive: true });
      });

      // Klignji, raže, želve, barakude, murene, oblaki črnila
      syncPool(s.squids, squidObjs, ensureSquid, function (o) { scene.remove(o.g); }, function (q, o) {
        var pr = interp(q.id, 'squids'), a = pr.a || q, h = lerpA(a.h, q.h, alpha);
        o.g.position.set(OC.lerp(a.x, q.x, alpha), -OC.lerp(a.d, q.d, alpha), OC.lerp(a.z, q.z, alpha));
        o.g.rotation.y = Math.atan2(Math.sin(h * Math.PI / 180), -Math.cos(h * Math.PI / 180));
        o.g.userData.tents.rotation.y = Math.sin(ts * (q.dash ? 12 : 4)) * 0.35;
        o.g.userData.mat.emissive.setHex(q.dash ? 0x552266 : 0x220815);
      });
      syncPool(s.rays, rayObjs, ensureRay, function (o) { scene.remove(o.g); }, function (q, o) {
        var pr = interp(q.id, 'rays'), a = pr.a || q, h = lerpA(a.h, q.h, alpha);
        o.g.position.set(OC.lerp(a.x, q.x, alpha), -OC.lerp(a.d, q.d, alpha), OC.lerp(a.z, q.z, alpha));
        o.g.rotation.y = Math.atan2(Math.sin(h * Math.PI / 180), -Math.cos(h * Math.PI / 180));
        var fl = Math.sin(ts * 2.6 + q.x) * 0.35; o.g.userData.wL.rotation.z = fl; o.g.userData.wR.rotation.z = -fl;
      });
      syncPool(s.turtles, turtleObjs, ensureTurtle, function (o) { scene.remove(o.g); }, function (q, o) {
        o.g.position.set(q.x, -q.d, q.z); o.g.rotation.y = Math.atan2(Math.sin(q.h * Math.PI / 180), -Math.cos(q.h * Math.PI / 180));
      });
      syncPool(s.barracudas, cudaObjs, ensureCuda, function (o) { scene.remove(o.g); }, function (q, o) {
        var pr = interp(q.id, 'barracudas'), a = pr.a || q, h = lerpA(a.h, q.h, alpha);
        o.g.position.set(OC.lerp(a.x, q.x, alpha), -OC.lerp(a.d, q.d, alpha), OC.lerp(a.z, q.z, alpha));
        o.g.rotation.y = Math.atan2(Math.sin(h * Math.PI / 180), -Math.cos(h * Math.PI / 180));
        o.g.userData.tail.rotation.y = Math.sin(ts * 7) * 0.25;
      });
      syncPool(s.morays, morayObjs, ensureMoray, function (o) { scene.remove(o.g); }, function (q, o) {
        o.g.position.set(q.x, -q.d, q.z); o.g.rotation.y = q.h * Math.PI / 180;
        o.g.userData.segs.forEach(function (sm, si) { sm.position.x = Math.sin(ts * 3 + si * 0.7) * 0.14; });
      });
      syncPool(s.inks, inkObjs, ensureInk, function (o) { scene.remove(o.m); }, function (ik, o) {
        o.m.position.set(ik.x, -ik.d, ik.z); o.m.scale.setScalar(ik.r);
      });

      // Jate sardel in svetilnic
      s.schools.forEach(function (q) { var o = ensureSchool(q, schoolObjs, sardMat), pr = interp(q.id, 'schools'), a = pr.a || q; var cx = OC.lerp(a.x, q.x, alpha), cz = OC.lerp(a.z, q.z, alpha), cd = OC.lerp(a.d, q.d, alpha); var vis = Math.min(o.ph.length, Math.ceil(q.n / 180 * o.ph.length)); o.im.visible = q.n > 0; for (var i = 0; i < o.ph.length; i++) { var p = o.ph[i]; if (i >= vis) { M.makeScale(0, 0, 0); o.im.setMatrixAt(i, M); continue; } var an = p.a + ts * p.w; V.set(cx + Math.cos(an) * p.r, -cd + p.y + Math.sin(ts * 1.3 + p.a) * 0.5, cz + Math.sin(an) * p.r); Q.setFromEuler(new T.Euler(0, Math.atan2(-Math.sin(an), Math.cos(an)) + Math.PI, 0)); SC.set(1, 1, 1); M.compose(V, Q, SC); o.im.setMatrixAt(i, M); } o.im.instanceMatrix.needsUpdate = true; });
      (s.lanterns || []).forEach(function (q) { var o = ensureSchool(q, lanternObjs, lantMat), pr = interp(q.id, 'lanterns'), a = pr.a || q; var cx = OC.lerp(a.x, q.x, alpha), cz = OC.lerp(a.z, q.z, alpha), cd = OC.lerp(a.d, q.d, alpha); var vis = Math.min(o.ph.length, Math.ceil(q.n / 90 * o.ph.length)); o.im.visible = q.n > 0; for (var i = 0; i < o.ph.length; i++) { var p = o.ph[i]; if (i >= vis) { M.makeScale(0, 0, 0); o.im.setMatrixAt(i, M); continue; } var an = p.a + ts * p.w; V.set(cx + Math.cos(an) * p.r, -cd + p.y + Math.sin(ts * 1.5 + p.a) * 0.4, cz + Math.sin(an) * p.r); Q.setFromEuler(new T.Euler(0, Math.atan2(-Math.sin(an), Math.cos(an)) + Math.PI, 0)); SC.set(1.1, 1.1, 1.1); M.compose(V, Q, SC); o.im.setMatrixAt(i, M); } o.im.instanceMatrix.needsUpdate = true; });

      // Plankton & 3 roji meduz & raki & napihovalke & mrhovina
      s.plankton.forEach(function (q) { var o = ensurePlank(q); o.pt.visible = q.amt > 1; o.pt.position.set(q.x, -q.d, q.z); o.pt.material.opacity = 0.2 + 0.6 * q.amt / 110; o.pt.rotation.y = ts * 0.05; });
      var jArr = Array.isArray(s.jellies) ? s.jellies : (s.jellies ? [s.jellies] : []);
      jArr.forEach(function (jl, idx) { var sw2 = ensureJellySwarm(idx); sw2.grp.position.set(jl.x, -jl.d, jl.z); sw2.items.forEach(function (j) { j.g.position.set(j.ox * jl.r, j.oy * 14 + Math.sin(ts * 0.8 + j.ph) * 1.2, j.oz * jl.r); j.g.scale.y = 0.85 + 0.25 * Math.sin(ts * 2 + j.ph); }); });
      if (!crabMesh) { crabMesh = new T.InstancedMesh(crabGeo, crabMat, 80); scene.add(crabMesh); } crabMesh.count = Math.min(80, s.crabs.length); s.crabs.forEach(function (c, i) { if (i >= 80) return; M.makeRotationY(i * 1.7); M.setPosition(c.x, -c.d + 0.1, c.z); crabMesh.setMatrixAt(i, M); }); crabMesh.instanceMatrix.needsUpdate = true;
      var seenP = {}; s.puffers.forEach(function (u) { var o = ensurePuffer(u); seenP[u.id] = 1; var pr = interp(u.id, 'puffers'), a = pr.a || u; o.m.position.set(OC.lerp(a.x, u.x, alpha), -u.d + Math.sin(ts + u.x) * 0.3, OC.lerp(a.z, u.z, alpha)); o.m.rotation.y = ts * 0.5; }); for (var pid in pufferObjs) if (!seenP[pid]) { scene.remove(pufferObjs[pid].m); delete pufferObjs[pid]; }
      var seenK = {}; s.carrion.forEach(function (k) { var o = ensureCarrion(k); seenK[k.id] = 1; o.g.position.set(k.x, -k.d, k.z); }); for (var kid in carrionObjs) if (!seenK[kid]) { scene.remove(carrionObjs[kid].g); delete carrionObjs[kid]; }

      // Svetloba / megla / sončni žarki
      var camD = Math.max(0, -camera.position.y), Lc = (s.light || 1) * Math.exp(-camD / 48), above = camera.position.y > 0;
      var fc = new T.Color().setRGB(0.02 + 0.10 * Lc, 0.10 + 0.35 * Lc, 0.20 + 0.45 * Lc); if (above) fc.setRGB(0.55, 0.75, 0.95);
      scene.fog.color.copy(fc); scene.background = fc; scene.fog.density = above ? 0.0012 : 0.0042 + 0.015 * (1 - Lc) + (OC.inBiolum(camera.position.x, camera.position.z, camD) ? 0.003 : 0);
      hemi.intensity = 0.25 + 0.8 * (s.light || 1); sun.intensity = 0.2 + 0.9 * (s.light || 1); amb.intensity = 0.35 + 0.3 * (s.light || 1);
      raysGroup.visible = !above && (s.light || 0) > 0.25;
      if (raysGroup.visible) raysGroup.children.forEach(function (rm, ri) { rm.material.opacity = 0.02 + 0.04 * (s.light || 1) * (0.7 + 0.3 * Math.sin(ts * 0.6 + ri)); });
      drawMini(s);
    }
    sway.forEach(function (o) {
      if (o.isInstancedMesh) { var items = o.userData; for (var i = 0; i < items.length; i++) { var it = items[i]; var ang = Math.sin(ts * 0.9 + it.ph) * 0.09; Q.setFromEuler(new T.Euler(ang, 0, Math.cos(ts * 0.7 + it.ph) * 0.09)); V.set(it.x, it.y, it.z); SC.set(1, it.h, 1); M.compose(V, Q, SC); o.setMatrixAt(i, M); } o.instanceMatrix.needsUpdate = true; }
      else if (o.ring) { o.ring.rotation.z = ts; o.ring.material.color.setHSL(0.5, 1, 0.6 + 0.2 * Math.sin(ts * 3)); if (o.wrasses) o.wrasses.forEach(function (w) { var a = w.a + ts * 1.4; w.m.position.set(o.cx + Math.cos(a) * w.r, o.cy + w.dy + Math.sin(ts * 2 + w.a) * 0.25, o.cz + Math.sin(a) * w.r); w.m.rotation.y = -a; }); }
      else if (o.anems) { o.anems.forEach(function (an) { an.g.rotation.z = Math.sin(ts * 1.6 + an.ph) * 0.14; an.g.rotation.x = Math.cos(ts * 1.2 + an.ph) * 0.12; }); }
      else if (o.smoke) { var pa = o.smoke.geometry.attributes.position; for (var k = 0; k < pa.count; k++) { var y = pa.getY(k) + dt * 2.5; if (y > o.base + 38) y = o.base; pa.setY(k, y); pa.setX(k, o.x + Math.sin(ts + k) * (y - o.base) * 0.08); } pa.needsUpdate = true; }
      else if (o.glow) { o.glow.material.opacity = 0.55 + 0.35 * Math.sin(ts * 1.7); o.glow.rotation.y = ts * 0.02; }
      else if (o.cur) { var c = o.c, pb = o.cur.geometry.attributes.position; for (var m = 0; m < o.items.length; m++) { var it2 = o.items[m]; if (c.kind === 'seg') { var len = Math.hypot(c.bx - c.ax, c.bz - c.az); it2.t += dt * c.v / len; if (it2.t > 1) it2.t -= 1; var ux = (c.bx - c.ax) / len, uz = (c.bz - c.az) / len; pb.setXYZ(m, c.ax + ux * len * it2.t - uz * it2.off * c.w, -(c.d0 + it2.d * (c.d1 - c.d0)), c.az + uz * len * it2.t + ux * it2.off * c.w); } else { it2.d -= dt * 0.02; if (it2.d < 0) it2.d += 1; pb.setXYZ(m, c.x + Math.cos(it2.off * 3.14) * c.r * it2.t, -(5 + it2.d * 60), c.z + Math.sin(it2.off * 3.14) * c.r * it2.t); } } pb.needsUpdate = true; }
    });
    snow.position.copy(camera.position); snow.rotation.y = ts * 0.01;
    renderer.render(scene, camera);
  }
  setMode('free');
  if (qs.get('cam')) { var cq = qs.get('cam').split(',').map(Number); if (cq.length >= 5) { cam.pos.set(cq[0], cq[1], cq[2]); cam.yaw = cq[3]; cam.pitch = cq[4]; } }
  if (qs.get('demo') === '1') setDemo(true); else poll();
  frame();
})();
