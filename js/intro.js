// intro.js — Introducción inmersiva: exterior nocturno del museo -> sobre dorado -> puerta -> hall -> luz guía -> Fearless.
// Todo ocurre sin cortes ni pantallas de carga: el jugador mantiene el control (salvo en la escena de la carta).
//
// Fases:  opening -> envelope -> taking -> reading -> returning -> walk -> doorOpening -> hall -> guide -> done
import * as THREE from 'three';
import { canvasTex, makeTextTexture, addCollider } from './rooms.js';
import { createIntroSound } from './introsound.js';

// ================= Medidas del mundo =================
const GROUND = -1.2;                 // nivel del suelo exterior (el interior del museo está en y = 0)
const FZ = 25;                       // z de la fachada (pared sur del hall)
const HX0 = -5, HX1 = 25, HCX = 10;  // hall: de x = -5 a 25 (centro 10)
const HZ0 = 5;                       // el hall empieza donde termina la sala 1 (z = 5)
const HALL_H = 9;
const START = { x: 10, z: 55 };      // dónde aparece el jugador (mirando al norte, hacia el museo)
const DOOR_X = 10, DOOR_HT = 4.6;    // puerta principal: centro y alto
const FDOOR_X = 2;                   // puerta dorada de Fearless: es la entrada de la sala 1

const LETTER = [
  'Bienvenido.',
  'Este museo guarda recuerdos que nunca debieron olvidarse.',
  'Cada sala conserva una historia distinta.',
  'Si logras restaurarlas todas...',
  'Encontrarás la salida.',
  'Pero recuerda:',
  'Algunas puertas solo se abren para quienes realmente observan.',
];
const PLAQUE = 'Los recuerdos permanecen dormidos. Solo quien los reúna podrá volver a ver la luz.';
const ERAS = [
  { name: 'Fearless', kind: 'butterfly', hex: '#ffc83d' },
  { name: '1989', kind: 'polaroid', hex: '#2de2ff' },
  { name: 'Reputation', kind: 'snake', hex: '#c8ccd6' },
  { name: 'Lover', kind: 'heart', hex: '#ff8fc8' },
  { name: 'Folklore', kind: 'pine', hex: '#b8c8a0' },
  { name: 'Midnights', kind: 'moon', hex: '#8a96ff' },
];

const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// Altura del suelo en (x, z): escalera de 6 peldaños entre z = 35 (abajo) y z = 29 (arriba).
export function groundHeight(x, z) {
  if (z <= 29) return 0;
  if (z <= 35 && x >= 3 && x <= 17) return GROUND + 0.2 * (Math.min(5, Math.floor(35 - z)) + 1);
  return GROUND;
}

