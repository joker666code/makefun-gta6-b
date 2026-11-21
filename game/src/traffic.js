// Traffic, pedestrians, the wanted system and the police.
// These functions run every fixed step from main.js and mutate the shared state.

import { CAR, GUN, POLICE, TRAFFIC, WANTED, WORLD, angleDiff, angleTo, clamp, dist, mulberry32, pick } from './config.js';
import { createCar, createCopCar, createPed, driveCar, placeOnRoad } from './entities.js';
import { hitBuilding, nearestRoadPoint, onRoad, resolveCollisions } from './city.js';

export function spawnTraffic(state, rng) {
  const { city } = state;
  state.trafficCars = [];
  state.peds = [];
  state.police = [];
  // Parked cars from the city plan are stealable; traffic cars drive the roads.
  for (const p of city.parked) {
    const car = createCar(p.x, p.y, p.angle, p.kind, rng);
    car.color = p.color;
    state.trafficCars.push(car);
  }
  for (let i = 0; i < TRAFFIC.cars; i++) {
    const car = createCar(200 + rng() * (WORLD.width - 400), 200 + rng() * (WORLD.height - 400), 0, rng() < 0.12 ? 'taxi' : 'sedan', rng);
    placeOnRoad(city, car, rng);
    state.trafficCars.push(car);
  }
  for (let i = 0; i < TRAFFIC.peds; i++) {
    const ped = createPed(200 + rng() * (WORLD.width - 400), 200 + rng() * (WORLD.height - 400), rng);
    const p = nearestRoadPoint(city, ped.x, ped.y);
    // Sidewalk offset: a little off the road centre.
    ped.x = p.x + (rng() < 0.5 ? -62 : 62);
    ped.y = p.y + (rng() < 0.5 ? -62 : 62);
    const vertical = city.xs.some((rx) => Math.abs(rx - p.x) < 1);
    ped.roadAxis = vertical ? 'y' : 'x';
    ped.roadLine = vertical ? p.x : p.y;
    ped.roadDir = rng() < 0.5 ? -1 : 1;
    state.peds.push(ped);
  }
}

// --- Wanted level -----------------------------------------------------------

export function addWanted(state, amount, reason) {
  const before = state.wanted;
  state.wanted = clamp(state.wanted + amount, 0, WANTED.max);
  state.wantedTimer = 0;
  state.lastCrime = reason || '';
  if (state.wanted > before && state.wanted >= 1) {
    state.events.push({ type: 'siren' });
    if (state.wanted >= 3) state.events.push({ type: 'announce', text: `Wanted level ${state.wanted} — the Solmaris PD is on you!` });
  }
}

export function updateWanted(state, dt) {
  if (state.wanted === 0) return;
  state.wantedTimer += dt;
  // Hide long enough with no fresh crime and the heat cools off, one star at a time.
  if (state.wantedTimer > WANTED.decayDelay) {
    state.wantedTimer = WANTED.decayDelay - WANTED.decayInterval;
    state.wanted = Math.max(0, state.wanted - 1);
    if (state.wanted === 0) {
      state.police = [];
      state.events.push({ type: 'announce', text: 'You lost them. The heat is off — for now.' });
    }
  }
  // Keep police pressure matched to the wanted level.
  const want = Math.min(POLICE.maxCars, state.wanted + 1);
  while (state.police.length < want) {
    const angle = Math.random() * Math.PI * 2;
    const px = clamp(state.player.x + Math.cos(angle) * 620, 60, WORLD.width - 60);
    const py = clamp(state.player.y + Math.sin(angle) * 620, 60, WORLD.height - 60);
    const cop = createCopCar(px, py, angleTo(px, py, state.player.x, state.player.y));
    state.police.push(cop);
  }
}

// --- Traffic ----------------------------------------------------------------

