// roommidnights.js — Habitación 6: Midnights. Un gran salón nocturno de 30 × 34 m (1020 m²) con techo de 9 m, a oscuras salvo por la luna,
// lámparas lavanda y un montón de relojes. Se entra por el sur, desde el pasillo que sale del bosque (Folklore / Evermore).
//
//  Distribución (x: oeste -, este +; z: norte -, sur +):
//   · CENTRO : reloj inscrito en el suelo (anillo con números romanos, 12 marcas) bajo una bola de espejos que gira. Alrededor, un anillo de
//              13 orbes lavanda flotando (el 13, el número de la suerte).  Puntos de luz de la bola recorren las paredes.
//   · NORTE  : un reloj gigante sobre la puerta de salida, detenido en las 11:57 (solo el segundero avanza). Cortinas a los lados.
//   · NOROESTE: la esquina del espejo: un neón "13" en la pared oeste y, en la pared norte (la contigua), un espejo alto que lo devuelve invertido (31).
//   · OESTE  : el salón de las 3 a.m.: alfombra circular lila, dos sillones setenteros, una lámpara de pie y una mesa con un teléfono de disco.
//   · ESTE   : un tablero de ajedrez gigante con piezas, en la esquina noreste (la sala de estrategia). Ventanas a la noche.
//   · SURESTE: a la derecha de la entrada, la mesa de los relojes: cinco relojes de mesa detenidos bajo una lámpara lavanda.
//   · TECHO  : cielo estrellado que titila, una luna grande y estrellas fugaces ocasionales.
//
//  Acertijos (al final de este archivo, "La hora que falta"): 1) la llamada y el espejo (teléfono + ruedas del atril), 2) el reloj del suelo
//  (consola con 3 botones), 3) jaque mate en una jugada (tablero), 4) la mesa de los relojes (sureste). Los tres engranajes que dan se colocan en el pedestal bajo el reloj gigante:
//  da la medianoche, se encienden los 13 orbes y la bola de espejos suelta la Llave final. La puerta norte se abre al recogerla y, al fondo del pasillo, aparece un portal que lleva de vuelta al museo (ctx.returnToMuseum, definido en main.js).
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
  const IN = W / 2 - T, INZ = D / 2 - T;                                                    // cara INTERIOR de las paredes (x, z): todo lo que se cuelga de un muro va aquí
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
  [-12, -4, 4, 12].forEach((z) => addWindow(IN - 0.03, z, -Math.PI / 2));
  [-4, 4].forEach((z) => addWindow(-IN + 0.03, z, Math.PI / 2));

  // ---------------- Apliques de pared (luces lavanda) ----------------
  [[W / 2 - 0.3, 2.6, -8], [W / 2 - 0.3, 2.6, 0], [W / 2 - 0.3, 2.6, 8], [-W / 2 + 0.3, 2.6, -8], [-W / 2 + 0.3, 2.6, 0], [-W / 2 + 0.3, 2.6, 10], [-5, 2.6, -D / 2 + 0.3], [5, 2.6, -D / 2 + 0.3]].forEach(([x, y, z]) => {
    box(0.2, 0.36, 0.2, mat(0xe9defc, { emissive: 0x8f7ae0, emissiveIntensity: 1.4 }), x, y, z); addSource(x, y, z, 0xb9a4ff, 1);
  });

  // ---------------- Centro: bola de espejos, orbes del 13 y puntos de luz ----------------
  const BALL = { x: 0, y: 6.4, z: 0 };
  const rod = cyl(0.012, 0.012, TALL - BALL.y, mat(0xcccccc, { metalness: 1 }), BALL.x, (TALL + BALL.y) / 2, BALL.z, 4);
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
  const CK = { x: 0, y: 6.3, z: -INZ + 0.03, r: 2.4 };            // sobre el dintel de la puerta
  const clock = new THREE.Group(); clock.position.set(CK.x, CK.y, CK.z); g.add(clock);
  clock.add(new THREE.Mesh(new THREE.CircleGeometry(CK.r, 64), new THREE.MeshBasicMaterial({ map: clockFace })));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(CK.r + 0.08, 0.13, 12, 64), frameMat); rim.position.z = 0.05; clock.add(rim);
  const hand = (len, wd, color) => { const p = new THREE.Group(); p.position.z = 0.08; const m = new THREE.Mesh(new THREE.BoxGeometry(wd, len, 0.04), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 })); m.position.y = len / 2 - 0.15; p.add(m); clock.add(p); return p; };
  const hHour = hand(1.2, 0.2, 0xe0c36a), hMin = hand(1.8, 0.12, 0xe0c36a), hSec = hand(2.1, 0.05, 0xff8fd0);
  hHour.rotation.z = -((11 + 57 / 60) / 12) * Math.PI * 2; hMin.rotation.z = -(57 / 60) * Math.PI * 2;
  const clockGlow = makeGlow(0xb9a4ff, 9, 0.28); clockGlow.position.set(CK.x, CK.y, CK.z + 0.3); g.add(clockGlow);
  [-5.2, 5.2].forEach((x) => {                                                              // cortinas junto a la puerta
    const cur = new THREE.Mesh(new THREE.PlaneGeometry(1.6, TALL - 0.6), new THREE.MeshStandardMaterial({ color: 0x4a2a8a, emissive: 0x1a0c40, roughness: 1, side: THREE.DoubleSide }));
    cur.position.set(x, (TALL - 0.6) / 2 + 0.3, -INZ + 0.03); g.add(cur);
  });

  // ---------------- Esquina noroeste: neón "13" (pared oeste) y espejo (pared norte, la contigua) ----------------
  const NEON_Y = 3.3, EDGE = 3.2;                 // altura y distancia de cada uno a la esquina (simétricos respecto de la diagonal)
  { // neón "13" en la pared oeste
    const t = canvasTex(256, 256, (c) => { c.clearRect(0, 0, 256, 256); c.font = 'bold 190px Georgia'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = '#b9a4ff'; c.shadowBlur = 28; c.fillStyle = '#f2ecff'; c.fillText('13', 128, 136); c.fillText('13', 128, 136); });
    const neon = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
    neon.position.set(-IN + 0.03, NEON_Y, -INZ + EDGE); neon.rotation.y = Math.PI / 2; g.add(neon);
    const ng = makeGlow(0xb9a4ff, 6, 0.22); ng.position.set(-IN + 0.2, NEON_Y, -INZ + EDGE); g.add(ng);
    const src = addSource(-IN + 1.5, NEON_Y, -INZ + EDGE, 0xb9a4ff, 1.1); src.glow.visible = false;   // ilumina la esquina sin tapar el número
  }
  { // espejo alto en la pared norte, junto a la esquina: devuelve el 13 invertido (31)
    const grp = new THREE.Group(); grp.position.set(-IN + EDGE, NEON_Y, -INZ + 0.03); grp.scale.setScalar(1.35); g.add(grp);
    const mt = canvasTex(128, 256, (c) => { const gr = c.createLinearGradient(0, 0, 128, 256); gr.addColorStop(0, '#9fb0ff'); gr.addColorStop(0.45, '#1a1650'); gr.addColorStop(0.55, '#cfd8ff'); gr.addColorStop(1, '#1a1650'); c.fillStyle = gr; c.fillRect(0, 0, 128, 256); });
    grp.add(new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.8), new THREE.MeshBasicMaterial({ map: mt })));
    { // reflejo del neón (acertijo de la llamada: 13 + 31)
      const rt = canvasTex(256, 256, (c) => { c.save(); c.translate(256, 0); c.scale(-1, 1); c.font = 'bold 150px Georgia'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = '#b9a4ff'; c.shadowBlur = 22; c.fillStyle = '#f2ecff'; c.fillText('13', 128, 136); c.restore(); });
      const refl = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshBasicMaterial({ map: rt, transparent: true, depthWrite: false })); refl.position.set(0, 0.2, 0.012); grp.add(refl);
    }
    box(1.7, 0.12, 0.08, frameMat, 0, 1.46, 0.02, grp); box(1.7, 0.12, 0.08, frameMat, 0, -1.46, 0.02, grp); box(0.12, 3.0, 0.08, frameMat, -0.82, 0, 0.02, grp); box(0.12, 3.0, 0.08, frameMat, 0.82, 0, 0.02, grp);
    grp.add(hit(1.7, 3.0, 0.8, 0, 0, 0.3));
    ctx.interaction.add(grp, { prompt: () => 'Presiona E para mirarte en el espejo.', onInteract: () => ctx.ui.toast('El espejo devuelve el número de la pared oeste, pero del revés. Lo que ves ahí es lo que importa.', 5000) });
  }

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
  cyl(0.03, 0.04, 1.6, mat(0x2a1a0c), -12.6, 0.8, 5.0, 8);                                              // lámpara de pie
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.4, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xffc46a, emissive: 0xffa84a, emissiveIntensity: 1.2, side: THREE.DoubleSide }));
  shade.position.set(-12.6, 1.8, 5.0); g.add(shade); colRound(-12.6, 5.0, 0.2);
  addSource(-12.6, 1.8, 5.0, 0xffc46a, 1.4, 2.8);

  // ---------------- Este: el tablero gigante ----------------
  const BD = { x: 11, z: -11, sq: 0.8 };                                  // esquina noreste, fuera del anillo de orbes
  const boardTex = canvasTex(512, 512, (c) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { c.fillStyle = (i + j) % 2 ? '#150e38' : '#b9a4ff'; c.fillRect(i * 64, j * 64, 64, 64); } });
  box(8 * BD.sq + 0.3, 0.12, 8 * BD.sq + 0.3, mat(0x2a1a5a, { metalness: 0.3 }), BD.x, 0.06, BD.z);
  const bt = new THREE.Mesh(new THREE.PlaneGeometry(8 * BD.sq, 8 * BD.sq), new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.35, metalness: 0.2 })); bt.rotation.x = -Math.PI / 2; bt.position.set(BD.x, 0.125, BD.z); g.add(bt);
  const light = mat(0xe9defc, { roughness: 0.3, emissive: 0x2a2060 }), dark = mat(0x2a1a5a, { roughness: 0.3, emissive: 0x0c0830 });
  const sqx = (i) => BD.x + (i - 3.5) * BD.sq, sqz = (j) => BD.z + (j - 3.5) * BD.sq;
  // Las piezas del tablero las crea el acertijo (createMidnightsPuzzle): jaque mate en una jugada.
  addSource(BD.x, 2.8, BD.z + 3.6, 0xb9a4ff, 0.8);

  // ---------------- Acertijos (createMidnightsPuzzle, al final de este archivo) ----------------
  const puzzle = createMidnightsPuzzle(ctx, { g, CZ, TALL, R, BD, phone, mat, box, cyl, hit, colBox, colRound, makeGlow, light, dark, sqx, sqz, ball, ballGlow, rod, BALL, orbs, hHour, hMin, hSec, clockGlow, addSource, onSolved: () => { door.unlock(); portal.activate(); } });

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
  const hallSign = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.9), new THREE.MeshBasicMaterial({ map: signTex(['Pasó la medianoche.', 'Es hora de volver a casa.'], 640, 200, { font: '36px Georgia' }), transparent: true }));
  hallSign.position.set(0, 3.5, doorZ - HALL + 0.12);
  const hallLight = new THREE.PointLight(0xb9a4ff, 0, 9); hallLight.position.set(0, 3, doorZ - 2);
  abs.add(hallFloor, hallCeil, hallSign, hallLight);
  let hallBase = 0;
  const openHall = () => { abs.remove(hallEnd.mesh, hallSign); const i = ctx.colliders.indexOf(hallEnd.col); if (i >= 0) ctx.colliders.splice(i, 1); };

  // ---------------- Portal de regreso al museo (fondo del pasillo de salida) ----------------
  // Aparece cuando se abre la puerta norte. Al cruzarlo, ctx.returnToMuseum() (definido en main.js) te devuelve al Hall principal.
  const flash = (typeof document !== 'undefined' && document.body) ? document.createElement('div') : null;
  if (flash) { flash.style.cssText = 'position:fixed;inset:0;z-index:9;pointer-events:none;opacity:0;transition:opacity 1s;background:radial-gradient(circle,#fff6e0 0%,#cbb8ff 45%,#2a1a5a 100%);'; document.body.appendChild(flash); }
  const portal = (() => {
    const px = 0, py = 1.6, pz = doorZ - HALL + 0.35, rad = 1.25;
    const grp = new THREE.Group(); grp.position.set(px, py, pz); grp.visible = false; abs.add(grp);
    const swirl = canvasTex(256, 256, (c) => {
      const gr = c.createRadialGradient(128, 128, 0, 128, 128, 128);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(210,195,255,.85)'); gr.addColorStop(0.75, 'rgba(110,80,210,.5)'); gr.addColorStop(1, 'rgba(90,60,190,0)');
      c.fillStyle = gr; c.fillRect(0, 0, 256, 256);
      c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 5; c.lineCap = 'round';
      for (let arm = 0; arm < 4; arm++) { c.beginPath(); for (let i = 0; i <= 50; i++) { const k = i / 50, ang = arm * Math.PI / 2 + k * 5, r = 6 + k * 112, x = 128 + Math.cos(ang) * r, y = 128 + Math.sin(ang) * r; if (i) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke(); }
    });
    const disc = (hex, s, op) => { const m = new THREE.Mesh(new THREE.CircleGeometry(rad * s, 48), new THREE.MeshBasicMaterial({ map: swirl, color: hex, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); grp.add(m); return m; };
    const a = disc(0xb9a4ff, 1, 0.95), b = disc(0xffd9a0, 0.7, 0.75); b.position.z = 0.01;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rad + 0.06, 0.09, 14, 56), frameMat); ring.position.z = 0.03; grp.add(ring);
    const glow = makeGlow(0xb9a4ff, 7, 0.5); glow.position.z = 0.25; grp.add(glow);
    const P = {
      grp, a, b, glow, x: px, z: pz, on: false, used: false, k: 0,
      activate() { if (P.on) return; P.on = true; grp.visible = true; },
      enter() {
        P.used = true; ctx.audio.success();
        if (flash) flash.style.opacity = '1';
        setTimeout(() => {
          if (ctx.returnToMuseum) ctx.returnToMuseum();
          else { P.used = false; ctx.ui.toast('El portal vibra, pero todavía no sabe a dónde llevarte.', 4000); }
          if (flash) setTimeout(() => (flash.style.opacity = '0'), 250);
        }, 1100);
      },
    };
    return P;
  })();

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
    orbs.forEach((o) => { const y = o.y0 + Math.sin(t * 1.1 + o.ph) * 0.25; o.sphere.position.y = y; o.gl.position.y = y; o.gl.material.opacity = o.lit ? 1 : 0.7 + 0.25 * Math.sin(t * 2 + o.ph); });
    haze.forEach((h) => { h.sp.position.x = h.x0 + Math.sin(t * 0.15 + h.ph) * 1.6; });
    // reloj gigante: solo el segundero avanza (tic cada segundo)
    if (!puzzle.finale.on) hSec.rotation.z = -(Math.floor(t) % 60) / 60 * Math.PI * 2;      // (durante el final lo mueve el acertijo)
    // portal de regreso al museo: aparece, gira y te lleva al hall al cruzarlo
    if (portal.on) {
      portal.k = Math.min(1, portal.k + dt / 1.6); const pe = 1 - Math.pow(1 - portal.k, 3);
      portal.grp.scale.setScalar(Math.max(0.01, pe));
      portal.a.rotation.z += dt * 0.9; portal.b.rotation.z -= dt * 1.5;
      portal.glow.material.opacity = (0.45 + 0.15 * Math.sin(t * 2.5)) * pe;
      if (!portal.used && portal.k >= 1 && Math.hypot(cam.x - portal.x, cam.z - portal.z) < 0.9) portal.enter();
    }
    // aviso al entrar
    if (!welcomed && z < southZ + 3) { welcomed = true; ctx.ui.toast('Es más de medianoche y esta sala nunca duerme: relojes, espejos, un tablero enorme y un teléfono que no suena.', 7000); }
  });

  return { group: g, bounds, x: 0, z: CZ, w: W, d: D, door, lights, openHall, puzzle };
}

