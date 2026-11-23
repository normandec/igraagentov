// Visual flock response. Simulation still represents each school as one entity;
// these per-fish offsets are local presentation and do not alter combat or counts.
var SCHOOL_VISUAL = (function () {
  var cell = 32;
  function grid(state, species) {
    var cells = {};
    function add(o, size) {
      if (!o.alive && o.alive !== undefined || size < 0.4) return;
      var key = Math.floor(o.x / cell) + ',' + Math.floor(o.z / cell);
      (cells[key] || (cells[key] = [])).push({ animal: o, size: size });
    }
    state.fish.forEach(function (f) { add(f, f.sz || 0); });
    state.npcs.forEach(function (a) {
      var s = species[a.sp];
      if (s && s.kind !== 'static' && s.kind !== 'drift') add(a, s.size);
    });
    return cells;
  }
  function nearest(cells, school, species) {
    var gx = Math.floor(school.x / cell), gz = Math.floor(school.z / cell), best = null, bd = Infinity;
    var minSize = Math.max(0.4, species[school.sp].size * 1.8);
    for (var x = -1; x <= 1; x++) for (var z = -1; z <= 1; z++) {
      var items = cells[(gx + x) + ',' + (gz + z)] || [];
      for (var i = 0; i < items.length; i++) {
        var candidate = items[i], a = candidate.animal;
        if (a.id === school.id || candidate.size < minSize || (a.spd || 0) < 0.3) continue;
        var dx = school.x - a.x, dz = school.z - a.z, dy = school.d - a.d;
        var d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < 24 * 24 && d2 < bd) { best = a; bd = d2; }
      }
    }
    return best;
  }
  // Smooth radial displacement around the intruder, followed by recovery.
  function displace(fish, x, y, z, threat, radius, dt) {
    var tx = 0, ty = 0, tz = 0;
    if (threat) {
      var dx = x - threat.x, dy = y + threat.d, dz = z - threat.z;
      var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < radius) {
        if (dist < 0.001) { dx = Math.cos(fish.ph); dz = Math.sin(fish.ph); dy = 0.15; dist = Math.sqrt(dx * dx + dy * dy + dz * dz); }
        var strength = (radius - dist) * 1.1;
        tx = dx / dist * strength; ty = dy / dist * strength; tz = dz / dist * strength;
      }
    }
    var k = Math.min(1, Math.max(0, dt) * (threat ? 4 : 1.3));
    fish.sx = (fish.sx || 0) + (tx - (fish.sx || 0)) * k;
    fish.sy = (fish.sy || 0) + (ty - (fish.sy || 0)) * k;
    fish.sz = (fish.sz || 0) + (tz - (fish.sz || 0)) * k;
  }
  return { grid: grid, nearest: nearest, displace: displace };
})();
