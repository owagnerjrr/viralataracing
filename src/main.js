import * as THREE from "three";
import { ArcadeVehicle, PHYSICS_STEP } from "./vehicle.js";
import {
  centerline,
  COURSE_SCALE,
  channelDistance,
  createRiver,
  surfaceAt,
  terrainGeometry,
} from "./course.js";
import { loadModels } from "./models.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { KART_SCALE, moveKart, rectangle, trunk } from "./collisions.js";
import {
  bananaGeometry,
  paintTexture,
  questionFace,
  surfaceTexture,
  turboIcon,
} from "./art.js";
const $ = (id) => document.getElementById(id),
  scene = new THREE.Scene();
scene.background = new THREE.Color(0x8bcdf1);
scene.fog = new THREE.Fog(0xb9d5da, 80, 185);
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(330, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      horizon: { value: new THREE.Color(0xffefd6) },
      zenith: { value: new THREE.Color(0x478cd4) },
    },
    vertexShader:
      "varying vec3 skyPos; void main(){skyPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `
    varying vec3 skyPos;
    uniform vec3 horizon;
    uniform vec3 zenith;
    void main(){
      vec3 direction = normalize(skyPos);
      float elevation = smoothstep(-.08, .38, direction.y);
      float halo = pow(max(0., dot(direction, normalize(vec3(-.5,.38,.54)))), 11.);
      vec3 color = mix(horizon, zenith, elevation) + vec3(.19,.10,.02)*halo;
      gl_FragColor=vec4(color,1.);
      #include <colorspace_fragment>
    }
  `,
  }),
);
sky.renderOrder = -10;
scene.add(sky);
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
renderer.toneMappingExposure = 1.06;
const studio = new RoomEnvironment();
const environment = new THREE.PMREMGenerator(renderer);
scene.environment = environment.fromScene(studio, 0.07).texture;
scene.environmentIntensity = 0.53;
environment.dispose();
studio.dispose();
$("app").prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xf5fbff, 0x98b16f, 1.85));
const sun = new THREE.DirectionalLight(0xffedc7, 2.75);
const sunOffset = new THREE.Vector3(-25, 50, 20);
sun.position.copy(sunOffset);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.radius = 2.6;
sun.shadow.bias = -0.00025;
sun.shadow.normalBias = 0.035;
sun.shadow.camera.far = 200;
sun.shadow.camera.left = -51;
sun.shadow.camera.right = 51;
sun.shadow.camera.top = 51;
sun.shadow.camera.bottom = -51;
scene.add(sun, sun.target);
const models = await loadModels();
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
const grassMap = paintTexture(256, (ctx, size) => {
  ctx.fillStyle = "#96b681";
  ctx.fillRect(0, 0, size, size);
  const grain = surfaceTexture("#9db780", [
    "#a9c28a",
    "#8cac72",
    "#78996a",
    "#b2c197",
  ]);
  ctx.drawImage(grain.image, 0, 0);
  for (let i = 0; i < 38; i++) {
    const x = (i * 93) % size,
      y = (i * 153) % size;
    const tint = ctx.createRadialGradient(x, y, 0, x, y, 14 + (i % 13));
    tint.addColorStop(0, i % 3 ? "#52783938" : "#d9ca8841");
    tint.addColorStop(1, "#829e4900");
    ctx.fillStyle = tint;
    ctx.fillRect(x - 29, y - 29, 58, 58);
  }
  grain.dispose();
});
grassMap.wrapS = grassMap.wrapT = THREE.RepeatWrapping;
grassMap.repeat.set(64, 64);
green.map = grassMap;
green.color.setHex(0xd9e3b9);
roadMat.map = surfaceTexture("#777579", [
  "#8b898b",
  "#64646a",
  "#929193",
  "#525057",
]);
const roadRelief = paintTexture(256, (ctx, size) => {
  const stone = new Float32Array(size * size);
  let value = 934152;
  for (let i = 0; i < stone.length; i++) {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    stone[i] = (value / 4294967296) ** 2;
  }
  const pixels = ctx.createImageData(size, size);
  const clamp = (x, y) => stone[(y & 255) * size + (x & 255)];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const nx = (clamp(x - 1, y) - clamp(x + 1, y)) * 0.35;
      const ny = (clamp(x, y - 1) - clamp(x, y + 1)) * 0.35;
      const length = Math.hypot(1, nx, ny);
      pixels.data[i] = 128 + (127 * nx) / length;
      pixels.data[i + 1] = 128 + (127 * ny) / length;
      pixels.data[i + 2] = 128 + 127 / length;
      pixels.data[i + 3] = 255;
    }
  ctx.putImageData(pixels, 0, 0);
});
roadRelief.colorSpace = THREE.NoColorSpace;
roadRelief.wrapS = roadRelief.wrapT = THREE.RepeatWrapping;
roadRelief.repeat.set(3, 4);
roadMat.normalMap = roadRelief;
roadMat.normalScale.set(0.29, 0.29);
roadMat.color.setHex(0xcac7cc);
roadMat.roughness = 0.91;
const terrain = new THREE.Mesh(terrainGeometry(), green);
green.vertexColors = true;
terrain.receiveShadow = true;
scene.add(terrain);
const river = createRiver();
scene.add(river);
const N = 500;
const track = centerline.getSpacedPoints(N).slice(0, N);
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
const width = 13.2 * COURSE_SCALE;
const shoulderWidth = 1.35;
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
const bridgeDeck = mat(0xcba77e, 0.78);
bridgeDeck.map = paintTexture(256, (ctx, size) => {
  ctx.fillStyle = "#ab8764";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 12; i++) {
    const x = (i * size) / 12;
    ctx.fillStyle = ["#bc956d", "#c9a47a", "#b18765", "#b8976e"][i % 4];
    ctx.fillRect(x + 2, 0, size / 12 - 2, size);
    ctx.fillStyle = "#e5c397";
    ctx.fillRect(x + 2, 0, 2, size);
    ctx.fillStyle = "#53422f";
    for (const y of [13, 119, 241]) ctx.fillRect(x + size / 24, y, 3, 3);
  }
});
bridgeDeck.map.wrapS = bridgeDeck.map.wrapT = THREE.RepeatWrapping;
const sandRoad = mat(0xffecce, 0.95);
sandRoad.map = surfaceTexture("#cba87b", [
  "#ddbd92",
  "#bc9a75",
  "#d5b081",
  "#e0c095",
]);
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
  let first = 0;
  let material = surfaceAt(sample(0.5 / N));
  for (let i = 1; i <= N; i++) {
    const next = i === N ? -1 : surfaceAt(sample((i + 0.5) / N));
    if (next === material) continue;
    g.addGroup(first * 6, (i - first) * 6, material);
    material = next;
    first = i;
  }
  let o = new THREE.Mesh(g, [roadMat, bridgeDeck, sandRoad]);
  o.receiveShadow = true;
  scene.add(o);
}
trackSurface();
const tirePrint = paintTexture(128, (ctx, size) => {
  const fade = ctx.createLinearGradient(0, 0, 0, size);
  fade.addColorStop(0, "#231e2600");
  fade.addColorStop(0.25, "#231e2677");
  fade.addColorStop(0.7, "#211e257f");
  fade.addColorStop(1, "#211e2500");
  ctx.fillStyle = fade;
  for (const x of [37, 85]) {
    ctx.fillRect(x - 3, 0, 6, size);
    for (let j = 0; j < 128; j += 8) ctx.fillRect(x - 6 + (j % 4), j, 12, 3);
  }
});
const tirePrintMaterial = new THREE.MeshStandardMaterial({
  color: 0x534b55,
  map: tirePrint,
  transparent: true,
  opacity: 0.58,
  depthWrite: false,
  roughness: 1,
});
for (const t of [
  0.1, 0.19, 0.25, 0.268, 0.34, 0.45, 0.53, 0.609, 0.703, 0.954,
]) {
  const point = sample(t),
    direction = tangent(t);
  const offset = ((t * 190) % 3) - 1.5;
  point.addScaledVector(
    new THREE.Vector3(-direction.z, 0, direction.x),
    offset,
  );
  if (surfaceAt(point) === 1) continue;
  const mark = mesh(
    new THREE.PlaneGeometry(2.8, 6 + Math.sin(t * 88) * 2),
    tirePrintMaterial,
    [point.x, 0.025, point.z],
  );
  mark.rotation.order = "YXZ";
  mark.rotation.set(-Math.PI / 2, Math.atan2(direction.x, direction.z), 0);
  mark.castShadow = false;
}

ribbon(width / 2, white, 0.035);
ribbon(-width / 2, white, 0.035);
const railMaterial = mat(0x184850, 0.51);
const bridgeTrim = mat(0x994e31, 0.77);
const bridgeSteel = mat(0x525b5c, 0.65, 0.2);
function railPoint(t, side) {
  const direction = tangent(t);
  return sample(t).addScaledVector(
    new THREE.Vector3(-direction.z, 0, direction.x),
    (width / 2 + shoulderWidth) * side,
  );
}
const railSegments = Math.round(172 * COURSE_SCALE);
function makeCurbs() {
  const vertices = [];
  const indices = [];
  const geometry = new THREE.BufferGeometry();
  for (const side of [-1, 1]) {
    for (let i = 0; i < N; i++) {
      const t = i / N;
      if (surfaceAt(sample((i + 0.5) / N)) === 1) continue;
      const first = vertices.length / 3;
      for (const s of [t, (i + 1) / N]) {
        const p = sample(s),
          d = tangent(s);
        for (const edge of [-0.18, 0.31]) {
          const lateral = (width / 2) * side + edge;
          vertices.push(p.x - d.z * lateral, 0.054, p.z + d.x * lateral);
        }
      }
      geometry.addGroup(indices.length, 6, Math.floor(i / 4) % 2);
      indices.push(
        first,
        first + 1,
        first + 2,
        first + 1,
        first + 3,
        first + 2,
      );
    }
  }
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const curb = new THREE.Mesh(geometry, [white, red]);
  curb.receiveShadow = true;
  scene.add(curb);
}
makeCurbs();
for (let i = 0; i < railSegments; i++) {
  const t = i / railSegments;
  const center = sample(t);
  const direction = tangent(t);
  const isBridge = surfaceAt(center) === 1;
  if (i % 4 === 0 && surfaceAt(center) === 0) {
    const stripe = box(0.15, 0.012, 1.35, yellow, [center.x, 0.031, center.z]);
    stripe.rotation.y = Math.atan2(direction.x, direction.z);
    stripe.castShadow = false;
  }
  for (const side of [-1, 1]) {
    const from = railPoint(t, side);
    const to = railPoint((i + 1) / railSegments, side);
    const length = from.distanceTo(to);
    const midpoint = from.clone().lerp(to, 0.5);
    const angle = Math.atan2(to.x - from.x, to.z - from.z);
    const panel = new THREE.Group();
    panel.position.copy(midpoint);
    panel.rotation.y = angle;
    scene.add(panel);
    box(
      0.69,
      0.72,
      length + 0.04,
      isBridge ? bridgeDeck : i % 2 ? red : white,
      [0, 0.51, 0],
      panel,
    );
    box(
      0.78,
      0.16,
      length + 0.11,
      isBridge ? bridgeTrim : railMaterial,
      [0, 0.95, 0],
      panel,
    );
    if (isBridge) {
      box(
        1.04,
        0.3,
        length + 0.12,
        bridgeSteel,
        [side * 0.15, -0.22, 0],
        panel,
      );
      box(0.41, 0.13, length + 0.12, bridgeTrim, [side * 0.13, 0.26, 0], panel);
      if (i % 3 === 0) {
        box(0.58, 1.5, 0.63, bridgeSteel, [side * 0.24, -0.91, 0], panel);
        box(0.92, 0.12, 0.27, bridgeTrim, [0, 1.033, 0], panel);
      }
    }
    if (i % 2 === 0)
      box(0.87, 1.05, 0.24, railMaterial, [0, 0.49, -length / 2], panel);
    solids.push(
      rectangle(midpoint.x, midpoint.z, 0.78, length + 0.13, angle, 1.03),
    );
  }
}
for (let j = 0; j < 1; j++) {
  let t = j / 10,
    p = sample(t),
    d = tangent(t),
    s = new THREE.Vector3(-d.z, 0, d.x);
  for (let k = 0; k < 8; k++) {
    const tileWidth = width / 8;
    let q = p.clone().addScaledVector(s, (k - 3.5) * tileWidth);
    let tile = box(tileWidth, 0.04, 1.1, (j + k) % 2 ? dark : white, [
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
const canopyShape = new THREE.SphereGeometry(1, 18, 12);
const placements = new Map();
function plant(name, x, y, z, scale = 1) {
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      rnd() * Math.PI * 2,
    ),
    new THREE.Vector3(scale, scale, scale),
  );
  const key = name + "/" + Math.floor(x / 39) + "/" + Math.floor(z / 39);
  if (!placements.has(key)) placements.set(key, []);
  placements.get(key).push(matrix);
}
function placeVegetation() {
  models.grove.updateMatrixWorld(true);
  const prototypes = new Map();
  for (const [key, matrices] of placements) {
    const name = key.split("/")[0];
    const prototype = models.grove.getObjectByName(name);
    if (!prototypes.has(name)) {
      const byMaterial = new Map();
      prototype.traverse((part) => {
        if (!part.isMesh) return;
        const pieces = byMaterial.get(part.material) ?? [];
        const geometry = part.geometry.index
          ? part.geometry.toNonIndexed()
          : part.geometry.clone();
        // Quantized GLB positions must be promoted before baking node transforms.
        for (const semantic of ["position", "normal"]) {
          const attribute = geometry.getAttribute(semantic);
          if (!attribute) continue;
          const floats = new Float32Array(attribute.count * 3);
          for (let i = 0; i < attribute.count; i++) {
            floats[i * 3] = attribute.getX(i);
            floats[i * 3 + 1] = attribute.getY(i);
            floats[i * 3 + 2] = attribute.getZ(i);
          }
          geometry.setAttribute(semantic, new THREE.BufferAttribute(floats, 3));
        }
        pieces.push(geometry.applyMatrix4(part.matrixWorld));
        byMaterial.set(part.material, pieces);
      });
      prototypes.set(
        name,
        [...byMaterial].map(([material, pieces]) => {
          const combined = mergeGeometries(pieces);
          if (!combined)
            throw new Error("Malha de vegetação inválida: " + name);
          pieces.forEach((geometry) => geometry.dispose());
          return [material, combined];
        }),
      );
    }
    for (const [material, combined] of prototypes.get(name)) {
      const mesh = new THREE.InstancedMesh(combined, material, matrices.length);
      matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
      mesh.castShadow = name.startsWith("Tree");
      mesh.receiveShadow = true;
      scene.add(mesh);
    }
  }
}
for (let i = 0; i < 242; i++) {
  const originalX = (rnd() - 0.5) * 176;
  const originalZ = (rnd() - 0.5) * 146;
  const x = originalX * COURSE_SCALE,
    z = originalZ * COURSE_SCALE;
  if (
    channelDistance(x, z) < 5 ||
    closest(new THREE.Vector3(x, 0, z)).dist <
      width / 2 + shoulderWidth + 3.9 ||
    (originalX > 15 && originalX < 43 && originalZ > -16 && originalZ < 8)
  )
    continue;
  const scale = 0.78 + rnd() * 0.61;
  plant("Tree" + (i % 3), x, -0.1, z, scale);
  solids.push(trunk(x, z, 0.42 * scale, 4.35 * scale));
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
    Math.cos(angle) * 125 * COURSE_SCALE,
    -6,
    Math.sin(angle) * 124 * COURSE_SCALE,
  ]);
  hill.scale.set(19 + rnd() * 21, 14 + rnd() * 16, 21 + rnd() * 13);
  hill.castShadow = false;
}
for (let i = 0; i < 99; i++) {
  const t = (i + 0.52) / 99;
  const side = i % 2 === 0 ? 1 : -1;
  const edge = railPoint(t, side).lerp(sample(t), -0.21 - rnd() * 0.23);
  if (channelDistance(edge.x, edge.z) < 2.7) continue;
  plant(
    i % 3 === 0 ? "Shrub" : "Flowers",
    edge.x,
    -0.105,
    edge.z,
    0.62 + rnd() * 0.48,
  );
}
const cloud = new THREE.MeshBasicMaterial({ color: 0xfff5df, fog: false });
for (let i = 0; i < 12; i++) {
  const angle = (i * Math.PI) / 6;
  const group = new THREE.Group();
  group.position.set(
    Math.cos(angle) * 136,
    33 + (i % 4) * 7,
    Math.sin(angle) * 126,
  );
  group.rotation.y = -angle;
  scene.add(group);
  for (let j = 0; j < 4; j++) {
    const puff = mesh(
      canopyShape,
      cloud,
      [(j - 1.5) * 5, Math.sin(j) * 2.3, 0],
      group,
    );
    puff.scale.set(7 - j * 0.44, 2.1 + Math.sin(j) * 1.9, 3.3);
    puff.castShadow = puff.receiveShadow = false;
  }
}
// The timing shelter sits in the infield, beyond the inner guardrail.
const shelter = new THREE.Group();
shelter.position.set(24 * COURSE_SCALE, 0, -3 * COURSE_SCALE);
shelter.scale.set(1.5, 1.3, 1.42);
shelter.rotation.y = -0.46;
scene.add(shelter);
const timber = mat(0xd68840);
const concrete = mat(0xe1af76);
const roof = mat(0xb34537, 0.54);
const glazing = mat(0x679eac, 0.23, 0.3);
box(11, 0.69, 6.4, concrete, [0, 0.28, 0], shelter);
box(7.2, 3.2, 3.8, timber, [0, 2.04, 0.36], shelter);
for (const x of [-3.33, -1.45, 1.45, 3.33]) {
  box(0.16, 2.3, 0.19, concrete, [x, 2.18, -1.58], shelter);
}
for (const x of [-2.33, 0, 2.33]) {
  box(1.64, 1.33, 0.18, roof, [x, 2.36, -1.6], shelter);
  box(1.45, 1.12, 0.2, glazing, [x, 2.36, -1.67], shelter);
  box(1.5, 0.1, 0.21, concrete, [x, 2.36, -1.79], shelter);
}
for (const side of [-1, 1]) {
  const panel = box(
    8.35,
    0.24,
    2.85,
    roof,
    [0, 3.84, side * 1.21 + 0.36],
    shelter,
  );
  panel.rotation.x = side * 0.18;
  for (let x = -3.7; x < 4; x += 0.52) {
    const seam = box(
      0.078,
      0.073,
      2.7,
      railMaterial,
      [x, 3.985, side * 1.21 + 0.36],
      shelter,
    );
    seam.rotation.x = panel.rotation.x;
  }
}
box(8.35, 0.24, 0.19, red, [0, 4.17, 0.36], shelter);
box(8.65, 0.18, 1.2, concrete, [0, 1.24, -2.05], shelter);
const marketLettering = mat(0xffffff, 0.6);
marketLettering.map = paintTexture(512, (ctx, size) => {
  ctx.fillStyle = "#17464a";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "#e4ac51";
  ctx.lineWidth = 15;
  ctx.strokeRect(17, 17, size - 34, size - 34);
  ctx.fillStyle = "#ffe3a7";
  ctx.textAlign = "center";
  ctx.font = "800 84px system-ui";
  ctx.fillText("MERCADO", size / 2, 229);
  ctx.fillText("DAS ÁGUAS", size / 2, 352);
});
box(
  3.65,
  0.86,
  0.16,
  [timber, timber, timber, timber, timber, marketLettering],
  [0, 3.47, -1.67],
  shelter,
);
for (const side of [-1, 1]) {
  const awning = new THREE.Group();
  awning.position.set(side * 2.55, 2.35, -2.49);
  awning.rotation.x = 0.16;
  shelter.add(awning);
  for (let i = 0; i < 7; i++)
    box(
      0.26,
      0.065,
      1.62,
      i % 2 ? white : bridgeTrim,
      [(i - 3) * 0.26, 0, 0],
      awning,
    );
  for (const x of [-0.94, 0.94])
    box(0.11, 2.12, 0.11, bridgeTrim, [x, -1.09, -0.73], awning);
  const planter = box(
    0.89,
    0.52,
    0.93,
    bridgeTrim,
    [side * 3.99, 0.54, -1.97],
    shelter,
  );
  planter.rotation.y = side * 0.22;
  const fern = models.grove.getObjectByName("Shrub").clone(true);
  fern.position.set(side * 3.98, 0.8, -2.06);
  fern.scale.setScalar(0.61);
  shelter.add(fern);
}
placeVegetation();
// Hand-painted mileposts and patterned bridge entrances give the course its own landmarks.
const tileInk = mat(0x26706d, 0.42);
tileInk.map = paintTexture(128, (ctx, size) => {
  ctx.fillStyle = "#e8d0a1";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "#216b69";
  ctx.lineWidth = 9;
  for (const x of [0, 64, 128])
    for (const y of [0, 64, 128]) {
      ctx.beginPath();
      ctx.moveTo(x - 29, y);
      ctx.lineTo(x, y - 29);
      ctx.lineTo(x + 29, y);
      ctx.lineTo(x, y + 29);
      ctx.closePath();
      ctx.stroke();
    }
});
const bronze = mat(0xad6440, 0.46, 0.25);
for (const t of [0.04, 0.12, 0.4, 0.58, 0.72, 0.97]) {
  const d = tangent(t);
  const p = railPoint(t, t > 0.5 ? -1 : 1).lerp(sample(t), -0.17);
  const post = new THREE.Group();
  post.position.copy(p);
  post.rotation.y = Math.atan2(d.x, d.z);
  scene.add(post);
  box(0.42, 1.29, 0.45, bridgeSteel, [0, 0.66, 0], post);
  box(
    0.52,
    0.53,
    0.07,
    [bridgeSteel, bridgeSteel, bridgeSteel, bridgeSteel, tileInk, tileInk],
    [0, 0.93, 0],
    post,
  );
  box(0.59, 0.11, 0.58, bronze, [0, 1.35, 0], post);
}
const chevrons = [-1, 1].map((side) => {
  const material = mat(0xffffff, 0.53);
  material.map = paintTexture(256, (ctx, size) => {
    ctx.fillStyle = "#123449";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "#fcab44";
    ctx.lineWidth = 10;
    ctx.strokeRect(7, 7, 242, 242);
    ctx.save();
    if (side < 0) {
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
    }
    ctx.strokeStyle = "#ffe6a6";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 19;
    for (const x of [55, 121]) {
      ctx.beginPath();
      ctx.moveTo(x, 69);
      ctx.lineTo(x + 68, 128);
      ctx.lineTo(x, 187);
      ctx.stroke();
    }
    ctx.restore();
  });
  return material;
});
for (const t of [
  0.09, 0.14, 0.21, 0.29, 0.36, 0.44, 0.51, 0.57, 0.64, 0.71, 0.78, 0.86, 0.94,
]) {
  const before = tangent(t);
  const after = tangent(t + 0.027);
  const turn = Math.sign(before.x * after.z - before.z * after.x) || 1;
  const point = railPoint(t + 0.025, -turn);
  const sign = new THREE.Group();
  sign.position.copy(point);
  sign.rotation.y = Math.atan2(before.x, before.z) + Math.PI;
  scene.add(sign);
  box(0.1, 1.8, 0.1, railMaterial, [0, 1.3, 0], sign);
  box(
    1.65,
    0.93,
    0.12,
    [
      railMaterial,
      railMaterial,
      railMaterial,
      railMaterial,
      chevrons[turn > 0 ? 1 : 0],
      railMaterial,
    ],
    [0, 2.09, 0],
    sign,
  );
}
// Decorative gantry
{
  let p = sample(0),
    d = tangent(0),
    s = new THREE.Vector3(-d.z, 0, d.x);
  const postOffset = width / 2 + shoulderWidth;
  for (let sign of [-1, 1]) {
    let q = p.clone().addScaledVector(s, sign * postOffset);
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
    ctx.font = "900 130px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("VIRA-LATA RACING", 0, 228);
    ctx.font = "700 98px system-ui";
    ctx.fillText("VOLTA DO RIBEIRÃO", 0, 369);
  });
  const banner = mat(0xffffff);
  banner.map = sign;
  const beam = box(
    2 * postOffset + 0.6,
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
    if (
      !object.isMesh ||
      object.isInstancedMesh ||
      object === sky ||
      object === river ||
      !object.visible ||
      Array.isArray(object.material)
    )
      return;
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
const { kart, body, wheels, wheelFace, tailLamp, exhaustGlows, dog, cat } =
  models;
const softDisc = paintTexture(96, (ctx, size) => {
  const light = ctx.createRadialGradient(48, 48, 1, 48, 48, 46);
  light.addColorStop(0, "#ffffffff");
  light.addColorStop(0.31, "#ffffffa0");
  light.addColorStop(0.67, "#ffffff48");
  light.addColorStop(1, "#ffffff00");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, size, size);
});
const contactShade = new THREE.Mesh(
  new THREE.PlaneGeometry(3.9, 4.7),
  new THREE.MeshBasicMaterial({
    color: 0x263542,
    map: softDisc,
    transparent: true,
    depthWrite: false,
    opacity: 0.36,
  }),
);
contactShade.rotation.x = -Math.PI / 2;
scene.add(contactShade);
const turboHalos = exhaustGlows.map((nozzle) => {
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: softDisc,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  glow.position.z = 0.1;
  glow.scale.set(0.91, 0.65, 1);
  nozzle.add(glow);
  return glow;
});
kart.scale.setScalar(KART_SCALE);
scene.add(kart);
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
    let progress = THREE.MathUtils.smoothstep(1 - swap / swapDuration, 0, 1),
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
const rampProgress = 0.8;
const rampPoint = sample(rampProgress);
const rampDirection = tangent(rampProgress);
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
const itemLanes = [
  [0.12, -2.7],
  [0.12, 2.7],
  [0.25, 0],
  [0.45, -2.8],
  [0.45, 2.8],
  [0.62, -2.7],
  [0.62, 2.7],
  [0.82, 0],
  [0.93, -2.5],
];
for (const [t, lane] of itemLanes) {
  const p = sample(t);
  const direction = tangent(t);
  p.addScaledVector(
    new THREE.Vector3(-direction.z, 0, direction.x),
    lane * COURSE_SCALE,
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
  itemBoost = 0,
  driftBoost = 0,
  activeTier = 0,
  lap = 1,
  elapsed = 0,
  prevProgress = 0.015,
  lastCheckpoint = 0,
  stun = 0,
  toastTime = 0;
heading = Math.atan2(tangent(0.015).x, tangent(0.015).z);
const itemTypes = ["banana", "turbo"];
const cruiseSpeed = 27;
const tiers = [
  {
    minimum: 0.39,
    duration: 0.8,
    power: 0.15,
    label: "Mini-turbo amarelo",
    color: 0xffd746,
    note: 392,
  },
  {
    minimum: 0.85,
    duration: 1.5,
    power: 0.25,
    label: "Mini-turbo azul",
    color: 0x42baff,
    note: 523.25,
  },
  {
    minimum: 1.34,
    duration: 2.5,
    power: 0.4,
    label: "Mini-turbo vermelho",
    color: 0xff454c,
    note: 659.25,
  },
];
let audio;
function unlockAudio() {
  if (!$("sounds").checked || !window.AudioContext) return;
  audio ??= new AudioContext();
  if (audio.state === "suspended") audio.resume().catch(() => {});
}
function driftCue(tier, released = false) {
  if (!audio || audio.state !== "running" || !$("sounds").checked) return;
  const tone = audio.createOscillator();
  const gain = audio.createGain();
  const at = audio.currentTime;
  const note = tiers[tier - 1].note;
  tone.type = released ? "triangle" : "sine";
  tone.frequency.setValueAtTime(note, at);
  tone.frequency.exponentialRampToValueAtTime(
    note * (released ? 1.58 : 1.13),
    at + 0.13,
  );
  gain.gain.setValueAtTime(0.001, at);
  gain.gain.exponentialRampToValueAtTime(0.075, at + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.001, at + 0.18);
  tone.connect(gain).connect(audio.destination);
  tone.start(at);
  tone.stop(at + 0.19);
}
let driftSide = 0;
let neutralTime = 0;
let swapCooldown = 0;
const swapDuration = 0.64;
const partner = () => (pilotDog ? cat : dog);
const boosting = () => itemBoost > 0 || driftBoost > 0;
const chargedTier = () => tiers.filter((tier) => drift >= tier.minimum).length;

function clearBoosts() {
  cancelDrift();
  itemBoost = driftBoost = activeTier = 0;
}
function cancelDrift() {
  drift = driftSide = neutralTime = 0;
}
function updateDrift(dt, turn, brake, offroad) {
  const driftHeld = Boolean(held("Space"));
  const invalid = velocity < 8.5 || brake || offroad || stun > 0 || y > 0.12;

  // Releasing the drift button converts accumulated charge into a mini-turbo.
  // A collision, loss of traction or braking cancels it without a reward.
  if (invalid) {
    cancelDrift();
    return;
  }
  if (!driftHeld) {
    if (driftSide) {
      const tier = chargedTier();
      if (tier > 0) {
        activeTier = tier;
        driftBoost = tiers[tier - 1].duration;
        velocity += cruiseSpeed * tiers[tier - 1].power;
        driftCue(tier, true);
        notify(tiers[tier - 1].label + "!");
      }
    }
    cancelDrift();
    return;
  }

  // Initiate a slide by holding drift and steering, independently of the
  // track's predefined curvature (the previous implementation required it).
  if (!driftSide && turn) {
    driftSide = turn;
    neutralTime = 0;
  }
  if (!driftSide) return;

  // Allow a brief steering correction and counter-steering without losing
  // the slide. The player still needs to actively control the kart.
  neutralTime = turn ? 0 : neutralTime + dt;
  if (neutralTime > 0.65) {
    cancelDrift();
    return;
  }

  const stage = chargedTier();
  const pace = THREE.MathUtils.clamp(velocity / 22, 0.65, 1.2);
  const steeringEffort = turn === driftSide ? 1 : turn === -driftSide ? 0.74 : 0.38;
  const slipEffort = THREE.MathUtils.clamp(Math.abs(vehicle.lateral) / 5, 0, 0.22);
  drift = Math.min(1.6, drift + dt * pace * (steeringEffort + slipEffort));
  const next = chargedTier();
  if (next > stage) driftCue(next);
}
const vehicle = new ArcadeVehicle();
const motion = vehicle.motion;
let impactTime = 0;
let impactLean = 0;
let landing = 0;
let slide = 0;
let throwTime = 0;
let bananaPending = false;
let slipAngle = 0;
let slipTime = 0;
let thrower = null;
function clearMotion() {
  vehicle.reset();
  impactTime = impactLean = landing = slide = slipAngle = slipTime = 0;
}
const itemMarkup = {
  banana: "🍌 Banana",
  turbo: turboIcon + " Turbo",
};
function notify(message, selectedItem) {
  const toast = $("toast");
  if (selectedItem) toast.innerHTML = itemMarkup[selectedItem];
  else toast.textContent = message;
  toastTime = 1.5;
}
function reset() {
  position.copy(sample(0.015));
  wasOnRamp = false;
  clearMotion();
  throwTime = 0;
  bananaPending = false;
  thrower = null;
  heading = Math.atan2(tangent(0.015).x, tangent(0.015).z);
  velocity = 0;
  y = vy = elapsed = stun = 0;
  clearBoosts();
  lap = 1;
  prevProgress = 0.015;
  lastCheckpoint = 0;
  dog.item = cat.item = null;
  pilotDog = true;
  swap = swapCooldown = 0;
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
    ? "🐈‍⬛ Parceiro: Gato Preto"
    : "🐕 Parceiro: Caramelo";
  for (const [mascot, id] of [
    [dog, "dog-item"],
    [cat, "cat-item"],
  ]) {
    const slot = $(id);
    const item = mascot.item;
    if (slot.dataset.item !== (item ?? "")) {
      slot.dataset.item = item ?? "";
      slot.querySelector("strong").innerHTML = item
        ? itemMarkup[item]
        : "Sem item";
    }
    const usable = mascot === partner() && swap <= 0;
    slot.classList.toggle("available", usable);
    slot.setAttribute("aria-current", usable ? "true" : "false");
  }
  $("swap-pilot").disabled = swapCooldown > 0;
  $("swap-pilot").classList.toggle("swapping", swap > 0);
  $("drift-meter").value = drift;
  $("drift-meter").parentElement.dataset.tier = chargedTier();
  const boostIndicator = $("boost");
  const boostState =
    itemBoost > 0 ? "item" : driftBoost > 0 ? String(activeTier) : "idle";
  if (boostIndicator.dataset.state !== boostState) {
    boostIndicator.dataset.state = boostState;
    boostIndicator.innerHTML =
      itemBoost > 0
        ? turboIcon + " Turbo ativo"
        : driftBoost > 0
          ? tiers[activeTier - 1].label + " ativo"
          : "Boost inativo";
  }
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
function releaseBanana() {
  bananaPending = false;
  const peel = makeBanana();
  const forward = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
  peel.position.copy(position).addScaledVector(forward, -2.34 * KART_SCALE);
  peel.position.y = y + 1.3 * KART_SCALE;
  peel.rotation.y = heading;
  scene.add(peel);
  hazards.push({
    g: peel,
    life: 30,
    lift: 2.1,
    motion: forward.multiplyScalar(-4.6),
  });
  notify("🍌 Banana lançada!");
}

function useItem() {
  const rider = partner();
  if (!rider.item || !running || paused || swap > 0 || bananaPending) return;
  const item = rider.item;
  rider.item = null;
  if (item === "turbo") {
    itemBoost = 2.3;
    velocity = Math.max(velocity + 8, 32);
    notify("", item);
  } else {
    thrower = rider;
    throwTime = 0.48;
    bananaPending = true;
  }
  updateHUD();
}
function swapCrew() {
  if (swapCooldown > 0 || paused || !running || bananaPending) return;
  swapFrom = pilotDog;
  swap = swapDuration;
  swapCooldown = 1.08;
  notify("↔ Trocando piloto");
  updateHUD();
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
  cancelDrift();
  $("app").classList.toggle("driving", running && !paused);
  $("menu").hidden = !paused;
  $("play").textContent =
    lap > 3 ? "NOVA CORRIDA" : running ? "CONTINUAR" : "COMEÇAR CORRIDA";
  $("race-status").textContent =
    lap > 3
      ? "Corrida concluída em " + $("time").textContent
      : running
        ? "Corrida pausada"
        : "Volta do Ribeirão · 3 voltas";
}
function recover() {
  if (!running || paused) return;
  const { t } = closest(position);
  position.copy(sample(t));
  prevProgress = t;
  velocity = y = vy = stun = 0;
  clearBoosts();
  clearMotion();
  wasOnRamp = false;
  heading = Math.atan2(tangent(t).x, tangent(t).z);
  snapCamera = true;
}
const actions = {
  swap: swapCrew,
  restart: () => $("reset").click(),
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
  unlockAudio();
  if (lap > 3) reset();
  running = true;
  setPaused(false);
  $("play").blur();
};
$("reset").onclick = () => {
  unlockAudio();
  reset();
  running = true;
  setPaused(false);
  $("reset").blur();
};
$("shadows").onchange = (e) => (renderer.shadowMap.enabled = e.target.checked);
const dirtMaterial = mat(0xccb18c);
const smokeMaterial = mat(0xb4c9d1);
const impactMaterial = new THREE.MeshBasicMaterial({ color: 0xffe5a0 });
const sparkMaterials = tiers.map(
  ({ color }) => new THREE.MeshBasicMaterial({ color }),
);
const flameMaterial = new THREE.MeshBasicMaterial({ color: 0x63faff });
const dust = Array.from({ length: 32 }, () => {
  const puff = sphere(0.23, dirtMaterial, [0, 0, 0]);
  puff.castShadow = puff.receiveShadow = puff.visible = false;
  return {
    puff,
    life: 0,
    duration: 0,
    spark: false,
    velocity: new THREE.Vector3(),
  };
});
let dustIndex = 0,
  dustDelay = 0;
function updateDust(dt, active) {
  dustDelay -= dt;
  if (
    (active || boosting() || impactTime > 0.19) &&
    dustDelay <= 0 &&
    $("particles").checked
  ) {
    const particle = dust[dustIndex];
    const { puff } = particle;
    const tier = chargedTier();
    const spark = impactTime > 0.19 || (tier > 0 && dustIndex % 4 !== 0);
    puff.material = boosting()
      ? itemBoost > 0
        ? flameMaterial
        : sparkMaterials[activeTier - 1]
      : impactTime > 0.19
        ? impactMaterial
        : spark
          ? sparkMaterials[tier - 1]
          : driftSide
            ? smokeMaterial
            : dirtMaterial;
    particle.spark = boosting() || spark;
    particle.duration = particle.life = particle.spark ? 0.25 : 0.56;
    const speed = particle.spark ? 3.9 : 0.95;
    particle.velocity.set(
      -Math.sin(heading + slide) * speed,
      particle.spark ? 0.55 : 0.9,
      -Math.cos(heading + slide) * speed,
    );
    puff.rotation.y = heading + slide;
    puff.position.copy(position);
    puff.position.x -= Math.sin(heading) * 1.25 * KART_SCALE;
    puff.position.z -= Math.cos(heading) * 1.25 * KART_SCALE;
    const spread =
      (dustIndex % 2 ? 1 : -1) * (boosting() ? 0.77 : 1.09) * KART_SCALE;
    puff.position.x += Math.cos(heading) * spread;
    puff.position.z -= Math.sin(heading) * spread;
    puff.position.y = y + (boosting() ? 0.54 : 0.25) * KART_SCALE;
    dustIndex = (dustIndex + 1) % dust.length;
    dustDelay = 0.035;
  }
  for (const particle of dust) {
    particle.life = Math.max(0, particle.life - dt);
    particle.puff.visible = particle.life > 0 && $("particles").checked;
    if (particle.life <= 0) continue;
    particle.puff.position.addScaledVector(particle.velocity, dt);
    const remaining = particle.life / particle.duration;
    if (particle.spark)
      particle.puff.scale.set(
        0.31 * remaining,
        0.28 * remaining,
        1.3 * remaining,
      );
    else
      particle.puff.scale.setScalar(
        (1.12 - remaining * 0.72) * Math.min(1, remaining * 3),
      );
  }
}
const camTarget = new THREE.Vector3();
const cameraSide = new THREE.Vector3();
const cameraDesired = new THREE.Vector3();
const cameraLook = new THREE.Vector3();
const cameraForward = new THREE.Vector3();
let cameraHeading = heading;

function followHeading(heading, slip, dt) {
  const target = heading + slip * 0.52;
  const difference = Math.atan2(
    Math.sin(target - cameraHeading),
    Math.cos(target - cameraHeading),
  );
  cameraHeading = snapCamera
    ? target
    : cameraHeading + difference * (1 - Math.exp(-7 * dt));
  return cameraHeading;
}

function shortenChase(target, desired, solids) {
  const dx = desired.x - target.x,
    dz = desired.z - target.z;
  const distance = dx * dx + dz * dz;
  let bound = 1;
  for (const obstacle of solids) {
    if (obstacle.height < 2.1) continue;
    const x = obstacle.x - target.x,
      z = obstacle.z - target.z;
    const t = (x * dx + z * dz) / distance;
    if (
      t < 0.24 ||
      t > bound ||
      target.y + (desired.y - target.y) * t > obstacle.height + 0.25
    )
      continue;
    const radius =
      (obstacle.radius ?? Math.max(obstacle.halfWidth, obstacle.halfLength)) +
      0.34;
    if ((x - dx * t) ** 2 + (z - dz * t) ** 2 < radius ** 2)
      bound = Math.max(0.24, t - (radius + 0.32) / Math.sqrt(distance));
  }
  if (bound < 1) desired.lerp(target, 1 - bound);
}
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
const streakGeo = new THREE.BufferGeometry();
const streakPoints = new Float32Array(16 * 6);
const streakAlpha = new Float32Array(16 * 2);
streakGeo.setAttribute("position", new THREE.BufferAttribute(streakPoints, 3));
streakGeo.setAttribute("fade", new THREE.BufferAttribute(streakAlpha, 1));
const streaks = new THREE.LineSegments(
  streakGeo,
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    vertexShader:
      "attribute float fade;varying float alpha; void main(){alpha=fade;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader:
      "varying float alpha; void main(){gl_FragColor=vec4(.65,.92,1.,alpha);}",
  }),
);
streaks.frustumCulled = false;
streaks.renderOrder = 20;
camera.add(streaks);
scene.add(camera);
let streakStrength = 0;
function updateStreaks(intensity, dt, now) {
  streakStrength = THREE.MathUtils.lerp(
    streakStrength,
    intensity,
    1 - Math.exp(-8 * dt),
  );
  streaks.visible = streakStrength > 0.015;
  if (!streaks.visible) return;
  const edge = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
  for (let i = 0; i < 16; i++) {
    const phase = (now * 2.6 + i * 0.618) % 1;
    const angle = i * 2.39996;
    const x = Math.cos(angle) * edge * camera.aspect,
      y = Math.sin(angle) * edge;
    const radius = 0.53 + phase * 0.75;
    const long = 0.06 + streakStrength * 0.23;
    streakPoints.set(
      [
        x * (radius - long),
        y * (radius - long),
        -1,
        x * radius,
        y * radius,
        -1,
      ],
      i * 6,
    );
    streakAlpha[i * 2] = 0;
    streakAlpha[i * 2 + 1] = Math.sin(phase * Math.PI) * streakStrength * 0.63;
  }
  streakGeo.attributes.position.needsUpdate = true;
  streakGeo.attributes.fade.needsUpdate = true;
}
let previousFrame = performance.now();
function tick() {
  requestAnimationFrame(tick);
  const frame = performance.now(),
    frameSeconds = (frame - previousFrame) / 1000,
    visualDt = Math.min(frameSeconds, 0.05),
    now = frame / 1000;
  previousFrame = frame;
  river.material.uniforms.time.value = now;
  let dustActive = false;
  if (running && !paused) elapsed += frameSeconds;
  const stepCount = Math.max(1, Math.ceil(visualDt / PHYSICS_STEP - 1e-7));
  const dt = visualDt / stepCount;
  for (let step = 0; step < stepCount && running && !paused && dt > 0; step++) {
    let accel = held("KeyW") || held("ArrowUp"),
      brake = held("KeyS") || held("ArrowDown"),
      left = held("KeyA") || held("ArrowLeft"),
      right = held("KeyD") || held("ArrowRight"),
      turn = Number(right) - Number(left);
    const near = closest(position);
    const offroad = near.dist > width / 2;
    updateDrift(dt, turn, brake, offroad);
    const drifting = driftSide !== 0;
    dustActive = (drifting || offroad) && velocity > 6;
    itemBoost = Math.max(0, itemBoost - dt);
    driftBoost = Math.max(0, driftBoost - dt);
    const boostSpeed = Math.max(
      itemBoost > 0 ? 38 : 0,
      driftBoost > 0 ? cruiseSpeed * (1 + tiers[activeTier - 1].power) : 0,
    );
    const surface = offroad
      ? "grass"
      : surfaceAt(position) === 2
        ? "dirt"
        : "road";
    const next = vehicle.step(dt, {
      heading,
      speed: velocity,
      turn,
      throttle: accel,
      brake,
      surface,
      drifting,
      driftSide,
      air: y > 0.06,
      boostedSpeed: boostSpeed,
      stunned: stun > 0,
    });
    heading = next.heading;
    velocity = next.speed;
    stun = Math.max(0, stun - dt);
    const impact = moveKart(position, motion, heading, y, dt, solids);
    velocity = vehicle.resolveContact(impact);
    slide = Math.atan2(vehicle.lateral, Math.max(3, Math.abs(velocity)));
    if (impact > 3 && impactTime < 0.1) {
      impactTime = 0.36;
      impactLean = Math.min(0.25, impact * 0.014);
      clearBoosts();
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
      if (vy < -3) {
        landing = Math.min(0.24, -vy * 0.039);
        vehicle.touchDown(vy);
      }
      vy = 0;
    }
    impactTime = Math.max(0, impactTime - dt);
    landing *= Math.exp(-9 * dt);
    throwTime = Math.max(0, throwTime - dt);
    if (bananaPending && throwTime <= 0.3) releaseBanana();
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
        (!dog.item || !cat.item) &&
        Math.abs(p.g.position.y - (y + 1)) < 1.25 &&
        Math.hypot(p.g.position.x - position.x, p.g.position.z - position.z) < 2
      ) {
        p.active = false;
        p.cool = 7;
        p.g.visible = false;
        const rear = partner();
        const recipient = rear.item ? (pilotDog ? dog : cat) : rear;
        recipient.item = itemTypes[Math.floor(rnd() * itemTypes.length)];
        notify("", recipient.item);
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
        hazard.g.position.distanceTo(position) < 0.45 + 1.07 * KART_SCALE
      ) {
        stun = 0.8;
        slipTime = 0.72;
        velocity *= 0.3;
        vehicle.lateral *= 0.42;
        clearBoosts();
        hazard.life = 0;
        notify("🍌 Escorregou!");
      }
    }
    for (let i = hazards.length - 1; i >= 0; i--) {
      if (hazards[i].life > 0) continue;
      scene.remove(hazards[i].g);
      hazards.splice(i, 1);
    }
    swapCooldown = Math.max(0, swapCooldown - dt);
    if (swap > 0) {
      swap = Math.max(0, swap - dt);
      if (!swap) {
        pilotDog = !swapFrom;
        notify("↔ " + (pilotDog ? "Caramelo" : "Gato Preto") + " no volante");
      }
    }
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
  }
  if (running && !paused) updateHUD();
  if (toastTime > 0) {
    toastTime -= visualDt;
    if (toastTime <= 0) $("toast").textContent = "";
  }
  updateDust(visualDt, dustActive);
  kart.position.set(position.x, y, position.z);
  if (renderer.shadowMap.enabled) {
    sun.target.position.set(position.x, 0, position.z);
    sun.position.copy(sun.target.position).add(sunOffset);
  }
  contactShade.position.set(position.x, 0.039, position.z);
  contactShade.rotation.z = heading;
  contactShade.material.opacity = 0.34 * Math.exp(-3 * y);
  contactShade.visible = renderer.shadowMap.enabled;
  kart.rotation.y = heading + Math.PI + slipAngle;
  const turn = vehicle.steer;
  const gain = 1 - Math.exp(-11 * visualDt);
  body.position.y = vehicle.heave;
  body.rotation.z = THREE.MathUtils.lerp(
    body.rotation.z,
    vehicle.roll - slide * 0.13,
    gain,
  );
  body.rotation.x = THREE.MathUtils.lerp(
    body.rotation.x,
    vehicle.pitch + vy * 0.027 - impactLean * impactTime,
    gain,
  );
  for (const w of wheels) {
    if (running && !paused) {
      const wheelSpeed =
        velocity + w.side * turn * Math.min(4, Math.abs(velocity) * 0.14);
      w.axle.rotation.x += (wheelSpeed * visualDt) / (0.55 * KART_SCALE);
    }
    w.pivot.rotation.y = w.front ? -turn * (0.39 + w.side * turn * 0.05) : 0;
    const transfer =
      body.rotation.x * (w.front ? -0.29 : 0.29) -
      body.rotation.z * w.side * 0.44;
    const suspension =
      0.605 - vehicle.heave + transfer - Math.min(y, 0.6) * 0.09;
    w.spring.scale.y = THREE.MathUtils.clamp(
      1 - (suspension - 0.605) * 1.75,
      0.65,
      1.27,
    );
    w.pivot.position.y = THREE.MathUtils.lerp(
      w.pivot.position.y,
      suspension,
      gain,
    );
  }
  wheelFace.rotation.z = -turn * 0.38;
  const jump = Math.sin((Math.PI * swap) / swapDuration);
  for (const m of [dog, cat]) {
    const throwing = m === thrower ? Math.sin((Math.PI * throwTime) / 0.48) : 0;
    const isPilot = m === (pilotDog ? dog : cat);
    m.root.rotation.x =
      -vy * 0.029 +
      landing * 0.45 +
      impactTime * 0.38 -
      (boosting() ? 0.075 : 0);
    m.root.rotation.z =
      -body.rotation.z * 0.75 + (m.cat ? -1 : 1) * jump * 0.23;
    m.root.rotation.y = (m.cat ? 1 : -1) * jump * 0.58;
    m.head.rotation.y = -turn * 0.14 + (isPilot ? 0 : throwing * 0.53);
    m.head.rotation.z = Math.sin(now * 5) * 0.035 - body.rotation.z * 0.65;
    m.tail.rotation.y = Math.sin(now * (m.cat ? 5.9 : 9)) * 0.36 - turn * 0.21;
    m.tail.rotation.x = Math.sin(now * 5.5) * 0.12 + vy * 0.029;
    const startled = impactTime > 0.12 || slipTime > 0.25 || vy > 2.75;
    const tier = chargedTier();
    const delighted = boosting() && !isPilot;
    const open = startled
      ? 0.64
      : delighted
        ? 0.42 + Math.sin(now * 12) * 0.09
        : swap > 0
          ? 0.22
          : tier * 0.035;
    m.jaw.rotation.x = THREE.MathUtils.lerp(
      m.jaw.rotation.x,
      -open,
      1 - Math.exp(-17 * dt),
    );
    m.smile.visible = m.jaw.rotation.x > -0.33;
    m.openMouth.visible = m.jaw.rotation.x < -0.14;
    m.tongue.visible = delighted || startled;
    m.tailMesh.morphTargetInfluences[0] =
      0.45 + Math.sin(now * 6.7) * 0.27 + Math.abs(slide) * 0.43;
    m.tail.rotation.y += slide * 0.33;
    m.head.rotation.y +=
      Math.sin(now * 2.3) * 0.05 + (m.cat ? -0.15 : 0.17) * jump;
    m.mixer.update(visualDt);
    m.scarf.morphTargetInfluences[0] = THREE.MathUtils.clamp(
      Math.abs(velocity) / 42 +
        Math.sin(now * 9) * 0.11 +
        Math.abs(slide) * 0.23,
      0,
      1,
    );
    for (const [i, { eye, brow, slit, gaze, side }] of m.eyeGroups.entries()) {
      const blink =
        Math.max(0, Math.cos(now * 1.74 + 1.1 + Number(m.cat)) - 0.985) / 0.015;
      eye.scale.y =
        (startled ? 1.14 : boosting() || tier ? 0.92 - tier * 0.065 : 1) *
        (1 - blink * 0.91);
      gaze.position.x = THREE.MathUtils.lerp(
        gaze.position.x,
        turn * 0.044 + Math.sin(now * 3.1) * 0.014 + jump * side * 0.02,
        0.19,
      );
      gaze.position.y = startled ? 0.018 : vy * 0.004;
      brow.rotation.z =
        side *
        (startled
          ? -0.32
          : tier
            ? 0.18 + tier * 0.12
            : boosting()
              ? 0.3
              : 0.13);
      brow.position.y = startled ? 0.255 : 0.223 - tier * 0.012;
      slit.scale.y = startled ? 0.77 : 1.05;
      const ear = m.ears[i];
      ear.root.rotation.x =
        Math.sin(now * 8.3 + i) * (0.085 + Math.abs(velocity) * 0.0032) +
        vy * 0.037 +
        impactTime * 0.59 -
        Math.abs(velocity) * 0.012;
      for (const piece of ear.meshes)
        piece.morphTargetInfluences[0] = THREE.MathUtils.clamp(
          0.19 +
            Math.abs(velocity) * 0.015 +
            Math.sin(now * 8 + i) * 0.24 +
            impactTime * 0.48,
          0,
          1,
        );
    }
    for (const { shoulder, upper, lower, paw, side } of m.arms) {
      if (isPilot && swap === 0) {
        handGoal.set(side * 0.46, 0.17, 0.014);
        wheelFace.localToWorld(handGoal);
        m.root.worldToLocal(handGoal);
      } else {
        handGoal.set(
          side * (0.53 + jump * 0.35 + Math.abs(slide) * 0.34),
          0.59 + jump * 0.61 - Math.abs(slide) * 0.28 + impactTime * 0.3,
          -0.4 + Math.abs(slide) * 0.76,
        );
        if (swap <= 0) {
          const brace = THREE.MathUtils.clamp(
            Math.abs(slide) * 3.4 + impactTime * 0.7,
            0,
            1,
          );
          elbow.set(side * 0.685, 1.87, 0.91);
          body.localToWorld(elbow);
          m.root.worldToLocal(elbow);
          handGoal.lerp(elbow, brace * (1 - throwing));
        }
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
  const lookAhead = followHeading(heading, slide, visualDt);
  const forward = cameraForward.set(
    Math.sin(lookAhead),
    0,
    Math.cos(lookAhead),
  );
  const speedFraction = THREE.MathUtils.clamp(Math.abs(velocity) / 38, 0, 1);
  const height = 4.95 + speedFraction * 0.47;
  const chaseDistance = 8.1 + speedFraction * 1.08 + (boosting() ? 1.27 : 0);
  camTarget
    .copy(kart.position)
    .addScaledVector(forward, 2.2 + speedFraction * 2.5);
  camTarget.y += 1.62 + speedFraction * 0.2 - y * 0.2;
  cameraDesired.copy(kart.position).addScaledVector(forward, -chaseDistance);
  cameraDesired.addScaledVector(
    cameraSide.set(-forward.z, 0, forward.x),
    0.93 + slide * 0.62,
  );
  cameraDesired.y = height + y * 0.58;
  shortenChase(camTarget, cameraDesired, solids);
  const cameraGain = snapCamera ? 1 : 1 - Math.exp(-8.3 * visualDt);
  camera.position.lerp(cameraDesired, cameraGain);
  cameraLook.lerp(camTarget, snapCamera ? 1 : 1 - Math.exp(-10 * visualDt));
  snapCamera = false;
  camera.lookAt(cameraLook);
  camera.fov = THREE.MathUtils.damp(
    camera.fov,
    66 + 5 * speedFraction + (boosting() ? 5 : 0),
    5.5,
    visualDt,
  );
  const visualBoost = boosting() && !paused && $("particles").checked;
  const intensity = visualBoost
    ? itemBoost > 0
      ? 0.42
      : tiers[activeTier - 1].power
    : 0;
  updateStreaks(intensity, visualDt, now);
  const glowColor =
    itemBoost > 0 ? 0x54d7ff : tiers[Math.max(0, activeTier - 1)].color;
  for (const glow of exhaustGlows) {
    glow.material.color.setHex(glowColor);
    glow.material.opacity = THREE.MathUtils.lerp(
      glow.material.opacity,
      boosting() ? 0.85 : 0,
      1 - Math.exp(-15 * visualDt),
    );
    glow.scale.setScalar(1 + 0.17 * Math.sin(now * 46));
  }
  for (const halo of turboHalos) {
    halo.material.color.setHex(glowColor);
    halo.material.opacity = THREE.MathUtils.damp(
      halo.material.opacity,
      visualBoost ? 0.66 : 0,
      11,
      visualDt,
    );
    halo.visible = halo.material.opacity > 0.013;
  }
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
