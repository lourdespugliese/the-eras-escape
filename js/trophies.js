// trophies.js — Vitrinas del Hall principal: cada trofeo recuperado aparece en su vitrina.
//
// Cómo funciona:
//  - Hay 6 vitrinas (una por objeto de ITEMS en ui.js). Al principio están "vacías": se ve la silueta
//    oscura y translúcida del objeto y una placa con "???".
//  - Este módulo envuelve ctx.collect(id): cuando una sala llama ctx.collect('guitar'), la vitrina queda "pendiente".
//  - La primera vez que el jugador vuelve a pisar el hall, el trofeo se revela con animación, destello y sonido.
//  - Las salas NO necesitan cambios: siguen llamando a ctx.collect(id) como siempre.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { canvasTex } from './rooms.js';
import { ITEMS } from './ui.js';

const HCX = 2;                                                  // centro del hall en x (el hall va de x = -13 a 17; debe coincidir con HCX de intro.js)
const HALL = { minX: -13, maxX: 17, minZ: 5.4, maxZ: 24.6 };   // zona del hall donde se dispara la revelación
const MAIN = { x: HCX, y: 3.6, z: 15 };                        // centro de la estatua principal (intro.js: base en (HCX, 1.72, 15), alto 3.9)
const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const easeOutBack = (k) => 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2);

// Una vitrina por trofeo. Orden: desde la entrada del hall hacia la puerta del fondo.
// (x < HCX = lado oeste, mira hacia el este; x > HCX = lado este, mira hacia el oeste). Quedan a ±5.5 del centro, a cada lado de la alfombra.
const SPOTS = [
  { id: 'guitar',   era: 'Fearless',   hex: '#ffc83d', x: -3.5, z: 20.5, desc: 'La guitarra dorada de Fearless. Vuelve a sonar.' },
  { id: 'polaroid', era: '1989',       hex: '#2de2ff', x: 7.5,  z: 20.5, desc: 'Una polaroid de 1989: un instante congelado en el tiempo.' },
  { id: 'snake',    era: 'Reputation', hex: '#ffc83d', x: -3.5, z: 15.5, desc: 'La serpiente de Reputation, ahora en silencio.' },
  { id: 'heart',    era: 'Lover',      hex: '#ff8fc8', x: 7.5,  z: 15.5, desc: 'El corazón de Lover, cálido de nuevo.' },
  { id: 'oldkey',   era: 'Folklore',   hex: '#b8c8a0', x: -3.5, z: 10.5, desc: 'Una llave antigua. Abre algo que lleva mucho cerrado.' },
  { id: 'finalkey', era: 'Midnights',  hex: '#8a96ff', x: 7.5,  z: 10.5, desc: 'La llave final. Solo falta usarla.' },
];

// ---------- Estatuas de Taylor (una por era, al lado de su vitrina) ----------
// Cada trofeo tiene a su lado un pedestal con la estatua de su era. La estatua aparece junto con el trofeo
// (misma revelación al volver al hall). Para agregar/cambiar una: edita su línea aquí. Las claves son los ids de SPOTS.
//   url    -> archivo .glb dentro de assets/models/
//   height -> (opcional) alto final en metros       rotY -> (opcional) giro en radianes si el modelo no mira al frente
const STATUE_ERAS = {
  guitar:   { url: 'assets/models/taylor-fearless.glb' },
  polaroid: { url: 'assets/models/taylor-1989.glb' },
  snake:    { url: 'assets/models/taylor-reputation.glb' },
  heart:    { url: 'assets/models/taylor-lover.glb' },
  // oldkey / finalkey (Folklore, Midnights): aún sin su estatua propia. Mientras tanto muestran una figura simple y liviana sobre su
  // pedestal para que el final tenga sus 6 Taylors. Cuando existan sus .glb, agrega aquí su línea (oldkey / finalkey).
};
const STATUE = {
  height: 1.9,          // alto por defecto de cada estatua (la vitrina mide 2.4 en total)
  side: 1.9,            // separación en z respecto al centro de su vitrina (hacia el fondo del hall)
  pedestalH: 0.5,       // alto del pedestal
  rotY: 0,              // giro por defecto (0 = el modelo mira hacia +Z, como la estatua central)
  // Si un .glb no existe o falla al cargar, se usa éste como reemplazo temporal (null = no mostrar nada).
  fallback: 'assets/models/estatua-taylor.glb',
};

