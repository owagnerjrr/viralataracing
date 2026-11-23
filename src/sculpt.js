import * as THREE from "three";
import { loft, paintTexture } from "./art.js";

function coatMaps(dark) {
  const height = new Float32Array(256 * 256);
  const tone = paintTexture(256, (ctx, size) => {
    ctx.fillStyle = dark ? "#c7c8d0" : "#e9c092";
    ctx.fillRect(0, 0, size, size);
    let seed = 72431;
    const random = () =>
      (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
    for (let i = 0; i < 10500; i++) {
      const x = random() * 256,
        y = random() * 256;
      const length = 2 + random() * 10;
      const bend = random() * 3 - 1.1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + bend,
        y + length * 0.58,
        x + bend * 1.15,
        y + length,
      );
      ctx.lineWidth = 0.55 + random() * 0.8;
      ctx.strokeStyle = i % 3 ? "rgba(255,240,226,.24)" : "rgba(39,23,15,.22)";
      ctx.stroke();
      for (let j = 0; j < length; j++) {
        const index =
          ((Math.floor(y + j) & 255) << 8) +
          (Math.floor(x + (bend * j) / length) & 255);
        height[index] += Math.sin((j * Math.PI) / length) * 0.44;
      }
    }
  });
  const normal = paintTexture(256, (ctx, size) => {
    const bitmap = ctx.createImageData(size, size);
    const at = (x, y) => height[((y & 255) << 8) + (x & 255)];
    const n = new THREE.Vector3();
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const index = (y * size + x) * 4;
        n.set(
          (at(x - 1, y) - at(x + 1, y)) * 1.55,
          (at(x, y + 1) - at(x, y - 1)) * 1.55,
          1,
        ).normalize();
        bitmap.data.set(
          [n.x * 127 + 128, n.y * 127 + 128, n.z * 127 + 128, 255],
          index,
        );
      }
    ctx.putImageData(bitmap, 0, 0);
  });
  normal.colorSpace = THREE.NoColorSpace;
  for (const map of [tone, normal])
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return { map: tone, normalMap: normal };
}

export function coatPalette(isCat) {
  const maps = coatMaps(isCat);
  const material = (color, strength = 0.46) =>
    new THREE.MeshPhysicalMaterial({
      ...maps,
      color,
      roughness: 0.83,
      sheen: 0.88,
      sheenRoughness: 0.62,
      sheenColor: new THREE.Color(isCat ? 0x435674 : 0xb87845),
      normalScale: new THREE.Vector2(strength, strength),
    });
  return isCat
    ? {
        base: material(0x343745),
        light: material(0x505669),
        shade: material(0x282939),
        inner: material(0xb77279, 0.35),
      }
    : {
        base: material(0xce8748),
        light: material(0xffe2b8),
        shade: material(0x925028),
        inner: material(0xc48172, 0.38),
      };
}

