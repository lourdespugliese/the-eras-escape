// roomLover.js — Habitación 4: Lover. Rosa y celeste pastel, corazones, arcoíris, nubes y destellos.
//
// Incluye el TÚNEL DE CORAZÓN que une la sala 3 con esta: mide TUNNEL metros (los demás pasillos miden 4) y su sección
// transversal es un corazón rosa. Se ve en cuanto se abre la puerta de la sala 3: las luces del túnel se encienden y
// unas nervaduras luminosas pulsan hacia la sala 4 mientras el jugador camina.
//
// Acertijos (al final de este archivo): arcoíris de corazones + cofre de las eras. Al resolver ambos baja el corazón final.
// EASTER EGG: cuando el corazón premio sale del cofre y se posa en el pedestal, dentro del cofre abierto aparece un
// toca discos secreto que reproduce una canción de assets/audio.
import * as THREE from 'three';
import { createRoom, createDoor, addWall, canvasTex, makeTextTexture, makeButterfly, flap, DOOR_H, WALL_H } from './rooms.js';
import { addBox, addTube, neon, makeSign } from './room1989.js';
import { createGlitter } from './glitter.js';

const TAU = Math.PI * 2;
const SIZE = 12;                       // lado de la sala
const TUNNEL = 7;                      // largo del túnel (entre el centro de la pared norte de la sala 3 y el de la pared sur de esta sala)
const HALL_OUT = 4;                    // pasillo (provisional) hacia la sala 5
const PINK = 0xff7ab8, PINK_D = 0xff4fa3, BLUE = 0x8fd3ff, LILAC = 0xc9a8ff;
const clamp = THREE.MathUtils.clamp;
// Canción del toca discos secreto del cofre. Copia tu archivo de audio en esa ruta (relativa a index.html).
// Si el archivo no existe, el disco toca un tema synthwave original generado por el propio juego (audio.js).
// Se prueban en orden: lo más simple es renombrar tu archivo a "Lover.mp3" y dejarlo en assets/audio.
const RECORD = {
  urls: ['assets/audio/Lover.mp3', 'assets/audio/OnlyMP3.to - Taylor Swift - Lover Official Music Video.mp3', encodeURI('assets/audio/OnlyMP3.to - Taylor Swift - Lover Official Music Video.mp3')],
  title: 'Lover', fallbackTitle: 'Neon Skyline (pista original)',
};

// ================= Corazón =================
// Curva clásica del corazón (con la muesca arriba y la punta abajo). t: 0..2π.
const heartX = (t) => 16 * Math.pow(Math.sin(t), 3);
const heartY = (t) => 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);

// Sección del túnel: un corazón "recortado" por el suelo (y = 0). Va de la esquina derecha del suelo, por arriba, a la izquierda.
// Se elige el recorte para que el corazón mida `height` de alto y el suelo `2 * halfFloor` de ancho (≈ el ancho de la puerta).
export function tunnelProfile(height = 4, halfFloor = 1.55, n = 72) {
  let ymax = -1e9; for (let t = 0; t <= Math.PI; t += 0.01) ymax = Math.max(ymax, heartY(t));
  let tc = 2.2, best = Infinity;
  for (let t = 2.0; t <= 2.6; t += 0.002) {
    const s = height / (ymax - heartY(t)), hw = heartX(t) * s;
    if (Math.abs(hw - halfFloor) < best) { best = Math.abs(hw - halfFloor); tc = t; }
  }
  const yc = heartY(tc), s = height / (ymax - yc), pts = [];
  for (let k = 0; k <= n; k++) { const t = tc - (k * 2 * tc) / n; pts.push(new THREE.Vector2(heartX(t) * s, (heartY(t) - yc) * s)); }
  return { pts, hw: heartX(tc) * s };
}

