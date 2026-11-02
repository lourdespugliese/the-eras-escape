// Cornisa con vuelo real: tres niveles y remate inclinado del frontón.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

export function buildMuseumCornice(root, centerX, stone) {
  const group = new THREE.Group(); group.name = 'museum-stone-cornice'; root.add(group);
  const shade = stone.clone(); shade.color.multiplyScalar(0.63); shade.roughness = 1;
  const coping = stone.clone(); coping.color.multiplyScalar(1.12);
  function beam(width, height, depth, x, y, z, material = stone, angle = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(centerX + x, y, z); mesh.rotation.z = angle;
    mesh.userData.forceShadow = true; group.add(mesh); return mesh;
  }
  // La cara inferior más oscura queda retranqueada respecto al labio superior.
  beam(36.9, 0.14, 0.7, 0, 9.13, 28.95, shade);
  beam(37.5, 0.3, 0.9, 0, 9.35, 29.02);
  beam(38.2, 0.18, 1.12, 0, 9.63, 29.05, coping);
  // Los remates inclinados siguen la silueta existente y enmarcan el cartel.
  for (const side of [-1, 1]) {
    const x = side * 18.5, y = 9.95, peak = 13.86;
    const length = Math.hypot(x, peak - y);
    const angle = Math.atan2(peak - y, -x);
    beam(length, 0.24, 0.64, x / 2, (y + peak) / 2, 28.93, stone, angle);
    beam(length + 0.08, 0.11, 0.85, x / 2, (y + peak) / 2 + 0.17, 28.95, coping, angle);
  }
  // Bañadores sobre el labio: su luz nace por encima de la cornisa que tapa la luz de abajo.
  const lights = [];
  RectAreaLightUniformsLib.init();
  // Relleno lineal amplio para que no queden bandas oscuras entre los focos.
  const fill = new THREE.RectAreaLight(0xffd9ac, 0, 34, 2.4);
  fill.name = 'pediment-linear-fill'; fill.position.set(centerX, 10.9, 29.85);
  fill.lookAt(centerX, 11, 28.65); group.add(fill); lights.push(fill);
  const casing = new THREE.MeshStandardMaterial({ color: 0x241e16, metalness: 0.6, roughness: 0.5 });
  const diffuser = new THREE.MeshBasicMaterial({ color: 0xffdea6 });
  [-15, -9, -3, 3, 9, 15].forEach((x, index) => {
    const housing = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.09, 0.24), casing);
    housing.position.set(centerX + x, 9.79, 29.24); group.add(housing);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.12), diffuser);
    panel.rotation.x = -Math.PI / 2; panel.position.set(centerX + x, 9.84, 29.24); group.add(panel);
    const light = new THREE.SpotLight(0xffd6a0, 0, 8, 1.16, 1, 2);
    light.name = `pediment-wash-light-${index}`;
    light.position.set(centerX + x, 9.95, 29.24);
    light.target.position.set(centerX + x, 11.6, 28.65);
    light.castShadow = false; light.userData.noShadow = true;
    group.add(light, light.target); lights.push(light);
  });
  return {
    group, lights,
    update(outside) { lights.forEach(light => { light.intensity = (light.isRectAreaLight ? 0.7 : 7) * outside; }); },
  };
}
