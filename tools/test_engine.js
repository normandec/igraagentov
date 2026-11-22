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
assert.strictEqual(OC.SPECIES_LIST.length, 76, 'expected 76 species');
assert.strictEqual(OC.PLANTS.length, 1760, 'expected 1760 plants');
assert.strictEqual(typeof OC.tideAt(0), 'number', 'expected OC.tideAt');
assert.strictEqual(OC.SPECIES['whale'].size, 55, 'expected colossal whale size 55');
assert(OC.SPECIES['giant squid'], 'expected giant squid species');
assert(OC.floorAt(0, 0) < -20 && OC.floorAt(640, 640) < -20, 'expected surrounding mountains');
assert.strictEqual(OC.PLAYABLE_SPECIES.length, 77, 'expected 77 playable species (fish + 76 NPC species)');
assert(OC.PLAYABLE_SPECIES.indexOf('crab') >= 0 && OC.PLAYABLE_SPECIES.indexOf('whale') >= 0, 'expected crab..whale playable');

var N = +(process.argv[2] || 12), MIN = +(process.argv[3] || 25), SEED = +(process.argv[4] || 42);
var POL = ['random', 'random', 'feeder', 'feeder', 'feeder', 'hunter', 'hunter', 'camper', 'smart', 'smart'];
var g = OC.newGame(1, SEED);
assert.strictEqual(g.npcs.length, 630, 'expected 630 initial NPCs');
for (var i = 0; i < N; i++) OC.addFish(g, 'bot' + (i + 1), POL[i % POL.length], ['sand', 'kelp', 'blue', 'dark', 'silver', 'red', 'orange'][i % 7], 'k' + i);
assert.strictEqual(g.fish.length, N, 'expected unlimited seats');
// Verify Host lobby setRole works across fish, crab, dolphin, shark, whale & restores smart bots for simulation
assert.strictEqual(OC.setRole(g, g.fish[0].id, 'crab').fish.role, 'crab');
assert.strictEqual(OC.setRole(g, g.fish[1].id, 'dolphin').fish.role, 'dolphin');
assert.strictEqual(OC.setRole(g, g.fish[2].id, 'great white').fish.role, 'shark');
assert.strictEqual(OC.setRole(g, g.fish[3].id, 'whale').fish.role, 'giant');
assert.strictEqual(OC.say(g, g.fish[2], 'Fish spotted at 220,250!', 'sharks', 100).ok, true);
assert(g._sharkHint && g._sharkHint.x === 220 && g._sharkHint.z === 250, 'expected _sharkHint coordinates parsed from shark chat');
var dMe = OC.perceive(g, g.fish[1], 100), wMe = OC.perceive(g, g.fish[3], 100), sMe = OC.perceive(g, g.fish[2], 100);
assert(typeof dMe.you.air === 'number' && typeof wMe.you.air === 'number', 'expected air meter for dolphin & whale');
assert(sMe.chat.some(function (c) { return c.to === 'sharks' && c.msg.indexOf('220,250') >= 0; }), 'expected shark to read sharks chat');
assert(!dMe.chat.some(function (c) { return c.to === 'sharks'; }), 'expected dolphin not to see private sharks radio');
// Keep mixed roles for first 6 bots and classic fish for smart/camper/hunter variety
OC.setRole(g, g.fish[4].id, 'octopus');
OC.setRole(g, g.fish[5].id, 'fish');
OC.setRole(g, g.fish[6].id, 'fish');
OC.setRole(g, g.fish[7].id, 'fish');
OC.setRole(g, g.fish[8].id, 'fish');
OC.setRole(g, g.fish[9].id, 'fish');
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
  if (you.air !== undefined && you.air < 35) {
    b.act = 'swim'; b.heading = you.heading; b.pitch = -50; b.speed = 'cruise'; b.dur = 12;
    b.why = smartWhy('surfacing for air (' + you.air + '%)', you.species + ' needs oxygen');
    return b;
  }
  var fishSeen = see.filter(function (s) { return s.role === 'fish' || s.kind === 'fish'; });
  var bigger = fishSeen.filter(function (s) { return s.size > you.size * 1.15; });
  var prey = fishSeen.filter(function (s) { return you.role === 'shark' || you.role === 'predator' || s.size <= you.size / 1.55 || (s.size < you.size * 0.92 && you.hp > you.hpMax * 0.55); });
  var shark = you.role === 'shark' ? null : see.filter(function (s) { return /shark|orca/.test(s.kind); })[0];
  var barracuda = see.filter(function (s) { return s.kind === 'barracuda'; })[0];
  var food = see.filter(function (s) {
    return /school|plankton|carcass|crab|shrimp|snail|urchin|scallop|clam|salp|jellyfish/.test(s.kind) &&
      !(s.kind === 'plankton cloud' && you.size > 2.5 && you.species !== 'whale' && you.species !== 'whale shark' && you.species !== 'manta ray') &&
      !(/mackerel|snapper|tuna/.test(s.kind) && you.size < 1.5) &&
      !(s.kind === 'crab' && you.size < 1.3);
  })[0];

  if (you.role === 'shark' && prey.length) {
    b.act = 'hunt'; b.target = prey[0].id; b.speed = prey[0].dist < 18 ? 'sprint' : 'fast'; b.dur = 18;
    b.why = smartWhy('shark hunting ' + prey[0].name, 'tracking fish agent');
    if (R() < 0.15) { b.say = 'Chasing fish ' + prey[0].name + ' near ' + prey[0].x + ',' + prey[0].z; b.to = 'sharks'; }
    return b;
  }

  if (pol === 'random') {
    b.act = 'swim'; b.heading = R() * 360; b.pitch = (R() - 0.5) * 40; b.speed = ['slow', 'cruise', 'fast'][Math.floor(R() * 3)]; b.dur = 20; return b;
  }
  if (pol === 'camper') {
    if (you.zone.indexOf('reef-shelf') < 0) { b.act = 'swim'; b.goto = [184, 232, 13]; b.speed = 'cruise'; b.dur = 60; }
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
    if ((you.bleeding || you.poisoned || you.hp < you.hpMax * 0.48) && Math.hypot(you.x - 188, you.z - 236) < 160) {
      b.act = Math.hypot(you.x - 188, you.z - 236) < 3.5 ? 'hide' : 'swim';
      b.goto = [188, 236, 13]; b.speed = you.bleeding ? 'fast' : 'cruise'; b.dur = 18;
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
      ? [[184, 232, 13], [140, 160, 18], [135, 360, 20], [320, 340, 40], [335, 115, 20]]
      : [[380, 290, 48], [320, 340, 40], [450, 220, 22], [184, 232, 13], [360, 470, 95]];
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