// ---------- Texturas dibujadas con canvas ----------
function eraTexture(kind, hex) {
  return canvasTex(256, 256, (g) => {
    g.fillStyle = '#14100c'; g.fillRect(0, 0, 256, 256);
    g.translate(128, 128); g.strokeStyle = hex; g.fillStyle = hex; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round';
    if (kind === 'butterfly') {
      [[-1, 1], [1, 1]].forEach(([s]) => { g.beginPath(); g.ellipse(s * 42, -30, 44, 30, s * -0.5, 0, TAU); g.fill(); g.beginPath(); g.ellipse(s * 34, 38, 30, 22, s * 0.5, 0, TAU); g.fill(); });
      g.fillStyle = '#14100c'; g.fillRect(-7, -70, 14, 140); g.fillStyle = hex; g.fillRect(-4, -66, 8, 132);
    } else if (kind === 'polaroid') {
      g.strokeRect(-70, -84, 140, 168); g.strokeRect(-52, -66, 104, 104); g.beginPath(); g.arc(0, -14, 26, 0, TAU); g.stroke();
    } else if (kind === 'snake') {
      g.lineWidth = 18; g.beginPath(); g.moveTo(-60, 70); g.bezierCurveTo(-110, 10, 90, 10, 40, -40); g.bezierCurveTo(10, -80, -70, -70, -30, -100); g.stroke();
      g.beginPath(); g.arc(-30, -102, 14, 0, TAU); g.fill();
    } else if (kind === 'heart') {
      g.beginPath(); g.moveTo(0, 70); g.bezierCurveTo(-110, -5, -70, -90, 0, -35); g.bezierCurveTo(70, -90, 110, -5, 0, 70); g.fill();
    } else if (kind === 'pine') {
      [[-70, 20, 70], [-30, 28, 60], [10, 36, 50]].forEach(([y, w, h]) => { g.beginPath(); g.moveTo(0, y); g.lineTo(-w - 22, y + h); g.lineTo(w + 22, y + h); g.closePath(); g.fill(); });
      g.fillRect(-8, 60, 16, 30);
    } else {   // moon
      g.beginPath(); g.arc(0, 0, 74, 0, TAU); g.fill(); g.fillStyle = '#14100c'; g.beginPath(); g.arc(34, -14, 62, 0, TAU); g.fill();
      g.fillStyle = hex; [[60, -60], [78, 20], [48, 62]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill(); });
    }
  });
}
function clockTexture() {      // reloj marcando las 11:55 PM
  return canvasTex(256, 256, (g) => {
    g.fillStyle = '#e9dfc4'; g.fillRect(0, 0, 256, 256);
    g.translate(128, 128); g.strokeStyle = '#2a1d10'; g.fillStyle = '#2a1d10'; g.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; g.lineWidth = i % 3 ? 5 : 9; g.beginPath(); g.moveTo(Math.sin(a) * 100, -Math.cos(a) * 100); g.lineTo(Math.sin(a) * 118, -Math.cos(a) * 118); g.stroke(); }
    const hand = (deg, len, w) => { const a = (deg * Math.PI) / 180; g.lineWidth = w; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.sin(a) * len, -Math.cos(a) * len); g.stroke(); };
    hand((11 + 55 / 60) * 30, 62, 11);     // hora: 11:55
    hand(55 * 6, 98, 7);                   // minutos: 55
    g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill();
  });
}
function glowTexture(inner = '255,236,170') {
  return canvasTex(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, `rgba(${inner},1)`); gr.addColorStop(0.25, `rgba(${inner},0.55)`); gr.addColorStop(1, `rgba(${inner},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });
}

export function buildIntro(ctx, room1, { player, skip = false } = {}) {
  const { scene, camera } = ctx;
  const root = new THREE.Group(); scene.add(root);
  const locked = () => player.controls.isLocked;
  const baseSpeed = player.speed;
  const hudEl = document.getElementById('hud');

  // ---------- Interfaz propia de la intro (se crea aquí, sin tocar index.html) ----------
  const style = document.createElement('style');
  style.textContent = `
    #fade{position:fixed;inset:0;background:#000;opacity:1;pointer-events:none;z-index:8;display:none}
    #hud.minimal #crosshair,#hud.minimal #room-name,#hud.minimal #inventory,#hud.minimal #held{display:none}
    #letter-veil{position:fixed;inset:0;z-index:7;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.5);
      -webkit-backdrop-filter:blur(7px);backdrop-filter:blur(7px);opacity:0;transition:opacity .9s}
    #letter-veil.show{opacity:1}
    #letter{max-width:min(480px,86vw);padding:2.4rem 2.6rem;background:linear-gradient(135deg,#f4e7c5,#e3cf9f);color:#3b2810;
      font:italic 1.15rem/1.7 Georgia,serif;text-align:center;border-radius:3px;box-shadow:0 0 60px rgba(255,200,90,.35),0 12px 40px rgba(0,0,0,.6);transform:rotate(-1deg)}
    #letter p{margin:.35rem 0} #letter p:first-child{font-size:1.6rem;font-style:normal;margin-bottom:.9rem}
    #letter small{display:block;margin-top:1.4rem;font:.8rem Georgia,serif;letter-spacing:.12em;opacity:.55}`;
  document.head.appendChild(style);
  const fadeEl = document.createElement('div'); fadeEl.id = 'fade'; document.body.appendChild(fadeEl);
  const veil = document.createElement('div'); veil.id = 'letter-veil';
  veil.innerHTML = `<div id="letter">${LETTER.map((l) => `<p>${l}</p>`).join('')}<small>PRESIONA E PARA CONTINUAR</small></div>`;
  document.body.appendChild(veil);

  // ---------- Estado ----------
  let sound = null, started = false, phase = 'idle', phaseT = 0, it = 0;
  let nextStep = 2, owlDone = false, stepDist = 0, lastX = 0, lastZ = 0;
  let doorAngle = 0, doorTarget = 0, doorOpen = false, plaqueShown = false;
  let fAngle = 0, fTarget = 0, fOpen = false, orbPhase = 'hidden', orbT = 0, wp = 0, waitT = 0, recall = false;
  let yaw0 = 0, pitch0 = 0, yBase = 0, lanternOff = false;
  const eul = new THREE.Euler(0, 0, 0, 'YXZ');
  const setPhase = (p) => { phase = p; phaseT = 0; };
  const canMove = () => ['walk', 'doorOpening', 'hall', 'guide', 'done'].includes(phase);

  // ---------- Atmósfera de noche ----------
  scene.background = new THREE.Color(0x070b14);
  scene.fog = new THREE.Fog(0x070b14, 40, 170);
  camera.far = 400; camera.updateProjectionMatrix();
  const ambient = new THREE.AmbientLight(0x8f93b8, 0);                         // luz fría de noche (exterior y hall)
  const facadeLight = new THREE.PointLight(0xffc27a, 0, 48, 2); facadeLight.position.set(DOOR_X, 5.5, 32);
  const hallLight = new THREE.PointLight(0xffd9a0, 0, 32, 2); hallLight.position.set(HCX, 7.2, 15);
  root.add(ambient, facadeLight, hallLight);

  // ---------- Materiales y utilidades ----------
  const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
  const stone = M(0xb4a88f), stoneDark = M(0x6f685b), wall = M(0xd2c5a8), roof = M(0x2a2e3a);
  const marble = M(0xd9d3c7, { roughness: 0.35 });
  const bronze = M(0xb07a3a, { roughness: 0.35, metalness: 0.9, emissive: 0x2a1808 });
  const goldM = M(0xe0b24a, { roughness: 0.3, metalness: 0.9, emissive: 0x4a3208 });
  const woodDoor = M(0x30221a, { roughness: 0.7 });
  const slab = (x0, x1, y0, y1, z0, z1, mat, collide = false, parent = root) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); parent.add(m);
    if (collide) ctx.colliders.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1 });
    return m;
  };

  // ================= EXTERIOR =================
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), M(0x131a26, { roughness: 0.45 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(HCX, GROUND, 120); root.add(ground);
  const tiles = canvasTex(256, 256, (g) => { g.fillStyle = '#242c3a'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#161c28'; g.lineWidth = 4; g.strokeRect(0, 0, 256, 256); g.strokeRect(0, 0, 128, 128); g.strokeRect(128, 128, 128, 128); });
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set(19, 17);
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(38, 33), M(0xffffff, { map: tiles, roughness: 0.4 }));
  plaza.rotation.x = -Math.PI / 2; plaza.position.set(HCX, GROUND + 0.01, 45.5); root.add(plaza);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(4, 28), M(0x3a4352, { roughness: 0.5 }));
  path.rotation.x = -Math.PI / 2; path.position.set(HCX, GROUND + 0.02, 48); root.add(path);

  // Plataforma del pórtico + escalera
  slab(-8, 28, GROUND, 0, FZ + 0.2, 29, stone);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(36, 3.8), marble); top.rotation.x = -Math.PI / 2; top.position.set(HCX, 0.005, 27.1); root.add(top);
  for (let i = 0; i < 6; i++) slab(3, 17, GROUND, GROUND + 0.2 * (i + 1), 29 + (5 - i), 30 + (5 - i), i % 2 ? marble : M(0xcfc9bd, { roughness: 0.4 }));
  slab(2.4, 3, GROUND, 0.6, 29, 35.2, stone, true); slab(17, 17.6, GROUND, 0.6, 29, 35.2, stone, true);   // barandas
  ctx.colliders.push({ minX: -8.4, maxX: 3, minZ: 29, maxZ: 29.4 }, { minX: 17, maxX: 28.4, minZ: 29, maxZ: 29.4 });   // borde frontal
  ctx.colliders.push({ minX: -8.4, maxX: -8, minZ: 25, maxZ: 29.4 }, { minX: 28, maxX: 28.4, minZ: 25, maxZ: 29.4 });  // bordes laterales

  // Fachada: pared del hall + alas laterales
  slab(-5.2, DOOR_X - 2, 0, HALL_H, FZ - 0.2, FZ + 0.2, wall, true);
  slab(DOOR_X + 2, 25.2, 0, HALL_H, FZ - 0.2, FZ + 0.2, wall, true);
  slab(DOOR_X - 2, DOOR_X + 2, DOOR_HT, HALL_H, FZ - 0.2, FZ + 0.2, wall);
  slab(-14, -5.2, GROUND, 10, 20, FZ + 0.2, wall); slab(25.2, 34, GROUND, 10, 20, FZ + 0.2, wall);
  slab(-14, 34, 9.8, 10.4, 19.6, FZ + 0.8, roof);                                                            // cornisa/techo
  slab(-8.4, 28.4, 8.6, 9.8, FZ + 0.2, 28.9, stone);                                                          // arquitrabe
  const pedShape = new THREE.Shape(); pedShape.moveTo(-18, 0); pedShape.lineTo(18, 0); pedShape.lineTo(0, 3.8); pedShape.closePath();
  const pediment = new THREE.Mesh(new THREE.ExtrudeGeometry(pedShape, { depth: 3.4, bevelEnabled: false }), stone);
  pediment.position.set(HCX, 9.8, FZ + 0.3); root.add(pediment);
  const clock = new THREE.Mesh(new THREE.CircleGeometry(1.3, 48), new THREE.MeshBasicMaterial({ map: clockTexture() }));
  clock.position.set(HCX, 11.1, FZ + 3.75); root.add(clock);
  const clockRing = new THREE.Mesh(new THREE.TorusGeometry(1.34, 0.1, 10, 48), goldM); clockRing.position.copy(clock.position); root.add(clockRing);
  [-6, -2, 2, 6, 14, 18, 22, 26].forEach((x) => {                                                              // columnas gigantes
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 8.6, 20), stone); col.position.set(x, 4.3, 27.6); root.add(col);
    slab(x - 0.85, x + 0.85, 8.2, 8.6, 26.75, 28.45, stone); slab(x - 0.85, x + 0.85, 0, 0.4, 26.75, 28.45, stone);
    ctx.colliders.push({ minX: x - 0.6, maxX: x + 0.6, minZ: 27, maxZ: 28.2 });
  });

  // Ventanas (algunas con luz cálida que titila)
  const windows = [];
  const addWindow = (x, y, w, h, lit) => {
    slab(x - w / 2 - 0.1, x + w / 2 + 0.1, y - h / 2 - 0.1, y + h / 2 + 0.1, FZ + 0.2, FZ + 0.27, stoneDark);
    const m = new THREE.MeshBasicMaterial({ color: lit ? 0xffc070 : 0x121827 });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, FZ + 0.29); root.add(p);
    if (lit) windows.push({ m, seed: Math.random() * 20 });
  };
  [-3, 0, 3, 6, 14, 17, 20, 23].forEach((x, i) => addWindow(x, 3.4, 1.4, 3.6, [1, 0, 1, 1, 1, 1, 0, 1][i]));
  [-12.5, -9.5, -6.8, 27.5, 30.5, 33].forEach((x, i) => { addWindow(x, 3.4, 1.4, 3.6, i % 3 !== 1); addWindow(x, 7.6, 1.2, 1.4, i % 2 === 0); });
  [-3, 3, 14, 20].forEach((x, i) => addWindow(x, 7.4, 1.2, 1.4, i % 2 === 0));

  // Faroles junto a la puerta (el de la izquierda lo apaga el viento más adelante)
  const lanterns = [DOOR_X - 3, DOOR_X + 3].map((x) => {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffd38a }));
    bulb.position.set(x, 3.4, FZ + 0.6); root.add(bulb);
    slab(x - 0.12, x + 0.12, 2.7, 2.85, FZ + 0.4, FZ + 0.8, bronze);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('255,200,120'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    halo.scale.setScalar(3); halo.position.copy(bulb.position); root.add(halo);
    return { bulb, halo };
  });

  // Banderas que ondean
  const flags = [-11.5, 31.5].map((x, i) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 7, 8), bronze); pole.position.set(x, 13.4, 22); root.add(pole);
    const geo = new THREE.PlaneGeometry(3.2, 1.9, 14, 6);
    const f = new THREE.Mesh(geo, M(i ? 0xa8842f : 0x8c1f2b, { side: THREE.DoubleSide, roughness: 0.8 }));
    f.position.set(x + 1.6, 15.4, 22); root.add(f);
    return { geo, base: geo.attributes.position.array.slice(), phase: i * 1.7 };
  });

  // Setos y árboles oscuros alrededor de la plaza
  const hedgeM = M(0x0e1a14);
  slab(-9.4, -9, GROUND, GROUND + 1.8, 25, 62, hedgeM, true); slab(29, 29.4, GROUND, GROUND + 1.8, 25, 62, hedgeM, true);
  slab(-9.4, 29.4, GROUND, GROUND + 1.8, 62, 62.4, hedgeM, true);
  const treeTrunk = M(0x1a120c), treeLeaf = M(0x0c1a12);
  for (let i = 0; i < 16; i++) {
    const side = i % 2 ? 1 : -1, x = HCX + side * (24 + Math.random() * 8), z = 30 + Math.floor(i / 2) * 5 + Math.random() * 2, h = 4 + Math.random() * 2;
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, h, 6), treeTrunk); tr.position.set(x, GROUND + h / 2, z);
    const cn = new THREE.Mesh(new THREE.ConeGeometry(1.8, h * 1.2, 8), treeLeaf); cn.position.set(x, GROUND + h + h * 0.4, z); root.add(tr, cn);
  }

  // Cielo: estrellas, luna y las luces lejanas de la ciudad
  const starPos = new Float32Array(500 * 3);
  for (let i = 0; i < 500; i++) { const a = Math.random() * TAU, e = 0.12 + Math.random() * 1.4, r = 320; starPos[i * 3] = HCX + Math.cos(a) * Math.cos(e) * r; starPos[i * 3 + 1] = Math.sin(e) * r; starPos[i * 3 + 2] = 20 + Math.sin(a) * Math.cos(e) * r; }
  const starsGeo = new THREE.BufferGeometry(); starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  root.add(new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0xcfd8ff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.55, fog: false })));
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('190,205,255'), transparent: true, opacity: 0.5, fog: false, depthWrite: false }));
  moon.scale.setScalar(70); moon.position.set(110, 150, -120); root.add(moon);
  const cityPos = new Float32Array(260 * 3);
  for (let i = 0; i < 260; i++) { const cl = i % 4; cityPos[i * 3] = HCX - 170 + cl * 90 + (Math.random() - 0.5) * 70; cityPos[i * 3 + 1] = GROUND + 1 + Math.random() * 14; cityPos[i * 3 + 2] = 190 + Math.random() * 90; }
  const cityGeo = new THREE.BufferGeometry(); cityGeo.setAttribute('position', new THREE.BufferAttribute(cityPos, 3));
  root.add(new THREE.Points(cityGeo, new THREE.PointsMaterial({ color: 0xffd9a0, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.7, fog: false })));

  // Lluvia suave
  const RN = 450, rainPos = new Float32Array(RN * 6), rain = [];
  for (let i = 0; i < RN; i++) rain.push({ x: START.x + (Math.random() - 0.5) * 44, z: START.z + (Math.random() - 0.5) * 44, y: GROUND + Math.random() * 16 });
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainMesh = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0x9fb4d6, transparent: true, opacity: 0.32, fog: false }));
  rainMesh.frustumCulled = false; root.add(rainMesh);

  // Hojas secas que cruzan el camino
  const leafM = new THREE.MeshStandardMaterial({ color: 0x8a5120, emissive: 0x2a1608, side: THREE.DoubleSide });
  const leaves = Array.from({ length: 14 }, () => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.09), leafM); m.rotation.x = -Math.PI / 2; root.add(m);
    return { m, x: -8 + Math.random() * 38, z: 38 + Math.random() * 22, v: 1.6 + Math.random() * 1.6, ph: Math.random() * 6 };
  });

  // ---------- Sobre dorado en el suelo ----------
  const env = new THREE.Group(); env.position.set(START.x + 0.15, GROUND + 0.02, START.z - 2.0); env.rotation.y = 0.4; root.add(env);
  const envBody = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.012, 0.24), goldM);
  const envFlap = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.12, 3), M(0xc99a30, { metalness: 0.8, roughness: 0.35, emissive: 0x3a2806 }));
  envFlap.rotation.set(0, Math.PI, 0); envFlap.rotation.x = 0; envFlap.scale.set(1, 0.1, 1); envFlap.rotation.y = Math.PI / 6; envFlap.position.set(0, 0.008, -0.06);
  const seal = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), M(0x8a1c1c, { roughness: 0.4, emissive: 0x2a0606 })); seal.position.set(0, 0.016, -0.02);
  env.add(envBody, envFlap, seal);
  const envHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('255,210,110'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  envHalo.scale.set(1.8, 1.8, 1); envHalo.position.set(0, 0.25, 0); env.add(envHalo);
  const SP = 22, spPos = new Float32Array(SP * 3), spSeed = Array.from({ length: SP }, () => ({ a: Math.random() * TAU, r: Math.random() * 0.25, s: 0.15 + Math.random() * 0.3, y: Math.random() * 1.6 }));
  const spGeo = new THREE.BufferGeometry(); spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  const sparkles = new THREE.Points(spGeo, new THREE.PointsMaterial({ color: 0xffd36a, size: 0.05, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  sparkles.frustumCulled = false; env.add(sparkles);
  ctx.interaction.add(env, {
    prompt: () => 'Presiona E para recoger.',
    enabled: () => phase === 'envelope',
    onInteract: () => startTaking(),
  });
  // El mismo sobre, ya "en las manos" (hijo de la cámara)
  const held = new THREE.Group(); held.visible = false; camera.add(held); scene.add(camera);
  const heldBody = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.012, 0.24), goldM), heldSeal = seal.clone();
  held.add(heldBody, heldSeal); heldSeal.position.set(0, 0.014, 0);

  // ---------- Puerta principal (doble hoja, se abre hacia adentro) ----------
  const frontDoor = new THREE.Group(); root.add(frontDoor);
  const leafL = new THREE.Group(), leafR = new THREE.Group();
  leafL.position.set(DOOR_X - 2, 0, FZ); leafR.position.set(DOOR_X + 2, 0, FZ);
  const mkLeaf = (pivot, dir) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(2, DOOR_HT, 0.22), woodDoor); m.position.set(dir, DOOR_HT / 2, 0); pivot.add(m);
    [0.9, 3.7].forEach((y) => { const b = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.26), bronze); b.position.set(dir, y, 0); pivot.add(b); });
    [[0.45, 2.3], [0.45, 1.5], [0.45, 3.1]].forEach(([dx, y]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), bronze); s.position.set(dir + (dir > 0 ? dx : -dx) * 0.9, y, 0.13); pivot.add(s); });
  };
  mkLeaf(leafL, 1); mkLeaf(leafR, -1);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.055, 10, 24), bronze); handle.position.set(-0.28, 2.1, 0.2); leafR.add(handle);   // enorme picaporte de bronce
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.05), bronze); plate.position.set(-0.28, 2.1, 0.14); leafR.add(plate);
  frontDoor.add(leafL, leafR);
  const frontCol = { minX: DOOR_X - 2, maxX: DOOR_X + 2, minZ: FZ - 0.3, maxZ: FZ + 0.3 };
  ctx.colliders.push(frontCol);
  ctx.interaction.add(frontDoor, {
    prompt: () => 'Presiona E para abrir.',
    enabled: () => phase === 'walk' && !doorOpen,
    onInteract: () => { setPhase('doorOpening'); doorTarget = 1.85; doorOpen = true; sound.creak(6); setTimeout(() => sound.boom(), 400); },
  });

  // ================= HALL PRINCIPAL =================
  const hallBounds = { minX: HX0, maxX: HX1, minZ: HZ0, maxZ: FZ - 0.2 };
  ctx.rooms.push({ name: 'Hall principal', bounds: hallBounds });
  const floorTex = canvasTex(256, 256, (g) => {
    g.fillStyle = '#d9d2c3'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#4b5853'; g.fillRect(0, 0, 128, 128); g.fillRect(128, 128, 128, 128);
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1.2; for (let i = 0; i < 14; i++) { g.beginPath(); g.moveTo(Math.random() * 256, Math.random() * 256); g.lineTo(Math.random() * 256, Math.random() * 256); g.stroke(); }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(10, 7);
  const hallFloor = new THREE.Mesh(new THREE.PlaneGeometry(HX1 - HX0, FZ - HZ0), M(0xffffff, { map: floorTex, roughness: 0.3 }));
  hallFloor.rotation.x = -Math.PI / 2; hallFloor.position.set(HCX, 0, (FZ + HZ0) / 2); root.add(hallFloor);
  slab(0.5, 3.5, -0.02, 0.004, 4.8, 5.4, marble);                                                                   // umbral de la puerta de Fearless
  const hallCeil = new THREE.Mesh(new THREE.PlaneGeometry(HX1 - HX0, FZ - HZ0), M(0x2a241f)); hallCeil.rotation.x = Math.PI / 2; hallCeil.position.set(HCX, HALL_H, (FZ + HZ0) / 2); root.add(hallCeil);
  for (let x = HX0 + 3; x < HX1; x += 5) slab(x - 0.25, x + 0.25, HALL_H - 0.6, HALL_H, HZ0, FZ, stoneDark);   // vigas
  slab(HX0 - 0.2, HX0 + 0.2, 0, HALL_H, 5.2, FZ + 0.2, wall, true);                                            // pared oeste
  slab(HX1 - 0.2, HX1 + 0.2, 0, HALL_H, 4.8, FZ + 0.2, wall, true);                                            // pared este
  slab(9.2, HX1 + 0.2, 0, HALL_H, 4.8, 5.2, wall, true);                                                        // pared norte (derecha)
  slab(HX0 - 0.2, 9.2, 4, HALL_H, 4.8, 5.2, wall);                                                              // pared norte sobre la sala 1
  for (const x of [HX0 + 1, HX1 - 1]) for (const z of [9, 13, 17, 21]) {                                        // columnas
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, HALL_H, 16), marble); c.position.set(x, HALL_H / 2, z); root.add(c);
    ctx.colliders.push({ minX: x - 0.5, maxX: x + 0.5, minZ: z - 0.5, maxZ: z + 0.5 });
  }
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(4, 9), M(0x5a1a22, { roughness: 1 })); carpet.rotation.x = -Math.PI / 2; carpet.position.set(HCX, 0.012, 20.2); root.add(carpet);
  // Lámpara de araña (solo decorativa: la luz real es hallLight)
  const chand = new THREE.Group(); chand.position.set(HCX, 7.4, 15); root.add(chand);
  chand.add(new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.08, 8, 40), goldM)); chand.children[0].rotation.x = Math.PI / 2;
  for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU, b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe3a8 })); b.position.set(Math.cos(a) * 2.2, 0.15, Math.sin(a) * 2.2); chand.add(b); }
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), goldM); chain.position.y = 0.9; chand.add(chain);

  // Estatua central con placa
  slab(8.5, 11.5, 0, 1.3, 13.5, 16.5, stoneDark, true);
  const statueM = M(0xc4c6cc, { roughness: 0.6 });
  const robe = new THREE.Mesh(new THREE.ConeGeometry(0.85, 2.8, 16), statueM); robe.position.set(HCX, 2.7, 15); root.add(robe);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), statueM); head.position.set(HCX, 4.3, 15); root.add(head);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.2, 8), statueM); arm.position.set(HCX + 0.35, 4.35, 15); arm.rotation.z = -0.35; root.add(arm);
  const statueLamp = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), new THREE.MeshBasicMaterial({ color: 0xffe9a8 })); statueLamp.position.set(HCX + 0.62, 4.98, 15); root.add(statueLamp);
  const plaqueMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.8), new THREE.MeshBasicMaterial({ map: makeTextTexture('Los recuerdos permanecen dormidos', { w: 640, h: 220, bg: '#2a2018', color: '#f3d38a', font: '38px Georgia' }) }));
  plaqueMesh.position.set(HCX, 0.78, 16.53); root.add(plaqueMesh);
  ctx.interaction.add(plaqueMesh, { prompt: () => 'Presiona E para leer.', onInteract: () => ctx.ui.toast(PLAQUE, 8000) });

  // Seis puertas, una por era. Solo la de Fearless (la primera) se abre.
  ERAS.forEach((era, i) => {
    const x = FDOOR_X + 4 * i, accent = new THREE.Color(era.hex);
    const frameM = M(accent.getHex(), { emissive: accent.clone().multiplyScalar(0.25), roughness: 0.5, metalness: 0.5 });
    slab(x - 1.8, x - 1.6, 0, 3.9, 5.2, 5.45, frameM); slab(x + 1.6, x + 1.8, 0, 3.9, 5.2, 5.45, frameM); slab(x - 1.8, x + 1.8, 3.7, 3.9, 5.2, 5.45, frameM);
    const med = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), new THREE.MeshBasicMaterial({ map: eraTexture(era.kind, era.hex) })); med.position.set(x, 4.65, 5.25); root.add(med);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.04, 8, 32), frameM); ring.position.copy(med.position); ring.position.z += 0.01; root.add(ring);
    if (i === 0) return;                                                    // la de Fearless tiene su propia puerta (abajo)
    const d = new THREE.Mesh(new THREE.BoxGeometry(3, 3.6, 0.14), woodDoor); d.position.set(x, 1.8, 5.3); root.add(d);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), bronze); knob.position.set(x + 1.1, 1.7, 5.42); root.add(knob);
    ctx.interaction.add(d, { prompt: () => 'Objeto bloqueado.', onInteract: () => ctx.ui.toast('Esta puerta aún duerme...', 2500) });
  });
  // Puerta dorada de Fearless (entrada de la sala 1). Se abre hacia la sala 1.
  const fDoor = new THREE.Group(); root.add(fDoor);
  const fL = new THREE.Group(), fR = new THREE.Group(); fL.position.set(0.5, 0, 5); fR.position.set(3.5, 0, 5);
  [[fL, 0.75], [fR, -0.75]].forEach(([p, dir]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.2, 0.12), goldM); m.position.set(dir, 1.6, 0); p.add(m);
    [[0.55, 1.7], [0.55, 0.9]].forEach(([w, y]) => { const pn = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.14), M(0xb88a2a, { metalness: 0.9, roughness: 0.4 })); pn.position.set(dir, y + 0.4, 0.01); p.add(pn); });
  });
  fDoor.add(fL, fR);
  const lockM = new THREE.MeshStandardMaterial({ color: 0xffd36a, emissive: 0x6a4a10, roughness: 0.3 });
  const lockMesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 12), lockM); lockMesh.position.set(FDOOR_X, 1.6, 5.1); root.add(lockMesh);
  const inscr = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.7), new THREE.MeshBasicMaterial({ map: makeTextTexture('Fearless', { w: 512, h: 140, bg: '#1b140c', color: '#ffd36a', font: 'italic 84px Georgia' }) }));
  inscr.position.set(FDOOR_X, 3.55, 5.26); root.add(inscr);
  const fCol = { minX: 0.5, maxX: 3.5, minZ: 4.85, maxZ: 5.15 }; ctx.colliders.push(fCol);
  ctx.interaction.add(fDoor, {
    prompt: () => 'Objeto bloqueado.', enabled: () => !fOpen && fTarget === 0,
    onInteract: () => {
      if (orbPhase === 'hidden' && (phase === 'hall' || phase === 'guide')) { spawnGuide(); ctx.ui.toast('Algo despierta en la estatua...', 3000); }   // no hace falta esperar
      else ctx.ui.toast('La cerradura no responde... todavía.', 2500);
    },
  });

  // ---------- Luz guía ----------
  const orb = new THREE.Group(); orb.visible = false; root.add(orb);
  const orbVis = new THREE.Group(); orb.add(orbVis);                       // parte visible (sube y baja suavemente)
  orbVis.add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), new THREE.MeshBasicMaterial({ color: 0xfff0b8 })));
  const orbHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); orbHalo.scale.setScalar(1.7); orbVis.add(orbHalo);
  const OP = 38, opPos = new Float32Array(OP * 3), opSeed = Array.from({ length: OP }, () => ({ a: Math.random() * TAU, r: 0.2 + Math.random() * 0.5, s: 0.6 + Math.random() * 1.2, y: (Math.random() - 0.5) * 0.7 }));
  const opGeo = new THREE.BufferGeometry(); opGeo.setAttribute('position', new THREE.BufferAttribute(opPos, 3));
  const orbDust = new THREE.Points(opGeo, new THREE.PointsMaterial({ color: 0xffd36a, size: 0.05, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  orbDust.frustumCulled = false; orbVis.add(orbDust);
  const ROUTE = [[10, 4.9, 15], [14.5, 2.8, 18.5], [19.5, 2.6, 15], [19.5, 2.5, 9.5], [13, 2.5, 8], [7, 2.4, 8.2], [2, 2.2, 7.6]].map((p) => new THREE.Vector3(...p));

  // ================= Secuencia =================
  function startTaking() {
    yaw0 = camera.rotation.y; pitch0 = camera.rotation.x; yBase = camera.position.y;
    setPhase('taking'); ctx.ui.setPrompt('');
  }
  function closeLetter() {
    veil.classList.remove('show'); setTimeout(() => (veil.style.display = 'none'), 900);
    held.visible = false; setPhase('returning'); sound.gust();
  }
  addEventListener('keydown', (e) => { if (e.code === 'KeyE' && phase === 'reading' && phaseT > 1.2) closeLetter(); });

  function hudMode(m) { hudEl.classList.toggle('minimal', m === 'minimal'); }
  function spawnGuide() { orbPhase = 'follow'; orbT = 0; wp = 0; waitT = 0; recall = false; orb.visible = true; orb.position.copy(ROUTE[0]); statueLamp.visible = false; sound.sparkle(); ctx.particles.burst(ROUTE[0], 30, { speed: 1, up: 1 }); }

  function update(dt, t) {
    // ----- Animaciones del mundo (siempre) -----
    const cam = camera.position;
    for (let i = 0; i < RN; i++) {                                                // lluvia
      const d = rain[i]; d.y -= 13 * dt; if (d.y < GROUND) d.y += 16;
      const x = cam.x + ((((d.x - cam.x) % 44) + 66) % 44) - 22, z = cam.z + ((((d.z - cam.z) % 44) + 66) % 44) - 22;
      rainPos.set([x, d.y, z, x + 0.03, d.y + 0.38, z + 0.02], i * 6);
    }
    rainGeo.attributes.position.needsUpdate = true;
    leaves.forEach((l, i) => {                                                    // hojas secas
      l.x += l.v * dt; if (l.x > 32) l.x = -9; l.ph += dt * 3;
      l.m.position.set(l.x, GROUND + 0.04 + Math.abs(Math.sin(l.ph)) * 0.12, l.z + Math.sin(t * 0.7 + i) * 0.8); l.m.rotation.z = l.ph;
    });
    flags.forEach((f) => {                                                        // banderas
      const p = f.geo.attributes.position.array;
      for (let i = 0; i < p.length; i += 3) { const u = (f.base[i] + 1.6) / 3.2; p[i + 2] = Math.sin(f.base[i] * 2.2 + t * 3 + f.phase) * 0.28 * u; }
      f.geo.attributes.position.needsUpdate = true;
    });
    windows.forEach((w) => { const f = 0.8 + 0.2 * Math.sin(t * 7 + w.seed) * Math.sin(t * 2.3 + w.seed * 2); w.m.color.setRGB(1 * f, 0.75 * f, 0.44 * f); });   // luces que titilan
    lanterns.forEach((l, i) => { if (i === 0 && lanternOff) return; const f = 0.85 + 0.15 * Math.sin(t * 9 + i * 3) * Math.sin(t * 3.1); l.halo.material.opacity = f; });
    if (envHalo.visible) {
      envHalo.material.opacity = 0.55 + 0.25 * Math.sin(t * 2.2);
      for (let i = 0; i < SP; i++) { const s = spSeed[i], y = (s.y + t * s.s) % 1.6; spPos.set([Math.cos(s.a + t * 0.6) * s.r, y, Math.sin(s.a + t * 0.6) * s.r], i * 3); }
      spGeo.attributes.position.needsUpdate = true;
    }

    // ----- Luces según la zona (las luces de three.js son globales) -----
    const z = cam.z, out = smooth(FZ - 1, FZ + 1.5, z), inZone = smooth(3.4, 5.6, z);
    ambient.intensity = inZone * (0.3 * out + 0.55 * (1 - out));
    facadeLight.intensity = 85 * out; hallLight.intensity = 58 * inZone * (1 - out);
    room1.lights.mute = Math.min(room1.lights.mute, Math.max(0.04, fOpen ? Math.max(clamp((5.4 - z) / 1.8, 0, 1), 0.22) : clamp((5.4 - z) / 1.8, 0, 1)));
    room1.lights.apply();
    rainMesh.visible = out > 0.02; rainMesh.material.opacity = 0.32 * out;
    sparkles.visible = envHalo.visible;
    if (!locked() || !started) return;                                           // pausa o antes de empezar: se congela la secuencia

    it += dt; phaseT += dt;
    sound.outdoor(out * Math.min(1, it / 3));
    sound.drone(smooth(FZ - 1, FZ - 4, z) * (1 - smooth(4.5, 3, z)) * (fOpen || phase === 'hall' || phase === 'guide' || phase === 'done' ? 1 : 0));
    // altura del suelo (escalera) y velocidad
    const crouch = phase === 'taking' || phase === 'reading' ? -0.3 * Math.min(1, phaseT / 1.4) : 0;
    const targetY = 1.7 + groundHeight(cam.x, cam.z) + (phase === 'taking' || phase === 'reading' ? crouch : 0);
    if (phase === 'returning') cam.y += (1.7 + groundHeight(cam.x, cam.z) - cam.y) * Math.min(1, dt * 4); else cam.y += (targetY - cam.y) * Math.min(1, dt * 12);
    player.speed = baseSpeed * (z > 35 ? 0.85 : z > 29 ? 0.55 : z > HZ0 + 0.2 ? 0.85 : 1);
    // pasos al caminar
    if (canMove()) {
      stepDist += Math.hypot(cam.x - lastX, cam.z - lastZ);
      if (stepDist > 0.78 && z > HZ0) { stepDist = 0; sound.step(z > 35 ? 'gravel' : z > 29 ? 'stair' : z > FZ ? 'marble' : 'hall'); }
    }
    lastX = cam.x; lastZ = cam.z;

    switch (phase) {
      case 'opening': {                                                          // pantalla negra -> se descubre el museo
        fadeEl.style.opacity = String(1 - smooth(3.5, 11, it));
        if (it >= nextStep && it < 8.6) { sound.step('gravel', 0.5 + 0.5 * Math.min(1, (it - 2) / 4)); nextStep += 0.58; }
        if (it > 12 && !owlDone) { owlDone = true; sound.owl(); }
        if (it > 15) { setPhase('envelope'); fadeEl.style.display = 'none'; sound.sparkle(); }
        break;
      }
      case 'envelope': break;                                                    // el jugador puede mirar; busca el sobre
      case 'taking': {                                                           // la cámara baja y toma el sobre
        const k = ease(clamp(phaseT / 1.6, 0, 1));
        cam.y = yBase - 0.3 * k;
        eul.set(pitch0 + (-1.05 - pitch0) * k, yaw0, 0); camera.rotation.copy(eul);
        if (phaseT > 0.9 && !held.visible) { env.visible = false; envHalo.visible = false; held.visible = true; sound.paper(); }
        if (held.visible) { const h = ease(clamp((phaseT - 0.9) / 1.4, 0, 1)); held.position.set(0, -0.5 + 0.43 * h, -0.42); held.rotation.set(Math.PI / 2 - 0.35 * h, 0, 0); }
        if (phaseT > 2.9) { veil.style.display = 'flex'; requestAnimationFrame(() => veil.classList.add('show')); setPhase('reading'); }
        break;
      }
      case 'reading': {                                                          // la carta: cámara fija hasta que el jugador continúa
        cam.y = yBase - 0.3; eul.set(-1.05, yaw0, 0); camera.rotation.copy(eul);
        break;
      }
      case 'returning': {                                                        // la cámara se levanta; el viento apaga una luz
        const k = ease(clamp(phaseT / 1.6, 0, 1));
        eul.set(-1.05 + (0 - -1.05) * k, yaw0, 0); camera.rotation.copy(eul);
        if (phaseT > 0.5 && !lanternOff) { lanternOff = true; lanterns[0].bulb.material.color.set(0x15110d); lanterns[0].halo.visible = false; sound.click(); }
        if (phaseT > 1.7) setPhase('walk');
        break;
      }
      case 'walk': break;
      case 'doorOpening': {
        doorAngle += (doorTarget - doorAngle) * Math.min(1, dt * 0.55);
        if (doorAngle > 0.6) frontCol.minZ = frontCol.maxZ = -999;               // ya se puede pasar
        if (z < FZ - 1.4) {                                                      // el jugador entró: la puerta se cierra sola
          setPhase('hall'); doorTarget = 0; hudMode('full'); ctx.ui.setPrompt('');
        }
        break;
      }
      case 'hall': {
        doorAngle += (0 - doorAngle) * Math.min(1, dt * 2.2);
        if (doorAngle < 0.04 && doorTarget === 0 && doorOpen) { doorAngle = 0; doorOpen = false; Object.assign(frontCol, { minZ: FZ - 0.3, maxZ: FZ + 0.3 }); sound.boom(); }
        if (phaseT > 8 && orbPhase === 'hidden') spawnGuide();
        if (orbPhase !== 'hidden') setPhase('guide');
        break;
      }
      case 'guide': {
        doorAngle += (0 - doorAngle) * Math.min(1, dt * 2.2);
        if (doorOpen && doorAngle < 0.04) { doorAngle = 0; doorOpen = false; Object.assign(frontCol, { minZ: FZ - 0.3, maxZ: FZ + 0.3 }); sound.boom(); }
        if (z < 4.2) setPhase('done');
        break;
      }
      case 'done': break;
    }

    // ----- Puerta principal / puerta de Fearless (animaciones) -----
    leafL.rotation.y = doorAngle; leafR.rotation.y = -doorAngle;
    fAngle += (fTarget - fAngle) * Math.min(1, dt * 0.7);
    fL.rotation.y = fAngle; fR.rotation.y = -fAngle;
    if (fAngle > 0.5 && fCol.minZ !== -999) { fCol.minZ = fCol.maxZ = -999; fOpen = true; }

    // ----- Placa de la estatua: se lee sola al acercarse -----
    if (!plaqueShown && phase !== 'opening' && Math.hypot(cam.x - HCX, cam.z - 17) < 4.5 && z < FZ - 1) { plaqueShown = true; ctx.ui.toast(PLAQUE, 9000); }

    // ----- Luz guía -----
    if (orbPhase !== 'hidden') {
      orbT += dt;
      const pulse = 1 + 0.12 * Math.sin(t * 5); orbVis.position.y = Math.sin(t * 2) * 0.07;
      orbHalo.scale.setScalar(1.7 * pulse * (orbPhase === 'fade' ? Math.max(0, 1 - orbT / 1.6) : 1));
      for (let i = 0; i < OP; i++) { const s = opSeed[i]; opPos.set([Math.cos(s.a + t * s.s) * s.r, s.y + Math.sin(t * 2 + i) * 0.15, Math.sin(s.a + t * s.s) * s.r], i * 3); }
      opGeo.attributes.position.needsUpdate = true;
      if (orbPhase === 'follow') {
        const dPlayer = Math.hypot(cam.x - orb.position.x, cam.z - orb.position.z);
        const nearDoor = Math.hypot(cam.x - FDOOR_X, cam.z - 6.5) < 6;                     // el jugador ya fue a la puerta de Fearless
        if (nearDoor) wp = ROUTE.length - 1;                                                // entonces la luz va directo allí
        const goal = ROUTE[Math.min(wp, ROUTE.length - 1)];
        const toGoal = goal.clone().sub(orb.position), dist = toGoal.length();
        if (dist < 0.3) { if (wp >= ROUTE.length - 1) { orbPhase = 'arrive'; orbT = 0; } else wp++; }
        else if (nearDoor) { orb.position.addScaledVector(toGoal.normalize(), Math.min(dist, 5 * dt)); waitT = 0; recall = false; }
        else if (recall) {                                                                  // el jugador quedó lejos: la luz vuelve a buscarlo
          const toP = new THREE.Vector3(cam.x, 2.4, cam.z).sub(orb.position);
          orb.position.addScaledVector(toP.normalize(), Math.min(toP.length(), 3 * dt));
          if (dPlayer < 5) { recall = false; waitT = 0; }
        } else if (dPlayer <= 9) { waitT = 0; orb.position.addScaledVector(toGoal.normalize(), Math.min(dist, 2.3 * dt)); }   // lo guía
        else { waitT += dt; if (waitT > 3) recall = true; }                                // espera 3 s y luego va a buscarlo
      } else if (orbPhase === 'arrive') {                                                // frente a la puerta: la cerradura brilla
        const k = Math.min(1, orbT / 2.5);
        lockM.emissive.setRGB(0.4 + 0.8 * k, 0.29 + 0.6 * k, 0.06 + 0.2 * k); lockM.emissiveIntensity = 1 + 2 * k;
        lockMesh.scale.setScalar(1 + 0.8 * k * (0.8 + 0.2 * Math.sin(t * 8)));
        if (orbT > 2.8) { fTarget = 1.85; sound.creak(5); setTimeout(() => sound.boom(), 3200); orbPhase = 'through'; orbT = 0; }
      } else if (orbPhase === 'through') {                                               // la luz atraviesa la puerta y desaparece
        orb.position.lerp(new THREE.Vector3(FDOOR_X, 2.0, 1.5), Math.min(1, dt * 0.6));
        if (orbT > 4.5) { orbPhase = 'fade'; orbT = 0; ctx.particles.burst(orb.position, 40, { speed: 1.4, up: 1 }); }
      } else if (orbPhase === 'fade') { if (orbT > 1.6) { orb.visible = false; orbPhase = 'gone'; } }
    }

    // ----- Transición a la sala 1: vuelve el canto de pájaros (el ambiente de las salas) -----
    if (phase === 'done' && !done) { done = true; hudMode('full'); sound.restoreRooms(0.8, 3.5); }
  }
  let done = false;
  ctx.updaters.push(update);

  // ================= API =================
  function finishInstant() {                                                        // ?skip: salta la intro y empieza en la sala 1
    fadeEl.style.display = 'none'; env.visible = false; envHalo.visible = false;
    fAngle = fTarget = 1.85; fL.rotation.y = fAngle; fR.rotation.y = -fAngle; fCol.minZ = fCol.maxZ = -999; fOpen = true;
    camera.position.set(2, 1.7, 4.0); camera.rotation.set(0, 0, 0);
    hudMode('full'); phase = 'done'; done = true; plaqueShown = true; orbPhase = 'gone';
  }
  return {
    hudMode() { return phase === 'hall' || phase === 'guide' || phase === 'done' || skip ? 'full' : 'minimal'; },
    blockMove() { return !canMove() && !skip; },
    onLock() {
      if (!sound) sound = createIntroSound(ctx.audio);
      if (started) return;
      started = true;
      if (skip) { finishInstant(); return; }
      sound.muteRooms();                                                           // durante la intro solo suenan el viento, la lluvia y los pasos
      camera.position.set(START.x, 1.7 + GROUND, START.z); camera.rotation.set(0, 0, 0);
      lastX = camera.position.x; lastZ = camera.position.z;
      fadeEl.style.display = 'block'; fadeEl.style.opacity = '1';
      hudMode('minimal'); setPhase('opening'); it = 0;
    },
    get phase() { return phase; },
    get guide() { return { phase: orbPhase, obj: orb }; },     // solo lectura (para pruebas)
  };
}