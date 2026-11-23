// Behaviour, species coverage and visual school response regression tests.
const fs = require('fs'), path = require('path'), assert = require('assert'), vm = require('vm');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
new Function(['engine/world.js', 'engine/species.js', 'engine/engine.js'].map(read).join('\n'))();
const OC = globalThis.OC;
function isolated() {
  const g = OC.newGame(4, 42), school = g.npcs.find(a => a.sp === 'sardine');
  const visitor = g.npcs.find(a => a.sp === 'sea turtle');
  g.npcs = [school, visitor];
  Object.assign(school, { x: 320, z: 320, d: 15, hx: 320, hz: 320, hd: 15, h: 0, tm: 0, tg: null });
  Object.assign(visitor, { x: 324, z: 320, d: 15, spd: 2, hx: 324, hz: 320, hd: 15 });
  return { g, school, visitor };
}
{
  const { g, school, visitor } = isolated();
  OC.stepOnce(g);
  assert.equal(school.st, 'flee', 'school must react to a non-predatory large swimmer');
  assert.equal(school.tg, visitor.id);
  assert(school.spd > OC.SPECIES.sardine.speed);
  const snap = OC.snapshot(g, 0).npcs.find(a => a.id === school.id);
  assert.equal(snap.tg, visitor.id, 'reaction survives snapshot');
  visitor.x = 500; visitor.z = 500;
  for (let i = 0; i < 30; i++) OC.stepOnce(g);
  assert.equal(school.st, 'school', 'school should recover after the disturbance');
  assert.equal(school.tg, null);
}
{
  const { g, school, visitor } = isolated(); visitor.d = 80;
  OC.stepOnce(g);
  assert.equal(school.st, 'school', 'vertical separation must matter');
}
{
  const g = OC.newGame(6, 42), small = g.npcs.find(a => a.sp === 'clownfish'), shark = g.npcs.find(a => a.sp === 'reef shark');
  g.npcs = [small, shark];
  Object.assign(small, { x: 320, z: 320, d: 15, hx: 320, hz: 320, hd: 15, h: 0 });
  Object.assign(shark, { x: 325, z: 320, d: 15, spd: 3, sat: 50 });
  OC.stepOnce(g);
  assert.equal(small.st, 'flee', 'reef fish should react to wild predators');
}
{
  const g = OC.newGame(7, 42), fish = g.npcs.find(a => a.sp === 'clownfish');
  g.npcs = [fish]; Object.assign(fish, { x: 320, z: 320, d: 10, hx: 320, hz: 320, hd: 10, h: 0 });
  for (let i = 0; i < 120; i++) OC.stepOnce(g);
  assert(fish.d < OC.floorAt(fish.x, fish.z) - 2, 'reef fish must not be forced onto seabed');
}
{
  const g = OC.newGame(10, 42), starfish = g.npcs.find(a => a.sp === 'starfish');
  g.npcs = [starfish]; Object.assign(starfish, { x: 184, z: 232, d: 8, hx: 184, hz: 232, hd: 8 });
  for (let i = 0; i < 400; i++) OC.stepOnce(g);
  assert(Math.abs(starfish.d - OC.floorAt(starfish.x, starfish.z)) < 1.5, 'bottom-dweller should remain near the seabed');
}
{
  // A filter feeder must feed, leave the patch and cruise, rather than orbit
  // one endlessly regenerating plankton cloud forever.
  let g = OC.newGame(8, 42), animal = g.npcs.find(a => a.sp === 'whale shark');
  g.npcs = [animal]; Object.assign(animal, { x: 320, z: 320, d: 20, h: 0 });
  g.plankton = [{ id: 'p1', x: 320, z: 320, d: 20, r: 16, amt: 100 }];
  const states = new Set(); let maxDistance = 0;
  for (let i = 0; i < 450; i++) {
    OC.stepOnce(g); states.add(animal.st); maxDistance = Math.max(maxDistance, Math.hypot(animal.x - 320, animal.z - 320));
    if (i === 120) { g = JSON.parse(JSON.stringify(g)); animal = g.npcs[0]; }
  }
  assert(states.has('feeding') && states.has('cruise'), 'filter feeder should feed and then travel');
  assert(maxDistance > 25, 'filter feeder did not leave its cloud');
}
{
  // A feeding turtle must still notice a nearby predator.
  const g = OC.newGame(9, 42), turtle = g.npcs.find(a => a.sp === 'sea turtle'), shark = g.npcs.find(a => a.sp === 'reef shark');
  g.npcs = [turtle, shark];
  Object.assign(turtle, { x: 320, z: 320, d: 15, hx: 320, hz: 320, hd: 15 });
  Object.assign(shark, { x: 325, z: 320, d: 15, spd: 3, sat: 50 });
  g.blooms = [{ id: 'j1', x: 320, z: 320, d: 15, d0: 5, d1: 25, r: 10, n: 40, hx: 320, hz: 320 }];
  OC.stepOnce(g);
  assert.equal(turtle.st, 'flee', 'turtle feeding should not override predator response');
}
{
  const g = OC.newGame(5, 42), sharks = g.npcs.filter(a => OC.SPECIES[a.sp].kind === 'shark');
  const travel = Object.fromEntries(sharks.map(a => [a.id, 0]));
  const bounds = Object.fromEntries(sharks.map(a => [a.id, { minx: a.x, maxx: a.x, minz: a.z, maxz: a.z }]));
  for (let i = 0; i < 600; i++) {
    const before = Object.fromEntries(sharks.map(a => [a.id, [a.x, a.z]]));
    OC.stepOnce(g);
    for (const a of sharks) if (a.alive) {
      travel[a.id] += Math.hypot(a.x - before[a.id][0], a.z - before[a.id][1]);
      const b = bounds[a.id]; b.minx = Math.min(b.minx, a.x); b.maxx = Math.max(b.maxx, a.x); b.minz = Math.min(b.minz, a.z); b.maxz = Math.max(b.maxz, a.z);
    }
  }
  for (const a of sharks) if (a.alive) {
    assert(travel[a.id] > 100, a.sp + ' is not covering distance: ' + travel[a.id]);
    const b = bounds[a.id]; assert(Math.hypot(b.maxx-b.minx, b.maxz-b.minz) > 40, a.sp + ' is circling in one place');
  }
  assert(!g._schoolThreats, 'temporary spatial cache leaked into persistent state');
}
const ctx = { THREE: require('../lib/three.min.js'), console, Math };
vm.createContext(ctx);
vm.runInContext(read('viewer/creatures.js'), ctx);
vm.runInContext(read('viewer/schools.js'), ctx);
for (const name of Object.keys(OC.SPECIES)) {
  assert(ctx.CR.SPEC[name], 'no visual specification for ' + name);
  const model = ctx.CR.creature(name), g = model.userData.mesh.geometry;
  assert(g.attributes.position.count > 0, 'empty model: ' + name);
  assert.equal(g.attributes.aSkin.count, g.attributes.position.count, name + ': missing skin mask');
  assert.equal(g.attributes.aBio.count, g.attributes.position.count, name + ': missing skin coordinates');
  for (const value of g.attributes.position.array) assert(Number.isFinite(value), name + ': invalid geometry');
  ctx.CR.animate(model, 1, 2, 0, 0.016);
  assert(Number.isFinite(model.userData.u.uSwim.value));
}
{
  const seahorse = ctx.CR.creature('seahorse');
  assert.equal(seahorse.userData.mode, 8, 'seahorse should flutter its dorsal fin');
  seahorse.userData.mesh.geometry.computeBoundingBox();
  const box = seahorse.userData.mesh.geometry.boundingBox;
  assert(box.max.y - box.min.y > box.max.z - box.min.z, 'seahorse must be upright');
  const turtle = ctx.CR.creature('sea turtle');
  assert.equal(turtle.userData.mode, 7, 'turtle should use flipper swimming');
  const whaleShark = ctx.CR.creature('whale shark');
  assert.equal(whaleShark.userData.u.uSkin.value, 3, 'whale shark should have fine spot pattern');
  const material = whaleShark.userData.mat;
  const shader = { uniforms: {}, vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <color_fragment>\n#include <lights_fragment_end>' };
  material.onBeforeCompile(shader);
  assert(shader.fragmentShader.includes('spot * top'));
  assert.equal(shader.uniforms.uSkin.value, 3);
}
{
  const S = ctx.SCHOOL_VISUAL, school = { id: 's', sp: 'sardine', x: 320, z: 320, d: 15 }, fish = { id: 'f', x: 321, z: 320, d: 15, sz: 2, spd: 2, alive: true };
  const grid = S.grid({ fish: [fish], npcs: [school] }, OC.SPECIES);
  assert.equal(S.nearest(grid, school, OC.SPECIES).id, 'f');
  const a = { ph: 0 }, b = { ph: 1 };
  for (let i = 0; i < 20; i++) { S.displace(a, 321, -15, 320, fish, 5, .05); S.displace(b, 322, -15, 320, fish, 5, .05); }
  assert(Math.hypot(a.sx, a.sy, a.sz) > 1 && b.sx > 0, 'fish should part around intruder');
  for (let i = 0; i < 200; i++) S.displace(a, 321, -15, 320, null, 0, .05);
  assert(Math.hypot(a.sx, a.sy, a.sz) < .01, 'fish should regroup');
}
console.log('WILDLIFE TEST OK ·', Object.keys(OC.SPECIES).length, 'species · school reaction · shark travel');
