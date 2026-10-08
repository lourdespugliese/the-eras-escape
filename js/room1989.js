// room1989.js — Habitación 2: 1989. Ciudad nocturna de neón + rompecabezas de 4 piezas.
//
// Acertijo: hay 4 piezas del cuadro. Una está a la vista (caja junto a la farola), otra DETRÁS del taxi,
// otra DENTRO del taxi (hay que abrir la puerta) y la última en un ARMARIO con candado (código 1989).
// Pistas: 4 carteles de neón + un boceto borroso del cuadro final colgado en la pared.
// Con las piezas en la mano se colocan en los 4 huecos de la mesa central (E sobre un hueco = cambiar pieza).
// Al completarlo, la cámara de la mesa del lado derecho dispara y la Polaroid sale de ella; recogerla abre la puerta.
import * as THREE from 'three';
import { createRoom, createDoor, addWall, canvasTex, makeTextTexture, DOOR_H } from './rooms.js';
import { createGlitter } from './glitter.js';

const TAU = Math.PI * 2;
const CZ = -14;                                          // centro de la sala en Z (la sala 1 está en z = 0)
const PINK = 0xff2d95, BLUE = 0x2de2ff;
// Canción del toca discos secreto (el quiosco). Copia tu archivo de audio en esa ruta (relativa a index.html).
// Si el archivo no existe, el disco toca un tema synthwave original generado por el propio juego (audio.js).
const RECORD = { url: 'assets/audio/song.mp3', title: 'Welcome to New York', fallbackTitle: 'Neon Skyline (pista original)' };
const clamp = THREE.MathUtils.clamp;
// Color "más brillante que blanco": con el Bloom activo hace que el material brille como un neón.
export const neon = (hex, k = 2.5) => new THREE.Color(hex).multiplyScalar(k);

// ================= Texturas (canvas) =================
// Se dibuja un skyline aleatorio (dos capas de edificios, la delantera con ventanas encendidas).
function drawSkyline(g, w, h, horizon) {
  const lit = ['#ffd36a', '#ff6bb5', '#6be3ff'];
  [['#3a1f7a', 0], ['#0f0a2a', 1]].forEach(([col, layer]) => {
    for (let x = -layer * 30; x < w;) {
      const bw = 45 + Math.random() * 45, top = horizon - (layer ? 70 : 50) - Math.random() * (layer ? 130 : 160);
      g.fillStyle = col; g.fillRect(x, top, bw, h - top);
      if (layer) for (let wx = x + 7; wx < x + bw - 10; wx += 14) for (let wy = top + 10; wy < horizon - 12; wy += 18) {
        if (Math.random() < 0.4) { g.fillStyle = lit[Math.floor(Math.random() * 3)]; g.fillRect(wx, wy, 7, 10); }
      }
      x += bw + 3;
    }
  });
}

// La imagen completa del rompecabezas (512x512). Arriba-izq: gaviotas · arriba-der: luna ·
// abajo-izq: rascacielos con antena · abajo-der: taxi en la calle. Es también la foto de la Polaroid.
function drawPhoto(g, w, h) {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#1b1464'); sky.addColorStop(0.55, '#b8309a'); sky.addColorStop(0.85, '#ff9a7a');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff'; for (let i = 0; i < 50; i++) g.fillRect(Math.random() * w, Math.random() * h * 0.45, 2, 2);
  g.fillStyle = 'rgba(255,244,214,.2)'; g.beginPath(); g.arc(380, 120, 92, 0, TAU); g.fill();       // luna
  g.fillStyle = '#fff4d6'; g.beginPath(); g.arc(380, 120, 56, 0, TAU); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 6; g.lineCap = 'round';                                     // gaviotas
  [[100, 90, 1], [170, 150, 0.7], [55, 175, 0.55]].forEach(([x, y, s]) => {
    g.beginPath(); g.moveTo(x - 32 * s, y); g.quadraticCurveTo(x - 16 * s, y - 26 * s, x, y);
    g.quadraticCurveTo(x + 16 * s, y - 26 * s, x + 32 * s, y); g.stroke();
  });
  drawSkyline(g, w, h, 440);
  g.fillStyle = '#0f0a2a'; g.fillRect(40, 260, 40, 180);                                            // rascacielos con antena
  g.beginPath(); g.moveTo(40, 262); g.lineTo(60, 150); g.lineTo(80, 262); g.fill();
  g.fillStyle = '#14102c'; g.fillRect(0, 440, w, h - 440);                                          // calle
  g.fillStyle = '#ff2d95'; g.fillRect(0, 440, w, 5);
  g.fillStyle = '#eee'; for (let x = 10; x < w; x += 70) g.fillRect(x, 488, 38, 5);
  g.fillStyle = '#ffc400'; g.fillRect(330, 452, 120, 30); g.fillRect(350, 430, 70, 26);             // taxi
  g.fillStyle = '#223355'; g.fillRect(358, 436, 24, 16); g.fillRect(388, 436, 24, 16);
  g.fillStyle = '#000';
  g.beginPath(); g.arc(355, 484, 12, 0, TAU); g.fill();
  g.beginPath(); g.arc(425, 484, 12, 0, TAU); g.fill();
}

// Recorta un cuarto de la imagen y le dibuja un borde de pieza.
function makeSlice(src, col, row) {
  return canvasTex(256, 256, (g) => {
    g.drawImage(src, col * 256, row * 256, 256, 256, 0, 0, 256, 256);
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 8; g.strokeRect(4, 4, 248, 248);
  });
}

function makePanorama() {
  return canvasTex(512, 400, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#120d4a'); sky.addColorStop(0.6, '#a82c92'); sky.addColorStop(1, '#ff8f7a');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; for (let i = 0; i < 40; i++) g.fillRect(Math.random() * w, Math.random() * h * 0.5, 2, 2);
    g.fillStyle = '#fff4d6'; g.beginPath(); g.arc(400, 90, 34, 0, TAU); g.fill();
    drawSkyline(g, w, h, h - 10);
  });
}

