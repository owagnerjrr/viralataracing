// Lossless development-only expansion for Blender, which cannot import Meshopt.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { MeshoptDecoder } from "meshoptimizer";
await MeshoptDecoder.ready;
const dest = resolve(process.argv[2] || "../baseline");
await mkdir(dest, { recursive: true });
for (const name of ["Caramelo", "GatoPreto", "KartRibeirao", "Grove"]) {
  const raw = await readFile(`public/models/${name}.glb`);
  const n = raw.readUInt32LE(12),
    doc = JSON.parse(raw.subarray(20, 20 + n));
  const bin = raw.subarray(28 + n);
  let offset = 0;
  const chunks = [];
  for (const view of doc.bufferViews) {
    const ext = view.extensions?.EXT_meshopt_compression;
    let data;
    if (ext) {
      data = new Uint8Array(ext.count * ext.byteStride);
      MeshoptDecoder.decodeGltfBuffer(
        data,
        ext.count,
        ext.byteStride,
        bin.subarray(ext.byteOffset, ext.byteOffset + ext.byteLength),
        ext.mode,
        ext.filter,
      );
      delete view.extensions.EXT_meshopt_compression;
    } else
      data = bin.subarray(
        view.byteOffset || 0,
        (view.byteOffset || 0) + view.byteLength,
      );
    view.buffer = 0;
    view.byteOffset = offset;
    chunks.push(Buffer.from(data));
    const pad = (4 - (data.length % 4)) % 4;
    chunks.push(Buffer.alloc(pad));
    offset += data.length + pad;
  }
  doc.buffers = [{ byteLength: offset }];
  for (const key of ["extensionsRequired", "extensionsUsed"])
    doc[key] = (doc[key] || []).filter((x) => x !== "EXT_meshopt_compression");
  const j = Buffer.from(JSON.stringify(doc));
  const padded = Buffer.concat([j, Buffer.alloc((4 - (j.length % 4)) % 4, 32)]);
  const h = Buffer.alloc(20);
  h.writeUInt32LE(0x46546c67);
  h.writeUInt32LE(2, 4);
  h.writeUInt32LE(28 + padded.length + offset, 8);
  h.writeUInt32LE(padded.length, 12);
  h.writeUInt32LE(0x4e4f534a, 16);
  const b = Buffer.alloc(8);
  b.writeUInt32LE(offset);
  b.writeUInt32LE(0x004e4942, 4);
  await writeFile(
    resolve(dest, name + ".glb"),
    Buffer.concat([h, padded, b, ...chunks]),
  );
  console.log(name, offset);
}