// ============================================================================================================
// ACERTIJOS DE LA SALA — Habitación 6 (Midnights): "La hora que falta". Se crea desde buildRoomMidnights con createMidnightsPuzzle(ctx, env).
//
//  El reloj gigante sobre la puerta lleva atascado en las 11:57. Faltan tres "minutos" (tres engranajes) para que dé la medianoche:
//   1) LA LLAMADA Y EL ESPEJO (oeste): el neón dice 13 y el espejo devuelve su reflejo, 31. Una nota junto al teléfono dice "marca lo que
//      ves y, después, lo que el espejo te devuelve". Se marca 1331 en las ruedas del atril y se descuelga el teléfono.
//      Una voz responde: "te espero cuando el reloj de abajo marque las tres y trece".
//   2) EL RELOJ DEL SUELO (centro): con la consola del anillo (HORA +1, MIN +5, MIN +1) hay que dejar el reloj en las 3:13.
//      Se abre una compuerta en el centro y sube el ENGRANAJE DORADO.
//   3) JAQUE MATE EN UNA JUGADA (este): el rey negro está solo y las blancas juegan. Se elige una pieza blanca, se ven sus movimientos
//      posibles y se mueve. Si no es mate, las piezas vuelven a su sitio. La solución es única. Premio: el ENGRANAJE PLATEADO.
//   4) LA MESA DE LOS RELOJES (sureste, a la derecha de la entrada): cinco relojes de mesa detenidos y una nota. Solo uno marca la
//      medianoche (las dos manecillas fundidas en una, apuntando arriba). Premio: el ENGRANAJE DE BRONCE.
//  FINAL: los tres engranajes se colocan en el pedestal bajo el reloj gigante -> da las 12:00, suenan 12 campanadas (un orbe se enciende en
//  cada una) y el orbe 13 se enciende al final; la bola de espejos baja y suelta la LLAVE FINAL (ctx.collect('finalkey') + puerta norte).
// ============================================================================================================
const TAU = Math.PI * 2;
const CALL_CODE = [1, 3, 3, 1];                          // 13 (el neón) + 31 (el reflejo)
const CLOCK_TARGET = 3 * 60 + 13, CLOCK_START = 9 * 60 + 40;     // minutos del día (módulo 720)
// Posición de ajedrez: [pieza, color, columna (0 = a), fila (0 = fila 1)]. Negro: Ra2 → blancas: Rh6, Db4 (dama), Tc7, Ag1. Mate único: Tc7-a7.
const CHESS_POS = [['K', 'b', 0, 1], ['K', 'w', 7, 5], ['Q', 'w', 1, 3], ['R', 'w', 2, 6], ['B', 'w', 6, 0]];
const PIECE_NAME = { K: 'el rey', Q: 'la dama', R: 'la torre', B: 'el alfil' };
const FILES = 'abcdefgh';

