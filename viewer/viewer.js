// OCEAN ARENA — 3D gledalec (Three.js r128, vgrajen). Živi način: poll /state; demo način: lokalni pogon.
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
  scene.fog = new T.FogExp2(0x0b3a5c, 0.013);
  var camera = new T.PerspectiveCamera(62, 1, 0.25, 950);
  var hemi = new T.HemisphereLight(0x98dcff, 0x071e36, 0.95); scene.add(hemi);
  var sun = new T.DirectionalLight(0xfff4d4, 0.95); sun.position.set(120, 210, 60); scene.add(sun);
  var amb = new T.AmbientLight(0x204e74, 0.55); scene.add(amb);
  function resize() { var w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  window.addEventListener('resize', resize); resize();

  // ── Dno in gladina ───────────────────────────────────────────────────────
  var surfMesh = null, raysGroup = new T.Group();
  (function buildFloor() {
    var seg = 144, geo = new T.PlaneGeometry(W, L, seg, seg); geo.rotateX(-Math.PI / 2); geo.translate(W / 2, 0, L / 2);
    var pos = geo.attributes.position, colors = new Float32Array(pos.count * 3), c = new T.Color();
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), z = pos.getZ(i), d = floorAt(x, z); pos.setY(i, -d);
      var t = OC.clamp((d - 10) / 120, 0, 1);
      c.setRGB(0.62 - 0.48 * t, 0.57 - 0.42 * t, 0.42 - 0.26 * t);
      if (OC.gauss(x, z, OC.REEF.x, OC.REEF.z, OC.REEF.r) > 0.42) c.setRGB(0.76, 0.46, 0.43);
      if (OC.ANEMONES && OC.gauss(x, z, OC.ANEMONES.x, OC.ANEMONES.z, OC.ANEMONES.r) > 0.4) c.setRGB(0.58, 0.34, 0.52);
      for (var k = 0; k < OC.KELP.length; k++) if (OC.gauss(x, z, OC.KELP[k].x, OC.KELP[k].z, OC.KELP[k].r) > 0.38) c.setRGB(0.28, 0.42, 0.21);
      if (OC.gauss(x, z, OC.DEADZONE.x, OC.DEADZONE.z, OC.DEADZONE.r) > 0.35 && d > 76) c.setRGB(0.21, 0.16, 0.10);
      if (OC.WHALEFALL && OC.gauss(x, z, OC.WHALEFALL.x, OC.WHALEFALL.z, OC.WHALEFALL.r) > 0.4) c.setRGB(0.22, 0.22, 0.25);
      for (var v = 0; v < OC.VENTS.length; v++) {
        var vg = OC.gauss(x, z, OC.VENTS[v].x, OC.VENTS[v].z, 9.5);
        if (vg > 0.55) c.setRGB(0.11, 0.09, 0.09);
        else if (vg > 0.25) c.setRGB(0.32, 0.30, 0.24); // bakterijske preproge
      }
      var n = (Math.sin(x * 0.9) * Math.cos(z * 1.1) + Math.sin(x * 0.27 + z * 0.33)) * 0.024;
      c.r = OC.clamp(c.r + n, 0, 1); c.g = OC.clamp(c.g + n, 0, 1); c.b = OC.clamp(c.b + n, 0, 1);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(colors, 3)); geo.computeVertexNormals();
    scene.add(new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true })));
    // meje akvarija
    var wallMat = new T.MeshBasicMaterial({ color: 0x08304a, transparent: true, opacity: 0.28, side: T.DoubleSide, depthWrite: false });
    [[W / 2, 0, 0, W, 0], [W / 2, 0, L, W, 0], [0, 0, L / 2, L, Math.PI / 2], [W, 0, L / 2, L, Math.PI / 2]].forEach(function (a) {
      var m = new T.Mesh(new T.PlaneGeometry(a[3], OC.DMAX), wallMat); m.position.set(a[0], -OC.DMAX / 2, a[2]); m.rotation.y = a[4]; scene.add(m);
    });
    // gladina
    var surfGeo = new T.PlaneGeometry(W * 2.5, L * 2.5, 24, 24);
    surfMesh = new T.Mesh(surfGeo, new T.MeshBasicMaterial({ color: 0x6ec2f5, transparent: true, opacity: 0.34, side: T.DoubleSide, depthWrite: false }));
    surfMesh.rotation.x = -Math.PI / 2; surfMesh.position.set(W / 2, 0, L / 2); scene.add(surfMesh);
    // sončni žarki (god rays)
    var rayGeo = new T.ConeGeometry(12, 48, 12, 1, true);
    var rayMat = new T.MeshBasicMaterial({ color: 0xaee8ff, transparent: true, opacity: 0.055, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false });
    for (var r = 0; r < 14; r++) {
      var rm = new T.Mesh(rayGeo, rayMat.clone());
      rm.position.set(35 + ((r * 73) % 330), -22, 35 + ((r * 119) % 330));
      rm.rotation.z = 0.14; rm.rotation.x = -0.08;
      raysGroup.add(rm);
    }
    scene.add(raysGroup);
  })();

  // ── Statične značilnosti in skrivališča ───────────────────────────────────
  var sway = [];
  (function buildFeatures() {
    var rs = { rs: 1234 }; function R() { return OC.rnd(rs); }
    // kelp gozdovi (stebla + zračni mehurčki + listi + kamnito dno)
    var stalkGeo = new T.CylinderGeometry(0.07, 0.22, 1, 5, 1); stalkGeo.translate(0, 0.5, 0);
    var stalkMat = new T.MeshLambertMaterial({ color: 0x2f7a2a });
    var leafGeo = new T.SphereGeometry(1, 6, 5), leafMat = new T.MeshLambertMaterial({ color: 0x45a33c, transparent: true, opacity: 0.85 });
    var bladderGeo = new T.SphereGeometry(0.28, 6, 5), bladderMat = new T.MeshLambertMaterial({ color: 0x7bc244 });
    OC.KELP.forEach(function (k) {
      var n = 130, im = new T.InstancedMesh(stalkGeo, stalkMat, n), items = [];
      for (var i = 0; i < n; i++) {
        var a = R() * Math.PI * 2, r = Math.sqrt(R()) * k.r;
        var x = k.x + Math.cos(a) * r, z = k.z + Math.sin(a) * r;
        var fl = floorAt(x, z), h = Math.min(fl - 2, 10 + R() * 12);
        items.push({ x: x, z: z, y: -fl, h: h, ph: R() * 6.28 });
      }
      im.userData = items; scene.add(im); sway.push(im);
      var lm = new T.InstancedMesh(leafGeo, leafMat, n), bm = new T.InstancedMesh(bladderGeo, bladderMat, n), M = new T.Matrix4();
      items.forEach(function (it, i) {
        M.makeScale(1.3, 0.75, 1.3); M.setPosition(it.x, it.y + it.h, it.z); lm.setMatrixAt(i, M);
        M.makeScale(1, 1.3, 1); M.setPosition(it.x + 0.25, it.y + it.h * 0.65, it.z); bm.setMatrixAt(i, M);
      });
      scene.add(lm); scene.add(bm);
    });

    // koralni greben + čistilci
    var rf = OC.REEF, geos = [new T.DodecahedronGeometry(1, 0), new T.IcosahedronGeometry(1, 0), new T.ConeGeometry(0.75, 2.2, 6), new T.TorusGeometry(0.8, 0.32, 6, 10), new T.CylinderGeometry(0.2, 0.45, 2.4, 5)];
    var pal = [0xe87a6a, 0xf2a460, 0xd85a9a, 0x70c8b4, 0xf4d468, 0xc86a40, 0x9e6ee6, 0xff7090];
    for (var i = 0; i < 120; i++) {
      var a = R() * Math.PI * 2, r = Math.sqrt(R()) * rf.r;
      var x = rf.x + Math.cos(a) * r, z = rf.z + Math.sin(a) * r;
      var m = new T.Mesh(geos[i % geos.length], new T.MeshLambertMaterial({ color: pal[i % pal.length] }));
      var s = 0.65 + R() * 2.5; m.scale.set(s, s * (0.65 + R()), s);
      m.position.set(x, -floorAt(x, z) + s * 0.3, z); m.rotation.set(R() * 0.5, R() * 6, R() * 0.5);
      scene.add(m);
    }
    var cl = rf.cleaner, cm = new T.Mesh(new T.TorusGeometry(2.1, 0.16, 8, 28), new T.MeshBasicMaterial({ color: 0x7ff8ff }));
    cm.position.set(cl.x, -cl.d, cl.z); cm.rotation.x = Math.PI / 2; scene.add(cm);
    // drobni čistilci (ustnači), ki krožijo okoli postaje
    var wrasseGeo = new T.ConeGeometry(0.14, 0.55, 5); wrasseGeo.rotateX(Math.PI / 2);
    var wrasseMat = new T.MeshBasicMaterial({ color: 0x70f8ff });
    var wrasses = [];
    for (var w = 0; w < 6; w++) { var wm = new T.Mesh(wrasseGeo, wrasseMat); scene.add(wm); wrasses.push({ m: wm, a: w * 1.05, r: 1.1 + (w % 3) * 0.6, dy: ((w % 2) - 0.5) * 0.7 }); }
    sway.push({ ring: cm, wrasses: wrasses, cx: cl.x, cy: -cl.d, cz: cl.z });

    // vrt anemon (162, 110)
    if (OC.ANEMONES) {
      var an = OC.ANEMONES, tentGeo = new T.CylinderGeometry(0.06, 0.14, 1.5, 5); tentGeo.translate(0, 0.75, 0);
      var apal = [0xff6eb4, 0xff9e70, 0xe060ff, 0xffd070], anems = [];
      for (var ai = 0; ai < 65; ai++) {
        var aa = R() * 6.28, ar = Math.sqrt(R()) * an.r;
        var ax = an.x + Math.cos(aa) * ar, az = an.z + Math.sin(aa) * ar, afl = floorAt(ax, az);
        var clus = new T.Group(); clus.position.set(ax, -afl, az);
        var amat = new T.MeshLambertMaterial({ color: apal[ai % apal.length], emissive: 0x301020 });
        for (var t = 0; t < 5; t++) {
          var tm = new T.Mesh(tentGeo, amat);
          var ta = t / 5 * 6.28; tm.position.set(Math.cos(ta) * 0.2, 0, Math.sin(ta) * 0.2);
          tm.rotation.set(Math.sin(ta) * 0.35, 0, -Math.cos(ta) * 0.35);
          clus.add(tm);
        }
        scene.add(clus); anems.push({ g: clus, ph: R() * 6.28 });
      }
      sway.push({ anems: anems });
    }

    // podrobna razbitina ladje (220, 222)
    var wk = OC.WRECK, wfl = floorAt(wk.x, wk.z), wg = new T.Group();
    wg.position.set(wk.x, -wfl, wk.z); wg.rotation.y = -wk.yaw;
    var hullMat = new T.MeshLambertMaterial({ color: 0x4b3826 });
    var darkWood = new T.MeshLambertMaterial({ color: 0x2e2218 });
    var rustMat = new T.MeshLambertMaterial({ color: 0x6b3a24 });
    // dno in boki trupa (votla rebra da se vidi v notranjost)
    var keel = new T.Mesh(new T.BoxGeometry(wk.rx * 2, 1.0, wk.rz * 2), darkWood); keel.position.y = 0.5; wg.add(keel);
    for (var rb = -wk.rx + 2; rb <= wk.rx - 2; rb += 3.2) {
      var ribL = new T.Mesh(new T.BoxGeometry(0.45, wk.h, 0.55), hullMat); ribL.position.set(rb, wk.h / 2, wk.rz - 0.3); ribL.rotation.x = -0.18; wg.add(ribL);
      var ribR = new T.Mesh(new T.BoxGeometry(0.45, wk.h, 0.55), hullMat); ribR.position.set(rb, wk.h / 2, -wk.rz + 0.3); ribR.rotation.x = 0.18; wg.add(ribR);
    }
    var deck = new T.Mesh(new T.BoxGeometry(wk.rx * 1.85, 0.5, wk.rz * 1.9), hullMat); deck.position.set(0, wk.h - 0.8, 0); deck.rotation.z = 0.08; wg.add(deck);
    var prow = new T.Mesh(new T.ConeGeometry(wk.rz, 8, 4), hullMat); prow.rotation.z = -Math.PI / 2; prow.rotation.x = Math.PI / 4; prow.position.set(wk.rx + 3, wk.h / 2, 0); wg.add(prow);
    var cabin = new T.Mesh(new T.BoxGeometry(8, 4.2, 7), darkWood); cabin.position.set(-5, wk.h + 1.2, 0); cabin.rotation.z = 0.12; wg.add(cabin);
    var mast = new T.Mesh(new T.CylinderGeometry(0.28, 0.45, 20, 7), hullMat); mast.position.set(4, wk.h + 7, 0); mast.rotation.z = 0.55; wg.add(mast);
    var yard = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, 10, 6), hullMat); yard.position.set(1, wk.h + 10, 0); yard.rotation.x = Math.PI / 2; yard.rotation.z = 0.25; wg.add(yard);
    for (var b_i = 0; b_i < 4; b_i++) {
      var barrel = new T.Mesh(new T.CylinderGeometry(0.65, 0.65, 1.3, 8), rustMat);
      barrel.position.set(-2 + b_i * 3.5, 1.4, (b_i % 2 ? 2.2 : -2.2)); barrel.rotation.z = 0.8 + b_i; wg.add(barrel);
    }
    var anc = new T.Mesh(new T.TorusGeometry(1.1, 0.22, 6, 12), rustMat); anc.position.set(wk.rx + 2, 1.2, wk.rz + 2); anc.rotation.x = Math.PI / 2; wg.add(anc);
    scene.add(wg);

    // jame (skalni loki + kristali v trench-cave + oči murene v seamount-cave)
    var rockMat = new T.MeshLambertMaterial({ color: 0x3b424d });
    OC.CAVES.forEach(function (c) {
      var g = new T.Group(); g.position.set(c.x, -c.d, c.z);
      for (var k = 0; k < 10; k++) {
        var rk = new T.Mesh(new T.DodecahedronGeometry(c.r * (0.42 + R() * 0.55), 0), rockMat);
        var a = k / 10 * 6.28 + R() * 0.3;
        rk.position.set(Math.cos(a) * c.r * 0.92, (R() - 0.3) * c.r * 0.9, Math.sin(a) * c.r * 0.92);
        rk.rotation.set(R() * 3, R() * 3, R() * 3); g.add(rk);
      }
      var mouth = new T.Mesh(new T.SphereGeometry(c.r * 0.72, 12, 10), new T.MeshBasicMaterial({ color: 0x010306 })); g.add(mouth);
      if (c.crystal) {
        var cryMat = new T.MeshBasicMaterial({ color: 0x55f0ff });
        for (var cr = 0; cr < 5; cr++) {
          var cry = new T.Mesh(new T.ConeGeometry(0.45, 2.2, 5), cryMat);
          cry.position.set((R() - 0.5) * 3, -1.5, (R() - 0.5) * 3); cry.rotation.set((R() - 0.5) * 0.7, R(), (R() - 0.5) * 0.7); g.add(cry);
        }
      }
      if (c.moray) {
        var eyeM = new T.MeshBasicMaterial({ color: 0xffaa20 });
        var e1 = new T.Mesh(new T.SphereGeometry(0.28, 6, 6), eyeM); e1.position.set(-0.5, 0.2, c.r * 0.55);
        var e2 = new T.Mesh(new T.SphereGeometry(0.28, 6, 6), eyeM); e2.position.set(0.5, 0.2, c.r * 0.55);
        g.add(e1); g.add(e2);
      }
      scene.add(g);
    });

    // hidrotermalni vrelci + dim + mehurčki + žareče razpoke
    OC.VENTS.forEach(function (v) {
      var fl = floorAt(v.x, v.z);
      var cone = new T.Mesh(new T.ConeGeometry(3.2, 6.5, 9), new T.MeshLambertMaterial({ color: 0x1a1512 }));
      cone.position.set(v.x, -fl + 2.8, v.z); scene.add(cone);
      var rim = new T.Mesh(new T.TorusGeometry(0.9, 0.28, 6, 12), new T.MeshBasicMaterial({ color: 0xff5a18 }));
      rim.position.set(v.x, -fl + 5.7, v.z); rim.rotation.x = Math.PI / 2; scene.add(rim);
      var n = 80, pos = new Float32Array(n * 3);
      for (var k = 0; k < n; k++) { pos[k * 3] = v.x + (R() - 0.5) * 2; pos[k * 3 + 1] = -fl + 5.8 + R() * 32; pos[k * 3 + 2] = v.z + (R() - 0.5) * 2; }
      var pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(pos, 3));
      var pts = new T.Points(pg, new T.PointsMaterial({ color: 0x62666e, size: 1.5, transparent: true, opacity: 0.52, depthWrite: false }));
      scene.add(pts); sway.push({ smoke: pts, base: -fl + 5.8, x: v.x, z: v.z });
    });

    // kitovo okostje na dnu (whalefall 205, 325)
    if (OC.WHALEFALL) {
      var wf = OC.WHALEFALL, wffl = floorAt(wf.x, wf.z), wfg = new T.Group();
      wfg.position.set(wf.x, -wffl + 0.4, wf.z); wfg.rotation.y = 0.7;
      var boneMat = new T.MeshLambertMaterial({ color: 0xd8d2c2 });
      var spine = new T.Mesh(new T.CylinderGeometry(0.35, 0.55, 16, 8), boneMat); spine.rotation.z = Math.PI / 2; spine.position.y = 0.5; wfg.add(spine);
      var skull = new T.Mesh(new T.ConeGeometry(1.9, 4.8, 7), boneMat); skull.rotation.z = -Math.PI / 2; skull.scale.set(0.6, 1, 1.1); skull.position.set(9.5, 1.0, 0); wfg.add(skull);
      for (var ri = -5; ri <= 6; ri += 1.6) {
        var rib = new T.Mesh(new T.TorusGeometry(2.4 - Math.abs(ri) * 0.14, 0.22, 6, 12, Math.PI * 1.15), boneMat);
        rib.rotation.y = Math.PI / 2; rib.rotation.z = -0.1; rib.position.set(ri, 0.3, 0); wfg.add(rib);
      }
      scene.add(wfg);
    }

    // bioluminiscenčni jarek
    (function () {
      var b = OC.BIOLUM, n = 850, pos = new Float32Array(n * 3);
      for (var k = 0; k < n; k++) { var a = R() * 6.28, r = Math.sqrt(R()) * b.r; var x = b.x + Math.cos(a) * r, z = b.z + Math.sin(a) * r; var fl = floorAt(x, z); pos[k * 3] = x; pos[k * 3 + 1] = -(b.minD + R() * Math.max(2, fl - b.minD - 1)); pos[k * 3 + 2] = z; }
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
      var p = new T.Points(g, new T.PointsMaterial({ color: 0x9a84ff, size: 0.95, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false }));
      scene.add(p); sway.push({ glow: p });
    })();

    // mrtva cona
    (function () {
      var dz = OC.DEADZONE, m = new T.Mesh(new T.SphereGeometry(dz.r, 16, 12), new T.MeshBasicMaterial({ color: 0x5a3a10, transparent: true, opacity: 0.16, depthWrite: false }));
      m.position.set(dz.x, -(dz.minD + 12), dz.z); m.scale.y = 0.5; scene.add(m);
    })();

    // morski tokovi
    OC.CURRENTS.forEach(function (c) {
      var n = 180, pos = new Float32Array(n * 3), items = [];
      for (var k = 0; k < n; k++) { items.push({ t: R(), off: (R() - 0.5) * 2, d: R() }); }
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
      var p = new T.Points(g, new T.PointsMaterial({ color: 0x9fe8ff, size: 0.72, transparent: true, opacity: 0.52, blending: T.AdditiveBlending, depthWrite: false }));
      scene.add(p); sway.push({ cur: p, c: c, items: items });
    });

    // termoklina
    var th = new T.Mesh(new T.PlaneGeometry(W, L), new T.MeshBasicMaterial({ color: 0x1a4a7a, transparent: true, opacity: 0.08, side: T.DoubleSide, depthWrite: false }));
    th.rotation.x = -Math.PI / 2; th.position.set(W / 2, -OC.THERMO, L / 2); scene.add(th);
  })();

  // morski sneg okoli kamere
  var snow = (function () {
    var n = 1600, pos = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 120; pos[i * 3 + 1] = (Math.random() - 0.5) * 120; pos[i * 3 + 2] = (Math.random() - 0.5) * 120; }
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
    var p = new T.Points(g, new T.PointsMaterial({ color: 0xbfe8ff, size: 0.12, transparent: true, opacity: 0.35, depthWrite: false }));
    scene.add(p); return p;
  })();

  // ── Izboljšani 3D modeli rib in morskega psa ─────────────────────────────
  var fishBodyGeo = (function () {
    var pts = [];
    for (var i = 0; i <= 14; i++) {
      var t = i / 14; // 0 = repni koren (-y), 1 = gobec (+y)
      var r;
      if (t < 0.12) r = 0.04 + 0.09 * (t / 0.12);
      else if (t < 0.68) r = 0.13 + 0.15 * Math.sin(((t - 0.12) / 0.56) * Math.PI * 0.78);
      else r = 0.28 * Math.cos(((t - 0.68) / 0.32) * Math.PI * 0.48);
      pts.push(new T.Vector2(Math.max(0.01, r), (t - 0.5) * 1.15));
    }
    var g = new T.LatheGeometry(pts, 14);
    g.rotateX(Math.PI / 2); // +Y -> +Z (nos naprej)
    return g;
  })();

  function fishModel(colorHex, len, opts) {
    opts = opts || {};
    var g = new T.Group();
    var mat = new T.MeshLambertMaterial({ color: colorHex });
    var finColor = new T.Color(colorHex).multiplyScalar(0.78);
    var finMat = new T.MeshLambertMaterial({ color: finColor, side: T.DoubleSide });
    var bellyMat = new T.MeshLambertMaterial({ color: opts.shark ? 0xdde6ee : new T.Color(colorHex).lerp(new T.Color(0xf4f8fc), 0.55) });

    var body = new T.Mesh(fishBodyGeo, mat);
    body.scale.set(opts.shark ? 0.72 : 0.68, opts.shark ? 0.85 : 0.95, 1.0);
    g.add(body);

    // trebuh (protisenčenje)
    var belly = new T.Mesh(new T.SphereGeometry(0.18, 10, 8), bellyMat);
    belly.scale.set(0.68, 0.55, 2.1); belly.position.set(0, -0.09, 0.06); g.add(belly);

    // zgibni rep (pivot na repnem korenu)
    var tailPivot = new T.Group(); tailPivot.position.set(0, 0, -0.52);
    var tUp = new T.Mesh(new T.ConeGeometry(0.12, opts.shark ? 0.55 : 0.38, 4), finMat);
    tUp.scale.set(0.2, 1, 0.9); tUp.rotation.x = -0.6; tUp.position.set(0, 0.12, -0.18); tailPivot.add(tUp);
    var tLo = new T.Mesh(new T.ConeGeometry(0.10, opts.shark ? 0.38 : 0.32, 4), finMat);
    tLo.scale.set(0.2, 1, 0.9); tLo.rotation.x = -Math.PI + 0.6; tLo.position.set(0, -0.10, -0.16); tailPivot.add(tLo);
    g.add(tailPivot);

    // hrbtna plavut
    var dorsal = new T.Mesh(new T.ConeGeometry(0.13, opts.shark ? 0.52 : 0.28, 4), finMat);
    dorsal.scale.set(0.18, 1, 1.25); dorsal.rotation.x = -0.35; dorsal.position.set(0, 0.25, -0.04); g.add(dorsal);

    // prsne plavuti
    var finGeo = new T.ConeGeometry(0.10, opts.shark ? 0.52 : 0.30, 4); finGeo.translate(0, 0.14, 0);
    var finL = new T.Mesh(finGeo, finMat); finL.scale.set(0.22, 1, 0.9); finL.position.set(0.15, -0.07, 0.14); finL.rotation.z = -1.2; finL.rotation.y = -0.35; g.add(finL);
    var finR = new T.Mesh(finGeo, finMat); finR.scale.set(0.22, 1, 0.9); finR.position.set(-0.15, -0.07, 0.14); finR.rotation.z = 1.2; finR.rotation.y = 0.35; g.add(finR);

    // oči
    var sclMat = new T.MeshBasicMaterial({ color: opts.shark ? 0x1a1e24 : 0xeef6ff });
    var pupMat = new T.MeshBasicMaterial({ color: 0x05080c });
    [-1, 1].forEach(function (s) {
      var ey = new T.Mesh(new T.SphereGeometry(0.045, 8, 6), sclMat); ey.position.set(s * 0.115, 0.06, 0.34); g.add(ey);
      var pu = new T.Mesh(new T.SphereGeometry(0.028, 6, 6), pupMat); pu.position.set(s * 0.132, 0.06, 0.355); g.add(pu);
    });

    // nevidna krogla za klik (raycast)
    var hit = new T.Mesh(new T.SphereGeometry(1.1, 8, 6), new T.MeshBasicMaterial({ visible: false })); g.add(hit);

    // oblak mulja okoli ribe (viden le ko mud)
    var mudCloud = new T.Mesh(new T.SphereGeometry(0.95, 10, 8), new T.MeshBasicMaterial({ color: 0xb59c6a, transparent: true, opacity: 0.35, depthWrite: false }));
    mudCloud.visible = false; g.add(mudCloud);

    g.userData = { tail: tailPivot, finL: finL, finR: finR, hit: hit, mat: mat, finMat: finMat, bellyMat: bellyMat, mudCloud: mudCloud };
    return g;
  }

  function makeLabel() { var cv = document.createElement('canvas'); cv.width = 384; cv.height = 128; var tx = new T.CanvasTexture(cv); var sp = new T.Sprite(new T.SpriteMaterial({ map: tx, transparent: true, depthTest: false })); sp.userData = { cv: cv, tx: tx, key: '' }; sp.center.set(0.5, 0); return sp; }
  function drawLabel(sp, f) {
    var key = [f.n, f.model, Math.round(f.hp), Math.round(f.en), f.sz, f.hid, f.bleed, f.poison, f.suspect, f.cheat, f.alive].join('|'); if (sp.userData.key === key) return; sp.userData.key = key;
    var cv = sp.userData.cv, x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height);
    x.fillStyle = 'rgba(3,17,30,0.75)'; roundRect(x, 4, 24, cv.width - 8, 96, 12); x.fill();
    x.font = 'bold 30px sans-serif'; x.fillStyle = f.alive ? '#ffffff' : '#889'; x.textAlign = 'left'; x.fillText(f.n, 18, 60);
    x.font = '20px sans-serif'; x.fillStyle = '#9fd3ff'; x.fillText((f.model || '').slice(0, 22) + '  ·  ' + f.sz.toFixed(1), 18, 86);
    var pct = f.hp / Math.max(1, f.hpMax); x.fillStyle = 'rgba(255,255,255,0.15)'; x.fillRect(18, 98, 340, 8); x.fillStyle = pct > 0.5 ? '#6fe08a' : pct > 0.25 ? '#ffb04a' : '#ff5a4a'; x.fillRect(18, 98, 340 * pct, 8);
    var ep = f.en / Math.max(1, f.enMax); x.fillStyle = 'rgba(255,255,255,0.15)'; x.fillRect(18, 108, 340, 6); x.fillStyle = '#4ad0ff'; x.fillRect(18, 108, 340 * ep, 6);
    var badges = []; if (f.hid) badges.push(['SKRIT', '#0a3a4a']); if (f.bleed) badges.push(['KRVAVI', '#5a0a2a']); if (f.poison) badges.push(['STRUP', '#2d4a10']); if (f.suspect) badges.push(['BOT?', '#5a3a0a']); if (f.cheat) badges.push(['GOLJUF', '#6a0a0a']); if (!f.alive) badges.push(['MRTEV', '#333']);
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
  var fishObjs = {}, shark = null, schoolObjs = {}, lanternObjs = {}, plankObjs = {}, crabMesh = null, pufferObjs = {}, carrionObjs = {}, jellyGroup = null, jellyItems = [];
  var tinyGeo = new T.ConeGeometry(0.12, 0.6, 4); tinyGeo.rotateX(Math.PI / 2);
  var sardMat = new T.MeshLambertMaterial({ color: 0xc8d8e8 });
  var lantMat = new T.MeshBasicMaterial({ color: 0x62ecff });
  function ensureFish(f) {
    var o = fishObjs[f.id]; if (o) return o;
    var len = 1.6 + 1.0 * f.sz, g = fishModel(COL[f.color] || 0x888888, 1); g.scale.setScalar(len);
    var label = makeLabel(), bubble = makeBubble(); scene.add(g); scene.add(label); scene.add(bubble);
    o = fishObjs[f.id] = { g: g, label: label, bubble: bubble, len: len, id: f.id }; g.userData.hit.userData.fishId = f.id; return o;
  }
  function removeFishObj(id) {
    var o = fishObjs[id]; if (!o) return;
    scene.remove(o.g); scene.remove(o.label); scene.remove(o.bubble); delete fishObjs[id];
  }
  function ensureShark() { if (shark) return shark; var g = fishModel(0x52606c, 1, { shark: true }); g.scale.setScalar(9.5); scene.add(g); var lb = makeLabel(); scene.add(lb); shark = { g: g, label: lb }; return shark; }
  function ensureSchool(s, map, mat) { var o = map[s.id]; if (o) return o; var n = 90, im = new T.InstancedMesh(tinyGeo, mat, n), ph = []; for (var i = 0; i < n; i++) ph.push({ a: Math.random() * 6.28, r: 1 + Math.random() * 5, y: (Math.random() - 0.5) * 3, w: 0.6 + Math.random() * 0.5 }); scene.add(im); o = map[s.id] = { im: im, ph: ph }; return o; }
  function ensurePlank(p) { var o = plankObjs[p.id]; if (o) return o; var n = 160, pos = new Float32Array(n * 3); for (var i = 0; i < n; i++) { var a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * p.r; pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = (Math.random() - 0.5) * p.r * 0.7; pos[i * 3 + 2] = Math.sin(a) * r; } var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); var pt = new T.Points(g, new T.PointsMaterial({ color: 0x9fe87a, size: 0.22, transparent: true, opacity: 0.7, depthWrite: false })); scene.add(pt); o = plankObjs[p.id] = { pt: pt }; return o; }
  function ensureJellies() { if (jellyGroup) return; jellyGroup = new T.Group(); var bell = new T.SphereGeometry(0.7, 10, 8, 0, 6.283, 0, 1.6), bm = new T.MeshLambertMaterial({ color: 0xffa0d0, transparent: true, opacity: 0.45, side: T.DoubleSide }); for (var i = 0; i < 40; i++) { var g = new T.Group(); var b = new T.Mesh(bell, bm); g.add(b); var lp = []; for (var k = 0; k < 5; k++) { var a = k / 5 * 6.28; lp.push(Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4, Math.cos(a) * 0.6, -3 - Math.random() * 2, Math.sin(a) * 0.6); } var lg = new T.BufferGeometry(); lg.setAttribute('position', new T.BufferAttribute(new Float32Array(lp), 3)); g.add(new T.LineSegments(lg, new T.LineBasicMaterial({ color: 0xffc0e0, transparent: true, opacity: 0.5 }))); var a2 = Math.random() * 6.28, r2 = Math.sqrt(Math.random()); jellyItems.push({ g: g, ox: Math.cos(a2) * r2, oz: Math.sin(a2) * r2, oy: (Math.random() - 0.5), ph: Math.random() * 6.28 }); jellyGroup.add(g); } scene.add(jellyGroup); }
  var crabGeo = new T.BoxGeometry(0.75, 0.26, 0.55), crabMat = new T.MeshLambertMaterial({ color: 0xc84a2a });
  function ensurePuffer(u) { var o = pufferObjs[u.id]; if (o) return o; var m = new T.Mesh(new T.IcosahedronGeometry(0.58, 0), new T.MeshLambertMaterial({ color: 0xe8d060 })); scene.add(m); return pufferObjs[u.id] = { m: m }; }
  function ensureCarrion(k) { var o = carrionObjs[k.id]; if (o) return o; var g = fishModel(0x8a8a80, 1); g.scale.setScalar(1.6 + k.sz); g.rotation.z = Math.PI / 2; scene.add(g); return carrionObjs[k.id] = { g: g }; }

  // ── Zaznava izbrane ribe (3D vidni krog + linije) ─────────────────────────
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
    if (pendingFollow && s.fish && s.fish.length) {
      var pf = s.fish[pendingFollow - 1];
      if (pf) { pendingFollow = null; selectFish(pf.id, true); }
    }
    updateUI(s);
  }
  function lerpA(a, b, t) { var d = ((b - a) % 360 + 540) % 360 - 180; return a + d * t; }
  function interp(id, listKey) { var a = (A[listKey] || []).find(function (e) { return e.id === id; }), b = (B[listKey] || []).find(function (e) { return e.id === id; }); if (!a) a = b; return { a: a, b: b }; }

  // ── Kamera ───────────────────────────────────────────────────────────────
  var cam = { mode: 'free', yaw: 2.4, pitch: -0.25, pos: new T.Vector3(330, -20, 330), follow: null, dist: 14, oyaw: 0.6, opitch: 0.3 };
  var keys = {}, drag = null;
  window.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT') return;
    keys[e.code] = true; var k = e.key;
    if (k >= '0' && k <= '9') { var idx = k === '0' ? 9 : (+k - 1); var f = (B && B.fish[idx]); if (f) selectFish(f.id, true); }
    if (k === 'f' || k === 'F') { if (cam.follow) setMode(cam.mode === 'follow' ? 'free' : 'follow'); }
    if (k === 'p' || k === 'P') { if (cam.follow) setMode(cam.mode === 'pov' ? 'follow' : 'pov'); }
    if (k === 'h' || k === 'H') { document.querySelectorAll('.panel,#mini').forEach(function (p) { p.style.visibility = p.style.visibility === 'hidden' ? '' : 'hidden'; }); }
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; });
  canvas.addEventListener('mousedown', function (e) { drag = { x: e.clientX, y: e.clientY, moved: 0 }; });
  window.addEventListener('mousemove', function (e) {
    if (!drag) return; var dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
    if (cam.mode === 'follow' || cam.mode === 'shark') { cam.oyaw -= dx * 0.005; cam.opitch = OC.clamp(cam.opitch + dy * 0.005, -1.2, 1.4); }
    else { cam.yaw -= dx * 0.0035; cam.pitch = OC.clamp(cam.pitch - dy * 0.0035, -1.5, 1.5); }
  });
  window.addEventListener('mouseup', function (e) { if (drag && drag.moved < 4) pick(e); drag = null; });
  canvas.addEventListener('wheel', function (e) {
    if (cam.mode === 'follow' || cam.mode === 'shark') cam.dist = OC.clamp(cam.dist * (e.deltaY > 0 ? 1.12 : 0.9), 4, 120);
    else { var dir = camDir(); cam.pos.addScaledVector(dir, e.deltaY > 0 ? -7 : 7); }
    e.preventDefault();
  }, { passive: false });
  function camDir() { return new T.Vector3(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), Math.cos(cam.yaw) * Math.cos(cam.pitch)); }
  var ray = new T.Raycaster(), mouse = new T.Vector2();
  function pick(e) { mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1); ray.setFromCamera(mouse, camera); var hits = []; for (var id in fishObjs) hits.push(fishObjs[id].g.userData.hit); var r = ray.intersectObjects(hits, false); if (r.length) selectFish(r[0].object.userData.fishId, true); }
  function selectFish(id, follow) { cam.follow = id; if (follow && cam.mode !== 'pov') setMode('follow'); updateUI(B); }
  function setMode(m) {
    cam.mode = m;
    ['free', 'follow', 'pov', 'over', 'shark'].forEach(function (k) { var el = $('b-' + k); if (el) el.classList.toggle('on', k === m); });
    if (m === 'over') { cam.pos.set(W / 2, 170, L + 240); cam.yaw = Math.PI; cam.pitch = -0.62; cam.mode = 'free'; $('b-over').classList.add('on'); }
  }
  function jumpTo(x, z, d) {
    setMode('free');
    cam.pos.set(x, -d + 6, z + 26); cam.yaw = Math.PI; cam.pitch = -0.22;
  }
  var JUMPS = {
    reef: [115, 135, 16], anemones: [162, 110, 18], kelp: [85, 200, 18],
    wreck: [220, 222, 62], vents: [300, 152, 42], whale: [205, 325, 96],
    trench: [245, 350, 108], dead: [350, 300, 82]
  };
  document.querySelectorAll('#jumps button').forEach(function (b) {
    b.onclick = function () { var j = JUMPS[b.getAttribute('data-jump')]; if (j) jumpTo(j[0], j[1], j[2]); };
  });

  function updateCamera(dt) {
    if (cam.mode === 'pov' && cam.follow && fishObjs[cam.follow] && B) {
      var f = B.fish.find(function (x) { return x.id === cam.follow; });
      var o = fishObjs[cam.follow];
      if (f && o) {
        var fwd = new T.Vector3(0, 0, 1).applyEuler(o.g.rotation).normalize();
        var eye = o.g.position.clone().addScaledVector(fwd, o.g.scale.z * 0.55 + 0.3).add(new T.Vector3(0, o.g.scale.y * 0.2, 0));
        camera.position.copy(eye);
        camera.lookAt(eye.clone().addScaledVector(fwd, 15));
        return;
      }
    }
    if (cam.mode === 'follow' || cam.mode === 'shark') {
      var tgt = cam.mode === 'shark' ? (shark && shark.g) : (cam.follow && fishObjs[cam.follow] && fishObjs[cam.follow].g);
      if (tgt) {
        var off = new T.Vector3(Math.sin(cam.oyaw) * Math.cos(cam.opitch), Math.sin(cam.opitch), Math.cos(cam.oyaw) * Math.cos(cam.opitch)).multiplyScalar(cam.dist);
        var want = tgt.position.clone().add(off);
        want.y = Math.min(want.y, 2);
        want.y = Math.max(want.y, -floorAt(OC.clamp(want.x, 0, W), OC.clamp(want.z, 0, L)) + 1);
        cam.pos.lerp(want, 1 - Math.pow(0.001, dt));
        camera.position.copy(cam.pos); camera.lookAt(tgt.position); return;
      }
    }
    var sp = (keys.ShiftLeft || keys.ShiftRight ? 65 : 20) * dt, dir = camDir(), right = new T.Vector3(dir.z, 0, -dir.x).normalize();
    if (keys.KeyW || keys.ArrowUp) cam.pos.addScaledVector(dir, sp); if (keys.KeyS || keys.ArrowDown) cam.pos.addScaledVector(dir, -sp);
    if (keys.KeyA || keys.ArrowLeft) cam.pos.addScaledVector(right, sp); if (keys.KeyD || keys.ArrowRight) cam.pos.addScaledVector(right, -sp);
    if (keys.KeyQ) cam.pos.y -= sp; if (keys.KeyE || keys.Space) cam.pos.y += sp;
    cam.pos.x = OC.clamp(cam.pos.x, -60, W + 60); cam.pos.z = OC.clamp(cam.pos.z, -60, L + 300); cam.pos.y = OC.clamp(cam.pos.y, -OC.DMAX + 0.5, 320);
    if (cam.pos.x >= 0 && cam.pos.x <= W && cam.pos.z >= 0 && cam.pos.z <= L) cam.pos.y = Math.max(cam.pos.y, -floorAt(cam.pos.x, cam.pos.z) + 0.8);
    camera.position.copy(cam.pos); camera.lookAt(cam.pos.clone().add(dir));
  }

  // ── UI ───────────────────────────────────────────────────────────────────
  function fmt(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  function updateUI(s) {
    if (!s) return;
    var st = $('t-status'); st.textContent = (live.demo ? 'DEMO · ' : 'V ŽIVO · ') + (s.status === 'running' ? 'IGRA TEČE' : s.status === 'lobby' ? 'ČAKALNICA' + (s.lobbyIn !== null ? ' · štart čez ' + fmt(s.lobbyIn) : '') : 'KONEC');
    st.className = 'st ' + (live.demo ? 'demo' : s.status === 'running' ? 'run' : s.status === 'finished' ? 'fin' : '');
    $('t-time').textContent = '⏱ ' + fmt(s.timeLeft) + (s.famine ? ' · lakota' : '');
    $('t-phase').textContent = (s.phase === 'day' ? '☀ dan' : s.phase === 'night' ? '☾ noč' : s.phase === 'dusk' ? '🌆 mrak' : '🌅 zora') + ' ' + Math.round(s.light * 100) + '%';
    var alive = s.fish.filter(function (f) { return f.alive; }).length;
    $('t-alive').textContent = '🐟 ' + alive + '/' + s.fish.length + ' živih';
    $('t-gen').textContent = 'igra #' + s.gen;
    $('l-count').textContent = s.fish.length + '/10';
    var html = '';
    s.fish.slice().sort(function (a, b) { return (!!a.cheat - !!b.cheat) || (b.alive - a.alive) || (b.score - a.score); }).forEach(function (f) {
      html += '<div class="f' + (f.id === cam.follow ? ' sel' : '') + (f.alive ? '' : ' dead') + '" data-id="' + f.id + '"><div class="n"><span><span class="sw" style="background:' + (COLHEX[f.color] || '#888') + '"></span>' + esc(f.n) + '</span><span style="font-weight:400;color:#9bb8cc">' + f.sz.toFixed(2) + ' · ' + f.score + '</span></div>' +
        '<div class="m">' + esc(f.model) + (f.hid ? '<span class="badge hid">SKRIT</span>' : '') + (f.bleed ? '<span class="badge bl">KRVAVI</span>' : '') + (f.poison ? '<span class="badge poi">STRUP</span>' : '') + (f.suspect ? '<span class="badge sus">BOT?</span>' : '') + (f.cheat ? '<span class="badge cheat">GOLJUF</span>' : '') + (!f.alive ? ' · ' + esc(f.cause || 'mrtev') : '') + '</div>' +
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
    if (OC.reefAt(f.x, f.z, f.d)) z.push('greben');
    if (OC.anemoneAt && OC.anemoneAt(f.x, f.z, f.d)) z.push('anemone');
    if (OC.wreckAt(f.x, f.z, f.d)) z.push('razbitina');
    var c = OC.caveAt(f.x, f.z, f.d); if (c) z.push(c.id);
    if (OC.whalefallAt && OC.whalefallAt(f.x, f.z, f.d)) z.push('kitovo okostje');
    var v = OC.ventAt(f.x, f.z, f.d); if (v.dist < 14) z.push('vrelec');
    if (OC.inBiolum(f.x, f.z, f.d)) z.push('svetleča voda');
    if (OC.inDeadzone(f.x, f.z, f.d)) z.push('mrtva cona');
    if (f.d < 4) z.push('gladina'); if (f.d > floorAt(f.x, f.z) - 1.6) z.push('na dnu');
    var cu = OC.currentAt(f.x, f.z, f.d); if (cu.id) z.push('tok ' + cu.id);
    return z.length ? z.join(', ') : 'odprto morje';
  }
  function esc(s) { return (s === undefined || s === null ? '' : String(s)).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(m) { var t = $('toast'); t.textContent = m; t.style.opacity = 1; clearTimeout(t._h); t._h = setTimeout(function () { t.style.opacity = 0; }, 2600); }

  $('b-free').onclick = function () { setMode('free'); };
  $('b-follow').onclick = function () { if (!cam.follow && B && B.fish[0]) cam.follow = B.fish[0].id; if (cam.follow) setMode('follow'); else toast('Ni ribe za sledenje'); };
  $('b-pov').onclick = function () { if (!cam.follow && B && B.fish[0]) cam.follow = B.fish[0].id; if (cam.follow) setMode('pov'); else toast('Izberi ribo za pogled iz oči'); };
  $('b-over').onclick = function () { setMode('over'); };
  $('b-shark').onclick = function () { setMode('shark'); };
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

  // Gostitelj / Admin modal
  $('adm-key').value = ADM;
  $('b-host').onclick = function () { $('m-host').style.display = 'flex'; if (B) renderAdminFish(B); };
  $('b-adm-save').onclick = function () { ADM = $('adm-key').value.trim(); try { localStorage.setItem('ocean.admin', ADM); } catch (e) { } toast('Admin ključ shranjen'); fails = 0; };
  function admCall(path) {
    if (!ADM) { toast('Najprej vnesi admin ključ'); return Promise.resolve(); }
    return fetch(API + path + (path.indexOf('?') >= 0 ? '&' : '?') + 'admin=' + encodeURIComponent(ADM), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) { toast(d.error ? 'Napaka: ' + d.error : 'OK: ' + JSON.stringify(d)); if (live.demo) setDemo(false); else poll(); })
      .catch(function (e) { toast('Napaka: ' + e.message); });
  }
  $('b-adm-reset').onclick = function () { admCall('/reset'); };
  $('b-adm-start').onclick = function () { admCall('/start?in=0'); };
  $('b-adm-wait').onclick = function () { admCall('/start?in=300'); };
  function renderAdminFish(s) {
    var box = $('adm-fish'); if (!box || !s) return;
    box.innerHTML = '<table><tr><th>ID</th><th>Ime</th><th>Model</th><th>Stanje</th><th>Akcija</th></tr>' + s.fish.map(function (f) {
      return '<tr><td>' + esc(f.id) + '</td><td>' + esc(f.n) + '</td><td>' + esc(f.model) + '</td><td>' + (f.alive ? 'živ (' + f.sz + ')' : 'mrtev') + '</td><td><button data-kick="' + esc(f.id) + '" class="warn">Vrzi ven</button></td></tr>';
    }).join('') + '</table>';
    box.querySelectorAll('button[data-kick]').forEach(function (btn) { btn.onclick = function () { admCall('/kick?id=' + encodeURIComponent(btn.getAttribute('data-kick'))); }; });
  }

  // minimapa
  var mini = $('mini'), mctx = mini.getContext('2d'), miniBg = (function () { var c = document.createElement('canvas'); c.width = 100; c.height = 100; var x = c.getContext('2d'), im = x.createImageData(100, 100); for (var j = 0; j < 100; j++) for (var i = 0; i < 100; i++) { var d = floorAt(i * 4 + 2, j * 4 + 2), t = OC.clamp((d - 8) / 122, 0, 1), o = (j * 100 + i) * 4; im.data[o] = 60 + 130 * (1 - t); im.data[o + 1] = 110 + 90 * (1 - t); im.data[o + 2] = 150 + 60 * (1 - t); im.data[o + 3] = 255; } x.putImageData(im, 0, 0); return c; })();
  mini.addEventListener('click', function (e) { var r = mini.getBoundingClientRect(); var x = (e.clientX - r.left) / r.width * W, z = (e.clientY - r.top) / r.height * L; cam.pos.set(x, -Math.min(25, floorAt(x, z) - 5), z + 40); cam.yaw = Math.PI; cam.pitch = -0.3; setMode('free'); });
  function drawMini(s) {
    var k = 220 / W; mctx.clearRect(0, 0, 220, 220); mctx.drawImage(miniBg, 0, 0, 220, 220);
    OC.KELP.forEach(function (q) { mctx.fillStyle = 'rgba(60,160,60,.45)'; mctx.beginPath(); mctx.arc(q.x * k, q.z * k, q.r * k, 0, 6.28); mctx.fill(); });
    mctx.fillStyle = 'rgba(240,120,110,.5)'; mctx.beginPath(); mctx.arc(OC.REEF.x * k, OC.REEF.z * k, OC.REEF.r * k, 0, 6.28); mctx.fill();
    if (OC.ANEMONES) { mctx.fillStyle = 'rgba(255,110,200,.55)'; mctx.beginPath(); mctx.arc(OC.ANEMONES.x * k, OC.ANEMONES.z * k, OC.ANEMONES.r * k, 0, 6.28); mctx.fill(); }
    mctx.fillStyle = 'rgba(120,80,40,.8)'; mctx.fillRect(OC.WRECK.x * k - 4, OC.WRECK.z * k - 2, 8, 4);
    if (OC.WHALEFALL) { mctx.fillStyle = 'rgba(220,215,195,.8)'; mctx.fillRect(OC.WHALEFALL.x * k - 3, OC.WHALEFALL.z * k - 1.5, 6, 3); }
    OC.CAVES.forEach(function (c) { mctx.fillStyle = '#000'; mctx.beginPath(); mctx.arc(c.x * k, c.z * k, 2.2, 0, 6.28); mctx.fill(); });
    OC.VENTS.forEach(function (v) { mctx.fillStyle = '#ff8040'; mctx.beginPath(); mctx.arc(v.x * k, v.z * k, 1.6, 0, 6.28); mctx.fill(); });
    mctx.fillStyle = 'rgba(160,120,255,.35)'; mctx.beginPath(); mctx.arc(OC.BIOLUM.x * k, OC.BIOLUM.z * k, OC.BIOLUM.r * k, 0, 6.28); mctx.fill();
    mctx.fillStyle = 'rgba(120,80,20,.4)'; mctx.beginPath(); mctx.arc(OC.DEADZONE.x * k, OC.DEADZONE.z * k, OC.DEADZONE.r * k, 0, 6.28); mctx.fill();
    if (!s) return;
    mctx.fillStyle = 'rgba(255,160,220,.5)'; mctx.beginPath(); mctx.arc(s.jellies.x * k, s.jellies.z * k, s.jellies.r * k, 0, 6.28); mctx.fill();
    s.schools.forEach(function (q) { if (q.n > 0) { mctx.fillStyle = 'rgba(220,230,240,.8)'; mctx.beginPath(); mctx.arc(q.x * k, q.z * k, 1.5 + q.n / 80, 0, 6.28); mctx.fill(); } });
    (s.lanterns || []).forEach(function (q) { if (q.n > 0) { mctx.fillStyle = 'rgba(100,240,255,.85)'; mctx.beginPath(); mctx.arc(q.x * k, q.z * k, 1.5 + q.n / 60, 0, 6.28); mctx.fill(); } });
    s.plankton.forEach(function (q) { if (q.amt > 2) { mctx.fillStyle = 'rgba(160,230,120,.5)'; mctx.beginPath(); mctx.arc(q.x * k, q.z * k, q.r * k * 0.6, 0, 6.28); mctx.fill(); } });
    var sh = s.shark; mctx.save(); mctx.translate(sh.x * k, sh.z * k); mctx.rotate(sh.h * Math.PI / 180); mctx.fillStyle = '#e8eef4'; mctx.beginPath(); mctx.moveTo(0, -6); mctx.lineTo(4, 5); mctx.lineTo(-4, 5); mctx.closePath(); mctx.fill(); mctx.restore();
    s.fish.forEach(function (f) { if (!f.alive) return; mctx.fillStyle = COLHEX[f.color] || '#fff'; mctx.beginPath(); mctx.arc(f.x * k, f.z * k, f.id === cam.follow ? 4.5 : 3, 0, 6.28); mctx.fill(); if (f.id === cam.follow) { mctx.strokeStyle = '#fff'; mctx.stroke(); } });
    mctx.strokeStyle = '#8fd3ff'; mctx.beginPath(); mctx.moveTo(cam.pos.x * k, cam.pos.z * k); mctx.lineTo((cam.pos.x + Math.sin(cam.yaw) * 30) * k, (cam.pos.z + Math.cos(cam.yaw) * 30) * k); mctx.stroke(); mctx.fillStyle = '#8fd3ff'; mctx.fillRect(cam.pos.x * k - 2, cam.pos.z * k - 2, 4, 4);
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
    var food = see.filter(function (s) { return ['sardine school', 'lanternfish school', 'plankton cloud', 'crab', 'carcass'].indexOf(s.kind) >= 0 && !(s.kind === 'plankton cloud' && you.size > 2.6) && !(s.kind === 'crab' && you.size < 1.3); })[0];
    if (shk && shk.dist < 45) { b.act = 'flee'; b.target = 'shark'; b.speed = 'sprint'; b.dur = 15; b.why = 'Morski pes na ' + Math.round(shk.dist) + ' m — bežim s sprintom.'; return b; }
    if (pol === 'random') { b.act = 'swim'; b.heading = R() * 360; b.pitch = (R() - 0.5) * 40; b.speed = 'cruise'; b.dur = 20; b.why = 'Plavam naključno in gledam, kaj se zgodi.'; return b; }
    if (pol === 'camper') { if (you.zone.indexOf('reef') < 0) { b.act = 'swim'; b.goto = [118, 140, 16]; b.speed = 'cruise'; b.dur = 60; b.why = 'Grem na greben, tam se bom skril.'; } else { b.act = you.energy < you.energyMax * 0.5 ? 'feed' : 'hide'; b.dur = 60; b.why = b.act === 'feed' ? 'Lačen sem, pobiram polže na grebenu.' : 'Skrit v grebenu čakam.'; } return b; }
    if (bigger.length && bigger[0].dist < 25) { if (pol === 'smart') { var k = OC.KELP[1]; b.act = 'swim'; b.goto = [k.x, k.z, 18]; b.speed = 'sprint'; b.why = 'Večja riba ' + bigger[0].name + ' blizu — v kelp, kjer me ne vidi.'; } else { b.act = 'flee'; b.target = bigger[0].id; b.speed = 'sprint'; b.dur = 12; b.why = 'Bežim pred ' + bigger[0].name + ' (velikost ' + bigger[0].size + ').'; } return b; }
    if ((pol === 'hunter' || pol === 'smart') && smaller.length) { b.act = (pol === 'smart' && smaller[0].dist < 10 && you.stamina >= 40) ? 'lunge' : 'hunt'; b.target = smaller[0].id; b.speed = smaller[0].dist < 8 ? 'sprint' : 'fast'; b.dur = 25; b.why = 'Lovim ' + smaller[0].name + ' — je dovolj majhna za napad.'; return b; }
    if (pol === 'smart' && me.smell.length && you.energy < you.energyMax * 0.6) { b.act = 'feed'; b.heading = me.smell[0].bearing; b.speed = 'cruise'; b.dur = 20; b.why = 'Vonj po ' + me.smell[0].kind + ' v smeri ' + me.smell[0].bearing + '° — grem tja.'; return b; }
    if (food && you.energy < you.energyMax * 0.85) { b.act = 'feed'; b.target = food.id; b.speed = 'cruise'; b.dur = 25; b.why = 'Hranim se: ' + food.kind + ' na ' + Math.round(food.dist) + ' m.'; return b; }
    b.act = 'feed'; b.heading = R() * 360; b.pitch = (R() - 0.5) * 30; b.speed = 'cruise'; b.dur = 20; b.why = 'Iščem hrano v novi smeri.'; return b;
  }
  function demoTick() {
    if (!demo) return; var g = demo.g, now = Date.now(); OC.advance(g, now);
    g.fish.forEach(function (f) { if (!f.alive) return; if (g.tick >= demo.next[f.id]) { var me = OC.perceive(g, f, now); var v = OC.validateCmd(demoDecide(g, f, me)); if (v.ok) OC.applyCmd(g, f, v.cmd, now + 2000 + Math.random() * 3000); demo.next[f.id] = g.tick + 16 + Math.floor(Math.random() * 50); } });
    if (now - demo.lastSnap > 400) { demo.lastSnap = now; pushState(OC.snapshot(g, now)); }
    if (g.status === 'finished' && !demo.restartAt) demo.restartAt = now + 15000; if (demo.restartAt && now > demo.restartAt) { demo = makeDemo(); }
  }

  // ── Zanka ────────────────────────────────────────────────────────────────
  var last = performance.now(), M = new T.Matrix4(), Q = new T.Quaternion(), V = new T.Vector3(), SC = new T.Vector3();
  function frame() {
    requestAnimationFrame(frame); var now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now; var ts = now / 1000;
    if (live.demo) demoTick();
    updateCamera(dt);
    if (B) {
      var alpha = OC.clamp((now - LAG - tA) / Math.max(1, tB - tA), 0, 1.3), s = B;
      // odstrani manjkajoče ribe
      var seenF = {}; s.fish.forEach(function (f) { seenF[f.id] = 1; });
      for (var fid in fishObjs) if (!seenF[fid]) removeFishObj(fid);

      // ribe
      s.fish.forEach(function (f) {
        var o = ensureFish(f), pr = interp(f.id, 'fish'), a = pr.a || f;
        var x = OC.lerp(a.x, f.x, alpha), z = OC.lerp(a.z, f.z, alpha), d = OC.lerp(a.d, f.d, alpha), h = lerpA(a.h, f.h, alpha), p = OC.lerp(a.p, f.p, alpha);
        var len = 1.6 + 1.0 * f.sz; o.g.scale.setScalar(len); o.g.position.set(x, -d, z);
        o.g.rotation.set(p * Math.PI / 180, Math.atan2(Math.sin(h * Math.PI / 180), -Math.cos(h * Math.PI / 180)), 0, 'YXZ');
        var sw = Math.sin(ts * (4.5 + f.spd * 3.2) + f.id.length) * (0.14 + Math.min(0.55, f.spd * 0.13));
        o.g.userData.tail.rotation.y = sw;
        var finFl = Math.sin(ts * (3 + f.spd * 2)) * 0.25;
        o.g.userData.finL.rotation.x = finFl; o.g.userData.finR.rotation.x = -finFl;
        o.g.userData.mudCloud.visible = !!f.mud && f.alive;
        var mat = o.g.userData.mat;
        var op = f.alive ? (f.hid ? 0.32 : 1) : 0.0;
        mat.transparent = op < 1; mat.opacity = op;
        o.g.userData.finMat.transparent = op < 1; o.g.userData.finMat.opacity = op;
        o.g.userData.bellyMat.transparent = op < 1; o.g.userData.bellyMat.opacity = op;
        o.g.visible = f.alive;
        mat.emissive.setHex(f.bleed ? 0x551010 : f.poison ? 0x1a4810 : 0x000000);
        var dc = camera.position.distanceTo(o.g.position), sc = OC.clamp(dc * 0.09, 1.2, 9);
        var hideSelfPov = cam.mode === 'pov' && f.id === cam.follow;
        if (hideSelfPov) o.g.visible = false;
        o.label.visible = showLabels && f.alive && !hideSelfPov; o.label.position.set(x, -d + len * 0.55, z); o.label.scale.set(sc * 3, sc, 1); drawLabel(o.label, f);
        o.bubble.visible = showWhy && f.alive && !!f.why && dc < 90 && !hideSelfPov; o.bubble.position.set(x, -d + len * 0.55 + sc, z); o.bubble.scale.set(sc * 2.7, sc, 1); drawBubble(o.bubble, f.why || '');
      });

      // zaznava izbrane ribe
      var selF = cam.follow && s.fish.find(function (x) { return x.id === cam.follow && x.alive; });
      if (showSense && selF) {
        var Lf = (s.light || 1) * Math.exp(-selF.d / 42);
        var visR = 6 + 50 * Lf;
        senseRing.visible = true; senseRing.position.set(selF.x, -selF.d, selF.z); senseRing.scale.setScalar(visR);
        var pa = senseLines.geometry.attributes.position, li = 0;
        s.fish.forEach(function (o2) {
          if (!o2.alive || o2.id === selF.id || li >= 9) return;
          var dd = Math.hypot(o2.x - selF.x, o2.z - selF.z, o2.d - selF.d);
          if (dd <= visR * 1.4) {
            pa.setXYZ(li * 2, selF.x, -selF.d, selF.z);
            pa.setXYZ(li * 2 + 1, o2.x, -o2.d, o2.z);
            li++;
          }
        });
        for (var zi = li * 2; zi < 20; zi++) pa.setXYZ(zi, 0, 0, 0);
        pa.needsUpdate = true; senseLines.visible = li > 0;
      } else { senseRing.visible = false; senseLines.visible = false; }

      // morski pes
      var sh = ensureShark(), sa = A.shark || s.shark, sb = s.shark;
      var sx = OC.lerp(sa.x, sb.x, alpha), sz_ = OC.lerp(sa.z, sb.z, alpha), sd = OC.lerp(sa.d, sb.d, alpha), shh = lerpA(sa.h, sb.h, alpha);
      sh.g.position.set(sx, -sd, sz_); sh.g.rotation.set(0, Math.atan2(Math.sin(shh * Math.PI / 180), -Math.cos(shh * Math.PI / 180)), 0);
      sh.g.userData.tail.rotation.y = Math.sin(ts * (3 + sb.spd)) * 0.28;
      sh.g.userData.mat.emissive.setHex(sb.state === 'hunt' ? 0x380a08 : 0x000000);
      sh.label.visible = showLabels; sh.label.position.set(sx, -sd + 5.2, sz_);
      var sdc = camera.position.distanceTo(sh.g.position), ssc = OC.clamp(sdc * 0.09, 1.5, 10);
      sh.label.scale.set(ssc * 3, ssc, 1);
      drawLabel(sh.label, { n: 'MORSKI PES', model: sb.state === 'hunt' ? 'LOVI ' + (sb.target || '') : sb.state === 'scavenge' ? 'mrhovina' : (sb.tired ? 'utrujen' : 'patrulja'), hp: 1, hpMax: 1, en: 1, enMax: 1, sz: 12, alive: true });

      // jate sardel in svetilnic (lanternfish)
      s.schools.forEach(function (q) { var o = ensureSchool(q, schoolObjs, sardMat), pr = interp(q.id, 'schools'), a = pr.a || q; var cx = OC.lerp(a.x, q.x, alpha), cz = OC.lerp(a.z, q.z, alpha), cd = OC.lerp(a.d, q.d, alpha); var vis = Math.min(o.ph.length, Math.ceil(q.n / 180 * o.ph.length)); o.im.visible = q.n > 0; for (var i = 0; i < o.ph.length; i++) { var p = o.ph[i]; if (i >= vis) { M.makeScale(0, 0, 0); o.im.setMatrixAt(i, M); continue; } var an = p.a + ts * p.w; V.set(cx + Math.cos(an) * p.r, -cd + p.y + Math.sin(ts * 1.3 + p.a) * 0.5, cz + Math.sin(an) * p.r); Q.setFromEuler(new T.Euler(0, Math.atan2(-Math.sin(an), Math.cos(an)) + Math.PI, 0)); SC.set(1, 1, 1); M.compose(V, Q, SC); o.im.setMatrixAt(i, M); } o.im.instanceMatrix.needsUpdate = true; });
      (s.lanterns || []).forEach(function (q) { var o = ensureSchool(q, lanternObjs, lantMat), pr = interp(q.id, 'lanterns'), a = pr.a || q; var cx = OC.lerp(a.x, q.x, alpha), cz = OC.lerp(a.z, q.z, alpha), cd = OC.lerp(a.d, q.d, alpha); var vis = Math.min(o.ph.length, Math.ceil(q.n / 90 * o.ph.length)); o.im.visible = q.n > 0; for (var i = 0; i < o.ph.length; i++) { var p = o.ph[i]; if (i >= vis) { M.makeScale(0, 0, 0); o.im.setMatrixAt(i, M); continue; } var an = p.a + ts * p.w; V.set(cx + Math.cos(an) * p.r, -cd + p.y + Math.sin(ts * 1.5 + p.a) * 0.4, cz + Math.sin(an) * p.r); Q.setFromEuler(new T.Euler(0, Math.atan2(-Math.sin(an), Math.cos(an)) + Math.PI, 0)); SC.set(1.1, 1.1, 1.1); M.compose(V, Q, SC); o.im.setMatrixAt(i, M); } o.im.instanceMatrix.needsUpdate = true; });

      // plankton
      s.plankton.forEach(function (q) { var o = ensurePlank(q); o.pt.visible = q.amt > 1; o.pt.position.set(q.x, -q.d, q.z); o.pt.material.opacity = 0.2 + 0.6 * q.amt / 110; o.pt.rotation.y = ts * 0.05; });
      // meduze
      ensureJellies(); jellyGroup.position.set(s.jellies.x, -s.jellies.d, s.jellies.z); jellyItems.forEach(function (j) { j.g.position.set(j.ox * s.jellies.r, j.oy * 14 + Math.sin(ts * 0.8 + j.ph) * 1.2, j.oz * s.jellies.r); j.g.scale.y = 0.85 + 0.25 * Math.sin(ts * 2 + j.ph); });
      // raki
      if (!crabMesh) { crabMesh = new T.InstancedMesh(crabGeo, crabMat, 80); scene.add(crabMesh); } crabMesh.count = Math.min(80, s.crabs.length); s.crabs.forEach(function (c, i) { if (i >= 80) return; M.makeRotationY(i * 1.7); M.setPosition(c.x, -c.d + 0.1, c.z); crabMesh.setMatrixAt(i, M); }); crabMesh.instanceMatrix.needsUpdate = true;
      // napihovalke
      var seenP = {}; s.puffers.forEach(function (u) { var o = ensurePuffer(u); seenP[u.id] = 1; var pr = interp(u.id, 'puffers'), a = pr.a || u; o.m.position.set(OC.lerp(a.x, u.x, alpha), -u.d + Math.sin(ts + u.x) * 0.3, OC.lerp(a.z, u.z, alpha)); o.m.rotation.y = ts * 0.5; }); for (var pid in pufferObjs) if (!seenP[pid]) { scene.remove(pufferObjs[pid].m); delete pufferObjs[pid]; }
      // mrhovina
      var seenK = {}; s.carrion.forEach(function (k) { var o = ensureCarrion(k); seenK[k.id] = 1; o.g.position.set(k.x, -k.d, k.z); }); for (var kid in carrionObjs) if (!seenK[kid]) { scene.remove(carrionObjs[kid].g); delete carrionObjs[kid]; }

      // svetloba / megla / sončni žarki
      var camD = Math.max(0, -camera.position.y), Lc = (s.light || 1) * Math.exp(-camD / 42), above = camera.position.y > 0;
      var fc = new T.Color().setRGB(0.02 + 0.10 * Lc, 0.10 + 0.35 * Lc, 0.20 + 0.45 * Lc); if (above) fc.setRGB(0.55, 0.75, 0.95);
      scene.fog.color.copy(fc); scene.background = fc; scene.fog.density = above ? 0.0015 : 0.0055 + 0.019 * (1 - Lc) + (OC.inBiolum(camera.position.x, camera.position.z, camD) ? 0.004 : 0);
      hemi.intensity = 0.25 + 0.8 * (s.light || 1); sun.intensity = 0.2 + 0.9 * (s.light || 1); amb.intensity = 0.35 + 0.3 * (s.light || 1);
      raysGroup.visible = !above && (s.light || 0) > 0.25;
      if (raysGroup.visible) {
        raysGroup.children.forEach(function (rm, ri) { rm.material.opacity = 0.02 + 0.045 * (s.light || 1) * (0.7 + 0.3 * Math.sin(ts * 0.6 + ri)); });
      }
      drawMini(s);
    }
    // animacije okolja
    sway.forEach(function (o) {
      if (o.isInstancedMesh) { var items = o.userData; for (var i = 0; i < items.length; i++) { var it = items[i]; var ang = Math.sin(ts * 0.9 + it.ph) * 0.09; Q.setFromEuler(new T.Euler(ang, 0, Math.cos(ts * 0.7 + it.ph) * 0.09)); V.set(it.x, it.y, it.z); SC.set(1, it.h, 1); M.compose(V, Q, SC); o.setMatrixAt(i, M); } o.instanceMatrix.needsUpdate = true; }
      else if (o.ring) {
        o.ring.rotation.z = ts; o.ring.material.color.setHSL(0.5, 1, 0.6 + 0.2 * Math.sin(ts * 3));
        if (o.wrasses) o.wrasses.forEach(function (w) { var a = w.a + ts * 1.4; w.m.position.set(o.cx + Math.cos(a) * w.r, o.cy + w.dy + Math.sin(ts * 2 + w.a) * 0.25, o.cz + Math.sin(a) * w.r); w.m.rotation.y = -a; });
      }
      else if (o.anems) { o.anems.forEach(function (an) { an.g.rotation.z = Math.sin(ts * 1.6 + an.ph) * 0.14; an.g.rotation.x = Math.cos(ts * 1.2 + an.ph) * 0.12; }); }
      else if (o.smoke) { var pa = o.smoke.geometry.attributes.position; for (var k = 0; k < pa.count; k++) { var y = pa.getY(k) + dt * 2.5; if (y > o.base + 34) y = o.base; pa.setY(k, y); pa.setX(k, o.x + Math.sin(ts + k) * (y - o.base) * 0.08); } pa.needsUpdate = true; }
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
