// Headless v5 engine test: node tools/test_engine.js [nFish] [minutes] [seed]
// Runs bots of mixed policies -> verifies deterministic execution, clean match finish, and v5 invariants.
var fs = require('fs'), path = require('path'), assert = require('assert');
var root = path.join(__dirname, '..');
new Function(
  fs.readFileSync(path.join(root, 'engine/world.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(root, 'engine/species.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(root, 'engine/engine.js'), 'utf8')
)();
var OC = globalThis.OC, C = OC.CONST;
assert.strictEqual(OC.VERSION, 'v5', 'expected OC.VERSION === v5');
assert.strictEqual(OC.SPECIES_LIST.length, 54, 'expected 54 species');
assert.strictEqual(OC.PLANTS.length, 176, 'expected 176 plants');
assert.strictEqual(typeof OC.tideAt(0), 'number', 'expected OC.tideAt');

var N = +(process.argv[2] || 10), MIN = +(process.argv[3] || 25), SEED = +(process.argv[4] || 42);
var POL = ['random', 'random', 'feeder', 'feeder', 'feeder', 'hunter', 'hunter', 'camper', 'smart', 'smart'];
var g = OC.newGame(1, SEED);
assert.strictEqual(g.npcs.length, 359, 'expected 359 initial NPCs');
for (var i = 0; i < N; i++) OC.addFish(g, 'bot' + (i + 1), POL[i % POL.length], ['sand', 'kelp', 'blue', 'dark', 'silver', 'red', 'orange'][i % 7], 'k' + i);
var now = 1000000; OC.start(g, now);
var rs = { rs: SEED * 31 + 7 }; function R() { return OC.rnd(rs); }
var next = {}; g.fish.forEach(function (f) { next[f.id] = 1 + Math.floor(R() * 40); });
var cmds = 0, errs = 0;

function smartWhy(tag, extra) {
  var verbs = ['Observing', 'Evaluating', 'Deciding', 'Adjusting depth', 'Planning move', 'Reacting to sea', 'Tracking signals', 'Checking danger'];
  var v = verbs[Math.floor(R() * verbs.length)];
  return v + ': ' + tag + ' — ' + extra;
}

function decide(f, me) {
  var pol = f.model, b = { why: pol + ' decision at tick ' + g.tick + ' #' + Math.round(R() * 1e6) }, see = me.see, you = me.you;
  var fishSeen = see.filter(function (s) { return s.kind === 'fish'; });
  var bigger = fishSeen.filter(function (s) { return s.size > you.size * 1.15; });
  var prey = fishSeen.filter(function (s) { return s.size <= you.size / 1.55 || (s.size < you.size * 0.92 && you.hp > you.hpMax * 0.55); });
  var shark = see.filter(function (s) { return /shark|orca/.test(s.kind); })[0];
  var barracuda = see.filter(function (s) { return s.kind === 'barracuda'; })[0];
  var food = see.filter(function (s) {
    return /school|plankton|carcass|crab|shrimp|snail|urchin|scallop|clam|salp/.test(s.kind) &&
      !(s.kind === 'plankton cloud' && you.size > 2.5) &&
      !(/mackerel|snapper|tuna/.test(s.kind) && you.size < 1.5) &&
      !(s.kind === 'crab' && you.size < 1.3);
  })[0];

  if (pol === 'random') {
    b.act = 'swim'; b.heading = R() * 360; b.pitch = (R() - 0.5) * 40; b.speed = ['slow', 'cruise', 'fast'][Math.floor(R() * 3)]; b.dur = 20; return b;
  }
  if (pol === 'camper') {
    if (you.zone.indexOf('reef-shelf') < 0) { b.act = 'swim'; b.goto = [200, 260, 14]; b.speed = 'cruise'; b.dur = 60; }
    else { b.act = you.energy < you.energyMax * 0.5 ? 'feed' : 'hide'; b.dur = 60; }
    return b;
  }
  if (pol === 'smart') {
    if (shark && shark.dist < 46) {
      var nearK = OC.KELP.slice().sort(function (a, c) { return Math.hypot(a.x - you.x, a.z - you.z) - Math.hypot(c.x - you.x, c.z - you.z); })[0];
      b.act = 'swim'; b.goto = [nearK.x, nearK.z, 20]; b.speed = 'sprint'; b.dur = 14;
      b.why = smartWhy('retreating from ' + shark.kind + ' into kelp', 'dense cover breaks predator lock');
      return b;
    }
    if (barracuda && you.size < 2.2 && barracuda.dist < 22) {
      b.act = 'flee'; b.target = barracuda.id; b.speed = 'fast'; b.dur = 12;
      b.why = smartWhy('evading barracuda', 'too small for direct engagement');
      return b;
    }
    if ((you.bleeding || you.poisoned || you.hp < you.hpMax * 0.48) && Math.hypot(you.x - 204, you.z - 268) < 160) {
      b.act = Math.hypot(you.x - 204, you.z - 268) < 3.5 ? 'hide' : 'swim';
      b.goto = [204, 268, 14]; b.speed = you.bleeding ? 'fast' : 'cruise'; b.dur = 18;
      b.why = smartWhy('heading to reef cleaner station', you.bleeding ? 'bleeding draws sharks' : 'clearing poison and healing');
      return b;
    }
    if (you.depth < 5 && me.light.phase === 'day' && you.size < 3) {
      b.act = 'swim'; b.heading = you.heading; b.pitch = 45; b.speed = 'cruise'; b.dur = 10;
      b.why = smartWhy('diving below surface zone', 'daylight surface exposes small fish to birds');
      return b;
    }
    if (bigger.length && bigger[0].dist < 30) {
      var kp = OC.KELP.slice().sort(function (a, c) { return Math.hypot(a.x - you.x, a.z - you.z) - Math.hypot(c.x - you.x, c.z - you.z); })[0];
      b.act = 'swim'; b.goto = [kp.x, kp.z, 20]; b.speed = 'fast'; b.dur = 14;
      b.why = smartWhy('breaking line of sight from bigger fish ' + bigger[0].name, 'using kelp cover');
      return b;
    }
    if (prey.length && you.energy > you.energyMax * 0.25) {
      var p0 = prey[0];
      b.act = (p0.dist < 10 && you.stamina >= 40) ? 'lunge' : 'hunt';
      b.target = p0.id; b.speed = p0.dist < 10 ? 'sprint' : 'fast'; b.dur = 16;
      b.why = smartWhy('pursuing smaller fish ' + p0.name, 'favorable size advantage for bite or swallow');
      return b;
    }
    if (food && you.energy < you.energyMax * 0.96) {
      b.act = 'feed'; b.target = food.id; b.speed = food.dist > 16 ? 'fast' : 'cruise'; b.dur = 18;
      b.why = smartWhy('feeding on ' + food.kind, 'building energy reserves and growing');
      return b;
    }
    if (me.smell.length && you.energy < you.energyMax * 0.88) {
      b.act = 'feed'; b.heading = me.smell[0].bearing; b.pitch = me.smell[0].kind === 'carrion' ? 25 : 0; b.speed = 'cruise'; b.dur = 18;
      b.why = smartWhy('tracking ' + me.smell[0].kind + ' scent', 'locating richer food source');
      return b;
    }
    var spots = you.size < 2.8
      ? [[200, 260, 14], [120, 140, 20], [110, 420, 22], [380, 420, 50], [420, 95, 22]]
      : [[470, 330, 50], [380, 420, 50], [560, 220, 22], [200, 260, 14], [420, 610, 120]];
    var sp0 = spots[Math.floor(R() * spots.length)];
    b.act = 'feed'; b.goto = sp0; b.speed = 'cruise'; b.dur = 20;
    b.why = smartWhy('exploring sector ' + sp0[0] + ',' + sp0[1], 'searching for schools or prey');
    return b;
  }

  if (shark && shark.dist < 42) { b.act = 'flee'; b.target = shark.id; b.speed = 'sprint'; b.dur = 15; return b; }
  if (bigger.length && bigger[0].dist < 25) { b.act = 'flee'; b.target = bigger[0].id; b.speed = 'sprint'; b.dur = 12; return b; }
  if (pol === 'hunter' && prey.length) { b.act = 'hunt'; b.target = prey[0].id; b.speed = prey[0].dist < 8 ? 'sprint' : 'fast'; b.dur = 25; return b; }
  if (food && you.energy < you.energyMax * 0.85) { b.act = 'feed'; b.target = food.id; b.speed = 'cruise'; b.dur = 25; return b; }
  b.act = 'feed'; b.heading = R() * 360; b.pitch = (R() - 0.5) * 30; b.speed = 'cruise'; b.dur = 20; return b;
}

var ticks = Math.round(MIN * 60 / (C.TICK_MS / 1000));
for (var t = 0; t < ticks && g.status === 'running'; t++) {
  now += C.TICK_MS; OC.advance(g, now);
  g.fish.forEach(function (f) {
    if (!f.alive) return;
    if (g.tick >= next[f.id]) {
      var me = OC.perceive(g, f, now);
      var v = OC.validateCmd(decide(f, me));
      if (!v.ok) { errs++; console.log('CMD ERR', v.errs); }
      else {
        var delayMs = f.model === 'smart' ? (2500 + Math.floor(R() * 4500)) : Math.floor(R() * 900);
        OC.applyCmd(g, f, v.cmd, now + delayMs);
        cmds++;
      }
      next[f.id] = g.tick + 20 + Math.floor(R() * 60);
    }
  });
}
var snap = OC.snapshot(g, now);
assert.strictEqual(typeof snap.tide, 'number', 'expected snapshot.tide');
var kinds = {}; g.npcs.forEach(function (a) { kinds[a.sp] = (kinds[a.sp] || 0) + 1; });
console.log('status', g.status, 'tick', g.tick, 'cmds', cmds, 'errs', errs, 'npcs', snap.npcs.length, 'species', Object.keys(kinds).length, 'plants', OC.PLANTS.length, 'tide', snap.tide, 'carrion', g.carrion.length, 'json KB', Math.round(JSON.stringify(g).length / 1024), 'snap KB', Math.round(JSON.stringify(snap).length / 1024));
(g.ranks || []).forEach(function (r) {
  var f = g.fish.find(function (x) { return x.id === r.id; });
  console.log((r.alive ? 'ALIVE ' : 'dead  '), r.name.padEnd(6), r.model.padEnd(7), 'sz', r.size.toFixed(2), 'hp', Math.round(f.hp), 'en', Math.round(f.en), 'kills', r.kills, 'npc', r.animalsEaten, 'ate', r.eaten, 'score', r.score, r.cause || '', 'suspect=' + r.suspect);
});
console.log('feed tail:'); g.feed.slice(-10).forEach(function (e) { console.log('  ', e.t, e.txt); });
var m = OC.perceive(g, g.fish[8], now); console.log('sample /me keys', Object.keys(m), 'see', m.see.length, 'events', m.events.slice(0, 5));
if (g.status === 'finished' && errs === 0) console.log('TEST OK'); else { console.log('TEST FAIL'); process.exit(1); }