const T_NOTE = { title: 'Nota junto al teléfono', text: 'Marca lo que ves.\nDespués, lo que el espejo te devuelve.\n\nUsa las ruedas del atril. Cuando tengas el número, descuelga el teléfono.' };
const T_CALL = { title: 'Al otro lado de la línea', text: 'Suena una vez. Dos. Tres.\n\nContestan sin decir nada, y de pronto una voz muy lejana, casi un susurro:\n\n«Te espero cuando el reloj de abajo marque las tres y trece. Ni un minuto antes... ni uno después.»\n\nClic.' };
const T_CHESS = { title: 'Reglas para la jugada', text: 'Solo queda un rey negro y es el turno de las blancas.\n\nCómo se mueve cada pieza:\n· Rey: una casilla en cualquier dirección.\n· Dama: cualquier número de casillas en línea recta o diagonal.\n· Torre: en línea recta (filas y columnas).\n· Alfil: en diagonal.\nNinguna pieza salta sobre otras.\n\nJAQUE MATE: el rey está atacado y no tiene ninguna casilla segura a la que escapar.\n\nEncuentra la única jugada de las blancas que da jaque mate.' };

const T_NIGHT = { title: 'Nota sobre la mesa', text: 'Cinco relojes, todos detenidos. Cuatro se equivocan.\n\nSolo uno marca la hora en que una noche termina y otra empieza: aquella en que las dos manecillas se funden en una sola, apuntando al cielo.\n\nPresiona E sobre el reloj que dice la verdad.' };
// Esfera de un reloj de mesa detenido a las hh:mm
const deskClockTex = (hh, mm) => canvasTex(256, 256, (c) => {
  c.fillStyle = '#120b34'; c.fillRect(0, 0, 256, 256); c.translate(128, 128); c.lineCap = 'round';
  for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; c.strokeStyle = '#e0c36a'; c.lineWidth = k % 3 ? 4 : 9; c.beginPath(); c.moveTo(Math.sin(a) * 100, -Math.cos(a) * 100); c.lineTo(Math.sin(a) * 120, -Math.cos(a) * 120); c.stroke(); }
  const hand = (ang, len, w, col) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.sin(ang) * len, -Math.cos(ang) * len); c.stroke(); };
  hand((((hh % 12) + mm / 60) / 12) * TAU, 62, 13, '#f2ecff'); hand((mm / 60) * TAU, 98, 7, '#b9a4ff');
  c.fillStyle = '#e0c36a'; c.beginPath(); c.arc(0, 0, 10, 0, TAU); c.fill();
});

