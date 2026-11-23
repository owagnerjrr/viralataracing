import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { moveKart, rectangle, trunk } from "./collisions.js";
import {
  bananaGeometry,
  loft,
  paintTexture,
  questionFace,
  surfaceTexture,
  turboIcon,
} from "./art.js";
const $ = (id) => document.getElementById(id),
  scene = new THREE.Scene();
scene.background = new THREE.Color(0x8bcdf1);
scene.fog = new THREE.Fog(0x8bcdf1, 85, 190);
const camera = new THREE.PerspectiveCamera(
  68,
  innerWidth / innerHeight,
  0.1,
  450,
);
const canvas = document.createElement("canvas");
const context = canvas.getContext("webgl2", { antialias: true, alpha: false });
if (!context) throw new Error("WebGL 2 indisponível");
const renderer = new THREE.WebGLRenderer({ canvas, context });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
$("app").prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xf5fbff, 0x7b9654, 1.6));
const sun = new THREE.DirectionalLight(0xfff4ce, 2.5);
sun.position.set(-25, 50, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.normalBias = 0.035;
sun.shadow.camera.far = 150;
sun.shadow.camera.left = -90;
sun.shadow.camera.right = 90;
sun.shadow.camera.top = 90;
sun.shadow.camera.bottom = -90;
scene.add(sun);
const solids = [];
const mat = (c, r = 0.8, m = 0) =>
    new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m }),
  green = mat(0x69ae56),
  roadMat = mat(0x555d66),
  white = mat(0xf7f5e8),
  dark = mat(0x242833),
  red = mat(0xff5e4a),
  yellow = mat(0xffd358),
  blue = mat(0x3cb6ee),
  brown = mat(0x765136),
  leaf = mat(0x2e9a58);
