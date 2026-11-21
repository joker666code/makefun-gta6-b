[![make.fun](https://make.fun/badge.svg)](https://make.fun)
[![gta6-01](https://make.fun/badge-gta6-01.svg)](https://make.fun/competitions/gta6-01)
[![Solmaris](https://make.fun/badge-solmaris.svg)](https://make.fun)

# Solmaris — An Open-World Crime Story

A complete original 2D top-down open-world crime game for the make.fun
**gta6-01 — Make GTA 6** bounty. No Rockstar names, characters, maps, art or
music: everything here is our own.

**The story.** Danny Vega, a retired getaway driver, is pulled back in by his
old friend Marcus. Across five missions he relearns the wheel, runs a cab,
moves a hot package, outruns a city-wide pursuit, and finally hits the
Solmaris Central Bank and escapes to the Sunset Pier.

**v2 visual pass.** The whole game was re-dressed for the eye: cars have
tyres, glass, headlights and per-kind bodies (sports spoiler and stripe,
taxi checkers and roof sign, truck cargo bed, police light bar washing the
street red and blue); buildings cast sun-angled shadows and carry roof
texture and glowing neon signs; streets have kerbs, zebra crossings and stop
lines; nights bring lit windows, lamp halos, headlight beams, rain and a
vignette; gunfire flashes and ejects brass, crashes throw sparks and debris
and shake the camera, and the HUD and menus share one gold-on-navy look.

## What is in the game

- **A city to explore** — Solmaris: a seeded procedural city (3400×2600) with
  a road grid, buildings, a park, a beach and ocean on the west edge, street
  lamps, trees and parked cars. v2 adds landmarks: an airfield runway, a
  downtown fountain plaza, a wooden pier, marina docks and beach umbrellas.
  v5 adds a sailboat and a yacht at anchor off the beach, each with a
  reflection shimmering under the hull.
- **A living clock** (v2) — a full day turns over as you play: dawn, day,
  sunset and night, each with its own light. Night brings lit windows, street
  lamps and headlights; sunset turns the whole city orange.
- **On foot and by car** — walk/run, steal any car with `E`, arcade driving
  with steering, braking and reversing. v2: sports cars (fast, loose) and
  trucks (slow, tough) handle differently; hold `N` for a nitro boost and
  `Space` for the handbrake — drift, leave skid marks and tyre smoke.
- **Traffic and pedestrians** — cars cruise the roads, slow for traffic and
  turn at intersections; pedestrians stroll the sidewalks and flee gunfire.
  Stuck traffic honks at you (v2), and `H` lets you honk back. v5: about one
  pedestrian in five wears a cap or a sun hat and one in three wears a
  jacket over their shirt, on top of the v4 hair and skin variety; neon signs
  shrink their type to fit narrow buildings, and a sunset shower gets the
  same wet-road reflections as a rainy night.
- **Wanted level 0–5 and police** — crimes raise the heat; patrol cars chase,
  ram and shoot, and can catch Danny on foot (Busted) or take him down
  (Wasted). Lose them long enough and the heat cools off. v2: at 4+ stars the
  PD throws up a roadblock ahead of you and tries PIT moves; the music
  switches to a faster chase theme at 3+ stars.
- **Five story missions** — Back in the Saddle, Cab Fare, The Drop, Hot
  Pursuit, The Solmaris Job — with objectives, a guide marker and a dashed
  route line, cash rewards and a win screen.
- **Side jobs** (v2) — press `T` any time for a repeatable fare between two
  named places: beat the 50-second clock and the tip grows with the time
  left. The fare shows as a green `$` marker and on the minimap.
- **Combat** — mouse aim, click to shoot the pistol (magazine + reload `R`),
  punch with `F`, health, ammo and cash pickups. Wrecked cars throw sparks;
  battered cars smoke.
- **HUD + minimap** — health bar, money, wanted stars, current objective,
  vehicle and speed, ammo, and a live minimap with the objective, police
  and the camera viewport. v2 adds the clock, a nitro tank bar and the
  active side job.
- **Menus and save** — title screen, pause, Busted / Wasted / win screens,
  and localStorage autosave (money, mission progress, health, ammo, position).
  v2 saves the clock and lifetime stats too (total earned, cars stolen, side
  jobs done — shown on the win screen).
- **Sound** — fully synthesized WebAudio: engine, siren, gunshots, crashes,
  pickups and a looping bass-and-hats music track. No audio files. v2 adds
  horn, skid, nitro and door sounds, and a chase variant of the music.
- **Day and night** — the clock turns day into sunset into night (`?shot=night`,
  or `?clock=sunset` to pin a time of day).

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move on foot, drive |
| E | Enter / exit a car (steal it) |
| N | Nitro boost (hold, while driving) |
| Space | Handbrake / drift (while driving) |
| H | Honk the horn |
| T | Take a side-job fare |
| Mouse + click | Aim and shoot |
| F | Punch |
| R | Reload |
| Shift | Run |
| P / Esc | Pause |
| Space | Start / continue |

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests: `game/index.html` plus its ES modules
under `game/src/` is the whole game.

Screenshot scenes (deterministic, `seed=1`):

| File | Scene |
| --- | --- |
| `1-win.jpg` | `?shot=win&seed=1&clock=sunset` — the win screen: final take $3,240, all 5 missions complete, over the pier at sunset |
| `2-chase.jpg` | `?shot=chase&seed=1&clock=sunset` — sunset police pursuit in a sports car on nitro, 3 wanted stars |
| `3-coast.jpg` | `?shot=coast&seed=1&clock=sunset` — the final escape run down the beach road: Sunset Pier, umbrellas, sailboat and yacht at anchor, ocean shimmer |
| `4-night.jpg` | `?shot=night&seed=1&clock=night` — night driving downtown in the rain, braking under the street lamps, wet-road reflections |

`?clock=day|sunset|night|dawn` also pins the time of day in free play.

## Files

- `game/index.html` — canvas, HUD DOM, minimap canvas
- `game/src/config.js` — tuning, palette, helpers, seeded RNG
- `game/src/city.js` — procedural city: roads, blocks, buildings, park, beach
- `game/src/audio.js` — WebAudio synthesized effects and music
- `game/src/input.js` — keyboard + mouse
- `game/src/entities.js` — player, cars, pedestrians, police; car physics
- `game/src/traffic.js` — traffic/pedestrian AI, wanted level, police AI, shooting
- `game/src/missions.js` — the five-mission story chain
- `game/src/render.js` — camera, world drawing, HUD, minimap, screens
- `game/src/main.js` — boot, fixed-step loop, state machine, save wiring
- `game/src/shots.js` — deterministic screenshot scenes
- `game/src/save.js` — localStorage save/load
- `main.ts` — copies `game/` + `screenshots/` to `/output`, writes `dossier.json`
- `serve.ts` — local static server (development only)

## Hand in (local check only — submission needs the owner's confirmation)

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see `LICENSE`.
