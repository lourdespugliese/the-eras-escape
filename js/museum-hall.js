// Luz de galería y entorno de reflejos del hall, independientes de las otras salas.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

export function buildHallLighting(root, centerX) {
  if (!THREE.UniformsLib.LTC_FLOAT_1) RectAreaLightUniformsLib.init();
  const group = new THREE.Group(); group.name = 'museum-hall-lighting'; root.add(group);
  const lights = [];
  for (const side of [-1, 1]) {
    const light = new THREE.RectAreaLight(0xffdfb4, 0, 2.8, 14);
    light.position.set(centerX + side * 10, 7.6, 15);
    light.lookAt(centerX + side * 5, 0, 15);
    light.userData.hallPower = 5;
    group.add(light); lights.push(light);
  }
  for (const dx of [-9, 0, 9]) {
    const light = new THREE.PointLight(0xffcf91, 0, 10, 2);
    light.position.set(centerX + dx, 5.8, 6.9);
    light.userData.hallPower = 15; light.userData.noShadow = true;
    group.add(light); lights.push(light);
  }
  const chandelier = new THREE.RectAreaLight(0xffe2b9, 0, 4.5, 4.5);
  chandelier.position.set(centerX, 7.25, 15); chandelier.lookAt(centerX, 0, 15);
  chandelier.userData.hallPower = 2.4; group.add(chandelier); lights.push(chandelier);
  return {
    group, lights,
    update(amount) { lights.forEach(light => { light.intensity = light.userData.hallPower * amount; }); },
  };
}

function galleryEnvironment(renderer) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x160f09);
  const meshes = [];
  function surface(width, height, color, x, y, z, target) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({
      color, side: THREE.DoubleSide,
    }));
    mesh.position.set(x, y, z); mesh.lookAt(...target); scene.add(mesh); meshes.push(mesh);
    return mesh;
  }
  surface(32, 24, 0x73604b, 0, -4, 0, [0, 0, 0]);
  surface(32, 24, 0x100c08, 0, 5, 0, [0, 0, 0]);
  surface(30, 9, 0x544332, 0, 0.5, -12, [0, 0.5, 0]);
  surface(30, 9, 0x544332, 0, 0.5, 12, [0, 0.5, 0]);
  for (const side of [-1, 1]) {
    surface(24, 9, 0x6d5840, side * 16, 0.5, 0, [0, 0.5, 0]);
    for (const z of [-7, 0, 7]) {
      const card = surface(0.8, 8, 0xffffff, side * 15.8, 0.5, z, [0, 0.5, z]);
      card.material.color.setRGB(4.5, 3.8, 2.8);
    }
  }
  for (const z of [-11.8, 11.8]) for (const x of [-10, 0, 10]) {
    const card = surface(1.1, 7, 0xffffff, x, 0.5, z, [x, 0.5, 0]);
    card.material.color.setRGB(4.2, 3.9, 3.3);
  }
  const overhead = surface(8, 12, 0xffffff, 0, 4.7, 0, [0, 0, 0]);
  overhead.material.color.setRGB(3, 2.5, 1.9);
  const generator = new THREE.PMREMGenerator(renderer);
  const target = generator.fromScene(scene, 0.045, 0.1, 70); generator.dispose();
  meshes.forEach(mesh => { mesh.geometry.dispose(); mesh.material.dispose(); });
  return target;
}

export function setupHallMaterials(renderer, scene, ctx) {
  const museum = ctx.museum; if (!museum) return;
  const environment = galleryEnvironment(renderer), seen = new WeakSet(), copies = new WeakMap();
  const position = new THREE.Vector3();
  const contacts = new THREE.Group(); contacts.name = 'hall-contact-shadows'; museum.root.add(contacts);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const g = canvas.getContext('2d'), gradient = g.createRadialGradient(32, 32, 10, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(0,0,0,.55)'); gradient.addColorStop(0.55, 'rgba(0,0,0,.3)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gradient; g.fillRect(0, 0, 64, 64);
  const contactMaterial = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas),
    transparent: true, depthWrite: false, toneMapped: false });
  function apply(original) {
    if (!original.isMeshStandardMaterial) return original;
    const kind = original.userData.surfaceKind;
    if (!['brass', 'ivory-marble', 'dark-marble', 'checker'].includes(kind) && !original.userData.museumGlass) return original;
    if (original.userData.museumStatue) {
      original.envMap = environment.texture; original.envMapIntensity = 0.22; original.needsUpdate = true;
      return original;
    }
    if (copies.has(original)) return copies.get(original);
    const material = original.clone(); material.envMap = environment.texture;
    if (kind === 'brass') {
      material.color.setHex(0xd9b05b); material.metalness = 0.82;
      material.roughness = 0.24; material.envMapIntensity = 0.9;
    } else if (original.userData.museumGlass) {
      material.color.setHex(0xc3beb4); material.opacity = 0.12; material.metalness = 0.12;
      material.roughness = 0.045; material.envMapIntensity = 2;
    } else {
      material.envMapIntensity = kind === 'checker' ? 0.35 : 0.3;
      if (kind === 'checker') {
        material.normalScale.set(0.065, 0.065); material.roughness = 0.62;
        material.clearcoat = 0.65; material.clearcoatRoughness = 0.12;
      }
    }
    material.needsUpdate = true; copies.set(original, material); return material;
  }
  function refresh() {
    scene.updateMatrixWorld();
    scene.traverse(mesh => {
      if (!mesh.isMesh || seen.has(mesh)) return;
      mesh.getWorldPosition(position);
      if (position.x < -13 || position.x > 17 || position.z < 5.2 || position.z > 24.9) return;
      seen.add(mesh);
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(apply) : apply(mesh.material);
      const dimensions = mesh.geometry.parameters;
      if (mesh.geometry.type === 'BoxGeometry' && dimensions.width > 0.6 && dimensions.depth > 0.6 &&
          dimensions.height > 0.2 && Math.abs(position.y - dimensions.height / 2) < 0.025) {
        const shadow = new THREE.Mesh(new THREE.PlaneGeometry(dimensions.width + 0.9, dimensions.depth + 0.9), contactMaterial);
        shadow.rotation.x = -Math.PI / 2; shadow.position.set(position.x, 0.01, position.z);
        shadow.raycast = () => {}; contacts.add(shadow);
      }
    });
  }
  refresh();
  let elapsed = 0;
  ctx.updaters.push(dt => { elapsed += dt; if (elapsed > 1.5) { elapsed = 0; refresh(); } });
  museum.hallEnvironment = environment;
}