function mesh(g, m, p, group = scene) {
  const o = new THREE.Mesh(g, m);
  o.position.set(...p);
  o.castShadow = true;
  o.receiveShadow = true;
  group.add(o);
  return o;
}
function box(w, h, d, m, p, g = scene) {
  return mesh(new THREE.BoxGeometry(w, h, d), m, p, g);
}
function sphere(r, m, p, g = scene, s = 1) {
  const o = mesh(new THREE.SphereGeometry(r, 24, 16), m, p, g);
  o.scale.setScalar(s);
  return o;
}
function cyl(r1, r2, h, m, p, g = scene) {
  return mesh(new THREE.CylinderGeometry(r1, r2, h, 12), m, p, g);
}
const grassMap = surfaceTexture("#a8ca73", ["#a1c26c", "#afcf77", "#9cbc64"]);
grassMap.repeat.set(54, 54);
green.map = grassMap;
green.color.setHex(0xbcd98c);
roadMat.map = surfaceTexture("#777d89", ["#808490", "#6d7380", "#747987"]);
roadMat.color.setHex(0xc7cbd6);
box(260, 0.15, 260, green, [0, -0.17, 0]);
const track = [];
const N = 240;
for (let i = 0; i < N; i++) {
  let t = (i / N) * Math.PI * 2;
  track.push(
    new THREE.Vector3(
      46 * Math.cos(t) + 8 * Math.cos(3 * t),
      0,
      32 * Math.sin(t) + 5 * Math.sin(2 * t),
    ),
  );
}
function sample(t) {
  let f = (((t % 1) + 1) % 1) * N,
    i = Math.floor(f),
    a = f - i;
  return track[i].clone().lerp(track[(i + 1) % N], a);
}
function tangent(t) {
  return sample(t + 0.001)
    .sub(sample(t - 0.001))
    .normalize();
}
const width = 11;
function ribbon(offset, material, y = 0) {
  let v = [],
    uv = [],
    indices = [];
  for (let i = 0; i <= N; i++) {
    let t = i / N,
      p = sample(t),
      dir = tangent(t),
      side = new THREE.Vector3(-dir.z, 0, dir.x);
    for (let k of [-1, 1]) {
      let q = p.clone().addScaledVector(side, offset + k * 0.25);
      v.push(q.x, y, q.z);
      uv.push(i / 8, k);
    }
    if (i < N) {
      let j = i * 2;
      indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
    }
  }
  let g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  let o = new THREE.Mesh(g, material);
  o.receiveShadow = true;
  scene.add(o);
}
function trackSurface() {
  let v = [],
    uv = [],
    idx = [];
  for (let i = 0; i <= N; i++) {
    let t = i / N,
      p = sample(t),
      d = tangent(t),
      s = new THREE.Vector3(-d.z, 0, d.x);
    for (let k of [-1, 1]) {
      let q = p.clone().addScaledVector(s, (k * width) / 2);
      v.push(q.x, 0.015, q.z);
      uv.push(i / 5, k * 1.2);
    }
    if (i < N) {
      let j = i * 2;
      idx.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
    }
  }
  let g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  let o = new THREE.Mesh(g, roadMat);
  o.receiveShadow = true;
  scene.add(o);
}
trackSurface();
ribbon(width / 2, white, 0.035);
ribbon(-width / 2, white, 0.035);
const railMaterial = mat(0x26494d, 0.56);
function railPoint(t, side) {
  const direction = tangent(t);
  return sample(t).addScaledVector(
    new THREE.Vector3(-direction.z, 0, direction.x),
    6.55 * side,
  );
}
for (let i = 0; i < 120; i++) {
  const t = i / 120;
  const center = sample(t);
  const direction = tangent(t);
  if (i % 4 === 0) {
    const stripe = box(0.15, 0.012, 1.35, yellow, [center.x, 0.031, center.z]);
    stripe.rotation.y = Math.atan2(direction.x, direction.z);
    stripe.castShadow = false;
  }
  for (const side of [-1, 1]) {
    const from = railPoint(t, side);
    const to = railPoint((i + 1) / 120, side);
    const length = from.distanceTo(to);
    const center = from.clone().lerp(to, 0.5);
    const angle = Math.atan2(to.x - from.x, to.z - from.z);
    const panel = new THREE.Group();
    panel.position.copy(center);
    panel.rotation.y = angle;
    scene.add(panel);
    box(0.69, 0.72, length + 0.04, i % 2 ? red : white, [0, 0.51, 0], panel);
    box(0.78, 0.16, length + 0.11, railMaterial, [0, 0.95, 0], panel);
    if (i % 2 === 0)
      box(0.87, 1.05, 0.24, railMaterial, [0, 0.49, -length / 2], panel);
    solids.push(
      rectangle(center.x, center.z, 0.78, length + 0.13, angle, 1.03),
    );
  }
}
for (let j = 0; j < 1; j++) {
  let t = j / 10,
    p = sample(t),
    d = tangent(t),
    s = new THREE.Vector3(-d.z, 0, d.x);
  for (let k = 0; k < 8; k++) {
    let q = p.clone().addScaledVector(s, (k - 3.5) * 1.35);
    let tile = box(1.35, 0.04, 1.1, (j + k) % 2 ? dark : white, [
      q.x,
      0.065,
      q.z,
    ]);
    tile.rotation.y = Math.atan2(d.x, d.z);
  }
}
// Forest vegetation and distant hills are placed outside the racing line.
let seed = 1337;
function rnd() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}
const canopyMaterials = [leaf, mat(0x437f59), mat(0x76a74b), mat(0x549147)];
const canopyShape = new THREE.SphereGeometry(1, 18, 12);
for (let i = 0; i < 155; i++) {
  const x = (rnd() - 0.5) * 166;
  const z = (rnd() - 0.5) * 138;
  if (closest(new THREE.Vector3(x, 0, z)).dist < 9.5) continue;
  const height = 2.7 + rnd() * 3.4;
  const thick = 0.27 + height * 0.045;
  cyl(thick * 0.56, thick, height, brown, [x, height / 2, z]);
  solids.push(trunk(x, z, thick, height));
  for (const sign of [-1, 1]) {
    const branch = cyl(thick * 0.36, thick * 0.65, 1.7, brown, [
      x + sign * 0.46,
      height - 0.75,
      z,
    ]);
    branch.rotation.z = -sign * 0.58;
  }
  for (let j = 0; j < 4; j++) {
    const angle = (j * Math.PI) / 2;
    const crown = mesh(
      canopyShape,
      canopyMaterials[(j + i) % canopyMaterials.length],
      [x + Math.sin(angle) * 1.1, height + rnd(), z + Math.cos(angle) * 0.9],
    );
    const size = 1.35 + rnd() * 0.65;
    crown.scale.set(size, size * (1 + rnd() * 0.4), size);
  }
}
const granite = mat(0x788878, 0.94);
const moss = mat(0x829449, 0.92);
const rockShape = new THREE.IcosahedronGeometry(1, 2);
const rockPosition = rockShape.attributes.position;
for (let i = 0; i < rockPosition.count; i++) {
  const x = rockPosition.getX(i),
    y = rockPosition.getY(i),
    z = rockPosition.getZ(i);
  const erosion =
    0.94 + Math.sin(x * 9 + z * 7) * 0.083 + Math.cos(y * 13 - z * 9) * 0.045;
  rockPosition.setXYZ(
    i,
    x * erosion,
    Math.max(-0.72, y * erosion),
    z * erosion,
  );
}
rockShape.computeVertexNormals();
for (let i = 0; i < 21; i++) {
  const t = (i + 0.3) / 21;
  const point = railPoint(t, i % 2 ? -1 : 1).lerp(sample(t), -0.52);
  const size = 0.55 + rnd() * 0.77;
  const boulder = mesh(rockShape, granite, [point.x, size * 0.39, point.z]);
  boulder.scale.set(size * 1.35, size * 0.8, size);
  boulder.rotation.y = rnd() * Math.PI;
  const cap = mesh(rockShape, moss, [
    point.x + size * 0.15,
    size * 0.86,
    point.z,
  ]);
  cap.scale.set(size * 0.68, size * 0.44, size * 0.79);
  cap.rotation.y = boulder.rotation.y;
  solids.push(trunk(point.x, point.z, size, size * 1.3));
}
const hillColors = [mat(0x70a495), mat(0x82b2a5), mat(0x93beb0)];
for (let i = 0; i < 21; i++) {
  const angle = (i * Math.PI * 2) / 21;
  const hill = mesh(canopyShape, hillColors[i % 3], [
    Math.cos(angle) * 112,
    -6,
    Math.sin(angle) * 108,
  ]);
  hill.scale.set(19 + rnd() * 21, 14 + rnd() * 16, 21 + rnd() * 13);
  hill.castShadow = false;
}
const flowers = [mat(0xffa8b8), mat(0xffcf5b), mat(0xe5e9ff)];
for (let i = 0; i < 45; i++) {
  const t = (i + rnd()) / 45;
  const point = railPoint(t, i % 2 ? -1 : 1).lerp(sample(t), -0.27);
  for (let j = 0; j < 3; j++) {
    const flower = mesh(canopyShape, flowers[i % 3], [
      point.x + rnd(),
      0.2 + rnd() * 0.16,
      point.z + rnd(),
    ]);
    flower.scale.set(0.14, 0.09, 0.14);
    flower.castShadow = false;
  }
}
// Decorative gantry
{
  let p = sample(0),
    d = tangent(0),
    s = new THREE.Vector3(-d.z, 0, d.x);
  for (let sign of [-1, 1]) {
    let q = p.clone().addScaledVector(s, sign * 7);
    box(0.55, 8.6, 0.55, railMaterial, [q.x, 4.3, q.z]);
    box(1.05, 0.55, 1.05, dark, [q.x, 0.25, q.z]);
    solids.push(rectangle(q.x, q.z, 1.05, 1.05, 0, 8.6));
  }
  const sign = paintTexture(512, (ctx, size) => {
    ctx.fillStyle = "#143942";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#f4b44d";
    ctx.fillRect(0, 0, size, 36);
    ctx.fillRect(0, size - 36, size, 36);
    ctx.fillStyle = "#fff4cd";
    ctx.translate(size / 2, 0);
    ctx.scale(0.27, 1);
    ctx.font = "900 150px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("DUPLA KART", 0, 228);
    ctx.font = "700 98px system-ui";
    ctx.fillText("CIRCUITO DO BOSQUE", 0, 369);
  });
  const banner = mat(0xffffff);
  banner.map = sign;
  const beam = box(
    14.6,
    1.36,
    0.55,
    [railMaterial, railMaterial, yellow, yellow, banner, banner],
    [p.x, 8.75, p.z],
  );
  beam.rotation.y = Math.atan2(d.x, d.z);
}
// Batch the static scenery by material and shadow flags while retaining local colliders.
function batchScenery() {
  const batches = new Map();
  scene.updateMatrixWorld(true);
  scene.traverse((object) => {
    if (!object.isMesh || Array.isArray(object.material)) return;
    const key = [
      object.material.id,
      object.castShadow,
      object.receiveShadow,
    ].join("/");
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(object);
  });
  for (const objects of batches.values()) {
    if (objects.length < 2) continue;
    const copies = objects.map((object) => {
      const geometry = object.geometry.index
        ? object.geometry.toNonIndexed()
        : object.geometry.clone();
      return geometry.applyMatrix4(object.matrixWorld);
    });
    const geometry = mergeGeometries(copies);
    if (!geometry) continue;
    const [first] = objects;
    const batch = new THREE.Mesh(geometry, first.material);
    batch.castShadow = first.castShadow;
    batch.receiveShadow = first.receiveShadow;
    scene.add(batch);
    for (const object of objects) object.removeFromParent();
  }
}
batchScenery();
const kart = new THREE.Group();
scene.add(kart);
const body = new THREE.Group();
kart.add(body);
const chassisPaint = new THREE.MeshPhysicalMaterial({
  color: 0x079fa9,
  metalness: 0.26,
  roughness: 0.27,
  clearcoat: 0.8,
});
const chrome = mat(0xb9dee6, 0.28, 0.61);
const seat = mat(0x28404c, 0.95);
const lamp = mat(0xffdfa3, 0.23);
lamp.emissive.setHex(0xffbe68);
lamp.emissiveIntensity = 0.55;
const tailLamp = mat(0xd1264a, 0.3);
tailLamp.emissive.setHex(0xc91f38);
tailLamp.emissiveIntensity = 0.45;
mesh(
  loft(
    [
      [0, 0.76, -2.48, 0.02, 0.02],
      [0, 0.83, -2.25, 0.89, 0.18],
      [0, 0.99, -1.48, 1.19, 0.36],
      [0, 0.86, -0.3, 1.23, 0.27],
      [0, 0.9, 1.24, 1.27, 0.34],
      [0, 0.82, 2.08, 1.09, 0.29],
      [0, 0.8, 2.3, 0.02, 0.02],
    ],
    0.55,
  ),
  chassisPaint,
  [0, 0, 0],
  body,
);
mesh(
  loft(
    [
      [0, 0.57, -2.47, 0.02, 0.02],
      [0, 0.55, -2.22, 1.08, 0.14],
      [0, 0.53, -0.8, 1.28, 0.15],
      [0, 0.53, 1.4, 1.3, 0.13],
      [0, 0.55, 2.25, 1.14, 0.16],
      [0, 0.58, 2.44, 0.02, 0.02],
    ],
    0.49,
  ),
  dark,
  [0, 0, 0],
  body,
);
for (const side of [-1, 1]) {
  mesh(
    loft(
      [
        [0, 0.01, -0.75, 0.015, 0.015],
        [0, 0.03, -0.45, 0.21, 0.14],
        [0, 0, 0.38, 0.23, 0.16],
        [0, 0.05, 0.84, 0.014, 0.014],
      ],
      0.63,
    ),
    yellow,
    [side * 1.24, 0.82, 0.1],
    body,
  );
  const headlight = sphere(0.2, lamp, [side * 0.56, 0.94, -2.263], body);
  headlight.scale.set(1.4, 0.63, 0.45);
  const brakeLight = sphere(0.18, tailLamp, [side * 0.66, 0.93, 2.09], body);
  brakeLight.scale.set(1.68, 0.65, 0.46);
  const exhaust = cyl(
    0.13,
    0.16,
    0.46,
    chrome,
    [side * 0.93, 0.67, 2.05],
    body,
  );
  exhaust.rotation.x = Math.PI / 2;
  const opening = cyl(0.094, 0.1, 0.02, dark, [side * 0.93, 0.67, 2.29], body);
  opening.rotation.x = Math.PI / 2;
}
for (const z of [-0.7, 1.14]) {
  const cushion = sphere(0.65, seat, [0, 1.28, z], body);
  cushion.scale.set(1.1, 0.28, 0.74);
  const backrest = sphere(0.66, seat, [0, 1.58, z + 0.45], body);
  backrest.scale.set(1.05, 0.71, 0.29);
  const pad = sphere(0.54, red, [0, 1.62, z + 0.29], body);
  pad.scale.set(1.03, 0.66, 0.2);
}
const numberMap = paintTexture(128, (ctx) => {
  ctx.fillStyle = "#fff1b0";
  ctx.fillRect(0, 0, 128, 128);
  ctx.font = "900 86px system-ui";
  ctx.fillStyle = "#184554";
  ctx.textAlign = "center";
  ctx.fillText("02", 64, 94);
});
const badge = mesh(
  new THREE.CircleGeometry(0.31, 32),
  new THREE.MeshBasicMaterial({ map: numberMap }),
  [0, 1.353, -1.45],
  body,
);
badge.rotation.x = -Math.PI / 2;
let wheels = [];
for (let x of [-1.42, 1.42])
  for (let z of [-1.5, 1.5]) {
    let pivot = new THREE.Group();
    pivot.position.set(x, 0.56, z);
    body.add(pivot);
    let axle = new THREE.Group();
    pivot.add(axle);
    let wheel = mesh(
      new THREE.CylinderGeometry(0.505, 0.505, 0.39, 36),
      dark,
      [0, 0, 0],
      axle,
    );
    wheel.rotation.z = Math.PI / 2;
    let hub = cyl(0.3, 0.3, 0.38, white, [0, 0, 0], axle);
    hub.rotation.z = Math.PI / 2;
    const rim = mesh(
      new THREE.TorusGeometry(0.29, 0.036, 10, 32),
      chrome,
      [Math.sign(x) * 0.22, 0, 0],
      axle,
    );
    rim.rotation.y = Math.PI / 2;
    for (const offset of [-0.14, 0, 0.14]) {
      const tread = mesh(
        new THREE.TorusGeometry(0.501, 0.048, 10, 36),
        dark,
        [offset, 0, 0],
        axle,
      );
      tread.rotation.y = Math.PI / 2;
    }
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      sphere(
        0.046,
        chassisPaint,
        [Math.sign(x) * 0.225, Math.sin(angle) * 0.2, Math.cos(angle) * 0.2],
        axle,
      );
    }
    wheels.push({ pivot, axle, front: z < 0 });
  }
