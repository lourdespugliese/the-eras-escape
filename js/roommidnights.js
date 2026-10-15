// roommidnights.js — Habitación 6: Midnights. Un gran salón nocturno de 30 × 34 m (1020 m²) con techo de 9 m, a oscuras salvo por la luna,
// lámparas lavanda y un montón de relojes. Se entra por el sur, desde el pasillo que sale del bosque (Folklore / Evermore).
//
//  Distribución (x: oeste -, este +; z: norte -, sur +):
//   · CENTRO : reloj inscrito en el suelo (anillo con números romanos, 12 marcas) bajo una bola de espejos que gira. Alrededor, un anillo de
//              13 orbes lavanda flotando (el 13, el número de la suerte).  Puntos de luz de la bola recorren las paredes.
//   · NORTE  : un reloj gigante sobre la puerta de salida, detenido en las 11:58 (solo el segundero avanza). Cortinas a los lados.
//   · OESTE  : el salón de las 3 a.m.: alfombra circular lila, dos sillones setenteros, una lámpara de pie y una mesa con un teléfono de disco.
//              Un neón "13" y un espejo alto en la pared.
//   · ESTE   : un tablero de ajedrez gigante con piezas, en la esquina noreste (la sala de estrategia). Ventanas a la noche.
//   · TECHO  : cielo estrellado que titila, una luna grande y estrellas fugaces ocasionales.
//
//  De momento NO tiene acertijos. Hay tres interacciones de ambiente (teléfono, espejo, rey del tablero) pensadas como ganchos para futuros
//  acertijos. La puerta norte se crea cerrada: cuando haya acertijo, hay que llamar a  room.door.unlock()  al resolverlo.
//  Igual que las demás salas devuelve { group, bounds, x, z, w, d, door, lights, openHall }:  la sala 7 llamará a openHall().
import * as THREE from 'three';
import { createDoor, addWall, canvasTex, DOOR_H } from './rooms.js';
import { createGlitter } from './glitter.js';

const W = 30, D = 34;                  // 1020 m²
const HALL = 4;                        // pasillo entre la puerta del bosque y esta sala (= HALL del bosque)
const TALL = 9;                        // altura de las paredes / techo
const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
const LAV = '#b9a4ff', GOLD = '#e0c36a';

const signTex = (lines, w, h, { bg = '#1b1240', fg = '#e9defc', font = 'bold 40px Georgia', border = '#b9a4ff' } = {}) => canvasTex(w, h, (c) => {
  c.fillStyle = bg; c.fillRect(0, 0, w, h); c.strokeStyle = border; c.lineWidth = 6; c.strokeRect(6, 6, w - 12, h - 12);
  c.fillStyle = fg; c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle';
  lines.forEach((l, i) => c.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * (parseInt(font.replace(/\D+/g, ''), 10) + 10)));
});

