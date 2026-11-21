// The screenshot scenes behind ?shot=start|chase|coast|night|win.
// Each one stages a real game state (real city, real traffic, real police)
// and then lets the normal loop run, so the frame is what playing looks like
// and the same seed always gives the same frame.

import { createCar } from './entities.js';
import { SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

export function stageShot(name, state) {
  const p = state.player;
  if (name === 'start') {
    // Title screen over a busy street: Danny on foot near the marina.
    p.x = 610;
    p.y = 1040;
    p.inCar = null;
    state.night = false;
    state.clock = 0.2;
    state.timeOfDay = 'day';
    state.wanted = 0;
    return { screen: SCREEN_TITLE };
  }
  if (name === 'chase') {
    // v2: sunset pursuit — Danny fleeing in a sports car on nitro down Palm
    // Row, two patrol cars behind, 3 stars, the sky going orange.
    const car = state.trafficCars.find((c) => c.carKind === 'sports') || createCar(1470, 610, 0, 'sports');
    if (!state.trafficCars.includes(car)) state.trafficCars.push(car);
    car.x = 1470;
    car.y = 610;
    car.angle = 0;
    car.visualAngle = 0; // v2 visual: the eased body angle must match the staged heading.
    car.speed = 620;
    car.color = '#c94f43';
    car.nitroActive = true;
    p.inCar = car;
    p.x = car.x;
    p.y = car.y;
    state.night = false;
    state.clock = 0.62;
    state.timeOfDay = 'sunset';
    state.wanted = 3;
    state.wantedTimer = 0;
    state.money = 1250;
    state.nitro = 62;
    // Two cops in pursuit right behind.
    const cop1 = createCar(1290, 610, 0, 'police');
    const cop2 = createCar(1230, 640, 0, 'police');
    cop1.speed = 460;
    cop2.speed = 440;
    state.police = [cop1, cop2];
    state.missionIndex = 3;
    state.missionStep = 0;
    // v2 visual: the getaway already laid down a drift arc behind the car.
    state.skidMarks = [
      { x1: 1380, y1: 636, x2: 1420, y2: 622, life: 6, maxLife: 6 },
      { x1: 1420, y1: 622, x2: 1450, y2: 612, life: 6, maxLife: 6 },
      { x1: 1380, y1: 648, x2: 1420, y2: 640, life: 6, maxLife: 6 },
    ];
    state.announceText = 'Hot Pursuit — lose the cops and reach the Safehouse!';
    return { screen: SCREEN_PLAY };
  }
  if (name === 'coast') {
    // v4: the coast in the frame — Danny cruising the beach road at sunset
    // in an orange sports car, the Sunset Pier marker waiting up the road,
    // umbrellas on the sand and the ocean shimmering down the left edge.
    // This is the final mission's escape run, so the frame also shows the
    // story reaching the pier.
    const car = state.trafficCars.find((c) => c.carKind === 'sports') || createCar(180, 860, -Math.PI / 2, 'sports');
    if (!state.trafficCars.includes(car)) state.trafficCars.push(car);
    car.x = 180;
    car.y = 860;
    car.angle = -Math.PI / 2;
    car.visualAngle = -Math.PI / 2; // v2 visual: the eased body angle must match the staged heading.
    car.speed = 320;
    car.color = '#e07a3a';
    car.braking = false;
    p.inCar = car;
    p.x = car.x;
    p.y = car.y;
    state.night = false;
    state.clock = 0.62;
    state.timeOfDay = 'sunset';
    state.wanted = 0;
    state.money = 2150;
    state.nitro = 80;
    state.missionIndex = 4;
    state.missionStep = 2;
    state.announceText = 'The Solmaris Job — run for the Sunset Pier!';
    return { screen: SCREEN_PLAY };
  }
  if (name === 'win') {
    // v4: the end screen staged as a scene — all five missions done, Danny
    // back at the pier at sunset with the take counted. v5: this is shot 1
    // in shots.json now (it replaces the title screen, whose info the HUD
    // on the other three shots already carries).
    p.x = 180;
    p.y = 583;
    p.inCar = null;
    state.night = false;
    state.clock = 0.62;
    state.timeOfDay = 'sunset';
    state.wanted = 0;
    state.money = 3240;
    state.missionIndex = 5;
    state.missionStep = 0;
    state.completedMissions = ['m1', 'm2', 'm3', 'm4', 'm5'];
    state.stats = { totalEarned: 3240, carsStolen: 7, sideJobsDone: 3 };
    state.announceText = '';
    return { screen: SCREEN_WIN };
  }
  if (name === 'night') {
    // Night in the city: Danny driving through downtown, lit windows, headlights.
    const car = state.trafficCars.find((c) => c.carKind === 'sedan') || createCar(2320, 1040, Math.PI / 2, 'sedan');
    if (!state.trafficCars.includes(car)) state.trafficCars.push(car);
    car.x = 2320;
    car.y = 1040;
    car.angle = Math.PI / 2;
    car.visualAngle = Math.PI / 2; // v2 visual: same — match the staged heading.
    car.speed = 300;
    car.color = '#4a7fb5';
    // v5: the night shot is a braking close-up — the tail lights flare and
    // the red bloom pools on the wet asphalt behind the car, so the brake
    // light is the focal point of the rainy frame. (Shot mode never steps
    // the simulation, so driveCar never overwrites this staged braking.)
    car.braking = true;
    p.inCar = car;
    p.x = car.x;
    p.y = car.y;
    state.night = true;
    state.clock = 0.8;
    state.timeOfDay = 'night';
    // v2 visual: the night shot is a rainy one — streaks, halos, reflections.
    state.rain = 0.55;
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
