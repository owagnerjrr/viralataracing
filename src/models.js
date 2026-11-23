import { AnimationMixer, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const names = ["Caramelo", "GatoPreto", "KartRibeirao", "Grove"];

function node(root, name) {
  const match = root.getObjectByName(name);
  if (!match) throw new Error("Peça ausente no modelo: " + name);
  return match;
}

function bindMascot(asset, name, cat) {
  const root = node(asset.scene, name);
  const find = (name) => node(root, name);
  const mixer = new AnimationMixer(root);
  const idle = asset.animations.find((clip) => clip.name === "Respirar");
  if (idle)
    mixer
      .clipAction(idle)
      .startAt(cat ? 0.62 : 0)
      .play();
  return {
    root,
    cat,
    mixer,
    item: null,
    head: find("Head"),
    jaw: find("Jaw"),
    tail: find("Tail"),
    tailMesh: find("TailFlex"),
    smile: find("Smile"),
    tongue: find("Tongue"),
    openMouth: find("Mouth"),
    scarf: find("ScarfFlex"),
    arms: [0, 1].map((i) => {
      const upper = find("UpperArm" + i);
      return {
        upper,
        lower: find("Forearm" + i),
        paw: find("Paw" + i),
        side: upper.userData.side,
        shoulder: new Vector3().fromArray(upper.userData.shoulder),
      };
    }),
    eyeGroups: [0, 1].map((i) => {
      const eye = find("Eye" + i);
      return {
        eye,
        brow: find("Brow" + i),
        slit: find("Pupil" + i),
        gaze: find("Gaze" + i),
        side: eye.userData.side,
      };
    }),
    ears: [0, 1].map((i) => ({
      root: find("Ear" + i),
      meshes: [find("EarFlex" + i + "0"), find("EarFlex" + i + "1")],
    })),
  };
}

function bindKart(asset) {
  const kart = node(asset.scene, "KartRibeirao");
  const find = (name) => node(kart, name);
  let tailLamp;
  kart.traverse((part) => {
    if (part.material?.name === "BrakeLamp") tailLamp = part.material;
  });
  if (!tailLamp) throw new Error("Material de freio ausente no modelo");
  return {
    kart,
    body: find("Body"),
    tailLamp,
    wheelFace: find("SteeringWheel"),
    exhaustGlows: [find("ExhaustGlow0"), find("ExhaustGlow1")],
    wheels: [0, 1, 2, 3].map((i) => {
      const pivot = find("Wheel" + i);
      return {
        pivot,
        axle: find("Axle" + i),
        spring: find("Spring" + i),
        ...pivot.userData,
      };
    }),
  };
}

export async function loadModels() {
  const [caramelo, gato, kart, grove] = await Promise.all(
    names.map((name) =>
      loader.loadAsync(import.meta.env.BASE_URL + "models/" + name + ".glb"),
    ),
  );
  for (const { scene } of [caramelo, gato, kart, grove]) {
    scene.traverse((object) => {
      if (!object.isMesh) return;
      if (object.isSkinnedMesh) object.frustumCulled = false;
      object.castShadow = !object.name.startsWith("ExhaustGlow");
      object.receiveShadow = object.castShadow;
      if (object.material.map) object.material.map.anisotropy = 6;
      if (object.material.normalMap) object.material.normalMap.anisotropy = 6;
    });
  }
  return {
    dog: bindMascot(caramelo, "Caramelo", false),
    cat: bindMascot(gato, "GatoPreto", true),
    ...bindKart(kart),
    grove: node(grove.scene, "Grove"),
  };
}
