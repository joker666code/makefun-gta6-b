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

## What is in the game

- **A city to explore** — Solmaris: a seeded procedural city (3400×2600) with
  a road grid, buildings, a park, a beach and ocean on the west edge, street
  lamps, trees and parked cars.
- **On foot and by car** — walk/run, steal any car with `E`, arcade driving
  with steering, braking and reversing.
- **Traffic and pedestrians** — cars cruise the roads, slow for traffic and
  turn at intersections; pedestrians stroll the sidewalks and flee gunfire.
- **Wanted level 0–5 and police** — crimes raise the heat; patrol cars chase,
  ram and shoot, and can catch Danny on foot (Busted) or take him down
  (Wasted). Lose them long enough and the heat cools off.
- **Five story missions** — Back in the Saddle, Cab Fare, The Drop, Hot
  Pursuit, The Solmaris Job — with objectives, a guide marker and a dashed
  route line, cash rewards and a win screen.
- **Combat** — mouse aim, click to shoot the pistol (magazine + reload `R`),
  punch with `F`, health, ammo and cash pickups.
- **HUD + minimap** — health bar, money, wanted stars, current objective,
  vehicle and speed, ammo, and a live minimap with the objective, police
  and the camera viewport.
- **Menus and save** — title screen, pause, Busted / Wasted / win screens,
  and localStorage autosave (money, mission progress, health, ammo, position).
- **Sound** — fully synthesized WebAudio: engine, siren, gunshots, crashes,
  pickups and a looping bass-and-hats music track. No audio files.
- **Day and night** — a night mode with lit windows, street lamps and car
  headlights (`?shot=night`).

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move on foot, drive |
| E | Enter / exit a car (steal it) |
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
| `1-start.jpg` | `?shot=start` — title over a busy street |
| `2-chase.jpg` | `?shot=chase` — police pursuit, 3 wanted stars |
| `3-mission.jpg` | `?shot=mission` — The Drop at Warehouse 9 |
| `4-night.jpg` | `?shot=night` — night driving downtown |

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