let steering = new THREE.Group();
steering.position.set(0, 2.05, -1.15);
body.add(steering);
const wheelFace = new THREE.Group();
wheelFace.rotation.x = -0.55;
steering.add(wheelFace);
mesh(new THREE.TorusGeometry(0.52, 0.075, 8, 24), dark, [0, 0, 0], wheelFace);
box(0.83, 0.11, 0.065, chrome, [0, 0, 0], wheelFace);
box(0.11, 0.45, 0.065, chrome, [0, -0.23, 0], wheelFace);
sphere(0.13, yellow, [0, 0, 0.05], wheelFace);
steering.position.set(0, 2.26, -1.66);
const caramel = mat(0xc98b48),
  cream = mat(0xffdfaa),
  black = mat(0x222635, 0.68),
  pink = mat(0xe8899a),
  eyes = mat(0xffe96a),
  pupil = mat(0x10151d);
function mascot(cat) {
  let root = new THREE.Group(),
    m = cat ? black : caramel;
  let torso = sphere(0.56, m, [0, 0.64, 0], root);
  torso.scale.set(0.82, 1.15, 0.7);
  let belly = sphere(0.37, cat ? mat(0x383942) : cream, [0, 0.5, -0.34], root);
  belly.scale.set(0.85, 1, 0.35);
  let head = new THREE.Group();
  head.position.y = 1.55;
  root.add(head);
  let face = sphere(0.65, m, [0, 0, 0], head);
  face.scale.set(1, 0.9, 0.86);
  const ears = [];
  const eyeGroups = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(side * 0.43, 0.36, 0.01);
    ear.rotation.z = side * (cat ? -0.28 : 0.64);
    head.add(ear);
    const profile = cat
      ? [
          [0, 0, 0, 0.21, 0.145],
          [0, 0.19, -0.006, 0.23, 0.14],
          [0, 0.46, 0.035, 0.135, 0.101],
          [0, 0.66, 0.067, 0.012, 0.014],
        ]
      : [
          [0, 0.08, 0, 0.16, 0.131],
          [0, 0.21, 0.035, 0.21, 0.12],
          [0, 0.08, 0.21, 0.225, 0.13],
          [0, -0.29, 0.29, 0.198, 0.091],
          [0, -0.45, 0.29, 0.015, 0.015],
        ];
    mesh(loft(profile, 0.84), cat ? black : mat(0x9a5830), [0, 0, 0], ear);
    const inner = sphere(
      0.24,
      cat ? pink : mat(0xb8784d),
      [0, cat ? 0.32 : -0.15, cat ? -0.103 : 0.195],
      ear,
    );
    inner.scale.set(cat ? 0.49 : 0.58, cat ? 1.05 : 1.16, 0.22);
    ears.push(ear);

    const eye = new THREE.Group();
    eye.position.set(side * 0.265, 0.12, -0.47);
    eye.rotation.y = -side * 0.32;
    head.add(eye);
    const socket = sphere(
      0.2,
      cat ? mat(0x353b50) : mat(0xad6632),
      [0, 0, 0.009],
      eye,
    );
    socket.scale.set(0.89, 1.15, 0.6);
    const sclera = sphere(0.177, cat ? eyes : white, [0, 0, -0.07], eye);
    sclera.scale.set(0.8, 1.08, 0.49);
    const iris = sphere(
      0.118,
      cat ? mat(0xe6a82e) : mat(0x6e442a),
      [-side * 0.024, -0.015, -0.133],
      eye,
    );
    iris.scale.set(0.78, 1, 0.43);
    const slit = sphere(0.087, pupil, [-side * 0.024, -0.012, -0.171], eye);
    slit.scale.set(cat ? 0.39 : 0.85, 1.05, 0.35);
    sphere(0.024, white, [-side * 0.024 - 0.027, 0.021, -0.196], eye);
    const brow = sphere(
      0.114,
      cat ? black : mat(0x7e492b),
      [side * 0.01, 0.22, -0.037],
      eye,
    );
    brow.scale.set(1.22, 0.24, 0.43);
    brow.rotation.z = side * 0.14;
    eyeGroups.push(eye);

    if (cat) {
      for (let i = 0; i < 3; i++) {
        const whisker = mesh(
          new THREE.TubeGeometry(
            new THREE.QuadraticBezierCurve3(
              new THREE.Vector3(side * 0.23, -0.22 - i * 0.057, -0.58),
              new THREE.Vector3(side * 0.48, -0.19 - i * 0.075, -0.65),
              new THREE.Vector3(side * 0.67, -0.16 - i * 0.12, -0.43),
            ),
            10,
            0.009,
            5,
            false,
          ),
          mat(0x9996a0),
          [0, 0, 0],
          head,
        );
        whisker.castShadow = false;
      }
    }
  }
  let muzzle = sphere(
    0.32,
    cat ? mat(0x292b35) : cream,
    [0, -0.21, -0.52],
    head,
  );
  muzzle.scale.set(1.2, 0.65, 0.6);
  sphere(0.115, cat ? pink : dark, [0, -0.15, -0.74], head);
  let smile = mesh(
    new THREE.TorusGeometry(0.18, 0.025, 6, 16, Math.PI),
    dark,
    [0, -0.34, -0.67],
    head,
  );
  smile.rotation.z = Math.PI;
  const openMouth = sphere(0.145, pupil, [0, -0.35, -0.697], head);
  openMouth.scale.set(0.94, 1, 0.31);
  openMouth.visible = false;
  const collar = mesh(
    new THREE.TorusGeometry(0.376, 0.06, 10, 32),
    cat ? blue : red,
    [0, 1.11, 0],
    root,
  );
  collar.rotation.x = Math.PI / 2;
  const tag = sphere(0.12, yellow, [0, 1.03, -0.405], root);
  tag.scale.z = 0.4;
  const arms = [];
  for (let side of [-1, 1]) {
    const shoulder = new THREE.Vector3(side * 0.4, 0.94, -0.14);
    const upper = sphere(1, m, [0, 0, 0], root);
    const lower = sphere(1, m, [0, 0, 0], root);
    const paw = new THREE.Group();
    root.add(paw);
    const pad = sphere(0.185, m, [0, 0, 0], paw);
    pad.scale.set(0.91, 0.74, 1);
    for (let digit = -1; digit <= 1; digit++) {
      const toe = sphere(
        0.072,
        cat ? mat(0x32374a) : caramel,
        [digit * 0.083, 0, -0.124],
        paw,
      );
      toe.scale.set(0.88, 0.92, 1.14);
    }
    arms.push({ shoulder, upper, lower, paw, side });
  }
  for (let side of [-1, 1]) {
    let foot = sphere(0.26, m, [side * 0.31, 0.1, -0.22], root);
    foot.scale.set(0.9, 0.6, 1.3);
  }
  let tail = new THREE.Group();
  tail.position.set(0, 0.6, 0.35);
  root.add(tail);
  mesh(
    loft(
      cat
        ? [
            [0, 0, 0, 0.126, 0.11],
            [0, 0.1, 0.32, 0.113, 0.105],
            [0, 0.48, 0.6, 0.097, 0.102],
            [0, 0.91, 0.63, 0.085, 0.083],
            [0, 1.13, 0.43, 0.061, 0.062],
            [0, 1.16, 0.28, 0.008, 0.008],
          ]
        : [
            [0, 0, 0, 0.13, 0.115],
            [0, 0.13, 0.27, 0.112, 0.108],
            [0, 0.36, 0.44, 0.09, 0.085],
            [0, 0.59, 0.48, 0.019, 0.019],
          ],
    ),
    m,
    [0, 0, 0],
    tail,
  );
  return { root, head, arms, tail, cat, ears, eyeGroups, smile, openMouth };
}
let dog = mascot(false),
  cat = mascot(true);
