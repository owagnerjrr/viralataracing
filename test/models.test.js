import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";

async function glb(name) {
  const bytes = await readFile(
    new URL("../public/models/" + name + ".glb", import.meta.url),
  );
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a);
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
  assert.ok(json.extensionsRequired.includes("EXT_meshopt_compression"));
  return json;
}

for (const name of ["Caramelo", "GatoPreto"]) {
  test(
    name + " preserves the facial rig, tail skin and breathing clip",
    async () => {
      const asset = await glb(
        name === "Caramelo" ? "caramelo_final" : "gato_preto_final",
      );
      const named = new Map(asset.nodes.map((node) => [node.name, node]));
      for (const name of [
        "Jaw",
        "Eye0",
        "Gaze1",
        "Lid0",
        "Lid1",
        "Paw0",
        "SeamlessArm0",
        "SeamlessArm1",
        "Smile",
        "TailFlex",
        "ScarfFlex",
        "EarFlex00",
        "EarFlex11",
      ]) {
        assert.ok(named.has(name), name);
      }
      assert.equal(asset.skins[named.get("TailFlex").skin].joints.length, 2);
      assert.equal(
        asset.skins[named.get("SeamlessArm0").skin].joints.length,
        3,
      );
      assert.equal(
        asset.skins[named.get("SeamlessArm1").skin].joints.length,
        3,
      );
      if (name === "Caramelo") assert.ok(named.has("BandanaPatinha"));
      assert.ok(
        asset.meshes[named.get("Lid0").mesh].primitives[0].targets.length,
      );
      assert.ok(
        asset.meshes[named.get("ScarfFlex").mesh].primitives[0].targets.length,
      );
      assert.ok(
        asset.animations.some(
          (clip) => clip.name === "Respirar" && clip.channels.length >= 3,
        ),
      );
    },
  );
}

test("the kart has four wheel rigs, springs, a brake material and glow anchors", async () => {
  const asset = await glb("kart_duplo_final");
  const names = new Set(asset.nodes.map((node) => node.name));
  for (const name of [
    "Body",
    "SteeringWheel",
    "Wheel0",
    "Wheel1",
    "Wheel2",
    "Wheel3",
    "Spring0",
    "Spring3",
    "ExhaustGlow0",
    "ExhaustGlow1",
  ]) {
    assert.ok(names.has(name), name);
  }
  assert.ok(asset.materials.some((material) => material.name === "BrakeLamp"));
});

test("vegetation includes trees, shrub and flowering mesh", async () => {
  const asset = await glb("Grove");
  const names = new Set(asset.nodes.map((node) => node.name));
  for (const name of ["Tree0", "Tree1", "Tree2", "Shrub", "Flowers"])
    assert.ok(names.has(name), name);
});
