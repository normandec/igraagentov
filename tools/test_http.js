// Protokolni in enotski test za build/ocean.bundle.js (v6 HTTP plast + ročni štart + bot/cheat detekcija + zgodovina) brez omrežja.
var fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
var crypto = require('crypto');

var root = path.join(__dirname, '..');
var bundle = fs.readFileSync(path.join(root, 'build/ocean.bundle.js'), 'utf8');
var ADMIN = 'ocean-admin-5e1d2c7b9a';

var db = {
  ocean_state: { id: 1, doc: null, rev: 0, tick: 0, gen: 0 },
  arena_pub: {
    'ocean:rules': fs.readFileSync(path.join(root, 'RULES-OCEAN.md'), 'utf8'),
    'ocean:prompt': fs.readFileSync(path.join(root, 'PROMPT-OCEAN.md'), 'utf8'),
    'ocean:prompt-en': fs.readFileSync(path.join(root, 'PROMPT-OCEAN-EN.md'), 'utf8')
  },
  ocean_games: []
};

function mockResponse(body, status) {
  var txt = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: (status || 200) >= 200 && (status || 200) < 300,
    status: status || 200,
    text: async function () { return txt; },
    json: async function () { return JSON.parse(txt); }
  };
}

var sandbox = {
  console: console, Math: Math, Date: Date, JSON: JSON, URL: URL, Number: Number, String: String, Object: Object, Array: Array, Error: Error, RegExp: RegExp,
  Uint8Array: Uint8Array, Promise: Promise, setTimeout: setTimeout, clearTimeout: clearTimeout,
  Response: function (body, init) {
    this.status = (init && init.status) || 200;
    this.headers = (init && init.headers) || {};
    this._body = body;
    this.text = async () => this._body == null ? '' : String(this._body);
    this.json = async () => JSON.parse(String(this._body));
  },
  crypto: { getRandomValues: function (arr) { var b = crypto.randomBytes(arr.length); for (var i = 0; i < arr.length; i++) arr[i] = b[i]; return arr; } },
  Deno: { env: { get: function (k) { return k === 'SUPABASE_URL' ? 'https://mock.supabase.co' : 'mock-service-key'; } } },
  fetch: async function (url, opts) {
    opts = opts || {};
    var u = new URL(url), p = u.pathname;
    if (p.endsWith('/ocean_state')) {
      if (opts.method === 'PATCH') {
        var revEq = Number((u.searchParams.get('rev') || '').replace('eq.', ''));
        if (db.ocean_state.rev !== revEq) return mockResponse([], 200);
        var b = JSON.parse(opts.body);
        db.ocean_state = { id: 1, doc: b.doc, rev: b.rev, tick: b.tick, gen: b.gen };
        return mockResponse([{ id: 1 }], 200);
      }
      if (opts.method === 'POST') {
        var b2 = JSON.parse(opts.body);
        db.ocean_state = { id: 1, doc: b2.doc, rev: b2.rev, tick: b2.tick, gen: b2.gen };
        return mockResponse('', 201);
      }
      if (u.searchParams.get('select') === 'id') return mockResponse(db.ocean_state.doc ? [{ id: 1 }] : [], 200);
      return mockResponse(db.ocean_state.doc ? [{ doc: db.ocean_state.doc, rev: db.ocean_state.rev }] : [], 200);
    }
    if (p.endsWith('/arena_pub')) {
      if (opts.method === 'POST') { var pb = JSON.parse(opts.body); db.arena_pub[pb.key] = pb.body; return mockResponse('', 201); }
      var k = (u.searchParams.get('key') || '').replace('eq.', '');
      return mockResponse(db.arena_pub[k] ? [{ body: db.arena_pub[k] }] : [], 200);
    }
    if (p.endsWith('/ocean_games')) {
      if (opts.method === 'POST') {
        var gp = JSON.parse(opts.body);
        db.ocean_games = db.ocean_games.filter(function (x) { return x.gen !== gp.gen; });
        db.ocean_games.unshift(gp);
        return mockResponse('', 201);
      }
      return mockResponse(db.ocean_games, 200);
    }
    return mockResponse({ error: 'unexpected fetch ' + url }, 500);
  }
};
sandbox.globalThis = sandbox;
vm.runInNewContext(bundle, sandbox);
var handler = sandbox.__ARENA_HANDLER;
assert(typeof handler === 'function', '__ARENA_HANDLER missing');

