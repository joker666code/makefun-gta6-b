// The story: five missions for Danny Vega, a retired getaway driver pulled back
// in by his old friend Marcus. Each mission is a list of steps; a step is a
// place to reach, a person or thing to collect, or a condition to survive.
// Missions pay cash, raise the wanted level when the story says so, and save.

import { PLACES } from './city.js';
import { WANTED, dist } from './config.js';
import { addWanted } from './traffic.js';

// step types: 'goto' (reach a place), 'enterCar', 'pickup' (reach a ped),
// 'deliver' (reach a place, optionally in a car), 'escape' (lose the wanted
// level), 'survive' (stay alive for N seconds while wanted).
export const MISSIONS = [
  {
    id: 'm1',
    title: 'Back in the Saddle',
    briefing: 'Marcus: "Danny! You still know how to drive? Prove it. Get in a car — any car — and bring it to the Marina. Keys are for tourists."',
    reward: 150,
    steps: [
      { type: 'enterCar', text: 'Steal a car — walk up to one and press E', place: null },
      { type: 'goto', text: 'Drive to the Marina', place: 'marina' },
    ],
  },
  {
    id: 'm2',
    title: 'Cab Fare',
    briefing: 'Marcus: "A fare is waiting at the Taxi Stand on Palm Row. Pick them up, drop them at the Airfield, and don\'t scare them — tip depends on it."',
    reward: 250,
    steps: [
      { type: 'goto', text: 'Go to the Taxi Stand on Palm Row', place: 'taxiStand' },
      { type: 'pickup', text: 'Pick up the passenger (walk up to them)', place: 'taxiStand' },
      { type: 'deliver', text: 'Drive the passenger to the Airfield', place: 'airport', inCar: true },
    ],
  },
  {
    id: 'm3',
    title: 'The Drop',
    briefing: 'Marcus: "Warehouse 9 has a package with your name on it. Grab it, run it to the Old Cannery. The PD got a tip — expect company."',
    reward: 500,
    steps: [
      { type: 'goto', text: 'Go to Warehouse 9', place: 'warehouse' },
      { type: 'pickup', text: 'Grab the package', place: 'warehouse' },
      { type: 'deliver', text: 'Deliver the package to the Old Cannery', place: 'hideout', inCar: false, wantedOnPickup: 2 },
    ],
  },
  {
    id: 'm4',
    title: 'Hot Pursuit',
    briefing: 'Marcus: "They made you, Danny. Three stars and climbing. Lose them — get to the Safehouse on Coral Court and stay out of sight till the heat dies."',
    reward: 400,
    steps: [
      { type: 'survive', text: 'Survive the pursuit — stay alive', seconds: 6, wantedOnStart: 3 },
      { type: 'escape', text: 'Lose the cops, then reach the Safehouse', place: 'safehouse' },
    ],
  },
  {
    id: 'm5',
    title: 'The Solmaris Job',
    briefing: 'Marcus: "One last job, then we\'re out. Hit the Central Bank, grab the cash, and run for the Sunset Pier. If the whole city comes after us — so be it."',
    reward: 1500,
    steps: [
      { type: 'goto', text: 'Go to the Solmaris Central Bank', place: 'bank' },
      { type: 'pickup', text: 'Grab the cash', place: 'bank' },
      { type: 'deliver', text: 'Escape to the Sunset Pier — lose the heat if you can', place: 'pier', wantedOnPickup: 4 },
    ],
  },
];

// v2: side jobs — repeatable fares between named places, for cash between
// story missions. Take one with T, beat the clock and the tip grows with the
// time left. A fare never blocks the story: it just pays.
export const SIDE_JOB_TIME = 50;
export const SIDE_JOB_BASE = 120;

const SIDE_JOB_SPOTS = ['marina', 'taxiStand', 'warehouse', 'bank', 'hideout', 'pier', 'airport', 'safehouse'];

export function startSideJob(state, rng) {
  if (state.sideJob) return false;
  const random = rng || Math.random;
  const from = SIDE_JOB_SPOTS[Math.floor(random() * SIDE_JOB_SPOTS.length)];
  let to = SIDE_JOB_SPOTS[Math.floor(random() * SIDE_JOB_SPOTS.length)];
  if (to === from) to = 'airport';
  state.sideJob = {
    from,
    to,
    pickedUp: false,
    timeLeft: SIDE_JOB_TIME,
    reward: SIDE_JOB_BASE,
  };
  state.events.push({ type: 'announce', text: `Side job: pick up a fare at ${PLACES[from].name} — ${SIDE_JOB_TIME}s on the clock.` });
  return true;
}

export function sideJobTarget(state) {
  if (!state.sideJob) return null;
  return PLACES[state.sideJob.pickedUp ? state.sideJob.to : state.sideJob.from] || null;
}

export function updateSideJob(state, dt) {
  const job = state.sideJob;
  if (!job) return;
  job.timeLeft -= dt;
  if (job.timeLeft <= 0) {
    state.sideJob = null;
    state.events.push({ type: 'announce', text: 'Side job expired — the fare found another driver.' });
    return;
  }
  const p = state.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const py = p.inCar ? p.inCar.y : p.y;
  const target = PLACES[job.pickedUp ? job.to : job.from];
  if (!target) return;
  if (dist(px, py, target.x, target.y) < 90) {
    if (!job.pickedUp) {
      job.pickedUp = true;
      state.events.push({ type: 'announce', text: `Fare aboard — take them to ${PLACES[job.to].name} before the clock runs out.` });
    } else {
      const tip = Math.round(job.timeLeft * 2);
      const pay = job.reward + tip;
      state.money += pay;
      state.stats.sideJobsDone += 1;
      state.stats.totalEarned += pay;
      state.sideJob = null;
      state.events.push({ type: 'missionDone', mission: { title: 'Side Job', reward: pay } });
      state.events.push({ type: 'announce', text: `Fare delivered: $${pay} ($${job.reward} + $${tip} tip). Press T for another.` });
    }
  }
}

