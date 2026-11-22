// OCEAN ARENA v5 — voda, svetloba, dno (kaustike), gladina (valovi), sončni žarki, delci, kakovost.
var OCEAN = (function () {
  var T = THREE;
  var Q = { low: { dpr: 1, snow: 500, rays: 0, caustics: 0, surfSeg: 40, school: 0.4, bubbles: 60, aniso: 1 }, med: { dpr: 1.25, snow: 1500, rays: 10, caustics: 1, surfSeg: 96, school: 0.8, bubbles: 160, aniso: 2 }, high: { dpr: 1.75, snow: 3500, rays: 18, caustics: 1, surfSeg: 160, school: 1.3, bubbles: 320, aniso: 4 } };
  var O = { q: Q.med, qname: 'med' };
  O.setQuality = function (name) { O.qname = Q[name] ? name : 'med'; O.q = Q[O.qname]; try { localStorage.setItem('ocean.q', O.qname); } catch (e) {} return O.q; };
  O.loadQuality = function (qs) { var n = (qs && qs.get('q')) || (function () { try { return localStorage.getItem('ocean.q'); } catch (e) { return null; } })(); return O.setQuality(n || 'med'); };

  // ── Dno: lasten shader (barve po ogliščih + peščeni valovi + kaustike + megla) ──
  var FLOOR_VS = [
    '#include <common>', '#include <fog_pars_vertex>',
    'varying vec3 vCol; varying vec3 vN; varying vec3 vW;',
    'void main(){ vCol = color; vN = normalize(normalMatrix * normal); vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xyz; vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;',
    '#include <fog_vertex>', '}'
  ].join('\n');
  var FLOOR_FS = [
    '#include <common>', '#include <fog_pars_fragment>',
    'uniform float uTime, uLight, uCaustics; uniform vec3 uSunDir, uSunCol, uAmb;',
    'varying vec3 vCol; varying vec3 vN; varying vec3 vW;',
    'float caus(vec2 p, float t){ float v = 0.0; for (int i = 0; i < 3; i++) { float fi = float(i); vec2 q = p * (0.28 + fi * 0.15) + vec2(t * (0.25 + fi * 0.08), t * (0.18 - fi * 0.06)); v += pow(abs(sin(q.x + sin(q.y * 1.3 + t * 0.7))) * abs(cos(q.y + cos(q.x * 0.9 - t * 0.6))), 3.0); } return v / 3.0; }',
    'void main(){',
    '  float depth = max(0.0, -vW.y);',
    '  float above = smoothstep(-0.2, 0.25, vW.y);',
    '  vec3 n = normalize(vN);',
    '  float rip = sin(vW.x * 2.1 + vW.z * 0.7 + sin(vW.z * 1.7) * 0.8) * 0.5 + 0.5;',
    '  n = normalize(n + vec3(rip * 0.08 - 0.04, 0.0, (1.0 - rip) * 0.06 - 0.03) * (1.0 - above * 0.6));',
    '  float ndl = max(0.0, dot(n, uSunDir));',
    '  vec3 att = vec3(exp(-depth / 10.0), exp(-depth / 26.0), exp(-depth / 80.0));',
    '  vec3 sunUnder = uSunCol * att * uLight;',
    '  float c = uCaustics * caus(vW.xz, uTime) * uLight * exp(-depth / 32.0) * (1.0 - above);',
    '  vec3 underCol = vCol * (uAmb * (0.7 + 0.45 * n.y) + sunUnder * 0.55 * (0.25 + 0.55 * ndl) * (1.0 + c * 1.4)) * vec3(0.92, 0.9, 1.0);',
    '  vec3 landLight = mix(vec3(0.14, 0.18, 0.26), vec3(0.32, 0.38, 0.44), uLight) + uSunCol * uLight * (0.22 + 0.85 * ndl);',
    '  vec3 landCol = vCol * landLight;',
    '  vec3 col = mix(underCol, landCol, above);',
    '  gl_FragColor = vec4(col, 1.0);',
    '#include <fog_fragment>', '}'
  ].join('\n');
  O.floorMaterial = function () {
    var u = { uTime: { value: 0 }, uLight: { value: 1 }, uCaustics: { value: 1 }, uSunDir: { value: new T.Vector3(0.3, 0.9, 0.2) }, uSunCol: { value: new T.Color(1, 0.95, 0.85) }, uAmb: { value: new T.Color(0.12, 0.2, 0.3) }, fogColor: { value: new T.Color(0x0a3550) }, fogDensity: { value: 0.008 } };
    var m = new T.ShaderMaterial({ uniforms: u, vertexShader: FLOOR_VS, fragmentShader: FLOOR_FS, vertexColors: true, fog: true }); m.userData.u = u; return m;
  };

  // ── Gladina: Gerstnerjevi valovi, pogled od spodaj (svetla, Snellovo okno) in od zgoraj ──
  var SURF_VS = [
    '#include <common>', '#include <fog_pars_vertex>',
    'uniform float uTime; varying vec3 vN; varying vec3 vW;',
    'vec3 gerst(vec2 p, float t, vec2 dir, float wl, float amp, float speed, inout vec3 n) { float k = 6.2831 / wl; float f = k * dot(dir, p) - speed * t; float a = amp; n += vec3(-dir.x * k * a * cos(f), 0.0, -dir.y * k * a * cos(f)); return vec3(dir.x * a * sin(f) * 0.6, a * cos(f), dir.y * a * sin(f) * 0.6); }',
    'void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vec3 n = vec3(0.0, 1.0, 0.0); vec3 d = vec3(0.0);',
    '  d += gerst(wp.xz, uTime, normalize(vec2(1.0, 0.3)), 18.0, 0.45, 1.3, n); d += gerst(wp.xz, uTime, normalize(vec2(-0.4, 1.0)), 9.0, 0.22, 1.9, n); d += gerst(wp.xz, uTime, normalize(vec2(0.7, -0.6)), 4.5, 0.09, 2.6, n); d += gerst(wp.xz, uTime, normalize(vec2(-0.9, -0.2)), 2.2, 0.035, 3.4, n);',
    '  wp.xyz += d; vN = normalize(n); vW = wp.xyz; vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;',
    '#include <fog_vertex>', '}'
  ].join('\n');
  var SURF_FS = [
    '#include <common>', '#include <fog_pars_fragment>',
    'uniform vec3 uSunDir, uSunCol, uSky, uDeep; uniform float uLight, uAbove; varying vec3 vN; varying vec3 vW;',
    'void main(){ vec3 V = normalize(cameraPosition - vW); vec3 n = normalize(vN);',
    '  if (uAbove < 0.5) { n = -n; float cosi = max(0.0, dot(V, -n));',
    '    float window = smoothstep(0.45, 0.8, cosi);',            // Snellovo okno: strmo navzgor vidiš nebo, poševno zrcalo
    '    vec3 R = reflect(-V, n); float spec = pow(max(0.0, dot(R, -uSunDir)), 60.0);',
    '    vec3 col = mix(uDeep * 1.6, uSky * uLight, window) + uSunCol * spec * uLight * 1.5;',
    '    float a = mix(0.85, 0.55, window);',
    '    gl_FragColor = vec4(col, a);',
    '  } else { float fres = pow(1.0 - max(0.0, dot(V, n)), 3.0); vec3 R = reflect(-V, n); float spec = pow(max(0.0, dot(R, uSunDir)), 120.0);',
    '    vec3 col = mix(uDeep, uSky, 0.25 + 0.75 * fres) + uSunCol * spec * 2.0 * uLight; gl_FragColor = vec4(col, 0.92); }',
    '#include <fog_fragment>', '}'
  ].join('\n');
  O.surfaceMaterial = function () {
    var u = { uTime: { value: 0 }, uLight: { value: 1 }, uAbove: { value: 0 }, uSunDir: { value: new T.Vector3(0.3, 0.9, 0.2) }, uSunCol: { value: new T.Color(1, 0.95, 0.85) }, uSky: { value: new T.Color(0.75, 0.88, 1.0) }, uDeep: { value: new T.Color(0.05, 0.25, 0.4) }, fogColor: { value: new T.Color(0x0a3550) }, fogDensity: { value: 0.008 } };
    var m = new T.ShaderMaterial({ uniforms: u, vertexShader: SURF_VS, fragmentShader: SURF_FS, transparent: true, side: T.DoubleSide, depthWrite: false, fog: true }); m.userData.u = u; return m;
  };

  // ── Sončni žarki: navpične prosojne lamele okoli kamere, nagnjene po soncu ──
  O.makeRays = function (n) {
    var grp = new T.Group(); if (!n) return grp;
    var cv = document.createElement('canvas'); cv.width = 64; cv.height = 256; var x = cv.getContext('2d'); var gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,255,255,0.0)'); gr.addColorStop(0.08, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 256); var gh = x.createLinearGradient(0, 0, 64, 0); gh.addColorStop(0, 'rgba(0,0,0,1)'); gh.addColorStop(0.35, 'rgba(0,0,0,0)'); gh.addColorStop(0.65, 'rgba(0,0,0,0)'); gh.addColorStop(1, 'rgba(0,0,0,1)'); x.globalCompositeOperation = 'destination-out'; x.fillStyle = gh; x.fillRect(0, 0, 64, 256);
    var tx = new T.CanvasTexture(cv), mat = new T.MeshBasicMaterial({ map: tx, transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, color: 0xbfe0ff });
    for (var i = 0; i < n; i++) { var w = 2 + Math.random() * 5, h = 70 + Math.random() * 50; var m = new T.Mesh(new T.PlaneGeometry(w, h), mat); m.userData = { a: Math.random() * 6.28, r: 8 + Math.random() * 45, ph: Math.random() * 6.28, h: h }; grp.add(m); }
    grp.userData.mat = mat; return grp;
  };
  O.updateRays = function (grp, cam, sunDir, light, t) {
    if (!grp.children.length) return; var camD = Math.max(0, -cam.position.y); var vis = light * Math.exp(-camD / 26) * (cam.position.y < 0 ? 1 : 0); grp.visible = vis > 0.02; if (!grp.visible) return;
    grp.userData.mat.opacity = 0.42 * vis;
    var tilt = Math.atan2(Math.hypot(sunDir.x, sunDir.z), Math.max(0.2, sunDir.y));
    grp.children.forEach(function (m, i) { var u = m.userData; var a = u.a + t * 0.02; var cx = cam.position.x + Math.cos(a) * u.r, cz = cam.position.z + Math.sin(a) * u.r; m.position.set(cx + sunDir.x * u.h * 0.3, -u.h / 2 + 1, cz + sunDir.z * u.h * 0.3); m.rotation.set(0, Math.atan2(cam.position.x - cx, cam.position.z - cz), 0); m.rotateX(0); m.rotation.z = 0; m.rotation.x = 0; m.rotateOnWorldAxis(new T.Vector3(-sunDir.z, 0, sunDir.x).normalize(), tilt * 0.5); m.scale.x = 1 + 0.3 * Math.sin(t * 0.5 + u.ph); });
  };

  var _dot = null; O.softDot = function () { if (_dot) return _dot; var cv = document.createElement('canvas'); cv.width = cv.height = 32; var x = cv.getContext('2d'); var gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); _dot = new T.CanvasTexture(cv); return _dot; };
  // ── Morski sneg (delci okoli kamere, tonejo) ──
  O.makeSnow = function (n) { var pos = new Float32Array(n * 3), i; for (i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 100; pos[i * 3 + 1] = (Math.random() - 0.5) * 100; pos[i * 3 + 2] = (Math.random() - 0.5) * 100; } var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); var p = new T.Points(g, new T.PointsMaterial({ color: 0xdff0ff, size: 0.12, map: O.softDot(), transparent: true, opacity: 0.55, depthWrite: false, sizeAttenuation: true })); p.frustumCulled = false; return p; };
  O.updateSnow = function (p, cam, dt, t) { var a = p.geometry.attributes.position, cx = cam.position.x, cy = cam.position.y, cz = cam.position.z; for (var i = 0; i < a.count; i++) { var x = a.getX(i), y = a.getY(i) - dt * 0.25, z = a.getZ(i); x += Math.sin(t * 0.3 + i) * dt * 0.1; if (y < cy - 50) y += 100; if (y > cy + 50) y -= 100; if (x < cx - 50) x += 100; if (x > cx + 50) x -= 100; if (z < cz - 50) z += 100; if (z > cz + 50) z -= 100; if (y > 0) y = Math.min(y, -0.05); a.setXYZ(i, x, y, z); } a.needsUpdate = true; };

  // ── Mehurčki (bazen delcev; emit(x,y,z,n,spread)) ──
  O.makeBubbles = function (n) { var pos = new Float32Array(n * 3), vel = new Float32Array(n), life = new Float32Array(n); for (var i = 0; i < n; i++) { pos[i * 3 + 1] = 10; life[i] = 0; } var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); var cv = document.createElement('canvas'); cv.width = cv.height = 32; var x = cv.getContext('2d'); var gr = x.createRadialGradient(16, 16, 2, 16, 16, 15); gr.addColorStop(0, 'rgba(255,255,255,0.1)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.15)'); gr.addColorStop(0.9, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); var p = new T.Points(g, new T.PointsMaterial({ map: new T.CanvasTexture(cv), size: 0.35, transparent: true, opacity: 0.8, depthWrite: false, color: 0xe8f6ff })); p.frustumCulled = false; p.userData = { vel: vel, life: life, head: 0, n: n }; return p; };
  O.emitBubbles = function (p, x, y, z, n, spread, size) { var u = p.userData, a = p.geometry.attributes.position; for (var k = 0; k < n; k++) { var i = u.head; u.head = (u.head + 1) % u.n; a.setXYZ(i, x + (Math.random() - 0.5) * spread, y + (Math.random() - 0.5) * spread * 0.5, z + (Math.random() - 0.5) * spread); u.vel[i] = (0.4 + Math.random() * 0.8) * (size || 1); u.life[i] = 1; } a.needsUpdate = true; };
  O.updateBubbles = function (p, dt, t) { var u = p.userData, a = p.geometry.attributes.position, any = false; for (var i = 0; i < u.n; i++) { if (u.life[i] <= 0) continue; any = true; var y = a.getY(i) + u.vel[i] * dt; var x = a.getX(i) + Math.sin(t * 3 + i) * dt * 0.15; if (y >= -0.1) { u.life[i] = 0; y = 10; } a.setXYZ(i, x, y, a.getZ(i)); } if (any) a.needsUpdate = true; };

  // ── Svetloba glede na uro dneva in globino kamere ──
  O.sunDir = function (tSec, DAY) { var ph = (tSec / DAY) % 1; var el = Math.cos(ph * Math.PI * 2); var az = ph * Math.PI * 2 + 0.6; var e = Math.max(-0.35, el); var v = new T.Vector3(Math.cos(az) * Math.cos(e * 1.2), Math.max(0.08, Math.sin(Math.max(0.05, e) * 1.3)), Math.sin(az) * Math.cos(e * 1.2)); return v.normalize(); };
  O.attenuate = function (d) { return new T.Color(Math.exp(-d / 16), Math.exp(-d / 46), Math.exp(-d / 100)); };
  O.lighting = function (state, cam, DAY, lights, mats) {
    var light = state ? state.light : 1, ts = state ? state.t : 0, phase = state ? state.phase : 'day';
    var sunDir = O.sunDir(ts, DAY); var camD = Math.max(0, -cam.position.y), above = cam.position.y > 0;
    var warm = phase === 'dusk' || phase === 'dawn'; var sunCol = new T.Color().setRGB(1, warm ? 0.72 : 0.96, warm ? 0.45 : 0.88); if (phase === 'night') sunCol.setRGB(0.55, 0.7, 1.0);
    var att = O.attenuate(camD * 0.9); var sunUnder = sunCol.clone().multiply(att);
    var Lc = light * Math.exp(-camD / 48);
    var fog = new T.Color().setRGB(0.01 + 0.09 * Lc * att.r, 0.07 + 0.34 * Lc * (0.6 + 0.4 * att.g), 0.16 + 0.44 * Lc);
    if (above) fog.setRGB(0.55 + 0.25 * light, 0.72 * light + 0.15, 0.95 * light + 0.05);
    lights.sun.color.copy(above ? sunCol : sunUnder); lights.sun.intensity = above ? 0.9 + 0.6 * light : 0.15 + 0.75 * light * Math.exp(-camD / 60);
    lights.sun.position.set(sunDir.x * 400, sunDir.y * 400, sunDir.z * 400).add(new T.Vector3(cam.position.x, 0, cam.position.z));
    lights.hemi.color.copy(fog).multiplyScalar(1.6); lights.hemi.groundColor.setRGB(0.02, 0.05, 0.08); lights.hemi.intensity = 0.2 + 0.55 * light * Math.exp(-camD / 120);
    lights.amb.color.setRGB(0.1 + 0.1 * att.r, 0.18, 0.3); lights.amb.intensity = 0.18 + 0.35 * Lc + (above ? 0.3 : 0);
    var dens = above ? 0.0015 : 0.0055 + 0.02 * (1 - Lc);
    for (var k in mats) { var u = mats[k].userData.u; if (!u) continue; if (u.uSunDir) u.uSunDir.value.copy(sunDir); if (u.uSunCol) u.uSunCol.value.copy(sunCol); if (u.uLight) u.uLight.value = light; if (u.uAmb) u.uAmb.value.copy(fog).multiplyScalar(1.1); if (u.fogColor) u.fogColor.value.copy(fog); if (u.fogDensity) u.fogDensity.value = dens; if (u.uAbove) u.uAbove.value = above ? 1 : 0; if (u.uSky) u.uSky.value.setRGB(0.55 + 0.4 * light, 0.7 * light + 0.2, 0.9 * light + 0.1); }
    return { fog: fog, density: dens, sunDir: sunDir, light: light, above: above, camD: camD };
  };
  return O;
})();