// Corazón 3D (ancho ≈ 1): extrusión con bisel. Se reutiliza escalándolo.
function makeHeartGeometry() {
  const pts = []; for (let i = 0; i < 64; i++) { const t = (i / 64) * TAU; pts.push(new THREE.Vector2(heartX(t), heartY(t))); }
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 8, bevelEnabled: true, bevelThickness: 2, bevelSize: 1.5, bevelSegments: 3 });
  geo.center(); geo.scale(1 / 32, 1 / 32, 1 / 32);
  return geo;
}
function drawHeart(g, cx, cy, size, fill) {              // corazón en un canvas 2D
  const sc = size / 32; g.fillStyle = fill; g.beginPath();
  for (let i = 0; i <= 40; i++) { const t = (i / 40) * TAU, x = cx + heartX(t) * sc, y = cy - heartY(t) * sc; i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.closePath(); g.fill();
}

// Túnel: prisma con la sección de corazón, extruido a lo largo de Z (de z0 a z1).
function makePrism(profile, z0, z1, segs, uRep, vRep) {
  const n = profile.length, pos = [], uv = [], idx = [];
  for (let j = 0; j <= segs; j++) {
    const z = z0 + ((z1 - z0) * j) / segs;
    for (let k = 0; k < n; k++) { pos.push(profile[k].x, profile[k].y, z); uv.push((k / (n - 1)) * uRep, (j / segs) * vRep); }
  }
  for (let j = 0; j < segs; j++) for (let k = 0; k < n - 1; k++) { const a = j * n + k, b = a + 1, c = (j + 1) * n + k, d = c + 1; idx.push(a, c, b, b, c, d); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}
// Tapa de un extremo del túnel: el corazón menos el hueco de la puerta (así se ve una pared rosa con la puerta, no una pared de la otra sala).
function makeCapGeometry(profile, doorHalf) {
  const sh = new THREE.Shape();
  profile.forEach((p, i) => (i ? sh.lineTo(p.x, p.y) : sh.moveTo(p.x, p.y)));
  sh.lineTo(-doorHalf, 0); sh.lineTo(-doorHalf, DOOR_H); sh.lineTo(doorHalf, DOOR_H); sh.lineTo(doorHalf, 0);   // el hueco de la puerta, apoyado en el suelo
  return new THREE.ShapeGeometry(sh);
}

// ================= Texturas (canvas) =================
function makeLoverWall() {                               // degradado celeste -> rosa con nubes y corazones (un "azulejo" de 3 m x 4 m)
  return canvasTex(384, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#bfe3ff'); gr.addColorStop(0.55, '#f7d3ea'); gr.addColorStop(1, '#f8bcd6');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.4)';
    [[80, 70, 60], [160, 60, 48], [300, 110, 62], [240, 100, 40]].forEach(([x, y, r]) => { g.beginPath(); g.ellipse(x, y, r, r * 0.55, 0, 0, TAU); g.fill(); });
    for (let i = 0; i < 14; i++) drawHeart(g, 30 + Math.random() * 320, 150 + Math.random() * 340, 14 + Math.random() * 16, `rgba(255,${120 + Math.floor(Math.random() * 60)},${170 + Math.floor(Math.random() * 40)},.55)`);
    g.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 40; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(0, h - 30, w, 4);                   // zócalo
  });
}
function makeFloorTexture() {                            // damero rosa y blanco
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#ffeaf3'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f7c3da'; g.fillRect(0, 0, w / 2, h / 2); g.fillRect(w / 2, h / 2, w / 2, h / 2);
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 3; g.strokeRect(1, 1, w - 2, h - 2);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function makeTunnelTexture() {                           // paredes del túnel: rosa con corazones blancos y destellos
  const t = canvasTex(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#ff9cc8'); gr.addColorStop(1, '#ff7fb6');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) drawHeart(g, c * 64 + 32 + (r % 2) * 32, r * 64 + 36, 22, 'rgba(255,255,255,.5)');
    g.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 30; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function tileWalls(group, wallMat, wallTex) {            // cada pared recibe una copia del material con el patrón repetido cada 3 m
  group.traverse((o) => {
    if (o.isMesh && o.material === wallMat) {
      const p = o.geometry.parameters, m = wallMat.clone(), tex = wallTex.clone();
      tex.needsUpdate = true; tex.repeat.set(Math.max(p.width, p.depth) / 3, p.height / WALL_H); m.map = tex; o.material = m;
    }
  });
}

// ================= Habitación 4: Lover =================
export function buildRoomLover(ctx, room3) {
  const cam = ctx.camera.position;
  const hallStart = room3.bounds.minZ;                    // pared norte de la sala 3 (z del mundo): ahí empieza el túnel
  const CZ = hallStart - TUNNEL - SIZE / 2;               // centro de esta sala
  const half = SIZE / 2;
  const door3 = room3.door;
  room3.removeHall();                                     // el túnel reemplaza el pasillo provisional de la sala 3 (si no, su pared del fondo tapa y bloquea el túnel)

  const wallTex = makeLoverWall(); wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.8, emissive: 0x5a3a4a });
  const floorTex = makeFloorTexture(); floorTex.repeat.set(SIZE / 2, SIZE / 2);
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.2, metalness: 0.15 });
  const room = createRoom(ctx, { name: 'Habitación 4 — Lover', z: CZ, w: SIZE, d: SIZE, wallMat, floorMat, ceilColor: 0xcfe8ff, southOpening: 3 });
  const abs = room.group;
  tileWalls(abs, wallMat, wallTex);
  const g = new THREE.Group(); g.position.z = CZ; ctx.scene.add(g);      // contenido en coordenadas locales (norte = -Z)
  const box = (w, h, d, m, x, y, z, p = g) => addBox(p, w, h, d, m, x, y, z);
  const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
  const colBox = (x0, x1, z0, z1) => ctx.colliders.push({ minX: x0, maxX: x1, minZ: CZ + z0, maxZ: CZ + z1 });
  const wp = (x, y, z) => new THREE.Vector3(x, y, z + CZ);
  const lights = { mute: 1 };                             // para atenuar esta sala cuando exista la siguiente
  const heartGeo = makeHeartGeometry();
  const glowTex = canvasTex(128, 128, (c) => {
    const r = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.3)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = r; c.fillRect(0, 0, 128, 128);
  });
  const makeGlow = (hex, size) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: hex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); s.scale.setScalar(size); return s; };
  const heartMat = (hex) => mat(hex, { roughness: 0.25, metalness: 0.1, emissive: new THREE.Color(hex).multiplyScalar(0.45) });

  // ====================== TÚNEL DE CORAZÓN ======================
  const { pts: prof } = tunnelProfile(4, 1.55);
  const zA = hallStart - 0.2, zB = hallStart - TUNNEL + 0.2, len = zA - zB, zc = (zA + zB) / 2;   // de la cara exterior de una pared a la de la otra
  const tunnel = new THREE.Group(); ctx.scene.add(tunnel);
  const tTex = makeTunnelTexture(); tTex.repeat.set(10, len / 2);
  const tunnelMat = new THREE.MeshStandardMaterial({ map: tTex, emissiveMap: tTex, emissive: new THREE.Color(0.55, 0.22, 0.38), roughness: 0.45, side: THREE.DoubleSide });
  tunnel.add(new THREE.Mesh(makePrism(prof, zA, zB, 14, 1, 1), tunnelMat));
  const floorTunnelTex = makeTunnelTexture(); floorTunnelTex.repeat.set(2, len / 2);
  const tFloor = new THREE.Mesh(new THREE.PlaneGeometry(3.2, len), new THREE.MeshStandardMaterial({ map: floorTunnelTex, emissiveMap: floorTunnelTex, emissive: new THREE.Color(0.4, 0.15, 0.28), roughness: 0.25 }));
  tFloor.rotation.x = -Math.PI / 2; tFloor.position.set(0, 0.006, zc); tunnel.add(tFloor);
  const capMat = new THREE.MeshStandardMaterial({ color: 0xffb3d4, emissive: 0x6a2a48, roughness: 0.5, side: THREE.DoubleSide });
  const capGeo = makeCapGeometry(prof, 1.5);
  const capA = new THREE.Mesh(capGeo, capMat); capA.position.z = zA - 0.01; tunnel.add(capA);          // junto a la sala 3
  const capB = new THREE.Mesh(capGeo, capMat); capB.position.z = zB + 0.01; tunnel.add(capB);          // junto a la sala 4
  // Nervaduras luminosas con forma de corazón cada ~1 m: pulsan de una en una hacia la sala 4.
  const ribs = [];
  for (let i = 0, z = zA - 0.6; z > zB + 0.3; i++, z -= 1.1) {
    const curve = new THREE.CatmullRomCurve3(prof.map((p) => new THREE.Vector3(p.x * 0.985, p.y * 0.985 + 0.01, z)));
    const m = new THREE.MeshBasicMaterial({ color: neon(PINK_D, 2.2) });
    tunnel.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 90, 0.04, 6, false), m)); ribs.push({ m, i });
  }
  [-1.45, 1.45].forEach((x) => addTube(tunnel, 0.05, 0.03, len, PINK_D, x, 0.03, zc, 2));            // franjas luminosas en el borde del suelo
  // Corazones flotando dentro del túnel
  const tHearts = Array.from({ length: 14 }, (_, i) => {
    const m = new THREE.Mesh(heartGeo, heartMat(i % 3 === 0 ? 0xffffff : i % 3 === 1 ? PINK : 0xffb3d9)); m.scale.setScalar(0.22 + Math.random() * 0.12);
    const o = { m, x: (Math.random() - 0.5) * 3, y: 0.6 + Math.random() * 1.7, z: zB + 0.4 + Math.random() * (len - 0.8), sp: 0.12 + Math.random() * 0.12, ph: Math.random() * TAU };
    tunnel.add(m); return o;
  });
  createGlitter(ctx, { count: 90, size: { x: 5, y: 4, z: len }, center: [0, 0, zc], color: 0xffb3d9 });
  // Luces del túnel: se encienden al abrirse la puerta de la sala 3 y laten como un corazón.
  const tLights = [0.3, 0.7].map((f) => { const l = new THREE.PointLight(PINK, 0, 8); l.position.set(0, 2.0, zA - len * f); tunnel.add(l); return l; });
  ctx.colliders.push({ minX: -1.7, maxX: -1.5, minZ: zB, maxZ: zA }, { minX: 1.5, maxX: 1.7, minZ: zB, maxZ: zA });   // paredes invisibles: el jugador sigue el camino del suelo
  let tunnelOn = 0;

  // ====================== SALA 4 ======================
  // --- Luces: ambiente rosado + dos luces pastel (rosa y celeste) ---
  const ambient = new THREE.AmbientLight(0xffd9ee, 0.9); g.add(ambient);
  const lp = [
    { base: 20, color: 0xff9ccd, pos: [-3, 3.6, 2.5] },
    { base: 20, color: 0x9fd8ff, pos: [3.2, 3.6, -2.5] },
  ].map((o) => { o.l = new THREE.PointLight(o.color, o.base, 15); o.l.position.set(...o.pos); g.add(o.l); return o; });

  // --- Cartel LOVER sobre la puerta + arcoíris pastel en las paredes oeste y este ---
  const title = makeSign('LOVER', 0xff5fa8, 2.2, 0.5); title.group.position.set(0, 3.6, -half + 0.25); g.add(title.group);
  const rainbowCols = [0xffa3b5, 0xffc89a, 0xfff0a0, 0xb5f0b5, 0xa5d8ff, 0xb9b5ff, 0xe0b5ff];
  const rainbowMeshes = [];                                // los arcos de las paredes (el acertijo los ilumina al resolverse)
  [-1, 1].forEach((side) => {
    const rb = new THREE.Group(); rb.position.set(side * (half - 0.27), 0.2, 0); rb.rotation.y = -side * Math.PI / 2; g.add(rb);
    rainbowCols.forEach((c, i) => { const arc = new THREE.Mesh(new THREE.TorusGeometry(1.0 + i * 0.14, 0.065, 8, 48, Math.PI), mat(c, { roughness: 0.5, emissive: new THREE.Color(c).multiplyScalar(0.45) })); rb.add(arc); rainbowMeshes.push(arc); });
  });

  // --- Nubes colgantes ---
  const clouds = [[-3, 3.25, -2.5], [3.5, 3.35, 1.5], [-1, 3.45, 3.5], [2, 3.3, -4]].map(([x, y, z], i) => {
    const c = new THREE.Group(); c.position.set(x, y, z); g.add(c);
    const cm = mat(0xffffff, { roughness: 1, emissive: 0xdfeeff });
    [[0, 0, 0, 0.5], [0.5, -0.05, 0.1, 0.38], [-0.5, -0.05, -0.05, 0.4], [0.2, 0.15, 0.2, 0.34], [-0.25, 0.1, -0.2, 0.32]].forEach(([dx, dy, dz, r]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), cm); s.position.set(dx, dy, dz); s.scale.y = 0.75; c.add(s); });
    return { c, y, i };
  });

  // --- Guirnaldas de corazones colgando del techo (de pared a pared) ---
  const garlandCols = [PINK, 0xffffff, BLUE, LILAC];
  const garlands = [-1.5, 2.5].flatMap((z) => {
    const cord = [], hs = [];
    for (let i = 0; i <= 11; i++) {
      const x = -5.5 + (i / 11) * 11, y = 3.7 - 0.55 * (1 - Math.pow(x / 5.5, 2));
      cord.push(new THREE.Vector3(x, y, z));
      const h = new THREE.Mesh(heartGeo, heartMat(garlandCols[i % 4])); h.scale.setScalar(0.3); h.position.set(x, y - 0.12, z); g.add(h); hs.push({ h, i });
    }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(cord), new THREE.LineBasicMaterial({ color: 0xffffff })));
    return hs;
  });

  // --- Mariposas pastel que vuelan en círculos ---
  const flies = [[0xff9ccd, 2.6, 2.2, 0.5], [0x9fd8ff, 3.6, 2.5, -0.4], [0xe0b5ff, 4.6, 2.0, 0.6], [0xfff0a0, 3.0, 2.8, -0.55]].map(([color, R, y, w], i) => {
    const b = makeButterfly(color); b.group.scale.setScalar(0.7); g.add(b.group); flap(ctx, b, { speed: 7, amp: 0.55, phase: i * 1.7 });
    return { b, R, y, w, ph: i * 1.6 };
  });

  // --- Sofá rosa (pared oeste) ---
  const sofa = new THREE.Group(); sofa.position.set(-5.2, 0, 3.4); sofa.rotation.y = Math.PI / 2; g.add(sofa);
  const velvet = mat(0xf79ac4, { roughness: 1, emissive: 0x3a1020 });
  box(2.0, 0.45, 0.9, velvet, 0, 0.3, 0, sofa); box(2.0, 0.7, 0.2, velvet, 0, 0.8, -0.35, sofa);
  [-1, 1].forEach((s) => box(0.2, 0.6, 0.9, velvet, s * 1.0, 0.4, 0, sofa));
  const cushionBlue = box(0.5, 0.45, 0.14, mat(0xa5d8ff, { roughness: 1, emissive: 0x102030 }), -0.5, 0.75, -0.2, sofa);
  const cushionLilac = box(0.5, 0.45, 0.14, mat(0xe0b5ff, { roughness: 1, emissive: 0x201030 }), 0.5, 0.75, -0.2, sofa);   // el corazón amarillo está escondido bajo este cojín
  colBox(-5.7, -4.8, 2.35, 4.45);

  // --- Cuadro con la foto de Lover (pared este = la de la derecha al entrar). Archivo: assets/images/lover.jpg ---
  {
    const f = new THREE.Group(); f.position.set(half - 0.23, 1.9, 3.9); f.rotation.y = -Math.PI / 2; g.add(f);     // pegado a la cara interior (5.8); mira hacia la sala
    box(1.85, 1.85, 0.06, mat(0xffc2dc, { roughness: 0.35, emissive: 0x6a2a48 }), 0, 0, 0, f);
    const tex = new THREE.TextureLoader().load('assets/images/lover.jpg');
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 1.65), new THREE.MeshBasicMaterial({ map: tex }));   // MeshBasic = colores originales de la foto
    pic.position.z = 0.035; f.add(pic);
    [[0, 0.91, 1.85, 0.03], [0, -0.91, 1.85, 0.03], [0.91, 0, 0.03, 1.85], [-0.91, 0, 0.03, 1.85]].forEach(([x, y, w, h]) => addTube(f, w, h, 0.03, PINK, x, y, 0.035, 1.3));   // marco luminoso
  }

  // --- Acertijos de Lover (createLoverPuzzle, al final de este archivo): arcoíris de corazones + cofre de las eras + corazón amarillo bajo el cojín ---
  createLoverPuzzle(ctx, { g, half, mat, colBox, heartGeo, heartMat, makeGlow, rainbowCols, rainbowMeshes, neon, pinkDark: PINK_D, sofa, cushionLilac, cushionBlue, onSolved: () => door.unlock() });

  // --- Destellos pastel ---
  createGlitter(ctx, { count: 160, size: { x: 11, y: 3.6, z: 11 }, center: [0, 0, CZ], color: 0xff9ccd }).uniforms.uIntensity.value = 0.9;
  createGlitter(ctx, { count: 100, size: { x: 11, y: 3.6, z: 11 }, center: [0, 0, CZ], color: 0x9fd8ff }).uniforms.uIntensity.value = 0.8;

  // --- Puerta de salida (norte) + pasillo provisional hacia la siguiente era ---
  const doorZ = CZ - half;
  const door = createDoor(ctx, { x: 0, z: doorZ, width: room.doorWidth });
  door.mesh.material.color.set(0xffd3e6); door.mesh.material.emissive.set(0x6a2a48); door.mesh.material.metalness = 0.2;
  addTube(g, 0.07, DOOR_H, 0.07, PINK_D, -1.56, DOOR_H / 2, -half + 0.02, 1.6); addTube(g, 0.07, DOOR_H, 0.07, PINK_D, 1.56, DOOR_H / 2, -half + 0.02, 1.6);
  addTube(g, 3.2, 0.07, 0.07, PINK_D, 0, DOOR_H, -half + 0.02, 1.6);
  const hallMat = mat(0xf3b5d0, { roughness: 1, emissive: 0x4a2a38 });
  addWall(ctx, abs, -1.6, doorZ - HALL_OUT / 2, 0.2, HALL_OUT, hallMat);
  addWall(ctx, abs, 1.6, doorZ - HALL_OUT / 2, 0.2, HALL_OUT, hallMat);
  const endCol = ctx.colliders.length;
  addWall(ctx, abs, 0, doorZ - HALL_OUT, 3.4, 0.2, hallMat);               // pared del fondo: la sala 5 llama a openHall() y la quita
  const hallEnd = { mesh: abs.children[abs.children.length - 1], col: ctx.colliders[endCol] };
  const hallFloor = new THREE.Mesh(new THREE.PlaneGeometry(3, HALL_OUT), mat(0xffeaf3));
  hallFloor.rotation.x = -Math.PI / 2; hallFloor.position.set(0, 0.005, doorZ - HALL_OUT / 2);
  const hallCeil = hallFloor.clone(); hallCeil.rotation.x = Math.PI / 2; hallCeil.position.y = 4;
  const hallSign = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.9), new THREE.MeshBasicMaterial({
    map: makeTextTexture('El amor también cambia de forma... la siguiente era te espera.', { w: 640, h: 200, color: '#b0306a', font: '32px Georgia' }), transparent: true }));
  hallSign.position.set(0, 2, doorZ - HALL_OUT + 0.12);
  const hallLight = new THREE.PointLight(0xffb3d9, 0, 9); hallLight.position.set(0, 3, doorZ - 2);
  abs.add(hallFloor, hallCeil, hallSign, hallLight);
  let hallBase = 0;

  // ================= Animación y luces (cada frame) =================
  ctx.updaters.push((dt, t) => {
    const z = cam.z;
    // Luces: la sala 3 se apaga a lo largo de los primeros 3 m del túnel; la sala 4 se enciende en los últimos 3 m.
    room3.lights.mute = clamp((z - (hallStart - 3)) / 3, 0.04, 1);
    const k4 = clamp((hallStart - TUNNEL + 3 - z) / 3, 0, 1);
    const base = k4 * lights.mute;
    ambient.intensity = 0.9 * base;
    lp.forEach((o, i) => (o.l.intensity = o.base * base * (0.94 + 0.06 * Math.sin(t * 1.4 + i * 2))));

    // Túnel: sus luces se encienden al abrirse la puerta de la sala 3 y laten; se apagan al internarse en la sala 4.
    if (door3.opening) tunnelOn = Math.min(1, tunnelOn + dt * 0.8);
    const beat = 0.8 + 0.2 * Math.pow(Math.sin(t * 3), 2), tl = clamp((z - (hallStart - TUNNEL - 3)) / 3, 0, 1);
    tLights.forEach((l) => (l.intensity = 16 * tunnelOn * tl * beat));
    ribs.forEach((r) => r.m.color.set(PINK_D).multiplyScalar(2.2 * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 3.5 - r.i * 0.9)))));   // pulso que avanza hacia la sala 4
    tHearts.forEach((o) => {
      o.y += o.sp * dt; if (o.y > 2.3) o.y = 0.6;
      o.m.position.set(o.x + Math.sin(t * 0.8 + o.ph) * 0.25, o.y, o.z); o.m.rotation.y = t * 0.9 + o.ph;
    });

    // Sala 4: nubes que flotan, corazones que se mecen, mariposas en círculos y el corazón provisional que gira
    clouds.forEach((o) => (o.c.position.y = o.y + Math.sin(t * 0.6 + o.i * 1.7) * 0.08));
    garlands.forEach((o) => { o.h.rotation.z = Math.sin(t * 1.2 + o.i) * 0.18; o.h.rotation.y = Math.sin(t * 0.7 + o.i * 0.5) * 0.4; });
    flies.forEach((f) => {
      const a = t * f.w + f.ph;
      f.b.group.position.set(Math.cos(a) * f.R, f.y + Math.sin(t * 1.3 + f.ph) * 0.25, -1 + Math.sin(a) * f.R * 0.8);
      f.b.group.rotation.y = -a + (f.w > 0 ? 0 : Math.PI);
    });

    if (door.opening) hallBase = Math.min(10, hallBase + dt * 4);
    hallLight.intensity = hallBase * lights.mute;
  });

  // Abre el final del pasillo hacia la sala 5 (bosque): quita la pared del fondo y su cartel. El resto del pasillo se queda.
  const openHall = () => {
    abs.remove(hallEnd.mesh, hallSign);
    const i = ctx.colliders.indexOf(hallEnd.col); if (i >= 0) ctx.colliders.splice(i, 1);
  };

  return { ...room, door, lights, openHall };
}

