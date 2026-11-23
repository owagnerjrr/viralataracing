import * as THREE from "three";

export function paintTexture(size, paint) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  paint(canvas.getContext("2d"), size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function surfaceTexture(base, colors) {
  const texture = paintTexture(256, (ctx, size) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    let seed = 29;
    const next = () =>
      (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
    for (let i = 0; i < 12500; i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(
        next() * size,
        next() * size,
        1 + next() * 3,
        1 + next() * 2,
      );
    }
  });
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Cross-sections are [x, y, z, half width, half height].
export function loft(sections, exponent = 1) {
  const path = new THREE.CatmullRomCurve3(
    sections.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
  );
  const shape = new THREE.CatmullRomCurve3(
    sections.map(([, , , w, h]) => new THREE.Vector3(w, h, 0)),
  );
  const rings = sections.length * 6;
  const sides = 32;
  const vertices = [];
  const indices = [];
  const uv = [];
  const center = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const size = new THREE.Vector3();
  const across = new THREE.Vector3(1, 0, 0);
  const normal = new THREE.Vector3();
  const power = (x) => Math.sign(x) * Math.pow(Math.abs(x), exponent);
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    path.getPoint(t, center);
    path.getTangent(t, tangent);
    shape.getPoint(t, size);
    normal.crossVectors(tangent, across).normalize();
    for (let j = 0; j < sides; j++) {
      const angle = (j * Math.PI * 2) / sides;
      const v = center
        .clone()
        .addScaledVector(
          across,
          Math.max(0.001, size.x) * power(Math.cos(angle)),
        )
        .addScaledVector(
          normal,
          Math.max(0.001, size.y) * power(Math.sin(angle)),
        );
      vertices.push(v.x, v.y, v.z);
      uv.push(j / sides, t);
      if (i > 0) {
        const a = (i - 1) * sides + j;
        const b = (i - 1) * sides + ((j + 1) % sides);
        indices.push(a, b, a + sides, b, b + sides, a + sides);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export const questionFace = () =>
  paintTexture(256, (ctx, size) => {
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, "#87ffda");
    gradient.addColorStop(0.45, "#087e8c");
    gradient.addColorStop(1, "#28326f");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "#e7ffcc";
    ctx.lineWidth = 9;
    ctx.strokeRect(13, 13, 230, 230);
    ctx.font = "900 185px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 12;
    ctx.strokeStyle = "#143751";
    ctx.strokeText("?", 128, 137);
    ctx.fillStyle = "#fff9b2";
    ctx.fillText("?", 128, 137);
  });

export const bananaGeometry = loft([
  [0, 0.55, 0, 0.032, 0.02],
  [0, 0.31, 0.05, 0.1, 0.034],
  [0, 0.11, 0.3, 0.17, 0.038],
  [0, 0.06, 0.6, 0.105, 0.026],
  [0, 0.15, 0.81, 0.014, 0.012],
]);

export const turboIcon =
  '<svg viewBox="0 0 32 26" width="26" height="22" aria-hidden="true"><path d="M2 2h27L17 13h10L6 25l5-10H4L16 7H2Z" fill="#ffd656" stroke="#473321" stroke-width="1.4" stroke-linejoin="round"/></svg>';
