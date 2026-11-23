import * as THREE from "three";

export const COURSE_SCALE = 4 / 3;

// Original riverside circuit, sampled uniformly by distance for the rails and checkpoints.
const guide = new THREE.CatmullRomCurve3(
  [
    [-13, 49],
    [8, 49],
    [34, 49],
    [57, 46],
    [69, 32],
    [64, 17],
    [47, 7],
    [41, -2],
    [46, -12],
    [62, -12],
    [76, -21],
    [78, -36],
    [69, -50],
    [54, -53],
    [38, -47],
    [24, -36],
    [10, -39],
    [-5, -48],
    [-20, -47],
    [-34, -36],
    [-54, -34],
    [-70, -29],
    [-77, -17],
    [-72, -4],
    [-59, 1],
    [-46, -1],
    [-39, 8],
    [-45, 21],
    [-35, 32],
    [-37, 41],
    [-28, 48],
  ].map(([x, z]) => new THREE.Vector3(x, 0, z)),
  true,
  "centripetal",
);
guide.arcLengthDivisions = 2500;

// Round the sharpest entries in distance space so that the inside edge
// and rail remain continuous at the chosen road width.
const rounded = [];
const length = guide.getLength();
for (let i = 0; i < 160; i++) {
  let mass = 0;
  const point = new THREE.Vector3();
  for (let j = -12; j <= 12; j++) {
    const delta = j * 1.5;
    const weight = Math.exp(-0.5 * (delta / 6) ** 2);
    const t = (i / 160 + delta / length + 1) % 1;
    point.addScaledVector(guide.getPointAt(t), weight);
    mass += weight;
  }
  rounded.push(point.multiplyScalar(COURSE_SCALE / mass));
}
export const centerline = new THREE.CatmullRomCurve3(rounded, true);
centerline.arcLengthDivisions = 2500;

export function riverCenter(z) {
  const originalZ = z / COURSE_SCALE;
  return (
    COURSE_SCALE *
    (1 +
      Math.sin(originalZ * 0.042) * 7 +
      Math.sin(originalZ * 0.085 + 0.9) * 2)
  );
}
export function riverWidth(z) {
  const originalZ = z / COURSE_SCALE;
  return (
    COURSE_SCALE *
    (5.7 +
      8.7 * Math.exp(-((originalZ - 63) ** 2) / 265) +
      2.8 * Math.exp(-((originalZ + 15) ** 2) / 320))
  );
}
export const channelDistance = (x, z) =>
  Math.abs(x - riverCenter(z)) - riverWidth(z);

export function terrainGeometry() {
  const geometry = new THREE.PlaneGeometry(
    277 * COURSE_SCALE,
    250 * COURSE_SCALE,
    155,
    142,
  );
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  const colors = [];
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      z = positions.getZ(i);
    const distance = channelDistance(x, z);
    const bank = THREE.MathUtils.smoothstep(distance, -2.4, 1.9);
    const grain = Math.sin(x * 0.16) * Math.cos(z * 0.2);
    positions.setY(
      i,
      THREE.MathUtils.lerp(-1.95, -0.105 + grain * 0.042, bank),
    );
    const color = new THREE.Color(0x97bc73).lerp(
      new THREE.Color(0xb79465),
      0.94 * (1 - THREE.MathUtils.smoothstep(distance, -1.25, 3.1)),
    );
    color.multiplyScalar(
      0.87 + 0.09 * grain + 0.09 * Math.sin(x * 0.37 + z * 0.23),
    );
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function createRiver() {
  const geometry = new THREE.PlaneGeometry(100, 249 * COURSE_SCALE, 1, 190);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const z = positions.getZ(i);
    positions.setXYZ(
      i,
      riverCenter(z) + Math.sign(positions.getX(i)) * (riverWidth(z) - 0.32),
      -0.91,
      z,
    );
  }
  const material = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `
      varying vec3 point;
      varying vec2 coords;
      void main(){
        point=position; coords=uv;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec3 point;
      varying vec2 coords;
      void main(){
        float wave = sin(point.z*2.6+sin(point.x*.87+time*.72)*2.1-time*1.4);
        float crossWave = sin(point.x*2.3-point.z*.84+time*.67);
        float shimmer = pow(max(0.,wave*crossWave), 9.);
        float edge=smoothstep(.25,.48,abs(coords.x-.5));
        vec3 normal = normalize(vec3(wave*.078,1.,crossWave*.106));
        vec3 viewRay = normalize(cameraPosition-point);
        vec3 reflection = reflect(-viewRay,normal);
        float fresnel = pow(1.-max(0.,dot(normal,viewRay)),3.);
        vec3 reflectedSky = mix(vec3(.50,.67,.67),vec3(.13,.35,.66),
          smoothstep(0.,.57,reflection.y));
        vec3 color=mix(vec3(.022,.216,.222),vec3(.11,.39,.30),edge*.73+.084*wave);
        color=mix(color,reflectedSky,fresnel*.67);
        color+=vec3(.19,.31,.27)*shimmer*.58+edge*vec3(.036,.064,.043);
        gl_FragColor=vec4(color,1.);
        #include <colorspace_fragment>
      }
    `,
  });
  return new THREE.Mesh(geometry, material);
}

export function surfaceAt(point) {
  if (channelDistance(point.x, point.z) < 2.35) return 1;
  return point.x < -38.5 * COURSE_SCALE && point.z < 39 * COURSE_SCALE ? 2 : 0;
}
