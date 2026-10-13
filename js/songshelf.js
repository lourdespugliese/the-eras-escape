// songshelf.js — Vitrina de canciones secretas en el hall del museo.
// Cada canción encontrada (ctx.secrets.add) hace aparecer aquí su objeto (casete, disco...) con una placa con la era y el nombre.
// Las canciones aún no halladas se ven como una silueta "?" con una pista (E para leerla).
//
// Uso (en main.js, DESPUÉS de crear ctx.secrets):   buildSongShelf(ctx);
import * as THREE from 'three';
import { canvasTex, makeTextTexture } from './rooms.js';

// Posición: pared este del hall (interior en x = 24.8), entre las columnas de z = 17 y z = 21. Cámbiala si choca con otra vitrina.
const SHELF = { x: 24.78, z: 19 };
const GAP = 1.15;                                         // separación entre huecos
const SLOTS = [
  { id: '1989-cassette', kind: 'cassette', era: '1989', hex: 0x2de2ff, hint: 'En la ciudad de neón, bajo el toldo de un quiosco, algo espera para girar...' },
  { id: 'reputation-record', kind: 'vinyl', era: 'Reputation', hex: 0xd4a640, hint: 'Un espejo de la sala del trono solo se rompe con el bate... y detrás hay música.' },
  { id: 'lover-record', kind: 'vinyl', era: 'Lover', hex: 0xff8fc8, hint: 'Cuando el corazón abandona el cofre, el cofre aún guarda un secreto.' },
];
const ease = (k) => 1 - Math.pow(1 - k, 3);

function drawPlaque(g, w, h, era, title, found, hex) {
  const col = '#' + new THREE.Color(hex).getHexString();
  g.fillStyle = '#1b130c'; g.fillRect(0, 0, w, h);
  g.strokeStyle = found ? col : '#5a4a30'; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = found ? col : '#6a5a40'; g.font = '30px Georgia'; g.fillText(found ? era.toUpperCase() : '???', w / 2, h * 0.3);
  g.fillStyle = found ? '#fff4d6' : '#6a5a40';
  let s = 46; do { g.font = `italic ${s}px Georgia`; s -= 2; } while (g.measureText(found ? title : '? ? ?').width > w - 30 && s > 14);
  g.fillText(found ? title : '? ? ?', w / 2, h * 0.68);
}

function makeItem(kind, hex) {
  const grp = new THREE.Group();
  const accent = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.4, emissive: new THREE.Color(hex).multiplyScalar(0.5) });
  if (kind === 'cassette') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.28, 0.05), new THREE.MeshStandardMaterial({ color: 0x2a2a44, roughness: 0.5, emissive: 0x0a0a1a }));
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.12), new THREE.MeshBasicMaterial({ color: 0xf2f0ea })); label.position.set(0, 0.06, 0.027);
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.025), new THREE.MeshBasicMaterial({ color: hex })); stripe.position.set(0, 0.06, 0.028);
    [-0.1, 0.1].forEach((x) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 16), new THREE.MeshBasicMaterial({ color: 0x0b0b18 })); r.rotation.x = Math.PI / 2; r.position.set(x, -0.04, 0.028); grp.add(r); });
    grp.add(body, label, stripe);
    grp.position.y = 0.17; grp.rotation.x = -0.12;
  } else {
    const vinyl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.014, 40), new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 0.25, metalness: 0.6 }));
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.016, 24), accent);
    vinyl.rotation.x = label.rotation.x = Math.PI / 2;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.004, 6, 40), new THREE.MeshBasicMaterial({ color: 0x2a2a3a })); ring.position.z = 0.009;
    grp.add(vinyl, label, ring);
    grp.position.y = 0.23;
  }
  return grp;
}

