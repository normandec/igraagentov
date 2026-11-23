// Structural checks for the procedural habitat assets, without a browser or GPU.
const assert = require('assert');
const vm = require('vm');
const fs = require('fs');
const THREE = require('../lib/three.min.js');
const ctx = { THREE, console, document: { createElement: () => ({ getContext: () => ({ fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, stroke() {} }) }) } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('viewer/creatures.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('viewer/reef.js', 'utf8'), ctx);
const reef = ctx.REEF;
for (const name of ['staghorn', 'kelp', 'grass', 'fan', 'table']) {
  const g = reef[name]();
  assert(g.attributes.position.count > 20, name + ' geometry is unexpectedly empty');
  assert(g.attributes.normal, name + ' missing normals');
  for (const value of g.attributes.position.array) assert(Number.isFinite(value), name + ' has invalid coordinates');
}
assert(reef.staghorn().attributes.color);
assert(reef.kelp().attributes.color);
assert(reef.fanTexture().isTexture);
assert(reef.brainTexture().isTexture);
const mat = reef.material({ vertexColors: true }, true);
const shader = { uniforms: {}, vertexShader: '#include <common>\n#include <begin_vertex>' };
mat.onBeforeCompile(shader);
reef.update(42);
assert.equal(shader.uniforms.uReefTime.value, 42);
assert(shader.vertexShader.includes('instanceMatrix'));
assert(shader.vertexShader.includes('reefWave'));
const build = fs.readFileSync('tools/build.js', 'utf8');
assert(build.includes("rd('viewer/reef.js')"));
console.log('REEF TEST OK');
