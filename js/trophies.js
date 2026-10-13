// trophies.js — Vitrinas del Hall principal: cada trofeo recuperado aparece en su vitrina.
//
// Cómo funciona:
//  - Hay 6 vitrinas (una por objeto de ITEMS en ui.js). Al principio están "vacías": se ve la silueta
//    oscura y translúcida del objeto y una placa con "???".
//  - Este módulo envuelve ctx.collect(id): cuando una sala llama ctx.collect('guitar'), la vitrina queda "pendiente".
//  - La primera vez que el jugador vuelve a pisar el hall, el trofeo se revela con animación, destello y sonido.
//  - Las salas NO necesitan cambios: siguen llamando a ctx.collect(id) como siempre.
import * as THREE from 'three';
import { canvasTex } from './rooms.js';
import { ITEMS } from './ui.js';

const HALL = { minX: -5, maxX: 25, minZ: 5.4, maxZ: 24.6 };   // zona del hall donde se dispara la revelación
const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const easeOutBack = (k) => 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2);

// Una vitrina por trofeo. Orden: desde la entrada del hall hacia las puertas del fondo.
// (x < 10 = lado oeste, mira hacia el este; x > 10 = lado este, mira hacia el oeste)
const SPOTS = [
  { id: 'guitar',   era: 'Fearless',   hex: '#ffc83d', x: 4.5,  z: 20.5, desc: 'La guitarra dorada de Fearless. Vuelve a sonar.' },
  { id: 'polaroid', era: '1989',       hex: '#2de2ff', x: 15.5, z: 20.5, desc: 'Una polaroid de 1989: un instante congelado en el tiempo.' },
  { id: 'snake',    era: 'Reputation', hex: '#ffc83d', x: 4.5,  z: 15.5, desc: 'La serpiente de Reputation, ahora en silencio.' },
  { id: 'heart',    era: 'Lover',      hex: '#ff8fc8', x: 15.5, z: 15.5, desc: 'El corazón de Lover, cálido de nuevo.' },
  { id: 'oldkey',   era: 'Folklore',   hex: '#b8c8a0', x: 4.5,  z: 10.5, desc: 'Una llave antigua. Abre algo que lleva mucho cerrado.' },
  { id: 'finalkey', era: 'Midnights',  hex: '#8a96ff', x: 15.5, z: 10.5, desc: 'La llave final. Solo falta usarla.' },
];

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

  SPOTS.forEach((spot, i) => {
    const color = new THREE.Color(spot.hex);
    const g = new THREE.Group();
    g.position.set(spot.x, 0, spot.z); g.rotation.y = spot.x < 10 ? Math.PI / 2 : -Math.PI / 2;   // mira hacia la alfombra

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
      prompt: () => (v.state === 'shown' || v.state === 'revealing' ? 'Presiona E para examinar.' : 'Presiona E para examinar la vitrina.'),
      onInteract: () => ctx.ui.toast(
        v.state === 'shown' || v.state === 'revealing' ? `${labelOf(spot.id)} — ${spot.desc}` : `Vitrina vacía (${spot.era}). Aquí descansará un objeto cuando lo recuperes.`, 4500),
    });
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
    }
  });

  return { vitrines: byId, reveal: (id) => { markCollected(id); } };
}