body.add(dog.root, cat.root);
let pilotDog = true,
  swap = 0,
  swapFrom = true;
function positionCrew() {
  let front = new THREE.Vector3(0, 1.42, -0.85),
    back = new THREE.Vector3(0, 1.42, 1.12);
  let a = pilotDog ? front : back,
    b = pilotDog ? back : front;
  if (swap > 0) {
    let progress = THREE.MathUtils.smoothstep(1 - swap / 0.6, 0, 1),
      fromDog = swapFrom ? front : back,
      toDog = swapFrom ? back : front;
    dog.root.position.copy(fromDog).lerp(toDog, progress);
    cat.root.position
      .copy(swapFrom ? back : front)
      .lerp(swapFrom ? front : back, progress);
    dog.root.position.x = Math.sin(progress * Math.PI) * 1.05;
    cat.root.position.x = -dog.root.position.x;
    dog.root.position.y += Math.sin(progress * Math.PI) * 0.8;
    cat.root.position.y += Math.sin(progress * Math.PI) * 0.8;
  } else {
    dog.root.position.copy(a);
    cat.root.position.copy(b);
  }
}
positionCrew();
const rampPoint = sample(0.34);
const rampDirection = tangent(0.34);
const rampPaint = mat(0x82e9fc, 0.43);
rampPaint.map = paintTexture(256, (ctx, size) => {
  ctx.fillStyle = "#174770";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "#48e8ff";
  ctx.lineWidth = 11;
  ctx.strokeRect(10, 10, size - 20, size - 20);
  ctx.lineWidth = 18;
  ctx.lineJoin = "round";
  for (const y of [67, 138, 209]) {
    ctx.beginPath();
    ctx.moveTo(62, y - 17);
    ctx.lineTo(128, y + 17);
    ctx.lineTo(194, y - 17);
    ctx.stroke();
  }
});
const jumpMarker = mesh(new THREE.PlaneGeometry(5, 4), rampPaint, [
  rampPoint.x,
  0.043,
  rampPoint.z,
]);
jumpMarker.rotation.order = "YXZ";
jumpMarker.rotation.set(
  -Math.PI / 2,
  Math.atan2(rampDirection.x, rampDirection.z),
  0,
);
jumpMarker.castShadow = false;
let wasOnRamp = false;
const pickups = [];
const hazards = [];
const pickupFace = new THREE.MeshStandardMaterial({
  map: questionFace(),
  roughness: 0.34,
  emissive: 0x348479,
  emissiveIntensity: 0.45,
});
const bananaPeel = new THREE.MeshStandardMaterial({
  color: 0xffd333,
  roughness: 0.5,
  side: THREE.DoubleSide,
});
function makeBanana() {
  const peel = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const flap = mesh(bananaGeometry, bananaPeel, [0, 0, 0], peel);
    flap.rotation.y = (i * Math.PI) / 2;
  }
  cyl(0.04, 0.065, 0.19, brown, [0, 0.54, 0], peel);
  return peel;
}
for (let i = 0; i < 9; i++) {
  const t = (i + 0.5) / 10;
  const p = sample(t);
  const direction = tangent(t);
  p.addScaledVector(
    new THREE.Vector3(-direction.z, 0, direction.x),
    ((i % 3) - 1) * 2.4,
  );
  const g = new THREE.Group();
  g.position.set(p.x, 1.35, p.z);
  scene.add(g);
  const shell = box(1.24, 1.24, 1.24, pickupFace, [0, 0, 0], g);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(shell.geometry),
    new THREE.LineBasicMaterial({ color: 0xe6ffc8 }),
  );
  edges.scale.setScalar(1.01);
  g.add(edges);
  pickups.push({ g, t, active: true, cool: 0 });
}
let keys = {},
  running = false,
  paused = true,
  velocity = 0,
  heading = 0,
  position = sample(0.015),
  y = 0,
  vy = 0,
  drift = 0,
  boost = 0,
  item = null,
  lap = 1,
  elapsed = 0,
  prevProgress = 0.015,
  lastCheckpoint = 0,
  stun = 0,
  toastTime = 0;
