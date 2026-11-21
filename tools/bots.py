#!/usr/bin/env python3
"""Testni boti proti ŽIVI areni (NISO pravi agenti — za preverjanje protokola/sočasnosti/vizualizacije).
python3 tools/bots.py [N=6] [sekund=300] [kadenca_s=10]   — naredi /reset, prijavi N botov, /start, igra."""
import json, sys, time, random, threading, urllib.request, urllib.error
S = "https://wrfniglebquubhnhqrtn.supabase.co/functions/v1/ocean-arena"; A = "ocean-admin-5e1d2c7b9a"
N = int(sys.argv[1]) if len(sys.argv) > 1 else 6; SEC = int(sys.argv[2]) if len(sys.argv) > 2 else 300; CAD = float(sys.argv[3]) if len(sys.argv) > 3 else 10
POL = ['smart', 'hunter', 'feeder', 'random', 'camper', 'smart', 'feeder', 'hunter', 'random', 'smart']
KELP = [(60, 80), (85, 200), (45, 320)]
def call(method, path, body=None):
    req = urllib.request.Request(S + path, method=method, data=json.dumps(body).encode() if body is not None else None, headers={"content-type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r: return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode())
        except Exception: return e.code, {}
    except Exception as e: return 0, {"error": str(e)}
def decide(pol, me):
    you, see = me["you"], me["see"]; R = random.random
    fish = [s for s in see if s["kind"] == "fish"]; bigger = [s for s in fish if s["size"] > you["size"] * 1.2]; smaller = [s for s in fish if s["size"] < you["size"] / 1.6]
    shark = next((s for s in see if s["kind"] == "shark"), None)
    food = next((s for s in see if s["kind"] in ("sardine school", "plankton cloud", "crab", "carcass") and not (s["kind"] == "plankton cloud" and you["size"] > 2.5) and not (s["kind"] == "crab" and you["size"] < 1.3)), None)
    if shark and shark["dist"] < 45: return dict(act="flee", target="shark", speed="sprint", dur=15, why=f"shark at {shark['dist']} m, sprinting away")
    if pol == "random": return dict(act="swim", heading=R() * 360, pitch=(R() - .5) * 40, speed="cruise", dur=20, why=f"random wander {random.randint(1,999)}")
    if pol == "camper":
        if "reef" not in you["zone"]: return dict(act="swim", goto=[118, 140, 16], speed="cruise", dur=60, why="heading to the reef to hide")
        return dict(act="feed" if you["energy"] < you["energyMax"] * .5 else "hide", dur=60, why="on the reef: " + ("feeding" if you["energy"] < you["energyMax"] * .5 else "hiding"))
    if bigger and bigger[0]["dist"] < 25:
        if pol == "smart": k = random.choice(KELP); return dict(act="swim", goto=[k[0], k[1], 18], speed="sprint", dur=30, why=f"bigger fish {bigger[0]['name']} near, running to kelp")
        return dict(act="flee", target=bigger[0]["id"], speed="sprint", dur=12, why=f"fleeing from {bigger[0]['name']}")
    if pol in ("hunter", "smart") and smaller: return dict(act="hunt", target=smaller[0]["id"], speed="sprint" if smaller[0]["dist"] < 8 else "fast", dur=25, why=f"hunting {smaller[0]['name']} size {smaller[0]['size']}")
    if pol == "smart" and me["smell"] and you["energy"] < you["energyMax"] * .6: return dict(act="feed", heading=me["smell"][0]["bearing"], speed="cruise", dur=20, why=f"following {me['smell'][0]['kind']} scent")
    if food and you["energy"] < you["energyMax"] * .85: return dict(act="feed", target=food["id"], speed="cruise", dur=25, why=f"feeding on {food['kind']} at {food['dist']} m")
    return dict(act="feed", heading=R() * 360, pitch=(R() - .5) * 30, speed="cruise", dur=20, why=f"searching for food, energy {you['energy']}")
stats = {"cmd": 0, "err": 0, "codes": {}}
def run(i, key, pol, t_end):
    time.sleep(random.random() * 3)
    while time.time() < t_end:
        c, me = call("GET", f"/me?key={key}")
        if c != 200: stats["err"] += 1; time.sleep(3); continue
        if me["status"] == "lobby": time.sleep(5); continue
        if me["status"] == "finished" or not me["you"]["alive"]: return
        b = decide(pol, me); b["key"] = key
        c, r = call("POST", "/cmd", b); stats["codes"][c] = stats["codes"].get(c, 0) + 1
        if c == 200: stats["cmd"] += 1
        elif c in (410, 403): return
        else: stats["err"] += 1; print("bot", i, c, r)
        time.sleep(CAD * (0.6 + random.random() * 0.8))
print(call("GET", f"/reset?admin={A}"))
keys = []
for i in range(N):
    c, d = call("POST", "/claim", {"name": f"Bot{i+1}-{POL[i][:4]}", "model": f"bot/{POL[i]}", "color": ["sand", "kelp", "blue", "dark", "silver", "red", "orange"][i % 7]})
    print("claim", c, d.get("name"), d.get("seat")); keys.append(d["key"])
print(call("GET", f"/start?admin={A}&in=3"))
t_end = time.time() + SEC
th = [threading.Thread(target=run, args=(i, keys[i], POL[i], t_end), daemon=True) for i in range(N)]
[t.start() for t in th]
t0 = time.time()
while time.time() < t_end and any(t.is_alive() for t in th):
    time.sleep(20); c, s = call("GET", f"/state?admin={A}")
    if c == 200: print(f"[{int(time.time()-t0)}s] tick {s['tick']} {s['status']} alive {sum(f['alive'] for f in s['fish'])}/{len(s['fish'])} phase {s['phase']} shark {s['shark']['state']} | " + ", ".join(f"{f['n']}:{f['sz']}/{f['hp']}/{f['en']}" for f in s['fish']))
    else: print("state", c, s)
c, lb = call("GET", "/leaderboard"); print("stats", stats); print(json.dumps(lb, indent=1)[:1500])
