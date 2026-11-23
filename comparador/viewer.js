import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const $ = (id) => document.getElementById(id);
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const sources = {
  dog: [
    new URL("../caramelo.glb", import.meta.url).href,
    "../models/caramelo_final.glb",
  ],
  cat: [
    new URL("../gato_preto.glb", import.meta.url).href,
    "../models/gato_preto_final.glb",
  ],
};
const ray = new THREE.DirectionalLight(0xffe1bc, 2.7);

function viewport(id) {
  const target = $(id);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.13;
  target.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x293940);
  const generator = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = generator.fromScene(room).texture;
  scene.environmentIntensity = 0.48;
  room.dispose();
  generator.dispose();
  const key = ray.clone();
  key.position.set(-2, 3, -4);
  const fill = new THREE.DirectionalLight(0xa1d4fa, 1.13);
  fill.position.set(4, 2, 1);
  scene.add(key, fill, new THREE.HemisphereLight(0xe7eff8, 0xb7a691, 1.15));
  const stage = new THREE.Group();
  scene.add(stage);
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(1.43, 64),
    new THREE.MeshStandardMaterial({ color: 0x3a5559, roughness: 0.93 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.018;
  scene.add(floor);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 20);
  const observer = new ResizeObserver(() => {
    camera.aspect = target.clientWidth / Math.max(1, target.clientHeight);
    camera.updateProjectionMatrix();
    renderer.setSize(target.clientWidth, target.clientHeight, false);
  });
  observer.observe(target);
  return { stage, renderer, scene, camera };
}
const views = [viewport("original"), viewport("integrated")];
const records = new Map();
let active = [];
let serial = 0;
async function show() {
  const character = $("character").value;
  const request = ++serial;
  $("status").textContent = "Carregando modelos…";
  if (!records.has(character)) {
    const promise = Promise.all(
      sources[character].map((url) => loader.loadAsync(url)),
    ).catch((error) => {
      records.delete(character);
      throw error;
    });
    records.set(character, promise);
  }
  const models = await records.get(character);
  if (request !== serial) return;
  active = models.map((gltf, i) => {
    const root = gltf.scene.getObjectByName(
      character === "dog" ? "Caramelo" : "GatoPreto",
    );
    if (root) {
      root.getObjectByName("Mouth").visible = false;
      root.getObjectByName("Tongue").visible = false;
    }
    const frame = new THREE.Group();
    frame.add(gltf.scene);
    if (i === 0) {
      gltf.scene.rotation.x = -Math.PI / 2;
      frame.rotation.y = Math.PI;
    }
    frame.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(frame);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const fit = new THREE.Group();
    frame.position.set(-center.x, -bounds.min.y, -center.z);
    fit.add(frame);
    fit.scale.setScalar(2.47 / size.y);
    const view = views[i];
    view.stage.clear();
    view.stage.add(fit);
    const gltfJson = gltf.parser.json;
    const stats = [size.x, size.y, size.z]
      .map((value) => value.toFixed(2))
      .join(" × ");
    $(i ? "integrated-facts" : "original-facts").textContent =
      stats +
      " · " +
      (gltfJson.materials?.length
        ? gltfJson.materials.length + " materiais"
        : "cor por vértice") +
      " · " +
      (gltfJson.skins?.length ? "cauda com rig" : "sem rig") +
      " · " +
      (gltf.animations.length === 1
        ? "1 clipe"
        : gltf.animations.length + " clipes");
    const mixer = new THREE.AnimationMixer(root ?? gltf.scene);
    for (const clip of gltf.animations) mixer.clipAction(clip).play();
    return { root, mixer };
  });
  $("status").textContent = "Dois modelos carregados.";
}
$("character").addEventListener("change", () => show().catch(report));
function report(error) {
  $("status").textContent = "Falha ao carregar os modelos. " + error.message;
}
show().catch(report);
let previous = performance.now(),
  time = 0;
function draw(now) {
  requestAnimationFrame(draw);
  const dt = Math.min((now - previous) / 1000, 0.05);
  previous = now;
  if ($("animate").checked) {
    time += dt;
    for (const { root, mixer } of active) {
      mixer.update(dt);
      if (!root) continue;
      const blink = Math.max(0, Math.cos(time * 1.71) - 0.986) / 0.014;
      for (const i of [0, 1]) {
        const lid = root.getObjectByName("Lid" + i);
        if (lid) lid.morphTargetInfluences[0] = blink * 0.96;
      }
    }
  }
  const angle = (Number($("angle").value) * Math.PI) / 180;
  for (const view of views) {
    view.camera.position.set(
      Math.sin(angle) * 5.0,
      1.48,
      -Math.cos(angle) * 5.0,
    );
    view.camera.lookAt(0, 1.24, 0);
    view.renderer.render(view.scene, view.camera);
  }
}
requestAnimationFrame(draw);
