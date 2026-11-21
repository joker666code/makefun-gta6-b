// Drawing only: the camera, the city, the actors, the HUD and the minimap.
// The world state and the current screen go in; pixels come out. No rules here.

import { CAR, FONT, FONT_BODY, FONT_DISPLAY, NITRO, PALETTE, ROAD, SUN_SHADOW, WORLD, clamp, clockLabel } from './config.js';
import { PLACES } from './city.js';
import { MISSIONS, currentObjectiveText, objectiveTarget, sideJobTarget } from './missions.js';

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
    const tod = state.timeOfDay || 'day';
    // Ground: grass with texture, then the beach and ocean on the west edge.
    c.fillStyle = night ? '#2c4a26' : PALETTE.grass;
    c.fillRect(cam.x - 20, cam.y - 20, VIEW_W + 40, VIEW_H + 40);
    // v2 visual: grass tufts so the ground is not one flat colour.
    for (const t of city.tufts) {
      if (t.x < cam.x - 20 || t.x > cam.x + VIEW_W + 20 || t.y < cam.y - 20 || t.y > cam.y + VIEW_H + 20) continue;
      c.fillStyle = t.dark ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)';
      c.beginPath();
      c.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      c.fill();
    }
    // v2 visual: the beach fades from dry sand to wet sand at the waterline.
    const sandGrad = c.createLinearGradient(70, 0, 130, 0);
    sandGrad.addColorStop(0, night ? '#4a3a20' : '#dcc288');
    sandGrad.addColorStop(1, night ? '#5a4a28' : PALETTE.sand);
    c.fillStyle = sandGrad;
    c.fillRect(0, cam.y - 20, 120, VIEW_H + 40);
    // v2 visual: the ocean is a gradient, with shimmer lines that drift with time.
    const oceanGrad = c.createLinearGradient(0, 0, 70, 0);
    oceanGrad.addColorStop(0, night ? '#0a2438' : PALETTE.oceanDeep);
    oceanGrad.addColorStop(1, night ? '#0f2f4a' : PALETTE.ocean);
    c.fillStyle = oceanGrad;
    c.fillRect(0, cam.y - 20, 70, VIEW_H + 40);
    c.fillStyle = night ? 'rgba(140, 190, 230, 0.20)' : 'rgba(255,255,255,0.35)';
    for (let y = Math.floor(cam.y / 90) * 90; y < cam.y + VIEW_H; y += 90) {
      const drift = Math.sin(state.time * 1.1 + y * 0.05) * 8;
      c.fillRect(10 + drift, y + 20, 40, 3);
    }
    // Wet sand line where the water meets the beach.
    c.fillStyle = night ? 'rgba(120, 160, 200, 0.25)' : 'rgba(255,255,255,0.45)';
    c.fillRect(66, cam.y - 20, 4, VIEW_H + 40);
    // v5 visual: near-shore boats, so the ocean strip is not just a gradient
    // — a sailboat and a yacht at anchor, each with a pale reflection
    // shimmering under the hull and a sail or cabin on top.
    for (const b of city.sailboats || []) {
      if (b.x < cam.x - 40 || b.x > cam.x + VIEW_W + 40 || b.y < cam.y - 40 || b.y > cam.y + VIEW_H + 40) continue;
      // Reflection: a soft pale smear below the hull, drifting with the swell.
      const sway = Math.sin(state.time * 0.9 + b.y * 0.05) * 3;
      c.fillStyle = night ? 'rgba(140, 190, 230, 0.14)' : 'rgba(255,255,255,0.28)';
      c.beginPath();
      c.ellipse(b.x + sway, b.y + 26, 12, 16, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = night ? 'rgba(140, 190, 230, 0.10)' : 'rgba(255,255,255,0.20)';
      c.fillRect(b.x - 9 + sway, b.y + 30, 18, 2);
      // Hull: a rounded vertical hull with a pale deck stripe.
      c.fillStyle = b.hull;
      c.beginPath();
      c.roundRect(b.x - 8, b.y - 20, 16, 40, 8);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.75)';
      c.fillRect(b.x - 8, b.y - 4, 16, 3);
      if (b.kind === 'sail' && b.sail) {
        // Mast and a triangular sail catching the sunset light.
        c.fillStyle = '#5a3a22';
        c.fillRect(b.x - 1, b.y - 44, 2, 26);
        c.fillStyle = b.sail;
        c.beginPath();
        c.moveTo(b.x + 1, b.y - 44);
        c.lineTo(b.x + 1, b.y - 16);
        c.lineTo(b.x + 16, b.y - 16);
        c.closePath();
        c.fill();
        c.fillStyle = 'rgba(255,255,255,0.5)';
        c.beginPath();
        c.moveTo(b.x - 1, b.y - 40);
        c.lineTo(b.x - 1, b.y - 18);
        c.lineTo(b.x - 11, b.y - 18);
        c.closePath();
        c.fill();
      } else {
        // Yacht: a white cabin with dark windows on the hull.
        c.fillStyle = '#f2f2f2';
        c.beginPath();
        c.roundRect(b.x - 6, b.y - 16, 12, 20, 4);
        c.fill();
        c.fillStyle = '#1c2f4a';
        c.fillRect(b.x - 4, b.y - 12, 8, 4);
      }
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
    // v2: landmarks — the airfield runway, the downtown fountain plaza, the
    // wooden pier over the ocean, marina docks and beach umbrellas.
    const { runway, plaza, pier, docks, umbrellas } = city;
    c.fillStyle = PALETTE.runway;
    c.fillRect(runway.x, runway.y, runway.w, runway.h);
    c.fillStyle = '#e8e8e8';
    for (let x = runway.x + 20; x < runway.x + runway.w - 20; x += 60) {
      c.fillRect(x, runway.y + runway.h / 2 - 2, 30, 4);
    }
    c.fillStyle = PALETTE.plaza;
    c.fillRect(plaza.x, plaza.y, plaza.w, plaza.h);
    c.fillStyle = '#37a6d6';
    c.beginPath();
    c.arc(plaza.x + plaza.w / 2, plaza.y + plaza.h / 2, 26, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#b8e6f5';
    c.beginPath();
    c.arc(plaza.x + plaza.w / 2, plaza.y + plaza.h / 2, 12, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = PALETTE.pierWood;
    c.fillRect(pier.x, pier.y, pier.w, pier.h);
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 2;
    for (let x = pier.x + 14; x < pier.x + pier.w; x += 16) {
      c.beginPath();
      c.moveTo(x, pier.y);
      c.lineTo(x, pier.y + pier.h);
      c.stroke();
    }
    for (const d of docks) {
      c.fillStyle = PALETTE.pierWood;
      c.fillRect(d.x, d.y, d.w, d.h);
      if (d.boat) {
        c.fillStyle = '#e8e8e8';
        c.beginPath();
        c.roundRect(d.x + 4, d.y - 12, 44, 12, 5);
        c.fill();
      }
    }
    for (const u of umbrellas) {
      c.fillStyle = u.color;
      c.beginPath();
      c.arc(u.x, u.y, 14, Math.PI, 0);
      c.fill();
      c.fillStyle = '#5a3a22';
      c.fillRect(u.x - 1, u.y, 2, 10);
    }
    // Roads.
    c.fillStyle = night ? '#23272e' : PALETTE.road;
    for (const x of city.xs) c.fillRect(x - ROAD.width / 2, cam.y - 20, ROAD.width, VIEW_H + 40);
    for (const y of city.ys) c.fillRect(cam.x - 20, y - ROAD.width / 2, VIEW_W + 40, ROAD.width);
    // v2 visual: pale kerbs edge every road, so streets read as streets.
    c.fillStyle = night ? '#3a3f47' : PALETTE.sidewalk;
    for (const x of city.xs) {
      c.fillRect(x - ROAD.width / 2 - 5, cam.y - 20, 5, VIEW_H + 40);
      c.fillRect(x + ROAD.width / 2, cam.y - 20, 5, VIEW_H + 40);
    }
    for (const y of city.ys) {
      c.fillRect(cam.x - 20, y - ROAD.width / 2 - 5, VIEW_W + 40, 5);
      c.fillRect(cam.x - 20, y + ROAD.width / 2, VIEW_W + 40, 5);
    }
    // v2 visual: zebra crossings and stop lines at every intersection.
    c.fillStyle = night ? 'rgba(220, 220, 220, 0.5)' : 'rgba(240, 240, 240, 0.85)';
    for (const x of city.xs) {
      for (const y of city.ys) {
        if (x < cam.x - 80 || x > cam.x + VIEW_W + 80 || y < cam.y - 80 || y > cam.y + VIEW_H + 80) continue;
        for (let i = -2; i <= 2; i++) {
          c.fillRect(x + i * 18 - 5, y - ROAD.width / 2 + 6, 10, 26);
          c.fillRect(x + i * 18 - 5, y + ROAD.width / 2 - 32, 10, 26);
          c.fillRect(x - ROAD.width / 2 + 6, y + i * 18 - 5, 26, 10);
          c.fillRect(x + ROAD.width / 2 - 32, y + i * 18 - 5, 26, 10);
        }
        c.fillRect(x - ROAD.width / 2 + 8, y - 58, 26, 5);
        c.fillRect(x + ROAD.width / 2 - 34, y + 53, 26, 5);
      }
    }
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
    // Trees: a soft ground shadow, a shaded canopy, and a sunlit top-left
    // arc, so they read as round bushes instead of flat green discs.
    for (const t of city.trees) {
      if (t.x < cam.x - 30 || t.x > cam.x + VIEW_W + 30 || t.y < cam.y - 30 || t.y > cam.y + VIEW_H + 30) continue;
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.beginPath();
      c.ellipse(t.x + 3, t.y + t.r * 0.55, t.r * 0.9, t.r * 0.45, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = night ? '#1e3a1a' : '#3f7a33';
      c.beginPath();
      c.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = night ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.22)';
      c.beginPath();
      c.arc(t.x - t.r * 0.28, t.y - t.r * 0.28, t.r * 0.55, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#5a3a22';
      c.fillRect(t.x - 2, t.y + t.r - 6, 4, 8);
    }
    // Buildings: a shadow cast with the sun, a textured roof, an edge lit by
    // the sky, windows warm at night, and a neon sign on some of them.
    const sun = SUN_SHADOW[tod] || SUN_SHADOW.day;
    for (const b of city.buildings) {
      if (b.x > cam.x + VIEW_W + 60 || b.x + b.w < cam.x - 60 || b.y > cam.y + VIEW_H + 60 || b.y + b.h < cam.y - 60) continue;
      c.fillStyle = `rgba(0,0,0,${sun.a})`;
      c.fillRect(b.x + sun.x, b.y + sun.y, b.w, b.h);
      // v3 visual: a real wall face — the roof sits on a south wall and an
      // east wall, so a block reads as a solid building with height instead
      // of a flat card. Tall towers get a taller wall and lit windows on it.
      const wallH = b.tall ? 12 : 7;
      c.fillStyle = night ? 'rgba(8, 10, 16, 0.85)' : 'rgba(0,0,0,0.30)';
      c.fillRect(b.x, b.y + b.h, b.w, wallH);
      c.fillStyle = night ? 'rgba(8, 10, 16, 0.65)' : 'rgba(0,0,0,0.22)';
      c.fillRect(b.x + b.w, b.y + 3, 6, b.h);
      if (b.tall) {
        const winN = Math.max(2, Math.floor(b.w / 44));
        for (let i = 0; i < winN; i++) {
          const litWin = ((i * 5 + Math.floor(b.lit * 97)) % 4) < 2;
          c.fillStyle = night
            ? (litWin ? 'rgba(255, 190, 90, 0.85)' : 'rgba(0,0,0,0.5)')
            : 'rgba(255,255,255,0.18)';
          c.fillRect(b.x + 10 + i * 44, b.y + b.h + 3, 9, 6);
        }
      }
      c.fillStyle = night ? '#3a3f47' : b.roof;
      c.fillRect(b.x, b.y, b.w, b.h);
      c.strokeStyle = 'rgba(0,0,0,0.35)';
      c.lineWidth = 2;
      c.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
      // Sunlit top and left edges: the roof reads as a solid, not a flat card.
      c.strokeStyle = PALETTE.roofEdge;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(b.x + 2, b.y + b.h - 2);
      c.lineTo(b.x + 2, b.y + 2);
      c.lineTo(b.x + b.w - 2, b.y + 2);
      c.stroke();
      // Roof texture: an inner panel, seams, and AC boxes placed by the seed.
      c.fillStyle = 'rgba(255,255,255,0.10)';
      c.fillRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16);
      c.strokeStyle = 'rgba(0,0,0,0.18)';
      c.lineWidth = 1;
      const seams = 1 + Math.floor(b.detail * 3);
      for (let s = 1; s <= seams; s++) {
        const sx = b.x + (b.w / (seams + 1)) * s;
        c.beginPath();
        c.moveTo(sx, b.y + 8);
        c.lineTo(sx, b.y + b.h - 8);
        c.stroke();
      }
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fillRect(b.x + b.w / 2 - 8, b.y + b.h / 2 - 6, 16, 12);
      if (b.detail > 0.5) {
        c.fillStyle = 'rgba(0,0,0,0.25)';
        c.fillRect(b.x + 12, b.y + 12, 12, 10);
        c.fillRect(b.x + b.w - 24, b.y + b.h - 22, 12, 10);
      }
      // Windows: warm and lit at night, dark glass by day.
      const cols = Math.max(1, Math.floor(b.w / 34));
      const rows = Math.max(1, Math.floor(b.h / 30));
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const litWin = ((i * 7 + j * 13 + Math.floor(b.lit * 97)) % 5) < 2;
          c.fillStyle = night
            ? (litWin ? PALETTE.windowLit : 'rgba(0,0,0,0.4)')
            : (litWin ? 'rgba(255,255,255,0.25)' : PALETTE.windowDark);
          c.fillRect(b.x + 8 + i * 34, b.y + 8 + j * 30, 12, 9);
        }
      }
      if (b.tall) {
        c.fillStyle = 'rgba(255,255,255,0.10)';
        c.fillRect(b.x + 4, b.y + 4, b.w - 8, 10);
      }
      // Neon sign on the street-facing edge, glowing at dusk and night.
      // v3: it hangs below the wall face on a dark plate, so the letters
      // stay readable against road and grass, and one sign in ten flickers
      // after dark like a tired neon tube.
      if (b.sign) {
        const flicker = night && b.detail > 0.9
          ? 0.55 + 0.45 * Math.abs(Math.sin(state.time * 11 + b.x * 0.13))
          : 1;
        const glow = (tod === 'night' || tod === 'sunset') ? 1 : 0.55;
        // v5: the type shrinks with the building — the plate is capped at
        // the building width minus 18 px, so a long word on a narrow block
        // (24H MART on a 90 px frontage) drops a size instead of spilling
        // past the plate. city.js uses this same formula for its overlap
        // guard, so the two can never disagree.
        const size = Math.max(9, Math.min(15, (b.w - 18) / (b.sign.text.length * 0.68)));
        const tw = b.sign.text.length * size * 0.68;
        const cy = b.y + b.h + wallH + 13;
        // v4: a sign cut by the viewport edge reads as a broken word ("AR",
        // "RF" on the frame edge) — skip it whole when its plate would not
        // fit on screen, instead of drawing half a word.
        const plateL = b.x + b.w / 2 - tw / 2 - 7;
        const plateR = b.x + b.w / 2 + tw / 2 + 7;
        const offEdge = plateL < cam.x + 2 || plateR > cam.x + VIEW_W - 2
          || cy - size - 3 < cam.y + 2 || cy + 5 > cam.y + VIEW_H - 2;
        if (!offEdge) {
        c.save();
        c.globalAlpha = glow * flicker;
        c.fillStyle = 'rgba(6, 10, 18, 0.55)';
        c.beginPath();
        c.roundRect(b.x + b.w / 2 - tw / 2 - 7, cy - size - 3, tw + 14, size + 8, 5);
        c.fill();
        c.fillStyle = b.sign.color;
        c.shadowColor = b.sign.color;
        c.shadowBlur = 14;
        c.font = `bold ${size}px ` + FONT_DISPLAY;
        c.textAlign = 'center';
        c.fillText(b.sign.text, b.x + b.w / 2, cy);
        c.restore();
        }
      }
    }
    // Street lamps: a soft radial halo after dark, brighter at night.
    for (const l of city.lamps) {
      if (l.x < cam.x - 20 || l.x > cam.x + VIEW_W + 20 || l.y < cam.y - 20 || l.y > cam.y + VIEW_H + 20) continue;
      c.fillStyle = '#3a3f47';
      c.fillRect(l.x - 2, l.y - 2, 4, 4);
      if (night || tod === 'sunset') {
        const halo = c.createRadialGradient(l.x, l.y, 2, l.x, l.y, 30);
        halo.addColorStop(0, night ? 'rgba(255, 214, 106, 0.5)' : 'rgba(255, 190, 110, 0.3)');
        halo.addColorStop(1, 'rgba(255, 214, 106, 0)');
        c.fillStyle = halo;
        c.beginPath();
        c.arc(l.x, l.y, 30, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#ffd76a';
        c.beginPath();
        c.arc(l.x, l.y, 4, 0, Math.PI * 2);
        c.fill();
      }
    }
    // v4 visual: rain-slick asphalt mirrors the street lamps — each lamp
    // stretches into a pale smear along its road, so a rainy night reads as
    // wet instead of just dark. A lamp sits 56 px off its own road, so the
    // nearer road line decides which way the smear runs. v5: a sunset shower
    // gets the same treatment — wet roads at dusk, not only after dark.
    if ((night || tod === 'sunset') && state.rain > 0.03) {
      const wet = Math.min(1, state.rain);
      for (const l of city.lamps) {
        if (l.x < cam.x - 60 || l.x > cam.x + VIEW_W + 60 || l.y < cam.y - 60 || l.y > cam.y + VIEW_H + 60) continue;
        let nearX = Infinity;
        let nearY = Infinity;
        for (const rx of city.xs) nearX = Math.min(nearX, Math.abs(l.x - rx));
        for (const ry of city.ys) nearY = Math.min(nearY, Math.abs(l.y - ry));
        const vertical = nearX <= nearY;
        const smear = vertical
          ? c.createLinearGradient(l.x, l.y - 46, l.x, l.y + 46)
          : c.createLinearGradient(l.x - 46, l.y, l.x + 46, l.y);
        smear.addColorStop(0, 'rgba(255, 214, 106, 0)');
        smear.addColorStop(0.5, `rgba(255, 214, 106, ${0.30 * wet})`);
        smear.addColorStop(1, 'rgba(255, 214, 106, 0)');
        c.fillStyle = smear;
        if (vertical) c.fillRect(l.x - 3.5, l.y - 46, 7, 92);
        else c.fillRect(l.x - 46, l.y - 3.5, 92, 7);
      }
    }
  }

  function drawCar(c, car, night, time, tod, rain) {
    // v2 visual: a patrol car's flashing light bar washes the street red/blue.
    if (car.carKind === 'police') {
      const red = Math.floor((time || 0) * 5) % 2 === 0;
      const glow = c.createRadialGradient(car.x, car.y, 4, car.x, car.y, 70);
      glow.addColorStop(0, red ? 'rgba(216, 54, 42, 0.30)' : 'rgba(47, 111, 216, 0.30)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = glow;
      c.beginPath();
      c.arc(car.x, car.y, 70, 0, Math.PI * 2);
      c.fill();
    }
    c.save();
    c.translate(car.x, car.y);
    // v2 visual: the body turns on its eased angle, not the physics snap.
    c.rotate(car.visualAngle ?? car.angle);
    // v4 visual: on a wet night the headlights wash the asphalt ahead — a
    // pale streak the beam cone alone does not give. v5: same for a wet
    // sunset — the wash follows the rain, not just the dark.
    if ((night || tod === 'sunset') && rain > 0.03) {
      const wet = Math.min(1, rain);
      const wash = c.createLinearGradient(CAR.length / 2, 0, CAR.length / 2 + 95, 0);
      wash.addColorStop(0, `rgba(255, 240, 190, ${0.16 * wet})`);
      wash.addColorStop(1, 'rgba(255, 240, 190, 0)');
      c.fillStyle = wash;
      c.beginPath();
      c.moveTo(CAR.length / 2 - 6, -9);
      c.lineTo(CAR.length / 2 + 95, -20);
      c.lineTo(CAR.length / 2 + 95, 20);
      c.lineTo(CAR.length / 2 - 6, 9);
      c.closePath();
      c.fill();
      c.fillStyle = `rgba(200, 220, 255, ${0.05 * wet})`;
      c.beginPath();
      c.ellipse(0, 0, CAR.length / 2 + 14, CAR.width / 2 + 10, 0, 0, Math.PI * 2);
      c.fill();
    }
    // v2: nitro flame licking out of the exhaust while boosting.
    if (car.nitroActive) {
      const flick = 18 + Math.sin((time || 0) * 40) * 6;
      c.fillStyle = 'rgba(255, 160, 40, 0.9)';
      c.beginPath();
      c.moveTo(-CAR.length / 2, -8);
      c.lineTo(-CAR.length / 2 - flick, 0);
      c.lineTo(-CAR.length / 2, 8);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(120, 200, 255, 0.9)';
      c.beginPath();
      c.moveTo(-CAR.length / 2, -4);
      c.lineTo(-CAR.length / 2 - flick * 0.55, 0);
      c.lineTo(-CAR.length / 2, 4);
      c.closePath();
      c.fill();
    }
    // Soft ground shadow, offset a touch with the light.
    c.fillStyle = 'rgba(0,0,0,0.32)';
    c.beginPath();
    c.ellipse(3, 5, CAR.length / 2 + 2, CAR.width / 2 + 3, 0, 0, Math.PI * 2);
    c.fill();
    // v4 visual: braking spills a red bloom onto the asphalt behind the car,
    // so a stop reads even before the tail lights flare.
    if (car.braking) {
      const bloom = c.createRadialGradient(-CAR.length / 2 - 6, 0, 2, -CAR.length / 2 - 6, 0, 46);
      bloom.addColorStop(0, 'rgba(255, 42, 26, 0.38)');
      bloom.addColorStop(1, 'rgba(255, 42, 26, 0)');
      c.fillStyle = bloom;
      c.beginPath();
      c.ellipse(-CAR.length / 2 - 6, 0, 46, 30, 0, 0, Math.PI * 2);
      c.fill();
    }
    // Tyres: four dark blocks, the front pair steering with the wheels.
    const steer = car.steerVisual || 0;
    for (const [tx, ty, front] of [
      [CAR.length / 2 - 12, -CAR.width / 2 + 1, true],
      [CAR.length / 2 - 12, CAR.width / 2 - 7, true],
      [-CAR.length / 2 + 10, -CAR.width / 2 + 1, false],
      [-CAR.length / 2 + 10, CAR.width / 2 - 7, false],
    ]) {
      c.save();
      c.translate(tx + 5, ty + 3);
      c.rotate(front ? steer * 0.45 : 0);
      c.fillStyle = PALETTE.tyre;
      c.beginPath();
      c.roundRect(-6, -3.5, 12, 7, 2);
      c.fill();
      c.restore();
    }
    // Body: a vertical gradient so the paint has a lit top and a dark skirt.
    const bodyGrad = c.createLinearGradient(0, -CAR.width / 2, 0, CAR.width / 2);
    bodyGrad.addColorStop(0, car.color);
    bodyGrad.addColorStop(0.55, car.color);
    bodyGrad.addColorStop(1, 'rgba(0,0,0,0.35)');
    c.fillStyle = bodyGrad;
    c.beginPath();
    c.roundRect(-CAR.length / 2, -CAR.width / 2, CAR.length, CAR.width, 9);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.roundRect(-CAR.length / 2 + 1, -CAR.width / 2 + 1, CAR.length - 2, CAR.width - 2, 8);
    c.stroke();
    // Roof panel, windshield and rear window — glass with a shine streak.
    c.fillStyle = PALETTE.glass;
    c.beginPath();
    c.roundRect(-10, -CAR.width / 2 + 5, 22, CAR.width - 10, 5);
    c.fill();
    c.fillStyle = PALETTE.glassShine;
    c.fillRect(-6, -CAR.width / 2 + 7, 3, CAR.width - 14);
    // v4 visual: a diagonal sun glint across the roof glass — flat glass
    // reads dead without one.
    c.fillStyle = 'rgba(255,255,255,0.30)';
    c.beginPath();
    c.moveTo(-4, -CAR.width / 2 + 6);
    c.lineTo(2, -CAR.width / 2 + 6);
    c.lineTo(10, CAR.width / 2 - 6);
    c.lineTo(4, CAR.width / 2 - 6);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.18)';
    c.beginPath();
    c.moveTo(2, -CAR.width / 2 + 6);
    c.lineTo(5, -CAR.width / 2 + 6);
    c.lineTo(12, CAR.width / 2 - 6);
    c.lineTo(9, CAR.width / 2 - 6);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(180,220,255,0.7)';
    c.fillRect(CAR.length / 2 - 13, -CAR.width / 2 + 6, 4, CAR.width - 12);
    c.fillRect(-CAR.length / 2 + 8, -CAR.width / 2 + 6, 4, CAR.width - 12);
    // Hood and trunk seams.
    c.strokeStyle = 'rgba(0,0,0,0.3)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(CAR.length / 2 - 16, -CAR.width / 2 + 4);
    c.lineTo(CAR.length / 2 - 16, CAR.width / 2 - 4);
    c.moveTo(-CAR.length / 2 + 14, -CAR.width / 2 + 4);
    c.lineTo(-CAR.length / 2 + 14, CAR.width / 2 - 4);
    c.stroke();
    // Headlights (always on, brighter at night) and tail lights — the tails
    // flare when the driver brakes.
    const lampA = night ? 1 : 0.75;
    c.fillStyle = `rgba(255, 244, 190, ${lampA})`;
    c.beginPath();
    c.arc(CAR.length / 2 - 2, -CAR.width / 2 + 6, 3, 0, Math.PI * 2);
    c.arc(CAR.length / 2 - 2, CAR.width / 2 - 6, 3, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = car.braking ? '#ff2a1a' : 'rgba(216, 54, 42, 0.85)';
    c.beginPath();
    c.arc(-CAR.length / 2 + 2, -CAR.width / 2 + 6, car.braking ? 4 : 3, 0, Math.PI * 2);
    c.arc(-CAR.length / 2 + 2, CAR.width / 2 - 6, car.braking ? 4 : 3, 0, Math.PI * 2);
    c.fill();
    // Headlight beams: a gradient cone, not a flat triangle — full strength
    // at night, and a shorter, dimmer cone at sunset when the sky is orange.
    const beamA = night ? 0.40 : (tod === 'sunset' ? 0.20 : 0);
    if (beamA > 0) {
      const beam = c.createLinearGradient(CAR.length / 2, 0, CAR.length / 2 + 110, 0);
      beam.addColorStop(0, `rgba(255, 240, 180, ${beamA})`);
      beam.addColorStop(1, 'rgba(255, 240, 180, 0)');
      c.fillStyle = beam;
      c.beginPath();
      c.moveTo(CAR.length / 2, -10);
      c.lineTo(CAR.length / 2 + 110, -38);
      c.lineTo(CAR.length / 2 + 110, 38);
      c.lineTo(CAR.length / 2, 10);
      c.closePath();
      c.fill();
    }
    // Police livery: white doors, a light bar that alternates red and blue,
    // and PD on the roof line.
    if (car.carKind === 'police') {
      c.fillStyle = '#e8e8e8';
      c.fillRect(-6, -CAR.width / 2 + 2, 22, CAR.width - 4);
      const red = Math.floor((time || 0) * 5) % 2 === 0;
      c.fillStyle = red ? '#ff2a1a' : '#7a1a12';
      c.fillRect(-2, -CAR.width / 2 - 2, 8, 6);
      c.fillStyle = red ? '#1a2a7a' : '#2f6fd8';
      c.fillRect(-2, CAR.width / 2 - 4, 8, 6);
      c.fillStyle = '#111';
      c.font = 'bold 9px ' + FONT;
      c.textAlign = 'center';
      c.fillText('PD', 8, 3);
    }
    if (car.carKind === 'taxi') {
      // Checker band down the side and a lit roof sign.
      c.fillStyle = '#111';
      for (let i = 0; i < 6; i++) {
        if (i % 2 === 0) c.fillRect(-14 + i * 5, -CAR.width / 2 + 1, 5, 5);
        else c.fillRect(-14 + i * 5, CAR.width / 2 - 6, 5, 5);
      }
      c.fillStyle = '#f2c230';
      c.fillRect(-12, -CAR.width / 2 - 7, 24, 8);
      c.fillStyle = '#111';
      c.font = 'bold 7px ' + FONT;
      c.textAlign = 'center';
      c.fillText('TAXI', 0, -CAR.width / 2 - 0.5);
    }
    // v2: sports cars get a spoiler and a racing stripe; trucks get a ribbed
    // cargo bed behind the cab.
    if (car.carKind === 'sports') {
      c.fillStyle = 'rgba(255,255,255,0.75)';
      c.fillRect(-CAR.length / 2 + 4, -3, CAR.length - 8, 6);
      c.fillStyle = 'rgba(0,0,0,0.55)';
      c.fillRect(-CAR.length / 2 - 2, -CAR.width / 2 - 2, 5, CAR.width + 4);
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.fillRect(-CAR.length / 2 - 4, -CAR.width / 2 - 1, 3, 5);
      c.fillRect(-CAR.length / 2 - 4, CAR.width / 2 - 4, 3, 5);
    }
    if (car.carKind === 'truck') {
      c.fillStyle = 'rgba(0,0,0,0.28)';
      c.fillRect(-CAR.length / 2 + 2, -CAR.width / 2 + 3, 20, CAR.width - 6);
      c.strokeStyle = 'rgba(255,255,255,0.25)';
      c.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(-CAR.length / 2 + 7 + i * 6, -CAR.width / 2 + 4);
        c.lineTo(-CAR.length / 2 + 7 + i * 6, CAR.width / 2 - 4);
        c.stroke();
      }
    }
    c.restore();
    // v2: a battered car smokes — the worse the health, the thicker the smoke.
    const maxH = car.maxHealth || 100;
    if (car.health < maxH * 0.45) {
      const wob = Math.sin((time || 0) * 9 + car.x) * 4;
      c.fillStyle = 'rgba(90, 90, 90, 0.55)';
      c.beginPath();
      c.arc(car.x + Math.cos(car.angle) * 18 + wob, car.y + Math.sin(car.angle) * 18 - 6, 7, 0, Math.PI * 2);
      c.fill();
    }
  }

  function drawPed(c, ped, night) {
    if (ped.dead) return;
    const bob = Math.sin(ped.walkPhase) * 1.5;
    const swing = Math.sin(ped.walkPhase) * 5;
    const fx = Math.cos(ped.angle);
    const fy = Math.sin(ped.angle);
    const px = -fy;
    const py = fx;
    c.save();
    c.translate(ped.x, ped.y + bob * 0.3);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath();
    c.ellipse(0, 8, 10, 4, 0, 0, Math.PI * 2);
    c.fill();
    // v2 visual: a real walk cycle — the feet alternate along the facing
    // direction and the arms swing against them. v5: the arms wear the
    // jacket when the ped has one, so the jacket reads from every angle.
    const top = ped.mission ? '#f2d234' : (ped.jacket || ped.shirt);
    c.fillStyle = '#2c2f36';
    c.beginPath();
    c.arc(px * -4 + fx * swing, py * -4 + fy * swing + 3, 3.4, 0, Math.PI * 2);
    c.arc(px * 4 - fx * swing, py * 4 - fy * swing + 3, 3.4, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = top;
    c.beginPath();
    c.arc(px * -6 - fx * swing * 0.6, py * -6 - fy * swing * 0.6, 3, 0, Math.PI * 2);
    c.arc(px * 6 + fx * swing * 0.6, py * 6 + fy * swing * 0.6, 3, 0, Math.PI * 2);
    c.fill();
    // Body with a shaded edge, then the head toward the facing direction.
    // v5: a jacket is an outer ring with the shirt showing at the chest,
    // so the two colours stack instead of one hiding the other.
    c.fillStyle = top;
    c.beginPath();
    c.arc(0, 0, 10, 0, Math.PI * 2);
    c.fill();
    if (ped.jacket && !ped.mission) {
      c.fillStyle = ped.shirt;
      c.beginPath();
      c.arc(fx * 2, fy * 2, 6.5, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = 'rgba(0,0,0,0.3)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(0, 0, 10, 0, Math.PI * 2);
    c.stroke();
    // v4 visual: hair on the back of the head, skin toward the facing
    // direction — the rim of hair is what tells one pedestrian from the next.
    c.fillStyle = ped.hair || '#2c2c2c';
    c.beginPath();
    c.arc(fx * 1.5, fy * 1.5 - 2, 6, 0, Math.PI * 2);
    c.fill();
    // v5 visual: a hat, drawn in the ped's own facing frame so the brim
    // points where they walk — a cap dome over the back of the head with
    // the brim sticking out front, or a wide sun-hat brim with a dome.
    // It goes on before the skin, so the face stays visible in front of it.
    if (ped.hat) {
      c.save();
      c.translate(fx * 1.5, fy * 1.5 - 2);
      c.rotate(ped.angle);
      c.fillStyle = ped.hat.color;
      if (ped.hat.type === 'cap') {
        // Full disc, not just the back half — at screenshot scale a half
        // dome hides under the hair, while a full crown reads as a hat
        // with the face in front of it and the brim sticking out forward.
        c.beginPath();
        c.arc(0, 0, 6.5, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.roundRect(3, -4.5, 8, 9, 4);
        c.fill();
      } else {
        c.beginPath();
        c.ellipse(0, 0, 9.5, 8.5, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = 'rgba(0,0,0,0.15)';
        c.beginPath();
        c.arc(0, 0, 5.5, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    }
    c.fillStyle = ped.skin || '#e8b98a';
    c.beginPath();
    c.arc(fx * 3.5, fy * 3.5 - 2, 4.6, 0, Math.PI * 2);
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
    // v2 visual: Danny walks — feet alternate along his facing, arms swing,
    // the jacket has a shaded edge and the pistol tracks his aim.
    const swing = Math.sin(p.walkPhase) * 5;
    const fx = Math.cos(p.angle);
    const fy = Math.sin(p.angle);
    const px = -fy;
    const py = fx;
    c.save();
    c.translate(p.x, p.y);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath();
    c.ellipse(2, 9, 11, 4, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#23262e';
    c.beginPath();
    c.arc(px * -4 + fx * swing, py * -4 + fy * swing + 4, 3.6, 0, Math.PI * 2);
    c.arc(px * 4 - fx * swing, py * 4 - fy * swing + 4, 3.6, 0, Math.PI * 2);
    c.fill();
    c.save();
    c.rotate(p.aimAngle);
    c.fillStyle = PALETTE.playerJacket;
    c.beginPath();
    c.arc(0, 0, 12, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(0, 0, 12, 0, Math.PI * 2);
    c.stroke();
    // v4 visual: Danny's dark hair rims the back of his head, like the peds'.
    c.fillStyle = '#2c2c2c';
    c.beginPath();
    c.arc(2, 0, 6.5, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#e8b98a';
    c.beginPath();
    c.arc(4, 0, 5.2, 0, Math.PI * 2);
    c.fill();
    // The pistol, when Danny is aiming.
    c.fillStyle = '#222';
    c.fillRect(8, -2, 12, 4);
    c.restore();
    c.restore();
    // Name tag, in world space.
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

  // v2: skid marks the handbrake leaves behind — dark tyre streaks that fade.
  function drawSkidMarks(c, state) {
    for (const s of state.skidMarks) {
      c.strokeStyle = `rgba(20, 20, 20, ${0.5 * (s.life / s.maxLife)})`;
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(s.x1, s.y1);
      c.lineTo(s.x2, s.y2);
      c.stroke();
    }
  }

  // v2: particles — crash sparks and exhaust puffs, short-lived by design.
  function drawParticles(c, state) {
    for (const pt of state.particles) {
      const a = clamp(pt.life / pt.maxLife, 0, 1);
      if (pt.kind === 'spark') {
        c.fillStyle = `rgba(255, 190, 60, ${a})`;
        c.beginPath();
        c.arc(pt.x, pt.y, pt.size * (1 + (1 - a)), 0, Math.PI * 2);
        c.fill();
      } else if (pt.kind === 'debris') {
        // v2 visual: hard chunks of wall and bodywork that tumble away.
        c.save();
        c.translate(pt.x, pt.y);
        c.rotate(pt.life * 9);
        c.fillStyle = `rgba(40, 36, 32, ${a})`;
        c.fillRect(-pt.size / 2, -pt.size / 2, pt.size, pt.size * 0.7);
        c.restore();
      } else if (pt.kind === 'exhaust') {
        // v2 visual: exhaust puffs grow and thin as they rise.
        c.fillStyle = `rgba(150, 150, 150, ${a * 0.45})`;
        c.beginPath();
        c.arc(pt.x, pt.y - (1 - a) * 6, pt.size * (1 + (1 - a) * 1.4), 0, Math.PI * 2);
        c.fill();
      } else {
        c.fillStyle = `rgba(120, 120, 120, ${a * 0.6})`;
        c.beginPath();
        c.arc(pt.x, pt.y, pt.size * (1 + (1 - a)), 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  // v2 visual: muzzle flashes and explosion fireballs — a hot core with a
  // fading halo, drawn additive-bright over the world.
  function drawFlashes(c, state) {
    for (const f of state.flashes) {
      const a = clamp(f.life / f.maxLife, 0, 1);
      const r = f.size * (0.5 + a * 0.5);
      const grad = c.createRadialGradient(f.x, f.y, 2, f.x, f.y, r);
      grad.addColorStop(0, `rgba(255, 240, 180, ${0.95 * a})`);
      grad.addColorStop(0.4, `rgba(255, 160, 60, ${0.7 * a})`);
      grad.addColorStop(1, 'rgba(255, 80, 20, 0)');
      c.fillStyle = grad;
      c.beginPath();
      c.arc(f.x, f.y, r, 0, Math.PI * 2);
      c.fill();
      // Star spikes on the small flashes (gunfire).
      if (f.size < 60) {
        c.strokeStyle = `rgba(255, 220, 120, ${a})`;
        c.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const ang = (i * Math.PI) / 2 + 0.4;
          c.beginPath();
          c.moveTo(f.x + Math.cos(ang) * 4, f.y + Math.sin(ang) * 4);
          c.lineTo(f.x + Math.cos(ang) * r, f.y + Math.sin(ang) * r);
          c.stroke();
        }
      }
    }
  }

  // v2 visual: brass shells the pistol kicked out, glinting on the asphalt.
  function drawShells(c, state) {
    for (const sh of state.shells) {
      c.save();
      c.translate(sh.x, sh.y);
      c.rotate(sh.angle);
      c.fillStyle = `rgba(212, 175, 55, ${clamp(sh.life / sh.maxLife, 0, 1)})`;
      c.fillRect(-3, -1.5, 6, 3);
      c.restore();
    }
  }

  function drawMarkers(c, state) {
    // v2: the side job gets its own green marker alongside the story target.
    const side = sideJobTarget(state);
    if (side) {
      const pulse = 1 + Math.sin(state.time * 5) * 0.15;
      c.save();
      c.translate(side.x, side.y);
      c.strokeStyle = '#7ddb8a';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(0, 0, 20 * pulse, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = '#7ddb8a';
      c.font = 'bold 13px ' + FONT;
      c.textAlign = 'center';
      c.fillText('$', 0, 5);
      c.restore();
    }
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
    // v3 visual: the minimap is a real map now — beach, park, plaza, runway
    // and every building block, so it reads like the city at a glance.
    m.fillStyle = state.night ? '#3a2f1a' : '#dcc288';
    m.fillRect(8 * sx, 0, (state.city.beach.w - 8) * sx, h);
    m.fillStyle = state.night ? '#23401c' : '#5da24a';
    m.fillRect(state.city.park.x * sx, state.city.park.y * sy, state.city.park.w * sx, state.city.park.h * sy);
    m.fillStyle = state.night ? '#2a2f38' : '#8a8f96';
    m.fillRect(state.city.runway.x * sx, state.city.runway.y * sy, state.city.runway.w * sx, state.city.runway.h * sy);
    m.fillRect(state.city.plaza.x * sx, state.city.plaza.y * sy, state.city.plaza.w * sx, state.city.plaza.h * sy);
    m.fillStyle = state.night ? '#31363f' : '#6a7078';
    for (const b of state.city.buildings) {
      m.fillRect(b.x * sx, b.y * sy, Math.max(1.5, b.w * sx), Math.max(1.5, b.h * sy));
    }
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
    // v2: the side-job fare shows green on the minimap too.
    const side = sideJobTarget(state);
    if (side) {
      m.fillStyle = '#7ddb8a';
      m.beginPath();
      m.arc(side.x * sx, side.y * sy, 4, 0, Math.PI * 2);
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
    const sideText = state.sideJob
      ? `Side job: ${state.sideJob.pickedUp ? 'deliver the fare' : 'pick up the fare'} — ${Math.ceil(state.sideJob.timeLeft)}s left`
      : '';
    const text = [
      screen, Math.round(p.health), Math.round(state.money), state.wanted,
      state.missionIndex, state.missionStep, speed, p.mag, p.ammo, carName,
      currentObjectiveText(state), state.clock.toFixed(2),
      Math.round(state.nitro), sideText,
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
    // v2 HUD: the clock, the nitro tank and the active side job.
    if (hud.clock) hud.clock.textContent = clockLabel(state.clock);
    if (hud.nitroFill) {
      hud.nitroFill.style.width = `${clamp(state.nitro, 0, NITRO.max)}%`;
      hud.nitroFill.classList.toggle('empty', state.nitro < 15);
    }
    if (hud.sidejob) hud.sidejob.textContent = sideText;
  }

  function drawPanel(title, lines, prompt) {
    ctx.save();
    ctx.fillStyle = 'rgba(8, 12, 22, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const w = 660;
    const h = 160 + lines.length * 30;
    const x = (VIEW_W - w) / 2;
    const y = (VIEW_H - h) / 2;
    // v2 visual: the panel is a deep navy gradient with a double gold frame.
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#182236');
    grad.addColorStop(1, '#0b1120');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 16);
    ctx.fill();
    ctx.strokeStyle = '#f2b234';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(242, 178, 52, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x + 7, y + 7, w - 14, h - 14, 11);
    ctx.stroke();
    // Title in the display face, with a hard shadow and a gold rule under it.
    // Long titles (the win screen) drop a size so they stay inside the frame.
    const titleSize = title.length > 14 ? 30 : 44;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.font = `${titleSize}px ` + FONT_DISPLAY;
    ctx.textAlign = 'center';
    ctx.fillText(title, VIEW_W / 2 + 3, y + 62);
    ctx.fillStyle = '#f2b234';
    ctx.fillText(title, VIEW_W / 2, y + 59);
    ctx.fillStyle = '#f2b234';
    ctx.fillRect(VIEW_W / 2 - 90, y + 76, 180, 2);
    ctx.fillStyle = '#eef1f5';
    ctx.font = '17px ' + FONT_BODY;
    lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, y + 112 + i * 30));
    // The prompt sits in a gold-outlined pill.
    ctx.font = 'bold 16px ' + FONT_BODY;
    const pw = ctx.measureText(prompt).width + 44;
    ctx.fillStyle = 'rgba(242, 178, 52, 0.14)';
    ctx.beginPath();
    ctx.roundRect(VIEW_W / 2 - pw / 2, y + h - 46, pw, 32, 16);
    ctx.fill();
    ctx.strokeStyle = '#f2b234';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#f2d234';
    ctx.fillText(prompt, VIEW_W / 2, y + h - 24);
    ctx.restore();
  }

  function drawTitle(state) {
    // v2 visual: the title is letterspaced like a movie poster.
    drawPanel('S O L M A R I S', [
      'A sun-soaked open-world crime story.',
      'Danny Vega is back behind the wheel —',
      'steal cars, outrun the Solmaris PD, and pull off the job of a lifetime.',
      '',
      'WASD move / drive  •  E enter a car  •  Mouse aim, click to shoot',
      'N nitro  •  Space handbrake  •  H horn  •  T side job  •  F punch  •  R reload',
    ], 'Press SPACE or click to start');
    ctx.fillStyle = '#8b93a3';
    ctx.font = '13px ' + FONT_BODY;
    ctx.textAlign = 'center';
    ctx.fillText('An original game. Not affiliated with Rockstar Games.', VIEW_W / 2, 566);
  }

  return {
    resize,
    draw(state, screen) {
      const cam = camera(state);
      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
      ctx.save();
      // v2 visual: the camera jolts with the shake left by crashes and blasts.
      const sh = state.shake || 0;
      const jx = sh > 0 ? (Math.random() - 0.5) * sh : 0;
      const jy = sh > 0 ? (Math.random() - 0.5) * sh : 0;
      ctx.translate(-cam.x + jx, -cam.y + jy);
      drawCity(ctx, state, cam);
      drawSkidMarks(ctx, state);
      drawMarkers(ctx, state);
      drawPickups(ctx, state);
      for (const car of state.trafficCars) drawCar(ctx, car, state.night, state.time, state.timeOfDay, state.rain);
      for (const cop of state.police) drawCar(ctx, cop, state.night, state.time, state.timeOfDay, state.rain);
      for (const ped of state.peds) drawPed(ctx, ped, state.night);
      drawPlayer(ctx, state);
      drawTracers(ctx, state);
      drawParticles(ctx, state);
      drawShells(ctx, state);
      drawFlashes(ctx, state);
      ctx.restore();
      // Day/night tint over the whole frame — v2 adds sunset and dawn tints,
      // so the same street reads differently as the clock turns.
      ctx.fillStyle = state.night ? 'rgba(8, 12, 40, 0.30)'
        : state.timeOfDay === 'sunset' ? PALETTE.sunsetTint
        : state.timeOfDay === 'dawn' ? 'rgba(255, 170, 120, 0.08)'
        : 'rgba(255, 190, 110, 0.06)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      // v2 visual: night closes in at the frame edges; day carries a soft
      // sun glare in the corner.
      if (state.night) {
        const vig = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.85);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,10,0.45)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      } else if (state.timeOfDay === 'day') {
        const glare = ctx.createRadialGradient(80, 40, 10, 80, 40, 320);
        glare.addColorStop(0, 'rgba(255, 240, 200, 0.20)');
        glare.addColorStop(1, 'rgba(255, 240, 200, 0)');
        ctx.fillStyle = glare;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }
      // v2 visual: rain, when a shower is passing — slanted streaks falling
      // across the whole frame.
      if (state.rain > 0.03) {
        ctx.strokeStyle = `rgba(180, 200, 255, ${0.35 * state.rain})`;
        ctx.lineWidth = 1.5;
        const n = Math.floor(state.rain * 110);
        for (let i = 0; i < n; i++) {
          const rx = ((i * 137.5 + state.time * 260) % (VIEW_W + 60)) - 30;
          const ry = ((i * 89.3 + state.time * 560) % (VIEW_H + 60)) - 30;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 7, ry + 16);
          ctx.stroke();
        }
      }
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
        drawPanel('THE SOLMARIS JOB — DONE', ['The pier, the cash, the sunset. Danny Vega is free.', `Final take: $${Math.round(state.money).toLocaleString('en-US')}`, 'All 5 missions complete.', `Lifetime: $${Math.round(state.stats.totalEarned).toLocaleString('en-US')} earned · ${state.stats.sideJobsDone} side jobs · ${state.stats.carsStolen} cars stolen`], 'Press SPACE to keep roaming Solmaris');
      }
      updateHud(state, screen);
      drawMinimap(state);
    },
  };
}
