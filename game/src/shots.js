// The screenshot scenes behind ?shot=start|chase|mission|night.
// Each one stages a real game state (real city, real traffic, real police)
// and then lets the normal loop run, so the frame is what playing looks like
// and the same seed always gives the same frame.

import { PLACES } from './city.js';
import { createCar } from './entities.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { spawnMissionPed, startMission } from './missions.js';
import { addWanted } from './traffic.js';

export function stageShot(name, state) {
  const p = state.player;
  if (name === 'start') {
    // Title screen over a busy street: Danny on foot near the marina.
    p.x = 610;
    p.y = 1040;
    p.inCar = null;
    state.night = false;
    state.wanted = 0;
    return { screen: SCREEN_TITLE };
  }
  if (name === 'chase') {
    // Danny fleeing in a sports car down Palm Row, two patrol cars behind, 3 stars.
    const car = state.trafficCars.find((c) => c.carKind === 'sedan') || createCar(1470, 610, 0, 'sedan');
    car.x = 1470;
    car.y = 610;
    car.angle = 0;
    car.speed = 420;
    car.color = '#c94f43';
    p.inCar = car;
    p.x = car.x;
    p.y = car.y;
    state.night = false;
    state.wanted = 3;
    state.wantedTimer = 0;
    state.money = 1250;
    // Two cops in pursuit right behind.
    const cop1 = createCar(1290, 610, 0, 'police');
    const cop2 = createCar(1230, 640, 0, 'police');
    cop1.speed = 460;
    cop2.speed = 440;
    state.police = [cop1, cop2];
    state.missionIndex = 3;
    state.missionStep = 0;
    state.announceText = 'Hot Pursuit — lose the cops and reach the Safehouse!';
    return { screen: SCREEN_PLAY };
  }
  if (name === 'mission') {
    // Mission 3 in progress: Danny on foot at Warehouse 9, package marker ahead.
    p.x = PLACES.warehouse.x - 120;
    p.y = PLACES.warehouse.y;
    p.inCar = null;
    state.night = false;
    state.wanted = 0;
    state.money = 640;
    state.missionIndex = 2;
    state.missionStep = 1;
    state.missionPassenger = null;
    spawnMissionPed(state, 'warehouse', 'Package');
    state.announceText = 'The Drop — grab the package at Warehouse 9.';
    return { screen: SCREEN_PLAY };
  }
  if (name === 'night') {
    // Night in the city: Danny driving through downtown, lit windows, headlights.
    const car = state.trafficCars.find((c) => c.carKind === 'sedan') || createCar(2320, 1040, Math.PI / 2, 'sedan');
    car.x = 2320;
    car.y = 1040;
    car.angle = Math.PI / 2;
    car.speed = 300;
    car.color = '#4a7fb5';
    p.inCar = car;
    p.x = car.x;
    p.y = car.y;
    state.night = true;
    state.wanted = 1;
    state.wantedTimer = 0;
    state.money = 890;
    state.missionIndex = 1;
    state.missionStep = 2;
    state.announceText = 'Cab Fare — drive the passenger to the Airfield.';
    return { screen: SCREEN_PLAY };
  }
  return { screen: SCREEN_TITLE };
}