const corners = [
  [0, 0, 0],
  [1, 0, 0],
  [1, 1, 0],
  [0, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [1, 1, 1],
  [0, 1, 1],
];
const tetrahedra = [
  [0, 5, 1, 6],
  [0, 1, 2, 6],
  [0, 2, 3, 6],
  [0, 3, 7, 6],
  [0, 7, 4, 6],
  [0, 4, 5, 6],
];

function organicSurface(lobes, bounds, resolution = 31) {
  const [lower, upper] = bounds;
  const field = (x, y, z) => {
    let result = Infinity;
    for (const [cx, cy, cz, sx, sy, sz, softness] of lobes) {
      const distance =
        (Math.hypot((x - cx) / sx, (y - cy) / sy, (z - cz) / sz) - 1) *
        Math.min(sx, sy, sz);
      const blend =
        Math.max(softness - Math.abs(result - distance), 0) / softness;
      result = Math.min(result, distance) - blend * blend * softness * 0.25;
    }
    return result;
  };
  const step = lower.map((value, i) => (upper[i] - value) / resolution);
  const side = resolution + 1;
  const values = new Float32Array(side ** 3);
  const points = new Float32Array(values.length * 3);
  for (let z = 0; z < side; z++)
    for (let y = 0; y < side; y++)
      for (let x = 0; x < side; x++) {
        const id = x + y * side + z * side ** 2;
        const px = lower[0] + x * step[0],
          py = lower[1] + y * step[1],
          pz = lower[2] + z * step[2];
        points.set([px, py, pz], id * 3);
        values[id] = field(px, py, pz);
      }

  const positions = [],
    normals = [],
    indices = [],
    texture = [];
  const edges = new Map();
  const offsets = corners.map(([x, y, z]) => x + y * side + z * side ** 2);
  function crossing(a, b) {
    const key = Math.min(a, b) * values.length + Math.max(a, b);
    if (edges.has(key)) return edges.get(key);
    const t = values[a] / (values[a] - values[b]);
    const [x, y, z] = [0, 1, 2].map((i) =>
      THREE.MathUtils.lerp(points[a * 3 + i], points[b * 3 + i], t),
    );
    const e = 0.003;
    const normal = new THREE.Vector3(
      field(x + e, y, z) - field(x - e, y, z),
      field(x, y + e, z) - field(x, y - e, z),
      field(x, y, z + e) - field(x, y, z - e),
    ).normalize();
    const idx = positions.length / 3;
    positions.push(x, y, z);
    normals.push(normal.x, normal.y, normal.z);
    texture.push(
      0.5 + Math.atan2(x, z) / (2 * Math.PI),
      (y - lower[1]) / (upper[1] - lower[1]),
    );
    edges.set(key, idx);
    return idx;
  }
  function triangle(a, b, c) {
    const x = positions[b * 3] - positions[a * 3],
      y = positions[b * 3 + 1] - positions[a * 3 + 1],
      z = positions[b * 3 + 2] - positions[a * 3 + 2];
    const u = positions[c * 3] - positions[a * 3],
      v = positions[c * 3 + 1] - positions[a * 3 + 1],
      w = positions[c * 3 + 2] - positions[a * 3 + 2];
    const facing =
      (y * w - z * v) * normals[a * 3] +
      (z * u - x * w) * normals[a * 3 + 1] +
      (x * v - y * u) * normals[a * 3 + 2];
    if (facing < 0) indices.push(a, c, b);
    else indices.push(a, b, c);
  }

  for (let z = 0; z < resolution; z++)
    for (let y = 0; y < resolution; y++)
      for (let x = 0; x < resolution; x++) {
        const base = x + y * side + z * side ** 2;
        const cell = offsets.map((offset) => base + offset);
        const count = cell.filter((id) => values[id] < 0).length;
        if (count === 0 || count === 8) continue;
        for (const tetra of tetrahedra) {
          const inside = [],
            outside = [];
          for (const corner of tetra) {
            const id = cell[corner];
            (values[id] < 0 ? inside : outside).push(id);
          }
          if (inside.length === 1)
            triangle(...outside.map((id) => crossing(inside[0], id)));
          if (inside.length === 3)
            triangle(...inside.map((id) => crossing(outside[0], id)));
          if (inside.length === 2) {
            const a = crossing(inside[0], outside[0]),
              b = crossing(inside[0], outside[1]);
            const c = crossing(inside[1], outside[0]),
              d = crossing(inside[1], outside[1]);
            triangle(a, b, c);
            triangle(b, d, c);
          }
        }
      }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(texture, 2));
  geometry.setIndex(indices);
  const result = geometry.toNonIndexed();
  const uv = result.attributes.uv;
  for (let i = 0; i < uv.count; i += 3) {
    const u = [uv.getX(i), uv.getX(i + 1), uv.getX(i + 2)];
    if (Math.max(...u) - Math.min(...u) > 0.5) {
      for (let j = 0; j < 3; j++) if (u[j] < 0.5) uv.setX(i + j, u[j] + 1);
    }
  }
  geometry.dispose();
  return result;
}

