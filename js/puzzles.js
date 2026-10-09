// puzzles.js — Habitación Fearless: DOS acertijos independientes.
//   1) La melodía    (mariposas + pedestales musicales)
//   2) Las historias (objetos + cuadros vacíos)  -> al resolverlo se iluminan los cuadros.
// Distribución: libro en el centro; a la IZQUIERDA (oeste) mariposas + pedestales musicales;
// a la DERECHA (este) cuadros + pedestales donde se colocan los objetos.
// Se pueden resolver en cualquier orden. Cuando ambos están completos, emerge la guitarra.
import * as THREE from 'three';
import { createSongClips } from './songclips.js';
import { makeButterfly, flap, makeGuitar, makeSymbolTexture, makeTextTexture, addCollider } from './rooms.js';

// ---------- Datos del acertijo 1 (melodía) ----------
const FREQ = { sun: 523.25, moon: 587.33, star: 783.99, heart: 659.25 };
// Las mariposas descansan de izquierda a derecha en este orden (esa posición ES la solución).
const ANSWER = ['sun', 'star', 'heart', 'moon'];
const PEDESTAL_ORDER = ['moon', 'sun', 'heart', 'star'];                    // mezclado a propósito

// ---------- Datos del acertijo 2 (historias) ----------
const FRAME_X = 8.77, PLINTH_X = 8.25, PLINTH_TOP = 0.95, TABLE_TOP = 0.74;
// Cada cuadro vacío lleva una placa con el nombre de la canción; "item" es el objeto correcto.
// "image" = imagen del cuadro (ya recortada a 1000x1300 px, la proporción del marco 1.0 x 1.3 m).
const SONGS = [
  { title: 'Love Story', item: 'ring', z: -3, image: 'assets/images/historia1.jpg', jingle: 0,
    clip: { url: 'assets/audio/Love Story.mp3', start: 0, dur: 7, volume: 1 } },
  { title: 'You Belong With Me', item: 'jacket', z: 0, image: 'assets/images/historia2.jpg', jingle: 1,
    clip: { url: 'assets/audio/You Belong With Me.mp3', start: 0, dur: 7, volume: 0.8 } },
  { title: 'Fearless', item: 'star', z: 3, image: 'assets/images/historia3.jpg', jingle: 2,
    clip: { url: 'assets/audio/Fearless.mp3', start: 0, dur: 7, volume: 0.7 } },
];
// true  = los cuadros empiezan vacíos y las imágenes aparecen al completar la historia.
// false = las imágenes se ven desde el principio.
const REVEAL_ON_SOLVE = true;
// "home" = dónde está el objeto al comenzar (sobre una mesita). "flavor" = pista al recogerlo.
const ITEMS = [
  { id: 'ring', label: 'Anillo', home: [-3.3, -3.4], make: makeRing, flavor: 'Un anillo con un pequeño diamante. Parece sacado de un cuento de hadas.' },
  { id: 'jacket', label: 'Chaqueta deportiva', home: [5.5, 4.0], make: makeJacket, flavor: 'Una chaqueta de equipo, de esas que alguien presta en las gradas una noche fría.' },
  { id: 'star', label: 'Estrella', home: [-0.8, 4.2], make: makeStar, flavor: 'Una estrella dorada. Brilla con el coraje de quien no teme a nada.' },
];

// ---------- Modelos de los objetos (origen en la base, para apoyarlos en una superficie) ----------
function makeRing() {
  const grp = new THREE.Group();
  const goldM = new THREE.MeshStandardMaterial({ color: 0xffd36a, metalness: 0.9, roughness: 0.2, emissive: 0x553a00 });
  const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.06, 16), new THREE.MeshStandardMaterial({ color: 0x8c2f39 }));
  cushion.position.y = 0.03;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.022, 10, 24), goldM); ring.position.y = 0.16;
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.045), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x88aaff, roughness: 0.1 }));
  gem.position.y = 0.28;
  grp.add(cushion, ring, gem);
  return grp;
}
function makeJacket() {
  const grp = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: 0xa82a32, roughness: 0.8 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.4), red); body.position.y = 0.06;
  const sleeves = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.09, 0.13), white); sleeves.position.set(0, 0.13, 0.08);
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.08), white); collar.position.set(0, 0.145, -0.17);
  const patch = new THREE.Mesh(new THREE.CircleGeometry(0.07, 20), new THREE.MeshBasicMaterial({
    map: makeTextTexture('13', { w: 128, h: 128, bg: '#f2ead8', color: '#a82a32', font: 'bold 80px Georgia' }),
  }));
  patch.rotation.x = -Math.PI / 2; patch.position.set(0.12, 0.123, -0.06);
  grp.add(body, sleeves, collar, patch);
  return grp;
}
function makeStar() {
  const grp = new THREE.Group();
  const goldM = new THREE.MeshStandardMaterial({ color: 0xffc83d, metalness: 0.8, roughness: 0.3, emissive: 0x6a4800 });
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.07 : 0.17, a = Math.PI / 2 + (i * Math.PI) / 5;
    if (i) shape.lineTo(Math.cos(a) * r, Math.sin(a) * r); else shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false });
  geo.translate(0, 0, -0.02);
  const star = new THREE.Mesh(geo, goldM); star.position.y = 0.27;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 6), goldM); stem.position.y = 0.1;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.05, 12), goldM); base.position.y = 0.025;
  grp.add(star, stem, base);
  return grp;
}

