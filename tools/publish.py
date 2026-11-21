#!/usr/bin/env python3
"""Publish rules and agent prompts to arena_pub (GET /rules, /prompt, /prompt/en) for ocean-arena-v5."""
import json, urllib.request, os

S = "https://wrfniglebquubhnhqrtn.supabase.co/functions/v1/ocean-arena-v5"
A = "ocean-admin-5e1d2c7b9a"
root = os.path.join(os.path.dirname(__file__), "..")
payload = {
    "ocean5:rules": open(os.path.join(root, "RULES-OCEAN.md"), encoding="utf-8").read(),
    "ocean5:prompt": open(os.path.join(root, "PROMPT-OCEAN.md"), encoding="utf-8").read(),
    "ocean5:prompt-en": open(os.path.join(root, "PROMPT-OCEAN-EN.md"), encoding="utf-8").read(),
}
req = urllib.request.Request(S + "/publish?admin=" + A, data=json.dumps(payload).encode(), headers={"content-type": "application/json"}, method="POST")
print(urllib.request.urlopen(req, timeout=120).read().decode())
