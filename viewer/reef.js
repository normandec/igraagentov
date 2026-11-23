// Procedural reef habitats. All geometry and textures are generated locally;
// the standalone viewer needs no downloaded images or external assets.
var REEF = (function () {
  var T = THREE;
  var time = { value: 0 };
  function painted(geo, color) { return CR.paint(geo, color); }
  function segment(a, b, r0, r1, color) {
    var from = new T.Vector3(a[0], a[1], a[2]), to = new T.Vector3(b[0], b[1], b[2]);
    var delta = to.clone().sub(from), geo = new T.CylinderGeometry(r1, r0, delta.length(), 6, 1);
    geo.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), delta.clone().normalize())));
    geo.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    return painted(geo, color);
  }
  function staghorn() {
    var parts = [], tips = [
      [[0,.30,0],[.24,.65,.12],[.32,.94,.16]],
      [[0,.38,0],[-.22,.70,.10],[-.30,.97,.15]],
      [[0,.43,0],[.08,.73,-.24],[.14,.98,-.30]],
      [[0,.45,0],[-.08,.72,.24],[-.15,.96,.30]],
      [[0,.54,0],[.06,.82,0],[.04,1.08,0]]
    ];
    parts.push(segment([0,0,0],[0,.57,0],.12,.075,0xb56852));
    tips.forEach(function (p, i) {
      parts.push(segment(p[0],p[1],.075,.045,0xcf846b));
      parts.push(segment(p[1],p[2],.045,.02,i % 2 ? 0xf1b19a : 0xeaa287));
      var q = p[1], end = p[2];
      parts.push(segment([q[0]*.85,q[1]-.07,q[2]*.85],[end[0]*1.22,end[1]-.11,end[2]*1.25],.035,.014,0xe59b83));
    });
    return CR.merge(parts);
  }
  // A broad, curved blade with a tapered tip and a darker central spine.
  function ribbon(start, length, angle, reach, width, base, tip) {
    var positions = [], colors = [], indices = [], rows = 12;
    var dx = Math.cos(angle), dz = Math.sin(angle), tx = -dz, tz = dx;
    var c0 = new T.Color(base), c1 = new T.Color(tip);
    for (var j = 0; j <= rows; j++) {
      var t = j / rows, spread = width * Math.pow(Math.sin(Math.PI * t), .7);
      var bend = reach * Math.sin(t * 1.35), y = start + length * t;
      var col = c0.clone().lerp(c1, t * .85);
      for (var k = -1; k <= 1; k++) {
        var ridge = k === 0 ? .035 * Math.sin(t * Math.PI) : 0;
        positions.push(dx * bend + tx * spread * k, y + ridge, dz * bend + tz * spread * k);
        var shade = k === 0 ? .72 : 1; colors.push(col.r * shade, col.g * shade, col.b * shade);
      }
      if (j) for (var q = 0; q < 2; q++) {
        var a = (j-1)*3+q, b = j*3+q; indices.push(a,b,a+1,a+1,b,b+1);
      }
    }
    var geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); geo.setIndex(indices); geo.computeVertexNormals(); return geo;
  }
  function kelp() {
    var pieces = [segment([0,0,0],[0,1,0],.035,.012,0x4b7040)];
    for (var i = 0; i < 13; i++) {
      var start = .18 + i * .052, ang = i * 2.399;
      pieces.push(ribbon(start, Math.min(.24, 1-start), ang, .55 + (i % 3)*.11, .14 + (i % 2)*.04, 0x326c3c, i % 3 ? 0x8cac50 : 0xb2a85c));
    }
    return CR.merge(pieces);
  }
  function grass() {
    return CR.merge([
      ribbon(0,1,0,.12,.10,0x225b38,0x8ab75a),
      ribbon(0,.78,2.2,.15,.075,0x305f37,0xa2bd6c),
      ribbon(0,.9,4.1,.11,.08,0x2b633d,0x79a853)
    ]);
  }
  function fanTexture() {
    var cv = document.createElement('canvas'); cv.width = cv.height = 512;
    var x = cv.getContext('2d'), lines = 31, levels = 16, points = [];
    x.lineCap = 'round'; x.lineJoin = 'round';
    for (var i = 0; i < lines; i++) {
      var angle = (i / (lines - 1) - .5) * 2.35, arm = [];
      var extent = 345 * (.78 + .22 * Math.cos(angle * 1.2));
      for (var j = 0; j <= levels; j++) {
        var t = j / levels, curve = .07 * Math.sin(i * 2.9 + t * 5) * t;
        arm.push([256 + Math.sin(angle + curve) * extent * t * .73, 480 - Math.cos(angle + curve) * extent * t]);
      }
      points.push(arm);
      x.beginPath(); arm.forEach(function (p, n) { if (!n) x.moveTo(p[0],p[1]); else x.lineTo(p[0],p[1]); });
      x.strokeStyle = i % 3 === 0 ? '#e39b90' : '#ae5a70'; x.lineWidth = i % 5 === 0 ? 3.2 : 1.8; x.stroke();
    }
    // Cross-veins make the fan a delicate network rather than an opaque card.
    x.strokeStyle = 'rgba(218,138,147,.83)'; x.lineWidth = 1.15;
    for (var n = 0; n < lines - 1; n++) for (var l = 4; l < levels; l++) {
      var a = points[n][l], b = points[n+1][l];
      x.beginPath(); x.moveTo(a[0],a[1]); x.quadraticCurveTo((a[0]+b[0])/2,(a[1]+b[1])/2+3,b[0],b[1]); x.stroke();
    }
    x.beginPath(); x.moveTo(256,511); x.quadraticCurveTo(255,470,256,432); x.strokeStyle = '#af6d60'; x.lineWidth = 8; x.stroke();
    var texture = new T.CanvasTexture(cv); texture.needsUpdate = true; return texture;
  }
  function brainTexture() {
    var cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
    var c = cv.getContext('2d'); c.fillStyle = '#d5a681'; c.fillRect(0, 0, 512, 256);
    // Sinuous parallel ridges wrap around the spherical coral.
    for (var row = -1; row < 25; row++) {
      c.beginPath();
      for (var x = 0; x <= 512; x += 2) {
        var y = row * 12 + 4 * Math.sin(x * Math.PI / 32 + row * 1.3) + 2 * Math.sin(x * Math.PI / 16 - row * .7);
        if (!x) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.strokeStyle = '#815866'; c.lineWidth = 4; c.stroke();
      c.strokeStyle = '#edc9a4'; c.lineWidth = 1.5; c.stroke();
    }
    var t = new T.CanvasTexture(cv); t.wrapS = T.RepeatWrapping; t.needsUpdate = true; return t;
  }
  function table() {
    var g = new T.CylinderGeometry(1, .75, .16, 24, 3), p = g.attributes.position;
    for (var i = 0; i < p.count; i++) {
      var x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.sqrt(x*x+z*z);
      p.setY(i, y + .09 * Math.sin(x*9) * Math.cos(z*8) + .06 * r);
    }
    g.computeVertexNormals(); return g;
  }
  function material(options, sway) {
    var m = new T.MeshLambertMaterial(options);
    if (sway) {
      m.onBeforeCompile = function (shader) {
        shader.uniforms.uReefTime = time;
        shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float uReefTime;');
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', [
          '#include <begin_vertex>',
          'float reefH = clamp(position.y, 0.0, 1.0);',
          '#ifdef USE_INSTANCING',
          'vec3 reefOrigin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;',
          '#else',
          'vec3 reefOrigin = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;',
          '#endif',
          'float reefWave = sin(uReefTime * 0.8 + reefOrigin.x * 0.17 + reefOrigin.z * 0.13);',
          'transformed.x += reefWave * reefH * reefH * 0.12;',
          'transformed.z += cos(uReefTime * 0.67 + reefOrigin.x * 0.11) * reefH * reefH * 0.06;'
        ].join('\n'));
      };
      m.customProgramCacheKey = function () { return 'reef-current-v1'; };
    }
    return m;
  }
  function fan() { var g = new T.PlaneGeometry(1, 1, 12, 12); g.translate(0, .5, 0); return g; }
  function update(t) { time.value = t; }
  return { staghorn: staghorn, kelp: kelp, grass: grass, fan: fan, fanTexture: fanTexture, brainTexture: brainTexture, table: table, material: material, update: update };
})();
