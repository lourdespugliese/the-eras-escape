import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { randomGenerator } from './surface-library.js';

function pineCrown(random) {
  const position = [], uv = [], color = [], indices = [];
  const tiers = [
    [1.90, 1.85, 8], [2.58, 1.76, 8], [3.26, 1.48, 7], [3.92, 1.30, 7],
    [4.53, 1.06, 6], [5.09, 0.87, 5], [5.62, 0.60, 5], [6.02, 0.35, 4],
  ];
  // Cada rama es un abanico plegado. El alfa de las agujas recorta su contorno.
  for (const [height, radius, count] of tiers) {
    const turn = random() * Math.PI * 2;
    for (let j = 0; j < count; j++) {
      const angle = turn + (j + (random() - 0.5) * 0.32) * Math.PI * 2 / count;
      const x = Math.cos(angle), z = Math.sin(angle), length = radius * (0.78 + random() * 0.42);
      const y = height + (random() - 0.5) * 0.34;
      const points = [
        [0, 0, 0.16, 0, 0.5, 0.57],
        [0.38, 0, 0.26, 0.38, 0.52, 0.88],
        [1, 0.06, -0.16, 1, 0.54, 1],
        [0.57, -0.31, -0.20, 0.57, 0, 0.76],
        [0.47, 0.30, -0.23, 0.47, 1, 0.72],
      ];
      const i = position.length / 3;
      const variation = 0.80 + random() * 0.20;
      for (const [along, across, rise, u, v, value] of points) {
        position.push((along * x - across * z) * length, y + rise * length, (along * z + across * x) * length);
        uv.push(u, j % 2 ? 1 - v : v);
        const shade = value * variation;
        color.push(shade, shade, shade);
      }
      indices.push(i, i + 1, i + 3, i + 1, i + 2, i + 3, i, i + 4, i + 1, i + 1, i + 4, i + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function combine(parts) {
  const geometry = mergeGeometries(parts);
  parts.forEach(part => part.dispose());
  return geometry;
}

function lampBody() {
  const cylinder = (top, bottom, height, y, sides = 10) =>
    new THREE.CylinderGeometry(top, bottom, height, sides).translate(0, y, 0);
  const parts = [
    cylinder(0.23, 0.27, 0.13, 0.065),
    cylinder(0.11, 0.20, 0.42, 0.34),
    cylinder(0.060, 0.100, 2.36, 1.72),
    cylinder(0.115, 0.076, 0.18, 2.96),
    cylinder(0.17, 0.10, 0.12, 3.09, 6),
    cylinder(0.31, 0.28, 0.065, 3.64, 6),
    cylinder(0.062, 0.32, 0.23, 3.78, 6),
    new THREE.SphereGeometry(0.068, 8, 6).translate(0, 3.94, 0),
  ];
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3, x = Math.sin(angle), z = Math.cos(angle);
    const bar = new THREE.BoxGeometry(0.027, 0.54, 0.027);
    bar.rotateX(0.20).rotateY(angle).translate(0.219 * x, 3.39, 0.219 * z);
    parts.push(bar);
  }
  return combine(parts);
}

export function buildMuseumGarden({ root, centerX, ground, colliders, glow }) {
  const group = new THREE.Group();
  group.name = 'museum-side-gardens';
  root.add(group);
  const random = randomGenerator(742);
  const loader = new THREE.TextureLoader();
  function forestMap(file) {
    const texture = loader.load(`assets/textures/world/${file}`);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
  const bark = forestMap('forest-bark.webp');
  bark.wrapT = THREE.RepeatWrapping;
  bark.repeat.y = 3;
  const needles = forestMap('pine-spray.webp');

  const earth = forestMap('forest-earth.webp');
  earth.wrapS = earth.wrapT = THREE.RepeatWrapping;
  earth.repeat.set(2.2, 12);
  const bedGeometry = new THREE.PlaneGeometry(7.2, 37.2, 3, 1);
  const bedColors = [];
  const bedPositions = bedGeometry.attributes.position;
  for (let i = 0; i < bedPositions.count; i++) {
    const fade = 1 - 0.9 * THREE.MathUtils.smoothstep(bedPositions.getX(i), 1.2, 3.6);
    bedColors.push(fade, fade, fade);
  }
  bedGeometry.setAttribute('color', new THREE.Float32BufferAttribute(bedColors, 3));
  bedGeometry.rotateX(-Math.PI / 2);
  const bedMaterial = new THREE.MeshLambertMaterial({
    map: earth, vertexColors: true, emissiveMap: earth, emissive: 0x554e41, emissiveIntensity: 0.18,
  });
  const beds = new THREE.InstancedMesh(bedGeometry, bedMaterial, 2);
  const pose = new THREE.Object3D();
  for (const [i, side] of [-1, 1].entries()) {
    pose.position.set(centerX + side * 23, ground + 0.004, 43.6);
    pose.rotation.y = side < 0 ? Math.PI : 0;
    pose.updateMatrix();
    beds.setMatrixAt(i, pose.matrix);
  }
  group.add(beds);

  const trunkGeometry = new THREE.CylinderGeometry(0.022, 0.19, 6.1, 8).translate(0, 3.05, 0);
  const trunkMaterial = new THREE.MeshLambertMaterial({
    color: 0xbba68c, map: bark, emissiveMap: bark, emissive: 0x77736b, emissiveIntensity: 0.16,
  });
  const crownMaterial = new THREE.MeshLambertMaterial({
    color: 0x8ca77c, map: needles, alphaTest: 0.48, side: THREE.DoubleSide,
    vertexColors: true, emissiveMap: needles, emissive: 0x627e72, emissiveIntensity: 0.23,
  });
  const layout = [32.0, 36.8, 41.2, 46.6, 51.7, 56.5, 60.1];
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, layout.length * 2);
  trunks.name = 'museum-pine-trunks';
  const crowns = new THREE.InstancedMesh(pineCrown(random), crownMaterial, trunks.count);
  crowns.name = 'museum-pine-crowns';
  group.add(trunks, crowns);
  const tint = new THREE.Color();
  let tree = 0;
  for (const side of [-1, 1]) {
    layout.forEach((z, j) => {
      const size = 0.84 + random() * 0.43, width = 0.88 + random() * 0.28;
      const x = centerX + side * (21.5 + (j % 2) * 1.9 + random() * 0.7);
      pose.position.set(x, ground, z + (random() - 0.5) * 1.55);
      pose.rotation.set((random() - 0.5) * 0.048, random() * Math.PI * 2, (random() - 0.5) * 0.060);
      pose.scale.set(size * width, size, size * width);
      pose.updateMatrix();
      trunks.setMatrixAt(tree, pose.matrix);
      crowns.setMatrixAt(tree, pose.matrix);
      crowns.setColorAt(tree++, tint.setRGB(0.79 + random() * 0.19, 0.84 + random() * 0.16, 0.74 + random() * 0.22));
    });
  }

  const lights = [];
  const lampZ = [40.0, 49.0, 58.0], lampCount = lampZ.length * 2;
  const iron = new THREE.MeshStandardMaterial({
    color: 0x343534, roughness: 0.62, metalness: 0.45, emissive: 0x161613, emissiveIntensity: 0.18,
  });
  const frames = new THREE.InstancedMesh(lampBody(), iron, lampCount);
  frames.name = 'museum-garden-lamp-posts';
  const glass = new THREE.CylinderGeometry(0.265, 0.164, 0.50, 6).translate(0, 3.39, 0);
  const panes = new THREE.InstancedMesh(glass, new THREE.MeshBasicMaterial({
    color: new THREE.Color(1.32, 0.83, 0.42), toneMapped: false,
  }), lampCount);
  group.add(frames, panes);

  const halo = new THREE.SpriteMaterial({
    map: glow, opacity: 0.28, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const matrix = new THREE.Matrix4();
  let lamp = 0;
  for (const side of [-1, 1]) {
    for (const z of lampZ) {
      const x = centerX + side * 17.9;
      matrix.makeTranslation(x, ground + 0.01, z);
      frames.setMatrixAt(lamp, matrix);
      panes.setMatrixAt(lamp++, matrix);
      const glowSprite = new THREE.Sprite(halo);
      glowSprite.scale.setScalar(1.65);
      glowSprite.position.set(x, ground + 3.39, z);
      const light = new THREE.PointLight(0xffcf91, 0, 11, 2);
      light.name = 'museum-garden-lamp-light';
      light.position.copy(glowSprite.position);
      group.add(glowSprite, light);
      lights.push(light);
      colliders.push({ minX: x - 0.27, maxX: x + 0.27, minZ: z - 0.27, maxZ: z + 0.27 });
    }
  }
  return {
    update(outside) {
      lights.forEach(light => { light.intensity = 68 * outside; });
    },
  };
}
