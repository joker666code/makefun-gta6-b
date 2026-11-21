// Boot and the one loop: input every frame, the world in fixed 1/60 s steps,
// the renderer painting what is there. Screens: title, play, paused, busted,
// wasted, win. ?seed=N fixes the city; ?shot=start|chase|mission|night stages
// that scene and sets window.__shotReady once it has painted.

import { CAR, GUN, PLAYER, STEP, WANTED, angleTo, clamp, dist, mulberry32 } from './config.js';
import { buildCity } from './city.js';
import { hitBuilding } from './city.js';
import { createAudio } from './audio.js';
import { ACTION_CONFIRM, ACTION_ENTER_CAR, ACTION_PAUSE, ACTION_PUNCH, ACTION_RELOAD, createInput } from './input.js';
import { createPlayer, driveCar, movePlayerOnFoot, nearestCar } from './entities.js';
import { addWanted, fireBullet, hurtPlayer, spawnTraffic, updatePeds, updatePolice, updateTraffic, updateWanted } from './traffic.js';
import { currentObjectiveText, startMission, updateMissions } from './missions.js';
import { createRenderer, SCREEN_BUSTED, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { loadSave, writeSave } from './save.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const SAVE_EVERY = 5;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const hud = {
  healthFill: document.getElementById('health-fill'),
  healthText: document.getElementById('health-text'),
  money: document.getElementById('money'),
  stars: document.getElementById('stars'),
  objective: document.getElementById('objective'),
  speed: document.getElementById('speed'),
  vehicle: document.getElementById('vehicle'),
  ammo: document.getElementById('ammo'),
  missionCount: document.getElementById('mission-count'),
  announce: document.getElementById('announce'),
  minimap: document.getElementById('minimap'),
};

const rng = mulberry32(seed);
const city = buildCity(seed);
const audio = createAudio();
const saved = loadSave();

const state = {
  city,
  seed,
  time: 0,
  night: false,
  player: createPlayer(610, 610),
  trafficCars: [],
  peds: [],
  police: [],
  pickups: [],
  tracers: [],
  events: [],
  wanted: 0,
  wantedTimer: 0,
  catchTimer: 0,
  alarm: 0,
  money: 0,
  missionIndex: 0,
  missionStep: 0,
  missionTimer: 0,
  missionPassenger: null,
  missionPackage: false,
  completedMissions: [],
  announceText: '',
  bustedFine: 0,
  lastCrime: '',
  saveTimer: 0,
};

if (saved) {
  state.money = saved.money;
  state.missionIndex = Math.min(saved.missionIndex, 4);
  state.player.health = saved.health;
  state.player.ammo = saved.ammo;
  state.completedMissions = saved.completed || [];
  if (saved.x !== null && saved.y !== null) {
    state.player.x = saved.x;
    state.player.y = saved.y;
  }
}

spawnTraffic(state, rng);
const renderer = createRenderer(canvas, hud);
const input = createInput(canvas);

// A few cash, ammo and health pickups scattered around town.
function seedPickups() {
  const spots = [
    { x: 1040, y: 610, kind: 'cash', amount: 80 },
    { x: 1900, y: 1470, kind: 'ammo', amount: 24 },
    { x: 2320, y: 1900, kind: 'health', amount: 50 },
    { x: 610, y: 1900, kind: 'cash', amount: 120 },
    { x: 2750, y: 610, kind: 'ammo', amount: 24 },
  ];
  for (const s of spots) state.pickups.push({ ...s, life: Infinity });
}
seedPickups();

function announce(message) {
  state.announceText = message;
  status.textContent = message;
}

// --- Events -----------------------------------------------------------------

function handleEvents() {
  for (const ev of state.events) {
    if (ev.type === 'announce') announce(ev.text);
    else if (ev.type === 'siren') audio.siren();
    else if (ev.type === 'hurt') audio.punch();
    else if (ev.type === 'crash') audio.crash();
    else if (ev.type === 'pickup') audio.pickup();
    else if (ev.type === 'missionDone') {
      audio.missionDone();
      audio.cash();
      writeSave(state);
    } else if (ev.type === 'missionStart') audio.startMusic();
    else if (ev.type === 'copShot') audio.shoot();
    else if (ev.type === 'carWrecked') {
      const p = state.player;
      if (p.inCar) {
        p.inCar.speed = 0;
        p.inCar = null;
        announce('Your car is wrecked. Find another ride.');
      }
    } else if (ev.type === 'busted') {
      bustPlayer();
    } else if (ev.type === 'wasted') {
      screen = SCREEN_OVER;
      audio.busted();
      writeSave(state);
      announce('Wasted. Danny went down.');
    } else if (ev.type === 'gameWon') {
      screen = SCREEN_WIN;
      writeSave(state);
    }
  }
  state.events.length = 0;
}