export function buildRoomMidnights(ctx, room5) {
  const cam = ctx.camera.position, scene = ctx.scene;
  const doorZ5 = room5.bounds.minZ;                       // puerta norte del bosque (mundo)
  const southZ = doorZ5 - HALL;                           // pared sur de Midnights (mundo)
  const CZ = southZ - D / 2;                              // centro de la sala (mundo)
  room5.openHall();                                       // quita la pared del fondo del pasillo del bosque
  const bounds = { minX: -W / 2, maxX: W / 2, minZ: CZ - D / 2, maxZ: CZ + D / 2 };
  ctx.rooms.push({ name: 'Habitación 6 — Midnights', bounds });

  const g = new THREE.Group(); g.position.z = CZ; scene.add(g);      // contenido en coordenadas locales (norte = -Z)
  const abs = new THREE.Group(); scene.add(abs);                       // contenido en coordenadas del mundo (pasillo de salida)
  const lights = { mute: 1 };
  const rand = rng(1313);
  const wpos = (x, y, z) => new THREE.Vector3(x, y, z + CZ);
  const colBox = (x0, x1, z0, z1) => { const c = { minX: x0, maxX: x1, minZ: CZ + z0, maxZ: CZ + z1 }; ctx.colliders.push(c); return c; };
  const colRound = (x, z, r) => colBox(x - r, x + r, z - r, z + r);
  const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
  const hit = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false })); m.position.set(x, y, z); return m; };
  const box = (w, h, d, m, x, y, z, p = g) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); p.add(o); return o; };
  const cyl = (rt, rb, h, m, x, y, z, seg = 16, p = g) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.position.set(x, y, z); p.add(o); return o; };

  const glowTex = canvasTex(128, 128, (c) => {
    const r = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.3)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = r; c.fillRect(0, 0, 128, 128);
  });
  const makeGlow = (hex, size, op = 0.8) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: hex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: op })); s.scale.setScalar(size); s.raycast = () => {}; return s; };

  // ---------------- Luces: pocas luces reales (pool) + muchos brillos falsos ----------------
  const ambient = new THREE.AmbientLight(0x5a4a8a, 0), hemi = new THREE.HemisphereLight(0x8f86d8, 0x1a1030, 0), moonL = new THREE.DirectionalLight(0xb9a4ff, 0);
  moonL.position.set(-4, 10, 6); scene.add(ambient, hemi, moonL);
  const POOL = 5;
  const pool = Array.from({ length: POOL }, () => { const l = new THREE.PointLight(0xb9a4ff, 0, 13, 2); scene.add(l); return { l, src: null, level: 0 }; });
  const sources = [];                                                                       // fuentes de luz posibles (lámpara de pie, apliques)
  function addSource(x, y, z, hex, power, glowSize = 2.2) {
    const glow = makeGlow(hex, glowSize); glow.position.set(x, y, z); g.add(glow);
    const s = { pos: wpos(x, y, z), color: new THREE.Color(hex), power, glow, glowBase: 0.8 }; sources.push(s); return s;
  }

  // ---------------- Suelo con el reloj inscrito ----------------
  const PPM = 24, R = 7.5;
  const floorTex = canvasTex(W * PPM, D * PPM, (c) => {
    const w = W * PPM, h = D * PPM, r2 = rng(9), cx = w / 2, cy = h / 2;
    c.fillStyle = '#0c0828'; c.fillRect(0, 0, w, h);
    const hz = c.createRadialGradient(cx, cy, 0, cx, cy, R * PPM * 1.6);                      // bruma lavanda alrededor del reloj
    hz.addColorStop(0, 'rgba(150,120,255,.38)'); hz.addColorStop(0.6, 'rgba(90,60,190,.16)'); hz.addColorStop(1, 'rgba(90,60,190,0)');
    c.fillStyle = hz; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { c.fillStyle = r2() < 0.5 ? 'rgba(185,164,255,.35)' : 'rgba(255,255,255,.22)'; c.fillRect(r2() * w, r2() * h, 1 + r2() * 2, 1 + r2() * 2); }
    c.strokeStyle = GOLD; c.fillStyle = GOLD;                                                  // anillo del reloj
    c.lineWidth = 5; c.beginPath(); c.arc(cx, cy, R * PPM, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, R * PPM * 0.86, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(cx, cy, R * PPM * 0.2, 0, Math.PI * 2); c.stroke();
    for (let k = 0; k < 60; k++) {                                                              // marcas
      const a = (k / 60) * Math.PI * 2 - Math.PI / 2, big = k % 5 === 0, r0 = R * PPM * (big ? 0.9 : 0.94), r1 = R * PPM * 0.99;
      c.lineWidth = big ? 4 : 1.5; c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); c.stroke();
    }
    c.font = 'bold 34px Georgia'; c.textAlign = 'center'; c.textBaseline = 'middle';
    ROMAN.forEach((n, i) => { const a = (i / 12) * Math.PI * 2 - Math.PI / 2, rr = R * PPM * 0.74; c.save(); c.translate(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); c.rotate(a + Math.PI / 2); c.fillText(n, 0, 0); c.restore(); });
    for (let k = 0; k < 13; k++) {                                                              // 13 estrellitas por fuera del anillo
      const a = (k / 13) * Math.PI * 2 - Math.PI / 2, rr = (R + 1.7) * PPM; c.save(); c.translate(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); c.rotate(a);
      c.beginPath(); for (let i = 0; i < 8; i++) { const q = i % 2 ? 4 : 11, b = (i * Math.PI) / 4; c[i ? 'lineTo' : 'moveTo'](Math.cos(b) * q, Math.sin(b) * q); } c.closePath(); c.fill(); c.restore();
    }
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.38, metalness: 0.25 }));
  ground.rotation.x = -Math.PI / 2; g.add(ground);

  // ---------------- Techo estrellado, luna y estrellas fugaces ----------------
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshBasicMaterial({ color: 0x04030f })); sky.rotation.x = Math.PI / 2; sky.position.y = TALL; g.add(sky);
  function makeStars(n, size, op) {
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (rand() - 0.5) * (W - 1); pos[i * 3 + 1] = TALL - 0.04; pos[i * 3 + 2] = (rand() - 0.5) * (D - 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mt = new THREE.PointsMaterial({ color: 0xdfe6ff, size, map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: op });
    const pts = new THREE.Points(geo, mt); pts.frustumCulled = false; g.add(pts); return mt;
  }
  const starsA = makeStars(420, 0.18, 0.9), starsB = makeStars(420, 0.13, 0.5);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(2.1, 40), new THREE.MeshBasicMaterial({ color: 0xece8ff })); moon.rotation.x = Math.PI / 2; moon.position.set(-6, TALL - 0.05, -8); g.add(moon);
  const moonGlow = makeGlow(0xb9a4ff, 11, 0.45); moonGlow.position.set(-6, TALL - 0.6, -8); g.add(moonGlow);
  const shoot = { s: makeGlow(0xffffff, 0.7, 0), t: -6 - rand() * 4, dir: new THREE.Vector3(), from: new THREE.Vector3() }; g.add(shoot.s);

  // ---------------- Paredes (con puertas norte y sur) ----------------
  const wallTex = canvasTex(256, 256, (c) => {
    c.fillStyle = '#150e38'; c.fillRect(0, 0, 256, 256);
    c.strokeStyle = 'rgba(185,164,255,.16)'; c.lineWidth = 2;
    for (let i = -1; i <= 4; i++) for (let j = -1; j <= 4; j++) { const x = i * 64 + (j % 2 ? 32 : 0), y = j * 64; c.beginPath(); c.moveTo(x, y - 28); c.lineTo(x + 28, y); c.lineTo(x, y + 28); c.lineTo(x - 28, y); c.closePath(); c.stroke(); }
    const r2 = rng(4); for (let i = 0; i < 60; i++) { c.fillStyle = 'rgba(224,195,106,.4)'; c.fillRect(r2() * 256, r2() * 256, 2, 2); }
  });
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; wallTex.repeat.set(8, 2.4);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9, color: 0xcfc6ff });
  const wallPiece = (x0, x1, z0, z1, y0 = 0, y1 = TALL, solid = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), wallMat); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); g.add(m); if (solid) colBox(x0, x1, z0, z1); };
  const T = 0.2, DW = 1.5;                                                                  // semigrosor y semiancho de las aberturas (3 m)
  wallPiece(-W / 2 - T, -W / 2 + T, -D / 2 - T, D / 2 + T); wallPiece(W / 2 - T, W / 2 + T, -D / 2 - T, D / 2 + T);
  wallPiece(-W / 2 - T, -DW, -D / 2 - T, -D / 2 + T); wallPiece(DW, W / 2 + T, -D / 2 - T, -D / 2 + T); wallPiece(-DW, DW, -D / 2 - T, -D / 2 + T, DOOR_H, TALL, false);   // norte (puerta)
  wallPiece(-W / 2 - T, -DW, D / 2 - T, D / 2 + T); wallPiece(DW, W / 2 + T, D / 2 - T, D / 2 + T); wallPiece(-DW, DW, D / 2 - T, D / 2 + T, 4, TALL, false);                  // sur (entrada)
  const base = mat(0x0c0828, { roughness: 0.5, metalness: 0.3 });                           // zócalo dorado/oscuro
  [[-W / 2 + T, 0, 0.3, D], [W / 2 - T, 0, 0.3, D]].forEach(([x, , w, d]) => box(w, 0.35, d, base, x, 0.175, 0));

  // ---------------- Ventanas a la noche (este y oeste) ----------------
  const winTex = canvasTex(128, 256, (c) => {
    const gr = c.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#0a0730'); gr.addColorStop(1, '#3a2275'); c.fillStyle = gr; c.fillRect(0, 0, 128, 256);
    const r2 = rng(21); for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(255,255,255,' + (0.4 + r2() * 0.5) + ')'; c.fillRect(r2() * 128, r2() * 200, 2, 2); }
    c.fillStyle = '#ece8ff'; c.beginPath(); c.arc(84, 60, 18, 0, Math.PI * 2); c.fill(); c.fillStyle = '#251660'; c.beginPath(); c.arc(94, 54, 16, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#0a0620'; for (let i = 0; i < 6; i++) { const x = 10 + i * 22, hgt = 30 + r2() * 40; c.beginPath(); c.moveTo(x - 10, 256); c.lineTo(x, 256 - hgt); c.lineTo(x + 10, 256); c.closePath(); c.fill(); }
  });
  const winMat = new THREE.MeshBasicMaterial({ map: winTex }), frameMat = mat(0xe0c36a, { metalness: 0.6, roughness: 0.4, emissive: 0x2a1f00 });
  const addWindow = (x, z, ry) => {
    const grp = new THREE.Group(); grp.position.set(x, 3.4, z); grp.rotation.y = ry; g.add(grp);
    grp.add(new THREE.Mesh(new THREE.PlaneGeometry(2.0, 4.0), winMat));
    box(2.2, 0.12, 0.1, frameMat, 0, 2.06, 0.02, grp); box(2.2, 0.12, 0.1, frameMat, 0, -2.06, 0.02, grp); box(0.12, 4.2, 0.1, frameMat, -1.06, 0, 0.02, grp); box(0.12, 4.2, 0.1, frameMat, 1.06, 0, 0.02, grp); box(0.06, 4.0, 0.08, frameMat, 0, 0, 0.02, grp); box(2.0, 0.06, 0.08, frameMat, 0, 0, 0.02, grp);
    const gl = makeGlow(0x7a62d8, 4.5, 0.25); gl.position.z = 0.4; grp.add(gl);
  };
  [-12, -4, 4, 12].forEach((z) => addWindow(W / 2 - 0.08, z, -Math.PI / 2));
  [-4, 4].forEach((z) => addWindow(-W / 2 + 0.08, z, Math.PI / 2));

  // ---------------- Apliques de pared (luces lavanda) ----------------
  [[W / 2 - 0.3, 2.6, -8], [W / 2 - 0.3, 2.6, 0], [W / 2 - 0.3, 2.6, 8], [-W / 2 + 0.3, 2.6, -8], [-W / 2 + 0.3, 2.6, 0], [-W / 2 + 0.3, 2.6, 10], [-5, 2.6, -D / 2 + 0.3], [5, 2.6, -D / 2 + 0.3]].forEach(([x, y, z]) => {
    box(0.2, 0.36, 0.2, mat(0xe9defc, { emissive: 0x8f7ae0, emissiveIntensity: 1.4 }), x, y, z); addSource(x, y, z, 0xb9a4ff, 1);
  });

  // ---------------- Centro: bola de espejos, orbes del 13 y puntos de luz ----------------
  const BALL = { x: 0, y: 6.4, z: 0 };
  cyl(0.012, 0.012, TALL - BALL.y, mat(0xcccccc, { metalness: 1 }), BALL.x, (TALL + BALL.y) / 2, BALL.z, 4);
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 2), new THREE.MeshStandardMaterial({ color: 0xdfe6ff, metalness: 1, roughness: 0.12, flatShading: true, emissive: 0x2a2060, emissiveIntensity: 0.8 }));
  ball.position.set(BALL.x, BALL.y, BALL.z); g.add(ball);
  const ballGlow = makeGlow(0xdfe6ff, 5, 0.5); ballGlow.position.copy(ball.position); g.add(ballGlow);
  const orbs = Array.from({ length: 13 }, (_, i) => {
    const a = (i / 13) * Math.PI * 2 - Math.PI / 2, x = Math.cos(a) * (R + 2.4), z = Math.sin(a) * (R + 2.4);
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), new THREE.MeshBasicMaterial({ color: 0xe9defc })); sphere.position.set(x, 1.6, z); g.add(sphere);
    const gl = makeGlow(0xb9a4ff, 1.6, 0.85); gl.position.set(x, 1.6, z); g.add(gl);
    return { sphere, gl, ph: i * 0.9, y0: 1.5 + (i % 3) * 0.2 };
  });
  const dots = Array.from({ length: 26 }, (_, i) => { const s = makeGlow([0xb9a4ff, 0xff8fd0, 0x8fe6ff][i % 3], 1.1, 0.55); g.add(s); return s; });
  const fogTex = canvasTex(128, 128, (c) => { const r = c.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(190,170,255,.9)'); r.addColorStop(1, 'rgba(190,170,255,0)'); c.fillStyle = r; c.fillRect(0, 0, 128, 128); });
  const haze = Array.from({ length: 24 }, () => {                                          // bruma lavanda baja que se desplaza
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: fogTex, transparent: true, depthWrite: false, opacity: 0.14 })); sp.scale.setScalar(5.5 + rand() * 3);
    sp.position.set((rand() - 0.5) * (W - 3), 0.4 + rand() * 0.6, (rand() - 0.5) * (D - 3)); sp.raycast = () => {}; g.add(sp); return { sp, x0: sp.position.x, ph: rand() * 6.28 };
  });
  createGlitter(ctx, { count: 110, size: { x: 26, y: 7, z: 30 }, center: [0, 0, CZ], color: 0xb9a4ff }).uniforms.uIntensity.value = 0.7;

  // ---------------- Norte: reloj gigante sobre la puerta (11:58) y cortinas ----------------
  const clockFace = canvasTex(512, 512, (c) => {
    c.fillStyle = '#120b34'; c.fillRect(0, 0, 512, 512);
    const r2 = rng(17); for (let i = 0; i < 70; i++) { c.fillStyle = 'rgba(224,195,106,.5)'; c.fillRect(r2() * 512, r2() * 512, 2, 2); }
    c.strokeStyle = GOLD; c.fillStyle = GOLD; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 54px Georgia';
    for (let k = 0; k < 60; k++) { const a = (k / 60) * Math.PI * 2, big = k % 5 === 0, r0 = big ? 212 : 232; c.lineWidth = big ? 6 : 2; c.beginPath(); c.moveTo(256 + Math.sin(a) * r0, 256 - Math.cos(a) * r0); c.lineTo(256 + Math.sin(a) * 246, 256 - Math.cos(a) * 246); c.stroke(); }
    for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; c.fillText(String(i), 256 + Math.sin(a) * 170, 256 - Math.cos(a) * 170); }
  });
  const CK = { x: 0, y: 6.3, z: -D / 2 + 0.14, r: 2.4 };            // sobre el dintel de la puerta
  const clock = new THREE.Group(); clock.position.set(CK.x, CK.y, CK.z); g.add(clock);
  clock.add(new THREE.Mesh(new THREE.CircleGeometry(CK.r, 64), new THREE.MeshBasicMaterial({ map: clockFace })));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(CK.r + 0.08, 0.13, 12, 64), frameMat); rim.position.z = 0.05; clock.add(rim);
  const hand = (len, wd, color) => { const p = new THREE.Group(); p.position.z = 0.08; const m = new THREE.Mesh(new THREE.BoxGeometry(wd, len, 0.04), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 })); m.position.y = len / 2 - 0.15; p.add(m); clock.add(p); return p; };
  const hHour = hand(1.2, 0.2, 0xe0c36a), hMin = hand(1.8, 0.12, 0xe0c36a), hSec = hand(2.1, 0.05, 0xff8fd0);
  hHour.rotation.z = -((11 + 58 / 60) / 12) * Math.PI * 2; hMin.rotation.z = -(58 / 60) * Math.PI * 2;
  const clockGlow = makeGlow(0xb9a4ff, 9, 0.28); clockGlow.position.set(CK.x, CK.y, CK.z + 0.3); g.add(clockGlow);
  [-5.2, 5.2].forEach((x) => {                                                              // cortinas junto a la puerta
    const cur = new THREE.Mesh(new THREE.PlaneGeometry(1.6, TALL - 0.6), new THREE.MeshStandardMaterial({ color: 0x4a2a8a, emissive: 0x1a0c40, roughness: 1, side: THREE.DoubleSide }));
    cur.position.set(x, (TALL - 0.6) / 2 + 0.3, -D / 2 + 0.08); g.add(cur);
  });

  // ---------------- Oeste: el salón de las 3 a.m. ----------------
  const LG = { x: -9.5, z: 9.0 };
  const rugTex = canvasTex(256, 256, (c) => { ['#6a4a9a', '#e9defc', '#8a6ad0', '#2a1a5a', '#b9a4ff'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(128, 128, 128 - i * 24, 0, Math.PI * 2); c.fill(); }); });
  const rug = new THREE.Mesh(new THREE.CircleGeometry(3.0, 48), new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(LG.x, 0.015, LG.z); g.add(rug);
  const armchair = (x, z) => {
    const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = Math.atan2(LG.x - x, LG.z - z); g.add(grp);
    const m = mat(0xc4622a, { roughness: 0.9 }), m2 = mat(0x2a7a7a, { roughness: 0.9 });
    box(1.0, 0.4, 0.9, m, 0, 0.35, 0, grp); box(1.0, 0.85, 0.2, m, 0, 0.8, -0.35, grp); box(0.2, 0.5, 0.9, m2, -0.5, 0.55, 0, grp); box(0.2, 0.5, 0.9, m2, 0.5, 0.55, 0, grp);
    [[-0.4, -0.35], [0.4, -0.35], [-0.4, 0.35], [0.4, 0.35]].forEach(([dx, dz]) => cyl(0.04, 0.03, 0.2, mat(0x2a1a0c), dx, 0.1, dz, 6, grp));
    colRound(x, z, 0.62);
  };
  armchair(-12.4, 7.2); armchair(-11.6, 11.4);
  cyl(0.7, 0.7, 0.05, mat(0xe9defc, { roughness: 0.4 }), LG.x, 0.46, LG.z, 28); cyl(0.07, 0.07, 0.44, mat(0x2a1a0c), LG.x, 0.22, LG.z, 8); cyl(0.3, 0.3, 0.03, mat(0x2a1a0c), LG.x, 0.015, LG.z, 16);
  colRound(LG.x, LG.z, 0.72);
  const phone = new THREE.Group(); phone.position.set(LG.x, 0.5, LG.z); g.add(phone);                       // teléfono de disco
  const blk = mat(0x14101c, { roughness: 0.3, metalness: 0.2 });
  box(0.34, 0.1, 0.26, blk, 0, 0.05, 0, phone); box(0.3, 0.06, 0.07, blk, 0, 0.14, -0.02, phone).rotation.z = 0;
  cyl(0.085, 0.085, 0.03, mat(0xe9defc), 0, 0.11, 0.04, 16, phone);
  [[-0.16, 0.16, 0.03], [0.16, 0.16, 0.03]].forEach(([x, y, z]) => cyl(0.045, 0.045, 0.07, blk, x, y, z, 10, phone));
  phone.add(hit(0.6, 0.4, 0.5, 0, 0.15, 0));
  ctx.interaction.add(phone, { prompt: () => 'Presiona E para descolgar el teléfono.', onInteract: () => { ctx.audio.note(440); ctx.ui.toast('Se oye un tono largo... y después un silencio muy largo. Quizá más tarde alguien llame.', 5000); } });
  cyl(0.03, 0.04, 1.6, mat(0x2a1a0c), -12.6, 0.8, 5.0, 8);                                              // lámpara de pie
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.4, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xffc46a, emissive: 0xffa84a, emissiveIntensity: 1.2, side: THREE.DoubleSide }));
  shade.position.set(-12.6, 1.8, 5.0); g.add(shade); colRound(-12.6, 5.0, 0.2);
  addSource(-12.6, 1.8, 5.0, 0xffc46a, 1.4, 2.8);
  { // neón "13" en la pared oeste
    const t = canvasTex(256, 256, (c) => { c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, 256, 256); c.font = 'bold 190px Georgia'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = '#b9a4ff'; c.shadowBlur = 28; c.fillStyle = '#f2ecff'; c.fillText('13', 128, 136); c.fillText('13', 128, 136); });
    const neon = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.0), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })); neon.position.set(-W / 2 + 0.12, 3.6, -9); neon.rotation.y = Math.PI / 2; g.add(neon);
    const ng = makeGlow(0xb9a4ff, 5, 0.35); ng.position.set(-W / 2 + 0.4, 3.6, -9); g.add(ng);
  }
  { // espejo alto
    const grp = new THREE.Group(); grp.position.set(-W / 2 + 0.1, 2.0, -13); grp.rotation.y = Math.PI / 2; g.add(grp);
    const mt = canvasTex(128, 256, (c) => { const gr = c.createLinearGradient(0, 0, 128, 256); gr.addColorStop(0, '#9fb0ff'); gr.addColorStop(0.45, '#1a1650'); gr.addColorStop(0.55, '#cfd8ff'); gr.addColorStop(1, '#1a1650'); c.fillStyle = gr; c.fillRect(0, 0, 128, 256); });
    grp.add(new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.8), new THREE.MeshBasicMaterial({ map: mt })));
    box(1.7, 0.12, 0.08, frameMat, 0, 1.46, 0.02, grp); box(1.7, 0.12, 0.08, frameMat, 0, -1.46, 0.02, grp); box(0.12, 3.0, 0.08, frameMat, -0.82, 0, 0.02, grp); box(0.12, 3.0, 0.08, frameMat, 0.82, 0, 0.02, grp);
    grp.add(hit(1.7, 3.0, 0.8, 0, 0, 0.3));
    ctx.interaction.add(grp, { prompt: () => 'Presiona E para mirarte en el espejo.', onInteract: () => ctx.ui.toast('A esta hora todo se ve más claro... o más confuso. El espejo no dice cuál de las dos.', 5000) });
  }

  // ---------------- Este: el tablero gigante ----------------
  const BD = { x: 11, z: -11, sq: 0.8 };                                  // esquina noreste, fuera del anillo de orbes
  const boardTex = canvasTex(512, 512, (c) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { c.fillStyle = (i + j) % 2 ? '#150e38' : '#b9a4ff'; c.fillRect(i * 64, j * 64, 64, 64); } });
  box(8 * BD.sq + 0.3, 0.12, 8 * BD.sq + 0.3, mat(0x2a1a5a, { metalness: 0.3 }), BD.x, 0.06, BD.z);
  const bt = new THREE.Mesh(new THREE.PlaneGeometry(8 * BD.sq, 8 * BD.sq), new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.35, metalness: 0.2 })); bt.rotation.x = -Math.PI / 2; bt.position.set(BD.x, 0.125, BD.z); g.add(bt);
  const light = mat(0xe9defc, { roughness: 0.3, emissive: 0x2a2060 }), dark = mat(0x2a1a5a, { roughness: 0.3, emissive: 0x0c0830 });
  const sqx = (i) => BD.x + (i - 3.5) * BD.sq, sqz = (j) => BD.z + (j - 3.5) * BD.sq;
  const pawn = (i, j, m) => { cyl(0.2, 0.28, 0.5, m, sqx(i), 0.37, sqz(j), 14); const s = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), m); s.position.set(sqx(i), 0.76, sqz(j)); g.add(s); colRound(sqx(i), sqz(j), 0.28); };
  const rook = (i, j, m) => { cyl(0.26, 0.3, 0.9, m, sqx(i), 0.57, sqz(j), 10); cyl(0.32, 0.26, 0.2, m, sqx(i), 1.12, sqz(j), 10); colRound(sqx(i), sqz(j), 0.32); };
  [[1, 1, light], [3, 2, dark], [5, 1, light], [2, 5, dark], [4, 6, dark], [6, 4, light]].forEach(([i, j, m]) => pawn(i, j, m));
  rook(0, 0, light); rook(7, 7, dark);
  const king = new THREE.Group(); king.position.set(sqx(4), 0, sqz(3)); g.add(king);                      // el rey, en el centro del tablero
  cyl(0.28, 0.36, 1.5, dark, 0, 0.87, 0, 14, king); cyl(0.38, 0.28, 0.2, dark, 0, 1.72, 0, 14, king); box(0.1, 0.5, 0.1, dark, 0, 2.05, 0, king); box(0.36, 0.1, 0.1, dark, 0, 2.1, 0, king);
  king.add(hit(0.9, 2.4, 0.9, 0, 1.2, 0)); colRound(sqx(4), sqz(3), 0.38);
  ctx.interaction.add(king, { prompt: () => 'Presiona E para mover el rey.', onInteract: () => ctx.ui.toast('El rey no se mueve. Las piezas esperan a que alguien planee la jugada completa.', 5000) });
  addSource(BD.x, 2.8, BD.z + 3.6, 0xb9a4ff, 0.8);

  // ---------------- Puerta norte + pasillo provisional hacia la siguiente era ----------------
  const doorZ = CZ - D / 2;
  const door = createDoor(ctx, { x: 0, z: doorZ, width: 3 });
  door.mesh.material.color.set(0x2a1a5a); door.mesh.material.emissive.set(0x0a0620); door.mesh.material.metalness = 0.2;
  const hallMat = mat(0x16102e, { roughness: 1 });
  addWall(ctx, abs, -1.6, doorZ - HALL / 2, 0.2, HALL, hallMat); addWall(ctx, abs, 1.6, doorZ - HALL / 2, 0.2, HALL, hallMat);
  const endCol = ctx.colliders.length;
  addWall(ctx, abs, 0, doorZ - HALL, 3.4, 0.2, hallMat);                                    // pared del fondo: la sala 7 llama a openHall() y la quita
  const hallEnd = { mesh: abs.children[abs.children.length - 1], col: ctx.colliders[endCol] };
  const hallFloor = new THREE.Mesh(new THREE.PlaneGeometry(3, HALL), mat(0x0c0828)); hallFloor.rotation.x = -Math.PI / 2; hallFloor.position.set(0, 0.005, doorZ - HALL / 2);
  const hallCeil = hallFloor.clone(); hallCeil.rotation.x = Math.PI / 2; hallCeil.position.y = 4;
  const hallSign = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.9), new THREE.MeshBasicMaterial({ map: signTex(['Pasó la medianoche,', 'pero la noche sigue...'], 640, 200, { font: '38px Georgia' }), transparent: true }));
  hallSign.position.set(0, 2, doorZ - HALL + 0.12);
  const hallLight = new THREE.PointLight(0xb9a4ff, 0, 9); hallLight.position.set(0, 3, doorZ - 2);
  abs.add(hallFloor, hallCeil, hallSign, hallLight);
  let hallBase = 0;
  const openHall = () => { abs.remove(hallEnd.mesh, hallSign); const i = ctx.colliders.indexOf(hallEnd.col); if (i >= 0) ctx.colliders.splice(i, 1); };

  // ---------------- Animación, luces y niebla (cada frame) ----------------
  let baseFog = null, welcomed = false, bloomOn = false;
  const FOG_MID = new THREE.Color(0x150b32);
  ctx.updaters.push((dt, t) => {
    const z = cam.z;
    // ---- luces entre salas (igual que en las otras salas) ----
    room5.lights.mute = clamp((z - southZ) / HALL, 0.04, 1);                                // el bosque se apaga a lo largo del pasillo
    const k6 = clamp((doorZ5 - 1 - z) / 3, 0, 1), lightK = k6 * lights.mute;
    ambient.intensity = 0.6 * lightK; hemi.intensity = 0.5 * lightK; moonL.intensity = 0.55 * lightK;
    // ---- niebla: pasa del bosque a la noche violeta (se aplica después de la del bosque) ----
    const fog = scene.fog;
    if (fog && k6 > 0) { fog.near = lerp(fog.near, 6, k6); fog.far = lerp(fog.far, 42, k6); fog.color.lerp(FOG_MID, k6); }
    hallBase = door.opening ? Math.min(8, hallBase + dt * 4) : hallBase; hallLight.intensity = hallBase * lights.mute;
    // ---- lo demás solo se calcula cerca de la sala ----
    const active = z < doorZ5 + 0.5 && z > bounds.minZ - HALL - 2;
    if (!active) { pool.forEach((p) => (p.l.intensity = 0)); return; }
    if (!bloomOn && z < southZ + 4) { bloomOn = true; ctx.fx.bloom = true; }                // el brillo suave le queda bien a esta sala
    // pool de luces: las 5 fuentes más cercanas, con aparición/desaparición suave
    const near5 = sources.map((s) => ({ s, d: s.pos.distanceToSquared(cam) })).sort((a, b) => a.d - b.d).slice(0, POOL).map((o) => o.s);
    pool.forEach((p) => { const keep = p.src && near5.includes(p.src); p.level = clamp(p.level + (keep ? 3 : -3) * dt, 0, 1); if (p.level <= 0.01 && !keep) p.src = null; });
    near5.forEach((s) => { if (pool.some((p) => p.src === s)) return; const free = pool.find((p) => !p.src); if (free) { free.src = s; free.level = 0; } });
    pool.forEach((p) => { if (p.src) { p.l.position.copy(p.src.pos); p.l.color.copy(p.src.color); p.l.intensity = 18 * p.src.power * p.level * lightK; } else p.l.intensity = 0; });
    sources.forEach((s, i) => { s.glow.material.opacity = s.glowBase * (0.85 + 0.15 * Math.sin(t * 2.1 + i)); });
    // cielo: estrellas que titilan y una estrella fugaz de vez en cuando
    starsA.opacity = 0.55 + 0.45 * Math.sin(t * 1.7); starsB.opacity = 0.55 + 0.45 * Math.sin(t * 1.7 + Math.PI);
    shoot.t += dt;
    if (shoot.t > 0 && shoot.t < 0.9) {
      if (shoot.t - dt <= 0) { shoot.from.set((rand() - 0.5) * 20, TALL - 0.3, (rand() - 0.5) * 24); shoot.dir.set(-(0.6 + rand() * 0.4), 0, (rand() - 0.5) * 0.8).normalize(); }
      shoot.s.position.copy(shoot.from).addScaledVector(shoot.dir, shoot.t * 16); shoot.s.material.opacity = Math.sin((shoot.t / 0.9) * Math.PI) * 0.9;
    } else { shoot.s.material.opacity = 0; if (shoot.t >= 0.9) shoot.t = -(5 + rand() * 6); }
    // bola de espejos, puntos de luz, orbes y bruma
    ball.rotation.y = t * 0.5; ballGlow.material.opacity = 0.4 + 0.15 * Math.sin(t * 3);
    dots.forEach((s, i) => { const a = t * 0.35 + (i * 2 * Math.PI) / 26; s.position.set(Math.cos(a) * 14.6, 1.2 + (((i * 37) % 100) / 100) * 5.5 + Math.sin(t * 0.8 + i) * 0.4, Math.sin(a) * 16.6); });
    orbs.forEach((o) => { const y = o.y0 + Math.sin(t * 1.1 + o.ph) * 0.25; o.sphere.position.y = y; o.gl.position.y = y; o.gl.material.opacity = 0.7 + 0.25 * Math.sin(t * 2 + o.ph); });
    haze.forEach((h) => { h.sp.position.x = h.x0 + Math.sin(t * 0.15 + h.ph) * 1.6; });
    // reloj gigante: solo el segundero avanza (tic cada segundo)
    hSec.rotation.z = -(Math.floor(t) % 60) / 60 * Math.PI * 2;
    // aviso al entrar
    if (!welcomed && z < southZ + 3) { welcomed = true; ctx.ui.toast('Es más de medianoche y esta sala nunca duerme: relojes, espejos, un tablero enorme y un teléfono que no suena.', 7000); }
  });

  return { group: g, bounds, x: 0, z: CZ, w: W, d: D, door, lights, openHall };
}