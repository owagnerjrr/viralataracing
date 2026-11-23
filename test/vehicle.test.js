import { test } from "node:test";
import assert from "node:assert/strict";
import { Vector3 } from "three";
import { ArcadeVehicle, PHYSICS_STEP } from "../src/vehicle.js";
import { moveKart, rectangle } from "../src/collisions.js";

const input = {
  heading: 0,
  speed: 0,
  turn: 0,
  throttle: false,
  brake: false,
  surface: "road",
  drifting: false,
  driftSide: 0,
  air: false,
  boostedSpeed: 0,
  stunned: false,
};

function simulate(vehicle, initial, steps) {
  let state = { ...input, ...initial };
  for (let i = 0; i < steps; i++) {
    Object.assign(state, vehicle.step(PHYSICS_STEP, state));
  }
  return state;
}

test("throttle, brake and reverse transition through zero", () => {
  const vehicle = new ArcadeVehicle();
  const moving = simulate(vehicle, { throttle: true }, 110);
  assert.ok(moving.speed > 15 && moving.speed < 27);
  const braking = simulate(
    vehicle,
    { ...moving, throttle: false, brake: true },
    32,
  );
  assert.ok(braking.speed > 0 && braking.speed < moving.speed);
  const reverse = simulate(vehicle, { ...braking }, 180);
  assert.equal(reverse.speed, -9);
});

test("boost speed remains distinct and grass slows down progressively", () => {
  for (const limit of [31.05, 33.75, 37.8, 38]) {
    const vehicle = new ArcadeVehicle();
    const fast = simulate(
      vehicle,
      { speed: 27, throttle: true, boostedSpeed: limit },
      130,
    );
    assert.ok(Math.abs(fast.speed - limit) < 1e-8);
    const enterGrass = simulate(vehicle, { ...fast, surface: "grass" }, 1);
    assert.ok(enterGrass.speed > 13 && enterGrass.speed < fast.speed);
    assert.ok(simulate(vehicle, enterGrass, 120).speed < 13.02);
  }
});

test("drift keeps lateral momentum on exit and asphalt grip settles it", () => {
  const vehicle = new ArcadeVehicle();
  const drifting = simulate(
    vehicle,
    { speed: 18, throttle: true, turn: 1, drifting: true, driftSide: 1 },
    60,
  );
  const lateral = vehicle.lateral;
  assert.ok(lateral > 3 && drifting.heading < 0);
  const exiting = simulate(
    vehicle,
    { ...drifting, drifting: false, turn: 0 },
    1,
  );
  assert.ok(vehicle.lateral > 2);
  simulate(vehicle, exiting, 90);
  assert.ok(Math.abs(vehicle.lateral) < 0.02);
});

test("wall response removes inward speed while retaining tangential motion", () => {
  const vehicle = new ArcadeVehicle();
  const wall = rectangle(2.3, 0, 0.5, 40, 0, 3);
  const position = new Vector3(0.85, 0, 0);
  const next = vehicle.step(PHYSICS_STEP, {
    ...input,
    speed: 27,
    heading: Math.PI / 4,
  });
  const impact = moveKart(position, vehicle.motion, next.heading, 0, 0.07, [
    wall,
  ]);
  vehicle.resolveContact(impact);
  assert.ok(impact > 10);
  assert.ok(vehicle.motion.x < 1);
  assert.ok(vehicle.motion.z > 10);
});

test("landing compresses the damped suspension and settles", () => {
  const vehicle = new ArcadeVehicle();
  vehicle.touchDown(-6);
  simulate(vehicle, {}, 10);
  assert.ok(vehicle.heave < -0.04);
  simulate(vehicle, {}, 160);
  assert.ok(Math.abs(vehicle.heave) < 0.001);
});
