// The actors: Danny on foot, drivable cars, pedestrians and police cars.
// Factories only build plain objects; the update rules live in traffic.js and main.js.

import { CAR, GUN, PLAYER, WORLD, clamp, dist, mulberry32, pick } from './config.js';
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
  };
}

const CAR_COLORS = ['#c94f43', '#4a7fb5', '#d8d8d8', '#3f8f5f', '#e0a53a', '#7a5fb0', '#e07a3a', '#5fb0a5'];
const CAR_NAMES = ['Vento', 'Comet', 'Falco', 'Bison', 'Marlin', 'Strada'];

export function createCar(x, y, angle, kind, rng) {
  const r = rng || mulberry32((Math.random() * 1e9) | 0);
  const carKind = kind || 'sedan';
  return {
    kind: 'car',
    carKind,
    name: carKind === 'police' ? 'Interceptor' : carKind === 'taxi' ? 'Cab' : pick(r, CAR_NAMES),
    x, y,
    angle,
    speed: 0,
    color: carKind === 'police' ? '#1c2f4a' : carKind === 'taxi' ? '#f2c230' : pick(r, CAR_COLORS),
    health: 100,
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
  if (mx !== 0 || my !== 0) player.angle = Math.atan2(my, mx);
  resolveCollisions(city, player, PLAYER.radius);
  player.x = clamp(player.x, PLAYER.radius, WORLD.width - PLAYER.radius);
  player.y = clamp(player.y, PLAYER.radius, WORLD.height - PLAYER.radius);
}

// Arcade car physics: accelerate along the heading, steer more at speed,
// drag and lateral grip keep it from sliding forever. Returns the speed.
export function driveCar(car, throttle, steer, dt) {
  const forward = { x: Math.cos(car.angle), y: Math.sin(car.angle) };
  const accel = throttle > 0 ? CAR.accel * throttle : throttle < 0 ? -CAR.reverseAccel : 0;
  car.speed += accel * dt;
  if (throttle === 0) car.speed -= car.speed * 1.4 * dt;
  const maxF = CAR.maxSpeed;
  const maxR = -CAR.maxReverse;
  if (car.speed > maxF) car.speed = maxF;
  if (car.speed < maxR) car.speed = maxR;
  if (Math.abs(car.speed) < 4 && throttle === 0) car.speed = 0;
  const steerAmount = steer * CAR.turnRate * dt * clamp(Math.abs(car.speed) / 180, 0, 1);
  car.angle += (car.speed >= 0 ? steerAmount : -steerAmount);
  const nx = Math.cos(car.angle);
  const ny = Math.sin(car.angle);
  // Blend velocity toward the heading: simple grip model.
  const vx = forward.x * car.speed;
  const vy = forward.y * car.speed;
  const gx = vx + (nx * car.speed - vx) * Math.min(1, CAR.grip * dt);
  const gy = vy + (ny * car.speed - vy) * Math.min(1, CAR.grip * dt);
  car.x += gx * dt;
  car.y += gy * dt;
  car.x = clamp(car.x, 20, WORLD.width - 20);
  car.y = clamp(car.y, 20, WORLD.height - 20);
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