function steerTrafficCar(state, car, dt) {
  const { city, player } = state;
  // Follow the road line, turning at intersections onto a new road sometimes.
  const targetAngle = car.roadAxis === 'y'
    ? (car.roadDir > 0 ? Math.PI / 2 : -Math.PI / 2)
    : (car.roadDir > 0 ? 0 : Math.PI);
  car.angle += clamp(angleDiff(targetAngle, car.angle), -2.4 * dt, 2.4 * dt);

  // Slow down for the car ahead on the same road.
  let slow = false;
  for (const other of state.trafficCars) {
    if (other === car || other.speed <= 0) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const ahead = Math.cos(car.angle) * dx + Math.sin(car.angle) * dy;
    const side = Math.abs(-Math.sin(car.angle) * dx + Math.cos(car.angle) * dy);
    if (ahead > 0 && ahead < 110 && side < 40) { slow = true; break; }
  }
  // And for the player's car if it is right ahead.
  if (player.inCar) {
    const pc = player.inCar;
    const dx = pc.x - car.x;
    const dy = pc.y - car.y;
    const ahead = Math.cos(car.angle) * dx + Math.sin(car.angle) * dy;
    const side = Math.abs(-Math.sin(car.angle) * dx + Math.cos(car.angle) * dy);
    if (ahead > 0 && ahead < 120 && side < 44) slow = true;
  }

  const cruise = slow ? 0 : 120 + (car.cruise || 0);
  if (car.cruise === undefined) car.cruise = 20 + Math.random() * 50;
  car.speed += clamp(cruise - car.speed, -260 * dt, 150 * dt);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;

  // At an intersection, sometimes turn onto the crossing road.
  const onX = city.xs.some((rx) => Math.abs(car.x - rx) < 14);
  const onY = city.ys.some((ry) => Math.abs(car.y - ry) < 14);
  if (onX && onY && Math.random() < 0.004) {
    if (car.roadAxis === 'y') {
      car.roadAxis = 'x';
      car.roadLine = car.y;
      car.roadDir = Math.random() < 0.5 ? -1 : 1;
    } else {
      car.roadAxis = 'y';
      car.roadLine = car.x;
      car.roadDir = Math.random() < 0.5 ? -1 : 1;
    }
  }
  // Drifted off the network (a collision pushed it): snap back to a road.
  if (!onRoad(city, car.x, car.y) && Math.random() < 0.02) {
    const p = nearestRoadPoint(city, car.x, car.y);
    car.x = p.x;
    car.y = p.y;
  }
  // A car that hit a building stops and reverses out.
  if (hitBuilding(city, car.x, car.y, 26)) {
    car.speed = -60;
    car.x -= Math.cos(car.angle) * 30 * dt * 10;
    car.y -= Math.sin(car.angle) * 30 * dt * 10;
  }
}

export function updateTraffic(state, dt) {
  for (const car of state.trafficCars) {
    // The player's car is driven by the player, not by traffic.
    if (state.player.inCar === car) continue;
    // A stolen car with no driver still sits where it was left.
    if (car.driver === 'player-stolen' && car.speed === 0) continue;
    steerTrafficCar(state, car, dt);
  }
  // Light car-to-car separation so traffic does not pile into one heap.
  const cars = state.trafficCars;
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i];
      const b = cars[j];
      const d = dist(a.x, a.y, b.x, b.y);
      if (d > 0.01 && d < 48) {
        const push = (48 - d) / 2;
        const nx = (b.x - a.x) / d;
        const ny = (b.y - a.y) / d;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        a.speed *= 0.9;
        b.speed *= 0.9;
      }
    }
  }
}

// --- Pedestrians ------------------------------------------------------------

export function updatePeds(state, dt) {
  const { city, player } = state;
  const px = player.inCar ? player.inCar.x : player.x;
  const py = player.inCar ? player.inCar.y : player.y;
  for (const ped of state.peds) {
    if (ped.dead) continue;
    ped.walkPhase += dt * 6;
    const dPlayer = dist(ped.x, ped.y, px, py);
    // Gunfire or a speeding car nearby makes pedestrians flee.
    if (state.alarm > 0 && dPlayer < 320) ped.panic = 2.5;
    if (ped.panic > 0) {
      ped.panic -= dt;
      const away = angleTo(px, py, ped.x, ped.y);
      ped.x += Math.cos(away) * 190 * dt;
      ped.y += Math.sin(away) * 190 * dt;
    } else {
      // Stroll along the sidewalk beside the road.
      const step = ped.speed * ped.roadDir * dt;
      if (ped.roadAxis === 'y') ped.y += step;
      else ped.x += step;
      // Turn around at the city edge or after a long stroll.
      if (ped.x < 140 || ped.x > WORLD.width - 140 || ped.y < 140 || ped.y > WORLD.height - 140) {
        ped.roadDir *= -1;
      }
      if (Math.random() < 0.001) ped.roadDir *= -1;
    }
    resolveCollisions(city, ped, 10);
    ped.x = clamp(ped.x, 30, WORLD.width - 30);
    ped.y = clamp(ped.y, 30, WORLD.height - 30);
  }
}

// --- Police -----------------------------------------------------------------