export function headSculpt(cat) {
  const lobes = cat
    ? [
        [0, 0.04, 0.085, 0.59, 0.48, 0.51, 0.19],
        [-0.393, -0.137, -0.181, 0.261, 0.24, 0.3, 0.12],
        [0.393, -0.137, -0.181, 0.261, 0.24, 0.3, 0.12],
        [0, -0.28, -0.326, 0.317, 0.16, 0.225, 0.15],
        [0, 0.278, -0.062, 0.455, 0.27, 0.43, 0.16],
        [0, 0.027, -0.342, 0.226, 0.224, 0.176, 0.12],
      ]
    : [
        [0, 0.084, 0.104, 0.52, 0.51, 0.55, 0.18],
        [0, -0.147, -0.096, 0.509, 0.34, 0.49, 0.16],
        [0, -0.168, -0.59, 0.285, 0.222, 0.398, 0.22],
        [-0.242, -0.205, -0.333, 0.277, 0.245, 0.327, 0.19],
        [0.242, -0.205, -0.333, 0.277, 0.245, 0.327, 0.19],
        [0, 0.056, -0.45, 0.263, 0.23, 0.324, 0.18],
      ];
  return organicSurface(
    lobes,
    [
      [-0.79, -0.62, -1.01],
      [0.79, 0.69, 0.78],
    ],
    38,
  );
}

export function bodySculpt(cat) {
  return organicSurface(
    [
      [0, 0.4, 0.04, cat ? 0.41 : 0.47, 0.36, 0.34, 0.14],
      [0, 0.71, 0.018, cat ? 0.33 : 0.4, 0.39, 0.34, 0.19],
      [0, 1.03, -0.031, 0.25, 0.26, 0.25, 0.18],
      [-0.29, 0.25, 0.08, 0.23, 0.22, 0.28, 0.13],
      [0.29, 0.25, 0.08, 0.23, 0.22, 0.28, 0.13],
    ],
    [
      [-0.7, -0.08, -0.59],
      [0.7, 1.36, 0.6],
    ],
    29,
  );
}

export function muzzleSculpt(cat) {
  const z = cat ? -0.49 : -0.772;
  return organicSurface(
    [
      [-0.13, -0.225, z, 0.23, 0.15, 0.175, 0.12],
      [0.13, -0.225, z, 0.23, 0.15, 0.175, 0.12],
      [0, -0.14, z + 0.065, 0.21, 0.15, 0.16, 0.12],
    ],
    [
      [-0.43, -0.43, z - 0.22],
      [0.43, 0.045, z + 0.26],
    ],
    24,
  );
}

export function pawSculpt(size = 1) {
  const geometry = organicSurface(
    [
      [0, 0, 0.018, 0.169, 0.121, 0.156, 0.063],
      [-0.105, -0.018, -0.104, 0.072, 0.082, 0.11, 0.041],
      [0, -0.019, -0.129, 0.077, 0.086, 0.119, 0.044],
      [0.105, -0.018, -0.104, 0.072, 0.082, 0.11, 0.041],
    ],
    [
      [-0.211, -0.162, -0.27],
      [0.211, 0.165, 0.207],
    ],
    22,
  );
  geometry.scale(size, size, size);
  return geometry;
}

export function bendableLoft(profile, stiffness, bend) {
  const geometry = loft(profile, stiffness);
  const segments = profile.length * 6;
  const position = geometry.attributes.position;
  const bent = geometry.clone();
  const target = bent.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const t = (Math.floor(i / 32) / segments) ** 1.6;
    target.setXYZ(
      i,
      position.getX(i) + bend[0] * t,
      position.getY(i) + bend[1] * t,
      position.getZ(i) + bend[2] * t,
    );
  }
  bent.computeVertexNormals();
  geometry.morphAttributes.position = [target];
  geometry.morphAttributes.normal = [bent.attributes.normal];
  return geometry;
}
