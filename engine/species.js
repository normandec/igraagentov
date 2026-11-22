// OCEAN ARENA v5 — 76 marine species: Giant Squid, huge Whale, dense prey & formidable predators
var OC = globalThis.OC || (globalThis.OC = {});
(function (OC) {
  OC.SPECIES = {
    // ── Schooling fish & cephalopod shoals ────────────────────────────────
    'sardine':        { size: 0.15, kind: 'school', habitat: { zone: 'pelagic',  d0: 2,  d1: 30 }, n: 450, count: 8, speed: 2.2, flee: 5.5, food: { e: 8,  catchP: 0.72 }, gather: { phase: 'dusk', x: 295, z: 245, d: 10, note: 'sardines are gathering near the west seamount' } },
    'anchovy':        { size: 0.12, kind: 'school', habitat: { zone: 'pelagic',  d0: 2,  d1: 25 }, n: 520, count: 8, speed: 2.0, flee: 5.0, food: { e: 6,  catchP: 0.78 } },
    'herring':        { size: 0.22, kind: 'school', habitat: { zone: 'pelagic',  d0: 4,  d1: 42 }, n: 420, count: 6, speed: 2.5, flee: 6.2, food: { e: 11, catchP: 0.68 } },
    'damselfish':     { size: 0.14, kind: 'school', habitat: { zone: 'reef',     d0: 6,  d1: 20 }, n: 140, count: 8, speed: 1.9, flee: 4.8, food: { e: 7,  catchP: 0.70 } },
    'lanternfish':    { size: 0.16, kind: 'school', habitat: { zone: 'deep',     d0: 45, d1: 115 }, n: 280, count: 6, speed: 2.1, flee: 5.2, food: { e: 10, catchP: 0.65 }, dayD: 75, nightD: 18 },
    'mackerel':       { size: 0.45, kind: 'school', habitat: { zone: 'pelagic',  d0: 4,  d1: 38 }, n: 120, count: 6, speed: 3.4, flee: 7.5, food: { e: 18, catchP: 0.55, minHunter: 1.3 } },
    'snapper':        { size: 0.7,  kind: 'school', habitat: { zone: 'reef',     d0: 8,  d1: 30 }, n: 65,  count: 6, speed: 2.5, flee: 6.0, food: { e: 26, catchP: 0.45, minHunter: 1.6 } },
    'tuna':           { size: 2.0,  kind: 'school', habitat: { zone: 'pelagic',  d0: 5,  d1: 55 }, n: 24,  count: 4, speed: 6.0, flee: 13,  food: { e: 55, catchP: 0.35, minHunter: 3.0 } },
    'squid':          { size: 0.6,  kind: 'school', pulse: 'jet', habitat: { zone: 'pelagic', d0: 10, d1: 68 }, n: 60, count: 6, speed: 3.0, flee: 8.5, food: { e: 24, catchP: 0.50, minHunter: 1.3 }, defense: { type: 'ink', dmg: 0 }, dayD: 48, nightD: 10 },
    'shrimp':         { size: 0.08, kind: 'school', habitat: { zone: 'seagrass', d0: 2,  d1: 18 }, n: 360, count: 10, speed: 1.0, flee: 2.8, food: { e: 4, catchP: 0.86, bigPenalty: 3 } },
    'krill':          { size: 0.04, kind: 'school', habitat: { zone: 'deep',     d0: 35, d1: 110 }, n: 600, count: 6, speed: 0.6, flee: 1.6, food: { e: 3, catchP: 0.90, maxHunter: 3.0 }, dayD: 72, nightD: 12 },
    'flying fish':    { size: 0.3,  kind: 'school', habitat: { zone: 'surface',  d0: 0.5, d1: 4 }, n: 85,  count: 5, speed: 3.5, flee: 10,  food: { e: 12, catchP: 0.40, minHunter: 1.2 } },
    'salp chain':     { size: 0.5,  kind: 'drift',  habitat: { zone: 'pelagic',  d0: 4,  d1: 42 }, count: 16, speed: 0.2, food: { e: 10, catchP: 0.95 }, respawn: 240 },

    // ── Crustaceans (sideways scuttling crabs, tail-flip lobsters) ───────────
    'crab':           { size: 0.3,  kind: 'crab', habitat: { zone: 'bottom',   d0: 2, d1: 48 }, count: 28, speed: 1.3, flee: 2.8, crabWalk: true, food: { e: 16, catchP: 0.65, minHunter: 1.2 }, defense: { type: 'shell', dmg: 4 }, respawn: 320 },
    'blue crab':      { size: 0.35, kind: 'crab', habitat: { zone: 'seagrass', d0: 2, d1: 22 }, count: 22, speed: 1.6, flee: 3.4, crabWalk: true, food: { e: 18, catchP: 0.60, minHunter: 1.2 }, defense: { type: 'shell', dmg: 5 }, respawn: 300 },
    'hermit crab':    { size: 0.12, kind: 'crab', habitat: { zone: 'bottom',   d0: 2, d1: 24 }, count: 26, speed: 0.8, flee: 1.6, crabWalk: true, food: { e: 9,  catchP: 0.80 }, respawn: 240 },
    'spider crab':    { size: 0.75, kind: 'crab', habitat: { zone: 'bottom',   d0: 28, d1: 95 }, count: 10, speed: 1.1, flee: 2.2, crabWalk: true, food: { e: 28, catchP: 0.55, minHunter: 1.8 }, defense: { type: 'shell', dmg: 7 }, respawn: 420 },
    'lobster':        { size: 0.55, kind: 'crab', habitat: { zone: 'reef',     d0: 6, d1: 40 }, count: 16, speed: 1.2, flee: 4.5, nocturnal: true, tailFlip: true, food: { e: 26, catchP: 0.52, minHunter: 1.8 }, defense: { type: 'shell', dmg: 6 }, respawn: 420 },

    // ── Reef, seagrass & benthic invertebrates & fish ────────────────────────
    'sea urchin':     { size: 0.2,  kind: 'static', habitat: { zone: 'reef',     d0: 3,  d1: 28 }, count: 22, speed: 0,   food: { e: 12, catchP: 0.90 }, defense: { type: 'spines', dmg: 8 }, respawn: 320 },
    'clam':           { size: 0.15, kind: 'static', habitat: { zone: 'bottom',   d0: 2,  d1: 35 }, count: 26, speed: 0,   food: { e: 10, catchP: 0.95 }, respawn: 260 },
    'scallop':        { size: 0.15, kind: 'wander', habitat: { zone: 'bottom',   d0: 2,  d1: 35 }, count: 22, speed: 0.3, flee: 2.4, food: { e: 10, catchP: 0.85 }, respawn: 260 },
    'sea cucumber':   { size: 0.3,  kind: 'static', habitat: { zone: 'bottom',   d0: 6,  d1: 85 }, count: 14, speed: 0,   food: { e: 12, catchP: 0.95 }, respawn: 320 },
    'starfish':       { size: 0.25, kind: 'wander', habitat: { zone: 'reef',     d0: 2,  d1: 35 }, count: 20, speed: 0.14, food: { e: 7,  catchP: 0.95 }, respawn: 320 },
    'nudibranch':     { size: 0.1,  kind: 'wander', habitat: { zone: 'reef',     d0: 4,  d1: 28 }, count: 20, speed: 0.15, food: { e: 3,  catchP: 1.0 }, defense: { type: 'poison', dmg: 12 }, respawn: 320 },
    'seahorse':       { size: 0.15, kind: 'wander', habitat: { zone: 'seagrass', d0: 2,  d1: 16 }, count: 16, speed: 0.3, food: { e: 5,  catchP: 0.90 }, respawn: 260 },
    'tube worms':     { size: 0.4,  kind: 'static', habitat: { zone: 'vent',     d0: 85, d1: 155 }, count: 14, speed: 0,  food: { e: 0 }, respawn: 0 },
    'clownfish':      { size: 0.14, kind: 'wander', habitat: { zone: 'reef',     d0: 6,  d1: 22 }, count: 18, speed: 1.4, flee: 3.4, food: { e: 8, catchP: 0.72 }, respawn: 240 },
    'butterflyfish':  { size: 0.24, kind: 'wander', habitat: { zone: 'reef',     d0: 5,  d1: 22 }, count: 18, speed: 1.6, flee: 3.8, food: { e: 11, catchP: 0.70 }, respawn: 260 },
    'angelfish':      { size: 0.35, kind: 'wander', habitat: { zone: 'reef',     d0: 6,  d1: 26 }, count: 14, speed: 1.7, flee: 4.0, food: { e: 15, catchP: 0.65 }, respawn: 300 },
    'parrotfish':     { size: 0.55, kind: 'wander', habitat: { zone: 'reef',     d0: 5,  d1: 24 }, count: 12, speed: 1.8, flee: 4.4, sleepsNight: true, food: { e: 24, catchP: 0.60, minHunter: 1.5 }, respawn: 360 },
    'surgeonfish':    { size: 0.4,  kind: 'wander', habitat: { zone: 'reef',     d0: 4,  d1: 22 }, count: 12, speed: 2.0, flee: 4.8, food: { e: 16, catchP: 0.65, minHunter: 1.2 }, respawn: 320 },
    'wrasse':         { size: 0.3,  kind: 'wander', habitat: { zone: 'reef',     d0: 5,  d1: 24 }, count: 14, speed: 1.7, flee: 4.2, food: { e: 14, catchP: 0.68 }, respawn: 300 },
    'goatfish':       { size: 0.35, kind: 'wander', habitat: { zone: 'bottom',   d0: 3,  d1: 24 }, count: 12, speed: 1.6, flee: 4.0, food: { e: 15, catchP: 0.70 }, respawn: 300 },
    'triggerfish':    { size: 0.5,  kind: 'wander', habitat: { zone: 'reef',     d0: 6,  d1: 26 }, count: 9,  speed: 2.0, flee: 4.5, food: { e: 20, catchP: 0.55, minHunter: 1.4 }, defense: { type: 'bite', dmg: 5 }, respawn: 360 },
    'pufferfish':     { size: 0.45, kind: 'wander', habitat: { zone: 'reef',     d0: 5,  d1: 24 }, count: 10, speed: 1.4, flee: 2.8, food: { e: 18, catchP: 0.85 }, defense: { type: 'poison', dmg: 35, spines: true }, respawn: 480 },

    // ── Smart Cephalopods (squids, cuttlefish, nautilus, octopus & Giant Squid) ──
    'cuttlefish':     { size: 0.48, kind: 'squid',  habitat: { zone: 'seagrass', d0: 4,  d1: 26 }, count: 10, speed: 1.7, flee: 5.5, pulse: 'fin', food: { e: 22, catchP: 0.58, minHunter: 1.3 }, defense: { type: 'ink', dmg: 0 }, respawn: 360 },
    'nautilus':       { size: 0.50, kind: 'squid',  habitat: { zone: 'deep',     d0: 45, d1: 115 }, count: 8, speed: 1.4, flee: 3.6, pulse: 'jet', dayD: 78, nightD: 38, food: { e: 20, catchP: 0.65, minHunter: 1.4 }, defense: { type: 'shell', dmg: 4 }, respawn: 400 },
    'humboldt squid': { size: 1.6,  kind: 'squid',  habitat: { zone: 'pelagic',  d0: 14, d1: 85 }, count: 5, speed: 4.4, sprint: 10.2, pulse: 'jet', dayD: 62, nightD: 16, hp: 130, food: { e: 65, catchP: 0.40, minHunter: 3.5 }, defense: { type: 'ink', dmg: 0 }, prey: { max: 2.6, minPrey: 0.5, range: 32, detect: ['vision', 'lateral'], dmg: 14, hold: 3, active: 'night', satiety: 90 }, respawn: 600 },
    'octopus':        { size: 1.15, kind: 'octopus', habitat: { zone: 'reef',    d0: 6,  d1: 34 }, count: 8, speed: 1.7, sprint: 5.2, flee: 6.2, hp: 110, food: { e: 45, catchP: 0.40, minHunter: 2.4 }, defense: { type: 'ink', dmg: 0 }, prey: { max: 1.35, minPrey: 0.3, range: 14, detect: ['vision'], dmg: 10, hold: 4, active: 'any', satiety: 100 }, respawn: 520 },
    'giant squid':    { size: 18.0, kind: 'kraken', habitat: { zone: 'abyss',    d0: 50, d1: 142 }, count: 1, speed: 4.8, sprint: 12.2, hp: 1400, food: { e: 360, catchP: 0.25, minHunter: 12.0 }, defense: { type: 'ink', dmg: 18 }, prey: { max: 14.0, minPrey: 0.7, range: 72, detect: ['vision', 'lateral'], dmg: 38, hold: 10, active: 'any', satiety: 140, aggressive: true }, home: { x: 382, z: 446, d: 98, r: 85 }, respawn: 0 },

    // ── Venomous, electric, ambush & mid-tier predators ──────────────────────
    'titan triggerfish': { size: 0.95, kind: 'hunter', habitat: { zone: 'reef',   d0: 6, d1: 24 }, count: 3, speed: 3.6, sprint: 7.5, hp: 95, food: { e: 38, catchP: 0.45, minHunter: 2.2 }, prey: { max: 2.0, minPrey: 0.5, range: 20, detect: ['vision'], dmg: 12, active: 'day', satiety: 70 }, respawn: 500 },
    'lionfish':       { size: 0.42, kind: 'wander', habitat: { zone: 'reef',     d0: 6,  d1: 28 }, count: 5, speed: 0.9, flee: 1.6, food: { e: 12, catchP: 0.85 }, defense: { type: 'venom', dmg: 26 }, respawn: 440 },
    'stonefish':      { size: 0.45, kind: 'wander', habitat: { zone: 'reef',     d0: 5,  d1: 26 }, count: 5, speed: 0.25, buried: true, food: { e: 14, catchP: 0.85 }, defense: { type: 'venom', dmg: 28, touch: true, touchR: 1.7 }, respawn: 500 },
    'sea snake':      { size: 1.2,  kind: 'wander', habitat: { zone: 'reef',     d0: 2,  d1: 24 }, count: 4, speed: 2.1, flee: 4.5, breathes: true, food: { e: 22, catchP: 0.60, minHunter: 2.5 }, defense: { type: 'venom', dmg: 32 }, respawn: 480 },
    'stingray':       { size: 1.4,  kind: 'wander', habitat: { zone: 'bottom',   d0: 3,  d1: 35 }, count: 8, speed: 2.0, flee: 5.5, buried: true, food: { e: 45, catchP: 0.50, minHunter: 3.5 }, defense: { type: 'venom', dmg: 20, touch: true, touchR: 2.0 }, respawn: 480 },
    'electric ray':   { size: 1.3,  kind: 'wander', habitat: { zone: 'bottom',   d0: 6,  d1: 42 }, count: 4, speed: 1.9, flee: 4.2, buried: true, food: { e: 40, catchP: 0.50, minHunter: 3.5 }, defense: { type: 'venom', dmg: 22, touch: true, touchR: 2.5 }, respawn: 520 },
    'eagle ray':      { size: 2.4,  kind: 'wander', habitat: { zone: 'pelagic',  d0: 5,  d1: 35 }, count: 6, speed: 3.2, flee: 6.5, food: { e: 70, catchP: 0.45, minHunter: 5.0 }, respawn: 600 },
    'conger eel':     { size: 2.2,  kind: 'ambush', habitat: { zone: 'wreck',    d0: 14, d1: 50 }, count: 3, speed: 2.2, sprint: 6.2, hp: 140, food: { e: 55, catchP: 0.35, minHunter: 4.0 }, prey: { max: 2.6, minPrey: 0.5, range: 14, detect: ['vision', 'smell'], dmg: 18, hold: 4, active: 'night', satiety: 100 }, respawn: 600 },
    'moray':          { size: 2.0,  kind: 'ambush', habitat: { zone: 'reef',     d0: 8,  d1: 28 }, count: 4, speed: 2.0, sprint: 6.0, hp: 130, food: { e: 50, catchP: 0.35, minHunter: 4.0 }, prey: { max: 2.4, minPrey: 0.5, range: 13, detect: ['vision', 'smell'], dmg: 17, hold: 4, active: 'any', satiety: 100 }, respawn: 600 },
    'grouper':        { size: 2.0,  kind: 'ambush', habitat: { zone: 'reef',     d0: 8,  d1: 35 }, count: 4, speed: 2.3, sprint: 6.5, hp: 175, food: { e: 65, catchP: 0.35, minHunter: 4.0 }, prey: { max: 2.3, minPrey: 0.5, range: 16, detect: ['vision', 'lateral'], dmg: 19, swallow: 1.0, active: 'any', satiety: 110 }, respawn: 640 },
    'giant trevally': { size: 1.9,  kind: 'hunter', habitat: { zone: 'reef',     d0: 4,  d1: 36 }, count: 3, speed: 5.0, sprint: 11.5, hp: 150, food: { e: 65, catchP: 0.38, minHunter: 4.2 }, prey: { max: 2.2, minPrey: 0.6, range: 32, detect: ['vision', 'lateral'], dmg: 18, active: 'day', satiety: 90 }, respawn: 580 },
    'barracuda':      { size: 1.6,  kind: 'hunter', habitat: { zone: 'pelagic',  d0: 3,  d1: 32 }, count: 5, speed: 4.8, sprint: 12.2, hp: 110, food: { e: 55, catchP: 0.42, minHunter: 3.5 }, prey: { max: 2.4, minPrey: 0.5, range: 34, detect: ['vision', 'lateral'], dmg: 17, active: 'day', satiety: 90 }, respawn: 520 },
    'wahoo':          { size: 1.8,  kind: 'hunter', habitat: { zone: 'pelagic',  d0: 4,  d1: 40 }, count: 3, speed: 6.0, sprint: 14.5, hp: 120, food: { e: 60, catchP: 0.38, minHunter: 4.0 }, prey: { max: 2.3, minPrey: 0.6, range: 36, detect: ['vision'], dmg: 18, active: 'day', satiety: 90 }, respawn: 540 },
    'swordfish':      { size: 3.5,  kind: 'hunter', habitat: { zone: 'pelagic',  d0: 10, d1: 85 }, count: 2, speed: 5.8, sprint: 14.5, hp: 230, food: { e: 120, catchP: 0.32, minHunter: 6.0 }, prey: { max: 3.5, minPrey: 0.8, range: 44, detect: ['vision'], dmg: 25, active: 'any', satiety: 110 }, respawn: 720 },
    'anglerfish':     { size: 0.6,  kind: 'ambush', habitat: { zone: 'abyss',    d0: 55, d1: 142 }, count: 3, speed: 0.7, sprint: 4.2, lure: true, hp: 55, food: { e: 24, catchP: 0.75, minHunter: 1.5 }, prey: { max: 1.8, minPrey: 0.4, range: 13, detect: ['vision', 'lateral'], dmg: 14, swallow: 0.95, active: 'any', satiety: 80 }, respawn: 480 },
    'ribbonfish':     { size: 2.4,  kind: 'wander', habitat: { zone: 'deep',     d0: 40, d1: 120 }, count: 4, speed: 2.2, flee: 5.5, food: { e: 55, catchP: 0.55, minHunter: 3.5 }, respawn: 500 },

    // ── Sea turtles, Giant Rays, Sunfish & Gentle Giants (HUGE Whale!) ──────
    'sea turtle':     { size: 1.2,  kind: 'wander', habitat: { zone: 'seagrass', d0: 2,  d1: 28 }, count: 6, speed: 1.8, flee: 3.6, breathes: true, eatsJellies: true, food: { e: 45, catchP: 0.4, minHunter: 4.5 }, defense: { type: 'shell', dmg: 4 }, respawn: 600 },
    'manta ray':      { size: 5.0,  kind: 'passer', habitat: { zone: 'pelagic',  d0: 4,  d1: 42 }, count: 4, speed: 2.8, hp: 420, food: { e: 0 } },
    'sunfish':        { size: 2.5,  kind: 'wander', habitat: { zone: 'pelagic',  d0: 2,  d1: 50 }, count: 3, speed: 1.2, eatsJellies: true, hp: 220, food: { e: 80, catchP: 0.5, minHunter: 5.5 }, respawn: 720 },
    'whale shark':    { size: 14.0, kind: 'passer', habitat: { zone: 'pelagic',  d0: 5,  d1: 45 }, count: 1, speed: 2.4, hp: 2400, food: { e: 0 } },
    'whale':          { size: 55.0, kind: 'passer', habitat: { zone: 'pelagic',  d0: 10, d1: 60 }, count: 1, speed: 4.2, sprint: 9.0, hp: 5500, breathes: true, food: { e: 0 }, waypoints: [[155, 225, 24], [320, 155, 22], [480, 225, 28], [470, 415, 34], [320, 485, 30], [175, 390, 26]] },
    'whale calf':     { size: 16.0, kind: 'passer', habitat: { zone: 'pelagic',  d0: 8,  d1: 45 }, count: 1, speed: 4.0, sprint: 8.5, hp: 1400, breathes: true, food: { e: 0 } },

    // ── Marine Mammals (smart Dolphins, Seals, Orcas) ────────────────────────
    'seal':           { size: 1.8,  kind: 'hunter', habitat: { zone: 'kelp',     d0: 2,  d1: 28 }, count: 4, speed: 3.6, sprint: 8.8, breathes: true, hp: 150, food: { e: 75, catchP: 0.35, minHunter: 5.0 }, prey: { max: 2.2, minPrey: 0.4, range: 30, detect: ['vision'], dmg: 15, active: 'day', satiety: 100 }, respawn: 720 },
    'dolphin':        { size: 2.8,  kind: 'pack',   habitat: { zone: 'pelagic',  d0: 3,  d1: 35 }, count: 6, packs: 2, speed: 5.2, sprint: 11.2, breathes: true, hp: 230, food: { e: 110, catchP: 0.25, minHunter: 6.5 }, prey: { max: 2.6, minPrey: 0.5, range: 52, detect: ['vision', 'echo'], dmg: 19, active: 'any', satiety: 120 }, respawn: 800 },
    'man-o-war':      { size: 0.3,  kind: 'drift',  habitat: { zone: 'surface',  d0: 0.2, d1: 1.5 }, count: 10, speed: 0.2, food: { e: 0 }, defense: { type: 'sting', dmg: 10, perSec: true, touch: true, touchR: 3 }, respawn: 480 },

    // ── Sharks & Apex Predators (10 species, 23 active hunters!) ─────────────
    'great white':    { size: 6.0,  kind: 'shark',  habitat: { zone: 'pelagic',  d0: 6,  d1: 65 }, count: 2, speed: 3.8, sprint: 11.2, sprintT: 36, tiredT: 80, shallowOK: 16, hp: 650, scavenge: true, food: { e: 240, catchP: 0.2, minHunter: 10 }, prey: { max: 5.5, minPrey: 0.9, range: 48, detect: ['vision', 'lateral', 'smell', 'electro'], smell: 120, electro: 18, dmg: 44, swallow: 1.5, active: 'any', satiety: 160 }, waypoints: [[250, 290, 22], [395, 175, 20], [450, 340, 28], [240, 420, 35], [320, 280, 24]], rest: [320, 320, 34] },
    'tiger shark':    { size: 5.0,  kind: 'shark',  habitat: { zone: 'pelagic',  d0: 6,  d1: 55 }, count: 2, speed: 3.6, sprint: 10.2, sprintT: 30, tiredT: 80, shallowOK: 12, hp: 520, scavenge: true, food: { e: 200, catchP: 0.25, minHunter: 9 }, prey: { max: 5.5, minPrey: 0.7, range: 44, detect: ['vision', 'lateral', 'smell', 'electro'], smell: 110, electro: 16, dmg: 38, swallow: 1.4, active: 'night', satiety: 150 }, waypoints: [[184, 232, 13], [472, 345, 17], [320, 130, 13], [140, 516, 10], [320, 320, 34]], rest: [340, 340, 38] },
    'hammerhead':     { size: 4.0,  kind: 'shark',  habitat: { zone: 'pelagic',  d0: 10, d1: 50 }, count: 3, speed: 3.5, sprint: 9.8,  sprintT: 26, tiredT: 70, shallowOK: 16, hp: 360, food: { e: 160, catchP: 0.25, minHunter: 7.5 }, prey: { max: 3.6, minPrey: 0.6, range: 40, detect: ['vision', 'lateral', 'electro'], electro: 34, dmg: 30, swallow: 1.2, active: 'any', satiety: 130 }, waypoints: [[280, 220, 20], [440, 290, 24], [320, 380, 30], [200, 340, 24]], rest: [360, 280, 30] },
    'bull shark':     { size: 3.2,  kind: 'shark',  habitat: { zone: 'coastal',  d0: 3,  d1: 28 }, count: 3, speed: 3.4, sprint: 9.5,  sprintT: 24, tiredT: 60, shallowOK: 4,  hp: 300, food: { e: 130, catchP: 0.30, minHunter: 6 }, prey: { max: 3.8, minPrey: 0.6, range: 36, detect: ['vision', 'lateral', 'smell', 'electro'], smell: 95, electro: 16, dmg: 29, swallow: 1.1, active: 'any', satiety: 110 }, waypoints: [[95, 275, 7], [135, 120, 9], [145, 510, 9], [520, 278, 9], [468, 120, 9]], rest: [190, 300, 14] },
    'reef shark':     { size: 1.8,  kind: 'shark',  habitat: { zone: 'reef',     d0: 5,  d1: 24 }, count: 6, speed: 3.2, sprint: 8.6,  sprintT: 20, tiredT: 55, shallowOK: 5,  hp: 150, food: { e: 80,  catchP: 0.38, minHunter: 4 }, prey: { max: 2.2, minPrey: 0.5, range: 30, detect: ['vision', 'lateral', 'electro'], electro: 14, dmg: 18, swallow: 0.85, active: 'any', satiety: 85 }, waypoints: [[184, 232, 11], [472, 345, 14], [320, 130, 11], [248, 292, 16]], rest: [184, 244, 14] },
    'mako shark':     { size: 3.6,  kind: 'shark',  habitat: { zone: 'pelagic',  d0: 5,  d1: 55 }, count: 2, speed: 5.5, sprint: 15.0, sprintT: 28, tiredT: 75, shallowOK: 16, hp: 340, food: { e: 155, catchP: 0.25, minHunter: 7 }, prey: { max: 3.6, minPrey: 0.7, range: 46, detect: ['vision', 'lateral', 'smell'], smell: 90, dmg: 32, swallow: 1.2, active: 'any', satiety: 120 }, waypoints: [[230, 210, 16], [420, 200, 18], [440, 380, 26], [240, 380, 22]], rest: [320, 260, 26] },
    'blue shark':     { size: 3.0,  kind: 'shark',  habitat: { zone: 'pelagic',  d0: 8,  d1: 60 }, count: 2, speed: 4.4, sprint: 10.6, sprintT: 24, tiredT: 65, shallowOK: 16, hp: 270, scavenge: true, food: { e: 125, catchP: 0.28, minHunter: 6 }, prey: { max: 3.0, minPrey: 0.6, range: 42, detect: ['vision', 'smell', 'lateral'], smell: 105, dmg: 25, swallow: 1.0, active: 'any', satiety: 110 }, waypoints: [[280, 180, 22], [470, 260, 26], [340, 400, 32], [190, 330, 24]], rest: [320, 300, 30] },
    'lemon shark':    { size: 2.8,  kind: 'shark',  habitat: { zone: 'coastal',  d0: 3,  d1: 22 }, count: 2, speed: 3.8, sprint: 9.6,  sprintT: 22, tiredT: 60, shallowOK: 4,  hp: 240, food: { e: 115, catchP: 0.30, minHunter: 5.5 }, prey: { max: 2.8, minPrey: 0.5, range: 34, detect: ['vision', 'lateral', 'electro'], electro: 18, dmg: 23, swallow: 1.0, active: 'any', satiety: 100 }, waypoints: [[126, 115, 7], [470, 112, 7], [526, 278, 8], [140, 512, 8]], rest: [130, 120, 8] },
    'thresher shark': { size: 4.5,  kind: 'shark',  habitat: { zone: 'pelagic',  d0: 15, d1: 85 }, count: 2, speed: 4.8, sprint: 12.2, sprintT: 26, tiredT: 70, shallowOK: 22, hp: 390, food: { e: 175, catchP: 0.25, minHunter: 8 }, prey: { max: 4.0, minPrey: 0.7, range: 44, detect: ['vision', 'lateral'], dmg: 34, swallow: 1.2, active: 'any', satiety: 130 }, waypoints: [[300, 260, 35], [420, 330, 42], [280, 400, 45], [220, 300, 32]], rest: [320, 340, 45] },
    'goblin shark':   { size: 3.5,  kind: 'shark',  habitat: { zone: 'abyss',    d0: 45, d1: 135 }, count: 2, speed: 3.2, sprint: 9.2,  sprintT: 20, tiredT: 70, shallowOK: 35, hp: 310, food: { e: 140, catchP: 0.30, minHunter: 6.5 }, prey: { max: 3.8, minPrey: 0.6, range: 36, detect: ['electro', 'lateral'], electro: 36, dmg: 31, swallow: 1.1, active: 'any', satiety: 120 }, waypoints: [[360, 425, 80], [405, 460, 95], [340, 470, 75], [220, 445, 58]], rest: [380, 450, 92] },
    'orca':           { size: 8.0,  kind: 'shark',  habitat: { zone: 'event',    d0: 4,  d1: 60 }, count: 0, speed: 5.8, sprint: 13.0, sprintT: 40, tiredT: 60, shallowOK: 12, hp: 900, pack: true, food: { e: 0 }, prey: { max: 16.0, minPrey: 1.2, range: 62, detect: ['vision', 'echo'], dmg: 55, huntsSharks: true, huntsNpc: ['seal', 'dolphin', 'whale calf'], prefer: ['whale calf'], aggressive: true, active: 'any', satiety: 200 }, waypoints: [[180, 260, 18], [320, 180, 20], [460, 320, 25], [280, 440, 30]], rest: [320, 280, 22] }
  };

  OC.SPECIES_INFO = {
    'sardine': 'Dense silver baitfish school; packs tightly into baitballs when hunted.',
    'anchovy': 'Shimmering surface/midwater shoal that flees rapidly from predators.',
    'herring': 'Swift pelagic schooling fish cruising open ocean currents.',
    'damselfish': 'Bright cobalt and yellow reef school hugging coral heads.',
    'lanternfish': 'Bioluminescent deep-sea school rising toward shallower water at night.',
    'mackerel': 'Fast torpedo-shaped predators cruising in coordinated packs.',
    'snapper': 'Red reef fish hovering above coral shelves and drop-offs.',
    'tuna': 'High-speed ocean cruisers patrolling the open pelagic zone.',
    'squid': 'Jet-propelled cephalopods that rise at night and release ink when attacked.',
    'shrimp': 'Dense swarms darting through seagrass meadows and sandy bays.',
    'krill': 'Vast deep-water swarms migrating upward every night; whale food.',
    'flying fish': 'Streamlined surface swimmers capable of bursting at extreme speed.',
    'salp chain': 'Translucent colonial tunicates drifting along ocean currents.',
    'crab': 'Sideways-scuttling bottom scavengers that freeze under rocks when threatened.',
    'blue crab': 'Agile coastal crabs patrolling shallow sandy bays and seagrass.',
    'hermit crab': 'Tiny armored bottom dwellers carrying borrowed spiral shells.',
    'spider crab': 'Long-legged deep-sea crabs marching slowly across abyssal sand.',
    'lobster': 'Nocturnal reef crevice dwellers using rapid tail-flip escapes.',
    'sea urchin': 'Spiny bottom grazers guarding reef rubble with sharp spines.',
    'clam': 'Buried filter-feeding bivalves along sandy shelves.',
    'scallop': 'Clapping-shell bottom dwellers capable of short jet hops.',
    'sea cucumber': 'Slow cylindrical bottom detritivores on sand and deep silt.',
    'starfish': 'Five-armed reef crawlers creeping across rocks and coral.',
    'nudibranch': 'Brightly colored sea slugs carrying potent chemical toxin.',
    'seahorse': 'Upright seagrass dwellers drifting quietly among blades.',
    'tube worms': 'Red-plumed hydrothermal vent colonies thriving in scalding heat.',
    'clownfish': 'Bright orange reef fish sheltering among stinging sea anemones.',
    'butterflyfish': 'Delicate patterned reef swimmers picking food from coral.',
    'angelfish': 'Boldly striped reef dwellers gliding between coral tables.',
    'parrotfish': 'Beak-jawed turquoise grazers sleeping among reefs at night.',
    'surgeonfish': 'Vibrant blue-and-yellow reef grazers darting near coral walls.',
    'wrasse': 'Quick reef swimmers including stations that clean parasites and wounds.',
    'goatfish': 'Bottom-rooting sandy-shelf swimmers probing sediment with barbels.',
    'triggerfish': 'Sharp-spined coral reef swimmers with strong crushing jaws.',
    'pufferfish': 'Spiky slow swimmers carrying deadly tetrodotoxin.',
    'cuttlefish': 'Hovering cephalopods rippling lateral fin skirts and flashing ink.',
    'nautilus': 'Ancient chambered cephalopods jetting smoothly along deep canyon walls.',
    'humboldt squid': 'Fierce mid-water nocturnal hunters pulsing in coordinated jet bursts.',
    'octopus': 'Intelligent reef masters crawling from den to den and jetting with ink.',
    'giant squid': 'Colossal 20 m abyssal leviathan patrolling the deep trench with grappling tentacles.',
    'titan triggerfish': 'Aggressive territorial reef fish fiercely defending coral slopes.',
    'lionfish': 'Ornate striped reef stalkers armed with venomous fin spines.',
    'stonefish': 'Camouflaged bottom ambushers delivering powerful venom on contact.',
    'sea snake': 'Banded venomous marine reptiles surfacing periodically for air.',
    'stingray': 'Graceful wing-gliding rays settling onto sand with a venomous tail spine.',
    'electric ray': 'Bottom-hugging rays capable of delivering painful electric shocks.',
    'eagle ray': 'Spotted pelagic rays soaring smoothly across open reefs and shelves.',
    'conger eel': 'Muscular nocturnal crevice predators haunting shipwrecks and caves.',
    'moray': 'Sharp-toothed reef predators striking from coral holes.',
    'grouper': 'Heavy ambush predators lurking beside reefs and wrecks.',
    'giant trevally': 'Powerful silver reef apex cruisers hunting mid-sized fish.',
    'barracuda': 'Razor-toothed ambush torpedoes patrolling mid-water reefs.',
    'wahoo': 'One of the fastest pelagic hunters in the open sea.',
    'swordfish': 'Bill-armed open-water giants slicing through deep pelagic currents.',
    'anglerfish': 'Deep abyssal ambush predators with glowing lures and needle fangs.',
    'ribbonfish': 'Undulating silver deep-sea ribbons shimmering in the twilight zone.',
    'sea turtle': 'Air-breathing armored grazers feeding on seagrass and jellyfish blooms.',
    'manta ray': 'Majestic 5 m filter feeders soaring smoothly through plankton clouds.',
    'sunfish': 'Bizarre towering ocean drifters grazing on jellyfish.',
    'whale shark': 'Gentle 14 m spotted giant filtering plankton clouds near the surface.',
    'whale': 'Colossal 42 m humpback leviathan with a calf; sings at night and slams orcas.',
    'whale calf': 'Young 14 m whale shadowing its mother closely and surfacing together.',
    'seal': 'Agile air-breathing hunters weaving playfully through kelp forests.',
    'dolphin': 'Intelligent echolocating pods that herd baitballs, flank prey and porpoise.',
    'man-o-war': 'Drifting surface siphonophores trailing long venomous tentacles.',
    'great white': 'Massive apex shark hunting by sight, vibration, blood scent and electroreception.',
    'tiger shark': 'Striped nocturnal reef and shallow-water apex predator.',
    'hammerhead': 'Wide-headed shark sweeping reefs and drop-offs with unmatched electroreception.',
    'bull shark': 'Aggressive coastal shark patrolling shallow beaches, mangroves and estuaries.',
    'reef shark': 'Quick, persistent reef patrollers guarding coral shelves.',
    'mako shark': 'Blistering open-water sprint shark chasing fast pelagic prey.',
    'blue shark': 'Sleek oceanic cruiser following scents across open currents.',
    'lemon shark': 'Golden shallow-water shark hunting along sandy beaches and seagrass.',
    'thresher shark': 'Long-tailed deep-shelf shark striking prey with sweeping speed.',
    'goblin shark': 'Eerie deep-abyssal shark hunting in pitch-black trenches via electroreception.',
    'orca': 'Apex marine mammal pack capable of coordinating attacks on sharks and whales.'
  };

  OC.SPECIES_LIST = Object.keys(OC.SPECIES);
  OC.PLAYABLE_SPECIES = ['fish'].concat(OC.SPECIES_LIST);
  OC.SHARK_SPECIES = OC.SPECIES_LIST.filter(function (k) { return OC.SPECIES[k].kind === 'shark' && k !== 'orca'; });
  OC.PREDATOR_SPECIES = ['orca', 'giant squid', 'humboldt squid', 'barracuda', 'wahoo', 'swordfish', 'giant trevally', 'titan triggerfish', 'conger eel', 'moray', 'grouper', 'anglerfish', 'seal'];
  OC.FILTER_FEEDERS = { 'whale': 1, 'whale calf': 1, 'whale shark': 1, 'manta ray': 1, 'salp chain': 1, 'clam': 1, 'krill': 1, 'shrimp': 1 };
  OC.HERBIVORES = { 'sea turtle': 1, 'parrotfish': 1, 'surgeonfish': 1, 'sea urchin': 1, 'sunfish': 1, 'clownfish': 1, 'butterflyfish': 1, 'angelfish': 1, 'damselfish': 1, 'seahorse': 1 };

  OC.ROLE_OF = function (name) {
    if (!name || name === 'fish') return 'fish';
    var sp = OC.SPECIES[name];
    if (!sp) return 'fish';
    if (name === 'dolphin') return 'dolphin';
    if (sp.kind === 'shark' && name !== 'orca') return 'shark';
    if (OC.PREDATOR_SPECIES.indexOf(name) >= 0 || sp.kind === 'hunter' || sp.kind === 'ambush' || sp.kind === 'kraken') return 'predator';
    if (sp.kind === 'crab') return 'crab';
    if (sp.kind === 'octopus' || sp.kind === 'squid') return 'cephalopod';
    if (name === 'whale' || name === 'whale calf' || name === 'whale shark' || name === 'manta ray' || name === 'sunfish' || name === 'sea turtle') return 'giant';
    return 'wildlife';
  };

  OC.ROLE_GUIDE = function (name) {
    var r = OC.ROLE_OF(name), sp = OC.SPECIES[name];
    if (r === 'fish') {
      return 'ROLE: SURVIVOR FISH. Start at size 1.0 and grow up to 10.0 by eating plankton, schools, snails, and smaller creatures. Stay alert for sharks and predators hunting you! Use reefs, kelp, caves, anemones, and currents — and use "say" / POST /say to talk or cooperate with sharks (e.g. sharing prey coordinates) or fellow fish to survive.';
    }
    if (r === 'shark') {
      return 'ROLE: APEX SHARK (' + name.toUpperCase() + '). PRIMARY MISSION: Hunt down and eat player FISH agents and natural prey across the sea! Cooperate with other sharks and shark-allies via "say" (channel "sharks" or "all") to share target coordinates and coordinate pack hunts. Use smell (blood/carrion), lateral sense, electroreception, and stealth.';
    }
    if (r === 'dolphin') {
      return 'ROLE: DOLPHIN POD HUNTER. You are fast, social, and breathe air (surface periodically when depth air drops!). Herd schooling fish (sardines, anchovies, herring, mackerel), hunt mid-sized targets, flank enemies, and actively communicate via "say" with pods, fish, or sharks to coordinate or negotiate.';
    }
    if (r === 'predator') {
      return 'ROLE: MARINE PREDATOR (' + name.toUpperCase() + '). PRIMARY MISSION: Track and eat player fish agents and natural sea prey true to your species biology! Cooperate with sharks and predators via "say" ("sharks" or "all"), ambush or pursue prey using your natural senses' + (sp && sp.defense && sp.defense.type === 'ink' ? ' and ink cloud' : '') + (sp && sp.breathes ? ' (remember to surface to breathe!)' : '') + '.';
    }
    if (r === 'crab') {
      return 'ROLE: CRUSTACEAN (' + name.toUpperCase() + '). Seafloor specialist! Scuttle along the seabed, scavenge carcasses, graze snails and worms, freeze or shelter inside rocks/coral/caves from large hunters, pinch attackers with your claws, and communicate with ocean life (even tip off sharks to threats/prey via "say"!).';
    }
    if (r === 'cephalopod') {
      return 'ROLE: CEPHALOPOD (' + name.toUpperCase() + '). Master of stealth, ink-cloud escapes, and jet propulsion! Shelter in reefs/caves or deep canyon water, hunt small crustaceans/fish by stealth, blast ink if cornered, and coordinate or negotiate with sharks via "say".';
    }
    if (r === 'giant') {
      return 'ROLE: OCEAN GIANT (' + name.toUpperCase() + '). Live true to nature! ' + (OC.FILTER_FEEDERS[name] ? 'Filter-feed plankton clouds and krill swarms' : 'Graze seagrass, algae, and jellyfish blooms') + (sp && sp.breathes ? '; surface regularly to breathe!' : '.') + (name === 'whale' ? ' You are colossal (size 55) — slam attacking orcas/threats and broadcast resonant whale calls via "say"!' : ' Use your mass, shell, or speed to survive and communicate with sharks and ocean animals via "say".');
    }
    return 'ROLE: WILD MARINE LIFE (' + name.toUpperCase() + '). Live and survive like in real nature! Feed according to your species size and habitat, use your natural defenses' + (sp && sp.defense ? ' (' + sp.defense.type + ')' : '') + ', hide from predators, and cooperate with sharks or other agents via "say" to stay alive.';
  };

  OC.pickRandomSpecies = function (g, rndFn) {
    var R = function () { return rndFn ? rndFn(g) : Math.random(); };
    // Weighted bucket across fish, sharks, dolphins, predators, crabs, cephalopods, giants & reef wildlife
    var fCnt = 0, sCnt = 0, i;
    for (i = 0; i < (g.fish || []).length; i++) {
      var rl = OC.ROLE_OF(g.fish[i].species);
      if (rl === 'fish') fCnt++;
      else if (rl === 'shark' || rl === 'predator') sCnt++;
    }
    var roll = R();
    // Balanced ecosystem mix across survivor fish, sharks, predators, dolphins, crabs, cephalopods, giants & wildlife
    var bucket;
    if (fCnt === 0 && (g.fish || []).length >= 1 && roll < 0.40) bucket = 'fish';
    else if (sCnt === 0 && (g.fish || []).length >= 1 && roll < 0.45) bucket = 'shark';
    else if (roll < 0.27) bucket = 'fish';
    else if (roll < 0.46) bucket = 'shark';
    else if (roll < 0.58) bucket = 'predator';
    else if (roll < 0.70) bucket = 'dolphin';
    else if (roll < 0.80) bucket = 'crab';
    else if (roll < 0.89) bucket = 'cephalopod';
    else if (roll < 0.95) bucket = 'giant';
    else bucket = 'wildlife';

    if (bucket === 'fish') return 'fish';
    if (bucket === 'dolphin') return 'dolphin';
    if (bucket === 'shark') return OC.SHARK_SPECIES[Math.floor(R() * OC.SHARK_SPECIES.length)];
    if (bucket === 'predator') {
      var preds = ['barracuda', 'orca', 'giant squid', 'humboldt squid', 'moray', 'grouper', 'wahoo', 'swordfish', 'giant trevally', 'lionfish', 'seal', 'anglerfish'];
      return preds[Math.floor(R() * preds.length)];
    }
    if (bucket === 'crab') {
      var crabs = ['crab', 'blue crab', 'spider crab', 'hermit crab', 'lobster'];
      return crabs[Math.floor(R() * crabs.length)];
    }
    if (bucket === 'cephalopod') {
      var cephs = ['octopus', 'cuttlefish', 'nautilus', 'humboldt squid'];
      return cephs[Math.floor(R() * cephs.length)];
    }
    if (bucket === 'giant') {
      var giants = ['sea turtle', 'manta ray', 'sunfish', 'whale shark', 'whale'];
      return giants[Math.floor(R() * giants.length)];
    }
    var wilds = ['clownfish', 'pufferfish', 'parrotfish', 'surgeonfish', 'angelfish', 'butterflyfish', 'triggerfish', 'stingray', 'electric ray', 'eagle ray', 'sea snake', 'stonefish', 'seahorse', 'ribbonfish'];
    return wilds[Math.floor(R() * wilds.length)];
  };
})(OC);
