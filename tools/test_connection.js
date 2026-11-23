// Deterministic tests for spectator polling without a network or browser.
const assert = require('assert');
const { create } = require('../viewer/connection.js');
const flush = () => new Promise(resolve => setImmediate(resolve));
const state = { fish: [], npcs: [], feed: [], plankton: [], blooms: [], carrion: [] };
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
(async function () {
  let timers = new Map(), next = 0, requests = [], shown = [], errors = [], url = '/one';
  function setTimer(fn, delay) { let id = ++next; timers.set(id, { fn, delay }); return id; }
  function fire(delay) { const entry = [...timers].find(([, t]) => t.delay === delay); assert(entry, 'missing timer ' + delay); timers.delete(entry[0]); entry[1].fn(); }
  const connection = create({
    setTimeout: setTimer, clearTimeout: id => timers.delete(id), url: () => url,
    fetch: (u, opts) => { const d = deferred(); requests.push({ u, opts, ...d }); return d.promise; },
    onState: s => shown.push(s), onError: (message, count) => errors.push({ message, count })
  });
  connection.start(); await flush(); assert.equal(requests.length, 1);
  // Switching servers aborts the old request and its eventual result is ignored.
  url = '/two'; connection.start(); await flush(); assert(requests[0].opts.signal.aborted); assert.equal(requests.length, 2);
  requests[0].resolve({ ok: true, json: async () => ({ ...state, gen: 1 }) });
  requests[1].resolve({ ok: true, json: async () => ({ ...state, gen: 2 }) }); await flush();
  assert.deepEqual(shown.map(s => s.gen), [2]); assert.equal(errors.length, 0);
  assert.equal([...timers.values()].filter(t => t.delay === 500).length, 1);
  fire(500); await flush(); requests[2].resolve({ ok: false, status: 503 }); await flush();
  assert.equal(errors[0].message, 'HTTP 503'); assert.equal(errors[0].count, 1);
  fire(1200); await flush(); requests[3].resolve({ ok: true, json: async () => ({ fish: [] }) }); await flush();
  assert.equal(errors[1].message, 'Invalid arena state'); assert.equal(errors[1].count, 2);
  fire(2400); await flush(); requests[4].resolve({ ok: true, json: async () => state }); await flush();
  assert.equal(shown.length, 2); fire(500); await flush();
  // A request that completes after stop must not update the screen or retry.
  connection.stop(); assert(requests[5].opts.signal.aborted);
  requests[5].resolve({ ok: true, json: async () => ({ ...state, gen: 3 }) }); await flush();
  assert.equal(shown.length, 2); assert.equal(errors.length, 2); assert.equal(timers.size, 0);
  connection.start(); await flush();
  requests[6].opts.signal.addEventListener('abort', () => requests[6].reject(new Error('aborted')));
  fire(8000); await flush(); assert.equal(errors[2].message, 'Request timed out');
  assert.equal(errors[2].count, 1); connection.stop(); assert.equal(timers.size, 0);
  console.log('CONNECTION TEST OK');
})().catch(err => { console.error(err); process.exitCode = 1; });
