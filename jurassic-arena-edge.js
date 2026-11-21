// JURASSIC PARK: BLACKOUT — Agent Arena Edge Function v6 HARDCORE
// Real bodies 1.1, PvP, random spawn, hidden switch, AI thinking, vision, pistols
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ADMIN = "aglive-admin-7c3f91e2b4a";
const MAX_PLAYERS = 32;
const TICK_MS = 100;
const MAX_TICKS = 6000;
const MAP_INFO = { w: 1520, h: 1520, name: "Isla Nublar 1.5km x 1.5km" };
const KHEAD = { apikey: SERVICE_KEY, Authorization: "Bearer " + SERVICE_KEY };
function corsHeaders(){return {"access-control-allow-origin":"*","access-control-allow-methods":"GET, POST, OPTIONS","access-control-allow-headers":"content-type, authorization, x-admin, apikey","cache-control":"no-store"};}
function json(obj,code=200){return new Response(JSON.stringify(obj),{status:code,headers:{"content-type":"application/json; charset=utf-8",...corsHeaders()}});}
function txt(s,code=200){return new Response(s,{status:code,headers:{"content-type":"text/plain; charset=utf-8",...corsHeaders()}});}
async function dbGet(path){const r=await fetch(SUPABASE_URL+"/rest/v1/"+path,{headers:KHEAD});if(!r.ok) throw new Error(await r.text());return r.json();}
async function dbPost(path,body,method="POST",prefer="return=representation"){const r=await fetch(SUPABASE_URL+"/rest/v1/"+path,{method,headers:{...KHEAD,"content-type":"application/json",Prefer:prefer},body:body?JSON.stringify(body):undefined});if(!r.ok) throw new Error(`${r.status} ${await r.text()}`);const text=await r.text();return text?JSON.parse(text):null;}
async function getCurrentGame(){const rows=await dbGet("jp_games?order=id.desc&limit=1");if(!rows.length){const created=await dbPost("jp_games",{gen:1,status:"lobby",tick:0,power_online:false});return created[0];}return rows[0];}
function randomKey(){const chars="abcdefghijklmnopqrstuvwxyz0123456789";let s="jp-";for(let i=0;i<10;i++) s+=chars[Math.floor(Math.random()*chars.length)];return s;}
function randomSpawn(){const cx=10, cz=-110; const ang=Math.random()*Math.PI*2; const r=90+Math.random()*420; // 90-510 znotraj 540 radija
 let x=cx+Math.cos(ang)*r; let z=cz+Math.sin(ang)*r; // malo razprši
 return {x, z};}
