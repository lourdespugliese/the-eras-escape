// main.js — Punto de entrada: escena, módulos, post-procesado y loop principal.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Player } from './player.js';
import { Interaction } from './interaction.js';
import { UI, ITEMS } from './ui.js';
import { AudioManager } from './audio.js';
import { Particles } from './particles.js';
import { buildFearlessRoom } from './rooms.js';
import { createFearlessPuzzle } from './puzzles.js';
import { createGlitter } from './glitter.js';
import { buildRoom1989 } from './room1989.js';
import { buildRoomReputation } from './roomreputation.js';
import { buildIntro } from './intro.js';
import { buildRoomLover } from './roomlover.js';
import { buildTrophyHall } from './trophies.js';
import { buildForestTransition } from './forest-transition.js';
import { createSecrets } from './secrets.js';
import { buildSongShelf } from './songshelf.js';
import { createVolume } from './volume.js';
import { setupLighting } from './lighting.js';
import { clearMuseumMaterialCache, setupMuseumReflections } from './museum-materials.js';
import { setupHallMaterials } from './museum-hall.js';
import { setupVisibility } from './visibility.js';
import { setupLightBudget } from './light-budget.js';
import { loadingStage, nextPaint } from './loading.js';
import { createRoomRegistry, setupStreaming } from './streaming.js';
import { clearRoundedGeometryCache } from './surface-library.js';

await loadingStage('Preparando el escenario…');

// Diagnóstico: si algo falla mientras corre el juego, el error aparece en un cartel rojo arriba (clic para cerrarlo), además de la consola.
const errBox = document.createElement('div');
Object.assign(errBox.style, { position: 'fixed', left: '0', right: '0', top: '0', zIndex: '10000', display: 'none', padding: '8px 14px', background: 'rgba(150,20,20,.94)',
  color: '#fff', font: '13px/1.4 monospace', whiteSpace: 'pre-wrap', cursor: 'pointer', maxHeight: '40vh', overflow: 'auto' });
errBox.onclick = () => { errBox.style.display = 'none'; errBox.textContent = ''; };
document.body.appendChild(errBox);
const showError = (msg) => { if (errBox.textContent.length < 1500) errBox.textContent += (errBox.textContent ? '\n' : '') + msg; errBox.style.display = 'block'; };
addEventListener('error', (e) => showError(`${e.message} (${String(e.filename || '').split('/').pop()}:${e.lineno})`));
addEventListener('unhandledrejection', (e) => showError('Promesa rechazada: ' + (e.reason && e.reason.message ? e.reason.message : e.reason)));

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });   // el antialias lo hace el composer (MSAA en su render target)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x120c05);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 1.7, 3.8);

// Post-proceso siempre activo: bloom suave de base (BLOOM_BASE) que sube a BLOOM_FULL cuando ctx.fx.bloom = true (neón, acertijos resueltos).
// El render target lleva MSAA (samples) para no perder el antialias que da el renderer al dibujar directo.
const BLOOM_BASE = 0.18, BLOOM_FULL = 0.6;
const pr = Math.min(window.devicePixelRatio, 2);
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth * pr, innerHeight * pr, { type: THREE.HalfFloatType, samples: 4 }));
composer.setPixelRatio(pr); composer.setSize(innerWidth, innerHeight);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), BLOOM_BASE, 0.5, 1.6);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

const ui = new UI();
const colliders = [];
const player = new Player(camera, canvas, colliders);
ui.bindVolume(createVolume(player));
const audio = new AudioManager();
player.speed *= 1.25;   // +25% de velocidad (intro.js toma este valor como base y sigue aplicando sus propios frenos en escaleras y hall)
const interaction = new Interaction(camera, ui, player);
const game = { items: new Set(), solved: 0 };

// "ctx": contexto compartido con rooms.js y puzzles.js
const ctx = {
  scene, camera, colliders, ui, interaction, game, audio, player,
  particles: new Particles(scene),
  fx: { bloom: false },
  rooms: [], updaters: [],
  collect(id, { silent } = {}) {
    const item = !silent && !game.items.has(id) && ITEMS.find(item => item.id === id);
    game.items.add(id); ui.updateInventory(game.items);
    if (item) setTimeout(() => ui.toast(`✨ ${item.label} ahora se exhibe en el Hall principal`, 4500), 3200);
  },
};

// Misión secundaria: canciones secretas (panel lateral izquierdo + vitrina del hall). Debe crearse ANTES que las salas.
// Cada easter egg musical llama a ctx.secrets.add(...). Si agregas más canciones, sube "total".
ctx.secrets = createSecrets(ctx, { total: 3 });
const registry = createRoomRegistry(ctx);

