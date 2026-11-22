#!/usr/bin/env python3
"""Viewer screenshot helper: python3 tools/shot.py OCEAN-ARENA.html out.png [w h sec] [?demo=1&...] — prints console errors."""
import sys, asyncio, os
from playwright.async_api import async_playwright

html, out = sys.argv[1], sys.argv[2]
w = int(sys.argv[3]) if len(sys.argv) > 3 else 1600
h = int(sys.argv[4]) if len(sys.argv) > 4 else 900
sec = float(sys.argv[5]) if len(sys.argv) > 5 else 6
query = sys.argv[6] if len(sys.argv) > 6 else ""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
        pg = await b.new_page(viewport={"width": w, "height": h})
        errs = []
        pg.on("console", lambda m: errs.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: errs.append("PAGEERROR: " + str(e)))
        await pg.goto("file://" + os.path.abspath(html) + query)
        await pg.wait_for_timeout(sec * 1000)
        for k in sys.argv[7:]:
            await pg.keyboard.press(k)
            await pg.wait_for_timeout(800)
        status = await pg.evaluate("document.getElementById('t-status').textContent")
        await pg.screenshot(path=out)
        errs = [e for e in errs if "GL Driver" not in e]
        print("status:", status)
        print("console:", errs[:10] or "0 errors")
        await b.close()

asyncio.run(main())
