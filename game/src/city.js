// Solmaris, the city itself: a seeded procedural map of roads, blocks, buildings,
// a beach on the west edge, a park near the middle and the named places missions use.
// Everything is plain data; collisions and drawing read it, nothing here draws.

import { PALETTE, ROAD, SIGNS, WORLD, clamp, mulberry32, pick, roadXs, roadYs } from './config.js';

const ROOFS = [PALETTE.buildingRoof, PALETTE.buildingRoof2, PALETTE.buildingRoof3];

// v2: a few parked cars are sports cars or trucks now, so stealing the right
// ride matters — sports for a getaway, trucks for ramming through a roadblock.
const PARKED_KINDS = ['sedan', 'sedan', 'sedan', 'sports', 'truck'];

// Named places the story and the missions point at. Positions sit on roads.
export const PLACES = {
  safehouse: { name: 'Safehouse — Coral Court', x: 610, y: 610 },
  marina: { name: 'Marina', x: 180, y: 1040 },
  taxiStand: { name: 'Taxi Stand — Palm Row', x: 1470, y: 180 },
  warehouse: { name: 'Warehouse 9', x: 2750, y: 1470 },
  bank: { name: 'Solmaris Central Bank', x: 2320, y: 610 },
  hideout: { name: 'Hideout — Old Cannery', x: 180, y: 1900 },
  pier: { name: 'Sunset Pier', x: 180, y: 723 },
  airport: { name: 'Solmaris Airfield', x: 3180, y: 2330 },
};

export function buildCity(seed) {
  const rng = mulberry32(seed);
  const xs = roadXs();
  const ys = roadYs();
  const buildings = [];
  const trees = [];
  const lamps = [];
  const parked = [];

  // One block of buildings between each pair of neighbouring roads.
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const bx0 = xs[i] + ROAD.width / 2 + 22;
      const by0 = ys[j] + ROAD.width / 2 + 22;
      const bw = xs[i + 1] - xs[i] - ROAD.width - 44;
      const bh = ys[j + 1] - ys[j] - ROAD.width - 44;
      // The park block stays open: two blocks in from the west, one down.
      if (i === 2 && j === 1) continue;
      // The marina block on the beach stays open too.
      if (i === 0 && j === 2) continue;
      const count = 2 + Math.floor(rng() * 3);
      for (let k = 0; k < count; k++) {
        const w = 90 + rng() * 130;
        const h = 70 + rng() * 110;
        const x = bx0 + rng() * Math.max(1, bw - w);
        const y = by0 + rng() * Math.max(1, bh - h);
        const tall = rng() < 0.22;
        buildings.push({
          x, y, w, h,
          roof: pick(rng, ROOFS),
          tall,
          floors: tall ? 5 + Math.floor(rng() * 5) : 1 + Math.floor(rng() * 3),
          lit: rng(),
          // v2 visual: a roof-detail seed (AC units, vents, parapet lines)
          // and, for a few big buildings, a neon sign for the street.
          detail: rng(),
          sign: (w > 150 || tall) && rng() < 0.3 ? pick(rng, SIGNS) : null,
        });
      }
      // A few trees on each block.
      const treeCount = 2 + Math.floor(rng() * 3);
      for (let t = 0; t < treeCount; t++) {
        trees.push({ x: bx0 + rng() * bw, y: by0 + rng() * bh, r: 9 + rng() * 7 });
      }
    }
  }

  // v3: neon signs must never collide — two neighbouring buildings in one
  // block used to put PIZZA and 24H MART on top of each other in the night
  // shot. Drop the later sign whenever two sign boxes would overlap on the
  // same street line. The width estimate matches the renderer's font math
  // (bold Arial Black, measured ~0.68 em per glyph plus padding — the old
  // 0.42 estimate was a third too narrow, so real words spilled past the
  // plate and past each other).
  for (let i = 0; i < buildings.length; i++) {
    const a = buildings[i];
    if (!a.sign) continue;
    const aSize = Math.min(15, a.w / (a.sign.text.length * 0.8));
    const aHalf = (a.sign.text.length * aSize * 0.68) / 2 + 8;
    const aY = a.y + a.h + (a.tall ? 12 : 7) + 13;
    for (let j = i + 1; j < buildings.length; j++) {
      const b = buildings[j];
      if (!b.sign) continue;
      const bSize = Math.min(15, b.w / (b.sign.text.length * 0.8));
      const bHalf = (b.sign.text.length * bSize * 0.68) / 2 + 8;
      const bY = b.y + b.h + (b.tall ? 12 : 7) + 13;
      const cxA = a.x + a.w / 2;
      const cxB = b.x + b.w / 2;
      if (Math.abs(cxA - cxB) < aHalf + bHalf + 6 && Math.abs(aY - bY) < 22) {
        b.sign = null;
      }
    }
  }

  // Street lamps along every road, alternating sides.
  for (const x of xs) {
    for (let y = 120; y < WORLD.height; y += 260) {
      lamps.push({ x: x + ROAD.width / 2 + 8, y });
    }
  }
  for (const y of ys) {
    for (let x = 120; x < WORLD.width; x += 260) {
      lamps.push({ x, y: y + ROAD.width / 2 + 8 });
    }
  }

  // Parked cars along the kerbs for the player to steal.
  const carColors = ['#c94f43', '#4a7fb5', '#d8d8d8', '#3f8f5f', '#e0a53a', '#7a5fb0'];
  // One car is always parked by the Safehouse, so the first mission can start at once.
  parked.push({ x: 680, y: 640, angle: 0, color: '#c94f43', kind: 'sedan' });
  for (let n = 0; n < 14; n++) {
    const vertical = rng() < 0.5;
    const road = vertical ? pick(rng, xs) : pick(rng, ys);
    const along = 260 + rng() * (WORLD.height - 520);
    parked.push({
      x: vertical ? road + (rng() < 0.5 ? -34 : 34) : clamp(along, 200, WORLD.width - 200),
      y: vertical ? clamp(along, 200, WORLD.height - 200) : road + (rng() < 0.5 ? -34 : 34),
      angle: vertical ? (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (rng() < 0.5 ? 0 : Math.PI),
      color: pick(rng, carColors),
      kind: rng() < 0.15 ? 'taxi' : pick(rng, PARKED_KINDS),
    });
  }

  // v2 visual: grass tufts and wildflowers so the ground is not one flat
  // colour — deterministic, so the same seed draws the same city.
  const tufts = [];
  for (let n = 0; n < 160; n++) {
    tufts.push({
      x: 140 + rng() * (WORLD.width - 280),
      y: 140 + rng() * (WORLD.height - 280),
      r: 3 + rng() * 7,
      dark: rng() < 0.5,
    });
  }

  // v2: beach umbrellas — a row of striped shades along the sand.
  // v4: the row sits in the gaps between the cross streets now — the old
  // 330 px spacing parked one umbrella on the y=610 road, where the asphalt
  // painted over it.
  const umbrellaYs = [300, 800, 1150, 1300, 1700, 2150];
  const umbrellas = [];
  for (let i = 0; i < 6; i++) {
    umbrellas.push({
      x: 92 + (i % 2) * 18,
      y: umbrellaYs[i],
      color: pick(rng, ['#ff5fa2', '#37d6e0', '#f2b234', '#e8e8e8']),
    });
  }

  // v2: landmarks the missions point at, so the places feel like places.
  // The airfield gets a real runway, downtown gets a fountain plaza, the west
  // edge gets a wooden pier over the water and the marina gets moored docks.
  const runway = { x: 2960, y: 2140, w: 380, h: 70 };
  const plaza = { x: xs[4] + 60, y: ys[2] + 60, w: 220, h: 150 };
  const pier = { x: 0, y: 700, w: 170, h: 46 };
  const docks = [];
  // v4: the docks sit between the cross streets now — the old 90 px spacing
  // put one dock under the y=1040 road, where the asphalt painted over it.
  const dockYs = [820, 1150, 1300, 1680];
  for (let i = 0; i < 4; i++) {
    docks.push({ x: 30, y: dockYs[i], w: 60, h: 16, boat: rng() < 0.75 });
  }

  return {
    seed,
    xs, ys,
    buildings, trees, lamps, parked,
    umbrellas, runway, plaza, pier, docks, tufts,
    park: { x: xs[2] + ROAD.width / 2 + 22, y: ys[1] + ROAD.width / 2 + 22, w: xs[3] - xs[2] - ROAD.width - 44, h: ys[2] - ys[1] - ROAD.width - 44 },
    beach: { x: 0, w: 120 },
    ocean: { x: 0, w: 70 },
  };
}