export function updatePolice(state, dt) {
  const { player } = state;
  const px = player.inCar ? player.inCar.x : player.x;
  const py = player.inCar ? player.inCar.y : player.y;
  const playerSpeed = player.inCar ? Math.abs(player.inCar.speed) : 0;

  for (const cop of state.police) {
    const d = dist(cop.x, cop.y, px, py);
    const targetAngle = angleTo(cop.x, cop.y, px, py);
    // Chase steering: turn toward the player, faster when close.
    const turn = clamp(angleDiff(targetAngle, cop.angle), -3.2 * dt, 3.2 * dt);
    cop.angle += turn;
    const wantSpeed = Math.min(620, 300 + state.wanted * 55);
    cop.speed += clamp(wantSpeed - cop.speed, -500 * dt, 320 * dt);
    cop.x += Math.cos(cop.angle) * cop.speed * dt;
    cop.y += Math.sin(cop.angle) * cop.speed * dt;
    if (hitBuilding(state.city, cop.x, cop.y, 26)) {
      cop.speed *= 0.4;
      cop.angle += 0.6;
    }
    // Ram: a hard hit hurts Danny and shakes the car.
    cop.ramTimer -= dt;
    if (d < 58 && cop.ramTimer <= 0) {
      cop.ramTimer = 0.9;
      cop.speed *= 0.45;
      if (player.inCar) {
        player.inCar.health -= POLICE.ramDamage;
        state.events.push({ type: 'crash' });
        if (player.inCar.health <= 0) {
          state.events.push({ type: 'carWrecked' });
        }
      } else {
        hurtPlayer(state, POLICE.ramDamage);
      }
    }
    // Cops shoot when close and the player is on foot or slow.
    cop.shootTimer -= dt;
    if (state.wanted >= 2 && d < POLICE.shootRange && cop.shootTimer <= 0 && (playerSpeed < 220 || !player.inCar)) {
      cop.shootTimer = POLICE.shootCooldown + Math.random() * 0.8;
      state.events.push({ type: 'copShot', from: cop });
      if (Math.random() < 0.45) hurtPlayer(state, 6 + Math.floor(Math.random() * 6));
    }
    // Busted: a cop sits on a slow, cornered Danny on foot.
    if (!player.inCar && d < POLICE.catchRadius && playerSpeed < 60) {
      state.catchTimer += dt;
      if (state.catchTimer > POLICE.catchTime) {
        state.events.push({ type: 'busted' });
      }
    } else {
      state.catchTimer = Math.max(0, state.catchTimer - dt * 2);
    }
  }
  // Despawn cops that fell far behind.
  state.police = state.police.filter((cop) => dist(cop.x, cop.y, px, py) < 1400);
}

export function hurtPlayer(state, amount) {
  const p = state.player;
  if (p.dead || p.hurtTimer > 0) return;
  p.health -= amount;
  p.hurtTimer = 0.5;
  state.events.push({ type: 'hurt' });
  if (p.health <= 0) {
    p.health = 0;
    p.dead = true;
    state.events.push({ type: 'wasted' });
  }
}

// A bullet from the player's pistol: hits peds, cops and traffic cars.
export function fireBullet(state, fromX, fromY, angle) {
  const endX = fromX + Math.cos(angle) * GUN.range;
  const endY = fromY + Math.sin(angle) * GUN.range;
  let best = null;
  let bestT = 1;
  const targets = [];
  for (const ped of state.peds) if (!ped.dead) targets.push({ obj: ped, r: 14, type: 'ped' });
  for (const cop of state.police) targets.push({ obj: cop, r: 30, type: 'cop' });
  for (const car of state.trafficCars) {
    if (state.player.inCar === car) continue;
    targets.push({ obj: car, r: 30, type: 'car' });
  }
  for (const t of targets) {
    // Distance from the target to the bullet segment.
    const dx = t.obj.x - fromX;
    const dy = t.obj.y - fromY;
    const along = dx * Math.cos(angle) + dy * Math.sin(angle);
    if (along < 0 || along > GUN.range) continue;
    const perp = Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle));
    if (perp < t.r && along / GUN.range < bestT) {
      bestT = along / GUN.range;
      best = t;
    }
  }
  const hitX = best ? best.obj.x : endX;
  const hitY = best ? best.obj.y : endY;
  state.tracers.push({ x1: fromX, y1: fromY, x2: hitX, y2: hitY, life: 0.12 });
  if (!best) return;
  if (best.type === 'ped') {
    best.obj.dead = true;
    state.events.push({ type: 'announce', text: 'A pedestrian is down. The cops will hear about this.' });
    addWanted(state, WANTED.shootPed, 'shot a pedestrian');
    if (best.obj.hasCash) {
      state.pickups.push({ x: best.obj.x, y: best.obj.y, kind: 'cash', amount: 40 + Math.floor(Math.random() * 60), life: 25 });
    }
  } else if (best.type === 'cop') {
    best.obj.health -= GUN.damage;
    if (best.obj.health <= 0) {
      state.police = state.police.filter((c) => c !== best.obj);
      state.events.push({ type: 'announce', text: 'You took out a patrol car!' });
      addWanted(state, WANTED.killCop, 'destroyed a police car');
    }
  } else {
    best.obj.health -= GUN.damage;
    best.obj.speed = 0;
    if (best.obj.health <= 0) {
      state.events.push({ type: 'announce', text: 'That car is wrecked.' });
    }
  }
}
