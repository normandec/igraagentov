// OCEAN ARENA v5 — proceduralna telesa živali + animacija plavanja v vertex shaderju.
// Vsaka žival = ENA zlita geometrija (telo + plavuti, barve po ogliščih: protisenčenje, vzorci) + lasten material z uniformami.
// Lokalni koordinatni sistem: +z = naprej (gobec), +y = gor, +x = desno. Dolžine v metrih (realistične).
var CR = (function () {
  var T = THREE;
  var _V = new T.Vector3(), _M = new T.Matrix4(), LOD = false;

  // ── Shader za plavanje ───────────────────────────────────────────────────
  // uMode: 0 bočno valovanje (ribe, morski psi, jegulje), 1 navpično (kiti, delfini, tjulnji), 2 zamah kril (skati),
  //        3 utrip zvona (meduze), 4 utrip plašča + valovanje lovk (glavonožci), 5 statično, 6 rak/jastog (noge + telo)
  var SWIM_PARS = [
    'uniform float uTime, uSwim, uAmp, uFreq, uLen, uMode, uPhase, uBend;',
    'attribute vec2 aBio; attribute float aSkin; varying vec2 vBio; varying float vSkin;',
    '#ifdef USE_INSTANCING', 'attribute float aPhase;', '#else', 'const float aPhase = 0.0;', '#endif'
  ].join('\n');
  var SWIM_BODY = [
    'vBio = aBio; vSkin = aSkin;',
    'float t_ = clamp(0.5 - transformed.z / uLen, 0.0, 1.0);',
    'float ph_ = uSwim + uPhase + aPhase;',
    'if (uMode < 0.5) { float w = t_ * t_; float wave = sin(ph_ - t_ * 3.2); transformed.x += uAmp * uLen * w * wave + uBend * uLen * w; float tail = max(0.0, -position.z / uLen - 0.42); transformed.x += tail * uAmp * uLen * cos(ph_ - 3.2) * 1.8; }',
    'else if (uMode < 1.5) { float w = t_ * t_; transformed.y += uAmp * uLen * w * sin(ph_ - t_ * 2.6); transformed.x += uBend * uLen * w; }',
    'else if (uMode < 2.5) { float wx = abs(transformed.x) / (uLen * 0.5); transformed.y += uAmp * uLen * wx * wx * sin(ph_ - wx * 1.6); }',
    'else if (uMode < 3.5) { float s = 1.0 + 0.14 * sin(ph_); if (transformed.y > -0.05 * uLen) { transformed.x *= s; transformed.z *= s; transformed.y *= (2.0 - s); } else { float k = -transformed.y / uLen; transformed.x += 0.08 * uLen * k * sin(ph_ * 0.6 + k * 4.0); transformed.z += 0.08 * uLen * k * cos(ph_ * 0.5 + k * 3.0); } }',
    'else if (uMode < 4.5) { if (t_ < 0.52) { float mc = 1.0 - min(0.16, uAmp * 1.4) * sin(ph_ * 1.25); transformed.x *= mc; transformed.y *= mc; } else { float k = (t_ - 0.5) * 2.0; transformed.x += uAmp * uLen * k * k * sin(ph_ + transformed.x * 2.8 - k * 5.0); transformed.y += uAmp * uLen * k * k * cos(ph_ * 0.8 + transformed.y * 2.8 - k * 4.0); } }',
    'else if (uMode > 5.5 && uMode < 6.5) { float mv = clamp(uAmp * 10.0, 0.0, 1.0); float legs = smoothstep(0.12 * uLen, 0.35 * uLen, abs(transformed.x)); transformed.y += mv * legs * 0.055 * uLen * sin(ph_ * 2.4 + transformed.z * 9.0 + sign(transformed.x) * 1.6); transformed.y += mv * 0.015 * uLen * abs(sin(ph_ * 1.2)); }',
    'else if (uMode > 6.5 && uMode < 7.5) { float wing = max(0.0, abs(position.x) / uLen - 0.28); float rear = 1.0 - smoothstep(-0.32, -0.05, position.z / uLen); transformed.y += uAmp * uLen * wing * sin(ph_ + rear * 1.1); }',
    'else if (uMode > 7.5) { float fin = smoothstep(0.07, 0.16, -position.z / uLen); transformed.x += uAmp * uLen * fin * sin(ph_ * 3.0); }'
  ].join('\n');
  function attachSwim(m, u) {
    m.userData.u = u;
    m.onBeforeCompile = function (sh) {
      for (var k in u) sh.uniforms[k] = u[k];
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + SWIM_PARS).replace('#include <begin_vertex>', '#include <begin_vertex>\n' + SWIM_BODY);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uSkin; varying vec2 vBio; varying float vSkin;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', [
        '#include <color_fragment>',
        'if (vSkin > 0.5 && uSkin > 0.5) {',
        '  if (uSkin < 1.5) {',
        '    vec2 scaleUV = vec2(vBio.x * 72.0, vBio.y * 26.0);',
        '    scaleUV.x += mod(floor(scaleUV.y), 2.0) * 0.5;',
        '    vec2 sc = abs(fract(scaleUV) - 0.5);',
        '    float edge = smoothstep(0.36, 0.49, max(sc.x, sc.y));',
        '    diffuseColor.rgb *= 1.02 - edge * 0.075;',
        '  } else if (uSkin > 2.5) {',
        '    vec2 grid = vec2(vBio.x * 28.0, vBio.y * 22.0);',
        '    grid.x += mod(floor(grid.y), 2.0) * 0.5;',
        '    float spot = 1.0 - smoothstep(0.12, 0.23, length(fract(grid) - 0.5));',
        '    float top = smoothstep(0.11, 0.22, abs(vBio.y - 0.5));',
        '    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.83, 0.9, 0.94), spot * top * 0.88);',
        '  } else {',
        '    float grain = sin(vBio.x * 813.0) * sin(vBio.y * 487.0);',
        '    diffuseColor.rgb *= 0.98 + grain * 0.025;',
        '  }',
        '}'
      ].join('\n'));
      sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\nfloat wetRim_ = pow(1.0 - max(0.0, dot(geometry.normal, geometry.viewDir)), 3.2);\nreflectedLight.indirectSpecular += vec3(0.04, 0.14, 0.22) * wetRim_;');
    };
    m.customProgramCacheKey = function () { return 'swim-v6'; };
    return m;
  }
  function swimMaterial(opts) {
    opts = opts || {};
    var m = new T.MeshPhongMaterial({ vertexColors: true, shininess: opts.shininess !== undefined ? opts.shininess : 48, specular: new T.Color(opts.specular || 0x4b6a82), side: T.DoubleSide, transparent: !!opts.transparent, opacity: opts.opacity !== undefined ? opts.opacity : 1, depthWrite: opts.depthWrite !== false });
    var u = { uTime: { value: 0 }, uSwim: { value: Math.random() * 6.28 }, uAmp: { value: 0.05 }, uFreq: { value: 4 }, uLen: { value: opts.len || 1 }, uMode: { value: opts.mode || 0 }, uPhase: { value: Math.random() * 6.28 }, uBend: { value: 0 }, uSkin: { value: opts.skin || 0 } };
    return attachSwim(m, u);
  }
  function cloneSwimMat(src) {
    var m = src.clone(), srcU = src.userData.u, u = {};
    for (var k in srcU) u[k] = { value: srcU[k].value };
    u.uSwim = { value: Math.random() * 6.28 };
    return attachSwim(m, u);
  }

  // ── Geometrijske osnove ──────────────────────────────────────────────────
  // Telo: obroči vzdolž z; prof(t) -> {rx, ry, dy} (polosi preseka in navpični zamik), col(t, ang) -> [r,g,b]  (ang: 0 = hrbet, PI = trebuh)
  function tube(len, n, m, prof, col) {
    if (LOD) { n = Math.max(6, Math.round(n * 0.45)); m = Math.max(5, Math.round(m * 0.5)); }
    var pos = [], nor = [], colr = [], bio = [], skin = [], idx = [], i, j;
    for (i = 0; i <= n; i++) {
      var t = i / n, p = prof(t), z = len * (0.5 - t), cl = Math.min(1, Math.sqrt(t / 0.03), Math.sqrt((1 - t) / 0.03)); p = { rx: p.rx * cl, ry: p.ry * cl, dy: p.dy };
      for (j = 0; j <= m; j++) {
        var a = j / m * Math.PI * 2, sx = Math.sin(a), cy = Math.cos(a);
        pos.push(sx * p.rx, cy * p.ry + (p.dy || 0), z); nor.push(sx * (p.ry || 0.01), cy * (p.rx || 0.01), 0);
        var ang = Math.acos(Math.max(-1, Math.min(1, cy))), c = col(t, ang, sx); colr.push(c[0], c[1], c[2]); bio.push(t, j / m); skin.push(1);
      }
    }
    for (i = 0; i < n; i++) for (j = 0; j < m; j++) { var a0 = i * (m + 1) + j, b0 = a0 + m + 1; idx.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1); }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new T.Float32BufferAttribute(colr, 3)); g.setAttribute('aBio', new T.Float32BufferAttribute(bio, 2)); g.setAttribute('aSkin', new T.Float32BufferAttribute(skin, 1)); g.setIndex(idx);
    g.computeVertexNormals();
    // The UV seam duplicates a vertex at each ring; weld its normals for a
    // continuous highlight without merging UVs or losing the skin pattern.
    var norm = g.attributes.normal;
    for (i = 1; i < n; i++) {
      var a = i * (m + 1), b = a + m;
      var v = new T.Vector3(norm.getX(a) + norm.getX(b), norm.getY(a) + norm.getY(b), norm.getZ(a) + norm.getZ(b)).normalize();
      norm.setXYZ(a, v.x, v.y, v.z); norm.setXYZ(b, v.x, v.y, v.z);
    }
    return g;
  }
  // Plavut: ploski lik iz 2D točk v ravnini (u,v); plane: 'xz' (vodoravno, npr. prsne), 'yz' (navpično, hrbtna/repna)
  function fin(pts, color, plane, mat) {
    var sh = new T.Shape(), i;
    if (pts.length > 3 && !LOD) {
      // Round fin edges subtly while preserving the anatomical silhouette.
      var last = pts[pts.length - 1], first = pts[0];
      sh.moveTo(first[0] * .88 + last[0] * .12, first[1] * .88 + last[1] * .12);
      for (i = 0; i < pts.length; i++) {
        var p = pts[i], next = pts[(i + 1) % pts.length];
        sh.quadraticCurveTo(p[0], p[1], p[0] * .88 + next[0] * .12, p[1] * .88 + next[1] * .12);
        sh.lineTo(next[0] * .88 + p[0] * .12, next[1] * .88 + p[1] * .12);
      }
    } else { sh.moveTo(pts[0][0], pts[0][1]); for (i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]); }
    sh.closePath();
    var g = new T.ShapeGeometry(sh, 3); // v ravnini xy: x=u, y=v
    if (plane === 'yz') g.rotateY(-Math.PI / 2); // (u,v,0) -> (0,v,u): u = z (naprej), v = y
    if (plane === 'xz') g.rotateX(-Math.PI / 2); // u = x, v -> -z ; želimo v = z
    if (plane === 'xz') g.scale(1, 1, -1);
    paint(g, color); if (mat) g.applyMatrix4(mat); return g;
  }
  function paint(g, color) { var c = new T.Color(color), n = g.attributes.position.count, arr = new Float32Array(n * 3); for (var i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; } g.setAttribute('color', new T.BufferAttribute(arr, 3)); return g; }
  function merge(list) { // vse v ne-indeksirano in zlij (position, normal, color)
    var P = [], N = [], C = [], B = [], S = [];
    list.forEach(function (g) { if (!g) return; var q = g.index ? g.toNonIndexed() : g; if (!q.attributes.normal) q.computeVertexNormals(); if (!q.attributes.color) paint(q, 0x888888); var p = q.attributes.position.array, n = q.attributes.normal.array, c = q.attributes.color.array, b = q.attributes.aBio, sk = q.attributes.aSkin; for (var i = 0; i < p.length; i++) { P.push(p[i]); N.push(n[i]); C.push(c[i]); } for (i = 0; i < p.length / 3; i++) { B.push(b ? b.getX(i) : 0, b ? b.getY(i) : 0); S.push(sk ? sk.getX(i) : 0); } });
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); g.setAttribute('color', new T.Float32BufferAttribute(C, 3)); g.setAttribute('aBio', new T.Float32BufferAttribute(B, 2)); g.setAttribute('aSkin', new T.Float32BufferAttribute(S, 1)); return g;
  }
  function mat4(x, y, z, rx, ry, rz, s) { var m = new T.Matrix4(); m.compose(new T.Vector3(x || 0, y || 0, z || 0), new T.Quaternion().setFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0)), new T.Vector3(s || 1, s || 1, s || 1)); return m; }
  function sphere(r, color, x, y, z, sx, sy, sz) { var g = new T.SphereGeometry(r, 10, 8); g.scale(sx || 1, sy || 1, sz || 1); g.translate(x || 0, y || 0, z || 0); return paint(g, color); }
  function sphereLo(r, color, x, y, z) { var g = new T.SphereGeometry(r, 7, 5); g.translate(x || 0, y || 0, z || 0); return paint(g, color); }
  function eye(len, x, y, z, r, irisColor) { if (LOD) return []; r = r || len * 0.03; var side = x > 0 ? 1 : -1; var iris = sphereLo(r, irisColor === undefined ? 0x705b3e : irisColor, x, y, z), pupil = sphereLo(r * 0.72, 0x05090d, x + side * r * 0.58, y, z + r * 0.08), glint = sphereLo(r * 0.18, 0xd9eff2, x + side * r * 1.06, y + r * 0.26, z + r * 0.27); return [iris, pupil, glint]; }
  function on(prof, L, t, fx, fy) { var p = prof(t); return { x: p.rx * (fx === undefined ? 0.92 : fx), y: p.ry * (fy === undefined ? 0.3 : fy) + (p.dy || 0), z: L * (0.5 - t) }; }
  function eyes(prof, L, t, r, fy, irisColor) { var e = on(prof, L, t, 0.9, fy); return eye(L, e.x, e.y, e.z, r, irisColor).concat(eye(L, -e.x, e.y, e.z, r, irisColor)); }
  // Subtle operculum contours give bony fish an anatomical gill cover.
  function gillCovers(prof, L, baseColor) {
    if (LOD) return [];
    var color = new T.Color(baseColor).multiplyScalar(.65), parts = [];
    [-1, 1].forEach(function (side) {
      var pts = [];
      for (var i = 0; i <= 10; i++) {
        var a = -.95 + i * .19, t = .235 + .025 * Math.cos(a * 1.6), p = prof(t);
        pts.push(new T.Vector3(side * p.rx * Math.cos(a) * 1.008, p.dy + p.ry * Math.sin(a), L * (.5 - t)));
      }
      parts.push(paint(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 14, L * .0015, 4, false), color));
    });
    return parts;
  }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgb(hex) { var c = new T.Color(hex); return [c.r, c.g, c.b]; }
  // protisenčenje: hrbet temen, bok, trebuh svetel + opcijski vzorec
  function shade(dorsal, ventral, pattern) { var D = rgb(dorsal), Vv = rgb(ventral); return function (t, ang, sx) { var k = Math.pow(ang / Math.PI, 1.6), c = mix(D, Vv, k); if (pattern) c = pattern(c, t, ang, sx) || c; return c; }; }
  function clownPattern(c, t) {
    var d = Math.min(Math.abs(t - .15), Math.abs(t - .48), Math.abs(t - .78));
    if (d < .032) return mix(c, [0.96, 0.97, 0.94], 1);
    if (d < .05) return mix(c, [0.09, 0.09, 0.08], .9);
    return c;
  }
  function stripes(color, n, width, only) { var S = rgb(color); return function (c, t, ang) { if (only === 'top' && ang > 1.9) return c; var v = Math.sin(t * n * Math.PI * 2); return v > 1 - width ? mix(c, S, 0.8) : c; }; }
  function spots(color, dens, seed) { var S = rgb(color); return function (c, t, ang, sx) { var h = Math.sin(t * 73.1 * dens + ang * 41.7 + seed) * Math.cos(t * 19.3 - ang * 23.1); return h > 0.75 ? mix(c, S, 0.85) : c; }; }

  // ── Profili teles ────────────────────────────────────────────────────────
  // t: 0 gobec … 1 rep. Vrne rx, ry (polosi), dy (zamik gor/dol)
  function rel(prof, L) { return function (t) { var p = prof(t); return { rx: p.rx * L, ry: p.ry * L, dy: (p.dy || 0) * L }; }; }
  function fusiform(h, w, bluntNose) { return function (t) { var a = Math.sin(Math.pow(t, bluntNose ? 0.55 : 0.75) * Math.PI); var r = Math.max(0.004, Math.pow(Math.max(0, a), 0.8)); return { rx: r * w, ry: r * h, dy: 0 }; }; }
  function sharkProf(t) { var a = Math.sin(Math.pow(t, 0.62) * Math.PI); var r = Math.max(0.004, Math.pow(Math.max(0, a), 0.82)); if (t < 0.12) r *= 0.75 + 2 * t; return { rx: r * 0.085, ry: r * 0.095, dy: -r * 0.01 }; }
  function whaleSharkProf(t) {
    var p = sharkProf(t), head = Math.max(0, 1 - t / .38);
    p.rx *= 1.05 + head * 1.1; p.ry *= 1.0 - head * .42;
    return p;
  }
  function whaleProf(t) { var a = Math.sin(Math.pow(t, 0.5) * Math.PI); var tail = t > 0.7 ? 0.2 + 0.8 * (1 - (t - 0.7) / 0.3) : 1; var r = Math.max(0.004, a * tail); if (t < 0.25) r = Math.max(r, 0.55 + 0.4 * t); return { rx: r * 0.11, ry: r * 0.125, dy: t < 0.35 ? -r * 0.02 : r * 0.01 }; }
  function dolphinProf(t) { var a = Math.sin(Math.pow(t, 0.6) * Math.PI); var tail = t > 0.8 ? 0.2 + 0.8 * (1 - (t - 0.8) / 0.2) : 1; var r = Math.max(0.004, a * tail); if (t < 0.08) r *= 0.35 + 7 * t; return { rx: r * 0.085, ry: r * 0.09, dy: 0 }; }
  function eelProf(t) { var r = t < 0.06 ? t / 0.06 : t > 0.75 ? (1 - t) / 0.25 : 1; r = Math.max(0.004, Math.pow(r, 0.5)); return { rx: r * 0.028, ry: r * 0.036, dy: 0 }; }
  function roundProf(t) { var a = Math.sin(Math.pow(t, 0.9) * Math.PI); var tail = t > 0.85 ? 0.3 + 0.7 * (1 - (t - 0.85) / 0.15) : 1; var r = Math.max(0.004, a * tail); return { rx: r * 0.32, ry: r * 0.34, dy: 0 }; }
  function tallProf(t) { var a = Math.sin(Math.pow(t, 0.7) * Math.PI); var r = Math.max(0.004, a); return { rx: r * 0.07, ry: r * 0.45, dy: 0 }; }

  // ── Plavuti (standardni kompleti) ────────────────────────────────────────
  function caudalForked(L, c, deep) { var k = deep ? 0.26 : 0.18; return fin([[-L * 0.48, 0], [-L * 0.5 - L * k, L * k * 1.1], [-L * 0.5 - L * k * 0.55, 0], [-L * 0.5 - L * k, -L * k * 1.1]], c, 'yz'); }
  function caudalRound(L, c) { return fin([[-L * 0.48, 0.02 * L], [-L * 0.56, 0.1 * L], [-L * 0.64, 0.06 * L], [-L * 0.66, 0], [-L * 0.64, -0.06 * L], [-L * 0.56, -0.1 * L], [-L * 0.48, -0.02 * L]], c, 'yz'); }
  function caudalShark(L, c) { return fin([[-L * 0.47, 0.01 * L], [-L * 0.56, 0.11 * L], [-L * 0.68, 0.2 * L], [-L * 0.7, 0.17 * L], [-L * 0.6, 0.02 * L], [-L * 0.64, -0.06 * L], [-L * 0.58, -0.07 * L], [-L * 0.5, -0.01 * L]], c, 'yz'); }
  function flukes(L, c, wide) { var w = (wide ? 0.17 : 0.13) * L; return fin([[-w, -L * 0.5 - 0.06 * L], [-w * 0.2, -L * 0.48], [w * 0.2, -L * 0.48], [w, -L * 0.5 - 0.06 * L], [w * 0.6, -L * 0.5 - 0.075 * L], [0, -L * 0.5 - 0.045 * L], [-w * 0.6, -L * 0.5 - 0.075 * L]], c, 'xz'); }
  function dorsal(L, c, z0, h, w, swept) { return fin([[z0, 0], [z0 + w * .08, h * .3], [z0 - (swept ? w * .3 : 0), h * .95], [z0 - w * .42, h], [z0 - w * .65, h * .52], [z0 - w, h * .12], [z0 - w, 0]], c, 'yz', mat4(0, L * 0.07, 0)); }
  function pectoral(L, c, z0, len, w, y, up) { var l = fin([[0, 0], [len * 0.55, -len * 0.35], [len, -len * 0.65], [len * 0.8, -len * 0.75], [len * 0.25, -len * 0.35]], c, 'xz', mat4(w, y, z0, up || 0, 0, -0.35)), r = fin([[0, 0], [-len * 0.55, -len * 0.35], [-len, -len * 0.65], [-len * 0.8, -len * 0.75], [-len * 0.25, -len * 0.35]], c, 'xz', mat4(-w, y, z0, up || 0, 0, 0.35)); return [l, r]; }
  function anal(L, c, z0, h, w) { return fin([[z0, 0], [z0 - w * 0.3, -h], [z0 - w, -h * 0.3], [z0 - w, 0]], c, 'yz', mat4(0, -L * 0.05, 0)); }

  function turtlePaddle(L, side, front, color) {
    var length = L * (front ? .58 : .31), width = L * (front ? .12 : .085);
    var g = tube(length, 18, 10, function (t) {
      var r = Math.pow(Math.sin(Math.PI * t), .65) * (0.65 + .35 * t);
      return { rx: width * r, ry: L * .025 * r, dy: 0 };
    }, function (t, ang) {
      var base = rgb(color), grain = .05 * Math.sin(t * 38 + ang * 8);
      return [Math.max(0,base[0]+grain),Math.max(0,base[1]+grain),Math.max(0,base[2]+grain)];
    });
    g.translate(0, 0, length * .5);
    var dx = side * (front ? .92 : .8), dz = front ? -.38 : -.65;
    g.rotateY(Math.atan2(dx,dz));
    g.translate(side * L * (front ? .25 : .24), -L*.01, front ? L*.24 : -L*.27);
    return g;
  }

  // ── Graditelji ───────────────────────────────────────────────────────────
  function build(name, L, opts) {
    opts = opts || {}; LOD = !!opts.lod; var parts = [], g, i, c = opts.colors || {}, D = c.dorsal || 0x3a5a7a, Vt = c.ventral || 0xcfd8dc, F = c.fin || D, mode = 0, shin = 30, spec = 0x334455;
    var pat = opts.pattern || null, col = shade(D, Vt, pat);
    switch (opts.shape) {
      case 'shark': {
        shin = 24; spec = 0x1d2930;
        var sharkShape = opts.whaleShark ? whaleSharkProf : sharkProf;
        parts.push(tube(L, 40, 24, rel(sharkShape, L), col));
        if (opts.whaleShark) {
          // Broad, flattened terminal mouth and snout, unlike a pointed hunting shark.
          parts.push(sphere(L * .09, D, 0, -L * .012, L * .41, 1.65, .42, 1.1));
          parts.push(fin([[-L*.12,0],[0,-L*.008],[L*.12,0],[L*.1,-L*.012],[-L*.1,-L*.012]], 0x18212a, 'xz', mat4(0, -L*.048, L*.48)));
        }
        if (opts.goblin) {
          // Flattened, projecting rostrum characteristic of the goblin shark.
          var snout = tube(L * .25, 10, 10, function (t) { var r = .025 * (1 - t * .8); return { rx: L*r, ry: L*r*.4, dy: 0 }; }, col);
          snout.rotateY(Math.PI); snout.translate(0, L * .008, L * .59); parts.push(snout);
        }
        if (opts.thresher) {
          parts.push(fin([[-L * 0.46, 0.02 * L], [-L * 0.62, 0.16 * L], [-L * 0.98, 0.34 * L], [-L * 1.02, 0.30 * L], [-L * 0.64, 0.03 * L], [-L * 0.64, -0.06 * L], [-L * 0.56, -0.06 * L], [-L * 0.49, -0.01 * L]], F, 'yz'));
        } else {
          parts.push(caudalShark(L, F));
        }
        parts.push(dorsal(L, F, L * 0.05, L * 0.16, L * 0.16, true)); parts.push(dorsal(L, F, -L * 0.3, L * 0.05, L * 0.06, true));
        parts.push.apply(parts, pectoral(L, F, L * 0.15, L * 0.22, L * 0.06, -L * 0.02, 0.15)); parts.push(anal(L, F, -L * 0.3, L * 0.04, L * 0.05));
        if (opts.hammer) { var hm = tube(L * 0.08, 4, 10, function (t) { return { rx: L * 0.21 * Math.sin(t * Math.PI) + 0.01, ry: L * 0.022, dy: 0 }; }, col); hm.rotateY(Math.PI / 2); hm.translate(0, 0, L * 0.47); parts.push(hm); parts.push.apply(parts, eye(L, L * 0.2, 0, L * 0.47, L * 0.014)); parts.push.apply(parts, eye(L, -L * 0.2, 0, L * 0.47, L * 0.014)); }
        else parts.push.apply(parts, eyes(rel(sharkShape, L), L, 0.13, L * 0.012, 0.35, 0x171e21));
        // škrge
        for (i = 0; i < 5; i++) { var gp = on(rel(sharkShape, L), L, 0.28 + i * 0.02, 1.01, 0), gl = fin([[0, 0], [0.01 * L, 0.04 * L], [0.012 * L, 0.04 * L], [0.004 * L, 0]], 0x222a33, 'yz', mat4(gp.x, gp.y - L * 0.01, gp.z)); parts.push(gl); var gr = gl.clone(); gr.translate(-2 * gp.x, 0, 0); parts.push(gr); }
        if (!LOD && !opts.whaleShark && !opts.hammer) {
          [-1, 1].forEach(function (side) {
            var jaw = [];
            for (var j = 0; j <= 14; j++) {
              var t = .045 + j * .012, p = rel(sharkShape, L)(t), v = -.63 + .12 * Math.sin(j / 14 * Math.PI);
              jaw.push(new T.Vector3(side * p.rx * Math.sqrt(1-v*v) * 1.015, p.dy + p.ry * v, L*(.5-t)));
            }
            parts.push(paint(new T.TubeGeometry(new T.CatmullRomCurve3(jaw), 18, L*.0018, 4, false), 0x222528));
          });
        }
        var mp = on(rel(sharkShape, L), L, 0.1, 0, -0.95), mouth = fin([[-L * 0.03, 0], [0, L * 0.06], [L * 0.03, 0]], 0x1a0f10, 'xz', mat4(0, mp.y, mp.z - L * 0.03)); parts.push(mouth);
        break;
      }
      case 'orca': case 'dolphin': case 'seal': {
        mode = 1; var isOrca = opts.shape === 'orca';
        parts.push(tube(L, 28, 16, rel(dolphinProf, L), col)); parts.push(flukes(L, F, isOrca));
        parts.push(dorsal(L, F, L * 0.02, isOrca ? L * 0.2 : L * 0.08, isOrca ? L * 0.14 : L * 0.09, !isOrca));
        parts.push.apply(parts, pectoral(L, F, L * 0.2, isOrca ? L * 0.16 : L * 0.12, L * 0.06, -L * 0.03, 0.3));
        parts.push.apply(parts, eyes(rel(dolphinProf, L), L, 0.14, L * 0.011, 0.25));
        if (isOrca) { var ep = on(rel(dolphinProf, L), L, 0.17, 0.95, 0.45), sp6 = on(rel(dolphinProf, L), L, 0.62, 0, 0.98); parts.push(sphere(L * 0.03, 0xf4f4f4, ep.x, ep.y, ep.z, 1.6, 0.9, 1.1)); parts.push(sphere(L * 0.03, 0xf4f4f4, -ep.x, ep.y, ep.z, 1.6, 0.9, 1.1)); parts.push(sphere(L * 0.06, 0xd8d8e0, 0, sp6.y, sp6.z, 1.2, 0.3, 1)); }
        if (opts.shape === 'dolphin') { parts.push(sphere(L * .04, D, 0, -L * .015, L * .47, .7, .5, 2.25)); }
        break;
      }
      case 'whale': {
        mode = 1; shin = 14; spec = 0x0e1216;
        parts.push(tube(L, 36, 18, rel(whaleProf, L), function (t, ang, sx) { var cc = col(t, ang, sx); var mot = Math.sin(t * 57 + ang * 9) * Math.cos(t * 23 - ang * 5); if (mot > 0.55) cc = mix(cc, [0.45, 0.5, 0.52], 0.25); if (ang > 2.2 && t > 0.2 && t < 0.62) { var v = Math.sin(sx * 40); cc = v > 0.3 ? mix(cc, [0.55, 0.58, 0.6], 0.5) : cc; } return cc; }));
        parts.push(flukes(L, F, true));
        parts.push(dorsal(L, F, -L * 0.17, L * 0.035, L * 0.07, true)); // grba
        // dolga prsna plavut grbavca (1/3 telesa)
        var fl = fin([[0, 0], [L * 0.12, -L * 0.1], [L * 0.3, -L * 0.22], [L * 0.33, -L * 0.2], [L * 0.2, -L * 0.03]], 0xdfe6ea, 'xz', mat4(L * 0.09, -L * 0.05, L * 0.18, 0.1, 0, -0.5)); parts.push(fl);
        var fr = fin([[0, 0], [-L * 0.12, -L * 0.1], [-L * 0.3, -L * 0.22], [-L * 0.33, -L * 0.2], [-L * 0.2, -L * 0.03]], 0xdfe6ea, 'xz', mat4(-L * 0.09, -L * 0.05, L * 0.18, 0.1, 0, 0.5)); parts.push(fr);
        for (i = 0; i < 14; i++) { var kt = 0.03 + (i % 5) * 0.035, kp = on(rel(whaleProf, L), L, kt, 0, 0.98), kx = Math.sin(i * 2.3) * 0.5 * whaleProf(kt).rx; parts.push(sphere(L * 0.009, 0x2a3238, kx, kp.y - Math.abs(kx) * 0.5, kp.z)); }
        parts.push.apply(parts, eyes(rel(whaleProf, L), L, 0.2, L * 0.008, -0.25));
        var bh = on(rel(whaleProf, L), L, 0.32, 0, 0.98); parts.push(sphere(L * 0.012, 0x1a2228, 0, bh.y, bh.z, 1.4, 0.5, 1)); // dihalnica
        break;
      }
      case 'eel': {
        parts.push(tube(L, 40, 10, rel(eelProf, L), col));
        parts.push(fin([[L * 0.2, 0], [L * 0.1, L * 0.03], [-L * 0.2, L * 0.035], [-L * 0.45, L * 0.03], [-L * 0.5, 0], [-L * 0.45, -L * 0.025], [-L * 0.2, -L * 0.03], [L * 0.05, -L * 0.02]], F, 'yz'));
        parts.push.apply(parts, eyes(rel(eelProf, L), L, 0.05, L * 0.007, 0.3));
        if (opts.mouth) parts.push(fin([[0, 0], [L * 0.07, -L * 0.03], [L * 0.0, -L * 0.012]], 0x200a0a, 'yz', mat4(0, -L * 0.01, L * 0.44)));
        break;
      }
      case 'ray': {
        mode = 2; var span = L, bodyL = L * 0.75;
        var disc = new T.PlaneGeometry(span, bodyL, 22, 14); disc.rotateX(-Math.PI / 2); // v xz, y gor
        var dp = disc.attributes.position, dc = new Float32Array(dp.count * 3), Dr = rgb(D), Vr = rgb(Vt);
        for (i = 0; i < dp.count; i++) { var x = dp.getX(i), z = dp.getZ(i); var u = Math.abs(x) / (span / 2), v = z / (bodyL / 2); var zf = v > 0 ? 1 - v * v : 1 - Math.abs(v) * 0.6; var keep = Math.max(0, zf - u) ; var thick = Math.max(0, 0.06 * L * (1 - u) * (1 - Math.abs(v) * 0.5)); dp.setX(i, x * zf); dp.setY(i, thick); var cc = Dr; if (pat) cc = pat(Dr, 0.5 + v * 0.5, 0.3, x / span) || Dr; dc[i * 3] = cc[0]; dc[i * 3 + 1] = cc[1]; dc[i * 3 + 2] = cc[2]; }
        disc.setAttribute('color', new T.BufferAttribute(dc, 3)); disc.computeVertexNormals(); parts.push(disc);
        var under = disc.clone(); var up2 = under.attributes.position; for (i = 0; i < up2.count; i++) up2.setY(i, -up2.getY(i) * 0.6); paint(under, Vt); under.computeVertexNormals(); parts.push(under);
        var tl = tube(L * 1.1, 6, 6, function (t) { var r = 0.012 * (1 - t); return { rx: r * L, ry: r * L, dy: 0 }; }, function () { return Dr; }); tl.translate(0, 0, -bodyL * 0.4 - L * 0.55); parts.push(tl);
        if (opts.manta) { parts.push(tube(L * 0.1, 4, 6, function (t) { return { rx: L * 0.012, ry: L * 0.03, dy: 0 }; }, function () { return Dr; }).translate(L * 0.08, 0, bodyL * 0.5)); parts.push(tube(L * 0.1, 4, 6, function (t) { return { rx: L * 0.012, ry: L * 0.03, dy: 0 }; }, function () { return Dr; }).translate(-L * 0.08, 0, bodyL * 0.5)); }
        parts.push.apply(parts, eye(L, L * 0.05, L * 0.03, bodyL * 0.35, L * 0.012)); parts.push.apply(parts, eye(L, -L * 0.05, L * 0.03, bodyL * 0.35, L * 0.012));
        break;
      }
      case 'squid': {
        mode = 4; shin = opts.giant ? 35 : 60; spec = 0x8899aa;
        var Sq = rgb(c.dorsal || 0xd9a8a0), Sw = rgb(c.ventral || 0xf2e2dc), gMul = opts.giant ? 1.15 : 1.0;
        parts.push(tube(L * 0.52, opts.giant ? 24 : 16, 12, function (t) { var r = t < 0.88 ? Math.sin(Math.pow(t, 0.58) * Math.PI * 0.5) : 1 - (t - 0.88) * 3.5; return { rx: Math.max(0.004, r) * L * 0.08 * gMul, ry: Math.max(0.004, r) * L * 0.085 * gMul, dy: 0 }; }, function (t, ang) { var cc = mix(Sq, Sw, ang / Math.PI * 0.75); var h = Math.sin(t * 60 + ang * 30) * Math.cos(t * 37 - ang * 17); return h > 0.55 ? mix(cc, [0.45, 0.1, 0.14], 0.7) : cc; }).translate(0, 0, L * 0.24));
        parts.push(fin([[0, L * 0.5], [L * 0.13 * gMul, L * 0.28], [L * 0.07 * gMul, L * 0.08], [0, L * 0.08]], c.dorsal || 0xd9a8a0, 'xz'));
        parts.push(fin([[0, L * 0.5], [-L * 0.13 * gMul, L * 0.28], [-L * 0.07 * gMul, L * 0.08], [0, L * 0.08]], c.dorsal || 0xd9a8a0, 'xz'));
        parts.push(sphere(L * 0.075 * gMul, c.dorsal || 0xe8d8d0, 0, 0, -L * 0.06, 1.15, 1, 1.1));
        parts.push.apply(parts, eye(L, L * 0.07 * gMul, 0, -L * 0.05, L * (opts.giant ? 0.042 : 0.03)));
        parts.push.apply(parts, eye(L, -L * 0.07 * gMul, 0, -L * 0.05, L * (opts.giant ? 0.042 : 0.03)));
        for (i = 0; i < 8; i++) { var aa = i / 8 * Math.PI * 2, armL = L * (opts.giant ? 0.42 : 0.32), ar = tube(armL, 12, 5, function (t) { var r = (opts.giant ? 0.022 : 0.016) * (1 - t * 0.8); return { rx: r * L, ry: r * L, dy: 0 }; }, function () { return Sq; }); ar.translate(0, 0, -armL * 0.5); ar.applyMatrix4(mat4(Math.cos(aa) * L * 0.04, Math.sin(aa) * L * 0.04, -L * 0.09, Math.sin(aa) * 0.14, -Math.cos(aa) * 0.14, 0)); parts.push(ar); }
        for (i = 0; i < 2; i++) { var tLen = L * (opts.giant ? 0.82 : 0.5), tn = tube(tLen, 12, 4, function (t) { var r = (opts.giant ? 0.014 : 0.01) * (t > 0.82 ? 2.5 : 1); return { rx: r * L, ry: r * L, dy: 0 }; }, function () { return Sw; }); tn.translate(0, 0, -tLen * 0.5); tn.applyMatrix4(mat4((i ? 1 : -1) * L * 0.028, 0, -L * 0.09)); parts.push(tn); }
        break;
      }
      case 'octopus': {
        mode = 4; shin = 15; var Oc = rgb(c.dorsal || 0xa8603a), Ow = rgb(c.ventral || 0xd8b090);
        parts.push(tube(L * 0.4, 14, 12, function (t) { var r = Math.sin(Math.pow(t, 0.8) * Math.PI); return { rx: Math.max(0.004, r) * L * 0.14, ry: Math.max(0.004, r) * L * 0.15, dy: L * 0.02 }; }, function (t, ang) { var cc = mix(Oc, Ow, ang / Math.PI * 0.6); return Math.sin(t * 50 + ang * 20) > 0.7 ? mix(cc, [0.4, 0.2, 0.12], 0.6) : cc; }).translate(0, L * 0.12, L * 0.05));
        parts.push.apply(parts, eye(L, L * 0.09, L * 0.17, L * 0.12, L * 0.025)); parts.push.apply(parts, eye(L, -L * 0.09, L * 0.17, L * 0.12, L * 0.025));
        for (i = 0; i < 8; i++) { var oa = (i + 0.5) / 8 * Math.PI * 2, arm = tube(L * 0.55, 14, 6, function (t) { var r = 0.03 * (1 - t * 0.9); return { rx: r * L, ry: r * L * 0.8, dy: 0 }; }, function (t, ang) { return ang > 2 ? Ow : Oc; }); arm.translate(0, 0, -L * 0.27); var ax = Math.cos(oa), az = Math.sin(oa); arm.applyMatrix4(new T.Matrix4().makeRotationY(Math.atan2(-ax, -az))); arm.applyMatrix4(mat4(ax * L * 0.06, L * 0.03, az * L * 0.06 + L * 0.02, 0, 0, 0)); var ap = arm.attributes.position; for (var k = 0; k < ap.count; k++) { var px = ap.getX(k), pz = ap.getZ(k), rr = Math.hypot(px, pz) / L; ap.setY(k, ap.getY(k) + Math.sin(rr * 5) * L * 0.05 * (1 - rr)); } arm.computeVertexNormals(); parts.push(arm); }
        break;
      }
      case 'cuttlefish': {
        mode = 4; shin = 40; var Cu = rgb(c.dorsal || 0x8f7a60), Cw = rgb(c.ventral || 0xe0d4c0);
        parts.push(tube(L * 0.7, 16, 12, function (t) { var r = Math.sin(Math.pow(t, 0.7) * Math.PI); return { rx: Math.max(0.004, r) * L * 0.2, ry: Math.max(0.004, r) * L * 0.12, dy: 0 }; }, function (t, ang) { var cc = mix(Cu, Cw, ang / Math.PI); return Math.sin(t * 40) > 0.4 && ang < 1.6 ? mix(cc, [0.35, 0.25, 0.2], 0.6) : cc; }).translate(0, 0, L * 0.1));
        parts.push(fin([[0, L * 0.44], [L * 0.27, L * 0.3], [L * 0.28, -L * 0.15], [0, -L * 0.24], [-L * 0.28, -L * 0.15], [-L * 0.27, L * 0.3]], c.ventral || 0xe0d4c0, 'xz'));
        parts.push.apply(parts, eye(L, L * 0.12, L * 0.04, -L * 0.2, L * 0.035)); parts.push.apply(parts, eye(L, -L * 0.12, L * 0.04, -L * 0.2, L * 0.035));
        for (i = 0; i < 8; i++) { var ca = i / 8 * Math.PI * 2, carm = tube(L * 0.25, 6, 4, function (t) { return { rx: 0.02 * L * (1 - t * 0.7), ry: 0.02 * L * (1 - t * 0.7), dy: 0 }; }, function () { return Cw; }); carm.translate(0, 0, -L * 0.12); carm.applyMatrix4(mat4(Math.cos(ca) * L * 0.06, Math.sin(ca) * L * 0.04, -L * 0.25)); parts.push(carm); }
        break;
      }
      case 'jelly': {
        mode = 3; shin = 80; spec = 0xffffff;
        var J = rgb(c.dorsal || 0xffb6d6);
        var bell = new T.SphereGeometry(L * 0.5, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55); bell.scale(1, 0.75, 1); paint(bell, c.dorsal || 0xffb6d6); parts.push(bell);
        var rim = new T.TorusGeometry(L * 0.46, L * 0.03, 6, 20); rim.rotateX(Math.PI / 2); rim.translate(0, -L * 0.02, 0); paint(rim, c.fin || 0xff8fc0); parts.push(rim);
        for (i = 0; i < 4; i++) { var oa2 = i / 4 * Math.PI * 2, oarm = tube(L * 1.3, 10, 5, function (t) { var r = 0.06 * (1 - t * 0.6) * (1 + 0.5 * Math.sin(t * 20)); return { rx: r * L, ry: r * L * 0.4, dy: 0 }; }, function () { return mix(J, [1, 1, 1], 0.3); }); oarm.rotateX(Math.PI / 2); oarm.translate(Math.cos(oa2) * L * 0.1, -L * 0.67, Math.sin(oa2) * L * 0.1); parts.push(oarm); }
        for (i = 0; i < 16; i++) { var ta = i / 16 * Math.PI * 2, tt = tube(L * 2.2, 8, 3, function () { return { rx: L * 0.006, ry: L * 0.006, dy: 0 }; }, function () { return J; }); tt.rotateX(Math.PI / 2); tt.translate(Math.cos(ta) * L * 0.44, -L * 1.12, Math.sin(ta) * L * 0.44); parts.push(tt); }
        break;
      }
      case 'turtle': {
        mode = 7; shin = 16; var Sh = rgb(c.dorsal || 0x5a6b3a), Sl = rgb(c.ventral || 0xd8c89a), Sk = c.fin || 0x7a8a50;
        // A high-resolution carapace with individual scutes, not a single green dome.
        var shell = new T.SphereGeometry(L * 0.42, LOD ? 18 : 72, LOD ? 12 : 48, 0, Math.PI * 2, 0, Math.PI * 0.5);
        shell.scale(0.85, 0.5, 1);
        var sp2 = shell.attributes.position, scol = new Float32Array(sp2.count * 3), centers = [];
        for (var row = -2; row <= 2; row++) {
          centers.push([0, row * .15]);
          centers.push([-.19, row * .15 + .06]); centers.push([.19, row * .15 + .06]);
        }
        for (i = 0; i < sp2.count; i++) {
          var hx = sp2.getX(i) / L, hz = sp2.getZ(i) / L, near = 10, second = 10, cellId = 0;
          for (var ci = 0; ci < centers.length; ci++) {
            var dx = (hx - centers[ci][0]) * 1.05, dz = (hz - centers[ci][1]) * 1.25, dd = dx * dx + dz * dz;
            if (dd < near) { second = near; near = dd; cellId = ci; } else if (dd < second) second = dd;
          }
          var seam = Math.max(0, 1 - (second - near) / .006);
          var variation = .12 + .16 * (.5 + .5 * Math.sin(cellId * 2.7));
          var cc = mix(Sh, [0.66, 0.53, 0.28], variation + .14 * Math.max(0, 1 - near * 95));
          cc = mix(cc, [0.11, 0.15, 0.085], seam * .7);
          scol[i * 3] = cc[0]; scol[i * 3 + 1] = cc[1]; scol[i * 3 + 2] = cc[2];
        }
        shell.setAttribute('color', new T.BufferAttribute(scol, 3)); shell.computeVertexNormals(); parts.push(shell);
        var plast = new T.SphereGeometry(L * 0.4, 12, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5); plast.scale(0.8, 0.2, 0.95); paint(plast, c.ventral || 0xd8c89a); parts.push(plast);
        parts.push(tube(L * 0.3, 6, 8, function (t) { var r = Math.sin(Math.pow(t, 0.6) * Math.PI); return { rx: Math.max(0.01, r) * L * 0.07, ry: Math.max(0.01, r) * L * 0.07, dy: 0 }; }, function () { return rgb(Sk); }).translate(0, L * 0.02, L * 0.5));
        parts.push.apply(parts, eye(L, L * 0.045, L * 0.045, L * 0.55, L * 0.012)); parts.push.apply(parts, eye(L, -L * 0.045, L * 0.045, L * 0.55, L * 0.012));
        parts.push(turtlePaddle(L, 1, true, Sk)); parts.push(turtlePaddle(L, -1, true, Sk));
        parts.push(turtlePaddle(L, 1, false, Sk)); parts.push(turtlePaddle(L, -1, false, Sk));
        break;
      }
      case 'crab': {
        mode = 6; shin = 20; var Cr = rgb(D), Cf = rgb(c.fin || D), isLob = opts.lobster;
        if (isLob) { parts.push(tube(L, 14, 10, function (t) { var r = t < 0.45 ? 1 : 1 - (t - 0.45) * 1.1; return { rx: r * L * 0.1, ry: r * L * 0.09, dy: 0 }; }, col)); parts.push(fin([[-L * 0.5, 0], [-L * 0.62, L * 0.09], [-L * 0.66, 0], [-L * 0.62, -L * 0.09]], D, 'xz')); }
        else { var car = new T.SphereGeometry(L * 0.5, 12, 8); car.scale(1, 0.35, 0.7); paint(car, D); parts.push(car); }
        for (i = 0; i < 4; i++) { [-1, 1].forEach(function (sg) { var leg = tube(L * 0.58, 4, 4, function (t) { return { rx: L * 0.025 * (1 - t * 0.7), ry: L * 0.025 * (1 - t * 0.7), dy: 0 }; }, function () { return Cr; }); leg.translate(0, 0, L * 0.27); leg.applyMatrix4(mat4(sg * L * 0.3, -L * 0.02, (isLob ? L * 0.25 : L * 0.2) - i * L * 0.14, -0.5, sg * (1.3 + i * 0.25), 0)); parts.push(leg); }); }
        [-1, 1].forEach(function (sg) { var cl = tube(L * 0.5, 6, 6, function (t) { var r = t < 0.5 ? 0.04 : 0.08 * (1 - (t - 0.5)); return { rx: r * L, ry: r * L * 0.7, dy: 0 }; }, function () { return Cf; }); cl.translate(0, 0, -L * 0.1); cl.applyMatrix4(mat4(sg * L * 0.3, 0, L * 0.3, 0, sg * 0.5, 0)); parts.push(cl); });
        parts.push.apply(parts, eye(L, L * 0.12, L * 0.08, L * 0.32, L * 0.03)); parts.push.apply(parts, eye(L, -L * 0.12, L * 0.08, L * 0.32, L * 0.03));
        for (i = 0; i < 2; i++) { var ant = tube(L * 0.9, 4, 3, function () { return { rx: L * 0.006, ry: L * 0.006, dy: 0 }; }, function () { return Cr; }); ant.applyMatrix4(mat4((i ? 1 : -1) * L * 0.08, L * 0.05, L * 0.75, -0.3, (i ? 1 : -1) * 0.5, 0)); parts.push(ant); }
        break;
      }
      case 'nautilus': {
        mode = 4; shin = 45; var Nt = rgb(c.dorsal || 0xe8d0b0), Ns = rgb(c.fin || 0xa04a2a);
        var coil = new T.TorusGeometry(L * 0.28, L * 0.18, 10, 18); coil.rotateY(Math.PI / 2); coil.translate(0, L * 0.08, 0);
        var cp = coil.attributes.position, cc3 = new Float32Array(cp.count * 3);
        for (i = 0; i < cp.count; i++) { var ang3 = Math.atan2(cp.getY(i), cp.getZ(i)); var st3 = Math.sin(ang3 * 12) > 0.2 ? 1 : 0; var mc3 = mix(Nt, Ns, st3 * 0.75); cc3[i * 3] = mc3[0]; cc3[i * 3 + 1] = mc3[1]; cc3[i * 3 + 2] = mc3[2]; }
        coil.setAttribute('color', new T.BufferAttribute(cc3, 3)); coil.computeVertexNormals(); parts.push(coil);
        for (i = 0; i < 10; i++) { var na = (i / 10) * Math.PI * 2, nar = tube(L * 0.35, 6, 4, function (t) { return { rx: L * 0.014 * (1 - t * 0.7), ry: L * 0.014 * (1 - t * 0.7), dy: 0 }; }, function () { return Nt; }); nar.translate(0, 0, -L * 0.18); nar.applyMatrix4(mat4(Math.cos(na) * L * 0.08, Math.sin(na) * L * 0.08, -L * 0.24)); parts.push(nar); }
        parts.push.apply(parts, eye(L, L * 0.16, -L * 0.04, -L * 0.24, L * 0.032));
        parts.push.apply(parts, eye(L, -L * 0.16, -L * 0.04, -L * 0.24, L * 0.032));
        break;
      }
      case 'seahorse': {
        // Upright trunk, horse-like snout and a curled prehensile tail.
        mode = 8; shin = 20;
        var body = tube(L * .62, 24, 12, function (t) {
          var r = (.055 + .075 * Math.sin(Math.PI * Math.pow(t, .75))) * (1 + .05 * Math.cos(t * Math.PI * 22));
          return { rx: L*r*.7, ry: L*r, dy: 0 };
        }, function (t, ang, sx) { var c0 = col(t, ang, sx); return mix(c0, [0.36, 0.27, 0.12], .16 * (.5 + .5 * Math.cos(t * Math.PI * 22))); });
        body.rotateX(-Math.PI / 2); parts.push(body);
        parts.push(sphere(L * .105, D, 0, L * .27, L * .045, .72, .85, 1.15));
        var snout = tube(L * .22, 8, 8, function (t) { return { rx: L*(.025 + .008*t), ry: L*(.025 + .008*t), dy: 0 }; }, col);
        snout.translate(0, L * .255, L * .18); parts.push(snout);
        parts.push.apply(parts, eye(L, L * .065, L * .285, L * .09, L * .018));
        parts.push.apply(parts, eye(L, -L * .065, L * .285, L * .09, L * .018));
        var tailPts = [new T.Vector3(0,-L*.28,0)];
        for (i = 0; i <= 22; i++) {
          var a = i / 22 * Math.PI * 1.6, rad = L * (.105 - i / 22 * .065);
          tailPts.push(new T.Vector3(0, -L*.35 - rad * Math.sin(a), -L*.095 + rad * Math.cos(a)));
        }
        parts.push(paint(new T.TubeGeometry(new T.CatmullRomCurve3(tailPts), 36, L*.018, 7, false), D));
        parts.push(fin([[0,0],[-L*.09,L*.06],[-L*.13,L*.13],[-L*.08,L*.17],[0,L*.13]], F, 'yz', mat4(0,0,-L*.07)));
        break;
      }
      case 'urchin': { mode = 5; var ub = new T.IcosahedronGeometry(L * 0.4, 1); paint(ub, D); parts.push(ub); for (i = 0; i < 40; i++) { var th = Math.acos(1 - 2 * (i + 0.5) / 40), phh = i * 2.399; var sp3 = new T.ConeGeometry(L * 0.02, L * 0.6, 4); sp3.translate(0, L * 0.5, 0); paint(sp3, c.fin || 0x1a1024); var dir = new T.Vector3(Math.sin(th) * Math.cos(phh), Math.cos(th), Math.sin(th) * Math.sin(phh)); sp3.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dir))); parts.push(sp3); } break; }
      case 'starfish': { mode = 5; for (i = 0; i < 5; i++) { var aa2 = i / 5 * Math.PI * 2, arm2 = tube(L * 0.5, 8, 6, function (t) { var r = 1 - t * 0.85; return { rx: r * L * 0.1, ry: r * L * 0.05, dy: 0 }; }, function (t, ang) { var cc = rgb(D); return ang < 1.2 && Math.sin(t * 30) > 0.5 ? mix(cc, [1, 0.9, 0.7], 0.4) : cc; }); arm2.translate(0, 0, L * 0.25); arm2.applyMatrix4(new T.Matrix4().makeRotationY(aa2)); parts.push(arm2); } parts.push(sphere(L * 0.12, D, 0, L * 0.02, 0, 1, 0.6, 1)); break; }
      case 'shell': { mode = 5; shin = 50; var sh1 = new T.SphereGeometry(L * 0.5, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2); sh1.scale(1, 0.35, 1.1); var shp = sh1.attributes.position, shc = new Float32Array(shp.count * 3), Dd = rgb(D), Ll = rgb(Vt); for (i = 0; i < shp.count; i++) { var rid = Math.sin(Math.atan2(shp.getX(i), shp.getZ(i)) * 12) > 0.3 ? 1 : 0; var cc2 = mix(Dd, Ll, rid * 0.5); shc[i * 3] = cc2[0]; shc[i * 3 + 1] = cc2[1]; shc[i * 3 + 2] = cc2[2]; } sh1.setAttribute('color', new T.BufferAttribute(shc, 3)); parts.push(sh1); var sh2 = sh1.clone(); sh2.scale(1, -0.6, 1); parts.push(sh2); break; }
      case 'cucumber': { mode = 5; shin = 5; parts.push(tube(L, 14, 10, function (t) { var r = Math.sin(Math.pow(t, 0.9) * Math.PI) * 0.6 + 0.4; return { rx: r * L * 0.12, ry: r * L * 0.1, dy: 0 }; }, function (t, ang) { var cc = rgb(D); return Math.sin(t * 40 + ang * 3) > 0.6 ? mix(cc, [0.1, 0.08, 0.05], 0.5) : cc; })); break; }
      case 'nudibranch': { mode = 5; shin = 40; parts.push(tube(L, 12, 8, function (t) { var r = Math.sin(Math.pow(t, 0.8) * Math.PI); return { rx: Math.max(0.01, r) * L * 0.18, ry: Math.max(0.01, r) * L * 0.14, dy: 0 }; }, col)); for (i = 0; i < 10; i++) parts.push(sphere(L * 0.025, c.fin || 0xffa030, (Math.random() - 0.5) * L * 0.2, L * 0.15, L * 0.3 - i * L * 0.06, 1, 2.5, 1)); parts.push(sphere(L * 0.02, c.fin || 0xffa030, L * 0.06, L * 0.12, L * 0.42, 1, 2, 1)); parts.push(sphere(L * 0.02, c.fin || 0xffa030, -L * 0.06, L * 0.12, L * 0.42, 1, 2, 1)); break; }
      case 'tubeworms': { mode = 5; for (i = 0; i < 7; i++) { var tx = (Math.random() - 0.5) * L * 0.5, tz = (Math.random() - 0.5) * L * 0.5, th2 = L * (0.5 + Math.random() * 0.5); var tb = new T.CylinderGeometry(L * 0.035, L * 0.045, th2, 6); tb.translate(tx, th2 / 2, tz); paint(tb, 0xf2f2ee); parts.push(tb); parts.push(sphere(L * 0.05, 0xe03030, tx, th2 + L * 0.02, tz, 1, 1.4, 1)); } break; }
      case 'salp': { mode = 5; shin = 90; spec = 0xffffff; for (i = 0; i < 9; i++) { var sg2 = new T.CylinderGeometry(L * 0.05, L * 0.05, L * 0.1, 10, 1, true); sg2.rotateX(Math.PI / 2); sg2.translate(0, 0, L * 0.45 - i * L * 0.11); paint(sg2, 0xcfe8ff); parts.push(sg2); } break; }
      case 'manowar': { mode = 5; shin = 90; spec = 0xffffff; var flt = new T.SphereGeometry(L * 0.5, 14, 10); flt.scale(0.6, 0.7, 1.4); paint(flt, c.dorsal || 0x7fb0ff); parts.push(flt); var crest = fin([[-L * 0.6, 0], [-L * 0.3, L * 0.35], [L * 0.3, L * 0.4], [L * 0.6, 0]], c.fin || 0xd070c0, 'yz', mat4(0, L * 0.2, 0)); parts.push(crest); for (i = 0; i < 12; i++) { var tn2 = tube(L * (4 + Math.random() * 5), 10, 3, function () { return { rx: L * 0.008, ry: L * 0.008, dy: 0 }; }, function () { return rgb(0x5a40a0); }); tn2.rotateX(Math.PI / 2); tn2.translate((Math.random() - 0.5) * L * 0.6, -L * 2.5 - Math.random() * 2, (Math.random() - 0.5) * L * 1.2); parts.push(tn2); } break; }
      case 'puffer': { parts.push(tube(L, 20, 14, rel(roundProf, L), col)); parts.push(caudalRound(L, F)); parts.push(dorsal(L, F, -L * 0.15, L * 0.1, L * 0.1)); parts.push.apply(parts, pectoral(L, F, L * 0.05, L * 0.14, L * 0.3, 0, 0.3)); parts.push.apply(parts, eye(L, L * 0.2, L * 0.12, L * 0.3, L * 0.04)); parts.push.apply(parts, eye(L, -L * 0.2, L * 0.12, L * 0.3, L * 0.04)); if (opts.spiky) for (i = 0; i < 60; i++) { var th3 = Math.acos(1 - 2 * (i + 0.5) / 60), ph3 = i * 2.399, pr = roundProf(0.5 - Math.cos(th3) * 0.4); var sp4 = new T.ConeGeometry(L * 0.012, L * 0.1, 3); sp4.translate(0, L * 0.05, 0); paint(sp4, 0xf8f0c0); var d3 = new T.Vector3(Math.sin(th3) * Math.cos(ph3), Math.sin(th3) * Math.sin(ph3), Math.cos(th3)); sp4.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d3))); sp4.translate(d3.x * pr.rx * L * 0.9, d3.y * pr.ry * L * 0.9, d3.z * L * 0.4); parts.push(sp4); } break; }
      case 'sunfish': { parts.push(tube(L, 20, 14, rel(tallProf, L), col)); parts.push(fin([[L * 0.1, 0], [-L * 0.1, L * 0.55], [-L * 0.25, L * 0.5], [-L * 0.3, 0]], F, 'yz', mat4(0, L * 0.3, 0))); parts.push(fin([[L * 0.1, 0], [-L * 0.1, -L * 0.55], [-L * 0.25, -L * 0.5], [-L * 0.3, 0]], F, 'yz', mat4(0, -L * 0.3, 0))); parts.push(fin([[-L * 0.45, L * 0.3], [-L * 0.55, L * 0.1], [-L * 0.56, -L * 0.1], [-L * 0.45, -L * 0.3]], F, 'yz')); parts.push.apply(parts, eye(L, L * 0.07, L * 0.05, L * 0.38, L * 0.025)); parts.push.apply(parts, eye(L, -L * 0.07, L * 0.05, L * 0.38, L * 0.025)); break; }
      case 'angler': { shin = 5; parts.push(tube(L, 20, 12, function (t) { var a = Math.sin(Math.pow(t, 1.1) * Math.PI); var r = Math.max(0.004, a * (t > 0.85 ? 0.4 : 1)); return { rx: r * L * 0.22, ry: r * L * 0.26, dy: 0 }; }, col)); parts.push(caudalRound(L, F)); parts.push(fin([[L * 0.46, -L * 0.05], [L * 0.3, -L * 0.22], [L * 0.1, -L * 0.1]], 0x100808, 'yz')); for (i = 0; i < 8; i++) { var tooth = new T.ConeGeometry(L * 0.01, L * 0.06, 4); tooth.rotateX(Math.PI); tooth.translate((i - 3.5) * L * 0.04, -L * 0.02, L * 0.42); paint(tooth, 0xfafaf0); parts.push(tooth); } var rod = tube(L * 0.45, 6, 4, function () { return { rx: L * 0.008, ry: L * 0.008, dy: 0 }; }, function () { return rgb(D); }); rod.applyMatrix4(mat4(0, L * 0.22, L * 0.2, -1.1, 0, 0)); parts.push(rod); parts.push.apply(parts, eye(L, L * 0.12, L * 0.1, L * 0.3, L * 0.03)); parts.push.apply(parts, eye(L, -L * 0.12, L * 0.1, L * 0.3, L * 0.03)); break; }
      default: { // generična kostna riba
        var H = opts.clown ? 0.19 : opts.tall ? 0.19 : opts.slim ? 0.065 : 0.12, Wd = opts.clown ? 0.085 : opts.slim ? 0.045 : opts.tall ? 0.05 : 0.065, deep = opts.fast;
        parts.push(tube(L, opts.clown ? 64 : 32, 18, rel(fusiform(H, Wd, opts.blunt || opts.clown), L), col));
        parts.push(opts.roundTail ? caudalRound(L, F) : caudalForked(L, F, deep));
        if (opts.clown) {
          parts.push(fin([[L*.30,L*.08],[L*.21,L*.22],[L*.04,L*.25],[-L*.18,L*.19],[-L*.30,L*.08]], F, 'yz'));
          parts.push(fin([[-L*.06,-L*.13],[-L*.15,-L*.23],[-L*.30,-L*.14],[-L*.34,-L*.06]], F, 'yz'));
        } else { var df = dorsal(L, F, L * (opts.tall ? 0.2 : 0.1), L * (opts.tall ? 0.2 : opts.spiky ? 0.18 : 0.08), L * (opts.tall ? 0.45 : opts.spiky ? 0.35 : 0.25), !opts.tall); if (opts.tall) df.translate(0, L * .06, 0); parts.push(df); }
        parts.push.apply(parts, pectoral(L, F, L * 0.18, L * (opts.wings ? 0.42 : 0.14), L * Wd * 0.8, -L * 0.02, opts.wings ? 0.1 : 0.4));
        parts.push(anal(L, F, -L * 0.12, L * 0.06, L * 0.16));
        if (deep) { parts.push(fin([[-L * 0.1, 0], [-L * 0.2, L * 0.05], [-L * 0.28, 0]], F, 'yz', mat4(0, L * 0.07, 0))); }
        if (opts.sword) { parts.push(tube(L * 0.45, 4, 6, function (t) { var r = 0.014 * (1 - t * 0.9); return { rx: r * L, ry: r * L * 0.5, dy: 0 }; }, function () { return rgb(D); }).translate(0, 0, L * 0.7)); }
        if (opts.spiky) { for (i = 0; i < 13; i++) { var sp5 = fin([[0, 0], [L * 0.012, L * 0.3 + Math.sin(i) * L * 0.05], [L * 0.024, 0]], 0xf0e0d0, 'yz', mat4(0, L * 0.05, L * 0.2 - i * L * 0.035, 0, 0, 0)); sp5.rotateX(0.2 - i * 0.05); parts.push(sp5); } parts.push.apply(parts, pectoral(L, 0xf0d8c8, L * 0.1, L * 0.32, L * 0.05, 0, 0.6)); }
        if (opts.barbels) { parts.push(tube(L * 0.2, 3, 3, function () { return { rx: L * 0.006, ry: L * 0.006, dy: 0 }; }, function () { return rgb(0xf0e0b0); }).applyMatrix4(mat4(L * 0.02, -L * 0.07, L * 0.4, 1.2, 0, 0))); parts.push(tube(L * 0.2, 3, 3, function () { return { rx: L * 0.006, ry: L * 0.006, dy: 0 }; }, function () { return rgb(0xf0e0b0); }).applyMatrix4(mat4(-L * 0.02, -L * 0.07, L * 0.4, 1.2, 0, 0))); }
        parts.push.apply(parts, eyes(rel(fusiform(H, Wd, opts.blunt), L), L, 0.13, L * (opts.bigEye ? 0.03 : 0.022), 0.35));
        parts.push.apply(parts, gillCovers(rel(fusiform(H, Wd, opts.blunt), L), L, D));
        shin = opts.shiny ? 90 : 35; spec = opts.shiny ? 0xaabbcc : 0x334455;
        if (opts.mouth) parts.push(fin([[0, 0], [L * 0.06, -L * 0.015], [L * 0.08, 0]], 0x1a0a0a, 'xz', mat4(0, -H * L * 0.4, L * 0.42)));
      }
    }
    var geo = merge(parts); geo.computeBoundingSphere(); LOD = false;
    var mat = swimMaterial({ len: L, mode: opts.mode !== undefined ? opts.mode : mode, shininess: shin, specular: spec, transparent: opts.transparent, opacity: opts.opacity, skin: opts.whaleShark ? 3 : opts.shape === 'shark' ? 2 : !opts.shape ? 1 : 0 });
    var mesh = new T.Mesh(geo, mat); mesh.frustumCulled = true;
    var grp = new T.Group(); grp.add(mesh);
    var hit = new T.Mesh(new T.SphereGeometry(Math.max(0.6, L * 0.55), 6, 4), new T.MeshBasicMaterial({ visible: false })); grp.add(hit);
    grp.userData = { mesh: mesh, mat: mat, u: mat.userData.u, len: L, hit: hit, mode: mat.userData.u.uMode.value, name: name };
    return grp;
  }

  // ── Vizualne specifikacije vrst ──────────────────────────────────────────
  // L = dolžina v metrih (realistična), shape + barve + vzorci
  var SPEC = {
    'lanternfish': { L: 0.16, colors: { dorsal: 0x28476b, ventral: 0xb7c7cc, fin: 0x648398 }, slim: true, shiny: true, bigEye: true },
    'clownfish': { L: 0.14, colors: { dorsal: 0xe76418, ventral: 0xf08d33, fin: 0x743817 }, pattern: clownPattern, clown: true, roundTail: true },
    'titan triggerfish': { L: 0.75, colors: { dorsal: 0x606745, ventral: 0xd3c992, fin: 0x292b24 }, tall: true, pattern: spots(0xc9bd79, 2, 3) },
    'stonefish': { L: 0.4, colors: { dorsal: 0x645849, ventral: 0x9c917a, fin: 0x594a40 }, blunt: true, roundTail: true, spiky: true, pattern: spots(0x332c26, 2, 8) },
    'giant trevally': { L: 1.7, colors: { dorsal: 0x73818b, ventral: 0xd7dce0, fin: 0x505962 }, fast: true, shiny: true, blunt: true },
    'ribbonfish': { L: 2.4, shape: 'eel', colors: { dorsal: 0x9fb3bd, ventral: 0xe4eef1, fin: 0xb65c60 }, shiny: true },
    'lemon shark': { L: 2.8, shape: 'shark', colors: { dorsal: 0x9c8961, ventral: 0xddd2b5, fin: 0x81714f } },
    'goblin shark': { L: 3.5, shape: 'shark', goblin: true, colors: { dorsal: 0x987f80, ventral: 0xd9c6bd, fin: 0x8d6e70 } },
    'sardine': { L: 0.22, colors: { dorsal: 0x3a6a8a, ventral: 0xe8f0f4, fin: 0xa8c0d0 }, slim: true, shiny: true, bigEye: true },
    'anchovy': { L: 0.16, colors: { dorsal: 0x4a7a90, ventral: 0xf0f4f6, fin: 0xb8c8d0 }, slim: true, shiny: true, bigEye: true },
    'herring': { L: 0.28, colors: { dorsal: 0x2d5878, ventral: 0xe6eff5, fin: 0x9ab4c6 }, slim: true, shiny: true, bigEye: true },
    'mullet': { L: 0.42, colors: { dorsal: 0x526b6e, ventral: 0xdce4e6, fin: 0x8ea0a4 }, pattern: stripes(0x3a4d50, 10, 0.25, 'top'), shiny: true },
    'mackerel': { L: 0.45, colors: { dorsal: 0x1f6a8a, ventral: 0xe8eef2, fin: 0x6a8a9a }, pattern: stripes(0x0a2a3a, 14, 0.5, 'top'), fast: true, shiny: true },
    'snapper': { L: 0.7, colors: { dorsal: 0xd05040, ventral: 0xf4d8c8, fin: 0xe07060 }, mouth: true },
    'tuna': { L: 2.2, colors: { dorsal: 0x1a2f5a, ventral: 0xd8dde4, fin: 0xe0c040 }, fast: true, shiny: true },
    'tarpon': { L: 2.0, colors: { dorsal: 0x42667a, ventral: 0xf0f4f8, fin: 0xaabac4 }, fast: true, shiny: true },
    'mahimahi': { L: 1.4, colors: { dorsal: 0x20a868, ventral: 0xf2dc38, fin: 0x2890e8 }, tall: true, blunt: true, fast: true, shiny: true },
    'wahoo': { L: 1.7, colors: { dorsal: 0x1f567a, ventral: 0xe0ecf4, fin: 0x387498 }, pattern: stripes(0x102840, 14, 0.35, 'top'), slim: true, fast: true, shiny: true },
    'kingfish': { L: 1.5, colors: { dorsal: 0x355c78, ventral: 0xe8eef4, fin: 0xc8c050 }, fast: true, shiny: true },
    'squid': { L: 0.6, shape: 'squid', colors: { dorsal: 0xd9a8a0, ventral: 0xf4e6e0 }, transparent: true, opacity: 0.92 },
    'humboldt squid': { L: 2.0, shape: 'squid', colors: { dorsal: 0xb8382e, ventral: 0xeed4cc }, transparent: true, opacity: 0.94 },
    'giant squid': { L: 16.0, shape: 'squid', giant: true, colors: { dorsal: 0x9e2420, ventral: 0xe6b8aa } },
    'nautilus': { L: 0.32, shape: 'nautilus', colors: { dorsal: 0xe8d0b0, ventral: 0xfaf0e2, fin: 0xa04a2a } },
    'shrimp': { L: 0.08, shape: 'crab', lobster: true, colors: { dorsal: 0xf0b8a8, ventral: 0xf8e0d8 } },
    'krill': { L: 0.04, shape: 'crab', lobster: true, colors: { dorsal: 0xf0a0a0, ventral: 0xffd0d0 } },
    'flying fish': { L: 0.35, colors: { dorsal: 0x2a5a9a, ventral: 0xe8eef4, fin: 0x9ab8e0 }, wings: true, shiny: true },
    'salp chain': { L: 1.0, shape: 'salp', transparent: true, opacity: 0.45 },
    'crab': { L: 0.3, shape: 'crab', colors: { dorsal: 0xc8502a } },
    'blue crab': { L: 0.28, shape: 'crab', colors: { dorsal: 0x3b6e68, fin: 0x2e78b8 } },
    'hermit crab': { L: 0.12, shape: 'crab', colors: { dorsal: 0xb08050 } },
    'spider crab': { L: 1.4, shape: 'crab', colors: { dorsal: 0x9e5032 } },
    'lobster': { L: 0.55, shape: 'crab', lobster: true, colors: { dorsal: 0x7a2a1a, ventral: 0xb0604a } },
    'sea urchin': { L: 0.22, shape: 'urchin', colors: { dorsal: 0x2a1a3a, fin: 0x1a1024 } },
    'clam': { L: 0.2, shape: 'shell', colors: { dorsal: 0xd8d0c0, ventral: 0xf0ece0 } },
    'scallop': { L: 0.15, shape: 'shell', colors: { dorsal: 0xe8a080, ventral: 0xf8e0d0 } },
    'sea cucumber': { L: 0.4, shape: 'cucumber', colors: { dorsal: 0x5a4a2a } },
    'starfish': { L: 0.3, shape: 'starfish', colors: { dorsal: 0xf07030 } },
    'nudibranch': { L: 0.1, shape: 'nudibranch', colors: { dorsal: 0xf040c0, ventral: 0xf8c0e8, fin: 0xffa030 } },
    'seahorse': { L: 0.2, shape: 'seahorse', colors: { dorsal: 0xe8c060, ventral: 0xf0e0a0, fin: 0xf8e8b0 } },
    'tube worms': { L: 0.5, shape: 'tubeworms' },
    'parrotfish': { L: 0.6, colors: { dorsal: 0x20a090, ventral: 0x80d0c0, fin: 0xf07090 }, pattern: spots(0xf07090, 1.2, 3), blunt: true, roundTail: true },
    'surgeonfish': { L: 0.4, colors: { dorsal: 0x2050d0, ventral: 0x6090f0, fin: 0xf0d020 }, tall: true },
    'wrasse': { L: 0.35, colors: { dorsal: 0x50c060, ventral: 0xb0f0c0, fin: 0xf08040 }, pattern: stripes(0xf08040, 1.5, 0.3), roundTail: true },
    'goatfish': { L: 0.4, colors: { dorsal: 0xf0d080, ventral: 0xfcf4e0, fin: 0xf0c060 }, barbels: true },
    'triggerfish': { L: 0.5, colors: { dorsal: 0x5a6a30, ventral: 0xb0b080, fin: 0x2a3a20 }, tall: true, pattern: spots(0xe0e0a0, 2, 7) },
    'butterflyfish': { L: 0.24, colors: { dorsal: 0xf4d840, ventral: 0xfaf2b8, fin: 0xe8b820 }, pattern: stripes(0x1e2028, 3, 0.35), tall: true },
    'damselfish': { L: 0.16, colors: { dorsal: 0x1a78ff, ventral: 0x4aa8ff, fin: 0xf0d828 }, tall: true },
    'angelfish': { L: 0.42, colors: { dorsal: 0x1e265a, ventral: 0xf4c830, fin: 0x2a7fff }, pattern: stripes(0xf4d840, 6, 0.35), tall: true },
    'boxfish': { L: 0.35, shape: 'puffer', colors: { dorsal: 0xf2c828, ventral: 0xe0a818, fin: 0x302410 }, pattern: spots(0x1a1408, 2.2, 5) },
    'gobies': { L: 0.14, colors: { dorsal: 0x9c8868, ventral: 0xdcd0b8, fin: 0xb8a482 }, roundTail: true },
    'cuttlefish': { L: 0.5, shape: 'cuttlefish', colors: { dorsal: 0x8f7a60, ventral: 0xe0d4c0 } },
    'pufferfish': { L: 0.5, shape: 'puffer', colors: { dorsal: 0xd8c050, ventral: 0xf8f0d0, fin: 0xe8d890 }, pattern: spots(0x3a3a20, 2, 11), spiky: true },
    'lionfish': { L: 0.4, colors: { dorsal: 0xc83020, ventral: 0xf0d8c8, fin: 0xf0e0d0 }, pattern: stripes(0xf8f0e8, 11, 0.45), spiky: true },
    'sea snake': { L: 1.2, shape: 'eel', colors: { dorsal: 0x202830, ventral: 0xe0e0c0, fin: 0x202830 }, pattern: stripes(0xe8e8d0, 18, 0.5) },
    'stingray': { L: 1.4, shape: 'ray', colors: { dorsal: 0x7a7060, ventral: 0xf0ece0 }, pattern: spots(0x4a4030, 1.5, 5) },
    'electric ray': { L: 1.3, shape: 'ray', colors: { dorsal: 0x4a3d5a, ventral: 0xd8d0dc }, pattern: spots(0x6088ff, 1.8, 12) },
    'eagle ray': { L: 2.4, shape: 'ray', colors: { dorsal: 0x2a2a36, ventral: 0xf0f0f4 }, pattern: spots(0xe8e8f0, 2.5, 9) },
    'conger eel': { L: 2.0, shape: 'eel', colors: { dorsal: 0x6a7470, ventral: 0xd0d4d0, fin: 0x4a5450 } },
    'moray': { L: 2.0, shape: 'eel', colors: { dorsal: 0x5a7a40, ventral: 0xc8d090, fin: 0x4a6a30 }, pattern: spots(0xe8e8a0, 2, 13), mouth: true },
    'octopus': { L: 1.2, shape: 'octopus', colors: { dorsal: 0xa8603a, ventral: 0xd8b090 } },
    'grouper': { L: 2.0, colors: { dorsal: 0x6a4a30, ventral: 0xc8b090, fin: 0x5a3a20 }, pattern: spots(0x3a2a18, 2.5, 17), blunt: true, roundTail: true, mouth: true },
    'barracuda': { L: 1.6, colors: { dorsal: 0x6a7a8a, ventral: 0xe8ecf0, fin: 0x4a5a6a }, slim: true, shiny: true, pattern: stripes(0x2a3a4a, 9, 0.6, 'top'), mouth: true },
    'swordfish': { L: 3.5, colors: { dorsal: 0x3a5a8a, ventral: 0xd8e0e8, fin: 0x2a3a5a }, slim: true, sword: true, fast: true, shiny: true },
    'anglerfish': { L: 0.6, shape: 'angler', colors: { dorsal: 0x1a1a1c, ventral: 0x2a2a2c, fin: 0x202022 } },
    'sea turtle': { L: 1.2, shape: 'turtle', colors: { dorsal: 0x5a6b3a, ventral: 0xd8c89a, fin: 0x7a8a50 } },
    'manta ray': { L: 5.0, shape: 'ray', manta: true, colors: { dorsal: 0x1a1a22, ventral: 0xf4f4f8 } },
    'sunfish': { L: 2.5, shape: 'sunfish', colors: { dorsal: 0x8a8a92, ventral: 0xd0d0d4, fin: 0x7a7a82 } },
    'whale': { L: 22.0, shape: 'whale', colors: { dorsal: 0x161c24, ventral: 0xd8e0e6, fin: 0x161c24 } },
    'whale calf': { L: 7.5, shape: 'whale', colors: { dorsal: 0x1e262e, ventral: 0xe4eaee, fin: 0x3a4652 } },
    'seal': { L: 1.8, shape: 'seal', colors: { dorsal: 0x5a5048, ventral: 0xb8a898, fin: 0x4a4038 }, pattern: spots(0x3a3028, 1.5, 19) },
    'dolphin': { L: 2.8, shape: 'dolphin', colors: { dorsal: 0x4a5a6a, ventral: 0xe8ecf0, fin: 0x3a4a5a } },
    'man-o-war': { L: 0.3, shape: 'manowar', colors: { dorsal: 0x7fb0ff, fin: 0xd070c0 }, transparent: true, opacity: 0.7 },
    'great white': { L: 6.0, shape: 'shark', colors: { dorsal: 0x4a5560, ventral: 0xeef0f2, fin: 0x3a4550 } },
    'tiger shark': { L: 5.0, shape: 'shark', colors: { dorsal: 0x5a6a60, ventral: 0xe0e4e0, fin: 0x4a5a50 }, pattern: stripes(0x2a3a30, 12, 0.5, 'top') },
    'mako shark': { L: 3.6, shape: 'shark', colors: { dorsal: 0x1d4e89, ventral: 0xf0f4f8, fin: 0x173e6e } },
    'thresher shark': { L: 4.5, shape: 'shark', thresher: true, colors: { dorsal: 0x3d4e5a, ventral: 0xe8ecef, fin: 0x2f3e48 } },
    'blue shark': { L: 3.2, shape: 'shark', colors: { dorsal: 0x245ea8, ventral: 0xf0f4f8, fin: 0x1e4c8a } },
    'hammerhead': { L: 4.0, shape: 'shark', hammer: true, colors: { dorsal: 0x6a7060, ventral: 0xe8ece8, fin: 0x5a6050 } },
    'bull shark': { L: 3.2, shape: 'shark', colors: { dorsal: 0x6a7a80, ventral: 0xe0e8ea, fin: 0x5a6a70 } },
    'nurse shark': { L: 2.8, shape: 'shark', colors: { dorsal: 0x8a7454, ventral: 0xd8ccb4, fin: 0x725e42 } },
    'whale shark': { L: 11.0, shape: 'shark', whaleShark: true, colors: { dorsal: 0x2a3b4c, ventral: 0xd3e0e5, fin: 0x22303e } },
    'reef shark': { L: 1.8, shape: 'shark', colors: { dorsal: 0x7a8a90, ventral: 0xe8eef0, fin: 0x3a3a3a } },
    'orca': { L: 8.0, shape: 'orca', colors: { dorsal: 0x0a0c10, ventral: 0xf4f4f6, fin: 0x0a0c10 } },
    'jellyfish bloom': { L: 0.5, shape: 'jelly', colors: { dorsal: 0xffb6d6, fin: 0xff8fc0 }, transparent: true, opacity: 0.5 }
  };
  function lenOf(name) { var s = SPEC[name]; return s ? s.L : 0.5; }
  function creature(name, lod) { var s = SPEC[name] || { L: 0.5 }; if (lod) { var o = {}; for (var k in s) o[k] = s[k]; o.lod = true; s = o; } return build(name, s.L, s); }
  var PLAYER_COLORS = { sand: { dorsal: 0xb89a62, ventral: 0xf0e6c8, fin: 0xa08850 }, kelp: { dorsal: 0x2f6a2a, ventral: 0xc8e0a0, fin: 0x3f8a3a }, blue: { dorsal: 0x1f5fb0, ventral: 0xd8e8f8, fin: 0x2f7fd0 }, dark: { dorsal: 0x1a1d2a, ventral: 0x6a6f85, fin: 0x2a2d3a }, silver: { dorsal: 0x8a98a8, ventral: 0xf4f6f8, fin: 0xa8b4c0 }, red: { dorsal: 0xa02020, ventral: 0xf0c8b8, fin: 0xc62f2f }, orange: { dorsal: 0xd07010, ventral: 0xf8e0b0, fin: 0xf08a24 } };
  function playerLen(size) { return 0.8 + 0.6 * size; }
  function player(color, size) { return build('player', playerLen(size || 1), { colors: PLAYER_COLORS[color] || PLAYER_COLORS.blue, shiny: color === 'silver', mouth: true }); }
  function carcass(sz) { var g = sz > 15 ? build('carcass', 22, { shape: 'whale', colors: { dorsal: 0x6a6e70, ventral: 0xa8a8a0, fin: 0x5a5e60 }, mode: 5 }) : build('carcass', playerLen(sz), { colors: { dorsal: 0x8a8a80, ventral: 0xb8b8a8, fin: 0x7a7a70 }, mode: 5 }); g.userData.mesh.rotation.z = Math.PI; return g; }

  // animacija: hitrost (m/s) -> zvezno integrirana faza plavanja uSwim (brez poskokov ob spremembi hitrosti)
  function animate(grp, time, spd, turnRate, dt) {
    var u = grp.userData.u, L = grp.userData.len, m = grp.userData.mode;
    var dtStep = dt !== undefined ? Math.min(0.08, Math.max(0, dt)) : (grp.userData._lt !== undefined ? Math.min(0.08, Math.max(0, time - grp.userData._lt)) : 0.016);
    grp.userData._lt = time;
    u.uTime.value = time;
    var freq = u.uFreq.value, amp = u.uAmp.value;
    if (m === 0) { var k = L > 3 ? 0.6 : L > 1 ? 1 : 1.6; freq = (1.2 + Math.min(10, spd) * 1.25) * k; amp = 0.025 + Math.min(0.068, spd * 0.014); }
    else if (m === 1) { freq = (0.9 + Math.min(10, spd) * 0.78) * (L > 10 ? 0.45 : 1); amp = 0.02 + Math.min(0.048, spd * 0.011); }
    else if (m === 2) { freq = 1.2 + Math.min(6, spd) * 0.6; amp = 0.12 + Math.min(0.1, spd * 0.04); }
    else if (m === 3) { freq = 1.6; amp = 0.1; }
    else if (m === 4) { freq = 1.4 + Math.min(5, spd * 1.1); amp = 0.06 + Math.min(0.08, spd * 0.025); }
    else if (m === 5) { freq = 0; amp = 0; }
    else if (m === 6) { freq = 2.0 + Math.min(6, spd * 3.5); amp = spd > 0.04 ? Math.min(0.12, 0.04 + spd * 0.08) : 0.0; }
    else if (m === 7) { freq = 1.0 + Math.min(2, spd * .6); amp = 0.12 + Math.min(0.16, spd * .035); }
    else if (m === 8) { freq = 3.0 + Math.min(3, spd); amp = .025; }
    var sm = Math.min(1, dtStep * 7.0);
    u.uFreq.value += (freq - u.uFreq.value) * sm;
    u.uAmp.value += (amp - u.uAmp.value) * sm;
    u.uSwim.value += u.uFreq.value * dtStep;
    var targetBend = turnRate ? Math.max(-0.14, Math.min(0.14, -turnRate * 0.0042)) : 0;
    u.uBend.value += (targetBend - u.uBend.value) * Math.min(1, dtStep * 8.0);
  }
  return { build: build, creature: creature, player: player, carcass: carcass, animate: animate, lenOf: lenOf, SPEC: SPEC, swimMaterial: swimMaterial, cloneSwimMat: cloneSwimMat, merge: merge, paint: paint, playerLen: playerLen, PLAYER_COLORS: PLAYER_COLORS };
})();