// ============================================================================================================
// ACERTIJOS DE LA SALA — Acertijos de la Habitación 4 (Lover). Se crea desde roomlover.js con createLoverPuzzle(ctx, env).
//
// ACERTIJO 1 · "El arcoíris de corazones"
//   7 corazones de cristal pastel están escondidos por la sala. Se llevan de a uno (como los objetos de Fearless)
//   y se colocan en el altar del arcoíris (7 ranuras). El orden correcto es el de los arcoíris pintados en las paredes:
//   de adentro hacia afuera (rojo, naranja, amarillo, verde, celeste, añil, violeta). También se acepta al revés.
// ACERTIJO 2 · "El cofre de las eras"
//   Pista del cofre: "Deja que el color de tu progreso abra el cofre". Cuatro botones en forma de corazón (uno por era, con su
//   nombre debajo) que ciclan entre dorado, celeste y rosa. La clave son los colores de cada era, en orden:
//   Fearless (dorado), 1989 (celeste), Reputation (dorado) y Lover (rosa). Esos mismos colores aparecen junto a cada objeto
//   en el inventario del HUD (ui.js), en los medallones del hall y en las placas de las vitrinas.
// Al abrirse el cofre sale de él el corazón premio y, cuando el arcoíris también está completo, vuela hasta el pedestal central.
// El corazón amarillo está bajo un cojín del sofá: hay que "buscar" con E y aparece sobre el sofá (el otro cojín está vacío).
// EASTER EGG: cuando el corazón premio se posa en el pedestal, dentro del cofre abierto aparece un toca discos secreto (E para poner el disco).
// ============================================================================================================
const NOTES = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77];               // una nota por color del arcoíris
const COLOR_NAMES = ['rojo pastel', 'naranja', 'amarillo', 'verde', 'celeste', 'añil', 'violeta'];