export function buildSongShelf(ctx) {
  const root = new THREE.Group(); root.position.set(SHELF.x, 0, SHELF.z); root.rotation.y = -Math.PI / 2; ctx.scene.add(root);   // +Z local mira al interior del hall
  const wood = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.8, emissive: 0x0e0804 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4a640, metalness: 0.55, roughness: 0.4, emissive: 0x3a2808 });
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); root.add(o); return o; };
  add(new THREE.BoxGeometry(3.7, 2.7, 0.1), wood, 0, 1.95, 0.05);
  [[0, 3.3, 3.8, 0.1], [0, 0.6, 3.8, 0.1], [-1.85, 1.95, 0.1, 2.8], [1.85, 1.95, 0.1, 2.8]].forEach(([x, y, w, h]) => add(new THREE.BoxGeometry(w, h, 0.14), gold, x, y, 0.06));
  const title = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 0.42), new THREE.MeshBasicMaterial({ map: makeTextTexture('Canciones secretas', { w: 640, h: 90, bg: '#2a1a10', color: '#f3d38a', font: '44px Georgia' }) }));
  title.position.set(0, 3.0, 0.115); root.add(title);

  const glowTex = canvasTex(128, 128, (c) => {
    const r = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.3)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = r; c.fillRect(0, 0, 128, 128);
  });
  const ghostTex = makeTextTexture('?', { w: 128, h: 128, bg: '#2a1a10', color: '#5a4a30', font: 'bold 90px Georgia' });

  const slots = SLOTS.map((def, i) => {
    const x = (i - 1) * GAP, sg = new THREE.Group(); sg.position.set(x, 0, 0); root.add(sg);
    const add2 = (geo, m, px, py, pz) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); sg.add(o); return o; };
    add2(new THREE.BoxGeometry(0.95, 0.05, 0.34), gold, 0, 1.85, 0.27);                                  // repisa
    const ghost = add2(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial({ map: ghostTex }), 0, 2.15, 0.14);
    const item = makeItem(def.kind, def.hex); const holder = new THREE.Group(); holder.position.set(0, 1.875, 0.27); holder.add(item); holder.visible = false; holder.scale.setScalar(0.01); sg.add(holder);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: def.hex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); glow.scale.setScalar(1.1); glow.position.set(0, 0.25, 0.05); glow.raycast = () => {}; glow.visible = false; holder.add(glow);
    const plaqueTex = canvasTex(380, 140, (g, w, h) => drawPlaque(g, w, h, def.era, '', false, def.hex));
    add2(new THREE.PlaneGeometry(0.98, 0.36), new THREE.MeshBasicMaterial({ map: plaqueTex }), 0, 1.4, 0.115);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.2, 0.45), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(0, 1.9, 0.2); sg.add(hit);
    const slot = { def, holder, item, glow, ghost, plaqueTex, sg, found: false, t: 1, title: '' };
    ctx.interaction.add(sg, {
      prompt: () => (slot.found ? 'Presiona E para ver la canción.' : 'Presiona E para examinar.'),
      onInteract: () => ctx.ui.toast(slot.found ? `${def.era}: ♪ ${slot.title}` : `Un hueco vacío. ${def.hint}`, slot.found ? 4000 : 7000),
    });
    return slot;
  });

  function reveal(slot, info, animate) {
    if (slot.found) return;
    slot.found = true; slot.title = info.title;
    const c = slot.plaqueTex.image; drawPlaque(c.getContext('2d'), c.width, c.height, slot.def.era, info.title, true, slot.def.hex); slot.plaqueTex.needsUpdate = true;
    slot.ghost.visible = false; slot.holder.visible = true; slot.glow.visible = true;
    slot.t = animate ? 0 : 1;
    if (animate) ctx.particles.burst(root.localToWorld(new THREE.Vector3(slot.sg.position.x, 2.1, 0.4)), 30, { speed: 0.8, up: 1 });
  }
  const byId = Object.fromEntries(slots.map((s) => [s.def.id, s]));
  ctx.secrets?.onAdd((id, info) => { if (byId[id]) reveal(byId[id], info, true); });

  ctx.updaters.push((dt, t) => {
    slots.forEach((s, i) => {
      if (!s.found) return;
      if (s.t < 1) { s.t = Math.min(1, s.t + dt / 1.1); s.holder.scale.setScalar(Math.max(0.01, ease(s.t))); } else s.holder.scale.setScalar(1);
      s.item.rotation.y = Math.sin(t * 0.8 + i) * 0.35;
      s.glow.material.opacity = 0.5 + 0.2 * Math.sin(t * 2 + i);
    });
  });
  return { slots };
}