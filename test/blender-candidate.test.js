import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";

const clips = [
  "Respirar",
  "Olhar",
  "Dirigir",
  "VirarVolante",
  "Acelerar",
  "Frear",
  "Derrapar",
  "Colisao",
  "Saltar",
  "SegurarItem",
  "Arremessar",
  "Comemorar",
  "TrocarAssento",
];
test("Blender candidate LODs preserve skeleton, animation and open-eye defaults", async () => {
  let previous = Infinity;
  for (const lod of ["high", "medium", "low"]) {
    const b = await readFile(
      new URL(
        `../public/models/candidates/caramelo_${lod}.glb`,
        import.meta.url,
      ),
    );
    const doc = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)));
    assert.ok(
      b.length < previous,
      `${lod} must be smaller than the preceding LOD`,
    );
    previous = b.length;
    const names = new Set(doc.nodes.map((n) => n.name));
    for (const name of [
      "Head",
      "Neck",
      "Jaw",
      "Spine",
      "Ear_L",
      "EarTip_R",
      "Tail",
      "TailMid",
      "TailTip",
      "Paw_L",
      "Paw_R",
    ])
      assert.ok(names.has(name), `${lod}: missing ${name}`);
    for (const name of clips) {
      const c = doc.animations.find((c) => c.name === name);
      assert.ok(c?.channels.length > 0, `${lod}: missing ${name}`);
    }
    const colored = doc.meshes.filter((m) =>
      m.primitives.some((p) => p.attributes.COLOR_0 !== undefined),
    );
    assert.ok(colored.length >= 3, "coat colors must survive GLB export");
    const morphs = doc.meshes.filter((m) =>
      m.extras?.targetNames?.includes("Blink"),
    );
    assert.ok(morphs.length >= 8);
    for (const m of morphs)
      assert.equal(
        m.weights[m.extras.targetNames.indexOf("Blink")],
        0,
        "export must default to open eyes",
      );
    for (const n of doc.nodes) {
      if (n.skin === undefined || n.mesh === undefined) continue;
      for (const p of doc.meshes[n.mesh].primitives) {
        assert.ok(p.attributes.JOINTS_0 !== undefined);
        assert.ok(p.attributes.WEIGHTS_0 !== undefined);
        assert.equal(
          doc.accessors[p.attributes.POSITION].count,
          doc.accessors[p.attributes.WEIGHTS_0].count,
        );
      }
    }
  }
});