// ---------------- Motor mínimo de ajedrez (solo rey negro contra rey, dama, torre y alfil blancos) ----------------
// x = columna 0..7 (a..h), y = fila 0..7 (fila 1..8). Una pieza es { t, c, x, y }.
const inb = (x, y) => x >= 0 && x < 8 && y >= 0 && y < 8;
const SLIDE = { R: [[1, 0], [-1, 0], [0, 1], [0, -1]], B: [[1, 1], [1, -1], [-1, 1], [-1, -1]] };
const gridOf = (pcs) => { const gr = Array.from({ length: 8 }, () => Array(8).fill(null)); pcs.forEach((p) => (gr[p.y][p.x] = p)); return gr; };
function attackSquares(gr, p) {
  const out = [];
  if (p.t === 'K') { for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if ((dx || dy) && inb(p.x + dx, p.y + dy)) out.push([p.x + dx, p.y + dy]); return out; }
  const dirs = p.t === 'Q' ? [...SLIDE.R, ...SLIDE.B] : SLIDE[p.t];
  for (const [dx, dy] of dirs) { let x = p.x + dx, y = p.y + dy; while (inb(x, y)) { out.push([x, y]); if (gr[y][x]) break; x += dx; y += dy; } }
  return out;
}
const attackedBy = (pcs, color) => { const gr = gridOf(pcs), s = new Set(); pcs.filter((p) => p.c === color).forEach((p) => attackSquares(gr, p).forEach(([x, y]) => s.add(x + ',' + y))); return s; };
const blackKingOf = (pcs) => pcs.find((p) => p.c === 'b' && p.t === 'K');
function blackEscapes(pcs) {
  const k = blackKingOf(pcs), res = [];
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    if (!dx && !dy) continue; const nx = k.x + dx, ny = k.y + dy; if (!inb(nx, ny)) continue;
    const target = pcs.find((p) => p.x === nx && p.y === ny);                          // puede capturar una pieza si queda desprotegida
    const after = pcs.filter((p) => p !== target).map((p) => (p === k ? { ...p, x: nx, y: ny } : p));
    if (!attackedBy(after, 'w').has(nx + ',' + ny)) res.push([nx, ny]);
  }
  return res;
}
function verdictOf(pcs) {                                                                // 'mate' | 'check' | 'stalemate' | 'quiet'
  const k = blackKingOf(pcs), chk = attackedBy(pcs, 'w').has(k.x + ',' + k.y), esc = blackEscapes(pcs).length;
  return chk && !esc ? 'mate' : chk ? 'check' : !esc ? 'stalemate' : 'quiet';
}
function whiteMovesOf(pcs, p) {                                                          // destinos legales de una pieza blanca
  const gr = gridOf(pcs), bk = blackKingOf(pcs), out = [];
  attackSquares(gr, p).forEach(([x, y]) => {
    const o = gr[y][x]; if (o && (o.c === 'w' || o.t === 'K')) return;
    if (p.t === 'K' && Math.max(Math.abs(x - bk.x), Math.abs(y - bk.y)) <= 1) return;
    out.push([x, y]);
  });
  return out;
}
export const chessTools = { gridOf, attackSquares, verdictOf, whiteMovesOf, blackEscapes, CHESS_POS };

// ---------------- Lector de notas (panel HTML) ----------------
function makeReader() {
  const none = { open: false, key: null, show() {}, hide() {}, toggle() {} };
  if (typeof document === 'undefined' || !document.body || !document.createElement) return none;
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;z-index:7;display:none;align-items:center;justify-content:center;pointer-events:none;';
  const card = document.createElement('div');
  card.style.cssText = 'max-width:34rem;margin:1.5rem;padding:1.6rem 2.1rem 1.2rem;background:#e6defa;color:#241a4a;border:1px solid #8f7ae0;border-radius:3px;box-shadow:0 0 50px rgba(0,0,0,.8);font:italic 1.08rem/1.6 Georgia,"Times New Roman",serif;';
  const head = document.createElement('div'); head.style.cssText = 'font:bold 1.1rem Georgia,serif;font-style:normal;letter-spacing:.05em;margin-bottom:.8rem;color:#4a2a8a;';
  const body = document.createElement('div'); body.style.cssText = 'white-space:pre-line;';
  const foot = document.createElement('div'); foot.textContent = 'Presiona E para cerrar';
  foot.style.cssText = 'margin-top:1rem;font:.8rem Georgia,serif;font-style:normal;color:#6a5aa8;text-align:right;';
  card.appendChild(head); card.appendChild(body); card.appendChild(foot); el.appendChild(card); document.body.appendChild(el);
  const r = {
    open: false, key: null,
    show(key, title, text) { r.open = true; r.key = key; head.textContent = title; body.textContent = text; el.style.display = 'flex'; },
    hide() { r.open = false; r.key = null; el.style.display = 'none'; },
    toggle(key, title, text) { if (r.open && r.key === key) r.hide(); else r.show(key, title, text); },
  };
  document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement) r.hide(); });
  return r;
}

