// rooms.js — Funciones reutilizables (paredes, habitaciones, puertas, texturas, mariposas...)
// y la construcción del escenario de la Habitación 1 (Fearless).
import * as THREE from 'three';

export const WALL_H = 4, DOOR_H = 3.2, WALL_T = 0.4;
const TAU = Math.PI * 2;

// ================= Texturas generadas con <canvas> =================
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeTextTexture(text, { w = 256, h = 256, bg = null, color = '#3a2200', font = 'bold 170px Georgia' } = {}) {
  return canvasTex(w, h, (g) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    g.fillStyle = color; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2);
  });
}

// Símbolos dibujados con formas (no dependen de las fuentes emoji del sistema).
export function makeSymbolTexture(symbol, { bg = '#3a2200', fg = '#ffd36a' } = {}) {
  return canvasTex(256, 256, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, 256, 256);
    g.translate(128, 128); g.fillStyle = fg; g.strokeStyle = fg; g.lineWidth = 14; g.lineCap = 'round';
    if (symbol === 'sun') {
      g.beginPath(); g.arc(0, 0, 38, 0, TAU); g.fill();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU; g.beginPath();
        g.moveTo(Math.cos(a) * 60, Math.sin(a) * 60); g.lineTo(Math.cos(a) * 92, Math.sin(a) * 92); g.stroke();
      }
    } else if (symbol === 'moon') {
      g.beginPath(); g.arc(0, 0, 72, 0, TAU); g.fill();
      g.fillStyle = bg; g.beginPath(); g.arc(34, -14, 60, 0, TAU); g.fill();
    } else if (symbol === 'star') {
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 34 : 82, a = -Math.PI / 2 + (i * Math.PI) / 5;
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.closePath(); g.fill();
    } else if (symbol === 'heart') {
      g.beginPath(); g.moveTo(0, 66);
      g.bezierCurveTo(-96, -4, -62, -80, 0, -32);
      g.bezierCurveTo(62, -80, 96, -4, 0, 66); g.fill();
    }
  });
}

