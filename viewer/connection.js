// Single-flight spectator polling. A generation token prevents an old request
// from changing the view after switching servers or entering demo mode.
var OceanConnection = (function () {
  function create(options) {
    var timer = null, timeoutTimer = null, controller = null, generation = 0, running = false, failures = 0;
    var schedule = options.setTimeout || setTimeout, cancel = options.clearTimeout || clearTimeout;
    function stop() {
      running = false; generation++;
      if (timer !== null) { cancel(timer); timer = null; }
      if (timeoutTimer !== null) { cancel(timeoutTimer); timeoutTimer = null; }
      if (controller) { controller.abort(); controller = null; }
    }
    function start() { stop(); running = true; failures = 0; poll(generation); }
    function later(ms, token) {
      if (running && token === generation) timer = schedule(function () { timer = null; poll(token); }, ms);
    }
    function poll(token) {
      if (!running || token !== generation) return;
      var current = new AbortController(), timedOut = false;
      controller = current;
      var timeout = schedule(function () { timedOut = true; current.abort(); }, 8000); timeoutTimer = timeout;
      Promise.resolve().then(function () {
        return options.fetch(options.url(), { signal: current.signal, cache: 'no-store' });
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (state) {
        if (!running || token !== generation) return;
        if (!state || state.error) throw new Error(state && state.error || 'Invalid arena response');
        if (!Array.isArray(state.fish) || !Array.isArray(state.npcs) || !Array.isArray(state.feed) || !Array.isArray(state.plankton) || !Array.isArray(state.blooms) || !Array.isArray(state.carrion)) throw new Error('Invalid arena state');
        failures = 0;
        options.onState(state);
        later(500, token);
      }).catch(function (error) {
        if (!running || token !== generation) return;
        failures++;
        options.onError(timedOut ? 'Request timed out' : (error && error.message || 'Connection failed'), failures);
        if (running && token === generation) later(Math.min(10000, 1200 * Math.pow(2, Math.min(failures - 1, 3))), token);
      }).then(function () {
        cancel(timeout);
        if (timeoutTimer === timeout) timeoutTimer = null;
        if (controller === current) controller = null;
      });
    }
    return { start: start, stop: stop, refresh: start };
  }
  return { create: create };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = OceanConnection;
