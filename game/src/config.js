// Solmaris — tuning numbers, colours and shared helpers for the whole game.
// Everything here is plain data so the other modules stay small and readable.

export const WORLD = { width: 3400, height: 2600 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const ROAD = { width: 96, spacing: 430, countX: 8, countY: 6 };

// Road centre lines, computed from the spacing so city.js and the AI agree.
export function roadXs() {
  const xs = [];
  for (let i = 0; i < ROAD.countX; i++) xs.push(180 + i * ROAD.spacing);
  return xs;
}
export function roadYs() {
  const ys = [];
  for (let i = 0; i < ROAD.countY; i++) ys.push(180 + i * ROAD.spacing);
  return ys;
}

export const PLAYER = {
  radius: 13,
  walkSpeed: 235,
  runSpeed: 330,
  maxHealth: 100,
  punchDamage: 18,
  punchRange: 46,
  punchCooldown: 0.45,
};

export const CAR = {
  accel: 520,
  brake: 900,
  reverseAccel: 300,
  maxSpeed: 560,
  maxReverse: 170,
  turnRate: 2.6,
  grip: 3.2,
  length: 64,
  width: 30,
};

export const GUN = {
  damage: 34,
  range: 460,
  fireCooldown: 0.28,
  magSize: 12,
  reloadTime: 1.1,
  startAmmo: 48,
};

export const WANTED = {
  max: 5,
  decayDelay: 14,
  decayInterval: 6,
  stealCar: 1,
  punchPed: 1,
  shootPed: 2,
  killCop: 2,
  missionHeat: 2,
};

export const POLICE = {
  maxCars: 6,
  ramDamage: 9,
  shootRange: 380,
  shootCooldown: 1.4,
  catchRadius: 42,
  catchTime: 2.2,
};

export const TRAFFIC = { cars: 16, peds: 26 };

export const PALETTE = {
  grass: '#5f9e4d',
  grassDark: '#548c44',
  sand: '#e8d39a',
  ocean: '#2f7fb8',
  oceanDeep: '#1f5f92',
  road: '#3a3f47',
  roadEdge: '#2c3038',
  lane: '#e8d44d',
  sidewalk: '#9aa0a8',
  buildingRoof: '#b06a4a',
  buildingRoof2: '#7d8aa0',
  buildingRoof3: '#c9a35c',
  buildingSide: '#6e5138',
  park: '#4c8a3f',
  player: '#2f7fe0',
  playerJacket: '#f2b234',
  police: '#1c2f4a',
  taxi: '#f2c230',
  daySky: '#ffd9a0',
  nightSky: '#0d1526',
};

export const DAY = { sun: '#ffd9a0', tint: 'rgba(255, 190, 110, 0.10)' };
export const NIGHT = { sun: '#0d1526', tint: 'rgba(8, 12, 40, 0.42)' };

export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export const SAVE_KEY = 'solmaris.save.v1';

// Small deterministic RNG (mulberry32) so ?seed= replays the same city.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
export function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}
export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
