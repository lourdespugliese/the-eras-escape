// Cornisa con vuelo real: tres niveles y remate inclinado del frontón.
import * as THREE from 'three';

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
  // Los remates inclinados siguen la silueta existente sin invadir el reloj.
  for (const side of [-1, 1]) {
    const x = side * 18.5, y = 9.95, peak = 13.86;
    const length = Math.hypot(x, peak - y);
    const angle = Math.atan2(peak - y, -x);
    beam(length, 0.24, 0.64, x / 2, (y + peak) / 2, 28.93, stone, angle);
    beam(length + 0.08, 0.11, 0.85, x / 2, (y + peak) / 2 + 0.17, 28.95, coping, angle);
  }
  return group;
}
