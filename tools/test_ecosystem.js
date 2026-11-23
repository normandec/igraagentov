// Run the whole 25-minute ecosystem without players, including the late events.
const fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..');
new Function(['engine/world.js', 'engine/species.js', 'engine/engine.js'].map(p => fs.readFileSync(path.join(root, p), 'utf8')).join('\n'))();
const OC = globalThis.OC, game = OC.newGame(37, 42);
OC.start(game, 1000000);
while (game.status === 'running') OC.stepOnce(game);
assert.strictEqual(game.tick, OC.CONST.MAX_TICKS);
for (const animal of game.npcs) {
  for (const key of ['x', 'z', 'd', 'h', 'spd', 'hp']) assert(Number.isFinite(animal[key]), animal.id + ' invalid ' + key);
  assert(animal.x >= 0 && animal.x <= OC.W && animal.z >= 0 && animal.z <= OC.L, animal.id + ' outside arena');
  assert.notStrictEqual(animal.tg, animal.id, animal.id + ' targeted itself');
}
const snapshot = OC.snapshot(game, 1000000 + game.tick * OC.CONST.TICK_MS);
assert.strictEqual(snapshot.status, 'finished');
assert(snapshot.npcs.length > 0);
console.log('ECOSYSTEM TEST OK ·', game.tick, 'ticks ·', snapshot.npcs.length, 'live NPCs');
