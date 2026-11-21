// The actors: Danny on foot, drivable cars, pedestrians and police cars.
// Factories only build plain objects; the update rules live in traffic.js and main.js.

import { CAR, CAR_STATS, GUN, PLAYER, WORLD, angleDiff, clamp, dist, mulberry32, pick } from './config.js';
import { nearestRoadPoint, resolveCollisions } from './city.js';

export function createPlayer(x, y) {
  return {
    kind: 'player',
    x, y,
    angle: -Math.PI / 2,
    aimAngle: -Math.PI / 2,
    speed: 0,
    health: PLAYER.maxHealth,
    money: 0,
    ammo: GUN.startAmmo,
    mag: GUN.magSize,
    inCar: null,
    punchTimer: 0,
    fireTimer: 0,
    reloadTimer: 0,
    hurtTimer: 0,
    dead: false,
    // v2 visual: the walk-cycle phase — the legs swing with it.
    walkPhase: 0,
  };
}

const CAR_COLORS = ['#c94f43', '#4a7fb5', '#d8d8d8', '#3f8f5f', '#e0a53a', '#7a5fb0', '#e07a3a', '#5fb0a5'];
const CAR_NAMES = ['Vento', 'Comet', 'Falco', 'Bison', 'Marlin', 'Strada'];
// v2: sports cars and trucks get their own names, so the HUD tells the truth.
const SPORTS_NAMES = ['Comet RS', 'Vortex GT', 'Falco S'];
const TRUCK_NAMES = ['Bison Hauler', 'Mule', 'Atlas'];

export function createCar(x, y, angle, kind, rng) {
  const r = rng || mulberry32((Math.random() * 1e9) | 0);
  const carKind = kind || 'sedan';
  const stats = CAR_STATS[carKind] || CAR_STATS.sedan;
  return {
    kind: 'car',
    carKind,
    stats,
    name: carKind === 'police' ? 'Interceptor' : carKind === 'taxi' ? 'Cab'
      : carKind === 'sports' ? pick(r, SPORTS_NAMES)
      : carKind === 'truck' ? pick(r, TRUCK_NAMES) : pick(r, CAR_NAMES),
    x, y,
    angle,
    speed: 0,
    color: carKind === 'police' ? '#1c2f4a' : carKind === 'taxi' ? '#f2c230' : pick(r, CAR_COLORS),
    health: stats.health,
    maxHealth: stats.health,
    nitroActive: false,
    skidding: false,
    // v2 visual: what the eye sees lags what the physics does — the body
    // angle eases toward the heading, the front wheels show the steer, and
    // the brake lights know when the driver is braking.
    visualAngle: angle,
    steerVisual: 0,
    braking: false,
    driver: carKind === 'police' ? 'cop' : null,
    // Traffic AI state: which road the car follows and which way along it.
    roadAxis: 'x',
    roadLine: 0,
    roadDir: 1,
    stuck: 0,
    siren: carKind === 'police',
    // Police chase state.
    target: null,
    shootTimer: 0,
    ramTimer: 0,
  };
}

export function createPed(x, y, rng) {
  const shirts = ['#d86a6a', '#6a9fd8', '#7fc46a', '#d8b26a', '#a06ad8', '#e8e8e8'];
  return {
    kind: 'ped',
    x, y,
    angle: rng() * Math.PI * 2,
    speed: 40 + rng() * 35,
    shirt: pick(rng, shirts),
    // Pedestrians stroll along sidewalks: pick a nearby road and a direction.
    roadAxis: rng() < 0.5 ? 'x' : 'y',
    roadLine: 0,
    roadDir: rng() < 0.5 ? -1 : 1,
    panic: 0,
    walkPhase: rng() * Math.PI * 2,
    dead: false,
    // A few pedestrians carry cash; punching one can drop it.
    hasCash: rng() < 0.25,
  };
}

export function createCopCar(x, y, angle) {
  const car = createCar(x, y, angle, 'police');
  car.siren = true;
  return car;
}

// --- Movement ---------------------------------------------------------------

// Move Danny on foot with building collision. Returns nothing; mutates player.
export function movePlayerOnFoot(player, city, mx, my, dt) {
  const speed = mx !== 0 || my !== 0 ? PLAYER.walkSpeed : 0;
  player.speed = speed;
  player.x += mx * speed * dt;
  player.y += my * speed * dt;
  if (mx !== 0 || my !== 0) {
    player.angle = Math.atan2(my, mx);
    // v2 visual: the walk cycle only advances while actually moving.
    player.walkPhase += dt * 11;
  }
  resolveCollisions(city, player, PLAYER.radius);
  player.x = clamp(player.x, PLAYER.radius, WORLD.width - PLAYER.radius);
  player.y = clamp(player.y, PLAYER.radius, WORLD.height - PLAYER.radius);
}