await loadingStage('Despertando Fearless…');
let room1 = registry.build('Fearless', () => {
  const room = buildFearlessRoom(ctx);
  ctx.glitter = createGlitter(ctx);
  room.cleanup = createFearlessPuzzle(ctx, room);
  return room;
});
await loadingStage('Viajando a 1989…');
let room2 = registry.build('1989', () => buildRoom1989(ctx, room1));
await loadingStage('Descubriendo Reputation…');
let room3 = registry.build('Reputation', () => buildRoomReputation(ctx, room2));
await loadingStage('Pintando el cielo de Lover…');
let room4 = registry.build('Lover', () => buildRoomLover(ctx, room3));
const transition = registry.build('Transición a Folklore', () => buildForestTransition(ctx, room4.bounds.minZ));
let room5, room6;

// Introducción inmersiva (exterior, hall y luz guía). Debe crearse DESPUÉS de las salas.
// Para saltarla mientras desarrollas, abre el juego con  http://localhost:8000/?skip
// ---- Atajos de desarrollo (por la URL) ----
//   ?skip       salta la intro y empieza en la sala 1
//   ?room=N     salta la intro y prepara la sala N (1-6): inventario con los objetos de las salas anteriores
//               ?room=5 empieza en la cámara de transición, antes de entrar al bosque.
//               y puertas anteriores abiertas. La puerta de salida de la sala N sigue cerrada (se abre al resolverla).
//   ?perf       deja renderer, escena, cámara, composer y visibilidad en window.__perf para medir desde la consola
const params = new URLSearchParams(location.search);
const START_ROOM = Math.min(parseInt(params.get('room'), 10) || 0, 6);
const FINALE = params.has('lobby') || params.has('finale');   // ?lobby (o ?finale): empiezas en el hall con los 6 trofeos recogidos (para probar la ceremonia final)
await loadingStage('Preparando el museo…');
function buildMuseum(firstRoom) {
  return registry.build('Museo', () => {
    const sequence = buildIntro(ctx, firstRoom, { player, skip: params.has('skip') || START_ROOM > 0 || FINALE });
    const trophies = buildTrophyHall(ctx);
    const songs = buildSongShelf(ctx);
    setupHallMaterials(renderer, scene, ctx);
    setupMuseumReflections(renderer, scene, camera, ctx);
    return {
      bounds: { minX: -40, maxX: 40, minZ: 5, maxZ: 240 },
      targets: [ctx.museum.hallEnvironment],
      sequence,
      cleanup() { sequence.cleanup(); trophies.cleanup(); songs.cleanup(); },
    };
  }).sequence;
}
let intro = buildMuseum(room1);

// >>> atajo ?room=N
function placeInRoom(room) {
  const b = room.bounds;
  let x = (b.minX + b.maxX) / 2; const z = b.maxZ - 1.8;
  for (const dx of [0, 1.5, -1.5, 3, -3]) if (!player.collides(x + dx, z)) { x += dx; break; }
  camera.position.set(x, 1.7, z);
  camera.rotation.set(0, 0, 0);
}
function jumpToRoom(n, list) {
  if (n < 5) ITEMS.slice(0, n - 1).forEach(it => ctx.collect(it.id, { silent: true }));
  const creak = ctx.audio.creak; ctx.audio.creak = () => {};                              // sin el crujido de cada puerta
  list.slice(0, n - 1).forEach((r) => r.door.unlock());                                   // puertas anteriores abiertas
  ctx.audio.creak = creak;
  if (n >= 5) {
    camera.position.set(0, 1.7, transition.centerZ - 0.01);
    camera.rotation.set(0, 0, 0);
  } else if (n > 1) placeInRoom(list[n - 1]);
}
// <<< atajo ?room=N