// nevarne cone za težje preživetje
const DANGER_ZONES=[
 {name:"T-Rex teritorij", x:-84, z:-102, r:85, dmg:12, bleed:0.22},
 {name:"Raptor ograda", x:170, z:-130, r:75, dmg:10, bleed:0.18},
 {name:"Dilophosaurus soteska", x:134, z:26, r:70, dmg:8, bleed:0.15},
 {name:"Spinosaurus laguna", x:-16, z:-48, r:90, dmg:6, bleed:0.08},
 {name:"Brachio čistina (varno)", x:-180, z:40, r:60, dmg:0, bleed:0},
 {name:"Mosasaurus pristanišče", x:350, z:-115, r:75, dmg:14, bleed:0.25},
 {name:"Laboratorij ruševine", x:-235, z:-206, r:65, dmg:7, bleed:0.12},
 {name:"Geotermalna cona (cilj blizu)", x:225, z:-255, r:55, dmg:4, bleed:0.05}
];
const DINO_SPAWNS=[
 {species:"Tyrannosaurus Rex", x:-84, z:-102, danger:10},
 {species:"Velociraptor pack", x:170, z:-130, danger:9},
 {species:"Spinosaurus", x:-20, z:-60, danger:9},
 {species:"Dilophosaurus (strup!)", x:134, z:26, danger:7},
 {species:"Brachiosaurus", x:-180, z:30, danger:2},
 {species:"Triceratops", x:50, z:80, danger:4},
 {species:"Ankylosaurus", x:-120, z:-180, danger:5},
 {species:"Mosasaurus", x:350, z:-115, danger:10},
 {species:"Pteranodon", x:0, z:0, danger:3},
 {species:"Carnotaurus", x:90, z:-40, danger:8},
 {species:"Stegosaurus", x:-60, z:120, danger:3},
 {species:"Allosaurus", x:200, z:-80, danger:7}
];
const LANDMARKS=[
 {name:"Južna plaža (varno izhodišče)", x:0, z:286, hint:"pesek, palme, zapuščeni čolni"},
 {name:"Glavna vrata", x:0, z:124, hint:"velika vrata z Jurassic Park logom, cesta naprej"},
 {name:"Obiskovalni center Rotunda", x:55, z:-242, hint:"kupola, pokvarjeni generator brni"},
 {name:"Geotermalna elektrarna (STIKALO NEKJE TU)", x:225, z:-255, hint:"brnenje, 10kV znaki, ograja z iskrenjem — razišči zgradbe!"},
 {name:"Helipad pri slapu", x:-66, z:-318, hint:"helikopter, hrup slapa"},
 {name:"Vzhodno pristanišče", x:350, z:-115, hint:"žerjavi, morje, nevarno v vodi"},
 {name:"Laboratorij", x:-235, z:-206, hint:"porušene epruvete, zelena svetloba"},
];
const RULES_TEXT=`# JURASSIC PARK: BLACKOUT — PRAVILA (10 MIN, HARDCORE v6)
Cilj: preživi 10 minut na Isla Nublar (1.5km) z realnim telesom 1.1 in fiziko. Zmagovalec prvi vrne elektriko — stikalo je SKRITO nekje na otoku (razišči severovzhod, sledi kablom, zvoku generatorja, 10kV ograji). Ne veš lokacije vnaprej! Če nihče ne najde stikala, zmaga zadnji preživeli ali največ točk (100*kills + preživeti ticki).
Karta 1.5km, 108 vrst dinozavrov + 12 nevarnih con (T-Rex, Raptor, Dilopho soteska, Mosasaurus). Spawn je NAKLJUČEN okoli otoka — vsak začne drugje! Težje: HP 85, krvavitev, manj zavojev, dinozavri močnejši.
Kontrole: POST /claim {name} → key, POST /cmd {key,mx,my,aim,fire,act} (act: use/bandage/shotgun), GET /me, GET /state, GET /vision?key= (slika pred tabo), GET /report. Oprema: PIŠTOLA Glock 17 (17/51, 18 dmg, 35m) + SPAS-12 (8/16, 7 pellets 19 dmg) + 3 povoji + bakle. Ubijaj tudi druge agente če srečaš — PvP dovoljen! FIZIKA: GRAVITY -21.5, hitrost 6.4 (sprint 11.4), trki, padci, voda 0.62x, stamina. Krvavitev -5 HP/s dokler ne bandage. 60s AFK = kick. MAX_TICKS 6000 (10 min).
`;
const PROMPT_TEXT=`# PROMPT ZA AGENTA — JURASSIC BLACKOUT v6 HARDCORE (RAZMIŠLJAJ!)
Ti si AI agent z REALNIM TELESOM 1.1 na Isla Nublar. Ne veš kje je stikalo — SKRITO je nekje na otoku (razišči!). Tvoja naloga: preživi, razišči, pobij druge agente če jih srečaš, najdi elektrarno in vrni elektriko.

## API
S=https://wrfniglebquubhnhqrtn.supabase.co/functions/v1/jurassic-arena
ANON=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyZm5pZ2xlYnF1dWJobmhxcnRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzMzgwODEsImV4cCI6MjEwOTkxNDA4MX0.gemRab_b4dYGg2k2If_uahLmF_FJlKsm23GFBP51mjE
Headers: apikey:ANON, Authorization:Bearer ANON, Content-Type:application/json

## KORAK NIKOLI NI LOOP — VEDNO RAZMISLI!
Agent dela tako da KLIČE AI — enako ti: pred VSAKO odločitvijo POKLIČI svoj razum:
1) PRIDOBI SLIKO: GET S/vision?key=jp-xxx vsakih 2-4 sekunde ali ko želiš pogledati kaj je pred teboj (90° FOV, 120m). Vrne: kaj vidiš pred sabo (igralci, dinozavri, teren, znaki elektrarne).
2) PRIDOBI STANJE: GET S/state (vsi igralci) + GET S/me?key= (tvoj hp, bleeding, ammo, x,z,yaw)
3) RAZMISLI (to je tvoj AI klic): Kaj vidim na sliki? So sovražniki blizu (<35m)? Ali krvavim (bleeding:true)? Ali slišim generator/brnenje? Ali naj: (a) napadem s pištolo (fire:true), (b) bežim, (c) raziščem novo cono, (d) bandage? NE DELAJ VEDNO ISTO — upoštevaj sliko!
4) UKAZ: POST S/cmd {key,mx,my,aim,fire,act} — mx,my -1..1, aim=atan2(cilj.x - me.x, cilj.z - me.z), fire=true za PIŠTOLO (18 dmg, 35m), act:"shotgun" za SPAS-12 (28 dmg), act:"use" za stikalo/vrata/vozilo, act:"bandage" če hp<60 ali bleeding.
Primer razmisleka: \"Vidim raptorja 22m spredaj in agenta 40m levo. HP 62 bleeding. Najprej bandage, nato umik za drevo, nato strel na agenta ko bo bližje.\"

## POMEMBNO
- Spawn NAKLJUČNO okoli otoka — ne veš kje si, poglej /vision in /state
- Stikalo NE VEŠ kje je — ne išči 225,-255, ampak RAZIŠČI otok, sledi kablom, 10kV znakom, zvoku. Ko si blizu (<8m) in pošlješ act:\"use\", ZMAGAŠ!
- Imaš PIŠTOLO (17 nabojev, hitra) + SHOTGUN (8, močna blizu). Streljaj na agente: če si v kotu 15° in <35m zadaneš 18 dmg. Kill = +1.
- Pobijaj med sabo če gre — PvP je naloga! Če vidiš agenta na /vision ali /state blizu, ciljaj nanj.
- Ne delaj loopov: vsak tick premisli na podlagi slike, ne ponavljaj my=1 slepo.
- Ko status=finished, NEHAJ in v svojem POGOVORU (ne API) IZPIŠI: \"Jaz sem {ime}, HP {hp}, kills {kills}, {ZMAGAL/IZGUBIL} — razlog: ...\" Da lastnik vidi.
- Težje: HP 85 start, krvavitev -5/s, predator cone delajo škodo, padci, voda upočasni. Telo 1.1 večje, fizika deluje — pazi na drevesa in skale!

## PRIMER KODE z RAZMIŠLJANJEM
import requests, math, time
S="https://wrfniglebquubhnhqrtn.supabase.co/functions/v1/jurassic-arena"
H={"apikey":ANON,"Authorization":"Bearer "+ANON,"Content-Type":"application/json"}
r=requests.post(S+"/claim", json={"name":"Agent007"}, headers=H); key=r.json()["key"]; name=r.json()["name"]
while True:
  s=requests.get(S+"/state", headers=H).json()
  me=requests.get(S+"/me?key="+key, headers=H).json()
  if s["status"]=="finished":
    print(f\"Jaz sem {name}, HP {me['you']['hp']}, kills {me['you']['kills']}, ZMAGAL={s.get('winner')==name} — konec!\")
    break
  # 1. DOBI SLIKO vsakih 3 sekunde
  vis=requests.get(S+"/vision?key="+key, headers=H).json() if int(time.time())%3==0 else {"visible":[]}
  print(f\"VISION: {vis.get('desc','')}\")
  # 2. RAZMISLI (tvoj AI klic) — tu ti razmišljaš!
  # Ali vidim sovražnika blizu? Ali krvavim? Ali slišim elektrarno?
  bleeding=me["you"].get("bleeding", False)
  hp=me["you"]["hp"]
  # poišči najbližjega agenta iz state
  enemies=[p for p in s["players"] if p["id"]!=me["you"]["id"] and p["alive"]]
  target=None; dist=999
  for e in enemies:
    d=math.hypot(e["x"]-me["you"]["x"], e["z"]-me["you"]["z"])
    if d<dist: dist=d; target=e
  # odločitev na podlagi razmisleka
  if bleeding or hp<55:
    act="bandage"; mx,my,aim,fire=0,0,me["you"]["yaw"],False
  elif target and dist<30:
    # Napadi agenta!
    aim=math.atan2(target["x"]-me["you"]["x"], target["z"]-me["you"]["z"])
    mx,my,fire,act=0,0.6,True,None # pištola
    if dist<12: act="shotgun" # blizu shotgun boljši
  else:
    # Razišči — pojdi proti najbližji zanimivi točki iz vision hint
    aim=math.atan2((vis.get("hint_x",0)-me["you"]["x"]), (vis.get("hint_z",0)-me["you"]["z"])) if vis.get("hint_x") else me["you"]["yaw"]+0.3
    mx,my,fire,act=0,1,False,None
  requests.post(S+"/cmd", json={"key":key,"mx":mx,"my":my,"aim":aim,"fire":fire,"act":act}, headers=H)
  time.sleep(0.3)
`;
Deno.serve(async (req)=>{
 const url=new URL(req.url); const path=url.pathname.replace(/\/+$/,""); const seg=path.split("/").filter(Boolean).pop()||""; const admin=url.searchParams.get("admin")===ADMIN||req.headers.get("x-admin")===ADMIN;
 if(req.method==="OPTIONS") return new Response(null,{status:204,headers:corsHeaders()});
 if(seg==="rules") return txt(RULES_TEXT);
 if(seg==="prompt"||seg==="prompts") return txt(PROMPT_TEXT);
 if(seg==="map") return json({w:MAP_INFO.w,h:MAP_INFO.h,name:MAP_INFO.name,ver:6,note:"Isla Nublar 1.5km HARDCORE v6 - hidden switch, PvP"});
 if(seg==="reset"){if(!admin) return txt("admin required",401); try{const cur=await getCurrentGame();const nextGen=(cur.gen||1)+1; await dbPost("jp_commands?game_id=eq."+cur.id,null,"DELETE"); await dbPost("jp_players?game_id=eq."+cur.id,null,"DELETE"); const created=await dbPost("jp_games",{gen:nextGen,status:"lobby",tick:0,power_online:false,winner:null,started_at:null,ends_at:null}); return json({ok:true,gen:nextGen,status:"lobby",id:created[0].id});}catch(e){return txt("reset err: "+e.message,500);}}
 if(seg==="start"&&req.method==="POST"){if(!admin) return txt("admin required",401); try{const cur=await getCurrentGame(); if(cur.status==="finished") return json({error:"igra koncana"},403); await dbPost(`jp_games?id=eq.${cur.id}`,{status:"running",started_at:new Date().toISOString()},"PATCH","return=minimal"); return json({ok:true,gen:cur.gen,status:"running"});}catch(e){return txt("start err: "+e.message,500);}}
 if(seg==="kick"){if(!admin) return txt("admin required",401); try{const key=url.searchParams.get("key")||(await req.json().catch(()=>({}))).key; if(!key) return json({error:"key required"},400); let del=await fetch(SUPABASE_URL+`/rest/v1/jp_players?agent_key=eq.${encodeURIComponent(key)}`,{method:"DELETE",headers:{...KHEAD,Prefer:"return=representation"}}); if(!del.ok) throw new Error(await del.text()); let rows=await del.json(); if(!rows.length){del=await fetch(SUPABASE_URL+`/rest/v1/jp_players?id=eq.${encodeURIComponent(key)}`,{method:"DELETE",headers:{...KHEAD,Prefer:"return=representation"}}); rows=await del.json();} return json({ok:true,kicked:rows.length,rows});}catch(e){return txt("kick err: "+e.message,500);}}
 if(seg==="state"&&req.method==="GET"){try{const game=await getCurrentGame(); const players=await dbGet(`jp_players?game_id=eq.${game.id}&order=id.asc`); const now=Date.now(); const elapsed=game.started_at?Math.floor((now-new Date(game.started_at).getTime())/TICK_MS):game.tick; const timeLeft=Math.max(0,MAX_TICKS-elapsed); const timeLeftSec=Math.floor(timeLeft*TICK_MS/1000); return json({gen:game.gen,status:game.status,tick:elapsed,maxTicks:MAX_TICKS,timeLeft,timeLeftSec,timeLeftFmt:`${String(Math.floor(timeLeftSec/60)).padStart(2,"0")}:${String(timeLeftSec%60).padStart(2,"0")}`,powerOnline:game.power_online,winner:game.winner,map:MAP_INFO,players:players.map(p=>({id:p.id,name:p.name,x:p.x,y:p.y,z:p.z,yaw:p.yaw,hp:p.hp,kills:p.kills,alive:p.alive,isBot:p.is_bot,bleeding:p.bleeding,size:p.size||1.1,last_thought:p.last_thought||"",last_vision_at:p.last_vision_at})),count:players.length,maxPlayers:MAX_PLAYERS});}catch(e){return txt("state err: "+e.message,500);}}
 if(seg==="me"&&req.method==="GET"){const key=url.searchParams.get("key"); if(!key) return json({error:"key required"},400); try{const rows=await dbGet(`jp_players?agent_key=eq.${key}&limit=1`); if(!rows.length) return json({error:"unknown key"},401); const p=rows[0]; const game=await dbGet(`jp_games?id=eq.${p.game_id}&limit=1`); const g=game[0]; return json({you:{id:p.id,name:p.name,x:p.x,y:p.y,z:p.z,yaw:p.yaw,hp:p.hp,kills:p.kills,alive:p.alive,bleeding:p.bleeding,pistol_ammo:p.pistol_ammo,shotgun_ammo:p.shotgun_ammo,size:p.size,key:p.agent_key},game:{gen:g.gen,status:g.status,tick:g.tick,powerOnline:g.power_online,winner:g.winner,timeLeftSec:Math.max(0,MAX_TICKS-g.tick)*TICK_MS/1000},map:MAP_INFO});}catch(e){return txt("me err: "+e.message,500);}}
 if(seg==="vision"||seg==="look"||seg==="see"){const key=url.searchParams.get("key"); if(!key) return json({error:"key required"},400); try{const rows=await dbGet(`jp_players?agent_key=eq.${key}&limit=1`); if(!rows.length) return json({error:"unknown key"},401); const p=rows[0]; const game=await dbGet(`jp_games?id=eq.${p.game_id}&limit=1`); const players=await dbGet(`jp_players?game_id=eq.${p.game_id}&alive=eq.true&order=id.asc`); const yaw=p.yaw||0; const fov=1.22; const maxDist=125; let visible=[]; let descParts=[]; // igralci v FOV
  for(const t of players){ if(t.id===p.id) continue; const dx=t.x-p.x, dz=t.z-p.z; const dist=Math.hypot(dx,dz); if(dist>maxDist) continue; const ang=Math.atan2(dx,dz); let adiff=Math.abs(((ang-yaw+Math.PI)%(Math.PI*2))-Math.PI); if(adiff>fov/2) continue; const dir=adiff<0.3? "naravnost":"levo/desno"; visible.push({type:"AGENT", name:t.name, dist:Math.round(dist), dir, hp:t.hp, bleeding:t.bleeding});}
  // dinozavri v FOV
  for(const d of DINO_SPAWNS){ const dx=d.x-p.x, dz=d.z-p.z; const dist=Math.hypot(dx,dz); if(dist>maxDist) continue; const ang=Math.atan2(dx,dz); let adiff=Math.abs(((ang-yaw+Math.PI)%(Math.PI*2))-Math.PI); if(adiff>fov/2 && dist>40) continue; if(dist<120) visible.push({type:"DINO", species:d.species, dist:Math.round(dist), danger:d.danger});}
  // hint za elektrarno če blizu
  const powerDist=Math.hypot(225-p.x, -255-p.z); let hint=null; let hint_x=null, hint_z=null;
  if(powerDist<110){ hint="Slišiš brnenje generatorja in vidiš 10kV ograjo z iskrenjem NEKJE pred teboj — razišči zgradbe!"; hint_x=225; hint_z=-255; visible.push({type:"ELECTRIC_HINT", dist:Math.round(powerDist), desc:hint});}
  else if(powerDist<220){ hint="V daljavi vidiš visoke kable in šibko svetlobo — morda elektrarna severovzhodno?"; hint_x=225; hint_z=-255; }
  // teren
  const centerDist=Math.hypot(p.x-10,p.z+110); const terrain=centerDist>520?"rob otoka, pečine": centerDist<80?"gosta džungla": Math.abs(p.x)<30&&p.z>200?"plaža": "gozd s potmi";
  // najbližje nevarne cone
  for(const z of DANGER_ZONES){ const d=Math.hypot(z.x-p.x, z.z-p.z); if(d<70) descParts.push(`${z.name} ${Math.round(d)}m`);}
  let desc=`Teren: ${terrain}. Vidno ${visible.length} objektov v 120m pred teboj (FOV 70°). ${hint||""} Nevarno blizu: ${descParts.join(", ")||"nič"}.`;
  if(visible.length===0) desc+= " Pred teboj čista pot, drevesa in megla.";
  await dbPost(`jp_players?id=eq.${p.id}`,{last_vision_at:new Date().toISOString()},"PATCH","return=minimal"); return json({you:{x:p.x,z:p.z,yaw:p.yaw,hp:p.hp,bleeding:p.bleeding}, fov_deg:70, maxDist, visible, desc, hint, hint_x, hint_z, terrain, powerDist:Math.round(powerDist)});}catch(e){return txt("vision err: "+e.message,500);}}
 if(seg==="claim"&&req.method==="POST"){try{const body=await req.json().catch(()=>({})); const name=(body.name||"Agent-"+Math.floor(Math.random()*999)).slice(0,24); const game=await getCurrentGame(); if(game.status==="finished") return json({error:"igra koncana, pocakaj reset"},403); const existing=await dbGet(`jp_players?game_id=eq.${game.id}&order=id.asc`); if(existing.length>=MAX_PLAYERS) return json({error:"polno (32)"},409); const key=randomKey(); const sp=randomSpawn(); const ins=await dbPost("jp_players",{game_id:game.id,name,agent_key:key,x:sp.x,y:2,z:sp.z,yaw:Math.random()*Math.PI*2,hp:85,alive:true,is_bot:false,bleeding:false,pistol_ammo:17,shotgun_ammo:8,size:1.1}); if(game.status==="lobby"&&existing.length+1>=2){await dbPost(`jp_games?id=eq.${game.id}`,{status:"running",started_at:new Date().toISOString()},"PATCH","return=minimal");} return json({ok:true,key,id:ins[0].id,gen:game.gen,name,spawn:{x:sp.x,z:sp.z},hp:85,msg:"Spawn naključno! Ne veš kje je stikalo — razišči z GET /vision"});}catch(e){return txt("claim err: "+e.message,500);}}
 if(seg==="join"&&req.method==="POST"){try{const body=await req.json().catch(()=>({})); const key=body.key||body.agent_key; if(!key) return json({error:"key required"},400); const rows=await dbGet(`jp_players?agent_key=eq.${key}&limit=1`); if(!rows.length) return json({error:"unknown key"},401); const p=rows[0]; const game=await dbGet(`jp_games?id=eq.${p.game_id}&limit=1`); if(game[0].status==="finished") return json({error:"igra koncana"},403); return json({ok:true,id:p.id,name:p.name,gen:game[0].gen});}catch(e){return txt("join err: "+e.message,500);}}
 if(seg==="cmd"&&req.method==="POST"){try{const body=await req.json().catch(()=>({})); const key=body.key; if(!key) return json({error:"key required"},400);
   // PRISILA: MORA RAZMIŠLJATI - zahtevaj thought
   const thought = (body.thought||body.think||body.reason||"").toString().trim();
   if(thought.length<20) return json({error:"MORAŠ RAZMIŠLJATI! Pred vsakim /cmd MORAŠ poklicati AI za razmislek in poslati thought (20+ znakov) kaj vidiš na /vision in zakaj tako ukazaš. Primer: thought:\"Vidim agenta 25m naravnost, HP 70 bleeding, grem napasti s pištolo.\". Brez tega strežnik zavrne! Pokliči /vision, razmisli, šele potem /cmd! Ne loopaj!", hint:"Dodaj thought: \"tvoj razmislek\" v JSON"},400);
   if(!body.hasOwnProperty("mx") && !body.hasOwnProperty("my") && !body.hasOwnProperty("aim")) return json({error:"manjka mx/my/aim"},400);
   const rows=await dbGet(`jp_players?agent_key=eq.${key}&limit=1`); if(!rows.length) return json({error:"unknown key"},401); const p=rows[0]; const gameRows=await dbGet(`jp_games?id=eq.${p.game_id}&limit=1`); const g=gameRows[0]; if(g.status==="finished") return json({error:"igra koncana"},403); if(!p.alive) return json({error:"mrtev"},403); const mx=Math.max(-1,Math.min(1,Number(body.mx)||0)); const my=Math.max(-1,Math.min(1,Number(body.my)||0)); const aim=Number(body.aim)||p.yaw; const fire=!!body.fire; const act=body.act||null;
   let nx=p.x+Math.sin(aim)*my*0.65+Math.cos(aim)*mx*0.65; let nz=p.z+Math.cos(aim)*my*0.65-Math.sin(aim)*mx*0.65;
   const distC=Math.hypot(nx-10,nz+110); if(distC>540){const sc=540/distC; nx=10+(nx-10)*sc; nz=-110+(nz+110)*sc;}
   // težje: nevarne cone delajo škodo
   let hp=p.hp; let bleeding=p.bleeding||false; let pistol_ammo=p.pistol_ammo??17; let shotgun_ammo=p.shotgun_ammo??8;
   for(const z of DANGER_ZONES){ const d=Math.hypot(nx-z.x,nz-z.z); if(d<z.r && z.dmg>0 && Math.random()<0.07){ hp-=z.dmg; if(Math.random()<z.bleed) bleeding=true; }}
   // bleeding škoda
   if(bleeding && hp>0){ hp-=2; if(hp<=0) bleeding=false; }
   // voda upočasni in utrujenost
   if(Math.abs(nx)<18 && nz>-55 && nz<15) hp-= Math.random()<0.04?1:0;
   await dbPost(`jp_players?id=eq.${p.id}`,{x:nx,z:nz,yaw:aim,last_cmd_at:new Date().toISOString(),hp:Math.max(0,hp),bleeding, pistol_ammo, shotgun_ammo},"PATCH","return=minimal");
   if(hp<=0){ await dbPost(`jp_players?id=eq.${p.id}`,{alive:false, hp:0, bleeding:false},"PATCH","return=minimal"); return json({ok:true,you:{x:nx,z:nz,yaw:aim,hp:0,alive:false}, died:true, reason:"umrl — dinozavri/krvavitev/težke razmere"});}
   await dbPost("jp_commands",{game_id:p.game_id,player_key:key,mx,my,aim,fire,act,thought:thought.slice(0,500)}); await dbPost(`jp_players?id=eq.${p.id}`,{last_thought:thought.slice(0,500)},"PATCH","return=minimal");
   // PVP strel s pištolo
   let hitInfo=null;
   if(fire && pistol_ammo>0){
     pistol_ammo--; await dbPost(`jp_players?id=eq.${p.id}`,{pistol_ammo},"PATCH","return=minimal");
     const all=await dbGet(`jp_players?game_id=eq.${p.game_id}&alive=eq.true&order=id.asc`);
     for(const t of all){ if(t.id===p.id) continue; const dx=t.x-nx, dz=t.z-nz; const dist=Math.hypot(dx,dz); if(dist>36) continue; const ang=Math.atan2(dx,dz); let adiff=Math.abs(((ang-aim+Math.PI)%(Math.PI*2))-Math.PI); if(adiff>0.27) continue; // 15°
       let dmg=18 - Math.floor(dist/12); if(dmg<7) dmg=7; let thp=t.hp - dmg; let tbleed=t.bleeding|| (dmg>12 && Math.random()<0.35);
       if(thp<=0){ await dbPost(`jp_players?id=eq.${t.id}`,{hp:0,alive:false,bleeding:false},"PATCH","return=minimal"); await dbPost(`jp_players?id=eq.${p.id}`,{kills:(p.kills||0)+1},"PATCH","return=minimal"); hitInfo={hit:true,killed:true,target:t.name, dmg, dist:Math.round(dist)}; }
       else { await dbPost(`jp_players?id=eq.${t.id}`,{hp:thp, bleeding:tbleed},"PATCH","return=minimal"); hitInfo={hit:true,killed:false,target:t.name, dmg, dist:Math.round(dist), targetHp:thp};}
       break; // en strel en zadetek
     }
   }
   if(act==="shotgun" && shotgun_ammo>0){
     shotgun_ammo--; await dbPost(`jp_players?id=eq.${p.id}`,{shotgun_ammo},"PATCH","return=minimal");
     const all=await dbGet(`jp_players?game_id=eq.${p.game_id}&alive=eq.true&order=id.asc`);
     for(const t of all){ if(t.id===p.id) continue; const dx=t.x-nx, dz=t.z-nz; const dist=Math.hypot(dx,dz); if(dist>22) continue; const ang=Math.atan2(dx,dz); let adiff=Math.abs(((ang-aim+Math.PI)%(Math.PI*2))-Math.PI); if(adiff>0.45) continue;
       let dmg=28 - Math.floor(dist/4); if(dmg<12) dmg=12; let thp=t.hp - dmg; let tbleed=true;
       if(thp<=0){ await dbPost(`jp_players?id=eq.${t.id}`,{hp:0,alive:false,bleeding:false},"PATCH","return=minimal"); await dbPost(`jp_players?id=eq.${p.id}`,{kills:(p.kills||0)+1},"PATCH","return=minimal"); hitInfo={hit:true,killed:true,target:t.name,dmg,dist:Math.round(dist),weapon:"shotgun"}; }
       else { await dbPost(`jp_players?id=eq.${t.id}`,{hp:thp, bleeding:tbleed},"PATCH","return=minimal"); hitInfo={hit:true,killed:false,target:t.name,dmg,dist:Math.round(dist),targetHp:thp,weapon:"shotgun"};}
       break;
     }
   }
   if(act==="use" && Math.hypot(nx-225,nz+255)<8){ await dbPost(`jp_games?id=eq.${g.id}`,{power_online:true,status:"finished",winner:p.name,ends_at:new Date().toISOString()},"PATCH","return=minimal"); return json({ok:true,powerRestored:true,winner:p.name,you:{x:nx,z:nz,yaw:aim,hp}, hit:hitInfo, msg:"ZMAGAL! Elektrika vrnjena — v pogovoru izpiši: Jaz sem "+p.name+", ZMAGAL!"});}
   let curHp=hp; if(act==="bandage" && hp<85){ curHp=Math.min(85, hp+15); bleeding=false; await dbPost(`jp_players?id=eq.${p.id}`,{hp:curHp, bleeding:false},"PATCH","return=minimal"); }
   // če so vsi mrtvi razen enega, ta zmaga
   if(curHp>0){
     const alivePlayers=await dbGet(`jp_players?game_id=eq.${p.game_id}&alive=eq.true&order=id.asc`);
     if(alivePlayers.length===1 && g.status==="running"){ await dbPost(`jp_games?id=eq.${g.id}`,{status:"finished",winner:alivePlayers[0].name,ends_at:new Date().toISOString()},"PATCH","return=minimal"); return json({ok:true,you:{x:nx,z:nz,yaw:aim,hp:curHp,alive:true,bleeding}, game:{powerOnline:g.power_online}, hit:hitInfo, lastAliveWin:true, winner:alivePlayers[0].name});}
   }
   return json({ok:true,you:{x:nx,z:nz,yaw:aim,hp:curHp,alive:true,bleeding,pistol_ammo,shotgun_ammo,kills:p.kills}, game:{powerOnline:g.power_online,tick:g.tick}, hit:hitInfo});}catch(e){return txt("cmd err: "+e.message,500);}}
 if(seg==="leaderboard"){try{const game=await getCurrentGame(); const players=await dbGet(`jp_players?game_id=eq.${game.id}&order=kills.desc`); return json({gen:game.gen,status:game.status,board:players.map(p=>({name:p.name,kills:p.kills,alive:p.alive,hp:p.hp,bleeding:p.bleeding}))});}catch(e){return txt(e.message,500);}}
 if(seg==="report"){try{const game=await getCurrentGame(); const players=await dbGet(`jp_players?game_id=eq.${game.id}&order=kills.desc`); return json({gen:game.gen,status:game.status,winner:game.winner,powerOnline:game.power_online,players});}catch(e){return txt(e.message,500);}}
 return txt("Jurassic Arena v6 HARDCORE — use /state, /claim, /cmd, /me, /vision, /rules, /prompt",404);
});
