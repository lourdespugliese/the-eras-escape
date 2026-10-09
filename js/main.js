// main.js — Punto de entrada: escena, módulos, post-procesado y loop principal.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Player } from './player.js';
import { Interaction } from './interaction.js';
import { UI } from './ui.js';
import { AudioManager } from './audio.js';
import { Particles } from './particles.js';
import { buildFearlessRoom } from './rooms.js';
import { createFearlessPuzzle } from './puzzles.js';
import { createGlitter } from './glitter.js';
import { buildRoom1989 } from './room1989.js';
import { buildRoomReputation } from './roomReputation.js';

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

const room1 = buildFearlessRoom(ctx);
ctx.glitter = createGlitter(ctx);            // glitter por toda la sala
createFearlessPuzzle(ctx, room1);
const room2 = buildRoom1989(ctx, room1);      // Habitación 2 (sala + acertijo)
buildRoomReputation(ctx, room2);             // Habitación 3 (sala + acertijo)

ui.onStart(() => { audio.start(); player.lock(); });   // el audio necesita un click del usuario
player.controls.addEventListener('lock', () => { audio.start(); ui.showGame(true); });
player.controls.addEventListener('unlock', () => { audio.pause(); ui.showGame(false); });

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
  if (player.controls.isLocked) {
    player.update(dt);
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