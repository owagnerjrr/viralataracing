import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import {
  mergeGeometries,
  mergeVertices,
} from "three/addons/utils/BufferGeometryUtils.js";
import { loft, paintTexture } from "../src/art.js";
import {
  bendableLoft,
  bodySculpt,
  coatPalette,
  headSculpt,
  muzzleSculpt,
  pawSculpt,
} from "../src/sculpt.js";

const scene = new THREE.Scene();
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

function createKart() {
  const kart = new THREE.Group();
  kart.name = "KartRibeirao";
  const body = new THREE.Group();
  kart.add(body);
  body.scale.set(0.9, 0.98, 0.79);
  const chassisPaint = new THREE.MeshPhysicalMaterial({
    color: 0x24634c,
    metalness: 0.26,
    roughness: 0.27,
    clearcoat: 1,
    clearcoatRoughness: 0.19,
  });
  const chrome = mat(0xb9dee6, 0.28, 0.61);
  const seat = mat(0x223a35, 0.93);
  const pearl = new THREE.MeshPhysicalMaterial({
    color: 0xf5bd63,
    roughness: 0.32,
    metalness: 0.16,
    clearcoat: 0.82,
  });
  const tireMaterial = mat(0x282c32, 0.97);
  const hubAccent = mat(0xc18e59, 0.37, 0.6);
  const milled = mat(0x95b7af, 0.45, 0.52);
  const instrument = mat(0x2a454e, 0.3);
  instrument.emissive.setHex(0x338e9a);
  instrument.emissiveIntensity = 0.32;
  const exhaustGlows = [];

  const lamp = mat(0xffdfa3, 0.23);
  lamp.emissive.setHex(0xffbe68);
  lamp.emissiveIntensity = 0.55;
  const bumper = mat(0x22282c, 0.38, 0.35);
  const copper = mat(0xbb673e, 0.34, 0.58);
  const trim = mat(0xf8d798, 0.42, 0.26);
  const fenderPaint = new THREE.MeshPhysicalMaterial({
    color: 0x31554a,
    metalness: 0.31,
    roughness: 0.31,
    clearcoat: 0.75,
  });
  for (const sign of [-1, 1]) {
    for (const wheelZ of [-1.48, 1.46]) {
      const contour = new THREE.CatmullRomCurve3(
        [
          [sign * 1.48, 0.66, wheelZ - 0.69],
          [sign * 1.54, 0.98, wheelZ - 0.61],
          [sign * 1.56, 1.24, wheelZ - 0.34],
          [sign * 1.51, 1.3, wheelZ + 0.11],
          [sign * 1.47, 1.2, wheelZ + 0.43],
          [sign * 1.39, 0.83, wheelZ + 0.63],
        ].map((p) => new THREE.Vector3(...p)),
      );
      const segments = 36;
      const points = [];
      const indices = [];
      const uv = [];
      for (let i = 0; i <= segments; i++) {
        const t = i / segments,
          p = contour.getPoint(t);
        const d = contour.getTangent(t);
        for (let j = 0; j <= 6; j++) {
          const u = j / 6;
          const rib = Math.sin(Math.PI * u) * Math.sin(Math.PI * t) * 0.076;
          points.push(
            p.x + sign * (u - 0.48) * 0.71,
            p.y + d.z * rib,
            p.z - d.y * rib,
          );
          uv.push(t, u);
          if (i && j) {
            const a = i * 7 + j;
            indices.push(a - 8, a - 7, a - 1, a - 7, a, a - 1);
          }
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(points, 3),
      );
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      fenderPaint.side = THREE.DoubleSide;
      mesh(geometry, fenderPaint, [0, 0, 0], body);
      mesh(
        new THREE.TubeGeometry(contour, 30, 0.031, 7, false),
        copper,
        [sign * 0.39, 0, 0],
        body,
      );
    }
    const intake = mesh(
      loft(
        [
          [0, 0.03, -0.47, 0.006, 0.006],
          [0, 0.04, -0.35, 0.11, 0.105],
          [0, 0.04, 0.17, 0.15, 0.143],
          [0, 0.03, 0.45, 0.113, 0.09],
          [0, 0.015, 0.58, 0.012, 0.015],
        ],
        0.58,
      ),
      copper,
      [sign * 1.27, 0.95, 0.21],
      body,
    );
    intake.rotation.z = sign * 0.33;
    for (let i = 0; i < 4; i++) {
      const slot = box(
        0.055,
        0.12,
        0.077,
        bumper,
        [sign * 1.405, 0.99, 0.12 + i * 0.14],
        body,
      );
      slot.rotation.x = -0.28;
    }
  }
  const stripeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf7cd7b,
    roughness: 0.36,
    metalness: 0.2,
    clearcoat: 0.81,
  });
  for (const side of [-1, 1]) {
    mesh(
      loft(
        [
          [0, 0.68, -1.0, 0.012, 0.012],
          [0, 0.81, -0.67, 0.13, 0.122],
          [0, 0.87, 0.14, 0.166, 0.143],
          [0, 0.81, 0.69, 0.131, 0.12],
          [0, 0.73, 0.99, 0.014, 0.014],
        ],
        0.57,
      ),
      stripeMaterial,
      [side * 1.16, 0, 0],
      body,
    );
    for (const z of [-0.29, 0.24, 0.67]) {
      const bolt = cyl(
        0.057,
        0.057,
        0.026,
        chrome,
        [side * 1.21, 0.964, z],
        body,
      );
      bolt.rotation.z = -side * 0.14;
    }
  }
  const underframe = mat(0x384540, 0.48, 0.65);
  const exhaustSteel = mat(0x9fb0ab, 0.28, 0.77);
  for (const side of [-1, 1]) {
    const rail = new THREE.CatmullRomCurve3(
      [
        [side * 0.64, 0.49, -2.27],
        [side * 1.12, 0.48, -1.69],
        [side * 1.27, 0.48, -0.73],
        [side * 1.33, 0.48, 1.07],
        [side * 1.06, 0.5, 1.97],
        [side * 0.62, 0.59, 2.22],
      ].map((p) => new THREE.Vector3(...p)),
    );
    mesh(
      new THREE.TubeGeometry(rail, 36, 0.066, 9, false),
      underframe,
      [0, 0, 0],
      body,
    );
    const manifold = new THREE.CatmullRomCurve3(
      [
        [side * 0.32, 1.07, 1.67],
        [side * 0.5, 1.1, 1.82],
        [side * 0.73, 0.92, 2.02],
        [side * 0.91, 0.74, 2.16],
      ].map((p) => new THREE.Vector3(...p)),
    );
    mesh(
      new THREE.TubeGeometry(manifold, 25, 0.082, 10, false),
      exhaustSteel,
      [0, 0, 0],
      body,
    );
    for (const z of [-1.5, 1.5]) {
      const axleBar = cyl(
        0.038,
        0.053,
        0.72,
        exhaustSteel,
        [side * 0.99, 0.615, z],
        body,
      );
      axleBar.rotation.z = Math.PI / 2;
    }
  }
  for (const x of [-0.29, 0, 0.29]) {
    mesh(
      loft(
        [
          [0, 0.98, 1.38, 0.027, 0.024],
          [0, 1.05, 1.58, 0.14, 0.118],
          [0, 1.13, 1.8, 0.141, 0.146],
          [0, 1.13, 1.98, 0.121, 0.087],
          [0, 1.04, 2.07, 0.012, 0.013],
        ],
        0.67,
      ),
      underframe,
      [x, 0, 0],
      body,
    );
    for (let i = 0; i < 4; i++) {
      const fin = box(
        0.25,
        0.018,
        0.025,
        exhaustSteel,
        [x, 1.27, 1.67 + i * 0.073],
        body,
      );
      fin.rotation.x = 0.16;
    }
  }
  const radiator = mesh(
    loft(
      [
        [0, 0.84, 1.27, 0.011, 0.011],
        [0, 0.99, 1.58, 0.55, 0.19],
        [0, 1.02, 1.91, 0.69, 0.2],
        [0, 0.94, 2.17, 0.34, 0.1],
        [0, 0.91, 2.22, 0.01, 0.01],
      ],
      0.55,
    ),
    copper,
    [0, 0, 0],
    body,
  );
  for (let i = -4; i <= 4; i++)
    box(0.059, 0.04, 0.26, bumper, [i * 0.1, 1.222, 1.84], body);
  for (const around of [-1, 1]) {
    const stripe = mesh(
      loft([
        [0, 0.985, -2.31, 0.008, 0.008],
        [0, 1.118, -2.03, 0.025, 0.022],
        [0, 1.374, -1.52, 0.025, 0.02],
        [0, 1.46, -1.24, 0.021, 0.017],
        [0, 1.44, -1.04, 0.003, 0.003],
      ]),
      trim,
      [around * 0.31, 0.012, 0],
      body,
    );
  }
  for (const z of [-2.39, 2.34]) {
    mesh(
      loft(
        [
          [0, 0.56, z - 0.17, 0, 0.02],
          [0, 0.56, z - 0.09, 0.85, 0.105],
          [0, 0.56, z + 0.03, 0.88, 0.105],
          [0, 0.56, z + 0.16, 0, 0.02],
        ],
        0.55,
      ),
      bumper,
      [0, 0, 0],
      body,
    );
  }
  const tailLamp = mat(0xd1264a, 0.3);
  tailLamp.emissive.setHex(0xc91f38);
  tailLamp.emissiveIntensity = 0.45;
  mesh(
    loft(
      [
        [0, 0.76, -2.48, 0.02, 0.02],
        [0, 0.88, -2.25, 0.72, 0.16],
        [0, 1.013, -1.53, 1.15, 0.37],
        [0, 0.83, -0.39, 1.17, 0.24],
        [0, 0.88, 1.24, 1.26, 0.31],
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
  const bonnet = mesh(
    loft(
      [
        [0, 0.93, -2.38, 0.015, 0.015],
        [0, 1.007, -2.14, 0.54, 0.095],
        [0, 1.19, -1.72, 0.71, 0.162],
        [0, 1.3, -1.27, 0.61, 0.17],
        [0, 1.36, -0.97, 0.32, 0.09],
        [0, 1.34, -0.78, 0.012, 0.015],
      ],
      0.59,
    ),
    pearl,
    [0, 0, 0],
    body,
  );
  const intakeRim = mesh(
    loft(
      [
        [0, 0.78, -2.5, 0.01, 0.01],
        [0, 0.78, -2.465, 0.45, 0.087],
        [0, 0.78, -2.41, 0.52, 0.085],
        [0, 0.78, -2.31, 0.025, 0.016],
      ],
      0.47,
    ),
    milled,
    [0, 0, 0],
    body,
  );
  for (let i = -4; i <= 4; i++)
    box(0.052, 0.112, 0.018, seat, [i * 0.091, 0.78, -2.484], body);
  const dash = mesh(
    loft(
      [
        [0, 1.58, -1.41, 0.015, 0.02],
        [0, 1.72, -1.36, 0.52, 0.12],
        [0, 1.74, -1.16, 0.48, 0.12],
        [0, 1.68, -1.05, 0.02, 0.012],
      ],
      0.49,
    ),
    bumper,
    [0, 0, 0],
    body,
  );
  for (const x of [-0.2, 0, 0.2]) {
    const meter = sphere(
      x === 0 ? 0.13 : 0.102,
      instrument,
      [x, 1.765, -1.08],
      body,
    );
    meter.scale.set(1, 0.68, 0.32);
  }
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
    headlight.scale.set(1.51, 0.69, 0.39);
    headlight.rotation.y = side * -0.22;
    const bezel = sphere(0.238, milled, [side * 0.56, 0.94, -2.238], body);
    bezel.scale.set(1.36, 0.72, 0.39);
    bezel.rotation.y = side * -0.22;
    for (let i = 0; i < 3; i++) {
      const led = sphere(
        0.055,
        lamp,
        [side * 0.56 + (i - 1) * 0.105, 0.94, -2.327 + i * side * 0.018],
        body,
      );
      led.scale.set(1, 1, 0.39);
    }
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
    const opening = cyl(
      0.094,
      0.1,
      0.02,
      dark,
      [side * 0.93, 0.67, 2.29],
      body,
    );
    opening.rotation.x = Math.PI / 2;
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(0.095, 24),
      new THREE.MeshBasicMaterial({
        color: 0x54d7ff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    glow.position.set(side * 0.93, 0.67, 2.31);
    body.add(glow);
    exhaustGlows.push(glow);
    const rearLip = box(
      0.47,
      0.095,
      0.72,
      pearl,
      [side * 0.69, 1.06, 1.95],
      body,
    );
    rearLip.rotation.y = side * 0.22;
  }
  for (const z of [-0.7, 1.14]) {
    mesh(
      loft(
        [
          [0, 1.24, z - 0.73, 0.012, 0.012],
          [0, 1.27, z - 0.46, 0.56, 0.095],
          [0, 1.29, z - 0.05, 0.65, 0.13],
          [0, 1.48, z + 0.36, 0.64, 0.3],
          [0, 1.67, z + 0.55, 0.63, 0.33],
          [0, 1.64, z + 0.73, 0.024, 0.031],
        ],
        0.57,
      ),
      seat,
      [0, 0, 0],
      body,
    );
    const pad = sphere(0.52, milled, [0, 1.64, z + 0.307], body);
    pad.scale.set(1.05, 0.61, 0.23);
    for (const side of [-1, 1]) {
      const bolster = sphere(0.34, seat, [side * 0.43, 1.47, z + 0.08], body);
      bolster.scale.set(0.48, 0.62, 1.55);
    }
  }
  const gripRubber = mat(0x252934, 0.85);
  const handHolds = new THREE.Group();
  body.add(handHolds);
  for (const side of [-1, 1]) {
    const tubePath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.72, 1.18, 0.5),
      new THREE.Vector3(side * 0.7, 1.74, 0.59),
      new THREE.Vector3(side * 0.69, 1.91, 0.79),
      new THREE.Vector3(side * 0.68, 1.86, 1.13),
      new THREE.Vector3(side * 0.65, 1.25, 1.43),
    ]);
    mesh(
      new THREE.TubeGeometry(tubePath, 21, 0.064, 9, false),
      milled,
      [0, 0, 0],
      handHolds,
    );
    const gripPath = new THREE.CatmullRomCurve3(
      [0.36, 0.44, 0.52, 0.6].map((t) => tubePath.getPoint(t)),
    );
    mesh(
      new THREE.TubeGeometry(gripPath, 12, 0.085, 9, false),
      gripRubber,
      [0, 0, 0],
      handHolds,
    );
  }
  const numberMap = paintTexture(128, (ctx) => {
    ctx.fillStyle = "#f4d28b";
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = "#984d30";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.strokeStyle = "#137e64";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(64, 64, 49, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.font = "900 86px system-ui";
    ctx.fillStyle = "#184554";
    ctx.textAlign = "center";
    ctx.fillText("27", 64, 94);
  });
  const badge = mesh(
    new THREE.CircleGeometry(0.31, 32),
    new THREE.MeshBasicMaterial({ map: numberMap }),
    [0, 1.49, -1.28],
    body,
  );
  badge.rotation.x = -Math.PI / 2;
  let wheels = [];
  for (let x of [-1.42, 1.42])
    for (let z of [-1.5, 1.5]) {
      let pivot = new THREE.Group();
      pivot.position.set(x, 0.605, z);
      body.add(pivot);
      let axle = new THREE.Group();
      pivot.add(axle);
      axle.scale.set(1.23, 1.1, 1.32);
      const profile = [
        [0, -0.205],
        [0.38, -0.205],
        [0.45, -0.205],
        [0.509, -0.167],
        [0.538, -0.1],
        [0.521, -0.075],
        [0.538, -0.051],
        [0.543, -0.008],
        [0.525, 0.016],
        [0.543, 0.04],
        [0.534, 0.096],
        [0.517, 0.12],
        [0.526, 0.144],
        [0.49, 0.185],
        [0.449, 0.206],
        [0, 0.206],
      ].map(([radius, y]) => new THREE.Vector2(radius, y));
      const wheel = mesh(
        new THREE.LatheGeometry(profile, 48),
        tireMaterial,
        [0, 0, 0],
        axle,
      );
      wheel.rotation.z = Math.PI / 2;
      const lug = new THREE.InstancedMesh(
        new THREE.BoxGeometry(0.19, 0.015, 0.071),
        tireMaterial,
        34,
      );
      const treadTransform = new THREE.Object3D();
      for (let i = 0; i < 34; i++) {
        const angle = (i * Math.PI * 2) / 34;
        treadTransform.position.set(
          i % 2 ? 0.106 : -0.106,
          Math.cos(angle) * 0.531,
          Math.sin(angle) * 0.531,
        );
        treadTransform.rotation.set(angle, 0, (i % 2 ? 1 : -1) * 0.24);
        treadTransform.updateMatrix();
        lug.setMatrixAt(i, treadTransform.matrix);
      }
      axle.add(lug);
      let hub = cyl(0.3, 0.3, 0.38, white, [0, 0, 0], axle);
      hub.rotation.z = Math.PI / 2;
      const rim = mesh(
        new THREE.TorusGeometry(0.29, 0.036, 10, 32),
        chrome,
        [Math.sign(x) * 0.22, 0, 0],
        axle,
      );
      rim.rotation.y = Math.PI / 2;
      const shockCurve = new THREE.CatmullRomCurve3(
        Array.from({ length: 65 }, (_, i) => {
          const t = i / 64,
            angle = t * 12 * Math.PI;
          return new THREE.Vector3(
            Math.cos(angle) * 0.079,
            t * 0.43,
            Math.sin(angle) * 0.079,
          );
        }),
      );
      const spring = mesh(
        new THREE.TubeGeometry(shockCurve, 64, 0.02, 6, false),
        chrome,
        [x * 0.76, 0.57, z + 0.22],
        body,
      );
      spring.rotation.z = Math.sign(x) * 0.22;
      const shaft = cyl(
        0.052,
        0.059,
        0.54,
        bumper,
        [x * 0.76, 0.8, z + 0.22],
        body,
      );
      shaft.rotation.z = spring.rotation.z;
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        sphere(
          0.046,
          hubAccent,
          [Math.sign(x) * 0.225, Math.sin(angle) * 0.2, Math.cos(angle) * 0.2],
          axle,
        );
      }
      wheels.push({ pivot, axle, spring, front: z < 0, side: Math.sign(x) });
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
  steering.position.set(0, 2.205, -1.635);

  body.name = "Body";
  wheelFace.name = "SteeringWheel";
  wheels.forEach(({ pivot, axle, spring, front, side }, index) => {
    pivot.name = "Wheel" + index;
    pivot.userData = { front, side };
    axle.name = "Axle" + index;
    spring.name = "Spring" + index;
  });
  exhaustGlows.forEach((glow, index) => (glow.name = "ExhaustGlow" + index));
  tailLamp.name = "BrakeLamp";
  return kart;
}

const pink = mat(0xd88a89, 0.54);
const eyes = mat(0xe4bb75, 0.43);
const pupil = mat(0x11131a, 0.33);
const noseMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x262027,
  roughness: 0.43,
  clearcoat: 0.42,
});
function articulateTail(mesh, cat) {
  const geometry = mesh.geometry;
  const positions = geometry.attributes.position;
  const joints = [];
  const weights = [];
  const ringCount = positions.count / 32 - 1;
  for (let i = 0; i < positions.count; i++) {
    const progress = Math.floor(i / 32) / ringCount;
    const influence = THREE.MathUtils.smoothstep(progress, 0.27, 0.83);
    joints.push(0, 1, 0, 0);
    weights.push(1 - influence, influence, 0, 0);
  }
  geometry.setAttribute(
    "skinIndex",
    new THREE.Uint16BufferAttribute(joints, 4),
  );
  geometry.setAttribute(
    "skinWeight",
    new THREE.Float32BufferAttribute(weights, 4),
  );
  const base = new THREE.Bone();
  base.name = "TailBase";
  const tip = new THREE.Bone();
  tip.name = "TailTip";
  tip.position.set(0, cat ? 0.4 : 0.24, cat ? 0.53 : 0.34);
  base.add(tip);
  const rig = new THREE.SkinnedMesh(geometry, mesh.material);
  rig.frustumCulled = false;
  mesh.parent.add(rig);
  rig.add(base);
  rig.updateMatrixWorld(true);
  rig.bind(new THREE.Skeleton([base, tip]));
  mesh.removeFromParent();
  return rig;
}

