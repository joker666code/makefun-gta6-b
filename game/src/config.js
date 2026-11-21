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

// v2: per-kind handling. Sports cars are fast and loose, trucks are slow and
// tough, taxis sit in the middle. driveCar() reads these through car.stats.
export const CAR_STATS = {
  sedan: { accel: 520, maxSpeed: 560, turnRate: 2.6, grip: 3.2, health: 100 },
  sports: { accel: 680, maxSpeed: 720, turnRate: 3.1, grip: 2.4, health: 80 },
  truck: { accel: 380, maxSpeed: 440, turnRate: 2.0, grip: 3.8, health: 180 },
  taxi: { accel: 520, maxSpeed: 560, turnRate: 2.6, grip: 3.2, health: 100 },
  police: { accel: 620, maxSpeed: 640, turnRate: 3.0, grip: 3.4, health: 140 },
};

// v2: nitro. Hold N while driving: a limited boost tank that refills slowly
// when not in use. The HUD bar in index.html shows what is left.
export const NITRO = { max: 100, drain: 42, refill: 9, boostAccel: 320, boostTop: 240 };

// v2: the clock. clock runs 0..1 over one full day (DAY_LENGTH seconds of play);
// the world moves through dawn, day, sunset and night, and the renderer tints
// the frame to match. Night is not a separate mode any more — it arrives.
export const CLOCK = { dayLength: 240, sunsetStart: 0.55, nightStart: 0.70, dawnStart: 0.92 };
export function timeOfDay(clock) {
  if (clock >= CLOCK.nightStart && clock < CLOCK.dawnStart) return 'night';
  if (clock >= CLOCK.sunsetStart && clock < CLOCK.nightStart) return 'sunset';
  if (clock >= CLOCK.dawnStart || clock < 0.08) return 'dawn';
  return 'day';
}
export function clockLabel(clock) {
  const t = timeOfDay(clock);
  return t === 'night' ? '☾ Night' : t === 'sunset' ? '☀ Sunset' : t === 'dawn' ? '☀ Dawn' : '☀ Day';
}

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
  // v2: sunset sky and the new landmarks (runway, plaza fountain, pier wood).
  sunsetSky: '#ff9a5c',
  sunsetTint: 'rgba(255, 122, 60, 0.22)',
  runway: '#4a4d55',
  plaza: '#b8a888',
  pierWood: '#8a6a44',
  neonPink: '#ff5fa2',
  neonCyan: '#37d6e0',
  // v2 visual: roof edge light, lit windows, muzzle flash, rain, tyre rubber.
  roofEdge: 'rgba(255,255,255,0.28)',
  windowLit: '#ffd76a',
  windowDark: 'rgba(20, 30, 44, 0.55)',
  muzzle: '#ffd76a',
  rain: 'rgba(180, 200, 255, 0.4)',
  tyre: '#1a1c20',
  glass: 'rgba(24, 42, 66, 0.9)',
  glassShine: 'rgba(180, 220, 255, 0.55)',
};

export const DAY = { sun: '#ffd9a0', tint: 'rgba(255, 190, 110, 0.10)' };
export const NIGHT = { sun: '#0d1526', tint: 'rgba(8, 12, 40, 0.42)' };

export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
// v2 visual: display face for titles, money and big numbers — heavy, condensed,
// letterspaced — so the HUD and menus stop looking like a default system UI.
export const FONT_DISPLAY = "'Arial Black', 'Trebuchet MS', 'Segoe UI', sans-serif";
export const FONT_BODY = "'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";

// v2 visual: neon sign texts and colours the city hands out to buildings.
export const SIGNS = [
  { text: 'HOTEL', color: '#ff5fa2' },
  { text: '24H MART', color: '#37d6e0' },
  { text: 'TACOS', color: '#f2b234' },
  { text: 'PIER BAR', color: '#ff7a5c' },
  { text: 'MOTEL', color: '#7ddb8a' },
  { text: 'PIZZA', color: '#ff9a3d' },
  { text: 'SURF', color: '#5f8ff0' },
  { text: 'CINEMA', color: '#c98aff' },
  { text: 'BANK', color: '#ffd76a' },
  { text: 'DANCE', color: '#ff5fa2' },
];

// v2 visual: sun direction per time of day — building and car shadows lean
// with the light (long and east at sunset, short at noon, faint at night).
export const SUN_SHADOW = {
  dawn: { x: -18, y: 6, a: 0.28 },
  day: { x: 10, y: 12, a: 0.22 },
  sunset: { x: 26, y: 8, a: 0.34 },
  night: { x: 4, y: 5, a: 0.45 },
};

export const SAVE_KEY = 'solmaris.save.v2'; // v2: new key — v1 saves lack stats/clock, so they start fresh cleanly.

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
export function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
export function lerp(a, b, t) {
  return a + (b - a) * clamp01(t);
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