// Los .glb son pesados: se cargan una sola vez (caché por url) y solo cuando el trofeo de esa era se recupera.
const gltfLoader = new GLTFLoader();
const modelCache = new Map();
function loadModel(url) {
  if (!modelCache.has(url)) modelCache.set(url, new Promise((res, rej) => gltfLoader.load(url, (g) => res(g.scene), undefined, rej)));
  return modelCache.get(url);
}
async function loadStatueModel(cfg) {
  try { return await loadModel(cfg.url); } catch (e) {
    if (!STATUE.fallback) throw e;
    console.warn(`[trophies] No se pudo cargar ${cfg.url}; se usa ${STATUE.fallback} como reemplazo temporal.`);
    return loadModel(STATUE.fallback);
  }
}
// Figura simple y liviana (unos cientos de triángulos) para las eras que aún no tienen su .glb. Evita dibujar 6 veces la estatua
// completa (~430k triángulos cada una), que es lo que más cuesta en el hall.
function buildPlaceholderStatue(hex, height) {
  const g = new THREE.Group(), c = new THREE.Color(hex);
  const mat = new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.5, metalness: 0.1, emissive: c.clone().multiplyScalar(0.18) });
  const add = (geo, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; m.raycast = () => {}; g.add(m); return m; };
  add(new THREE.CylinderGeometry(0.1, 0.34, height * 0.55, 20), height * 0.275);             // vestido
  add(new THREE.CylinderGeometry(0.15, 0.1, height * 0.2, 16), height * 0.65);               // torso
  add(new THREE.CylinderGeometry(0.04, 0.05, height * 0.05, 10), height * 0.78);             // cuello
  add(new THREE.SphereGeometry(height * 0.065, 16, 12), height * 0.84);                      // cabeza
  const hair = add(new THREE.SphereGeometry(height * 0.07, 14, 10), height * 0.85); hair.position.z = -0.025; hair.scale.set(1, 1.05, 1);
  return g;
}
// Copia del modelo, ajustada a la altura deseada, centrada y apoyada en y = 0. Sin raycast (son ~430k triángulos).
function fitModel(src, height) {
  const model = src.clone(true);
  model.traverse((o) => { if (o.isMesh) o.raycast = () => {}; });
  const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3());
  model.scale.setScalar(height / size.y);
  box.setFromObject(model);
  const c = box.getCenter(new THREE.Vector3());
  model.position.set(-c.x, -box.min.y, -c.z);
  return model;
}

// ---------- Materiales compartidos ----------
const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.6, ...o });
const marble = new THREE.MeshStandardMaterial({ color: 0xd9d3c7, roughness: 0.35 });
const gold = M(0xe0b24a, { roughness: 0.3, metalness: 0.9, emissive: 0x3a2806 });
const glassM = new THREE.MeshStandardMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false });
const GHOST = new THREE.MeshStandardMaterial({ color: 0x1a1a22, transparent: true, opacity: 0.4, roughness: 1, metalness: 0 });

function glowTex() {
  return canvasTex(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });
}
const GLOW = glowTex();

function plaqueTex(era, label, hex, known) {
  return canvasTex(512, 200, (g) => {
    g.fillStyle = '#1b140c'; g.fillRect(0, 0, 512, 200);
    g.strokeStyle = hex; g.lineWidth = 6; g.strokeRect(10, 10, 492, 180);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = hex; g.font = 'italic 40px Georgia'; g.fillText(era, 256, 62);
    g.fillStyle = known ? '#fff0c4' : '#6d604a'; g.font = known ? '46px Georgia' : 'bold 64px Georgia';
    g.fillText(known ? label : '???', 256, 128);
  });
}