// True when the point is on a road (within half the road width of a centre line).
export function onRoad(city, x, y) {
  const half = ROAD.width / 2;
  for (const rx of city.xs) if (Math.abs(x - rx) <= half) return true;
  for (const ry of city.ys) if (Math.abs(y - ry) <= half) return true;
  return false;
}

// Nearest point on the road network to (x, y): used to snap traffic onto roads.
export function nearestRoadPoint(city, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const rx of city.xs) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = { x: rx, y: clamp(y, 60, WORLD.height - 60) }; }
  }
  for (const ry of city.ys) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; best = { x: clamp(x, 60, WORLD.width - 60), y: ry }; }
  }
  return best;
}

// Circle (x, y, r) against every building; returns the building hit, or null.
export function hitBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    const cx = clamp(x, b.x, b.x + b.w);
    const cy = clamp(y, b.y, b.y + b.h);
    if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r) return b;
  }
  return null;
}

// Push a circle out of buildings and the world edge; returns true if it hit anything.
export function resolveCollisions(city, body, r) {
  let hit = false;
  for (const b of city.buildings) {
    const cx = clamp(body.x, b.x, b.x + b.w);
    const cy = clamp(body.y, b.y, b.y + b.h);
    const dx = body.x - cx;
    const dy = body.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r && d2 > 0.0001) {
      const d = Math.sqrt(d2);
      body.x = cx + (dx / d) * r;
      body.y = cy + (dy / d) * r;
      hit = true;
    } else if (d2 <= 0.0001) {
      body.x = b.x - r;
      hit = true;
    }
  }
  if (body.x < r) { body.x = r; hit = true; }
  if (body.y < r) { body.y = r; hit = true; }
  if (body.x > WORLD.width - r) { body.x = WORLD.width - r; hit = true; }
  if (body.y > WORLD.height - r) { body.y = WORLD.height - r; hit = true; }
  return hit;
}