function bustPlayer() {
  const p = state.player;
  if (p.inCar) {
    p.inCar.speed = 0;
    p.inCar = null;
  }
  state.bustedFine = Math.min(state.money, 200);
  state.money -= state.bustedFine;
  state.wanted = 0;
  state.police = [];
  state.catchTimer = 0;
  p.x = 610;
  p.y = 610;
  p.health = Math.max(50, p.health);
  screen = SCREEN_BUSTED;
  audio.busted();
  writeSave(state);
  announce(`Busted! The PD took $${state.bustedFine} in fines.`);
}

// --- Actions ----------------------------------------------------------------

function enterOrExitCar() {
  const p = state.player;
  if (p.inCar) {
    const car = p.inCar;
    p.inCar = null;
    // Step out to the side of the car.
    p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
    p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
    audio.click();
    return;
  }
  const car = nearestCar(state.trafficCars, p.x, p.y, 90);
  if (!car) return;
  // Stealing a car with a driver inside (traffic) is a crime; parked ones are free-ish.
  const occupied = car.speed > 5;
  p.inCar = car;
  p.x = car.x;
  p.y = car.y;
  car.driver = 'player-stolen';
  audio.engine();
  if (occupied) addWanted(state, WANTED.stealCar, 'stole a car');
}

function punch() {
  const p = state.player;
  if (p.inCar || p.punchTimer > 0) return;
  p.punchTimer = PLAYER.punchCooldown;
  audio.punch();
  const reach = PLAYER.punchRange;
  const fx = p.x + Math.cos(p.aimAngle) * reach;
  const fy = p.y + Math.sin(p.aimAngle) * reach;
  for (const ped of state.peds) {
    if (ped.dead || ped.mission) continue;
    if (dist(fx, fy, ped.x, ped.y) < 26) {
      ped.dead = true;
      ped.panic = 0;
      addWanted(state, WANTED.punchPed, 'attacked a pedestrian');
      if (ped.hasCash) state.pickups.push({ x: ped.x, y: ped.y, kind: 'cash', amount: 30 + Math.floor(Math.random() * 50), life: 25 });
      announce('You knocked a pedestrian flat. Someone saw that.');
      return;
    }
  }
  for (const cop of state.police) {
    if (dist(fx, fy, cop.x, cop.y) < 40) {
      cop.health -= PLAYER.punchDamage;
      addWanted(state, 1, 'hit a cop');
      return;
    }
  }
}

function shoot() {
  const p = state.player;
  if (p.inCar || p.fireTimer > 0 || p.reloadTimer > 0) return;
  if (p.mag <= 0) {
    reload();
    return;
  }
  p.fireTimer = GUN.fireCooldown;
  p.mag -= 1;
  audio.shoot();
  state.alarm = 1.5;
  const mx = p.x + Math.cos(p.aimAngle) * 22;
  const my = p.y + Math.sin(p.aimAngle) * 22;
  fireBullet(state, mx, my, p.aimAngle);
}

function reload() {
  const p = state.player;
  if (p.reloadTimer > 0 || p.mag >= GUN.magSize || p.ammo <= 0) return;
  p.reloadTimer = GUN.reloadTime;
  audio.reload();
}

function collectPickups() {
  const p = state.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const py = p.inCar ? p.inCar.y : p.y;
  for (const pk of state.pickups) {
    if (pk.life !== Infinity) {
      pk.life -= STEP;
      if (pk.life <= 0) continue;
    }
    if (dist(px, py, pk.x, pk.y) < 46) {
      if (pk.kind === 'cash') {
        state.money += pk.amount;
        audio.cash();
        announce(`+$${pk.amount}`);
      } else if (pk.kind === 'ammo') {
        p.ammo += pk.amount;
        audio.pickup();
        announce(`+${pk.amount} ammo`);
      } else if (pk.kind === 'health') {
        p.health = Math.min(PLAYER.maxHealth, p.health + pk.amount);
        audio.pickup();
        announce(`+${pk.amount} health`);
      }
      pk.life = 0;
    }
  }
  state.pickups = state.pickups.filter((pk) => pk.life > 0);
}

// --- Simulation step ---------------------------------------------------------

