// roomReputation.js — Habitación 3: Reputation. Negro, rojo y plata. Serpientes, espejos y poca luz.
//
// Acertijo: 6 espejos casi idénticos (2 por pared: oeste, este y norte). Solo uno es el verdadero.
// Cada espejo lleva un pequeño emblema (ojo, corona o llave) sobre el marco, y cada emblema aparece dos veces.
// Dos pistas visuales, que hay que combinar:
//   1) la serpiente de plata del centro mira hacia UNA PARED  -> deja 2 espejos
//   2) un símbolo rojo brilla en el SUELO (y está grabado en el pedestal) -> deja 2 espejos con ese emblema
// Solo un espejo cumple las dos cosas.
// Incorrecto: el espejo parpadea en rojo, se agrieta, tiembla y la sala se tiñe de rojo un instante.
// Correcto: emerge una serpiente de plata coleccionable y la puerta se desbloquea.
import * as THREE from 'three';
import { createRoom, createDoor, addWall, canvasTex, makeTextTexture, DOOR_H } from './rooms.js';
import { addBox, addTube, neon, makeSign } from './room1989.js';
import { createGlitter } from './glitter.js';

const TAU = Math.PI * 2;
const CZ = -28;                                           // centro de la sala en Z (sala 2 = -14, sala 1 = 0)
const RED = 0xff1030, SILVER = 0xd5d9e6;
const clamp = THREE.MathUtils.clamp;

// ---------- Configuración del acertijo (se puede cambiar) ----------
// wall: W/E/N · x o z = posición sobre la pared · emblem: eye | crown | key
const MIRRORS = [
  { wall: 'W', z: 2.2, emblem: 'crown' }, { wall: 'W', z: -2.2, emblem: 'key' },
  { wall: 'E', z: 2.2, emblem: 'eye' },   { wall: 'E', z: -2.2, emblem: 'crown' },
  { wall: 'N', x: -3.2, emblem: 'eye' },  { wall: 'N', x: 3.2, emblem: 'key' },
];
const ANSWER = 2;                                         // índice del espejo correcto (este · ojo)
// Para cada pared: posición del espejo, giro, y normal (hacia dónde "mira" el espejo dentro de la sala).
const WALLS = {
  W: { at: (m) => [-4.74, m.z], ry: Math.PI / 2, n: [1, 0] },
  E: { at: (m) => [4.74, m.z], ry: -Math.PI / 2, n: [-1, 0] },
  N: { at: (m) => [m.x, -4.74], ry: 0, n: [0, 1] },
};

