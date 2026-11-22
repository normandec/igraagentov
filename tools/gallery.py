#!/usr/bin/env python3
"""Creature model gallery: python3 tools/gallery.py out.png [names,comma] — renders each model in its own cell with neutral lighting for visual inspection."""
import sys, os, asyncio, json
from playwright.async_api import async_playwright
out = sys.argv[1]; names = sys.argv[2].split(',') if len(sys.argv) > 2 else None
three = open('lib/three.min.js').read(); cr = open('viewer/creatures.js').read()
html = """<html><body style='margin:0;background:#17384f'><canvas id=c></canvas><script>%s</script><script>%s</script><script>
var names = %s || Object.keys(CR.SPEC).concat(['player:red','player:kelp']);
var T=THREE, W=1800, cols=6, cell=W/cols, rows=Math.ceil(names.length/cols), H=rows*cell;
var cv=document.getElementById('c'); var r=new T.WebGLRenderer({canvas:cv,antialias:true}); r.setSize(W,H); r.setScissorTest(true);
names.forEach(function(n,i){ var sc=new T.Scene(); sc.background=new T.Color(0x17384f);
  sc.add(new T.HemisphereLight(0xcfe8ff,0x203040,0.55)); var d=new T.DirectionalLight(0xffffff,0.7); d.position.set(2,4,3); sc.add(d); var d2=new T.DirectionalLight(0x88aaff,0.3); d2.position.set(-3,-1,-2); sc.add(d2);
  var g = n.indexOf('player:')===0 ? CR.player(n.slice(7),1.5) : CR.creature(n); sc.add(g); CR.animate(g, 1.3, 1.5, 0);
  var L=g.userData.len||1; var geo=g.userData.mesh.geometry; geo.computeBoundingSphere(); var R=geo.boundingSphere.radius; var c=geo.boundingSphere.center;
  var cam=new T.PerspectiveCamera(35,1,0.01,1000); cam.position.set(c.x+R*1.9, c.y+R*0.9, c.z+R*2.0); cam.lookAt(c);
  var x=(i%%cols)*cell, y=H-(Math.floor(i/cols)+1)*cell; r.setViewport(x,y,cell,cell); r.setScissor(x,y,cell,cell); r.render(sc,cam);
  var lab=document.createElement('div'); lab.textContent=n+' '+(L>=1?L+' m':Math.round(L*100)+' cm'); lab.style.cssText='position:absolute;left:'+x+'px;top:'+(Math.floor(i/cols)*cell)+'px;color:#fff;font:14px sans-serif;padding:4px;background:rgba(0,0,0,.4)'; document.body.appendChild(lab); });
</script></body></html>""" % (three, cr, json.dumps(names))
open('/tmp/gallery.html','w').write(html)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-gl=swiftshader","--enable-webgl","--ignore-gpu-blocklist"])
        n = len(names) if names else 56; rows=(n+5)//6
        pg = await b.new_page(viewport={"width":1800,"height":rows*300})
        errs=[]; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type=="error" else None)
        await pg.goto("file:///tmp/gallery.html"); await pg.wait_for_timeout(4000)
        await pg.screenshot(path=out, full_page=True); print("errors:", errs[:5] or 0)
        await b.close()
asyncio.run(main())
