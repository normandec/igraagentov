// Regression tests for predator selection in the shared wild-prey cache.
const fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..');
new Function(['engine/world.js', 'engine/species.js', 'engine/engine.js'].map(p => fs.readFileSync(path.join(root, p), 'utf8')).join('\n'))();
const OC = globalThis.OC;
function isolate(species) {
  const g = OC.newGame(3, 42);
  g.npcs = species.map((name, i) => {
    const npc = g.npcs.filter(n => n.sp === name)[species.slice(0, i).filter(s => s === name).length];
    assert(npc, 'missing ' + name); Object.assign(npc, { x: 320, z: 320, d: 20, hx: 320, hz: 320, hd: 20, ph: 3, cool: 0, sat: 0, tg: null }); return npc;
  });
  return g;
}
for (const name of ['seal', 'swordfish', 'barracuda']) {
  const g = isolate([name, name]), [a, b] = g.npcs;
  const health = [a.hp, b.hp];
  // Also check that invalid sticky targets from an older game are discarded.
  a.tg = a.id; b.tg = a.id;
  OC.stepOnce(g);
  assert.deepStrictEqual([a.hp, b.hp], health, name + ' must not attack itself or a peer');
  assert.notStrictEqual(a.tg, a.id, 'self-target retained');
  assert.notStrictEqual(b.tg, a.id, 'same-species target retained');
}
const g = isolate(['swordfish', 'seal']);
const [hunter, prey] = g.npcs, hp = prey.hp;
OC.stepOnce(g);
assert(prey.hp < hp, 'swordfish should still attack eligible wild prey');
assert.strictEqual(hunter.hp, OC.SPECIES.swordfish.hp, 'hunter must not injure itself');
console.log('PREDATOR TEST OK');