// ================= Texturas =================
function makeScaleTexture() {                             // pared: escamas de serpiente casi invisibles
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#0c0c10'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(190,195,215,.09)'; g.lineWidth = 2;
    for (let y = 0, r = 0; y < h + 24; y += 14, r++) for (let x = (r % 2) * 16; x < w + 32; x += 32) {
      g.beginPath(); g.arc(x, y, 16, 0, Math.PI); g.stroke();
      if (Math.random() < 0.05) { g.fillStyle = 'rgba(140,0,20,.18)'; g.beginPath(); g.arc(x, y, 16, 0, Math.PI); g.fill(); }
    }
  });
}
function makeFloorTexture() {                             // piso negro con rejilla plateada y grietas rojas
  const t = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#07070a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(200,205,225,.10)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
    g.strokeStyle = 'rgba(200,0,30,.35)'; g.lineWidth = 2;
    for (let k = 0; k < 6; k++) {
      let x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y);
      for (let i = 0; i < 5; i++) { x += (Math.random() - 0.5) * 70; y += (Math.random() - 0.5) * 70; g.lineTo(x, y); }
      g.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function makeGlassTexture() {                             // el "reflejo": igual en todos los espejos
  return canvasTex(128, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#2a2b36'); gr.addColorStop(0.5, '#0d0d14'); gr.addColorStop(1, '#1d1e28');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.07)'; [[20, 26], [60, 14]].forEach(([x, bw]) => { g.save(); g.transform(1, 0, -0.5, 1, 0, 0); g.fillRect(x + 60, 0, bw, h); g.restore(); });
  });
}
function makeCrackTexture() {                             // grietas rojas que aparecen al fallar
  return canvasTex(128, 256, (g, w, h) => {
    g.strokeStyle = '#ff3040'; g.lineWidth = 3; g.lineCap = 'round'; g.shadowColor = '#ff0020'; g.shadowBlur = 8;
    const cx = 40 + Math.random() * 50, cy = 80 + Math.random() * 90;
    for (let k = 0; k < 9; k++) {
      let x = cx, y = cy, a = (k / 9) * TAU + Math.random() * 0.4; g.beginPath(); g.moveTo(x, y);
      for (let i = 0; i < 5; i++) { a += (Math.random() - 0.5) * 0.7; x += Math.cos(a) * 24; y += Math.sin(a) * 24; g.lineTo(x, y); }
      g.stroke();
    }
  });
}
function drawEmblem(g, type, color, glow = 0) {           // emblemas dibujados con formas (128x128)
  g.strokeStyle = g.fillStyle = color; g.lineWidth = 8; g.lineCap = g.lineJoin = 'round';
  if (glow) { g.shadowColor = color; g.shadowBlur = glow; }
  if (type === 'eye') {
    g.beginPath(); g.moveTo(14, 64); g.quadraticCurveTo(64, 14, 114, 64); g.quadraticCurveTo(64, 114, 14, 64); g.stroke();
    g.beginPath(); g.arc(64, 64, 17, 0, TAU); g.stroke(); g.beginPath(); g.arc(64, 64, 6, 0, TAU); g.fill();
  } else if (type === 'crown') {
    g.beginPath(); g.moveTo(22, 94); g.lineTo(18, 40); g.lineTo(46, 66); g.lineTo(64, 30); g.lineTo(82, 66); g.lineTo(110, 40); g.lineTo(106, 94); g.closePath(); g.stroke();
  } else {                                                // key
    g.beginPath(); g.arc(36, 64, 20, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(56, 64); g.lineTo(114, 64); g.moveTo(94, 64); g.lineTo(94, 84); g.moveTo(110, 64); g.lineTo(110, 80); g.stroke();
  }
}
const emblemTex = (type, color, { bg = null, glow = 0 } = {}) => canvasTex(128, 128, (g, w, h) => {
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  drawEmblem(g, type, color, glow);
});

// ================= Serpientes =================
function makeHead(r, bodyMat, eyeMat) {                   // cabeza que mira hacia +X
  const h = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), bodyMat); skull.scale.set(1.7, 0.8, 1); h.add(skull);
  [1, -1].forEach((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(r * 0.22, 8, 6), eyeMat); e.position.set(r * 0.7, r * 0.35, s * r * 0.5); h.add(e); });
  addBox(h, r * 1.2, r * 0.06, r * 0.12, eyeMat, r * 2.2, -r * 0.1, 0);
  [1, -1].forEach((s) => { const f = addBox(h, r * 0.4, r * 0.05, r * 0.08, eyeMat, r * 2.9, -r * 0.1, s * r * 0.14); f.rotation.y = s * 0.5; });
  return h;
}
function makeWallSnake(len, amp, waves, r, mats) {        // serpiente ondulante para decorar paredes (cabeza en +X)
  const pts = [];
  for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push(new THREE.Vector3(-len / 2 + u * len, Math.sin(u * TAU * waves) * amp, 0)); }
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, r, 8, false), mats.body));
  const head = makeHead(r * 1.7, mats.body, mats.eye); head.position.copy(pts[40]); g.add(head);
  return g;
}

