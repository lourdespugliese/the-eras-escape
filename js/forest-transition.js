import * as THREE from 'three';
import { museumMaterial } from './museum-materials.js';
import { physicalUV } from './surface-library.js';

const DEPTH = 4, WIDTH = 3, HEIGHT = 4, WALL = 0.2;
const WALL_TOP = 3;

function addVines(group, exitZ) {
  const stem = new THREE.MeshBasicMaterial({ color: 0x53472c });
  const leaf = new THREE.Shape();
  leaf.moveTo(0, -0.5);
  leaf.quadraticCurveTo(-0.48, 0.04, 0, 0.6);
  leaf.quadraticCurveTo(0.48, 0.04, 0, -0.5);
  const strands = [
    { normal: [1, 0, 0], points: [[-1.46, 0.5, 1.4], [-1.44, 1.4, 1.8], [-1.46, 2.3, 1.45], [-1.42, 3.2, 2.25]] },
    { normal: [-1, 0, 0], points: [[1.46, 0.7, 2.95], [1.44, 1.6, 2.65], [1.45, 2.3, 3.2], [1.42, 3.3, 3.45]] },
    { normal: [0, 0, 1], points: [[-1.37, 1.5, 0.35], [-1.29, 2.35, 0.37], [-1.31, 3.33, 0.34], [-0.67, 3.82, 0.46], [-0.12, 3.9, 0.54]] },
    { normal: [0, 0, 1], points: [[1.39, 0.95, 0.38], [1.29, 1.8, 0.35], [1.37, 2.65, 0.38], [1.12, 3.53, 0.42], [0.62, 3.85, 0.64]] },
  ];
  const leavesPerStrand = 13;
  const foliage = new THREE.InstancedMesh(new THREE.ShapeGeometry(leaf, 4),
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), strands.length * leavesPerStrand);
  const pose = new THREE.Object3D(), forward = new THREE.Vector3(0, 0, 1);
  const palette = [0x576b38, 0x394e2d, 0x657940].map(color => new THREE.Color(color));
  for (const [strandIndex, { points, normal }] of strands.entries()) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y, offset]) => new THREE.Vector3(x, y, exitZ + offset)));
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.015, 4, false), stem));
    const outward = new THREE.Vector3(...normal);
    for (let i = 0; i < leavesPerStrand; i++) {
      const index = strandIndex * leavesPerStrand + i;
      pose.position.copy(curve.getPointAt((i + 0.5) / leavesPerStrand)).addScaledVector(outward, 0.025);
      pose.quaternion.setFromUnitVectors(forward, outward);
      pose.rotateZ(i % 2 === 0 ? 0.85 : -0.9);
      pose.translateY(0.08);
      const size = 0.22 + 0.045 * (index % 4);
      pose.scale.set(size, size, 1);
      pose.updateMatrix();
      foliage.setMatrixAt(index, pose.matrix);
      foliage.setColorAt(index, palette[index % palette.length]);
    }
  }
  group.add(foliage);
}