// Colores del cofre (mismos hex que ERAS en intro.js y que ITEMS en ui.js). Orden del ciclo de cada botón: dorado -> celeste -> rosa.
const ERA_CYCLE = [0xffc83d, 0x2de2ff, 0xff8fc8];
const BTN_NOTES = [523.25, 659.25, 783.99];
const CHEST_SOLUTION = [0, 1, 0, 2];                                                // Fearless dorado, 1989 celeste, Reputation dorado, Lover rosa
const CHEST_LABELS = ['Fearless', '1989', 'Reputation', 'Lover'];

// NOTA: las paredes están centradas en ±6 con 0.4 m de grosor, así que su cara interior está en ±5.8.
// Todo lo que se apoye en una pared debe quedar por dentro de ±5.8 (si no, queda enterrado y no se ve).
// Escondites de los 7 corazones (coordenadas locales de la sala; c = índice de color en el arcoíris).
const HIDING = [
  { c: 2, p: null, prop: 'sofa' },                   // amarillo: bajo un cojín del sofá (aparece al buscar; su posición se calcula)
  { c: 5, p: [4.4, 0.84, 3.9], prop: 'table' },      // en una mesita
  { c: 0, p: [-3.0, 2.6, -2.5], prop: 'hang' },      // colgando de una nube (hay que mirar arriba)
  { c: 6, p: [5.25, 0.3, -2.1], prop: 'stand' },     // al pie del arcoíris este
  { c: 3, p: [-5.25, 0.3, -2.1], prop: 'stand' },    // al pie del arcoíris oeste
  { c: 1, p: [-5.55, 1.6, -4.2], prop: 'shelf' },    // en un estante de la pared oeste
  { c: 4, p: [4.9, 0.62, -3.7], prop: 'pouf' },      // sobre un puf
];
const ALT = { x: -3.8, z: -5.5 };                    // altar del arcoíris (pared norte, a la izquierda de la puerta)
const CHEST = { x: 3.9, z: -5.4 };                   // cofre de las eras (pared norte, a la derecha de la puerta)
const PED = { x: 0, z: -1.0 };                        // pedestal central
const ease = (k) => 1 - Math.pow(1 - k, 3);