export function makeWoodTexture({ base = '#d9b887', dark = '#b8935f', vertical = true, planks = 8, size = 512 } = {}) {
  const t = canvasTex(size, size, (g) => {
    const pw = size / planks;
    for (let i = 0; i < planks; i++) {
      const [x, y, w, h] = vertical ? [i * pw, 0, pw, size] : [0, i * pw, size, pw];
      g.fillStyle = base; g.fillRect(x, y, w, h);
      g.globalAlpha = 0.12 + Math.random() * 0.15; g.fillStyle = dark; g.fillRect(x, y, w, h);
      g.globalAlpha = 0.25; g.strokeStyle = dark; g.lineWidth = 1;                 // vetas
      for (let k = 0; k < 10; k++) {
        const o = Math.random() * pw, j = (Math.random() - 0.5) * 6; g.beginPath();
        if (vertical) { g.moveTo(x + o, 0); g.lineTo(x + o + j, size); } else { g.moveTo(0, y + o); g.lineTo(size, y + o + j); }
        g.stroke();
      }
      g.globalAlpha = 1; g.fillStyle = dark;                                       // juntas
      if (vertical) g.fillRect(x, 0, 2, size); else g.fillRect(0, y, size, 2);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function makeSkyTexture() {
  return canvasTex(256, 200, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#7a5a9a'); grad.addColorStop(0.55, '#ff9a4a'); grad.addColorStop(1, '#ffd38a');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff2c0'; g.beginPath(); g.arc(70, 135, 24, 0, TAU); g.fill();
  });
}

function makePhotoTexture(tone) {
  return canvasTex(128, 160, (g) => {
    const grad = g.createLinearGradient(0, 0, 128, 160);
    grad.addColorStop(0, tone); grad.addColorStop(1, '#5a4228');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 160);
    g.fillStyle = 'rgba(40,25,10,.55)';
    g.beginPath(); g.arc(64, 70, 24, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(64, 150, 46, 44, 0, Math.PI, TAU); g.fill();
  });
}

// ================= Utilidades de construcción =================
export function addCollider(ctx, x, z, half) {
  ctx.colliders.push({ minX: x - half, maxX: x + half, minZ: z - half, maxZ: z + half });
}

export function addWall(ctx, group, x, z, w, d, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, WALL_H, d), material);
  mesh.position.set(x, WALL_H / 2, z);
  group.add(mesh);
  ctx.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
}

// Habitación rectangular. La pared norte (-Z) tiene el hueco de la puerta (en x = doorX, por defecto
// el centro) y, opcionalmente, huecos extra (extraGaps), por si se quieren añadir más aberturas.
export function createRoom(ctx, { name, x = 0, z = 0, w = 10, d = 10, wallMat, floorMat, ceilColor = 0x3a2a14, doorWidth = 3, doorX = x, southOpening = 0, extraGaps = [] }) {
  const group = new THREE.Group(); ctx.scene.add(group);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(x, 0, z);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: ceilColor }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(x, WALL_H, z);
  group.add(floor, ceil);

  const t = WALL_T;
  if (southOpening) {   // entrada abierta en la pared sur (conecta con el pasillo de la sala anterior)
    const s = (w - southOpening) / 2;
    addWall(ctx, group, x - southOpening / 2 - s / 2, z + d / 2, s, t, wallMat);
    addWall(ctx, group, x + southOpening / 2 + s / 2, z + d / 2, s, t, wallMat);
    const sl = new THREE.Mesh(new THREE.BoxGeometry(southOpening, WALL_H - DOOR_H, t), wallMat);
    sl.position.set(x, DOOR_H + (WALL_H - DOOR_H) / 2, z + d / 2);
    group.add(sl);
  } else addWall(ctx, group, x, z + d / 2, w, t, wallMat);
  addWall(ctx, group, x - w / 2, z, t, d, wallMat);
  addWall(ctx, group, x + w / 2, z, t, d, wallMat);

  // Pared norte: se construye por tramos entre los huecos.
  const gaps = [{ x: doorX, w: doorWidth, lintel: true }, ...extraGaps].sort((a, b) => a.x - b.x);
  const northSegments = [];
  const segment = (a, b) => {
    if (b - a < 0.01) return;
    addWall(ctx, group, (a + b) / 2, z - d / 2, b - a, t, wallMat);
    northSegments.push([a, b]);
  };
  let cursor = x - w / 2;
  gaps.forEach((gp) => {
    segment(cursor, gp.x - gp.w / 2);
    cursor = gp.x + gp.w / 2;
    if (gp.lintel) {                                   // dintel sobre la puerta (sin colisión)
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(gp.w, WALL_H - DOOR_H, t), wallMat);
      lintel.position.set(gp.x, DOOR_H + (WALL_H - DOOR_H) / 2, z - d / 2);
      group.add(lintel);
    }
  });
  segment(cursor, x + w / 2);

  const bounds = { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 };
  ctx.rooms.push({ name, bounds });
  return { group, bounds, x, z, w, d, doorWidth, doorX, northSegments };
}

// Puerta bloqueada. door.unlock() la abre lentamente (con sonido) y llama a onOpen().
export function createDoor(ctx, { x, z, width = 3, onOpen = null }) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x8a5a1a, roughness: 0.5, metalness: 0.4, emissive: 0x2a1800 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, DOOR_H, 0.3), mat);
  mesh.position.set(x, DOOR_H / 2, z);
  ctx.scene.add(mesh);
  const collider = { minX: x - width / 2, maxX: x + width / 2, minZ: z - 0.2, maxZ: z + 0.2 };
  ctx.colliders.push(collider);

  const door = { mesh, locked: true, opening: false };
  door.unlock = () => {
    door.locked = false; door.opening = true;
    ctx.colliders.splice(ctx.colliders.indexOf(collider), 1);
    ctx.audio.creak();
    if (onOpen) onOpen();
    ctx.updaters.push((dt) => {
      if (!mesh.visible) return;
      mesh.position.y += dt * 1.0;                              // apertura lenta
      if (mesh.position.y > DOOR_H * 1.6) mesh.visible = false;
    });
  };
  ctx.interaction.add(mesh, {
    prompt: () => 'Objeto bloqueado.',
    enabled: () => door.locked,
    onInteract: () => ctx.ui.toast('La puerta está cerrada. Resuelve el acertijo de esta era.'),
  });
  return door;
}