export function buildForestTransition(ctx, entryZ) {
  const exitZ = entryZ - DEPTH;
  const centerZ = (entryZ + exitZ) / 2;
  const bounds = { minX: -WIDTH / 2, maxX: WIDTH / 2, minZ: exitZ, maxZ: entryZ };
  const group = new THREE.Group();
  group.name = 'forest-transition';
  ctx.scene.add(group);

  const wall = new THREE.MeshBasicMaterial({ color: 0xa496a0, map: museumMaterial('plaster').map });
  const earth = new THREE.TextureLoader().load('assets/textures/world/forest-earth.webp');
  earth.colorSpace = THREE.SRGBColorSpace;
  earth.wrapS = earth.wrapT = THREE.RepeatWrapping;
  earth.anisotropy = 4;
  const floor = new THREE.MeshBasicMaterial({ color: 0xd9c4ab, map: earth });
  const door = new THREE.MeshBasicMaterial({ color: 0xe2c7b0, map: museumMaterial('wood').map });
  const trim = new THREE.MeshBasicMaterial({ color: 0xc39568 });
  const indicator = new THREE.MeshBasicMaterial({ color: 0xe0a959 });
  function box(w, h, d, x, y, z, material, parent = group) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    if (material.map) physicalUV(mesh, 1.5, material === door ? HEIGHT : 1.5);
    parent.add(mesh);
  }
  box(WIDTH + 2 * WALL, WALL, DEPTH, 0, -WALL / 2, centerZ, floor);
  const radius = WIDTH / 2;
  const vault = new THREE.CylinderGeometry(radius, radius, DEPTH, 20, 1, true, -Math.PI / 2, Math.PI);
  vault.rotateX(-Math.PI / 2);
  vault.scale(1, (HEIGHT - WALL_TOP) / radius, 1);
  const vaultUV = vault.attributes.uv;
  for (let i = 0; i < vaultUV.count; i++) vaultUV.setXY(i, vaultUV.getX(i) * 3, vaultUV.getY(i) * 3);
  const vaultMaterial = wall.clone(); vaultMaterial.side = THREE.BackSide;
  const ceiling = new THREE.Mesh(vault, vaultMaterial);
  ceiling.position.set(0, WALL_TOP, centerZ);
  group.add(ceiling);
  for (const side of [-1, 1]) {
    const x = side * (WIDTH / 2 + WALL / 2);
    box(WALL, WALL_TOP, DEPTH, x, WALL_TOP / 2, centerZ, wall);
    box(0.05, 0.1, DEPTH, side * 1.48, 2.8, centerZ, trim);
    ctx.colliders.push({ minX: x - WALL / 2, maxX: x + WALL / 2, minZ: exitZ, maxZ: entryZ });
  }
  addVines(group, exitZ);
  box(0.8, 0.14, 0.06, 0, 3.5, exitZ + 0.18, indicator);

  function gate(name, z, raised) {
    const node = new THREE.Group(); node.name = name;
    node.position.set(0, raised ? HEIGHT : 0, z);
    node.visible = !raised;
    box(WIDTH, HEIGHT, 0.24, 0, HEIGHT / 2, 0, door, node);
    for (const x of [-1.15, 0, 1.15]) box(0.035, 3.6, 0.26, x, HEIGHT / 2, 0, trim, node);
    group.add(node);
    const collider = { minX: bounds.minX, maxX: bounds.maxX, minZ: z - 0.12, maxZ: z + 0.12 };
    if (!raised) ctx.colliders.push(collider);
    return { node, collider };
  }
  const rear = gate('forest-transition-rear', entryZ - 0.2, true);
  const front = gate('forest-transition-front', exitZ, false);
  const status = document.createElement('div');
  status.id = 'forest-transition-status';
  status.setAttribute('role', 'status');
  status.hidden = true;
  document.body.appendChild(status);

  let phase = 'waiting';
  return {
    bounds, entryZ, exitZ, centerZ,
    get phase() { return phase; },
    get busy() { return phase !== 'waiting' && phase !== 'open'; },
    message(text) { status.textContent = text; status.hidden = false; },
    open() { phase = 'opening'; indicator.color.setHex(0x9dcc90); ctx.audio.creak(); },
    fail(text) { phase = 'failed'; indicator.color.setHex(0xc86565); this.message(text); },
    update(dt, canEnter, onSealed) {
      const { x, z } = ctx.camera.position;
      if (phase === 'waiting' && canEnter && Math.abs(x) < WIDTH / 2 && z <= centerZ && z > exitZ) {
        phase = 'closing'; rear.node.visible = true;
        ctx.colliders.push(rear.collider);
        ctx.audio.creak();
      }
      if (phase === 'closing') {
        rear.node.position.y = Math.max(0, rear.node.position.y - dt * 7);
        if (rear.node.position.y === 0) { phase = 'loading'; onSealed(); }
      }
      if (phase === 'opening') {
        front.node.position.y = Math.min(HEIGHT, front.node.position.y + dt * 7);
        if (front.node.position.y === HEIGHT) {
          phase = 'open'; front.node.visible = false; status.hidden = true;
          const index = ctx.colliders.indexOf(front.collider);
          if (index >= 0) ctx.colliders.splice(index, 1);
        }
      }
    },
  };
}
