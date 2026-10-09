// roomReputation.js — Habitación 3: Reputation. Sala del trono dorada (abanicos art déco, bordes turquesa),
// serpientes en las paredes, calaveras doradas, té, rojo... y recortes de periódico en blanco y negro.
// Es 12x12 (las salas anteriores son 10x10).
//
// Acertijo: la portada del álbum cuelga en la pared norte. En el suelo hay 10 espejos con una letra cada uno
// (R E P U T A I O N + una H de "engaño"). Hay que PISARLOS en orden para formar R-E-P-U-T-A-T-I-O-N
// (la T se pisa dos veces). Cada acierto ilumina el espejo y escribe la letra en el titular de la pared;
// si pisas uno equivocado, el espejo parpadea en rojo, se agrieta y la palabra se deshace.
// Al completarla aparece una serpiente plateada sobre el trono y se desbloquea la puerta.
import * as THREE from 'three';
import { createRoom, createDoor, addWall, canvasTex, makeTextTexture, DOOR_H, WALL_H } from './rooms.js';
import { addBox, addTube, neon } from './room1989.js';
import { createGlitter } from './glitter.js';

const TAU = Math.PI * 2;
const CZ = -29, SIZE = 12;                               // centro en Z y lado de la sala (sala 2 = -14; su pasillo termina en z = -23)
const WORD = 'REPUTATION';
const GOLD = 0xd4a640, RED = 0xd01828;
const COVER_URL = 'assets/images/reputation.png';        // portada del álbum (copiar el archivo a esa ruta)
const clamp = THREE.MathUtils.clamp;

// Espejos del suelo (x, z locales; el centro de la sala es 0,0 y el norte es -Z). Hay 10: 9 letras + la H de engaño.
// Recorrido correcto: R(-1.2,-2.6) E P U T A T I O N, un zigzag que da la vuelta a la sala.
const TILES = [
  { l: 'R', x: -1.2, z: -2.6 }, { l: 'E', x: -3.6, z: -0.2 }, { l: 'P', x: -3.6, z: 2.2 }, { l: 'U', x: -1.2, z: 2.2 },
  { l: 'T', x: 1.2, z: 2.2 },   { l: 'A', x: 3.6, z: 2.2 },   { l: 'I', x: 3.6, z: -0.2 }, { l: 'O', x: 3.6, z: -2.6 },
  { l: 'N', x: 1.2, z: -2.6 }, { l: 'H', x: -3.6, z: -2.6 },
];
const NOTES = [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3, 784, 880];   // una nota por letra acertada