// Mariposa de círculos. Si recibe "symbolTex" muestra el símbolo grabado en las alas.
export function makeButterfly(color, symbolTex = null) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color, emissive: new THREE.Color(color).multiplyScalar(0.3), side: THREE.DoubleSide, roughness: 0.5, metalness: 0.4,
  });
  const wingGeo = new THREE.CircleGeometry(0.25, 20);
  const left = new THREE.Group(), right = new THREE.Group();   // pivotes para aletear
  const lw = new THREE.Mesh(wingGeo, mat); lw.position.x = -0.25; lw.scale.y = 1.2;
  const rw = new THREE.Mesh(wingGeo, mat); rw.position.x = 0.25; rw.scale.y = 1.2;
  left.add(lw); right.add(rw);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x2a1a0a }));
  group.add(left, right, body);
  if (symbolTex) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.17, 24), new THREE.MeshBasicMaterial({ map: symbolTex }));
    disc.position.z = 0.02;
    group.add(disc);
  }
  return { group, left, right };
}

export function flap(ctx, b, { speed = 6, amp = 0.5, phase = 0 } = {}) {
  ctx.updaters.push((dt, t) => {
    const a = Math.sin(t * speed + phase) * amp;
    b.left.rotation.y = a; b.right.rotation.y = -a;
  });
}

export function makeGuitar(color = 0x9a6a30, emissive = 0x000000, metalness = 0.2) {
  const mat = new THREE.MeshStandardMaterial({ color, emissive, roughness: 0.4, metalness });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a1a0a });
  const g = new THREE.Group();
  const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 24), mat);
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 24), mat);
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.11, 16), dark);
  [lower, upper, hole].forEach((m) => (m.rotation.x = Math.PI / 2));
  upper.position.y = 0.38;
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.8, 0.04), dark); neck.position.y = 0.95;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.04), dark); head.position.y = 1.45;
  g.add(lower, upper, hole, neck, head);
  return g;
}

function makeGear(r, goldMat) {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.08, 20), goldMat);
  disc.rotation.x = Math.PI / 2; g.add(disc);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(r * 0.3, r * 0.3, 0.08), goldMat);
    tooth.position.set(Math.cos(a) * r, Math.sin(a) * r, 0); tooth.rotation.z = a; g.add(tooth);
  }
  return g;
}

