// Brezglavi test pogona v6: node tools/test_engine.js [nFish] [minutes] [seed]
// Boti različnih "pameti" → preveri, da igra teče, se konča in da pametna taktika močno prekaša naivne.
var fs = require('fs'), path = require('path');
var root = path.join(__dirname, '..');
new Function(fs.readFileSync(path.join(root, 'engine/world.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'engine/engine.js'), 'utf8'))();
var OC = globalThis.OC, C = OC.CONST;
var N = +(process.argv[2] || 10), MIN = +(process.argv[3] || 25), SEED = +(process.argv[4] || 42);
var POL = ['random', 'random', 'feeder', 'feeder', 'feeder', 'hunter', 'hunter', 'camper', 'smart', 'smart'];
var g = OC.newGame(1, SEED);
for (var i = 0; i < N; i++) OC.addFish(g, 'bot' + (i + 1), POL[i % POL.length], ['sand', 'kelp', 'blue', 'dark', 'silver', 'red', 'orange'][i % 7], 'k' + i);
var now = 1000000; OC.start(g, now);
var rs = { rs: SEED * 31 + 7 }; function R() { return OC.rnd(rs); }
var next = {}; g.fish.forEach(function (f) { next[f.id] = 1 + Math.floor(R() * 40); });
var cmds = 0, errs = 0;

function smartWhy(tag, extra) {
  var verbs = ['Opazujem', 'Ocenjujem', 'Odločam se', 'Prilagajam globino', 'Načrtujem premik', 'Reagiram na okolje', 'Sledim razmeram', 'Preverjam nevarnost'];
  var v = verbs[Math.floor(R() * verbs.length)];
  return v + ': ' + tag + ' — ' + extra;
}
function normH(a) { a = a % 360; return a < 0 ? a + 360 : a; }

function decide(f, me) {
  var pol = f.model, b = { why: pol + ' decision at tick ' + g.tick + ' ' + Math.round(R() * 1e6) }, see = me.see, you = me.you;
  var fishSeen = see.filter(function (s) { return s.kind === 'fish'; });
  var bigger = fishSeen.filter(function (s) { return s.size > you.size * 1.15; });
  var prey = fishSeen.filter(function (s) { return s.size <= you.size / 1.55 || (s.size < you.size * 0.92 && you.hp > you.hpMax * 0.55); });
  var shark = see.filter(function (s) { return s.kind === 'shark'; })[0];
  var cuda = see.filter(function (s) { return s.kind === 'barracuda'; })[0];
  var edibleKinds = ['sardine school', 'lanternfish school', 'plankton cloud', 'crab', 'carcass'];
  if (you.size >= 1.8) edibleKinds.push('squid');
  if (you.size >= 3.8) edibleKinds.push('sea turtle', 'barracuda', 'moray eel');
  if (you.size >= 4.5) edibleKinds.push('pufferfish');
  if (you.size >= 5.5) edibleKinds.push('manta ray');
  var food = see.filter(function (s) {
    return edibleKinds.indexOf(s.kind) >= 0 &&
      !(s.kind === 'plankton cloud' && you.size > 2.6) &&
      !(s.kind === 'crab' && you.size < 1.3);
  })[0];

  if (pol === 'random') {
    b.act = 'swim'; b.heading = R() * 360; b.pitch = (R() - 0.5) * 40; b.speed = ['slow', 'cruise', 'fast'][Math.floor(R() * 3)]; b.dur = 20; return b;
  }
  if (pol === 'camper') {
    if (you.zone.indexOf('reef-main') < 0) { b.act = 'swim'; b.goto = [214, 256, 18]; b.speed = 'cruise'; b.dur = 60; }
    else { b.act = you.energy < you.energyMax * 0.5 ? 'feed' : 'hide'; b.dur = 60; }
    return b;
  }
  if (pol === 'smart') {
    if (shark && shark.dist < 46 && (shark.speed > 2.2 || shark.state === 'hunt' || shark.state === 'pack')) {
      var nearK = OC.KELP.slice().sort(function (a, c) { return Math.hypot(a.x - you.x, a.z - you.z) - Math.hypot(c.x - you.x, c.z - you.z); })[0];
      b.act = 'swim'; b.goto = [nearK.x, nearK.z, 20]; b.speed = 'sprint'; b.dur = 14;
      b.why = smartWhy('umikam se pred tropom morskih psov v gozd alg', 'zavetje ustavi napad plenilca');
      return b;
    }
    if (cuda && you.size < 2.2 && cuda.dist < 22) {
      b.act = 'flee'; b.target = cuda.id; b.speed = 'fast'; b.dur = 12;
      b.why = smartWhy('umikam se pred barakudo', 'sem premajhna za neposreden spopad');
      return b;
    }
    if ((you.bleeding || you.poisoned || you.hp < you.hpMax * 0.48) && Math.hypot(you.x - 214, you.z - 256) < 160) {
      b.act = Math.hypot(you.x - 214, you.z - 256) < 4.5 ? 'hide' : 'swim';
      b.goto = [214, 256, 18]; b.speed = you.bleeding ? 'fast' : 'cruise'; b.dur = 18;
      b.why = smartWhy('plavam k čistilcem na glavnem grebenu', you.bleeding ? 'krvavitev privablja morske pse' : 'celim poškodbe in strup');
      return b;
    }
    if (you.depth < 5 && me.light.phase === 'day' && you.size < 3) {
      b.act = 'swim'; b.heading = you.heading; b.pitch = 45; b.speed = 'cruise'; b.dur = 10;
      b.why = smartWhy('potapljam se pod gladino', 'podnevi nad gladino grozijo morske ptice');
      return b;
    }
    if (bigger.length && bigger[0].dist < 30) {
      if (you.size <= 2.0 && Math.hypot(you.x - 278, you.z - 175) < 90) {
        b.act = 'swim'; b.goto = [278, 175, 22]; b.speed = 'sprint'; b.dur = 15;
        b.why = smartWhy('zatekam se v vrt vetrnic', 'večja riba me tam ne more preganjati');
      } else {
        var kp = OC.KELP.slice().sort(function (a, c) { return Math.hypot(a.x - you.x, a.z - you.z) - Math.hypot(c.x - you.x, c.z - you.z); })[0];
        b.act = 'swim'; b.goto = [kp.x, kp.z, 20]; b.speed = 'fast'; b.dur = 14;
        b.why = smartWhy('bežim v gost kelp pred večjo ribo', 'skrivališče bo prekinilo vidni stik');
      }
      return b;
    }
    if (prey.length && you.energy > you.energyMax * 0.25) {
      var p0 = prey[0];
      b.act = (p0.dist < 10 && you.stamina >= 40) ? 'lunge' : 'hunt';
      b.target = p0.id; b.speed = p0.dist < 10 ? 'sprint' : 'fast'; b.dur = 16;
      b.why = smartWhy('lovim šibkejšo ali ranjeno ribo', 'ugodna razlika v velikosti za napad');
      return b;
    }
    if (food && you.energy < you.energyMax * 0.96) {
      b.act = 'feed'; b.target = food.id; b.speed = food.dist > 16 ? 'fast' : 'cruise'; b.dur = 18;
      b.why = smartWhy('lovim in hranim se z bližnjim plenom', 'polnim zalogo energije za hitro rast');
      return b;
    }
    if (me.smell.length && you.energy < you.energyMax * 0.88) {
      b.act = 'feed'; b.heading = me.smell[0].bearing; b.pitch = me.smell[0].kind === 'carrion' ? 25 : 0; b.speed = 'cruise'; b.dur = 18;
      b.why = smartWhy('sledim močnemu vonju po morskem toku', 'iščem bogatejši vir hrane');
      return b;
    }
    var nearSpots = you.size < 2.8
      ? [[210, 250, 22], [165, 435, 22], [295, 325, 26], [325, 250, 24], [395, 360, 32]]
      : [[420, 410, 56], [465, 130, 32], [272, 565, 48], [210, 250, 22], [405, 625, 132]];
    var sp0 = nearSpots[Math.floor(R() * nearSpots.length)];
    b.act = 'feed'; b.goto = sp0; b.speed = 'cruise'; b.dur = 20;
    b.why = smartWhy('raziskujem območje ' + sp0[0] + ',' + sp0[1], 'iščem nove jate, klignje ali tekmece');
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
var sharkKills = g.sharks.reduce(function (a, s) { return a + s.kills; }, 0);
var npcTotal = g.sharks.length + g.squids.length + g.rays.length + g.turtles.length + g.barracudas.length + g.morays.length + g.crabs.length + g.puffers.length;
console.log('status', g.status, 'tick', g.tick, 'cmds', cmds, 'errs', errs, 'npc', npcTotal, 'flora', OC.FLORA.length, 'json KB', Math.round(JSON.stringify(g).length / 1024), 'snap KB', Math.round(JSON.stringify(snap).length / 1024));
OC.rankList(g).forEach(function (r) {
  var f = g.fish.find(function (x) { return x.id === r.id; });
  console.log((r.alive ? 'ALIVE ' : 'dead  '), r.name.padEnd(6), r.model.padEnd(7), 'sz', r.size.toFixed(2), 'hp', Math.round(f.hp), 'en', Math.round(f.en), 'kills', r.kills, 'ate', r.eaten, 'exp', r.explored, 'score', r.score, r.cause || '', 'suspect=' + r.suspect);
});
console.log('shark kills', sharkKills, 'carrion', g.carrion.length, 'inks', g.inks.length);
var m = OC.perceive(g, g.fish[8], now); console.log('sample /me keys', Object.keys(m), 'see', m.see.length, 'events', m.events.slice(0, 5));
if (g.status === 'finished' && errs === 0) console.log('TEST OK'); else console.log('TEST FAIL');