async function req(method, pathStr, body, ip) {
  var hdr = { 'content-type': 'application/json' };
  if (ip) hdr['x-forwarded-for'] = ip;
  var r = await handler({
    method: method,
    url: 'https://mock.supabase.co/functions/v1/ocean-arena' + pathStr,
    headers: { get: function (k) { return hdr[k.toLowerCase()] || null; } },
    text: async function () { return body == null ? '' : (typeof body === 'string' ? body : JSON.stringify(body)); }
  });
  var t = await r.text(), parsed = t;
  try { parsed = JSON.parse(t); } catch (e) { }
  return { status: r.status, body: parsed, raw: t };
}

(async function run() {
  var r = await req('GET', '/health');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.version, 'v6');

  // Ročni štart v čakalnici (manual=1)
  r = await req('GET', '/reset?admin=' + ADMIN + '&manual=1');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.manualStart, true);
  var gen0 = r.body.gen;

  r = await req('GET', '/chart');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.w, 800);
  assert.strictEqual(r.body.maxDepth, 180);
  assert(r.body.features.some(function (f) { return f.type === 'seagrass meadow'; }));

  // Zavrni štart s premalo ribami (0 ali 1)
  r = await req('GET', '/start?admin=' + ADMIN + '&in=0');
  assert.strictEqual(r.body.ok, false);

  // Zavrni placeholder model
  r = await req('POST', '/claim', { name: 'BadBot', model: '<VPIŠI TOČNO IME MODELA>', color: 'blue' }, '1.2.3.4');
  assert.strictEqual(r.status, 400);

  // Prijavi 10 rib — pod manual=1 se ne sme samodejno začeti!
  var keys = [];
  for (var i = 0; i < 10; i++) {
    r = await req('POST', '/claim', { name: 'Fish-' + i, model: 'model-' + i, color: 'orange' }, '10.0.0.' + (i + 1));
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.manualHold, true);
    assert.strictEqual(r.body.startsInSec, null);
    keys.push(r.body.key);
  }
  r = await req('GET', '/me?key=' + keys[0]);
  assert.strictEqual(r.body.status, 'lobby');
  assert.strictEqual(r.body.lobby.manualHold, true);

  // Gostitelj pritisne gumb za začetek igre
  r = await req('GET', '/start?admin=' + ADMIN + '&in=0');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.status, 'running');

  // Preveri v6 entitete v snapshotu (5 psov, 10 klignjev, raže, želve, barakude, murene)
  r = await req('GET', '/state?admin=' + ADMIN, null, '99.99.99.99');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.sharks.length, 5);
  assert.strictEqual(r.body.squids.length, 12);
  assert.strictEqual(r.body.rays.length, 6);
  assert.strictEqual(r.body.turtles.length, 6);
  assert.strictEqual(r.body.barracudas.length, 4);
  assert.strictEqual(r.body.morays.length, 4);

  // Anti-cheat /state brez admina
  r = await req('GET', '/state', null, '10.0.0.2');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.fish.find(function (f) { return f.n === 'Fish-1'; }).cheat, true);
  assert.strictEqual(r.body.fish.find(function (f) { return f.n === 'Fish-0'; }).cheat, false);

  // Ukazi & omejitev hitrosti
  r = await req('POST', '/cmd', { key: keys[0], act: 'feed', heading: 120, speed: 'cruise', dur: 15, why: 'moving toward coral reef for food' }, '10.0.0.1');
  assert.strictEqual(r.status, 200);
  r = await req('POST', '/cmd', { key: keys[0], act: 'swim', heading: 90, speed: 'fast', why: 'sending second command too soon' }, '10.0.0.1');
  assert.strictEqual(r.status, 429);

  // Zgodovina ob koncu igre
  db.ocean_state.doc.fish.forEach(function (f, idx) { if (idx > 0) { f.alive = false; f.hp = 0; f.died = 100; f.cause = 'test'; } });
  db.ocean_state.doc.lastMs -= 1000;
  r = await req('GET', '/report');
  assert.strictEqual(r.body.status, 'finished');
  r = await req('GET', '/history');
  assert.strictEqual(r.body.games[0].gen, gen0);

  // Reset pobije ključe
  r = await req('GET', '/reset?admin=' + ADMIN);
  assert.strictEqual(r.body.gen, gen0 + 1);
  r = await req('GET', '/me?key=' + keys[0]);
  assert.strictEqual(r.status, 401);

  console.log('HTTP TEST OK (all v6 assertions passed)');
})().catch(function (e) { console.error(e); process.exit(1); });
