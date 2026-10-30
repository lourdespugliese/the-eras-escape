// lighting.js — Tone mapping, reflejos en metales (mapa de entorno) y sombras.
// Se llama una vez en main.js, DESPUÉS de construir todas las salas. No cambia las luces de cada sala: solo añade sombras
// a una luz clave por habitación y revisa cada 1.5 s los objetos nuevos (por ejemplo los .glb, que cargan tarde).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const ENV_INTENSITY = 0.3;     // reflejo suave: un valor alto haría brillar los metales en las salas oscuras
const MAX_CASTER = 8;          // los meshes más grandes que esto (paredes, pisos, techos) reciben sombra pero no la proyectan
const WARMUP_FRAMES = 4;       // al inicio todas las luces dibujan su mapa de sombras una vez; después solo la de la sala actual

export function setupLighting({ renderer, scene, camera, ctx }) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  // --- Marca los meshes: reflejo en metales + quién proyecta / recibe sombra ---
  const seen = new WeakSet(), box = new THREE.Box3(), size = new THREE.Vector3();
  function scan() {
    scene.updateMatrixWorld();
    scene.traverse((o) => {
      if (!o.isMesh || seen.has(o)) return;
      seen.add(o);
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      let lit = false, solid = true;
      for (const m of mats) {
        if (m.isMeshStandardMaterial) {
          lit = true;
          if ((m.metalness >= 0.3 || m.userData.tileSize || (m.isMeshPhysicalMaterial && m.transparent)) && !m.envMap) { m.envMap = envTex; m.envMapIntensity = m.userData.tileSize ? 0.12 : ENV_INTENSITY; m.needsUpdate = true; }
        } else if (m.isMeshLambertMaterial || m.isMeshPhongMaterial) lit = true;
        if (m.transparent || m.depthWrite === false || m.isMeshBasicMaterial) solid = false;   // brillos, neón y cristales no hacen sombra
      }
      if (!lit) return;
      o.receiveShadow = true;
      if (solid) {
        box.setFromObject(o); box.getSize(size);
        o.castShadow = Math.max(size.x, size.z, size.y) <= MAX_CASTER;
      }
    });
  }
  scan();
  setInterval(scan, 1500);

  // --- Luces con sombra ---
  const entries = [];   // { light, room }  (room = objeto de ctx.rooms; la luz solo actualiza su mapa cuando el jugador está ahí)
  const v = new THREE.Vector3();
  const inside = (b, p) => p.x > b.minX && p.x < b.maxX && p.z > b.minZ && p.z < b.maxZ;

  // Una PointLight por habitación numerada: la de mayor alcance.
  ctx.rooms.filter((r) => /^Habitaci/.test(r.name)).forEach((room) => {
    let best = null;
    scene.traverse((o) => {
      if (!o.isPointLight || o.userData.noShadow) return;   // noShadow: las luces "pool" de Folklore y Midnights, que se mueven
      o.getWorldPosition(v);
      if (inside(room.bounds, v) && (!best || (o.distance || 0) > (best.distance || 0))) best = o;
    });
    if (!best) return;
    best.castShadow = true;
    best.shadow.mapSize.set(1024, 1024);
    best.shadow.camera.near = 0.3; best.shadow.camera.far = best.distance || 20;
    best.shadow.bias = -0.0008; best.shadow.normalBias = 0.03; best.shadow.radius = 3;
    entries.push({ light: best, room });
  });

  // La luna de Folklore y Midnights (DirectionalLight marcada con userData.shadowRoom): su cámara de sombra cubre toda la sala.
  scene.traverse((o) => {
    if (!o.isDirectionalLight || !o.userData.shadowRoom) return;
    const room = ctx.rooms.find((r) => r.name.includes(o.userData.shadowRoom));
    if (!room) return;
    const b = room.bounds, cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
    o.position.set(cx + o.position.x, o.position.y, cz + o.position.z);   // se desplaza luz y objetivo juntos: la dirección no cambia
    o.target.position.set(cx, 0, cz); scene.add(o.target);
    const r = Math.hypot(b.maxX - b.minX, b.maxZ - b.minZ) / 2;
    const cam = o.shadow.camera;
    cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r; cam.near = 1; cam.far = 45; cam.updateProjectionMatrix();
    o.castShadow = true;
    o.shadow.mapSize.set(2048, 2048); o.shadow.bias = -0.0005; o.shadow.normalBias = 0.05; o.shadow.radius = 2;
    entries.push({ light: o, room });
  });

  const museumLights = ctx.museum?.lights || [];
  museumLights.forEach(light => {
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.near = 0.5; light.shadow.camera.far = light.distance;
    light.shadow.bias = -0.0003; light.shadow.normalBias = 0.04;
  });
  let frame = 0;
  return {
    entries,
    update() {
      const p = camera.position;
      const cur = ctx.rooms.find((r) => inside(r.bounds, p));
      const warm = frame++ < WARMUP_FRAMES;
      museumLights.forEach((light, i) => {
        light.shadow.autoUpdate = warm || (ctx.museum.root.visible && (i === 0 ? p.z >= 25 : p.z >= 5 && p.z < 25));
      });
      for (const e of entries) e.light.shadow.autoUpdate = warm || e.room === cur;
    },
  };
}
