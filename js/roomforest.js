// roomforest.js — Habitación 5: Folklore / Evermore. Un bosque de 40 × 32 m (1280 m², casi nueve veces la sala Lover) con tres caminos.
//
//  Distribución (x: oeste -, este +; z: norte -, sur +). Se entra por el sur, a un claro con un gran árbol y farolas:
//   · OESTE  (otoño, hojas, luz cálida): la cabaña del farolero.
//   · ESTE   (invierno, nieve): un sendero con cuatro cruces que termina en un lago helado.
//   · NORTE  (niebla): un árbol caído y niebla espesa cierran el paso hasta resolver los otros dos caminos. Detrás, el sauce.
//
//  ACERTIJO 1 · Las cartas de la cabaña
//    Tres cartas (Inés, Mateo y Clara) cuentan la misma noche con versiones distintas. Cada una se equivoca en UN dato y lo
//    advierte ("yo cuento mal a la gente", "no miro el reloj", "no distingo las luces"). Hay que quedarse con lo que dicen
//    las otras dos: hora 7, 4 personas, 3 faroles  ->  código 743. Se pone en los tres diales de la cómoda y se abre el cajón.
//    Un cartel junto a la puerta de la cabaña ("Las verdades a medias") explica la mecánica.
//  ACERTIJO 2 · Las huellas en la nieve
//    Cuatro cruces seguidos. Las huellas llevan a las ramas equivocadas (engañan). Cada cruce tiene una pista distinta:
//    luciérnagas (cruce 1), musgo en los troncos (cruce 2) y un canto lejano que se oye desde una dirección (cruce 3) y,
//    en el cruce 4, un acertijo de orden: cuatro piedras guardianas que hay que despertar siguiendo una inscripción.
//    Si te equivocas, la niebla te devuelve al inicio del sendero. Termina en el lago helado, con una caja.
//    En cada cruce, la salida correcta está tapada por niebla sólida y solo se despeja al interactuar con la pista de ese cruce
//    (luciérnaga que vuela alrededor del tocón, musgo de los troncos, caja de música). Las ramas falsas tienen niebla de trampa.
//    La caja SOLO se abre si recorriste los cuatro cruces en orden sin equivocarte (variable "trail"); si sales del sendero
//    o caes en una trampa, el progreso se reinicia.
//  ACERTIJO 3 · El sauce
//    Las dos páginas (cajón y caja) dan el orden de cinco faroles con símbolos. Se encienden en ese orden en el sauce:
//    copo, hoja, luna, casa, estrella. Al acertar, baja la Llave antigua y se abre la puerta norte.
//  Las páginas ya encontradas quedan guardadas en el tocón de notas, junto al sauce.
import * as THREE from 'three';
import { createDoor, addWall, canvasTex, DOOR_H } from './rooms.js';
import { createGlitter } from './glitter.js';

const W = 40, D = 32;                  // 1280 m² (la sala Lover mide 12 × 12 = 144 m²). Medidas pares: la rejilla de 1 m queda alineada
const HALL = 4;                        // pasillo entre la puerta de Lover y el bosque (= HALL_OUT de roomlover.js)
const TALL = 14;                       // altura de las paredes / cielo del bosque
const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ================= Contenido de los acertijos =================
const CODE = [7, 4, 3];                                   // hora, personas, faroles
const LETTERS = [
  { who: 'Inés', title: 'Carta de Inés', text:
`Para quien lea esto:

Me preguntan por aquella noche. La tormenta empezó a las siete en punto: lo sé porque acababa de sonar la campana de la plaza.

Éramos cinco alrededor de la mesa, aunque ya sabes que yo cuento de más cuando hay ruido, y esa noche había mucho. En el porche ardían tres faroles.

— Inés` },
  { who: 'Mateo', title: 'Carta de Mateo', text:
`Para quien lea esto:

Dicen que fue a las nueve, pero yo nunca miro el reloj y no te aseguro nada de la hora.

De lo que sí estoy seguro es de las tazas: puse cuatro sobre la mesa, ni una más, y las cuatro se vaciaron. Y los faroles del porche eran tres; los conté dos veces mientras Clara me gritaba que entrara.

— Mateo` },
  { who: 'Clara', title: 'Carta de Clara', text:
`Para quien lea esto:

Cuando llueve no distingo bien las luces, así que no te fíes de lo que diga de los faroles: me parecieron dos.

En cambio la hora la recuerdo bien: eran las siete en punto, la campana de la plaza acababa de sonar. Y alrededor de la mesa nos sentamos cuatro: Inés, Mateo, el viejo Anselmo y yo.

— Clara` },
];
const CLUES = {
  cabin: { title: 'Página arrancada del cuaderno del farolero', text:
`Aprende el orden antes de encender nada.

La hoja cae antes de que salga la luna.
La luna ya debe estar en lo alto antes de que la casa abra su puerta.` },
  lake: { title: 'Nota helada, escrita con tinta azul', text:
`El copo siempre va primero: abre el camino.
La hoja viene después del copo.

Y la estrella... la estrella espera a que todo lo demás ya brille.` },
};
const SIGN_EAST = { title: 'Cartel del sendero', text:
`Cuatro cruces. Cuatro guías.

Los caminos son únicos y te conducen al siguiente: cada cruce tiene una sola salida verdadera.

Cada guía deja su rastro: obsérvalo, tócalo, escúchalo. Solo entonces la niebla cede.

Las huellas no siempre llevan a casa.
Confía en lo que vive: la luz que vuela, el musgo que mira
y el canto que no se ve.

En el último cruce ya no basta con mirar: hay que saber en qué orden crece lo que vive.` };
const SIGN_STONES = { title: 'Inscripción del tocón', text:
`Los cuatro guardianes del claro duermen mudos.
Despiértalos en el orden en que crece lo que vive:

Nace donde no hay luz,
sube sin dar un paso,
se abre en brazos
y termina en verde.

Cuando el último despierte, el camino del norte dejará de estar cerrado.` };
const SIGN_CABIN = { title: 'Aviso en la puerta', text:
`Las verdades a medias.

Tres cartas cuentan la misma noche: la hora, cuántos se sentaron a la mesa y cuántos faroles ardían en el porche.

Cada autor se equivoca en UNA sola cosa, y él mismo lo confiesa.

Nadie dice toda la verdad, pero entre todos la completan: quédate con lo que coincide en las otras dos cartas.

Cuando la tengas, la cómoda tiene tres diales.` };
const WILLOW_ORDER = ['copo', 'hoja', 'luna', 'casa', 'estrella'];     // solución del sauce (deducida de las dos páginas)
const WILLOW_RING = ['luna', 'copo', 'estrella', 'hoja', 'casa'];     // qué símbolo hay en cada farol del círculo (mezclado)
const SYMBOL_NAMES = { copo: 'copo', hoja: 'hoja', luna: 'luna', casa: 'casa', estrella: 'estrella' };

// ================= Mapa transitable (rejilla de 1 m) =================
// Las celdas NO transitables llevan árboles y colisión. Anchos de 4 celdas (≈ 3.3 m útiles para el jugador).
function layout() {
  const walk = Array.from({ length: D }, () => Array(W).fill(false));
  const X = (gx) => -W / 2 + gx + 0.5, Z = (gz) => -D / 2 + gz + 0.5;
  const mark = (test) => { for (let gz = 0; gz < D; gz++) for (let gx = 0; gx < W; gx++) if (test(X(gx), Z(gz))) walk[gz][gx] = true; };
  const disc = (x, z, r) => mark((cx, cz) => (cx - x) ** 2 + (cz - z) ** 2 <= r * r);
  const rect = (x0, x1, z0, z1) => mark((cx, cz) => cx >= x0 && cx <= x1 && cz >= z0 && cz <= z1);
  const vcorr = (xc, z0, z1) => rect(xc - 1.5, xc + 1.5, z0, z1);
  const hcorr = (zc, x0, x1) => rect(x0, x1, zc - 1.5, zc + 1.5);
  vcorr(0, 8, 16);              // entrada (sur)
  disc(0, 4, 5.2);              // claro del cruce de caminos (gran árbol en el centro)
  // oeste: camino y claro de la cabaña
  hcorr(4, -9, -4); disc(-12, 4, 3.6);
  rect(-13.5, -9.5, -4.5, -1.5);                // interior de la cabaña
  rect(-12.5, -10.5, -0.5, 0.5);                // umbral de la puerta de la cabaña
  // norte: camino hacia el sauce (con barrera) y claro del sauce
  vcorr(0, -5, -1); disc(0, -8, 4); vcorr(0, -16, -8);
  // este: sendero con tres cruces
  hcorr(6, 4, 7);               // tramo de entrada al sendero
  vcorr(8, -4, 12);             // CRUCE 1: norte (correcto) / sur (sin salida)
  hcorr(-2, 4, 16);             // CRUCE 2: oeste (sin salida) / este (correcto)
  vcorr(15, -9, 3);             // CRUCE 3: norte (correcto, hacia el claro de los guardianes) / sur (sin salida)
  disc(15, -8.5, 3.0);          // CRUCE 4: claro de los cuatro guardianes (salidas: oeste y este = trampas, norte = correcta)
  hcorr(-10, 5.5, 12.5);        //   salida oeste (sin salida)
  hcorr(-10, 16.5, 19.5);       //   salida este (sin salida)
  vcorr(15, -13, -10);          //   salida norte (correcta, sellada por niebla)
  rect(8.5, 19.5, -15.5, -13.5);// claro del lago helado (con la caja)
  return { walk, X, Z };
}
// Une las celdas bloqueadas en cajas de colisión (por filas y luego por columnas iguales).
function gridColliders(walk) {
  const boxes = []; let open = new Map();
  for (let gz = 0; gz < D; gz++) {
    const next = new Map();
    for (let gx = 0; gx < W;) {
      if (walk[gz][gx]) { gx++; continue; }
      const a = gx; while (gx < W && !walk[gz][gx]) gx++;
      const k = a + ',' + gx, prev = open.get(k);
      if (prev) { prev.z1 = gz + 1; next.set(k, prev); } else { const b = { x0: a, x1: gx, z0: gz, z1: gz + 1 }; boxes.push(b); next.set(k, b); }
    }
    open = next;
  }
  return boxes.map((b) => ({ minX: -W / 2 + b.x0, maxX: -W / 2 + b.x1, minZ: -D / 2 + b.z0, maxZ: -D / 2 + b.z1 }));
}

