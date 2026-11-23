import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { MeshoptEncoder } from "meshoptimizer";

const inputDir = process.argv[2];
if (!inputDir)
  throw new Error("Passe a pasta dos GLBs exportados pelo estúdio.");
const outputDir = fileURLToPath(new URL("../public/models/", import.meta.url));
const key = "EXT_meshopt_compression";
const bytesPerComponent = {
  5120: 1,
  5121: 1,
  5122: 2,
  5123: 2,
  5125: 4,
  5126: 4,
};
const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

await MeshoptEncoder.ready;
for (const name of ["Caramelo", "GatoPreto", "KartRibeirao", "Grove"]) {
  const file = name + ".glb";
  const original = await readFile(resolve(inputDir, file));
  const jsonSize = original.readUInt32LE(12);
  const scene = JSON.parse(original.subarray(20, 20 + jsonSize));
  const data = original.subarray(28 + jsonSize);
  const payloads = [];
  let size = 0,
    fallbackSize = 0;
  function append(bytes) {
    const offset = size;
    const padded = (bytes.length + 3) & ~3;
    payloads.push(Buffer.from(bytes));
    if (padded > bytes.length)
      payloads.push(Buffer.alloc(padded - bytes.length));
    size += padded;
    return offset;
  }

  for (const [id, view] of scene.bufferViews.entries()) {
    const start = view.byteOffset ?? 0;
    const bytes = data.subarray(start, start + view.byteLength);
    const accessors = scene.accessors.filter(
      (accessor) => accessor.bufferView === id,
    );
    const [accessor] = accessors;
    const stride =
      view.byteStride ??
      (accessor &&
        components[accessor.type] * bytesPerComponent[accessor.componentType]);
    if (
      accessors.length === 1 &&
      view.target === 34962 &&
      stride % 4 === 0 &&
      stride <= 256 &&
      accessor.count * stride === bytes.length &&
      (accessor.byteOffset ?? 0) === 0
    ) {
      // Compress bytes without quantization, preserving authored transforms and animated mesh nodes.
      const compressed = MeshoptEncoder.encodeGltfBuffer(
        bytes,
        accessor.count,
        stride,
        "ATTRIBUTES",
        0,
      );
      if (compressed.length < bytes.length) {
        view.extensions = {
          ...view.extensions,
          [key]: {
            buffer: 0,
            byteOffset: append(compressed),
            byteLength: compressed.length,
            byteStride: stride,
            count: accessor.count,
            mode: "ATTRIBUTES",
          },
        };
        view.buffer = 1;
        view.byteOffset = fallbackSize;
        fallbackSize += (view.byteLength + 3) & ~3;
        continue;
      }
    }
    view.byteOffset = append(bytes);
  }

  scene.buffers = [{ byteLength: size }];
  if (fallbackSize) {
    scene.buffers.push({
      byteLength: fallbackSize,
      extensions: { [key]: { fallback: true } },
    });
    scene.extensionsRequired = [
      ...new Set([...(scene.extensionsRequired ?? []), key]),
    ];
    scene.extensionsUsed = [...new Set([...(scene.extensionsUsed ?? []), key])];
  }
  const raw = Buffer.from(JSON.stringify(scene));
  const padded = Buffer.concat([
    raw,
    Buffer.alloc((4 - (raw.length % 4)) % 4, 32),
  ]);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + padded.length + size, 8);
  header.writeUInt32LE(padded.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(size, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);
  await writeFile(
    resolve(outputDir, file),
    Buffer.concat([header, padded, binHeader, ...payloads]),
  );
  console.log(file, original.length, "→", 28 + padded.length + size);
}
