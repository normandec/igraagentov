// Zgradi: build/ocean.bundle.js (pogon za Edge Function), OCEAN-ARENA.html in index.html (gledalec za GitHub Pages)
var fs = require('fs'), path = require('path');
var root = path.join(__dirname, '..');
function rd(p) { return fs.readFileSync(path.join(root, p), 'utf8'); }
var world = rd('engine/world.js'), engine = rd('engine/engine.js'), http = rd('engine/http.js');
var header = '// OCEAN ARENA bundle — zgrajeno ' + new Date().toISOString() + ' iz engine/world.js + engine.js + http.js. NE UREJAJ ROČNO.\n';
var bundle = header + world + '\n' + engine + '\n' + http + '\n';
fs.mkdirSync(path.join(root, 'build'), { recursive: true });
fs.writeFileSync(path.join(root, 'build/ocean.bundle.js'), bundle);
var tpl = fs.existsSync(path.join(root, 'viewer/viewer.html')) ? rd('viewer/viewer.html') : null;
if (tpl) {
  var three = rd('lib/three.min.js'), vjs = rd('viewer/viewer.js');
  var built = new Date().toISOString().slice(0, 16).replace('T', ' ');
  var html = tpl
    .replace('/*__THREE__*/', function () { return three; })
    .replace('/*__ENGINE__*/', function () { return world + '\n' + engine; })
    .replace('/*__VIEWER__*/', function () { return vjs; })
    .replace('__BUILT__', built);
  fs.writeFileSync(path.join(root, 'OCEAN-ARENA.html'), html);
  fs.writeFileSync(path.join(root, 'index.html'), html);
  console.log('OCEAN-ARENA.html & index.html', html.length, 'B');
}
console.log('build/ocean.bundle.js', bundle.length, 'B');