await loadingStage('Iluminando los recuerdos…');
const lighting = setupLighting({ renderer, scene, camera, ctx });   // tone mapping, reflejos en metales y sombras (después de crear todo)
// Zonas en cadena (exterior -> hall -> salas 1-6) y la puerta que une cada una con la siguiente: lo que no se ve no se dibuja.
const hallZone = ctx.rooms.find((r) => /^Hall/.test(r.name));
const chain = [{ name: 'exterior', bounds: { minX: -1e3, maxX: 1e3, minZ: hallZone.bounds.maxZ, maxZ: 1e3 } }, hallZone, ...ctx.rooms.filter((r) => r !== hallZone)];
const roomDoors = [room1, room2, room3, room4].map((r) => r.door);
const shadowZones = lights => lights.map(({ light, room }) => ({ light, zone: room === 'exterior' ? 0 : chain.indexOf(room) }));
const visibility = setupVisibility({
  scene, camera, zones: chain,
  openings: () => { const d = intro?.doors; return [d?.front, d?.fearless, ...roomDoors.map(door => door && !door.locked)]; },
  shadowLights: shadowZones([...lighting.roomShadows(ctx.rooms), ...lighting.museumShadows()]),
});
const lightBudget = setupLightBudget({ renderer, scene, camera, target: composer.readBuffer, zone: () => visibility.current });   // después de visibility: usa su zona y los reflejos activos
ctx.streaming = setupStreaming({ scene, camera, renderer, entries: registry.entries,
  ready: () => lightBudget.ready,
  forget: objects => { visibility.forget(objects); lightBudget.forget(objects); },
  invalidate: () => { visibility.invalidate(); lightBudget.invalidate(); },
});
async function loadForest() {
  ui.setRoom('Transición a Folklore');
  transition.message('Dejando atrás el museo…');
  await nextPaint();
  await lightBudget.initialReady;
  ctx.streaming.discard(['Fearless', '1989', 'Reputation', 'Lover', 'Museo']);
  intro = room1 = room2 = room3 = room4 = null;
  roomDoors.fill(null, 0, 4);
  ctx.museum = ctx.glitter = null;
  clearMuseumMaterialCache();
  clearRoundedGeometryCache();
  if (START_ROOM >= 5) ITEMS.slice(0, START_ROOM - 1).forEach(it => ctx.collect(it.id, { silent: true }));

  transition.message('La puerta se abrirá en breve');
  await nextPaint();
  const [{ buildRoomForest }, { buildRoomMidnights }] = await Promise.all([import('./roomforest.js'), import('./roommidnights.js')]);
  const firstNewZone = ctx.rooms.length;
  room5 = registry.build('Folklore', () => buildRoomForest(ctx, transition));
  await nextPaint();
  room6 = registry.build('Midnights', () => buildRoomMidnights(ctx, room5));
  const newZones = ctx.rooms.slice(firstNewZone);
  chain.push(...newZones);
  roomDoors.push(room5.door);
  lighting.scan();
  visibility.addShadows(shadowZones(lighting.roomShadows(newZones)));
  registry.entries.find(entry => entry.name === 'Midnights').available = () => !room5.door.locked;
  ctx.streaming.refresh();
  ctx.streaming.update();

  await Promise.all([room5.materials.ready, room6.materials.ready]);
  const forest = registry.entries.find(entry => entry.name === 'Folklore');
  await lightBudget.prepare('noche', forest.group);
  transition.open();
}
function updateTransition(dt) {
  const wasOpening = transition.phase === 'opening';
  transition.update(dt, !!room4 && !room4.door.locked, () => {
    loadForest().catch(error => {
      console.error('[Folklore] No se pudo preparar el bosque:', error);
      transition.fail('No pudimos preparar el bosque. Recargá la página para volver a intentar.');
    });
  });
  if (START_ROOM === 6 && wasOpening && transition.phase === 'open') {
    room5.door.unlock();
    placeInRoom(room6);
  }
}
ctx.returnToMuseum = () => {
  if (!intro) {
    intro = buildMuseum(null);
    visibility.addShadows(shadowZones(lighting.museumShadows()));
    ctx.streaming.refresh();
  }
  intro.returnToHall();
};
if (params.has('perf')) window.__perf = { renderer, scene, camera, composer, ctx, player, visibility, lightBudget, streaming: ctx.streaming, transition };

ui.onStart(() => { audio.start(); player.start(); });   // el audio necesita un click del usuario
let devJumped = false, dragHintShown = false;
player.addEventListener('play', () => {
  ui.showGame(true); intro?.onLock();
  if (player.mode === 'drag' && !dragHintShown) {
    dragHintShown = true;
    ui.toast('Arrastrá el mouse para mirar. WASD para moverte y Esc para pausar.', 5500);
  }
  if (FINALE && !devJumped) {                                                                // atajo de prueba ?lobby / ?finale
    devJumped = true;
    try {
      ITEMS.forEach((it) => ctx.collect(it.id, { silent: true }));                          // los 6 trofeos recogidos (sin avisos)
      intro.returnToHall();                                                                 // aparece en el hall
    } catch (e) { console.error('[dev] ?lobby falló:', e); ui.toast('[dev] ?lobby falló: ' + (e && e.message ? e.message : e), 12000); }
  }
  if (START_ROOM > 0 && !devJumped) { devJumped = true; jumpToRoom(START_ROOM, [room1, room2, room3, room4]); }
});
player.addEventListener('pause', () => { audio.pause(); ui.showGame(false); });

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
  if (player.playing) {
    if (!intro?.blockMove() && !ctx.ending && !transition.busy) player.update(dt);
    if (!ctx.ending && !transition.busy) interaction.update();
    const p = camera.position;
    const r = ctx.rooms.find((r) => p.x > r.bounds.minX && p.x < r.bounds.maxX && p.z > r.bounds.minZ && p.z < r.bounds.maxZ);
    if (r) ui.setRoom(r.name);
  }
  ctx.updaters.forEach((fn) => fn(dt, t));
  updateTransition(dt);
  // After updaters: teleports and the final return to the museum happen here.
  ctx.streaming.update(dt);
  ctx.particles.update(dt);
  const bk = Math.min(1, dt * 3), full = ctx.fx.bloom;   // transición suave; en modo base solo brillan las luces muy intensas
  bloomPass.strength += ((full ? BLOOM_FULL : BLOOM_BASE) - bloomPass.strength) * bk;
  bloomPass.threshold += ((full ? 0.9 : 1.6) - bloomPass.threshold) * bk;
  composer.render();
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
});
