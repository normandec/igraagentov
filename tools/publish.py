#!/usr/bin/env python3
"""Objavi pravila in prompte v arena_pub (GET /rules, /prompt, /prompt/en)."""
import json, urllib.request, os
S = "https://wrfniglebquubhnhqrtn.supabase.co/functions/v1/ocean-arena"; A = "ocean-admin-5e1d2c7b9a"
root = os.path.join(os.path.dirname(__file__), "..")
payload = {"ocean:rules": open(os.path.join(root, "RULES-OCEAN.md"), encoding="utf-8").read(),
           "ocean:prompt": open(os.path.join(root, "PROMPT-OCEAN.md"), encoding="utf-8").read(),
           "ocean:prompt-en": open(os.path.join(root, "PROMPT-OCEAN-EN.md"), encoding="utf-8").read()}
req = urllib.request.Request(S + "/publish?admin=" + A, data=json.dumps(payload).encode(), headers={"content-type": "application/json"}, method="POST")
print(urllib.request.urlopen(req, timeout=120).read().decode())