function createLoverPuzzle(ctx, env) {
  const { g, half, mat, colBox, heartGeo, heartMat, makeGlow, rainbowCols, rainbowMeshes, neon, pinkDark, sofa, cushionLilac, cushionBlue, onSolved } = env;
  sofa.updateMatrix();
  const sofaSpot = new THREE.Vector3(0.5, 0.7, -0.12).applyMatrix4(sofa.matrix).toArray();   // sobre el asiento, donde estaba el cojín lila (coordenadas de la sala)
  const done = { rainbow: false, chest: false };
  const noRay = (o) => { o.raycast = () => {}; return o; };                      // los destellos no deben bloquear la mira
  const hitBox = (w, h, d, x, y, z) => {                                         // caja invisible que facilita apuntar
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false })); m.position.set(x, y, z); return m;
  };
  const plate = (lines, w, h, x, y, z) => {                                      // placa de texto (varias líneas)
    const px = 800, py = Math.round(800 * h / w);
    const tex = canvasTex(px, py, (c) => {
      c.fillStyle = '#fff1f7'; c.fillRect(0, 0, px, py);
      c.strokeStyle = '#ff8fc8'; c.lineWidth = 8; c.strokeRect(8, 8, px - 16, py - 16);
      c.fillStyle = '#9a2a62'; c.font = 'italic 38px Georgia'; c.textAlign = 'center'; c.textBaseline = 'middle';
      lines.forEach((l, i) => c.fillText(l, px / 2, py / 2 + (i - (lines.length - 1) / 2) * 48));
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
    m.position.set(x, y, z); g.add(m); return m;
  };

  // ================= Pedestal central + corazón final (aparece al resolver los DOS acertijos) =================
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.9, 24), mat(0xfff5fa, { roughness: 0.3, emissive: 0x403038 })); ped.position.set(PED.x, 0.45, PED.z); g.add(ped);
  const pedRing = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.03, 24), new THREE.MeshBasicMaterial({ color: neon(pinkDark, 0.5) })); pedRing.position.set(PED.x, 0.9, PED.z); g.add(pedRing);
  colBox(PED.x - 0.55, PED.x + 0.55, PED.z - 0.55, PED.z + 0.55);
  const finalHeart = new THREE.Group(); finalHeart.position.set(CHEST.x, 0.85, CHEST.z); finalHeart.visible = false; g.add(finalHeart);
  const fhMesh = new THREE.Mesh(heartGeo, heartMat(0xff4f9a)); fhMesh.scale.setScalar(0.75); finalHeart.add(fhMesh, makeGlow(0xff7ab8, 1.6));
  // Estados del corazón premio: hidden -> emerge (sale del cofre) -> wait (espera sobre el cofre hasta que el arcoíris esté completo) -> fly -> landed
  let prize = 'hidden', prizeT = 0, ready = false;
  const flyFrom = new THREE.Vector3(), flyMid = new THREE.Vector3(), flyTo = new THREE.Vector3(PED.x, 1.6, PED.z), flyP = new THREE.Vector3();
  ctx.interaction.add(finalHeart, {
    prompt: () => 'Presiona E para recoger el corazón.',
    enabled: () => finalHeart.visible && ready,
    onInteract: () => {
      finalHeart.visible = false; ctx.audio.reward(); ctx.collect('heart'); onSolved(); ctx.game.solved++;
      ctx.ui.toast('Has recuperado el recuerdo de Lover.', 5000);
    },
  });

  function completePart(kind) {
    done[kind] = true;
    if (done.rainbow && done.chest) { if (prize === 'wait') startFlight(); return; }   // si el corazón aún está saliendo del cofre, despega al terminar de salir
    if (kind === 'rainbow') ctx.ui.toast('El arcoíris se ilumina... pero el cofre sigue cerrado. Falta abrirlo con los colores de tu progreso.', 5500);
    else ctx.ui.toast('Del cofre emerge un corazón brillante... pero el arcoíris aún está incompleto. El corazón espera.', 5500);
  }
  function startFlight() {                                                       // el corazón premio vuela del cofre al pedestal central
    prize = 'fly'; prizeT = 0; flyFrom.copy(finalHeart.position);
    flyMid.set((flyFrom.x + flyTo.x) / 2, Math.max(flyFrom.y, flyTo.y) + 3.2, (flyFrom.z + flyTo.z) / 2);
    ctx.fx.bloom = true; ctx.audio.success();
    ctx.ui.toast('El arcoíris y los recuerdos se unen... el corazón vuela hasta el altar del centro.', 5000);
  }

  // ================= ACERTIJO 1: el arcoíris de corazones =================
  let held = null, wrongUntil = 0, waveT = -1, now = 0, hinted = false;
  const sayHeld = () => ctx.ui.setHeld(held ? `Corazón ${COLOR_NAMES[held.c]}` : '');

  // Altar con 7 ranuras
  const altar = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.9, 0.6), mat(0xfff5fa, { roughness: 0.3, emissive: 0x403038 })); altar.position.set(ALT.x, 0.45, ALT.z); g.add(altar);
  const altarTop = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.05, 0.66), mat(0xffc2dc, { roughness: 0.3, emissive: 0x6a2a48 })); altarTop.position.set(ALT.x, 0.925, ALT.z); g.add(altarTop);
  colBox(ALT.x - 1.95, ALT.x + 1.95, -half, ALT.z + 0.35);
  plate(['Cada color tiene', 'su lugar en el cielo.'], 2.4, 0.7, ALT.x, 1.75, -half + 0.22);

  const slots = Array.from({ length: 7 }, (_, i) => {
    const x = ALT.x + (i - 3) * 0.5, y = 0.95, z = ALT.z;
    const grp = new THREE.Group(); grp.position.set(x, y, z); g.add(grp);
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.03, 20), mat(0xe6dce2, { roughness: 0.2, emissive: 0x302a2e }));
    grp.add(dish, hitBox(0.44, 0.5, 0.44, 0, 0.2, 0));
    const slot = { i, x, y, z, grp, heart: null };
    ctx.interaction.add(grp, {
      prompt: () => (held ? (slot.heart ? 'Presiona E para cambiar los corazones.' : 'Presiona E para colocar el corazón.') : slot.heart ? 'Presiona E para retirar el corazón.' : 'Una ranura vacía.'),
      enabled: () => !done.rainbow,
      onInteract: () => onSlot(slot),
    });
    return slot;
  });

  function onSlot(slot) {
    if (!held && !slot.heart) { ctx.ui.toast('Necesitas un corazón de cristal para esta ranura.', 2500); return; }
    const incoming = held, outgoing = slot.heart;
    if (outgoing) { outgoing.state = 'held'; outgoing.slot = null; slot.heart = null; }
    if (incoming) {                                                              // colocar el que llevaba en la mano
      slot.heart = incoming; incoming.state = 'slot'; incoming.slot = slot;
      incoming.group.visible = true; incoming.group.position.set(slot.x, slot.y + 0.2, slot.z);
      ctx.audio.note(NOTES[incoming.c]);
    } else ctx.audio.chime();
    held = outgoing || null;
    if (held) held.group.visible = false;
    sayHeld();
    checkRainbow();
  }

  function checkRainbow() {
    const ids = slots.map((s) => (s.heart ? s.heart.c : -1));
    if (ids.includes(-1)) return;
    const ok = ids.every((c, i) => c === i) || ids.every((c, i) => c === 6 - i);
    if (!ok) {
      wrongUntil = now + 1.3; ctx.audio.error();
      ctx.ui.toast('Los colores no están en su lugar... mira los arcoíris de las paredes.', 4500);
      return;
    }
    waveT = 0;
    ctx.audio.chord();
    NOTES.forEach((f, i) => setTimeout(() => ctx.audio.note(f), 250 + i * 160));
    completePart('rainbow');
  }

  // Corazones de cristal y sus escondites
  const hearts = HIDING.map((h) => {
    const [x, y, z] = h.prop === 'sofa' ? sofaSpot : h.p;
    const group = new THREE.Group(); group.position.set(x, y, z); g.add(group);
    const mesh = new THREE.Mesh(heartGeo, heartMat(rainbowCols[h.c])); mesh.scale.setScalar(0.3);
    const glow = makeGlow(rainbowCols[h.c], 0.9); glow.material.opacity = 0.7;
    group.add(mesh, glow);
    buildProp(h.prop, x, y, z);
    const heart = { c: h.c, group, mesh, glow, base: [x, y, z], state: h.prop === 'sofa' ? 'hidden' : 'home', slot: null, pop: 1 };
    if (heart.state === 'hidden') group.visible = false;                        // oculto hasta que el jugador busque bajo el cojín
    ctx.interaction.add(group, {
      prompt: () => (held ? 'Ya llevas un corazón.' : 'Presiona E para recoger el corazón.'),
      enabled: () => heart.state === 'home',
      onInteract: () => {
        if (held) { ctx.ui.toast('Ya llevas un corazón. Déjalo primero en el altar del arcoíris.', 3000); return; }
        held = heart; heart.state = 'held'; group.visible = false;
        ctx.audio.note(NOTES[heart.c]); sayHeld();
        ctx.ui.toast(`Corazón ${COLOR_NAMES[heart.c]}. Llévalo al altar del arcoíris.`, 3500);
      },
    });
    return heart;
  });

  // ---- Buscar bajo el cojín del sofá: el cojín lila se echa hacia adelante y aparece el corazón amarillo ----
  let searched = false, cushionT = -1;
  cushionLilac.add(hitBox(0.75, 0.7, 0.5, 0, 0, 0.1)); cushionBlue.add(hitBox(0.75, 0.7, 0.5, 0, 0, 0.1));   // zona extra para apuntar con la mira
  ctx.interaction.add(cushionLilac, {
    prompt: () => 'Presiona E para buscar.',
    enabled: () => !searched,
    onInteract: () => {
      searched = true; cushionT = 0; ctx.audio.swoosh();
      ctx.ui.toast('Levantas el cojín...', 1800);
      setTimeout(() => {
        const yh = hearts.find((x) => x.state === 'hidden'); if (!yh) return;
        yh.state = 'home'; yh.pop = 0; yh.group.visible = true; ctx.audio.reward();
        ctx.particles.burst(g.localToWorld(new THREE.Vector3(...yh.base)), 25, { speed: 0.8, up: 1.0 });
        ctx.ui.toast('¡Había un corazón de cristal escondido!', 3000);
      }, 650);
    },
  });
  ctx.interaction.add(cushionBlue, {
    prompt: () => 'Presiona E para buscar.',
    onInteract: () => { ctx.audio.swoosh(); ctx.ui.toast(searched ? 'Aquí no hay nada... el corazón ya lo encontraste.' : 'Buscas bajo este cojín, pero solo hay pelusa rosa. Prueba con el otro.', 3500); },
  });

  function buildProp(kind, x, y, z) {
    if (kind === 'table') {                                                      // mesita redonda
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 24), mat(0xfff5fa, { roughness: 0.3, emissive: 0x403038 })); top.position.set(x, 0.64, z);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.62, 12), mat(0xffc2dc, { emissive: 0x4a2a38 })); stem.position.set(x, 0.31, z);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.03, 20), mat(0xffc2dc, { emissive: 0x4a2a38 })); foot.position.set(x, 0.015, z);
      g.add(top, stem, foot); colBox(x - 0.4, x + 0.4, z - 0.4, z + 0.4);
    } else if (kind === 'stand') {                                               // peana bajo, al pie del arcoíris
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.12, 16), mat(0xfff5fa, { roughness: 0.3, emissive: 0x403038 })); s.position.set(x, 0.06, z); g.add(s);
    } else if (kind === 'shelf') {                                               // estante en la pared oeste
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 1.2), mat(0xfff5fa, { roughness: 0.3, emissive: 0x403038 })); s.position.set(-half + 0.46, y - 0.2, z); g.add(s);
      colBox(-half, -half + 0.75, z - 0.6, z + 0.6);
    } else if (kind === 'pouf') {                                                // puf redondo
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.4, 24), mat(0xffb3d9, { roughness: 0.9, emissive: 0x5a2a42 })); p.position.set(x, 0.2, z);
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.07, 10, 28), mat(0xffc2dc, { roughness: 0.9, emissive: 0x5a2a42 })); t.rotation.x = Math.PI / 2; t.position.set(x, 0.42, z);
      g.add(p, t); colBox(x - 0.45, x + 0.45, z - 0.45, z + 0.45);
    } else if (kind === 'hang') {                                                // hilo que sube hasta la nube
      const len = 0.5, s = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, len, 6), new THREE.MeshBasicMaterial({ color: 0xffd0e4 })); s.position.set(x, y + 0.15 + len / 2, z); g.add(s);
    }
  }

  // ================= ACERTIJO 2: el cofre de las eras =================
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.8, 0.8), mat(0xffd9e8, { roughness: 0.4, emissive: 0x5a2a42 })); body.position.set(CHEST.x, 0.4, CHEST.z); g.add(body);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.5, 0.03), mat(0x6a2a48, { roughness: 0.6, emissive: 0x2a1020 })); panel.position.set(CHEST.x, 0.4, CHEST.z + 0.41); g.add(panel);
  const hinge = new THREE.Group(); hinge.position.set(CHEST.x, 0.8, CHEST.z - 0.4); g.add(hinge);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.14, 0.84), mat(0xffc2dc, { roughness: 0.35, emissive: 0x6a2a48 })); lid.position.set(0, 0.07, 0.42); hinge.add(lid);
  const chestGlow = makeGlow(0xffd0e4, 2.2); chestGlow.position.set(CHEST.x, 1.0, CHEST.z); chestGlow.material.opacity = 0; chestGlow.visible = false; noRay(chestGlow); g.add(chestGlow);
  colBox(CHEST.x - 1.0, CHEST.x + 1.0, -half, CHEST.z + 0.45);
  plate(['Deja que el color de tu progreso', 'abra el cofre.'], 3.2, 0.7, CHEST.x, 1.75, -half + 0.22);

  const buttons = Array.from({ length: 4 }, (_, i) => {
    const x = CHEST.x + (i - 1.5) * 0.42, y = 0.5, z = CHEST.z + 0.45;
    const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.1), new THREE.MeshBasicMaterial({     // nombre de la era bajo cada botón
      transparent: true, map: canvasTex(256, 64, (c) => { c.fillStyle = '#ffe9f3'; c.font = '30px Georgia'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(CHEST_LABELS[i], 128, 32); }) }));
    lbl.position.set(x, 0.23, CHEST.z + 0.43); g.add(lbl);
    const m = new THREE.MeshStandardMaterial({ color: 0x3a2a33, roughness: 0.3, emissive: 0x000000 });
    const grp = new THREE.Group(); grp.position.set(x, y, z); g.add(grp);
    const mesh = new THREE.Mesh(heartGeo, m); mesh.scale.setScalar(0.27); grp.add(mesh, hitBox(0.36, 0.36, 0.2, 0, 0, 0.05));
    const btn = { i, idx: -1, m };
    ctx.interaction.add(grp, {
      prompt: () => 'Presiona E para cambiar el color.',
      enabled: () => !done.chest,
      onInteract: () => pressButton(btn),
    });
    return btn;
  });

  function pressButton(btn) {
    btn.idx = btn.idx < 0 ? 0 : (btn.idx + 1) % ERA_CYCLE.length;
    const col = new THREE.Color(ERA_CYCLE[btn.idx]);
    btn.m.color.copy(col); btn.m.emissive.copy(col).multiplyScalar(0.5);
    ctx.audio.note(BTN_NOTES[btn.idx]);
    if (buttons.some((b) => b.idx < 0)) return;
    if (buttons.every((b, i) => b.idx === CHEST_SOLUTION[i])) { openChest(); return; }
    ctx.audio.error(); ctx.ui.toast('Esos no son los colores de tu progreso. Mira tu inventario.', 3500);
  }

  let lidTarget = 0;
  function openChest() {
    lidTarget = -1.15; chestGlow.visible = true;
    ctx.audio.reward();
    ctx.particles.burst(g.localToWorld(new THREE.Vector3(CHEST.x, 1.0, CHEST.z)), 40, { speed: 1.0, up: 1.6 });
    prize = 'emerge'; prizeT = 0; finalHeart.position.set(CHEST.x, 0.85, CHEST.z); finalHeart.scale.setScalar(0.01); finalHeart.visible = true;   // el corazón premio sale del cofre
    completePart('chest');
  }

  // ================= EASTER EGG: toca discos escondido dentro del cofre =================
  // Aparece cuando el corazón premio ya voló al pedestal (prize === 'landed'): el cofre queda abierto y vacío... salvo por el disco.
  const rpGroup = new THREE.Group(); rpGroup.position.set(CHEST.x, 0.81, CHEST.z + 0.02); rpGroup.visible = false; rpGroup.scale.setScalar(0.01); g.add(rpGroup);
  const lining = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.02, 0.62), mat(0xc23a7a, { roughness: 1, emissive: 0x4a1030 })); lining.position.y = -0.005;   // forro de terciopelo
  const rpBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.4), mat(0xfff5fa, { roughness: 0.3, emissive: 0x403038 })); rpBase.position.y = 0.045;
  addTube(rpGroup, 0.51, 0.015, 0.015, pinkDark, 0, 0.088, 0.2, 2); addTube(rpGroup, 0.51, 0.015, 0.015, pinkDark, 0, 0.088, -0.2, 2);   // filetes luminosos
  rpGroup.add(lining, rpBase);
  const platter = new THREE.Group(); platter.position.y = 0.1; rpGroup.add(platter);
  platter.add(
    new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.012, 32), mat(0x050508, { roughness: 0.25, metalness: 0.6 })),
    new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.014, 20), mat(0xff4f9a, { emissive: 0x6a1a44 })),
    new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.014, 0.01), mat(0x2a2a44)),               // marca para ver que gira
  );
  const rpArm = new THREE.Group(); rpArm.position.set(0.19, 0.11, -0.14); rpGroup.add(rpArm);
  const armBar = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.014, 0.22), mat(0xcfd2e0, { metalness: 0.7 })); armBar.position.z = 0.1; rpArm.add(armBar);
  const rpGlow = makeGlow(0xffb3d9, 0.9); rpGlow.position.y = 0.2; rpGlow.visible = false; noRay(rpGlow); rpGroup.add(rpGlow);
  rpGroup.add(hitBox(0.7, 0.4, 0.55, 0, 0.18, 0));
  let rpShown = false, rpT = 0, fileMissing = false;
  ctx.interaction.add(rpGroup, {
    prompt: () => (ctx.audio.trackPlaying() ? 'Presiona E para detener el disco.' : 'Presiona E para poner el disco.'),
    enabled: () => rpShown && rpT > 0.9,
    onInteract: async () => {
      if (ctx.audio.trackPlaying()) { ctx.audio.stopTrack(); return; }
      let ok = false;
      if (!fileMissing) for (const u of RECORD.urls) { ok = await ctx.audio.playTrack(u); if (ok) break; }
      if (ok) { ctx.ui.toast(`♪ ${RECORD.title}`, 4000); ctx.secrets?.add('lover-record', { icon: 'vinyl', era: 'Lover', title: RECORD.title }); return; }
      console.warn('[Lover] no se pudo cargar el audio. Rutas probadas:', RECORD.urls, '— revisa el nombre exacto del archivo en assets/audio.');
      fileMissing = true;                                 // no insistir con un archivo que no existe
      ctx.audio.playSynth(); ctx.ui.toast(`♪ ${RECORD.fallbackTitle}`, 4000);
      ctx.secrets?.add('lover-record', { icon: 'vinyl', era: 'Lover', title: RECORD.fallbackTitle });
    },
  });
  function showRecord() {
    rpShown = true; rpGroup.visible = true; rpT = 0;
    ctx.particles.burst(g.localToWorld(new THREE.Vector3(CHEST.x, 1.0, CHEST.z)), 30, { speed: 0.8, up: 1.2 });
    setTimeout(() => ctx.ui.toast('Dentro del cofre abierto aún queda algo...', 4500), 4700);   // después del aviso del corazón
  }

  // ================= Animación =================
  ctx.updaters.push((dt, t) => {
    now = t;
    // aviso al entrar a la sala por primera vez
    if (!hinted) {
      const p = ctx.camera.position;
      if (Math.abs(p.x) < 5.3 && Math.abs(p.z - g.position.z) < 5.3) {
        hinted = true;
        ctx.ui.toast('Siete corazones de cristal se esconden por la sala... y el cofre se abre con los colores de tu progreso.', 6500);
      }
    }
    // corazones: flotan donde están escondidos; los colocados en el altar brillan y giran despacio
    const flicker = now < wrongUntil && Math.sin(now * 45) > 0;
    const wave = waveT >= 0 ? (waveT += dt) : 0;
    hearts.forEach((h) => {
      if (h.state === 'home') {
        h.mesh.rotation.y += dt * 0.9;
        if (h.pop < 1) { h.pop = Math.min(1, h.pop + dt / 0.7); h.mesh.scale.setScalar(0.3 * Math.max(0.01, ease(h.pop))); }   // el corazón encontrado "crece" al aparecer
        h.group.position.y = h.base[1] + Math.sin(t * 2 + h.c) * 0.025 + 0.12 * (1 - ease(h.pop));
        h.glow.material.opacity = 0.45 + 0.25 * Math.sin(t * 2.5 + h.c * 1.3);
      } else if (h.state === 'slot') {
        h.mesh.rotation.y += dt * 0.5;
        let k = 1, s = 0.3;
        if (waveT >= 0) { const p = clamp(wave * 1.8 - h.c * 0.28, 0, 1), pulse = Math.sin(p * Math.PI); k = 1.6 + 1.6 * pulse; s = 0.3 * (1 + 0.35 * pulse); }
        else if (flicker) k = 0.15;
        h.mesh.material.emissiveIntensity = k; h.mesh.scale.setScalar(s);
        h.glow.material.opacity = waveT >= 0 ? 0.8 : 0.35;
      }
    });
    if (waveT >= 0) {                                                            // el arcoíris de las paredes se ilumina
      const k = 1 + 1.1 * Math.min(1, waveT / 1.5) + 0.2 * Math.sin(t * 2);
      rainbowMeshes.forEach((m) => { m.material.emissiveIntensity = k; });
    }
    // cojín del sofá: se echa hacia adelante sobre el asiento
    if (cushionT >= 0 && cushionT < 1) {
      cushionT = Math.min(1, cushionT + dt / 0.9); const k = ease(cushionT);
      cushionLilac.position.set(0.5, 0.75 - 0.155 * k + Math.sin(k * Math.PI) * 0.12, -0.2 + 0.42 * k);
      cushionLilac.rotation.x = k * Math.PI / 2;
    }
    // tapa del cofre y su luz
    hinge.rotation.x += (lidTarget - hinge.rotation.x) * Math.min(1, dt * 3);
    if (chestGlow.visible) chestGlow.material.opacity = Math.min(0.8, chestGlow.material.opacity + dt * 0.5) * (0.85 + 0.15 * Math.sin(t * 3));
    // corazón premio: sale del cofre, espera si hace falta, vuela en arco hasta el pedestal y se posa
    if (prize === 'emerge') {
      prizeT += dt; const k = clamp(prizeT / 1.6, 0, 1), e = ease(k);
      finalHeart.position.set(CHEST.x, 0.85 + 0.95 * e, CHEST.z); finalHeart.scale.setScalar(Math.max(0.01, e)); finalHeart.rotation.y += dt * 2.5;
      if (k >= 1) { if (done.rainbow) startFlight(); else prize = 'wait'; }
    } else if (prize === 'wait') {
      finalHeart.position.y = 1.8 + Math.sin(t * 2.2) * 0.07; finalHeart.rotation.y += dt * 1.5;
    } else if (prize === 'fly') {
      prizeT += dt; const k = clamp(prizeT / 3.2, 0, 1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      flyP.copy(flyFrom).multiplyScalar((1 - e) * (1 - e)).addScaledVector(flyMid, 2 * (1 - e) * e).addScaledVector(flyTo, e * e);   // curva de Bézier
      finalHeart.position.copy(flyP); finalHeart.rotation.y += dt * (3 + 5 * Math.sin(k * Math.PI));
      if (Math.random() < 0.8) ctx.particles.burst(g.localToWorld(flyP.clone()), 2, { speed: 0.25, up: 0.3 });   // estela de partículas
      if (k >= 1) {
        prize = 'landed'; ready = true;
        pedRing.material.color.copy(neon(pinkDark, 1.8));
        ctx.audio.chime(); ctx.particles.burst(g.localToWorld(flyTo.clone()), 40, { speed: 1.0, up: 1.2 });
        ctx.ui.toast('El corazón se posa en el altar. Presiona E para recogerlo.', 4500);
        showRecord();                                                            // easter egg: aparece el toca discos dentro del cofre
      }
    } else if (prize === 'landed') {
      finalHeart.position.y = 1.6 + Math.sin(t * 2) * 0.06; finalHeart.rotation.y += dt * 1.2;
    }
    // easter egg: el toca discos "sale" del cofre; el disco gira y brilla mientras suena la canción
    if (rpShown) {
      if (rpT < 1) { rpT = Math.min(1, rpT + dt / 1.0); rpGroup.scale.setScalar(Math.max(0.01, ease(rpT))); }
      const playing = ctx.audio.trackPlaying();
      platter.rotation.y += playing ? dt * 3.5 : 0;
      rpArm.rotation.y += ((playing ? 0.5 : 0) - rpArm.rotation.y) * Math.min(1, dt * 4);
      rpGlow.visible = playing; rpGlow.material.opacity = 0.6 + 0.4 * Math.sin(t * 8);
      if (playing && Math.random() < 0.05) ctx.particles.burst(g.localToWorld(new THREE.Vector3(CHEST.x, 1.15, CHEST.z)), 2, { speed: 0.3, up: 0.8 });
    }
  });

  return { done, hearts, slots, buttons, finalHeart };
}