// Zonas peligrosas: al entrar, la niebla te devuelve al inicio del sendero.
const TRAPS = [
  { id: 1, x0: 6, x1: 10, z0: 9, z1: 12, hint: 'Las luciérnagas no se equivocan: siguen el camino que vive.' },
  { id: 2, x0: 4, x1: 5.8, z0: -4, z1: 0, hint: 'Fíjate en los troncos: el musgo mira hacia donde hay camino.' },
  { id: 3, x0: 13, x1: 17, z0: 1.2, z1: 3.5, hint: 'Escucha con atención: algo canta entre los árboles, lejos de este camino.' },
  { id: 4, x0: 6, x1: 8.5, z0: -12, z1: -8, hint: 'Los caminos de los lados no llevan al lago: las piedras del claro piden un orden.' },
  { id: 5, x0: 18.4, x1: 20, z0: -12, z1: -8, hint: 'Los caminos de los lados no llevan al lago: las piedras del claro piden un orden.' },
];
const EAST_START = { x: 4.6, z: 6 };                       // inicio del sendero (punto al que te devuelve la niebla)
const LAKE = { x: 10.8, z: -14.6 };

// ================= Símbolos de los faroles del sauce =================
function drawSymbol(c, id) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  if (id === 'hoja') {
    c.beginPath(); c.moveTo(64, 104); c.bezierCurveTo(18, 74, 28, 26, 64, 16); c.bezierCurveTo(100, 26, 110, 74, 64, 104); c.closePath(); c.fill();
    c.strokeStyle = '#1b140c'; c.lineWidth = 5; c.beginPath(); c.moveTo(64, 104); c.lineTo(64, 38); c.stroke();
  } else if (id === 'copo') {
    c.lineWidth = 7;
    for (let k = 0; k < 3; k++) { const a = (k * Math.PI) / 3, dx = Math.cos(a) * 46, dy = Math.sin(a) * 46; c.beginPath(); c.moveTo(64 + dx, 64 + dy); c.lineTo(64 - dx, 64 - dy); c.stroke(); }
    for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3, bx = 64 + Math.cos(a) * 30, by = 64 + Math.sin(a) * 30; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + Math.cos(a + s * 0.9) * 12, by + Math.sin(a + s * 0.9) * 12); c.stroke(); } }
  } else if (id === 'luna') {
    c.beginPath(); c.arc(64, 64, 40, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1b140c'; c.beginPath(); c.arc(82, 54, 34, 0, Math.PI * 2); c.fill();
  } else if (id === 'casa') {
    c.beginPath(); c.moveTo(18, 62); c.lineTo(64, 20); c.lineTo(110, 62); c.lineTo(98, 62); c.lineTo(98, 108); c.lineTo(30, 108); c.lineTo(30, 62); c.closePath(); c.fill();
    c.fillStyle = '#1b140c'; c.fillRect(54, 74, 20, 34);
  } else if (id === 'estrella') {
    c.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 20 : 48, a = -Math.PI / 2 + (i * Math.PI) / 5; c[i ? 'lineTo' : 'moveTo'](64 + Math.cos(a) * r, 66 + Math.sin(a) * r); }
    c.closePath(); c.fill();
  }
}
const symbolTex = (id, hex) => canvasTex(128, 128, (c) => { c.fillStyle = '#1b140c'; c.fillRect(0, 0, 128, 128); c.fillStyle = hex; c.strokeStyle = hex; drawSymbol(c, id); });
const signTex = (lines, w, h, { bg = '#3a2818', fg = '#f3d38a', font = 'bold 40px Georgia', border = '#b8893a' } = {}) => canvasTex(w, h, (c) => {
  c.fillStyle = bg; c.fillRect(0, 0, w, h); c.strokeStyle = border; c.lineWidth = 6; c.strokeRect(6, 6, w - 12, h - 12);
  c.fillStyle = fg; c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle';
  lines.forEach((l, i) => c.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * (parseInt(font.replace(/\D+/g, ''), 10) + 10)));
});