// Arcade car physics: accelerate along the heading, steer more at speed,
// drag and lateral grip keep it from sliding forever. Returns the speed.
// v2: opts { handbrake, nitro } — the handbrake locks the rear wheels (sharp
// turns, tyre smoke, skid marks) and nitro adds boost while the tank lasts.
// Each car now drives on its own CAR_STATS instead of the shared CAR tuning.
export function driveCar(car, throttle, steer, dt, opts) {
  const stats = car.stats || CAR_STATS.sedan;
  const handbrake = !!(opts && opts.handbrake);
  const nitro = !!(opts && opts.nitro);
  car.nitroActive = nitro && throttle > 0;
  car.braking = throttle < 0;
  // v2 visual: the front wheels follow the steering input, eased.
  car.steerVisual += (steer - car.steerVisual) * Math.min(1, 10 * dt);
  const forward = { x: Math.cos(car.angle), y: Math.sin(car.angle) };
  const accel = throttle > 0
    ? (stats.accel + (car.nitroActive ? 320 : 0)) * throttle
    : throttle < 0 ? -CAR.reverseAccel : 0;
  car.speed += accel * dt;
  if (throttle === 0) car.speed -= car.speed * 1.4 * dt;
  // The handbrake bleeds speed fast and kills grip: that is the drift.
  if (handbrake) {
    car.speed -= car.speed * 2.2 * dt;
    car.skidding = Math.abs(car.speed) > 160;
  } else {
    car.skidding = false;
  }
  const maxF = stats.maxSpeed + (car.nitroActive ? 240 : 0);
  const maxR = -CAR.maxReverse;
  if (car.speed > maxF) car.speed = maxF;
  if (car.speed < maxR) car.speed = maxR;
  if (Math.abs(car.speed) < 4 && throttle === 0) car.speed = 0;
  const steerBoost = handbrake ? 1.6 : 1;
  const steerAmount = steer * stats.turnRate * steerBoost * dt * clamp(Math.abs(car.speed) / 180, 0, 1);
  car.angle += (car.speed >= 0 ? steerAmount : -steerAmount);
  const nx = Math.cos(car.angle);
  const ny = Math.sin(car.angle);
  // Blend velocity toward the heading: simple grip model. Less grip while
  // handbraking, so the tail steps out instead of sticking to the heading.
  const grip = handbrake ? stats.grip * 0.35 : stats.grip;
  const vx = forward.x * car.speed;
  const vy = forward.y * car.speed;
  const gx = vx + (nx * car.speed - vx) * Math.min(1, grip * dt);
  const gy = vy + (ny * car.speed - vy) * Math.min(1, grip * dt);
  car.x += gx * dt;
  car.y += gy * dt;
  car.x = clamp(car.x, 20, WORLD.width - 20);
  car.y = clamp(car.y, 20, WORLD.height - 20);
  // v2 visual: the body angle eases toward the heading instead of snapping,
  // so turns read as smooth weight transfer, not a teleport.
  car.visualAngle += angleDiff(car.angle, car.visualAngle) * Math.min(1, 12 * dt);
  return car.speed;
}

// Circle-vs-car collision used for traffic bumps and police rams.
export function carOverlaps(a, b) {
  return dist(a.x, a.y, b.x, b.y) < 52;
}

// Nearest car within reach of the player (for the E key), preferring the closest.
export function nearestCar(cars, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    const d = dist(x, y, car.x, car.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

// Snap a traffic car onto the road network and give it a lane to follow.
export function placeOnRoad(city, car, rng) {
  const p = nearestRoadPoint(city, car.x, car.y);
  car.x = p.x;
  car.y = p.y;
  const onVertical = Math.abs(p.x - car.x) < 1 && city.xs.includes(p.x);
  // Decide axis by which road line we snapped to.
  const vertical = city.xs.some((rx) => Math.abs(rx - p.x) < 1);
  car.roadAxis = vertical ? 'y' : 'x';
  car.roadLine = vertical ? p.x : p.y;
  car.roadDir = rng() < 0.5 ? -1 : 1;
  car.angle = car.roadAxis === 'y' ? (car.roadDir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.roadDir > 0 ? 0 : Math.PI);
  car.speed = 110 + rng() * 60;
}
