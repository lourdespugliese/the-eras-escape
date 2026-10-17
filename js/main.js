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
import { buildRoomForest } from './roomforest.js';
import { buildRoomMidnights } from './roommidnights.js';
import { createSecrets } from './secrets.js';
import { buildSongShelf } from './songshelf.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x120c05);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 1.7, 3.8);

// Bloom: solo se usa cuando ctx.fx.bloom = true (así no cuesta rendimiento antes de resolver el acertijo).
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.5, 0.9));
composer.addPass(new OutputPass());

const ui = new UI();
const audio = new AudioManager();
const colliders = [];
const player = new Player(camera, canvas, colliders);
const interaction = new Interaction(camera, ui);
const game = { items: new Set(), solved: 0 };

// "ctx": contexto compartido con rooms.js y puzzles.js
const ctx = {
  scene, camera, colliders, ui, interaction, game, audio,
  particles: new Particles(scene),
  fx: { bloom: false },
  rooms: [], updaters: [],
  collect(id) { game.items.add(id); ui.updateInventory(game.items); },
};

// Misión secundaria: canciones secretas (panel lateral izquierdo + vitrina del hall). Debe crearse ANTES que las salas.
// Cada easter egg musical llama a ctx.secrets.add(...). Si agregas más canciones, sube "total".
ctx.secrets = createSecrets(ctx, { total: 3 });

const room1 = buildFearlessRoom(ctx);
ctx.glitter = createGlitter(ctx);   // glitter por toda la sala
createFearlessPuzzle(ctx, room1);
const room2 = buildRoom1989(ctx, room1);      // Habitación 2 (sala + acertijo)
const room3 = buildRoomReputation(ctx, room2);             // Habitación 3 (sala + acertijo)
const room4 = buildRoomLover(ctx, room3);    // Habitación 4 (+ túnel de corazón)
const room5 = buildRoomForest(ctx, room4);   // Habitación 5: bosque Folklore / Evermore (4 cruces, 3 acertijos)
const room6 = buildRoomMidnights(ctx, room5); // Habitación 6: Midnights (4 acertijos + portal de regreso al museo)

// Introducción inmersiva (exterior, hall y luz guía). Debe crearse DESPUÉS de las salas.
// Para saltarla mientras desarrollas, abre el juego con  http://localhost:8000/?skip
// ---- Atajos de desarrollo (por la URL) ----
//   ?skip       salta la intro y empieza en la sala 1
//   ?room=N     salta la intro y empieza dentro de la sala N (1-6): inventario con los objetos de las salas anteriores
//               y puertas anteriores abiertas. La puerta de salida de la sala N sigue cerrada (se abre al resolverla).
const params = new URLSearchParams(location.search);
const START_ROOM = parseInt(params.get('room'), 10) || 0;
const intro = buildIntro(ctx, room1, { player, skip: params.has('skip') || START_ROOM > 0 });
ctx.returnToMuseum = () => intro.returnToHall();   // portal de la sala 6 -> Hall principal

// >>> atajo ?room=N
function jumpToRoom(n, list) {
  n = Math.min(Math.max(n, 1), list.length);
  ITEMS.slice(0, n - 1).forEach((it) => ctx.collect(it.id, { silent: true }));          // objetos de las salas anteriores
  const creak = ctx.audio.creak; ctx.audio.creak = () => {};                              // sin el crujido de cada puerta
  list.slice(0, n - 1).forEach((r) => r.door.unlock());                                   // puertas anteriores abiertas
  ctx.audio.creak = creak;
  if (n > 1) {                                                                            // la sala 1 ya es el punto de partida normal
    const b = list[n - 1].bounds;
    let x = (b.minX + b.maxX) / 2; const z = b.maxZ - 1.8;                                // dentro de la sala, junto a su entrada (sur), mirando al norte
    for (const dx of [0, 1.5, -1.5, 3, -3]) if (!player.collides(x + dx, z)) { x += dx; break; }   // si hubiera un obstáculo, un poco al lado
    camera.position.set(x, 1.7, z);
    camera.rotation.set(0, 0, 0);
  }
  console.info(`[dev] ?room=${n}: sala ${n} lista para probar`);
}
// <<< atajo ?room=N

// Vitrinas del hall: cada trofeo recuperado (ctx.collect) aparece en su vitrina.
buildTrophyHall(ctx);
// Vitrina de canciones secretas del hall: cada canción hallada (ctx.secrets.add) aparece aquí con su objeto y su placa.
buildSongShelf(ctx);

ui.onStart(() => { audio.start(); player.lock(); });   // el audio necesita un click del usuario
let devJumped = false;
player.controls.addEventListener('lock', () => {
  audio.start(); ui.showGame(true); intro.onLock();
  if (START_ROOM > 0 && !devJumped) { devJumped = true; jumpToRoom(START_ROOM, [room1, room2, room3, room4, room5, room6]); }   // después de intro.onLock(), que coloca la cámara en la sala 1
});
player.controls.addEventListener('unlock', () => { audio.pause(); ui.showGame(false); });

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
  if (player.controls.isLocked) {
    if (!intro.blockMove()) player.update(dt);      // durante la intro solo se mueve la cámara hasta tomar el sobre
    interaction.update();
    const p = camera.position;
    const r = ctx.rooms.find((r) => p.x > r.bounds.minX && p.x < r.bounds.maxX && p.z > r.bounds.minZ && p.z < r.bounds.maxZ);
    if (r) ui.setRoom(r.name);
  }
  ctx.updaters.forEach((fn) => fn(dt, t));
  ctx.particles.update(dt);
  if (ctx.fx.bloom) composer.render(); else renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
});