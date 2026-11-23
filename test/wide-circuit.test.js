import assert from "node:assert/strict";
import { test } from "node:test";
import { AdaptiveQuality } from "../src/graphics-quality.js";
import {
  centerline,
  ROAD_WIDTH,
  START_PROGRESS,
  startingGrid,
  surfaceAt,
} from "../src/course.js";
import { KART_SCALE } from "../src/collisions.js";

test("width and starting grid leave room for twelve karts", () => {
  assert.ok(Math.abs(ROAD_WIDTH - 35.2) < 1e-6);
  const rows = startingGrid();
  assert.equal(rows.length, 12);
  assert.equal(new Set(rows.map((slot) => slot.progress)).size, 4);
  assert.ok(Math.abs(rows[0].progress - START_PROGRESS) < 1e-9);
  assert.ok(
    Math.max(...rows.map((slot) => Math.abs(slot.offset))) + 2 * KART_SCALE <
      ROAD_WIDTH / 2,
  );
  const length = centerline.getLength();
  assert.ok(
    Math.abs((rows[0].progress - rows[3].progress) * length - 5.6) < 1e-5,
  );
});

test("both river crossings and the dirt section remain in a closed circuit", () => {
  const samples = centerline.getSpacedPoints(600).slice(0, -1).map(surfaceAt);
  let bridges = 0;
  for (let i = 0; i < samples.length; i++) {
    if (
      samples[i] === 1 &&
      samples[(i + samples.length - 1) % samples.length] !== 1
    )
      bridges++;
  }
  assert.equal(bridges, 2);
  assert.ok(samples.includes(2));
});

test("adaptive quality avoids downgrading on a single slow frame", () => {
  const monitor = new AdaptiveQuality("medium", "medium");
  assert.equal(monitor.sample(0.22), undefined);
  for (let i = 0; i < 60; i++) monitor.sample(1 / 60);
  assert.equal(monitor.level, 1);
});

test("sustained slow frames reduce quality, sustained fast frames restore it", () => {
  const monitor = new AdaptiveQuality("medium", "medium");
  const stages = [];
  for (let i = 0; i < 100; i++) stages.push(monitor.sample(1 / 18));
  for (let i = 0; i < 660; i++) stages.push(monitor.sample(1 / 60));
  assert.deepEqual(stages.filter(Boolean), ["low", "medium"]);
});
