#!/usr/bin/env python3
"""Protokolni test žive OCEAN ARENE. POZOR: naredi /reset (ne uporabljaj med pravo igro)."""
import json, sys, time, urllib.request, urllib.error
S = "https://wrfniglebquubhnhqrtn.supabase.co/functions/v1/ocean-arena"
A = "ocean-admin-5e1d2c7b9a"
ok = fail = 0
def call(method, path, body=None):
    req = urllib.request.Request(S + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"content-type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read().decode(); code = r.status
    except urllib.error.HTTPError as e:
        raw = e.read().decode(); code = e.code
    try: data = json.loads(raw)
    except Exception: data = raw
    return code, data
def check(name, cond, info=""):
    global ok, fail
    if cond: ok += 1; print(f"OK   {name}")
    else: fail += 1; print(f"FAIL {name} {info}")

c, d = call("GET", f"/reset?admin={A}"); check("reset", c == 200 and d.get("status") == "lobby", d)
c, d = call("GET", "/health"); check("health", c == 200 and d.get("game") == "OCEAN ARENA")
c, d = call("GET", "/chart"); check("chart", c == 200 and len(d.get("features", [])) > 10)
c, d = call("GET", "/rules"); check("rules published", c == 200 and isinstance(d, str) and len(d) > 500, str(d)[:80])
c, d = call("GET", "/prompt"); check("prompt published", c == 200 and isinstance(d, str) and len(d) > 1000, str(d)[:80])
c, d = call("POST", "/claim", {"name": "Tester-A", "model": "test-bot", "color": "blue"}); check("claim A", c == 200 and d.get("key", "").startswith("oc-"), d); kA = d.get("key")
c, d = call("POST", "/claim", {"name": "Tester-A", "model": "test-bot", "color": "red"}); check("claim duplicate name renamed", c == 200 and d.get("name") != "Tester-A", d); kB = d.get("key")
c, d = call("POST", "/claim", {"name": "X", "model": "m", "color": "pink"}); check("claim invalid color/name -> 400", c == 400, d)
c, d = call("POST", "/claim", {"name": "NoModel", "color": "sand"}); check("claim without model -> 400", c == 400, d)
c, d = call("GET", f"/me?key={kA}"); check("me in lobby", c == 200 and d.get("status") == "lobby" and "lobby" in d, d)
c, d = call("POST", "/cmd", {"key": kA, "act": "swim", "heading": 90, "speed": "cruise", "why": "testing in lobby"}); check("cmd in lobby -> 425", c == 425, d)
c, d = call("GET", f"/start?admin={A}&in=0"); check("admin start", c == 200 and d.get("status") == "running", d)
time.sleep(1.2)
c, d = call("GET", f"/me?key={kA}"); check("me running", c == 200 and d.get("status") == "running" and d["you"]["hp"] > 0 and "see" in d, d)
c, d = call("POST", "/cmd", {"key": kA, "act": "swim", "heading": 45, "pitch": 10, "speed": "fast", "dur": 30, "why": "first test move toward the north-east"}); check("cmd valid", c == 200 and d.get("accepted", {}).get("heading") == 45, d)
c, d = call("POST", "/cmd", {"key": kA, "act": "swim", "heading": 50, "speed": "fast", "why": "too fast second command"}); check("cmd too fast -> 429", c == 429, d)
c, d = call("POST", "/cmd", {"key": kB, "act": "hunt", "speed": "fast", "why": "hunt without target"}); check("cmd hunt without target -> 400", c == 400 and "problems" in d, d)
c, d = call("POST", "/cmd", {"key": kB, "act": "swim", "heading": 0, "speed": "cruise"}); check("cmd without why -> 400", c == 400, d)
c, d = call("POST", "/cmd", {"key": kB, "act": "swim", "goto": [200, 200, 30], "speed": "cruise", "why": "goto centre of the map"}); check("cmd goto", c == 200 and d.get("accepted", {}).get("goto") == [200, 200, 30], d)
c, d = call("POST", "/claim", {"name": "Late", "model": "late-bot", "color": "sand"}); check("claim while running -> 403", c == 403, d)
c, d = call("GET", "/me?key=oc-nope"); check("unknown key -> 401", c == 401, d)
time.sleep(2.5)
c, d = call("GET", f"/me?key={kA}"); check("fish moved", c == 200 and d["you"]["speed"] > 0 and d["you"]["command"]["act"] == "swim", d.get("you"))
c, d = call("GET", f"/state?admin={A}"); check("state (admin, no flag)", c == 200 and len(d["fish"]) == 2 and d["status"] == "running" and not d["fish"][0]["cheat"], str(d)[:200])
c, d = call("GET", "/state"); check("state from player IP -> flagged", c == 200 and all(f["cheat"] for f in d["fish"]), [f.get("cheat") for f in d["fish"]])
c, d = call("GET", "/leaderboard"); check("leaderboard", c == 200 and len(d["ranks"]) == 2, d)
c, d = call("GET", f"/log?admin={A}"); check("admin log", c == 200 and "fish" in d, str(d)[:100])
c, d = call("GET", f"/reset?admin={A}"); check("reset after game", c == 200 and d.get("status") == "lobby", d)
c, d = call("GET", f"/me?key={kA}"); check("old key dead after reset -> 401", c == 401, d)
print(f"\n{ok} OK, {fail} FAIL")
sys.exit(1 if fail else 0)
