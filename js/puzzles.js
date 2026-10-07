// puzzles.js — Acertijo de Fearless: 4 mariposas (símbolos) + 4 pedestales musicales.
import * as THREE from 'three';
import { makeButterfly, flap, makeGuitar, makeSymbolTexture, addCollider } from './rooms.js';

const FREQ = { sun: 523.25, moon: 587.33, star: 783.99, heart: 659.25 };   // nota de cada símbolo
// Las mariposas descansan de izquierda a derecha (mirando hacia el norte desde la entrada)
// en este orden. Esa posición ES la solución del acertijo.
const ANSWER = ['sun', 'star', 'heart', 'moon'];
const PEDESTAL_ORDER = ['moon', 'sun', 'heart', 'star'];                    // mezclado a propósito

export function createFearlessPuzzle(ctx, room) {
  const g = room.group, cam = ctx.camera.position;
  const stone = new THREE.MeshStandardMaterial({ color: 0x8a7458, roughness: 0.9 });
  let now = 0;
  ctx.updaters.push((dt, t) => (now = t));

  let solved = false, busy = false, input = [];
  let orbitUntil = 0, emitUntil = 0, boost = 1, boostTarget = 1;
  let rise = 0, ready = false;

  // ---------- 1) Mariposas con símbolos ----------
  const tmp = new THREE.Vector3();
  ANSWER.forEach((sym, i) => {
    const b = makeButterfly(0xffc83d, makeSymbolTexture(sym));
    b.group.scale.setScalar(1.4);
    const home = new THREE.Vector3(-3.6 + 2.4 * i, 2.2 + (i % 2) * 0.3, -3.0);
    b.group.position.copy(home);
    g.add(b.group);
    flap(ctx, b, { speed: 2.5, amp: 0.25, phase: i });
    ctx.updaters.push((dt, t) => {
      const orbit = orbitUntil > t;
      if (orbit) {                           // al resolver: vuelan alrededor del jugador
        const a = t * 1.1 + (i * Math.PI) / 2;
        tmp.set(cam.x + Math.cos(a) * 1.6, 1.6 + Math.sin(t * 2 + i) * 0.3, cam.z + Math.sin(a) * 1.6);
        b.group.rotation.y = Math.atan2(cam.x - b.group.position.x, cam.z - b.group.position.z);
      } else {                               // flotan lentamente cerca de su lugar de descanso
        tmp.set(home.x + Math.sin(t * 0.5 + i) * 0.2, home.y + Math.sin(t * 0.8 + i * 2) * 0.15, home.z + Math.cos(t * 0.4 + i) * 0.15);
        b.group.rotation.y *= 1 - Math.min(1, dt * 3);
      }
      b.group.position.lerp(tmp, Math.min(1, dt * 2.5));
    });
  });

  // ---------- 2) Pedestal central (vacío al inicio) ----------
  const pedMat = new THREE.MeshStandardMaterial({ color: 0x8a7458, roughness: 0.6, metalness: 0.2, emissive: 0x000000 });
  const centerPed = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.9, 20), pedMat);
  centerPed.position.set(0, 0.45, 0); g.add(centerPed);
  addCollider(ctx, 0, 0, 0.5);
  const pedLight = new THREE.PointLight(0xffd070, 2, 5); pedLight.position.set(0, 1.6, 0); g.add(pedLight);

  const goldGuitar = makeGuitar(0xffc83d, 0x7a5200, 0.8);
  goldGuitar.scale.setScalar(0.85); goldGuitar.position.set(0, -0.4, 0); goldGuitar.visible = false;
  g.add(goldGuitar);
  ctx.interaction.add(goldGuitar, {
    prompt: () => 'Presiona E para recoger la Guitarra Dorada.',
    enabled: () => goldGuitar.visible && ready,
    onInteract: () => {
      goldGuitar.visible = false;
      ctx.audio.reward();
      ctx.collect('guitar');
      room.door.unlock();
      ctx.ui.toast('Has recuperado el recuerdo de Fearless.', 5000);
    },
  });

  // ---------- 3) Cuatro pedestales musicales ----------
  const BRIGHT = new THREE.Color(1, 0.85, 0.4), DIM = new THREE.Color(0.25, 0.18, 0.08);
  const pedestals = PEDESTAL_ORDER.map((sym, i) => {
    const x = 3.9, z = -2.4 + 1.6 * i;
    const p = new THREE.Group(); p.position.set(x, 0, z); g.add(p);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.8, 16), stone); base.position.y = 0.4;
    const tex = makeSymbolTexture(sym);
    const cap = new THREE.Mesh(new THREE.CircleGeometry(0.26, 24), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: DIM.clone() }));
    cap.rotation.x = -Math.PI / 2; cap.position.y = 0.81;
    p.add(base, cap);
    addCollider(ctx, x, z, 0.33);
    const ped = { sym, cap, litUntil: 0, pos: new THREE.Vector3(x, 0.95, z) };
    ctx.interaction.add(p, {
      prompt: () => 'Presiona E para interactuar.',
      enabled: () => !solved && !busy,
      onInteract: () => press(ped),
    });
    return ped;
  });

  function press(ped) {
    ped.litUntil = now + 3;                                   // se ilumina unos segundos
    ctx.audio.note(FREQ[ped.sym]);
    ctx.particles.burst(ped.pos, 25);
    if (ped.sym !== ANSWER[input.length]) {                   // ¡incorrecto!
      busy = true;
      pedestals.forEach((q) => (q.litUntil = 0));             // se apagan todos
      ctx.audio.error();
      ctx.ui.toast('Parece que esa no era la melodía correcta...', 2000);
      setTimeout(() => { busy = false; input = []; }, 2000);  // reintento tras 2 s
      return;
    }
    input.push(ped.sym);
    if (input.length === ANSWER.length) solve();
  }

  function solve() {
    solved = true;
    ctx.game.solved++;
    ctx.audio.success();
    ctx.fx.bloom = true;                                      // efecto Bloom
    boostTarget = 1.35;                                       // la habitación se ilumina
    orbitUntil = now + 8;                                     // mariposas alrededor del jugador
    emitUntil = now + 4;                                      // lluvia de partículas
    pedMat.color.set(0xffd36a); pedMat.emissive.set(0xaa7a10); pedLight.intensity = 9;
    goldGuitar.visible = true;                                // emerge del pedestal
    ctx.glitter.uniforms.uIntensity.value = 2.5;              // intensificacion del glitter
    ctx.ui.toast('La melodía suena... algo emerge del pedestal.', 4000);
  }

  // ---------- Animaciones del acertijo ----------
  ctx.updaters.push((dt, t) => {
    pedestals.forEach((p) => p.cap.material.emissive.lerp(p.litUntil > t ? BRIGHT : DIM, Math.min(1, dt * 8)));
    boost += (boostTarget - boost) * Math.min(1, dt * 1.5);
    room.lights.set(boost);
    if (t < emitUntil && Math.random() < 0.5) ctx.particles.burst(tmp.set((Math.random() - 0.5) * 6, 0.5 + Math.random() * 2, (Math.random() - 0.5) * 6), 2, { speed: 0.3, up: 0.5 });
    if (goldGuitar.visible) {
      rise = Math.min(1, rise + dt / 3);                      // 3 s para emerger
      const e = 1 - Math.pow(1 - rise, 3);
      goldGuitar.position.y = -0.4 + 1.65 * e + (ready ? Math.sin(t * 2) * 0.05 : 0);
      goldGuitar.rotation.y += dt * 0.8;
      if (rise >= 1) ready = true;
    }
  });
}
