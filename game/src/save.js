// Save and load through localStorage: money, story progress, health, ammo and
// where Danny is standing. A missing or corrupt save is just a fresh start.
// v2: the save also keeps the clock and lifetime stats (total earned, cars
// stolen, side jobs done), so a returning player keeps their record.

import { SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return {
      money: typeof data.money === 'number' ? data.money : 0,
      missionIndex: typeof data.missionIndex === 'number' ? data.missionIndex : 0,
      health: typeof data.health === 'number' ? data.health : 100,
      ammo: typeof data.ammo === 'number' ? data.ammo : 48,
      x: typeof data.x === 'number' ? data.x : null,
      y: typeof data.y === 'number' ? data.y : null,
      completed: Array.isArray(data.completed) ? data.completed : [],
      clock: typeof data.clock === 'number' ? data.clock : 0.15,
      stats: {
        totalEarned: typeof data.stats?.totalEarned === 'number' ? data.stats.totalEarned : 0,
        carsStolen: typeof data.stats?.carsStolen === 'number' ? data.stats.carsStolen : 0,
        sideJobsDone: typeof data.stats?.sideJobsDone === 'number' ? data.stats.sideJobsDone : 0,
      },
    };
  } catch {
    return null;
  }
}

export function writeSave(state) {
  try {
    const data = {
      money: Math.round(state.money),
      missionIndex: state.missionIndex,
      health: Math.round(state.player.health),
      ammo: state.player.ammo,
      x: Math.round(state.player.x),
      y: Math.round(state.player.y),
      completed: state.completedMissions,
      clock: state.clock,
      stats: state.stats,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage can be off: nothing to clear then.
  }
}