const dogCoat = coatPalette(false);
const catCoat = coatPalette(true);
const pawGeometry = pawSculpt();
const furPatch = mat(0xae6d3e, 0.93);
const harness = mat(0x166b67, 0.88);
const purple = mat(0x614354, 0.86);
const stitching = mat(0xd8b17c, 0.89);
const brass = mat(0xc58f49, 0.29, 0.62);

function irisMaterial(cat) {
  const map = paintTexture(128, (ctx) => {
    const colors = cat
      ? ["#eaa243", "#fff0a8", "#6b4428"]
      : ["#ccb17d", "#a47044", "#261a22"];
    const gradient = ctx.createRadialGradient(64, 64, 6, 64, 64, 63);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(0.56, colors[1]);
    gradient.addColorStop(1, colors[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    const seed = 19;
    for (let i = 0; i < 104; i++) {
      const a = i * 2.39996,
        len = 27 + ((i * seed) % 27);
      ctx.strokeStyle = i % 3 ? "#fef5cf38" : "#673f345c";
      ctx.lineWidth = 0.7 + (i % 5) * 0.13;
      ctx.beginPath();
      ctx.moveTo(64 + Math.cos(a) * len, 64 + Math.sin(a) * len);
      ctx.lineTo(
        64 + Math.cos(a + 0.07) * (len + 14),
        64 + Math.sin(a + 0.07) * (len + 14),
      );
      ctx.stroke();
    }
  });
  return new THREE.MeshPhysicalMaterial({
    map,
    roughness: 0.24,
    clearcoat: 0.9,
  });
}
const irisMaterials = [irisMaterial(false), irisMaterial(true)];
const limbGeometry = loft(
  [
    [0, -0.985, 0, 0.016, 0.018],
    [0.07, -0.76, 0.045, 0.72, 0.76],
    [0.061, -0.25, 0.076, 0.95, 0.92],
    [0, 0.25, 0.02, 1, 0.97],
    [-0.08, 0.71, -0.02, 0.75, 0.77],
    [-0.07, 0.98, 0, 0.018, 0.02],
  ],
  0.85,
);

const hindPawGeometry = pawSculpt(1.34);

function furTufts(parent, material, side, origin, count, sweep) {
  for (let i = 0; i < count; i++) {
    const scale = 1 - i * 0.14;
    const strand = mesh(
      loft([
        [0, 0.12, 0, 0.048, 0.043],
        [side * 0.025, 0.045, 0.016, 0.059, 0.042],
        [side * 0.067, -0.04, 0.032, 0.034, 0.028],
        [side * 0.102, -0.153, 0.062, 0.002, 0.003],
      ]),
      material,
      [
        origin[0] + side * i * 0.026,
        origin[1] - i * 0.055,
        origin[2] + i * 0.019,
      ],
      parent,
    );
    strand.rotation.z = side * sweep;
    strand.scale.setScalar(scale);
  }
}

function eyelid() {
  const positions = [],
    closed = [],
    uv = [],
    indices = [];
  const rows = 10,
    columns = 26;
  function point(target, polar, angle) {
    target.push(
      0.154 * Math.sin(polar) * Math.sin(angle),
      0.198 * Math.cos(polar),
      -0.088 - 0.146 * Math.sin(polar) * Math.cos(angle),
    );
  }
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= columns; col++) {
      const t = row / rows,
        u = col / columns;
      const angle = (u - 0.5) * Math.PI;
      point(positions, 0.007 + t * 0.47, angle);
      point(closed, 0.007 + t * 3.124, angle);
      uv.push(u, 1 - t);
      if (row && col) {
        const a = row * (columns + 1) + col;
        indices.push(
          a - columns - 2,
          a - columns - 1,
          a - 1,
          a - columns - 1,
          a,
          a - 1,
        );
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const closedGeometry = geometry.clone();
  closedGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(closed, 3),
  );
  closedGeometry.computeVertexNormals();
  geometry.morphAttributes.position = [closedGeometry.getAttribute("position")];
  geometry.morphAttributes.normal = [closedGeometry.getAttribute("normal")];
  return geometry;
}

function paintedHead(cat, material) {
  const geometry = headSculpt(cat);
  const p = geometry.attributes.position;
  const colors = [];
  const color = new THREE.Color();
  const blend = THREE.MathUtils.smoothstep;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const grain = Math.sin(x * 33 + z * 21) * Math.cos(y * 39 + z * 29) * 0.045;
    const cheeks = blend(Math.abs(x), 0.24, 0.52) * (1 - blend(y, -0.1, 0.31));
    const forehead = blend(y, 0.07, 0.55) * (1 - blend(z, -0.4, 0.01));
    const muzzle = (1 - blend(y, -0.24, 0.02)) * (1 - blend(z, -0.57, -0.25));
    if (cat) {
      color.setRGB(0.73 + grain, 0.77 + grain, 0.86 + grain);
      color.lerp(new THREE.Color(0.37, 0.43, 0.56), forehead * 0.58);
      color.lerp(new THREE.Color(0.96, 0.85, 0.74), cheeks * 0.31);
    } else {
      color.setRGB(1 + grain, 0.84 + grain, 0.66 + grain);
      color.lerp(new THREE.Color(0.55, 0.426, 0.32), forehead * 0.58);
      color.lerp(new THREE.Color(1, 0.93, 0.77), muzzle * 0.73 + cheeks * 0.19);
    }
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const skin = material.clone();
  skin.vertexColors = true;
  return { geometry, skin };
}

const bandanaTexture = paintTexture(256, (ctx, s) => {
  ctx.fillStyle = "#256c40";
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = "#e5be59";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(5, 6);
  ctx.lineTo(251, 6);
  ctx.lineTo(128, 242);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = "#f1d28a";
  for (const [x, y, r] of [
    [128, 108, 19],
    [99, 82, 10],
    [118, 67, 10],
    [140, 67, 10],
    [158, 84, 10],
  ]) {
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.81, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#ffffff18";
  ctx.lineWidth = 1;
  for (let i = 0; i < 256; i += 4) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(s, i);
    ctx.stroke();
  }
});
const bandanaMaterial = new THREE.MeshStandardMaterial({
  map: bandanaTexture,
  roughness: 0.87,
  side: THREE.DoubleSide,
});
function bandanaPanel(root) {
  const g = new THREE.BufferGeometry();
  const positions = [],
    uv = [],
    indices = [];
  const cols = 20,
    rows = 11;
  for (let i = 0; i <= rows; i++) {
    const v = i / rows;
    for (let j = 0; j <= cols; j++) {
      const u = j / cols,
        w = u * 2 - 1;
      const x = w * (0.324 * (1 - v) + 0.012);
      const y = 1.186 - v * 0.415 - Math.abs(w) * (1 - v) * 0.07;
      const z =
        -0.222 -
        0.145 * (1 - w * w) -
        0.074 * v +
        0.016 * Math.sin(w * 9) * (1 - v);
      positions.push(x, y, z);
      uv.push(0.5 + w * (1 - v) * 0.49, 1 - v);
      if (i && j) {
        const a = i * (cols + 1) + j;
        indices.push(a - cols - 2, a - cols - 1, a - 1, a - cols - 1, a, a - 1);
      }
    }
  }
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  mesh(g, bandanaMaterial, [0, 0, 0], root).name = "BandanaPatinha";
}

function mascot(cat) {
  const root = new THREE.Group();
  const palette = cat ? catCoat : dogCoat;
  const m = palette.base;
  const torso = mesh(bodySculpt(cat), m, [0, 0, 0], root);
  const chest = mesh(
    loft(
      [
        [0, 0.23, -0.26, 0.012, 0.018],
        [0, 0.42, -0.32, 0.215, 0.06],
        [0, 0.67, -0.343, 0.263, 0.086],
        [0, 0.92, -0.302, 0.204, 0.071],
        [0, 1.03, -0.229, 0.015, 0.014],
      ],
      0.89,
    ),
    palette.light,
    [0, 0, 0],
    root,
  );
  for (const side of [-1, 1])
    furTufts(root, palette.light, side, [side * 0.13, 0.65, -0.39], 3, -0.24);
  const head = new THREE.Group();
  head.position.set(0, cat ? 1.52 : 1.48, cat ? -0.06 : -0.09);
  root.add(head);
  const coat = paintedHead(cat, m);
  head.scale.set(cat ? 0.93 : 1.04, cat ? 0.94 : 1.025, cat ? 0.89 : 1.03);
  mesh(coat.geometry, coat.skin, [0, 0, 0], head);
  if (!cat) {
    furTufts(head, palette.shade, -1, [-0.035, 0.5, 0.035], 4, -1.97);
  } else {
    for (const side of [-1, 1]) {
      furTufts(
        head,
        palette.shade,
        side,
        [side * 0.44, -0.065, -0.17],
        4,
        side * 1.02,
      );
    }
  }
  for (const side of [-1, 1]) {
    const vest = mesh(
      loft(
        [
          [0, 0.48, -0.317, 0.015, 0.012],
          [0, 0.59, -0.318, 0.11, 0.062],
          [0, 0.78, -0.292, 0.121, 0.073],
          [0, 0.96, -0.23, 0.1, 0.054],
          [0, 1.079, -0.159, 0.015, 0.016],
        ],
        0.63,
      ),
      cat ? purple : harness,
      [side * 0.21, 0, 0.025],
      root,
    );
    vest.rotation.z = side * -0.17;
    for (let i = 0; i < 5; i++) {
      const stitch = sphere(
        0.017,
        stitching,
        [side * (0.17 + i * 0.009), 0.62 + i * 0.066, -0.354 + i * 0.021],
        root,
      );
      stitch.scale.set(0.58, 1.9, 0.54);
    }
  }
  const neckWrap = mesh(
    loft(
      [
        [0, 0.99, -0.029, 0.06, 0.062],
        [0, 1.067, 0.013, 0.29, 0.26],
        [0, 1.158, 0.018, 0.325, 0.25],
        [0, 1.234, 0.015, 0.02, 0.02],
      ],
      0.76,
    ),
    cat ? purple : harness,
    [0, 0, 0],
    root,
  );
  const knot = mesh(
    loft(
      [
        [0, 0.88, -0.28, 0.008, 0.008],
        [0.05, 1.01, -0.319, 0.15, 0.075],
        [0.01, 1.075, -0.27, 0.12, 0.08],
        [0, 1.16, -0.24, 0.014, 0.013],
      ],
      0.67,
    ),
    cat ? purple : harness,
    [0, 0, 0],
    root,
  );
  if (!cat) bandanaPanel(root);
  else {
    const collarPath = new THREE.CatmullRomCurve3(
      [
        [-0.23, 1.13, -0.24],
        [-0.14, 1.085, -0.327],
        [0.03, 1.067, -0.345],
        [0.18, 1.105, -0.31],
        [0.23, 1.16, -0.22],
      ].map((p) => new THREE.Vector3(...p)),
    );
    mesh(
      new THREE.TubeGeometry(collarPath, 20, 0.042, 8, false),
      brass,
      [0, 0, 0],
      root,
    );
  }
  const ears = [];

  const eyeGroups = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(
      side * (cat ? 0.43 : 0.465),
      cat ? 0.36 : 0.35,
      cat ? 0.01 : 0.08,
    );
    ear.rotation.z = side * (cat ? -0.28 : 0.64);
    head.add(ear);
    const profile = cat
      ? [
          [0, 0, 0, 0.21, 0.145],
          [0, 0.19, -0.006, 0.23, 0.14],
          [0, 0.46, 0.035, 0.135, 0.101],
          [0, 0.73, 0.07, 0.01, 0.011],
        ]
      : [
          [0, 0.08, 0, 0.16, 0.131],
          [0, 0.21, 0.035, 0.21, 0.12],
          [0, 0.08, 0.21, 0.225, 0.13],
          [0, -0.31, 0.27, 0.212, 0.105],
          [0, -0.55, 0.3, 0.021, 0.022],
        ];
    const earMesh = mesh(
      bendableLoft(profile, 0.76, [side * 0.078, -0.095, 0.185]),
      cat ? palette.base : palette.shade,
      [0, 0, 0],
      ear,
    );
    const innerProfile = profile.map(([x, y, z, w, h]) => [
      x,
      y * 0.78,
      z * 0.86,
      w * 0.65,
      h * 0.43,
    ]);
    const lining = mesh(
      bendableLoft(innerProfile, 0.88, [side * 0.078, -0.095, 0.185]),
      palette.inner,
      [0, cat ? 0.065 : -0.026, cat ? -0.101 : 0.159],
      ear,
    );
    ears.push({ root: ear, meshes: [earMesh, lining] });
    for (const position of cat
      ? [
          [side * 0.49, -0.14, -0.29],
          [side * 0.51, -0.257, -0.24],
        ]
      : [[side * 0.42, 0.18, -0.28]]) {
      furTufts(head, palette.base, side, position, cat ? 3 : 2, side * 0.66);
    }
    const eye = new THREE.Group();
    eye.position.set(
      side * (cat ? 0.272 : 0.259),
      cat ? 0.135 : 0.162,
      cat ? -0.405 : -0.475,
    );
    eye.rotation.y = -side * 0.32;
    head.add(eye);
    const socket = sphere(
      0.2,
      cat ? palette.shade : palette.shade,
      [0, 0, 0.009],
      eye,
    );
    socket.scale.set(0.89, 1.15, 0.6);
    const sclera = sphere(0.177, cat ? eyes : white, [0, 0, -0.07], eye);
    sclera.scale.set(0.8, 1.08, 0.49);
    const gaze = new THREE.Group();
    eye.add(gaze);
    const iris = mesh(
      new THREE.CircleGeometry(0.124, 36),
      irisMaterials[Number(cat)],
      [-side * 0.019, -0.013, -0.157],
      gaze,
    );
    iris.scale.set(0.81, 1.04, 1);
    iris.rotation.y = Math.PI;
    const slit = sphere(0.087, pupil, [-side * 0.024, -0.012, -0.171], gaze);
    slit.scale.set(cat ? 0.39 : 0.85, 1.05, 0.35);
    sphere(0.024, white, [-side * 0.024 - 0.027, 0.021, -0.196], gaze);
    const brow = sphere(0.114, palette.shade, [side * 0.01, 0.22, -0.037], eye);
    brow.scale.set(1.22, 0.24, 0.43);
    brow.rotation.z = side * 0.14;
    const lidMaterial = palette.base.clone();
    lidMaterial.side = THREE.DoubleSide;
    const lid = mesh(eyelid(), lidMaterial, [0, 0, 0], eye);
    eyeGroups.push({ eye, brow, slit, gaze, lid, side });

    if (cat) {
      for (let i = 0; i < 3; i++) {
        const whisker = mesh(
          new THREE.TubeGeometry(
            new THREE.QuadraticBezierCurve3(
              new THREE.Vector3(side * 0.23, -0.22 - i * 0.057, -0.58),
              new THREE.Vector3(side * 0.48, -0.19 - i * 0.075, -0.65),
              new THREE.Vector3(side * 0.79, -0.154 - i * 0.125, -0.45),
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
  mesh(muzzleSculpt(cat), palette.light, [0, 0, 0], head);
  const muzzleEnd = cat ? -0.66 : -0.957;
  if (!cat) {
    const bridge = mesh(
      loft(
        [
          [0, -0.007, -0.78, 0.028, 0.015],
          [0, 0.053, -0.675, 0.092, 0.033],
          [0, 0.15, -0.499, 0.099, 0.046],
          [0, 0.315, -0.397, 0.042, 0.014],
          [0, 0.43, -0.28, 0.006, 0.003],
        ],
        0.74,
      ),
      furPatch,
      [0, 0, 0],
      head,
    );
  }
  const nose = mesh(
    loft(
      [
        [0, -0.179, muzzleEnd - 0.058, 0.015, 0.01],
        [0, -0.141, muzzleEnd - 0.036, cat ? 0.098 : 0.143, 0.078],
        [0, -0.147, muzzleEnd + 0.045, cat ? 0.123 : 0.164, 0.082],
        [0, -0.159, muzzleEnd + 0.101, 0.023, 0.015],
      ],
      0.64,
    ),
    cat ? pink : noseMaterial,
    [0, 0, 0],
    head,
  );
  for (const side of [-1, 1]) {
    const nostril = sphere(
      0.041,
      pupil,
      [side * (cat ? 0.042 : 0.072), -0.163, muzzleEnd - 0.026],
      head,
    );
    nostril.scale.set(1, 0.61, 0.42);
    for (let i = 0; i < 3; i++) {
      sphere(
        0.014,
        palette.shade,
        [
          side * (0.141 + i * 0.046),
          -0.204 - i * 0.037,
          muzzleEnd + 0.032 + i * 0.021,
        ],
        head,
      );
    }
  }
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.269, cat ? -0.35 : -0.484);
  head.add(jaw);
  const lower = mesh(
    loft(
      [
        [0, -0.06, -0.395, 0.02, 0.02],
        [0, -0.083, -0.305, 0.185, 0.074],
        [0, -0.079, -0.176, 0.257, 0.112],
        [0, -0.041, -0.034, 0.217, 0.085],
        [0, -0.016, 0.124, 0.066, 0.03],
      ],
      0.85,
    ),
    palette.light,
    [0, 0, 0],
    jaw,
  );
  lower.scale.z = cat ? 0.76 : 1;
  const openMouth = sphere(
    0.193,
    pupil,
    [0, -0.015, cat ? -0.231 : -0.294],
    jaw,
  );
  openMouth.scale.set(1, 0.23, 0.56);
  const tongue = sphere(0.108, pink, [0, -0.02, cat ? -0.28 : -0.36], jaw);
  tongue.scale.set(1, 0.32, 0.75);
  const smile = new THREE.Group();
  head.add(smile);
  for (const side of [-1, 1]) {
    const path = new THREE.CubicBezierCurve3(
      new THREE.Vector3(0, -0.294, muzzleEnd + 0.018),
      new THREE.Vector3(side * 0.085, -0.357, muzzleEnd + 0.024),
      new THREE.Vector3(side * 0.209, -0.36, muzzleEnd + 0.098),
      new THREE.Vector3(side * 0.245, -0.279, muzzleEnd + 0.14),
    );
    mesh(
      new THREE.TubeGeometry(path, 12, 0.017, 6, false),
      pupil,
      [0, 0, 0],
      smile,
    );
  }
  const buckle = mesh(
    loft(
      [
        [0, 1.03, -0.399, 0.006, 0.008],
        [0, 1.061, -0.365, 0.073, 0.035],
        [0, 1.121, -0.359, 0.071, 0.032],
        [0, 1.149, -0.347, 0.008, 0.008],
      ],
      0.62,
    ),
    brass,
    [0, 0, 0],
    root,
  );
  const arms = [];
  for (let side of [-1, 1]) {
    const shoulder = new THREE.Vector3(side * 0.4, 0.94, -0.14);
    const upper = mesh(limbGeometry, m, [0, 0, 0], root);
    const lower = mesh(limbGeometry, m, [0, 0, 0], root);
    const paw = new THREE.Group();
    root.add(paw);
    mesh(pawGeometry, m, [0, 0, 0], paw);
    for (let i = -1; i <= 1; i++) {
      const pad = sphere(0.041, palette.shade, [i * 0.09, -0.078, -0.144], paw);
      pad.scale.set(0.9, 0.27, 1.03);
    }
    arms.push({ shoulder, upper, lower, paw, side });
  }
  for (let side of [-1, 1]) {
    const foot = mesh(hindPawGeometry, m, [side * 0.3, 0.135, -0.23], root);
    foot.rotation.y = side * 0.11;
  }
  let tail = new THREE.Group();
  tail.position.set(0, 0.6, 0.35);
  root.add(tail);
  let tailMesh = mesh(
    bendableLoft(
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
      0.82,
      [0.23, -0.19, 0.14],
    ),
    m,
    [0, 0, 0],
    tail,
  );
  tailMesh = articulateTail(tailMesh, cat);
  const scarf = mesh(
    bendableLoft(
      [
        [0, 1.19, 0.17, 0.067, 0.031],
        [0, 1.11, 0.31, 0.18, 0.039],
        [0, 0.97, 0.55, 0.153, 0.031],
        [0, 0.87, 0.76, 0.14, 0.023],
        [0, 0.83, 0.9, 0.008, 0.007],
      ],
      0.76,
      [cat ? -0.18 : 0.18, 0.16, 0.23],
    ),
    cat ? purple : harness,
    [0, 0, 0],
    root,
  );
  scarf.name = "ScarfFlex";
  scarf.rotation.z = cat ? 0.19 : -0.16;
  return {
    root,
    head,
    arms,
    tail,
    cat,
    ears,
    eyeGroups,
    smile,
    openMouth,
    jaw,
    tongue,
    tailMesh,
    chest,
    torso,
    item: null,
  };
}

function smoothArm(shoulder, elbow, wrist, material, index) {
  const points = [
    [shoulder.x, shoulder.y + 0.045, shoulder.z + 0.035, 0.034, 0.04],
    [...shoulder.toArray(), 0.119, 0.111],
    [...shoulder.clone().lerp(elbow, 0.53).toArray(), 0.127, 0.117],
    [...elbow.toArray(), 0.108, 0.105],
    [...elbow.clone().lerp(wrist, 0.48).toArray(), 0.123, 0.112],
    [...wrist.toArray(), 0.102, 0.086],
    [
      ...wrist
        .clone()
        .add(new THREE.Vector3(0, -0.035, -0.031))
        .toArray(),
      0.045,
      0.039,
    ],
  ];
  const geometry = loft(points, 0.93);
  const indices = [],
    weights = [];
  const count = geometry.attributes.position.count;
  for (let i = 0; i < count; i++) {
    const t = Math.floor(i / 32) / (count / 32 - 1);
    const elbowWeight = THREE.MathUtils.smoothstep(t, 0.18, 0.63);
    const wristWeight = THREE.MathUtils.smoothstep(t, 0.58, 1);
    indices.push(0, 1, 2, 0);
    weights.push(
      1 - elbowWeight,
      elbowWeight * (1 - wristWeight),
      elbowWeight * wristWeight,
      0,
    );
  }
  geometry.setAttribute(
    "skinIndex",
    new THREE.Uint16BufferAttribute(indices, 4),
  );
  geometry.setAttribute(
    "skinWeight",
    new THREE.Float32BufferAttribute(weights, 4),
  );
  const shoulderBone = new THREE.Bone(),
    elbowBone = new THREE.Bone(),
    wristBone = new THREE.Bone();
  shoulderBone.name = "ShoulderBone" + index;
  elbowBone.name = "ElbowBone" + index;
  wristBone.name = "WristBone" + index;
  shoulderBone.position.copy(shoulder);
  elbowBone.position.copy(elbow).sub(shoulder);
  wristBone.position.copy(wrist).sub(elbow);
  const skin = new THREE.SkinnedMesh(geometry, material);
  skin.name = "SeamlessArm" + index;
  skin.userData = {
    shoulder: shoulder.toArray(),
    elbow: elbow.toArray(),
    wrist: wrist.toArray(),
    side: Math.sign(shoulder.x),
  };
  skin.add(shoulderBone);
  shoulderBone.add(elbowBone);
  elbowBone.add(wristBone);
  skin.updateMatrixWorld(true);
  skin.bind(new THREE.Skeleton([shoulderBone, elbowBone, wristBone]));
  return skin;
}

function createMascot(isCat) {
  const m = mascot(isCat);
  const named = {
    Head: m.head,
    Jaw: m.jaw,
    Mouth: m.openMouth,
    Tongue: m.tongue,
    Smile: m.smile,
    Chest: m.chest,
    Torso: m.torso,
    Tail: m.tail,
    TailFlex: m.tailMesh,
  };
  for (const [name, node] of Object.entries(named)) node.name = name;
  m.root.name = isCat ? "GatoPreto" : "Caramelo";
  m.arms.forEach(({ upper, lower, paw, shoulder, side }, i) => {
    paw.name = "Paw" + i;
    const elbow = new THREE.Vector3(side * 0.54, 0.67, -0.14);
    paw.position.set(side * 0.42, 0.41, -0.41);
    m.root.add(smoothArm(shoulder, elbow, paw.position, upper.material, i));
    upper.removeFromParent();
    lower.removeFromParent();
  });
  m.eyeGroups.forEach(({ eye, brow, slit, gaze, lid, side }, i) => {
    lid.name = "Lid" + i;
    eye.name = "Eye" + i;
    brow.name = "Brow" + i;
    slit.name = "Pupil" + i;
    gaze.name = "Gaze" + i;
    eye.userData.side = side;
  });
  m.ears.forEach(({ root, meshes }, i) => {
    root.name = "Ear" + i;
    meshes.forEach((node, j) => (node.name = "EarFlex" + i + j));
  });
  return m.root;
}

function sharedGeometry(root) {
  const fixed = new Map();
  root.traverse((node) => {
    if (
      !node.isMesh ||
      node.geometry.index ||
      Object.keys(node.geometry.morphAttributes).length
    )
      return;
    const key = node.geometry.uuid;
    if (!fixed.has(key)) fixed.set(key, mergeVertices(node.geometry, 0.001));
    node.geometry = fixed.get(key);
  });
}

window.exportModels = async () => {
  const exporter = new GLTFExporter();
  const assets = [
    createMascot(false),
    createMascot(true),
    createKart(),
    createGrove(),
  ];
  const results = [];
  for (const asset of assets) {
    sharedGeometry(asset);
    const animations = [];
    if (asset.name === "Caramelo" || asset.name === "GatoPreto") {
      animations.push(
        new THREE.AnimationClip("Respirar", 2.8, [
          new THREE.VectorKeyframeTrack(
            "Chest.scale",
            [0, 0.7, 1.4, 2.1, 2.8],
            [
              1, 1, 1, 1.012, 1.02, 1.014, 1.024, 1.035, 1.023, 1.012, 1.02,
              1.014, 1, 1, 1,
            ],
          ),
          new THREE.VectorKeyframeTrack(
            "Torso.scale",
            [0, 1.4, 2.8],
            [1, 1, 1, 1.015, 1.01, 1.025, 1, 1, 1],
          ),
          new THREE.QuaternionKeyframeTrack(
            "TailTip.quaternion",
            [0, 0.7, 1.4, 2.1, 2.8],
            [0, 0.15, 0, -0.15, 0].flatMap((angle) =>
              new THREE.Quaternion()
                .setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle)
                .toArray(),
            ),
          ),
        ]),
      );
    }
    const data = await exporter.parseAsync(asset, {
      binary: true,
      onlyVisible: false,
      maxTextureSize: 512,
      animations,
    });
    const blob = new Blob([data], { type: "model/gltf-binary" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = asset.name + ".glb";
    anchor.click();
    results.push({ name: anchor.download, bytes: blob.size });
  }
  return results;
};

// Leaf mesh with a folded midrib and a rounded edge, coloured by branch exposure.
function createGrove() {
  const grove = new THREE.Group();
  grove.name = "Grove";
  const bark = mat(0xa17151, 0.95);
  bark.map = paintTexture(128, (ctx, size) => {
    ctx.fillStyle = "#b99470";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 21; i++) {
      const x = i * 6.1;
      ctx.strokeStyle = i % 3 ? "#8c6345" : "#dbb796";
      ctx.lineWidth = 1 + (i % 4) * 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 4, 40, x - 3, 93, x + 1, 128);
      ctx.stroke();
    }
  });
  const leafSurface = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.83,
    side: THREE.DoubleSide,
  });
  const flowerMats = [
    mat(0xffb35c, 0.58),
    mat(0xf192a3, 0.62),
    mat(0xffe0a3, 0.65),
  ];
  const centerMat = mat(0xc57134, 0.96);
  let noise = 57218;
  const rnd = () =>
    (noise = (Math.imul(noise, 1664525) + 1013904223) >>> 0) / 4294967296;
  const tones = [
    0x365b32, 0x49794a, 0x609551, 0x6e9c58, 0x7ca552, 0x92b964,
  ].map((c) => new THREE.Color(c));
  const yAxis = new THREE.Vector3(0, 1, 0);
  function leafCloud(branches, target, scale) {
    const templates = [];
    for (const [anchor, count] of branches) {
      for (let i = 0; i < count; i++) {
        const theta = rnd() * Math.PI * 2;
        const phi = Math.acos(2 * rnd() - 1);
        const radius = (0.35 + 0.78 * rnd()) * scale;
        const direction = new THREE.Vector3(
          Math.cos(theta) * Math.sin(phi),
          Math.cos(phi),
          Math.sin(theta) * Math.sin(phi),
        );
        const position = anchor.clone().addScaledVector(direction, radius);
        const leafSize = (0.21 + 0.62 * rnd()) * scale;
        const fan = new THREE.BufferGeometry();
        fan.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(
            [
              0, 0, -0.8, -0.36, 0.018, -0.41, -0.52, 0.045, 0.11, -0.33, 0.066,
              0.51, 0, 0.095, 0.84, 0.32, 0.074, 0.55, 0.48, 0.038, 0.1, 0.34,
              0.009, -0.37, 0, 0.178, 0.07,
            ].map((x) => x * leafSize),
            3,
          ),
        );
        fan.setIndex([
          8, 1, 0, 8, 2, 1, 8, 3, 2, 8, 4, 3, 8, 5, 4, 8, 6, 5, 8, 7, 6, 8, 0,
          7,
        ]);
        fan.computeVertexNormals();
        const leaf = fan.toNonIndexed();
        const color = tones[Math.floor(rnd() * tones.length)];
        const rgb = [];
        for (let v = 0; v < 24; v++) {
          const gain = 0.83 + 0.12 * rnd() + 0.07 * direction.y;
          rgb.push(color.r * gain, color.g * gain, color.b * gain);
        }
        leaf.setAttribute("color", new THREE.Float32BufferAttribute(rgb, 3));
        const tilt = new THREE.Quaternion().setFromUnitVectors(
          yAxis,
          direction.clone().addScaledVector(yAxis, 0.9).normalize(),
        );
        leaf.applyQuaternion(tilt);
        leaf.translate(...position.toArray());
        templates.push(leaf);
      }
    }
    const geometry = mergeGeometries(templates);
    mesh(geometry, leafSurface, [0, 0, 0], target);
    templates.forEach((g) => g.dispose());
  }

  for (let variation = 0; variation < 3; variation++) {
    const tree = new THREE.Group();
    tree.name = "Tree" + variation;
    grove.add(tree);
    const lean = (variation - 1) * 0.31;
    mesh(
      loft(
        [
          [0, -0.05, 0, 0.49, 0.38],
          [0.015, 0.23, 0.04, 0.39, 0.31],
          [0.13, 0.93, 0.015, 0.25, 0.24],
          [lean * 0.31, 1.69, 0, 0.22, 0.2],
          [lean * 0.6, 2.53, 0.07, 0.144, 0.121],
          [lean, 3.4, 0.12, 0.071, 0.051],
          [lean * 1.12, 4.37, 0.12, 0.009, 0.013],
        ],
        0.82,
      ),
      bark,
      [0, 0, 0],
      tree,
    );
    const branches = [];
    for (let i = 0; i < 9; i++) {
      const angle = i * 2.399963 + variation * 0.8;
      const r = 0.79 + rnd() * 0.98;
      const x = Math.cos(angle) * r,
        z = Math.sin(angle) * r;
      const h = 2.43 + i * 0.19 + rnd() * 0.39;
      const start = new THREE.Vector3(lean * 0.47, h - 0.86, 0.04);
      const tip = new THREE.Vector3(x, h, z);
      const branch = mesh(
        loft([
          [start.x, start.y, start.z, 0.102, 0.1],
          [x * 0.37, h - 0.37, z * 0.4, 0.081, 0.073],
          [x * 0.73, h - 0.07, z * 0.77, 0.053, 0.048],
          [x, h, z, 0.01, 0.012],
        ]),
        bark,
        [0, 0, 0],
        tree,
      );
      branches.push([tip, 55]);
      const twig = tip
        .clone()
        .lerp(start, 0.23)
        .add(new THREE.Vector3(z * 0.45, 0.35, -x * 0.29));
      branches.push([twig, 28]);
    }
    branches.push([new THREE.Vector3(lean, 4.03, 0), 92]);
    leafCloud(branches, tree, 1.05);
  }

  const shrub = new THREE.Group();
  shrub.name = "Shrub";
  grove.add(shrub);
  leafCloud(
    [
      [new THREE.Vector3(-0.32, 0.38, 0), 70],
      [new THREE.Vector3(0.36, 0.4, 0.12), 90],
      [new THREE.Vector3(0, 0.76, -0.29), 75],
    ],
    shrub,
    0.6,
  );
  const flowers = new THREE.Group();
  flowers.name = "Flowers";
  grove.add(flowers);
  const stem = mat(0x537d46, 0.9);
  for (let i = 0; i < 7; i++) {
    const x = (rnd() - 0.5) * 0.95,
      z = (rnd() - 0.5) * 0.86,
      y = 0.26 + rnd() * 0.35;
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x * 0.8, 0, z * 0.76),
      new THREE.Vector3(x * 0.95, y * 0.55, z + 0.04),
      new THREE.Vector3(x, y, z),
    ]);
    mesh(
      new THREE.TubeGeometry(path, 7, 0.013, 5, false),
      stem,
      [0, 0, 0],
      flowers,
    );
    const bloom = new THREE.Group();
    bloom.position.set(x, y, z);
    bloom.rotation.z = (rnd() - 0.5) * 0.54;
    flowers.add(bloom);
    for (let j = 0; j < 6; j++) {
      const a = (j * Math.PI) / 3;
      const petal = mesh(
        loft(
          [
            [0, -0.01, 0.02, 0.014, 0.012],
            [0, 0.015, 0.078, 0.066, 0.025],
            [0, 0.033, 0.126, 0.048, 0.025],
            [0, 0.012, 0.16, 0.003, 0.004],
          ],
          0.86,
        ),
        flowerMats[i % 3],
        [0, 0, 0],
        bloom,
      );
      petal.rotation.y = a;
    }
    const core = sphere(0.047, centerMat, [0, 0.031, 0], bloom);
    core.scale.y = 0.54;
  }
  return grove;
}
