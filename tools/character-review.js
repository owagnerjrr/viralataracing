import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
const renderer = new T.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
document.body.append(renderer.domElement);
const scene = new T.Scene();
scene.background = new T.Color("#102326");
const camera = new T.PerspectiveCamera(36, innerWidth / innerHeight, 0.05, 100);
camera.position.set(3, 2.3, -5);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.15, 0);
controls.update();
const pmrem = new T.PMREMGenerator(renderer),
  room = new RoomEnvironment();
scene.environment = pmrem.fromScene(room, 0.04).texture;
scene.environmentIntensity = 0.4;
pmrem.dispose();
room.dispose();
scene.add(new T.HemisphereLight(0xfff0d4, 0x457475, 2));
const key = new T.DirectionalLight(0xffe0ad, 3);
key.position.set(-3, 5, -4);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = key.shadow.camera.bottom = -3;
key.shadow.camera.right = key.shadow.camera.top = 3;
key.shadow.normalBias = 0.015;
scene.add(key);
const rim = new T.DirectionalLight(0xb5ddff, 1.5);
rim.position.set(4, 2, 3);
scene.add(rim);
const floor = new T.Mesh(
  new T.PlaneGeometry(200, 200),
  new T.MeshStandardMaterial({ color: "#24433e", roughness: 1 }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
let asset,
  mixer,
  action,
  blinkAt = -Infinity,
  wire = false,
  generation = 0;
const clips = document.querySelector("#clip"),
  status = document.querySelector("#status");
function dispose(root) {
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set();
  root.traverse((o) => {
    if (o.geometry) geometries.add(o.geometry);
    for (const m of Array.isArray(o.material) ? o.material : [o.material])
      if (m) {
        materials.add(m);
        for (const v of Object.values(m)) if (v?.isTexture) textures.add(v);
      }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
}
function play() {
  action?.stop();
  const clip = asset.animations.find((c) => c.name === clips.value);
  action = clip ? mixer.clipAction(clip).reset().play() : null;
}
async function load() {
  const id = ++generation;
  status.textContent = "Carregando…";
  try {
    const next = await loader.loadAsync(
      "/models/candidates/caramelo_" +
        document.querySelector("#lod").value +
        ".glb",
    );
    if (id !== generation) {
      dispose(next.scene);
      return;
    }
    if (asset) {
      mixer.stopAllAction();
      mixer.uncacheRoot(asset.scene);
      scene.remove(asset.scene);
      dispose(asset.scene);
    }
    asset = next;
    frames = [];
    previous = performance.now();
    document.querySelector('#metrics').textContent = 'Medindo esta prévia no computador atual…';
    asset.scene.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = o.receiveShadow = true;
        o.frustumCulled = !o.isSkinnedMesh;
        o.material.wireframe = wire;
      }
    });
    scene.add(asset.scene);
    mixer = new T.AnimationMixer(asset.scene);
    clips.replaceChildren(
      new Option("Pose de referência", ""),
      ...asset.animations.map((c) => new Option(c.name, c.name)),
    );
    const idle = asset.animations.find((c) => c.name === "Respirar");
    if (idle) clips.value = idle.name;
    play();
    status.textContent = `${asset.animations.length} clipes · ${renderer.capabilities.maxTextureSize}px máx. textura`;
    window.__characterReview = { asset, renderer, scene, camera, mixer };
  } catch (error) {
    status.textContent = "Falha ao carregar: " + error.message;
    console.error(error);
  }
}
document.querySelector("#lod").addEventListener("change", load);
clips.addEventListener("change", play);
document.querySelector("#blink").onclick = () => (blinkAt = performance.now());
document.querySelector("#wire").onclick = () => {
  wire = !wire;
  asset?.scene.traverse((o) => {
    if (o.isMesh) o.material.wireframe = wire;
  });
};
let previous = performance.now(),
  frames = [];
renderer.setAnimationLoop((now) => {
  const elapsed = now - previous;
  const dt = Math.min(0.05, elapsed / 1000);
  previous = now;
  mixer?.update(dt);
  const phase = (now - blinkAt) / 240;
  asset?.scene.traverse((o) => {
    const i = o.morphTargetDictionary?.Blink;
    if (i !== undefined)
      o.morphTargetInfluences[i] =
        phase >= 0 && phase <= 1 ? Math.sin(phase * Math.PI) : 0;
  });
  renderer.render(scene, camera);
  if (asset && !document.hidden && elapsed > 0) {
    frames.push(elapsed);
    if (frames.length === 180) {
      const sorted = [...frames].sort((a, b) => a - b),
        average = frames.reduce((a, b) => a + b, 0) / frames.length;
      document.querySelector("#metrics").textContent =
        `Prévia desktop · ${(1000 / average).toFixed(1)} FPS médios · p95 ${sorted[Math.floor(sorted.length * 0.95)].toFixed(1)} ms · ${renderer.info.render.triangles.toLocaleString("pt-BR")} triângulos · ${renderer.info.render.calls} chamadas`;
      frames = [];
    }
  }
});
document.addEventListener("visibilitychange", () => {
  frames = [];
  previous = performance.now();
});
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
load();
