// Builds: build/ocean.bundle.js (Edge Function engine), OCEAN-ARENA.html and index.html (GitHub Pages viewer)
var fs = require('fs'), path = require('path');
var root = path.join(__dirname, '..');
function rd(p) { return fs.readFileSync(path.join(root, p), 'utf8'); }
var world = rd('engine/world.js') + '\n' + rd('engine/species.js'), engine = rd('engine/engine.js'), http = rd('engine/http.js');
var header = '// OCEAN ARENA v5 bundle — built ' + new Date().toISOString() + ' from engine/world.js + species.js + engine.js + http.js. DO NOT EDIT BY HAND.\n';
var bundle = header + world + '\n' + engine + '\n' + http + '\n';
fs.mkdirSync(path.join(root, 'build'), { recursive: true });
fs.writeFileSync(path.join(root, 'build/ocean.bundle.js'), bundle);
var tpl = fs.existsSync(path.join(root, 'viewer/viewer.html')) ? rd('viewer/viewer.html') : null;
if (tpl) {
  var three = rd('lib/three.min.js'), cjs = rd('viewer/creatures.js'), ojs = rd('viewer/ocean.js'), vjs = rd('viewer/viewer.js');
  var built = new Date().toISOString().slice(0, 16).replace('T', ' ');
  var html = tpl
    .replace('/*__THREE__*/', function () { return three; })
    .replace('/*__ENGINE__*/', function () { return world + '\n' + engine; })
    .replace('/*__CREATURES__*/', function () { return cjs; })
    .replace('/*__OCEAN__*/', function () { return ojs; })
    .replace('/*__VIEWER__*/', function () { return vjs; })
    .replace('__BUILT__', built);
  fs.writeFileSync(path.join(root, 'OCEAN-ARENA.html'), html);
  fs.writeFileSync(path.join(root, 'index.html'), html);
  console.log('OCEAN-ARENA.html & index.html', html.length, 'B');
}
console.log('build/ocean.bundle.js', bundle.length, 'B');
