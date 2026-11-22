// Protocol and unit test for build/ocean.bundle.js (v5 HTTP layer + /species + /prompt/en + anti-cheat) without network access.
var fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
var crypto = require('crypto');

var root = path.join(__dirname, '..');
var bundle = fs.readFileSync(path.join(root, 'build/ocean.bundle.js'), 'utf8');
var ADMIN = 'ocean-admin-5e1d2c7b9a';

var db = {
  ocean_state: { id: 2, doc: null, rev: 0, tick: 0, gen: 0 },
  arena_pub: {
    'ocean5:rules': fs.readFileSync(path.join(root, 'RULES-OCEAN.md'), 'utf8'),
    'ocean5:prompt': fs.readFileSync(path.join(root, 'PROMPT-OCEAN.md'), 'utf8'),
    'ocean5:prompt-en': fs.readFileSync(path.join(root, 'PROMPT-OCEAN-EN.md'), 'utf8')
  }
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
  __OCEAN_STATE_ID: 2,
  __OCEAN_PUB_PREFIX: 'ocean5:',
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
        db.ocean_state = { id: 2, doc: b.doc, rev: b.rev, tick: b.tick, gen: b.gen };
        return mockResponse([{ id: 2 }], 200);
      }
      if (opts.method === 'POST') {
        var b2 = JSON.parse(opts.body);
        db.ocean_state = { id: 2, doc: b2.doc, rev: b2.rev, tick: b2.tick, gen: b2.gen };
        return mockResponse('', 201);
      }
      if (u.searchParams.get('select') === 'id') return mockResponse(db.ocean_state.doc ? [{ id: 2 }] : [], 200);
      return mockResponse(db.ocean_state.doc ? [{ doc: db.ocean_state.doc, rev: db.ocean_state.rev }] : [], 200);
    }
    if (p.endsWith('/arena_pub')) {
      if (opts.method === 'POST') { var pb = JSON.parse(opts.body); db.arena_pub[pb.key] = pb.body; return mockResponse('', 201); }
      var k = (u.searchParams.get('key') || '').replace('eq.', '');
      return mockResponse(db.arena_pub[k] ? [{ body: db.arena_pub[k] }] : [], 200);
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
    url: 'https://mock.supabase.co/functions/v1/ocean-arena-v5' + pathStr,
    headers: { get: function (k) { return hdr[k.toLowerCase()] || null; } },
    text: async function () { return body == null ? '' : (typeof body === 'string' ? body : JSON.stringify(body)); }
  });
  var t = await r.text(), parsed = t;
  try { parsed = JSON.parse(t); } catch (e) { }
  return { status: r.status, body: parsed, raw: t };
}

(async function run() {
  // Root & /health
  var r = await req('GET', '');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.version, 'v5');
  r = await req('GET', '/health');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.version, 'v5');
  assert.strictEqual(r.body.species, 54);
  assert.strictEqual(r.body.plants, 176);
  assert.deepStrictEqual(r.body.map, [800, 800, 180]);

  // Published docs including multi-segment /prompt/en
  r = await req('GET', '/rules');
  assert.strictEqual(r.status, 200);
  assert(r.raw.includes('OCEAN ARENA'));
  r = await req('GET', '/prompt');
  assert.strictEqual(r.status, 200);
  assert(r.raw.includes('navodila za agenta'));
  r = await req('GET', '/prompt/en');
  assert.strictEqual(r.status, 200);
  assert(r.raw.includes('agent instructions'));

  // /reset & /chart & /species
  r = await req('GET', '/reset?admin=' + ADMIN);
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.status, 'lobby');
  var gen0 = r.body.gen;

  r = await req('GET', '/chart');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.w, 800);
  assert.strictEqual(r.body.maxDepth, 180);
  assert(r.body.features.some(function (f) { return f.type === 'mangrove roots'; }));

  r = await req('GET', '/species');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.species.length, 54);
  assert(r.body.species.some(function (s) { return s.name === 'whale calf'; }));

  // With < 2 fish, /start keeps status in lobby and delays lobbyUntilMs
  r = await req('GET', '/start?admin=' + ADMIN + '&in=0');
  assert.strictEqual(r.body.ok, true);
  assert.strictEqual(r.body.status, 'lobby');
  assert.strictEqual(r.body.fish, 0);

  // Reject claim without model
  r = await req('POST', '/claim', { name: 'BadBot', color: 'blue' }, '1.2.3.4');
  assert.strictEqual(r.status, 400);

  // Claim 2 fish, verify lobby countdown, then start
  var k0 = (await req('POST', '/claim', { name: 'Fish-0', model: 'model-0', color: 'orange' }, '10.0.0.1')).body;
  var k1 = (await req('POST', '/claim', { name: 'Fish-1', model: 'model-1', color: 'blue' }, '10.0.0.2')).body;
  assert.strictEqual(k0.ok, true);
  assert(typeof k0.startsInSec === 'number' && k0.startsInSec > 0);
  r = await req('GET', '/me?key=' + k0.key);
  assert.strictEqual(r.body.status, 'lobby');

  r = await req('GET', '/start?admin=' + ADMIN + '&in=0');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.status, 'running');

  // Verify v5 snapshot entities (npcs, blooms, plankton, carrion, tide)
  r = await req('GET', '/state?admin=' + ADMIN, null, '99.99.99.99');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.v, 5);
  assert.strictEqual(typeof r.body.tide, 'number');
  assert.strictEqual(r.body.npcs.length, 359);
  assert.strictEqual(r.body.blooms.length, 3);
  assert.strictEqual(r.body.plankton.length, 14);

  // Anti-cheat /state without admin flags matching player IP
  r = await req('GET', '/state', null, '10.0.0.2');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.fish.find(function (f) { return f.n === 'Fish-1'; }).cheat, true);
  assert.strictEqual(r.body.fish.find(function (f) { return f.n === 'Fish-0'; }).cheat, false);

  // Commands & rate limit
  r = await req('POST', '/cmd', { key: k0.key, act: 'feed', heading: 120, speed: 'cruise', dur: 15, why: 'moving toward coral reef for food' }, '10.0.0.1');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.accepted.act, 'feed');
  r = await req('POST', '/cmd', { key: k0.key, act: 'swim', heading: 90, speed: 'fast', why: 'sending second command too soon' }, '10.0.0.1');
  assert.strictEqual(r.status, 429);

  // End game via kill & check /report
  db.ocean_state.doc.fish[1].alive = false;
  db.ocean_state.doc.fish[1].hp = 0;
  db.ocean_state.doc.fish[1].died = 100;
  db.ocean_state.doc.fish[1].cause = 'test';
  db.ocean_state.doc.lastMs -= 1000;
  r = await req('GET', '/report');
  assert.strictEqual(r.body.status, 'finished');
  assert.strictEqual(r.body.gen, gen0);

  // Reset kills old keys
  r = await req('GET', '/reset?admin=' + ADMIN);
  assert.strictEqual(r.body.gen, gen0 + 1);
  r = await req('GET', '/me?key=' + k0.key);
  assert.strictEqual(r.status, 401);

  console.log('HTTP TEST OK (all v5 assertions passed)');
})().catch(function (e) { console.error(e); process.exit(1); });
