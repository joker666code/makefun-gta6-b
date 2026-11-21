// Drawing only: the camera, the city, the actors, the HUD and the minimap.
// The world state and the current screen go in; pixels come out. No rules here.

import { CAR, FONT, PALETTE, ROAD, WORLD, clamp } from './config.js';
import { PLACES } from './city.js';
import { MISSIONS, currentObjectiveText, objectiveTarget } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';
export const SCREEN_BUSTED = 'busted';

const VIEW_W = 1280;
const VIEW_H = 720;

export function createRenderer(canvas, hud) {
  const ctx = canvas.getContext('2d');
  const minimap = hud.minimap.getContext('2d');
  let lastHud = '';

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    ctx.setTransform(canvas.width / VIEW_W, 0, 0, canvas.height / VIEW_H, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function camera(state) {
    const p = state.player;
    const focusX = p.inCar ? p.inCar.x : p.x;
    const focusY = p.inCar ? p.inCar.y : p.y;
    return {
      x: clamp(focusX - VIEW_W / 2, 0, WORLD.width - VIEW_W),
      y: clamp(focusY - VIEW_H / 2, 0, WORLD.height - VIEW_H),
    };
  }

  function drawCity(c, state, cam) {
    const { city, night } = state;
    // Ground: grass, then the beach and ocean on the west edge.
    c.fillStyle = night ? '#2c4a26' : PALETTE.grass;
    c.fillRect(cam.x - 20, cam.y - 20, VIEW_W + 40, VIEW_H + 40);
    c.fillStyle = night ? '#5a4a28' : PALETTE.sand;
    c.fillRect(0, cam.y - 20, 120, VIEW_H + 40);
    c.fillStyle = night ? '#0f2f4a' : PALETTE.ocean;
    c.fillRect(0, cam.y - 20, 70, VIEW_H + 40);
    c.fillStyle = night ? '#123a5c' : PALETTE.oceanDeep;
    for (let y = Math.floor(cam.y / 90) * 90; y < cam.y + VIEW_H; y += 90) {
      c.fillRect(8, y + 20, 54, 4);
    }
    // The park block.
    c.fillStyle = night ? '#23401c' : PALETTE.park;
    c.fillRect(city.park.x, city.park.y, city.park.w, city.park.h);
    c.fillStyle = night ? '#2c5a24' : '#3f7a33';
    for (let i = 0; i < 6; i++) {
      const tx = city.park.x + 40 + (i % 3) * 90;
      const ty = city.park.y + 40 + Math.floor(i / 3) * 80;
      c.beginPath();
      c.arc(tx, ty, 18, 0, Math.PI * 2);
      c.fill();
    }
    // Roads.
    c.fillStyle = night ? '#23272e' : PALETTE.road;
    for (const x of city.xs) c.fillRect(x - ROAD.width / 2, cam.y - 20, ROAD.width, VIEW_H + 40);
    for (const y of city.ys) c.fillRect(cam.x - 20, y - ROAD.width / 2, VIEW_W + 40, ROAD.width);
    // Lane dashes.
    c.fillStyle = night ? '#8a7a2a' : PALETTE.lane;
    for (const x of city.xs) {
      for (let y = Math.floor(cam.y / 60) * 60; y < cam.y + VIEW_H; y += 60) {
        c.fillRect(x - 2, y, 4, 28);
      }
    }
    for (const y of city.ys) {
      for (let x = Math.floor(cam.x / 60) * 60; x < cam.x + VIEW_W; x += 60) {
        c.fillRect(x, y - 2, 28, 4);
      }
    }
    // Trees.
    for (const t of city.trees) {
      if (t.x < cam.x - 30 || t.x > cam.x + VIEW_W + 30 || t.y < cam.y - 30 || t.y > cam.y + VIEW_H + 30) continue;
      c.fillStyle = night ? '#1e3a1a' : '#3f7a33';
      c.beginPath();
      c.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#5a3a22';
      c.fillRect(t.x - 2, t.y + t.r - 6, 4, 8);
    }
    // Buildings: side wall offset, roof, lit windows at night, taller ones cast a shade.
    for (const b of city.buildings) {
      if (b.x > cam.x + VIEW_W + 40 || b.x + b.w < cam.x - 40 || b.y > cam.y + VIEW_H + 40 || b.y + b.h < cam.y - 40) continue;
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      c.fillStyle = night ? '#3a3f47' : b.roof;
      c.fillRect(b.x, b.y, b.w, b.h);
      c.strokeStyle = 'rgba(0,0,0,0.35)';
      c.lineWidth = 2;
      c.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
      // Roof detail: a smaller inner rectangle and an AC box.
      c.fillStyle = 'rgba(255,255,255,0.14)';
      c.fillRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16);
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fillRect(b.x + b.w / 2 - 8, b.y + b.h / 2 - 6, 16, 12);
      if (night) {
        c.fillStyle = '#ffd76a';
        const cols = Math.max(1, Math.floor(b.w / 34));
        const rows = Math.max(1, Math.floor(b.h / 30));
        for (let i = 0; i < cols; i++) {
          for (let j = 0; j < rows; j++) {
            if (((i * 7 + j * 13 + Math.floor(b.lit * 97)) % 5) < 2) {
              c.fillRect(b.x + 8 + i * 34, b.y + 8 + j * 30, 12, 9);
            }
          }
        }
      }
      if (b.tall) {
        c.fillStyle = 'rgba(255,255,255,0.10)';
        c.fillRect(b.x + 4, b.y + 4, b.w - 8, 10);
      }
    }
    // Street lamps.
    for (const l of city.lamps) {
      if (l.x < cam.x - 20 || l.x > cam.x + VIEW_W + 20 || l.y < cam.y - 20 || l.y > cam.y + VIEW_H + 20) continue;
      c.fillStyle = '#3a3f47';
      c.fillRect(l.x - 2, l.y - 2, 4, 4);
      if (night) {
        c.fillStyle = 'rgba(255, 214, 106, 0.25)';
        c.beginPath();
        c.arc(l.x, l.y, 22, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#ffd76a';
        c.beginPath();
        c.arc(l.x, l.y, 4, 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  function drawCar(c, car, night) {
    c.save();
    c.translate(car.x, car.y);
    c.rotate(car.angle);
    // Shadow.
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(-CAR.length / 2 + 3, -CAR.width / 2 + 4, CAR.length, CAR.width);
    // Body.
    c.fillStyle = car.color;
    c.beginPath();
    c.roundRect(-CAR.length / 2, -CAR.width / 2, CAR.length, CAR.width, 8);
    c.fill();
    // Cabin and windshield.
    c.fillStyle = 'rgba(20,30,44,0.85)';
    c.beginPath();
    c.roundRect(-8, -CAR.width / 2 + 5, 20, CAR.width - 10, 5);
    c.fill();
    c.fillStyle = 'rgba(180,220,255,0.7)';
    c.fillRect(CAR.length / 2 - 12, -CAR.width / 2 + 6, 5, CAR.width - 12);
    // Headlights at night.
    if (night) {
      c.fillStyle = 'rgba(255, 240, 180, 0.35)';
      c.beginPath();
      c.moveTo(CAR.length / 2, -10);
      c.lineTo(CAR.length / 2 + 90, -34);
      c.lineTo(CAR.length / 2 + 90, 34);
      c.lineTo(CAR.length / 2, 10);
      c.closePath();
      c.fill();
    }
    // Police livery: white doors, light bar, POLICE on the roof line.
    if (car.carKind === 'police') {
      c.fillStyle = '#e8e8e8';
      c.fillRect(-6, -CAR.width / 2 + 2, 22, CAR.width - 4);
      c.fillStyle = '#d8362a';
      c.fillRect(-2, -CAR.width / 2 - 2, 8, 6);
      c.fillStyle = '#2f6fd8';
      c.fillRect(-2, CAR.width / 2 - 4, 8, 6);
      c.fillStyle = '#111';
      c.font = 'bold 9px ' + FONT;
      c.textAlign = 'center';
      c.fillText('PD', 8, 3);
    }
    if (car.carKind === 'taxi') {
      c.fillStyle = '#111';
      c.font = 'bold 9px ' + FONT;
      c.textAlign = 'center';
      c.fillText('TAXI', 0, 3);
      c.fillStyle = '#f2c230';
      c.fillRect(-CAR.length / 2 + 4, -CAR.width / 2 - 4, 14, 5);
    }
    c.restore();
  }

  function drawPed(c, ped, night) {
    if (ped.dead) return;
    const bob = Math.sin(ped.walkPhase) * 2;
    c.save();
    c.translate(ped.x, ped.y + bob * 0.3);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath();
    c.ellipse(0, 8, 10, 4, 0, 0, Math.PI * 2);
    c.fill();
    // Legs, body, head — a top-down walker.
    c.fillStyle = '#2c2f36';
    c.fillRect(-5, 2, 4, 8);
    c.fillRect(2, 2, 4, 8);
    c.fillStyle = ped.mission ? '#f2d234' : ped.shirt;
    c.beginPath();
    c.arc(0, 0, 10, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#e8b98a';
    c.beginPath();
    c.arc(Math.cos(ped.angle) * 3, Math.sin(ped.angle) * 3 - 2, 6, 0, Math.PI * 2);
    c.fill();
    if (ped.mission) {
      c.fillStyle = '#f2d234';
      c.font = 'bold 13px ' + FONT;
      c.textAlign = 'center';
      c.fillText('!', 0, -16);
    }
    c.restore();
  }

  function drawPlayer(c, state) {
    const p = state.player;
    if (p.dead || p.inCar) return;
    const blink = p.hurtTimer > 0 && Math.floor(p.hurtTimer * 12) % 2 === 0;
    if (blink) return;
    c.save();
    c.translate(p.x, p.y);
    // Facing wedge + body.
    c.rotate(p.aimAngle);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath();
    c.ellipse(2, 9, 11, 4, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = PALETTE.playerJacket;
    c.beginPath();
    c.arc(0, 0, 12, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#e8b98a';
    c.beginPath();
    c.arc(4, 0, 6.5, 0, Math.PI * 2);
    c.fill();
    // The pistol, when Danny is aiming.
    c.fillStyle = '#222';
    c.fillRect(8, -2, 12, 4);
    c.restore();
    // Name tag.
    c.fillStyle = '#fff';
    c.font = 'bold 11px ' + FONT;
    c.textAlign = 'center';
    c.fillText('DANNY', p.x, p.y - 20);
  }

  function drawPickups(c, state) {
    for (const pk of state.pickups) {
      c.save();
      c.translate(pk.x, pk.y);
      if (pk.kind === 'cash') {
        c.fillStyle = '#2f9e4f';
        c.beginPath();
        c.roundRect(-11, -7, 22, 14, 3);
        c.fill();
        c.fillStyle = '#fff';
        c.font = 'bold 10px ' + FONT;
        c.textAlign = 'center';
        c.fillText('$', 0, 4);
      } else if (pk.kind === 'ammo') {
        c.fillStyle = '#c9a35c';
        c.fillRect(-8, -8, 16, 16);
        c.fillStyle = '#222';
        c.font = 'bold 10px ' + FONT;
        c.textAlign = 'center';
        c.fillText('AMMO', 0, 4);
      } else if (pk.kind === 'health') {
        c.fillStyle = '#e8e8e8';
        c.fillRect(-9, -9, 18, 18);
        c.fillStyle = '#d8362a';
        c.fillRect(-2, -7, 4, 14);
        c.fillRect(-7, -2, 14, 4);
      }
      c.restore();
    }
  }

  function drawMarkers(c, state) {
    const target = objectiveTarget(state);
    if (target) {
      const pulse = 1 + Math.sin(state.time * 4) * 0.12;
      c.save();
      c.translate(target.x, target.y);
      c.strokeStyle = '#f2d234';
      c.lineWidth = 4;
      c.beginPath();
      c.arc(0, 0, 26 * pulse, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = '#f2d234';
      c.beginPath();
      c.moveTo(0, -44);
      c.lineTo(10, -26);
      c.lineTo(-10, -26);
      c.closePath();
      c.fill();
      c.fillStyle = '#111';
      c.font = 'bold 11px ' + FONT;
      c.textAlign = 'center';
      c.fillText(target.name, 0, -52);
      c.restore();
      // A guiding line from the player to the objective, faint.
      const p = state.player;
      const px = p.inCar ? p.inCar.x : p.x;
      const py = p.inCar ? p.inCar.y : p.y;
      c.strokeStyle = 'rgba(242, 210, 52, 0.25)';
      c.lineWidth = 3;
      c.setLineDash([12, 14]);
      c.beginPath();
      c.moveTo(px, py);
      c.lineTo(target.x, target.y);
      c.stroke();
      c.setLineDash([]);
    }
    // Wanted flash: red ring around the player while the heat is on.
    if (state.wanted > 0 && state.player && !state.player.dead) {
      const p = state.player;
      const px = p.inCar ? p.inCar.x : p.x;
      const py = p.inCar ? p.inCar.y : p.y;
      c.strokeStyle = `rgba(216, 54, 42, ${0.35 + 0.2 * Math.sin(state.time * 6)})`;
      c.lineWidth = 3;
      c.beginPath();
      c.arc(px, py, 46, 0, Math.PI * 2);
      c.stroke();
    }
  }

  function drawTracers(c, state) {
    for (const t of state.tracers) {
      c.strokeStyle = `rgba(255, 220, 120, ${Math.max(0, t.life / 0.12)})`;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(t.x1, t.y1);
      c.lineTo(t.x2, t.y2);
      c.stroke();
    }
  }

  function drawMinimap(state) {
    const m = minimap;
    const w = hud.minimap.width;
    const h = hud.minimap.height;
    const sx = w / WORLD.width;
    const sy = h / WORLD.height;
    m.clearRect(0, 0, w, h);
    m.fillStyle = state.night ? '#1d2f1a' : '#4c8a3f';
    m.fillRect(0, 0, w, h);
    m.fillStyle = state.night ? '#0f2f4a' : '#2f7fb8';
    m.fillRect(0, 0, 8, h);
    m.fillStyle = '#3a3f47';
    for (const x of state.city.xs) m.fillRect(x * sx - 2, 0, 4, h);
    for (const y of state.city.ys) m.fillRect(0, y * sy - 2, w, 4);
    const target = objectiveTarget(state);
    if (target) {
      m.fillStyle = '#f2d234';
      m.beginPath();
      m.arc(target.x * sx, target.y * sy, 5, 0, Math.PI * 2);
      m.fill();
    }
    for (const cop of state.police) {
      m.fillStyle = '#5f8ff0';
      m.beginPath();
      m.arc(cop.x * sx, cop.y * sy, 3.5, 0, Math.PI * 2);
      m.fill();
    }
    const p = state.player;
    const px = p.inCar ? p.inCar.x : p.x;
    const py = p.inCar ? p.inCar.y : p.y;
    m.fillStyle = '#fff';
    m.beginPath();
    m.arc(px * sx, py * sy, 4, 0, Math.PI * 2);
    m.fill();
    m.strokeStyle = '#111';
    m.lineWidth = 1.5;
    m.stroke();
    // Viewport rectangle.
    const cam = camera(state);
    m.strokeStyle = 'rgba(255,255,255,0.7)';
    m.strokeRect(cam.x * sx, cam.y * sy, VIEW_W * sx, VIEW_H * sy);
  }

  function updateHud(state, screen) {
    const p = state.player;
    const stars = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted);
    const speed = p.inCar ? Math.round(Math.abs(p.inCar.speed) * 0.18) : 0;
    const carName = p.inCar ? p.inCar.name : 'On foot';
    const text = [
      screen, Math.round(p.health), Math.round(state.money), state.wanted,
      state.missionIndex, state.missionStep, speed, p.mag, p.ammo, carName,
      currentObjectiveText(state),
    ].join('|');
    if (text === lastHud) return;
    lastHud = text;
    hud.healthFill.style.width = `${clamp(p.health, 0, 100)}%`;
    hud.healthText.textContent = `${Math.round(p.health)}`;
    hud.money.textContent = `$${Math.round(state.money).toLocaleString('en-US')}`;
    hud.stars.textContent = stars;
    hud.stars.classList.toggle('hot', state.wanted > 0);
    hud.objective.textContent = currentObjectiveText(state);
    hud.speed.textContent = p.inCar ? `${speed} km/h` : '—';
    hud.vehicle.textContent = carName;
    hud.ammo.textContent = `🔫 ${p.mag}/${p.ammo}`;
    hud.missionCount.textContent = `Mission ${Math.min(state.missionIndex + 1, MISSIONS.length)}/${MISSIONS.length}`;
    hud.announce.textContent = state.announceText || '';
  }

  function drawPanel(title, lines, prompt) {
    ctx.save();
    ctx.fillStyle = 'rgba(8, 12, 22, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const w = 640;
    const h = 150 + lines.length * 30;
    const x = (VIEW_W - w) / 2;
    const y = (VIEW_H - h) / 2;
    ctx.fillStyle = '#101826';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = '#f2b234';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#f2b234';
    ctx.font = 'bold 34px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(title, VIEW_W / 2, y + 56);
    ctx.fillStyle = '#eef1f5';
    ctx.font = '17px ' + FONT;
    lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, y + 100 + i * 30));
    ctx.fillStyle = '#f2d234';
    ctx.font = 'bold 16px ' + FONT;
    ctx.fillText(prompt, VIEW_W / 2, y + h - 24);
    ctx.restore();
  }

  function drawTitle(state) {
    drawPanel('SOLMARIS', [
      'A sun-soaked open-world crime story.',
      'Danny Vega is back behind the wheel —',
      'steal cars, outrun the Solmaris PD, and pull off the job of a lifetime.',
      '',
      'WASD move / drive  •  E enter a car  •  Mouse aim, click to shoot',
      'F punch  •  R reload  •  Shift run  •  P pause',
    ], 'Press SPACE or click to start');
    ctx.fillStyle = '#8b93a3';
    ctx.font = '13px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('An original game. Not affiliated with Rockstar Games.', VIEW_W / 2, 566);
  }

  return {
    resize,
    draw(state, screen) {
      const cam = camera(state);
      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
      ctx.save();
      ctx.translate(-cam.x, -cam.y);
      drawCity(ctx, state, cam);
      drawMarkers(ctx, state);
      drawPickups(ctx, state);
      for (const car of state.trafficCars) drawCar(ctx, car, state.night);
      for (const cop of state.police) drawCar(ctx, cop, state.night);
      for (const ped of state.peds) drawPed(ctx, ped, state.night);
      drawPlayer(ctx, state);
      drawTracers(ctx, state);
      ctx.restore();
      // Day/night tint over the whole frame.
      ctx.fillStyle = state.night ? 'rgba(8, 12, 40, 0.30)' : 'rgba(255, 190, 110, 0.06)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      // Catch timer warning while the cops close in.
      if (state.catchTimer > 0.4 && screen === SCREEN_PLAY) {
        ctx.fillStyle = '#d8362a';
        ctx.font = 'bold 26px ' + FONT;
        ctx.textAlign = 'center';
        ctx.fillText('THEY\'RE GRABBING YOU — RUN!', VIEW_W / 2, 120);
      }
      if (screen === SCREEN_TITLE) drawTitle(state);
      else if (screen === SCREEN_PAUSED) {
        drawPanel('PAUSED', ['Take a breath, Danny. Solmaris waits.', `Progress is saved automatically.`], 'Press P or SPACE to continue');
      } else if (screen === SCREEN_BUSTED) {
        drawPanel('BUSTED', [`The Solmaris PD caught you.`, `You lost $${state.bustedFine} in fines.`, `Missions: ${state.completedMissions.length}/${MISSIONS.length} complete.`], 'Press SPACE to get back out there');
      } else if (screen === SCREEN_OVER) {
        drawPanel('WASTED', ['Danny went down. The city keeps moving without him.', `Money kept: $${Math.round(state.money)}`, `Missions: ${state.completedMissions.length}/${MISSIONS.length} complete.`], 'Press SPACE to try again');
      } else if (screen === SCREEN_WIN) {
        drawPanel('THE SOLMARIS JOB — DONE', ['The pier, the cash, the sunset. Danny Vega is free.', `Final take: $${Math.round(state.money).toLocaleString('en-US')}`, 'All 5 missions complete.'], 'Press SPACE to keep roaming Solmaris');
      }
      updateHud(state, screen);
      drawMinimap(state);
    },
  };
}
