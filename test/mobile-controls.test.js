import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PointerCommands,
  defaultMobileSettings,
  normalizeMobileSettings,
} from "../src/mobile-controls.js";

test("direction, drift and throttle remain independent when one finger is released", () => {
  const commands = new PointerCommands();
  commands.set(11, "ArrowLeft");
  commands.set(12, "Space");
  commands.set(13, "ArrowUp");
  assert.equal(commands.release(12), "Space");
  assert.equal(commands.held("Space"), false);
  assert.equal(commands.held("ArrowLeft"), true);
  assert.equal(commands.held("ArrowUp"), true);
});

test("sliding one steering finger can countersteer without ending the drift", () => {
  const commands = new PointerCommands();
  commands.set(1, "ArrowRight");
  commands.set(2, "Space");
  commands.set(1, "ArrowLeft");
  assert.equal(commands.held("ArrowRight"), false);
  assert.equal(commands.held("ArrowLeft"), true);
  assert.equal(commands.held("Space"), true);
});

test("duplicate contacts do not clear a held command or survive a pause", () => {
  const commands = new PointerCommands();
  commands.set(1, "Space");
  commands.set(1, "Space");
  commands.set(2, "Space");
  commands.release(1);
  assert.equal(commands.held("Space"), true);
  commands.clear();
  assert.equal(commands.release(2), undefined);
  assert.equal(commands.held("Space"), false);
});

test("restored preferences stay bounded and tolerate corrupted storage", () => {
  assert.deepEqual(normalizeMobileSettings(null), defaultMobileSettings);
  assert.deepEqual(
    normalizeMobileSettings({
      size: 999,
      opacity: -30,
      auto: true,
      inverted: "true",
    }),
    { size: 125, opacity: 30, auto: true, inverted: false },
  );
});
