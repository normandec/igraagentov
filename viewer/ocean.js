// OCEAN ARENA v5 — voda, realistični Gerstner valovi, kapilarne gubice, Fresnel/SSS, nebo, dno (RGB kaustike), žarki, delci.
var OCEAN = (function () {
  var T = THREE;
  var Q = {
    low:  { dpr: 1.25, snow: 600,  rays: 0,  caustics: 0, surfSeg: 96,  floorSeg: 180, school: 0.5, bubbles: 80,  aniso: 2 },
    med:  { dpr: 2.0,  snow: 1800, rays: 12, caustics: 1, surfSeg: 160, floorSeg: 240, school: 0.9, bubbles: 200, aniso: 4 },
    high: { dpr: 3.0,  snow: 3600, rays: 20, caustics: 1, surfSeg: 220, floorSeg: 320, school: 1.4, bubbles: 360, aniso: 8 }
  };
  var O = { q: Q.high, qname: 'high' };
  O.setQuality = function (name) {
    O.qname = Q[name] ? name : 'high';
    O.q = Q[O.qname];
    try { localStorage.setItem('ocean.q.v2', O.qname); } catch (e) {}
    return O.q;
  };
  O.loadQuality = function (qs) {
    var n = (qs && qs.get('q')) || (function () { try { return localStorage.getItem('ocean.q.v2'); } catch (e) { return null; } })();
    return O.setQuality(n || 'high');
  };

  // ── Dno: svetovni normali + multi-skalni peščeni valovi + RGB kromatske kaustike ──
  var FLOOR_VS = [
    '#include <common>', '#include <fog_pars_vertex>',
    'varying vec3 vCol; varying vec3 vN; varying vec3 vW;',
    'void main(){',
    '  vCol = color;',
    '  vN = normalize(mat3(modelMatrix) * normal);',
    '  vec4 wp = modelMatrix * vec4(position, 1.0);',
    '  vW = wp.xyz;',
    '  vec4 mvPosition = viewMatrix * wp;',
    '  gl_Position = projectionMatrix * mvPosition;',
    '#include <fog_vertex>', '}'
  ].join('\n');

  var FLOOR_FS = [
    '#include <common>', '#include <fog_pars_fragment>',
    'uniform float uTime, uLight, uCaustics; uniform vec3 uSunDir, uSunCol, uAmb;',
    'varying vec3 vCol; varying vec3 vN; varying vec3 vW;',
    'float causLayer(vec2 p, float t){',
    '  vec2 p1 = p * 0.31 + vec2(t * 0.22, -t * 0.16);',
    '  vec2 p2 = p * 0.49 + vec2(-t * 0.19, t * 0.27);',
    '  float a = sin(p1.x + sin(p1.y * 1.35 + t * 0.65)) * cos(p1.y + cos(p1.x * 1.1 - t * 0.55));',
    '  float b = sin(p2.x * 1.15 - cos(p2.y * 1.2 + t * 0.5)) * cos(p2.y * 1.05 + sin(p2.x * 0.9 - t * 0.7));',
    '  return pow(clamp(1.0 - abs(a + b * 0.7) * 0.9, 0.0, 1.0), 4.0);',
    '}',
    'vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }',
    'void main(){',
    '  float depth = max(0.0, -vW.y);',
    '  float above = smoothstep(-0.18, 0.28, vW.y);',
    '  vec3 n = normalize(vN);',
    '  float rip1 = sin(vW.x * 2.2 + vW.z * 0.75 + sin(vW.z * 1.6) * 0.85);',
    '  float rip2 = cos(vW.z * 3.7 - vW.x * 1.1 + sin(vW.x * 1.9) * 0.6);',
    '  n = normalize(n + vec3(rip1 * 0.055, 0.0, rip2 * 0.05) * (1.0 - above * 0.7));',
    '  float ndl = max(0.0, dot(n, uSunDir));',
    '  vec3 baseLin = pow(max(vCol, vec3(0.001)), vec3(2.2));',
    '  vec3 sunLin = pow(max(uSunCol, vec3(0.001)), vec3(2.2));',
    '  vec3 ambLin = pow(max(uAmb, vec3(0.001)), vec3(2.2));',
    '  vec3 att = vec3(exp(-depth / 11.0), exp(-depth / 30.0), exp(-depth / 88.0));',
    '  vec3 sunUnder = sunLin * att * uLight;',
    '  float cFade = uCaustics * uLight * exp(-depth / 34.0) * (1.0 - above);',
    '  vec2 cUv = vW.xz + uSunDir.xz / max(0.35, uSunDir.y) * depth * 0.35;',
    '  vec3 cRgb = vec3(causLayer(cUv + vec2(0.08, 0.0), uTime), causLayer(cUv, uTime), causLayer(cUv - vec2(0.07, 0.05), uTime));',
    '  vec3 causTerm = cRgb * cFade * (0.65 + 0.75 * ndl) * 1.65;',
    '  vec3 underCol = baseLin * (ambLin * (0.72 + 0.48 * n.y) + sunUnder * (0.28 + 0.65 * ndl) * (vec3(1.0) + causTerm));',
    '  float wetShore = (1.0 - smoothstep(0.0, 1.35, max(0.0, vW.y))) * above;',
    '  vec3 landBase = mix(baseLin, baseLin * vec3(0.56, 0.54, 0.50), wetShore * 0.75);',
    '  vec3 landAmb = mix(vec3(0.025, 0.038, 0.068), vec3(0.11, 0.15, 0.21), uLight);',
    '  vec3 landCol = landBase * (landAmb + sunLin * uLight * (0.22 + 0.92 * ndl));',
    '  vec3 linCol = mix(underCol, landCol, above);',
    '  vec3 srgbCol = pow(aces(linCol * 1.15), vec3(1.0 / 2.2));',
    '  gl_FragColor = vec4(srgbCol, 1.0);',
    '#include <fog_fragment>', '}'
  ].join('\n');

  O.floorMaterial = function () {
    var u = {
      uTime: { value: 0 }, uLight: { value: 1 }, uCaustics: { value: 1 },
      uSunDir: { value: new T.Vector3(0.3, 0.9, 0.2) },
      uSunCol: { value: new T.Color(1, 0.95, 0.85) },
      uAmb: { value: new T.Color(0.12, 0.2, 0.3) },
      fogColor: { value: new T.Color(0x0a3550) }, fogDensity: { value: 0.008 }
    };
    var m = new T.ShaderMaterial({ uniforms: u, vertexShader: FLOOR_VS, fragmentShader: FLOOR_FS, vertexColors: true, fog: true });
    m.userData.u = u;
    return m;
  };

  // ── Gladina: fizikalni Gerstner valovi (Nyquist > 6.5m) + shoaling + kapilarne gubice + Schlick Fresnel + crest SSS + pena ──
  var SURF_VS = [
    '#include <common>', '#include <fog_pars_vertex>',
    'uniform float uTime;',
    'attribute float aDepth;',
    'varying vec3 vN; varying vec3 vW; varying float vDepth; varying float vCrest;',
    'vec3 gerst(vec2 p, float t, vec2 dir, float wl, float amp, float steep, float spd, inout vec3 tx, inout vec3 tz, inout float jac){',
    '  float k = 6.2831853 / wl;',
    '  float c = sqrt(9.81 / k) * spd;',
    '  float f = k * dot(dir, p) - k * c * t;',
    '  float sf = sin(f), cf = cos(f);',
    '  float qa = min(0.70, steep / max(0.001, k * amp * 5.0));',
    '  float qka = qa * k * amp;',
    '  tx += vec3(-dir.x * dir.x * qka * sf, dir.x * k * amp * cf, -dir.x * dir.y * qka * sf);',
    '  tz += vec3(-dir.x * dir.y * qka * sf, dir.y * k * amp * cf, -dir.y * dir.y * qka * sf);',
    '  jac -= qka * sf * 0.32;',
    '  return vec3(dir.x * qa * amp * cf, amp * sf, dir.y * qa * amp * cf);',
    '}',
    'void main(){',
    '  vec4 wp = modelMatrix * vec4(position, 1.0);',
    '  float shoal = smoothstep(-0.3, 12.0, aDepth);',
    '  float aS = mix(0.14, 1.0, shoal);',
    '  vec3 tx = vec3(1.0, 0.0, 0.0), tz = vec3(0.0, 0.0, 1.0), d = vec3(0.0);',
    '  float jac = 1.0;',
    '  d += gerst(wp.xz, uTime, normalize(vec2(0.94, 0.34)),  34.0, 0.42 * aS, 0.46, 0.95, tx, tz, jac);',
    '  d += gerst(wp.xz, uTime, normalize(vec2(-0.42, 0.91)), 21.5, 0.24 * aS, 0.42, 1.02, tx, tz, jac);',
    '  d += gerst(wp.xz, uTime, normalize(vec2(0.76, -0.65)), 13.5, 0.125 * aS, 0.36, 1.08, tx, tz, jac);',
    '  d += gerst(wp.xz, uTime, normalize(vec2(-0.88, -0.47)), 8.8, 0.062 * aS, 0.28, 1.15, tx, tz, jac);',
    '  d += gerst(wp.xz, uTime, normalize(vec2(0.25, 0.97)),   6.6, 0.032 * aS, 0.22, 1.22, tx, tz, jac);',
    '  wp.xyz += d;',
    '  vN = normalize(cross(tz, tx));',
    '  vW = wp.xyz;',
    '  vDepth = aDepth;',
    '  vCrest = clamp((d.y / 0.55) * 0.55 + (1.0 - jac) * 0.75, 0.0, 1.0);',
    '  vec4 mvPosition = viewMatrix * wp;',
    '  gl_Position = projectionMatrix * mvPosition;',
    '#include <fog_vertex>', '}'
  ].join('\n');

  var SURF_FS = [
    '#include <common>', '#include <fog_pars_fragment>',
    'uniform vec3 uSunDir, uSunCol, uSky, uDeep; uniform float uLight, uAbove, uTime;',
    'varying vec3 vN; varying vec3 vW; varying float vDepth; varying float vCrest;',
    'vec2 capGrad(vec2 p, float t){',
    '  vec2 g = vec2(0.0);',
    '  float f1 = dot(p, vec2(2.3, 1.1)) - t * 2.9; g += vec2(2.3, 1.1) * cos(f1) * 0.042;',
    '  float f2 = dot(p, vec2(-1.8, 2.7)) - t * 3.6; g += vec2(-1.8, 2.7) * cos(f2) * 0.031;',
    '  float f3 = dot(p, vec2(4.2, -3.1)) + t * 4.4; g += vec2(4.2, -3.1) * cos(f3) * 0.017;',
    '  float f4 = dot(p, vec2(-5.4, -2.6)) - t * 5.2; g += vec2(-5.4, -2.6) * cos(f4) * 0.011;',
    '  return g;',
    '}',
    'vec3 skySample(vec3 dir, vec3 sunDir, vec3 sunLin, vec3 skyLin, float light){',
    '  float h = clamp(dir.y, 0.0, 1.0);',
    '  vec3 horiz = mix(vec3(0.03, 0.06, 0.11), skyLin * 1.08 + vec3(0.06, 0.05, 0.03) * (1.0 - light), max(0.18, light));',
    '  vec3 zen = mix(vec3(0.012, 0.024, 0.065), vec3(0.08, 0.25, 0.56), light);',
    '  vec3 c = mix(horiz, zen, pow(h, 0.58));',
    '  float sd = max(0.0, dot(normalize(dir), sunDir));',
    '  c += sunLin * (pow(sd, 36.0) * 0.42 + pow(sd, 280.0) * 2.2) * (0.3 + 0.7 * light);',
    '  return c;',
    '}',
    'vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }',
    'void main(){',
    '  float shoreMask = smoothstep(-0.14, 0.34, vDepth);',
    '  if (shoreMask < 0.01) discard;',
    '  vec3 V = normalize(cameraPosition - vW);',
    '  float camDist = length(cameraPosition - vW);',
    '  float ripFade = exp(-camDist / 135.0);',
    '  vec2 cg = capGrad(vW.xz, uTime) * ripFade;',
    '  vec3 n = normalize(vN + vec3(-cg.x, 0.0, -cg.y));',
    '  vec3 sunLin = pow(max(uSunCol, vec3(0.001)), vec3(2.2));',
    '  vec3 skyLin = pow(max(uSky, vec3(0.001)), vec3(2.2));',
    '  vec3 deepLin = pow(max(uDeep, vec3(0.001)), vec3(2.2));',
    '  if (uAbove < 0.5) {',
    '    n = -n;',
    '    float cosi = max(0.0, dot(V, n));',
    '    float window = smoothstep(0.58, 0.78, cosi);',
    '    vec3 refDir = reflect(-V, n);',
    '    vec3 refrDir = normalize(mix(vec3(V.x, abs(V.y) + 0.25, V.z), n, 0.35));',
    '    vec3 skyWin = skySample(refrDir, uSunDir, sunLin, skyLin, uLight) * (0.75 + 0.45 * uLight);',
    '    float sunDisk = pow(max(0.0, dot(refrDir, uSunDir)), 28.0) * uLight;',
    '    vec3 tirCol = deepLin * (1.45 + 0.7 * max(0.0, n.y)) + vec3(0.02, 0.12, 0.18) * (1.0 - cosi);',
    '    float tirSpec = pow(max(0.0, dot(refDir, -uSunDir)), 48.0) * 0.7 * uLight;',
    '    vec3 colLin = mix(tirCol + sunLin * tirSpec, skyWin + sunLin * sunDisk * 1.4, window);',
    '    float a = mix(0.88, 0.42, window) * shoreMask;',
    '    gl_FragColor = vec4(pow(aces(colLin * 1.1), vec3(1.0 / 2.2)), a);',
    '  } else {',
    '    float cosV = max(0.0, dot(V, n));',
    '    float fres = 0.022 + 0.978 * pow(1.0 - cosV, 5.0);',
    '    vec3 R = reflect(-V, n); R.y = max(0.02, R.y);',
    '    vec3 refl = skySample(R, uSunDir, sunLin, skyLin, uLight);',
    '    float depthT = 1.0 - exp(-max(0.0, vDepth) * 0.068);',
    '    vec3 shallowCol = vec3(0.03, 0.32, 0.38) * (0.28 + 0.72 * uLight);',
    '    vec3 bodyCol = mix(shallowCol, deepLin * (0.38 + 0.62 * uLight), depthT);',
    '    vec3 Hsss = normalize(uSunDir + n * 0.45);',
    '    float sss = pow(clamp(dot(V, -Hsss), 0.0, 1.0), 3.2) * (0.35 + 0.65 * vCrest);',
    '    bodyCol += vec3(0.03, 0.28, 0.32) * sss * sunLin * uLight * 1.5;',
    '    vec3 H = normalize(V + uSunDir);',
    '    float ndh = max(0.0, dot(n, H));',
    '    float specSharp = pow(ndh, 260.0) * 3.8;',
    '    float specSoft = pow(ndh, 36.0) * 0.28;',
    '    vec3 colLin = mix(bodyCol, refl, fres) + sunLin * (specSharp + specSoft) * (0.22 + 0.78 * uLight);',
    '    float surfBand = (1.0 - smoothstep(0.25, 2.6, vDepth)) * shoreMask;',
    '    float foamWave = sin(vDepth * 5.4 - uTime * 2.2 + sin(vW.x * 0.24 + vW.z * 0.21) * 2.0);',
    '    float foamPat = 0.5 + 0.5 * sin(vW.x * 1.9 + vW.z * 2.3 + uTime * 0.8) * cos(vW.x * 3.1 - vW.z * 2.7);',
    '    float shoreFoam = surfBand * smoothstep(0.12, 0.88, foamWave * 0.55 + 0.45) * (0.45 + 0.55 * foamPat);',
    '    float crestFoam = smoothstep(0.70, 0.98, vCrest) * foamPat * 0.42;',
    '    float foam = clamp(shoreFoam + crestFoam, 0.0, 0.85);',
    '    vec3 foamCol = vec3(0.75, 0.82, 0.86) * (0.18 + 0.82 * uLight);',
    '    colLin = mix(colLin, foamCol, foam);',
    '    float alpha = clamp(mix(0.42, 0.94, max(depthT, fres * 0.9)) + foam * 0.4, 0.0, 0.96) * shoreMask;',
    '    gl_FragColor = vec4(pow(aces(colLin * 1.12), vec3(1.0 / 2.2)), alpha);',
    '  }',
    '#include <fog_fragment>', '}'
  ].join('\n');

  O.surfaceMaterial = function () {
    var u = {
      uTime: { value: 0 }, uLight: { value: 1 }, uAbove: { value: 0 },
      uSunDir: { value: new T.Vector3(0.3, 0.9, 0.2) },
      uSunCol: { value: new T.Color(1, 0.95, 0.85) },
      uSky: { value: new T.Color(0.75, 0.88, 1.0) },
      uDeep: { value: new T.Color(0.05, 0.25, 0.4) },
      fogColor: { value: new T.Color(0x0a3550) }, fogDensity: { value: 0.008 }
    };
    var m = new T.ShaderMaterial({ uniforms: u, vertexShader: SURF_VS, fragmentShader: SURF_FS, transparent: true, side: T.DoubleSide, depthWrite: false, fog: true });
    m.userData.u = u;
    return m;
  };

  // ── Kupola neba (Atmosferski prehod + sončni disk + zvezde ponoči) ──
  var SKY_VS = [
    'varying vec3 vDir;',
    'void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vDir = normalize(position); gl_Position = projectionMatrix * viewMatrix * wp; }'
  ].join('\n');
  var SKY_FS = [
    'uniform vec3 uSunDir, uSunCol, uSky; uniform float uLight, uTime;',
    'varying vec3 vDir;',
    'float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }',
    'vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }',
    'void main(){',
    '  vec3 d = normalize(vDir);',
    '  float h = clamp(d.y, 0.0, 1.0);',
    '  vec3 sunLin = pow(max(uSunCol, vec3(0.001)), vec3(2.2));',
    '  vec3 skyLin = pow(max(uSky, vec3(0.001)), vec3(2.2));',
    '  vec3 horiz = mix(vec3(0.025, 0.05, 0.10), skyLin * 1.12 + vec3(0.07, 0.05, 0.03) * (1.0 - uLight), max(0.16, uLight));',
    '  vec3 zen = mix(vec3(0.008, 0.018, 0.052), vec3(0.07, 0.23, 0.54), uLight);',
    '  vec3 col = mix(horiz, zen, pow(h, 0.55));',
    '  float cloudBand = smoothstep(0.02, 0.32, h) * (1.0 - smoothstep(0.32, 0.65, h));',
    '  float cl = sin(d.x * 7.0 + uTime * 0.015) * cos(d.z * 6.5 - uTime * 0.01) + 0.5 * sin(d.x * 13.0 - d.z * 11.0);',
    '  col = mix(col, mix(horiz * 1.25, sunLin * 0.85, 0.35), cloudBand * smoothstep(0.25, 1.1, cl) * 0.28 * (0.2 + 0.8 * uLight));',
    '  float sd = max(0.0, dot(d, uSunDir));',
    '  col += sunLin * (pow(sd, 14.0) * 0.25 + pow(sd, 96.0) * 0.85 + smoothstep(0.9991, 0.9997, sd) * 5.0) * (0.25 + 0.75 * uLight);',
    '  if (uLight < 0.45 && h > 0.05) { float st = hash(floor(d * 260.0)); if (st > 0.9935) col += vec3(0.75, 0.84, 1.0) * ((st - 0.9935) / 0.0065) * (1.0 - uLight / 0.45) * 1.1; }',
    '  gl_FragColor = vec4(pow(aces(col), vec3(1.0 / 2.2)), 1.0);',
    '}'
  ].join('\n');
  O.makeSky = function () {
    var u = { uSunDir: { value: new T.Vector3(0.3, 0.9, 0.2) }, uSunCol: { value: new T.Color(1, 0.95, 0.85) }, uSky: { value: new T.Color(0.75, 0.88, 1.0) }, uLight: { value: 1 }, uTime: { value: 0 } };
    var mat = new T.ShaderMaterial({ uniforms: u, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: T.BackSide, depthWrite: false, fog: false });
    var m = new T.Mesh(new T.SphereGeometry(1200, 32, 18), mat);
    m.frustumCulled = false; m.renderOrder = -10; m.userData.u = u;
    return m;
  };
  O.updateSky = function (sky, cam, LI, t) {
    if (!sky) return;
    sky.visible = cam.position.y > -2.5;
    if (!sky.visible) return;
    sky.position.set(cam.position.x, 0, cam.position.z);
    var u = sky.userData.u;
    u.uSunDir.value.copy(LI.sunDir);
    u.uLight.value = LI.light;
    u.uTime.value = t;
  };

  // ── Sončni žarki: nagnjeni proti soncu s čisto ortonormalno bazo ──
  var _R_UP = new T.Vector3(), _R_RIGHT = new T.Vector3(), _R_FWD = new T.Vector3(), _R_M = new T.Matrix4();
  O.makeRays = function (n) {
    var grp = new T.Group(); if (!n) return grp;
    var cv = document.createElement('canvas'); cv.width = 64; cv.height = 256; var x = cv.getContext('2d');
    var gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,255,255,0.0)'); gr.addColorStop(0.08, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.16)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 256);
    var gh = x.createLinearGradient(0, 0, 64, 0); gh.addColorStop(0, 'rgba(0,0,0,1)'); gh.addColorStop(0.32, 'rgba(0,0,0,0)'); gh.addColorStop(0.68, 'rgba(0,0,0,0)'); gh.addColorStop(1, 'rgba(0,0,0,1)'); x.globalCompositeOperation = 'destination-out'; x.fillStyle = gh; x.fillRect(0, 0, 64, 256);
    var tx = new T.CanvasTexture(cv), mat = new T.MeshBasicMaterial({ map: tx, transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, color: 0xbfe4ff });
    for (var i = 0; i < n; i++) { var w = 2.2 + Math.random() * 5.2, h = 70 + Math.random() * 50; var m = new T.Mesh(new T.PlaneGeometry(w, h), mat); m.userData = { a: Math.random() * 6.28, r: 9 + Math.random() * 46, ph: Math.random() * 6.28, h: h }; grp.add(m); }
    grp.userData.mat = mat; return grp;
  };
  O.updateRays = function (grp, cam, sunDir, light, t) {
    if (!grp.children.length) return;
    var camD = Math.max(0, -cam.position.y);
    var vis = light * Math.exp(-camD / 28) * (cam.position.y < 0 ? 1 : 0);
    grp.visible = vis > 0.02; if (!grp.visible) return;
    grp.userData.mat.opacity = 0.42 * vis;
    _R_UP.set(sunDir.x * 0.45, Math.max(0.45, sunDir.y), sunDir.z * 0.45).normalize();
    grp.children.forEach(function (m) {
      var u = m.userData, a = u.a + t * 0.018;
      var cx = cam.position.x + Math.cos(a) * u.r, cz = cam.position.z + Math.sin(a) * u.r;
      m.position.set(cx - _R_UP.x * (u.h * 0.45), -_R_UP.y * (u.h * 0.45) + 0.8, cz - _R_UP.z * (u.h * 0.45));
      _R_FWD.set(cam.position.x - m.position.x, 0, cam.position.z - m.position.z);
      if (_R_FWD.lengthSq() < 1e-4) _R_FWD.set(0, 0, 1);
      _R_RIGHT.crossVectors(_R_UP, _R_FWD).normalize();
      _R_FWD.crossVectors(_R_RIGHT, _R_UP).normalize();
      _R_M.makeBasis(_R_RIGHT, _R_UP, _R_FWD);
      m.quaternion.setFromRotationMatrix(_R_M);
      m.scale.x = 1 + 0.28 * Math.sin(t * 0.55 + u.ph);
    });
  };

  var _dot = null; O.softDot = function () { if (_dot) return _dot; var cv = document.createElement('canvas'); cv.width = cv.height = 32; var x = cv.getContext('2d'); var gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); _dot = new T.CanvasTexture(cv); return _dot; };
  // ── Morski sneg (delci okoli kamere, tonejo) ──
  O.makeSnow = function (n) { var pos = new Float32Array(n * 3), i; for (i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 100; pos[i * 3 + 1] = (Math.random() - 0.5) * 100; pos[i * 3 + 2] = (Math.random() - 0.5) * 100; } var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); var p = new T.Points(g, new T.PointsMaterial({ color: 0xdff0ff, size: 0.12, map: O.softDot(), transparent: true, opacity: 0.55, depthWrite: false, sizeAttenuation: true })); p.frustumCulled = false; return p; };
  O.updateSnow = function (p, cam, dt, t) { var a = p.geometry.attributes.position, cx = cam.position.x, cy = cam.position.y, cz = cam.position.z; for (var i = 0; i < a.count; i++) { var x = a.getX(i), y = a.getY(i) - dt * 0.25, z = a.getZ(i); x += Math.sin(t * 0.3 + i) * dt * 0.1; if (y < cy - 50) y += 100; if (y > cy + 50) y -= 100; if (x < cx - 50) x += 100; if (x > cx + 50) x -= 100; if (z < cz - 50) z += 100; if (z > cz + 50) z -= 100; if (y > 0) y = Math.min(y, -0.05); a.setXYZ(i, x, y, z); } a.needsUpdate = true; };

  // ── Mehurčki ──
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
    var fog = new T.Color().setRGB(0.01 + 0.08 * Lc * att.r, 0.07 + 0.32 * Lc * (0.6 + 0.4 * att.g), 0.16 + 0.42 * Lc);
    if (above) fog.setRGB(0.52 * light + 0.08, 0.70 * light + 0.12, 0.92 * light + 0.06);
    lights.sun.color.copy(above ? sunCol : sunUnder); lights.sun.intensity = above ? 0.95 + 0.65 * light : 0.18 + 0.78 * light * Math.exp(-camD / 60);
    lights.sun.position.set(sunDir.x * 400, sunDir.y * 400, sunDir.z * 400).add(new T.Vector3(cam.position.x, 0, cam.position.z));
    lights.hemi.color.copy(fog).multiplyScalar(1.6); lights.hemi.groundColor.setRGB(0.02, 0.05, 0.08); lights.hemi.intensity = 0.22 + 0.56 * light * Math.exp(-camD / 120);
    lights.amb.color.setRGB(0.1 + 0.1 * att.r, 0.18, 0.3); lights.amb.intensity = 0.2 + 0.35 * Lc + (above ? 0.3 : 0);
    var dens = above ? 0.0012 : 0.0052 + 0.019 * (1 - Lc);
    for (var k in mats) {
      var u = mats[k].userData && mats[k].userData.u; if (!u) continue;
      if (u.uSunDir) u.uSunDir.value.copy(sunDir);
      if (u.uSunCol) u.uSunCol.value.copy(sunCol);
      if (u.uLight) u.uLight.value = light;
      if (u.uAmb) u.uAmb.value.copy(fog).multiplyScalar(1.1);
      if (u.fogColor) u.fogColor.value.copy(fog);
      if (u.fogDensity) u.fogDensity.value = dens;
      if (u.uAbove) u.uAbove.value = above ? 1 : 0;
      if (u.uSky) u.uSky.value.setRGB(0.55 + 0.4 * light, 0.7 * light + 0.2, 0.9 * light + 0.1);
    }
    return { fog: fog, density: dens, sunDir: sunDir, light: light, above: above, camD: camD };
  };
  return O;
})();