// ---------- Modelos 3D simples de cada trofeo (centrados en el origen, ~0.7 de alto) ----------
function extrudeShape(shape, depth, mat) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 });
  geo.translate(0, 0, -depth / 2);
  return new THREE.Mesh(geo, mat);
}
const MODELS = {
  guitar() {
    const g = new THREE.Group(), body = M(0xe0b24a, { emissive: 0x6a4a10, roughness: 0.25, metalness: 0.9 });
    const s = new THREE.Shape();
    s.moveTo(0, -0.3);
    s.bezierCurveTo(0.22, -0.3, 0.32, -0.2, 0.27, -0.12);
    s.bezierCurveTo(0.22, -0.03, 0.05, -0.04, 0.1, 0.02);
    s.bezierCurveTo(0.2, 0.06, 0.15, 0.2, 0, 0.2);
    s.bezierCurveTo(-0.15, 0.2, -0.2, 0.06, -0.1, 0.02);
    s.bezierCurveTo(-0.05, -0.04, -0.22, -0.03, -0.27, -0.12);
    s.bezierCurveTo(-0.32, -0.2, -0.22, -0.3, 0, -0.3);
    g.add(extrudeShape(s, 0.08, body));
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.055, 20), new THREE.MeshBasicMaterial({ color: 0x1a1008 })); hole.position.set(0, -0.08, 0.056); g.add(hole);
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.04), M(0x6b3f1d, { metalness: 0.1, roughness: 0.7 })); neck.position.y = 0.42; g.add(neck);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.04), body); head.position.y = 0.69; g.add(head);
    g.position.y = -0.2; const w = new THREE.Group(); w.add(g); w.rotation.z = 0.2; return w;
  },
  polaroid() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.03), M(0xf4f0e6, { metalness: 0, roughness: 0.6, emissive: 0x403c34 })));
    const ph = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshStandardMaterial({ color: 0x2de2ff, emissive: 0x0e6a7a, roughness: 0.5 }));
    ph.position.set(0, 0.04, 0.017); g.add(ph);
    const back = ph.clone(); back.position.z = -0.017; back.rotation.y = Math.PI; g.add(back);
    g.rotation.z = -0.15; return g;
  },
  snake() {
    const g = new THREE.Group(), pts = [];
    for (let i = 0; i <= 24; i++) { const t = i / 24, a = t * Math.PI * 3.4; pts.push(new THREE.Vector3(Math.cos(a) * (0.2 - 0.08 * t), -0.3 + t * 0.55, Math.sin(a) * (0.2 - 0.08 * t))); }
    pts.push(new THREE.Vector3(0.0, 0.34, 0.05), new THREE.Vector3(0.02, 0.42, 0.1));
    const mat = M(0xc8ccd6, { emissive: 0x2a2e3a, roughness: 0.25, metalness: 0.95 });
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 0.04, 10), mat));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), mat); head.scale.set(1, 0.8, 1.3); head.position.copy(pts[pts.length - 1]); g.add(head);
    [-1, 1].forEach((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: 0x39ff6a })); e.position.set(head.position.x + s * 0.03, head.position.y + 0.02, head.position.z + 0.06); g.add(e); });
    return g;
  },
  heart() {
    const h = new THREE.Shape();
    h.moveTo(0, -0.3); h.bezierCurveTo(-0.55, 0.05, -0.3, 0.4, 0, 0.15); h.bezierCurveTo(0.3, 0.4, 0.55, 0.05, 0, -0.3);
    const m = extrudeShape(h, 0.14, M(0xff8fc8, { emissive: 0x7a2050, roughness: 0.2, metalness: 0.3 }));
    m.position.y = 0.02; return m;
  },
  oldkey() { return buildKey(M(0xb07a3a, { emissive: 0x2a1808, roughness: 0.6, metalness: 0.8 }), false); },
  finalkey() { return buildKey(M(0xf0c850, { emissive: 0x7a5410, roughness: 0.2, metalness: 1 }), true); },
};
function buildKey(mat, gem) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 10, 24), mat); ring.position.y = 0.28; g.add(ring);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 10), mat); shaft.position.y = -0.0; g.add(shaft);
  [[-0.2, 0.09], [-0.3, 0.07]].forEach(([y, w]) => { const t = new THREE.Mesh(new THREE.BoxGeometry(w * 1.6, 0.05, 0.04), mat); t.position.set(w * 0.8 + 0.02, y, 0); g.add(t); });
  if (gem) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.05), new THREE.MeshStandardMaterial({ color: 0x8a96ff, emissive: 0x4a56cc, roughness: 0.1 })); s.position.y = 0.28; g.add(s); }
  g.rotation.z = 0.35; return g;
}

// El Raycaster de Interaction no debe chocar con los destellos (son Sprites).
const noRay = (o) => { o.raycast = () => {}; return o; };