export function createFearlessPuzzle(ctx, room) {
  const g = room.group, cam = ctx.camera.position, cx = room.x, cz = room.z;
  const stone = new THREE.MeshStandardMaterial({ color: 0x8a7458, roughness: 0.9 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.8 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.8, roughness: 0.3, emissive: 0x442e00 });
  const tmp = new THREE.Vector3();
  let now = 0;
  ctx.updaters.push((dt, t) => (now = t));

  // ================= Estado compartido entre los dos acertijos =================
  const done = { melody: false, story: false };
  let orbitUntil = 0, emitUntil = 0, boost = 1, boostTarget = 1, rise = 0, ready = false;

  // Pedestal central + guitarra dorada (aparece solo cuando AMBOS acertijos están completos)
  const pedMat = new THREE.MeshStandardMaterial({ color: 0x8a7458, roughness: 0.6, metalness: 0.2, emissive: 0x000000 });
  const centerPed = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.9, 20), pedMat);
  centerPed.position.set(cx, 0.45, cz); g.add(centerPed);
  addCollider(ctx, cx, cz, 0.5);
  const pedLight = new THREE.PointLight(0xffd070, 2, 5); pedLight.position.set(cx, 1.6, cz); g.add(pedLight);

  const goldGuitar = makeGuitar(0xffc83d, 0x7a5200, 0.8);
  goldGuitar.scale.setScalar(0.85); goldGuitar.position.set(cx, -0.4, cz); goldGuitar.visible = false;
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

  // Se llama cuando un acertijo termina. Si ya estaba el otro, se revela la guitarra.
  function completePart(kind) {
    done[kind] = true;
    ctx.game.solved++;
    if (done.melody && done.story) { reveal(); return; }
    if (kind === 'melody') ctx.ui.toast('La melodía suena... pero aún falta completar la historia.', 4500);
    else ctx.ui.toast('Los cuadros se completan... pero el pedestal sigue dormido. Falta la melodía.', 4500);
  }

  function reveal() {
    ctx.audio.success();
    ctx.fx.bloom = true;                       // efecto Bloom
    boostTarget = 1.35;                        // la habitación se ilumina
    orbitUntil = now + 8;                      // mariposas alrededor del jugador
    emitUntil = now + 4;                       // lluvia de partículas
    pedMat.color.set(0xffd36a); pedMat.emissive.set(0xaa7a10); pedLight.intensity = 9;
    ctx.glitter.uniforms.uIntensity.value = 2.5;
    goldGuitar.visible = true;                 // emerge del pedestal
    ctx.ui.toast('Las dos partes del recuerdo se unen... algo emerge del pedestal.', 5000);
  }

  // ================= ACERTIJO 1: la melodía =================
  ANSWER.forEach((sym, i) => {
    const b = makeButterfly(0xffc83d, makeSymbolTexture(sym));
    b.group.scale.setScalar(1.4);
    const home = new THREE.Vector3(cx - 6.1 + 1.6 * i, 2.2 + (i % 2) * 0.3, -3.0);
    b.group.position.copy(home);
    g.add(b.group);
    flap(ctx, b, { speed: 2.5, amp: 0.25, phase: i });
    ctx.updaters.push((dt, t) => {
      if (orbitUntil > t) {                    // vuelan alrededor del jugador
        const a = t * 1.1 + (i * Math.PI) / 2;
        tmp.set(cam.x + Math.cos(a) * 1.6, 1.6 + Math.sin(t * 2 + i) * 0.3, cam.z + Math.sin(a) * 1.6);
        b.group.rotation.y = Math.atan2(cam.x - b.group.position.x, cam.z - b.group.position.z);
      } else {                                 // flotan lentamente cerca de su lugar de descanso
        tmp.set(home.x + Math.sin(t * 0.5 + i) * 0.2, home.y + Math.sin(t * 0.8 + i * 2) * 0.15, home.z + Math.cos(t * 0.4 + i) * 0.15);
        b.group.rotation.y *= 1 - Math.min(1, dt * 3);
      }
      b.group.position.lerp(tmp, Math.min(1, dt * 2.5));
    });
  });

  const BRIGHT = new THREE.Color(1, 0.85, 0.4), DIM = new THREE.Color(0.25, 0.18, 0.08);
  let input = [], melodyBusy = false;
  const pedestals = PEDESTAL_ORDER.map((sym, i) => {
    const x = -4.0 + 1.3 * i, z = 0.5;
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
      enabled: () => !done.melody && !melodyBusy,
      onInteract: () => press(ped),
    });
    return ped;
  });

  function press(ped) {
    ped.litUntil = now + 3;
    ctx.audio.note(FREQ[ped.sym]);
    ctx.particles.burst(ped.pos, 25);
    if (ped.sym !== ANSWER[input.length]) {    // ¡incorrecto!
      melodyBusy = true;
      pedestals.forEach((q) => (q.litUntil = 0));
      ctx.audio.error();
      ctx.ui.toast('Parece que esa no era la melodía correcta...', 2000);
      setTimeout(() => { melodyBusy = false; input = []; }, 2000);
      return;
    }
    input.push(ped.sym);
    if (input.length === ANSWER.length) solveMelody();
  }

  function solveMelody() {
    orbitUntil = now + 6;                      // las mariposas celebran
    emitUntil = now + 2.5;
    pedLight.intensity = 4;
    ctx.audio.reward();
    completePart('melody');
  }

  // ================= ACERTIJO 2: completar la historia =================
  let held = null, storyBusy = false;
  const clips = createSongClips(ctx);
  SONGS.forEach((s) => clips.preload(s));

  // Banner sobre los cuadros
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.5), new THREE.MeshBasicMaterial({
    map: makeTextTexture('Completa la historia', { w: 640, h: 100, bg: '#2a1a08', color: '#f3d38a', font: '46px Georgia' }),
  }));
  banner.position.set(FRAME_X + 0.02, 3.55, 0); banner.rotation.y = -Math.PI / 2; g.add(banner);

  // Tres cuadros vacíos con su placa y un pedestal debajo
  const GLOW = new THREE.Color(0xb88a30);
  const loader = new THREE.TextureLoader();
  const plinths = SONGS.map((song) => {
    const f = new THREE.Group(); f.position.set(FRAME_X, 2.5, song.z); f.rotation.y = -Math.PI / 2; g.add(f);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.06), goldMat);
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.3), new THREE.MeshStandardMaterial({ color: 0x1a1208, roughness: 1, emissive: 0x000000 }));
    inner.position.z = 0.035; f.add(frame, inner);
    // Imagen del cuadro (MeshBasicMaterial = se ve con sus colores originales, sin depender de la luz)
    const tex = loader.load(song.image);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;                                    // más nitidez al verla de costado
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.3), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: REVEAL_ON_SOLVE ? 0 : 1 }));
    pic.position.z = 0.04; f.add(pic);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.26), new THREE.MeshBasicMaterial({
      map: makeTextTexture(song.title, { w: 512, h: 104, bg: '#2a1a08', color: '#f3d38a', font: '42px Georgia' }),
    }));
    plate.position.set(FRAME_X + 0.02, 1.55, song.z); plate.rotation.y = -Math.PI / 2; g.add(plate);

    const pl = new THREE.Group(); pl.position.set(PLINTH_X, 0, song.z); g.add(pl);
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.9, 16), wood); column.position.y = 0.45;
    const slab = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 16), goldMat); slab.position.y = 0.925;
    pl.add(column, slab);
    addCollider(ctx, PLINTH_X, song.z, 0.35);

    const plinth = { song, inner, pic, item: null };
    ctx.interaction.add(pl, {
      prompt: () => (held ? 'Presiona E para colocar el objeto.' : plinth.item ? 'Presiona E para recoger.' : 'Aquí falta un objeto.'),
      enabled: () => !done.story && !storyBusy,
      onInteract: () => onPlinth(plinth),
    });
    return plinth;
  });

  // Objetos sobre mesitas repartidas por la sala
  ITEMS.forEach((it) => {
    const [x, z] = it.home;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.7, 14), wood); col.position.set(x, 0.35, z);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 16), wood); top.position.set(x, 0.72, z);
    g.add(col, top);
    addCollider(ctx, x, z, 0.3);

    it.group = it.make(); it.state = 'home';
    g.add(it.group);
    sendHome(it);
    ctx.interaction.add(it.group, {
      prompt: () => (held ? 'Ya llevas un objeto.' : 'Presiona E para recoger.'),
      enabled: () => it.state === 'home' && !storyBusy,
      onInteract: () => {
        if (held) { ctx.ui.toast('Ya llevas un objeto. Colócalo bajo un cuadro primero.'); return; }
        pickUp(it);
        ctx.ui.toast(it.flavor, 4500);
      },
    });
  });

  function sendHome(it) {
    it.state = 'home'; it.group.visible = true;
    it.group.position.set(it.home[0], TABLE_TOP, it.home[1]);
    it.group.rotation.y = 0;
  }
  function pickUp(it) {
    held = it; it.state = 'held'; it.group.visible = false;
    ctx.ui.setHeld(it.label);
    ctx.audio.chime();
  }
  function onPlinth(pl) {
    if (held) {
      if (pl.item) { ctx.ui.toast('Ya hay un objeto en este lugar.'); return; }
      const it = held; held = null; ctx.ui.setHeld('');
      it.state = 'placed'; it.group.visible = true;
      it.group.position.set(PLINTH_X, PLINTH_TOP, pl.song.z);
      it.group.rotation.y = -Math.PI / 2;               // de frente a la sala
      pl.item = it;
      ctx.particles.burst(tmp.set(PLINTH_X, 1.1, pl.song.z), 15);
      if (it.id === pl.song.item) {                      // ¡objeto correcto! suena un fragmento de su canción
        ctx.ui.toast(`♪ ${pl.song.title}`, 4000);
        ctx.particles.burst(tmp.set(PLINTH_X, 1.3, pl.song.z), 25, { speed: 1.2, up: 1.2 });
        clips.play(pl.song);
      } else {
        clips.stop();
        ctx.audio.note(440);
      }
      evaluate();
    } else if (pl.item) {
      pickUp(pl.item); pl.item = null;
    } else {
      ctx.ui.toast('Aquí falta un objeto relacionado con esta canción.');
    }
  }

  // Cuando los tres cuadros tienen objeto se comprueba el resultado.
  function evaluate() {
    if (plinths.some((p) => !p.item)) return;
    if (plinths.every((p) => p.item.id === p.song.item)) { solveStory(); return; }
    storyBusy = true;
    ctx.audio.error();
    ctx.ui.toast('Algo no encaja en estas historias... los objetos equivocados regresan a su lugar.', 3000);
    setTimeout(() => {
      plinths.forEach((p) => { if (p.item.id !== p.song.item) { sendHome(p.item); p.item = null; } });   // los correctos se quedan
      storyBusy = false;
    }, 1800);
  }

  function solveStory() {
    emitUntil = Math.max(emitUntil, now + 2);
    ctx.audio.reward();
    ctx.particles.burst(tmp.set(FRAME_X - 0.6, 2.5, 0), 40, { speed: 1.5, up: 1 });   // los cuadros se encienden
    completePart('story');
  }

  // ================= Animaciones =================
  ctx.updaters.push((dt, t) => {
    pedestals.forEach((p) => p.cap.material.emissive.lerp(p.litUntil > t ? BRIGHT : DIM, Math.min(1, dt * 8)));
    if (done.story) plinths.forEach((p) => {
      p.inner.material.emissive.lerp(GLOW, Math.min(1, dt * 1.5));                                  // cuadros brillan
      p.pic.material.opacity = Math.min(1, p.pic.material.opacity + dt * 0.6);                      // la imagen aparece
    });
    boost += (boostTarget - boost) * Math.min(1, dt * 1.5);
    room.lights.set(boost);
    if (t < emitUntil && Math.random() < 0.5) {
      ctx.particles.burst(tmp.set(cx + (Math.random() - 0.5) * 10, 0.5 + Math.random() * 2, (Math.random() - 0.5) * 8), 2, { speed: 0.3, up: 0.5 });
    }
    if (goldGuitar.visible) {
      rise = Math.min(1, rise + dt / 3);                 // 3 s para emerger
      const e = 1 - Math.pow(1 - rise, 3);
      goldGuitar.position.y = -0.4 + 1.65 * e + (ready ? Math.sin(t * 2) * 0.05 : 0);
      goldGuitar.rotation.y += dt * 0.8;
      if (rise >= 1) ready = true;
    }
  });
}
