// OCEAN ARENA v5 — Edge Function loader shell (slug: ocean-arena-v5).
// Engine bundle (build/ocean.bundle.js) is stored in public.arena_engine (id = 4) and cached for CACHE_MS.
// State: public.ocean_state id=2, public docs: arena_pub ocean5:*.
// Deploy a new build:
//   curl -s -X POST "$S/src?admin=$A" --data-binary @build/ocean.bundle.js -H 'content-type: text/plain'  -> SRC-OK <bytes>
const U = Deno.env.get("SUPABASE_URL"), K = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ADMIN = "ocean-admin-5e1d2c7b9a";
const CACHE_MS = 60_000;
const KEY_HEAD = { apikey: K, Authorization: "Bearer " + K };
let engineSrc = null, loadedAt = 0, loadErr = null;

async function fetchEngine() {
  const r = await fetch(U + "/rest/v1/arena_engine?id=eq.4&select=src", { headers: KEY_HEAD });
  if (!r.ok) throw new Error("arena_engine " + r.status + " " + (await r.text()).slice(0, 200));
  const rows = await r.json();
  if (!rows.length || !rows[0].src || rows[0].src.length < 1000) throw new Error("arena_engine id=4: empty");
  return rows[0].src;
}
function boot(src) {
  globalThis.__ARENA_HANDLER = null; globalThis.__OCEAN_STATE_ID = 2; globalThis.__OCEAN_PUB_PREFIX = "ocean5:";
  new Function(src)();
  if (!globalThis.__ARENA_HANDLER) throw new Error("engine did not set __ARENA_HANDLER");
  return globalThis.__ARENA_HANDLER;
}
async function ensure(force = false) {
  if (!force && globalThis.__ARENA_HANDLER && Date.now() - loadedAt < CACHE_MS) return;
  try {
    const src = await fetchEngine();
    if (force || src !== engineSrc || !globalThis.__ARENA_HANDLER) { boot(src); engineSrc = src; loadErr = null; }
    loadedAt = Date.now();
  } catch (e) {
    loadErr = String(e && e.message ? e.message : e);
    if (!globalThis.__ARENA_HANDLER) throw e;
  }
}
function txt(s, code = 200) {
  return new Response(s, { status: code, headers: { "content-type": "text/plain; charset=utf-8", "access-control-allow-origin": "*", "cache-control": "no-store" } });
}
Deno.serve(async (req) => {
  const u = new URL(req.url);
  const seg = u.pathname.split("/").filter(Boolean).pop() || "";
  const adm = u.searchParams.get("admin") === ADMIN || req.headers.get("x-admin") === ADMIN;
  if (seg === "src" && adm) {
    if (req.method === "GET") return txt("engine: " + (engineSrc ? engineSrc.length + " bytes" : "not loaded") + ", loaded " + (loadedAt ? new Date(loadedAt).toISOString() : "never") + ", error: " + (loadErr || "none") + "\n");
    const body = await req.text();
    if (body.length < 1000) return txt("body too short (" + body.length + " B)", 400);
    const r = await fetch(U + "/rest/v1/arena_engine?id=eq.4", { method: "PATCH", headers: { ...KEY_HEAD, "content-type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ src: body, updated_at: new Date().toISOString() }) });
    if (!r.ok) return txt("storage: " + r.status + " " + (await r.text()).slice(0, 200), 500);
    try { await ensure(true); } catch (e) { return txt("SRC-STORED " + body.length + " (engine failed to boot: " + e.message + ")", 500); }
    return txt("SRC-OK " + body.length);
  }
  try { await ensure(false); } catch (e) { return txt("engine failed to load: " + (e && e.message ? e.message : e) + " (admin: POST /src?admin=...)", 503); }
  return globalThis.__ARENA_HANDLER(req);
});