function makeWindowTexture(cols, rows) {                    // fachada de edificio con ventanas
  return canvasTex(cols * 16, rows * 16, (g, w, h) => {
    const lit = ['#ffd36a', '#ff6bb5', '#6be3ff'];
    g.fillStyle = '#0b0b22'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) {
      g.fillStyle = Math.random() < 0.45 ? lit[Math.floor(Math.random() * 3)] : '#14143a';
      g.fillRect(x * 16 + 4, y * 16 + 3, 8, 10);
    }
  });
}

function makeWallTexture() {
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#4a4a82'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) {
      g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.07})`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    g.fillStyle = 'rgba(0,0,0,.35)';
    for (let x = 0; x < w; x += 128) g.fillRect(x, 0, 3, h);
    g.fillRect(0, h / 2, w, 3);
  });
}

function makeFloorTexture() {
  const t = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#1a1a3a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,45,149,.45)'; g.lineWidth = 3; g.strokeRect(1, 1, w - 2, h - 2);
    g.strokeStyle = 'rgba(45,226,255,.2)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Texto "de neón": trazo de color con resplandor + relleno blanco. Fondo transparente.
export function makeNeonTexture(text, hex, w, h) {
  const color = '#' + new THREE.Color(hex).getHexString();
  return canvasTex(w, h, (g) => {
    let s = 130; do { g.font = `bold ${s}px "Trebuchet MS", Arial, sans-serif`; s -= 4; } while (g.measureText(text).width > w - 50 && s > 20);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = 26; g.lineWidth = 10; g.strokeStyle = color; g.strokeText(text, w / 2, h / 2);
    g.shadowBlur = 8; g.fillStyle = '#fff'; g.fillText(text, w / 2, h / 2);
  });
}

// ================= Utilidades =================
export function addBox(parent, w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.position.set(x, y, z); parent.add(m); return m;
}
export const addTube = (parent, w, h, d, hex, x, y, z, k = 2.5) => addBox(parent, w, h, d, new THREE.MeshBasicMaterial({ color: neon(hex, k) }), x, y, z);

// Cartel de neón: placa oscura + texto + marco luminoso. Mira hacia +Z (se rota al colgarlo).
export function makeSign(text, hex, w = 2.2, h = 0.7) {
  const group = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, h + 0.2, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x07071a, roughness: 0.9, emissive: new THREE.Color(hex).multiplyScalar(0.15) }));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
    map: makeNeonTexture(text, hex, Math.round(w * 220), Math.round(h * 220)),
    transparent: true, color: neon(0xffffff, 2.2), depthWrite: false,
  }));
  face.position.z = 0.035;
  group.add(plate, face);
  [1, -1].forEach((s) => {
    addTube(group, w + 0.2, 0.04, 0.04, hex, 0, s * (h + 0.2) / 2, 0.04);
    addTube(group, 0.04, h + 0.2, 0.04, hex, s * (w + 0.2) / 2, 0, 0.04);
  });
  return { group, face };
}

function makeSeagull() {                                   // gaviota simple, mira hacia -Z
  const s = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.8, emissive: 0x222233 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), white); body.scale.set(1, 0.8, 1.6);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), white); head.position.set(0, 0.1, -0.2);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.1, 6), new THREE.MeshBasicMaterial({ color: 0xff9a2a }));
  beak.rotation.x = -Math.PI / 2; beak.position.set(0, 0.09, -0.3);
  const gray = new THREE.MeshStandardMaterial({ color: 0xb8bcc8 });
  const wingL = addBox(s, 0.32, 0.02, 0.22, gray, -0.2, 0.07, 0.02); wingL.rotation.z = 0.3;
  const wingR = addBox(s, 0.32, 0.02, 0.22, gray, 0.2, 0.07, 0.02); wingR.rotation.z = -0.3;
  addBox(s, 0.1, 0.02, 0.18, gray, 0, 0.03, 0.25);
  s.add(body, head, beak);
  return s;
}

export function flash() {                                         // destello blanco de cámara Polaroid
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;z-index:8;background:#fff;opacity:.95;pointer-events:none;transition:opacity 1.3s ease-out';
  document.body.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => (el.style.opacity = '0')));
  setTimeout(() => el.remove(), 1500);
}

// ================= Habitación 2: 1989 =================
export function buildRoom1989(ctx, room1) {
  const cam = ctx.camera.position;
  const wallMat = new THREE.MeshStandardMaterial({ map: makeWallTexture(), roughness: 0.9 });
  const floorTex = makeFloorTexture(); floorTex.repeat.set(5, 5);
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.25, metalness: 0.5 });
  // Estructura (paredes, piso, techo) en coordenadas del mundo; entrada abierta al pasillo de la sala 1.
  const room = createRoom(ctx, { name: 'Habitación 2 — 1989', z: CZ, wallMat, floorMat, ceilColor: 0x1a1a38, southOpening: 3 });
  const abs = room.group;
  // Todo el contenido va en "g" con coordenadas LOCALES (0,0 = centro de la sala; norte = -Z).
  const g = new THREE.Group(); g.position.z = CZ; ctx.scene.add(g);
  const box = (w, h, d, m, x, y, z, p = g) => addBox(p, w, h, d, m, x, y, z);
  const tube = (w, h, d, hex, x, y, z, k) => addTube(g, w, h, d, hex, x, y, z, k);
  const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...o });
  const colBox = (x0, x1, z0, z1) => ctx.colliders.push({ minX: x0, maxX: x1, minZ: CZ + z0, maxZ: CZ + z1 });
  const wp = (x, y, z) => new THREE.Vector3(x, y, z + CZ);          // local -> mundo (para partículas)

  // --- Luces: ambiente frío + 3 luces de neón (rosa/azul) + foco sobre la mesa ---
  const ambient = new THREE.AmbientLight(0x6666bb, 0.8); g.add(ambient);
  const lp = [
    { base: 28, color: PINK, pos: [-3, 3.3, 2] }, { base: 28, color: BLUE, pos: [3, 3.3, -2.5] },
    { base: 22, color: PINK, pos: [3, 3.3, 3] },  { base: 7, color: 0xbfe6ff, pos: [0, 2.7, -1], dist: 6 },
  ].map((o) => { o.l = new THREE.PointLight(o.color, o.base, o.dist || 13); o.l.position.set(...o.pos); g.add(o.l); return o; });

  // --- Tubos de neón: techo y zócalos ---
  [[-3, PINK], [0, BLUE], [3, PINK]].forEach(([z, c]) => tube(8.6, 0.06, 0.06, c, 0, 3.93, z));
  tube(0.05, 0.05, 9.6, BLUE, 4.78, 0.08, 0); tube(0.05, 0.05, 9.6, PINK, -4.78, 0.08, 0);
  [-3.15, 3.15].forEach((x) => { tube(3.3, 0.05, 0.05, BLUE, x, 0.08, -4.78); tube(3.3, 0.05, 0.05, PINK, x, 0.08, 4.78); });

  // --- Siluetas de ciudad: edificios en relieve (pared oeste) y dos ventanales panorámicos (pared norte) ---
  [2.4, 3.5, 2.8, 3.7, 2.2].forEach((h, i) => {
    const z = -4.3 + i;
    const b = box(0.5, h, 0.96, new THREE.MeshBasicMaterial({ map: makeWindowTexture(5, Math.round(h * 4)) }), -4.55, h / 2, z);
    if (i % 2 === 0) tube(0.04, h, 0.04, i === 0 ? PINK : BLUE, -4.28, h / 2, z - 0.46);
    b.userData.building = true;
  });
  colBox(-4.8, -4.3, -4.8, 0.2);
  const pano = makePanorama();
  [-3.25, 3.25].forEach((x, i) => {
    box(2.7, 2.1, 0.05, mat(0x07071a), x, 2.2, -4.78);
    const view = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.0), new THREE.MeshBasicMaterial({ map: pano }));
    view.position.set(x, 2.2, -4.745); g.add(view);
    tube(2.7, 0.05, 0.05, i ? BLUE : PINK, x, 3.27, -4.74); tube(2.7, 0.05, 0.05, i ? BLUE : PINK, x, 1.13, -4.74);
  });

  // --- Carteles decorativos (no interactivos) ---
  const deco1989 = makeSign('1989', PINK, 1.8, 0.5); deco1989.group.position.set(0, 3.6, 4.74); deco1989.group.rotation.y = Math.PI; g.add(deco1989.group);
  const decoNY = makeSign('WELCOME TO NEW YORK', BLUE, 2.9, 0.45); decoNY.group.position.set(0, 3.6, -4.74); g.add(decoNY.group);

  // --- Atrezzo + escondites de las piezas ---
  // Taxi (oeste, mira al norte). Cabina de vidrio: se ve el interior, pero hay que abrir la puerta.
    const taxi = new THREE.Group(); taxi.position.set(-3.2, 0, 2.6); g.add(taxi);
  const yellow = mat(0xffc400, { roughness: 0.4, metalness: 0.3, emissive: 0x3a2a00 });
  const glassMat = mat(0x6688cc, { emissive: 0x0a1a33, roughness: 0.2, transparent: true, opacity: 0.3 });
  box(1.0, 0.45, 2.1, yellow, 0, 0.45, 0, taxi);                                  // carrocería
  box(0.92, 0.05, 1.1, yellow, 0, 1.1, -0.05, taxi);                              // techo
  [[-0.43, -0.57], [0.43, -0.57], [-0.43, 0.47], [0.43, 0.47]].forEach(([x, z]) => box(0.06, 0.4, 0.06, yellow, x, 0.88, z, taxi));
  box(0.9, 0.36, 1.08, glassMat, 0, 0.88, -0.05, taxi);                           // vidrios
  box(0.8, 0.12, 0.4, mat(0x1a1a33), 0, 0.735, 0.3, taxi);                        // asiento trasero
  box(0.4, 0.14, 0.18, mat(0xffffff, { emissive: 0xfff2b0 }), 0, 1.2, -0.05, taxi);
  [[-0.5, -0.7], [0.5, -0.7], [-0.5, 0.7], [0.5, 0.7]].forEach(([x, z]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 14), mat(0x111122)); w.rotation.z = Math.PI / 2; w.position.set(x, 0.22, z); taxi.add(w);
  });
  [-0.3, 0.3].forEach((x) => addTube(taxi, 0.2, 0.1, 0.04, 0xfff2b0, x, 0.5, -1.06, 3));
  // Puerta del lado de la sala: bisagra delantera, se abre hacia afuera (+X)
  const taxiDoor = new THREE.Group(); taxiDoor.position.set(0.5, 0, -0.52); taxi.add(taxiDoor);
  box(0.05, 0.38, 0.95, glassMat, 0, 0.88, 0.475, taxiDoor);
  box(0.06, 0.04, 0.95, yellow, 0, 0.69, 0.475, taxiDoor);
  addTube(taxiDoor, 0.07, 0.05, 0.18, PINK, 0.03, 0.8, 0.8);                      // manija luminosa
  let taxiOpen = false;
  ctx.interaction.add(taxiDoor, {
    prompt: () => 'Presiona E para abrir la puerta del taxi.',
    enabled: () => !taxiOpen,
    onInteract: () => { taxiOpen = true; ctx.audio.chime(); ctx.ui.toast('La puerta del taxi se abre...', 2500); },
  });
  colBox(-3.75, -2.65, 1.5, 3.7);

  // Quiosco de periódicos (este, norte)
  box(1.2, 1.0, 1.7, mat(0x2b2b55), 4.0, 0.5, -3.3);
  box(0.35, 0.06, 1.7, mat(0x5a5a90), 3.25, 1.0, -3.3);
  box(1.5, 0.08, 1.9, mat(PINK, { emissive: 0x551133 }), 3.85, 2.1, -3.3);
  [-4.1, -2.5].forEach((z) => box(0.06, 2.1, 0.06, mat(0x07071a), 3.15, 1.05, z));
  [-3.85, -3.65, -2.95, -2.75].forEach((z, i) => { const n = box(0.28, 0.03, 0.36, mat(i % 2 ? 0xfff2d0 : 0xe8e0c8), 3.25, 1.05, z); n.rotation.y = (i - 1.5) * 0.25; });
  colBox(3.0, 4.8, -4.2, -2.4);

  // Parada de autobús (este, sur)
  box(0.06, 2.0, 1.9, mat(0x1a3a66, { emissive: 0x0a3a6a, transparent: true, opacity: 0.6 }), 4.7, 1.1, 2.4);
  box(0.95, 0.07, 2.0, mat(0x07071a), 4.25, 2.25, 2.4);
  [1.5, 3.3].forEach((z) => box(0.06, 2.2, 0.06, mat(0x07071a), 3.8, 1.1, z));
  box(0.4, 0.07, 1.4, mat(0x6a6a9a), 4.3, 0.5, 2.4);
  [1.8, 3.0].forEach((z) => box(0.35, 0.5, 0.06, mat(0x07071a), 4.3, 0.25, z));
  colBox(3.7, 4.8, 1.4, 3.4);

  // Farola con gaviota + caja
  box(0.1, 3.0, 0.1, mat(0x07071a), -3, 1.5, -3.4);
  const lampHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), new THREE.MeshBasicMaterial({ color: neon(0xffd9a0, 3) })); lampHead.position.set(-3, 3.05, -3.4); g.add(lampHead);
  const gull = makeSeagull(); gull.position.set(-3, 3.3, -3.4); gull.rotation.y = 0.8; g.add(gull);
  box(0.55, 0.45, 0.55, mat(0x3a2a55), -2.55, 0.225, -3.0);
  colBox(-3.08, -2.92, -3.48, -3.32); colBox(-2.85, -2.25, -3.3, -2.7);

  // Contenedor de basura (centro-oeste, lejos de las paredes): esconde una pieza en su lado oeste
  const dumpster = new THREE.Group(); dumpster.position.set(-2.3, 0, -0.2); g.add(dumpster);
  box(0.8, 1.3, 1.6, mat(0x1f6a4a, { roughness: 0.6, metalness: 0.4, emissive: 0x06201a }), 0, 0.65, 0, dumpster);
  box(0.86, 0.06, 1.66, mat(0x0d3a2a), 0, 1.32, 0, dumpster);
  addTube(dumpster, 0.03, 0.03, 1.6, BLUE, 0.41, 0.9, 0);
  colBox(-2.75, -1.85, -1.05, 0.65);

  // Armario con candado de 4 dígitos (pared sur, derecha). Código = el año que da nombre a la era.
  const CODE = '1989', digits = [0, 0, 0, 0];
  let cabOpen = false;
  const cab = new THREE.Group(); cab.position.set(3.0, 0, 4.52); cab.rotation.y = Math.PI; g.add(cab);   // el frente mira al norte
  const wood = mat(0x2d2350, { roughness: 0.6, metalness: 0.3, emissive: 0x120a22 });
  const cb = (w, h, d, x, y, z) => box(w, h, d, wood, x, y, z, cab);
  cb(1.2, 2.1, 0.04, 0, 1.05, -0.25); cb(0.04, 2.1, 0.5, -0.58, 1.05, 0); cb(0.04, 2.1, 0.5, 0.58, 1.05, 0);
  cb(1.2, 0.04, 0.5, 0, 2.08, 0); cb(1.2, 0.04, 0.5, 0, 0.02, 0); cb(1.12, 0.03, 0.48, 0, 0.9, 0); cb(1.12, 0.03, 0.48, 0, 1.6, 0);
  [-0.6, 0.6].forEach((x) => addTube(cab, 0.03, 2.1, 0.03, PINK, x, 1.05, 0.27));
  const digitTex = Array.from({ length: 10 }, (_, d) => makeTextTexture(String(d), { w: 64, h: 96, bg: '#07071a', color: '#2de2ff', font: 'bold 72px Georgia' }));
  const cabDoors = [-1, 1].map((side) => {                                             // side -1 = izquierda, +1 = derecha (en el espacio del armario)
    const pivot = new THREE.Group(); pivot.position.set(side * 0.6, 0, 0.27); cab.add(pivot);
    box(0.58, 2.0, 0.04, mat(0x3a2e66, { roughness: 0.5, metalness: 0.3, emissive: 0x150d2a }), -side * 0.3, 1.05, 0, pivot);
    addTube(pivot, 0.03, 0.2, 0.03, BLUE, -side * 0.06, 1.05, 0.04);
    return pivot;
  });
  const lockInfo = () => ctx.ui.toast('Un armario con candado de cuatro dígitos. Piensa en el año que da nombre a esta era...', 6000);
  ctx.interaction.add(cabDoors[0], { prompt: () => 'Presiona E para examinar el armario.', enabled: () => !cabOpen, onInteract: lockInfo });
  ctx.interaction.add(cabDoors[1], { prompt: () => 'Presiona E para examinar el armario.', enabled: () => !cabOpen, onInteract: lockInfo });
  box(0.56, 0.24, 0.03, mat(0x07071a), 0.3, 1.05, 0.045, cabDoors[0]);                    // placa del candado (en la puerta izquierda)
  const wheelMats = [0, 1, 2, 3].map((i) => {
    const w = new THREE.Group(); w.position.set(0.11 + i * 0.125, 1.05, 0.065); cabDoors[0].add(w);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.15), new THREE.MeshStandardMaterial({ map: digitTex[0], emissiveMap: digitTex[0], emissive: new THREE.Color(0.8, 0.8, 0.8) }));
    w.add(plane);
    ctx.interaction.add(w, {
      prompt: () => 'Presiona E para cambiar el dígito.',
      enabled: () => !cabOpen,
      onInteract: () => {
        digits[i] = (digits[i] + 1) % 10;
        plane.material.map = plane.material.emissiveMap = digitTex[digits[i]];
        ctx.audio.note(330 + digits[i] * 45);
        if (digits.join('') === CODE) {
          cabOpen = true; ctx.audio.reward(); cabPiece.visible = true;
          ctx.particles.burst(wp(3.0, 1.3, 4.3), 40);
          ctx.ui.toast('Clac. El candado cede y el armario se abre...', 4000);
        }
      },
    });
    return plane.material;
  });

  // Mesa de la cámara (pared este): aquí se "revela" la Polaroid al completar el rompecabezas
  const CAMX = 4.2, CAMZ = -0.4;
  box(0.9, 0.06, 1.2, mat(0x2a2a52, { roughness: 0.4, metalness: 0.5 }), CAMX, 0.75, CAMZ);
  [-0.38, 0.38].forEach((dx) => [-0.52, 0.52].forEach((dz) => box(0.06, 0.72, 0.06, mat(0x07071a), CAMX + dx, 0.36, CAMZ + dz)));
  [-0.45, 0.45].forEach((dx) => tube(0.03, 0.03, 1.2, PINK, CAMX + dx, 0.75, CAMZ));
  const camera3 = new THREE.Group(); camera3.position.set(CAMX, 0.78, CAMZ); camera3.rotation.y = -Math.PI / 2; g.add(camera3);   // mira hacia la sala (-X)
  const camWhite = mat(0xf2f0ea, { roughness: 0.5, emissive: 0x2a2a30 });
  box(0.46, 0.28, 0.3, camWhite, 0, 0.17, 0, camera3);
  box(0.47, 0.05, 0.31, mat(PINK, { emissive: 0x551133 }), 0, 0.1, 0, camera3);
  box(0.47, 0.05, 0.31, mat(0x2de2ff, { emissive: 0x0a4a55 }), 0, 0.15, 0, camera3);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 18), mat(0x111122, { metalness: 0.6 })); lens.rotation.x = Math.PI / 2; lens.position.set(0, 0.19, 0.18); camera3.add(lens);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 14), new THREE.MeshBasicMaterial({ color: neon(BLUE, 2) })); glass.rotation.x = Math.PI / 2; glass.position.set(0, 0.19, 0.235); camera3.add(glass);
  box(0.1, 0.06, 0.04, mat(0xffffff, { emissive: 0xffffff }), -0.13, 0.33, 0.14, camera3);              // flash
  box(0.28, 0.02, 0.05, mat(0x07071a), 0.05, 0.315, 0, camera3);                                         // ranura por donde sale la foto
  colBox(CAMX - 0.5, CAMX + 0.5, CAMZ - 0.65, CAMZ + 0.65);

  // --- Puerta de salida (norte): estilo neón + marco luminoso ---
  const doorZ = CZ - 5, len = 4;
  const door = createDoor(ctx, { x: 0, z: doorZ, width: room.doorWidth });
  Object.assign(door.mesh.material, { metalness: 0.6 }); door.mesh.material.color.set(0x16163a); door.mesh.material.emissive.set(0x3a0a55);
  tube(0.07, DOOR_H, 0.07, PINK, -1.56, DOOR_H / 2, -4.78); tube(0.07, DOOR_H, 0.07, PINK, 1.56, DOOR_H / 2, -4.78);
  tube(3.2, 0.07, 0.07, PINK, 0, DOOR_H, -4.78);

  // --- Pasillo hacia la siguiente era (termina en pared; al crear la sala 3 se abre igual que el de la sala 1) ---
  const hallMat = mat(0x2a2a52, { roughness: 1 });
  addWall(ctx, abs, -1.6, doorZ - len / 2, 0.2, len, hallMat);
  addWall(ctx, abs, 1.6, doorZ - len / 2, 0.2, len, hallMat);
  // (sin pared al fondo: el pasillo desemboca en la Habitación 3)
  const hallFloor = new THREE.Mesh(new THREE.PlaneGeometry(3, len), mat(0x14142e));
  hallFloor.rotation.x = -Math.PI / 2; hallFloor.position.set(0, 0.005, doorZ - len / 2);
  const hallCeil = hallFloor.clone(); hallCeil.rotation.x = Math.PI / 2; hallCeil.position.y = 4;
  const hallSign = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.9), new THREE.MeshBasicMaterial({
    map: makeTextTexture('La ciudad nunca duerme... la siguiente era te espera.', { w: 640, h: 200, color: '#ffd6f0', font: '32px Georgia' }), transparent: true }));
  hallSign.position.set(-1.49, 2, doorZ - len / 2); hallSign.rotation.y = Math.PI / 2;   // pared izquierda del pasillo
  const hallLight = new THREE.PointLight(0xff9ad5, 0, 9); hallLight.position.set(0, 3, doorZ - 2);
  abs.add(hallFloor, hallCeil, hallSign, hallLight);

  // --- Destellos rosas y azules flotando por la sala ---
  createGlitter(ctx, { count: 140, size: { x: 9, y: 3.6, z: 9 }, center: [0, 0, CZ], color: PINK });
  createGlitter(ctx, { count: 100, size: { x: 9, y: 3.6, z: 9 }, center: [0, 0, CZ], color: BLUE });

  // ================= Acertijo =================
  const lights = { mute: 1 };                              // la sala 3 lo baja al entrar (las luces de three.js son globales)
  let hallBase = 0;
  let now = 0, solved = false, ready = false, pop = 0, emitUntil = 0, rise = 0;
  const flicker = [];                                     // carteles que parpadean: { face, until, idle }
  const tmp = new THREE.Vector3();

  // 1) Cuatro carteles interactivos con pistas (dónde está la pieza + qué parte del cuadro es)
  const clues = [
    { text: 'TAXI', hex: BLUE, pos: [-4.76, 2.5, 2.6], ry: Math.PI / 2, w: 1.6,
      clue: '"Un taxi guarda más de un secreto: mira por dentro." La pieza de la calle, con el taxi, va abajo a la derecha del cuadro.' },
    { text: 'EXTRA!', hex: PINK, pos: [4.76, 3.0, -3.3], ry: -Math.PI / 2, w: 1.8, idle: true,
      clue: '"Última hora: en el fondo de la ciudad hay un armario con candado de cuatro dígitos... el año que da nombre a esta era." Ahí espera la pieza del horizonte: abajo a la izquierda.' },
    { text: 'BUS STOP', hex: BLUE, pos: [4.76, 3.05, 2.4], ry: -Math.PI / 2, w: 2.2,
      clue: '"La luna sale por la derecha del cielo." Su pieza se esconde en la sombra, detrás del contenedor de basura: arriba a la derecha.' },
    { text: 'SEAGULLS', hex: PINK, pos: [-3.25, 2.4, 4.74], ry: Math.PI, w: 2.4,
      clue: '"Las gaviotas vigilan desde lo alto de la farola." Junto a su caja cayó la pieza del cielo con gaviotas: arriba a la izquierda.' },
  ];
  clues.forEach((c) => {
    const s = makeSign(c.text, c.hex, c.w, 0.7);
    s.group.position.set(...c.pos); s.group.rotation.y = c.ry; g.add(s.group);
    const f = { face: s.face, until: 0, idle: !!c.idle }; flicker.push(f);
    ctx.interaction.add(s.group, {
      prompt: () => 'Presiona E para leer el cartel.',
      onInteract: () => { ctx.audio.chime(); f.until = now + 1.2; ctx.ui.toast(c.clue, 9000); },
    });
  });

  // 2) Imagen del rompecabezas y piezas (idx 0=arriba-izq, 1=arriba-der, 2=abajo-izq, 3=abajo-der)
  const photoTex = canvasTex(512, 512, drawPhoto);
  const slices = [0, 1, 2, 3].map((i) => makeSlice(photoTex.image, i % 2, i >> 1));
  const glowTex = canvasTex(128, 128, (c) => {
    const r = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = r; c.fillRect(0, 0, 128, 128);
  });
  const makeGlow = (hex, size) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(hex).multiplyScalar(1.4), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    s.scale.setScalar(size); return s;
  };
  const edge = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x777777 });

  const found = new Set();
  // Línea de visión: una pieza "escondida" solo se puede tomar si ningún objeto tapa el rayo cámara -> pieza.
  const losRay = new THREE.Raycaster(), losA = new THREE.Vector3(), losD = new THREE.Vector3();
  function clearView(obj, occluders) {
    obj.getWorldPosition(losA); losD.copy(losA).sub(cam); const dist = losD.length(); losD.normalize();
    losRay.set(cam, losD); losRay.far = dist - 0.05;
    return losRay.intersectObjects(occluders, true).length === 0;
  }
  const spots = [
    { idx: 0, pos: [-2.55, 0.85, -3.0] },                                              // caja junto a la farola (la fácil)
    { idx: 1, pos: [-3.2, 0.5, -0.2], hiddenBy: [dumpster] },                          // DETRÁS del contenedor (hay que rodearlo)
    { idx: 3, pos: [-3.2, 1.0, 2.9], gate: () => taxiOpen && taxiDoor.rotation.y > 0.8 }, // DENTRO del taxi (abrir la puerta)
    { idx: 2, pos: [3.0, 1.2, 4.5], gate: () => cabOpen, hidden: true },               // DENTRO del armario (código 1989)
  ];
  let cabPiece = null;
  const pieces = spots.map(({ idx, pos, hiddenBy, gate, hidden }, n) => {
    const p = new THREE.Group(); p.position.set(...pos); g.add(p);
    const top = new THREE.MeshStandardMaterial({ map: slices[idx], emissiveMap: slices[idx], emissive: new THREE.Color(0.7, 0.7, 0.7) });
    const tile = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.34), [edge, edge, top, edge, edge, edge]);
    tile.rotation.x = -0.6;
    p.add(tile, makeGlow(0xff7ad9, 1.0));
    if (hidden) { p.visible = false; cabPiece = p; }
    ctx.interaction.add(p, {
      prompt: () => 'Presiona E para recoger la pieza del rompecabezas.',
      enabled: () => (!gate || gate()) && (!hiddenBy || clearView(p, hiddenBy)),
      onInteract: () => {
        found.add(idx); p.visible = false; ctx.audio.reward();
        ctx.particles.burst(wp(...pos), 25);
        ctx.ui.toast(found.size === 4 ? 'Tienes las cuatro piezas. Llévalas a la mesa del centro.' : `Encontraste una pieza del rompecabezas (${found.size}/4).`, 3500);
      },
    });
    return { p, y: pos[1], n };
  });

  // Boceto borroso del cuadro final (pista de cómo van las piezas), colgado en la pared oeste
  const sketchTex = canvasTex(256, 256, (c, w, h) => {
    const small = document.createElement('canvas'); small.width = small.height = 8;
    small.getContext('2d').drawImage(photoTex.image, 0, 0, 8, 8);
    c.imageSmoothingEnabled = false; c.drawImage(small, 0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 3; c.beginPath();
    c.moveTo(w / 2, 0); c.lineTo(w / 2, h); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke();
  });
  const sketch = new THREE.Group(); sketch.position.set(-4.76, 1.9, 0.85); sketch.rotation.y = Math.PI / 2; g.add(sketch);
  box(1.0, 1.0, 0.04, mat(0x07071a, { emissive: 0x1a0a2a }), 0, 0, 0, sketch);
  const sketchPic = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.88), new THREE.MeshBasicMaterial({ map: sketchTex })); sketchPic.position.z = 0.025; sketch.add(sketchPic);
  [1, -1].forEach((sg) => { addTube(sketch, 1.04, 0.03, 0.03, BLUE, 0, sg * 0.5, 0.03); addTube(sketch, 0.03, 1.04, 0.03, BLUE, sg * 0.5, 0, 0.03); });
  ctx.interaction.add(sketch, {
    prompt: () => 'Presiona E para mirar el boceto.',
    onInteract: () => ctx.ui.toast('Un boceto borroso del cuadro final, dividido en cuatro: así van las piezas. El cielo arriba; la ciudad y la calle, abajo.', 8000),
  });

  // 3) Mesa central con 4 huecos (fila 0 = norte = arriba de la imagen)
  const TX = 0, TZ = -1.0;
  box(1.6, 0.08, 1.6, mat(0x2a2a52, { roughness: 0.4, metalness: 0.5 }), TX, 0.85, TZ);
  [-0.7, 0.7].forEach((dx) => [-0.7, 0.7].forEach((dz) => box(0.08, 0.81, 0.08, mat(0x07071a), TX + dx, 0.405, TZ + dz)));
  [-1, 1].forEach((s) => { tube(1.6, 0.03, 0.03, BLUE, TX, 0.85, TZ + s * 0.8); tube(0.03, 0.03, 1.6, BLUE, TX + s * 0.8, 0.85, TZ); });
  colBox(TX - 0.85, TX + 0.85, TZ - 0.85, TZ + 0.85);

  const emptyTex = canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#10102a'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#2de2ff'; c.lineWidth = 6; c.setLineDash([14, 10]); c.strokeRect(10, 10, w - 20, h - 20);
    c.setLineDash([]); c.fillStyle = '#2de2ff'; c.font = 'bold 64px Georgia'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', w / 2, h / 2 + 4);
  });
  const slotState = [null, null, null, null];
  const SLOT_NOTES = [523.25, 659.25, 783.99, 987.77];
  const slotMeshes = [0, 1, 2, 3].map((s) => {
    const grp = new THREE.Group(); grp.position.set(TX + ((s & 1) - 0.5) * 0.46, 0.9, TZ + ((s >> 1) - 0.5) * 0.46); g.add(grp);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42),
      new THREE.MeshStandardMaterial({ map: emptyTex, emissiveMap: emptyTex, emissive: new THREE.Color(0.5, 0.5, 0.5) }));
    plane.rotation.x = -Math.PI / 2; grp.add(plane);
    ctx.interaction.add(grp, {
      prompt: () => (found.size ? `Presiona E para colocar / cambiar la pieza (${found.size}/4 encontradas).` : 'Aquí encajan cuatro piezas... aún no tienes ninguna.'),
      enabled: () => !solved,
      onInteract: () => cycle(s),
    });
    return plane;
  });

  // E sobre un hueco: recorre vacío -> cada pieza encontrada que no esté ya puesta en otro hueco.
  function cycle(s) {
    if (!found.size) { ctx.audio.error(); ctx.ui.toast('Aún no tienes piezas. Explora la ciudad para encontrarlas.', 3000); return; }
    const opts = [null, ...[...found].sort().filter((p) => p === slotState[s] || !slotState.includes(p))];
    const next = opts[(opts.indexOf(slotState[s]) + 1) % opts.length];
    slotState[s] = next;
    const m = slotMeshes[s].material; m.map = m.emissiveMap = next === null ? emptyTex : slices[next];
    ctx.audio.note(SLOT_NOTES[s]);
    ctx.particles.burst(wp(TX + ((s & 1) - 0.5) * 0.46, 1.0, TZ + ((s >> 1) - 0.5) * 0.46), 12, { speed: 0.5, up: 0.8 });
    if (slotState.includes(null)) return;
    const ok = slotState.filter((p, i) => p === i).length;
    if (ok === 4) solve();
    else { ctx.audio.error(); ctx.ui.toast(`Algo no encaja todavía... (${ok} de 4 piezas en su lugar)`, 3500); }
  }

  // 4) Polaroid: sale por la ranura de la cámara de la mesa del lado este
  let printed = false, printAt = 0;
  const POL_Y0 = 0.95, POL_Y1 = 1.75;
  const polaroid = new THREE.Group(); polaroid.visible = false; polaroid.position.set(CAMX, POL_Y0, CAMZ); polaroid.rotation.y = -Math.PI / 2; polaroid.scale.setScalar(1.3); g.add(polaroid);
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.015), new THREE.MeshStandardMaterial({ color: 0xf5f2ea, emissive: 0x55524a, roughness: 0.6 }));
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial({ map: photoTex })); pic.position.set(0, 0.06, 0.009);
  polaroid.add(card, pic, makeGlow(PINK, 1.6));
  ctx.interaction.add(camera3, {
    prompt: () => 'Presiona E para mirar la cámara.',
    enabled: () => !printed,
    onInteract: () => ctx.ui.toast(solved ? 'La cámara zumba... algo está por salir.' : 'Una cámara instantánea. Parece esperar una imagen completa...', 4000),
  });
  ctx.interaction.add(polaroid, {
    prompt: () => 'Presiona E para recoger la Polaroid.',
    enabled: () => polaroid.visible && ready,
    onInteract: () => {
      polaroid.visible = false; ctx.audio.reward(); ctx.collect('polaroid'); door.unlock();
      ctx.ui.toast('Has recuperado el recuerdo de 1989.', 5000);
    },
  });

  function solve() {
    solved = true; ctx.game.solved++;
    ctx.audio.success();
    pop = 1; emitUntil = now + 4;                            // las luces "explotan" y se apagan despacio
    slotMeshes.forEach((m) => m.material.emissive.setRGB(0.9, 0.9, 0.9));
    ctx.particles.burst(wp(TX, 1.1, TZ), 90, { speed: 2, up: 2.5 });
    printAt = now + 2;                                       // la cámara dispara un instante después
    ctx.ui.toast('Las piezas encajan... Recoge tu premio en el lugar adecuado.', 6000);
  }

  // 5) SECRETO: toca discos escondido bajo el toldo del quiosco (nada en los carteles lo menciona)
  const RPX = 4.05, RPZ = -3.3;
  let fileMissing = false;
  const recordPlayer = new THREE.Group(); recordPlayer.position.set(RPX, 1.0, RPZ); g.add(recordPlayer);
  box(0.3, 0.07, 0.3, mat(0x1a1030, { roughness: 0.4, metalness: 0.5, emissive: 0x120a22 }), 0, 0.035, 0, recordPlayer);
  addTube(recordPlayer, 0.31, 0.015, 0.015, PINK, 0, 0.07, 0.15); addTube(recordPlayer, 0.31, 0.015, 0.015, BLUE, 0, 0.07, -0.15);
  const platter = new THREE.Group(); platter.position.y = 0.085; recordPlayer.add(platter);
  const vinyl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.012, 28), mat(0x050508, { roughness: 0.25, metalness: 0.6 }));
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.014, 18), mat(PINK, { emissive: 0x551133 }));
  const groove = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.014, 0.008), mat(0x2a2a44));   // marca para ver que gira
  platter.add(vinyl, label, groove);
  const arm = new THREE.Group(); arm.position.set(0.12, 0.1, -0.1); recordPlayer.add(arm);
  box(0.012, 0.012, 0.16, mat(0xcfd2e0, { metalness: 0.7 }), 0, 0, 0.07, arm);
  const rpGlow = makeGlow(PINK, 0.7); rpGlow.position.y = 0.15; rpGlow.visible = false; recordPlayer.add(rpGlow);
  ctx.interaction.add(recordPlayer, {
    prompt: () => (ctx.audio.trackPlaying() ? 'Presiona E para detener el disco.' : 'Presiona E para poner el disco.'),
    onInteract: async () => {
      if (ctx.audio.trackPlaying()) { ctx.audio.stopTrack(); return; }
      const ok = !fileMissing && await ctx.audio.playTrack(RECORD.url);
      if (ok) { ctx.ui.toast(`♪ ${RECORD.title}`, 4000); return; }
      fileMissing = true;                                  // no insistir con un archivo que no existe
      ctx.audio.playSynth(); ctx.ui.toast(`♪ ${RECORD.fallbackTitle}`, 4000);
    },
  });

  // ================= Animación y luces (cada frame) =================
  ctx.updaters.push((dt, t) => {
    now = t;
    // Las luces de three.js son globales: se mezclan las luces de ambas salas según dónde esté el jugador.
    const k2 = clamp((-cam.z - 5) / 4, 0, 1);               // 0 en la sala 1 -> 1 dentro de la sala 2
    room1.lights.mute = clamp((cam.z + 9) / 4, 0.04, 1);    // la sala 1 se apaga al cruzar el pasillo
    room1.lights.apply();
    pop = Math.max(0, pop - dt * 0.5);
    const playing = ctx.audio.trackPlaying();                // el toca discos: el disco gira y las luces laten
    const mult = k2 * lights.mute * (1 + pop * 1.2 + (playing ? 0.18 * Math.pow(0.5 + 0.5 * Math.sin(t * Math.PI * 4), 2) : 0));
    platter.rotation.y += playing ? dt * 3.5 : 0;
    arm.rotation.y += ((playing ? 0.5 : 0) - arm.rotation.y) * Math.min(1, dt * 4);
    rpGlow.visible = playing; rpGlow.material.opacity = 0.6 + 0.4 * Math.sin(t * 8);
    if (playing && Math.random() < 0.05) ctx.particles.burst(wp(RPX, 1.2, RPZ), 2, { speed: 0.3, up: 0.8 });
    ambient.intensity = 0.8 * mult;
    lp.forEach((o, i) => (o.l.intensity = o.base * mult * (0.9 + 0.1 * Math.sin(t * 1.5 + i * 1.7))));
    if (cam.z < -8) ctx.fx.bloom = true;                    // el neón necesita Bloom (queda activo desde aquí)

    flicker.forEach((f) => {
      const idle = f.idle && Math.sin(t * 23) * Math.sin(t * 7.3) > 0.92;
      f.face.material.opacity = t < f.until ? (Math.random() < 0.5 ? 0.2 : 1) : (idle ? 0.3 : 1);
    });
    pieces.forEach((o) => { o.p.position.y = o.y + Math.sin(t * 2 + o.n) * 0.04; o.p.rotation.y = t * 0.9 + o.n; });
    gull.rotation.z = Math.sin(t * 1.3) * 0.05;

    if (t < emitUntil && Math.random() < 0.5) ctx.particles.burst(tmp.set((Math.random() - 0.5) * 6, 0.5 + Math.random() * 2, CZ + (Math.random() - 0.5) * 6), 2, { speed: 0.3, up: 0.5 });
    if (solved && !printed && t >= printAt) {                // ¡click! flash y la foto sale de la cámara
      printed = true; flash(); ctx.audio.chime(); ctx.audio.note(1046.5);
      ctx.particles.burst(wp(CAMX, 1.1, CAMZ), 40, { speed: 0.8, up: 1 });
      polaroid.visible = true;
    }
    if (polaroid.visible) {
      rise = Math.min(1, rise + dt / 3);
      polaroid.position.y = POL_Y0 + (POL_Y1 - POL_Y0) * (1 - Math.pow(1 - rise, 3)) + (ready ? Math.sin(t * 2) * 0.04 : 0);
      if (rise >= 1) ready = true;
    }
    cabDoors[0].rotation.y += ((cabOpen ? -1.9 : 0) - cabDoors[0].rotation.y) * Math.min(1, dt * 3);
    cabDoors[1].rotation.y += ((cabOpen ? 1.9 : 0) - cabDoors[1].rotation.y) * Math.min(1, dt * 3);
    taxiDoor.rotation.y += ((taxiOpen ? 1.2 : 0) - taxiDoor.rotation.y) * Math.min(1, dt * 3);
    if (door.opening) hallBase = Math.min(12, hallBase + dt * 4);
    hallLight.intensity = hallBase * lights.mute;
  });

  return { ...room, door, lights };
}