// ================= Texturas =================
function makeWallTexture() {                              // un "azulejo" de 3 m x 4 m: abanicos y rombos dorados, bordes turquesa
  return canvasTex(384, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#d9b45a'); gr.addColorStop(0.5, '#bf9238'); gr.addColorStop(1, '#a37a28');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const fan = (cx, cy, r, rays, a0) => {
      for (let i = 0; i < rays; i++) {
        g.fillStyle = i % 2 ? '#ecd183' : '#b8892f';
        g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, a0 + (i / rays) * Math.PI, a0 + ((i + 1) / rays) * Math.PI); g.closePath(); g.fill();
      }
      g.strokeStyle = 'rgba(80,50,8,.6)'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, r, a0, a0 + Math.PI); g.stroke();
    };
    fan(192, h, 150, 14, Math.PI); fan(192, 0, 120, 12, 0);          // abanicos abajo y arriba
    g.strokeStyle = 'rgba(80,50,8,.6)'; g.lineWidth = 3;             // rombos
    [118, 92].forEach((s) => { g.beginPath(); g.moveTo(192, 256 - s); g.lineTo(192 + s * 0.75, 256); g.lineTo(192, 256 + s); g.lineTo(192 - s * 0.75, 256); g.closePath(); g.stroke(); });
    g.fillStyle = 'rgba(120,80,15,.55)'; g.beginPath(); g.moveTo(192, 226); g.lineTo(214, 256); g.lineTo(192, 286); g.lineTo(170, 256); g.closePath(); g.fill();
    g.fillStyle = '#0f6b6b'; g.fillRect(0, 0, 14, h); g.fillRect(w - 14, 0, 14, h);   // bordes turquesa
    g.fillStyle = '#ecd183'; g.fillRect(14, 0, 3, h); g.fillRect(w - 17, 0, 3, h);
  });
}
function makeFloorTexture() {                             // mármol casi negro con vetas y filete dorado
  const t = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#0b0f12'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(160,170,180,.10)'; g.lineWidth = 2;
    for (let k = 0; k < 9; k++) { let x = Math.random() * w, y = 0; g.beginPath(); g.moveTo(x, y); for (let i = 0; i < 8; i++) { x += (Math.random() - 0.5) * 80; y += h / 8; g.lineTo(x, y); } g.stroke(); }
    g.strokeStyle = 'rgba(212,166,64,.55)'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function makeNewspaperTexture(w, h, headline = 'REPUTATION') {   // collage de periódico en blanco y negro (como la portada)
  return canvasTex(w, h, (g) => {
    g.fillStyle = '#e9e5db'; g.fillRect(0, 0, w, h);
    const cols = Math.max(3, Math.round(w / 90)), cw = w / cols;
    for (let c = 0; c < cols; c++) {
      let y = 10 + Math.random() * 30;
      while (y < h - 12) {
        if (Math.random() < 0.12) {                       // titular: bloque negro con letras blancas
          const bh = 28 + Math.random() * 26; g.fillStyle = '#111'; g.fillRect(c * cw + 6, y, cw - 12, bh);
          g.fillStyle = '#eee'; g.font = `bold ${Math.round(bh * 0.6)}px Georgia`; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(headline, c * cw + 10, y + bh / 2, cw - 20);
          y += bh + 8;
        } else { g.fillStyle = '#333'; g.fillRect(c * cw + 8, y, (cw - 16) * (0.6 + Math.random() * 0.4), 3); y += 8; }
      }
    }
  });
}
function makeGlassTexture() {                             // el "reflejo" de los espejos de pared
  return canvasTex(128, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#2c2c36'); gr.addColorStop(0.5, '#0e0e14'); gr.addColorStop(1, '#1f202a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.07)'; g.save(); g.transform(1, 0, -0.5, 1, 0, 0); g.fillRect(80, 0, 26, h); g.fillRect(120, 0, 12, h); g.restore();
  });
}
const tileTexture = (letter) => canvasTex(256, 256, (g, w, h) => {   // espejo del suelo con la letra grabada
  const gr = g.createLinearGradient(0, 0, w, h);
  gr.addColorStop(0, '#2c2c36'); gr.addColorStop(0.5, '#0e0e14'); gr.addColorStop(1, '#1f202a');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,.06)'; g.save(); g.transform(1, 0, -0.5, 1, 0, 0); g.fillRect(120, 0, 30, h); g.restore();
  g.strokeStyle = 'rgba(212,166,64,.9)'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
  g.font = 'bold 170px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = '#ffffff'; g.shadowBlur = 12; g.fillStyle = 'rgba(255,255,255,.92)'; g.fillText(letter, w / 2, h / 2 + 8);
});
function makeCrackTexture() {                             // grietas rojas para el espejo equivocado
  return canvasTex(256, 256, (g) => {
    g.strokeStyle = '#ff3040'; g.lineWidth = 4; g.lineCap = 'round'; g.shadowColor = '#ff0020'; g.shadowBlur = 10;
    const cx = 100 + Math.random() * 56, cy = 100 + Math.random() * 56;
    for (let k = 0; k < 10; k++) {
      let x = cx, y = cy, a = (k / 10) * TAU + Math.random() * 0.4; g.beginPath(); g.moveTo(x, y);
      for (let i = 0; i < 5; i++) { a += (Math.random() - 0.5) * 0.7; x += Math.cos(a) * 30; y += Math.sin(a) * 30; g.lineTo(x, y); }
      g.stroke();
    }
  });
}
function makeDrapeTexture() {                             // cortina de terciopelo rojo
  return canvasTex(128, 256, (g, w, h) => {
    for (let x = 0; x < w; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, '#4a0610'); gr.addColorStop(0.5, '#a31020'); gr.addColorStop(1, '#4a0610'); g.fillStyle = gr; g.fillRect(x, 0, 16, h); }
  });
}
// Titular de la pared: casillas para las 10 letras. state: 'normal' | 'wrong' | 'solved'
function drawBoard(g, w, h, typed, state) {
  g.fillStyle = '#0b0b0b'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#d4a640'; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = '#d4a640'; g.font = 'bold 34px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('— EXTRA! EXTRA! —', w / 2, 40);
  const sw = (w - 100) / 10;
  for (let i = 0; i < 10; i++) {
    const x = 50 + i * sw;
    g.fillStyle = '#e9e5db'; g.fillRect(x + 6, h - 56, sw - 12, 6);
    if (i < typed) { g.fillStyle = state === 'wrong' ? '#ff3040' : state === 'solved' ? '#fff0b0' : '#d4a640'; g.font = 'bold 100px Georgia'; g.fillText(WORD[i], x + sw / 2, h - 108); }
  }
}