heading = Math.atan2(tangent(0.015).x, tangent(0.015).z);
const itemTypes = ["banana", "turbo"];
const motion = new THREE.Vector3();
const facing = new THREE.Vector3();
let impactTime = 0;
let impactLean = 0;
let landing = 0;
let slide = 0;
let throwTime = 0;
let slipAngle = 0;
let slipTime = 0;
let thrower = null;
function clearMotion() {
  motion.set(0, 0, 0);
  impactTime =
    impactLean =
    landing =
    slide =
    throwTime =
    slipAngle =
    slipTime =
      0;
}
const icons = {
  banana: "🍌 Casca de banana",
  turbo: "Turbo",
};
function notify(s) {
  $("toast").textContent = s;
  toastTime = 1.5;
}
function reset() {
  position.copy(sample(0.015));
  wasOnRamp = false;
  clearMotion();
  heading = Math.atan2(tangent(0.015).x, tangent(0.015).z);
  velocity = 0;
  y = vy = drift = boost = elapsed = stun = 0;
  lap = 1;
  prevProgress = 0.015;
  lastCheckpoint = 0;
  item = null;
  pilotDog = true;
  swap = 0;
  positionCrew();
  toastTime = 0;
  $("toast").textContent = "";
  for (const pickup of pickups) {
    pickup.active = true;
    pickup.cool = 0;
    pickup.g.visible = true;
  }
  snapCamera = true;
  hazards.forEach((h) => scene.remove(h.g));
  hazards.length = 0;
  updateHUD();
}
function updateHUD() {
  $("speed").innerHTML =
    `${Math.round(Math.abs(velocity) * 3.6)} <small>KM/H</small>`;
  $("lap").textContent = `VOLTA ${Math.min(lap, 3)}/3`;
  $("time").textContent =
    `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(Math.floor(elapsed % 60)).padStart(2, "0")}.${Math.floor(elapsed * 10) % 10}`;
  $("pilot").textContent = pilotDog
    ? "🐕 Piloto: Caramelo"
    : "🐈‍⬛ Piloto: Gato Preto";
  $("partner").textContent = pilotDog
    ? "🐈‍⬛ Itens: Gato Preto"
    : "🐕 Itens: Caramelo";
  const itemLabel = $("item");
  const itemState = item ?? "empty";
  if (itemLabel.dataset.state !== itemState) {
    itemLabel.dataset.state = itemState;
    itemLabel.innerHTML =
      item === "turbo"
        ? turboIcon + " Turbo"
        : item
          ? icons[item]
          : "🎁 Sem item";
  }
  $("boost").textContent =
    `TURBO ${"▰".repeat(Math.min(5, Math.floor(drift / 0.4)))}${"▱".repeat(Math.max(0, 5 - Math.floor(drift / 0.4)))}`;
}
function closest(p) {
  let best = 1e9,
    at = 0;
  for (let i = 0; i < N; i++) {
    let d = p.distanceToSquared(track[i]);
    if (d < best) {
      best = d;
      at = i;
    }
  }
  return { dist: Math.sqrt(best), t: at / N };
}
function useItem() {
  if (!item || !running || paused) return;
  if (item === "turbo") {
    boost = 2.3;
    notify("⚡ TURBO!");
  } else {
    const g = makeBanana();
    const f = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
    g.position.copy(position).addScaledVector(f, -2.55);
    g.position.y = y + 1.3;
    g.rotation.y = heading;
    scene.add(g);
    hazards.push({ g, life: 30, lift: 2.1, motion: f.multiplyScalar(-4.6) });
    thrower = pilotDog ? cat : dog;
    throwTime = 0.48;
    notify("🍌 Banana lançada!");
  }
  item = null;
}
function swapCrew() {
  if (swap > 0 || paused || !running) return;
  swapFrom = pilotDog;
  pilotDog = !pilotDog;
  swap = 0.6;
  notify("🔄 TROCA DE PILOTO!");
}
const driveKeys = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
]);
let snapCamera = true;
const touchKeys = new Map();
function clearControls() {
  keys = {};
  touchKeys.clear();
}
function setPaused(value) {
  paused = value;
  clearControls();
  $("app").classList.toggle("driving", running && !paused);
  $("menu").hidden = !paused;
  $("play").textContent =
    lap > 3 ? "NOVA CORRIDA" : running ? "CONTINUAR" : "COMEÇAR CORRIDA";
  $("race-status").textContent =
    lap > 3
      ? "Corrida concluída em " + $("time").textContent
      : running
        ? "Corrida pausada"
        : "Circuito do Bosque · 3 voltas";
}
function recover() {
  if (!running || paused) return;
  const { t } = closest(position);
  position.copy(sample(t));
  prevProgress = t;
  velocity = y = vy = drift = boost = stun = 0;
  clearMotion();
  wasOnRamp = false;
  heading = Math.atan2(tangent(t).x, tangent(t).z);
  snapCamera = true;
}
const actions = {
  swap: swapCrew,
  item: useItem,
  recover,
  pause: () => {
    if (running && lap <= 3) setPaused(!paused);
  },
};
const actionKeys = {
  ShiftLeft: "swap",
  ShiftRight: "swap",
  KeyE: "item",
  KeyR: "recover",
  Escape: "pause",
};
window.addEventListener("keydown", (e) => {
  if (driveKeys.has(e.code) && !paused) {
    e.preventDefault();
    keys[e.code] = true;
  }
  if (!e.repeat && actionKeys[e.code]) actions[actionKeys[e.code]]();
});
window.addEventListener("keyup", (e) => delete keys[e.code]);
window.addEventListener("blur", () => {
  if (running && !paused) setPaused(true);
});
for (const button of document.querySelectorAll("[data-key]")) {
  button.addEventListener("pointerdown", (event) => {
    button.setPointerCapture(event.pointerId);
    touchKeys.set(event.pointerId, button.dataset.key);
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    button.addEventListener(type, (event) => touchKeys.delete(event.pointerId));
  }
}
for (const button of document.querySelectorAll("[data-action]")) {
  button.addEventListener("click", actions[button.dataset.action]);
}
function held(code) {
  return keys[code] || [...touchKeys.values()].includes(code);
}
$("play").onclick = () => {
  if (lap > 3) reset();
  running = true;
  setPaused(false);
  $("play").blur();
};
$("reset").onclick = () => {
  reset();
  running = true;
  setPaused(false);
  $("reset").blur();
};
$("shadows").onchange = (e) => (renderer.shadowMap.enabled = e.target.checked);
const dirtMaterial = mat(0xd7ba87);
const sparkMaterial = new THREE.MeshBasicMaterial({ color: 0xffc450 });
const flameMaterial = new THREE.MeshBasicMaterial({ color: 0x63faff });
const dust = Array.from({ length: 32 }, () => {
  const puff = sphere(0.23, dirtMaterial, [0, 0, 0]);
  puff.castShadow = puff.receiveShadow = puff.visible = false;
  return { puff, life: 0 };
});
let dustIndex = 0,
  dustDelay = 0;
function updateDust(dt, active) {
  dustDelay -= dt;
  if (
    (active || boost > 0 || impactTime > 0.19) &&
    dustDelay <= 0 &&
    $("particles").checked
  ) {
    const { puff } = dust[dustIndex];
    const spark = impactTime > 0.19 || drift > 0.48;
    puff.material =
      boost > 0 ? flameMaterial : spark ? sparkMaterial : dirtMaterial;
    dust[dustIndex].life = boost > 0 || spark ? 0.27 : 0.45;
    puff.position.copy(position);
    puff.position.x -= Math.sin(heading) * 1.5;
    puff.position.z -= Math.cos(heading) * 1.5;
    const spread = (dustIndex % 2 ? 1 : -1) * (boost > 0 ? 0.91 : 0.68);
    puff.position.x += Math.cos(heading) * spread;
    puff.position.z -= Math.sin(heading) * spread;
    puff.position.y = y + (boost > 0 ? 0.68 : 0.35);
    dustIndex = (dustIndex + 1) % dust.length;
    dustDelay = 0.035;
  }
  for (const particle of dust) {
    particle.life = Math.max(0, particle.life - dt);
    particle.puff.visible = particle.life > 0 && $("particles").checked;
    particle.puff.position.y += dt * 0.8;
    particle.puff.scale.setScalar(particle.life * 2);
  }
}
const camTarget = new THREE.Vector3();
const cameraSide = new THREE.Vector3();
const handGoal = new THREE.Vector3();
const elbow = new THREE.Vector3();
const armAxis = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
function poseLimb(limb, from, to, width) {
  limb.position.copy(from).lerp(to, 0.5);
  armAxis.subVectors(to, from);
  limb.scale.set(width, armAxis.length() * 0.68, width);
  limb.quaternion.setFromUnitVectors(up, armAxis.normalize());
}
let previousFrame = performance.now();
function tick() {
  requestAnimationFrame(tick);
  const frame = performance.now(),
    frameSeconds = (frame - previousFrame) / 1000,
    dt = Math.min(frameSeconds, 0.05),
    now = frame / 1000;
  previousFrame = frame;
  let dustActive = false;
  if (running && !paused) {
    elapsed += frameSeconds;
    let accel = held("KeyW") || held("ArrowUp"),
      brake = held("KeyS") || held("ArrowDown"),
      left = held("KeyA") || held("ArrowLeft"),
      right = held("KeyD") || held("ArrowRight"),
      turn = Number(right) - Number(left),
      drifting = held("Space") && Math.abs(velocity) > 7 && turn !== 0;
    let near = closest(position),
      offroad = near.dist > width / 2;
    dustActive = (drifting || offroad) && Math.abs(velocity) > 6;
    if (stun > 0) {
      stun -= dt;
      velocity *= Math.max(0, 1 - 3 * dt);
    } else {
      velocity += (accel ? 22 : brake ? -30 : -Math.sign(velocity) * 10) * dt;
      let max = boost > 0 ? 38 : offroad ? 13 : 27;
      velocity = THREE.MathUtils.clamp(velocity, -9, max);
      if (!accel && !brake && Math.abs(velocity) <= 10 * dt) velocity = 0;
    }
    if (boost > 0) {
      boost = Math.max(0, boost - dt);
      if (!brake && stun <= 0) velocity = Math.max(velocity, 31);
    }
    heading -=
      turn *
      dt *
      (drifting ? 1.6 : 1.25) *
      Math.min(1, Math.abs(velocity) / 9) *
      Math.sign(velocity || 1);
    if (drifting) drift = Math.min(2.4, drift + dt);
    else if (drift > 0) {
      if (drift > 0.55) {
        boost = 0.55 + drift * 0.48;
        notify("💨 MINI TURBO!");
      }
      drift = 0;
    }
    const rate = 1 - Math.exp(-(drifting ? 5.5 : 14) * dt);
    slide = THREE.MathUtils.lerp(slide, drifting ? turn * 0.32 : 0, rate);
    const travelHeading = heading + slide;
    facing.set(Math.sin(travelHeading), 0, Math.cos(travelHeading));
    motion.copy(facing).multiplyScalar(velocity);
    const impact = moveKart(position, motion, heading, y, dt, solids);
    if (impact > 0.1) velocity = motion.dot(facing);
    if (impact > 3 && impactTime < 0.1) {
      impactTime = 0.36;
      impactLean = Math.min(0.25, impact * 0.014);
      boost = 0;
      drift = 0;
    }
    const rampX = position.x - rampPoint.x;
    const rampZ = position.z - rampPoint.z;
    const onRamp =
      Math.abs(rampX * rampDirection.z - rampZ * rampDirection.x) < 2.55 &&
      Math.abs(rampX * rampDirection.x + rampZ * rampDirection.z) < 2.1;
    if (onRamp && !wasOnRamp && Math.abs(velocity) > 10 && y === 0) vy = 5.5;
    wasOnRamp = onRamp;
    vy -= 17 * dt;
    y = Math.max(0, y + vy * dt);
    if (y === 0) {
      if (vy < -3) landing = Math.min(0.24, -vy * 0.039);
      vy = 0;
    }
    impactTime = Math.max(0, impactTime - dt);
    landing *= Math.exp(-9 * dt);
    throwTime = Math.max(0, throwTime - dt);
    slipTime = Math.max(0, slipTime - dt);
    slipAngle = slipTime ? (1 - slipTime / 0.72) * Math.PI * 2 : 0;
    for (let p of pickups) {
      p.g.rotation.y += dt * 1.8;
      p.g.position.y = 1.4 + Math.sin(now * 3 + p.t * 40) * 0.2;
      if (!p.active) {
        p.cool -= dt;
        if (p.cool <= 0) {
          p.active = true;
          p.g.visible = true;
        }
      } else if (
        !item &&
        Math.abs(p.g.position.y - (y + 1)) < 1.25 &&
        Math.hypot(p.g.position.x - position.x, p.g.position.z - position.z) < 2
      ) {
        p.active = false;
        p.cool = 7;
        p.g.visible = false;
        item = itemTypes[Math.floor(rnd() * itemTypes.length)];
        notify("🎁 " + icons[item]);
      }
    }
    for (const hazard of hazards) {
      hazard.life -= dt;
      if (hazard.g.position.y > 0 || hazard.lift > 0) {
        hazard.lift -= 15 * dt;
        hazard.g.position.y = Math.max(
          0,
          hazard.g.position.y + hazard.lift * dt,
        );
        if (hazard.g.position.y > 0) {
          hazard.g.position.addScaledVector(hazard.motion, dt);
          hazard.g.rotation.y += dt * 6;
        }
      }
      if (
        hazard.life < 29.25 &&
        hazard.g.position.y === 0 &&
        y < 0.38 &&
        hazard.g.position.distanceTo(position) < 1.52
      ) {
        stun = 0.8;
        slipTime = 0.72;
        velocity *= 0.3;
        boost = 0;
        drift = 0;
        hazard.life = 0;
        notify("🍌 Escorregou!");
      }
    }
    for (let i = hazards.length - 1; i >= 0; i--) {
      if (hazards[i].life > 0) continue;
      scene.remove(hazards[i].g);
      hazards.splice(i, 1);
    }
    if (swap > 0) swap = Math.max(0, swap - dt);
    positionCrew();
    let progress = closest(position).t;
    if (
      prevProgress > 0.85 &&
      progress < 0.15 &&
      velocity > 2 &&
      lastCheckpoint >= 3
    ) {
      lap++;
      lastCheckpoint = 0;
      notify(lap > 3 ? "🏆 CORRIDA CONCLUÍDA!" : "🏁 VOLTA " + lap);
      if (lap > 3) {
        updateHUD();
        setPaused(true);
      }
    }
    for (let i = 1; i <= 3; i++)
      if (
        progress > i * 0.23 &&
        progress < i * 0.23 + 0.05 &&
        lastCheckpoint === i - 1
      )
        lastCheckpoint = i;
    prevProgress = progress;
    updateHUD();
  }
  if (toastTime > 0) {
    toastTime -= dt;
    if (toastTime <= 0) $("toast").textContent = "";
  }
  updateDust(dt, dustActive);
  kart.position.set(position.x, y, position.z);
  kart.rotation.y = heading + Math.PI + slipAngle;
  let turn =
    Number(!!(held("KeyD") || held("ArrowRight"))) -
    Number(!!(held("KeyA") || held("ArrowLeft")));
  body.rotation.z = THREE.MathUtils.lerp(
    body.rotation.z,
    -turn * Math.min(0.18, Math.abs(velocity) / 110) - slide * 0.16,
    1 - Math.exp(-8 * dt),
  );
  body.rotation.x = THREE.MathUtils.lerp(
    body.rotation.x,
    (boost > 0 ? 0.1 : 0) +
      vy * 0.033 -
      landing * 0.9 -
      impactLean * impactTime,
    1 - Math.exp(-11 * dt),
  );
  for (let w of wheels) {
    if (running && !paused) w.axle.rotation.x += (velocity * dt) / 0.55;
    w.pivot.rotation.y = w.front ? -turn * 0.35 : 0;
  }
  wheelFace.rotation.z = -turn * 0.38;
  const jump = Math.sin((Math.PI * swap) / 0.6);
  for (const m of [dog, cat]) {
    const throwing = m === thrower ? Math.sin((Math.PI * throwTime) / 0.48) : 0;
    const isPilot = m === (pilotDog ? dog : cat);
    m.root.rotation.x =
      -vy * 0.029 +
      landing * 0.45 +
      impactTime * 0.38 -
      (boost > 0 ? 0.075 : 0);
    m.root.rotation.z =
      -body.rotation.z * 0.75 + (m.cat ? -1 : 1) * jump * 0.23;
    m.root.rotation.y = (m.cat ? 1 : -1) * jump * 0.58;
    m.head.rotation.y = -turn * 0.14 + (isPilot ? 0 : throwing * 0.53);
    m.head.rotation.z = Math.sin(now * 5) * 0.035 - body.rotation.z * 0.65;
    m.tail.rotation.y = Math.sin(now * (m.cat ? 5.9 : 9)) * 0.36 - turn * 0.21;
    m.tail.rotation.x = Math.sin(now * 5.5) * 0.12 + vy * 0.029;
    const startled = impactTime > 0.12 || slipTime > 0.25 || vy > 2.75;
    m.smile.visible = !startled;
    m.openMouth.visible = startled;
    for (const [i, eye] of m.eyeGroups.entries()) {
      const blink =
        Math.max(0, Math.cos(now * 1.74 + 1.1 + Number(m.cat)) - 0.985) / 0.015;
      eye.scale.y = startled ? 1.13 : 1 - blink * 0.92;
      m.ears[i].rotation.x =
        Math.sin(now * 7.5 + i) * (m.cat ? 0.08 : 0.19) +
        vy * 0.037 +
        impactTime * 0.59;
    }
    for (const { shoulder, upper, lower, paw, side } of m.arms) {
      if (isPilot && swap === 0) {
        handGoal.set(side * 0.46, 0.17, 0.014);
        wheelFace.localToWorld(handGoal);
        m.root.worldToLocal(handGoal);
      } else {
        handGoal.set(side * (0.53 + jump * 0.35), 0.59 + jump * 0.61, -0.4);
        handGoal.x += side * throwing * 0.34;
        handGoal.y += throwing * 0.54;
        handGoal.z += throwing * 0.66;
      }
      elbow.copy(shoulder).lerp(handGoal, 0.48);
      elbow.x += side * 0.11;
      elbow.y -= 0.15;
      poseLimb(upper, shoulder, elbow, 0.132);
      poseLimb(lower, elbow, handGoal, 0.119);
      paw.position.copy(handGoal);
    }
  }
  tailLamp.emissiveIntensity = held("KeyS") || held("ArrowDown") ? 1.45 : 0.45;
  let forward = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
  let desired = kart.position
    .clone()
    .addScaledVector(forward, -10 - (boost > 0 ? 2 : 0))
    .addScaledVector(cameraSide.set(-forward.z, 0, forward.x), 3.2)
    .add(new THREE.Vector3(0, 6.6 + y * 0.2, 0));
  camera.position.lerp(desired, snapCamera ? 1 : 1 - Math.exp(-7 * dt));
  snapCamera = false;
  camTarget
    .copy(kart.position)
    .add(new THREE.Vector3(0, 2.2, 0))
    .addScaledVector(forward, 4);
  camera.lookAt(camTarget);
  camera.fov = THREE.MathUtils.lerp(camera.fov, boost > 0 ? 76 : 68, 0.06);
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
}
tick();
updateHUD();
setPaused(true);
$("play").disabled = false;
$("reset").disabled = false;
renderer.domElement.addEventListener("webglcontextlost", (event) => {
  event.preventDefault();
  setPaused(true);
  $("play").disabled = $("reset").disabled = true;
  $("race-status").textContent =
    "Conexão gráfica interrompida. Aguardando a recuperação…";
});
renderer.domElement.addEventListener("webglcontextrestored", () => {
  $("play").disabled = $("reset").disabled = false;
  snapCamera = true;
  setPaused(true);
});
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