// ================= Habitación 1: Fearless =================
export function buildFearlessRoom(ctx) {
  const wallMat = new THREE.MeshStandardMaterial({ map: makeWoodTexture({ base: '#e2c48f', dark: '#c9a56d' }), roughness: 0.85 });
  const floorTex = makeWoodTexture({ base: '#80603a', dark: '#5e4325', vertical: false });
  floorTex.repeat.set(4, 4);
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.8 });
  const room = createRoom(ctx, { name: 'Habitación 1 — Fearless', x: 2, w: 14, d: 10, doorX: 0, southOpening: 3, wallMat, floorMat, ceilColor: 0x6b4a2a });
  const g = room.group;

  const gold = new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.8, roughness: 0.3, emissive: 0x442e00 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.8 });
  const box = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); g.add(m); return m;
  };

  // --- Detalles dorados (moldura a lo largo de las paredes) ---
  box(13.6, 0.08, 0.04, gold, 2, 1.0, 4.77);
  box(0.04, 0.08, 9.6, gold, -4.77, 1.0, 0);
  box(0.04, 0.08, 9.6, gold, 8.77, 1.0, 0);
  room.northSegments.forEach(([a, b]) => box(b - a, 0.08, 0.04, gold, (a + b) / 2, 1.0, -4.77));

  // --- Iluminación: ambiental cálida + sol del atardecer + 2 lámparas ---
  const ambient = new THREE.AmbientLight(0xffe0b0, 0.8);
  const sun = new THREE.DirectionalLight(0xffa850, 1.6); sun.position.set(-10, 3.5, -1);
  const lamp1 = new THREE.PointLight(0xffd070, 18, 14); lamp1.position.set(-0.5, 3.4, 2.5);
  const lamp2 = new THREE.PointLight(0xffd070, 18, 14); lamp2.position.set(5.5, 3.4, -1.5);
  g.add(ambient, sun, lamp1, lamp2);
  const lights = {   // el acertijo los usa para "iluminar la habitación" al resolverse
    k: 1, mute: 1,   // mute (0..1): lo usa la sala 2 para apagar estas luces cuando el jugador ya no está aquí
    set(k) { this.k = k; this.apply(); },
    apply() { const m = this.k * this.mute; ambient.intensity = 0.8 * m; sun.intensity = 1.6 * m; lamp1.intensity = lamp2.intensity = 18 * m; },
  };

  // --- Guirnaldas de luces en el techo (InstancedMesh = 1 sola draw call) ---
  const STRANDS = [-3, 0, 3], PER = 17;
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe08a }), STRANDS.length * PER);
  const m4 = new THREE.Matrix4(); let n = 0;
  STRANDS.forEach((z) => {
    const pts = [];
    for (let i = 0; i < PER; i++) {
      const u = i / (PER - 1), x = -4.7 + 13.4 * u, y = 3.95 - 2 * u * (1 - u);
      m4.setPosition(x, y, z); bulbs.setMatrixAt(n++, m4); pts.push(new THREE.Vector3(x, y, z));
    }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x3a2a14 })));
  });
  g.add(bulbs);

  // --- Ventana con paisaje (árboles que se mueven con el viento) ---
  const win = new THREE.Group(); win.position.set(-4.79, 2.1, -1.2); win.rotation.y = Math.PI / 2; g.add(win);
  win.add(new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.4), new THREE.MeshBasicMaterial({ map: makeSkyTexture() })));
  const hill = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.4), new THREE.MeshBasicMaterial({ color: 0x2f4a24 }));
  hill.position.set(0, -0.5, 0.005); win.add(hill);
  const trees = [];
  [-0.55, 0.05, 0.6].forEach((x, i) => {
    const tr = new THREE.Group(); tr.position.set(x, -0.45, 0.02); tr.scale.setScalar(0.8 + i * 0.15);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.4, 6), new THREE.MeshBasicMaterial({ color: 0x3a2412 })); trunk.position.y = 0.2;
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 8), new THREE.MeshBasicMaterial({ color: 0x3d5a2a })); leaves.position.y = 0.6;
    tr.add(trunk, leaves); win.add(tr); trees.push(tr);
  });
  ctx.updaters.push((dt, t) => trees.forEach((tr, i) => (tr.rotation.z = Math.sin(t * 1.5 + i) * 0.06)));
  [[0, 0.75, 2.0, 0.1], [0, -0.75, 2.0, 0.1], [-0.95, 0, 0.1, 1.5], [0.95, 0, 0.1, 1.5], [0, 0, 0.05, 1.4]].forEach(([x, y, w, h]) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), gold); f.position.set(x, y, 0.04); win.add(f);
  });

  // --- Pasillo hacia la siguiente habitación (con cartel iluminado y luz blanca) ---
  const doorZ = room.z - room.d / 2, len = 4;
  const hallMat = new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 1 });
  addWall(ctx, g, room.doorX - 1.6, doorZ - len / 2, 0.2, len, hallMat);
  addWall(ctx, g, room.doorX + 1.6, doorZ - len / 2, 0.2, len, hallMat);
  // (sin pared al fondo: el pasillo desemboca en la Habitación 2)
  const hallFloor = new THREE.Mesh(new THREE.PlaneGeometry(3, len), new THREE.MeshStandardMaterial({ color: 0x3a2a18 }));
  hallFloor.rotation.x = -Math.PI / 2; hallFloor.position.set(room.doorX, 0.005, doorZ - len / 2);
  const hallCeil = hallFloor.clone(); hallCeil.rotation.x = Math.PI / 2; hallCeil.position.y = WALL_H;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.9), new THREE.MeshBasicMaterial({
    map: makeTextTexture('Cada recuerdo abre una nueva era...', { w: 640, h: 200, color: '#fff0c4', font: '38px Georgia' }), transparent: true,
  }));
  sign.position.set(room.doorX - 1.49, 2, doorZ - len / 2); sign.rotation.y = Math.PI / 2;   // sobre la pared izquierda del pasillo
  const hallLight = new THREE.PointLight(0xffffff, 0, 9); hallLight.position.set(room.doorX, 3, doorZ - 2);
  g.add(hallFloor, hallCeil, sign, hallLight);

  // --- Engranajes sobre la puerta (giran mientras se abre) ---
  const gearL = makeGear(0.5, gold), gearR = makeGear(0.5, gold);
  gearL.position.set(-2.6, 2.7, doorZ + 0.3); gearR.position.set(2.6, 2.7, doorZ + 0.3);
  g.add(gearL, gearR);

  let hallBase = 0;
  const door = createDoor(ctx, { x: room.doorX, z: doorZ, width: room.doorWidth });
  ctx.updaters.push((dt) => {
    if (!door.opening) return;
    if (door.mesh.visible) { gearL.rotation.z += dt * 1.2; gearR.rotation.z -= dt * 1.2; }
    hallBase = Math.min(14, hallBase + dt * 5); hallLight.intensity = hallBase * lights.mute;   // luz blanca del pasillo
  });

  // ================= Decoración =================
  const candleMat = new THREE.MeshStandardMaterial({ color: 0xfff2d0 });
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffd060 });
  const candleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.14, 8), flameGeo = new THREE.SphereGeometry(0.03, 8, 6);
  const candle = (x, y, z) => {
    const c = new THREE.Mesh(candleGeo, candleMat); c.position.set(x, y + 0.07, z);
    const f = new THREE.Mesh(flameGeo, flameMat); f.position.set(x, y + 0.17, z); g.add(c, f);
  };
  for (let i = 0; i < 4; i++) candle(room.x + Math.cos(i * Math.PI / 2 + 0.78) * 1.0, 0, Math.sin(i * Math.PI / 2 + 0.78) * 1.0); // ronda del pedestal central

  // Baúl cerrado + velas
  const chestX = 2.6, chestZ = -4.2;
  box(1.0, 0.45, 0.6, new THREE.MeshStandardMaterial({ color: 0x5a3a1c, roughness: 0.8 }), chestX, 0.225, chestZ);
  box(1.02, 0.15, 0.62, wood, chestX, 0.525, chestZ);
  box(0.1, 0.62, 0.64, gold, chestX, 0.31, chestZ);
  addCollider(ctx, chestX, chestZ, 0.55);
  candle(chestX - 0.3, 0.6, chestZ); candle(chestX + 0.3, 0.6, chestZ);

  // Silla con guitarra decorativa (interactiva: acorde)
  const chair = new THREE.Group(); chair.position.set(-3.9, 0, 2.8); chair.rotation.y = Math.PI / 2; g.add(chair);
  const part = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood); m.position.set(x, y, z); chair.add(m); };
  part(0.55, 0.06, 0.55, 0, 0.45, 0); part(0.55, 0.5, 0.05, 0, 0.73, -0.25);
  [[-0.23, -0.23], [0.23, -0.23], [-0.23, 0.23], [0.23, 0.23]].forEach(([x, z]) => part(0.05, 0.45, 0.05, x, 0.225, z));
  addCollider(ctx, -3.9, 2.8, 0.35);
  const guitar = makeGuitar(); guitar.scale.setScalar(0.75);
  guitar.position.set(-4.05, 0.7, 2.8); guitar.rotation.set(0, Math.PI / 2, 0.12); g.add(guitar);
  ctx.interaction.add(guitar, { prompt: () => 'Presiona E para interactuar.', onInteract: () => ctx.audio.chord() });

  // Atril con libro de pistas
  const lecX = 2.0, lecZ = 2.8;   // en el medio de la sala: a un lado las historias, al otro la melodía
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.0, 10), wood); column.position.set(lecX, 0.5, lecZ); g.add(column);
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.5), wood); board.position.set(lecX, 1.05, lecZ); board.rotation.x = 0.5; g.add(board);
  addCollider(ctx, lecX, lecZ, 0.3);
  const book = new THREE.Group(); book.position.set(0, 0.05, 0); board.add(book);
  const pageMat = new THREE.MeshStandardMaterial({ color: 0xf5ead0 });
  const pageL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.025, 0.4), pageMat); pageL.position.x = -0.15; pageL.rotation.z = 0.08;
  const pageR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.025, 0.4), pageMat); pageR.position.x = 0.15; pageR.rotation.z = -0.08;
  const cover = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.02, 0.44), new THREE.MeshStandardMaterial({ color: 0x7a2a2a })); cover.position.y = -0.015;
  book.add(pageL, pageR, cover);
  ctx.interaction.add(book, {
    prompt: () => 'Presiona E para leer.',
    onInteract: () => ctx.ui.toast('"Las mariposas siempre conocen el camino. Observa el orden en que descansan y la música volverá a sonar."', 8000),
  });

  // Fotografías antiguas (opcionales, con frases)
  const quotes = [
    'Crecer es descubrir quién eres cuando nadie te dice cómo ser.',
    'Cada cambio guarda un recuerdo que vale la pena conservar.',
    'Los mejores comienzos suelen parecer un salto al vacío.',
  ];
  const loader = new THREE.TextureLoader();
  const photoFiles = ['assets/images/foto1.jpg', 'assets/images/foto2.jpg', 'assets/images/foto3.jpg'];
  [-3.6, -1.2, 6.0].forEach((x, i) => {
    const ph = new THREE.Group(); ph.position.set(x, 2.5, 4.77); ph.rotation.y = Math.PI; g.add(ph);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.06), gold);
    // Las imágenes ya están recortadas a 704x896 (proporción 0.66:0.84 del marco), así que no se deforman.
    const tex = loader.load(photoFiles[i]);
    tex.colorSpace = THREE.SRGBColorSpace;                    // colores correctos
    tex.anisotropy = 4;                                       // más nitidez al verla de costado
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.3), new THREE.MeshBasicMaterial({ map: tex }));
    pic.position.z = 0.04; ph.add(frame, pic);
    ctx.interaction.add(ph, { prompt: () => 'Presiona E para mirar.', onInteract: () => ctx.ui.toast(quotes[i], 5000) });
  });

  // Plantas con flores amarillas en las esquinas (interactivas: salen mariposas)
  const potMat = new THREE.MeshStandardMaterial({ color: 0x8a4b2a, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x4f8a3a });
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffd23a, emissive: 0x5a4000 });
  let now = 0;
  ctx.updaters.push((dt, t) => (now = t));
  function addPlant(x, z) {
    const p = new THREE.Group(); p.position.set(x, 0, z); g.add(p);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.35, 12), potMat); pot.position.y = 0.175; p.add(pot);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.7, 6), leafMat);
      leaf.position.set(Math.cos(a) * 0.12, 0.7, Math.sin(a) * 0.12); leaf.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4);
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), flowerMat);
      fl.position.set(Math.cos(a) * 0.3, 1.0 + (i % 2) * 0.15, Math.sin(a) * 0.3);
      p.add(leaf, fl);
    }
    addCollider(ctx, x, z, 0.28);

    // 3 mariposas pequeñas, ocultas hasta que el jugador interactúa
    const swarm = [0, 1, 2].map((i) => {
      const b = makeButterfly(0xffd36a);
      const outer = new THREE.Group(); b.group.scale.setScalar(0.35); b.group.rotation.x = -Math.PI / 2;
      outer.add(b.group); outer.visible = false; g.add(outer);
      flap(ctx, b, { speed: 14, amp: 0.8, phase: i });
      return outer;
    });
    let until = 0;
    ctx.updaters.push((dt, t) => {
      if (!until) return;
      if (t > until) { until = 0; swarm.forEach((s) => (s.visible = false)); return; }
      swarm.forEach((s, i) => {
        const a = t * 1.5 + i * 2.1, r = 0.5 + i * 0.15;
        s.position.set(x + Math.cos(a) * r, 1.3 + Math.sin(t * 2 + i) * 0.2, z + Math.sin(a) * r);
        s.rotation.y = -a;
      });
    });
    ctx.interaction.add(p, {
      prompt: () => 'Presiona E para interactuar.',
      onInteract: () => { until = now + 4; swarm.forEach((s) => (s.visible = true)); ctx.audio.chime(); },
    });
  }
  [[-4.2, -4.2], [8.2, -4.2], [-4.2, 4.2], [8.2, 4.2]].forEach(([x, z]) => addPlant(x, z));

  return { ...room, door, lights };
}