// ================= Serpientes =================
// Piel: rombos oscuros con borde claro sobre escamas finas (se repite cada ~0.9 m a lo largo del cuerpo).
function makeSkinTexture(base, dark, light) {
  const t = canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 1;
    for (let y = 0; y < h; y += 8) for (let x = ((y / 8) % 2) * 6; x < w; x += 12) { g.beginPath(); g.arc(x, y, 6, 0, Math.PI); g.stroke(); }
    for (let k = 0; k < 4; k++) {
      const cx = k * 64 + 32, cy = h / 2;
      g.beginPath(); g.moveTo(cx, cy - 40); g.lineTo(cx + 28, cy); g.lineTo(cx, cy + 40); g.lineTo(cx - 28, cy); g.closePath();
      g.fillStyle = dark; g.fill(); g.strokeStyle = light; g.lineWidth = 3; g.stroke();
      g.fillStyle = light; g.globalAlpha = 0.35; g.beginPath(); g.arc(cx, cy, 6, 0, TAU); g.fill(); g.globalAlpha = 1;
      g.fillStyle = dark; g.beginPath(); g.arc(k * 64, h * 0.12, 8, 0, TAU); g.fill(); g.beginPath(); g.arc(k * 64, h * 0.88, 8, 0, TAU); g.fill();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}
// Grosor a lo largo del cuerpo (u: 0 = cola, 1 = cuello): punta fina, panza gruesa y cuello algo más delgado.
const bodyProfile = (u) => (u < 0.35 ? 0.12 + 0.88 * (u / 0.35) * (2 - u / 0.35) : u > 0.88 ? 1 - 0.3 * ((u - 0.88) / 0.12) : 1);
// Tubo de grosor variable (como TubeGeometry, pero con radio = R * perfil(u)).
function makeTaperedTube(curve, segs, radial, R, profile, uvLen) {
  const frames = curve.computeFrenetFrames(segs, false), len = curve.getLength();
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs, P = curve.getPointAt(u), N = frames.normals[i], B = frames.binormals[i], r = R * profile(u);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * TAU, c = -Math.cos(a), sn = Math.sin(a);       // mismo sentido que THREE.TubeGeometry (caras hacia afuera)
      pos.push(P.x + r * (c * N.x + sn * B.x), P.y + r * (c * N.y + sn * B.y), P.z + r * (c * N.z + sn * B.z));
      uv.push((u * len) / uvLen, j / radial);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = (i + 1) * (radial + 1) + j, c = b + 1, d = a + 1;
    idx.push(a, b, d, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}
const sphereUnit = new THREE.SphereGeometry(1, 14, 10), blackMat = new THREE.MeshBasicMaterial({ color: 0x050505 }), tongueMat = new THREE.MeshBasicMaterial({ color: 0xb01428 });
// Cabeza triangular (mira hacia +X, la coronilla hacia +Y): cráneo, hocico, mandíbula clara, ojos con pupila vertical, fosas y lengua bífida.
function makeHead(r, mats) {
  const h = new THREE.Group();
  const add = (m, x, y, z, sx, sy, sz) => { const o = new THREE.Mesh(sphereUnit, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); h.add(o); return o; };
  add(mats.body, r * 0.5, 0, 0, r * 1.7, r * 0.62, r * 1.05);
  add(mats.body, r * 1.8, -r * 0.02, 0, r * 1.0, r * 0.45, r * 0.6);
  add(mats.belly, r * 1.0, -r * 0.3, 0, r * 1.6, r * 0.28, r * 0.85);
  [1, -1].forEach((s) => {
    add(mats.eye, r * 1.05, r * 0.3, s * r * 0.72, r * 0.2, r * 0.2, r * 0.2);
    addBox(h, r * 0.04, r * 0.3, r * 0.06, blackMat, r * 1.07, r * 0.3, s * r * 0.89);                     // pupila vertical
    add(blackMat, r * 2.4, r * 0.12, s * r * 0.18, r * 0.05, r * 0.05, r * 0.05);                          // fosa nasal
  });
  const tongue = new THREE.Group(); tongue.position.set(r * 2.55, -r * 0.12, 0); h.add(tongue);
  addBox(tongue, r * 1.1, r * 0.05, r * 0.07, tongueMat, r * 0.55, 0, 0);
  [1, -1].forEach((s) => { const f = addBox(tongue, r * 0.4, r * 0.04, r * 0.05, tongueMat, r * 1.25, 0, s * r * 0.07); f.rotation.y = s * 0.45; });
  h.userData.tongue = tongue;
  return h;
}
// Orienta la cabeza: "forward" = dirección del cuello; "up" = hacia dónde mira la coronilla (p. ej. hacia el interior de la sala).
function orientHead(head, forward, up) {
  const f = forward.clone().normalize(), u = up.clone().sub(f.clone().multiplyScalar(up.dot(f))).normalize();
  head.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f, u, new THREE.Vector3().crossVectors(f, u)));
}
// Serpiente gruesa que recorre una pared (cuerpo cónico con piel + cabeza). `heads` recibe la cabeza para animar la lengua.
function makeBigSnake(points, R, mats, up, heads) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(makeTaperedTube(curve, 260, 12, R, bodyProfile, 0.9), mats.body));
  const head = makeHead(R * 1.5, mats), tan = curve.getTangent(1);
  head.position.copy(curve.getPoint(1)).addScaledVector(tan, -R * 0.4); orientHead(head, tan, up);
  grp.add(head); heads.push(head);
  return grp;
}
// Camino ondulante ("reptación") entre a y b sobre una pared. plane 'zy': a,b = [z, y] con x = depth · plane 'xy': a,b = [x, y] con z = depth.
function slither(plane, a, b, amp, waves, depth, n = 30) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, w = amp * Math.sin(u * TAU * waves) * (0.35 + 0.65 * Math.sin(Math.PI * u)), x = a[0] + dx * u + nx * w, y = a[1] + dy * u + ny * w;
    pts.push(plane === 'zy' ? [depth, y, x] : [x, y, depth]);
  }
  return pts;
}