export function buildTrophyHall(ctx) {
  const root = new THREE.Group(); ctx.scene.add(root);
  const labelOf = (id) => (ITEMS.find((i) => i.id === id) || { label: id }).label;
  const byId = {};

  // Pedestal + estatua de la era, al lado de la vitrina (mismo lado del hall, mirando hacia la alfombra).
  function buildStatueStand(spot) {
    const cfg = STATUE_ERAS[spot.id] || { placeholder: true }; if (!cfg) return null;
    const color = new THREE.Color(spot.hex), H = STATUE.pedestalH, TOP = H + 0.04, z = spot.z + STATUE.side;
    const stand = new THREE.Group();
    stand.position.set(spot.x, 0, z); stand.rotation.y = spot.x < HCX ? Math.PI / 2 : -Math.PI / 2;
    root.add(stand);

    const base = new THREE.Group(); stand.add(base);                 // solo esto es "apuntable" (E); el modelo no participa del raycast
    const ped = new THREE.Mesh(new THREE.BoxGeometry(1, H, 1), marble); ped.position.y = H / 2;
    const trim = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 1.1), gold); trim.position.y = H + 0.01;
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.31), new THREE.MeshBasicMaterial({ map: plaqueTex(spot.era, '', spot.hex, false) }));
    plaque.position.set(0, H / 2, 0.506);
    base.add(ped, trim, plaque);

    const halo = noRay(new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })));
    halo.scale.setScalar(3); halo.position.y = TOP + (cfg.height || STATUE.height) * 0.5; stand.add(halo);
    const holder = new THREE.Group(); holder.position.y = TOP; holder.rotation.y = cfg.rotY ?? STATUE.rotY; holder.visible = false; stand.add(holder);

    const s = { cfg, stand, holder, halo, plaque, spot, loading: false, ready: false, started: false, done: false, t: 0 };
    s.load = () => {
      if (s.loading) return; s.loading = true;
      if (cfg.placeholder) { holder.add(buildPlaceholderStatue(spot.hex, cfg.height || STATUE.height)); s.ready = true; return; }
      loadStatueModel(cfg).then((src) => { holder.add(fitModel(src, cfg.height || STATUE.height)); s.ready = true; })
        .catch((e) => console.error(`[trophies] No se pudo cargar la estatua de ${spot.era}:`, e));
    };

    ctx.colliders.push({ minX: spot.x - 0.62, maxX: spot.x + 0.62, minZ: z - 0.62, maxZ: z + 0.62 });
    ctx.interaction.add(base, {
      prompt: () => 'Presiona E para examinar.',
      onInteract: () => ctx.ui.toast(s.started
        ? `Taylor Swift — era ${spot.era}.`
        : `Pedestal vacío (${spot.era}). Su estatua aparecerá cuando recuperes ${labelOf(spot.id)}.`, 4500),
    });
    return s;
  }

  // Revelación de la estatua: entra con rebote y destello, un instante después del trofeo.
  function animateStatue(v, dt, t) {
    const s = v.statue; if (!s) return;
    if (!s.started && s.ready && (v.state === 'revealing' || v.state === 'shown')) {
      s.started = true; s.t = 0; s.holder.visible = true; s.holder.scale.setScalar(0.01);
      s.plaque.material.map = plaqueTex(s.spot.era, 'Taylor Swift', s.spot.hex, true); s.plaque.material.needsUpdate = true;
      const p = new THREE.Vector3(); s.stand.getWorldPosition(p); p.y += 1;
      ctx.particles.burst(p, 60, { speed: 1.2, up: 1.4 });
    }
    if (!s.started) return;
    s.t += dt;
    if (!s.done) {
      const k = clamp((s.t - 0.4) / 1.8, 0, 1);
      s.holder.scale.setScalar(Math.max(0.01, easeOutBack(k)));
      if (k >= 1) { s.done = true; s.holder.scale.setScalar(1); }
    }
    s.halo.material.opacity = (0.22 + 0.08 * Math.sin(t * 2 + v.i)) * Math.min(1, s.t / 1.2);
  }

  SPOTS.forEach((spot, i) => {
    const color = new THREE.Color(spot.hex);
    const g = new THREE.Group();
    g.position.set(spot.x, 0, spot.z); g.rotation.y = spot.x < HCX ? Math.PI / 2 : -Math.PI / 2;   // mira hacia la alfombra

    const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1, 1.1), marble); base.position.y = 0.5; g.add(base);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 1.2), gold); trim.position.y = 1.04; g.add(trim);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.06, 1.02), gold); cap.position.y = 2.42; g.add(cap);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.34, 0.04), gold); post.position.set(sx * 0.49, 1.75, sz * 0.49); g.add(post);
    });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.96, 1.34, 0.96), glassM); glass.position.y = 1.75; glass.renderOrder = 2; g.add(glass);

    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.35), new THREE.MeshBasicMaterial({ map: plaqueTex(spot.era, '', spot.hex, false) }));
    plaque.position.set(0, 0.5, 0.556); g.add(plaque);

    const beam = noRay(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.3, 24, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })));
    beam.position.y = 1.75; g.add(beam);
    const halo = noRay(new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })));
    halo.scale.setScalar(1.5); halo.position.y = 1.75; g.add(halo);

    const model = MODELS[spot.id]();
    const holder = new THREE.Group(); holder.position.y = 1.75; holder.add(model); g.add(holder);
    const v = { spot, i, g, holder, model, plaque, beam, halo, state: 'empty', t: 0 };
    setGhost(v, true);
    holder.scale.setScalar(0.9);

    root.add(g);
    ctx.colliders.push({ minX: spot.x - 0.62, maxX: spot.x + 0.62, minZ: spot.z - 0.62, maxZ: spot.z + 0.62 });
    ctx.interaction.add(g, {
      prompt: () => (!ctx.ending && allReady() && !v.lit ? 'Presiona E para despertar el recuerdo.'
        : v.state === 'shown' || v.state === 'revealing' ? 'Presiona E para examinar.' : 'Presiona E para examinar la vitrina.'),
      onInteract: () => {
        if (!ctx.ending && allReady()) {                                  // con los 6 trofeos exhibidos, E despierta el recuerdo
          if (!v.lit) return activate(v);
          return ctx.ui.toast(`${spot.era}: este recuerdo ya despertó.`, 2500);
        }
        ctx.ui.toast(
          v.state === 'shown' || v.state === 'revealing' ? `${labelOf(spot.id)} — ${spot.desc}` : `Vitrina vacía (${spot.era}). Aquí descansará un objeto cuando lo recuperes.`, 4500);
      },
    });
    v.statue = buildStatueStand(spot);
    byId[spot.id] = v;
  });

  // Silueta oscura (vitrina vacía) <-> materiales reales (trofeo recuperado)
  function setGhost(v, on) {
    v.model.traverse((o) => {
      if (!o.isMesh) return;
      if (on) { o.userData.orig = o.userData.orig || o.material; o.material = GHOST; } else if (o.userData.orig) o.material = o.userData.orig;
    });
  }

  function markCollected(id, silent = false) {
    const v = byId[id];
    if (!v || v.state !== 'empty') return;
    v.state = 'pending';
    if (v.statue) v.statue.load();                    // empieza a descargar la estatua de esta era
    if (silent) return;                                // ?room=N: sin aviso
    setTimeout(() => ctx.ui.toast(`✨ ${labelOf(id)} ahora se exhibe en el Hall principal`, 4500), 3200);   // después del mensaje propio de la sala
  }

  function startReveal(v) {
    v.state = 'revealing'; v.t = 0;
    setGhost(v, false);
    v.plaque.material.map = plaqueTex(v.spot.era, labelOf(v.spot.id), v.spot.hex, true); v.plaque.material.needsUpdate = true;
    const p = new THREE.Vector3(); v.holder.getWorldPosition(p);
    ctx.particles.burst(p, 45, { speed: 1.1, up: 1.3 });
    ctx.audio.chime(); setTimeout(() => ctx.audio.reward(), 250);
  }


  // ================= CEREMONIA FINAL =================
  // Con los 6 trofeos exhibidos en el hall, cada vitrina se "despierta" con E: suena una confirmación, el trofeo se ilumina y de su
  // Taylor sale un rayo hacia la estatua principal. Al despertar las 6, la estatua principal se enciende hasta dejar la pantalla
  // en blanco y aparece el mensaje final. ctx.ending = true congela el movimiento y la interacción (main.js).
  const MAIN_POS = new THREE.Vector3(MAIN.x, MAIN.y, MAIN.z);
  const cer = { lit: 0, hinted: false, finale: false, t: 0, step: 0, veil: null, lines: [] };
  const beams = [];
  const allReady = () => SPOTS.every((sp) => { const st = byId[sp.id].state; return st === 'revealing' || st === 'shown'; });

  // Destello de la estatua principal (sin luces dinámicas extra: cada luz encarece todo el hall).
  const mainHalo = noRay(new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xfff2cc, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false })));
  mainHalo.renderOrder = 20; mainHalo.position.copy(MAIN_POS); mainHalo.scale.setScalar(4); root.add(mainHalo);

  // Punto de donde sale el rayo: el pecho de la Taylor de esa era (o, sin estatua, el trofeo).
  function srcPoint(v) {
    const s = v.statue;
    if (s) return new THREE.Vector3(s.stand.position.x, STATUE.pedestalH + 0.04 + (s.cfg.height || STATUE.height) * 0.6, s.stand.position.z);
    return new THREE.Vector3(v.spot.x, 1.75, v.spot.z);
  }
  function makeBeam(from, hex) {
    const dir = new THREE.Vector3().subVectors(MAIN_POS, from), len = dir.length(); dir.normalize();
    const grp = new THREE.Group(); grp.position.copy(from); grp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); grp.scale.set(1, 0.001, 1);
    const core = noRay(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })));
    const glow = noRay(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(hex), transparent: true, opacity: 0.35, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })));
    core.position.y = glow.position.y = 0.5; grp.add(core, glow); root.add(grp);
    const b = { grp, core, glow, len, k: 0, arrived: false, phase: Math.random() * TAU };
    beams.push(b); return b;
  }

  function activate(v) {
    v.lit = true; v.litT = 0;
    ctx.audio.chime();                                                        // ruido de confirmación
    const from = srcPoint(v);
    ctx.particles.burst(from, 40, { speed: 1.2, up: 1 });
    makeBeam(from, v.spot.hex);
    cer.lit++;
    if (cer.lit < SPOTS.length) ctx.ui.toast(`${v.spot.era} despierta (${cer.lit}/${SPOTS.length})`, 3000);
    else startFinale();
  }

  // Trofeo y Taylor encendidos de forma permanente
  function litFx(v, dt, t) {
    v.litT += dt; const k = Math.min(1, v.litT / 0.7);
    v.halo.scale.setScalar(1.5 + 1.1 * k); v.halo.material.opacity = 0.35 + 0.55 * k + 0.08 * Math.sin(t * 3 + v.i);
    v.beam.material.opacity = 0.2 * k * (0.85 + 0.15 * Math.sin(t * 4 + v.i));
    if (!v.litMats) { v.litMats = []; v.model.traverse((o) => { if (o.isMesh && o.material && o.material.isMeshStandardMaterial && o.material !== GHOST) v.litMats.push(o.material); }); }
    v.litMats.forEach((m) => { m.emissiveIntensity = 1 + 2.5 * k; });
    const s = v.statue;
    if (s && s.started) { s.halo.scale.setScalar(2.6); s.halo.material.opacity = 0.4 + 0.1 * Math.sin(t * 2.5 + v.i); }
  }

  // Swell musical (Web Audio, pasa por el volumen "Sonido"): acorde que sube durante el encendido
  function swell(secs) {
    const c = ctx.audio && ctx.audio.ctx; if (!c) return;
    try {
      const t0 = c.currentTime, g = c.createGain();
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.2, t0 + secs * 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t0 + secs + 3);
      g.connect(c.destination);
      [261.6, 329.6, 392, 523.3, 784].forEach((f, i) => {
        const o = c.createOscillator(), og = c.createGain();
        o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.setValueAtTime(f * 0.5, t0); o.frequency.exponentialRampToValueAtTime(f, t0 + secs);
        og.gain.value = 0.5 / (i + 1); o.connect(og); og.connect(g); o.start(t0); o.stop(t0 + secs + 3.1);
      });
    } catch (e) { /* sin audio: la ceremonia sigue igual */ }
  }

  function makeVeil() {
    const el = document.createElement('div');
    Object.assign(el.style, { position: 'fixed', inset: '0', background: '#fff', opacity: '0', zIndex: '9999', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '1.4rem', padding: '0 8vw', textAlign: 'center', pointerEvents: 'none',
      fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#5a3d10' });
    const lines = ['Felicidades, has logrado liberar los recuerdos.', 'Ahora tú también eres libre...'].map((txt, i) => {
      const p = document.createElement('p'); p.textContent = txt;
      Object.assign(p.style, { margin: '0', opacity: '0', transition: 'opacity 2.6s ease', fontSize: i ? 'clamp(1.2rem,2.6vw,2.1rem)' : 'clamp(1.5rem,3.4vw,2.7rem)' });
      el.appendChild(p); return p;
    });
    document.body.appendChild(el); cer.veil = el; cer.lines = lines;
  }

  function startFinale() {
    cer.finale = true; cer.t = 0; ctx.ending = true;   // (sin bloom: activarlo cambia el render a un composer con varios pasos a pantalla completa y provoca un tirón fuerte)
    makeVeil(); swell(8);
    setTimeout(() => ctx.audio.reward(), 900);                                  // cuando el último rayo llega a la estatua
  }

  const _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _up = new THREE.Vector3(0, 1, 0);
  function updateCeremony(dt, t) {
    beams.forEach((b) => {
      b.k = Math.min(1, b.k + dt / 0.9);
      b.grp.scale.y = Math.max(0.001, b.len * (1 - Math.pow(1 - b.k, 3)));
      if (b.k >= 1 && !b.arrived) { b.arrived = true; ctx.particles.burst(MAIN_POS, 25, { speed: 1, up: 0.6 }); }
      const thick = cer.finale ? 1 + 3 * Math.min(1, cer.t / 6) : 1;
      b.grp.scale.x = b.grp.scale.z = (1 + 0.25 * Math.sin(t * 9 + b.phase)) * thick;
      b.glow.material.opacity = 0.3 + 0.1 * Math.sin(t * 6 + b.phase);
    });
    if (!cer.finale) return;
    cer.t += dt; const T = cer.t, g = Math.min(1, T / 8), ge = g * g;
    _m.lookAt(ctx.camera.position, MAIN_POS, _up); _q.setFromRotationMatrix(_m);       // la cámara se gira suavemente hacia la estatua
    ctx.camera.quaternion.slerp(_q, 1 - Math.exp(-2 * dt));
    mainHalo.material.opacity = Math.min(1, T / 1.2) * (0.5 + 0.5 * ge); mainHalo.scale.setScalar(4 + 46 * ge);
    cer.veil.style.opacity = T < 2.5 ? '0' : String(Math.min(1, Math.pow((T - 2.5) / 5.5, 2)));   // pantalla en blanco
    if (T > 9 && cer.step === 0) { cer.step = 1; cer.veil.style.pointerEvents = 'auto'; cer.lines[0].style.opacity = '1'; }
    if (T > 12.5 && cer.step === 1) { cer.step = 2; cer.lines[1].style.opacity = '1'; }
  }

  // Engancha ctx.collect: las salas siguen llamándolo igual que siempre.
  const prevCollect = ctx.collect.bind(ctx);
  ctx.collect = (id, opts) => { prevCollect(id); markCollected(id, opts && opts.silent); };
  ctx.game.items.forEach((id) => markCollected(id));              // por si algo ya estaba recogido al construir

  ctx.updaters.push((dt, t) => {
    const p = ctx.camera.position;
    const inHall = p.x > HALL.minX && p.x < HALL.maxX && p.z > HALL.minZ && p.z < HALL.maxZ;
    let delay = 0;
    for (const v of Object.values(byId)) {
      if (v.state === 'pending' && inHall) { startReveal(v); }
      if (v.state === 'revealing') {
        v.t += dt; const k = clamp(v.t / 1.6, 0, 1);
        v.holder.scale.setScalar(Math.max(0.01, 0.9 * easeOutBack(k)));
        v.beam.material.opacity = 0.35 * Math.sin(k * Math.PI);
        if (k >= 1) { v.state = 'shown'; v.beam.material.opacity = 0; }
      }
      if (v.state === 'revealing' || v.state === 'shown') {
        v.model.rotation.y += dt * 0.7;
        v.holder.position.y = 1.75 + Math.sin(t * 1.6 + v.i) * 0.03;
        v.halo.material.opacity = (0.35 + 0.12 * Math.sin(t * 2.4 + v.i)) * Math.min(1, v.t / 0.8 || 1);
      } else {
        v.model.rotation.y = 0;
      }
      animateStatue(v, dt, t);
      if (v.lit) litFx(v, dt, t);
    }
    if (!cer.hinted && !ctx.ending && inHall && allReady()) {
      cer.hinted = true;
      setTimeout(() => ctx.ui.toast('Los seis recuerdos están reunidos. Apunta a cada trofeo y presiona E para despertar a su Taylor.', 8000), 5000);
    }
    updateCeremony(dt, t);
  });

  return { vitrines: byId, statues: Object.fromEntries(Object.values(byId).filter((v) => v.statue).map((v) => [v.spot.id, v.statue])), reveal: (id) => { markCollected(id); } };
}