function createMidnightsPuzzle(ctx, env) {
  const { g, CZ, TALL, R, BD, phone, mat, box, cyl, hit, colBox, colRound, makeGlow, light, dark, sqx, sqz, ball, ballGlow, rod, BALL, orbs, hHour, hMin, hSec, clockGlow, addSource, onSolved } = env;
  const reader = makeReader(), clamp = THREE.MathUtils.clamp, ease = (k) => 1 - Math.pow(1 - k, 3);
  const state = { call: false, clock: false, chess: false, night: false, gears: 0, placed: 0 };
  const finale = { on: false, t: 0, strikes: 0, ballDone: false, keyT: -1 };
  const wp = (x, y, z) => g.localToWorld(new THREE.Vector3(x, y, z));
  const burst = (x, y, z, n, o) => ctx.particles.burst(wp(x, y, z), n, o);
  const goldM = () => mat(0xe0c36a, { metalness: 0.8, roughness: 0.3, emissive: 0x6a5410 });
  const labelTex = (text, w, h, { bg = null, fg = '#e9defc', font = 'bold 40px Georgia' } = {}) => canvasTex(w, h, (c) => { if (bg) { c.fillStyle = bg; c.fillRect(0, 0, w, h); } c.fillStyle = fg; c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, h / 2 + 2); });
  const sayHeld = () => ctx.ui.setHeld(state.gears ? `engranaje${state.gears > 1 ? 's' : ''} (${state.gears}/3)` : '');
  function makeGear(hex, em) {                                                          // engranaje con 12 dientes (eje en Z)
    const gr = new THREE.Group(), m = mat(hex, { metalness: 0.85, roughness: 0.28, emissive: em });
    gr.add(new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.08, 10, 28), m));
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU, t = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.17, 0.14), m); t.position.set(Math.cos(a) * 0.46, Math.sin(a) * 0.46, 0); t.rotation.z = a - Math.PI / 2; gr.add(t); }
    for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.07, 0.1), m); s.rotation.z = (i / 3) * Math.PI; gr.add(s); }
    gr.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 12), m)); gr.children[gr.children.length - 1].rotation.x = Math.PI / 2;
    return gr;
  }

  // =============================== 1) LA LLAMADA Y EL ESPEJO ===============================
  const POD = { x: -7.6, z: 9.0 };                                                      // atril con las 4 ruedas, junto a la mesa del teléfono
  box(0.5, 0.95, 1.3, mat(0x2a1a5a, { metalness: 0.3, roughness: 0.5 }), POD.x, 0.475, POD.z); colBox(POD.x - 0.3, POD.x + 0.3, POD.z - 0.7, POD.z + 0.7);
  const dialVals = [0, 0, 0, 0];
  const dials = dialVals.map((_, i) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const cx = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const draw = () => { cx.fillStyle = '#1b1240'; cx.fillRect(0, 0, 128, 128); cx.fillStyle = '#e9defc'; cx.font = 'bold 96px Georgia'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(String(dialVals[i]), 64, 70); tex.needsUpdate = true; };
    draw();
    const grp = new THREE.Group(); grp.position.set(POD.x + 0.26, 0.72, POD.z + (1.5 - i) * 0.27); g.add(grp);   // la rueda 1 queda a la izquierda de quien mira al atril
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 20), goldM()); rim.rotation.z = Math.PI / 2;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshBasicMaterial({ map: tex })); face.rotation.y = Math.PI / 2; face.position.x = 0.03;
    grp.add(rim, face, hit(0.2, 0.3, 0.26, 0.05, 0, 0));
    ctx.interaction.add(grp, { prompt: () => 'Presiona E para girar la rueda.', enabled: () => !state.call, onInteract: () => { dialVals[i] = (dialVals[i] + 1) % 10; draw(); ctx.audio.note(330 + dialVals[i] * 30); } });
    return grp;
  });
  const note = new THREE.Group(); note.position.set(POD.x, 0.97, POD.z); g.add(note);                  // nota sobre el atril
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.46), new THREE.MeshBasicMaterial({ map: labelTex('NOTA', 128, 160, { bg: '#e6defa', fg: '#4a2a8a', font: 'italic 34px Georgia' }) })); paper.rotation.x = -Math.PI / 2; paper.rotation.z = 0.2; note.add(paper, hit(0.5, 0.2, 0.6, 0, 0.05, 0));
  ctx.interaction.add(note, { prompt: () => 'Presiona E para leer la nota.', onInteract: () => reader.toggle('note', T_NOTE.title, T_NOTE.text) });
  ctx.interaction.add(phone, {
    prompt: () => (state.call ? 'Presiona E para escuchar el mensaje otra vez.' : 'Presiona E para descolgar y llamar.'),
    onInteract: () => {
      if (state.call) { reader.toggle('call', T_CALL.title, T_CALL.text); return; }
      if (reader.open) { reader.hide(); return; }
      if (dialVals.every((v) => v === 0)) { ctx.ui.toast('El teléfono espera un número. Las ruedas del atril lo marcan.', 4000); return; }
      if (!dialVals.every((v, i) => v === CALL_CODE[i])) { ctx.audio.error(); ctx.ui.toast('Tono de ocupado... ese número no existe.', 3500); return; }
      state.call = true; [0, 450, 900].forEach((d) => setTimeout(() => ctx.audio.note(480), d));
      setTimeout(() => { reader.show('call', T_CALL.title, T_CALL.text); ctx.audio.chime(); }, 1500);
    },
  });

  // =============================== 2) EL RELOJ DEL SUELO ===============================
  const handM = goldM();
  const mkHand = (len, wd) => { const gr = new THREE.Group(); gr.position.y = 0.05; g.add(gr); const m = new THREE.Mesh(new THREE.BoxGeometry(wd, 0.03, len), handM); m.position.z = -len / 2; gr.add(m); const tip = new THREE.Mesh(new THREE.ConeGeometry(wd * 1.3, wd * 3, 4), handM); tip.rotation.x = -Math.PI / 2; tip.position.z = -len - wd * 1.4; gr.add(tip); return gr; };
  const fHour = mkHand(3.7, 0.3), fMin = mkHand(6.0, 0.18);                 // el minutero apunta a las marcas de minutos (6.75 m)
  cyl(0.38, 0.38, 0.07, handM, 0, 0.06, 0, 24);
  const hatch = cyl(0.8, 0.8, 0.02, mat(0x1a1040, { metalness: 0.5, roughness: 0.4, emissive: 0x120a30 }), 0, 0.02, 0, 32);
  let totalMin = CLOCK_START, shownMin = CLOCK_START;                                    // minutos acumulados (las manecillas giran siempre hacia adelante)
  const CON = { x: 0, z: 8.3 };                                                           // consola del reloj, en el borde sur del anillo
  box(2.0, 1.1, 0.6, mat(0x2a1a5a, { metalness: 0.3, roughness: 0.5 }), CON.x, 0.55, CON.z); colBox(CON.x - 1.05, CON.x + 1.05, CON.z - 0.35, CON.z + 0.35);
  const dispCv = document.createElement('canvas'); dispCv.width = 256; dispCv.height = 96;
  const dispCx = dispCv.getContext('2d'), dispTex = new THREE.CanvasTexture(dispCv); dispTex.colorSpace = THREE.SRGBColorSpace;
  const timeText = (m) => { const h = Math.floor(m / 60) % 12 || 12, mm = m % 60; return h + ':' + String(mm).padStart(2, '0'); };
  const drawDisp = () => { dispCx.fillStyle = '#0a0620'; dispCx.fillRect(0, 0, 256, 96); dispCx.strokeStyle = '#8f7ae0'; dispCx.lineWidth = 4; dispCx.strokeRect(4, 4, 248, 88); dispCx.fillStyle = state.clock ? '#e0c36a' : '#e9defc'; dispCx.font = 'bold 64px Georgia'; dispCx.textAlign = 'center'; dispCx.textBaseline = 'middle'; dispCx.fillText(timeText(totalMin), 128, 52); dispTex.needsUpdate = true; };
  drawDisp();
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.49), new THREE.MeshBasicMaterial({ map: dispTex })); disp.position.set(CON.x, 0.86, CON.z + 0.305); g.add(disp);
  const conBtn = (x, label, delta) => {
    const lb = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.14), new THREE.MeshBasicMaterial({ map: labelTex(label, 224, 56, { font: 'bold 34px Georgia' }), transparent: true })); lb.position.set(x, 0.58, CON.z + 0.305); g.add(lb);
    const grp = new THREE.Group(); grp.position.set(x, 0.38, CON.z + 0.3); g.add(grp);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 20), goldM()); b.rotation.x = Math.PI / 2; b.position.z = 0.04; grp.add(b, hit(0.4, 0.4, 0.3, 0, 0, 0.1));
    ctx.interaction.add(grp, { prompt: () => 'Presiona E para ' + (delta === 60 ? 'sumar una hora.' : 'sumar ' + delta + ' minuto' + (delta > 1 ? 's.' : '.')), enabled: () => !state.clock, onInteract: () => advanceClock(delta) });
  };
  conBtn(-0.62, 'HORA +1', 60); conBtn(0, 'MIN +5', 5); conBtn(0.62, 'MIN +1', 1);
  function advanceClock(delta) {
    if (!state.call) { ctx.ui.toast('La maquinaria está trabada y no sabes a qué hora ponerla. Quizá alguien sepa la hora correcta...', 4500); return; }
    totalMin += delta; ctx.audio.note(delta === 60 ? 330 : delta === 5 ? 392 : 440); drawDisp();
    if (totalMin % 720 === CLOCK_TARGET) {
      state.clock = true; drawDisp(); ctx.audio.reward(); hatchT = 0;
      ctx.ui.toast('Las manecillas encajan. Una compuerta se abre en el centro del reloj y sube un engranaje dorado.', 6000);
    }
  }
  let hatchT = -1;
  const gearA = makeGear(0xe0c36a, 0x6a5410); gearA.position.set(0, -0.3, 0); gearA.visible = false; g.add(gearA); gearA.add(makeGlow(0xffd36a, 1.6), hit(0.9, 0.9, 0.5, 0, 0, 0));
  let gearAUp = false, gearATaken = false;
  ctx.interaction.add(gearA, { prompt: () => 'Presiona E para tomar el engranaje dorado.', enabled: () => gearA.visible && gearAUp && !gearATaken, onInteract: () => takeGear('A') });
  function takeGear(which) {
    if (which === 'A') { gearATaken = true; gearA.visible = false; } else if (which === 'B') { gearBTaken = true; gearB.visible = false; } else { gearCTaken = true; gearC.visible = false; }
    state.gears++; sayHeld(); ctx.audio.chime();
    const left = 3 - state.gears - state.placed;
    ctx.ui.toast(left <= 0 ? 'Tienes los tres engranajes. El pedestal bajo el reloj gigante los espera.' : left === 1 ? 'Engranaje recogido. Falta uno más.' : `Engranaje recogido. Faltan ${left} más.`, 4000);
  }

  // =============================== 3) JAQUE MATE EN UNA JUGADA ===============================
  const toX = (x) => sqx(x), toZ = (y) => sqz(7 - y);                                     // columna/fila de ajedrez -> posición en la sala
  function buildPiece(t, c) {
    const m = (c === 'w' ? light : dark).clone(), gr = new THREE.Group();
    cyl(0.3, 0.34, 0.12, m, 0, 0.06, 0, 16, gr);                                          // base común (el origen del grupo es la cara del tablero)
    if (t === 'R') { cyl(0.22, 0.28, 0.6, m, 0, 0.42, 0, 12, gr); cyl(0.3, 0.24, 0.16, m, 0, 0.8, 0, 12, gr); for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.PI / 4; box(0.12, 0.14, 0.12, m, Math.cos(a) * 0.24, 0.95, Math.sin(a) * 0.24, gr); } }
    else if (t === 'B') { cyl(0.14, 0.28, 0.95, m, 0, 0.6, 0, 12, gr); const s = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), m); s.position.y = 1.2; s.scale.y = 1.3; gr.add(s); const k = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), m); k.position.y = 1.58; gr.add(k); }
    else if (t === 'Q') { cyl(0.16, 0.3, 1.25, m, 0, 0.75, 0, 14, gr); cyl(0.36, 0.2, 0.2, m, 0, 1.47, 0, 14, gr); const s = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), m); s.position.y = 1.7; gr.add(s); }
    else { cyl(0.18, 0.32, 1.35, m, 0, 0.8, 0, 14, gr); cyl(0.38, 0.26, 0.2, m, 0, 1.57, 0, 14, gr); box(0.1, 0.5, 0.1, m, 0, 1.9, 0, gr); box(0.36, 0.1, 0.1, m, 0, 1.95, 0, gr); }
    return { gr, m };
  }
  const board = { pcs: [], selected: null, locked: false, legal: new Set() };
  CHESS_POS.forEach(([t, c, x, y]) => {
    const { gr, m } = buildPiece(t, c); gr.position.set(toX(x), 0.125, toZ(y)); g.add(gr);
    const col = colRound(toX(x), toZ(y), 0.3);
    board.pcs.push({ t, c, x, y, hx: x, hy: y, gr, m, col, lift: 0, anim: null });
  });
  const data = () => board.pcs.map((p) => ({ t: p.t, c: p.c, x: p.x, y: p.y }));
  const bKing = board.pcs.find((p) => p.c === 'b');
  const setCol = (p) => { const x = p.gr.position.x, z = p.gr.position.z + CZ; p.col.minX = x - 0.3; p.col.maxX = x + 0.3; p.col.minZ = z - 0.3; p.col.maxZ = z + 0.3; };
  // casillas: resaltado + zona para apuntar
  const sqMat = new THREE.MeshBasicMaterial({ color: 0xb9a4ff, transparent: true, opacity: 0.6, depthWrite: false });
  const squares = [];
  for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) {
    const gr = new THREE.Group(); gr.position.set(toX(x), 0.13, toZ(y)); g.add(gr);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.27, 24), sqMat); dot.rotation.x = -Math.PI / 2; dot.position.y = 0.01; dot.visible = false; gr.add(dot, hit(BD.sq * 0.95, 0.3, BD.sq * 0.95, 0, 0.15, 0));
    const sq = { x, y, gr, dot, key: x + ',' + y }; squares.push(sq);
    ctx.interaction.add(gr, { prompt: () => `Presiona E para mover a ${FILES[x]}${y + 1}.`, enabled: () => !!board.selected && !board.locked && board.legal.has(sq.key), onInteract: () => moveSelected(x, y) });
  }
  const showLegal = (list) => { board.legal = new Set(list.map(([x, y]) => x + ',' + y)); squares.forEach((s) => (s.dot.visible = board.legal.has(s.key))); };
  function select(p) {
    if (board.selected === p) { board.selected = null; showLegal([]); return; }
    board.selected = p; ctx.audio.note(520);
    const d = data(), me = d[board.pcs.indexOf(p)]; showLegal(whiteMovesOf(d, me));
  }
  board.pcs.forEach((p) => {
    p.gr.add(hit(0.8, 2.2, 0.8, 0, 1.1, 0));
    ctx.interaction.add(p.gr, {
      prompt: () => (p.c === 'b' ? 'Es el rey negro.' : board.selected === p ? `Presiona E para soltar ${PIECE_NAME[p.t]}.` : `Presiona E para elegir ${PIECE_NAME[p.t]} (${FILES[p.x]}${p.y + 1}).`),
      enabled: () => !state.chess,
      onInteract: () => {
        if (p.c === 'b') { ctx.ui.toast('El rey negro está solo y acorralado. ¿Qué jugada de las blancas lo deja sin salida?', 4500); return; }
        if (board.locked) return; select(p);
      },
    });
  });
  function moveSelected(x, y) {
    const p = board.selected; if (!p) return;
    board.locked = true; showLegal([]); board.selected = null;
    p.anim = { fx: p.gr.position.x, fz: p.gr.position.z, tx: toX(x), tz: toZ(y), t: 0, after: () => judge(p, x, y) };
    p.x = x; p.y = y; if (ctx.audio.thud) ctx.audio.thud();
  }
  function judge(p, x, y) {
    const v = verdictOf(data());
    if (v === 'mate') { state.chess = true; board.locked = true; ctx.audio.success(); ctx.ui.toast('¡Jaque mate! El rey negro cae... y sobre el tablero aparece un engranaje plateado.', 6000); kingT = 0; return; }
    ctx.audio.error();
    ctx.ui.toast({ check: 'Es jaque, pero el rey negro todavía puede escapar. Las piezas vuelven a su lugar.', stalemate: 'El rey negro se queda sin movimientos, pero no está en jaque: eso son tablas, no mate. Las piezas vuelven a su lugar.', quiet: 'Eso ni siquiera es jaque. Las piezas vuelven a su lugar.' }[v], 5000);
    resetT = 0;
  }
  let kingT = -1, resetT = -1;
  const gearB = makeGear(0xdfe6ff, 0x4a5a8a); gearB.position.set(BD.x, 0.6, BD.z); gearB.visible = false; g.add(gearB); gearB.add(makeGlow(0xb9a4ff, 1.6), hit(0.9, 0.9, 0.5, 0, 0, 0));
  let gearBUp = false, gearBTaken = false;
  ctx.interaction.add(gearB, { prompt: () => 'Presiona E para tomar el engranaje plateado.', enabled: () => gearB.visible && gearBUp && !gearBTaken, onInteract: () => takeGear('B') });
  // tarjeta con las reglas, junto al tablero
  { const card = new THREE.Group(); card.position.set(BD.x - 4.9, 0, BD.z + 2.4); g.add(card);
    cyl(0.05, 0.06, 0.9, mat(0x2a1a5a), 0, 0.45, 0, 8, card);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.5), new THREE.MeshBasicMaterial({ map: labelTex('Reglas', 224, 160, { bg: '#e6defa', fg: '#4a2a8a', font: 'italic 40px Georgia' }) })); pl.position.set(0, 1.05, 0); pl.rotation.y = Math.PI / 2; card.add(pl, hit(0.5, 0.9, 1.0, 0, 1.0, 0)); colRound(BD.x - 4.9, BD.z + 2.4, 0.2);
    ctx.interaction.add(card, { prompt: () => 'Presiona E para leer las reglas.', onInteract: () => reader.toggle('chess', T_CHESS.title, T_CHESS.text) }); }

  // =============================== 4) LA MESA DE LOS RELOJES (sureste) ===============================
  // A la derecha de la entrada: cinco relojes de mesa detenidos. Solo uno marca la medianoche (manecillas fundidas, apuntando arriba).
  const TB = { x: 12.6, z: 12.0, len: 6.2 };
  box(1.0, 0.9, TB.len, mat(0x2a1a5a, { metalness: 0.3, roughness: 0.5 }), TB.x, 0.45, TB.z);
  box(1.12, 0.06, TB.len + 0.1, goldM(), TB.x, 0.93, TB.z);
  colBox(TB.x - 0.6, TB.x + 0.6, TB.z - TB.len / 2 - 0.05, TB.z + TB.len / 2 + 0.05);
  cyl(0.015, 0.015, TALL - 3.2, mat(0x9a90c8, { metalness: 0.8 }), TB.x - 0.2, (TALL + 3.2) / 2, TB.z, 4);                   // lámpara colgante
  const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.38, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xb9a4ff, emissive: 0x8f7ae0, emissiveIntensity: 1.3, side: THREE.DoubleSide }));
  lampShade.position.set(TB.x - 0.2, 3.1, TB.z); g.add(lampShade);
  addSource(TB.x - 0.2, 2.85, TB.z, 0xb9a4ff, 1.1, 3.2);
  const STOPPED = [[9, 15], [11, 55], [6, 0], [12, 0], [3, 30]];                          // de norte a sur; el de las 12:00 es el cuarto
  const hhmm = (hh, mm) => hh + ':' + String(mm).padStart(2, '0');
  let nightT = -1, gearCUp = false, gearCTaken = false;
  const gearC = makeGear(0xc4803a, 0x5a3010); gearC.rotation.y = -Math.PI / 2; gearC.position.set(TB.x - 0.45, 1.2, TB.z + 1.05); gearC.visible = false; g.add(gearC);
  gearC.add(makeGlow(0xffb060, 1.6), hit(0.9, 0.9, 0.5, 0, 0, 0));
  ctx.interaction.add(gearC, { prompt: () => 'Presiona E para tomar el engranaje de bronce.', enabled: () => gearC.visible && gearCUp && !gearCTaken, onInteract: () => takeGear('C') });
  STOPPED.forEach(([hh, mm], i) => {
    const grp = new THREE.Group(); grp.position.set(TB.x - 0.1, 1.5, TB.z + (i - 2) * 1.05); grp.rotation.y = -Math.PI / 2; g.add(grp);     // miran hacia el oeste (hacia la sala)
    grp.add(new THREE.Mesh(new THREE.CircleGeometry(0.42, 40), new THREE.MeshBasicMaterial({ map: deskClockTex(hh, mm) })));
    const back = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ color: 0x120b34 })); back.rotation.y = Math.PI; back.position.z = -0.02; grp.add(back);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.045, 10, 40), goldM()); rim.position.z = 0.01; grp.add(rim);
    cyl(0.06, 0.1, 0.22, goldM(), 0, -0.45, -0.04, 10, grp);
    grp.add(hit(0.95, 0.95, 0.4, 0, 0, 0.1));
    ctx.interaction.add(grp, {
      prompt: () => 'Presiona E para examinar el reloj.',
      enabled: () => !state.night,
      onInteract: () => {
        if (hh % 12 === 0 && mm === 0) {
          state.night = true; nightT = 0; ctx.audio.reward();
          const gl = makeGlow(0xffd36a, 2.6, 0.75); gl.position.z = 0.3; grp.add(gl);
          ctx.ui.toast('Las dos manecillas se funden en una, apuntando al cielo. Suenan doce campanadas lejanas... y de la mesa sube un engranaje de bronce.', 7000);
        } else { ctx.audio.error(); ctx.ui.toast(`Este reloj marca las ${hhmm(hh, mm)}. Sus manecillas no se funden en una.`, 4000); }
      },
    });
  });
  const note2 = new THREE.Group(); note2.position.set(TB.x, 0.97, TB.z + 2.8); g.add(note2);                          // nota en el extremo sur de la mesa
  const paper2 = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.46), new THREE.MeshBasicMaterial({ map: labelTex('NOTA', 128, 160, { bg: '#e6defa', fg: '#4a2a8a', font: 'italic 34px Georgia' }) })); paper2.rotation.x = -Math.PI / 2; paper2.rotation.z = -0.15; note2.add(paper2, hit(0.5, 0.2, 0.6, 0, 0.05, 0));
  ctx.interaction.add(note2, { prompt: () => 'Presiona E para leer la nota.', onInteract: () => reader.toggle('night', T_NIGHT.title, T_NIGHT.text) });

  // =============================== EL PEDESTAL Y EL FINAL ===============================
  const PE = { x: 0, z: -14.2 };
  cyl(0.55, 0.68, 1.0, mat(0x2a1a5a, { metalness: 0.4, roughness: 0.4 }), PE.x, 0.5, PE.z, 20); cyl(0.62, 0.62, 0.06, goldM(), PE.x, 1.03, PE.z, 20); colRound(PE.x, PE.z, 0.7);
  const GEAR_SPOTS = [[-0.28, 1.38], [0, 1.62], [0.28, 1.38]];                              // tres engranajes encajados entre sí
  const placedGears = GEAR_SPOTS.map(([dx, y], i) => { const gr = makeGear([0xe0c36a, 0xdfe6ff, 0xc4803a][i], [0x6a5410, 0x4a5a8a, 0x5a3010][i]); gr.scale.setScalar(0.4); gr.position.set(PE.x + dx, y, PE.z + 0.1); gr.visible = false; g.add(gr); return gr; });
  const socketM = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 8, 20), goldM());
  GEAR_SPOTS.forEach(([dx]) => { const s = socketM.clone(); s.position.set(PE.x + dx, 1.07, PE.z + 0.1); s.rotation.x = Math.PI / 2; g.add(s); });
  const pedHit = new THREE.Group(); pedHit.position.set(PE.x, 0, PE.z); pedHit.add(hit(1.5, 1.6, 1.5, 0, 0.8, 0)); g.add(pedHit);
  ctx.interaction.add(pedHit, {
    prompt: () => (state.gears ? 'Presiona E para colocar los engranajes.' : 'Presiona E para examinar el pedestal.'),
    enabled: () => !finale.on && state.placed < 3,
    onInteract: () => {
      if (!state.gears) { ctx.ui.toast('Al pedestal le faltan tres engranajes: uno duerme bajo el reloj del suelo, otro está en el ajedrez y el último, en la mesa de los relojes.', 6000); return; }
      for (let i = 0; i < state.gears; i++) placedGears[state.placed + i].visible = true;
      state.placed += state.gears; state.gears = 0; sayHeld(); ctx.audio.chime();
      if (state.placed >= 3) startFinale(); else ctx.ui.toast(state.placed === 1 ? 'Un engranaje encaja. Faltan dos.' : 'Dos engranajes encajan. Falta uno.', 4000);
    },
  });
  const keyM = new THREE.MeshStandardMaterial({ color: 0x8a96ff, emissive: 0x4a56cc, roughness: 0.3, metalness: 0.9 });
  const key = new THREE.Group(); key.visible = false; g.add(key);
  { const r = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 10, 24), keyM); r.position.y = 0.28; key.add(r, new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 10), keyM));
    [[-0.2, 0.09], [-0.3, 0.07]].forEach(([y, w]) => { const tt = new THREE.Mesh(new THREE.BoxGeometry(w * 1.6, 0.05, 0.04), keyM); tt.position.set(w * 0.8 + 0.02, y, 0); key.add(tt); }); }
  key.scale.setScalar(1.5); key.add(makeGlow(0x8a96ff, 1.1), hit(0.5, 0.9, 0.4, 0, 0, 0));
  ctx.interaction.add(key, {
    prompt: () => 'Presiona E para recoger la Llave final.', enabled: () => key.visible && finale.keyT >= 1,
    onInteract: () => { key.visible = false; ctx.audio.reward(); ctx.collect('finalkey'); onSolved(); ctx.game.solved++; ctx.ui.toast('Has recuperado el recuerdo de Midnights.', 6000); },
  });
  function startFinale() { finale.on = true; finale.t = 0; finale.strikes = 0; ctx.ui.toast('Los engranajes giran... el reloj gigante despierta.', 4500); }

  // =============================== ANIMACIÓN ===============================
  const STRIKE_T0 = 2.4, STRIKE_DT = 0.75, LAST_T = STRIKE_T0 + STRIKE_DT * 11, ORB13_T = LAST_T + 2.2, BALL_T = ORB13_T + 1.3, BALL_DUR = 3.2;
  const lightOrb = (o, big) => { o.lit = true; o.sphere.material.color.set(0xfff0b0); o.gl.material.color.set(0xffd36a); o.gl.scale.setScalar(big ? 3.2 : 2.3); };
  ctx.updaters.push((dt, t) => {
    // reloj del suelo: las manecillas giran suavemente hacia la hora marcada
    shownMin += (totalMin - shownMin) * Math.min(1, dt * 6);
    fMin.rotation.y = -(shownMin / 60) * TAU; fHour.rotation.y = -(shownMin / 720) * TAU;
    if (hatchT >= 0 && hatchT < 1) { hatchT = Math.min(1, hatchT + dt / 1.2); hatch.scale.set(1 - ease(hatchT), 1, 1 - ease(hatchT)); gearA.visible = true; gearA.position.y = -0.3 + 1.7 * ease(hatchT); if (hatchT >= 1) { gearAUp = true; hatch.visible = false; } }
    if (gearA.visible) { gearA.rotation.z += dt * 0.8; if (gearAUp) gearA.position.y = 1.4 + Math.sin(t * 2) * 0.06; }
    // tablero: pieza elegida se eleva; movimiento; rey que cae; reinicio tras un error
    board.pcs.forEach((p) => {
      const tl = board.selected === p ? 0.25 : 0; p.lift += (tl - p.lift) * Math.min(1, dt * 10);
      if (p.anim) {
        p.anim.t = Math.min(1, p.anim.t + dt / 0.45); const k = ease(p.anim.t);
        p.gr.position.x = p.anim.fx + (p.anim.tx - p.anim.fx) * k; p.gr.position.z = p.anim.fz + (p.anim.tz - p.anim.fz) * k; setCol(p);
        if (p.anim.t >= 1) { const f = p.anim.after; p.anim = null; f && f(); }
      }
      p.gr.position.y = 0.125 + p.lift + (p.anim ? Math.sin(p.anim.t * Math.PI) * 0.35 : 0);
      p.m.emissiveIntensity = board.selected === p ? 2.2 : 1;
    });
    if (resetT >= 0) {
      resetT += dt;
      if (resetT > 1.8) { resetT = -1; board.pcs.forEach((p) => { if (p.x !== p.hx || p.y !== p.hy) { p.anim = { fx: p.gr.position.x, fz: p.gr.position.z, tx: toX(p.hx), tz: toZ(p.hy), t: 0, after: null }; p.x = p.hx; p.y = p.hy; } }); setTimeout(() => (board.locked = false), 600); }
    }
    squares.forEach((s) => { if (s.dot.visible) s.dot.material.opacity = 0.5 + 0.25 * Math.sin(t * 5); });
    if (kingT >= 0 && kingT < 1) {
      kingT = Math.min(1, kingT + dt / 1.1); bKing.gr.rotation.z = -ease(kingT) * Math.PI / 2; bKing.gr.position.y = 0.125 + ease(kingT) * 0.5;
      if (kingT >= 1) { gearB.visible = true; gearBUp = true; burst(BD.x, 1.2, BD.z, 40, { speed: 1.0, up: 1.4 }); ctx.audio.reward(); }
    }
    if (gearB.visible) { gearB.rotation.z += dt * 0.8; gearB.position.y = 1.5 + Math.sin(t * 2 + 1) * 0.06; }
    // mesa de los relojes: sube el engranaje de bronce
    if (nightT >= 0 && nightT < 1) { nightT = Math.min(1, nightT + dt / 1.4); gearC.visible = true; gearC.position.y = 1.2 + 1.3 * ease(nightT); if (nightT >= 1) { gearCUp = true; burst(TB.x - 0.45, 2.5, TB.z + 1.05, 30, { speed: 1.0, up: 1.2 }); } }
    if (gearC.visible) { gearC.rotation.z += dt * 0.8; if (gearCUp) gearC.position.y = 2.5 + Math.sin(t * 2 + 2) * 0.06; }
    // el final: 12:00, doce campanadas, el orbe 13, la bola de espejos baja y suelta la llave
    if (finale.on) {
      finale.t += dt; const ft = finale.t;
      if (ft < 2.2) { const k = ease(ft / 2.2); hMin.rotation.z = -((57 + 3 * k) / 60) * TAU; hHour.rotation.z = -((11 + (57 + 3 * k) / 60) / 12) * TAU; hSec.rotation.z -= dt * 14; }
      else { hMin.rotation.z = -TAU; hHour.rotation.z = -TAU; hSec.rotation.z = 0; }
      while (finale.strikes < 12 && ft >= STRIKE_T0 + STRIKE_DT * finale.strikes) {
        const o = orbs[finale.strikes]; lightOrb(o, false); ctx.audio.note(finale.strikes === 11 ? 98 : 131); ctx.audio.chime();
        clockGlow.material.opacity = 0.7; burst(o.sphere.position.x, 1.8, o.sphere.position.z, 8, { speed: 0.4, up: 0.8 }); finale.strikes++;
      }
      clockGlow.material.opacity += (0.28 - clockGlow.material.opacity) * Math.min(1, dt * 3);
      if (finale.strikes === 12 && !orbs[12].lit && ft >= ORB13_T) { lightOrb(orbs[12], true); ctx.audio.success(); burst(orbs[12].sphere.position.x, 1.8, orbs[12].sphere.position.z, 30, { speed: 1.0, up: 1.4 }); ctx.ui.toast('El número 13... el de la suerte. La bola de espejos empieza a bajar.', 5000); }
      if (ft >= BALL_T) {
        const k = clamp((ft - BALL_T) / BALL_DUR, 0, 1), y = BALL.y + (2.7 - BALL.y) * ease(k);
        ball.position.y = y; ballGlow.position.y = y; rod.scale.y = (TALL - y) / (TALL - BALL.y); rod.position.y = (TALL + y) / 2;
        if (k >= 1 && !finale.ballDone) { finale.ballDone = true; key.visible = true; key.position.set(0, y - 0.3, 0); finale.keyT = 0; ctx.audio.chord(); burst(0, y, 0, 40, { speed: 1.0, up: 0.8 }); }
      }
      if (finale.keyT >= 0 && finale.keyT < 1) { finale.keyT = Math.min(1, finale.keyT + dt / 0.9); key.position.y = 2.4 + (1.5 - 2.4) * ease(finale.keyT); }
      if (finale.keyT >= 1) { key.position.y = 1.5 + Math.sin(t * 2) * 0.05; key.rotation.y += dt * 1.6; }
    }
  });

  return { state, finale, board, dialVals, reader, gearA, gearB, gearC, key, fHour, fMin, orbsLit: () => orbs.filter((o) => o.lit).length, totalMin: () => totalMin };
}