// ================= Habitación 3: Reputation =================
export function buildRoomReputation(ctx, room2) {
  const cam = ctx.camera.position;
  const half = SIZE / 2;                                  // 6 -> el interior llega a ±5.8
  const wallTex = makeWallTexture(); wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.55, metalness: 0.25, emissive: 0x2a1c06 });
  const floorTex = makeFloorTexture(); floorTex.repeat.set(SIZE / 2, SIZE / 2);
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.18, metalness: 0.6 });
  const room = createRoom(ctx, { name: 'Habitación 3 — Reputation', z: CZ, w: SIZE, d: SIZE, wallMat, floorMat, ceilColor: 0x1a1208, southOpening: 3 });
  const abs = room.group;
  // Cada pared recibe una copia del material con el patrón repetido cada 3 m (así los abanicos no se deforman).
  abs.traverse((o) => {
    if (o.isMesh && o.material === wallMat) {
      const p = o.geometry.parameters, m = wallMat.clone(), tex = wallTex.clone();
      tex.needsUpdate = true; tex.repeat.set(Math.max(p.width, p.depth) / 3, p.height / WALL_H); m.map = tex; o.material = m;
    }
  });
  const g = new THREE.Group(); g.position.z = CZ; ctx.scene.add(g);      // contenido en coordenadas locales (norte = -Z)
  const box = (w, h, d, m, x, y, z, p = g) => addBox(p, w, h, d, m, x, y, z);
  const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
  const colBox = (x0, x1, z0, z1) => ctx.colliders.push({ minX: x0, maxX: x1, minZ: CZ + z0, maxZ: CZ + z1 });
  const wp = (x, y, z) => new THREE.Vector3(x, y, z + CZ);

  const gold = mat(GOLD, { metalness: 0.55, roughness: 0.4, emissive: 0x3a2808 });     // (metal + emissive: sin mapa de entorno un metal puro se ve negro)
  const redVelvet = mat(0x9a1020, { roughness: 0.9, emissive: 0x200306 });
  const skin = makeSkinTexture('#4a3822', '#2a1d10', '#a58a56');
  const snakeMats = {
    body: mat(0xffffff, { map: skin, bumpMap: skin, bumpScale: 2, roughness: 0.42, metalness: 0.1, emissive: 0x100a04 }),
    belly: mat(0x9a8458, { roughness: 0.5, emissive: 0x100a04 }),
    eye: mat(0xd8a020, { roughness: 0.2, emissive: 0x553a05 }),
  };
  const heads = [];                                       // cabezas de todas las serpientes (para animar la lengua)
  const lights = { mute: 1 };                             // para atenuar esta sala cuando exista la siguiente

  // --- Iluminación: ambiente cálido + 2 luces doradas + un acento rojo junto al trono ---
  const ambient = new THREE.AmbientLight(0xffe2b0, 0.6); g.add(ambient);
  const lp = [
    { base: 24, color: 0xffc870, dist: 15, pos: [-3, 3.6, 2.5] },
    { base: 24, color: 0xffc870, dist: 15, pos: [3, 3.6, -2.5] },
    { base: 10, color: 0xff2a2a, dist: 7, red: true, pos: [4.4, 2.6, 0] },
  ].map((o) => { o.l = new THREE.PointLight(o.color, o.base, o.dist); o.l.position.set(...o.pos); g.add(o.l); return o; });

  // --- Zócalo y molduras doradas ---
  box(11.6, 0.14, 0.06, gold, 0, 0.25, 5.77); box(0.06, 0.14, 11.6, gold, -5.77, 0.25, 0); box(0.06, 0.14, 11.6, gold, 5.77, 0.25, 0);
  [-3.75, 3.75].forEach((x) => { box(4.4, 0.14, 0.06, gold, x, 0.25, -5.77); box(4.4, 0.14, 0.06, gold, x, 0.25, 5.77); });

  // --- Portada del álbum (pared norte, izquierda): marco dorado ornamentado ---
  const placeholder = makeNewspaperTexture(256, 256, 'reputation');
  const coverMat = new THREE.MeshBasicMaterial({ map: placeholder, color: new THREE.Color(0.45, 0.45, 0.45) });   // atenuada: el papel blanco deslumbraba y no se leía
  new THREE.TextureLoader().load(COVER_URL, (tex) => { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; coverMat.map = tex; coverMat.needsUpdate = true; }, undefined, () => {});
  const cover = new THREE.Group(); cover.position.set(-3.75, 2.1, -5.74); g.add(cover);
  box(2.8, 2.8, 0.08, gold, 0, 0, 0, cover);
  box(2.55, 2.55, 0.1, mat(0x0a0a0a), 0, 0, 0.01, cover);
  const coverPic = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), coverMat); coverPic.position.z = 0.065; cover.add(coverPic);
  [[-1.4, 1.4], [1.4, 1.4], [-1.4, -1.4], [1.4, -1.4]].forEach(([x, y]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), gold); s.position.set(x, y, 0.06); cover.add(s); });
  ctx.interaction.add(cover, {
    prompt: () => 'Presiona E para mirar la portada.',
    onInteract: () => ctx.ui.toast('La portada de una nueva etapa. Su nombre está escrito en ella... Las letras duermen sobre espejos en el suelo: písalas en orden, una a una. Cuidado: una de ellas es un engaño.', 9000),
  });

  // --- Titular de la pared (pared norte, derecha): muestra las letras acertadas ---
  const boardTex = canvasTex(1024, 256, (g2, w, h) => drawBoard(g2, w, h, 0, 'normal'));
  const board = new THREE.Group(); board.position.set(3.75, 2.2, -5.74); g.add(board);
  box(3.3, 1.0, 0.08, gold, 0, 0, 0, board);
  const boardPic = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 0.8), new THREE.MeshBasicMaterial({ map: boardTex })); boardPic.position.z = 0.05; board.add(boardPic);
  ctx.interaction.add(board, {
    prompt: () => 'Presiona E para leer el titular.',
    onInteract: () => ctx.ui.toast('Un titular a medio escribir... las letras aparecerán aquí cuando pises los espejos correctos.', 5000),
  });
  let boardDirty = false, boardState = 'normal';
  const redrawBoard = () => { const c = boardTex.image; drawBoard(c.getContext('2d'), c.width, c.height, idx, boardState); boardTex.needsUpdate = true; };

  // --- Cortinas rojas junto a la puerta, recortes de periódico (oeste) y espejos de pared (sur) ---
  const drapeTex = makeDrapeTexture();
  [-1.85, 1.85].forEach((x) => { const d = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.4, 0.15), new THREE.MeshStandardMaterial({ map: drapeTex, roughness: 0.9, emissive: 0x200306 })); d.position.set(x, 1.7, -5.7); g.add(d); });
  [-2.4, 2.4].forEach((z) => {
    box(2.6, 1.8, 0.06, mat(0x0a0a0a), -5.76, 2.1, z).rotation.y = Math.PI / 2;
    const np = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), new THREE.MeshBasicMaterial({ map: makeNewspaperTexture(512, 320), color: new THREE.Color(0.3, 0.3, 0.3) }));
    np.position.set(-5.72, 2.1, z); np.rotation.y = Math.PI / 2; g.add(np);
  });
  const glassTex = makeGlassTexture();
  [-3.75, 3.75].forEach((x) => {
    const m = new THREE.Group(); m.position.set(x, 2.0, 5.74); m.rotation.y = Math.PI; g.add(m);
    box(1.5, 2.3, 0.06, gold, 0, 0, 0, m);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 2.05), new THREE.MeshStandardMaterial({ map: glassTex, roughness: 0.08, metalness: 0.6, emissive: new THREE.Color(0.06, 0.06, 0.08) })); gl.position.z = 0.04; m.add(gl);
    ctx.interaction.add(m, { prompt: () => 'Presiona E para mirar el espejo.', onInteract: () => ctx.ui.toast('Solo devuelve tu mirada... el camino está en el suelo.', 4000) });
  });

  // --- Serpientes grandes en las paredes (detrás del trono, en el oeste y sobre la pared norte) ---
  [
    { r: 0.11, up: [-1, 0, 0], pts: slither('zy', [-5.0, 0.15], [0.3, 3.1], 0.45, 2.5, 5.66) },        // este: sube hacia el trono
    { r: 0.11, up: [-1, 0, 0], pts: slither('zy', [5.0, 0.15], [-0.3, 3.2], 0.45, 2.5, 5.66) },
    { r: 0.07, up: [1, 0, 0], pts: slither('zy', [-5.2, 0.5], [5.2, 0.5], 0.22, 6, -5.66) },          // oeste: a ras de suelo
    { r: 0.08, up: [0, 0, 1], pts: slither('xy', [-5.6, 3.78], [0.9, 3.78], 0.1, 4, -5.64) },         // norte: sobre la portada y la puerta
  ].forEach((sn) => g.add(makeBigSnake(sn.pts, sn.r, snakeMats, new THREE.Vector3(...sn.up), heads)));

  // --- Trono dorado con calaveras en los brazos (pared este, mira al oeste) ---
  const throne = new THREE.Group(); throne.position.set(5.1, 0, 0); throne.rotation.y = -Math.PI / 2; g.add(throne);
  box(1.0, 0.18, 0.9, gold, 0, 0.5, 0, throne); box(0.88, 0.12, 0.78, redVelvet, 0, 0.65, 0, throne);
  [-0.42, 0.42].forEach((x) => [-0.36, 0.36].forEach((z) => box(0.1, 0.42, 0.1, gold, x, 0.21, z, throne)));
  box(1.0, 2.0, 0.12, gold, 0, 1.55, -0.4, throne); box(0.8, 1.5, 0.04, redVelvet, 0, 1.5, -0.33, throne);
  box(1.1, 0.14, 0.16, gold, 0, 2.62, -0.4, throne);
  [-0.52, 0.52].forEach((x) => { box(0.12, 2.7, 0.12, gold, x, 1.35, -0.4, throne); const f = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), gold); f.position.set(x, 2.78, -0.4); throne.add(f); });
  [-0.55, 0.55].forEach((x) => {
    box(0.1, 0.1, 0.85, gold, x, 0.98, 0, throne); box(0.1, 0.35, 0.1, gold, x, 0.8, 0.38, throne);
    const sk = new THREE.Group(); sk.position.set(x, 1.13, 0.42); throne.add(sk);        // calavera dorada
    sk.add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), gold));
    box(0.14, 0.06, 0.1, gold, 0, -0.1, 0.05, sk);
    [-0.05, 0.05].forEach((ex) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mat(0x050505)); e.position.set(ex, 0.02, 0.11); sk.add(e); });
  });
  colBox(4.55, 5.75, -0.85, 0.85);

  // --- Mesita de té en el centro (taza y tetera) + lámpara de techo ---
  const tea = new THREE.Group(); tea.position.set(0, 0, -0.2); g.add(tea);
  const white = mat(0xf2f0ea, { roughness: 0.3, emissive: 0x1a1a18 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 24), gold); top.position.y = 0.75; tea.add(top);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.72, 10), gold); stem.position.y = 0.38; tea.add(stem);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.04, 20), gold); foot.position.y = 0.02; tea.add(foot);
  const pot = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), white); pot.scale.y = 0.85; pot.position.set(-0.15, 0.91, 0); tea.add(pot);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.18, 8), white); spout.position.set(-0.3, 0.95, 0); spout.rotation.z = 1.0; tea.add(spout);
  const lid = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), white); lid.position.set(-0.15, 1.06, 0); tea.add(lid);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.07, 14), white); cup.position.set(0.18, 0.815, 0.05); tea.add(cup);
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.01, 16), white); saucer.position.set(0.18, 0.785, 0.05); tea.add(saucer);
  colBox(-0.55, 0.55, -0.75, 0.35);
  ctx.interaction.add(tea, { prompt: () => 'Presiona E para mirar el té.', onInteract: () => ctx.ui.toast('Una taza de té todavía tibia. Alguien se levantó de prisa de este trono...', 4500) });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.03, 8, 28), gold); ring.rotation.x = Math.PI / 2; ring.position.set(0, 3.3, -0.2); g.add(ring);
  box(0.03, 0.7, 0.03, gold, 0, 3.65, -0.2);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU, b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: neon(0xffe0a0, 2) })); b.position.set(Math.cos(a) * 0.6, 3.36, -0.2 + Math.sin(a) * 0.6); g.add(b); }

  // --- Espejos del suelo con letras (el acertijo) ---
  const crackTex = makeCrackTexture();
  const tiles = TILES.map((t) => {
    const grp = new THREE.Group(); grp.position.set(t.x, 0, t.z); g.add(grp);
    box(1.3, 0.03, 1.3, gold, 0, 0.015, 0, grp);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshStandardMaterial({ map: tileTexture(t.l), roughness: 0.1, metalness: 0.6, emissive: new THREE.Color(0.05, 0.05, 0.07) }));
    glass.rotation.x = -Math.PI / 2; glass.position.y = 0.032; grp.add(glass);
    const crack = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, color: neon(0xffffff, 2), depthWrite: false }));
    crack.rotation.x = -Math.PI / 2; crack.position.y = 0.036; crack.visible = false; grp.add(crack);
    return { ...t, grp, glass, crack, inside: false, lit: false, blinkUntil: 0 };
  });

  // --- Serpiente de plata coleccionable (aparece sobre el trono al completar la palabra) ---
  const silverSkin = makeSkinTexture('#c8ccd8', '#7f8498', '#f2f4ff');
  const silverMat = mat(0xffffff, { map: silverSkin, bumpMap: silverSkin, bumpScale: 2, metalness: 0.6, roughness: 0.3, emissive: 0x444a66 });
  const silverMats = { body: silverMat, belly: mat(0xe8ecff, { emissive: 0x444a66 }), eye: snakeMats.eye };
  const mkSilverSnake = () => {
    const grp = new THREE.Group(), p = [];
    for (let i = 0; i <= 24; i++) { const a = i * 0.55, r = 0.14 - i * 0.002; p.push(new THREE.Vector3(Math.cos(a) * r, i * 0.012, Math.sin(a) * r)); }
    p.push(new THREE.Vector3(0.05, 0.4, 0), new THREE.Vector3(0.02, 0.58, 0), new THREE.Vector3(0.1, 0.72, 0), new THREE.Vector3(0.2, 0.74, 0));
    const curve = new THREE.CatmullRomCurve3(p);
    grp.add(new THREE.Mesh(makeTaperedTube(curve, 200, 10, 0.032, bodyProfile, 0.3), silverMat));
    const h = makeHead(0.05, silverMats), tan = curve.getTangent(1);
    h.position.copy(curve.getPoint(1)).addScaledVector(tan, -0.012); orientHead(h, tan, new THREE.Vector3(0, 1, 0)); grp.add(h); heads.push(h);
    return grp;
  };
  const glowTex = canvasTex(128, 128, (c) => {
    const r = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.3)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = r; c.fillRect(0, 0, 128, 128);
  });
  const snake = mkSilverSnake(); snake.scale.setScalar(1.4); snake.visible = false;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xbfc8ff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); glow.scale.setScalar(1.0); glow.position.y = 0.4; snake.add(glow);
  g.add(snake);
  let emergeAt = -1, ready = false;
  ctx.interaction.add(snake, {
    prompt: () => 'Presiona E para recoger la serpiente plateada.',
    enabled: () => snake.visible && ready,
    onInteract: () => {
      snake.visible = false; ctx.audio.reward(); ctx.collect('snake');
      ctx.ui.toast('Has recuperado el recuerdo de Reputation.', 5000);
    },
  });

  // --- Polvo dorado y brasas rojas flotando ---
  createGlitter(ctx, { count: 140, size: { x: 11, y: 3.6, z: 11 }, center: [0, 0, CZ], color: 0xffd36a }).uniforms.uIntensity.value = 0.8;
  createGlitter(ctx, { count: 60, size: { x: 11, y: 3.6, z: 11 }, center: [0, 0, CZ], color: 0xff2030 }).uniforms.uIntensity.value = 0.6;

  // --- Puerta de salida (norte) + pasillo hacia la siguiente era ---
  const doorZ = CZ - half, len = 4;
  const door = createDoor(ctx, { x: 0, z: doorZ, width: room.doorWidth });
  door.mesh.material.color.set(0x8a6a1e); door.mesh.material.emissive.set(0x2a1a04); door.mesh.material.metalness = 0.5;
  addTube(g, 0.07, DOOR_H, 0.07, RED, -1.56, DOOR_H / 2, -half + 0.02, 1.6); addTube(g, 0.07, DOOR_H, 0.07, RED, 1.56, DOOR_H / 2, -half + 0.02, 1.6);
  addTube(g, 3.2, 0.07, 0.07, RED, 0, DOOR_H, -half + 0.02, 1.6);
  const hallMat = mat(0x6b4f1a, { roughness: 1, emissive: 0x1a1204 });
  addWall(ctx, abs, -1.6, doorZ - len / 2, 0.2, len, hallMat);
  addWall(ctx, abs, 1.6, doorZ - len / 2, 0.2, len, hallMat);
  addWall(ctx, abs, 0, doorZ - len, 3.4, 0.2, hallMat);                    // (al crear la sala 4: quitar esta pared, como en las salas 1 y 2)
  const hallFloor = new THREE.Mesh(new THREE.PlaneGeometry(3, len), mat(0x0b0f12));
  hallFloor.rotation.x = -Math.PI / 2; hallFloor.position.set(0, 0.005, doorZ - len / 2);
  const hallCeil = hallFloor.clone(); hallCeil.rotation.x = Math.PI / 2; hallCeil.position.y = 4;
  const hallSign = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.9), new THREE.MeshBasicMaterial({
    map: makeTextTexture('Una nueva etapa empieza cuando escribes tu propio nombre... la siguiente era te espera.', { w: 640, h: 200, color: '#f3d38a', font: '30px Georgia' }), transparent: true }));
  hallSign.position.set(0, 2, doorZ - len + 0.12);
  const hallLight = new THREE.PointLight(0xffc870, 0, 9); hallLight.position.set(0, 3, doorZ - 2);
  abs.add(hallFloor, hallCeil, hallSign, hallLight);
  let hallBase = 0;

  // ================= Lógica del acertijo =================
  let idx = 0, solved = false, redPop = 0, goldBoost = 1, now = 0;
  let current = null;                                     // el único espejo iluminado mientras avanzas (así la T se ve las dos veces)

  function step(t) {                                      // el jugador acaba de entrar en un espejo
    if (t.l === WORD[idx]) {                              // ✓ es la letra que toca
      idx++; if (current) current.lit = false;            // el anterior se apaga...
      current = t; t.lit = true; t.pulseAt = now;         // ...y este se enciende con un destello
      ctx.audio.note(NOTES[idx - 1]);
      ctx.particles.burst(wp(t.x, 0.3, t.z), 18, { speed: 0.6, up: 1 });
      boardState = 'normal'; boardDirty = true;
      if (idx === WORD.length) solve();
      return;
    }
    if (current) current.lit = false; current = null; idx = 0;   // ✗ equivocado: la palabra se deshace
    t.blinkUntil = now + 1.4; redPop = 1;
    ctx.audio.error(); ctx.audio.crack();
    ctx.particles.burst(wp(t.x, 0.3, t.z), 25, { speed: 0.8, up: 0.8 });
    boardState = 'wrong'; boardDirty = true; boardWrongUntil = now + 0.9;
    ctx.ui.toast(t.l === 'H' ? 'Esa letra no pertenece aquí... la palabra se deshace.' : 'Ese no era el siguiente paso... la palabra se deshace.', 3000);
  }
  let boardWrongUntil = 0;

  function solve() {
    solved = true; ctx.game.solved++;
    boardState = 'solved'; boardDirty = true;
    tiles.forEach((tl) => (tl.lit = tl.l !== 'H'));        // celebración: se encienden todas las letras de la palabra (la H no)
    ctx.audio.success(); redPop = 0; emergeAt = now;
    snake.visible = true; snake.position.set(5.0, 0.8, 0);
    ctx.particles.burst(wp(5.0, 1.2, 0), 70, { speed: 1.4, up: 1.8 });
    door.unlock();                                        // (para desbloquear al RECOGER la serpiente, mover esta línea al onInteract de arriba)
    ctx.ui.toast('La palabra está completa... una nueva etapa comienza. Algo plateado se mueve sobre el trono. La puerta se desbloquea.', 6000);
  }

  // ================= Animación y luces (cada frame) =================
  let nextHiss = 15;
  ctx.updaters.push((dt, t) => {
    now = t;
    const z = cam.z;
    const k3 = clamp((-z - 19) / 4, 0, 1);               // 0 en la sala 2 -> 1 dentro de la sala 3
    room2.lights.mute = clamp((z + 23) / 4, 0.04, 1);    // las luces de la sala 2 se apagan al cruzar el pasillo
    redPop = Math.max(0, redPop - dt * 1.2);
    goldBoost += ((solved ? 1.5 : 1) - goldBoost) * Math.min(1, dt * 1.5);
    const base = k3 * lights.mute;
    ambient.intensity = 0.6 * base * (1 + redPop * 0.5);
    lp.forEach((o, i) => { o.l.intensity = o.base * base * (0.95 + 0.05 * Math.sin(t * 1.3 + i)) * (o.red ? 1 + redPop * 3 : goldBoost); });

    // Detección de pasos: se evalúa al ENTRAR en un espejo (el centro del jugador dentro de la baldosa)
    tiles.forEach((tl) => {
      const inside = Math.abs(cam.x - tl.x) < 0.55 && Math.abs(cam.z - (CZ + tl.z)) < 0.55;
      if (inside && !tl.inside && !solved) step(tl);
      tl.inside = inside;
      const blinking = t < tl.blinkUntil;
      if (blinking) {                                     // parpadeo rojo + grietas + temblor
        const on = Math.floor(t * 10) % 2 === 0;
        tl.glass.material.emissive.setRGB(on ? 1 : 0.08, 0, on ? 0.04 : 0);
        tl.crack.visible = true; tl.crack.material.opacity = on ? 1 : 0.35; tl.grp.position.y = Math.sin(t * 80) * 0.01;
      } else if (tl.lit) {                                // iluminado: dorado con un destello al pisarlo
        const k = solved ? 0.8 + 0.2 * Math.sin(t * 3) : 0.85 + 0.15 * Math.sin(t * 4), fl = solved ? 0 : Math.exp(-(t - (tl.pulseAt || 0)) * 3);
        tl.glass.material.emissive.setRGB(0.75 * k + 0.6 * fl, 0.55 * k + 0.5 * fl, 0.12 * k + 0.3 * fl); tl.crack.visible = false; tl.grp.position.y = 0;
      } else {
        tl.glass.material.emissive.setRGB(0.05, 0.05, 0.07); tl.grp.position.y = 0;
        const fade = clamp((tl.blinkUntil + 1.0 - t) / 1.0, 0, 1);                 // las grietas se desvanecen
        tl.crack.visible = fade > 0; tl.crack.material.opacity = fade * 0.8;
      }
    });
    heads.forEach((h, i) => { const k = Math.pow(Math.max(0, Math.sin(t * 1.6 + i * 2.1)), 10); h.userData.tongue.scale.x = Math.max(0.001, k); h.userData.tongue.visible = k > 0.02; });
    if (boardState === 'wrong' && t > boardWrongUntil) { boardState = 'normal'; boardDirty = true; }
    if (boardDirty) { boardDirty = false; redrawBoard(); }
    coverMat.color.setScalar(solved ? 0.52 + 0.08 * Math.sin(t * 3) : 0.45);          // al resolver la portada late suavemente (sin deslumbrar)

    if (snake.visible) {                                  // la serpiente se eleva sobre el trono y gira despacio
      const e = clamp((t - emergeAt) / 3, 0, 1), k = 1 - Math.pow(1 - e, 3);
      snake.position.set(4.95, 0.8 + 0.9 * k + (ready ? Math.sin(t * 2) * 0.04 : 0), 0);
      snake.rotation.y += dt * 0.8;
      if (e >= 1) ready = true;
    }
    if (door.opening) hallBase = Math.min(10, hallBase + dt * 4);
    hallLight.intensity = hallBase * lights.mute;
    if (k3 > 0.9 && t > nextHiss) { nextHiss = t + 25 + Math.random() * 20; ctx.audio.hiss(); }   // siseo lejano ocasional
  });

  return { ...room, door, lights };
}