export function missionTitle(state) {
  const m = MISSIONS[state.missionIndex];
  return m ? m.title : 'Free Roam';
}

export function currentStep(state) {
  const m = MISSIONS[state.missionIndex];
  if (!m) return null;
  return m.steps[state.missionStep] || null;
}

export function currentObjectiveText(state) {
  if (state.missionIndex >= MISSIONS.length) return 'Free roam — Solmaris is yours. Earn cash, dodge the PD.';
  const step = currentStep(state);
  const m = MISSIONS[state.missionIndex];
  if (!step) return m.title;
  return `${m.title}: ${step.text}`;
}

export function startMission(state, index) {
  const m = MISSIONS[index];
  if (!m) return;
  state.missionIndex = index;
  state.missionStep = 0;
  state.missionTimer = 0;
  state.missionPassenger = null;
  state.missionPackage = false;
  state.events.push({ type: 'announce', text: `${m.title} — ${m.briefing}` });
  state.events.push({ type: 'missionStart', mission: m });
  const step = m.steps[0];
  if (step && step.wantedOnStart) addWanted(state, step.wantedOnStart, 'mission heat');
}

// Where the current objective points on the map (null when there is none).
export function objectiveTarget(state) {
  const step = currentStep(state);
  if (!step || !step.place) return null;
  return PLACES[step.place] || null;
}

function advanceStep(state) {
  const m = MISSIONS[state.missionIndex];
  state.missionStep += 1;
  state.missionTimer = 0;
  if (state.missionStep >= m.steps.length) {
    completeMission(state);
    return;
  }
  const step = m.steps[state.missionStep];
  if (step && step.wantedOnStart) addWanted(state, step.wantedOnStart, 'mission heat');
  state.events.push({ type: 'announce', text: step.text });
}

function completeMission(state) {
  const m = MISSIONS[state.missionIndex];
  state.money += m.reward;
  state.completedMissions.push(m.id);
  state.events.push({ type: 'missionDone', mission: m });
  state.events.push({ type: 'announce', text: `Mission complete: ${m.title} — $${m.reward} earned.` });
  state.missionIndex += 1;
  state.missionStep = 0;
  state.missionTimer = 0;
  state.missionPassenger = null;
  state.missionPackage = false;
  if (state.missionIndex >= MISSIONS.length) {
    state.events.push({ type: 'announce', text: 'You did it — the Solmaris Job is done. The city is yours, Danny.' });
    state.events.push({ type: 'gameWon' });
  } else {
    const next = MISSIONS[state.missionIndex];
    state.events.push({ type: 'announce', text: `Next: ${next.title}. ${next.briefing}` });
  }
}

// Spawn a mission pedestrian (passenger / contact) near a place.
export function spawnMissionPed(state, place, label) {
  const p = PLACES[place];
  const ped = {
    kind: 'ped', x: p.x + 40, y: p.y + 30,
    angle: 0, speed: 0, shirt: '#f2d234', roadAxis: 'x', roadLine: p.y,
    roadDir: 1, panic: 0, walkPhase: 0, dead: false, hasCash: false,
    mission: true, label: label || 'Contact',
  };
  state.peds.push(ped);
  state.missionPassenger = ped;
  return ped;
}

export function updateMissions(state, dt) {
  const m = MISSIONS[state.missionIndex];
  if (!m) return;
  const step = currentStep(state);
  if (!step) return;
  const p = state.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const py = p.inCar ? p.inCar.y : p.y;
  state.missionTimer += dt;

  if (step.type === 'enterCar') {
    if (p.inCar) advanceStep(state);
    return;
  }
  if (step.type === 'goto' || step.type === 'deliver') {
    const target = PLACES[step.place];
    if (!target) { advanceStep(state); return; }
    if (step.inCar && !p.inCar) return; // deliver steps that need a car wait for one
    if (dist(px, py, target.x, target.y) < 90) {
      if (step.wantedOnPickup) addWanted(state, step.wantedOnPickup, 'mission heat');
      advanceStep(state);
    }
    return;
  }
  if (step.type === 'pickup') {
    // First time we enter this step, make sure the contact exists.
    if (!state.missionPassenger) {
      spawnMissionPed(state, step.place, m.id === 'm2' ? 'Fare' : m.id === 'm5' ? 'Bank Cash' : 'Package');
    }
    const ped = state.missionPassenger;
    if (ped && !ped.dead && dist(px, py, ped.x, ped.y) < 60) {
      state.peds = state.peds.filter((q) => q !== ped);
      state.missionPassenger = null;
      state.missionPackage = true;
      state.events.push({ type: 'pickup' });
      if (step.wantedOnPickup) addWanted(state, step.wantedOnPickup, 'mission heat');
      advanceStep(state);
    }
    return;
  }
  if (step.type === 'survive') {
    if (state.missionTimer >= (step.seconds || 5)) advanceStep(state);
    return;
  }
  if (step.type === 'escape') {
    if (state.wanted === 0) {
      const target = PLACES[step.place];
      if (target && dist(px, py, target.x, target.y) < 100) advanceStep(state);
    }
    return;
  }
}