// ================= Habitación 3: Reputation =================
export function buildRoomReputation(ctx, room2) {
  const cam = ctx.camera.position;
  const wallMat = new THREE.MeshStandardMaterial({ map: makeScaleTexture(), roughness: 0.6, metalness: 0.3 });
  const floorTex = makeFloorTexture(); floorTex.repeat.set(5, 5);
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.2, metalness: 0.6 });
  const room = createRoom(ctx, { name: 'Habitación 3 — Reputation', z: CZ, wallMat, floorMat, ceilColor: 0x050507, southOpening: 3 });
  const abs = room.group;
  const g = new THREE.Group(); g.position.z = CZ; ctx.scene.add(g);      // contenido en coordenadas locales (norte = -Z)
  const box = (w, h, d, m, x, y, z, p = g) => addBox(p, w, h, d, m, x, y, z);
  const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
  const colBox = (x0, x1, z0, z1) => ctx.colliders.push({ minX: x0, maxX: x1, minZ: CZ + z0, maxZ: CZ + z1 });
  const wp = (x, y, z) => new THREE.Vector3(x, y, z + CZ);

  const silver = mat(SILVER, { metalness: 0.95, roughness: 0.25, emissive: 0x111118 });
  const snakeMats = { body: mat(0x101014, { roughness: 0.35, metalness: 0.7, emissive: 0x1a0004 }), eye: new THREE.MeshBasicMaterial({ color: neon(RED, 2.5) }) };
  const lights = { mute: 1 };                                             // para atenuar esta sala cuando exista la siguiente

  // --- Iluminación tenue: ambiente casi negro + 2 luces rojas + 1 luz plateada sobre la serpiente ---
  const ambient = new THREE.AmbientLight(0x2a1822, 0.5); g.add(ambient);
  const lp = [
    { base: 14, color: RED, red: true, dist: 11, pos: [-3, 3.2, 2] },
    { base: 14, color: RED, red: true, dist: 11, pos: [3, 3.2, -2] },
    { base: 9, color: 0xaab4ff, dist: 8, pos: [0, 3.4, -1] },
  ].map((o) => { o.l = new THREE.PointLight(o.color, o.base, o.dist); o.l.position.set(...o.pos); g.add(o.l); return o; });

  // --- Zócalo plateado y cartel ---
  box(9.6, 0.1, 0.05, silver, 0, 0.3, 4.77); box(0.05, 0.1, 9.6, silver, -4.77, 0.3, 0); box(0.05, 0.1, 9.6, silver, 4.77, 0.3, 0);
  [-3.15, 3.15].forEach((x) => { box(3.3, 0.1, 0.05, silver, x, 0.3, -4.77); box(3.3, 0.1, 0.05, silver, x, 0.3, 4.77); });
  const title = makeSign('REPUTATION', RED, 2.4, 0.45); title.group.position.set(0, 3.6, 4.74); title.group.rotation.y = Math.PI; g.add(title.group);

  // --- Serpientes decorativas (negras, ojos rojos). Miran hacia distintos lados: no son una pista ---
  const decor = [
    { pos: [-4.7, 0.5, 0], ry: -Math.PI / 2, len: 8, amp: 0.18, waves: 3 },        // pared oeste, abajo
    { pos: [4.7, 3.72, 0], ry: Math.PI / 2, len: 8, amp: 0.12, waves: 3.5 },        // pared este, arriba
    { pos: [-3.15, 0.5, -4.7], ry: 0, len: 2.9, amp: 0.1, waves: 2 },               // norte izquierda
    { pos: [3.15, 0.5, -4.7], ry: Math.PI, len: 2.9, amp: 0.1, waves: 2 },          // norte derecha
  ];
  decor.forEach((d) => { const s = makeWallSnake(d.len, d.amp, d.waves, 0.05, snakeMats); s.position.set(...d.pos); s.rotation.y = d.ry; g.add(s); });

  // --- Espejos ---
  const glassTex = makeGlassTexture(), crackTex = makeCrackTexture();
  const emblemPlates = {}; ['eye', 'crown', 'key'].forEach((e) => (emblemPlates[e] = emblemTex(e, '#d5d9e6', { bg: '#0a0a0e' })));
  let now = 0, solved = false, busyUntil = 0, redPop = 0, silverBoost = 1, emergeAt = -1, ready = false;
  const mirrors = MIRRORS.map((m, i) => {
    const W = WALLS[m.wall], [mx, mz] = W.at(m);
    const grp = new THREE.Group(); grp.position.set(mx, 1.9, mz); grp.rotation.y = W.ry; g.add(grp);
    box(1.2, 2.1, 0.04, mat(0x050507), 0, 0, 0, grp);                                          // fondo
    box(1.2, 0.1, 0.08, silver, 0, 1.0, 0.03, grp); box(1.2, 0.1, 0.08, silver, 0, -1.0, 0.03, grp);
    box(0.1, 2.1, 0.08, silver, 0.55, 0, 0.03, grp); box(0.1, 2.1, 0.08, silver, -0.55, 0, 0.03, grp);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.9), new THREE.MeshStandardMaterial({
      map: glassTex, roughness: 0.08, metalness: 0.7, emissive: new THREE.Color(0.07, 0.07, 0.09) }));
    glass.position.z = 0.045; grp.add(glass);
    const crack = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.9), new THREE.MeshBasicMaterial({
      map: crackTex, transparent: true, color: neon(0xffffff, 2), depthWrite: false }));
    crack.position.z = 0.05; crack.visible = false; grp.add(crack);
    box(0.34, 0.34, 0.03, mat(0x050507), 0, 1.4, 0.03, grp);                                   // placa con el emblema
    const emb = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), new THREE.MeshBasicMaterial({ map: emblemPlates[m.emblem] }));
    emb.position.set(0, 1.4, 0.05); grp.add(emb);
    ctx.interaction.add(grp, {
      prompt: () => 'Presiona E para tocar el espejo.',
      enabled: () => !solved && now >= busyUntil,
      onInteract: () => choose(i),
    });
    return { grp, glass, crack, blinkUntil: 0, solved: false, pos: [mx, 1.9, mz], n: W.n };
  });

  // --- Serpiente de plata del centro: su cabeza señala UNA PARED (pista 1) ---
  const ans = MIRRORS[ANSWER], dir = WALLS[ans.wall].n.map((v) => -v);     // hacia la pared del espejo correcto
  const statue = new THREE.Group(); statue.position.set(0, 0, -1.0); g.add(statue);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.6, 24), mat(0x0c0c10, { metalness: 0.8, roughness: 0.3 })); ped.position.y = 0.3; statue.add(ped);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.02, 24), new THREE.MeshBasicMaterial({ color: neon(RED, 1.6) })); ring.position.y = 0.6; statue.add(ring);
  const pedEmblem = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ map: emblemTex(ans.emblem, '#d5d9e6', { glow: 6 }), transparent: true }));
  pedEmblem.position.set(0, 0.3, 0.485); statue.add(pedEmblem);              // el mismo símbolo, grabado al frente del pedestal (pista 2)
  const coil = new THREE.Group(); coil.rotation.y = Math.atan2(-dir[1], dir[0]); statue.add(coil);   // gira para que la cabeza mire a "dir"
  const pts = [];
  for (let i = 0; i <= 22; i++) { const a = i * 0.62, r = 0.26 - i * 0.004; pts.push(new THREE.Vector3(Math.cos(a) * r, 0.66 + i * 0.013, Math.sin(a) * r)); }
  pts.push(new THREE.Vector3(0.1, 1.05, 0.05), new THREE.Vector3(0.04, 1.35, 0), new THREE.Vector3(0.14, 1.58, 0), new THREE.Vector3(0.3, 1.62, 0));
  coil.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 0.045, 8, false), silver));
  const sHead = makeHead(0.075, silver, snakeMats.eye); sHead.position.set(0.34, 1.62, 0); coil.add(sHead);
  colBox(-0.55, 0.55, -1.55, -0.45);
  ctx.interaction.add(statue, {
    prompt: () => 'Presiona E para examinar la serpiente.',
    onInteract: () => ctx.ui.toast('Una serpiente de plata vigila la sala. Sus ojos rojos miran fijamente hacia un solo lugar...', 6000),
  });

  // --- Símbolo rojo en el suelo, cerca de la entrada (pista 2) ---
  const decalMat = new THREE.MeshBasicMaterial({ map: emblemTex(ans.emblem, '#ff2a40', { glow: 14 }), transparent: true, color: neon(0xffffff, 1.3), depthWrite: false });
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), decalMat); decal.rotation.x = -Math.PI / 2; decal.position.set(0, 0.012, 2.0);
  const decalGrp = new THREE.Group(); decalGrp.add(decal); g.add(decalGrp);
  ctx.interaction.add(decalGrp, {
    prompt: () => 'Presiona E para examinar el símbolo.',
    onInteract: () => ctx.ui.toast('Un símbolo brilla débilmente en el suelo. Alguno de los espejos lo lleva grabado sobre su marco...', 6000),
  });

  // --- Serpiente de plata coleccionable (aparece al elegir el espejo correcto) ---
  const mkSilverSnake = () => {
    const grp = new THREE.Group(), p = [];
    for (let i = 0; i <= 30; i++) { const u = i / 30; p.push(new THREE.Vector3(-0.24 + u * 0.48, Math.sin(u * TAU * 1.5) * 0.12, 0)); }
    const body = mat(0xe8ecff, { metalness: 0.95, roughness: 0.2, emissive: 0x444a66 });
    grp.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), 120, 0.03, 8, false), body));
    const h = makeHead(0.05, body, snakeMats.eye); h.position.copy(p[30]); grp.add(h);
    return grp;
  };
  const glowTex = canvasTex(128, 128, (c) => {
    const r = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.3)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = r; c.fillRect(0, 0, 128, 128);
  });
  const makeGlow = (hex, size, op = 1) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(hex), opacity: op, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    s.scale.setScalar(size); return s;
  };
  const snake = mkSilverSnake(); snake.scale.setScalar(1.5); snake.visible = false; snake.add(makeGlow(0xbfc8ff, 0.9));
  const am = mirrors[ANSWER];
  snake.rotation.y = Math.atan2(am.n[0], am.n[1]);                         // el cuerpo en "S" queda paralelo al espejo
  g.add(snake);
  ctx.interaction.add(snake, {
    prompt: () => 'Presiona E para recoger la serpiente plateada.',
    enabled: () => snake.visible && ready,
    onInteract: () => {
      snake.visible = false; ctx.audio.reward(); ctx.collect('snake');
      ctx.ui.toast('Has recuperado el recuerdo de Reputation.', 5000);
    },
  });

  // --- Efectos misteriosos: niebla roja a ras de suelo, brasas rojas y destellos plateados ---
  const mist = Array.from({ length: 8 }, (_, i) => {
    const s = makeGlow(0x7a0010, 4, 0.14); s.position.set((Math.random() - 0.5) * 8, 0.5, (Math.random() - 0.5) * 8); g.add(s);
    return { s, x: s.position.x, z: s.position.z, i };
  });
  createGlitter(ctx, { count: 120, size: { x: 9, y: 3.6, z: 9 }, center: [0, 0, CZ], color: 0xff2030 }).uniforms.uIntensity.value = 0.7;
  createGlitter(ctx, { count: 70, size: { x: 9, y: 3.6, z: 9 }, center: [0, 0, CZ], color: 0xd0d8ff }).uniforms.uIntensity.value = 0.6;

  // --- Puerta de salida (norte) + pasillo hacia la siguiente era ---
  const doorZ = CZ - 5, len = 4;
  const door = createDoor(ctx, { x: 0, z: doorZ, width: room.doorWidth });
  door.mesh.material.color.set(0x0c0c10); door.mesh.material.emissive.set(0x300008); door.mesh.material.metalness = 0.7;
  addTube(g, 0.07, DOOR_H, 0.07, RED, -1.56, DOOR_H / 2, -4.78, 1.6); addTube(g, 0.07, DOOR_H, 0.07, RED, 1.56, DOOR_H / 2, -4.78, 1.6);
  addTube(g, 3.2, 0.07, 0.07, RED, 0, DOOR_H, -4.78, 1.6);
  const hallMat = mat(0x14141a, { roughness: 1 });
  addWall(ctx, abs, -1.6, doorZ - len / 2, 0.2, len, hallMat);
  addWall(ctx, abs, 1.6, doorZ - len / 2, 0.2, len, hallMat);
  addWall(ctx, abs, 0, doorZ - len, 3.4, 0.2, hallMat);                    // (al crear la sala 4: quitar esta pared, como en las salas 1 y 2)
  const hallFloor = new THREE.Mesh(new THREE.PlaneGeometry(3, len), mat(0x08080c));
  hallFloor.rotation.x = -Math.PI / 2; hallFloor.position.set(0, 0.005, doorZ - len / 2);
  const hallCeil = hallFloor.clone(); hallCeil.rotation.x = Math.PI / 2; hallCeil.position.y = 4;
  const hallSign = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.9), new THREE.MeshBasicMaterial({
    map: makeTextTexture('Lo que se rompe también refleja... la siguiente era te espera.', { w: 640, h: 200, color: '#d5d9e6', font: '32px Georgia' }), transparent: true }));
  hallSign.position.set(0, 2, doorZ - len + 0.12);
  const hallLight = new THREE.PointLight(0xff3a4a, 0, 9); hallLight.position.set(0, 3, doorZ - 2);
  abs.add(hallFloor, hallCeil, hallSign, hallLight);
  let hallBase = 0;

  // ================= Lógica del acertijo =================
  function choose(i) {
    const m = mirrors[i];
    if (i !== ANSWER) {                                   // ✗ espejo incorrecto: parpadeo rojo + grietas + temblor + sala roja
      m.blinkUntil = now + 1.6; busyUntil = now + 1.7; redPop = 1;
      ctx.audio.error(); ctx.audio.crack();
      ctx.particles.burst(wp(...m.pos), 25, { speed: 0.8, up: 0.8 });
      ctx.ui.toast('El reflejo sonríe... pero no es la verdad.', 2500);
      return;
    }
    solved = true; m.solved = true; ctx.game.solved++;   // ✓ espejo correcto
    ctx.audio.success(); emergeAt = now; redPop = 0;
    snake.visible = true; snake.position.set(m.pos[0] + m.n[0] * 0.05, 1.9, m.pos[2] + m.n[1] * 0.05);
    ctx.particles.burst(wp(...m.pos), 60, { speed: 1.2, up: 1.5 });
    door.unlock();                                        // (para desbloquear al RECOGER la serpiente, mover esta línea al onInteract de arriba)
    ctx.ui.toast('El espejo se desvanece... una serpiente de plata emerge. La puerta se desbloquea.', 5000);
  }

  // ================= Animación y luces (cada frame) =================
  let nextHiss = 12;
  const flickerSeeds = [31, 38, 45];
  ctx.updaters.push((dt, t) => {
    now = t;
    const z = cam.z;
    const k3 = clamp((-z - 19) / 4, 0, 1);               // 0 en la sala 2 -> 1 dentro de la sala 3
    room2.lights.mute = clamp((z + 23) / 4, 0.04, 1);    // las luces rosas de la sala 2 se apagan al cruzar el pasillo
    redPop = Math.max(0, redPop - dt * 1.2);
    silverBoost += ((solved ? 2.5 : 1) - silverBoost) * Math.min(1, dt * 1.5);
    const base = k3 * lights.mute;
    ambient.intensity = 0.5 * base * (1 + redPop * 0.8);
    lp.forEach((o, i) => {
      const fl = Math.sin(t * flickerSeeds[i]) * Math.sin(t * (4.3 + i)) > 0.93 ? 0.3 : 1;   // parpadeo de lámpara dañada
      o.l.intensity = o.base * base * fl * (0.92 + 0.08 * Math.sin(t * 1.3 + i)) * (o.red ? 1 + redPop * 3 : silverBoost);
    });

    mirrors.forEach((m) => {
      const blinking = t < m.blinkUntil;
      if (m.solved) {                                    // se apaga en plata brillante
        const k = 0.7 + 0.3 * Math.sin(t * 3); m.glass.material.emissive.setRGB(0.55 * k, 0.6 * k, 0.8 * k); m.crack.visible = false;
      } else if (blinking) {                             // parpadeo rojo + grietas
        const on = Math.floor(t * 10) % 2 === 0;
        m.glass.material.emissive.setRGB(on ? 1 : 0.08, 0, on ? 0.04 : 0);
        m.crack.visible = true; m.crack.material.opacity = on ? 1 : 0.35;
        m.grp.rotation.z = Math.sin(t * 70) * 0.02;
      } else {
        m.glass.material.emissive.setRGB(0.07, 0.07, 0.09); m.grp.rotation.z = 0;
        const fade = clamp((m.blinkUntil + 1.2 - t) / 1.2, 0, 1);                  // las grietas se desvanecen
        m.crack.visible = fade > 0; m.crack.material.opacity = fade * 0.8;
      }
    });
    decalMat.opacity = 0.65 + 0.35 * Math.sin(t * 2);
    mist.forEach((o) => { o.s.position.x = o.x + Math.sin(t * 0.15 + o.i) * 0.9; o.s.position.z = o.z + Math.cos(t * 0.12 + o.i * 2) * 0.9; o.s.material.opacity = 0.1 + 0.05 * Math.sin(t * 0.5 + o.i); });

    if (snake.visible) {                                 // la serpiente sale del espejo hacia el jugador
      const e = clamp((t - emergeAt) / 3, 0, 1), k = 1 - Math.pow(1 - e, 3);
      snake.position.set(am.pos[0] + am.n[0] * (0.05 + 0.85 * k), 1.9 - 0.35 * k + (ready ? Math.sin(t * 2) * 0.04 : 0), am.pos[2] + am.n[1] * (0.05 + 0.85 * k));
      snake.rotation.z = Math.sin(t * 2.5) * 0.15;
      if (e >= 1) ready = true;
    }
    if (door.opening) hallBase = Math.min(10, hallBase + dt * 4);
    hallLight.intensity = hallBase * lights.mute;

    if (k3 > 0.9 && t > nextHiss) { nextHiss = t + 18 + Math.random() * 20; ctx.audio.hiss(); }   // siseo lejano ocasional
  });

  return { ...room, door, lights };
}