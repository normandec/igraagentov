// Brezglavi test pogona: node tools/test_engine.js [nFish] [minutes] [seed]
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
var rs = { s: SEED * 31 + 7 }; function R() { return OC.rnd(rs); } rs.rs = rs.s;
var next = {}; g.fish.forEach(function (f) { next[f.id] = 1 + Math.floor(R() * 40); });
var cmds = 0, errs = 0;

function smartWhy(tag, extra) {
  var verbs = ['Opazujem', 'Ocenjujem', 'Odločam se', 'Prilagajam globino', 'Načrtujem premik', 'Reagiramo na okolje', 'Sledim razmeram', 'Preverjam nevarnost'];
  var v = verbs[Math.floor(R() * verbs.length)];
  return v + ': ' + tag + ' — ' + extra;
}

function decide(f, me) {
  var pol = f.model, b = { why: pol + ' decision at tick ' + g.tick + ' ' + Math.round(R() * 1e6) }, see = me.see, you = me.you;
  var fishSeen = see.filter(function (s) { return s.kind === 'fish'; });
  var bigger = fishSeen.filter(function (s) { return s.size > you.size * 1.15; });
  var prey = fishSeen.filter(function (s) { return s.size <= you.size / 1.55 || (s.size < you.size * 0.92 && you.hp > you.hpMax * 0.55); });
  var shark = see.filter(function (s) { return s.kind === 'shark'; })[0];
  var edibleKinds = ['sardine school', 'lanternfish school', 'plankton cloud', 'crab', 'carcass'];
  if (you.size >= 4.5) edibleKinds.push('pufferfish');
  var food = see.filter(function (s) {
    return edibleKinds.indexOf(s.kind) >= 0 &&
      !(s.kind === 'plankton cloud' && you.size > 2.6) &&
      !(s.kind === 'crab' && you.size < 1.3);
  })[0];

  if (pol === 'random') {
    b.act = 'swim'; b.heading = R() * 360; b.pitch = (R() - 0.5) * 40; b.speed = ['slow', 'cruise', 'fast'][Math.floor(R() * 3)]; b.dur = 20; return b;
  }
  if (pol === 'camper') {
    if (you.zone.indexOf('reef') < 0) { b.act = 'swim'; b.goto = [118, 140, 16]; b.speed = 'cruise'; b.dur = 60; }
    else { b.act = you.energy < you.energyMax * 0.5 ? 'feed' : 'hide'; b.dur = 60; }
    return b;
  }
  if (pol === 'smart') {
    if (shark && shark.dist < 42 && shark.speed > 2.0) {
      var k = OC.KELP[Math.floor(R() * OC.KELP.length)];
      b.act = 'swim'; b.goto = [k.x, k.z, 18]; b.speed = 'sprint'; b.dur = 14;
      b.why = smartWhy('bežim pred morskim psom v zavetje', 'razdalja do plenilca pod varno mejo');
      return b;
    }
    if ((you.bleeding || you.poisoned || you.hp < you.hpMax * 0.48) && Math.hypot(you.x - 118, you.z - 140) < 110) {
      b.act = Math.hypot(you.x - 118, you.z - 140) < 4.5 ? 'hide' : 'swim';
      b.goto = [118, 140, 16]; b.speed = you.bleeding ? 'fast' : 'cruise'; b.dur = 18;
      b.why = smartWhy('umik k čistilcem na grebenu', you.bleeding ? 'krvavitev privablja morskega psa' : 'zdravim rane ali strup');
      return b;
    }
    if (you.depth < 5 && me.light.phase === 'day' && you.size < 3) {
      b.act = 'swim'; b.heading = you.heading; b.pitch = 45; b.speed = 'cruise'; b.dur = 10;
      b.why = smartWhy('potapljam se pod gladino', 'podnevi nad gladino grozijo ptice');
      return b;
    }
    if (bigger.length && bigger[0].dist < 28) {
      if (you.size <= 1.8 && Math.hypot(you.x - 162, you.z - 110) < 55) {
        b.act = 'swim'; b.goto = [162, 110, 20]; b.speed = 'sprint'; b.dur = 15;
        b.why = smartWhy('umikam se v vrt anemon', 'večja tekmica me tam ne more slediti');
      } else {
        var kp = OC.KELP[1]; b.act = 'swim'; b.goto = [kp.x, kp.z, 18]; b.speed = 'fast'; b.dur = 14;
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
    if (food && you.energy < you.energyMax * 0.9) {
      b.act = 'feed'; b.target = food.id; b.speed = food.dist > 15 ? 'fast' : 'cruise'; b.dur = 20;
      b.why = smartWhy('prehranjujem se z izbranim plenom', 'energija pada in želim zrasti');
      return b;
    }
    if (me.smell.length && you.energy < you.energyMax * 0.78) {
      b.act = 'feed'; b.heading = me.smell[0].bearing; b.pitch = me.smell[0].kind === 'carrion' ? 25 : 0; b.speed = 'cruise'; b.dur = 20;
      b.why = smartWhy('sledim vonju skozi tok', 'išče bogatejši vir hrane v globini');
      return b;
    }
    if (you.energy > you.energyMax * 0.82 && you.depth < 54 && me.t < 960) {
      b.act = 'swim'; b.heading = normH(you.heading + 45); b.pitch = 35; b.speed = 'slow'; b.dur = 20;
      b.why = smartWhy('varčujem z energijo v hladnejši globini', 'polna rezerva omogoča počasno opazovanje');
      return b;
    }
    var spots = me.t >= 960 && you.size >= 3.0 ? [[115, 135, 16], [85, 200, 18], [60, 80, 18], [220, 222, 62]] : [[205, 325, 102], [240, 340, 68], [115, 135, 16], [220, 222, 62]];
    var sp0 = spots[Math.floor(R() * spots.length)];
    b.act = 'feed'; b.goto = sp0; b.speed = you.energy > you.energyMax * 0.7 ? 'slow' : 'cruise'; b.dur = 22;
    b.why = smartWhy('raziskujem morsko območje ' + sp0[0] + ',' + sp0[1], 'iščem ribje jate ali tekmece v skrivališčih');
    return b;
  }

  if (shark && shark.dist < 40) { b.act = 'flee'; b.target = 'shark'; b.speed = 'sprint'; b.dur = 15; return b; }
  if (bigger.length && bigger[0].dist < 25) { b.act = 'flee'; b.target = bigger[0].id; b.speed = 'sprint'; b.dur = 12; return b; }
  if (pol === 'hunter' && prey.length) { b.act = 'hunt'; b.target = prey[0].id; b.speed = prey[0].dist < 8 ? 'sprint' : 'fast'; b.dur = 25; return b; }
  if (food && you.energy < you.energyMax * 0.85) { b.act = 'feed'; b.target = food.id; b.speed = 'cruise'; b.dur = 25; return b; }
  b.act = 'feed'; b.heading = R() * 360; b.pitch = (R() - 0.5) * 30; b.speed = 'cruise'; b.dur = 20; return b;
}
function normH(a) { a = a % 360; return a < 0 ? a + 360 : a; }

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
console.log('status', g.status, 'tick', g.tick, 'cmds', cmds, 'errs', errs, 'json KB', Math.round(JSON.stringify(g).length / 1024), 'snap KB', Math.round(JSON.stringify(snap).length / 1024));
OC.rankList(g).forEach(function (r) {
  var f = g.fish.find(function (x) { return x.id === r.id; });
  console.log((r.alive ? 'ALIVE ' : 'dead  '), r.name.padEnd(6), r.model.padEnd(7), 'sz', r.size.toFixed(2), 'hp', Math.round(f.hp), 'en', Math.round(f.en), 'kills', r.kills, 'ate', r.eaten, 'exp', r.explored, 'score', r.score, r.cause || '', 'suspect=' + r.suspect);
});
console.log('shark kills', g.shark.kills, 'carrion', g.carrion.length, 'feed tail:'); g.feed.slice(-8).forEach(function (e) { console.log('  ', e.t, e.txt); });
var m = OC.perceive(g, g.fish[8], now); console.log('sample /me keys', Object.keys(m), 'see', m.see.length, 'events', m.events.slice(0, 5));
if (g.status === 'finished' && errs === 0) console.log('TEST OK'); else console.log('TEST FAIL');