// ================= Lector de cartas (panel HTML) y fundido =================
function makeReader() {
  const none = { open: false, key: null, show() {}, hide() {}, toggle() {} };
  if (typeof document === 'undefined' || !document.body || !document.createElement) return none;
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;z-index:7;display:none;align-items:center;justify-content:center;pointer-events:none;';
  const card = document.createElement('div');
  card.style.cssText = 'max-width:34rem;margin:1.5rem;padding:1.6rem 2.1rem 1.2rem;background:#efe0b8;color:#3a2a14;border:1px solid #b9a06a;border-radius:3px;box-shadow:0 0 50px rgba(0,0,0,.75);font:italic 1.08rem/1.6 Georgia,"Times New Roman",serif;';
  const head = document.createElement('div'); head.style.cssText = 'font:bold 1.1rem Georgia,serif;font-style:normal;letter-spacing:.05em;margin-bottom:.8rem;color:#6a4a1e;';
  const body = document.createElement('div'); body.style.cssText = 'white-space:pre-line;';
  const foot = document.createElement('div'); foot.textContent = 'Presiona E para cerrar';
  foot.style.cssText = 'margin-top:1rem;font:.8rem Georgia,serif;font-style:normal;color:#8a7448;text-align:right;';
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
function makeFade() {
  if (typeof document === 'undefined' || !document.body || !document.createElement) return { flash(cb) { cb(); } };
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;z-index:9;background:#dfe8ee;opacity:0;pointer-events:none;transition:opacity .45s;';
  document.body.appendChild(el);
  return { flash(cb) { el.style.opacity = '1'; setTimeout(() => { cb(); el.style.opacity = '0'; }, 550); } };
}

// ================= SALA =================
export function buildRoomForest(ctx, room4) {
  const cam = ctx.camera.position, scene = ctx.scene;
  const doorZ4 = room4.bounds.minZ;                       // puerta norte de Lover (mundo)
  const southZ = doorZ4 - HALL;                           // pared sur del bosque (mundo)
  const CZ = southZ - D / 2;                              // centro del bosque (mundo)
  room4.openHall();                                       // quita la pared del fondo del pasillo de Lover
  const bounds = { minX: -W / 2, maxX: W / 2, minZ: CZ - D / 2, maxZ: CZ + D / 2 };
  ctx.rooms.push({ name: 'Habitación 5 — Folklore / Evermore', bounds });

  const g = new THREE.Group(); g.position.z = CZ; scene.add(g);      // contenido en coordenadas locales (norte = -Z)
  const abs = new THREE.Group(); scene.add(abs);                       // contenido en coordenadas del mundo (pasillo de salida)
  const lights = { mute: 1 };
  const rand = rng(1989);
  const wpos = (x, y, z) => new THREE.Vector3(x, y, z + CZ);
  const colBox = (x0, x1, z0, z1) => { const c = { minX: x0, maxX: x1, minZ: CZ + z0, maxZ: CZ + z1 }; ctx.colliders.push(c); return c; };
  const colRound = (x, z, r) => colBox(x - r, x + r, z - r, z + r);
  const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
  const hit = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false })); m.position.set(x, y, z); return m; };
  const box = (w, h, d, m, x, y, z, p = g) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); p.add(o); return o; };
  const cyl = (rt, rb, h, m, x, y, z, seg = 10, p = g) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.position.set(x, y, z); p.add(o); return o; };
  const reader = makeReader(), fade = makeFade();
  const { walk, X: cellX, Z: cellZ } = layout();

  const glowTex = canvasTex(128, 128, (c) => {
    const r = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.3)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = r; c.fillRect(0, 0, 128, 128);
  });
  const makeGlow = (hex, size, op = 0.8) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: hex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: op })); s.scale.setScalar(size); s.raycast = () => {}; return s; };

  // ---------------- Luces: pocas luces reales (pool) + muchos brillos falsos ----------------
  const ambient = new THREE.AmbientLight(0x8a7a66, 0), hemi = new THREE.HemisphereLight(0x9fb2c8, 0x4a3422, 0), moon = new THREE.DirectionalLight(0x9db4d4, 0);
  moon.position.set(-4, 12, 6); scene.add(ambient, hemi, moon);
  const POOL = 5;
  const pool = Array.from({ length: POOL }, () => { const l = new THREE.PointLight(0xffb066, 0, 11, 2); scene.add(l); return { l, src: null, level: 0 }; });
  const sources = [];                                                                       // fuentes de luz posibles (farolas, lámpara de la cabaña, faroles del sauce)

  // ---------------- Suelo, cielo y paredes altas ----------------
  const PPM = 32;
  const groundTex = canvasTex(W * PPM, D * PPM, (c) => {
    const w = W * PPM, h = D * PPM, r2 = rng(77);
    const gr = c.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, '#3a2412'); gr.addColorStop(0.3, '#3a2a18'); gr.addColorStop(0.42, '#1c2a1c'); gr.addColorStop(0.58, '#1c2a1c'); gr.addColorStop(0.7, '#9fb0c2'); gr.addColorStop(1, '#e6eef7');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 7000; i++) {                                                         // moteado: hojas al oeste, sombras azules al este
      const x = r2() * w, y = r2() * h, t = x / w;
      c.fillStyle = t < 0.35 ? (r2() < 0.5 ? 'rgba(210,110,30,.55)' : 'rgba(120,70,20,.5)') : t > 0.65 ? 'rgba(110,140,175,.35)' : 'rgba(40,70,40,.45)';
      c.fillRect(x, y, 3 + r2() * 6, 2 + r2() * 4);
    }
    for (let gz = 0; gz < D; gz++) for (let gx = 0; gx < W; gx++) {                         // senderos y claros: tierra / nieve apisonada, con bordes suaves
      if (!walk[gz][gx]) continue;
      const x = (gx + 0.5) * PPM, y = (gz + 0.5) * PPM, t = (gx + 0.5) / W;
      const rr = c.createRadialGradient(x, y, 0, x, y, PPM * 0.95);
      const col = t < 0.38 ? '150,108,64' : t > 0.62 ? '246,250,255' : '120,98,64';
      rr.addColorStop(0, `rgba(${col},.95)`); rr.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = rr; c.fillRect(x - PPM, y - PPM, PPM * 2, PPM * 2);
    }
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; g.add(ground);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshBasicMaterial({ color: 0x05080c })); sky.rotation.x = Math.PI / 2; sky.position.y = TALL; g.add(sky);
  const wallTex = canvasTex(256, 256, (c) => { const r2 = rng(5); c.fillStyle = '#16221a'; c.fillRect(0, 0, 256, 256); for (let i = 0; i < 900; i++) { c.fillStyle = r2() < 0.5 ? 'rgba(10,18,12,.6)' : 'rgba(40,60,44,.5)'; c.fillRect(r2() * 256, r2() * 256, 4 + r2() * 14, 4 + r2() * 14); } });
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; wallTex.repeat.set(8, 3);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 1, color: 0x8a9a8a });
  const wallPiece = (x0, x1, z0, z1, y0 = 0, y1 = TALL, solid = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), wallMat); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); g.add(m); if (solid) colBox(x0, x1, z0, z1); };
  const T = 0.2, DW = 1.5;                                                                  // semigrosor y semiancho de las aberturas (3 m)
  wallPiece(-W / 2 - T, -W / 2 + T, -D / 2 - T, D / 2 + T); wallPiece(W / 2 - T, W / 2 + T, -D / 2 - T, D / 2 + T);
  wallPiece(-W / 2 - T, -DW, -D / 2 - T, -D / 2 + T); wallPiece(DW, W / 2 + T, -D / 2 - T, -D / 2 + T); wallPiece(-DW, DW, -D / 2 - T, -D / 2 + T, DOOR_H, TALL, false);   // norte (puerta)
  wallPiece(-W / 2 - T, -DW, D / 2 - T, D / 2 + T); wallPiece(DW, W / 2 + T, D / 2 - T, D / 2 + T); wallPiece(-DW, DW, D / 2 - T, D / 2 + T, 4, TALL, false);                  // sur (entrada)
  gridColliders(walk).forEach((c) => ctx.colliders.push({ minX: c.minX, maxX: c.maxX, minZ: CZ + c.minZ, maxZ: CZ + c.maxZ }));

  // ---------------- Árboles (instanciados): otoño al oeste, pinos nevados al este, verde en el centro ----------------
  const near = (gx, gz) => { for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const a = gx + dx, b = gz + dz; if (a >= 0 && a < W && b >= 0 && b < D && walk[b][a]) return true; } return false; };
  const AUTUMN = [0xd2691e, 0xe08a2d, 0xb5451b, 0xc9a227, 0x8b3a1a], GREENS = [0x1f3a2a, 0x24452f, 0x2a4a30], SNOW = [0xe4edf6, 0xcddbea, 0xb5c9de];
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const pines = [], leafs = [];
  for (let gz = 0; gz < D; gz++) for (let gx = 0; gx < W; gx++) {
    if (walk[gz][gx]) continue;
    const nr = near(gx, gz); if (!nr && rand() > 0.55) continue;
    const x = cellX(gx) + (rand() - 0.5) * 0.7, z = cellZ(gz) + (rand() - 0.5) * 0.7, s = 0.85 + rand() * 0.7 + (nr ? 0 : 0.25);
    const west = x < -5 + (rand() - 0.5) * 2, east = x > 5 + (rand() - 0.5) * 2;
    if (west) { if (rand() < 0.85) leafs.push({ x, z, s, c: pick(AUTUMN), t: 0x4a3322 }); else pines.push({ x, z, s, c: pick(GREENS), t: 0x3a2a1c }); }
    else if (east) { if (rand() < 0.9) pines.push({ x, z, s, c: pick(SNOW), t: 0x3a2f2a }); else leafs.push({ x, z, s, c: 0x5a5048, t: 0x3a3028 }); }
    else if (rand() < 0.62) pines.push({ x, z, s, c: pick(GREENS), t: 0x3a2a1c }); else leafs.push({ x, z, s, c: 0x2d4a2b, t: 0x3a2a1c });
  }
  const trunkGeo = new THREE.CylinderGeometry(0.75, 1, 1, 6); trunkGeo.translate(0, 0.5, 0);
  const coneGeo = new THREE.ConeGeometry(1, 1, 8); coneGeo.translate(0, 0.5, 0);
  const blobGeo = new THREE.IcosahedronGeometry(1, 1);
  const foliageMat = new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true });
  const inst = (geo, n) => { const m = new THREE.InstancedMesh(geo, foliageMat, Math.max(1, n)); m.count = n; m.frustumCulled = false; g.add(m); return m; };
  const trunks = inst(trunkGeo, pines.length + leafs.length), coneA = inst(coneGeo, pines.length), coneB = inst(coneGeo, pines.length), coneC = inst(coneGeo, pines.length);
  const blobA = inst(blobGeo, leafs.length), blobB = inst(blobGeo, leafs.length);
  const dummy = new THREE.Object3D(), tmpC = new THREE.Color();
  const put = (mesh, i, x, y, z, sx, sy, sz, ry, hex, v = 1) => { dummy.position.set(x, y, z); dummy.rotation.set(0, ry, 0); dummy.scale.set(sx, sy, sz); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); mesh.setColorAt(i, tmpC.set(hex).multiplyScalar(v)); };
  let ti = 0;
  pines.forEach((p, i) => {
    const v = 0.85 + rand() * 0.3, ry = rand() * 6.28, s = p.s;
    put(trunks, ti++, p.x, 0, p.z, 0.2 * s, 2.6 * s, 0.2 * s, ry, p.t);
    put(coneA, i, p.x, 1.3 * s, p.z, 1.5 * s, 2.7 * s, 1.5 * s, ry, p.c, v);
    put(coneB, i, p.x, 2.8 * s, p.z, 1.15 * s, 2.3 * s, 1.15 * s, ry, p.c, v);
    put(coneC, i, p.x, 4.1 * s, p.z, 0.8 * s, 1.9 * s, 0.8 * s, ry, p.c, v * 1.05);
  });
  leafs.forEach((p, i) => {
    const v = 0.85 + rand() * 0.3, ry = rand() * 6.28, s = p.s;
    put(trunks, ti++, p.x, 0, p.z, 0.24 * s, 3.6 * s, 0.24 * s, ry, p.t);
    put(blobA, i, p.x, 4.5 * s, p.z, 1.9 * s, 1.5 * s, 1.9 * s, ry, p.c, v);
    put(blobB, i, p.x + Math.cos(ry) * 0.9 * s, 5.4 * s, p.z + Math.sin(ry) * 0.9 * s, 1.4 * s, 1.2 * s, 1.4 * s, ry, p.c, v * 1.1);
  });
  [trunks, coneA, coneB, coneC, blobA, blobB].forEach((m) => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });

  // Gran árbol del cruce (centro del claro) y cartel con los tres caminos
  const BIG = { x: 0, z: 4 };
  cyl(0.8, 1.15, 7, mat(0x4a3322), BIG.x, 3.5, BIG.z, 10); colRound(BIG.x, BIG.z, 1.2);
  [[0, 8.2, 0, 3.3, 0x6b7a2f], [-2, 7.2, 1, 2.5, 0xb5701e], [2, 7.4, -1, 2.6, 0x3d5a30], [0.6, 6.6, -2, 2.4, 0xc9a227], [-0.8, 9.4, 0.4, 2.2, 0x5a6a2a]].forEach(([dx, y, dz, r, c]) => {
    const b = new THREE.Mesh(blobGeo, mat(c, { flatShading: true })); b.scale.set(r, r * 0.8, r); b.position.set(BIG.x + dx, y, BIG.z + dz); g.add(b);
  });
  const crossSign = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.0), new THREE.MeshBasicMaterial({ map: signTex(['Oeste · la cabaña', 'Este · el sendero helado', 'Norte · el sauce'], 512, 300, { font: 'bold 34px Georgia' }) }));
  crossSign.position.set(BIG.x, 1.8, BIG.z + 1.19); g.add(crossSign);                    // mira al sur: se ve al entrar

  // ---------------- Farolas (brillo falso + pool de luces reales) ----------------
  const postGeo = new THREE.CylinderGeometry(0.04, 0.06, 1, 6), lampGeo = new THREE.BoxGeometry(0.22, 0.3, 0.22), capGeo = new THREE.ConeGeometry(0.2, 0.16, 4);
  const woodDark = mat(0x3a2818), lampMat = new THREE.MeshStandardMaterial({ color: 0xffe2a8, emissive: 0xffa84a, emissiveIntensity: 1.8, roughness: 0.4 });
  function addLantern(x, z, { h = 2.3, power = 1, solid = true } = {}) {
    const post = new THREE.Mesh(postGeo, woodDark); post.scale.set(1, h, 1); post.position.set(x, h / 2, z);
    const body = new THREE.Mesh(lampGeo, lampMat); body.position.set(x, h + 0.15, z);
    const cap = new THREE.Mesh(capGeo, woodDark); cap.position.set(x, h + 0.38, z); cap.rotation.y = Math.PI / 4;
    const glow = makeGlow(0xffb35c, 2.4); glow.position.set(x, h + 0.15, z);
    g.add(post, body, cap, glow); if (solid) colRound(x, z, 0.16);
    const s = { pos: wpos(x, h + 0.15, z), power, glow, glowBase: 0.8 }; sources.push(s); return s;
  }
  [[3.1, 1.0], [-3.1, 1.0], [3.4, 7.2], [-3.4, 7.2],                                          // claro del cruce
   [1.7, 10.6], [-1.7, 8.8], [1.7, 14.2], [-1.7, 12.6],                                                                  // entrada
   [-6.4, 2.2], [-8.0, 5.9], [-13.0, 1.2], [-9.4, 1.2],                                       // camino oeste y cabaña
   [5.7, 7.6], [6.3, 1.4], [9.9, 5.6], [5.6, -0.2], [10.3, -2.5], [16.0, 2.0], [16.2, -4.6], [13.2, -6.5], [16.8, -6.5], [18.8, -13.7],  // sendero este
   [-1.7, -4.4], [1.7, -4.4], [-3.2, -9.6], [3.2, -9.0], [-1.7, -13.2], [1.7, -14.4]                                       // camino norte y claro del sauce
  ].forEach(([x, z]) => addLantern(x, z));

  // ---------------- Partículas: hojas (oeste), nieve (este), luciérnagas ----------------
  function makeFall({ n, x0, x1, z0, z1, top, color, size, speed, sway, avoid = null }) {
    const pos = new Float32Array(n * 3), ph = new Float32Array(n), sp = new Float32Array(n);
    for (let i = 0; i < n; i++) { pos[i * 3] = x0 + rand() * (x1 - x0); pos[i * 3 + 1] = rand() * top; pos[i * 3 + 2] = z0 + rand() * (z1 - z0); ph[i] = rand() * 6.28; sp[i] = speed * (0.6 + rand() * 0.8); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, map: glowTex, transparent: true, depthWrite: false, opacity: 0.95 })); pts.frustumCulled = false; g.add(pts);
    return (dt, t) => {
      for (let i = 0; i < n; i++) {
        pos[i * 3 + 1] -= sp[i] * dt;
        pos[i * 3] += Math.sin(t * 0.6 + ph[i]) * sway * dt; pos[i * 3 + 2] += Math.cos(t * 0.5 + ph[i]) * sway * 0.6 * dt;
        const inside = avoid && pos[i * 3] > avoid.x0 && pos[i * 3] < avoid.x1 && pos[i * 3 + 2] > avoid.z0 && pos[i * 3 + 2] < avoid.z1 && pos[i * 3 + 1] < 4;
        if (pos[i * 3 + 1] < 0 || inside) { pos[i * 3 + 1] = top; do { pos[i * 3] = x0 + rand() * (x1 - x0); pos[i * 3 + 2] = z0 + rand() * (z1 - z0); } while (avoid && pos[i * 3] > avoid.x0 && pos[i * 3] < avoid.x1 && pos[i * 3 + 2] > avoid.z0 && pos[i * 3 + 2] < avoid.z1); }
      }
      geo.attributes.position.needsUpdate = true;
    };
  }
  const falls = [
    makeFall({ n: 200, x0: -19, x1: -4, z0: -15, z1: 15, top: 7, color: 0xe08a2d, size: 0.16, speed: 0.55, sway: 0.7, avoid: { x0: -14.3, x1: -8.7, z0: -5.3, z1: -0.7 } }),
    makeFall({ n: 380, x0: 4, x1: 19, z0: -15, z1: 15, top: 8, color: 0xffffff, size: 0.13, speed: 0.7, sway: 0.35 }),
  ];
  function makeFireflies(spots, color = 0xffe58a) {                                       // spots: [{x0,x1,z0,z1,n}]
    const list = []; spots.forEach((s) => { for (let i = 0; i < s.n; i++) list.push({ x: s.x0 + rand() * (s.x1 - s.x0), y: 0.5 + rand() * 1.8, z: s.z0 + rand() * (s.z1 - s.z0), ph: rand() * 6.28 }); });
    const pos = new Float32Array(list.length * 3), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mt = new THREE.PointsMaterial({ color, size: 0.2, map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const pts = new THREE.Points(geo, mt); pts.frustumCulled = false; g.add(pts);
    return (t) => { list.forEach((f, i) => { pos[i * 3] = f.x + Math.sin(t * 0.7 + f.ph) * 0.5; pos[i * 3 + 1] = f.y + Math.sin(t * 1.1 + f.ph * 2) * 0.25; pos[i * 3 + 2] = f.z + Math.cos(t * 0.6 + f.ph) * 0.5; }); geo.attributes.position.needsUpdate = true; mt.opacity = 0.7 + 0.3 * Math.sin(t * 2.2); };
  }
  const fireflies = makeFireflies([
    { x0: 6.8, x1: 9.2, z0: -3, z1: 4, n: 34 },                                          // CRUCE 1 · pista: las luciérnagas se juntan en la rama correcta (norte)
    { x0: 6.8, x1: 9.2, z0: 8, z1: 11, n: 2 },                                             //   (en la rama sin salida casi no hay)
    { x0: -3, x1: 3, z0: 1, z1: 8, n: 16 }, { x0: -13, x1: -8, z0: 1, z1: 6, n: 8 }, { x0: -1.5, x1: 1.5, z0: -11, z1: -5, n: 6 },
  ]);
  createGlitter(ctx, { count: 120, size: { x: 38, y: 6, z: 30 }, center: [0, 0, CZ], color: 0xffd9a0 }).uniforms.uIntensity.value = 0.7;

  // =====================================================================================================================
  // OESTE · LA CABAÑA DEL FAROLERO  (acertijo 1: las cartas)
  // =====================================================================================================================
  const done = { cabin: false, lake: false, willow: false }, got = { cabin: false, lake: false };
  const CAB = { x0: -14, x1: -9, z0: -5, z1: -1, h: 2.7, doorX: -11.5, doorW: 1.6 };
  const wood = mat(0x6b4a2a, { emissive: 0x1a1008 }), roofMat = mat(0x4a2a1a, { emissive: 0x1a0c06 }), plankMat = mat(0x8a6a42);
  const cwall = (x0, x1, z0, z1, y0 = 0, y1 = CAB.h, solid = true) => { box(x1 - x0, y1 - y0, z1 - z0, wood, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); if (solid) colBox(x0, x1, z0, z1); };
  cwall(CAB.x0, CAB.x1, CAB.z0 - 0.1, CAB.z0 + 0.1); cwall(CAB.x0 - 0.1, CAB.x0 + 0.1, CAB.z0, CAB.z1); cwall(CAB.x1 - 0.1, CAB.x1 + 0.1, CAB.z0, CAB.z1);
  cwall(CAB.x0, CAB.doorX - CAB.doorW / 2, CAB.z1 - 0.1, CAB.z1 + 0.1); cwall(CAB.doorX + CAB.doorW / 2, CAB.x1, CAB.z1 - 0.1, CAB.z1 + 0.1);
  cwall(CAB.doorX - CAB.doorW / 2, CAB.doorX + CAB.doorW / 2, CAB.z1 - 0.1, CAB.z1 + 0.1, 2.2, CAB.h, false);
  const slope = Math.atan(1.0 / 2.3), slab = Math.hypot(2.3, 1.0) + 0.15, ridgeZ = (CAB.z0 + CAB.z1) / 2;
  [[1, slope], [-1, -slope]].forEach(([s, a]) => { const r = box(CAB.x1 - CAB.x0 + 0.5, 0.12, slab, roofMat, (CAB.x0 + CAB.x1) / 2, CAB.h + 0.5 - 0.02, ridgeZ + s * 1.15); r.rotation.x = a; });
  [CAB.x0, CAB.x1].forEach((xx) => {                                                       // triángulos de los extremos del tejado
    const sh = new THREE.Shape(); sh.moveTo(CAB.z0 - 0.2, CAB.h); sh.lineTo(CAB.z1 + 0.2, CAB.h); sh.lineTo(ridgeZ, CAB.h + 1.05); sh.closePath();
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshStandardMaterial({ color: 0x5a3a22, side: THREE.DoubleSide })); m.rotation.y = -Math.PI / 2; m.position.x = xx; g.add(m);
  });
  const floorIn = box(CAB.x1 - CAB.x0, 0.04, CAB.z1 - CAB.z0, plankMat, (CAB.x0 + CAB.x1) / 2, 0.02, ridgeZ);
  const windowM = new THREE.MeshBasicMaterial({ color: 0xffc36a, side: THREE.DoubleSide });
  [[CAB.x1 + 0.12, -3.0, Math.PI / 2], [CAB.x0 - 0.12, -3.0, -Math.PI / 2]].forEach(([x, z, ry]) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), windowM); w.position.set(x, 1.5, z); w.rotation.y = ry; g.add(w); });
  const cabinSign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: signTex(['Casa del farolero'], 512, 128, { font: 'bold 44px Georgia' }) }));
  cabinSign.position.set(CAB.doorX, 2.45, CAB.z1 + 0.13); g.add(cabinSign);
  // Cartel de advertencia junto a la puerta (acertijo 1): explica qué hay que hacer
  {
    const grp = new THREE.Group(); grp.position.set(-9.9, 0, CAB.z1 + 0.12); g.add(grp);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshBasicMaterial({ map: signTex(['Las verdades', 'a medias'], 320, 214, { font: 'bold 40px Georgia' }) }));
    plate.position.y = 1.5; grp.add(plate, hit(0.9, 0.6, 0.6, 0, 1.5, 0.2));
    ctx.interaction.add(grp, { prompt: () => 'Presiona E para leer el aviso.', onInteract: () => reader.toggle('signCabin', SIGN_CABIN.title, SIGN_CABIN.text) });
  }
  const cabinLamp = (() => { cyl(0.012, 0.012, 0.5, woodDark, -11.5, 2.45, -2.8, 4); const b = box(0.26, 0.32, 0.26, lampMat, -11.5, 2.1, -2.8); const s = { pos: wpos(-11.5, 2.1, -2.8), power: 1.5, glow: makeGlow(0xffb35c, 2.8), glowBase: 0.8 }; s.glow.position.set(-11.5, 2.1, -2.8); g.add(s.glow); sources.push(s); return s; })();

  // mesa con las tres cartas
  box(1.5, 0.08, 0.9, wood, -12.6, 0.75, -2.6); [[-0.65, -0.35], [0.65, -0.35], [-0.65, 0.35], [0.65, 0.35]].forEach(([dx, dz]) => box(0.07, 0.72, 0.07, wood, -12.6 + dx, 0.36, -2.6 + dz));
  colBox(-13.4, -11.8, -3.1, -2.1);
  const paperMat = (name) => new THREE.MeshBasicMaterial({ map: canvasTex(128, 96, (c) => { c.fillStyle = '#efe0b8'; c.fillRect(0, 0, 128, 96); c.fillStyle = '#6a4a1e'; c.font = 'italic 20px Georgia'; c.textAlign = 'center'; c.fillText(name, 64, 24); c.strokeStyle = '#a58a58'; c.lineWidth = 2; for (let y = 38; y < 90; y += 12) { c.beginPath(); c.moveTo(14, y); c.lineTo(114, y); c.stroke(); } }) });
  const letters = LETTERS.map((L, i) => {
    const grp = new THREE.Group(); const x = -13.05 + i * 0.45, z = -2.75 + (i === 1 ? 0.3 : 0), ry = (i - 1) * 0.3;
    grp.position.set(x, 0.8, z); grp.rotation.y = ry; g.add(grp);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.25), paperMat(L.who)); p.rotation.x = -Math.PI / 2; grp.add(p, hit(0.5, 0.25, 0.4, 0, 0.1, 0));
    ctx.interaction.add(grp, { prompt: () => `Presiona E para leer la carta de ${L.who}.`, onInteract: () => reader.toggle('letter' + i, L.title, L.text) });
    return grp;
  });

  // cómoda con tres diales y un cajón secreto
  box(1.6, 1.0, 0.5, wood, -11.5, 0.5, -4.6); colBox(-12.35, -10.65, -4.9, -4.3);
  const dialVals = [0, 0, 0];
  const dials = [0, 1, 2].map((i) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const cx = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const draw = () => { cx.fillStyle = '#2a1a0c'; cx.fillRect(0, 0, 128, 128); cx.fillStyle = '#f3d38a'; cx.font = 'bold 96px Georgia'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(String(dialVals[i]), 64, 70); tex.needsUpdate = true; };
    draw();
    const grp = new THREE.Group(); grp.position.set(-12.05 + i * 0.55, 0.78, -4.33); g.add(grp);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.06, 20), mat(0xd4a017, { metalness: 0.7, roughness: 0.3, emissive: 0x2a1a00 })); rim.rotation.x = Math.PI / 2;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ map: tex })); face.position.z = 0.035;
    grp.add(rim, face, hit(0.42, 0.42, 0.2, 0, 0, 0.05));
    ctx.interaction.add(grp, { prompt: () => 'Presiona E para girar el dial.', enabled: () => !done.cabin, onInteract: () => { dialVals[i] = (dialVals[i] + 1) % 10; draw(); ctx.audio.note(440 + dialVals[i] * 40); checkCode(); } });
    return grp;
  });
  const drawer = new THREE.Group(); g.add(drawer);                                          // se desliza hacia +z al abrirse
  box(1.3, 0.3, 0.06, mat(0x7a5632), -11.5, 0.28, -4.33, drawer); box(1.2, 0.04, 0.42, mat(0x5a3c20), -11.5, 0.2, -4.55, drawer);
  const note1 = new THREE.Group(); note1.position.set(-11.5, 0.27, -4.52); drawer.add(note1);
  const rollM = new THREE.MeshStandardMaterial({ color: 0xefe0b8, roughness: 0.9, emissive: 0x3a3018 });
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.34, 10), rollM); roll.rotation.z = Math.PI / 2; note1.add(roll, hit(0.5, 0.2, 0.3, 0, 0.05, 0));
  note1.visible = false;
  let drawerT = 0;
  ctx.interaction.add(note1, { prompt: () => 'Presiona E para leer la página.', onInteract: () => reader.toggle('cabin', CLUES.cabin.title, CLUES.cabin.text) });
  function checkCode() {
    if (done.cabin || !dialVals.every((v, i) => v === CODE[i])) return;
    done.cabin = true; got.cabin = true; note1.visible = true; drawerT = 0.001;
    ctx.audio.reward();
    ctx.ui.toast('Clic. El cajón se abre y deja ver una página arrancada. (Queda guardada en las notas del sauce.)', 5500);
    afterPuzzle();
  }

  // =====================================================================================================================
  // ESTE · EL SENDERO HELADO  (acertijo 2: huellas en la nieve)
  // =====================================================================================================================
  // cartel de entrada al sendero
  {
    const SX = 5.5, SZ = 5.0;                                                                // más al sur (a la derecha al mirar el cartel) para salir de las ramas del pino vecino
    const grp = new THREE.Group(); grp.position.set(SX, 0, SZ); g.add(grp);
    cyl(0.05, 0.06, 1.2, woodDark, 0, 0.6, 0, 6, grp);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), new THREE.MeshBasicMaterial({ map: signTex(['Cuatro cruces.', 'Cuatro guías.'], 320, 192, { font: 'bold 34px Georgia' }) })); b.position.set(-0.1, 0.85, 0); b.rotation.y = -Math.PI / 2;     // la tabla va por delante del poste (hacia el oeste), no atravesada por él
     grp.add(b, hit(0.4, 0.8, 1.0, 0, 0.8, 0));   // cartel más bajo (debajo de las ramas)
    colRound(SX, SZ, 0.2);
    ctx.interaction.add(grp, { prompt: () => 'Presiona E para leer el cartel.', onInteract: () => reader.toggle('signE', SIGN_EAST.title, SIGN_EAST.text) });
  }
  // huellas que engañan: solo en las ramas sin salida
  {
    const steps = [];
    const line = (x0, z0, x1, z1) => { const n = Math.floor(Math.hypot(x1 - x0, z1 - z0) / 0.55); for (let i = 0; i < n; i++) { const t = i / n, s = i % 2 ? 1 : -1, dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz); steps.push({ x: x0 + dx * t - (dz / l) * 0.17 * s, z: z0 + dz * t + (dx / l) * 0.17 * s, a: Math.atan2(dx, dz) }); } };
    line(8, 8.6, 8, 11.2); line(7.2, -2, 4.8, -2); line(13, 0.6, 13, 3.2);
    const fm = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16, 0.3), new THREE.MeshBasicMaterial({ color: 0x4a5a70, transparent: true, opacity: 0.55, depthWrite: false }), steps.length);
    steps.forEach((s, i) => { dummy.position.set(s.x, 0.03, s.z); dummy.rotation.set(-Math.PI / 2, 0, s.a); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); fm.setMatrixAt(i, dummy.matrix); });
    fm.frustumCulled = false; g.add(fm);
  }
  // CRUCE 2 · pista: troncos con musgo que mira hacia el camino correcto (este)
  [[6.9, -4.6], [8.2, -4.8], [9.5, -4.6], [10.6, -4.5]].forEach(([x, z]) => {
    cyl(0.3, 0.38, 3.4, mat(0x4a3a2c), x, 1.7, z, 8); colRound(x, z, 0.34);
    const mossTex = canvasTex(64, 64, (c) => { const r2 = rng(Math.floor(x * 10)); c.fillStyle = '#3f7a34'; c.fillRect(0, 0, 64, 64); for (let i = 0; i < 80; i++) { c.fillStyle = r2() < 0.5 ? '#5aa046' : '#2d5a28'; c.fillRect(r2() * 64, r2() * 64, 3 + r2() * 7, 3 + r2() * 7); } });
    const moss = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.395, 1.7, 10, 1, true, Math.PI * 0.08, Math.PI * 0.84), new THREE.MeshStandardMaterial({ map: mossTex, side: THREE.DoubleSide, roughness: 1 }));
    moss.position.set(x, 1.5, z); g.add(moss);                                             // θ=π/2 apunta a +x (este)
    const top = new THREE.Mesh(coneGeo, mat(0xcddbea, { flatShading: true })); top.scale.set(1.3, 2.4, 1.3); top.position.set(x, 3.2, z); g.add(top);
  });
  // trampas de niebla (ramas sin salida)
  const fogTex = canvasTex(128, 128, (c) => { const r = c.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(235,240,245,.9)'); r.addColorStop(1, 'rgba(235,240,245,0)'); c.fillStyle = r; c.fillRect(0, 0, 128, 128); });
  const fogSprites = [];
  const fogPuff = (x, y, z, s, op = 0.75) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: fogTex, transparent: true, depthWrite: false, opacity: op })); sp.scale.setScalar(s); sp.position.set(x, y, z); sp.raycast = () => {}; g.add(sp); fogSprites.push({ sp, base: op, y }); return sp; };
  TRAPS.forEach((tp) => { for (let i = 0; i < 9; i++) fogPuff(lerp(tp.x0, tp.x1, 0.25 + rand() * 0.6), 0.6 + rand() * 1.6, lerp(tp.z0, tp.z1, 0.45 + rand() * 0.5), 2.6 + rand() * 1.4); });
  let trapBusy = false, trapCount = [0, 0, 0, 0, 0, 0];

  // Progreso en el sendero: 0 = fuera / al inicio, 1 = pasó el cruce 1, 2 = pasó el cruce 2, 3 = pasó el cruce 3 (está en el claro de los guardianes), 4 = pasó el cruce 4 (está en el claro del lago).
  // La caja del lago solo se abre con trail === 4. Salir del sendero o caer en una trampa lo reinicia a 0.
  let trail = 0;
  function updateTrail() {
    if (done.lake) return;
    const lx = cam.x, lz = cam.z - CZ;
    if (lx < 3.8) { trail = 0; return; }                                                   // volvió al claro central / otro camino
    if (trail === 0 && lx > 6.5 && lx < 9.5 && lz > -1 && lz < 3.5) trail = 1;            // cruce 1: eligió el norte
    else if (trail === 1 && lx > 10.5 && lz > -3.5 && lz < -0.5) trail = 2;               // cruce 2: eligió el este
    else if (trail === 2 && lx > 12 && lx < 18 && lz < -6.5) trail = 3;                    // cruce 3: eligió el norte y llegó al claro de los guardianes
    else if (trail === 3 && lx > 8.5 && lz < -13) trail = 4;                               // cruce 4: abrió el camino norte y llegó al lago
  }
  function checkTraps() {
    if (trapBusy || done.lake) return;
    const lx = cam.x, lz = cam.z - CZ;
    const tp = TRAPS.find((t) => lx > t.x0 && lx < t.x1 && lz > t.z0 && lz < t.z1);
    if (!tp) return;
    trapBusy = true; trapCount[tp.id]++; trail = 0;
    ctx.audio.hiss(); ctx.ui.toast('La niebla se cierra a tu alrededor... y te devuelve al inicio del sendero.', 3500);
    fade.flash(() => {
      cam.set(EAST_START.x, 1.7, CZ + EAST_START.z); ctx.camera.rotation.set(0, -Math.PI / 2, 0);
      ctx.ui.toast(tp.hint, 6000); trapBusy = false;
    });
  }
  // ---- Niebla sellada en la rama CORRECTA de cada cruce: solo se despeja al interactuar con la pista de ese cruce ----
  // (las ramas falsas siguen con su niebla de trampa; desde lejos las dos nieblas se ven iguales)
  const gates = [];
  function makeGate(id, x0, x1, z0, z1) {
    const col = colBox(x0, x1, z0, z1), puffs = [];
    for (let i = 0; i < 10; i++) puffs.push(fogPuff(lerp(x0, x1, ((i % 5) + 0.5) / 5), 0.5 + (i % 3) * 0.7, lerp(z0, z1, 0.5), 3.0, 0.85));
    gates[id] = { col, puffs, y: puffs.map((p) => p.position.y), open: false, t: 0 };
  }
  makeGate(1, 6, 10, 2.2, 3.0);           // cruce 1: salida norte
  makeGate(2, 10.5, 11, -4, 0);           // cruce 2: salida este
  makeGate(3, 13, 17, -5.0, -4.4);        // cruce 3: salida norte (hacia el lago)
  function openGate(id, msg, at) {
    const gt = gates[id]; if (!gt || gt.open) return;
    gt.open = true; ctx.audio.reward(); ctx.ui.toast(msg, 5500);
    ctx.particles.burst(wpos(at.x, 1.0, at.z), 24, { speed: 0.8, up: 1.0 });
    const i = ctx.colliders.indexOf(gt.col); if (i >= 0) ctx.colliders.splice(i, 1);
  }
  const clue = (grp, id, prompt, msg, at) => ctx.interaction.add(grp, { prompt: () => prompt, enabled: () => (id === 1 || gates[id - 1].open) && !gates[id].open, onInteract: () => openGate(id, msg, at) });   // solo si ya despejaste la niebla del cruce anterior
  // CRUCE 1 · una luciérnaga que vuela en círculos alrededor de un tocón, en el cruce
  let flyJar = () => {};
  {
    const X1 = 9.2, Z1 = 5.4, grp = new THREE.Group(); grp.position.set(X1, 0, Z1); g.add(grp);
    cyl(0.28, 0.34, 0.5, mat(0x4a3a2a), 0, 0.25, 0, 10, grp); colRound(X1, Z1, 0.3);
    grp.add(hit(1.4, 1.6, 1.4, 0, 0.8, 0));                                               // la zona de interacción cubre toda la órbita
    const fly = new THREE.Group(); g.add(fly);
    const fbody = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff3a8, transparent: true }));
    const fglow = makeGlow(0xffe58a, 0.9); fly.add(fbody, fglow);
    const OUT = new THREE.Vector3(8, 1.6, 1.5);                                          // hacia donde escapa al despejarse la niebla
    const st = { leaving: false, p: 0, from: new THREE.Vector3(), cur: new THREE.Vector3(), ph: rand() * 6.28 };
    flyJar = (t, dt) => {
      if (!fly.visible) return;
      const blink = 0.55 + 0.45 * Math.abs(Math.sin(t * 3.1 + st.ph));                    // titila como una luciérnaga
      if (!st.leaving) {
        const a = t * 1.5 + st.ph, r = 0.6 + 0.15 * Math.sin(t * 0.7 + st.ph);
        st.cur.set(X1 + Math.cos(a) * r, 0.95 + 0.25 * Math.sin(t * 2.1) + 0.1 * Math.sin(t * 5.3), Z1 + Math.sin(a * 1.3) * r);   // vuela en un ocho alrededor del tocón
        fly.position.copy(st.cur);
      } else {
        st.p = Math.min(1, st.p + dt / 3);
        const e = st.p * st.p * (3 - 2 * st.p);
        fly.position.lerpVectors(st.from, OUT, e); fly.position.x += Math.sin(st.p * 14) * 0.25 * (1 - st.p); fly.position.y += Math.sin(st.p * 9) * 0.15;
        if (st.p > 0.6) { const f = 1 - (st.p - 0.6) / 0.4; fbody.material.opacity = f; fglow.material.opacity = 0.8 * f * blink; }
        if (st.p >= 1) fly.visible = false;
      }
      if (!st.leaving || st.p <= 0.6) { fbody.material.opacity = 1; fglow.material.opacity = 0.8 * blink; }
    };
    ctx.interaction.add(grp, {
      prompt: () => 'Presiona E para acercar la mano a la luciérnaga.', enabled: () => !gates[1].open,
      onInteract: () => {
        st.leaving = true; st.from.copy(st.cur);
        openGate(1, 'La luciérnaga se posa un instante en tu mano y sale volando hacia la niebla. A su paso, una de las nieblas se disuelve.', { x: 8, z: 2.6 });
      },
    });
  }
  // CRUCE 2 · el musgo de los troncos (se toca cualquiera de los cuatro)
  [[6.9, -4.6], [8.2, -4.8], [9.5, -4.6], [10.6, -4.5]].forEach(([x, z]) => {
    const grp = new THREE.Group(); grp.position.set(x, 0, z); g.add(grp); grp.add(hit(1.6, 3.4, 1.6, 0, 1.7, 0));
    clue(grp, 2, 'Presiona E para tocar el musgo.', 'El musgo se estremece y suelta un polvo verde. La niebla de uno de los caminos se disuelve.', { x: 10.7, z: -2 });
  });
  // CRUCE 3 · caja de música sobre un tocón (el canto lejano)
  {
    const X3 = 16.3, Z3 = -3.2, grp = new THREE.Group(); grp.position.set(X3, 0, Z3); g.add(grp);
    cyl(0.28, 0.34, 0.5, mat(0x4a3a2a), 0, 0.25, 0, 10, grp); colRound(X3, Z3, 0.3);
    box(0.3, 0.16, 0.22, mat(0xd4a017, { metalness: 0.7, roughness: 0.3, emissive: 0x3a2400 }), 0, 0.58, 0, grp);
    grp.add(hit(0.7, 0.9, 0.7, 0, 0.5, 0));
    clue(grp, 3, 'Presiona E para abrir la caja de música.', 'La caja de música canta la misma melodía que oías entre los árboles. La niebla de uno de los caminos se disuelve.', { x: 15, z: -5 });
  }
  // CRUCE 4 · claro de los cuatro guardianes (acertijo de orden). Salidas oeste y este = trampas; la norte (al lago) está sellada.
  {
    const PL = { x: 15, z: -8.5 };
    makeGate(4, 13, 17, -12.4, -11.8);
    const ped = new THREE.Group(); ped.position.set(PL.x, 0, PL.z - 0.5); g.add(ped);       // tocón central con la inscripción
    cyl(0.4, 0.5, 0.7, mat(0x4a3a2a), 0, 0.35, 0, 10, ped); box(0.5, 0.05, 0.36, mat(0xefe0b8, { emissive: 0x3a3018 }), 0, 0.72, 0, ped).rotation.y = 0.3;
    ped.add(hit(1.0, 0.9, 1.0, 0, 0.45, 0)); colRound(PL.x, PL.z - 0.5, 0.45);
    ctx.interaction.add(ped, { prompt: () => 'Presiona E para leer la inscripción.', onInteract: () => reader.toggle('signStones', SIGN_STONES.title, SIGN_STONES.text) });
    const STONE_ORDER = ['Raíz', 'Tronco', 'Rama', 'Hoja'];                                // orden que da el acertijo (las piedras están mezcladas)
    const spots = [[12.7, -7.3, 'Rama'], [12.7, -9.7, 'Hoja'], [17.3, -9.7, 'Raíz'], [17.3, -7.3, 'Tronco']];
    const stLit = [false, false, false, false], stOrder = [];
    let stBusy = false, stDone = false;
    const stones = spots.map(([x, z, name], i) => {
      const body = new THREE.MeshStandardMaterial({ color: 0x7a8088, emissive: 0x000000, roughness: 0.9 });
      const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = Math.atan2(PL.x - x, PL.z - z); g.add(grp);
      const slab = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.3, 0.3), body); slab.position.y = 0.65; grp.add(slab);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.3, 4), body); cap.position.y = 1.45; cap.rotation.y = Math.PI / 4; grp.add(cap);
      const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.3), new THREE.MeshBasicMaterial({ map: signTex([name], 256, 166, { font: 'bold 44px Georgia' }) })); plaque.position.set(0, 0.8, 0.16); grp.add(plaque);
      const glow = makeGlow(0x9ff0c0, 2.2, 0); glow.position.y = 0.9; grp.add(glow);
      grp.add(hit(0.8, 1.5, 0.7, 0, 0.75, 0)); colRound(x, z, 0.32);
      ctx.interaction.add(grp, { prompt: () => `Presiona E para despertar la piedra «${name}».`, enabled: () => gates[3].open && !stDone && !stBusy && !stLit[i], onInteract: () => wake(i) });
      return { name, body, glow };
    });
    function setStone(i, on) { stLit[i] = on; stones[i].body.emissive.set(on ? 0x3fbf7f : 0x000000); stones[i].body.emissiveIntensity = on ? 0.9 : 0; stones[i].glow.material.opacity = on ? 0.8 : 0; }
    function wake(i) {
      setStone(i, true); stOrder.push(stones[i].name); ctx.audio.note(330 + stOrder.length * 70);
      if (stOrder.length < 4) return;
      if (STONE_ORDER.every((n, k) => n === stOrder[k])) { stDone = true; openGate(4, 'Las cuatro piedras brillan a la vez. La niebla que cerraba el camino del norte se disuelve.', { x: 15, z: -12 }); return; }
      stBusy = true; ctx.audio.error();
      ctx.ui.toast('Las piedras se apagan de golpe... ese no era el orden. Vuelve a leer la inscripción del tocón.', 4500);
      setTimeout(() => { for (let k = 0; k < 4; k++) setStone(k, false); stOrder.length = 0; stBusy = false; }, 1300);
    }
  }
  // lago helado + caja
  cyl(1.2, 1.2, 0.06, new THREE.MeshStandardMaterial({ color: 0xaed8f2, roughness: 0.08, metalness: 0.35, emissive: 0x1b3a52 }), LAKE.x, 0.03, LAKE.z, 40);
  colRound(LAKE.x, LAKE.z, 1.1);
  for (let i = 0; i < 9; i++) { const a = i * 0.7; box(0.05, 0.02, 0.8 + (i % 3) * 0.3, mat(0xf2fbff, { emissive: 0x335a78 }), LAKE.x + Math.cos(a) * 0.45, 0.07, LAKE.z + Math.sin(a) * 0.45).rotation.y = a; }   // grietas
  const CH = { x: 17.2, z: -14.4 };
  const chest = new THREE.Group(); chest.position.set(CH.x, 0, CH.z); chest.rotation.y = 0.15; g.add(chest);                     // de frente al sur: se abre desde el lado del camino
  const iceM = mat(0x6f8fb0, { metalness: 0.5, roughness: 0.3, emissive: 0x17283a });
  box(0.9, 0.5, 0.6, iceM, 0, 0.25, 0, chest); box(0.94, 0.06, 0.64, mat(0xd4a017, { metalness: 0.8, roughness: 0.3 }), 0, 0.5, 0, chest);
  const lidHinge = new THREE.Group(); lidHinge.position.set(0, 0.52, -0.3); chest.add(lidHinge); box(0.92, 0.16, 0.62, iceM, 0, 0.08, 0.31, lidHinge);
  colRound(CH.x, CH.z, 0.55);
  const chestHit = new THREE.Group(); chestHit.position.copy(chest.position); g.add(chestHit); chestHit.add(hit(1.1, 0.9, 1.1, 0, 0.4, 0));
  const note2 = new THREE.Group(); note2.position.set(CH.x, 0.9, CH.z); note2.visible = false; g.add(note2);
  note2.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.34, 10), rollM), hit(0.6, 0.3, 0.4, 0, 0, 0)); note2.children[0].rotation.z = Math.PI / 2;
  ctx.interaction.add(chestHit, {
    prompt: () => 'Presiona E para abrir la caja.', enabled: () => !done.lake && trail === 4,       // sin el sendero completo ni siquiera aparece el aviso
    onInteract: () => {
      console.info('[forest] caja abierta desde x=' + cam.x.toFixed(1) + ', z=' + (cam.z - CZ).toFixed(1) + ', trail=' + trail);   // diagnóstico: ver en la consola (F12) desde dónde se abrió
      if (trail < 4) {                                                                      // llegó al lago sin haber hecho el sendero correcto
        ctx.audio.error();
        ctx.ui.toast('La caja está sellada por el hielo y no cede. Solo se abre para quien recorre el sendero correcto, cruce por cruce.', 5000);
        return;
      }
      done.lake = true; got.lake = true; note2.visible = true; ctx.audio.reward(); ctx.particles.burst(wpos(CH.x, 0.9, CH.z), 30, { speed: 0.8, up: 1.2 }); ctx.ui.toast('La caja se abre. Dentro hay una nota helada. (Queda guardada en las notas del sauce.)', 5500); afterPuzzle();
    },
  });
  ctx.interaction.add(note2, { prompt: () => 'Presiona E para leer la nota.', onInteract: () => reader.toggle('lake', CLUES.lake.title, CLUES.lake.text) });

  // =====================================================================================================================
  // NORTE · LA BARRERA, EL SAUCE Y LA LLAVE  (acertijo 3)
  // =====================================================================================================================
  const barrier = { z: -3.0, open: false, t: 0, col: colBox(-2.3, 2.3, -3.4, -2.6) };
  const trunk = cyl(0.5, 0.55, 4.6, mat(0x3a2c20), 0, 0.55, barrier.z, 10); trunk.rotation.z = Math.PI / 2;
  const roots = []; for (let i = 0; i < 5; i++) { const r = cyl(0.05, 0.14, 1.3, mat(0x2e2218), -2.2 + (i % 2) * 0.1, 0.55 + (i - 2) * 0.22, barrier.z + (i - 2) * 0.15, 5); r.rotation.z = Math.PI / 2 + (i - 2) * 0.3; roots.push(r); }
  const barrierHit = new THREE.Group(); barrierHit.position.set(0, 0, barrier.z); g.add(barrierHit); barrierHit.add(hit(4.6, 1.2, 1.0, 0, 0.6, 0));
  ctx.interaction.add(barrierHit, { prompt: () => 'Presiona E para examinar.', enabled: () => !barrier.open,
    onInteract: () => ctx.ui.toast('Una niebla espesa y un árbol caído cierran el camino al norte. Quizá los otros dos caminos guarden la manera de abrirlo.', 5000) });
  for (let i = 0; i < 14; i++) fogPuff(-2 + (i % 7) * 0.7, 0.5 + (i % 3) * 0.9, barrier.z + (i < 7 ? -0.5 : 0.5), 3.4, 0.85);
  const barrierFog = fogSprites.slice(-14);

  // sauce llorón
  const WL = { x: 0, z: -8 };
  const willowTrunk = cyl(0.7, 1.1, 5, mat(0x4a3a2a), WL.x, 2.5, WL.z, 10); willowTrunk.rotation.z = 0.05; colRound(WL.x, WL.z, 0.95);
  [[1.9, 5.5, 0.2], [-1.8, 5.6, -0.3], [0.3, 5.7, 1.9], [0.2, 5.5, -1.9]].forEach(([dx, y, dz], i) => { const b = cyl(0.12, 0.3, 2.2, mat(0x4a3a2a), WL.x + dx / 2, 4.9, WL.z + dz / 2, 6); b.rotation.z = -Math.atan2(dx, 1.4); b.rotation.x = Math.atan2(dz, 1.4); });
  [[0, 6.3, 0, 2.1], [1.5, 5.8, 0.6, 1.5], [-1.5, 5.9, -0.5, 1.6], [0.2, 5.8, 1.6, 1.4], [-0.4, 5.9, -1.6, 1.4]].forEach(([dx, y, dz, r]) => { const b = new THREE.Mesh(blobGeo, mat(0x5f7d3a, { flatShading: true, emissive: 0x1a2a10 })); b.scale.set(r, r * 0.55, r); b.position.set(WL.x + dx, y, WL.z + dz); g.add(b); });
  const STR = 110, strGeo = new THREE.CylinderGeometry(0.02, 0.05, 1, 4); strGeo.translate(0, -0.5, 0);
  const strMat = new THREE.MeshStandardMaterial({ roughness: 0.9, emissive: 0x000000 });
  const strands = new THREE.InstancedMesh(strGeo, strMat, STR); strands.frustumCulled = false; g.add(strands);
  const strData = Array.from({ length: STR }, (_, i) => { const a = rand() * 6.28, r = 0.9 + rand() * 2.2; return { x: WL.x + Math.cos(a) * r, y: 5.0 - r * 0.22 + rand() * 0.4, z: WL.z + Math.sin(a) * r, len: 2.6 + rand() * 1.6, ph: rand() * 6.28 }; });
  strData.forEach((s, i) => strands.setColorAt(i, tmpC.set(rand() < 0.5 ? 0x7d9a4a : 0x9ab25a).multiplyScalar(0.9 + rand() * 0.3)));
  strands.instanceColor.needsUpdate = true;
  const swayStrands = (t) => { strData.forEach((s, i) => { dummy.position.set(s.x, s.y, s.z); dummy.rotation.set(Math.sin(t * 0.8 + s.ph) * 0.08, 0, Math.cos(t * 0.7 + s.ph) * 0.08); dummy.scale.set(1, s.len, 1); dummy.updateMatrix(); strands.setMatrixAt(i, dummy.matrix); }); strands.instanceMatrix.needsUpdate = true; };
  swayStrands(0);

  // cinco faroles con símbolo alrededor del sauce
  const lit = [false, false, false, false, false], order = [];
  let willowBusy = false;
  const ringLamps = WILLOW_RING.map((sym, i) => {
    const a = ((90 + i * 72) * Math.PI) / 180, x = WL.x + Math.cos(a) * 2.4, z = WL.z + Math.sin(a) * 2.4;
    const grp = new THREE.Group(); grp.position.set(x, 0, z); g.add(grp);
    cyl(0.04, 0.06, 1.7, woodDark, 0, 0.85, 0, 6, grp);
    const body = new THREE.MeshStandardMaterial({ color: 0xd9c9a0, emissive: 0x000000, roughness: 0.5 });
    const lamp = new THREE.Mesh(lampGeo, body); lamp.position.y = 1.85; grp.add(lamp);
    const cap = new THREE.Mesh(capGeo, woodDark); cap.position.y = 2.08; cap.rotation.y = Math.PI / 4; grp.add(cap);
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial({ map: symbolTex(sym, '#f3d38a') })); plaque.position.set(0, 1.25, 0.075); grp.add(plaque);
    grp.rotation.y = Math.atan2(WL.x - x, WL.z - z) + Math.PI;                                // la placa mira hacia afuera del círculo
    const glow = makeGlow(0xffb35c, 2.6, 0); glow.position.y = 1.85; grp.add(glow);
    grp.add(hit(0.5, 2.2, 0.5, 0, 1.1, 0)); colRound(x, z, 0.16);
    const src = { pos: wpos(x, 1.85, z), power: 0, glow, glowBase: 0.85, ring: true };
    sources.push(src);
    const L = { sym, body, glow, src };
    ctx.interaction.add(grp, {
      prompt: () => `Presiona E para encender el farol de la ${SYMBOL_NAMES[sym]}.`,
      enabled: () => barrier.open && !done.willow && !willowBusy && !lit[i],
      onInteract: () => lightLamp(i),
    });
    return L;
  });
  function setLamp(i, on) { const L = ringLamps[i]; lit[i] = on; L.body.emissive.set(on ? 0xffa84a : 0x000000); L.body.emissiveIntensity = on ? 1.8 : 0; L.src.power = on ? 1 : 0; L.glow.material.opacity = on ? 0.85 : 0; }
  function lightLamp(i) {
    setLamp(i, true); order.push(ringLamps[i].sym); ctx.audio.note(392 + order.length * 66);
    if (order.length < 5) return;
    if (WILLOW_ORDER.every((s, k) => s === order[k])) return solveWillow();
    willowBusy = true; ctx.audio.error();
    ctx.ui.toast('Los faroles se apagan de golpe... el orden no era el correcto. Repasa tus notas en el tocón.', 4500);
    setTimeout(() => { for (let k = 0; k < 5; k++) setLamp(k, false); order.length = 0; willowBusy = false; }, 1300);
  }
  // tocón con las notas
  {
    const grp = new THREE.Group(); grp.position.set(-2.4, 0, -5.8); g.add(grp);
    cyl(0.38, 0.45, 0.55, mat(0x4a3a2a), 0, 0.27, 0, 10, grp); box(0.36, 0.06, 0.26, mat(0x8a2a2a), 0, 0.58, 0, grp).rotation.y = 0.4; grp.add(hit(0.9, 0.7, 0.9, 0, 0.4, 0));
    colRound(-2.4, -5.8, 0.4);
    ctx.interaction.add(grp, { prompt: () => 'Presiona E para leer tus notas.', onInteract: () => {
      const part = (k, c) => got[k] ? `${c.title}\n${c.text}` : (k === 'cabin' ? 'Aún no has abierto el cajón de la cabaña (oeste).' : 'Aún no has abierto la caja del lago (este).');
      reader.toggle('notes', 'Tus notas', `${part('cabin', CLUES.cabin)}\n\n— — —\n\n${part('lake', CLUES.lake)}`);
    } });
  }
  // llave antigua sobre un pedestal
  const PEDK = { x: 0, z: -10.7 };
  cyl(0.3, 0.38, 0.9, mat(0x8a8a82, { roughness: 0.7 }), PEDK.x, 0.45, PEDK.z, 12); colRound(PEDK.x, PEDK.z, 0.4);
  const keyMat = new THREE.MeshStandardMaterial({ color: 0xb07a3a, emissive: 0x6a4410, roughness: 0.4, metalness: 0.8 });
  const key = new THREE.Group(); key.visible = false; g.add(key);
  const kr = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 10, 24), keyMat); kr.position.y = 0.28; key.add(kr, new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 10), keyMat));
  [[-0.2, 0.09], [-0.3, 0.07]].forEach(([y, w]) => { const tt = new THREE.Mesh(new THREE.BoxGeometry(w * 1.6, 0.05, 0.04), keyMat); tt.position.set(w * 0.8 + 0.02, y, 0); key.add(tt); });
  key.scale.setScalar(1.4); key.add(makeGlow(0xffd36a, 0.9)); key.add(hit(0.5, 0.9, 0.4, 0, 0, 0));
  let keyT = -1, keyReady = false; const keyFrom = new THREE.Vector3(WL.x, 5.3, WL.z), keyTo = new THREE.Vector3(PEDK.x, 1.4, PEDK.z), keyMid = new THREE.Vector3(1.6, 6.2, -9.4), keyP = new THREE.Vector3();
  function solveWillow() {
    done.willow = true; ctx.fx.bloom = true; ctx.audio.success();
    ringLamps.forEach((L, k) => setLamp(k, true));
    strMat.emissive.set(0xc9a227); strMat.emissiveIntensity = 0.55;
    ctx.particles.burst(wpos(WL.x, 4.5, WL.z), 60, { speed: 1.4, up: 1.6 });
    key.visible = true; key.position.copy(keyFrom); keyT = 0;
    ctx.ui.toast('El sauce despierta... algo dorado baja entre sus ramas.', 5000);
  }
  ctx.interaction.add(key, {
    prompt: () => 'Presiona E para recoger la Llave antigua.', enabled: () => key.visible && keyReady,
    onInteract: () => { key.visible = false; ctx.audio.reward(); ctx.collect('oldkey'); door.unlock(); ctx.game.solved++; ctx.ui.toast('Has recuperado el recuerdo de Folklore.', 5000); },
  });

  // se llama al abrir el cajón o la caja: si ya están los dos, se abre el camino norte
  function afterPuzzle() {
    if (!(done.cabin && done.lake)) return;
    barrier.open = true; barrier.t = 0;
    ctx.ui.toast('El árbol caído se deshace en luciérnagas y la niebla se abre hacia el norte.', 5500);
    ctx.particles.burst(wpos(0, 0.8, barrier.z), 50, { speed: 1.2, up: 1.4 });
    const i = ctx.colliders.indexOf(barrier.col); if (i >= 0) ctx.colliders.splice(i, 1);
  }

  // =====================================================================================================================
  // PUERTA NORTE + pasillo provisional hacia la siguiente era
  // =====================================================================================================================
  const doorZ = CZ - D / 2;
  const door = createDoor(ctx, { x: 0, z: doorZ, width: 3 });
  door.mesh.material.color.set(0x6a4a2a); door.mesh.material.emissive.set(0x1a1008); door.mesh.material.metalness = 0.1;
  const hallMat = mat(0x2a2a24, { roughness: 1 });
  addWall(ctx, abs, -1.6, doorZ - HALL / 2, 0.2, HALL, hallMat); addWall(ctx, abs, 1.6, doorZ - HALL / 2, 0.2, HALL, hallMat);
  const endCol = ctx.colliders.length;
  addWall(ctx, abs, 0, doorZ - HALL, 3.4, 0.2, hallMat);                                    // pared del fondo: la sala 6 llama a openHall() y la quita
  const hallEnd = { mesh: abs.children[abs.children.length - 1], col: ctx.colliders[endCol] };
  const hallFloor = new THREE.Mesh(new THREE.PlaneGeometry(3, HALL), mat(0x1a1a16)); hallFloor.rotation.x = -Math.PI / 2; hallFloor.position.set(0, 0.005, doorZ - HALL / 2);
  const hallCeil = hallFloor.clone(); hallCeil.rotation.x = Math.PI / 2; hallCeil.position.y = 4;
  const hallSign = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.9), new THREE.MeshBasicMaterial({ map: signTex(['Los recuerdos también', 'guardan secretos...'], 640, 200, { bg: '#1a1a16', font: '38px Georgia' }), transparent: true }));
  hallSign.position.set(0, 2, doorZ - HALL + 0.12);
  const hallLight = new THREE.PointLight(0xffd9a0, 0, 9); hallLight.position.set(0, 3, doorZ - 2);
  abs.add(hallFloor, hallCeil, hallSign, hallLight);
  let hallBase = 0;
  const openHall = () => { abs.remove(hallEnd.mesh, hallSign); const i = ctx.colliders.indexOf(hallEnd.col); if (i >= 0) ctx.colliders.splice(i, 1); };

  // =====================================================================================================================
  // ANIMACIÓN, LUCES Y NIEBLA (cada frame)
  // =====================================================================================================================
  let baseFog = null, welcomed = false, snd = null, fogCol = new THREE.Color(), readerAt = null;
  const FOG_W = new THREE.Color(0x2a1c10), FOG_C = new THREE.Color(0x141c1a), FOG_E = new THREE.Color(0x1d2c3d);
  const tmpV = new THREE.Vector3(), camDir = new THREE.Vector3();
  const lakeW = wpos(LAKE.x, 0, LAKE.z);

  function ensureSound() {
    const a = ctx.audio; if (snd || !a || !a.ctx || !a.master) return snd;
    const c = a.ctx, gain = c.createGain(); gain.gain.value = 0;
    const pan = c.createStereoPanner ? c.createStereoPanner() : null;
    if (pan) { gain.connect(pan); pan.connect(a.master); } else gain.connect(a.master);
    snd = { c, gain, pan, next: 0 }; return snd;
  }
  const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
  function lakeSong(t) {                                                                    // CRUCE 3 · pista: un canto de caja de música que viene del lago (norte)
    const s = ensureSound(); if (!s) return;
    const d = Math.hypot(cam.x - lakeW.x, cam.z - lakeW.z), lx = cam.x, lz = cam.z - CZ;
    const inEast = lx > 4 && !done.lake;
    const vol = inEast ? Math.pow(clamp(1 - d / 20, 0, 1), 1.6) : 0;
    s.gain.gain.setTargetAtTime(vol, s.c.currentTime, 0.2);
    if (s.pan) { ctx.camera.getWorldDirection(camDir); camDir.y = 0; camDir.normalize(); tmpV.set(lakeW.x - cam.x, 0, lakeW.z - cam.z).normalize(); s.pan.pan.setTargetAtTime(clamp(tmpV.x * -camDir.z + tmpV.z * camDir.x, -1, 1) * 0.95, s.c.currentTime, 0.1); }
    if (vol > 0.02 && s.c.currentTime >= s.next) {
      const f = SCALE[Math.floor(Math.random() * SCALE.length)], o = s.c.createOscillator(), e = s.c.createGain(), at = s.c.currentTime;
      o.type = 'triangle'; o.frequency.value = f; e.gain.setValueAtTime(0, at); e.gain.linearRampToValueAtTime(0.5, at + 0.02); e.gain.exponentialRampToValueAtTime(0.001, at + 1.6);
      o.connect(e); e.connect(s.gain); o.start(at); o.stop(at + 1.7); s.next = at + 0.7 + Math.random() * 0.9;
    }
  }

  ctx.updaters.push((dt, t) => {
    const z = cam.z, x = cam.x;
    // ---- luces entre salas (igual que en las otras salas) ----
    room4.lights.mute = clamp((z - southZ) / HALL, 0.04, 1);                                // Lover se apaga a lo largo del pasillo
    const k5 = clamp((doorZ4 - 1 - z) / 3, 0, 1), base = k5 * lights.mute;
    ambient.intensity = 0.55 * base; hemi.intensity = 0.55 * base; moon.intensity = 0.5 * base;
    // ---- niebla global: se espesa al entrar al bosque ----
    const fog = scene.fog;
    if (fog) {
      if (!baseFog) baseFog = { near: fog.near, far: fog.far, color: fog.color.clone() };
      const fk = clamp((doorZ4 - 0.5 - z) / 3.5, 0, 1);
      fogCol.copy(FOG_C).lerp(FOG_W, 1 - smooth(-9, -3, x)).lerp(FOG_E, smooth(3, 9, x));
      fog.near = lerp(baseFog.near, 2.5, fk); fog.far = lerp(baseFog.far, 26, fk); fog.color.copy(baseFog.color).lerp(fogCol, fk);
    }
    hallBase = door.opening ? Math.min(8, hallBase + dt * 4) : hallBase; hallLight.intensity = hallBase * lights.mute;
    // ---- lo demás solo se calcula cerca del bosque ----
    const active = z < doorZ4 + 0.5 && z > bounds.minZ - HALL - 2;
    if (!active) { pool.forEach((p) => (p.l.intensity = 0)); return; }
    const flick = 0.92 + 0.08 * Math.sin(t * 7) * Math.sin(t * 3.1);
    lampMat.emissiveIntensity = 1.8 * flick;
    // pool de luces: las 5 fuentes más cercanas, con aparición/desaparición suave
    const order5 = sources.filter((s) => s.power > 0).map((s) => ({ s, d: s.pos.distanceToSquared(cam) })).sort((a, b) => a.d - b.d).slice(0, POOL).map((o) => o.s);
    pool.forEach((p) => { const keep = p.src && order5.includes(p.src); p.level = clamp(p.level + (keep ? 3 : -3) * dt, 0, 1); if (p.level <= 0.01 && !keep) p.src = null; });
    order5.forEach((s) => { if (pool.some((p) => p.src === s)) return; const free = pool.find((p) => !p.src); if (free) { free.src = s; free.level = 0; } });
    pool.forEach((p) => { if (p.src) { p.l.position.copy(p.src.pos); p.l.intensity = 20 * p.src.power * p.level * base * flick; } else p.l.intensity = 0; });
    sources.forEach((s, i) => { if (s.ring) return; s.glow.material.opacity = s.glowBase * (0.85 + 0.15 * Math.sin(t * 2.3 + i)); });
    // partículas
    falls.forEach((f) => f(dt, t)); fireflies(t); flyJar(t, dt);
    if (reader.open) { if (!readerAt) readerAt = cam.clone(); else if (cam.distanceTo(readerAt) > 3) { reader.hide(); readerAt = null; } } else readerAt = null;     // el papel se cierra solo si te alejas
    // aviso al llegar al claro
    if (!welcomed && z < southZ + 3) { welcomed = true; ctx.ui.toast('Un bosque que se divide en tres caminos. Al oeste, una cabaña con luz; al este, un sendero nevado; al norte, solo niebla.', 7000); }
    // cabaña: cajón que se desliza
    if (drawerT > 0 && drawerT < 1) { drawerT = Math.min(1, drawerT + dt / 0.9); drawer.position.z = 0.5 * (1 - Math.pow(1 - drawerT, 3)); }
    // sendero: progreso, trampas de niebla y canto del lago
    updateTrail(); checkTraps(); lakeSong(t);
    gates.forEach((gt) => {                                                                // nieblas selladas que se disuelven
      if (!gt || !gt.open || gt.t >= 1) return;
      gt.t = Math.min(1, gt.t + dt / 2);
      gt.puffs.forEach((p, i) => { p.material.opacity = 0.85 * (1 - gt.t); p.position.y = gt.y[i] + gt.t * 1.5; if (gt.t >= 1) p.visible = false; });
    });
    // caja del lago
    lidHinge.rotation.x += ((done.lake ? -1.2 : 0) - lidHinge.rotation.x) * Math.min(1, dt * 3);
    // barrera: se deshace
    if (barrier.open && barrier.t < 1) {
      barrier.t = Math.min(1, barrier.t + dt / 2.5);
      barrierFog.forEach((f) => { f.sp.material.opacity = f.base * (1 - barrier.t); f.sp.position.y = f.y + barrier.t * 1.5; });
      trunk.scale.set(1, Math.max(0.01, 1 - barrier.t), 1); trunk.position.y = 0.55 - barrier.t * 0.6; roots.forEach((r) => (r.visible = barrier.t < 0.6)); trunk.visible = barrier.t < 0.98;
      if (barrier.t >= 1) { barrierFog.forEach((f) => (f.sp.visible = false)); barrierHit.visible = false; }
    }
    // sauce
    swayStrands(t);
    if (keyT >= 0) {
      keyT = Math.min(1, keyT + dt / 3.2); const e = 1 - Math.pow(1 - keyT, 3);
      keyP.copy(keyFrom).multiplyScalar((1 - e) * (1 - e)).addScaledVector(keyMid, 2 * (1 - e) * e).addScaledVector(keyTo, e * e);
      key.position.copy(keyP); key.rotation.y += dt * 2.2;
      if (keyT >= 1) { keyReady = true; key.position.y = 1.4 + Math.sin(t * 2) * 0.05; }
    }
  });

  return { group: g, bounds, x: 0, z: CZ, w: W, d: D, door, lights, openHall };
}