function step(dt) {
  state.time += dt;
  state.alarm = Math.max(0, state.alarm - dt);
  const p = state.player;

  if (p.punchTimer > 0) p.punchTimer -= dt;
  if (p.fireTimer > 0) p.fireTimer -= dt;
  if (p.hurtTimer > 0) p.hurtTimer -= dt;
  if (p.reloadTimer > 0) {
    p.reloadTimer -= dt;
    if (p.reloadTimer <= 0) {
      const need = GUN.magSize - p.mag;
      const take = Math.min(need, p.ammo);
      p.mag += take;
      p.ammo -= take;
    }
  }

  // Aim follows the mouse (screen coords -> world coords via the camera).
  const mouse = input.mouse();
  const rect = canvas.getBoundingClientRect();
  const scaleX = 1280 / Math.max(1, rect.width);
  const scaleY = 720 / Math.max(1, rect.height);
  const worldMouseX = mouse.x * scaleX + cameraX();
  const worldMouseY = mouse.y * scaleY + cameraY();
  p.aimAngle = angleTo(p.x, p.y, worldMouseX, worldMouseY);

  if (p.inCar) {
    const car = p.inCar;
    const throttle = input.up() ? 1 : input.down() ? -1 : 0;
    const steer = input.left() ? -1 : input.right() ? 1 : 0;
    const prevX = car.x;
    const prevY = car.y;
    driveCar(car, throttle, steer, dt);
    p.x = car.x;
    p.y = car.y;
    p.angle = car.angle;
    // Buildings are solid: bounce the car back out and cut its speed.
    if (hitBuilding(city, car.x, car.y, 26)) {
      car.x = prevX;
      car.y = prevY;
      if (Math.abs(car.speed) > 200) {
        car.health -= 8;
        audio.crash();
      }
      car.speed *= 0.3;
      p.x = car.x;
      p.y = car.y;
    }
    if (Math.abs(car.speed) > 40 && Math.random() < dt * 0.5) audio.engine();
    // Building bumps slow the car and hurt it.
    if (car.health > 0) {
      const hit = car.x <= 22 || car.y <= 22 || car.x >= 3378 || car.y >= 2578;
      if (hit && Math.abs(car.speed) > 200) {
        car.speed *= 0.5;
        car.health -= 8;
        audio.crash();
      }
    }
    if (car.health <= 0) state.events.push({ type: 'carWrecked' });
  } else {
    const mv = input.move();
    const speed = input.running() ? PLAYER.runSpeed : PLAYER.walkSpeed;
    const mx = mv.x * speed;
    const my = mv.y * speed;
    // movePlayerOnFoot uses walkSpeed internally; scale by passing a unit vector
    // times the run/walk ratio.
    const ratio = speed / PLAYER.walkSpeed;
    movePlayerOnFoot(p, city, mv.x * ratio, mv.y * ratio, dt);
    void mx;
    void my;
  }

  // Shooting while the mouse button is held.
  if (input.mouseDown() || input.takeClick()) shoot();

  updateTraffic(state, dt);
  updatePeds(state, dt);
  updateWanted(state, dt);
  updatePolice(state, dt);
  updateMissions(state, dt);
  collectPickups();

  for (const t of state.tracers) t.life -= dt;
  state.tracers = state.tracers.filter((t) => t.life > 0);

  // Autosave every few seconds while playing.
  state.saveTimer += dt;
  if (state.saveTimer > SAVE_EVERY) {
    state.saveTimer = 0;
    writeSave(state);
  }
  handleEvents();
}

// Camera helpers shared with the aim math above (same clamp as the renderer).
function cameraX() {
  const p = state.player;
  const fx = p.inCar ? p.inCar.x : p.x;
  return clamp(fx - 640, 0, 3400 - 1280);
}
function cameraY() {
  const p = state.player;
  const fy = p.inCar ? p.inCar.y : p.y;
  return clamp(fy - 360, 0, 2600 - 720);
}

// --- Screens and the loop ----------------------------------------------------

let screen = SCREEN_TITLE;

function startGame(fresh) {
  audio.unlock();
  if (fresh) {
    state.player = createPlayer(610, 610);
    state.money = 0;
    state.missionIndex = 0;
    state.missionStep = 0;
    state.completedMissions = [];
    state.wanted = 0;
    state.police = [];
    state.pickups = [];
    seedPickups();
    spawnTraffic(state, mulberry32(seed + 7));
  }
  startMission(state, state.missionIndex);
  audio.startMusic();
  screen = SCREEN_PLAY;
  announce(`Mission ${state.missionIndex + 1}: ${currentObjectiveText(state)}`);
}

function runShot(name) {
  const scene = stageShot(name, state);
  screen = scene.screen;
  if (screen === SCREEN_PLAY) audio.unlock();
  let painted = 0;
  function paint() {
    renderer.draw(state, screen);
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  // Let traffic settle for a moment so the frame is alive, then paint.
  for (let i = 0; i < 90; i++) {
    updateTraffic(state, STEP);
    updatePeds(state, STEP);
    state.time += STEP;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let accumulator = 0;
  let last = performance.now();

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      if (screen === SCREEN_TITLE) startGame(false);
      else if (screen === SCREEN_OVER || screen === SCREEN_BUSTED) startGame(false);
      else if (screen === SCREEN_WIN) { screen = SCREEN_PLAY; }
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
    }
    if (actions & ACTION_ENTER_CAR && screen === SCREEN_PLAY) enterOrExitCar();
    if (actions & ACTION_PUNCH && screen === SCREEN_PLAY) punch();
    if (actions & ACTION_RELOAD && screen === SCREEN_PLAY) reload();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        step(STEP);
        accumulator -= STEP;
        if (screen !== SCREEN_PLAY) { accumulator = 0; break; }
      }
    } else {
      accumulator = 0;
      // The title screen still shows the city alive behind the panel.
      if (screen === SCREEN_TITLE) {
        state.time += 1 / 60;
        updateTraffic(state, 1 / 60);
        updatePeds(state, 1 / 60);
      }
    }
    renderer.draw(state, screen);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce(saved ? 'Welcome back to Solmaris. Press SPACE to continue your story.' : 'Solmaris. Press SPACE or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
